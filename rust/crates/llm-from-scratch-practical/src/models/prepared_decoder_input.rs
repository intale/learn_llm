//! A models-only text seam. Digests describe inputs; live nodes authorize use.
use super::decoder::{DecoderModel, DecoderModelConfig};
use crate::{
    attention::incremental::LayerKvCache,
    autograd::tensor_core::{AutogradContext, TensorValue, TensorValueBinding},
    training::variable_batch::VariableBatch,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct CoreIdentity {
    pub semantic_sha256: String,
    pub run_sha256: String,
    pub construction_id: String,
    pub max_rows: usize,
}
pub(super) enum TextSource<'a> {
    Full {
        batch: Option<&'a VariableBatch>,
    },
    Cached {
        layers: &'a [LayerKvCache],
        prefix: usize,
    },
}

// region:prepared-text-input
/// This carrier has no public embedding/modality constructor.
pub(crate) struct PreparedDecoderInput<'a> {
    embedding: TensorValue,
    embedding_binding: TensorValueBinding,
    context: AutogradContext,
    shape: [usize; 3],
    source: TextSource<'a>,
    provenance_id: String,
    loss_eligible: bool,
    semantic_and_run: CoreIdentity,
    config: DecoderModelConfig,
    dtype: &'static str,
    device: &'static str,
    parameters: Vec<TensorValueBinding>,
    tied_table: TensorValueBinding,
}
impl<'a> PreparedDecoderInput<'a> {
    /// The sole ordinary text producer also carries checked padding/packing.
    pub(super) fn full(
        model: &DecoderModel,
        context: AutogradContext,
        embedding: TensorValue,
        batch: Option<&'a VariableBatch>,
    ) -> Self {
        Self::capture(model, context, embedding, TextSource::Full { batch }, true)
    }
    /// Only the model-owned cached text entry invokes this second producer.
    pub(super) fn cached(
        model: &DecoderModel,
        embedding: TensorValue,
        layers: &'a [LayerKvCache],
        prefix: usize,
    ) -> Self {
        Self::capture(
            model,
            AutogradContext::no_grad(),
            embedding,
            TextSource::Cached { layers, prefix },
            false,
        )
    }
    fn capture(
        model: &DecoderModel,
        context: AutogradContext,
        embedding: TensorValue,
        source: TextSource<'a>,
        loss_eligible: bool,
    ) -> Self {
        let shape = if embedding.shape().len() == 3 {
            [
                embedding.shape()[0],
                embedding.shape()[1],
                embedding.shape()[2],
            ]
        } else {
            [0; 3]
        };
        let provenance_id = match &source {
            TextSource::Full { batch: Some(batch) } => format!(
                "checked-text:{}:{}",
                batch.binding().tokenizer_sha256(),
                batch.binding().split_receipt_sha256()
            ),
            TextSource::Full { batch: None } => "ordinary-text-token-ids".into(),
            TextSource::Cached { prefix, .. } => format!("cached-text-prefix:{prefix}"),
        };
        Self {
            semantic_and_run: model.input_identity(shape[0], shape[1], context),
            shape,
            embedding_binding: TensorValueBinding::capture(&embedding),
            embedding,
            context,
            source,
            provenance_id,
            loss_eligible,
            config: model.config(),
            dtype: "f64",
            device: "cpu",
            parameters: model
                .parameters()
                .iter()
                .map(|p| TensorValueBinding::capture(p.tensor()))
                .collect(),
            tied_table: TensorValueBinding::capture(model.tied_embedding().tensor()),
        }
    }
    /// Recheck metadata and exact node revisions before the first block.
    pub(super) fn validate(&self, model: &DecoderModel) -> Result<(), &'static str> {
        let [b, t, d] = self.shape;
        if b == 0
            || t == 0
            || d != model.config().model_width()
            || self.embedding.shape() != self.shape
            || b > self.semantic_and_run.max_rows
        {
            return Err("B,T,D or admitted row count");
        }
        if self.dtype != "f64" || self.device != "cpu" || self.config != model.config() {
            return Err("numerical policy or device");
        }
        if !self.embedding_binding.node_matches(&self.embedding)
            || !self.embedding_binding.revision_matches(&self.embedding)
        {
            return Err("prepared hidden tensor identity or revision");
        }
        if self.semantic_and_run != model.input_identity(b, t, self.context) {
            return Err("semantic/run/construction identity");
        }
        if self.parameters.len() != model.parameters().len()
            || !self
                .tied_table
                .node_matches(model.tied_embedding().tensor())
            || !self
                .tied_table
                .revision_matches(model.tied_embedding().tensor())
        {
            return Err("tied table binding");
        }
        for (binding, p) in self.parameters.iter().zip(model.parameters()) {
            if !binding.node_matches(p.tensor()) || !binding.revision_matches(p.tensor()) {
                return Err("parameter node or revision");
            }
        }
        if !self.context.records_graph() && self.embedding.tracks_gradient() {
            return Err("graph-recording mode");
        }
        match &self.source {
            TextSource::Full { batch } => {
                if !self.loss_eligible || t > model.config().max_positions() {
                    return Err("full text eligibility or positions");
                }
                let expected = if let Some(batch) = batch {
                    if batch.shape() != [b, t] {
                        return Err("batch layout shape");
                    }
                    let cells = b.checked_mul(t).ok_or("batch metadata overflow")?;
                    if batch.positions().len() != cells
                        || batch.range_starts().len() != cells
                        || batch.segments().len() != cells
                        || batch.valid_tokens().len() != cells
                        || batch.valid_targets().len() != cells
                        || batch.lengths().len() != b
                    {
                        return Err("position/segment/eligibility lengths");
                    }
                    for row in 0..b {
                        if batch.lengths()[row] > t {
                            return Err("active row length");
                        }
                        for col in 0..t {
                            let i = row * t + col;
                            if batch.valid_targets()[i] && !batch.valid_tokens()[i] {
                                return Err("loss eligibility outside text");
                            }
                            if batch.valid_tokens()[i] {
                                if col >= batch.lengths()[row]
                                    || batch.segments()[i] < 0
                                    || batch.range_starts()[i] > col
                                    || batch.positions()[i] >= model.config().max_positions()
                                {
                                    return Err("positions or causal segment range");
                                }
                            } else if batch.segments()[i] != -1 {
                                return Err("inactive segment identity");
                            }
                        }
                    }
                    format!(
                        "checked-text:{}:{}",
                        batch.binding().tokenizer_sha256(),
                        batch.binding().split_receipt_sha256()
                    )
                } else {
                    "ordinary-text-token-ids".into()
                };
                if expected != self.provenance_id {
                    return Err("text provenance");
                }
            }
            TextSource::Cached { layers, prefix } => {
                if self.context.records_graph()
                    || self.loss_eligible
                    || self.shape != [1, 1, model.config().model_width()]
                    || *prefix >= model.config().max_positions()
                    || layers.len() != model.blocks().len()
                {
                    return Err("cached mode, prefix or layers");
                }
                if self.provenance_id != format!("cached-text-prefix:{prefix}") {
                    return Err("cached provenance");
                }
                for (layer, block) in layers.iter().zip(model.blocks()) {
                    if layer.len() != *prefix
                        || layer.batch_size() != 1
                        || layer.capacity() != model.config().max_positions()
                    {
                        return Err("cache prefix/batch/capacity");
                    }
                    block
                        .attention()
                        .validate_incremental_cache_binding(layer)
                        .map_err(|_| "cache parameter binding")?;
                }
            }
        }
        Ok(())
    }
    pub(super) fn into_parts(self) -> (TensorValue, AutogradContext, TextSource<'a>) {
        (self.embedding, self.context, self.source)
    }
}
// endregion:prepared-text-input

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{autograd::tensor_core::AutogradContext, nn::init::SplitMix64};
    fn model() -> DecoderModel {
        DecoderModel::new(
            DecoderModelConfig::new(266, 4, 1, 4, 1, 4, 10000.0, 1e-6),
            &mut SplitMix64::from_seed(39),
        )
        .unwrap()
    }
    #[test]
    fn forged_metadata_and_same_shape_other_nodes_are_refused() {
        let m = model();
        let other = model();
        let context = AutogradContext::recording();
        let e = m
            .embedding()
            .forward_with_context(context, &[0, 99], &[1, 2])
            .unwrap();
        let mut p = PreparedDecoderInput::full(&m, context, e, None);
        assert!(p.validate(&m).is_ok());
        assert_eq!(p.validate(&other), Err("tied table binding"));
        p.shape[2] = 8;
        assert_eq!(p.validate(&m), Err("B,T,D or admitted row count"));
        p.shape[2] = 4;
        p.semantic_and_run.run_sha256.push('x');
        assert_eq!(p.validate(&m), Err("semantic/run/construction identity"));
    }
    #[test]
    fn revision_provenance_and_context_cannot_authorize_a_stale_carrier() {
        let m = model();
        let e = m
            .embedding()
            .forward_with_context(AutogradContext::recording(), &[0], &[1, 1])
            .unwrap();
        let mut p = PreparedDecoderInput::full(&m, AutogradContext::recording(), e, None);
        p.provenance_id = "unrelated".into();
        assert_eq!(p.validate(&m), Err("text provenance"));
        p.provenance_id = "ordinary-text-token-ids".into();
        p.context = AutogradContext::no_grad();
        assert!(p.validate(&m).is_err());
        p.context = AutogradContext::recording();
        m.tied_embedding().tensor().set_value_revision_for_test(1);
        assert_eq!(p.validate(&m), Err("tied table binding"));
    }

    #[test]
    fn changed_hidden_lookup_handle_fails_at_the_consumer_boundary() {
        let m = model();
        let other = model();
        let context = AutogradContext::recording();
        let e = m
            .embedding()
            .forward_with_context(context, &[0, 99], &[1, 2])
            .unwrap();
        let mut input = PreparedDecoderInput::full(&m, context, e, None);
        input.embedding = other
            .embedding()
            .forward_with_context(context, &[0, 99], &[1, 2])
            .unwrap();
        assert!(matches!(
            super::super::causal_decoder_core::consume(&m, input),
            Err(super::super::causal_decoder_core::CoreError::Prepared(
                "prepared hidden tensor identity or revision"
            ))
        ));
    }
}
