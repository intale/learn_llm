//! Three independent, bias-free projections for one self-attention input.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::TensorValue;
use crate::nn::init::{InitializationError, NamedParameter, NamedParameters, SplitMix64};
use crate::nn::linear::{Linear, LinearError};

// region:qkv-errors
/// The projection branch that rejected construction or a delegated operation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum QkvProjection {
    Query,
    Key,
    Value,
}

impl fmt::Display for QkvProjection {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Query => "query",
            Self::Key => "key",
            Self::Value => "value",
        })
    }
}

/// A rejected Q/K/V parameter set or hidden-state input.
#[derive(Clone, Debug, PartialEq)]
pub enum QkvError {
    Projection {
        projection: QkvProjection,
        source: LinearError,
    },
    InputRank {
        rank: usize,
    },
    InputWidthMismatch {
        expected: usize,
        actual: usize,
    },
    BranchInputWidthMismatch {
        query: usize,
        key: usize,
        value: usize,
    },
    BranchOutputWidthMismatch {
        query: usize,
        key: usize,
        value: usize,
    },
    Initialization(InitializationError),
}

impl fmt::Display for QkvError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Projection { projection, source } => {
                write!(formatter, "{projection} projection: {source}")
            }
            Self::InputRank { rank } => write!(
                formatter,
                "Q/K/V input must have rank three [batch, tokens, model_width], got rank {rank}"
            ),
            Self::InputWidthMismatch { expected, actual } => write!(
                formatter,
                "Q/K/V input final width must equal model width {expected}, got {actual}"
            ),
            Self::BranchInputWidthMismatch { query, key, value } => write!(
                formatter,
                "Q/K/V model widths must match, got query {query}, key {key}, value {value}"
            ),
            Self::BranchOutputWidthMismatch { query, key, value } => write!(
                formatter,
                "Q/K/V head widths must match, got query {query}, key {key}, value {value}"
            ),
            Self::Initialization(source) => source.fmt(formatter),
        }
    }
}

impl Error for QkvError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Projection { source, .. } => Some(source),
            Self::Initialization(source) => Some(source),
            _ => None,
        }
    }
}

impl From<InitializationError> for QkvError {
    fn from(error: InitializationError) -> Self {
        Self::Initialization(error)
    }
}

fn projection_error(projection: QkvProjection) -> impl FnOnce(LinearError) -> QkvError {
    move |source| QkvError::Projection { projection, source }
}
// endregion:qkv-errors

// region:qkv-layer
/// The three projected views of the same batch and token positions.
#[derive(Clone, Debug)]
pub struct QkvForward {
    query: TensorValue,
    key: TensorValue,
    value: TensorValue,
}

impl QkvForward {
    pub fn query(&self) -> &TensorValue {
        &self.query
    }

    pub fn key(&self) -> &TensorValue {
        &self.key
    }

    pub fn value(&self) -> &TensorValue {
        &self.value
    }

    pub fn into_parts(self) -> (TensorValue, TensorValue, TensorValue) {
        (self.query, self.key, self.value)
    }
}

/// Three independent `[model_width, head_width]` linear maps with no biases.
#[derive(Clone, Debug)]
pub struct QkvProjections {
    query: Linear,
    key: Linear,
    value: Linear,
    parameters: NamedParameters,
    model_width: usize,
    head_width: usize,
}

impl QkvProjections {
    /// Initializes Q, K, and V in that order without partially advancing `rng`.
    pub fn new(
        parameter_prefix: impl Into<String>,
        model_width: usize,
        head_width: usize,
        rng: &mut SplitMix64,
    ) -> Result<Self, QkvError> {
        let parameter_prefix = parameter_prefix.into();
        let mut trial = rng.clone();
        let query = Linear::new(
            format!("{parameter_prefix}.query"),
            model_width,
            head_width,
            false,
            &mut trial,
        )
        .map_err(projection_error(QkvProjection::Query))?;
        let key = Linear::new(
            format!("{parameter_prefix}.key"),
            model_width,
            head_width,
            false,
            &mut trial,
        )
        .map_err(projection_error(QkvProjection::Key))?;
        let value = Linear::new(
            format!("{parameter_prefix}.value"),
            model_width,
            head_width,
            false,
            &mut trial,
        )
        .map_err(projection_error(QkvProjection::Value))?;
        let projections = Self::from_layers(query, key, value)?;
        *rng = trial;
        Ok(projections)
    }

    /// Gives Q/K/V semantics to three existing matrix parameters.
    pub fn from_weights(
        query_weight: NamedParameter,
        key_weight: NamedParameter,
        value_weight: NamedParameter,
    ) -> Result<Self, QkvError> {
        let query = Linear::from_parameters(query_weight, None)
            .map_err(projection_error(QkvProjection::Query))?;
        let key = Linear::from_parameters(key_weight, None)
            .map_err(projection_error(QkvProjection::Key))?;
        let value = Linear::from_parameters(value_weight, None)
            .map_err(projection_error(QkvProjection::Value))?;
        Self::from_layers(query, key, value)
    }

    fn from_layers(query: Linear, key: Linear, value: Linear) -> Result<Self, QkvError> {
        let input_widths = (query.input_width(), key.input_width(), value.input_width());
        if input_widths.0 != input_widths.1 || input_widths.0 != input_widths.2 {
            return Err(QkvError::BranchInputWidthMismatch {
                query: input_widths.0,
                key: input_widths.1,
                value: input_widths.2,
            });
        }

        let output_widths = (
            query.output_width(),
            key.output_width(),
            value.output_width(),
        );
        if output_widths.0 != output_widths.1 || output_widths.0 != output_widths.2 {
            return Err(QkvError::BranchOutputWidthMismatch {
                query: output_widths.0,
                key: output_widths.1,
                value: output_widths.2,
            });
        }

        let parameters = NamedParameters::try_new(vec![
            query.weight().clone(),
            key.weight().clone(),
            value.weight().clone(),
        ])?;
        Ok(Self {
            query,
            key,
            value,
            parameters,
            model_width: input_widths.0,
            head_width: output_widths.0,
        })
    }

    /// Projects exactly `[batch, tokens, model_width]` into three head-width views.
    pub fn forward(&self, input: &TensorValue) -> Result<QkvForward, QkvError> {
        let shape = input.shape();
        if shape.len() != 3 {
            return Err(QkvError::InputRank { rank: shape.len() });
        }
        if shape[2] != self.model_width {
            return Err(QkvError::InputWidthMismatch {
                expected: self.model_width,
                actual: shape[2],
            });
        }

        let query = self
            .query
            .forward(input)
            .map_err(projection_error(QkvProjection::Query))?;
        let key = self
            .key
            .forward(input)
            .map_err(projection_error(QkvProjection::Key))?;
        let value = self
            .value
            .forward(input)
            .map_err(projection_error(QkvProjection::Value))?;
        Ok(QkvForward { query, key, value })
    }

    pub fn query(&self) -> &Linear {
        &self.query
    }

    pub fn key(&self) -> &Linear {
        &self.key
    }

    pub fn value(&self) -> &Linear {
        &self.value
    }

    pub fn parameters(&self) -> &[NamedParameter] {
        self.parameters.as_slice()
    }

    pub const fn model_width(&self) -> usize {
        self.model_width
    }

    pub const fn head_width(&self) -> usize {
        self.head_width
    }

    pub const fn parameter_count(&self) -> usize {
        3 * self.model_width * self.head_width
    }
}
// endregion:qkv-layer

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::gradcheck::sampled_tensor_gradient_check;
    use crate::autograd::tensor_core::GraphRetention;
    use crate::tensor::storage::Tensor;

    const INPUT_VALUES: [f64; 6] = [1.0, 2.0, -1.0, 0.0, 1.0, 2.0];
    const QUERY_VALUES: [f64; 6] = [1.0, 0.0, 0.0, 1.0, 1.0, -1.0];
    const KEY_VALUES: [f64; 6] = [0.0, 1.0, 1.0, 0.0, -1.0, 1.0];
    const VALUE_VALUES: [f64; 6] = [1.0, 1.0, 1.0, -1.0, 0.0, 2.0];
    const QUERY_UPSTREAM: [f64; 4] = [1.0, 0.0, -1.0, 2.0];
    const KEY_UPSTREAM: [f64; 4] = [0.5, -1.0, 1.0, 0.0];
    const VALUE_UPSTREAM: [f64; 4] = [2.0, 1.0, 0.0, -0.5];
    const STEP: f64 = 1e-6;
    const TOLERANCE: f64 = 2e-6;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn parameter(name: &str, shape: &[usize], values: &[f64]) -> NamedParameter {
        NamedParameter::from_tensor(name, tensor(shape, values)).unwrap()
    }

    fn layer_with_values(query: &[f64], key: &[f64], value: &[f64]) -> QkvProjections {
        QkvProjections::from_weights(
            parameter("attention.query.weight", &[3, 2], query),
            parameter("attention.key.weight", &[3, 2], key),
            parameter("attention.value.weight", &[3, 2], value),
        )
        .unwrap()
    }

    fn known_layer() -> QkvProjections {
        layer_with_values(&QUERY_VALUES, &KEY_VALUES, &VALUE_VALUES)
    }

    fn sum_to_scalar(mut value: TensorValue) -> TensorValue {
        while !value.shape().is_empty() {
            value = value.sum_axis(0, false).unwrap();
        }
        value
    }

    fn combined_loss(layer: &QkvProjections, input: &Tensor) -> f64 {
        let input = TensorValue::constant(input.clone()).unwrap();
        let pass = layer.forward(&input).unwrap();
        let query = TensorValue::constant(tensor(&[1, 2, 2], &QUERY_UPSTREAM)).unwrap();
        let key = TensorValue::constant(tensor(&[1, 2, 2], &KEY_UPSTREAM)).unwrap();
        let value = TensorValue::constant(tensor(&[1, 2, 2], &VALUE_UPSTREAM)).unwrap();
        let query_loss = sum_to_scalar(pass.query().mul(&query).unwrap());
        let key_loss = sum_to_scalar(pass.key().mul(&key).unwrap());
        let value_loss = sum_to_scalar(pass.value().mul(&value).unwrap());
        query_loss
            .add(&key_loss)
            .unwrap()
            .add(&value_loss)
            .unwrap()
            .value()
            .as_slice()[0]
    }

    #[test]
    fn frozen_forward_and_combined_reverse_are_exact() {
        let layer = known_layer();
        let input = TensorValue::parameter(tensor(&[1, 2, 3], &INPUT_VALUES)).unwrap();
        let pass = layer.forward(&input).unwrap();
        assert_eq!(pass.query().shape(), [1, 2, 2]);
        assert_eq!(pass.key().shape(), [1, 2, 2]);
        assert_eq!(pass.value().shape(), [1, 2, 2]);
        assert_eq!(pass.query().value().as_slice(), &[0.0, 3.0, 2.0, -1.0]);
        assert_eq!(pass.key().value().as_slice(), &[3.0, 0.0, -1.0, 2.0]);
        assert_eq!(pass.value().value().as_slice(), &[3.0, -3.0, 1.0, 3.0]);

        let query_upstream = TensorValue::constant(tensor(&[1, 2, 2], &QUERY_UPSTREAM)).unwrap();
        let key_upstream = TensorValue::constant(tensor(&[1, 2, 2], &KEY_UPSTREAM)).unwrap();
        let value_upstream = TensorValue::constant(tensor(&[1, 2, 2], &VALUE_UPSTREAM)).unwrap();
        let loss = sum_to_scalar(pass.query().mul(&query_upstream).unwrap())
            .add(&sum_to_scalar(pass.key().mul(&key_upstream).unwrap()))
            .unwrap()
            .add(&sum_to_scalar(pass.value().mul(&value_upstream).unwrap()))
            .unwrap();
        assert_eq!(loss.value().as_slice(), &[-2.0]);
        loss.backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)
            .unwrap();

        assert_eq!(
            input.gradient().unwrap().as_slice(),
            &[3.0, 1.5, 1.5, -1.5, 3.5, -5.0]
        );
        assert_eq!(
            layer
                .query()
                .weight()
                .tensor()
                .gradient()
                .unwrap()
                .as_slice(),
            &[1.0, 0.0, 1.0, 2.0, -3.0, 4.0]
        );
        assert_eq!(
            layer.key().weight().tensor().gradient().unwrap().as_slice(),
            &[0.5, -1.0, 2.0, -2.0, 1.5, 1.0]
        );
        assert_eq!(
            layer
                .value()
                .weight()
                .tensor()
                .gradient()
                .unwrap()
                .as_slice(),
            &[2.0, 1.0, 4.0, 1.5, -2.0, -2.0]
        );
    }

    #[test]
    fn batch_token_and_empty_axes_are_preserved_by_all_branches() {
        let layer = known_layer();
        for (shape, values, expected) in [
            (&[1, 2, 3][..], &INPUT_VALUES[..], &[1, 2, 2][..]),
            (
                &[2, 2, 3],
                &[1.0, 2.0, -1.0, 0.0, 1.0, 2.0, 1.0, 2.0, -1.0, 0.0, 1.0, 2.0],
                &[2, 2, 2],
            ),
            (&[1, 0, 3], &[], &[1, 0, 2]),
            (&[0, 2, 3], &[], &[0, 2, 2]),
            (&[0, 0, 3], &[], &[0, 0, 2]),
        ] {
            let input = TensorValue::parameter(tensor(shape, values)).unwrap();
            let pass = layer.forward(&input).unwrap();
            assert_eq!(pass.query().shape(), expected);
            assert_eq!(pass.key().shape(), expected);
            assert_eq!(pass.value().shape(), expected);
        }
    }

    #[test]
    fn empty_batch_and_token_axes_keep_the_gradient_tape_connected() {
        for shape in [&[0, 2, 3][..], &[2, 0, 3]] {
            let layer = known_layer();
            let input = TensorValue::parameter(tensor(shape, &[])).unwrap();
            let pass = layer.forward(&input).unwrap();
            let loss = sum_to_scalar(pass.query().clone())
                .add(&sum_to_scalar(pass.key().clone()))
                .unwrap()
                .add(&sum_to_scalar(pass.value().clone()))
                .unwrap();
            loss.backward().unwrap();

            let input_gradient = input.gradient().unwrap();
            assert_eq!(input_gradient.shape(), shape);
            assert!(input_gradient.is_empty());
            for parameter in layer.parameters() {
                let gradient = parameter.tensor().gradient().unwrap();
                assert_eq!(gradient.shape(), &[3, 2]);
                assert_eq!(gradient.as_slice(), &[0.0; 6]);
            }
        }
    }

    #[test]
    fn parameter_order_count_bias_policy_and_branch_identity_are_stable() {
        let layer = known_layer();
        assert_eq!(layer.model_width(), 3);
        assert_eq!(layer.head_width(), 2);
        assert_eq!(layer.parameter_count(), 18);
        assert_eq!(
            layer
                .parameters()
                .iter()
                .map(NamedParameter::name)
                .collect::<Vec<_>>(),
            [
                "attention.query.weight",
                "attention.key.weight",
                "attention.value.weight"
            ]
        );
        assert!(!layer.query().has_bias());
        assert!(!layer.key().has_bias());
        assert!(!layer.value().has_bias());
        for (listed, projected) in layer.parameters().iter().zip([
            layer.query().weight(),
            layer.key().weight(),
            layer.value().weight(),
        ]) {
            assert!(listed.tensor().is_same_node(projected.tensor()));
        }
        assert!(
            !layer
                .query()
                .weight()
                .tensor()
                .is_same_node(layer.key().weight().tensor())
        );
        assert!(
            !layer
                .query()
                .weight()
                .tensor()
                .is_same_node(layer.value().weight().tensor())
        );
        assert!(
            !layer
                .key()
                .weight()
                .tensor()
                .is_same_node(layer.value().weight().tensor())
        );
    }

    #[test]
    fn changing_one_weight_changes_only_its_projected_view() {
        let baseline = known_layer();
        let changed =
            layer_with_values(&[2.0, 0.0, 0.0, 1.0, 1.0, -1.0], &KEY_VALUES, &VALUE_VALUES);
        let input = TensorValue::constant(tensor(&[1, 2, 3], &INPUT_VALUES)).unwrap();
        let baseline = baseline.forward(&input).unwrap();
        let changed = changed.forward(&input).unwrap();
        assert_ne!(baseline.query().value(), changed.query().value());
        assert_eq!(baseline.key().value(), changed.key().value());
        assert_eq!(baseline.value().value(), changed.value().value());
    }

    #[test]
    fn initialization_is_transactional_reproducible_and_qkv_ordered() {
        let mut first_rng = SplitMix64::from_seed(26);
        let mut second_rng = SplitMix64::from_seed(26);
        let first = QkvProjections::new("decoder.block.0.attention", 3, 2, &mut first_rng).unwrap();
        let second =
            QkvProjections::new("decoder.block.0.attention", 3, 2, &mut second_rng).unwrap();
        assert_eq!(first_rng.state(), second_rng.state());
        assert_eq!(
            first
                .parameters()
                .iter()
                .map(NamedParameter::name)
                .collect::<Vec<_>>(),
            [
                "decoder.block.0.attention.query.weight",
                "decoder.block.0.attention.key.weight",
                "decoder.block.0.attention.value.weight"
            ]
        );
        for (left, right) in first.parameters().iter().zip(second.parameters()) {
            assert_eq!(left.tensor().value(), right.tensor().value());
            assert!(!left.tensor().is_same_node(right.tensor()));
        }
        assert_ne!(
            first.query().weight().tensor().value(),
            first.key().weight().tensor().value()
        );
        assert_ne!(
            first.query().weight().tensor().value(),
            first.value().weight().tensor().value()
        );

        let mut reference_rng = SplitMix64::from_seed(26);
        let reference_query = Linear::new(
            "decoder.block.0.attention.query",
            3,
            2,
            false,
            &mut reference_rng,
        )
        .unwrap();
        let reference_key = Linear::new(
            "decoder.block.0.attention.key",
            3,
            2,
            false,
            &mut reference_rng,
        )
        .unwrap();
        let reference_value = Linear::new(
            "decoder.block.0.attention.value",
            3,
            2,
            false,
            &mut reference_rng,
        )
        .unwrap();
        for (actual, expected) in first.parameters().iter().zip([
            reference_query.weight(),
            reference_key.weight(),
            reference_value.weight(),
        ]) {
            assert_eq!(actual.tensor().value(), expected.tensor().value());
        }
        assert_eq!(first_rng.state(), reference_rng.state());

        let mut rejected_rng = SplitMix64::from_seed(26);
        let initial_state = rejected_rng.state();
        assert_eq!(
            QkvProjections::new("decoder.block.0.attention", 3, 0, &mut rejected_rng).unwrap_err(),
            QkvError::Projection {
                projection: QkvProjection::Query,
                source: LinearError::ZeroOutputWidth,
            }
        );
        assert_eq!(rejected_rng.state(), initial_state);

        assert_eq!(
            QkvProjections::new("Bad", 0, 0, &mut rejected_rng).unwrap_err(),
            QkvError::Projection {
                projection: QkvProjection::Query,
                source: LinearError::Initialization(InitializationError::InvalidNameCharacter {
                    index: 0,
                    byte: b'B',
                }),
            }
        );
        assert_eq!(rejected_rng.state(), initial_state);
    }

    #[test]
    fn parameter_and_input_validation_follow_declared_precedence() {
        let query = || parameter("attention.query.weight", &[3, 2], &[0.0; 6]);
        let key = || parameter("attention.key.weight", &[3, 2], &[0.0; 6]);
        let value = || parameter("attention.value.weight", &[3, 2], &[0.0; 6]);

        assert_eq!(
            QkvProjections::from_weights(
                parameter("bad", &[3], &[0.0; 3]),
                parameter("also_bad", &[3], &[0.0; 3]),
                value(),
            )
            .unwrap_err(),
            QkvError::Projection {
                projection: QkvProjection::Query,
                source: LinearError::WeightRank { rank: 1 },
            }
        );
        assert_eq!(
            QkvProjections::from_weights(
                query(),
                parameter("bad", &[3], &[0.0; 3]),
                parameter("also_bad", &[3], &[0.0; 3]),
            )
            .unwrap_err(),
            QkvError::Projection {
                projection: QkvProjection::Key,
                source: LinearError::WeightRank { rank: 1 },
            }
        );
        assert_eq!(
            QkvProjections::from_weights(
                parameter("same", &[3, 2], &[0.0; 6]),
                parameter("same", &[4, 2], &[0.0; 8]),
                parameter("same", &[3, 3], &[0.0; 9]),
            )
            .unwrap_err(),
            QkvError::BranchInputWidthMismatch {
                query: 3,
                key: 4,
                value: 3,
            }
        );
        assert_eq!(
            QkvProjections::from_weights(
                parameter("same", &[3, 2], &[0.0; 6]),
                parameter("same", &[3, 3], &[0.0; 9]),
                parameter("same", &[3, 2], &[0.0; 6]),
            )
            .unwrap_err(),
            QkvError::BranchOutputWidthMismatch {
                query: 2,
                key: 3,
                value: 2,
            }
        );
        assert_eq!(
            QkvProjections::from_weights(
                parameter("same", &[3, 2], &[0.0; 6]),
                parameter("same", &[3, 2], &[0.0; 6]),
                value(),
            )
            .unwrap_err(),
            QkvError::Initialization(InitializationError::DuplicateName {
                name: "same".to_owned(),
                first: 0,
                repeated: 1,
            })
        );

        let layer = known_layer();
        for (shape, values, rank) in [
            (&[][..], &[0.0][..], 0),
            (&[3][..], &[0.0; 3][..], 1),
            (&[2, 3][..], &[0.0; 6][..], 2),
            (&[1, 1, 1, 3][..], &[0.0; 3][..], 4),
        ] {
            let input = TensorValue::constant(tensor(shape, values)).unwrap();
            assert_eq!(
                layer.forward(&input).unwrap_err(),
                QkvError::InputRank { rank }
            );
        }
        let wrong_width = TensorValue::constant(tensor(&[1, 2, 4], &[0.0; 8])).unwrap();
        assert_eq!(
            layer.forward(&wrong_width).unwrap_err(),
            QkvError::InputWidthMismatch {
                expected: 3,
                actual: 4,
            }
        );

        let valid = QkvProjections::from_weights(query(), key(), value()).unwrap();
        assert_eq!(valid.parameter_count(), 18);
    }

    #[test]
    fn input_and_all_three_weights_match_sampled_finite_differences() {
        let layer = known_layer();
        let input = TensorValue::parameter(tensor(&[1, 2, 3], &INPUT_VALUES)).unwrap();
        let pass = layer.forward(&input).unwrap();
        let query_upstream = TensorValue::constant(tensor(&[1, 2, 2], &QUERY_UPSTREAM)).unwrap();
        let key_upstream = TensorValue::constant(tensor(&[1, 2, 2], &KEY_UPSTREAM)).unwrap();
        let value_upstream = TensorValue::constant(tensor(&[1, 2, 2], &VALUE_UPSTREAM)).unwrap();
        let loss = sum_to_scalar(pass.query().mul(&query_upstream).unwrap())
            .add(&sum_to_scalar(pass.key().mul(&key_upstream).unwrap()))
            .unwrap()
            .add(&sum_to_scalar(pass.value().mul(&value_upstream).unwrap()))
            .unwrap();
        loss.backward_with_seed(&tensor(&[], &[1.0]).view(), GraphRetention::Retain)
            .unwrap();

        let input_report = sampled_tensor_gradient_check(
            &mut tensor(&[1, 2, 3], &INPUT_VALUES),
            &input.gradient().unwrap().view(),
            STEP,
            TOLERANCE,
            INPUT_VALUES.len(),
            |probe| combined_loss(&known_layer(), probe),
        )
        .unwrap();
        assert!(input_report.passed);

        for index in 0..3 {
            let values = [&QUERY_VALUES[..], &KEY_VALUES[..], &VALUE_VALUES[..]];
            let analytic = layer.parameters()[index].tensor().gradient().unwrap();
            let report = sampled_tensor_gradient_check(
                &mut tensor(&[3, 2], values[index]),
                &analytic.view(),
                STEP,
                TOLERANCE,
                values[index].len(),
                |probe| {
                    let candidate = layer_with_values(
                        if index == 0 {
                            probe.as_slice()
                        } else {
                            &QUERY_VALUES
                        },
                        if index == 1 {
                            probe.as_slice()
                        } else {
                            &KEY_VALUES
                        },
                        if index == 2 {
                            probe.as_slice()
                        } else {
                            &VALUE_VALUES
                        },
                    );
                    combined_loss(&candidate, &tensor(&[1, 2, 3], &INPUT_VALUES))
                },
            )
            .unwrap();
            assert!(report.passed);
        }
    }
}
