//! Loss-scale state only; the existing trainer, reverse pass and AdamW own math.

use std::{error::Error, fmt};

use crate::autograd::tensor_core::TensorAutodiffError;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InvalidLossScale;
impl fmt::Display for InvalidLossScale {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("loss scales must be finite powers of two with 1 <= minimum <= initial <= maximum, and growth interval must be positive")
    }
}
impl Error for InvalidLossScale {}

// region:dynamic-loss-scale
/// Course-local dynamic policy: halve on overflow; double after an interval of
/// committed finite updates, within declared bounds. Skips reset the interval.
/// This is run state, independent of learned model identity.
#[derive(Clone, Debug, PartialEq)]
pub struct DynamicLossScaler {
    scale: f64,
    minimum: f64,
    maximum: f64,
    growth_interval: usize,
    finite_updates: usize,
}

impl DynamicLossScaler {
    pub fn new(
        initial: f64,
        minimum: f64,
        maximum: f64,
        growth_interval: usize,
    ) -> Result<Self, InvalidLossScale> {
        let valid = |value: f64| {
            value.is_finite()
                && value >= 1.0
                && value.log2().fract() == 0.0
                && value.log2().exp2() == value
        };
        if !valid(initial)
            || !valid(minimum)
            || !valid(maximum)
            || minimum > initial
            || initial > maximum
            || growth_interval == 0
        {
            return Err(InvalidLossScale);
        }
        Ok(Self {
            scale: initial,
            minimum,
            maximum,
            growth_interval,
            finite_updates: 0,
        })
    }

    pub const fn scale(&self) -> f64 {
        self.scale
    }
    pub const fn finite_updates(&self) -> usize {
        self.finite_updates
    }

    pub(crate) fn overflow(&mut self) {
        self.scale = (self.scale / 2.0).max(self.minimum);
        self.finite_updates = 0;
    }

    pub(crate) fn committed(&mut self) {
        self.finite_updates += 1;
        if self.finite_updates == self.growth_interval {
            // Divide first so the growth itself cannot overflow f64.
            self.scale = if self.scale <= self.maximum / 2.0 {
                self.scale * 2.0
            } else {
                self.maximum
            };
            self.finite_updates = 0;
        }
    }
}
// endregion:dynamic-loss-scale

/// Only numerical failures of the transactional reverse pass permit a skip.
/// Shape, stale-tape, device, borrow and other programming errors propagate.
pub(crate) fn is_backward_overflow(error: &TensorAutodiffError) -> bool {
    matches!(
        error,
        TensorAutodiffError::NonFiniteVjp { .. }
            | TensorAutodiffError::NonFinitePassAdjoint { .. }
            | TensorAutodiffError::NonFiniteAccumulatedGradient { .. }
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn scale_bounds_growth_reset_and_invalid_settings() {
        for args in [
            (0.0, 1.0, 8.0, 2),
            (3.0, 1.0, 8.0, 2),
            (f64::INFINITY, 1.0, 8.0, 2),
            (4.0, 8.0, 16.0, 2),
            (4.0, 1.0, 2.0, 2),
            (4.0, 1.0, 8.0, 0),
        ] {
            assert!(DynamicLossScaler::new(args.0, args.1, args.2, args.3).is_err());
        }
        let mut scaler = DynamicLossScaler::new(4.0, 1.0, 8.0, 2).unwrap();
        scaler.committed();
        assert_eq!(scaler.scale(), 4.0);
        scaler.overflow();
        assert_eq!(scaler.scale(), 2.0);
        assert_eq!(scaler.finite_updates(), 0);
        scaler.committed();
        scaler.committed();
        assert_eq!(scaler.scale(), 4.0);
        scaler.committed();
        scaler.committed();
        assert_eq!(scaler.scale(), 8.0);
        scaler.committed();
        scaler.committed();
        assert_eq!(scaler.scale(), 8.0);
        for _ in 0..8 {
            scaler.overflow();
        }
        assert_eq!(scaler.scale(), 1.0);
        let huge = 2.0_f64.powi(1023);
        let mut scaler = DynamicLossScaler::new(huge, 1.0, huge, 1).unwrap();
        scaler.committed();
        assert_eq!(scaler.scale(), huge);
    }
}
