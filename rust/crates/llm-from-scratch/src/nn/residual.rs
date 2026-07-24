use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};

/// An exact-shape residual merge that could not be formed.
#[derive(Clone, Debug, PartialEq)]
pub enum ResidualError {
    ShapeMismatch {
        identity: Vec<usize>,
        branch: Vec<usize>,
    },
    Autodiff(TensorAutodiffError),
}

impl fmt::Display for ResidualError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ShapeMismatch { identity, branch } => write!(
                formatter,
                "residual paths must have exactly equal shapes; identity {identity:?}, branch {branch:?}"
            ),
            Self::Autodiff(error) => write!(formatter, "residual addition failed: {error}"),
        }
    }
}

impl Error for ResidualError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::ShapeMismatch { .. } => None,
            Self::Autodiff(error) => Some(error),
        }
    }
}

impl From<TensorAutodiffError> for ResidualError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}

// region:residual-add
/// Adds an identity path to one same-shaped branch output.
///
/// The lower-level tensor addition supports broadcasting. A residual connection
/// does not: the branch must return exactly the residual stream's complete shape.
/// This utility owns no parameters and preserves both operands' tape edges.
pub fn residual_add(
    identity: &TensorValue,
    branch_output: &TensorValue,
) -> Result<TensorValue, ResidualError> {
    let identity_shape = identity.shape();
    let branch_shape = branch_output.shape();
    if identity_shape != branch_shape {
        return Err(ResidualError::ShapeMismatch {
            identity: identity_shape,
            branch: branch_shape,
        });
    }
    Ok(identity.add(branch_output)?)
}
// endregion:residual-add

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::tensor_core::{GraphRetention, TensorOperation};
    use crate::tensor::storage::Tensor;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).expect("valid test tensor")
    }

    #[test]
    fn exact_shapes_preserve_scalar_and_empty_axis_cases() {
        let scalar = TensorValue::constant(tensor(&[], &[2.0])).unwrap();
        let scalar_branch = TensorValue::constant(tensor(&[], &[-0.5])).unwrap();
        assert_eq!(
            residual_add(&scalar, &scalar_branch)
                .unwrap()
                .value()
                .as_slice(),
            &[1.5]
        );

        let empty = TensorValue::constant(tensor(&[0, 2], &[])).unwrap();
        let empty_branch = TensorValue::constant(tensor(&[0, 2], &[])).unwrap();
        let output = residual_add(&empty, &empty_branch).unwrap();
        assert_eq!(output.shape(), [0, 2]);
        assert!(output.value().is_empty());
    }

    #[test]
    fn broadcastable_shapes_are_rejected_before_generic_addition() {
        let identity = TensorValue::constant(tensor(&[2, 2], &[1.0, 2.0, 3.0, 4.0])).unwrap();
        let branch = TensorValue::constant(tensor(&[2], &[10.0, 20.0])).unwrap();
        assert_eq!(identity.add(&branch).unwrap().shape(), [2, 2]);
        assert_eq!(
            residual_add(&identity, &branch).unwrap_err(),
            ResidualError::ShapeMismatch {
                identity: vec![2, 2],
                branch: vec![2],
            }
        );
    }

    #[test]
    fn the_same_leaf_on_both_paths_accumulates_both_edges() {
        let input = TensorValue::parameter(tensor(&[2], &[2.0, -1.0])).unwrap();
        let output = residual_add(&input, &input).unwrap();
        output
            .backward_with_seed(&tensor(&[2], &[1.5, -2.0]).view(), GraphRetention::Retain)
            .unwrap();
        assert_eq!(input.gradient().unwrap().as_slice(), &[3.0, -4.0]);
    }

    #[test]
    fn delegated_tape_errors_keep_their_source() {
        let input = TensorValue::parameter(tensor(&[2], &[1.0, -1.0])).unwrap();
        let scale = TensorValue::constant(tensor(&[2], &[2.0, 3.0])).unwrap();
        let released_branch = input.mul(&scale).unwrap();
        released_branch
            .backward_with_seed(&tensor(&[2], &[1.0, 1.0]).view(), GraphRetention::Release)
            .unwrap();
        let identity = TensorValue::constant(tensor(&[2], &[0.0, 0.0])).unwrap();
        assert!(matches!(
            residual_add(&identity, &released_branch),
            Err(ResidualError::Autodiff(
                TensorAutodiffError::ReleasedOperand {
                    operation: TensorOperation::Add,
                    operand: 1,
                }
            ))
        ));
    }
}
