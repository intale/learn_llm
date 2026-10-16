//! A safe, deliberately small host-slice boundary around optional CUDA GEMM.
//!
//! No CUDA types escape this crate. Default builds do not link or load CUDA.
use std::{cell::Cell, error::Error, fmt};

#[cfg(feature = "cuda")]
mod cuda;

/// A failed execution request. Native diagnostics remain attached to their stage.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ExecutionError {
    stage: &'static str,
    detail: String,
}

impl ExecutionError {
    /// Constructs an error at a named execution boundary.
    pub fn new(stage: &'static str, detail: impl Into<String>) -> Self {
        Self {
            stage,
            detail: detail.into(),
        }
    }
}

impl fmt::Display for ExecutionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "CUDA {}: {}", self.stage, self.detail)
    }
}
impl Error for ExecutionError {}

/// Counts completed API requests and logical copy bytes, not vendor kernels.
/// Counters saturate if a process exceeds usize::MAX accumulated units.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct ExecutionStats {
    pub completed_gemm_requests: usize,
    pub host_to_device_bytes: usize,
    pub device_to_host_bytes: usize,
}

/// Effective contiguous row-major batch dimensions, independent of source views.
#[derive(Clone, Copy, Debug)]
pub struct MatrixDimensions {
    pub batches: usize,
    pub rows: usize,
    pub inner: usize,
    pub columns: usize,
}

#[cfg(any(feature = "cuda", test))]
#[derive(Debug)]
pub(crate) struct CheckedDimensions {
    pub dimensions: MatrixDimensions,
    pub left_len: usize,
    pub right_len: usize,
    pub output_len: usize,
    pub input_bytes: usize,
    pub output_bytes: usize,
}

impl MatrixDimensions {
    #[cfg(any(feature = "cuda", test))]
    fn checked(
        self,
        left_len: usize,
        right_len: usize,
    ) -> Result<CheckedDimensions, ExecutionError> {
        let fail = |message| ExecutionError::new("dimensions", message);
        for extent in [self.batches, self.rows, self.inner, self.columns] {
            if extent == 0 || i32::try_from(extent).is_err() {
                return Err(fail("native GEMM extents must be positive and fit i32"));
            }
        }
        let length = |a: usize, b: usize| -> Result<usize, ExecutionError> {
            self.batches
                .checked_mul(a)
                .and_then(|n| n.checked_mul(b))
                .filter(|&n| n <= (isize::MAX as usize) / size_of::<f64>())
                .ok_or_else(|| fail("f64 buffer size overflows the addressable range"))
        };
        let expected_left = length(self.rows, self.inner)?;
        let expected_right = length(self.inner, self.columns)?;
        let output_len = length(self.rows, self.columns)?;
        if left_len != expected_left || right_len != expected_right {
            return Err(fail("packed input lengths do not match batch dimensions"));
        }
        let input_bytes = expected_left
            .checked_add(expected_right)
            .and_then(|n| n.checked_mul(size_of::<f64>()))
            .ok_or_else(|| fail("combined transfer size overflows usize"))?;
        Ok(CheckedDimensions {
            dimensions: self,
            left_len: expected_left,
            right_len: expected_right,
            output_len,
            input_bytes,
            output_bytes: output_len * size_of::<f64>(),
        })
    }
}

/// One explicitly initialized CUDA device and fixed cuBLAS stream.
#[derive(Debug)]
pub struct CudaExecutor {
    ordinal: usize,
    stats: Cell<ExecutionStats>,
    #[cfg(feature = "cuda")]
    backend: cuda::CudaBackend,
}

impl CudaExecutor {
    /// Fails explicitly when CUDA support, libraries or the requested device are absent.
    pub fn new(ordinal: usize) -> Result<Self, ExecutionError> {
        #[cfg(feature = "cuda")]
        {
            if i32::try_from(ordinal).is_err() {
                return Err(ExecutionError::new(
                    "initialization",
                    "device ordinal exceeds i32",
                ));
            }
            Ok(Self {
                ordinal,
                stats: Cell::default(),
                backend: cuda::CudaBackend::new(ordinal)?,
            })
        }
        #[cfg(not(feature = "cuda"))]
        {
            let _ = ordinal;
            Err(ExecutionError::new(
                "initialization",
                "build with the cuda Cargo feature to request CUDA",
            ))
        }
    }

    pub fn ordinal(&self) -> usize {
        self.ordinal
    }
    pub fn stats(&self) -> ExecutionStats {
        self.stats.get()
    }

    /// Returns completed host values for alpha * left * right, one product per batch.
    /// Empty products are resolved by the caller before crossing this boundary.
    pub fn matmul(
        &self,
        left: &[f64],
        right: &[f64],
        dimensions: MatrixDimensions,
        alpha: f64,
    ) -> Result<Vec<f64>, ExecutionError> {
        #[cfg(feature = "cuda")]
        {
            let checked = dimensions.checked(left.len(), right.len())?;
            let output = cuda::matmul(&self.backend, left, right, &checked, alpha)?;
            let old = self.stats.get();
            self.stats.set(ExecutionStats {
                completed_gemm_requests: old.completed_gemm_requests.saturating_add(1),
                host_to_device_bytes: old.host_to_device_bytes.saturating_add(checked.input_bytes),
                device_to_host_bytes: old
                    .device_to_host_bytes
                    .saturating_add(checked.output_bytes),
            });
            Ok(output)
        }
        #[cfg(not(feature = "cuda"))]
        {
            let _ = (left, right, dimensions, alpha);
            Err(ExecutionError::new("dispatch", "CUDA feature is disabled"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn native_boundary_rejects_short_buffers_and_out_of_range_extents() {
        let dims = MatrixDimensions {
            batches: 2,
            rows: 2,
            inner: 3,
            columns: 4,
        };
        assert!(dims.checked(6, 12).is_err());
        let checked = dims.checked(12, 24).unwrap();
        assert_eq!(checked.dimensions.batches, 2);
        assert_eq!(checked.left_len, 12);
        assert_eq!(checked.right_len, 24);
        assert_eq!(checked.output_len, 16);
        assert_eq!(checked.input_bytes, 288);
        assert_eq!(checked.output_bytes, 128);
        assert!(MatrixDimensions { rows: 0, ..dims }.checked(0, 24).is_err());
        assert!(
            MatrixDimensions {
                rows: i32::MAX as usize + 1,
                ..dims
            }
            .checked(0, 0)
            .is_err()
        );
        assert!(
            MatrixDimensions {
                batches: i32::MAX as usize,
                rows: i32::MAX as usize,
                inner: i32::MAX as usize,
                columns: 1
            }
            .checked(0, 0)
            .is_err()
        );
    }
    #[cfg(not(feature = "cuda"))]
    #[test]
    fn cpu_build_refuses_cuda_instead_of_falling_back() {
        assert!(
            CudaExecutor::new(0)
                .unwrap_err()
                .to_string()
                .contains("cuda Cargo feature")
        );
    }
}
