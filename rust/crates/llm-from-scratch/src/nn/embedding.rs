//! A trainable token table backed by differentiable row gathering.

use std::error::Error;
use std::fmt;

use crate::autograd::tensor_core::{TensorAutodiffError, TensorValue};
use crate::nn::init::{InitializationError, NamedParameter, SplitMix64};
use crate::tensor::storage::{TensorError, checked_row_major_layout};

// region:embedding-errors
/// A rejected embedding table, token layout, selector, or delegated operation.
#[derive(Clone, Debug, PartialEq)]
pub enum EmbeddingError {
    Initialization(InitializationError),
    Autodiff(TensorAutodiffError),
    TableRank {
        rank: usize,
    },
    EmptyVocabulary,
    ZeroEmbeddingWidth,
    TokenShape(TensorError),
    TokenCountMismatch {
        expected: usize,
        actual: usize,
    },
    TokenIdOutOfBounds {
        position: usize,
        id: u32,
        vocabulary_size: usize,
    },
    IndexAllocationFailed {
        elements: usize,
    },
}

impl fmt::Display for EmbeddingError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Initialization(error) => error.fmt(formatter),
            Self::Autodiff(error) => error.fmt(formatter),
            Self::TableRank { rank } => {
                write!(
                    formatter,
                    "embedding table must have rank two, got rank {rank}"
                )
            }
            Self::EmptyVocabulary => {
                formatter.write_str("embedding vocabulary must contain at least one row")
            }
            Self::ZeroEmbeddingWidth => {
                formatter.write_str("embedding width must be greater than zero")
            }
            Self::TokenShape(error) => write!(formatter, "invalid token-ID shape: {error}"),
            Self::TokenCountMismatch { expected, actual } => write!(
                formatter,
                "token-ID shape needs {expected} IDs, but received {actual}"
            ),
            Self::TokenIdOutOfBounds {
                position,
                id,
                vocabulary_size,
            } => write!(
                formatter,
                "token ID {id} at flat position {position} is out of bounds for vocabulary size {vocabulary_size}"
            ),
            Self::IndexAllocationFailed { elements } => write!(
                formatter,
                "could not reserve {elements} converted embedding indices"
            ),
        }
    }
}

impl Error for EmbeddingError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Initialization(error) => Some(error),
            Self::Autodiff(error) => Some(error),
            Self::TokenShape(error) => Some(error),
            _ => None,
        }
    }
}

impl From<InitializationError> for EmbeddingError {
    fn from(error: InitializationError) -> Self {
        Self::Initialization(error)
    }
}

impl From<TensorAutodiffError> for EmbeddingError {
    fn from(error: TensorAutodiffError) -> Self {
        Self::Autodiff(error)
    }
}
// endregion:embedding-errors

// region:embedding-layer
/// One named trainable `[vocabulary_size, embedding_width]` token table.
#[derive(Debug)]
pub struct Embedding {
    table: NamedParameter,
    vocabulary_size: usize,
    embedding_width: usize,
}

impl Clone for Embedding {
    /// Clones the layer handle while preserving the table's tape-leaf identity.
    fn clone(&self) -> Self {
        Self {
            table: self.table.clone(),
            vocabulary_size: self.vocabulary_size,
            embedding_width: self.embedding_width,
        }
    }
}

impl Embedding {
    /// Initializes one table transactionally with Chapter 17's Xavier policy.
    ///
    /// The complete parameter name is used as supplied. Validation checks the
    /// name before the vocabulary and width, and every error preserves `rng`.
    pub fn new(
        parameter_name: impl Into<String>,
        vocabulary_size: usize,
        embedding_width: usize,
        rng: &mut SplitMix64,
    ) -> Result<Self, EmbeddingError> {
        let mut trial = rng.clone();
        let table = NamedParameter::xavier_uniform(
            parameter_name,
            vocabulary_size,
            embedding_width,
            &mut trial,
        )
        .map_err(|error| match error {
            InitializationError::ZeroFanIn => EmbeddingError::EmptyVocabulary,
            InitializationError::ZeroFanOut => EmbeddingError::ZeroEmbeddingWidth,
            other => EmbeddingError::Initialization(other),
        })?;
        let embedding = Self::from_parameter(table)?;
        *rng = trial;
        Ok(embedding)
    }

    /// Gives embedding semantics to an existing named trainable rank-two table.
    pub fn from_parameter(table: NamedParameter) -> Result<Self, EmbeddingError> {
        let shape = table.tensor().shape();
        if shape.len() != 2 {
            return Err(EmbeddingError::TableRank { rank: shape.len() });
        }
        if shape[0] == 0 {
            return Err(EmbeddingError::EmptyVocabulary);
        }
        if shape[1] == 0 {
            return Err(EmbeddingError::ZeroEmbeddingWidth);
        }
        Ok(Self {
            table,
            vocabulary_size: shape[0],
            embedding_width: shape[1],
        })
    }

    /// Selects one table row per `u32` token ID and appends the feature axis.
    ///
    /// Token IDs remain integer selectors rather than differentiable operands.
    pub fn forward(
        &self,
        token_ids: &[u32],
        token_shape: &[usize],
    ) -> Result<TensorValue, EmbeddingError> {
        let (_, expected) =
            checked_row_major_layout(token_shape).map_err(EmbeddingError::TokenShape)?;
        if token_ids.len() != expected {
            return Err(EmbeddingError::TokenCountMismatch {
                expected,
                actual: token_ids.len(),
            });
        }

        for (position, &id) in token_ids.iter().enumerate() {
            let valid = usize::try_from(id)
                .ok()
                .is_some_and(|index| index < self.vocabulary_size);
            if !valid {
                return Err(EmbeddingError::TokenIdOutOfBounds {
                    position,
                    id,
                    vocabulary_size: self.vocabulary_size,
                });
            }
        }

        let mut indices = Vec::new();
        indices
            .try_reserve_exact(expected)
            .map_err(|_| EmbeddingError::IndexAllocationFailed { elements: expected })?;
        for &id in token_ids {
            indices.push(usize::try_from(id).expect("validated u32 token ID must fit usize"));
        }
        self.table
            .tensor()
            .gather_rows(&indices, token_shape)
            .map_err(EmbeddingError::Autodiff)
    }

    /// Returns the table with its stable external name and trainable leaf.
    pub const fn table(&self) -> &NamedParameter {
        &self.table
    }

    /// Returns the one-element parameter slice without duplicating the leaf.
    pub fn parameters(&self) -> &[NamedParameter] {
        std::slice::from_ref(&self.table)
    }

    pub const fn vocabulary_size(&self) -> usize {
        self.vocabulary_size
    }

    pub const fn embedding_width(&self) -> usize {
        self.embedding_width
    }
}
// endregion:embedding-layer

#[cfg(test)]
mod tests {
    use super::*;
    use crate::autograd::gradcheck::sampled_tensor_gradient_check;
    use crate::autograd::tensor_core::GraphRetention;
    use crate::tensor::storage::Tensor;

    const STEP: f64 = 1e-6;
    const TOLERANCE: f64 = 2e-6;

    fn tensor(shape: &[usize], values: &[f64]) -> Tensor {
        Tensor::from_vec(shape.to_vec(), values.to_vec()).unwrap()
    }

    fn known_embedding() -> Embedding {
        Embedding::from_parameter(
            NamedParameter::from_tensor(
                "token_embedding.weight",
                tensor(&[4, 2], &[10.0, 11.0, 20.0, 21.0, 30.0, 31.0, 40.0, 41.0]),
            )
            .unwrap(),
        )
        .unwrap()
    }

    #[test]
    fn exact_lookup_and_nonuniform_reverse_seed_scatter_add_repeats() {
        let embedding = known_embedding();
        let output = embedding.forward(&[2, 1, 2], &[1, 3]).unwrap();
        assert_eq!(output.shape(), vec![1, 3, 2]);
        assert_eq!(
            output.value().as_slice(),
            &[30.0, 31.0, 20.0, 21.0, 30.0, 31.0]
        );

        let upstream = tensor(&[1, 3, 2], &[1.0, 0.0, 0.0, 2.0, 3.0, 4.0]);
        output
            .backward_with_seed(&upstream.view(), GraphRetention::Retain)
            .unwrap();
        assert_eq!(
            embedding.table().tensor().gradient().unwrap().as_slice(),
            &[0.0, 0.0, 0.0, 2.0, 4.0, 4.0, 0.0, 0.0]
        );
    }

    #[test]
    fn repeated_lookup_vjp_matches_every_finite_difference_coordinate() {
        let values = [0.2, -0.4, 0.7, 1.1, -0.3, 0.6, 0.8, -0.2];
        let seed_values = [1.0, -0.5, 0.25, 2.0, -1.5, 0.75];
        let embedding = Embedding::from_parameter(
            NamedParameter::from_tensor("probe.weight", tensor(&[4, 2], &values)).unwrap(),
        )
        .unwrap();
        let output = embedding.forward(&[2, 1, 2], &[1, 3]).unwrap();
        let seed = tensor(&[1, 3, 2], &seed_values);
        output
            .backward_with_seed(&seed.view(), GraphRetention::Retain)
            .unwrap();
        let analytic = embedding.table().tensor().gradient().unwrap();

        let mut probe = tensor(&[4, 2], &values);
        let report = sampled_tensor_gradient_check(
            &mut probe,
            &analytic.view(),
            STEP,
            TOLERANCE,
            values.len(),
            |candidate| {
                let parameter =
                    NamedParameter::from_tensor("probe.weight", candidate.clone()).unwrap();
                let candidate_embedding = Embedding::from_parameter(parameter).unwrap();
                candidate_embedding
                    .forward(&[2, 1, 2], &[1, 3])
                    .unwrap()
                    .value()
                    .as_slice()
                    .iter()
                    .zip(seed_values)
                    .map(|(value, seed)| value * seed)
                    .sum()
            },
        )
        .unwrap();
        assert!(report.checks.iter().all(|check| check.comparison.passed));
    }

    #[test]
    fn scalar_and_empty_token_shapes_append_only_the_feature_axis() {
        let embedding = known_embedding();
        let scalar = embedding.forward(&[3], &[]).unwrap();
        assert_eq!(scalar.shape(), vec![2]);
        assert_eq!(scalar.value().as_slice(), &[40.0, 41.0]);

        for shape in [&[0][..], &[2, 0][..]] {
            let empty = embedding.forward(&[], shape).unwrap();
            let mut expected_shape = shape.to_vec();
            expected_shape.push(2);
            assert_eq!(empty.shape(), expected_shape);
            assert!(empty.value().is_empty());
            let seed = Tensor::from_vec(empty.shape(), Vec::new()).unwrap();
            empty
                .backward_with_seed(&seed.view(), GraphRetention::Retain)
                .unwrap();
            assert_eq!(
                embedding.table().tensor().gradient().unwrap().as_slice(),
                &[0.0; 8]
            );
        }
    }

    #[test]
    fn forward_validation_precedence_is_shape_count_then_first_bad_id() {
        let embedding = known_embedding();
        assert_eq!(
            embedding.forward(&[], &[usize::MAX, 2]).unwrap_err(),
            EmbeddingError::TokenShape(TensorError::ShapeOverflow)
        );
        assert_eq!(
            embedding.forward(&[4], &[2]).unwrap_err(),
            EmbeddingError::TokenCountMismatch {
                expected: 2,
                actual: 1,
            }
        );
        assert_eq!(
            embedding.forward(&[1, 4, 9], &[3]).unwrap_err(),
            EmbeddingError::TokenIdOutOfBounds {
                position: 1,
                id: 4,
                vocabulary_size: 4,
            }
        );
    }

    #[test]
    fn manual_table_validation_is_rank_then_vocabulary_then_width() {
        let make = |shape: &[usize], values: &[f64]| {
            NamedParameter::from_tensor("token_embedding.weight", tensor(shape, values)).unwrap()
        };
        assert_eq!(
            Embedding::from_parameter(make(&[2], &[1.0, 2.0])).unwrap_err(),
            EmbeddingError::TableRank { rank: 1 }
        );
        assert_eq!(
            Embedding::from_parameter(make(&[1, 1, 1], &[1.0])).unwrap_err(),
            EmbeddingError::TableRank { rank: 3 }
        );
        assert_eq!(
            Embedding::from_parameter(make(&[0, 2], &[])).unwrap_err(),
            EmbeddingError::EmptyVocabulary
        );
        assert_eq!(
            Embedding::from_parameter(make(&[2, 0], &[])).unwrap_err(),
            EmbeddingError::ZeroEmbeddingWidth
        );
        assert_eq!(
            Embedding::from_parameter(make(&[0, 0], &[])).unwrap_err(),
            EmbeddingError::EmptyVocabulary
        );
    }

    #[test]
    fn construction_is_transactional_reproducible_and_preserves_identity() {
        let mut rejected_rng = SplitMix64::from_seed(18);
        let rejected_state = rejected_rng.state();
        assert_eq!(
            Embedding::new("Bad", 0, 0, &mut rejected_rng).unwrap_err(),
            EmbeddingError::Initialization(InitializationError::InvalidNameCharacter {
                index: 0,
                byte: b'B',
            })
        );
        assert_eq!(rejected_rng.state(), rejected_state);
        assert_eq!(
            Embedding::new("token_embedding.weight", 0, 0, &mut rejected_rng).unwrap_err(),
            EmbeddingError::EmptyVocabulary
        );
        assert_eq!(
            Embedding::new("token_embedding.weight", 4, 0, &mut rejected_rng).unwrap_err(),
            EmbeddingError::ZeroEmbeddingWidth
        );
        assert_eq!(rejected_rng.state(), rejected_state);

        let mut left_rng = SplitMix64::from_seed(18);
        let mut right_rng = SplitMix64::from_seed(18);
        let left = Embedding::new("token_embedding.weight", 4, 2, &mut left_rng).unwrap();
        let right = Embedding::new("token_embedding.weight", 4, 2, &mut right_rng).unwrap();
        assert_eq!(left.table().name(), "token_embedding.weight");
        assert_eq!(left.table().tensor().shape(), vec![4, 2]);
        assert_eq!(
            left.table().tensor().value(),
            right.table().tensor().value()
        );
        assert!(!left.table().tensor().is_same_node(right.table().tensor()));

        let clone = left.clone();
        assert!(left.table().tensor().is_same_node(clone.table().tensor()));
        assert!(
            left.parameters()[0]
                .tensor()
                .is_same_node(left.table().tensor())
        );
        let output = left.forward(&[1], &[1]).unwrap();
        output
            .backward_with_seed(&tensor(&[1, 2], &[1.0, 1.0]).view(), GraphRetention::Retain)
            .unwrap();
        assert_eq!(
            left.table().tensor().gradient().unwrap().as_slice()[2..4],
            [1.0, 1.0]
        );
        assert_eq!(left.vocabulary_size(), 4);
        assert_eq!(left.embedding_width(), 2);
    }
}
