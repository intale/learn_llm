//! One initialization-only policy for the two residual output projections.

use std::error::Error;
use std::fmt;

pub const DEPTH_POLICY_ID: &str = "residual-output-init-depth-v1";

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum DepthScaleError {
    ZeroDepth,
    InvalidFactor { depth: usize, factor: f64 },
}

impl fmt::Display for DepthScaleError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroDepth => f.write_str("depth scaling requires at least one complete block"),
            Self::InvalidFactor { depth, factor } => {
                write!(f, "depth {depth} produced an invalid factor {factor:?}")
            }
        }
    }
}
impl Error for DepthScaleError {}

// region:depth-initialization-factor
/// A checked factor for a positive number of complete decoder blocks.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct DepthScalePolicy {
    depth: usize,
    factor: f64,
}

impl DepthScalePolicy {
    pub fn new(depth: usize) -> Result<Self, DepthScaleError> {
        if depth == 0 {
            return Err(DepthScaleError::ZeroDepth);
        }
        let factor = 1.0 / (depth as f64).sqrt();
        if !factor.is_finite() || factor <= 0.0 {
            return Err(DepthScaleError::InvalidFactor { depth, factor });
        }
        Ok(Self { depth, factor })
    }

    pub const fn depth(self) -> usize {
        self.depth
    }

    pub const fn factor(self) -> f64 {
        self.factor
    }

    /// Called only after the decoder owner validates the entire parameter layout.
    pub(crate) fn selects(self, name: &str) -> bool {
        name.ends_with(".attention.output.weight") || name.ends_with(".ffn.down.weight")
    }
}
// endregion:depth-initialization-factor
