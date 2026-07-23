use std::error::Error;

use llm_from_scratch::autograd::tensor_core::GraphRetention;
use llm_from_scratch::nn::embedding::{Embedding, EmbeddingError};
use llm_from_scratch::nn::init::{NamedParameter, SplitMix64};
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const TABLE_SHAPE: [usize; 2] = [4, 2];
pub const TABLE_VALUES: [f64; 8] = [10.0, 11.0, 20.0, 21.0, 30.0, 31.0, 40.0, 41.0];
pub const TOKEN_SHAPE: [usize; 2] = [1, 3];
pub const TOKEN_IDS: [u32; 3] = [2, 1, 2];
pub const UPSTREAM_VALUES: [f64; 6] = [1.0, 0.0, 0.0, 2.0, 3.0, 4.0];

#[derive(Debug)]
pub struct LearnerReport {
    pub table_name: String,
    pub table_shape: Vec<usize>,
    pub token_ids: Vec<u32>,
    pub token_shape: Vec<usize>,
    pub output: Tensor,
    pub one_hot_matches: bool,
    pub upstream: Tensor,
    pub table_gradient: Tensor,
    pub unused_rows_zero: bool,
    pub initialized_shape: Vec<usize>,
    pub initialized_reproducible: bool,
    pub clone_same_node: bool,
    pub empty_output: Tensor,
    pub bounds_rejected: bool,
}

pub fn known_table() -> Tensor {
    Tensor::from_vec(TABLE_SHAPE.to_vec(), TABLE_VALUES.to_vec()).expect("valid known table")
}

pub fn known_embedding() -> Embedding {
    Embedding::from_parameter(
        NamedParameter::from_tensor("token_embedding.weight", known_table())
            .expect("valid known parameter"),
    )
    .expect("valid known embedding")
}

// region:one-hot-baseline
/// Materializes the tiny historical algebraic baseline for comparison only.
pub fn explicit_one_hot_product(table: &Tensor, token_ids: &[u32]) -> (Vec<Vec<u8>>, Vec<f64>) {
    assert_eq!(table.shape().len(), 2);
    let vocabulary_size = table.shape()[0];
    let width = table.shape()[1];
    let mut indicators = Vec::with_capacity(token_ids.len());
    let mut output = Vec::with_capacity(token_ids.len() * width);

    for &token_id in token_ids {
        let selected = usize::try_from(token_id).expect("u32 token ID must fit usize");
        assert!(selected < vocabulary_size);
        let mut one_hot = vec![0_u8; vocabulary_size];
        one_hot[selected] = 1;
        for feature in 0..width {
            let value = one_hot
                .iter()
                .enumerate()
                .map(|(row, &active)| f64::from(active) * table.as_slice()[row * width + feature])
                .sum();
            output.push(value);
        }
        indicators.push(one_hot);
    }
    (indicators, output)
}
// endregion:one-hot-baseline

pub fn learner_report() -> Result<LearnerReport, Box<dyn Error>> {
    // region:known-token-lookup
    let embedding = known_embedding();
    let output = embedding.forward(&TOKEN_IDS, &TOKEN_SHAPE)?;
    let (_, one_hot_output) = explicit_one_hot_product(&known_table(), &TOKEN_IDS);
    let one_hot_matches = output.value().as_slice() == one_hot_output;
    // endregion:known-token-lookup

    // region:repeated-token-gradient
    let upstream = Tensor::from_vec(vec![1, 3, 2], UPSTREAM_VALUES.to_vec())?;
    output.backward_with_seed(&upstream.view(), GraphRetention::Retain)?;
    let table_gradient = embedding
        .table()
        .tensor()
        .gradient()
        .expect("trainable table stores its gradient");
    // endregion:repeated-token-gradient

    // region:initialized-token-embedding
    let mut first_rng = SplitMix64::from_seed(18);
    let mut second_rng = SplitMix64::from_seed(18);
    let initialized = Embedding::new("token_embedding.weight", 4, 2, &mut first_rng)?;
    let reproduced = Embedding::new("token_embedding.weight", 4, 2, &mut second_rng)?;
    let initialized_reproducible =
        initialized.table().tensor().value() == reproduced.table().tensor().value();
    let clone_same_node = initialized
        .table()
        .tensor()
        .is_same_node(initialized.clone().table().tensor());
    // endregion:initialized-token-embedding

    let empty_output = embedding.forward(&[], &[0])?.value();
    let bounds_rejected = matches!(
        embedding.forward(&[4], &[1]),
        Err(EmbeddingError::TokenIdOutOfBounds {
            position: 0,
            id: 4,
            vocabulary_size: 4,
        })
    );
    let unused_rows_zero = [0, 1, 6, 7]
        .into_iter()
        .all(|index| table_gradient.as_slice()[index] == 0.0);

    Ok(LearnerReport {
        table_name: embedding.table().name().to_owned(),
        table_shape: embedding.table().tensor().shape(),
        token_ids: TOKEN_IDS.to_vec(),
        token_shape: TOKEN_SHAPE.to_vec(),
        output: output.value(),
        one_hot_matches,
        upstream,
        table_gradient,
        unused_rows_zero,
        initialized_shape: initialized.table().tensor().shape(),
        initialized_reproducible,
        clone_same_node,
        empty_output,
        bounds_rejected,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_hot_baseline_and_layer_match_the_frozen_fixture() {
        let report = learner_report().unwrap();
        assert!(report.one_hot_matches);
        assert_eq!(
            report.output.as_slice(),
            &[30.0, 31.0, 20.0, 21.0, 30.0, 31.0]
        );
        assert_eq!(
            report.table_gradient.as_slice(),
            &[0.0, 0.0, 0.0, 2.0, 4.0, 4.0, 0.0, 0.0]
        );
    }

    #[test]
    fn initialization_identity_empty_shape_and_bounds_are_observable() {
        let report = learner_report().unwrap();
        assert!(report.initialized_reproducible);
        assert!(report.clone_same_node);
        assert_eq!(report.empty_output.shape(), &[0, 2]);
        assert!(report.empty_output.is_empty());
        assert!(report.bounds_rejected);
    }
}
