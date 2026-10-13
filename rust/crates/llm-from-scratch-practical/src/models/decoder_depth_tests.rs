//! Fixed-coordinate checks of completed residual adjoints, through the shared tail.
use super::*;
use crate::nn::depth_health::residual_sites;
use crate::nn::depth_init::{DepthInitializationBudget, FreshDepthInitialization};

#[test]
fn all_thirty_residual_site_adjoints_match_central_differences() {
    let mut probes = 0;
    for (width, heads, ff, depth, capacity) in [
        (4, 1, 4, 1, 4),
        (4, 1, 4, 2, 4),
        (4, 1, 4, 8, 4),
        (16, 2, 20, 2, 16),
    ] {
        let config =
            DecoderModelConfig::new(266, width, heads, ff, depth, capacity, 10_000.0, 1e-6);
        let mut rng = SplitMix64::from_seed(4701);
        let initialized = FreshDepthInitialization::prepare(
            config,
            DepthInitializationBudget {
                max_parameters: 8304,
                max_positions: 16,
            },
            &mut rng,
        )
        .unwrap()
        .complete()
        .unwrap();
        let model = initialized.model();
        let forward = model.forward(&[0, 99, 100, 101], &[1, 4]).unwrap();
        let sites = residual_sites(&forward);
        let loss = forward
            .logits()
            .indexed_mean_nll(2, &[99, 100, 101, 1])
            .unwrap();
        let adjoints = loss.backward_with_selected_adjoints(&sites).unwrap();
        for (site, value) in sites.iter().enumerate() {
            let scalar_loss = |delta: f64| {
                let mut values = value.value().as_slice().to_vec();
                values[0] += delta;
                let input = TensorValue::constant(Tensor::from_vec(value.shape(), values).unwrap())
                    .unwrap();
                let (_, _, logits) = model
                    .forward_residual_tail(
                        AutogradContext::no_grad(),
                        input,
                        site,
                        None,
                        None,
                        None,
                    )
                    .unwrap();
                logits
                    .indexed_mean_nll_with_context(
                        AutogradContext::no_grad(),
                        2,
                        &[99, 100, 101, 1],
                    )
                    .unwrap()
                    .value()
                    .as_slice()[0]
            };
            let numerical = (scalar_loss(1e-6) - scalar_loss(-1e-6)) / 2e-6;
            let analytical = adjoints[site].as_ref().unwrap().as_slice()[0];
            assert!(
                (numerical - analytical).abs()
                    <= 1e-7 + 1e-5 * numerical.abs().max(analytical.abs()),
                "width={width}, depth={depth}, site={site}, numerical={numerical}, adjoint={analytical}"
            );
            probes += 1;
        }
    }
    assert_eq!(probes, 30);
}
