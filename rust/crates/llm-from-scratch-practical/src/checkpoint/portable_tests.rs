use super::*;
use crate::{autograd::tensor_core::AutogradContext, nn::init::SplitMix64};

fn fixture(epsilon: f64) -> (DecoderModel, BpeTokenizer) {
    let tokenizer = BpeTokenizer::from_merge_pairs(&[]).unwrap();
    let config = DecoderModelConfig::new(
        tokenizer.layout().vocabulary_size(),
        2,
        1,
        4,
        1,
        4,
        f64::from_bits(10000_f64.to_bits() + 1),
        epsilon,
    );
    let model = DecoderModel::new(config, &mut SplitMix64::from_seed(15)).unwrap();
    (model, tokenizer)
}

#[test]
fn round_trip_preserves_numeric_setting_bits_and_one_live_tied_table() {
    for epsilon in [-0.0, 1e-6] {
        let (model, tokenizer) = fixture(epsilon);
        let saved = PortableModel::from_text(&model, &tokenizer).unwrap();
        let loaded = PortableModel::from_bytes(&saved.to_bytes().unwrap()).unwrap();
        let (restored, restored_tokenizer) = loaded.restore_text().unwrap();
        assert_eq!(saved.model_id().unwrap(), loaded.model_id().unwrap());
        assert_eq!(
            model.config().rms_epsilon().to_bits(),
            restored.config().rms_epsilon().to_bits()
        );
        assert_eq!(
            model.config().rope_base().to_bits(),
            restored.config().rope_base().to_bits()
        );
        assert_eq!(
            DecoderModelState::snapshot(&model).bit_pattern(),
            DecoderModelState::snapshot(&restored).bit_pattern()
        );
        assert_eq!(
            tokenizer.encode_utf8_document("ab"),
            restored_tokenizer.encode_utf8_document("ab")
        );
        assert!(
            restored
                .text_output_head()
                .table()
                .is_same_node(restored.embedding().table().tensor())
        );
        assert_eq!(
            restored
                .parameters()
                .iter()
                .filter(|p| p
                    .tensor()
                    .is_same_node(restored.embedding().table().tensor()))
                .count(),
            1
        );
    }
}

#[test]
fn restored_text_gradients_match_both_tied_paths() {
    let (original, tokenizer) = fixture(1e-6);
    let saved = PortableModel::from_text(&original, &tokenizer).unwrap();
    let (restored, _) = PortableModel::from_bytes(&saved.to_bytes().unwrap())
        .unwrap()
        .restore_text()
        .unwrap();
    for model in [&original, &restored] {
        model
            .loss_with_context(AutogradContext::recording(), &[0, 99], &[1, 2], &[99, 1])
            .unwrap()
            .backward()
            .unwrap();
    }
    for (left, right) in original.parameters().iter().zip(restored.parameters()) {
        assert_eq!(left.name(), right.name());
        assert!(
            left.tensor()
                .gradient()
                .unwrap()
                .as_slice()
                .iter()
                .map(|v| v.to_bits())
                .eq(right
                    .tensor()
                    .gradient()
                    .unwrap()
                    .as_slice()
                    .iter()
                    .map(|v| v.to_bits()))
        );
    }
}

#[test]
fn backbone_round_trip_requires_no_vocabulary_or_tokenizer() {
    let (model, _) = fixture(1e-6);
    let saved = PortableModel::from_backbone(&model.backbone()).unwrap();
    assert!(
        !saved
            .tensor_names()
            .any(|name| name.starts_with("assets.") || name.contains("embedding"))
    );
    let config = saved.configuration().unwrap();
    assert!(
        !config.contains("vocabulary")
            && !config.contains("tokenizer")
            && !config.contains("encoder")
            && !config.contains("[head]")
    );
    let loaded = PortableModel::from_bytes(&saved.to_bytes().unwrap()).unwrap();
    let restored = loaded.restore_backbone().unwrap();
    assert_eq!(
        restored.backbone().parameters().count(),
        model.backbone().parameters().count()
    );
    assert_eq!(saved.model_id().unwrap(), loaded.model_id().unwrap());
    assert!(loaded.restore_text().is_err());
}

#[test]
fn component_alias_dtype_shape_and_nonfinite_weights_are_refused() {
    let (model, tokenizer) = fixture(1e-6);
    let fresh = || PortableModel::from_text(&model, &tokenizer).unwrap();
    let mut alias = fresh();
    alias
        .settings
        .set("head.alias", "independent-head.weight")
        .unwrap();
    assert!(alias.restore_text().is_err());
    let mut dtype = fresh();
    dtype
        .tensors
        .get_mut("token_embedding.weight")
        .unwrap()
        .dtype = Dtype::I64;
    assert!(dtype.restore_text().is_err());
    let mut shape = fresh();
    shape
        .tensors
        .get_mut("token_embedding.weight")
        .unwrap()
        .shape = vec![516];
    assert!(shape.restore_text().is_err());
    let mut nonfinite = fresh();
    nonfinite
        .tensors
        .get_mut("token_embedding.weight")
        .unwrap()
        .bytes[..8]
        .copy_from_slice(&f64::INFINITY.to_le_bytes());
    assert!(nonfinite.restore_text().is_err());
    let mut missing = fresh();
    missing.tensors.remove(MERGES);
    assert!(missing.restore_text().is_err());
    let mut huge = fresh();
    huge.settings.set("backbone.layers", i64::MAX).unwrap();
    assert!(huge.restore_text().is_err());
}
