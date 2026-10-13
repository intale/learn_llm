//! Off-graph measurements of the existing decoder's residual stream.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use crate::models::decoder::{DecoderModel, DecoderModelForward};
use crate::tensor::storage::Tensor;

pub const LOWER_RATIO: f64 = 0.01;
pub const UPPER_RATIO: f64 = 100.0;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RatioStatus {
    Within,
    Below,
    Above,
}

#[derive(Debug)]
pub enum DepthHealthError {
    Autodiff(TensorAutodiffError),
    InvalidGeometry,
    NoValidPositions,
    MissingAdjoint { site: usize },
    NonFiniteValue,
    InvalidNormalizer,
    InvalidRatio,
    ModelForwardMismatch,
}
impl fmt::Display for DepthHealthError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Autodiff(e) => e.fmt(f),
            other => write!(f, "residual health measurement refused: {other:?}"),
        }
    }
}
impl Error for DepthHealthError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Autodiff(e) => Some(e),
            _ => None,
        }
    }
}
impl From<TensorAutodiffError> for DepthHealthError {
    fn from(e: TensorAutodiffError) -> Self {
        Self::Autodiff(e)
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct ResidualHealthRow {
    pub site: usize,
    pub label: String,
    pub activation_rms: f64,
    pub adjoint_rms: f64,
    pub activation_ratio: f64,
    pub adjoint_ratio: f64,
    pub activation_status: RatioStatus,
    pub adjoint_status: RatioStatus,
}

/// Branch RMS and gain values are context, not members of the residual ratio band.
#[derive(Clone, Debug, PartialEq)]
pub struct BranchHealthRow {
    pub block: usize,
    pub attention_output_rms: f64,
    pub feed_forward_output_rms: f64,
    pub attention_norm_gain: Vec<f64>,
    pub feed_forward_norm_gain: Vec<f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct DepthHealthReport {
    pub valid_positions: usize,
    pub width: usize,
    pub input_activation_normalizer: f64,
    pub terminal_adjoint_normalizer: f64,
    pub sites: Vec<ResidualHealthRow>,
    pub branches: Vec<BranchHealthRow>,
    pub final_norm_gain: Vec<f64>,
}
impl DepthHealthReport {
    pub fn within_band(&self) -> bool {
        self.sites.iter().all(|row| {
            row.activation_status == RatioStatus::Within
                && row.adjoint_status == RatioStatus::Within
        })
    }
}

pub fn classify_ratio(ratio: f64) -> Result<RatioStatus, DepthHealthError> {
    if !ratio.is_finite() || ratio < 0.0 {
        return Err(DepthHealthError::InvalidRatio);
    }
    Ok(if ratio < LOWER_RATIO {
        RatioStatus::Below
    } else if ratio > UPPER_RATIO {
        RatioStatus::Above
    } else {
        RatioStatus::Within
    })
}

/// Input, attention-addition output, FFN-addition output; shared boundaries once.
pub fn residual_sites(forward: &DecoderModelForward) -> Vec<TensorValue> {
    let mut sites = Vec::with_capacity(2 * forward.blocks().len() + 1);
    sites.push(forward.embedding().clone());
    for block in forward.blocks() {
        sites.push(block.after_attention().clone());
        sites.push(block.output().clone());
    }
    sites
}

/// Gathers only valid features before an overflow-safe scaled RMS reduction.
pub fn valid_feature_rms(value: &Tensor, valid: &[bool]) -> Result<f64, DepthHealthError> {
    let shape = value.shape();
    if shape.len() != 3 || shape[2] == 0 || shape[0].checked_mul(shape[1]) != Some(valid.len()) {
        return Err(DepthHealthError::InvalidGeometry);
    }
    let width = shape[2];
    let mut scale: f64 = 0.0;
    let mut scaled_squares: f64 = 0.0;
    let mut count = 0usize;
    for (position, active) in valid.iter().enumerate() {
        if !active {
            continue;
        }
        for x in &value.as_slice()[position * width..(position + 1) * width] {
            if !x.is_finite() {
                return Err(DepthHealthError::NonFiniteValue);
            }
            let magnitude = x.abs();
            count += 1;
            if magnitude == 0.0 {
                continue;
            }
            if magnitude > scale {
                scaled_squares = 1.0 + scaled_squares * (scale / magnitude).powi(2);
                scale = magnitude;
            } else {
                scaled_squares += (magnitude / scale).powi(2);
            }
        }
    }
    if count == 0 {
        return Err(DepthHealthError::NoValidPositions);
    }
    let rms = scale * (scaled_squares / count as f64).sqrt();
    if !rms.is_finite() {
        return Err(DepthHealthError::NonFiniteValue);
    }
    Ok(rms)
}

/// Runs the existing reverse pass once, then measures its completed adjoints.
/// The caller supplies the existing valid-target mean loss for this forward.
// region:completed-residual-health
pub fn observe_residual_health(
    model: &DecoderModel,
    forward: &DecoderModelForward,
    mean_loss: &TensorValue,
    valid: &[bool],
) -> Result<DepthHealthReport, DepthHealthError> {
    let sites = residual_sites(forward);
    if forward.blocks().len() != model.config().layers()
        || forward.embedding().shape().last().copied() != Some(model.config().model_width())
    {
        return Err(DepthHealthError::ModelForwardMismatch);
    }
    let activations = sites
        .iter()
        .map(|site| valid_feature_rms(&site.value(), valid))
        .collect::<Result<Vec<_>, _>>()?;
    let adjoints = mean_loss.backward_with_selected_adjoints(&sites)?;
    let gradients = adjoints
        .iter()
        .enumerate()
        .map(|(site, adjoint)| {
            let adjoint = adjoint
                .as_ref()
                .ok_or(DepthHealthError::MissingAdjoint { site })?;
            if adjoint.shape() != sites[site].shape() {
                return Err(DepthHealthError::InvalidGeometry);
            }
            valid_feature_rms(adjoint, valid)
        })
        .collect::<Result<Vec<_>, _>>()?;
    let input_activation_normalizer = activations[0];
    let terminal_adjoint_normalizer = *gradients.last().ok_or(DepthHealthError::InvalidGeometry)?;
    if input_activation_normalizer <= 0.0
        || terminal_adjoint_normalizer <= 0.0
        || !input_activation_normalizer.is_finite()
        || !terminal_adjoint_normalizer.is_finite()
    {
        return Err(DepthHealthError::InvalidNormalizer);
    }
    let rows = activations
        .iter()
        .zip(&gradients)
        .enumerate()
        .map(|(site, (&a, &g))| {
            let activation_ratio = a / input_activation_normalizer;
            let adjoint_ratio = g / terminal_adjoint_normalizer;
            let label = if site == 0 {
                "input".to_owned()
            } else if site % 2 == 1 {
                format!("block.{}.after_attention", site / 2)
            } else {
                format!("block.{}.after_feed_forward", site / 2 - 1)
            };
            Ok(ResidualHealthRow {
                site,
                label,
                activation_rms: a,
                adjoint_rms: g,
                activation_ratio,
                adjoint_ratio,
                activation_status: classify_ratio(activation_ratio)?,
                adjoint_status: classify_ratio(adjoint_ratio)?,
            })
        })
        .collect::<Result<Vec<_>, DepthHealthError>>()?;
    let mut branches = Vec::with_capacity(forward.blocks().len());
    for (block, (values, owner)) in forward.blocks().iter().zip(model.blocks()).enumerate() {
        branches.push(BranchHealthRow {
            block,
            attention_output_rms: valid_feature_rms(&values.attention().output().value(), valid)?,
            feed_forward_output_rms: valid_feature_rms(
                &values.feed_forward().output().value(),
                valid,
            )?,
            attention_norm_gain: owner
                .attention_norm()
                .gain()
                .tensor()
                .value()
                .as_slice()
                .to_vec(),
            feed_forward_norm_gain: owner
                .feed_forward_norm()
                .gain()
                .tensor()
                .value()
                .as_slice()
                .to_vec(),
        });
    }
    Ok(DepthHealthReport {
        valid_positions: valid.iter().filter(|&&v| v).count(),
        width: model.config().model_width(),
        input_activation_normalizer,
        terminal_adjoint_normalizer,
        sites: rows,
        branches,
        final_norm_gain: model
            .final_norm()
            .gain()
            .tensor()
            .value()
            .as_slice()
            .to_vec(),
    })
}
// endregion:completed-residual-health
