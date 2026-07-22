//! A dependency-free scalar reverse-mode computation graph.

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::error::Error;
use std::fmt;
use std::rc::Rc;

type NodeKey = *const RefCell<Node>;

// region:scalar-autodiff-errors
/// The operation that produced a scalar graph node.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ScalarOperation {
    Variable,
    Constant,
    Detached,
    Add,
    Multiply,
    Negate,
    Subtract,
    Exp,
    Tanh,
}

impl ScalarOperation {
    /// A stable, locale-neutral name suitable for deterministic evidence.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Variable => "variable",
            Self::Constant => "constant",
            Self::Detached => "detached",
            Self::Add => "add",
            Self::Multiply => "mul",
            Self::Negate => "neg",
            Self::Subtract => "sub",
            Self::Exp => "exp",
            Self::Tanh => "tanh",
        }
    }
}

impl fmt::Display for ScalarOperation {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// A deterministic rejection from scalar graph construction or backpropagation.
#[derive(Clone, Debug, PartialEq)]
pub enum ScalarAutodiffError {
    NonFiniteLeaf {
        operation: ScalarOperation,
        value: f64,
    },
    NonFiniteResult {
        operation: ScalarOperation,
        value: f64,
    },
    UntrackedOutput {
        operation: ScalarOperation,
    },
    NonFiniteSeed {
        seed: f64,
    },
    NonFiniteContribution {
        child: usize,
        parent: usize,
        operand: usize,
        upstream: f64,
        local_derivative: f64,
    },
    NonFinitePassAdjoint {
        node: usize,
        previous: f64,
        contribution: f64,
    },
    NonFiniteAccumulatedGradient {
        node: usize,
        stored: f64,
        pass_adjoint: f64,
    },
}

impl fmt::Display for ScalarAutodiffError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NonFiniteLeaf { operation, value } => {
                write!(
                    formatter,
                    "{operation} scalar value {value:?} must be finite"
                )
            }
            Self::NonFiniteResult { operation, value } => {
                write!(
                    formatter,
                    "{operation} produced non-finite scalar value {value:?}"
                )
            }
            Self::UntrackedOutput { operation } => write!(
                formatter,
                "cannot backpropagate from untracked {operation} output"
            ),
            Self::NonFiniteSeed { seed } => {
                write!(formatter, "backward seed {seed:?} must be finite")
            }
            Self::NonFiniteContribution {
                child,
                parent,
                operand,
                upstream,
                local_derivative,
            } => write!(
                formatter,
                "edge {operand} from topology node {child} to {parent} produced a non-finite contribution from upstream {upstream:?} and local derivative {local_derivative:?}"
            ),
            Self::NonFinitePassAdjoint {
                node,
                previous,
                contribution,
            } => write!(
                formatter,
                "topology node {node} cannot accumulate pass adjoint {previous:?} plus contribution {contribution:?}"
            ),
            Self::NonFiniteAccumulatedGradient {
                node,
                stored,
                pass_adjoint,
            } => write!(
                formatter,
                "topology node {node} cannot accumulate stored gradient {stored:?} plus pass adjoint {pass_adjoint:?}"
            ),
        }
    }
}

impl Error for ScalarAutodiffError {}
// endregion:scalar-autodiff-errors

#[derive(Clone)]
struct ParentEdge {
    parent: Scalar,
    local_derivative: f64,
}

struct Node {
    value: f64,
    operation: ScalarOperation,
    parents: Vec<ParentEdge>,
    gradient: Option<f64>,
}

/// One scalar value and its immutable backward graph.
#[derive(Clone)]
pub struct Scalar {
    node: Rc<RefCell<Node>>,
}

impl fmt::Debug for Scalar {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("Scalar")
            .field("value", &self.value())
            .field("operation", &self.operation())
            .field("gradient", &self.gradient())
            .finish_non_exhaustive()
    }
}

/// One node in the deterministic parent-first order used by a backward pass.
#[derive(Clone, Debug, PartialEq)]
pub struct BackwardNode {
    pub topology_index: usize,
    pub operation: ScalarOperation,
    pub value: f64,
    pub tracked: bool,
    pub pass_adjoint: Option<f64>,
    pub accumulated_gradient: Option<f64>,
}

/// One ordered operand edge visited during reverse traversal.
#[derive(Clone, Debug, PartialEq)]
pub struct BackwardEdge {
    pub reverse_index: usize,
    pub child: usize,
    pub parent: usize,
    pub operand: usize,
    pub local_derivative: f64,
    pub upstream: f64,
    pub contribution: f64,
    pub parent_tracked: bool,
    pub parent_adjoint_before: Option<f64>,
    pub parent_adjoint_after: Option<f64>,
}

/// Rust-authored evidence from one fresh, successfully committed backward pass.
#[derive(Clone, Debug, PartialEq)]
pub struct BackwardPass {
    pub seed: f64,
    pub nodes: Vec<BackwardNode>,
    pub edges: Vec<BackwardEdge>,
}

// region:scalar-dag-operations
impl Scalar {
    /// Creates a finite leaf whose gradient is tracked.
    pub fn variable(value: f64) -> Result<Self, ScalarAutodiffError> {
        Self::leaf(value, ScalarOperation::Variable, true)
    }

    /// Creates a finite leaf treated as a constant by backpropagation.
    pub fn constant(value: f64) -> Result<Self, ScalarAutodiffError> {
        Self::leaf(value, ScalarOperation::Constant, false)
    }

    fn leaf(
        value: f64,
        operation: ScalarOperation,
        tracked: bool,
    ) -> Result<Self, ScalarAutodiffError> {
        if !value.is_finite() {
            return Err(ScalarAutodiffError::NonFiniteLeaf { operation, value });
        }
        Ok(Self::new_node(value, operation, Vec::new(), tracked))
    }

    fn new_node(
        value: f64,
        operation: ScalarOperation,
        parents: Vec<ParentEdge>,
        tracked: bool,
    ) -> Self {
        Self {
            node: Rc::new(RefCell::new(Node {
                value,
                operation,
                parents,
                gradient: tracked.then_some(0.0),
            })),
        }
    }

    fn operation_node(
        value: f64,
        operation: ScalarOperation,
        parents: Vec<ParentEdge>,
    ) -> Result<Self, ScalarAutodiffError> {
        if !value.is_finite() {
            return Err(ScalarAutodiffError::NonFiniteResult { operation, value });
        }
        debug_assert!(parents.iter().all(|edge| edge.local_derivative.is_finite()));
        let tracked = parents.iter().any(|edge| edge.parent.tracks_gradient());
        Ok(Self::new_node(value, operation, parents, tracked))
    }

    pub fn value(&self) -> f64 {
        self.node.borrow().value
    }

    pub fn operation(&self) -> ScalarOperation {
        self.node.borrow().operation
    }

    pub fn tracks_gradient(&self) -> bool {
        self.node.borrow().gradient.is_some()
    }

    pub fn gradient(&self) -> Option<f64> {
        self.node.borrow().gradient
    }

    /// Returns whether two handles refer to the same graph node.
    pub fn is_same_node(&self, other: &Self) -> bool {
        Rc::ptr_eq(&self.node, &other.node)
    }

    /// Adds two finite scalars and records both ordered operand edges.
    pub fn add(&self, other: &Self) -> Result<Self, ScalarAutodiffError> {
        Self::operation_node(
            self.value() + other.value(),
            ScalarOperation::Add,
            vec![
                ParentEdge {
                    parent: self.clone(),
                    local_derivative: 1.0,
                },
                ParentEdge {
                    parent: other.clone(),
                    local_derivative: 1.0,
                },
            ],
        )
    }

    /// Multiplies two finite scalars and records one edge per operand use.
    pub fn mul(&self, other: &Self) -> Result<Self, ScalarAutodiffError> {
        let left = self.value();
        let right = other.value();
        Self::operation_node(
            left * right,
            ScalarOperation::Multiply,
            vec![
                ParentEdge {
                    parent: self.clone(),
                    local_derivative: right,
                },
                ParentEdge {
                    parent: other.clone(),
                    local_derivative: left,
                },
            ],
        )
    }

    pub fn neg(&self) -> Result<Self, ScalarAutodiffError> {
        Self::operation_node(
            -self.value(),
            ScalarOperation::Negate,
            vec![ParentEdge {
                parent: self.clone(),
                local_derivative: -1.0,
            }],
        )
    }

    pub fn sub(&self, other: &Self) -> Result<Self, ScalarAutodiffError> {
        Self::operation_node(
            self.value() - other.value(),
            ScalarOperation::Subtract,
            vec![
                ParentEdge {
                    parent: self.clone(),
                    local_derivative: 1.0,
                },
                ParentEdge {
                    parent: other.clone(),
                    local_derivative: -1.0,
                },
            ],
        )
    }

    pub fn exp(&self) -> Result<Self, ScalarAutodiffError> {
        let value = self.value().exp();
        Self::operation_node(
            value,
            ScalarOperation::Exp,
            vec![ParentEdge {
                parent: self.clone(),
                local_derivative: value,
            }],
        )
    }

    pub fn tanh(&self) -> Result<Self, ScalarAutodiffError> {
        let value = self.value().tanh();
        Self::operation_node(
            value,
            ScalarOperation::Tanh,
            vec![ParentEdge {
                parent: self.clone(),
                local_derivative: 1.0 - value * value,
            }],
        )
    }

    /// Copies the primal into a new untracked constant with no parent edge.
    pub fn detach(&self) -> Self {
        Self::new_node(self.value(), ScalarOperation::Detached, Vec::new(), false)
    }
}
// endregion:scalar-dag-operations

impl Scalar {
    fn key(&self) -> NodeKey {
        Rc::as_ptr(&self.node)
    }

    fn topology(&self) -> Vec<Self> {
        fn visit(node: &Scalar, visited: &mut HashSet<NodeKey>, order: &mut Vec<Scalar>) {
            if !visited.insert(node.key()) {
                return;
            }
            let parents = node.node.borrow().parents.clone();
            for edge in parents {
                visit(&edge.parent, visited, order);
            }
            order.push(node.clone());
        }

        let mut visited = HashSet::new();
        let mut order = Vec::new();
        visit(self, &mut visited, &mut order);
        order
    }

    // region:scalar-reverse-pass
    /// Accumulates one fresh reverse pass seeded by one.
    pub fn backward(&self) -> Result<BackwardPass, ScalarAutodiffError> {
        self.backward_with_seed(1.0)
    }

    /// Accumulates one fresh reverse pass without reading stale intermediate grads.
    ///
    /// No stored gradient changes unless every contribution, pass adjoint, and
    /// prospective accumulated gradient is finite.
    pub fn backward_with_seed(&self, seed: f64) -> Result<BackwardPass, ScalarAutodiffError> {
        if !self.tracks_gradient() {
            return Err(ScalarAutodiffError::UntrackedOutput {
                operation: self.operation(),
            });
        }
        if !seed.is_finite() {
            return Err(ScalarAutodiffError::NonFiniteSeed { seed });
        }

        let topology = self.topology();
        let indices = topology
            .iter()
            .enumerate()
            .map(|(index, scalar)| (scalar.key(), index))
            .collect::<HashMap<_, _>>();
        let mut pass_adjoints = vec![0.0; topology.len()];
        pass_adjoints[topology.len() - 1] = seed;
        let mut edges = Vec::new();

        for child in (0..topology.len()).rev() {
            let upstream = pass_adjoints[child];
            let parents = topology[child].node.borrow().parents.clone();
            for (operand, edge) in parents.iter().enumerate() {
                let parent = indices[&edge.parent.key()];
                let contribution = upstream * edge.local_derivative;
                if !contribution.is_finite() {
                    return Err(ScalarAutodiffError::NonFiniteContribution {
                        child,
                        parent,
                        operand,
                        upstream,
                        local_derivative: edge.local_derivative,
                    });
                }

                let parent_tracked = edge.parent.tracks_gradient();
                let (before, after) = if parent_tracked {
                    let previous = pass_adjoints[parent];
                    let next = previous + contribution;
                    if !next.is_finite() {
                        return Err(ScalarAutodiffError::NonFinitePassAdjoint {
                            node: parent,
                            previous,
                            contribution,
                        });
                    }
                    pass_adjoints[parent] = next;
                    (Some(previous), Some(next))
                } else {
                    (None, None)
                };

                edges.push(BackwardEdge {
                    reverse_index: edges.len(),
                    child,
                    parent,
                    operand,
                    local_derivative: edge.local_derivative,
                    upstream,
                    contribution,
                    parent_tracked,
                    parent_adjoint_before: before,
                    parent_adjoint_after: after,
                });
            }
        }

        let prospective = topology
            .iter()
            .enumerate()
            .map(|(index, scalar)| {
                scalar.gradient().map(|stored| {
                    let pass_adjoint = pass_adjoints[index];
                    let accumulated = stored + pass_adjoint;
                    if !accumulated.is_finite() {
                        Err(ScalarAutodiffError::NonFiniteAccumulatedGradient {
                            node: index,
                            stored,
                            pass_adjoint,
                        })
                    } else {
                        Ok(accumulated)
                    }
                })
            })
            .map(|candidate| candidate.transpose())
            .collect::<Result<Vec<_>, _>>()?;

        for (scalar, &gradient) in topology.iter().zip(&prospective) {
            if let Some(gradient) = gradient {
                scalar.node.borrow_mut().gradient = Some(gradient);
            }
        }

        let nodes = topology
            .iter()
            .enumerate()
            .map(|(topology_index, scalar)| BackwardNode {
                topology_index,
                operation: scalar.operation(),
                value: scalar.value(),
                tracked: scalar.tracks_gradient(),
                pass_adjoint: scalar
                    .tracks_gradient()
                    .then_some(pass_adjoints[topology_index]),
                accumulated_gradient: prospective[topology_index],
            })
            .collect();

        Ok(BackwardPass { seed, nodes, edges })
    }

    /// Clears every reachable tracked node without changing the graph or values.
    pub fn zero_grad(&self) {
        for scalar in self.topology() {
            let mut node = scalar.node.borrow_mut();
            if node.gradient.is_some() {
                node.gradient = Some(0.0);
            }
        }
    }
    // endregion:scalar-reverse-pass
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::gradcheck::scalar_gradient_check;

    fn assert_close(actual: f64, expected: f64, tolerance: f64) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "expected {expected:?}, got {actual:?}"
        );
    }

    fn reused_square() -> (Scalar, Scalar, Scalar) {
        let x = Scalar::variable(2.0).unwrap();
        let square = x.mul(&x).unwrap();
        let loss = square.add(&square).unwrap();
        (x, square, loss)
    }

    #[test]
    fn reused_nodes_are_unique_but_operand_edges_are_not() {
        let (x, square, loss) = reused_square();
        let pass = loss.backward().unwrap();

        assert_eq!(loss.value(), 8.0);
        assert_eq!(x.gradient(), Some(8.0));
        assert_eq!(square.gradient(), Some(2.0));
        assert_eq!(loss.gradient(), Some(1.0));
        assert_eq!(pass.nodes.len(), 3);
        assert_eq!(
            pass.nodes
                .iter()
                .map(|node| (node.topology_index, node.operation, node.pass_adjoint))
                .collect::<Vec<_>>(),
            [
                (0, ScalarOperation::Variable, Some(8.0)),
                (1, ScalarOperation::Multiply, Some(2.0)),
                (2, ScalarOperation::Add, Some(1.0)),
            ]
        );
        assert_eq!(
            pass.edges
                .iter()
                .map(|edge| {
                    (
                        edge.child,
                        edge.operand,
                        edge.parent,
                        edge.local_derivative,
                        edge.contribution,
                    )
                })
                .collect::<Vec<_>>(),
            [
                (2, 0, 1, 1.0, 1.0),
                (2, 1, 1, 1.0, 1.0),
                (1, 0, 0, 2.0, 4.0),
                (1, 1, 0, 2.0, 4.0),
            ]
        );
    }

    #[test]
    fn repeated_backward_uses_a_fresh_pass_and_zeroing_restarts_accumulation() {
        let (x, square, loss) = reused_square();
        loss.backward().unwrap();
        loss.backward().unwrap();
        assert_eq!(
            (x.gradient(), square.gradient(), loss.gradient()),
            (Some(16.0), Some(4.0), Some(2.0))
        );

        loss.zero_grad();
        assert_eq!(
            (x.gradient(), square.gradient(), loss.gradient()),
            (Some(0.0), Some(0.0), Some(0.0))
        );
        loss.backward().unwrap();
        assert_eq!(
            (x.gradient(), square.gradient(), loss.gradient()),
            (Some(8.0), Some(2.0), Some(1.0))
        );
    }

    #[test]
    fn detach_is_an_untracked_constant_and_cuts_only_its_path() {
        let x = Scalar::variable(2.0).unwrap();
        let square = x.mul(&x).unwrap();
        let detached = x.detach();
        let three = Scalar::constant(3.0).unwrap();
        let stopped = detached.mul(&three).unwrap();
        let loss = square.add(&stopped).unwrap();

        loss.backward().unwrap();
        assert_eq!(loss.value(), 10.0);
        assert_eq!(x.gradient(), Some(4.0));
        assert_eq!(detached.gradient(), None);
        assert_eq!(three.gradient(), None);
        assert_eq!(stopped.gradient(), None);
    }

    #[test]
    fn nonlinear_chain_and_arithmetic_have_correct_gradients() {
        let x = Scalar::variable(0.5).unwrap();
        let output = x.tanh().unwrap().exp().unwrap();
        output.backward().unwrap();
        let tanh = 0.5_f64.tanh();
        let expected = tanh.exp() * (1.0 - tanh * tanh);
        assert_close(output.value(), tanh.exp(), 0.0);
        assert_close(x.gradient().unwrap(), expected, 1.0e-15);

        let left = Scalar::variable(3.0).unwrap();
        let right = Scalar::variable(2.0).unwrap();
        let arithmetic = left.sub(&right).unwrap().neg().unwrap();
        arithmetic.backward().unwrap();
        assert_eq!(arithmetic.value(), -1.0);
        assert_eq!(left.gradient(), Some(-1.0));
        assert_eq!(right.gradient(), Some(1.0));
    }

    #[test]
    fn reverse_gradient_agrees_with_chapter_13_oracle() {
        let (x, _square, loss) = reused_square();
        loss.backward().unwrap();
        let check = scalar_gradient_check(2.0, x.gradient().unwrap(), 1.0e-5, 1.0e-9, |value| {
            2.0 * value * value
        })
        .unwrap();
        assert!(check.comparison.passed);
        assert!(check.comparison.scaled_error < 1.0e-10);
    }

    #[test]
    fn checked_construction_rejects_nonfinite_values() {
        assert!(matches!(
            Scalar::variable(f64::NAN),
            Err(ScalarAutodiffError::NonFiniteLeaf {
                operation: ScalarOperation::Variable,
                ..
            })
        ));
        let maximum = Scalar::variable(f64::MAX).unwrap();
        assert!(matches!(
            maximum.add(&maximum),
            Err(ScalarAutodiffError::NonFiniteResult {
                operation: ScalarOperation::Add,
                ..
            })
        ));
        assert!(matches!(
            maximum.exp(),
            Err(ScalarAutodiffError::NonFiniteResult {
                operation: ScalarOperation::Exp,
                ..
            })
        ));
    }

    #[test]
    fn invalid_backward_requests_leave_gradients_bit_identical() {
        let constant = Scalar::constant(1.0).unwrap();
        assert!(matches!(
            constant.backward(),
            Err(ScalarAutodiffError::UntrackedOutput { .. })
        ));

        let variable = Scalar::variable(1.0).unwrap();
        let before = variable.gradient().unwrap().to_bits();
        assert!(matches!(
            variable.backward_with_seed(f64::INFINITY),
            Err(ScalarAutodiffError::NonFiniteSeed { .. })
        ));
        assert_eq!(variable.gradient().unwrap().to_bits(), before);

        let large = Scalar::variable(f64::MAX).unwrap();
        let zero = Scalar::variable(0.0).unwrap();
        let finite_product = large.mul(&zero).unwrap();
        assert!(matches!(
            finite_product.backward_with_seed(2.0),
            Err(ScalarAutodiffError::NonFiniteContribution {
                child: 2,
                parent: 1,
                operand: 1,
                ..
            })
        ));
        assert_eq!(large.gradient(), Some(0.0));
        assert_eq!(zero.gradient(), Some(0.0));
        assert_eq!(finite_product.gradient(), Some(0.0));

        let reused = Scalar::variable(1.0).unwrap();
        let sum = reused.add(&reused).unwrap();
        assert!(matches!(
            sum.backward_with_seed(f64::MAX),
            Err(ScalarAutodiffError::NonFinitePassAdjoint { node: 0, .. })
        ));
        assert_eq!(reused.gradient(), Some(0.0));
        assert_eq!(sum.gradient(), Some(0.0));

        let accumulated = Scalar::variable(1.0).unwrap();
        accumulated.backward_with_seed(f64::MAX).unwrap();
        let stored = accumulated.gradient().unwrap().to_bits();
        assert!(matches!(
            accumulated.backward_with_seed(f64::MAX),
            Err(ScalarAutodiffError::NonFiniteAccumulatedGradient { node: 0, .. })
        ));
        assert_eq!(accumulated.gradient().unwrap().to_bits(), stored);
    }

    #[test]
    fn cloned_handles_share_one_node_while_detach_does_not() {
        let x = Scalar::variable(-0.0).unwrap();
        let clone = x.clone();
        let detached = x.detach();
        assert!(x.is_same_node(&clone));
        assert!(!x.is_same_node(&detached));
        assert_eq!(detached.value().to_bits(), (-0.0_f64).to_bits());
    }
}
