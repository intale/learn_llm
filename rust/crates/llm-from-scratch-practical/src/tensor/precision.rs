//! Explicit matrix arithmetic; host tensors and protected operations stay f64.

use half::{bf16, f16};

// region:matmul-precision
/// Rounding policy for the existing matrix product and its local pullbacks.
///
/// Mixed modes round each operand to the named half format, multiply and sum
/// in f32, then round the result to that half format. Tensor buffers, saved
/// primals, accumulated parameter gradients and master weights remain f64.
/// This CPU numerical reference provides no compact-storage or speed claim.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum MatmulPrecision {
    #[default]
    F64,
    F16F32,
    Bf16F32,
}

impl MatmulPrecision {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::F64 => "f64",
            Self::F16F32 => "fp16-fp32",
            Self::Bf16F32 => "bf16-fp32",
        }
    }

    /// Type of the transient represented operands and rounded matrix result.
    pub const fn represented_dtype(self) -> &'static str {
        match self {
            Self::F64 => "f64",
            Self::F16F32 => "fp16",
            Self::Bf16F32 => "bf16",
        }
    }

    pub const fn accumulator_dtype(self) -> &'static str {
        match self {
            Self::F64 => "f64",
            Self::F16F32 | Self::Bf16F32 => "f32",
        }
    }

    /// Uses half's format conversion, including ties, subnormals and overflow.
    /// Widening the represented result back to f64 loses no further bits.
    pub fn round(self, value: f64) -> f64 {
        match self {
            Self::F64 => value,
            Self::F16F32 => f16::from_f64(value).to_f64(),
            Self::Bf16F32 => bf16::from_f64(value).to_f64(),
        }
    }

    pub(crate) fn operand_f32(self, value: f64) -> f32 {
        match self {
            Self::F64 => value as f32,
            Self::F16F32 => f16::from_f64(value).to_f32(),
            Self::Bf16F32 => bf16::from_f64(value).to_f32(),
        }
    }
}
// endregion:matmul-precision

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        autograd::tensor_core::{AutogradContext, GraphRetention, TensorValue},
        tensor::{execution::TensorExecution, storage::Tensor},
    };

    #[test]
    fn matrix_sum_uses_f32_and_general_reduction_stays_protected() {
        for precision in [MatmulPrecision::F16F32, MatmulPrecision::Bf16F32] {
            let execution = TensorExecution::cpu_with_precision(precision);
            let left = Tensor::from_vec(vec![1, 3], vec![2048.0, 1.0, -2048.0]).unwrap();
            let right = Tensor::from_vec(vec![3, 1], vec![1.0; 3]).unwrap();
            assert_eq!(
                execution
                    .matmul(&left.view(), &right.view())
                    .unwrap()
                    .as_slice(),
                [1.0]
            );
            let large = Tensor::from_vec(vec![2], vec![65504.0; 2]).unwrap();
            assert_eq!(
                execution
                    .sum_axis(&large.view(), 0, false)
                    .unwrap()
                    .as_slice(),
                [131008.0]
            );
        }
    }

    #[test]
    fn default_backward_keeps_the_recorded_rounded_matrix_operands() {
        let execution = TensorExecution::cpu_with_precision(MatmulPrecision::F16F32);
        let context = AutogradContext::recording().with_execution(&execution);
        let x = TensorValue::parameter(Tensor::from_vec(vec![1, 1], vec![2.0]).unwrap()).unwrap();
        let w = TensorValue::constant(Tensor::from_vec(vec![1, 1], vec![1.0001]).unwrap()).unwrap();
        let loss = x
            .matmul_with_context(context, &w)
            .unwrap()
            .sum_axis(1, false)
            .unwrap()
            .sum_axis(0, false)
            .unwrap();
        loss.backward().unwrap();
        assert_eq!(x.gradient().unwrap().as_slice(), [1.0]);
        assert_eq!(w.value().as_slice(), [1.0001]);
    }

    #[test]
    fn scaling_before_half_pullback_preserves_a_tiny_signal() {
        let execution = TensorExecution::cpu_with_precision(MatmulPrecision::F16F32);
        let context = AutogradContext::recording().with_execution(&execution);
        let x = TensorValue::parameter(Tensor::from_vec(vec![1, 1], vec![1.0]).unwrap()).unwrap();
        let w = TensorValue::constant(Tensor::from_vec(vec![1, 1], vec![1.0]).unwrap()).unwrap();
        let loss = x
            .matmul_with_context(context, &w)
            .unwrap()
            .sum_axis(1, false)
            .unwrap()
            .sum_axis(0, false)
            .unwrap();
        let tiny = 2.0_f64.powi(-25);
        loss.backward_with_seed(
            &Tensor::from_vec(vec![], vec![tiny]).unwrap().view(),
            GraphRetention::Retain,
        )
        .unwrap();
        assert_eq!(x.gradient().unwrap().as_slice(), [0.0]);
        x.zero_grad().unwrap();
        loss.backward_with_seed_and_execution(
            &Tensor::from_vec(vec![], vec![128.0 * tiny]).unwrap().view(),
            GraphRetention::Release,
            &execution,
        )
        .unwrap();
        assert_eq!(x.gradient().unwrap().as_slice()[0] / 128.0, tiny);
    }

    #[test]
    fn mixed_precision_reuses_transposed_and_broadcast_view_plans() {
        let execution = TensorExecution::cpu_with_precision(MatmulPrecision::F16F32);
        let source = Tensor::from_vec(vec![2, 2], vec![1.0001, 2.0, 3.0, 4.0]).unwrap();
        let left = source.view().transpose(0, 1).unwrap();
        let right = Tensor::from_vec(vec![2, 2, 1], vec![1.0, 0.0, 0.0, 1.0]).unwrap();
        let result = execution.matmul(&left, &right.view()).unwrap();
        assert_eq!(result.shape(), [2, 2, 1]);
        assert_eq!(result.as_slice(), [1.0, 2.0, 3.0, 4.0]);
    }

    #[test]
    fn library_conversions_expose_range_spacing_and_ties() {
        let fp16 = MatmulPrecision::F16F32;
        let bf16 = MatmulPrecision::Bf16F32;
        assert_eq!(fp16.round(1.0 + 2.0_f64.powi(-11)), 1.0);
        assert_eq!(fp16.round(1.0 + 2.0_f64.powi(-10)), 1.0009765625);
        assert_eq!(bf16.round(1.0 + 2.0_f64.powi(-8)), 1.0);
        assert_eq!(bf16.round(1.0 + 2.0_f64.powi(-7)), 1.0078125);
        assert_eq!(fp16.round(2.0_f64.powi(-25)), 0.0);
        assert_eq!(fp16.round(2.0_f64.powi(-24)), 2.0_f64.powi(-24));
        assert_eq!(bf16.round(2.0_f64.powi(-25)), 2.0_f64.powi(-25));
        assert_eq!(fp16.round(65504.0), 65504.0);
        assert!(fp16.round(65536.0).is_infinite());
        assert!(bf16.round(65536.0).is_finite());
    }
}
