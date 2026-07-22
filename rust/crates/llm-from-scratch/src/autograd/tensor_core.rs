//! A dependency-free reverse-mode tape for owned tensors.

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::error::Error;
use std::fmt;
use std::rc::Rc;

use crate::tensor::ops::{
    TensorOpError, broadcast_shape, map_binary, mean_axis as tensor_mean_axis,
    sum_axis as tensor_sum_axis,
};
use crate::tensor::storage::{Tensor, TensorError};
use crate::tensor::view::{TensorView, TensorViewError};

type NodeKey = *const RefCell<Node>;

/// The tensor operation represented by one tape node.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TensorOperation {
    Parameter,
    Constant,
    Detached,
    Add,
    Multiply,
    Reshape,
    Transpose,
    Broadcast,
    Sum,
    Mean,
}

impl TensorOperation {
    /// A stable, locale-neutral name suitable for trace evidence.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Parameter => "parameter",
            Self::Constant => "constant",
            Self::Detached => "detached",
            Self::Add => "add",
            Self::Multiply => "mul",
            Self::Reshape => "reshape",
            Self::Transpose => "transpose",
            Self::Broadcast => "broadcast",
            Self::Sum => "sum",
            Self::Mean => "mean",
        }
    }

    fn is_leaf(self) -> bool {
        matches!(self, Self::Parameter | Self::Constant | Self::Detached)
    }
}

impl fmt::Display for TensorOperation {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// Whether a successful backward pass keeps or frees its operation tape.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GraphRetention {
    Retain,
    Release,
}

/// Immutable forward facts used by one exact-shape vector-Jacobian product.
#[derive(Clone, Debug, PartialEq)]
pub enum TensorSavedContext {
    /// Identity derivative followed by reduction back to the operand shape.
    Broadcast {
        input_shape: Vec<usize>,
        output_shape: Vec<usize>,
        reduced_axes: Vec<usize>,
    },
    /// The other operand's primal is needed before unbroadcasting.
    Multiply {
        other: Tensor,
        input_shape: Vec<usize>,
        output_shape: Vec<usize>,
        reduced_axes: Vec<usize>,
    },
    /// A reshape preserves flat row-major order in both directions.
    Reshape {
        input_shape: Vec<usize>,
        output_shape: Vec<usize>,
    },
    /// Swapping the same axes reverses a transpose.
    Transpose {
        first_axis: usize,
        second_axis: usize,
        input_shape: Vec<usize>,
        output_shape: Vec<usize>,
    },
    /// Sum uses divisor one; mean uses the selected axis length.
    Reduction {
        axis: usize,
        keep_dim: bool,
        divisor: usize,
        input_shape: Vec<usize>,
        output_shape: Vec<usize>,
    },
}

// region:tensor-autodiff-errors
/// A deterministic rejection from tensor tape construction or reversal.
#[derive(Clone, Debug, PartialEq)]
pub enum TensorAutodiffError {
    Tensor(TensorError),
    View(TensorViewError),
    Operation(TensorOpError),
    BroadcastTargetMismatch {
        input: Vec<usize>,
        requested: Vec<usize>,
        inferred: Vec<usize>,
    },
    NonFiniteLeaf {
        operation: TensorOperation,
        index: usize,
        value: f64,
    },
    NonFiniteForward {
        operation: TensorOperation,
        index: usize,
        value: f64,
    },
    UntrackedOutput {
        operation: TensorOperation,
    },
    GraphReleased {
        operation: TensorOperation,
    },
    ReleasedOperand {
        operation: TensorOperation,
        operand: usize,
    },
    SeedShapeMismatch {
        expected: Vec<usize>,
        actual: Vec<usize>,
    },
    NonFiniteSeed {
        index: usize,
        value: f64,
    },
    NonFiniteVjp {
        child: usize,
        parent: usize,
        operand: usize,
        index: usize,
        value: f64,
    },
    NonFinitePassAdjoint {
        node: usize,
        index: usize,
        previous: f64,
        contribution: f64,
    },
    NonFiniteAccumulatedGradient {
        node: usize,
        index: usize,
        stored: f64,
        pass_adjoint: f64,
    },
    NotAParameter {
        operation: TensorOperation,
    },
}

impl fmt::Display for TensorAutodiffError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Tensor(error) => error.fmt(formatter),
            Self::View(error) => error.fmt(formatter),
            Self::Operation(error) => error.fmt(formatter),
            Self::BroadcastTargetMismatch {
                input,
                requested,
                inferred,
            } => write!(
                formatter,
                "cannot broadcast shape {input:?} exactly to {requested:?}; broadcasting infers {inferred:?}"
            ),
            Self::NonFiniteLeaf {
                operation,
                index,
                value,
            } => write!(
                formatter,
                "{operation} tensor value at flat index {index} must be finite, got {value:?}"
            ),
            Self::NonFiniteForward {
                operation,
                index,
                value,
            } => write!(
                formatter,
                "{operation} produced non-finite value {value:?} at flat index {index}"
            ),
            Self::UntrackedOutput { operation } => write!(
                formatter,
                "cannot backpropagate from untracked {operation} output"
            ),
            Self::GraphReleased { operation } => {
                write!(
                    formatter,
                    "the {operation} operation tape has been released"
                )
            }
            Self::ReleasedOperand { operation, operand } => write!(
                formatter,
                "cannot build {operation}: operand {operand} reaches a released operation tape"
            ),
            Self::SeedShapeMismatch { expected, actual } => write!(
                formatter,
                "backward seed shape {actual:?} does not match output shape {expected:?}"
            ),
            Self::NonFiniteSeed { index, value } => write!(
                formatter,
                "backward seed at flat index {index} must be finite, got {value:?}"
            ),
            Self::NonFiniteVjp {
                child,
                parent,
                operand,
                index,
                value,
            } => write!(
                formatter,
                "edge {operand} from topology node {child} to {parent} produced non-finite VJP value {value:?} at flat index {index}"
            ),
            Self::NonFinitePassAdjoint {
                node,
                index,
                previous,
                contribution,
            } => write!(
                formatter,
                "topology node {node} cannot accumulate pass-adjoint value {previous:?} plus {contribution:?} at flat index {index}"
            ),
            Self::NonFiniteAccumulatedGradient {
                node,
                index,
                stored,
                pass_adjoint,
            } => write!(
                formatter,
                "topology node {node} cannot accumulate stored gradient {stored:?} plus pass adjoint {pass_adjoint:?} at flat index {index}"
            ),
            Self::NotAParameter { operation } => {
                write!(
                    formatter,
                    "cannot clear a gradient on {operation}; only parameters store gradients"
                )
            }
        }
    }
}

impl Error for TensorAutodiffError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(error) => Some(error),
            Self::View(error) => Some(error),
            Self::Operation(error) => Some(error),
            _ => None,
        }
    }
}

impl From<TensorError> for TensorAutodiffError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

impl From<TensorViewError> for TensorAutodiffError {
    fn from(error: TensorViewError) -> Self {
        Self::View(error)
    }
}

impl From<TensorOpError> for TensorAutodiffError {
    fn from(error: TensorOpError) -> Self {
        Self::Operation(error)
    }
}
// endregion:tensor-autodiff-errors

// region:tensor-tape-values
#[derive(Clone)]
struct ParentEdge {
    parent: TensorValue,
    saved: TensorSavedContext,
}

struct Node {
    value: Tensor,
    operation: TensorOperation,
    parents: Vec<ParentEdge>,
    tracked: bool,
    parameter_gradient: Option<Tensor>,
    released: bool,
}

/// One owned tensor value and its operation-level reverse-mode tape.
#[derive(Clone)]
pub struct TensorValue {
    node: Rc<RefCell<Node>>,
}

impl fmt::Debug for TensorValue {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("TensorValue")
            .field("shape", &self.shape())
            .field("operation", &self.operation())
            .field("tracks_gradient", &self.tracks_gradient())
            .field("gradient", &self.gradient())
            .field("released", &self.is_released())
            .finish()
    }
}

/// One node in the deterministic parent-first topology of a backward pass.
#[derive(Clone, Debug, PartialEq)]
pub struct TensorBackwardNode {
    pub topology_index: usize,
    pub operation: TensorOperation,
    pub shape: Vec<usize>,
    pub tracked: bool,
    pub parameter: bool,
    pub pass_adjoint: Option<Tensor>,
    pub accumulated_gradient: Option<Tensor>,
}

/// One ordered operand edge visited during tensor reverse traversal.
#[derive(Clone, Debug, PartialEq)]
pub struct TensorBackwardEdge {
    pub reverse_index: usize,
    pub child: usize,
    pub parent: usize,
    pub operand: usize,
    pub saved: TensorSavedContext,
    pub upstream: Tensor,
    pub contribution: Tensor,
    pub parent_tracked: bool,
    pub parent_adjoint_before: Option<Tensor>,
    pub parent_adjoint_after: Option<Tensor>,
}

/// Rust-authored evidence from one fresh, successfully committed tensor pass.
#[derive(Clone, Debug, PartialEq)]
pub struct TensorBackwardPass {
    pub seed: Tensor,
    pub retention: GraphRetention,
    pub nodes: Vec<TensorBackwardNode>,
    pub edges: Vec<TensorBackwardEdge>,
}

impl TensorValue {
    /// Creates a finite leaf parameter initialized with an exact-shape zero gradient.
    pub fn parameter(value: Tensor) -> Result<Self, TensorAutodiffError> {
        check_finite_leaf(&value, TensorOperation::Parameter)?;
        let gradient = zeros(value.shape())?;
        Ok(Self::new_node(
            value,
            TensorOperation::Parameter,
            Vec::new(),
            true,
            Some(gradient),
        ))
    }

    /// Creates a finite untracked tensor leaf.
    pub fn constant(value: Tensor) -> Result<Self, TensorAutodiffError> {
        check_finite_leaf(&value, TensorOperation::Constant)?;
        Ok(Self::new_node(
            value,
            TensorOperation::Constant,
            Vec::new(),
            false,
            None,
        ))
    }

    fn new_node(
        value: Tensor,
        operation: TensorOperation,
        parents: Vec<ParentEdge>,
        tracked: bool,
        parameter_gradient: Option<Tensor>,
    ) -> Self {
        Self {
            node: Rc::new(RefCell::new(Node {
                value,
                operation,
                parents,
                tracked,
                parameter_gradient,
                released: false,
            })),
        }
    }

    fn operation_node(
        value: Tensor,
        operation: TensorOperation,
        parents: Vec<ParentEdge>,
    ) -> Result<Self, TensorAutodiffError> {
        check_finite_forward(&value, operation)?;
        let tracked = parents.iter().any(|edge| edge.parent.tracks_gradient());
        Ok(Self::new_node(value, operation, parents, tracked, None))
    }

    /// Copies the owned primal tensor.
    pub fn value(&self) -> Tensor {
        self.node.borrow().value.clone()
    }

    /// Copies the primal shape.
    pub fn shape(&self) -> Vec<usize> {
        self.node.borrow().value.shape().to_vec()
    }

    pub fn operation(&self) -> TensorOperation {
        self.node.borrow().operation
    }

    pub fn tracks_gradient(&self) -> bool {
        self.node.borrow().tracked
    }

    pub fn is_parameter(&self) -> bool {
        self.operation() == TensorOperation::Parameter
    }

    pub fn is_released(&self) -> bool {
        self.node.borrow().released
    }

    /// Copies the accumulated gradient stored only by a parameter leaf.
    pub fn gradient(&self) -> Option<Tensor> {
        self.node.borrow().parameter_gradient.clone()
    }

    /// Returns whether two handles refer to the same tape node.
    pub fn is_same_node(&self, other: &Self) -> bool {
        Rc::ptr_eq(&self.node, &other.node)
    }

    /// Copies the primal into a new untracked leaf and severs all parent edges.
    pub fn detach(&self) -> Self {
        Self::new_node(
            self.value(),
            TensorOperation::Detached,
            Vec::new(),
            false,
            None,
        )
    }
}
// endregion:tensor-tape-values

// region:tensor-forward-operations
impl TensorValue {
    /// Adds two tensors using trailing-axis broadcasting.
    pub fn add(&self, other: &Self) -> Result<Self, TensorAutodiffError> {
        ensure_operands_available(TensorOperation::Add, &[self, other])?;
        let left = self.value();
        let right = other.value();
        let value = map_binary(&left.view(), &right.view(), |a, b| a + b)?;
        let output_shape = value.shape().to_vec();
        let parents = vec![
            ParentEdge {
                parent: self.clone(),
                saved: broadcast_context(left.shape(), &output_shape),
            },
            ParentEdge {
                parent: other.clone(),
                saved: broadcast_context(right.shape(), &output_shape),
            },
        ];
        Self::operation_node(value, TensorOperation::Add, parents)
    }

    /// Multiplies two tensors and records one ordered edge per operand use.
    pub fn mul(&self, other: &Self) -> Result<Self, TensorAutodiffError> {
        ensure_operands_available(TensorOperation::Multiply, &[self, other])?;
        let left = self.value();
        let right = other.value();
        let value = map_binary(&left.view(), &right.view(), |a, b| a * b)?;
        let output_shape = value.shape().to_vec();
        let parents = vec![
            ParentEdge {
                parent: self.clone(),
                saved: multiply_context(left.shape(), &output_shape, right.clone()),
            },
            ParentEdge {
                parent: other.clone(),
                saved: multiply_context(right.shape(), &output_shape, left),
            },
        ];
        Self::operation_node(value, TensorOperation::Multiply, parents)
    }

    /// Changes shape without changing row-major element order.
    pub fn reshape(&self, shape: &[usize]) -> Result<Self, TensorAutodiffError> {
        ensure_operands_available(TensorOperation::Reshape, &[self])?;
        let input = self.value();
        let value = input.view().reshape(shape)?.materialize()?;
        let saved = TensorSavedContext::Reshape {
            input_shape: input.shape().to_vec(),
            output_shape: value.shape().to_vec(),
        };
        Self::operation_node(
            value,
            TensorOperation::Reshape,
            vec![ParentEdge {
                parent: self.clone(),
                saved,
            }],
        )
    }

    /// Swaps two axes and materializes the logical result as owned storage.
    pub fn transpose(
        &self,
        first_axis: usize,
        second_axis: usize,
    ) -> Result<Self, TensorAutodiffError> {
        ensure_operands_available(TensorOperation::Transpose, &[self])?;
        let input = self.value();
        let value = input
            .view()
            .transpose(first_axis, second_axis)?
            .materialize()?;
        let saved = TensorSavedContext::Transpose {
            first_axis,
            second_axis,
            input_shape: input.shape().to_vec(),
            output_shape: value.shape().to_vec(),
        };
        Self::operation_node(
            value,
            TensorOperation::Transpose,
            vec![ParentEdge {
                parent: self.clone(),
                saved,
            }],
        )
    }

    /// Broadcasts exactly to `shape`; the requested shape may only expand axes.
    pub fn broadcast_to(&self, shape: &[usize]) -> Result<Self, TensorAutodiffError> {
        ensure_operands_available(TensorOperation::Broadcast, &[self])?;
        let input = self.value();
        let inferred = broadcast_shape(input.shape(), shape)?;
        if inferred != shape {
            return Err(TensorAutodiffError::BroadcastTargetMismatch {
                input: input.shape().to_vec(),
                requested: shape.to_vec(),
                inferred,
            });
        }
        let blank = zeros(shape)?;
        let value = map_binary(&input.view(), &blank.view(), |value, _| value)?;
        Self::operation_node(
            value,
            TensorOperation::Broadcast,
            vec![ParentEdge {
                parent: self.clone(),
                saved: broadcast_context(input.shape(), shape),
            }],
        )
    }

    /// Sums one axis and records how to expand its exact-shape VJP.
    pub fn sum_axis(&self, axis: usize, keep_dim: bool) -> Result<Self, TensorAutodiffError> {
        self.reduce_axis(axis, keep_dim, false)
    }

    /// Averages one nonempty axis and records the divisor for its VJP.
    pub fn mean_axis(&self, axis: usize, keep_dim: bool) -> Result<Self, TensorAutodiffError> {
        self.reduce_axis(axis, keep_dim, true)
    }

    fn reduce_axis(
        &self,
        axis: usize,
        keep_dim: bool,
        mean: bool,
    ) -> Result<Self, TensorAutodiffError> {
        let operation = if mean {
            TensorOperation::Mean
        } else {
            TensorOperation::Sum
        };
        ensure_operands_available(operation, &[self])?;
        let input = self.value();
        let value = if mean {
            tensor_mean_axis(&input.view(), axis, keep_dim)?
        } else {
            tensor_sum_axis(&input.view(), axis, keep_dim)?
        };
        let divisor = if mean { input.shape()[axis] } else { 1 };
        let saved = TensorSavedContext::Reduction {
            axis,
            keep_dim,
            divisor,
            input_shape: input.shape().to_vec(),
            output_shape: value.shape().to_vec(),
        };
        Self::operation_node(
            value,
            operation,
            vec![ParentEdge {
                parent: self.clone(),
                saved,
            }],
        )
    }
}
// endregion:tensor-forward-operations

impl TensorValue {
    fn key(&self) -> NodeKey {
        Rc::as_ptr(&self.node)
    }

    fn topology(&self) -> Result<Vec<Self>, TensorAutodiffError> {
        fn visit(
            node: &TensorValue,
            visited: &mut HashSet<NodeKey>,
            order: &mut Vec<TensorValue>,
        ) -> Result<(), TensorAutodiffError> {
            if !visited.insert(node.key()) {
                return Ok(());
            }
            let borrowed = node.node.borrow();
            if borrowed.released {
                return Err(TensorAutodiffError::GraphReleased {
                    operation: borrowed.operation,
                });
            }
            let parents = borrowed.parents.clone();
            drop(borrowed);
            for edge in parents {
                visit(&edge.parent, visited, order)?;
            }
            order.push(node.clone());
            Ok(())
        }

        let mut visited = HashSet::new();
        let mut order = Vec::new();
        visit(self, &mut visited, &mut order)?;
        Ok(order)
    }

    // region:tensor-reverse-pass
    /// Reverses a rank-zero output with an implicit scalar seed of one.
    pub fn backward(&self) -> Result<TensorBackwardPass, TensorAutodiffError> {
        if self.is_released() {
            return Err(TensorAutodiffError::GraphReleased {
                operation: self.operation(),
            });
        }
        if !self.tracks_gradient() {
            return Err(TensorAutodiffError::UntrackedOutput {
                operation: self.operation(),
            });
        }
        if self.shape() != Vec::<usize>::new() {
            return Err(TensorAutodiffError::SeedShapeMismatch {
                expected: self.shape(),
                actual: Vec::new(),
            });
        }
        let seed = Tensor::from_vec(Vec::new(), vec![1.0])?;
        self.backward_with_seed(&seed.view(), GraphRetention::Retain)
    }

    /// Runs a fresh exact-shape reverse pass and commits it transactionally.
    ///
    /// Stored parameter gradients and graph edges remain bit-identical unless
    /// every VJP, pass accumulation, and prospective stored gradient is finite.
    pub fn backward_with_seed(
        &self,
        seed: &TensorView<'_>,
        retention: GraphRetention,
    ) -> Result<TensorBackwardPass, TensorAutodiffError> {
        if self.is_released() {
            return Err(TensorAutodiffError::GraphReleased {
                operation: self.operation(),
            });
        }
        if !self.tracks_gradient() {
            return Err(TensorAutodiffError::UntrackedOutput {
                operation: self.operation(),
            });
        }
        let topology = self.topology()?;
        let expected = self.shape();
        if seed.shape() != expected {
            return Err(TensorAutodiffError::SeedShapeMismatch {
                expected,
                actual: seed.shape().to_vec(),
            });
        }
        let seed = seed.materialize()?;
        if let Some((index, value)) = first_nonfinite(&seed) {
            return Err(TensorAutodiffError::NonFiniteSeed { index, value });
        }

        let indices = topology
            .iter()
            .enumerate()
            .map(|(index, value)| (value.key(), index))
            .collect::<HashMap<_, _>>();
        let mut pass_adjoints = vec![None; topology.len()];
        pass_adjoints[topology.len() - 1] = Some(seed.clone());
        let mut edges = Vec::new();

        for child in (0..topology.len()).rev() {
            let Some(upstream) = pass_adjoints[child].clone() else {
                continue;
            };
            let parents = topology[child].node.borrow().parents.clone();
            for (operand, edge) in parents.iter().enumerate() {
                let parent = indices[&edge.parent.key()];
                let contribution = apply_vjp(&upstream, &edge.saved)?;
                if let Some((index, value)) = first_nonfinite(&contribution) {
                    return Err(TensorAutodiffError::NonFiniteVjp {
                        child,
                        parent,
                        operand,
                        index,
                        value,
                    });
                }

                let parent_tracked = edge.parent.tracks_gradient();
                let (before, after) = if parent_tracked {
                    let previous = pass_adjoints[parent]
                        .clone()
                        .unwrap_or(zeros(edge.parent.shape().as_slice())?);
                    let next =
                        add_checked(&previous, &contribution, |index, previous, contribution| {
                            TensorAutodiffError::NonFinitePassAdjoint {
                                node: parent,
                                index,
                                previous,
                                contribution,
                            }
                        })?;
                    pass_adjoints[parent] = Some(next.clone());
                    (Some(previous), Some(next))
                } else {
                    (None, None)
                };

                edges.push(TensorBackwardEdge {
                    reverse_index: edges.len(),
                    child,
                    parent,
                    operand,
                    saved: edge.saved.clone(),
                    upstream: upstream.clone(),
                    contribution,
                    parent_tracked,
                    parent_adjoint_before: before,
                    parent_adjoint_after: after,
                });
            }
        }

        let mut prospective = vec![None; topology.len()];
        for (index, value) in topology.iter().enumerate() {
            let Some(stored) = value.gradient() else {
                continue;
            };
            let pass = pass_adjoints[index]
                .clone()
                .unwrap_or(zeros(value.shape().as_slice())?);
            prospective[index] = Some(add_checked(
                &stored,
                &pass,
                |element, stored, pass_adjoint| TensorAutodiffError::NonFiniteAccumulatedGradient {
                    node: index,
                    index: element,
                    stored,
                    pass_adjoint,
                },
            )?);
        }

        for (value, gradient) in topology.iter().zip(&prospective) {
            if let Some(gradient) = gradient {
                value.node.borrow_mut().parameter_gradient = Some(gradient.clone());
            }
        }

        let nodes = topology
            .iter()
            .enumerate()
            .map(|(topology_index, value)| TensorBackwardNode {
                topology_index,
                operation: value.operation(),
                shape: value.shape(),
                tracked: value.tracks_gradient(),
                parameter: value.is_parameter(),
                pass_adjoint: pass_adjoints[topology_index].clone(),
                accumulated_gradient: prospective[topology_index].clone(),
            })
            .collect();
        let pass = TensorBackwardPass {
            seed,
            retention,
            nodes,
            edges,
        };

        if retention == GraphRetention::Release {
            for value in &topology {
                let mut node = value.node.borrow_mut();
                if !node.operation.is_leaf() {
                    node.parents.clear();
                    node.released = true;
                }
            }
        }

        Ok(pass)
    }

    /// Clears this parameter's accumulated gradient without changing its tape.
    pub fn zero_grad(&self) -> Result<(), TensorAutodiffError> {
        if !self.is_parameter() {
            return Err(TensorAutodiffError::NotAParameter {
                operation: self.operation(),
            });
        }
        let shape = self.shape();
        self.node.borrow_mut().parameter_gradient = Some(zeros(&shape)?);
        Ok(())
    }
    // endregion:tensor-reverse-pass
}

fn ensure_operands_available(
    operation: TensorOperation,
    operands: &[&TensorValue],
) -> Result<(), TensorAutodiffError> {
    for (operand, value) in operands.iter().enumerate() {
        if value.topology().is_err() {
            return Err(TensorAutodiffError::ReleasedOperand { operation, operand });
        }
    }
    Ok(())
}

fn check_finite_leaf(
    tensor: &Tensor,
    operation: TensorOperation,
) -> Result<(), TensorAutodiffError> {
    if let Some((index, value)) = first_nonfinite(tensor) {
        Err(TensorAutodiffError::NonFiniteLeaf {
            operation,
            index,
            value,
        })
    } else {
        Ok(())
    }
}

fn check_finite_forward(
    tensor: &Tensor,
    operation: TensorOperation,
) -> Result<(), TensorAutodiffError> {
    if let Some((index, value)) = first_nonfinite(tensor) {
        Err(TensorAutodiffError::NonFiniteForward {
            operation,
            index,
            value,
        })
    } else {
        Ok(())
    }
}

fn first_nonfinite(tensor: &Tensor) -> Option<(usize, f64)> {
    tensor
        .as_slice()
        .iter()
        .copied()
        .enumerate()
        .find(|(_, value)| !value.is_finite())
}

fn zeros(shape: &[usize]) -> Result<Tensor, TensorAutodiffError> {
    let elements = shape.iter().try_fold(1usize, |count, &dimension| {
        count
            .checked_mul(dimension)
            .ok_or(TensorError::ShapeOverflow)
    })?;
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| TensorOpError::OutputAllocationFailed { elements })?;
    values.resize(elements, 0.0);
    Ok(Tensor::from_vec(shape.to_vec(), values)?)
}

// region:tensor-structural-vjps
fn broadcast_context(input_shape: &[usize], output_shape: &[usize]) -> TensorSavedContext {
    TensorSavedContext::Broadcast {
        input_shape: input_shape.to_vec(),
        output_shape: output_shape.to_vec(),
        reduced_axes: broadcast_reduced_axes(input_shape, output_shape),
    }
}

fn multiply_context(
    input_shape: &[usize],
    output_shape: &[usize],
    other: Tensor,
) -> TensorSavedContext {
    TensorSavedContext::Multiply {
        other,
        input_shape: input_shape.to_vec(),
        output_shape: output_shape.to_vec(),
        reduced_axes: broadcast_reduced_axes(input_shape, output_shape),
    }
}

fn broadcast_reduced_axes(input_shape: &[usize], output_shape: &[usize]) -> Vec<usize> {
    let padding = output_shape.len() - input_shape.len();
    (0..output_shape.len())
        .filter(|&axis| {
            axis < padding || (input_shape[axis - padding] == 1 && output_shape[axis] != 1)
        })
        .collect()
}

fn apply_vjp(upstream: &Tensor, saved: &TensorSavedContext) -> Result<Tensor, TensorAutodiffError> {
    match saved {
        TensorSavedContext::Broadcast {
            input_shape,
            output_shape,
            ..
        } => {
            debug_assert_eq!(upstream.shape(), output_shape);
            unbroadcast(upstream, input_shape)
        }
        TensorSavedContext::Multiply {
            other,
            input_shape,
            output_shape,
            ..
        } => {
            debug_assert_eq!(upstream.shape(), output_shape);
            let product = map_binary(&upstream.view(), &other.view(), |a, b| a * b)?;
            unbroadcast(&product, input_shape)
        }
        TensorSavedContext::Reshape {
            input_shape,
            output_shape,
        } => {
            debug_assert_eq!(upstream.shape(), output_shape);
            Ok(upstream.view().reshape(input_shape)?.materialize()?)
        }
        TensorSavedContext::Transpose {
            first_axis,
            second_axis,
            output_shape,
            ..
        } => {
            debug_assert_eq!(upstream.shape(), output_shape);
            Ok(upstream
                .view()
                .transpose(*first_axis, *second_axis)?
                .materialize()?)
        }
        TensorSavedContext::Reduction {
            axis,
            keep_dim,
            divisor,
            input_shape,
            output_shape,
        } => {
            debug_assert_eq!(upstream.shape(), output_shape);
            expand_reduction(upstream, input_shape, *axis, *keep_dim, *divisor)
        }
    }
}

fn unbroadcast(upstream: &Tensor, input_shape: &[usize]) -> Result<Tensor, TensorAutodiffError> {
    let output_shape = upstream.shape();
    let padding = output_shape.len() - input_shape.len();
    let mut result = zeros(input_shape)?;
    for output_index in 0..upstream.len() {
        let output_coordinate = coordinate_from_offset(output_shape, output_index);
        let input_coordinate = input_shape
            .iter()
            .enumerate()
            .map(|(axis, &dimension)| {
                if dimension == 1 {
                    0
                } else {
                    output_coordinate[axis + padding]
                }
            })
            .collect::<Vec<_>>();
        let input_index = result.offset(&input_coordinate)?;
        result.as_mut_slice()[input_index] += upstream.as_slice()[output_index];
    }
    Ok(result)
}

fn expand_reduction(
    upstream: &Tensor,
    input_shape: &[usize],
    axis: usize,
    keep_dim: bool,
    divisor: usize,
) -> Result<Tensor, TensorAutodiffError> {
    debug_assert!(divisor > 0);
    let mut result = zeros(input_shape)?;
    for input_index in 0..result.len() {
        let input_coordinate = coordinate_from_offset(input_shape, input_index);
        let output_coordinate = if keep_dim {
            let mut coordinate = input_coordinate.clone();
            coordinate[axis] = 0;
            coordinate
        } else {
            input_coordinate
                .iter()
                .enumerate()
                .filter_map(|(input_axis, &index)| (input_axis != axis).then_some(index))
                .collect()
        };
        let output_index = upstream.offset(&output_coordinate)?;
        result.as_mut_slice()[input_index] = upstream.as_slice()[output_index] / divisor as f64;
    }
    Ok(result)
}
// endregion:tensor-structural-vjps

fn add_checked(
    left: &Tensor,
    right: &Tensor,
    nonfinite: impl Fn(usize, f64, f64) -> TensorAutodiffError,
) -> Result<Tensor, TensorAutodiffError> {
    debug_assert_eq!(left.shape(), right.shape());
    let mut values = Vec::new();
    values
        .try_reserve_exact(left.len())
        .map_err(|_| TensorOpError::OutputAllocationFailed {
            elements: left.len(),
        })?;
    for (index, (&left, &right)) in left.as_slice().iter().zip(right.as_slice()).enumerate() {
        let sum = left + right;
        if !sum.is_finite() {
            return Err(nonfinite(index, left, right));
        }
        values.push(sum);
    }
    Ok(Tensor::from_vec(left.shape().to_vec(), values)?)
}

fn coordinate_from_offset(shape: &[usize], mut offset: usize) -> Vec<usize> {
    let mut coordinate = vec![0; shape.len()];
    for axis in (0..shape.len()).rev() {
        debug_assert!(shape[axis] > 0, "empty tensors are never enumerated");
        coordinate[axis] = offset % shape[axis];
        offset /= shape[axis];
    }
    coordinate
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn scalar(value: f64) -> Tensor {
        tensor(&[], &[value])
    }

    fn assert_close(actual: &[f64], expected: &[f64], tolerance: f64) {
        assert_eq!(actual.len(), expected.len());
        for (index, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
            assert!(
                (actual - expected).abs() <= tolerance,
                "index {index}: expected {expected:?}, got {actual:?}"
            );
        }
    }

    #[test]
    fn transformer_shaped_fixture_reverses_views_broadcasts_and_reductions() {
        let x = TensorValue::parameter(tensor(&[2, 3], &[1.0, 2.0, 3.0, 4.0, 5.0, 6.0])).unwrap();
        let reshaped = x.reshape(&[3, 2]).unwrap();
        let transposed = reshaped.transpose(0, 1).unwrap();
        let bias = TensorValue::parameter(tensor(&[3], &[1.0, -1.0, 0.0])).unwrap();
        let broadcast_bias = bias.broadcast_to(&[2, 3]).unwrap();
        let shifted = transposed.add(&broadcast_bias).unwrap();
        let squared = shifted.mul(&shifted).unwrap();
        let output = squared.mean_axis(1, false).unwrap();
        let seed = tensor(&[2], &[3.0, 6.0]);

        assert_eq!(reshaped.value().as_slice(), [1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);
        assert_eq!(
            transposed.value().as_slice(),
            [1.0, 3.0, 5.0, 2.0, 4.0, 6.0]
        );
        assert_eq!(
            broadcast_bias.value().as_slice(),
            [1.0, -1.0, 0.0, 1.0, -1.0, 0.0]
        );
        assert_eq!(shifted.value().as_slice(), [2.0, 2.0, 5.0, 3.0, 3.0, 6.0]);
        assert_eq!(output.value().as_slice(), [11.0, 18.0]);

        let pass = output
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();
        assert_eq!(
            x.gradient().unwrap().as_slice(),
            [4.0, 12.0, 4.0, 12.0, 10.0, 24.0]
        );
        assert_eq!(bias.gradient().unwrap().as_slice(), [16.0, 16.0, 34.0]);
        assert_eq!(pass.retention, GraphRetention::Retain);
        assert_eq!(pass.seed, seed);
        assert_eq!(pass.nodes.len(), 8);
        assert_eq!(pass.edges.len(), 8);
        assert_eq!(
            pass.nodes
                .iter()
                .map(|node| (node.topology_index, node.operation, node.parameter))
                .collect::<Vec<_>>(),
            [
                (0, TensorOperation::Parameter, true),
                (1, TensorOperation::Reshape, false),
                (2, TensorOperation::Transpose, false),
                (3, TensorOperation::Parameter, true),
                (4, TensorOperation::Broadcast, false),
                (5, TensorOperation::Add, false),
                (6, TensorOperation::Multiply, false),
                (7, TensorOperation::Mean, false),
            ]
        );
        assert!(
            pass.nodes
                .iter()
                .filter(|node| !node.parameter)
                .all(|node| node.accumulated_gradient.is_none())
        );

        let multiply_edges = pass
            .edges
            .iter()
            .filter(|edge| edge.child == 6)
            .collect::<Vec<_>>();
        assert_eq!(multiply_edges.len(), 2);
        assert_eq!(multiply_edges[0].operand, 0);
        assert_eq!(multiply_edges[1].operand, 1);
        assert_eq!(multiply_edges[0].parent, multiply_edges[1].parent);
        assert_eq!(
            multiply_edges[1]
                .parent_adjoint_after
                .as_ref()
                .unwrap()
                .as_slice(),
            [4.0, 4.0, 10.0, 12.0, 12.0, 24.0]
        );

        assert!(pass.edges.iter().any(|edge| matches!(
            &edge.saved,
            TensorSavedContext::Broadcast { reduced_axes, .. } if reduced_axes == &[0]
        )));
        assert!(pass.edges.iter().any(|edge| matches!(
            &edge.saved,
            TensorSavedContext::Transpose {
                first_axis: 0,
                second_axis: 1,
                ..
            }
        )));
        assert!(pass.edges.iter().any(|edge| matches!(
            &edge.saved,
            TensorSavedContext::Reduction {
                axis: 1,
                keep_dim: false,
                divisor: 3,
                ..
            }
        )));
    }

    #[test]
    fn explicit_broadcast_reduces_a_non_scalar_seed_to_the_parameter_shape() {
        let parameter = TensorValue::parameter(tensor(&[2], &[3.0, 5.0])).unwrap();
        let output = parameter.broadcast_to(&[2, 2]).unwrap();
        let seed = tensor(&[2, 2], &[1.0, 2.0, 3.0, 4.0]);

        let pass = output
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();

        assert_eq!(output.value().as_slice(), [3.0, 5.0, 3.0, 5.0]);
        assert_eq!(parameter.gradient().unwrap().as_slice(), [4.0, 6.0]);
        assert_eq!(pass.seed, seed);
        assert!(matches!(
            &pass.edges[0].saved,
            TensorSavedContext::Broadcast {
                input_shape,
                output_shape,
                reduced_axes,
            } if input_shape == &[2]
                && output_shape == &[2, 2]
                && reduced_axes == &[0]
        ));
    }

    #[test]
    fn implicit_add_and_multiply_unbroadcast_a_smaller_parameter() {
        let matrix =
            TensorValue::constant(tensor(&[2, 3], &[10.0, 20.0, 30.0, 40.0, 50.0, 60.0])).unwrap();
        let seed = tensor(&[2, 3], &[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);

        let add_parameter = TensorValue::parameter(tensor(&[3], &[1.0, 2.0, 3.0])).unwrap();
        let added = matrix.add(&add_parameter).unwrap();
        added
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();
        assert_eq!(
            add_parameter.gradient().unwrap().as_slice(),
            [5.0, 7.0, 9.0]
        );

        let multiply_parameter = TensorValue::parameter(tensor(&[3], &[1.0, 2.0, 3.0])).unwrap();
        let multiplied = multiply_parameter.mul(&matrix).unwrap();
        multiplied
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();
        assert_eq!(
            multiply_parameter.gradient().unwrap().as_slice(),
            [170.0, 290.0, 450.0]
        );
    }

    #[test]
    fn aligned_singleton_broadcast_reduces_only_the_expanded_axis() {
        let parameter =
            TensorValue::parameter(tensor(&[2, 1, 3], &[1.0, 2.0, 3.0, 4.0, 5.0, 6.0])).unwrap();
        let output = parameter.broadcast_to(&[2, 4, 3]).unwrap();
        let seed = tensor(
            &[2, 4, 3],
            &[
                1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0,
                16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0,
            ],
        );

        let pass = output
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();

        assert_eq!(
            parameter.gradient().unwrap().as_slice(),
            [22.0, 26.0, 30.0, 70.0, 74.0, 78.0]
        );
        assert!(matches!(
            &pass.edges[0].saved,
            TensorSavedContext::Broadcast {
                input_shape,
                output_shape,
                reduced_axes,
            } if input_shape == &[2, 1, 3]
                && output_shape == &[2, 4, 3]
                && reduced_axes == &[1]
        ));
    }

    #[test]
    fn reshape_and_kept_sum_restore_exact_input_shapes() {
        let parameter = TensorValue::parameter(tensor(&[2, 2], &[1.0, 2.0, 3.0, 4.0])).unwrap();
        let flat = parameter.reshape(&[4]).unwrap();
        let reshape_seed = tensor(&[4], &[1.0, 2.0, 3.0, 4.0]);
        flat.backward_with_seed(&reshape_seed.view(), GraphRetention::Retain)
            .unwrap();
        assert_eq!(
            parameter.gradient().unwrap().as_slice(),
            [1.0, 2.0, 3.0, 4.0]
        );

        parameter.zero_grad().unwrap();
        let summed = parameter.sum_axis(1, true).unwrap();
        let sum_seed = tensor(&[2, 1], &[10.0, 20.0]);
        let pass = summed
            .backward_with_seed(&sum_seed.view(), GraphRetention::Retain)
            .unwrap();
        assert_eq!(summed.shape(), [2, 1]);
        assert_eq!(
            parameter.gradient().unwrap().as_slice(),
            [10.0, 10.0, 20.0, 20.0]
        );
        assert!(matches!(
            &pass.edges[0].saved,
            TensorSavedContext::Reduction {
                axis: 1,
                keep_dim: true,
                divisor: 1,
                input_shape,
                output_shape,
            } if input_shape == &[2, 2] && output_shape == &[2, 1]
        ));
    }

    #[test]
    fn repeated_backward_is_fresh_then_parameter_zeroing_restarts_accumulation() {
        let x = TensorValue::parameter(scalar(2.0)).unwrap();
        let square = x.mul(&x).unwrap();
        let loss = square.add(&square).unwrap();

        loss.backward().unwrap();
        assert_eq!(x.gradient().unwrap().as_slice(), [8.0]);
        assert_eq!(square.gradient(), None);
        assert_eq!(loss.gradient(), None);
        loss.backward().unwrap();
        assert_eq!(x.gradient().unwrap().as_slice(), [16.0]);

        x.zero_grad().unwrap();
        assert_eq!(x.gradient().unwrap().as_slice(), [0.0]);
        loss.backward().unwrap();
        assert_eq!(x.gradient().unwrap().as_slice(), [8.0]);
        assert_eq!(
            loss.zero_grad(),
            Err(TensorAutodiffError::NotAParameter {
                operation: TensorOperation::Add,
            })
        );
    }

    #[test]
    fn detach_and_constants_cut_paths_without_changing_owned_primals() {
        let x = TensorValue::parameter(tensor(&[2], &[2.0, 3.0])).unwrap();
        let detached = x.detach();
        let constant = TensorValue::constant(tensor(&[2], &[10.0, 20.0])).unwrap();
        let live = x.mul(&x).unwrap();
        let stopped = detached.mul(&constant).unwrap();
        let output = live.add(&stopped).unwrap();
        let seed = tensor(&[2], &[1.0, 1.0]);

        output
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();
        assert_eq!(output.value().as_slice(), [24.0, 69.0]);
        assert_eq!(x.gradient().unwrap().as_slice(), [4.0, 6.0]);
        assert_eq!(detached.gradient(), None);
        assert_eq!(constant.gradient(), None);
        assert!(!x.is_same_node(&detached));
        assert_eq!(detached.operation(), TensorOperation::Detached);
    }

    #[test]
    fn release_happens_after_commit_and_rejects_backward_and_operand_reuse() {
        let x = TensorValue::parameter(scalar(3.0)).unwrap();
        let square = x.mul(&x).unwrap();
        let output = square.add(&x).unwrap();

        let pass = output
            .backward_with_seed(&scalar(1.0).view(), GraphRetention::Release)
            .unwrap();
        assert_eq!(pass.retention, GraphRetention::Release);
        assert_eq!(x.gradient().unwrap().as_slice(), [7.0]);
        assert!(square.is_released());
        assert!(output.is_released());
        assert!(!x.is_released());
        assert_eq!(
            output.backward(),
            Err(TensorAutodiffError::GraphReleased {
                operation: TensorOperation::Add,
            })
        );
        assert!(matches!(
            square.add(&x),
            Err(TensorAutodiffError::ReleasedOperand {
                operation: TensorOperation::Add,
                operand: 0,
            })
        ));

        let reused_parameter = x.add(&TensorValue::constant(scalar(1.0)).unwrap()).unwrap();
        assert_eq!(reused_parameter.value().as_slice(), [4.0]);
    }

    #[test]
    fn releasing_a_shared_ancestor_invalidates_an_existing_downstream_tape() {
        let x = TensorValue::parameter(scalar(2.0)).unwrap();
        let square = x.mul(&x).unwrap();
        let downstream = square.add(&x).unwrap();
        square
            .backward_with_seed(&scalar(1.0).view(), GraphRetention::Release)
            .unwrap();

        assert_eq!(
            downstream.backward(),
            Err(TensorAutodiffError::GraphReleased {
                operation: TensorOperation::Multiply,
            })
        );
        assert!(matches!(
            downstream.mul(&x),
            Err(TensorAutodiffError::ReleasedOperand {
                operation: TensorOperation::Multiply,
                operand: 0,
            })
        ));
    }

    #[test]
    fn invalid_requests_are_transactional_and_do_not_release_the_graph() {
        let x = TensorValue::parameter(tensor(&[1], &[f64::MAX])).unwrap();
        let zero = TensorValue::parameter(tensor(&[1], &[0.0])).unwrap();
        let product = x.mul(&zero).unwrap();
        let seed = tensor(&[1], &[2.0]);
        assert!(matches!(
            product.backward_with_seed(&seed.view(), GraphRetention::Release),
            Err(TensorAutodiffError::NonFiniteVjp {
                child: 2,
                parent: 1,
                operand: 1,
                index: 0,
                ..
            })
        ));
        assert_eq!(x.gradient().unwrap().as_slice(), [0.0]);
        assert_eq!(zero.gradient().unwrap().as_slice(), [0.0]);
        assert!(!product.is_released());

        let bad_seed = tensor(&[1], &[f64::INFINITY]);
        assert_eq!(
            product.backward_with_seed(&bad_seed.view(), GraphRetention::Release),
            Err(TensorAutodiffError::NonFiniteSeed {
                index: 0,
                value: f64::INFINITY,
            })
        );
        assert!(!product.is_released());
    }

    #[test]
    fn pass_and_stored_accumulation_overflow_are_transactional() {
        let reused = TensorValue::parameter(tensor(&[1], &[1.0])).unwrap();
        let sum = reused.add(&reused).unwrap();
        let huge_seed = tensor(&[1], &[f64::MAX]);
        assert!(matches!(
            sum.backward_with_seed(&huge_seed.view(), GraphRetention::Retain),
            Err(TensorAutodiffError::NonFinitePassAdjoint {
                node: 0,
                index: 0,
                ..
            })
        ));
        assert_eq!(reused.gradient().unwrap().as_slice(), [0.0]);

        let accumulated = TensorValue::parameter(tensor(&[1], &[1.0])).unwrap();
        accumulated
            .backward_with_seed(&huge_seed.view(), GraphRetention::Retain)
            .unwrap();
        let before = accumulated.gradient().unwrap().as_slice()[0].to_bits();
        assert!(matches!(
            accumulated.backward_with_seed(&huge_seed.view(), GraphRetention::Release),
            Err(TensorAutodiffError::NonFiniteAccumulatedGradient {
                node: 0,
                index: 0,
                ..
            })
        ));
        assert_eq!(
            accumulated.gradient().unwrap().as_slice()[0].to_bits(),
            before
        );
        assert!(!accumulated.is_released());
    }

    #[test]
    fn construction_seed_and_shape_errors_are_typed() {
        assert!(matches!(
            TensorValue::parameter(tensor(&[1], &[f64::NAN])),
            Err(TensorAutodiffError::NonFiniteLeaf {
                operation: TensorOperation::Parameter,
                index: 0,
                ..
            })
        ));

        let maximum = TensorValue::parameter(tensor(&[1], &[f64::MAX])).unwrap();
        let two = TensorValue::constant(tensor(&[1], &[2.0])).unwrap();
        assert!(matches!(
            maximum.mul(&two),
            Err(TensorAutodiffError::NonFiniteForward {
                operation: TensorOperation::Multiply,
                index: 0,
                ..
            })
        ));

        let vector = TensorValue::parameter(tensor(&[2], &[1.0, 2.0])).unwrap();
        assert_eq!(
            vector.backward(),
            Err(TensorAutodiffError::SeedShapeMismatch {
                expected: vec![2],
                actual: vec![],
            })
        );
        let wrong_seed = tensor(&[1, 2], &[1.0, 1.0]);
        assert_eq!(
            vector.backward_with_seed(&wrong_seed.view(), GraphRetention::Retain),
            Err(TensorAutodiffError::SeedShapeMismatch {
                expected: vec![2],
                actual: vec![1, 2],
            })
        );
        assert!(matches!(
            vector.broadcast_to(&[1]),
            Err(TensorAutodiffError::BroadcastTargetMismatch { .. })
        ));
        assert!(matches!(
            vector.reshape(&[3]),
            Err(TensorAutodiffError::View(
                TensorViewError::ReshapeElementCountMismatch {
                    current: 2,
                    requested: 3,
                }
            ))
        ));
    }

    #[test]
    fn untracked_and_released_precedence_is_stable_for_implicit_backward() {
        let constant = TensorValue::constant(tensor(&[2], &[1.0, 2.0])).unwrap();
        assert_eq!(
            constant.backward(),
            Err(TensorAutodiffError::UntrackedOutput {
                operation: TensorOperation::Constant,
            })
        );

        let parameter = TensorValue::parameter(tensor(&[2], &[1.0, 2.0])).unwrap();
        let output = parameter.mul(&parameter).unwrap();
        let seed = tensor(&[2], &[1.0, 1.0]);
        output
            .backward_with_seed(&seed.view(), GraphRetention::Release)
            .unwrap();
        assert_eq!(
            output.backward(),
            Err(TensorAutodiffError::GraphReleased {
                operation: TensorOperation::Multiply,
            })
        );
    }

    #[test]
    fn empty_sum_has_an_empty_exact_shape_vjp() {
        let parameter = TensorValue::parameter(tensor(&[2, 0, 3], &[])).unwrap();
        let output = parameter.sum_axis(1, false).unwrap();
        let seed = tensor(&[2, 3], &[1.0; 6]);
        output
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();

        let gradient = parameter.gradient().unwrap();
        assert_eq!(gradient.shape(), [2, 0, 3]);
        assert!(gradient.is_empty());
    }

    #[test]
    fn operation_names_errors_and_sources_are_stable() {
        assert_eq!(TensorOperation::Multiply.as_str(), "mul");
        assert_eq!(TensorOperation::Broadcast.to_string(), "broadcast");
        assert_eq!(
            TensorAutodiffError::SeedShapeMismatch {
                expected: vec![2],
                actual: vec![1, 2],
            }
            .to_string(),
            "backward seed shape [1, 2] does not match output shape [2]"
        );
        assert!(
            TensorAutodiffError::Tensor(TensorError::ShapeOverflow)
                .source()
                .is_some()
        );
        assert!(
            TensorAutodiffError::UntrackedOutput {
                operation: TensorOperation::Constant,
            }
            .source()
            .is_none()
        );
    }

    #[test]
    fn transpose_and_mean_vjps_match_simple_analytic_results() {
        let x = TensorValue::parameter(tensor(&[2, 3], &[1.0, 2.0, 3.0, 4.0, 5.0, 6.0])).unwrap();
        let transposed = x.transpose(0, 1).unwrap();
        let means = transposed.mean_axis(1, false).unwrap();
        let seed = tensor(&[3], &[2.0, 4.0, 6.0]);
        means
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();

        assert_close(
            x.gradient().unwrap().as_slice(),
            &[1.0, 2.0, 3.0, 1.0, 2.0, 3.0],
            0.0,
        );
    }
}
