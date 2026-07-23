//! Model-critical tensor operations and their local reverse-mode rules.

use std::error::Error;
use std::fmt;

use super::tensor_core::{TensorAutodiffError, TensorOperation, TensorValue};
use crate::nn::probability::{indexed_mean_nll, log_softmax, softmax};
use crate::tensor::matmul::{matmul, matmul_with_transpose};
use crate::tensor::ops::{map_binary, map_unary, sum_axis as tensor_sum_axis};
use crate::tensor::storage::{Tensor, checked_row_major_layout};

// region:model-op-errors
/// A rejected model-specific shape, selector, or allocation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ModelOpError {
    GatherTableRank {
        rank: usize,
    },
    GatherIndexCountMismatch {
        expected: usize,
        actual: usize,
    },
    GatherIndexOutOfBounds {
        position: usize,
        index: usize,
        rows: usize,
    },
    OutputAllocationFailed {
        elements: usize,
    },
}

impl fmt::Display for ModelOpError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::GatherTableRank { rank } => {
                write!(
                    formatter,
                    "row gather needs a rank-two table, got rank {rank}"
                )
            }
            Self::GatherIndexCountMismatch { expected, actual } => write!(
                formatter,
                "gather index shape needs {expected} IDs, but received {actual}"
            ),
            Self::GatherIndexOutOfBounds {
                position,
                index,
                rows,
            } => write!(
                formatter,
                "gather ID {index} at flat position {position} is out of bounds for {rows} rows"
            ),
            Self::OutputAllocationFailed { elements } => write!(
                formatter,
                "cannot allocate model-operation output for {elements} f64 values"
            ),
        }
    }
}

impl Error for ModelOpError {}
// endregion:model-op-errors

// region:model-saved-context
/// Immutable forward evidence used by one model-operation parent edge.
#[derive(Clone, Debug, PartialEq)]
pub enum ModelSavedContext {
    MatmulLeft {
        right: Tensor,
        input_shape: Vec<usize>,
        output_shape: Vec<usize>,
    },
    MatmulRight {
        left: Tensor,
        input_shape: Vec<usize>,
        output_shape: Vec<usize>,
    },
    GatherRows {
        indices: Vec<usize>,
        index_shape: Vec<usize>,
        input_shape: Vec<usize>,
        output_shape: Vec<usize>,
    },
    Exp {
        output: Tensor,
    },
    Log {
        input: Tensor,
    },
    Silu {
        input: Tensor,
        sigmoid: Tensor,
    },
    LogSoftmax {
        probabilities: Tensor,
        axis: usize,
        input_shape: Vec<usize>,
    },
    IndexedMeanNll {
        probabilities: Tensor,
        targets: Vec<usize>,
        axis: usize,
        input_shape: Vec<usize>,
        groups: usize,
    },
}
// endregion:model-saved-context

// region:model-autodiff-operations
impl TensorValue {
    /// Multiplies rank-two or batched tensors and records both matrix pullbacks.
    pub fn matmul(&self, right: &Self) -> Result<Self, TensorAutodiffError> {
        Self::model_operation(TensorOperation::MatMul, [self, right], |primals| {
            let left = &primals[0];
            let right = &primals[1];
            let value = matmul(&left.view(), &right.view())?;
            let output_shape = value.shape().to_vec();
            Ok((
                value,
                [
                    ModelSavedContext::MatmulLeft {
                        right: right.clone(),
                        input_shape: left.shape().to_vec(),
                        output_shape: output_shape.clone(),
                    },
                    ModelSavedContext::MatmulRight {
                        left: left.clone(),
                        input_shape: right.shape().to_vec(),
                        output_shape,
                    },
                ],
            ))
        })
    }

    /// Selects rows from a rank-two table into `index_shape + [width]`.
    ///
    /// IDs are integer selectors and are deliberately not tape operands.
    pub fn gather_rows(
        &self,
        indices: &[usize],
        index_shape: &[usize],
    ) -> Result<Self, TensorAutodiffError> {
        Self::model_operation(TensorOperation::GatherRows, [self], |primals| {
            let table = &primals[0];
            let value = gather_rows_forward(table, indices, index_shape)?;
            let output_shape = value.shape().to_vec();
            Ok((
                value,
                [ModelSavedContext::GatherRows {
                    indices: indices.to_vec(),
                    index_shape: index_shape.to_vec(),
                    input_shape: table.shape().to_vec(),
                    output_shape,
                }],
            ))
        })
    }

    /// Applies the elementwise exponential and saves its output for reversal.
    pub fn exp(&self) -> Result<Self, TensorAutodiffError> {
        Self::model_operation(TensorOperation::Exp, [self], |primals| {
            let value = map_unary(&primals[0].view(), f64::exp)?;
            Ok((value.clone(), [ModelSavedContext::Exp { output: value }]))
        })
    }

    /// Applies the natural logarithm; zero and negative inputs are rejected by
    /// the tape's finite-forward invariant.
    pub fn log(&self) -> Result<Self, TensorAutodiffError> {
        Self::model_operation(TensorOperation::Log, [self], |primals| {
            let input = &primals[0];
            let value = map_unary(&input.view(), f64::ln)?;
            Ok((
                value,
                [ModelSavedContext::Log {
                    input: input.clone(),
                }],
            ))
        })
    }

    /// Applies SiLU, `x * sigmoid(x)`, with a branchwise stable sigmoid.
    pub fn silu(&self) -> Result<Self, TensorAutodiffError> {
        Self::model_operation(TensorOperation::Silu, [self], |primals| {
            let input = &primals[0];
            let sigmoid = map_unary(&input.view(), stable_sigmoid)?;
            let value = map_binary(&input.view(), &sigmoid.view(), |x, probability| {
                x * probability
            })?;
            Ok((
                value,
                [ModelSavedContext::Silu {
                    input: input.clone(),
                    sigmoid,
                }],
            ))
        })
    }

    /// Applies stable log-softmax along one explicit class axis.
    pub fn log_softmax(&self, axis: usize) -> Result<Self, TensorAutodiffError> {
        Self::model_operation(TensorOperation::LogSoftmax, [self], |primals| {
            let input = &primals[0];
            let value = log_softmax(&input.view(), axis)?;
            let probabilities = softmax(&input.view(), axis)?;
            Ok((
                value,
                [ModelSavedContext::LogSoftmax {
                    probabilities,
                    axis,
                    input_shape: input.shape().to_vec(),
                }],
            ))
        })
    }

    /// Computes one stable rank-zero mean NLL from flat group-major targets.
    pub fn indexed_mean_nll(
        &self,
        axis: usize,
        targets: &[usize],
    ) -> Result<Self, TensorAutodiffError> {
        Self::model_operation(TensorOperation::IndexedMeanNll, [self], |primals| {
            let logits = &primals[0];
            let loss = indexed_mean_nll(&logits.view(), axis, targets)?;
            let probabilities = softmax(&logits.view(), axis)?;
            let value = Tensor::from_vec(Vec::new(), vec![loss])?;
            Ok((
                value,
                [ModelSavedContext::IndexedMeanNll {
                    probabilities,
                    targets: targets.to_vec(),
                    axis,
                    input_shape: logits.shape().to_vec(),
                    groups: targets.len(),
                }],
            ))
        })
    }
}
// endregion:model-autodiff-operations

fn stable_sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let exponential = value.exp();
        exponential / (1.0 + exponential)
    }
}

fn output_buffer(elements: usize) -> Result<Vec<f64>, TensorAutodiffError> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| ModelOpError::OutputAllocationFailed { elements })?;
    values.resize(elements, 0.0);
    Ok(values)
}

fn zeros(shape: &[usize]) -> Result<Tensor, TensorAutodiffError> {
    let (_, elements) = checked_row_major_layout(shape)?;
    Tensor::from_vec(shape.to_vec(), output_buffer(elements)?).map_err(Into::into)
}

fn gather_rows_forward(
    table: &Tensor,
    indices: &[usize],
    index_shape: &[usize],
) -> Result<Tensor, TensorAutodiffError> {
    if table.rank() != 2 {
        return Err(ModelOpError::GatherTableRank { rank: table.rank() }.into());
    }
    let (_, expected) = checked_row_major_layout(index_shape)?;
    if indices.len() != expected {
        return Err(ModelOpError::GatherIndexCountMismatch {
            expected,
            actual: indices.len(),
        }
        .into());
    }
    let rows = table.shape()[0];
    for (position, &index) in indices.iter().enumerate() {
        if index >= rows {
            return Err(ModelOpError::GatherIndexOutOfBounds {
                position,
                index,
                rows,
            }
            .into());
        }
    }

    let width = table.shape()[1];
    let mut output_shape = index_shape.to_vec();
    output_shape
        .try_reserve_exact(1)
        .map_err(|_| ModelOpError::OutputAllocationFailed {
            elements: indices.len().saturating_mul(width),
        })?;
    output_shape.push(width);
    let (_, output_len) = checked_row_major_layout(&output_shape)?;
    let mut values = output_buffer(output_len)?;
    for (position, &index) in indices.iter().enumerate() {
        let source = index * width;
        let destination = position * width;
        values[destination..destination + width]
            .copy_from_slice(&table.as_slice()[source..source + width]);
    }
    Tensor::from_vec(output_shape, values).map_err(Into::into)
}

// region:model-vjps
pub(crate) fn apply_model_vjp(
    upstream: &Tensor,
    saved: &ModelSavedContext,
) -> Result<Tensor, TensorAutodiffError> {
    match saved {
        ModelSavedContext::MatmulLeft {
            right,
            input_shape,
            output_shape,
        } => {
            debug_assert_eq!(upstream.shape(), output_shape);
            let expanded = matmul_with_transpose(&upstream.view(), &right.view(), false, true)?;
            unbroadcast(&expanded, input_shape)
        }
        ModelSavedContext::MatmulRight {
            left,
            input_shape,
            output_shape,
        } => {
            debug_assert_eq!(upstream.shape(), output_shape);
            let expanded = matmul_with_transpose(&left.view(), &upstream.view(), true, false)?;
            unbroadcast(&expanded, input_shape)
        }
        ModelSavedContext::GatherRows {
            indices,
            input_shape,
            output_shape,
            ..
        } => {
            debug_assert_eq!(upstream.shape(), output_shape);
            let width = input_shape[1];
            let mut table_gradient = zeros(input_shape)?;
            for (position, &index) in indices.iter().enumerate() {
                let source = position * width;
                let destination = index * width;
                for feature in 0..width {
                    table_gradient.as_mut_slice()[destination + feature] +=
                        upstream.as_slice()[source + feature];
                }
            }
            Ok(table_gradient)
        }
        ModelSavedContext::Exp { output } => {
            map_binary(&upstream.view(), &output.view(), |gradient, value| {
                gradient * value
            })
            .map_err(Into::into)
        }
        ModelSavedContext::Log { input } => {
            map_binary(&upstream.view(), &input.view(), |gradient, value| {
                gradient / value
            })
            .map_err(Into::into)
        }
        ModelSavedContext::Silu { input, sigmoid } => {
            let derivative = map_binary(&input.view(), &sigmoid.view(), |value, probability| {
                probability * (1.0 + value * (1.0 - probability))
            })?;
            map_binary(&upstream.view(), &derivative.view(), |gradient, local| {
                gradient * local
            })
            .map_err(Into::into)
        }
        ModelSavedContext::LogSoftmax {
            probabilities,
            axis,
            input_shape,
        } => {
            debug_assert_eq!(upstream.shape(), input_shape);
            let row_sum = tensor_sum_axis(&upstream.view(), *axis, true)?;
            let correction = map_binary(
                &probabilities.view(),
                &row_sum.view(),
                |probability, sum| probability * sum,
            )?;
            map_binary(&upstream.view(), &correction.view(), |gradient, term| {
                gradient - term
            })
            .map_err(Into::into)
        }
        ModelSavedContext::IndexedMeanNll {
            probabilities,
            targets,
            axis,
            input_shape,
            groups,
        } => {
            debug_assert_eq!(upstream.shape(), &[] as &[usize]);
            debug_assert_eq!(probabilities.shape(), input_shape);
            let mut result = probabilities.clone();
            for (group, &target) in targets.iter().enumerate() {
                let coordinate = group_class_coordinate(input_shape, *axis, group, target);
                let offset = result.offset(&coordinate)?;
                result.as_mut_slice()[offset] -= 1.0;
            }
            let scale = upstream.as_slice()[0] / (*groups as f64);
            for value in result.as_mut_slice() {
                *value *= scale;
                if *value == 0.0 {
                    *value = 0.0;
                }
            }
            Ok(result)
        }
    }
}
// endregion:model-vjps

fn unbroadcast(upstream: &Tensor, input_shape: &[usize]) -> Result<Tensor, TensorAutodiffError> {
    debug_assert!(upstream.shape().len() >= input_shape.len());
    let padding = upstream.shape().len() - input_shape.len();
    let mut result = zeros(input_shape)?;
    for output_index in 0..upstream.len() {
        let output_coordinate = coordinate_from_offset(upstream.shape(), output_index);
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

fn coordinate_from_offset(shape: &[usize], mut offset: usize) -> Vec<usize> {
    let mut coordinate = vec![0; shape.len()];
    for axis in (0..shape.len()).rev() {
        let dimension = shape[axis];
        debug_assert!(dimension > 0, "empty tensors have no flat offsets");
        coordinate[axis] = offset % dimension;
        offset /= dimension;
    }
    coordinate
}

fn group_class_coordinate(
    input_shape: &[usize],
    axis: usize,
    group: usize,
    class: usize,
) -> Vec<usize> {
    let mut group_shape = input_shape.to_vec();
    group_shape.remove(axis);
    let group_coordinate = coordinate_from_offset(&group_shape, group);
    let mut coordinate = Vec::with_capacity(input_shape.len());
    let mut group_axis = 0;
    for input_axis in 0..input_shape.len() {
        if input_axis == axis {
            coordinate.push(class);
        } else {
            coordinate.push(group_coordinate[group_axis]);
            group_axis += 1;
        }
    }
    coordinate
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::gradcheck::sampled_tensor_gradient_check;
    use crate::autograd::tensor_core::{GraphRetention, TensorSavedContext};
    use crate::nn::probability::ProbabilityError;
    use crate::tensor::matmul::matmul as tensor_matmul;

    const STEP: f64 = 1e-6;
    const TOLERANCE: f64 = 2e-6;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn parameter(shape: &[usize], values: &[f64]) -> TensorValue {
        TensorValue::parameter(tensor(shape, values)).unwrap()
    }

    fn constant(shape: &[usize], values: &[f64]) -> TensorValue {
        TensorValue::constant(tensor(shape, values)).unwrap()
    }

    fn sum_to_scalar(mut value: TensorValue) -> TensorValue {
        while !value.shape().is_empty() {
            value = value.sum_axis(0, false).unwrap();
        }
        value
    }

    fn assert_close(actual: &[f64], expected: &[f64], tolerance: f64) {
        assert_eq!(actual.len(), expected.len());
        for (index, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
            assert!(
                (actual - expected).abs() <= tolerance,
                "index {index}: expected {expected:.12}, got {actual:.12}"
            );
        }
    }

    fn gradcheck(mut probe: Tensor, analytic: &Tensor, objective: impl FnMut(&Tensor) -> f64) {
        let samples = probe.len();
        let report = sampled_tensor_gradient_check(
            &mut probe,
            &analytic.view(),
            STEP,
            TOLERANCE,
            samples,
            objective,
        )
        .unwrap();
        assert!(report.checks.iter().all(|check| check.comparison.passed));
    }

    #[test]
    fn repeated_lookup_pipeline_has_exact_signs_and_accumulation() {
        let embeddings = parameter(&[3, 2], &[2.0, 2.0, 1.0, -1.0, -1.0, 1.0]);
        let weights = parameter(&[2, 2], &[1.0, -1.0, 1.0, -1.0]);
        let gathered = embeddings.gather_rows(&[1, 1, 1, 2], &[4]).unwrap();
        let logits = gathered.matmul(&weights).unwrap().silu().unwrap();
        let loss = logits.indexed_mean_nll(1, &[0, 0, 0, 1]).unwrap();

        assert_close(loss.value().as_slice(), &[2.0_f64.ln()], 1e-12);
        let pass = loss.backward().unwrap();
        assert_eq!(
            pass.nodes.last().unwrap().operation,
            TensorOperation::IndexedMeanNll
        );
        assert_close(
            embeddings.gradient().unwrap().as_slice(),
            &[0.0, 0.0, -0.375, -0.375, 0.125, 0.125],
            1e-12,
        );
        assert_close(
            weights.gradient().unwrap().as_slice(),
            &[-0.25, 0.25, 0.25, -0.25],
            1e-12,
        );
    }

    #[test]
    fn every_model_vjp_passes_sampled_finite_differences() {
        let left_values = [0.4, -0.7, 1.2, 0.3, -0.5, 0.8];
        let right_values = [0.2, -0.4, 0.6, 0.9, -0.3, 0.5];
        let left = parameter(&[2, 3], &left_values);
        let right = parameter(&[3, 2], &right_values);
        let loss = sum_to_scalar(left.matmul(&right).unwrap());
        loss.backward().unwrap();
        gradcheck(
            tensor(&[2, 3], &left_values),
            &left.gradient().unwrap(),
            |probe| {
                tensor_matmul(&probe.view(), &tensor(&[3, 2], &right_values).view())
                    .unwrap()
                    .as_slice()
                    .iter()
                    .sum()
            },
        );
        gradcheck(
            tensor(&[3, 2], &right_values),
            &right.gradient().unwrap(),
            |probe| {
                tensor_matmul(&tensor(&[2, 3], &left_values).view(), &probe.view())
                    .unwrap()
                    .as_slice()
                    .iter()
                    .sum()
            },
        );

        let table_values = [0.2, -0.4, 0.7, 1.1, -0.3, 0.6];
        let table = parameter(&[3, 2], &table_values);
        let loss = sum_to_scalar(table.gather_rows(&[2, 1, 2], &[3]).unwrap());
        loss.backward().unwrap();
        gradcheck(
            tensor(&[3, 2], &table_values),
            &table.gradient().unwrap(),
            |probe| {
                gather_rows_forward(probe, &[2, 1, 2], &[3])
                    .unwrap()
                    .as_slice()
                    .iter()
                    .sum()
            },
        );

        for operation in ["exp", "log", "silu"] {
            let values = if operation == "log" {
                [0.4, 1.1, 2.3]
            } else {
                [-0.8, 0.2, 1.1]
            };
            let input = parameter(&[3], &values);
            let output = match operation {
                "exp" => input.exp().unwrap(),
                "log" => input.log().unwrap(),
                "silu" => input.silu().unwrap(),
                _ => unreachable!(),
            };
            sum_to_scalar(output).backward().unwrap();
            gradcheck(tensor(&[3], &values), &input.gradient().unwrap(), |probe| {
                probe
                    .as_slice()
                    .iter()
                    .map(|&value| match operation {
                        "exp" => value.exp(),
                        "log" => value.ln(),
                        "silu" => value * stable_sigmoid(value),
                        _ => unreachable!(),
                    })
                    .sum()
            });
        }

        let logits_values = [0.7, -0.4, 1.1, -0.2, 0.3, 0.8];
        let weights_values = [0.2, -0.5, 0.7, 1.1, -0.4, 0.3];
        let logits = parameter(&[2, 3], &logits_values);
        let weights = constant(&[2, 3], &weights_values);
        let weighted = logits.log_softmax(1).unwrap().mul(&weights).unwrap();
        sum_to_scalar(weighted).backward().unwrap();
        gradcheck(
            tensor(&[2, 3], &logits_values),
            &logits.gradient().unwrap(),
            |probe| {
                log_softmax(&probe.view(), 1)
                    .unwrap()
                    .as_slice()
                    .iter()
                    .zip(weights_values)
                    .map(|(value, weight)| value * weight)
                    .sum()
            },
        );

        let nll_logits = parameter(&[2, 3], &logits_values);
        nll_logits
            .indexed_mean_nll(1, &[2, 0])
            .unwrap()
            .backward()
            .unwrap();
        gradcheck(
            tensor(&[2, 3], &logits_values),
            &nll_logits.gradient().unwrap(),
            |probe| indexed_mean_nll(&probe.view(), 1, &[2, 0]).unwrap(),
        );
    }

    #[test]
    fn batched_matmul_unbroadcasts_both_parent_gradients() {
        let left = parameter(&[2, 2], &[1.0, 2.0, 3.0, 4.0]);
        let right = parameter(
            &[3, 2, 2],
            &[1.0, 0.0, 0.0, 1.0, 2.0, 1.0, 1.0, 0.0, -1.0, 2.0, 0.5, 1.5],
        );
        let output = left.matmul(&right).unwrap();
        assert_eq!(output.shape(), vec![3, 2, 2]);
        sum_to_scalar(output).backward().unwrap();
        assert_eq!(left.gradient().unwrap().shape(), &[2, 2]);
        assert_eq!(left.gradient().unwrap().as_slice(), &[5.0, 4.0, 5.0, 4.0]);
        assert_eq!(right.gradient().unwrap().shape(), &[3, 2, 2]);
        assert_eq!(
            right.gradient().unwrap().as_slice(),
            &[4.0, 4.0, 6.0, 6.0, 4.0, 4.0, 6.0, 6.0, 4.0, 4.0, 6.0, 6.0]
        );

        let left_batched = parameter(
            &[3, 2, 2],
            &[1.0, 0.0, 0.0, 1.0, 2.0, 1.0, 1.0, 0.0, -1.0, 2.0, 0.5, 1.5],
        );
        let right_single = parameter(&[2, 2], &[1.0, 2.0, 3.0, 4.0]);
        sum_to_scalar(left_batched.matmul(&right_single).unwrap())
            .backward()
            .unwrap();
        assert_eq!(left_batched.gradient().unwrap().shape(), &[3, 2, 2]);
        assert_eq!(
            left_batched.gradient().unwrap().as_slice(),
            &[3.0, 7.0, 3.0, 7.0, 3.0, 7.0, 3.0, 7.0, 3.0, 7.0, 3.0, 7.0]
        );
        assert_eq!(right_single.gradient().unwrap().shape(), &[2, 2]);
        assert_eq!(
            right_single.gradient().unwrap().as_slice(),
            &[3.5, 3.5, 5.5, 5.5]
        );
    }

    #[test]
    fn repeated_operand_and_branch_contributions_accumulate() {
        let values = [0.3, -0.2, 0.5, 0.7];
        let input = parameter(&[2, 2], &values);
        let product = input.matmul(&input).unwrap();
        let branched = product.add(&product).unwrap();
        sum_to_scalar(branched).backward().unwrap();
        gradcheck(
            tensor(&[2, 2], &values),
            &input.gradient().unwrap(),
            |probe| {
                2.0 * tensor_matmul(&probe.view(), &probe.view())
                    .unwrap()
                    .as_slice()
                    .iter()
                    .sum::<f64>()
            },
        );
    }

    #[test]
    fn gather_scatter_adds_duplicates_and_leaves_unused_rows_zero() {
        let table = parameter(&[3, 2], &[9.0, 9.0, 1.0, 2.0, 3.0, 4.0]);
        let gathered = table.gather_rows(&[1, 1, 1, 2], &[2, 2]).unwrap();
        assert_eq!(gathered.shape(), vec![2, 2, 2]);
        sum_to_scalar(gathered).backward().unwrap();
        assert_eq!(
            table.gradient().unwrap().as_slice(),
            &[0.0, 0.0, 3.0, 3.0, 1.0, 1.0]
        );

        let scalar = constant(&[2, 2], &[1.0, 2.0, 3.0, 4.0])
            .gather_rows(&[1], &[])
            .unwrap();
        assert_eq!(scalar.shape(), vec![2]);
        let empty = constant(&[2, 2], &[1.0, 2.0, 3.0, 4.0])
            .gather_rows(&[], &[0])
            .unwrap();
        assert_eq!(empty.shape(), vec![0, 2]);
    }

    #[test]
    fn gather_rejects_rank_count_and_first_bad_id_in_order() {
        let rank_one = constant(&[2], &[1.0, 2.0]);
        assert_eq!(
            rank_one.gather_rows(&[0], &[1]).unwrap_err(),
            TensorAutodiffError::Model(ModelOpError::GatherTableRank { rank: 1 })
        );
        let table = constant(&[2, 2], &[1.0, 2.0, 3.0, 4.0]);
        assert_eq!(
            table.gather_rows(&[0], &[2]).unwrap_err(),
            TensorAutodiffError::Model(ModelOpError::GatherIndexCountMismatch {
                expected: 2,
                actual: 1,
            })
        );
        assert_eq!(
            table.gather_rows(&[2, 9], &[2]).unwrap_err(),
            TensorAutodiffError::Model(ModelOpError::GatherIndexOutOfBounds {
                position: 0,
                index: 2,
                rows: 2,
            })
        );
    }

    #[test]
    fn elementary_operations_enforce_finite_outputs_and_stable_silu() {
        let overflow = constant(&[], &[f64::MAX]).exp().unwrap_err();
        assert!(matches!(
            overflow,
            TensorAutodiffError::NonFiniteForward {
                operation: TensorOperation::Exp,
                ..
            }
        ));
        let underflow = constant(&[], &[-f64::MAX]).exp().unwrap();
        assert_eq!(underflow.value().as_slice(), &[0.0]);
        for invalid in [0.0, -1.0] {
            assert!(matches!(
                constant(&[], &[invalid]).log().unwrap_err(),
                TensorAutodiffError::NonFiniteForward {
                    operation: TensorOperation::Log,
                    ..
                }
            ));
        }
        let large = constant(&[3], &[-1000.0, 0.0, 1000.0])
            .silu()
            .unwrap()
            .value();
        assert_close(large.as_slice(), &[0.0, 0.0, 1000.0], 1e-12);
    }

    #[test]
    fn log_softmax_supports_arbitrary_axis_and_zero_sum_input_gradient() {
        let logits = parameter(
            &[2, 2, 3],
            &[
                0.1, 0.5, -0.3, 1.0, -1.0, 0.2, 0.3, 0.4, 0.8, -0.2, 0.9, 0.0,
            ],
        );
        let output = logits.log_softmax(1).unwrap();
        sum_to_scalar(output).backward().unwrap();
        let gradient = logits.gradient().unwrap();
        for outer in 0..2 {
            for inner in 0..3 {
                let sum = (0..2)
                    .map(|class| gradient.as_slice()[(outer * 2 + class) * 3 + inner])
                    .sum::<f64>();
                assert!(sum.abs() <= 1e-12, "gradient group sum was {sum}");
            }
        }
    }

    #[test]
    fn indexed_nll_preserves_probability_error_precedence_and_stability() {
        let logits = constant(&[0, 2], &[]);
        assert_eq!(
            logits.indexed_mean_nll(1, &[]).unwrap_err(),
            TensorAutodiffError::Probability(ProbabilityError::EmptyTargets)
        );
        let logits = constant(&[2, 2], &[1000.0, -1000.0, -1000.0, 1000.0]);
        assert_eq!(
            logits.indexed_mean_nll(1, &[0]).unwrap_err(),
            TensorAutodiffError::Probability(ProbabilityError::TargetCountMismatch {
                expected: 2,
                actual: 1,
            })
        );
        assert_eq!(
            logits.indexed_mean_nll(1, &[0, 2]).unwrap_err(),
            TensorAutodiffError::Probability(ProbabilityError::TargetOutOfBounds {
                group: 1,
                target: 2,
                classes: 2,
            })
        );
        let loss = logits.indexed_mean_nll(1, &[0, 1]).unwrap();
        assert_eq!(loss.value().as_slice(), &[0.0]);
    }

    #[test]
    fn model_operations_inherit_retention_and_released_operand_rules() {
        let left = parameter(&[2, 2], &[1.0, 2.0, 3.0, 4.0]);
        let right = constant(&[2, 2], &[1.0, 0.0, 0.0, 1.0]);
        let product = left.matmul(&right).unwrap();
        sum_to_scalar(product.clone())
            .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Release)
            .unwrap();
        assert!(product.is_released());
        assert_eq!(
            product.exp().unwrap_err(),
            TensorAutodiffError::ReleasedOperand {
                operation: TensorOperation::Exp,
                operand: 0,
            }
        );
    }

    #[test]
    fn nonfinite_model_vjp_is_transactional_and_keeps_the_graph() {
        let input = parameter(&[], &[f64::MIN_POSITIVE]);
        let logged = input.log().unwrap();
        logged
            .backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)
            .unwrap();
        let gradient_before_failure = input.gradient().unwrap();

        let huge_seed = tensor(&[], &[f64::MAX]);
        assert!(matches!(
            logged.backward_with_seed(&huge_seed.view(), GraphRetention::Release),
            Err(TensorAutodiffError::NonFiniteVjp {
                child: 1,
                parent: 0,
                operand: 0,
                index: 0,
                ..
            })
        ));
        assert_eq!(input.gradient().unwrap(), gradient_before_failure);
        assert!(!logged.is_released());

        logged.backward().unwrap();
        assert_eq!(
            input.gradient().unwrap().as_slice(),
            &[2.0 / f64::MIN_POSITIVE]
        );
    }

    #[test]
    fn backward_trace_exposes_typed_model_saved_context() {
        let table = parameter(&[2, 2], &[1.0, 0.0, 0.0, 1.0]);
        let loss = sum_to_scalar(table.gather_rows(&[1, 1], &[2]).unwrap());
        let pass = loss.backward().unwrap();
        assert!(pass.edges.iter().any(|edge| matches!(
            edge.saved,
            TensorSavedContext::Model(ModelSavedContext::GatherRows { .. })
        )));
    }
}
