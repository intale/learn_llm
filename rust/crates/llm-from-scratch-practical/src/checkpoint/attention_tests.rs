use super::*;
use crate::{
    models::decoder::{DecoderModel, DecoderModelConfig},
    nn::init::SplitMix64,
    training::adamw::{AdamW, AdamWConfig},
};

#[test]
fn legacy_encoding_never_silently_discards_new_attention_settings() {
    for (kv, window) in [(2, None), (1, None), (2, Some(2)), (1, Some(2))] {
        let text = BpeTokenizer::from_merge_pairs(&[]).unwrap();
        let config =
            DecoderModelConfig::new(text.layout().vocabulary_size(), 4, 2, 8, 1, 4, 100.0, 1e-6)
                .with_attention(kv, window);
        let model = DecoderModel::new(config, &mut SplitMix64::from_seed(18)).unwrap();
        let optimizer = AdamW::new(AdamWConfig::new(0.001, 0.9, 0.999, 1e-8, 0.0).unwrap());
        let saved = Checkpoint::from_owned_parts(
            CheckpointTokenizer::byte_bpe(&text),
            DecoderModelState::snapshot(&model),
            optimizer.persistence_state(),
            0,
            18,
        )
        .unwrap();
        if kv == 2 && window.is_none() {
            let bytes = saved.encode().unwrap();
            assert_eq!(
                Checkpoint::from_bytes(bytes.bytes())
                    .unwrap()
                    .model_state()
                    .config(),
                config
            );
        } else {
            assert!(matches!(saved.encode(), Err(CheckpointError::Layout(_))));
        }
    }
}
