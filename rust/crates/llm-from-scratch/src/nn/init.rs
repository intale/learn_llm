//! Deterministic, width-aware construction of named trainable parameters.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use crate::tensor::storage::{Tensor, TensorError};

const SPLITMIX_INCREMENT: u64 = 0x9e37_79b9_7f4a_7c15;
const SPLITMIX_MIX_ONE: u64 = 0xbf58_476d_1ce4_e5b9;
const SPLITMIX_MIX_TWO: u64 = 0x94d0_49bb_1331_11eb;
const BINARY64_UNIT_SCALE: f64 = 1.0 / ((1_u64 << 53) as f64);

// region:parameter-init-errors
/// A deterministic rejection while constructing or collecting a parameter.
#[derive(Clone, Debug, PartialEq)]
pub enum InitializationError {
    EmptyName,
    EmptyNameSegment {
        index: usize,
    },
    InvalidNameCharacter {
        index: usize,
        byte: u8,
    },
    ZeroFanIn,
    ZeroFanOut,
    FanSumOverflow {
        fan_in: usize,
        fan_out: usize,
    },
    ShapeProductOverflow {
        fan_in: usize,
        fan_out: usize,
    },
    AllocationFailed {
        elements: usize,
    },
    DuplicateName {
        name: String,
        first: usize,
        repeated: usize,
    },
    Tensor(TensorError),
    Autodiff(TensorAutodiffError),
}

impl fmt::Display for InitializationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyName => formatter.write_str("parameter name must not be empty"),
            Self::EmptyNameSegment { index } => write!(
                formatter,
                "parameter name has an empty dot-separated segment at byte {index}"
            ),
            Self::InvalidNameCharacter { index, byte } => write!(
                formatter,
                "parameter name byte {index} must be lowercase ASCII, a digit, underscore, or dot; got 0x{byte:02x}"
            ),
            Self::ZeroFanIn => formatter.write_str("fan-in must be greater than zero"),
            Self::ZeroFanOut => formatter.write_str("fan-out must be greater than zero"),
            Self::FanSumOverflow { fan_in, fan_out } => write!(
                formatter,
                "fan-in {fan_in} plus fan-out {fan_out} does not fit usize"
            ),
            Self::ShapeProductOverflow { fan_in, fan_out } => write!(
                formatter,
                "matrix shape [{fan_in},{fan_out}] does not fit usize"
            ),
            Self::AllocationFailed { elements } => write!(
                formatter,
                "could not reserve storage for {elements} initialized values"
            ),
            Self::DuplicateName {
                name,
                first,
                repeated,
            } => write!(
                formatter,
                "parameter name {name:?} first appears at index {first} and repeats at index {repeated}"
            ),
            Self::Tensor(error) => error.fmt(formatter),
            Self::Autodiff(error) => error.fmt(formatter),
        }
    }
}

impl Error for InitializationError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(error) => Some(error),
            Self::Autodiff(error) => Some(error),
            _ => None,
        }
    }
}

impl From<TensorError> for InitializationError {
    fn from(error: TensorError) -> Self {
        Self::Tensor(error)
    }
}

impl From<TensorAutodiffError> for InitializationError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}
// endregion:parameter-init-errors

// region:deterministic-prng
/// A small deterministic generator with an explicit resumable 64-bit state.
///
/// This generator is suitable for reproducible teaching fixtures. It is not a
/// cryptographically secure random-number generator.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SplitMix64 {
    state: u64,
}

impl SplitMix64 {
    /// Treats `seed` as the raw state before the first increment and draw.
    pub const fn from_seed(seed: u64) -> Self {
        Self { state: seed }
    }

    /// Resumes directly from a previously recorded raw state.
    pub const fn from_state(state: u64) -> Self {
        Self { state }
    }

    /// Returns the raw state that the next draw will advance.
    pub const fn state(&self) -> u64 {
        self.state
    }

    /// Advances and mixes one exactly specified 64-bit value.
    pub fn next_u64(&mut self) -> u64 {
        self.state = self.state.wrapping_add(SPLITMIX_INCREMENT);
        let mut value = self.state;
        value = (value ^ (value >> 30)).wrapping_mul(SPLITMIX_MIX_ONE);
        value = (value ^ (value >> 27)).wrapping_mul(SPLITMIX_MIX_TWO);
        value ^ (value >> 31)
    }

    /// Maps the high 53 bits of one draw to the binary64 interval [0,1).
    pub fn next_unit_f64(&mut self) -> f64 {
        ((self.next_u64() >> 11) as f64) * BINARY64_UNIT_SCALE
    }
}
// endregion:deterministic-prng

// region:xavier-initialization
/// The formula-derived scale for one [fan-in, fan-out] matrix.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct XavierScale {
    fan_in: usize,
    fan_out: usize,
    target_variance: f64,
    standard_deviation: f64,
    uniform_limit: f64,
}

impl XavierScale {
    pub const fn fan_in(self) -> usize {
        self.fan_in
    }

    pub const fn fan_out(self) -> usize {
        self.fan_out
    }

    pub const fn target_variance(self) -> f64 {
        self.target_variance
    }

    pub const fn standard_deviation(self) -> f64 {
        self.standard_deviation
    }

    pub const fn uniform_limit(self) -> f64 {
        self.uniform_limit
    }
}

/// Calculates the Xavier variance, standard deviation, and uniform bound.
pub fn xavier_scale(fan_in: usize, fan_out: usize) -> Result<XavierScale, InitializationError> {
    if fan_in == 0 {
        return Err(InitializationError::ZeroFanIn);
    }
    if fan_out == 0 {
        return Err(InitializationError::ZeroFanOut);
    }
    let fan_sum = fan_in
        .checked_add(fan_out)
        .ok_or(InitializationError::FanSumOverflow { fan_in, fan_out })?;
    let target_variance = 2.0 / fan_sum as f64;
    Ok(XavierScale {
        fan_in,
        fan_out,
        target_variance,
        standard_deviation: target_variance.sqrt(),
        uniform_limit: (6.0 / fan_sum as f64).sqrt(),
    })
}

fn checked_element_count(fan_in: usize, fan_out: usize) -> Result<usize, InitializationError> {
    fan_in
        .checked_mul(fan_out)
        .ok_or(InitializationError::ShapeProductOverflow { fan_in, fan_out })
}

fn validate_name(name: &str) -> Result<(), InitializationError> {
    if name.is_empty() {
        return Err(InitializationError::EmptyName);
    }

    let mut previous_was_dot = true;
    for (index, byte) in name.bytes().enumerate() {
        if byte == b'.' {
            if previous_was_dot {
                return Err(InitializationError::EmptyNameSegment { index });
            }
            previous_was_dot = true;
            continue;
        }

        if !(byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_') {
            return Err(InitializationError::InvalidNameCharacter { index, byte });
        }
        previous_was_dot = false;
    }

    if previous_was_dot {
        return Err(InitializationError::EmptyNameSegment { index: name.len() });
    }
    Ok(())
}

fn initialized_values(
    rng: &mut SplitMix64,
    scale: XavierScale,
) -> Result<Vec<f64>, InitializationError> {
    let elements = checked_element_count(scale.fan_in, scale.fan_out)?;
    let mut values = Vec::new();
    values
        .try_reserve_exact(elements)
        .map_err(|_| InitializationError::AllocationFailed { elements })?;
    for _ in 0..elements {
        let centered = 2.0 * rng.next_unit_f64() - 1.0;
        values.push(scale.uniform_limit * centered);
    }
    Ok(values)
}
// endregion:xavier-initialization

// region:named-parameters
/// One immutable external name paired with one trainable tensor-tape leaf.
#[derive(Clone, Debug)]
pub struct NamedParameter {
    name: String,
    tensor: TensorValue,
}

impl NamedParameter {
    /// Wraps an already-created tensor as a named trainable leaf.
    pub fn from_tensor(
        name: impl Into<String>,
        tensor: Tensor,
    ) -> Result<Self, InitializationError> {
        let name = name.into();
        validate_name(&name)?;
        Ok(Self {
            name,
            tensor: TensorValue::parameter(tensor)?,
        })
    }

    /// Samples one [fan-in, fan-out] trainable matrix transactionally.
    pub fn xavier_uniform(
        name: impl Into<String>,
        fan_in: usize,
        fan_out: usize,
        rng: &mut SplitMix64,
    ) -> Result<Self, InitializationError> {
        let name = name.into();
        validate_name(&name)?;
        let scale = xavier_scale(fan_in, fan_out)?;
        let elements = checked_element_count(fan_in, fan_out)?;

        let mut trial = rng.clone();
        let values = initialized_values(&mut trial, scale)?;
        debug_assert_eq!(values.len(), elements);
        let tensor = Tensor::from_vec(vec![fan_in, fan_out], values)?;
        let parameter = Self {
            name,
            tensor: TensorValue::parameter(tensor)?,
        };
        *rng = trial;
        Ok(parameter)
    }

    /// Returns the stable external identity used by layers and checkpoints.
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Borrows the trainable tape leaf without duplicating its tensor storage.
    pub fn tensor(&self) -> &TensorValue {
        &self.tensor
    }
}

/// A duplicate-checked, declaration-ordered set of named parameters.
#[derive(Clone, Debug, Default)]
pub struct NamedParameters {
    parameters: Vec<NamedParameter>,
}

impl NamedParameters {
    pub fn try_new(parameters: Vec<NamedParameter>) -> Result<Self, InitializationError> {
        for repeated in 0..parameters.len() {
            if let Some(first) = parameters[..repeated]
                .iter()
                .position(|parameter| parameter.name() == parameters[repeated].name())
            {
                return Err(InitializationError::DuplicateName {
                    name: parameters[repeated].name().to_owned(),
                    first,
                    repeated,
                });
            }
        }
        Ok(Self { parameters })
    }

    pub fn len(&self) -> usize {
        self.parameters.len()
    }

    pub fn is_empty(&self) -> bool {
        self.parameters.is_empty()
    }

    pub fn as_slice(&self) -> &[NamedParameter] {
        &self.parameters
    }

    pub fn iter(&self) -> impl ExactSizeIterator<Item = &NamedParameter> {
        self.parameters.iter()
    }

    pub fn get(&self, name: &str) -> Option<&NamedParameter> {
        self.parameters
            .iter()
            .find(|parameter| parameter.name() == name)
    }
}
// endregion:named-parameters

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::tensor_core::{TensorAutodiffError, TensorOperation};

    fn finite_tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    #[test]
    fn splitmix64_matches_the_seed_zero_reference_sequence() {
        let mut rng = SplitMix64::from_seed(0);
        assert_eq!(
            [
                rng.next_u64(),
                rng.next_u64(),
                rng.next_u64(),
                rng.next_u64(),
            ],
            [
                0xe220_a839_7b1d_cdaf,
                0x6e78_9e6a_a1b9_65f4,
                0x06c4_5d18_8009_454f,
                0xf88b_b8a8_724c_81ec,
            ]
        );
    }

    #[test]
    fn cloned_and_resumed_generators_preserve_the_exact_state() {
        let mut rng = SplitMix64::from_seed(17);
        let first = rng.next_u64();
        let state = rng.state();
        let mut cloned = rng.clone();
        let mut resumed = SplitMix64::from_state(state);

        let cloned_next = cloned.next_u64();
        let resumed_next = resumed.next_u64();
        assert_ne!(first, cloned_next);
        assert_eq!(cloned_next, resumed_next);
        assert_eq!(cloned.state(), resumed.state());
        assert_eq!(cloned.next_u64(), resumed.next_u64());
    }

    #[test]
    fn unit_values_stay_in_the_half_open_interval() {
        let mut rng = SplitMix64::from_seed(0);
        for _ in 0..10_000 {
            let value = rng.next_unit_f64();
            assert!((0.0..1.0).contains(&value));
        }
    }

    #[test]
    fn xavier_scale_matches_the_formula() {
        let square = xavier_scale(2, 2).unwrap();
        assert_eq!(square.target_variance(), 0.5);
        assert_eq!(square.standard_deviation(), (0.5_f64).sqrt());
        assert_eq!(square.uniform_limit(), (1.5_f64).sqrt());

        let doubled_input = xavier_scale(4, 2).unwrap();
        assert_eq!(doubled_input.target_variance(), 1.0 / 3.0);
        assert_eq!(doubled_input.standard_deviation(), (1.0_f64 / 3.0).sqrt());
        assert_eq!(doubled_input.uniform_limit(), 1.0);
    }

    #[test]
    fn frozen_seed_seventeen_parameter_matches_exact_binary64_values() {
        let mut rng = SplitMix64::from_seed(17);
        let parameter =
            NamedParameter::xavier_uniform("projection.weight", 2, 2, &mut rng).unwrap();
        let bits: Vec<_> = parameter
            .tensor()
            .value()
            .as_slice()
            .iter()
            .map(|value| value.to_bits())
            .collect();

        assert_eq!(
            bits,
            [
                0x3f74_4760_bbbf_c4e2,
                0xbfd1_0508_0689_42ad,
                0xbfda_e98b_1d44_f6ae,
                0xbfe5_a45c_1710_f8d8,
            ]
        );
    }

    #[test]
    fn same_stream_reproduces_and_one_shared_stream_separates_parameters() {
        let mut left_rng = SplitMix64::from_seed(17);
        let mut right_rng = SplitMix64::from_seed(17);
        let left = NamedParameter::xavier_uniform("projection.left", 2, 2, &mut left_rng).unwrap();
        let right =
            NamedParameter::xavier_uniform("projection.right", 2, 2, &mut right_rng).unwrap();
        assert_eq!(left.tensor().value(), right.tensor().value());

        let second =
            NamedParameter::xavier_uniform("projection.second", 2, 2, &mut left_rng).unwrap();
        assert_ne!(left.tensor().value(), second.tensor().value());
    }

    #[test]
    fn selected_distinct_seed_changes_the_frozen_parameter() {
        let mut first_rng = SplitMix64::from_seed(17);
        let mut second_rng = SplitMix64::from_seed(18);
        let first =
            NamedParameter::xavier_uniform("projection.weight", 2, 2, &mut first_rng).unwrap();
        let second =
            NamedParameter::xavier_uniform("projection.weight", 2, 2, &mut second_rng).unwrap();
        assert_ne!(first.tensor().value(), second.tensor().value());
    }

    #[test]
    fn xavier_values_are_finite_row_major_and_inside_the_bound() {
        let mut rng = SplitMix64::from_seed(9);
        let parameter = NamedParameter::xavier_uniform("wide.weight", 3, 5, &mut rng).unwrap();
        let value = parameter.tensor().value();
        let limit = xavier_scale(3, 5).unwrap().uniform_limit();

        assert_eq!(value.shape(), &[3, 5]);
        assert_eq!(value.len(), 15);
        assert!(
            value
                .as_slice()
                .iter()
                .all(|entry| entry.is_finite() && *entry >= -limit && *entry < limit)
        );
        assert_eq!(
            rng.state(),
            9_u64.wrapping_add(SPLITMIX_INCREMENT.wrapping_mul(15))
        );
    }

    #[test]
    fn validation_precedence_and_failures_preserve_rng_state() {
        let mut rng = SplitMix64::from_seed(23);
        let state = rng.state();

        assert_eq!(
            NamedParameter::xavier_uniform("", 0, 0, &mut rng).unwrap_err(),
            InitializationError::EmptyName
        );
        assert_eq!(
            NamedParameter::xavier_uniform(".bad", 0, 0, &mut rng).unwrap_err(),
            InitializationError::EmptyNameSegment { index: 0 }
        );
        assert_eq!(
            NamedParameter::xavier_uniform("Bad", 0, 0, &mut rng).unwrap_err(),
            InitializationError::InvalidNameCharacter {
                index: 0,
                byte: b'B',
            }
        );
        assert_eq!(
            NamedParameter::xavier_uniform("valid.weight", 0, 0, &mut rng).unwrap_err(),
            InitializationError::ZeroFanIn
        );
        assert_eq!(
            NamedParameter::xavier_uniform("valid.weight", 1, 0, &mut rng).unwrap_err(),
            InitializationError::ZeroFanOut
        );
        assert_eq!(
            NamedParameter::xavier_uniform("valid.weight", usize::MAX, 1, &mut rng).unwrap_err(),
            InitializationError::FanSumOverflow {
                fan_in: usize::MAX,
                fan_out: 1,
            }
        );
        let product_fan_in = usize::MAX / 2 + 1;
        assert_eq!(
            NamedParameter::xavier_uniform("valid.weight", product_fan_in, 2, &mut rng)
                .unwrap_err(),
            InitializationError::ShapeProductOverflow {
                fan_in: product_fan_in,
                fan_out: 2,
            }
        );
        assert_eq!(rng.state(), state);
    }

    #[test]
    fn deterministic_capacity_failure_preserves_rng_state() {
        let mut rng = SplitMix64::from_seed(31);
        let state = rng.state();
        let too_many_f64s = (isize::MAX as usize) / std::mem::size_of::<f64>() + 1;

        assert_eq!(
            NamedParameter::xavier_uniform("huge.weight", too_many_f64s, 1, &mut rng).unwrap_err(),
            InitializationError::AllocationFailed {
                elements: too_many_f64s,
            }
        );
        assert_eq!(rng.state(), state);
    }

    #[test]
    fn manual_parameters_validate_names_before_tensor_values() {
        let nonfinite = finite_tensor(&[1], &[f64::NAN]);
        assert_eq!(
            NamedParameter::from_tensor("Bad", nonfinite.clone()).unwrap_err(),
            InitializationError::InvalidNameCharacter {
                index: 0,
                byte: b'B',
            }
        );
        let error = NamedParameter::from_tensor("manual.weight", nonfinite).unwrap_err();
        assert!(error.source().is_some());
        match error {
            InitializationError::Autodiff(TensorAutodiffError::NonFiniteLeaf {
                operation: TensorOperation::Parameter,
                index: 0,
                value,
            }) => assert!(value.is_nan()),
            other => panic!("unexpected error: {other:?}"),
        }
    }

    #[test]
    fn clone_preserves_leaf_identity_but_equal_recreation_does_not() {
        let tensor = finite_tensor(&[2], &[1.0, -1.0]);
        let parameter = NamedParameter::from_tensor("shared.weight", tensor.clone()).unwrap();
        let clone = parameter.clone();
        let recreated = NamedParameter::from_tensor("shared.weight", tensor).unwrap();

        assert!(parameter.tensor().is_same_node(clone.tensor()));
        assert!(!parameter.tensor().is_same_node(recreated.tensor()));
        assert_eq!(parameter.tensor().value(), recreated.tensor().value());
        let gradient = parameter.tensor().gradient().unwrap();
        assert!(gradient.as_slice().iter().all(|value| value.to_bits() == 0));
    }

    #[test]
    fn named_collection_preserves_order_lookup_and_empty_state() {
        let empty = NamedParameters::try_new(Vec::new()).unwrap();
        assert!(empty.is_empty());
        assert_eq!(empty.len(), 0);

        let first = NamedParameter::from_tensor(
            "embedding.weight",
            finite_tensor(&[2, 2], &[1.0, 2.0, 3.0, 4.0]),
        )
        .unwrap();
        let second =
            NamedParameter::from_tensor("projection.weight", finite_tensor(&[2, 1], &[5.0, 6.0]))
                .unwrap();
        let parameters = NamedParameters::try_new(vec![first.clone(), second.clone()]).unwrap();

        assert_eq!(
            parameters
                .iter()
                .map(NamedParameter::name)
                .collect::<Vec<_>>(),
            ["embedding.weight", "projection.weight"]
        );
        assert!(
            parameters
                .get("embedding.weight")
                .unwrap()
                .tensor()
                .is_same_node(first.tensor())
        );
        assert!(parameters.get("missing").is_none());
        assert_eq!(parameters.as_slice().len(), 2);
    }

    #[test]
    fn named_collection_reports_the_first_duplicate_pair() {
        let make = |name| NamedParameter::from_tensor(name, finite_tensor(&[1], &[1.0])).unwrap();
        assert_eq!(
            NamedParameters::try_new(vec![
                make("a.weight"),
                make("b.weight"),
                make("a.weight"),
                make("b.weight"),
            ])
            .unwrap_err(),
            InitializationError::DuplicateName {
                name: "a.weight".to_owned(),
                first: 0,
                repeated: 2,
            }
        );
    }
}
