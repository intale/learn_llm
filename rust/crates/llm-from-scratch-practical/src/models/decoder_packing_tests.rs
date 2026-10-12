//! Private activation seam: perturb A without changing shared parameters or B.

use super::*;
use crate::autograd::tensor_core::GraphRetention;
use crate::tensor::storage::Tensor;

fn close(left: f64, right: f64) {
    assert!(left.is_finite() && right.is_finite());
    assert!((left - right).abs() <= 1e-10 + 1e-9 * left.abs().max(right.abs()));
}

struct Probe {
    logits: Vec<f64>,
    loss: f64,
    input_gradient: Vec<f64>,
    parameters: Vec<(String, Vec<f64>)>,
}

fn probe(perturb_a: bool, remove_segment_guard: bool) -> Probe {
    let model = DecoderModel::new(
        DecoderModelConfig::new(266, 8, 2, 16, 2, 16, 10_000.0, 1e-5),
        &mut SplitMix64::from_seed(42),
    )
    .unwrap();
    let mut activations: Vec<f64> = (0..48).map(|i| (i as f64 + 1.0) / 17.0).collect();
    if perturb_a {
        for (i, value) in activations[..24].iter_mut().enumerate() {
            *value = 3.0 - i as f64 / 7.0;
        }
    }
    let input =
        TensorValue::parameter(Tensor::from_vec(vec![1, 6, 8], activations).unwrap()).unwrap();
    let starts = if remove_segment_guard {
        [0; 6]
    } else {
        [0, 0, 0, 3, 3, 0]
    };
    let forward = model
        .forward_from_embedding(
            AutogradContext::recording(),
            input.clone(),
            Some(&[5]),
            Some(&starts),
            Some(&[0, 1, 2, 0, 1, 0]),
        )
        .unwrap();
    let selected = forward
        .logits()
        .reshape(&[6, 266])
        .unwrap()
        .gather_rows_with_context(AutogradContext::recording(), &[3, 4], &[2])
        .unwrap();
    let logits = selected.value_snapshot().as_slice().to_vec();
    let loss = selected.indexed_mean_nll(1, &[2, 3]).unwrap();
    let value = loss.value_snapshot().as_slice()[0];
    loss.backward().unwrap();
    let parameters = model
        .parameters()
        .iter()
        .map(|parameter| {
            (
                parameter.name().to_string(),
                parameter
                    .tensor()
                    .gradient_snapshot()
                    .unwrap()
                    .as_slice()
                    .to_vec(),
            )
        })
        .collect();
    Probe {
        logits,
        loss: value,
        input_gradient: input.gradient_snapshot().unwrap().as_slice().to_vec(),
        parameters,
    }
}

#[test]
fn b_only_loss_is_independent_of_a_activations_for_every_named_parameter() {
    let baseline = probe(false, false);
    let perturbed = probe(true, false);
    for (&left, &right) in baseline.logits.iter().zip(&perturbed.logits) {
        close(left, right);
    }
    close(baseline.loss, perturbed.loss);
    for ((name, left), (other_name, right)) in baseline.parameters.iter().zip(&perturbed.parameters)
    {
        assert_eq!(name, other_name);
        assert_eq!(left.len(), right.len());
        for (&left, &right) in left.iter().zip(right) {
            close(left, right);
        }
    }
    for result in [&baseline, &perturbed] {
        assert_eq!(&result.input_gradient[..24], &[0.0; 24]);
        assert_eq!(&result.input_gradient[40..], &[0.0; 8]);
        assert!(
            result.input_gradient[24..40]
                .iter()
                .any(|&value| value != 0.0)
        );
    }
    // Mutation control: removing the segment guard actually admits A's influence.
    let wrong = probe(false, true);
    let wrong_perturbed = probe(true, true);
    assert!(
        wrong
            .logits
            .iter()
            .zip(&wrong_perturbed.logits)
            .any(|(&a, &b)| (a - b).abs() > 1e-6)
    );
    assert!(wrong.input_gradient[..24].iter().any(|&value| value != 0.0));
}

#[test]
fn future_and_padding_activations_have_zero_derivatives_for_selected_query() {
    let model = DecoderModel::new(
        DecoderModelConfig::new(266, 8, 2, 16, 2, 16, 10_000.0, 1e-5),
        &mut SplitMix64::from_seed(7),
    )
    .unwrap();
    let input = TensorValue::parameter(
        Tensor::from_vec(vec![1, 6, 8], (0..48).map(|i| i as f64 / 11.0).collect()).unwrap(),
    )
    .unwrap();
    let forward = model
        .forward_from_embedding(
            AutogradContext::recording(),
            input.clone(),
            Some(&[5]),
            Some(&[0, 0, 0, 3, 3, 0]),
            Some(&[0, 1, 2, 0, 1, 0]),
        )
        .unwrap();
    let mut upstream = vec![0.0; 6 * 266];
    upstream[3 * 266 + 2] = 1.0;
    forward
        .logits()
        .backward_with_seed(
            &Tensor::from_vec(vec![1, 6, 266], upstream).unwrap().view(),
            GraphRetention::Release,
        )
        .unwrap();
    let gradient = input.gradient_snapshot().unwrap();
    assert_eq!(&gradient.as_slice()[..24], &[0.0; 24]);
    assert_eq!(&gradient.as_slice()[32..], &[0.0; 16]);
    assert!(
        gradient.as_slice()[24..32]
            .iter()
            .any(|&value| value != 0.0)
    );
}
