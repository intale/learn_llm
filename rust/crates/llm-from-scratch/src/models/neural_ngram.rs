//! A fixed-context neural language model assembled from the cumulative layers.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use crate::nn::embedding::{Embedding, EmbeddingError};
use crate::nn::init::{InitializationError, NamedParameter, SplitMix64};
use crate::nn::linear::{Linear, LinearError};
use crate::nn::swiglu::{SwiGlu, SwiGluError};
use crate::training::batch::MiniBatch;

/// Stable declaration order for the model's complete trainable parameter set.
pub const NEURAL_NGRAM_PARAMETER_NAMES: [&str; 5] = [
    "ngram.embedding.weight",
    "ngram.ffn.gate.weight",
    "ngram.ffn.up.weight",
    "ngram.ffn.down.weight",
    "ngram.output.weight",
];

// region:neural-ngram-config-and-errors
/// The four widths that determine every fixed-context model shape.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct NeuralNgramConfig {
    vocabulary_size: usize,
    context_length: usize,
    embedding_width: usize,
    hidden_width: usize,
    context_feature_width: usize,
    parameter_count: usize,
}

impl NeuralNgramConfig {
    pub fn new(
        vocabulary_size: usize,
        context_length: usize,
        embedding_width: usize,
        hidden_width: usize,
    ) -> Result<Self, NeuralNgramError> {
        if vocabulary_size == 0 {
            return Err(NeuralNgramError::EmptyVocabulary);
        }
        if context_length == 0 {
            return Err(NeuralNgramError::ZeroContextLength);
        }
        if embedding_width == 0 {
            return Err(NeuralNgramError::ZeroEmbeddingWidth);
        }
        if hidden_width == 0 {
            return Err(NeuralNgramError::ZeroHiddenWidth);
        }
        let context_feature_width = context_length.checked_mul(embedding_width).ok_or(
            NeuralNgramError::ContextFeatureWidthOverflow {
                context_length,
                embedding_width,
            },
        )?;
        let embedding_parameters = vocabulary_size.checked_mul(embedding_width);
        let branch_parameters = context_feature_width.checked_mul(hidden_width);
        let down_parameters = hidden_width.checked_mul(hidden_width);
        let output_parameters = hidden_width.checked_mul(vocabulary_size);
        let parameter_count = embedding_parameters
            .and_then(|count| branch_parameters.and_then(|branch| count.checked_add(branch)))
            .and_then(|count| branch_parameters.and_then(|branch| count.checked_add(branch)))
            .and_then(|count| down_parameters.and_then(|down| count.checked_add(down)))
            .and_then(|count| output_parameters.and_then(|output| count.checked_add(output)))
            .ok_or(NeuralNgramError::ParameterCountOverflow)?;
        Ok(Self {
            vocabulary_size,
            context_length,
            embedding_width,
            hidden_width,
            context_feature_width,
            parameter_count,
        })
    }

    pub const fn vocabulary_size(self) -> usize {
        self.vocabulary_size
    }

    pub const fn context_length(self) -> usize {
        self.context_length
    }

    pub const fn embedding_width(self) -> usize {
        self.embedding_width
    }

    pub const fn hidden_width(self) -> usize {
        self.hidden_width
    }

    pub const fn context_feature_width(self) -> usize {
        self.context_feature_width
    }

    pub const fn parameter_count(self) -> usize {
        self.parameter_count
    }
}

/// A rejected model shape, parameter set, batch, selector, or delegated operation.
#[derive(Clone, Debug, PartialEq)]
pub enum NeuralNgramError {
    EmptyVocabulary,
    ZeroContextLength,
    ZeroEmbeddingWidth,
    ZeroHiddenWidth,
    ContextFeatureWidthOverflow {
        context_length: usize,
        embedding_width: usize,
    },
    ParameterCountOverflow,
    EmptyBatch,
    ContextTokenCountOverflow {
        batch_size: usize,
        context_length: usize,
    },
    ContextTokenCountMismatch {
        expected: usize,
        actual: usize,
    },
    BatchContextLengthMismatch {
        expected: usize,
        actual: usize,
    },
    ParameterCountMismatch {
        expected: usize,
        actual: usize,
    },
    ParameterNameMismatch {
        index: usize,
        expected: &'static str,
        actual: String,
    },
    ParameterShapeMismatch {
        name: String,
        expected: Vec<usize>,
        actual: Vec<usize>,
    },
    MissingTargetRow {
        row: usize,
    },
    TargetIdOutOfBounds {
        row: usize,
        id: u32,
        vocabulary_size: usize,
    },
    TargetIdDoesNotFitUsize {
        row: usize,
        id: u32,
    },
    MaskedTokenOutOfBounds {
        id: u32,
        vocabulary_size: usize,
    },
    NoUnmaskedToken,
    NonFiniteLogit {
        token_id: usize,
        value: f64,
    },
    Initialization(InitializationError),
    Embedding(EmbeddingError),
    SwiGlu(SwiGluError),
    Linear(LinearError),
    Autodiff(TensorAutodiffError),
}

impl fmt::Display for NeuralNgramError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyVocabulary => {
                formatter.write_str("neural n-gram vocabulary must not be empty")
            }
            Self::ZeroContextLength => {
                formatter.write_str("neural n-gram context length must be greater than zero")
            }
            Self::ZeroEmbeddingWidth => {
                formatter.write_str("neural n-gram embedding width must be greater than zero")
            }
            Self::ZeroHiddenWidth => {
                formatter.write_str("neural n-gram hidden width must be greater than zero")
            }
            Self::ContextFeatureWidthOverflow {
                context_length,
                embedding_width,
            } => write!(
                formatter,
                "context length {context_length} times embedding width {embedding_width} overflows usize"
            ),
            Self::ParameterCountOverflow => {
                formatter.write_str("neural n-gram parameter count overflows usize")
            }
            Self::EmptyBatch => formatter.write_str("neural n-gram batch must contain a row"),
            Self::ContextTokenCountOverflow {
                batch_size,
                context_length,
            } => write!(
                formatter,
                "batch size {batch_size} times context length {context_length} overflows usize"
            ),
            Self::ContextTokenCountMismatch { expected, actual } => write!(
                formatter,
                "neural n-gram forward needs {expected} context IDs, but received {actual}"
            ),
            Self::BatchContextLengthMismatch { expected, actual } => write!(
                formatter,
                "mini-batch context length must equal model context length {expected}, got {actual}"
            ),
            Self::ParameterCountMismatch { expected, actual } => write!(
                formatter,
                "neural n-gram needs {expected} named parameters, but received {actual}"
            ),
            Self::ParameterNameMismatch {
                index,
                expected,
                actual,
            } => write!(
                formatter,
                "parameter {index} must be named {expected}, got {actual}"
            ),
            Self::ParameterShapeMismatch {
                name,
                expected,
                actual,
            } => write!(
                formatter,
                "parameter {name} must have shape {expected:?}, got {actual:?}"
            ),
            Self::MissingTargetRow { row } => {
                write!(formatter, "mini-batch target row {row} is missing")
            }
            Self::TargetIdOutOfBounds {
                row,
                id,
                vocabulary_size,
            } => write!(
                formatter,
                "target ID {id} in row {row} is out of bounds for vocabulary size {vocabulary_size}"
            ),
            Self::TargetIdDoesNotFitUsize { row, id } => write!(
                formatter,
                "target ID {id} in row {row} does not fit this platform's selector type"
            ),
            Self::MaskedTokenOutOfBounds {
                id,
                vocabulary_size,
            } => write!(
                formatter,
                "masked token ID {id} is out of bounds for vocabulary size {vocabulary_size}"
            ),
            Self::NoUnmaskedToken => {
                formatter.write_str("greedy selection needs at least one unmasked token")
            }
            Self::NonFiniteLogit { token_id, value } => {
                write!(
                    formatter,
                    "logit for token {token_id} is not finite: {value}"
                )
            }
            Self::Initialization(error) => error.fmt(formatter),
            Self::Embedding(error) => error.fmt(formatter),
            Self::SwiGlu(error) => error.fmt(formatter),
            Self::Linear(error) => error.fmt(formatter),
            Self::Autodiff(error) => error.fmt(formatter),
        }
    }
}

impl Error for NeuralNgramError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Initialization(error) => Some(error),
            Self::Embedding(error) => Some(error),
            Self::SwiGlu(error) => Some(error),
            Self::Linear(error) => Some(error),
            Self::Autodiff(error) => Some(error),
            _ => None,
        }
    }
}
// endregion:neural-ngram-config-and-errors

/// The four learner-visible tensors produced by one complete context batch.
#[derive(Clone, Debug)]
pub struct NeuralNgramForward {
    embeddings: TensorValue,
    concatenated: TensorValue,
    hidden: TensorValue,
    logits: TensorValue,
}

impl NeuralNgramForward {
    pub const fn embeddings(&self) -> &TensorValue {
        &self.embeddings
    }

    pub const fn concatenated(&self) -> &TensorValue {
        &self.concatenated
    }

    pub const fn hidden(&self) -> &TensorValue {
        &self.hidden
    }

    pub const fn logits(&self) -> &TensorValue {
        &self.logits
    }

    pub fn into_logits(self) -> TensorValue {
        self.logits
    }
}

// region:neural-ngram-parameter-owner
/// One fixed-context language model whose layers share one live parameter registry.
#[derive(Debug)]
pub struct NeuralNgram {
    config: NeuralNgramConfig,
    embedding: Embedding,
    feed_forward: SwiGlu,
    output: Linear,
    parameters: Vec<NamedParameter>,
}

impl NeuralNgram {
    /// Initializes all five matrices transactionally from one deterministic stream.
    pub fn new(config: NeuralNgramConfig, rng: &mut SplitMix64) -> Result<Self, NeuralNgramError> {
        let mut trial = rng.clone();
        let embedding = Embedding::new(
            NEURAL_NGRAM_PARAMETER_NAMES[0],
            config.vocabulary_size,
            config.embedding_width,
            &mut trial,
        )
        .map_err(NeuralNgramError::Embedding)?;
        let feed_forward = SwiGlu::new(
            "ngram.ffn",
            config.context_feature_width,
            config.hidden_width,
            config.hidden_width,
            &mut trial,
        )
        .map_err(NeuralNgramError::SwiGlu)?;
        let output = Linear::new(
            "ngram.output",
            config.hidden_width,
            config.vocabulary_size,
            false,
            &mut trial,
        )
        .map_err(NeuralNgramError::Linear)?;
        let model = Self::from_parts(config, embedding, feed_forward, output)?;
        *rng = trial;
        Ok(model)
    }

    /// Validates one ordered parameter set and builds persistent aliased layer handles.
    pub fn from_parameters(
        config: NeuralNgramConfig,
        parameters: Vec<NamedParameter>,
    ) -> Result<Self, NeuralNgramError> {
        validate_parameter_set(config, &parameters)?;
        let embedding = Embedding::from_parameter(parameters[0].clone())
            .map_err(NeuralNgramError::Embedding)?;
        let feed_forward = SwiGlu::from_parameters(
            parameters[1].clone(),
            parameters[2].clone(),
            parameters[3].clone(),
        )
        .map_err(NeuralNgramError::SwiGlu)?;
        let output = Linear::from_parameters(parameters[4].clone(), None)
            .map_err(NeuralNgramError::Linear)?;
        Ok(Self {
            config,
            embedding,
            feed_forward,
            output,
            parameters,
        })
    }

    pub const fn config(&self) -> NeuralNgramConfig {
        self.config
    }

    pub fn parameters(&self) -> &[NamedParameter] {
        &self.parameters
    }

    fn from_parts(
        config: NeuralNgramConfig,
        embedding: Embedding,
        feed_forward: SwiGlu,
        output: Linear,
    ) -> Result<Self, NeuralNgramError> {
        let parameters = embedding
            .parameters()
            .iter()
            .chain(feed_forward.parameters())
            .chain(output.parameters())
            .cloned()
            .collect::<Vec<_>>();
        validate_parameter_set(config, &parameters)?;
        Ok(Self {
            config,
            embedding,
            feed_forward,
            output,
            parameters,
        })
    }
}

fn validate_parameter_set(
    config: NeuralNgramConfig,
    parameters: &[NamedParameter],
) -> Result<(), NeuralNgramError> {
    if parameters.len() != NEURAL_NGRAM_PARAMETER_NAMES.len() {
        return Err(NeuralNgramError::ParameterCountMismatch {
            expected: NEURAL_NGRAM_PARAMETER_NAMES.len(),
            actual: parameters.len(),
        });
    }
    let expected_shapes = [
        vec![config.vocabulary_size, config.embedding_width],
        vec![config.context_feature_width, config.hidden_width],
        vec![config.context_feature_width, config.hidden_width],
        vec![config.hidden_width, config.hidden_width],
        vec![config.hidden_width, config.vocabulary_size],
    ];
    for (index, ((parameter, expected_name), expected_shape)) in parameters
        .iter()
        .zip(NEURAL_NGRAM_PARAMETER_NAMES)
        .zip(expected_shapes)
        .enumerate()
    {
        if parameter.name() != expected_name {
            return Err(NeuralNgramError::ParameterNameMismatch {
                index,
                expected: expected_name,
                actual: parameter.name().to_owned(),
            });
        }
        let actual = parameter.tensor().shape();
        if actual != expected_shape {
            return Err(NeuralNgramError::ParameterShapeMismatch {
                name: expected_name.to_owned(),
                expected: expected_shape,
                actual,
            });
        }
    }
    Ok(())
}
// endregion:neural-ngram-parameter-owner

// region:neural-ngram-forward
impl NeuralNgram {
    /// Looks up and concatenates each complete context before prediction.
    pub fn forward(
        &self,
        context_ids: &[u32],
        batch_size: usize,
    ) -> Result<NeuralNgramForward, NeuralNgramError> {
        if batch_size == 0 {
            return Err(NeuralNgramError::EmptyBatch);
        }
        let expected = batch_size.checked_mul(self.config.context_length).ok_or(
            NeuralNgramError::ContextTokenCountOverflow {
                batch_size,
                context_length: self.config.context_length,
            },
        )?;
        if context_ids.len() != expected {
            return Err(NeuralNgramError::ContextTokenCountMismatch {
                expected,
                actual: context_ids.len(),
            });
        }
        let embeddings = self
            .embedding
            .forward(context_ids, &[batch_size, self.config.context_length])
            .map_err(NeuralNgramError::Embedding)?;
        let concatenated = embeddings
            .reshape(&[batch_size, self.config.context_feature_width])
            .map_err(NeuralNgramError::Autodiff)?;
        let hidden = self
            .feed_forward
            .forward(&concatenated)
            .map_err(NeuralNgramError::SwiGlu)?;
        let logits = self
            .output
            .forward(&hidden)
            .map_err(NeuralNgramError::Linear)?;
        Ok(NeuralNgramForward {
            embeddings,
            concatenated,
            hidden,
            logits,
        })
    }

    /// Scores only the token following each complete context row.
    pub fn loss(&self, batch: &MiniBatch) -> Result<TensorValue, NeuralNgramError> {
        if batch.context_length() != self.config.context_length {
            return Err(NeuralNgramError::BatchContextLengthMismatch {
                expected: self.config.context_length,
                actual: batch.context_length(),
            });
        }
        let batch_size = batch.batch_width();
        if batch_size == 0 {
            return Err(NeuralNgramError::EmptyBatch);
        }
        let mut targets = Vec::with_capacity(batch_size);
        for row in 0..batch_size {
            let target_row = batch
                .target_row(row)
                .ok_or(NeuralNgramError::MissingTargetRow { row })?;
            let id = target_row[self.config.context_length - 1];
            let target = usize::try_from(id)
                .map_err(|_| NeuralNgramError::TargetIdDoesNotFitUsize { row, id })?;
            if target >= self.config.vocabulary_size {
                return Err(NeuralNgramError::TargetIdOutOfBounds {
                    row,
                    id,
                    vocabulary_size: self.config.vocabulary_size,
                });
            }
            targets.push(target);
        }
        self.forward(batch.inputs(), batch_size)?
            .into_logits()
            .indexed_mean_nll(1, &targets)
            .map_err(NeuralNgramError::Autodiff)
    }

    /// Selects the greatest finite next-token logit, breaking exact ties by ID.
    pub fn greedy_next(
        &self,
        context_ids: &[u32],
        masked_ids: &[u32],
    ) -> Result<u32, NeuralNgramError> {
        let mut masked = vec![false; self.config.vocabulary_size];
        for &id in masked_ids {
            let index = usize::try_from(id)
                .ok()
                .filter(|index| *index < masked.len())
                .ok_or(NeuralNgramError::MaskedTokenOutOfBounds {
                    id,
                    vocabulary_size: self.config.vocabulary_size,
                })?;
            masked[index] = true;
        }
        let forward = self.forward(context_ids, 1)?;
        let logits = forward.logits().value();
        let mut best: Option<(usize, f64)> = None;
        for (token_id, &value) in logits.as_slice().iter().enumerate() {
            if !value.is_finite() {
                return Err(NeuralNgramError::NonFiniteLogit { token_id, value });
            }
            if masked[token_id] {
                continue;
            }
            if best.is_none_or(|(_, best_value)| value > best_value) {
                best = Some((token_id, value));
            }
        }
        let (token_id, _) = best.ok_or(NeuralNgramError::NoUnmaskedToken)?;
        u32::try_from(token_id).map_err(|_| NeuralNgramError::NoUnmaskedToken)
    }
}
// endregion:neural-ngram-forward

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::tensor_core::GraphRetention;
    use crate::corpus::Partition;
    use crate::data::CausalWindowConfig;
    use crate::tensor::storage::Tensor;
    use crate::training::batch::{BatchDocument, BatchOrder, MiniBatchConfig, MiniBatchEpoch};

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn parameter(name: &str, shape: &[usize], values: &[f64]) -> NamedParameter {
        NamedParameter::from_tensor(name, tensor(shape, values)).unwrap()
    }

    fn known_model() -> NeuralNgram {
        known_model_with_delta(usize::MAX, usize::MAX, 0.0)
    }

    fn known_model_with_delta(
        parameter_index: usize,
        element_index: usize,
        delta: f64,
    ) -> NeuralNgram {
        let config = NeuralNgramConfig::new(4, 2, 1, 1).unwrap();
        let mut values = [
            vec![0.1, 0.2, 0.3, 0.4],
            vec![1.0, 0.0],
            vec![0.0, 1.0],
            vec![2.0],
            vec![1.0, 2.0, -1.0, 0.0],
        ];
        if let Some(value) = values
            .get_mut(parameter_index)
            .and_then(|values| values.get_mut(element_index))
        {
            *value += delta;
        }
        let shapes = [[4, 1], [2, 1], [2, 1], [1, 1], [1, 4]];
        NeuralNgram::from_parameters(
            config,
            NEURAL_NGRAM_PARAMETER_NAMES
                .iter()
                .zip(shapes)
                .zip(values)
                .map(|((name, shape), values)| parameter(name, &shape, &values))
                .collect(),
        )
        .unwrap()
    }

    fn one_batch(tokens: &[u32], context_length: usize) -> MiniBatch {
        let documents = [BatchDocument::new("fixture", Partition::Train, tokens).unwrap()];
        let epoch = MiniBatchEpoch::build(
            Partition::Train,
            &documents,
            CausalWindowConfig::new(context_length, 1).unwrap(),
            MiniBatchConfig::new(8, BatchOrder::Sequential).unwrap(),
        )
        .unwrap();
        epoch.batches()[0].clone()
    }

    #[test]
    fn configuration_checks_zero_widths_and_overflow() {
        assert_eq!(
            NeuralNgramConfig::new(0, 1, 1, 1),
            Err(NeuralNgramError::EmptyVocabulary)
        );
        assert_eq!(
            NeuralNgramConfig::new(1, 0, 1, 1),
            Err(NeuralNgramError::ZeroContextLength)
        );
        assert_eq!(
            NeuralNgramConfig::new(1, 1, 0, 1),
            Err(NeuralNgramError::ZeroEmbeddingWidth)
        );
        assert_eq!(
            NeuralNgramConfig::new(1, 1, 1, 0),
            Err(NeuralNgramError::ZeroHiddenWidth)
        );
        assert_eq!(
            NeuralNgramConfig::new(1, usize::MAX, 2, 1),
            Err(NeuralNgramError::ContextFeatureWidthOverflow {
                context_length: usize::MAX,
                embedding_width: 2,
            })
        );
        assert_eq!(
            NeuralNgramConfig::new(usize::MAX, 1, 1, 2),
            Err(NeuralNgramError::ParameterCountOverflow)
        );
    }

    #[test]
    fn initialization_is_reproducible_transactional_and_shape_exact() {
        let config = NeuralNgramConfig::new(7, 2, 3, 5).unwrap();
        let mut left_rng = SplitMix64::from_seed(23);
        let mut right_rng = SplitMix64::from_seed(23);
        let left = NeuralNgram::new(config, &mut left_rng).unwrap();
        let right = NeuralNgram::new(config, &mut right_rng).unwrap();
        assert_eq!(config.context_feature_width(), 6);
        assert_eq!(config.parameter_count(), 141);
        assert_eq!(
            left.parameters()
                .iter()
                .map(NamedParameter::name)
                .collect::<Vec<_>>(),
            NEURAL_NGRAM_PARAMETER_NAMES
        );
        assert_eq!(
            left.parameters()
                .iter()
                .map(|parameter| parameter.tensor().shape())
                .collect::<Vec<_>>(),
            [vec![7, 3], vec![6, 5], vec![6, 5], vec![5, 5], vec![5, 7]]
        );
        for (left, right) in left.parameters().iter().zip(right.parameters()) {
            assert_eq!(&*left.tensor().value(), &*right.tensor().value());
            assert!(!left.tensor().is_same_node(right.tensor()));
        }
        assert_eq!(left_rng.state(), right_rng.state());

        let mut rejected_rng = SplitMix64::from_seed(23);
        let before = rejected_rng.state();
        let impossible = NeuralNgramConfig {
            vocabulary_size: 7,
            context_length: 2,
            embedding_width: 3,
            hidden_width: 5,
            context_feature_width: 0,
            parameter_count: 1,
        };
        assert!(NeuralNgram::new(impossible, &mut rejected_rng).is_err());
        assert_eq!(rejected_rng.state(), before);
    }

    #[test]
    fn forward_exposes_each_shape_and_exact_logits() {
        let model = known_model();
        let forward = model.forward(&[1, 2], 1).unwrap();
        assert_eq!(forward.embeddings().shape(), [1, 2, 1]);
        assert_eq!(forward.concatenated().shape(), [1, 2]);
        assert_eq!(forward.hidden().shape(), [1, 1]);
        assert_eq!(forward.logits().shape(), [1, 4]);
        assert_eq!(forward.embeddings().value().as_slice(), &[0.2, 0.3]);
        let hidden = 2.0 * (0.2 / (1.0 + (-0.2_f64).exp())) * 0.3;
        assert_eq!(
            forward.logits().value().as_slice(),
            &[hidden, 2.0 * hidden, -hidden, 0.0]
        );
    }

    #[test]
    fn loss_uses_the_final_shifted_target_and_reaches_every_matrix() {
        let model = known_model();
        let batch = one_batch(&[1, 2, 3], 2);
        assert_eq!(batch.input_row(0), Some(&[1, 2][..]));
        assert_eq!(batch.target_row(0), Some(&[2, 3][..]));
        let loss = model.loss(&batch).unwrap();
        let logits = model.forward(&[1, 2], 1).unwrap().into_logits();
        let expected = logits.indexed_mean_nll(1, &[3]).unwrap();
        assert_eq!(&*loss.value(), &*expected.value());
        let scalar_seed = tensor(&[], &[1.0]);
        loss.backward_with_seed(&scalar_seed.view(), GraphRetention::Release)
            .unwrap();
        for parameter in model.parameters() {
            let gradient = parameter.tensor().gradient().unwrap();
            assert_eq!(gradient.shape(), parameter.tensor().shape());
            assert!(gradient.as_slice().iter().all(|value| value.is_finite()));
            assert!(gradient.as_slice().iter().any(|value| *value != 0.0));
        }
    }

    #[test]
    fn validation_rejects_parameter_batch_context_and_target_mismatches() {
        let model = known_model();
        assert_eq!(
            model.forward(&[], 0).unwrap_err(),
            NeuralNgramError::EmptyBatch
        );
        assert_eq!(
            model.forward(&[1], 1).unwrap_err(),
            NeuralNgramError::ContextTokenCountMismatch {
                expected: 2,
                actual: 1,
            }
        );
        let wrong_context = one_batch(&[1, 2], 1);
        assert_eq!(
            model.loss(&wrong_context).unwrap_err(),
            NeuralNgramError::BatchContextLengthMismatch {
                expected: 2,
                actual: 1,
            }
        );
        let bad_target = one_batch(&[1, 2, 9], 2);
        assert_eq!(
            model.loss(&bad_target).unwrap_err(),
            NeuralNgramError::TargetIdOutOfBounds {
                row: 0,
                id: 9,
                vocabulary_size: 4,
            }
        );

        let config = model.config();
        let mut parameters = model.parameters().to_vec();
        parameters.swap(0, 1);
        assert_eq!(
            NeuralNgram::from_parameters(config, parameters).unwrap_err(),
            NeuralNgramError::ParameterNameMismatch {
                index: 0,
                expected: NEURAL_NGRAM_PARAMETER_NAMES[0],
                actual: NEURAL_NGRAM_PARAMETER_NAMES[1].to_owned(),
            }
        );

        assert!(
            model.embedding.parameters()[0]
                .tensor()
                .is_same_node(model.parameters()[0].tensor())
        );
        assert!(
            model
                .feed_forward
                .parameters()
                .iter()
                .zip(&model.parameters()[1..4])
                .all(|(layer, registry)| layer.tensor().is_same_node(registry.tensor()))
        );
        assert!(
            model.output.parameters()[0]
                .tensor()
                .is_same_node(model.parameters()[4].tensor())
        );
    }

    #[test]
    fn integrated_embedding_and_output_gradients_match_central_differences() {
        const STEP: f64 = 1e-6;
        const TOLERANCE: f64 = 2e-6;

        let model = known_model();
        let batch = one_batch(&[1, 2, 3], 2);
        let loss = model.loss(&batch).unwrap();
        let scalar_seed = tensor(&[], &[1.0]);
        loss.backward_with_seed(&scalar_seed.view(), GraphRetention::Release)
            .unwrap();

        for (parameter_index, element_index) in [(0, 1), (4, 3)] {
            let analytic = model.parameters()[parameter_index]
                .tensor()
                .gradient()
                .unwrap()
                .as_slice()[element_index];
            let evaluate = |delta| {
                known_model_with_delta(parameter_index, element_index, delta)
                    .loss(&batch)
                    .unwrap()
                    .value()
                    .as_slice()[0]
            };
            let numerical = (evaluate(STEP) - evaluate(-STEP)) / (2.0 * STEP);
            assert!(
                (analytic - numerical).abs() <= TOLERANCE,
                "parameter {parameter_index} element {element_index}: analytic {analytic}, numerical {numerical}"
            );
        }
    }

    #[test]
    fn greedy_selection_masks_controls_and_breaks_ties_by_lowest_id() {
        let model = known_model();
        assert_eq!(model.greedy_next(&[1, 2], &[]).unwrap(), 1);
        assert_eq!(model.greedy_next(&[1, 2], &[1]).unwrap(), 0);
        assert_eq!(model.greedy_next(&[1, 2], &[0, 1]).unwrap(), 3);
        assert_eq!(
            model.greedy_next(&[1, 2], &[4]).unwrap_err(),
            NeuralNgramError::MaskedTokenOutOfBounds {
                id: 4,
                vocabulary_size: 4,
            }
        );
        assert_eq!(
            model.greedy_next(&[1, 2], &[0, 1, 2, 3]).unwrap_err(),
            NeuralNgramError::NoUnmaskedToken
        );
    }
}
