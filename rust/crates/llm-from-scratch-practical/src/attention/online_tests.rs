use super::*;
use crate::attention::causal_mask::causal_attention_with_ranges;
use crate::autograd::gradcheck::sampled_tensor_gradient_check;
use crate::autograd::tensor_core::GraphRetention;

fn tensor(shape: &[usize], values: Vec<f64>) -> Tensor {
    Tensor::from_vec(shape.to_vec(), values).unwrap()
}
fn parameter(shape: &[usize], values: Vec<f64>) -> TensorValue {
    TensorValue::parameter(tensor(shape, values)).unwrap()
}
fn close(a: &[f64], b: &[f64], tolerance: f64) {
    assert_eq!(a.len(), b.len());
    for (i, (&x, &y)) in a.iter().zip(b).enumerate() {
        assert!(
            x.is_finite() && y.is_finite() && (x - y).abs() <= tolerance,
            "coordinate {i}: {x} versus {y}"
        );
    }
}
fn fixture(batch: usize, heads: usize, kv: usize, tokens: usize) -> [TensorValue; 3] {
    let numbers = |n: usize, offset: usize| {
        (0..n)
            .map(|i| ((i * 7 + offset) % 23) as f64 / 13.0 - 0.7)
            .collect()
    };
    [
        parameter(
            &[batch, heads, tokens, 2],
            numbers(batch * heads * tokens * 2, 1),
        ),
        parameter(&[batch, kv, tokens, 2], numbers(batch * kv * tokens * 2, 3)),
        parameter(&[batch, kv, tokens, 3], numbers(batch * kv * tokens * 3, 5)),
    ]
}

/// Reference materialization deliberately uses the existing differentiable
/// gather and causal attention, including gather's shared-head gradient sum.
fn reference(inputs: &[TensorValue; 3], layout: AttentionLayout<'_>) -> TensorValue {
    let [q, k, v] = inputs;
    let shape = q.shape();
    let [batch, heads, tokens, width] = <[usize; 4]>::try_from(shape).unwrap();
    let kv = k.shape()[1];
    let indices = (0..batch)
        .flat_map(|b| {
            (0..heads).flat_map(move |h| {
                (0..tokens).map(move |t| (b * kv + h / (heads / kv)) * tokens + t)
            })
        })
        .collect::<Vec<_>>();
    let expanded = |x: &TensorValue| {
        x.reshape(&[batch * kv * tokens, x.shape()[3]])
            .unwrap()
            .gather_rows(&indices, &[batch * heads, tokens])
            .unwrap()
    };
    let lengths = (0..batch)
        .flat_map(|b| std::iter::repeat_n(layout.lengths.map_or(tokens, |l| l[b]), heads))
        .collect::<Vec<_>>();
    let starts = (0..batch)
        .flat_map(|b| {
            (0..heads).flat_map(move |_| {
                (0..tokens).map(move |t| layout.starts.map_or(0, |a| a[b * tokens + t]))
            })
        })
        .collect::<Vec<_>>();
    causal_attention_with_ranges(
        AutogradContext::recording(),
        &q.reshape(&[batch * heads, tokens, width]).unwrap(),
        &expanded(k),
        &expanded(v),
        &lengths,
        &starts,
    )
    .unwrap()
    .into_output()
    .reshape(&[batch, heads, tokens, v.shape()[3]])
    .unwrap()
}

#[test]
fn tiled_outputs_and_all_input_gradients_match_existing_attention_across_layouts() {
    for kv in [4, 2, 1] {
        for (lengths, starts) in [
            ([5, 3], [0, 0, 0, 1, 2, 0, 0, 1, 0, 0]),
            ([5, 0], [0, 0, 2, 2, 3, 0, 0, 0, 0, 0]),
        ] {
            for (br, bc) in [(1, 1), (2, 3), (3, 2), (8, 9)] {
                let inputs = fixture(2, 4, kv, 5);
                let other = inputs
                    .each_ref()
                    .map(|x| TensorValue::parameter(x.value_snapshot()).unwrap());
                let layout = AttentionLayout {
                    lengths: Some(&lengths),
                    starts: Some(&starts),
                };
                let output = tiled_causal_attention(
                    AutogradContext::recording(),
                    &inputs[0],
                    &inputs[1],
                    &inputs[2],
                    layout,
                    AttentionTiles::new(br, bc).unwrap(),
                    None,
                )
                .unwrap();
                let dense = reference(&other, layout);
                close(
                    output.output().value().as_slice(),
                    dense.value().as_slice(),
                    1e-12,
                );
                let seed = tensor(
                    &dense.shape(),
                    (0..dense.value().len())
                        .map(|i| (i % 11) as f64 / 7.0 - 0.5)
                        .collect(),
                );
                output
                    .output()
                    .backward_with_seed(&seed.view(), GraphRetention::Release)
                    .unwrap();
                dense
                    .backward_with_seed(&seed.view(), GraphRetention::Release)
                    .unwrap();
                for (actual, expected) in inputs.iter().zip(&other) {
                    close(
                        actual.gradient().unwrap().as_slice(),
                        expected.gradient().unwrap().as_slice(),
                        2e-12,
                    );
                }
                assert!(
                    inputs[1]
                        .gradient()
                        .unwrap()
                        .as_slice()
                        .iter()
                        .any(|x| x.abs() > 1e-8)
                );
                assert!(output.stats().maximum_score_tile_values <= br * bc);
            }
        }
    }
}

#[test]
fn every_small_input_coordinate_passes_finite_difference_with_shared_heads() {
    let inputs = fixture(1, 2, 1, 3);
    let tiles = AttentionTiles::new(2, 2).unwrap();
    let output = tiled_causal_attention(
        AutogradContext::recording(),
        &inputs[0],
        &inputs[1],
        &inputs[2],
        AttentionLayout::default(),
        tiles,
        None,
    )
    .unwrap();
    let seed = tensor(
        &output.output().shape(),
        (0..18).map(|i| (i % 5) as f64 / 3.0 - 0.4).collect(),
    );
    output
        .output()
        .backward_with_seed(&seed.view(), GraphRetention::Retain)
        .unwrap();
    for operand in 0..3 {
        let mut probe = inputs[operand].value_snapshot();
        let analytic = inputs[operand].gradient_snapshot().unwrap();
        let coordinates = probe.len();
        let report = sampled_tensor_gradient_check(
            &mut probe,
            &analytic.view(),
            1e-6,
            4e-6,
            coordinates,
            |changed| {
                let values = std::array::from_fn::<_, 3, _>(|i| {
                    TensorValue::constant(if i == operand {
                        changed.clone()
                    } else {
                        inputs[i].value_snapshot()
                    })
                    .unwrap()
                });
                let pass = tiled_causal_attention(
                    AutogradContext::no_grad(),
                    &values[0],
                    &values[1],
                    &values[2],
                    AttentionLayout::default(),
                    tiles,
                    None,
                )
                .unwrap();
                pass.output()
                    .value()
                    .as_slice()
                    .iter()
                    .zip(seed.as_slice())
                    .map(|(a, b)| a * b)
                    .sum()
            },
        )
        .unwrap();
        assert_eq!(report.checks.len(), coordinates);
        assert!(report.checks.iter().all(|x| x.comparison.passed));
    }
}

#[test]
fn trace_records_rescaling_before_final_division_and_skips_empty_tiles() {
    let q = parameter(&[1, 1, 4, 1], vec![1.0; 4]);
    let k = parameter(&[1, 1, 4, 1], vec![0.0, 1.0, 2.0, 3.0]);
    let v = parameter(&[1, 1, 4, 2], vec![1., 10., 2., 20., 3., 30., 4., 40.]);
    let pass = tiled_causal_attention(
        AutogradContext::no_grad(),
        &q,
        &k,
        &v,
        AttentionLayout::default(),
        AttentionTiles::new(2, 2).unwrap(),
        Some(AttentionTraceRow {
            batch: 0,
            head: 0,
            query: 3,
        }),
    )
    .unwrap();
    assert_eq!(pass.trace().len(), 2);
    let first = &pass.trace()[0];
    let last = &pass.trace()[1];
    close(
        &[first.maximum, first.normalizer, first.previous_rescale],
        &[1., 1. + (-1f64).exp(), 0.],
        1e-15,
    );
    close(
        &first.weighted_sum,
        &[(-1f64).exp() + 2., 10. * (-1f64).exp() + 20.],
        1e-14,
    );
    close(
        &[last.maximum, last.previous_rescale],
        &[3., (-2f64).exp()],
        1e-15,
    );
    close(
        &pass.output().value().as_slice()[6..8],
        &last
            .weighted_sum
            .iter()
            .map(|x| x / last.normalizer)
            .collect::<Vec<_>>(),
        1e-14,
    );
    assert!(!pass.output().tracks_gradient());
    assert_eq!(
        pass.output()
            .retained_tape_storage()
            .unwrap()
            .saved_context_values,
        0
    );
    let starts = [0, 1, 2, 3];
    let self_only = tiled_causal_attention(
        AutogradContext::recording(),
        &q,
        &k,
        &v,
        AttentionLayout {
            lengths: Some(&[4]),
            starts: Some(&starts),
        },
        AttentionTiles::new(2, 1).unwrap(),
        Some(AttentionTraceRow {
            batch: 0,
            head: 0,
            query: 3,
        }),
    )
    .unwrap();
    assert_eq!(self_only.trace().len(), 1);
    close(
        self_only.output().value().as_slice(),
        v.value().as_slice(),
        0.,
    );
}

#[test]
fn equal_and_large_scores_keep_finite_rows_without_a_global_exponential() {
    for scores in [
        vec![1000., 1000., 1000., 1000.],
        vec![1000., -1000., 999., 1001.],
    ] {
        let inputs = [
            parameter(&[1, 1, 4, 1], vec![1.; 4]),
            parameter(&[1, 1, 4, 1], scores),
            parameter(&[1, 1, 4, 2], vec![1., 2., 2., 3., 3., 4., 4., 5.]),
        ];
        let dense = reference(&inputs, AttentionLayout::default());
        let pass = tiled_causal_attention(
            AutogradContext::no_grad(),
            &inputs[0],
            &inputs[1],
            &inputs[2],
            AttentionLayout::default(),
            AttentionTiles::new(2, 1).unwrap(),
            None,
        )
        .unwrap();
        close(
            pass.output().value().as_slice(),
            dense.value().as_slice(),
            1e-12,
        );
    }
}

#[test]
fn empty_batches_inactive_rows_and_invalid_inputs_respect_boundaries() {
    let empty = fixture(0, 2, 1, 4);
    let pass = tiled_causal_attention(
        AutogradContext::recording(),
        &empty[0],
        &empty[1],
        &empty[2],
        AttentionLayout::default(),
        AttentionTiles::new(1, 1).unwrap(),
        None,
    )
    .unwrap();
    assert_eq!(pass.output().shape(), [0, 2, 4, 3]);
    assert_eq!(pass.stats().maximum_score_tile_values, 0);
    assert!(AttentionTiles::new(0, 1).is_err());
    assert!(AttentionTiles::new(1, 0).is_err());
    let x = fixture(1, 2, 1, 4);
    for layout in [
        AttentionLayout {
            lengths: Some(&[5]),
            starts: None,
        },
        AttentionLayout {
            lengths: Some(&[]),
            starts: None,
        },
        AttentionLayout {
            lengths: None,
            starts: Some(&[0, 2, 0, 0]),
        },
        AttentionLayout {
            lengths: None,
            starts: Some(&[]),
        },
    ] {
        assert!(
            tiled_causal_attention(
                AutogradContext::no_grad(),
                &x[0],
                &x[1],
                &x[2],
                layout,
                AttentionTiles::new(2, 2).unwrap(),
                None
            )
            .is_err()
        );
    }
    let pass = tiled_causal_attention(
        AutogradContext::recording(),
        &x[0],
        &x[1],
        &x[2],
        AttentionLayout {
            lengths: Some(&[0]),
            starts: None,
        },
        AttentionTiles::new(2, 2).unwrap(),
        None,
    )
    .unwrap();
    assert!(pass.output().value().as_slice().iter().all(|x| *x == 0.));
    pass.output()
        .backward_with_seed(
            &tensor(&[1, 2, 4, 3], vec![1.; 24]).view(),
            GraphRetention::Release,
        )
        .unwrap();
    assert!(
        x.iter()
            .all(|x| x.gradient().unwrap().as_slice().iter().all(|g| *g == 0.))
    );
    let bad_heads = parameter(&[1, 3, 4, 2], vec![0.; 24]);
    let two = parameter(&[1, 2, 4, 2], vec![0.; 16]);
    assert!(
        tiled_causal_attention(
            AutogradContext::no_grad(),
            &bad_heads,
            &two,
            &two,
            AttentionLayout::default(),
            AttentionTiles::new(2, 2).unwrap(),
            None
        )
        .is_err()
    );
    let unsupported = TensorExecution::cpu_with_precision(MatmulPrecision::F16F32);
    assert!(
        tiled_causal_attention(
            AutogradContext::no_grad().with_execution(&unsupported),
            &x[0],
            &x[1],
            &x[2],
            AttentionLayout::default(),
            AttentionTiles::new(2, 2).unwrap(),
            None
        )
        .unwrap_err()
        .to_string()
        .contains("requires explicit f64")
    );
}

#[test]
fn stale_parent_and_released_graph_fail_without_committing_other_gradients() {
    let inputs = fixture(1, 2, 1, 3);
    let pass = tiled_causal_attention(
        AutogradContext::recording(),
        &inputs[0],
        &inputs[1],
        &inputs[2],
        AttentionLayout::default(),
        AttentionTiles::new(2, 2).unwrap(),
        None,
    )
    .unwrap();
    let changed = inputs[1].value_snapshot();
    inputs[1].try_value_write().unwrap().commit(changed, 1);
    let seed = tensor(&pass.output().shape(), vec![1.; 18]);
    assert!(
        pass.output()
            .backward_with_seed(&seed.view(), GraphRetention::Release)
            .is_err()
    );
    assert!(
        inputs
            .iter()
            .all(|x| x.gradient().unwrap().as_slice().iter().all(|g| *g == 0.0))
    );
    let fresh = tiled_causal_attention(
        AutogradContext::recording(),
        &inputs[0],
        &inputs[1],
        &inputs[2],
        AttentionLayout::default(),
        AttentionTiles::new(2, 2).unwrap(),
        None,
    )
    .unwrap();
    fresh
        .output()
        .backward_with_seed(&seed.view(), GraphRetention::Release)
        .unwrap();
    let before = inputs.each_ref().map(|x| x.gradient_snapshot().unwrap());
    assert!(
        fresh
            .output()
            .backward_with_seed(&seed.view(), GraphRetention::Release)
            .is_err()
    );
    for (x, before) in inputs.iter().zip(&before) {
        assert_eq!(x.gradient_snapshot().as_ref(), Some(before));
    }
}

#[test]
fn retained_state_and_largest_tile_have_linear_and_fixed_bounds() {
    for tokens in [8, 16, 32] {
        let inputs = fixture(1, 4, 2, tokens);
        let pass = tiled_causal_attention(
            AutogradContext::recording(),
            &inputs[0],
            &inputs[1],
            &inputs[2],
            AttentionLayout::default(),
            AttentionTiles::new(3, 5).unwrap(),
            None,
        )
        .unwrap();
        assert_eq!(pass.stats().maximum_score_tile_values, 15);
        assert_eq!(pass.stats().row_statistic_values, 8 * tokens);
        assert!(pass.trace().is_empty());
        let retained = pass.output().retained_tape_storage().unwrap();
        let input_values = inputs.iter().map(|x| x.value().len()).sum::<usize>();
        assert_eq!(
            retained.saved_context_values,
            3 * (input_values + pass.output().value().len() + 8 * tokens)
        );
        assert_eq!(retained.nodes, 4);
    }
}

#[test]
fn nonfinite_forward_and_backward_fail_without_publishing_partial_results() {
    let huge = [
        parameter(&[1, 1, 1, 1], vec![f64::MAX]),
        parameter(&[1, 1, 1, 1], vec![2.]),
        parameter(&[1, 1, 1, 1], vec![1.]),
    ];
    assert!(
        tiled_causal_attention(
            AutogradContext::recording(),
            &huge[0],
            &huge[1],
            &huge[2],
            AttentionLayout::default(),
            AttentionTiles::new(1, 1).unwrap(),
            None
        )
        .is_err()
    );
    let inputs = [
        parameter(&[1, 1, 2, 1], vec![1., 1.]),
        parameter(&[1, 1, 2, 1], vec![0., 1.]),
        parameter(&[1, 1, 2, 1], vec![1e100, 2e100]),
    ];
    let pass = tiled_causal_attention(
        AutogradContext::recording(),
        &inputs[0],
        &inputs[1],
        &inputs[2],
        AttentionLayout::default(),
        AttentionTiles::new(1, 1).unwrap(),
        None,
    )
    .unwrap();
    let before = inputs.each_ref().map(|x| x.gradient_snapshot().unwrap());
    assert!(
        pass.output()
            .backward_with_seed(
                &tensor(&[1, 1, 2, 1], vec![f64::MAX; 2]).view(),
                GraphRetention::Release
            )
            .is_err()
    );
    assert!(!pass.output().is_released());
    for (input, before) in inputs.iter().zip(before) {
        assert_eq!(input.gradient_snapshot(), Some(before));
    }
    pass.output()
        .backward_with_seed(
            &tensor(&[1, 1, 2, 1], vec![1.; 2]).view(),
            GraphRetention::Release,
        )
        .unwrap();
}
