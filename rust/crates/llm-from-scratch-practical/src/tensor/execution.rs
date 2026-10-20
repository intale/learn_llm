//! Explicit primitive execution for the existing host-backed tensors.
use super::precision::MatmulPrecision;
use super::{
    matmul::{MatmulError, matmul_with_transpose_and_execution},
    ops::{TensorOpError, mean_axis_with_execution, sum_axis_with_execution},
    storage::Tensor,
    view::TensorView,
};
use crate::attention::online::AttentionTiles;
use llm_cuda_adapter::CudaExecutor;
pub use llm_cuda_adapter::{ExecutionError, ExecutionStats};
use std::rc::Rc;

/// Device selection is execution state, not a model setting or tensor identity.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ExecutionDevice {
    Cpu,
    Cuda { ordinal: usize },
}

// region:explicit-tensor-execution
/// Owns an explicitly selected matmul and sum/mean executor.
/// Other operations keep their CPU implementation. Tensors remain host-backed.
/// Pass this choice through AutogradContext and explicitly to backward.
#[derive(Clone, Debug, Default)]
pub struct TensorExecution {
    cuda: Option<Rc<CudaExecutor>>,
    matmul_precision: MatmulPrecision,
    attention_tiles: Option<AttentionTiles>,
}

impl TensorExecution {
    pub const fn cpu() -> Self {
        Self::cpu_with_precision(MatmulPrecision::F64)
    }

    /// Selects represented matrix arithmetic without changing host storage.
    pub const fn cpu_with_precision(matmul_precision: MatmulPrecision) -> Self {
        Self {
            cuda: None,
            matmul_precision,
            attention_tiles: None,
        }
    }

    /// Initializes the requested device now; unavailable CUDA is an error.
    pub fn cuda(ordinal: usize) -> Result<Self, ExecutionError> {
        Ok(Self {
            cuda: Some(Rc::new(CudaExecutor::new(ordinal)?)),
            matmul_precision: MatmulPrecision::F64,
            attention_tiles: None,
        })
    }

    /// Refuses unsupported arithmetic before loading a driver or opening a GPU.
    pub fn cuda_with_precision(
        ordinal: usize,
        precision: MatmulPrecision,
    ) -> Result<Self, ExecutionError> {
        if precision != MatmulPrecision::F64 {
            return Err(ExecutionError::new(
                "precision",
                "CUDA mixed-precision matrix arithmetic is not implemented; select the CPU numerical reference explicitly",
            ));
        }
        Self::cuda(ordinal)
    }

    pub const fn matmul_precision(&self) -> MatmulPrecision {
        self.matmul_precision
    }

    /// Reuses the selected device with the precision recorded by a matrix node.
    pub fn with_matmul_precision(
        &self,
        precision: MatmulPrecision,
    ) -> Result<Self, ExecutionError> {
        if self.cuda.is_some() && precision != MatmulPrecision::F64 {
            return Err(ExecutionError::new(
                "precision",
                "CUDA mixed-precision matrix arithmetic is not implemented",
            ));
        }
        Ok(Self {
            cuda: self.cuda.clone(),
            matmul_precision: precision,
            attention_tiles: self.attention_tiles,
        })
    }

    pub fn device(&self) -> ExecutionDevice {
        self.cuda
            .as_ref()
            .map_or(ExecutionDevice::Cpu, |c| ExecutionDevice::Cuda {
                ordinal: c.ordinal(),
            })
    }

    // region:explicit-attention-execution
    /// Select compact, tiled full attention for output-oriented decoder paths.
    /// Inspectable attention APIs retain their dense reference reports.
    pub fn with_tiled_attention(mut self, tiles: AttentionTiles) -> Self {
        self.attention_tiles = Some(tiles);
        self
    }

    pub const fn attention_tiles(&self) -> Option<AttentionTiles> {
        self.attention_tiles
    }
    // endregion:explicit-attention-execution

    pub fn matmul(
        &self,
        left: &TensorView<'_>,
        right: &TensorView<'_>,
    ) -> Result<Tensor, MatmulError> {
        self.matmul_with_transpose(left, right, false, false)
    }

    pub fn matmul_with_transpose(
        &self,
        left: &TensorView<'_>,
        right: &TensorView<'_>,
        transpose_left: bool,
        transpose_right: bool,
    ) -> Result<Tensor, MatmulError> {
        matmul_with_transpose_and_execution(left, right, transpose_left, transpose_right, self)
    }

    pub fn sum_axis(
        &self,
        input: &TensorView<'_>,
        axis: usize,
        keep_dim: bool,
    ) -> Result<Tensor, TensorOpError> {
        sum_axis_with_execution(input, axis, keep_dim, self)
    }

    pub fn mean_axis(
        &self,
        input: &TensorView<'_>,
        axis: usize,
        keep_dim: bool,
    ) -> Result<Tensor, TensorOpError> {
        mean_axis_with_execution(input, axis, keep_dim, self)
    }

    /// Counts completed native GEMM requests and logical copy bytes in this session.
    pub fn stats(&self) -> ExecutionStats {
        self.cuda
            .as_ref()
            .map_or_else(ExecutionStats::default, |c| c.stats())
    }
}
// endregion:explicit-tensor-execution

impl PartialEq for TensorExecution {
    fn eq(&self, other: &Self) -> bool {
        if self.matmul_precision != other.matmul_precision
            || self.attention_tiles != other.attention_tiles
        {
            return false;
        }
        match (&self.cuda, &other.cuda) {
            (None, None) => true,
            (Some(left), Some(right)) => Rc::ptr_eq(left, right),
            _ => false,
        }
    }
}
impl Eq for TensorExecution {}

impl TensorExecution {
    pub(crate) fn cuda_executor(&self) -> Option<&CudaExecutor> {
        self.cuda.as_deref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn mixed_cuda_request_fails_before_any_driver_access() {
        for precision in [MatmulPrecision::F16F32, MatmulPrecision::Bf16F32] {
            let error = TensorExecution::cuda_with_precision(usize::MAX, precision).unwrap_err();
            assert!(error.to_string().contains("not implemented"));
            assert_ne!(
                TensorExecution::cpu(),
                TensorExecution::cpu_with_precision(precision)
            );
        }
    }
    #[test]
    fn explicit_cpu_operations_reuse_the_default_tensor_path() {
        let cpu = TensorExecution::cpu();
        let a = Tensor::from_vec(vec![1, 2], vec![2., 3.]).unwrap();
        let b = Tensor::from_vec(vec![2, 1], vec![4., 5.]).unwrap();
        assert_eq!(
            cpu.matmul(&a.view(), &b.view()).unwrap(),
            super::super::matmul::matmul(&a.view(), &b.view()).unwrap()
        );
        assert_eq!(
            cpu.mean_axis(&a.view(), 1, false).unwrap().as_slice(),
            [2.5]
        );
        assert!(cpu.matmul(&a.view(), &a.view()).is_err());
        assert_eq!(cpu.stats(), ExecutionStats::default());
    }
    #[cfg(not(feature = "cuda"))]
    #[test]
    fn requesting_cuda_requires_an_explicit_feature_build() {
        assert!(TensorExecution::cuda(0).is_err());
        assert_eq!(TensorExecution::cpu().device(), ExecutionDevice::Cpu);
    }
}
