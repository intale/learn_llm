//! One text fixture composed from the existing encoder, transformer and head.
use llm_from_scratch_practical::{
    autograd::tensor_core::{AutogradContext, TensorValue},
    generation::kv_cache::DecoderKvCache,
    models::{
        decoder::{DecoderModel, DecoderModelConfig},
        prepared_decoder_input::{InputEncoder, PreparedDecoderInput, SequenceLayout},
        text_input::{TextInputEncoder, TextOutputHead},
    },
    nn::init::SplitMix64,
    tensor::storage::Tensor,
    tokenizer::bpe::BpeTokenizer,
};
use serde_json::{Value, json};

fn bits(value: &TensorValue) -> Vec<String> {
    value
        .value()
        .as_slice()
        .iter()
        .map(|v| format!("{:016x}", v.to_bits()))
        .collect()
}
fn clear_gradients(model: &DecoderModel) -> Result<(), Box<dyn std::error::Error>> {
    for p in model.parameters() {
        p.tensor().zero_grad()?;
    }
    Ok(())
}

// region:compose-text-path
/// All learned tensors belong to the existing model. The views borrow them.
pub fn run() -> Result<Value, Box<dyn std::error::Error>> {
    let tokenizer = BpeTokenizer::from_merge_pairs(&[])?;
    let document = tokenizer.encode_utf8_document("ab");
    let ids = &document[..3];
    let targets = document[1..]
        .iter()
        .map(|&id| id as usize)
        .collect::<Vec<_>>();
    let model = DecoderModel::new(
        DecoderModelConfig::new(258, 4, 1, 8, 2, 8, 10000.0, 1e-6),
        &mut SplitMix64::from_seed(39),
    )?;
    let context = AutogradContext::recording();
    let backbone = model.backbone();
    let encoded = TextInputEncoder::tokens(&model, ids, &[1, 3]).encode(context, &backbone)?;
    let embedding_shape = encoded.embeddings().shape().to_vec();
    let embedding_bits = bits(encoded.embeddings());
    let hidden = backbone.forward(encoded)?;
    let head = model.text_output_head();
    let logits = head.forward(context, hidden.hidden())?;
    let loss = logits.indexed_mean_nll(2, &targets)?;
    loss.backward()?;
    let total = model
        .tied_embedding()
        .tensor()
        .gradient_snapshot()
        .ok_or("missing tied gradient")?;
    let wrapper = model.forward(ids, &[1, 3])?;
    let same_text_logits = bits(&logits) == bits(wrapper.logits());
    let tied_alias = head
        .table()
        .is_same_node(model.embedding().table().tensor());
    // endregion:compose-text-path

    // region:tied-gradient-paths
    // Fix only the output table to isolate the lookup contribution.
    // detach is an experiment here; the production head uses the live table.
    clear_gradients(&model)?;
    let encoded = TextInputEncoder::tokens(&model, ids, &[1, 3]).encode(context, &backbone)?;
    let input_hidden = backbone.forward(encoded)?;
    let fixed_table = head.table().detach();
    TextOutputHead::new(&fixed_table)
        .forward(context, input_hidden.hidden())?
        .indexed_mean_nll(2, &targets)?
        .backward()?;
    let lookup = model
        .tied_embedding()
        .tensor()
        .gradient_snapshot()
        .ok_or("missing lookup gradient")?;

    // Fix only the text lookup result to isolate the head contribution.
    clear_gradients(&model)?;
    let encoded = TextInputEncoder::tokens(&model, ids, &[1, 3]).encode(context, &backbone)?;
    let fixed_input = PreparedDecoderInput::new(
        &backbone,
        context,
        encoded.embeddings().detach(),
        encoded.layout().clone(),
        "fixed text lookup for derivative partition",
        &[],
    )?;
    let head_hidden = backbone.forward(fixed_input)?;
    head.forward(context, head_hidden.hidden())?
        .indexed_mean_nll(2, &targets)?
        .backward()?;
    let output = model
        .tied_embedding()
        .tensor()
        .gradient_snapshot()
        .ok_or("missing head gradient")?;
    let max_gradient_error = total
        .as_slice()
        .iter()
        .zip(lookup.as_slice())
        .zip(output.as_slice())
        .map(|((&all, &a), &b)| (all - (a + b)).abs())
        .fold(0.0_f64, f64::max);
    // Show the first feature of the existing 'a' token row (ID99).
    let coordinate = 99 * 4;
    let gradient_sample = json!({
        "row":99, "feature":0, "total":total.as_slice()[coordinate],
        "lookup_path":lookup.as_slice()[coordinate], "head_path":output.as_slice()[coordinate],
    });
    // endregion:tied-gradient-paths

    // region:encoding-execution-policy
    let no_grad = AutogradContext::no_grad();
    let encoded = TextInputEncoder::tokens(&model, ids, &[1, 3]).encode(no_grad, &backbone)?;
    let graph_free = !backbone.forward(encoded)?.hidden().tracks_gradient();
    let mut cache = DecoderKvCache::new(&model)?;
    let mut session = cache.bind(&model)?;
    session.prefill(&ids[..2])?;
    let decoded = session.decode(ids[2])?;
    let cached_bits = bits(decoded.logits());
    let full_bits = bits(&logits);
    let newest = &full_bits[2 * 258..3 * 258];
    let newest_bit_mismatches = newest
        .iter()
        .zip(&cached_bits)
        .filter(|(a, b)| a != b)
        .count();
    let work = session.cache().work();
    let cached = json!({
        "prefix_tokens":3,"graph_free":!decoded.logits().tracks_gradient(),
        "newest_logit_bit_mismatches":newest_bit_mismatches,
        "token_forwards":work.token_forwards(),"cache_appends":work.cache_appends(),
        "attention_score_values":work.attention_score_values(),
    });
    // endregion:encoding-execution-policy

    // The same text-derived vector shape with one missing feature is refused.
    let malformed = TensorValue::constant(Tensor::from_vec(vec![1, 1, 3], vec![0.0; 3])?)?;
    let width_refusal = PreparedDecoderInput::new(
        &backbone,
        no_grad,
        malformed,
        SequenceLayout::causal([1, 1])?,
        "malformed text-derived width",
        &[],
    )
    .err()
    .ok_or("wrong width accepted")?
    .reason();
    let tracked = TextInputEncoder::tokens(&model, ids, &[1, 3]).encode(context, &backbone)?;
    let policy_refusal = PreparedDecoderInput::new(
        &backbone,
        no_grad,
        tracked.embeddings().clone(),
        tracked.layout().clone(),
        "tracked text lookup under no-grad",
        &[],
    )
    .err()
    .ok_or("tracked lookup accepted under no-grad")?
    .reason();

    Ok(json!({
        "chapter":"10-input-encoding-boundary",
        "fixture":{"text":"ab","document_ids":document,"input_ids":ids,"targets":targets,"seed":39},
        "shapes":{"embedding":embedding_shape,"hidden":hidden.hidden().shape(),"logits":logits.shape(),"table":head.table().shape()},
        "parameters":{"scalars":model.parameter_count(),"tensors":model.parameters().len(),"lookup_and_head_same_node":tied_alias},
        "composition":{"same_text_wrapper_logits":same_text_logits,"loss":loss.value().as_slice()[0],
            "loss_bits":bits(&loss)[0],"first_embedding_bits":&embedding_bits[..4]},
        "gradients":{"max_partition_error":max_gradient_error,"absolute_tolerance":1e-12,
            "within_tolerance":max_gradient_error < 1e-12,"sample":gradient_sample},
        "execution":{"full_no_grad_hidden_graph_free":graph_free,"cached":cached},
        "refusals":{"wrong_width":width_refusal,"tracked_input_under_no_grad":policy_refusal},
        "scope":"one CPU/f64 text fixture; other input encoders and GPU execution are not implemented",
    }))
}

#[cfg(test)]
mod tests {
    #[test]
    fn text_composition_retains_sharing_gradients_and_cache_behavior() {
        let result = super::run().unwrap();
        assert_eq!(result["shapes"]["hidden"], serde_json::json!([1, 3, 4]));
        assert_eq!(result["shapes"]["logits"], serde_json::json!([1, 3, 258]));
        assert_eq!(result["parameters"]["scalars"], 1372);
        assert_eq!(result["parameters"]["lookup_and_head_same_node"], true);
        assert_eq!(result["composition"]["same_text_wrapper_logits"], true);
        assert_eq!(result["composition"]["loss_bits"], "4016ac70bf03b620");
        assert_eq!(result["gradients"]["within_tolerance"], true);
        assert_eq!(result["execution"]["cached"]["cache_appends"], 6);
        assert_eq!(
            result["execution"]["cached"]["newest_logit_bit_mismatches"],
            0
        );
        assert_eq!(result["execution"]["cached"]["graph_free"], true);
    }
}
