//! Stable probability and indexed-loss operations over checked tensor views.

use std::error::Error;
use std::fmt;

use crate::tensor::storage::{Tensor, TensorError, checked_row_major_layout};
use crate::tensor::view::{StridedOffsets, TensorView, TensorViewError};

// region:probability-errors
/// A rejected probability operation, target, output, or converted view operation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProbabilityError {
    /// An owned output layout violates the tensor storage invariant.
    Tensor(TensorError),
    /// A tensor-view error was converted into the probability error type.
    View(TensorViewError),
    /// The requested class axis does not exist.
    AxisOutOfBounds { axis: usize, rank: usize },
    /// Softmax, log-softmax, and indexed NLL need at least one class.
    EmptyNormalizationAxis { axis: usize },
    /// The checked output shape is valid, but its value buffer cannot be reserved.
    OutputAllocationFailed { elements: usize },
    /// The first rejected logit in group-major, class-minor order is NaN.
    NaNLogit { group: usize, class: usize },
    /// The first rejected logit in group-major, class-minor order is positive infinity.
    PositiveInfinityLogit { group: usize, class: usize },
    /// The first rejected logit in group-major, class-minor order is negative infinity.
    NegativeInfinityLogit { group: usize, class: usize },
    /// There must be one flat target for every class-axis group.
    TargetCountMismatch { expected: usize, actual: usize },
    /// A mean is undefined when there are no target groups.
    EmptyTargets,
    /// One target does not name a class on the selected axis.
    TargetOutOfBounds {
        group: usize,
        target: usize,
        classes: usize,
    },
}

impl fmt::Display for ProbabilityError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Tensor(error) => error.fmt(formatter),
            Self::View(error) => error.fmt(formatter),
            Self::AxisOutOfBounds { axis, rank } => {
                write!(
                    formatter,
                    "probability axis {axis} is out of bounds for rank {rank}"
                )
            }
            Self::EmptyNormalizationAxis { axis } => {
                write!(formatter, "probability axis {axis} has no classes")
            }
            Self::OutputAllocationFailed { elements } => write!(
                formatter,
                "cannot allocate probability output for {elements} f64 values"
            ),
            Self::NaNLogit { group, class } => {
                write!(formatter, "logit at group {group}, class {class} is NaN")
            }
            Self::PositiveInfinityLogit { group, class } => write!(
                formatter,
                "logit at group {group}, class {class} is positive infinity"
            ),
            Self::NegativeInfinityLogit { group, class } => write!(
                formatter,
                "logit at group {group}, class {class} is negative infinity"
            ),
            Self::TargetCountMismatch { expected, actual } => write!(
                formatter,
                "indexed mean NLL needs {expected} targets, but received {actual}"
            ),
            Self::EmptyTargets => formatter.write_str("indexed mean NLL needs at least one target"),
            Self::TargetOutOfBounds {
                group,
                target,
                classes,
            } => write!(
                formatter,
                "target {target} at group {group} is out of bounds for {classes} classes"
            ),
        }
    }
}

impl Error for ProbabilityError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(error) => Some(error),
            Self::View(error) => Some(error),
            _ => None,
        }
    }
}

impl From<TensorError> for ProbabilityError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

impl From<TensorViewError> for ProbabilityError {
    fn from(error: TensorViewError) -> Self {
        Self::View(error)
    }
}
// endregion:probability-errors

// region:checked-probability-groups
#[derive(Debug)]
struct AxisPlan {
    axis: usize,
    classes: usize,
    group_shape: Vec<usize>,
    group_strides: Vec<usize>,
    groups: usize,
    class_stride: usize,
}

#[derive(Clone, Copy, Debug)]
struct RowStats {
    maximum: f64,
    shifted_exponential_sum: f64,
    log_shifted_exponential_sum: f64,
}

#[derive(Clone, Copy, Debug)]
struct FiniteLogits;

#[derive(Clone, Copy, Debug)]
enum LogitFiniteness {
    Check,
    Validated(FiniteLogits),
}

impl AxisPlan {
    fn new(
        input: &TensorView<'_>,
        axis: usize,
        allow_empty_axis: bool,
    ) -> Result<Self, ProbabilityError> {
        if axis >= input.rank() {
            return Err(ProbabilityError::AxisOutOfBounds {
                axis,
                rank: input.rank(),
            });
        }

        let classes = input.shape()[axis];
        if classes == 0 && !allow_empty_axis {
            return Err(ProbabilityError::EmptyNormalizationAxis { axis });
        }

        let mut group_shape = input.shape().to_vec();
        group_shape.remove(axis);
        let mut group_strides = input.strides().to_vec();
        let class_stride = group_strides.remove(axis);
        let (_, groups) = checked_row_major_layout(&group_shape)?;
        Ok(Self {
            axis,
            classes,
            group_shape,
            group_strides,
            groups,
            class_stride,
        })
    }

    fn group_offsets(&self, input: &TensorView<'_>) -> StridedOffsets {
        input
            .projected_offsets(&self.group_shape, &self.group_strides, self.groups)
            .expect("a checked probability plan retains valid group-base offsets")
    }

    fn output_group_offsets(&self, output_strides: &[usize], output_len: usize) -> StridedOffsets {
        let mut group_strides = output_strides.to_vec();
        group_strides.remove(self.axis);
        StridedOffsets::checked(
            &self.group_shape,
            &group_strides,
            0,
            self.groups,
            output_len,
        )
        .expect("a checked probability output retains valid group-base offsets")
    }

    fn target_offset(&self, group_base: usize, target: usize) -> usize {
        let class_offset = target
            .checked_mul(self.class_stride)
            .expect("a checked probability plan cannot overflow a class offset");
        group_base
            .checked_add(class_offset)
            .expect("a checked probability plan cannot overflow a target offset")
    }

    fn for_each_group(
        &self,
        input: &TensorView<'_>,
        finiteness: LogitFiniteness,
        mut visit: impl FnMut(usize, usize, RowStats) -> Result<(), ProbabilityError>,
    ) -> Result<(), ProbabilityError> {
        for (group, group_base) in self.group_offsets(input).enumerate() {
            let stats = row_stats(input, self, finiteness, group, group_base)?;
            visit(group, group_base, stats)?;
        }
        Ok(())
    }
}

fn checked_finite_logit(value: f64, group: usize, class: usize) -> Result<f64, ProbabilityError> {
    if value.is_nan() {
        Err(ProbabilityError::NaNLogit { group, class })
    } else if value == f64::INFINITY {
        Err(ProbabilityError::PositiveInfinityLogit { group, class })
    } else if value == f64::NEG_INFINITY {
        Err(ProbabilityError::NegativeInfinityLogit { group, class })
    } else {
        Ok(value)
    }
}

fn validate_finite_logits(
    input: &TensorView<'_>,
    plan: &AxisPlan,
) -> Result<FiniteLogits, ProbabilityError> {
    for (group, group_base) in plan.group_offsets(input).enumerate() {
        let mut input_offset = group_base;
        for class in 0..plan.classes {
            checked_finite_logit(input.value_at_storage_offset(input_offset), group, class)?;
            if class + 1 < plan.classes {
                input_offset = input_offset
                    .checked_add(plan.class_stride)
                    .expect("a checked probability plan cannot overflow along the class axis");
            }
        }
    }
    Ok(FiniteLogits)
}

fn row_stats(
    input: &TensorView<'_>,
    plan: &AxisPlan,
    finiteness: LogitFiniteness,
    group: usize,
    group_base: usize,
) -> Result<RowStats, ProbabilityError> {
    debug_assert!(plan.classes > 0);
    let mut maximum = f64::NEG_INFINITY;
    let mut input_offset = group_base;
    for class in 0..plan.classes {
        let value = input.value_at_storage_offset(input_offset);
        let value = match finiteness {
            LogitFiniteness::Check => checked_finite_logit(value, group, class)?,
            LogitFiniteness::Validated(_) => value,
        };
        maximum = maximum.max(value);
        if class + 1 < plan.classes {
            input_offset = input_offset
                .checked_add(plan.class_stride)
                .expect("a checked probability plan cannot overflow along the class axis");
        }
    }

    let mut exponential_tail = 0.0;
    let mut skipped_one_maximum = false;
    input_offset = group_base;
    for class in 0..plan.classes {
        let value = input.value_at_storage_offset(input_offset);
        let shifted = value - maximum;
        if shifted == 0.0 && !skipped_one_maximum {
            skipped_one_maximum = true;
        } else {
            exponential_tail += shifted.exp();
        }
        if class + 1 < plan.classes {
            input_offset = input_offset
                .checked_add(plan.class_stride)
                .expect("a checked probability plan cannot overflow along the class axis");
        }
    }
    debug_assert!(skipped_one_maximum);

    Ok(RowStats {
        maximum,
        shifted_exponential_sum: 1.0 + exponential_tail,
        log_shifted_exponential_sum: exponential_tail.ln_1p(),
    })
}
// endregion:checked-probability-groups

// region:stable-probability-operations
fn output_buffer(elements: usize) -> Result<Vec<f64>, ProbabilityError> {
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| ProbabilityError::OutputAllocationFailed { elements })?;
    values.resize(elements, 0.0);
    Ok(values)
}

fn positive_zero(value: f64) -> f64 {
    if value == 0.0 { 0.0 } else { value }
}

/// Requested normalized values emitted by one checked forward traversal.
#[derive(Debug)]
struct NormalizedForward {
    probabilities: Option<Tensor>,
    log_probabilities: Option<Tensor>,
}

/// Log-softmax output and optional probabilities from the same forward traversal.
#[derive(Debug)]
pub(crate) struct LogSoftmaxForward {
    pub(crate) value: Tensor,
    pub(crate) probabilities: Option<Tensor>,
}

/// Indexed mean NLL and optional probabilities emitted by its forward traversal.
#[derive(Debug)]
pub(crate) struct IndexedMeanNllForward {
    pub(crate) loss: f64,
    pub(crate) probabilities: Option<Tensor>,
}

struct NormalizedGroupOutput<'a> {
    output_group_base: usize,
    output_class_stride: usize,
    probabilities: Option<&'a mut [f64]>,
    log_probabilities: Option<&'a mut [f64]>,
}

impl NormalizedGroupOutput<'_> {
    fn emit(
        mut self,
        input: &TensorView<'_>,
        plan: &AxisPlan,
        input_group_base: usize,
        stats: RowStats,
    ) {
        debug_assert!(self.probabilities.is_some() || self.log_probabilities.is_some());
        let mut input_offset = input_group_base;
        let mut output_offset = self.output_group_base;
        for class in 0..plan.classes {
            let shifted = input.value_at_storage_offset(input_offset) - stats.maximum;
            if let Some(values) = self.probabilities.as_mut() {
                values[output_offset] =
                    positive_zero(shifted.exp() / stats.shifted_exponential_sum);
            }
            if let Some(values) = self.log_probabilities.as_mut() {
                values[output_offset] = positive_zero(shifted - stats.log_shifted_exponential_sum);
            }

            if class + 1 < plan.classes {
                input_offset = input_offset
                    .checked_add(plan.class_stride)
                    .expect("a checked probability plan cannot overflow along the class axis");
                output_offset = output_offset
                    .checked_add(self.output_class_stride)
                    .expect("a checked probability output cannot overflow along the class axis");
            }
        }
    }
}

/// Reduces one axis with max-shifted log-sum-exp.
///
/// An empty selected axis returns the log-additive identity, negative infinity,
/// once per remaining-axis group. Other non-finite logits are rejected in
/// group-major, class-minor order.
pub fn log_sum_exp(
    input: &TensorView<'_>,
    axis: usize,
    keep_dim: bool,
) -> Result<Tensor, ProbabilityError> {
    let plan = AxisPlan::new(input, axis, true)?;
    let output_shape = if keep_dim {
        let mut shape = input.shape().to_vec();
        shape[axis] = 1;
        shape
    } else {
        plan.group_shape.clone()
    };
    let (_, output_len) = checked_row_major_layout(&output_shape)?;
    debug_assert_eq!(output_len, plan.groups);
    let mut values = output_buffer(output_len)?;

    if plan.classes == 0 {
        values.fill(f64::NEG_INFINITY);
    } else {
        plan.for_each_group(
            input,
            LogitFiniteness::Check,
            |group, _group_base, stats| {
                values[group] = stats.maximum + stats.log_shifted_exponential_sum;
                Ok(())
            },
        )?;
    }

    Tensor::from_vec(output_shape, values).map_err(Into::into)
}

/// Converts finite logits to normalized probabilities along one explicit axis.
pub fn softmax(input: &TensorView<'_>, axis: usize) -> Result<Tensor, ProbabilityError> {
    let forward = normalized_forward(input, axis, true, false)?;
    Ok(forward
        .probabilities
        .expect("softmax requests a probability output"))
}

/// Converts finite logits to normalized log-probabilities along one explicit axis.
pub fn log_softmax(input: &TensorView<'_>, axis: usize) -> Result<Tensor, ProbabilityError> {
    let forward = log_softmax_forward(input, axis, false)?;
    debug_assert!(forward.probabilities.is_none());
    Ok(forward.value)
}

pub(crate) fn log_softmax_forward(
    input: &TensorView<'_>,
    axis: usize,
    emit_probabilities: bool,
) -> Result<LogSoftmaxForward, ProbabilityError> {
    let forward = normalized_forward(input, axis, emit_probabilities, true)?;
    Ok(LogSoftmaxForward {
        value: forward
            .log_probabilities
            .expect("log-softmax forward requests a log-probability output"),
        probabilities: forward.probabilities,
    })
}

fn normalized_forward(
    input: &TensorView<'_>,
    axis: usize,
    emit_probabilities: bool,
    emit_log_probabilities: bool,
) -> Result<NormalizedForward, ProbabilityError> {
    debug_assert!(emit_probabilities || emit_log_probabilities);
    let plan = AxisPlan::new(input, axis, false)?;
    let (output_strides, output_len) = checked_row_major_layout(input.shape())?;
    let mut log_probability_values = emit_log_probabilities
        .then(|| output_buffer(output_len))
        .transpose()?;
    let finiteness = if emit_probabilities && emit_log_probabilities {
        LogitFiniteness::Validated(validate_finite_logits(input, &plan)?)
    } else {
        LogitFiniteness::Check
    };
    let mut probability_values = emit_probabilities
        .then(|| output_buffer(output_len))
        .transpose()?;
    let output_class_stride = output_strides[axis];

    let mut output_group_offsets = plan.output_group_offsets(&output_strides, output_len);
    plan.for_each_group(input, finiteness, |_group, input_group_base, stats| {
        let output_group_base = output_group_offsets
            .next()
            .expect("a checked probability output has one base per input group");
        NormalizedGroupOutput {
            output_group_base,
            output_class_stride,
            probabilities: probability_values.as_deref_mut(),
            log_probabilities: log_probability_values.as_deref_mut(),
        }
        .emit(input, &plan, input_group_base, stats);
        Ok(())
    })?;
    debug_assert!(output_group_offsets.next().is_none());

    let log_probabilities = log_probability_values
        .map(|values| Tensor::from_vec(input.shape().to_vec(), values))
        .transpose()?;
    let probabilities = probability_values
        .map(|values| Tensor::from_vec(input.shape().to_vec(), values))
        .transpose()?;
    Ok(NormalizedForward {
        probabilities,
        log_probabilities,
    })
}

/// Scores one class index per remaining-axis group with fused stable mean NLL.
///
/// Targets follow the row-major group shape obtained by removing `axis` from
/// the logits. Bounds are checked for every target before a logit is read.
pub fn indexed_mean_nll(
    logits: &TensorView<'_>,
    axis: usize,
    targets: &[usize],
) -> Result<f64, ProbabilityError> {
    let forward = indexed_mean_nll_forward(logits, axis, targets, false)?;
    debug_assert!(forward.probabilities.is_none());
    Ok(forward.loss)
}

pub(crate) fn indexed_mean_nll_forward(
    logits: &TensorView<'_>,
    axis: usize,
    targets: &[usize],
    emit_probabilities: bool,
) -> Result<IndexedMeanNllForward, ProbabilityError> {
    let plan = AxisPlan::new(logits, axis, false)?;
    if targets.len() != plan.groups {
        return Err(ProbabilityError::TargetCountMismatch {
            expected: plan.groups,
            actual: targets.len(),
        });
    }
    if targets.is_empty() {
        return Err(ProbabilityError::EmptyTargets);
    }
    for (group, &target) in targets.iter().enumerate() {
        if target >= plan.classes {
            return Err(ProbabilityError::TargetOutOfBounds {
                group,
                target,
                classes: plan.classes,
            });
        }
    }

    let finiteness = if emit_probabilities {
        LogitFiniteness::Validated(validate_finite_logits(logits, &plan)?)
    } else {
        LogitFiniteness::Check
    };

    let output_layout = emit_probabilities
        .then(|| checked_row_major_layout(logits.shape()))
        .transpose()?;
    let mut probability_values = output_layout
        .as_ref()
        .map(|(_, output_len)| output_buffer(*output_len))
        .transpose()?;
    let mut output_group_offsets = output_layout
        .as_ref()
        .map(|(output_strides, output_len)| plan.output_group_offsets(output_strides, *output_len));
    let output_class_stride = output_layout
        .as_ref()
        .map(|(output_strides, _)| output_strides[axis]);

    let mut total = 0.0;
    let mut scaled_mean = 0.0;
    let mut needs_scaled_fallback = false;
    let target_count = targets.len() as f64;
    plan.for_each_group(logits, finiteness, |group, group_base, stats| {
        let target = targets[group];
        let target_logit = logits.value_at_storage_offset(plan.target_offset(group_base, target));
        let gap = stats.maximum - target_logit;
        let scaled_gap = if gap.is_finite() {
            gap / target_count
        } else {
            stats.maximum / target_count - target_logit / target_count
        };
        scaled_mean += scaled_gap + stats.log_shifted_exponential_sum / target_count;

        let loss = gap + stats.log_shifted_exponential_sum;
        if loss.is_finite() && !needs_scaled_fallback {
            total += loss;
            if !total.is_finite() {
                needs_scaled_fallback = true;
            }
        } else {
            needs_scaled_fallback = true;
        }

        if let Some(values) = probability_values.as_deref_mut() {
            let output_group_base = output_group_offsets
                .as_mut()
                .and_then(Iterator::next)
                .expect("a checked probability output has one base per input group");
            NormalizedGroupOutput {
                output_group_base,
                output_class_stride: output_class_stride
                    .expect("a requested probability output has a class stride"),
                probabilities: Some(values),
                log_probabilities: None,
            }
            .emit(logits, &plan, group_base, stats);
        }
        Ok(())
    })?;
    debug_assert!(
        output_group_offsets
            .as_mut()
            .is_none_or(|offsets| offsets.next().is_none())
    );

    let loss = positive_zero(if needs_scaled_fallback {
        scaled_mean
    } else {
        total / target_count
    });
    let probabilities = probability_values
        .map(|values| Tensor::from_vec(logits.shape().to_vec(), values))
        .transpose()?;
    Ok(IndexedMeanNllForward {
        loss,
        probabilities,
    })
}
// endregion:stable-probability-operations

#[cfg(test)]
mod tests {
    use super::*;

    const TOLERANCE: f64 = 1.0e-12;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn fixture() -> Tensor {
        tensor(&[3, 2], &[0.0, 1.0, 1000.0, 1001.0, -1001.0, -1000.0])
    }

    fn gapped_probability_source() -> Tensor {
        tensor(
            &[2, 3, 3],
            &[
                99.0, 0.0, 10.0, 99.0, 1.0, 11.0, 99.0, 2.0, 12.0, 99.0, 1000.0, -1001.0, 99.0,
                1001.0, -1000.0, 99.0, 1002.0, -999.0,
            ],
        )
    }

    fn assert_close(actual: f64, expected: f64) {
        assert!(
            (actual - expected).abs() <= TOLERANCE,
            "expected {expected:.15}, got {actual:.15}"
        );
    }

    fn assert_same_bits(actual: &[f64], expected: &[f64]) {
        assert_eq!(actual.len(), expected.len());
        for (position, (&actual, &expected)) in actual.iter().zip(expected).enumerate() {
            assert_eq!(
                actual.to_bits(),
                expected.to_bits(),
                "f64 bits differ at flat position {position}"
            );
        }
    }

    #[test]
    fn frozen_rows_share_probabilities_and_keep_log_domain_evidence() {
        let logits = fixture();
        let probabilities = softmax(&logits.view(), 1).unwrap();
        let log_probabilities = log_softmax(&logits.view(), 1).unwrap();
        let log_normalizers = log_sum_exp(&logits.view(), 1, false).unwrap();

        assert_eq!(probabilities.shape(), [3, 2]);
        assert_eq!(probabilities.strides(), [2, 1]);
        assert_eq!(log_probabilities.shape(), [3, 2]);
        assert_eq!(log_normalizers.shape(), [3]);
        for row in 0..3 {
            assert_close(probabilities.as_slice()[row * 2], 0.268_941_421_369_995_1);
            assert_close(
                probabilities.as_slice()[row * 2 + 1],
                0.731_058_578_630_004_9,
            );
            assert_close(
                log_probabilities.as_slice()[row * 2],
                -1.313_261_687_518_222_8,
            );
            assert_close(
                log_probabilities.as_slice()[row * 2 + 1],
                -0.313_261_687_518_222_86,
            );
            assert_close(
                probabilities.as_slice()[row * 2] + probabilities.as_slice()[row * 2 + 1],
                1.0,
            );
        }
        for (actual, expected) in log_normalizers.as_slice().iter().zip([
            1.313_261_687_518_222_8,
            1_001.313_261_687_518_2,
            -999.686_738_312_481_8,
        ]) {
            assert_close(*actual, expected);
        }

        let retained = log_sum_exp(&logits.view(), 1, true).unwrap();
        assert_eq!(retained.shape(), [3, 1]);
        for (actual, expected) in retained.as_slice().iter().zip(log_normalizers.as_slice()) {
            assert_close(*actual, *expected);
        }
    }

    #[test]
    fn equal_logits_stay_uniform_at_ordinary_and_maximum_scales() {
        let ordinary = tensor(&[1, 3], &[7.0, 7.0, 7.0]);
        let probabilities = softmax(&ordinary.view(), 1).unwrap();
        let log_probabilities = log_softmax(&ordinary.view(), 1).unwrap();
        let log_normalizer = log_sum_exp(&ordinary.view(), 1, false).unwrap();
        for probability in probabilities.as_slice() {
            assert_close(*probability, 1.0 / 3.0);
        }
        for log_probability in log_probabilities.as_slice() {
            assert_close(*log_probability, -3.0_f64.ln());
        }
        assert_close(log_normalizer.as_slice()[0], 7.0 + 3.0_f64.ln());

        let maximum = tensor(&[1, 2], &[f64::MAX, f64::MAX]);
        let maximum_probabilities = softmax(&maximum.view(), 1).unwrap();
        let maximum_log_probabilities = log_softmax(&maximum.view(), 1).unwrap();
        let maximum_log_normalizer = log_sum_exp(&maximum.view(), 1, false).unwrap();
        assert_eq!(maximum_probabilities.as_slice(), [0.5, 0.5]);
        assert_close(maximum_log_probabilities.as_slice()[0], -2.0_f64.ln());
        assert_close(maximum_log_probabilities.as_slice()[1], -2.0_f64.ln());
        assert_eq!(maximum_log_normalizer.as_slice(), [f64::MAX]);
    }

    #[test]
    fn indexed_mean_nll_uses_one_flat_target_per_group() {
        let logits = fixture();
        let loss = indexed_mean_nll(&logits.view(), 1, &[1, 0, 1]).unwrap();
        assert_close(loss, 0.646_595_020_851_556_1);

        let axis_zero_logits = tensor(&[2, 3], &[0.0, 2.0, 4.0, 1.0, 3.0, 5.0]);
        let axis_zero_loss = indexed_mean_nll(&axis_zero_logits.view(), 0, &[1, 0, 1]).unwrap();
        assert_close(
            axis_zero_loss,
            (0.313_261_687_518_222_86 * 2.0 + 1.313_261_687_518_222_8) / 3.0,
        );
    }

    #[test]
    fn target_count_scaling_avoids_an_overflowing_finite_loss_sum() {
        let logits = tensor(&[2, 2], &[0.0, 1.0e308, 0.0, 1.0e308]);
        let loss = indexed_mean_nll(&logits.view(), 1, &[0, 0]).unwrap();

        assert!(loss.is_finite());
        assert_eq!(loss, 1.0e308);
    }

    #[test]
    fn target_count_scaling_can_keep_a_mean_when_one_unscaled_loss_overflows() {
        let logits = tensor(&[3, 2], &[-f64::MAX, f64::MAX, 0.0, 0.0, 0.0, 0.0]);
        let loss = indexed_mean_nll(&logits.view(), 1, &[0, 0, 0]).unwrap();
        let expected = f64::MAX / 3.0 - (-f64::MAX / 3.0);

        assert!(loss.is_finite());
        assert_eq!(loss, expected);
    }

    #[test]
    fn ordinary_sum_preserves_subnormal_mean_rounding() {
        let equal = tensor(&[2, 2], &[0.0, -745.0, 0.0, -745.0]);
        let equal_loss = indexed_mean_nll(&equal.view(), 1, &[0, 0]).unwrap();
        assert!(equal_loss > 0.0);
        assert!(equal_loss.is_subnormal());

        let mixed = tensor(&[2, 2], &[0.0, -745.0, 0.0, -746.0]);
        let mixed_loss = indexed_mean_nll(&mixed.view(), 1, &[0, 0]).unwrap();
        assert_eq!(mixed_loss.to_bits(), 0.0_f64.to_bits());
    }

    #[test]
    fn log_domain_outputs_preserve_evidence_after_probability_underflow() {
        let logits = tensor(&[1, 2], &[0.0, -1000.0]);
        let probabilities = softmax(&logits.view(), 1).unwrap();
        let log_probabilities = log_softmax(&logits.view(), 1).unwrap();
        let loss = indexed_mean_nll(&logits.view(), 1, &[1]).unwrap();

        assert_eq!(probabilities.as_slice()[1].to_bits(), 0.0_f64.to_bits());
        assert_eq!(log_probabilities.as_slice()[1], -1000.0);
        assert_eq!(loss, 1000.0);
    }

    #[test]
    fn log1p_preserves_a_representable_tail_below_one_ulp_of_the_denominator() {
        let logits = tensor(&[1, 2], &[0.0, -744.0]);
        let log_normalizer = log_sum_exp(&logits.view(), 1, false).unwrap();
        let log_probabilities = log_softmax(&logits.view(), 1).unwrap();
        let loss = indexed_mean_nll(&logits.view(), 1, &[0]).unwrap();

        assert!(log_normalizer.as_slice()[0] > 0.0);
        assert!(log_normalizer.as_slice()[0].is_subnormal());
        assert_eq!(
            log_probabilities.as_slice()[0],
            -log_normalizer.as_slice()[0]
        );
        assert_eq!(loss, log_normalizer.as_slice()[0]);
    }

    #[test]
    fn arbitrary_axis_outputs_return_to_contiguous_row_major_order() {
        let logits = tensor(
            &[2, 2, 2],
            &[0.0, 1.0, 2.0, 3.0, 1000.0, 1001.0, -1000.0, -999.0],
        );
        let probabilities = softmax(&logits.view(), 1).unwrap();

        assert_eq!(probabilities.shape(), [2, 2, 2]);
        assert_eq!(probabilities.strides(), [4, 2, 1]);
        assert_close(probabilities.as_slice()[0], 0.119_202_922_022_117_55);
        assert_close(probabilities.as_slice()[2], 0.880_797_077_977_882_3);
        assert_close(probabilities.as_slice()[1], 0.119_202_922_022_117_55);
        assert_close(probabilities.as_slice()[3], 0.880_797_077_977_882_3);
        assert_eq!(probabilities.as_slice()[4].to_bits(), 1.0_f64.to_bits());
        assert_eq!(probabilities.as_slice()[6].to_bits(), 0.0_f64.to_bits());
    }

    #[test]
    fn checked_group_driver_computes_one_statistics_bundle_per_group() {
        let padded = gapped_probability_source();
        let logits = padded.view().slice(2, 1..3).unwrap();
        let plan = AxisPlan::new(&logits, 1, false).unwrap();
        let mut visits = Vec::new();

        plan.for_each_group(
            &logits,
            LogitFiniteness::Check,
            |group, group_base, stats| {
                visits.push((group, group_base, stats.maximum));
                Ok(())
            },
        )
        .unwrap();

        assert_eq!(
            visits,
            [(0, 1, 2.0), (1, 2, 12.0), (2, 10, 1002.0), (3, 11, -999.0),]
        );
    }

    #[test]
    fn one_normalized_forward_can_emit_log_values_and_saved_probabilities() {
        let padded = gapped_probability_source();
        let logits = padded.view().slice(2, 1..3).unwrap();
        let combined = log_softmax_forward(&logits, 1, true).unwrap();
        let probabilities = combined.probabilities.unwrap();
        let log_probabilities = combined.value;
        let separate_probabilities = softmax(&logits, 1).unwrap();
        let separate_log_probabilities = log_softmax(&logits, 1).unwrap();

        assert_eq!(probabilities.shape(), logits.shape());
        assert_eq!(probabilities.strides(), [6, 2, 1]);
        assert_eq!(log_probabilities.shape(), logits.shape());
        assert_eq!(log_probabilities.strides(), [6, 2, 1]);
        assert_same_bits(probabilities.as_slice(), separate_probabilities.as_slice());
        assert_same_bits(
            log_probabilities.as_slice(),
            separate_log_probabilities.as_slice(),
        );

        for logits in [
            tensor(&[1, 2], &[0.0, -1000.0]),
            tensor(&[1, 2], &[f64::MAX, f64::MAX]),
            tensor(&[2, 1], &[0.0, -0.0]),
        ] {
            let combined = log_softmax_forward(&logits.view(), 1, true).unwrap();
            assert_same_bits(
                combined.probabilities.unwrap().as_slice(),
                softmax(&logits.view(), 1).unwrap().as_slice(),
            );
            assert_same_bits(
                combined.value.as_slice(),
                log_softmax(&logits.view(), 1).unwrap().as_slice(),
            );
        }
    }

    #[test]
    fn indexed_nll_forward_can_emit_exact_saved_probabilities() {
        let cases = [
            (fixture(), 1, vec![1, 0, 1]),
            (
                tensor(&[2, 2], &[0.0, 1.0e308, 0.0, 1.0e308]),
                1,
                vec![0, 0],
            ),
            (
                tensor(&[3, 2], &[-f64::MAX, f64::MAX, 0.0, 0.0, 0.0, 0.0]),
                1,
                vec![0, 0, 0],
            ),
            (tensor(&[2, 2], &[0.0, -745.0, 0.0, -745.0]), 1, vec![0, 0]),
            (tensor(&[1, 2], &[0.0, -1000.0]), 1, vec![1]),
            (tensor(&[2, 1], &[f64::MAX, -f64::MAX]), 1, vec![0, 0]),
            (tensor(&[2, 1], &[0.0, -0.0]), 1, vec![0, 0]),
        ];

        for (logits, axis, targets) in cases {
            let combined = indexed_mean_nll_forward(&logits.view(), axis, &targets, true).unwrap();
            let separate_loss = indexed_mean_nll(&logits.view(), axis, &targets).unwrap();
            let separate_probabilities = softmax(&logits.view(), axis).unwrap();
            let saved_probabilities = combined.probabilities.unwrap();

            assert_eq!(combined.loss.to_bits(), separate_loss.to_bits());
            assert_same_bits(
                saved_probabilities.as_slice(),
                separate_probabilities.as_slice(),
            );
            assert_eq!(saved_probabilities.shape(), logits.shape());
            assert!(saved_probabilities.view().is_contiguous());
        }

        let padded = gapped_probability_source();
        let logits = padded.view().slice(2, 1..3).unwrap();
        let targets = [2, 1, 0, 2];
        let combined = indexed_mean_nll_forward(&logits, 1, &targets, true).unwrap();
        let separate_loss = indexed_mean_nll(&logits, 1, &targets).unwrap();
        let separate_probabilities = softmax(&logits, 1).unwrap();
        assert_eq!(combined.loss.to_bits(), separate_loss.to_bits());
        assert_same_bits(
            combined.probabilities.unwrap().as_slice(),
            separate_probabilities.as_slice(),
        );
    }

    #[test]
    fn saved_probability_mode_keeps_target_validation_before_logit_reads() {
        let logits = tensor(&[1, 2], &[f64::NAN, 0.0]);
        assert_eq!(
            indexed_mean_nll_forward(&logits.view(), 1, &[2], true).unwrap_err(),
            ProbabilityError::TargetOutOfBounds {
                group: 0,
                target: 2,
                classes: 2,
            }
        );
    }

    #[test]
    fn saved_probability_modes_keep_nonfinite_error_order() {
        let logits = tensor(&[2, 2], &[0.0, f64::NAN, f64::INFINITY, 0.0]);
        let expected = ProbabilityError::PositiveInfinityLogit { group: 0, class: 1 };

        assert_eq!(
            log_softmax_forward(&logits.view(), 0, true).unwrap_err(),
            expected
        );
        assert_eq!(
            indexed_mean_nll_forward(&logits.view(), 0, &[0, 0], true).unwrap_err(),
            expected
        );
    }

    #[test]
    fn nonzero_gapped_group_bases_reuse_one_class_stride() {
        let padded = gapped_probability_source();
        let logits = padded.view().slice(2, 1..3).unwrap();
        assert_eq!(logits.shape(), [2, 3, 2]);
        assert_eq!(logits.strides(), [9, 3, 1]);
        assert_eq!(logits.base_offset(), 1);
        assert!(!logits.is_contiguous());

        let plan = AxisPlan::new(&logits, 1, false).unwrap();
        assert_eq!(plan.group_shape, [2, 2]);
        assert_eq!(plan.group_strides, [9, 1]);
        assert_eq!(plan.class_stride, 3);
        assert_eq!(
            plan.group_offsets(&logits).collect::<Vec<_>>(),
            [1, 2, 10, 11]
        );

        let (output_strides, output_len) = checked_row_major_layout(logits.shape()).unwrap();
        assert_eq!(output_strides, [6, 2, 1]);
        assert_eq!(
            plan.output_group_offsets(&output_strides, output_len)
                .collect::<Vec<_>>(),
            [0, 1, 6, 7]
        );

        let probabilities = softmax(&logits, 1).unwrap();
        let denominator = (-2.0_f64).exp() + (-1.0_f64).exp() + 1.0;
        let expected = [
            (-2.0_f64).exp() / denominator,
            (-1.0_f64).exp() / denominator,
            1.0 / denominator,
        ];
        for batch in 0..2 {
            for (class, &expected_probability) in expected.iter().enumerate() {
                for column in 0..2 {
                    let output_offset = batch * 6 + class * 2 + column;
                    assert_close(
                        probabilities.as_slice()[output_offset],
                        expected_probability,
                    );
                }
            }
        }

        let loss = indexed_mean_nll(&logits, 1, &[2, 1, 0, 2]).unwrap();
        let expected_loss =
            (-expected[2].ln() - expected[1].ln() - expected[0].ln() - expected[2].ln()) / 4.0;
        assert_close(loss, expected_loss);
    }

    #[test]
    fn sliced_and_transposed_views_are_read_through_their_strides() {
        let padded = tensor(
            &[3, 3],
            &[0.0, 1.0, 99.0, 1000.0, 1001.0, 99.0, -1001.0, -1000.0, 99.0],
        );
        let sliced = padded.view().slice(1, 0..2).unwrap();
        assert!(!sliced.is_contiguous());
        let probabilities = softmax(&sliced, 1).unwrap();
        for row in 0..3 {
            assert_close(probabilities.as_slice()[row * 2], 0.268_941_421_369_995_1);
        }

        let transposed_source = fixture();
        let transposed = transposed_source.view().transpose(0, 1).unwrap();
        let transposed_probabilities = softmax(&transposed, 0).unwrap();
        assert_eq!(transposed_probabilities.shape(), [2, 3]);
        assert_close(
            transposed_probabilities.as_slice()[0],
            0.268_941_421_369_995_1,
        );
        assert_close(
            transposed_probabilities.as_slice()[3],
            0.731_058_578_630_004_9,
        );
    }

    #[test]
    fn singleton_classes_return_exact_positive_zero_log_loss() {
        let logits = tensor(&[2, 1], &[f64::MAX, -f64::MAX]);
        let probabilities = softmax(&logits.view(), 1).unwrap();
        let log_probabilities = log_softmax(&logits.view(), 1).unwrap();
        let loss = indexed_mean_nll(&logits.view(), 1, &[0, 0]).unwrap();

        assert_eq!(probabilities.as_slice(), [1.0, 1.0]);
        assert!(
            log_probabilities
                .as_slice()
                .iter()
                .all(|value| value.to_bits() == 0)
        );
        assert_eq!(loss.to_bits(), 0);

        let signed_zeros = tensor(&[2, 1], &[0.0, -0.0]);
        let zero_probabilities = softmax(&signed_zeros.view(), 1).unwrap();
        let zero_log_probabilities = log_softmax(&signed_zeros.view(), 1).unwrap();
        let zero_loss = indexed_mean_nll(&signed_zeros.view(), 1, &[0, 0]).unwrap();
        assert_eq!(zero_probabilities.as_slice(), [1.0, 1.0]);
        assert!(
            zero_log_probabilities
                .as_slice()
                .iter()
                .all(|value| value.to_bits() == 0)
        );
        assert_eq!(zero_loss.to_bits(), 0);
    }

    #[test]
    fn finite_extremes_only_underflow_when_the_result_is_unrepresentable() {
        let logits = tensor(&[1, 2], &[-f64::MAX, f64::MAX]);
        let probabilities = softmax(&logits.view(), 1).unwrap();
        let log_probabilities = log_softmax(&logits.view(), 1).unwrap();

        assert_eq!(probabilities.as_slice()[0].to_bits(), 0.0_f64.to_bits());
        assert_eq!(probabilities.as_slice()[1], 1.0);
        assert_eq!(log_probabilities.as_slice()[0], f64::NEG_INFINITY);
        assert_eq!(log_probabilities.as_slice()[1].to_bits(), 0.0_f64.to_bits());
    }

    #[test]
    fn empty_selected_axis_has_only_a_log_sum_exp_identity() {
        let logits = tensor(&[2, 0], &[]);
        let reduced = log_sum_exp(&logits.view(), 1, false).unwrap();
        let retained = log_sum_exp(&logits.view(), 1, true).unwrap();

        assert_eq!(reduced.shape(), [2]);
        assert_eq!(reduced.as_slice(), [f64::NEG_INFINITY; 2]);
        assert_eq!(retained.shape(), [2, 1]);
        assert_eq!(retained.as_slice(), [f64::NEG_INFINITY; 2]);
        assert_eq!(
            softmax(&logits.view(), 1),
            Err(ProbabilityError::EmptyNormalizationAxis { axis: 1 })
        );
        assert_eq!(
            log_softmax(&logits.view(), 1),
            Err(ProbabilityError::EmptyNormalizationAxis { axis: 1 })
        );
        assert_eq!(
            indexed_mean_nll(&logits.view(), 1, &[0, 0]),
            Err(ProbabilityError::EmptyNormalizationAxis { axis: 1 })
        );
    }

    #[test]
    fn empty_other_axis_returns_empty_outputs_without_reads() {
        let logits = tensor(&[0, 3], &[]);
        assert_eq!(softmax(&logits.view(), 1).unwrap().shape(), [0, 3]);
        assert_eq!(log_softmax(&logits.view(), 1).unwrap().shape(), [0, 3]);
        assert_eq!(log_sum_exp(&logits.view(), 1, false).unwrap().shape(), [0]);
        assert_eq!(
            indexed_mean_nll(&logits.view(), 1, &[]),
            Err(ProbabilityError::EmptyTargets)
        );
    }

    #[test]
    fn axis_errors_precede_empty_and_target_rules() {
        let scalar = tensor(&[], &[1.0]);
        assert_eq!(
            softmax(&scalar.view(), 0),
            Err(ProbabilityError::AxisOutOfBounds { axis: 0, rank: 0 })
        );
        assert_eq!(
            indexed_mean_nll(&scalar.view(), 0, &[]),
            Err(ProbabilityError::AxisOutOfBounds { axis: 0, rank: 0 })
        );
    }

    #[test]
    fn target_shape_empty_and_bounds_rules_are_deterministic() {
        let logits = fixture();
        assert_eq!(
            indexed_mean_nll(&logits.view(), 1, &[0, 1]),
            Err(ProbabilityError::TargetCountMismatch {
                expected: 3,
                actual: 2,
            })
        );
        assert_eq!(
            indexed_mean_nll(&logits.view(), 1, &[0, 2, 9]),
            Err(ProbabilityError::TargetOutOfBounds {
                group: 1,
                target: 2,
                classes: 2,
            })
        );
    }

    #[test]
    fn every_target_bound_is_checked_before_any_logit() {
        let logits = tensor(&[1, 2], &[f64::NAN, 0.0]);
        assert_eq!(
            indexed_mean_nll(&logits.view(), 1, &[2]),
            Err(ProbabilityError::TargetOutOfBounds {
                group: 0,
                target: 2,
                classes: 2,
            })
        );
        assert_eq!(
            indexed_mean_nll(&logits.view(), 1, &[0]),
            Err(ProbabilityError::NaNLogit { group: 0, class: 0 })
        );
    }

    #[test]
    fn nonfinite_errors_follow_group_major_then_class_order() {
        let logits = tensor(&[2, 2], &[0.0, f64::NAN, f64::INFINITY, 0.0]);
        assert_eq!(
            softmax(&logits.view(), 0),
            Err(ProbabilityError::PositiveInfinityLogit { group: 0, class: 1 })
        );

        for (value, expected) in [
            (f64::NAN, ProbabilityError::NaNLogit { group: 0, class: 1 }),
            (
                f64::INFINITY,
                ProbabilityError::PositiveInfinityLogit { group: 0, class: 1 },
            ),
            (
                f64::NEG_INFINITY,
                ProbabilityError::NegativeInfinityLogit { group: 0, class: 1 },
            ),
        ] {
            let row = tensor(&[1, 2], &[0.0, value]);
            assert_eq!(log_sum_exp(&row.view(), 1, false), Err(expected));
        }
    }

    #[test]
    fn huge_empty_shapes_distinguish_layout_and_allocation_failures() {
        let huge_output = tensor(&[usize::MAX, 0], &[]);
        assert_eq!(
            log_sum_exp(&huge_output.view(), 1, false),
            Err(ProbabilityError::OutputAllocationFailed {
                elements: usize::MAX,
            })
        );

        let source = tensor(&[usize::MAX, 0, 2], &[]);
        let permuted = source.view().permute(&[1, 0, 2]).unwrap();
        assert_eq!(
            log_sum_exp(&permuted, 0, false),
            Err(ProbabilityError::Tensor(TensorError::ShapeOverflow))
        );
    }

    #[test]
    fn error_messages_and_sources_preserve_rejected_invariants() {
        let target = ProbabilityError::TargetOutOfBounds {
            group: 1,
            target: 2,
            classes: 2,
        };
        assert_eq!(
            target.to_string(),
            "target 2 at group 1 is out of bounds for 2 classes"
        );
        assert!(target.source().is_none());

        let tensor = ProbabilityError::Tensor(TensorError::ShapeOverflow);
        assert_eq!(
            tensor.to_string(),
            "shape does not fit a row-major usize layout"
        );
        assert!(tensor.source().is_some());
    }
}
