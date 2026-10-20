use super::*;
use crate::{
    checkpoint::portable::PortableModel, generation::kv_cache::DecoderKvCache,
    models::prepared_decoder_input::SequenceLayout, tokenizer::bpe::BpeTokenizer,
    training::trainer::DecoderModelState,
};

fn fixture(kv: usize, window: Option<usize>) -> (DecoderModel, BpeTokenizer) {
    let tokenizer = BpeTokenizer::from_merge_pairs(&[]).unwrap();
    let config = DecoderModelConfig::new(
        tokenizer.layout().vocabulary_size(),
        8,
        4,
        16,
        2,
        8,
        100.0,
        1e-6,
    )
    .with_attention(kv, window);
    (
        DecoderModel::new(config, &mut SplitMix64::from_seed(18)).unwrap(),
        tokenizer,
    )
}
fn close(a: &[f64], b: &[f64]) {
    assert_eq!(a.len(), b.len());
    assert!(a.iter().zip(b).all(|(a, b)| (a - b).abs() <= 1e-10));
}

#[test]
fn complete_models_match_every_cached_logit_and_preserve_cpu_state() {
    for kv in [4, 2, 1] {
        for window in [None, Some(1), Some(3)] {
            let (model, text) = fixture(kv, window);
            let tokens = text.encode_utf8_document("abcd");
            let before = DecoderModelState::snapshot(&model);
            assert_eq!(
                model.parameter_count(),
                model.config().checked_parameter_count().unwrap()
            );
            let mut cache = DecoderKvCache::new(&model).unwrap();
            {
                let mut session = cache.bind(&model).unwrap();
                for count in 1..=tokens.len() {
                    let actual = if count == 1 {
                        session.prefill(&tokens[..1]).unwrap()
                    } else {
                        session.decode(tokens[count - 1]).unwrap()
                    };
                    let full = model
                        .forward_with_context(
                            AutogradContext::no_grad(),
                            &tokens[..count],
                            &[1, count],
                        )
                        .unwrap();
                    let width = model.config().vocabulary_size();
                    close(
                        actual.logits().value().as_slice(),
                        &full.logits().value().as_slice()[(count - 1) * width..count * width],
                    );
                    assert!(!actual.logits().tracks_gradient());
                }
            }
            assert_eq!(cache.len(), tokens.len());
            assert_eq!(
                cache.layer_cache(0).unwrap().keys().unwrap().shape(),
                [1, kv, tokens.len(), 2]
            );
            assert_eq!(
                DecoderModelState::snapshot(&model).bit_pattern(),
                before.bit_pattern()
            );
        }
    }
}

#[test]
fn portable_text_and_generic_backbone_keep_attention_semantics() {
    let (model, text) = fixture(2, Some(3));
    let tokens = text.encode_utf8_document("ab");
    let original = model
        .forward_with_context(AutogradContext::no_grad(), &tokens, &[1, tokens.len()])
        .unwrap();
    let saved = PortableModel::from_text(&model, &text).unwrap();
    let loaded = PortableModel::from_bytes(&saved.to_bytes().unwrap()).unwrap();
    let (restored, _) = loaded.restore_text().unwrap();
    assert_eq!(restored.config(), model.config());
    assert_eq!(saved.model_id().unwrap(), loaded.model_id().unwrap());
    close(
        original.logits().value().as_slice(),
        restored
            .forward_with_context(AutogradContext::no_grad(), &tokens, &[1, tokens.len()])
            .unwrap()
            .logits()
            .value()
            .as_slice(),
    );
    assert!(
        restored
            .text_output_head()
            .table()
            .is_same_node(restored.embedding().table().tensor())
    );
    let other = DecoderModel::from_parameters(
        model.config().with_attention(2, None),
        model
            .parameters()
            .iter()
            .map(|p| NamedParameter::from_tensor(p.name(), p.tensor().value_snapshot()).unwrap())
            .collect(),
    )
    .unwrap();
    assert_ne!(
        saved.model_id().unwrap(),
        PortableModel::from_text(&other, &text)
            .unwrap()
            .model_id()
            .unwrap()
    );
    assert!(
        DecoderBackbone::new(
            model.config().block_config().with_attention(2, None),
            model.blocks(),
            model.final_norm()
        )
        .is_err()
    );

    let archive = PortableModel::from_backbone(&model.backbone()).unwrap();
    let restored_backbone = PortableModel::from_bytes(&archive.to_bytes().unwrap())
        .unwrap()
        .restore_backbone()
        .unwrap();
    let embedded = model
        .embedding()
        .forward_with_context(AutogradContext::no_grad(), &tokens, &[1, tokens.len()])
        .unwrap()
        .value_snapshot();
    let mut outputs = Vec::new();
    for backbone in [model.backbone(), restored_backbone.backbone()] {
        let sequence = PreparedDecoderInput::new(
            &backbone,
            AutogradContext::no_grad(),
            TensorValue::constant(embedded.clone()).unwrap(),
            SequenceLayout::causal([1, tokens.len()]).unwrap(),
            "encoded-text-fixture",
            &[],
        )
        .unwrap();
        outputs.push(
            backbone
                .forward(sequence)
                .unwrap()
                .hidden()
                .value_snapshot(),
        );
    }
    close(outputs[0].as_slice(), outputs[1].as_slice());

    let compressed = loaded.quantize_weights(4).unwrap();
    let (decoded, _) = PortableModel::from_bytes(&compressed.to_bytes().unwrap())
        .unwrap()
        .restore_text()
        .unwrap();
    assert_eq!(decoded.config(), model.config());
    assert!(
        decoded
            .forward_with_context(AutogradContext::no_grad(), &tokens, &[1, tokens.len()])
            .unwrap()
            .logits()
            .value()
            .as_slice()
            .iter()
            .all(|x| x.is_finite())
    );
}

#[test]
fn grouped_window_model_backpropagates_through_shared_keys_and_values() {
    let (model, _) = fixture(2, Some(3));
    let loss = model.loss(&[1, 2, 3, 4], &[1, 4], &[2, 3, 4, 5]).unwrap();
    loss.backward().unwrap();
    for parameter in model.parameters() {
        let gradient = parameter.tensor().gradient().unwrap();
        assert!(gradient.as_slice().iter().all(|g| g.is_finite()));
        if parameter.name().ends_with("attention.key.weight")
            || parameter.name().ends_with("attention.value.weight")
        {
            assert!(gradient.as_slice().iter().any(|g| g.abs() > 1e-12));
        }
    }
}
