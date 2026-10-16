//! The only native dispatch boundary in the workspace's course-owned code.
use crate::{CheckedDimensions, ExecutionError};
use cudarc::{
    cublas::{CudaBlas, Gemm, GemmConfig, StridedBatchedConfig, sys::cublasOperation_t},
    driver::{CudaContext, CudaStream},
};
use std::{panic::catch_unwind, sync::Arc};

#[derive(Debug)]
pub(crate) struct CudaBackend {
    stream: Arc<CudaStream>,
    blas: CudaBlas,
}

impl CudaBackend {
    pub(crate) fn new(ordinal: usize) -> Result<Self, ExecutionError> {
        // cudarc's dynamic loaders panic on missing libraries. Convert that known
        // initialization failure into an error without modifying the global hook.
        catch_unwind(|| {
            let context = CudaContext::new(ordinal)
                .map_err(|e| ExecutionError::new("device initialization", e.to_string()))?;
            let stream = context.default_stream();
            let blas = CudaBlas::new(stream.clone())
                .map_err(|e| ExecutionError::new("cuBLAS initialization", e.to_string()))?;
            Ok(Self { stream, blas })
        })
        .map_err(|payload| {
            let message = payload
                .downcast_ref::<String>()
                .map(String::as_str)
                .or_else(|| payload.downcast_ref::<&str>().copied())
                .unwrap_or("dynamic library initialization panicked");
            ExecutionError::new("library initialization", message)
        })?
    }
}

// region:checked-cuda-gemm
#[allow(unsafe_code)]
pub(crate) fn matmul(
    backend: &CudaBackend,
    left: &[f64],
    right: &[f64],
    checked: &CheckedDimensions,
    alpha: f64,
) -> Result<Vec<f64>, ExecutionError> {
    let dims = checked.dimensions;
    debug_assert_eq!(left.len(), checked.left_len);
    debug_assert_eq!(right.len(), checked.right_len);
    let native =
        |stage, error: &dyn std::fmt::Display| ExecutionError::new(stage, error.to_string());
    let left_device = backend
        .stream
        .clone_htod(left)
        .map_err(|e| native("left transfer", &e))?;
    let right_device = backend
        .stream
        .clone_htod(right)
        .map_err(|e| native("right transfer", &e))?;
    let mut output_device = backend
        .stream
        .alloc_zeros::<f64>(checked.output_len)
        .map_err(|e| native("output allocation", &e))?;
    let config = StridedBatchedConfig {
        gemm: GemmConfig {
            transa: cublasOperation_t::CUBLAS_OP_N,
            transb: cublasOperation_t::CUBLAS_OP_N,
            m: dims.columns as i32,
            n: dims.rows as i32,
            k: dims.inner as i32,
            alpha,
            beta: 0.0,
            lda: dims.columns as i32,
            ldb: dims.inner as i32,
            ldc: dims.columns as i32,
        },
        batch_size: dims.batches as i32,
        stride_a: (dims.inner * dims.columns) as i64,
        stride_b: (dims.rows * dims.inner) as i64,
        stride_c: (dims.rows * dims.columns) as i64,
    };
    // SAFETY: MatrixDimensions::checked requires all extents positive and i32-sized,
    // exact input lengths, and addressable f64 byte lengths for all batches.
    // Therefore every positive matrix stride also fits i64. Row-major C = A B
    // is column-major C^T = B^T A^T: right is native A (N by K), left native B
    // (K by M), and output is N by M. Leading dimensions/strides above cover
    // exactly those disjoint contiguous allocations. No transpose or subview
    // reaches this boundary. Inputs and initialized output are separate live
    // cudarc-owned buffers on the same fixed stream; none is aliased or resized.
    // The handle's default host pointer mode is never changed or exposed.
    // All buffers and alpha/beta remain alive through dispatch and completion.
    unsafe {
        backend
            .blas
            .gemm_strided_batched(config, &right_device, &left_device, &mut output_device)
    }
    .map_err(|e| native("GEMM dispatch", &e))?;
    let mut output = Vec::new();
    output
        .try_reserve_exact(checked.output_len)
        .map_err(|e| native("host output allocation", &e))?;
    output.resize(checked.output_len, 0.0);
    backend
        .stream
        .memcpy_dtoh(&output_device, &mut output)
        .map_err(|e| native("output transfer", &e))?;
    backend
        .stream
        .synchronize()
        .map_err(|e| native("completion", &e))?;
    Ok(output)
}
// endregion:checked-cuda-gemm
