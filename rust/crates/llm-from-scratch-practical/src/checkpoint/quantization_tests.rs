use super::*;
use crate::{
    models::decoder::{DecoderModel, DecoderModelConfig},
    nn::init::SplitMix64,
    tokenizer::bpe::BpeTokenizer,
};

fn source() -> PortableModel {
    let tokenizer = BpeTokenizer::from_merge_pairs(&[]).unwrap();
    let model = DecoderModel::new(
        DecoderModelConfig::new(
            tokenizer.layout().vocabulary_size(),
            4,
            1,
            8,
            1,
            8,
            10_000.0,
            1e-6,
        ),
        &mut SplitMix64::from_seed(39),
    )
    .unwrap();
    PortableModel::from_text(&model, &tokenizer).unwrap()
}

#[test]
fn packed_roundtrip_reconstructs_every_matrix_and_retains_one_tied_table() {
    let source = source();
    let original_id = source.model_id().unwrap();
    let original_bytes = source.to_bytes().unwrap();
    let quantized = source.quantize_weights(3).unwrap();
    assert_ne!(quantized.model_id().unwrap(), original_id);
    assert_eq!(source.model_id().unwrap(), original_id);
    let original = PortableModel::from_bytes(&original_bytes).unwrap();
    assert_eq!(
        source.configuration().unwrap(),
        original.configuration().unwrap()
    );
    assert_eq!(source.tensors.len(), original.tensors.len());
    for (name, before) in &original.tensors {
        let after = &source.tensors[name];
        assert_eq!(after.dtype, before.dtype);
        assert_eq!(after.shape, before.shape);
        assert_eq!(after.bytes, before.bytes);
    }
    let loaded = PortableModel::from_bytes(&quantized.to_bytes().unwrap()).unwrap();
    assert_eq!(loaded.model_id().unwrap(), quantized.model_id().unwrap());
    assert_eq!(loaded.quantization_group_size().unwrap(), Some(3));
    let (restored, _) = loaded.restore_text().unwrap();
    assert!(
        restored
            .text_output_head()
            .table()
            .is_same_node(restored.embedding().table().tensor())
    );
    for (before, after) in source
        .parameters()
        .unwrap()
        .iter()
        .zip(restored.parameters())
    {
        assert_eq!(before.name(), after.name());
        let value = before.tensor().value();
        let expected = if value.shape().len() == 2 {
            GroupedI4Matrix::quantize(&value, 3)
                .unwrap()
                .dequantize()
                .unwrap()
        } else {
            value.clone()
        };
        assert_eq!(*after.tensor().value(), expected);
    }
    for (name, data) in &source.tensors {
        if !name.ends_with(".weight") {
            let saved = &loaded.tensors[name];
            assert_eq!(saved.dtype, data.dtype);
            assert_eq!(saved.shape, data.shape);
            assert_eq!(saved.bytes, data.bytes);
        }
    }
    let counts = loaded.weight_storage().unwrap();
    assert_eq!(
        counts.matrices,
        source
            .parameters()
            .unwrap()
            .iter()
            .filter(|p| p.tensor().value().shape().len() == 2)
            .count()
    );
    assert_eq!(
        counts.payload_bytes(),
        loaded
            .tensors
            .values()
            .map(|v| v.bytes.len())
            .sum::<usize>()
    );
    assert!(loaded.quantize_weights(2).is_err());
    assert!(source.quantize_weights(0).is_err());
}

#[test]
fn tokenizer_free_backbone_uses_the_same_quantized_representation() {
    let source = source();
    let (model, _) = source.restore_text().unwrap();
    let archive = PortableModel::from_backbone(&model.backbone())
        .unwrap()
        .quantize_weights(3)
        .unwrap();
    let loaded = PortableModel::from_bytes(&archive.to_bytes().unwrap()).unwrap();
    assert!(
        !loaded
            .tensor_names()
            .any(|name| name.starts_with("assets.text."))
    );
    assert!(loaded.restore_text().is_err());
    let restored = loaded.restore_backbone().unwrap();
    assert_eq!(restored.backbone().blocks().len(), 1);
    assert_eq!(loaded.weight_storage().unwrap().matrices, 7);
}

#[test]
fn malformed_metadata_dtypes_codes_scales_and_tensor_sets_fail() {
    let reject = |mutate: fn(&mut PortableModel)| {
        let mut archive = source().quantize_weights(3).unwrap();
        mutate(&mut archive);
        assert!(archive.validate().is_err());
    };
    reject(|a| {
        a.settings.set("quantization.scheme", "unknown").unwrap();
    });
    reject(|a| {
        a.settings.set("quantization.group_size", 0_i64).unwrap();
    });
    reject(|a| {
        a.settings.set("quantization.extra", true).unwrap();
    });
    reject(|a| {
        a.tensors.get_mut("token_embedding.weight").unwrap().bytes[0] = 0x88;
    });
    reject(|a| {
        a.tensors.get_mut("token_embedding.weight").unwrap().dtype = Dtype::I8;
    });
    reject(|a| {
        a.tensors
            .remove("quantization.scales.token_embedding.weight");
    });
    reject(|a| {
        a.tensors
            .get_mut("quantization.shape.token_embedding.weight")
            .unwrap()
            .shape = vec![1, 2];
    });
    reject(|a| {
        a.tensors.insert(
            "quantization.scales.token_embedding.weight".into(),
            NamedData::f64(vec![1], &[f64::NAN]),
        );
    });
    reject(|a| {
        a.tensors
            .get_mut("token_embedding.weight")
            .unwrap()
            .bytes
            .pop();
    });
    reject(|a| {
        a.tensors.insert("extra".into(), NamedData::u64(&[0]));
    });
}

#[test]
fn packed_model_is_refused_inside_a_checksum_valid_resume_envelope() {
    use crate::checkpoint::{
        portable::{encode, logical_digest},
        resume::TrainingCheckpoint,
    };
    use std::collections::BTreeMap;
    let model = source().quantize_weights(4).unwrap();
    let mut metadata = BTreeMap::from([
        ("model.conf".into(), model.configuration().unwrap()),
        ("model.sha256".into(), model.model_id().unwrap()),
        (
            "resume.conf".into(),
            config_lib::Config::new().serialize().unwrap(),
        ),
    ]);
    metadata.insert(
        "resume.sha256".into(),
        logical_digest(
            b"learn-llm-training-checkpoint-v1\0",
            &metadata,
            &model.tensors,
        ),
    );
    let bytes = encode(&model.tensors, metadata).unwrap();
    let error = match TrainingCheckpoint::from_bytes(&bytes) {
        Ok(_) => panic!("lossy weights must not enter exact training continuation"),
        Err(error) => error,
    };
    assert_eq!(
        error.to_string(),
        "exact training resume requires unquantized model weights"
    );
}
