use super::*;
use crate::{
    models::{
        causal_decoder_core::DecoderBackbone,
        decoder::{DecoderModel, DecoderModelConfig},
        decoder_block::{DecoderBlock, DecoderBlockConfig},
        text_input::{TextInputEncoder, TextOutputHead},
    },
    nn::{init::SplitMix64, rmsnorm::RmsNorm},
    tensor::storage::Tensor,
};

fn model() -> DecoderModel {
    DecoderModel::new(
        DecoderModelConfig::new(258, 4, 1, 8, 2, 8, 10000.0, 1e-6),
        &mut SplitMix64::from_seed(39),
    )
    .unwrap()
}
fn input(model: &DecoderModel, context: AutogradContext) -> PreparedDecoderInput {
    TextInputEncoder::tokens(model, &[0, 99, 100], &[1, 3])
        .encode(context, &model.backbone())
        .unwrap()
}
fn bits(value: &TensorValue) -> Vec<u64> {
    value
        .value()
        .as_slice()
        .iter()
        .map(|v| v.to_bits())
        .collect()
}

#[test]
fn component_backbone_needs_no_text_model_or_tokenizer() {
    let config = DecoderBlockConfig::new(4, 1, 8, 8, 10000.0, 1e-6);
    let blocks =
        vec![DecoderBlock::new("blocks.0", config, &mut SplitMix64::from_seed(39)).unwrap()];
    let norm = RmsNorm::new("final_norm.gain", 4, 1e-6).unwrap();
    let backbone = DecoderBackbone::new(config, &blocks, &norm).unwrap();
    // These constant vectors are the established text fixture's lookup shape.
    // No second source encoder or modality is introduced.
    let text_model = model();
    let text_vectors = text_model
        .embedding()
        .forward_with_context(AutogradContext::no_grad(), &[0, 99], &[1, 2])
        .unwrap();
    let prepared = PreparedDecoderInput::new(
        &backbone,
        AutogradContext::no_grad(),
        text_vectors,
        SequenceLayout::causal([1, 2]).unwrap(),
        "text-derived constant vectors",
        &[],
    )
    .unwrap();
    let result = backbone.forward(prepared).unwrap();
    assert_eq!(result.hidden().shape(), [1, 2, 4]);
    assert!(!result.hidden().tracks_gradient());
    assert_eq!(backbone.parameters().count(), 10);
}

#[test]
fn public_composition_preserves_text_values_and_gradients() {
    let m = model();
    let ordinary = m.forward(&[0, 99, 100], &[1, 3]).unwrap();
    ordinary
        .logits()
        .indexed_mean_nll(2, &[99, 100, 1])
        .unwrap()
        .backward()
        .unwrap();
    let gradients: Vec<_> = m
        .parameters()
        .iter()
        .map(|p| p.tensor().gradient_snapshot().unwrap().as_slice().to_vec())
        .collect();
    for p in m.parameters() {
        p.tensor().zero_grad().unwrap();
    }
    let backbone = m.backbone();
    let hidden = backbone
        .forward(input(&m, AutogradContext::recording()))
        .unwrap();
    let head = m.text_output_head();
    assert!(head.table().is_same_node(m.embedding().table().tensor()));
    let logits = head
        .forward(AutogradContext::recording(), hidden.hidden())
        .unwrap();
    assert_eq!(bits(&logits), bits(ordinary.logits()));
    logits
        .indexed_mean_nll(2, &[99, 100, 1])
        .unwrap()
        .backward()
        .unwrap();
    for (p, expected) in m.parameters().iter().zip(gradients) {
        assert_eq!(p.tensor().gradient().unwrap().as_slice(), expected);
    }
    assert_eq!(m.parameter_count(), 1372);
    assert_eq!(m.parameters().len(), 20);
}

#[test]
fn tied_gradient_is_the_sum_of_lookup_and_head_paths() {
    let m = model();
    let full = m.forward(&[0, 99, 100], &[1, 3]).unwrap();
    full.logits()
        .indexed_mean_nll(2, &[99, 100, 1])
        .unwrap()
        .backward()
        .unwrap();
    let total = m.tied_embedding().tensor().gradient_snapshot().unwrap();
    for p in m.parameters() {
        p.tensor().zero_grad().unwrap();
    }
    let hidden = m
        .backbone()
        .forward(input(&m, AutogradContext::recording()))
        .unwrap();
    let fixed_table = m.tied_embedding().tensor().detach();
    TextOutputHead::new(&fixed_table)
        .forward(AutogradContext::recording(), hidden.hidden())
        .unwrap()
        .indexed_mean_nll(2, &[99, 100, 1])
        .unwrap()
        .backward()
        .unwrap();
    let lookup = m.tied_embedding().tensor().gradient_snapshot().unwrap();
    for p in m.parameters() {
        p.tensor().zero_grad().unwrap();
    }
    let encoded = input(&m, AutogradContext::recording());
    let fixed_input = PreparedDecoderInput::new(
        &m.backbone(),
        AutogradContext::recording(),
        encoded.embeddings().detach(),
        encoded.layout().clone(),
        "text lookup fixed for head-path derivative",
        &[],
    )
    .unwrap();
    let hidden = m.backbone().forward(fixed_input).unwrap();
    m.text_output_head()
        .forward(AutogradContext::recording(), hidden.hidden())
        .unwrap()
        .indexed_mean_nll(2, &[99, 100, 1])
        .unwrap()
        .backward()
        .unwrap();
    let head = m.tied_embedding().tensor().gradient_snapshot().unwrap();
    let mut max_error = 0.0_f64;
    for ((&all, &a), &b) in total
        .as_slice()
        .iter()
        .zip(lookup.as_slice())
        .zip(head.as_slice())
    {
        max_error = max_error.max((all - (a + b)).abs());
    }
    assert!(max_error < 1e-12, "gradient partition error {max_error}");
    assert!(lookup.as_slice().iter().any(|v| v.abs() > 0.0));
    assert!(head.as_slice().iter().any(|v| v.abs() > 0.0));
}

#[test]
fn layout_width_position_and_graph_policy_are_checked() {
    let m = model();
    assert!(SequenceLayout::causal([0, 2]).is_err());
    assert!(SequenceLayout::causal([usize::MAX, 2]).is_err());
    assert!(SequenceLayout::new([1, 2], vec![3], vec![0, 0], vec![0, 1]).is_err());
    assert!(SequenceLayout::new([1, 2], vec![2], vec![0, 2], vec![0, 1]).is_err());
    let wrong_width =
        TensorValue::constant(Tensor::from_vec(vec![1, 1, 3], vec![0.0; 3]).unwrap()).unwrap();
    assert_eq!(
        PreparedDecoderInput::new(
            &m.backbone(),
            AutogradContext::no_grad(),
            wrong_width,
            SequenceLayout::causal([1, 1]).unwrap(),
            "text-derived malformed width",
            &[]
        )
        .err()
        .unwrap()
        .reason(),
        "B,T,D or admitted row count"
    );
    let mut p = input(&m, AutogradContext::recording());
    p.layout.positions[0] = 8;
    assert_eq!(
        p.validate(&m.backbone()).unwrap_err().reason(),
        "position capacity"
    );
    p.layout.positions[0] = 0;
    p.context = AutogradContext::no_grad();
    assert_eq!(
        p.validate(&m.backbone()).unwrap_err().reason(),
        "graph-recording mode"
    );
}

#[test]
fn changed_backbone_and_learned_producer_are_refused_before_work() {
    let m = model();
    let other = model();
    let p = input(&m, AutogradContext::recording());
    assert_eq!(
        p.validate(&other.backbone()).unwrap_err().reason(),
        "backbone parameter node or revision"
    );
    m.blocks()[0].parameters()[0]
        .tensor()
        .set_value_revision_for_test(1);
    assert_eq!(
        p.validate(&m.backbone()).unwrap_err().reason(),
        "backbone parameter node or revision"
    );
    let fresh = model();
    let p = input(&fresh, AutogradContext::recording());
    fresh
        .tied_embedding()
        .tensor()
        .set_value_revision_for_test(1);
    assert_eq!(
        fresh.backbone().forward(p).err().unwrap().to_string(),
        "prepared decoder input: producer parameter revision"
    );
}

#[test]
fn descriptive_provenance_cannot_authorize_replaced_vectors() {
    let m = model();
    let other = model();
    let mut p = input(&m, AutogradContext::recording());
    p.embedding = input(&other, AutogradContext::recording()).embedding;
    assert_eq!(
        m.backbone().forward(p).err().unwrap().to_string(),
        "prepared decoder input: prepared hidden tensor identity or revision"
    );
    let mut p = input(&m, AutogradContext::recording());
    p.provenance = "another descriptive label".into();
    assert!(p.validate(&m.backbone()).is_ok());
}
