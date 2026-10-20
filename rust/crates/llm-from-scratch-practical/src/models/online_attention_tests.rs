use crate::{
    attention::online::AttentionTiles,
    autograd::tensor_core::{AutogradContext, GraphRetention, TensorValue},
    models::{
        decoder::{DecoderModel, DecoderModelConfig},
        prepared_decoder_input::{PreparedDecoderInput, SequenceLayout},
    },
    nn::init::SplitMix64,
    tensor::{execution::TensorExecution, storage::Tensor},
    tokenizer::bpe::BpeTokenizer,
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
        100.,
        1e-6,
    )
    .with_attention(kv, window);
    (
        DecoderModel::new(config, &mut SplitMix64::from_seed(19)).unwrap(),
        tokenizer,
    )
}
fn close(a: &[f64], b: &[f64], tol: f64) {
    assert_eq!(a.len(), b.len());
    for (i, (&a, &b)) in a.iter().zip(b).enumerate() {
        assert!(
            a.is_finite() && b.is_finite() && (a - b).abs() <= tol,
            "coordinate {i}: {a} versus {b}"
        );
    }
}

#[test]
fn text_loss_and_every_model_gradient_match_reference_for_head_window_and_tile_choices() {
    for kv in [4, 2, 1] {
        for window in [None, Some(1), Some(3)] {
            for (br, bc) in [(1, 1), (2, 3), (9, 8)] {
                let (dense, text) = fixture(kv, window);
                let (online, _) = fixture(kv, window);
                let tokens = text.encode_utf8_document("abcd");
                let length = tokens.len() - 1;
                let execution = TensorExecution::cpu()
                    .with_tiled_attention(AttentionTiles::new(br, bc).unwrap());
                let reference = dense
                    .loss(&tokens[..length], &[1, length], &tokens[1..])
                    .unwrap();
                let actual = online
                    .loss_with_context(
                        AutogradContext::recording().with_execution(&execution),
                        &tokens[..length],
                        &[1, length],
                        &tokens[1..],
                    )
                    .unwrap();
                close(
                    actual.value().as_slice(),
                    reference.value().as_slice(),
                    1e-10,
                );
                reference.backward().unwrap();
                actual
                    .backward_with_seed_and_execution(
                        &Tensor::from_vec(vec![], vec![1.]).unwrap().view(),
                        GraphRetention::Release,
                        &execution,
                    )
                    .unwrap();
                for (actual, reference) in online.parameters().iter().zip(dense.parameters()) {
                    assert_eq!(actual.name(), reference.name());
                    close(
                        actual.tensor().gradient().unwrap().as_slice(),
                        reference.tensor().gradient().unwrap().as_slice(),
                        2e-9,
                    );
                }
                assert!(
                    online
                        .text_output_head()
                        .table()
                        .is_same_node(online.embedding().table().tensor())
                );
            }
        }
    }
}

#[test]
fn packed_padded_text_vectors_keep_source_independent_hidden_features_and_gradients() {
    let (dense, text) = fixture(2, Some(2));
    let (online, _) = fixture(2, Some(2));
    let ids = [
        text.encode_utf8_document("abcd"),
        text.encode_utf8_document("ab  "),
    ]
    .concat();
    let encoded = dense
        .embedding()
        .forward_with_context(AutogradContext::no_grad(), &ids, &[2, 6])
        .unwrap()
        .value_snapshot();
    let mut hidden = Vec::new();
    let mut feature_gradients = Vec::new();
    let execution = TensorExecution::cpu().with_tiled_attention(AttentionTiles::new(2, 3).unwrap());
    for (model, context) in [
        (&dense, AutogradContext::recording()),
        (
            &online,
            AutogradContext::recording().with_execution(&execution),
        ),
    ] {
        let vectors = TensorValue::parameter(encoded.clone()).unwrap();
        let layout = SequenceLayout::new(
            [2, 6],
            vec![6, 4],
            vec![0, 0, 2, 2, 2, 5, 0, 0, 0, 0, 0, 0],
            vec![0, 1, 0, 1, 2, 0, 0, 1, 2, 3, 0, 0],
        )
        .unwrap();
        let backbone = model.backbone();
        let prepared = PreparedDecoderInput::new(
            &backbone,
            context,
            vectors.clone(),
            layout,
            "encoded-text-vectors",
            &[],
        )
        .unwrap();
        let forward = backbone.forward(prepared).unwrap();
        if context.execution().attention_tiles().is_some() {
            assert!(forward.blocks().is_empty());
        }
        hidden.push(forward.hidden().value_snapshot());
        let seed = Tensor::from_vec(
            forward.hidden().shape(),
            (0..96).map(|i| (i % 7) as f64 / 5. - 0.4).collect(),
        )
        .unwrap();
        forward
            .hidden()
            .backward_with_seed_and_execution(
                &seed.view(),
                GraphRetention::Release,
                &context.execution(),
            )
            .unwrap();
        feature_gradients.push(vectors.gradient_snapshot().unwrap());
    }
    close(hidden[0].as_slice(), hidden[1].as_slice(), 1e-10);
    close(
        feature_gradients[0].as_slice(),
        feature_gradients[1].as_slice(),
        2e-9,
    );
    for (a, b) in dense
        .backbone()
        .parameters()
        .zip(online.backbone().parameters())
    {
        close(
            a.tensor().gradient().unwrap().as_slice(),
            b.tensor().gradient().unwrap().as_slice(),
            2e-9,
        );
    }
}
