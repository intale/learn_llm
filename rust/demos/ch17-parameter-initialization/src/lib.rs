use std::error::Error;

use llm_from_scratch::autograd::tensor_core::{GraphRetention, TensorValue};
use llm_from_scratch::nn::init::{
    InitializationError, NamedParameter, NamedParameters, SplitMix64, XavierScale, xavier_scale,
};
use llm_from_scratch::tensor::storage::Tensor;

pub mod diagram_trace;

pub const FIXTURE_SEED: u64 = 17;
pub const ALTERNATE_SEED: u64 = 18;

#[derive(Clone, Debug)]
pub struct SymmetryProbe {
    pub output: f64,
    pub gradient: Tensor,
    pub columns_equal: bool,
}

#[derive(Clone, Debug)]
pub struct LearnerReport {
    pub scale: XavierScale,
    pub weights: Tensor,
    pub same_seed_reproduces: bool,
    pub different_seed_differs: bool,
    pub symmetry: SymmetryProbe,
    pub parameters: NamedParameters,
    pub clone_same_node: bool,
    pub recreated_same_node: bool,
    pub invalid_name: InitializationError,
    pub duplicate_name: InitializationError,
    pub zero_fan_in: InitializationError,
    pub rng_unchanged: bool,
}

fn tensor(shape: &[usize], values: &[f64]) -> Result<Tensor, Box<dyn Error>> {
    Ok(Tensor::from_vec(shape.to_vec(), values.to_vec())?)
}

// region:zero-symmetry-probe
pub fn zero_symmetry_probe() -> Result<SymmetryProbe, Box<dyn Error>> {
    let input = TensorValue::constant(tensor(&[1, 2], &[1.0, -1.0])?)?;
    let input_weights = TensorValue::parameter(tensor(&[2, 2], &[0.0; 4])?)?;
    let output_weights = TensorValue::constant(tensor(&[2, 1], &[1.0, 1.0])?)?;

    let hidden = input.matmul(&input_weights)?.silu()?;
    let output = hidden.matmul(&output_weights)?;
    let seed = tensor(&[1, 1], &[1.0])?;
    output.backward_with_seed(&seed.view(), GraphRetention::Retain)?;

    let output_value = output.value().as_slice()[0];
    let gradient = input_weights
        .gradient()
        .expect("the input weights are a trainable leaf");
    let columns_equal = gradient.as_slice()[0] == gradient.as_slice()[1]
        && gradient.as_slice()[2] == gradient.as_slice()[3];
    Ok(SymmetryProbe {
        output: output_value,
        gradient,
        columns_equal,
    })
}
// endregion:zero-symmetry-probe

// region:fixed-seed-parameter
fn projection_parameter(rng: &mut SplitMix64) -> Result<NamedParameter, InitializationError> {
    NamedParameter::xavier_uniform("decoder.block.0.attention.query.weight", 2, 2, rng)
}

pub fn learner_report() -> Result<LearnerReport, Box<dyn Error>> {
    let scale = xavier_scale(2, 2)?;
    let mut rng = SplitMix64::from_seed(FIXTURE_SEED);
    let projection = projection_parameter(&mut rng)?;
    let weights = projection.tensor().value();

    let mut matching_rng = SplitMix64::from_seed(FIXTURE_SEED);
    let matching = projection_parameter(&mut matching_rng)?;
    let mut alternate_rng = SplitMix64::from_seed(ALTERNATE_SEED);
    let alternate = projection_parameter(&mut alternate_rng)?;
    // endregion:fixed-seed-parameter

    // region:named-parameter-enumeration
    let token_table = NamedParameter::xavier_uniform("token_embedding.weight", 4, 2, &mut rng)?;
    let parameters = NamedParameters::try_new(vec![projection.clone(), token_table])?;

    let projection_clone = projection.clone();
    let clone_same_node = projection.tensor().is_same_node(projection_clone.tensor());
    let recreated_same_node = projection.tensor().is_same_node(matching.tensor());
    // endregion:named-parameter-enumeration

    // region:initialization-errors-example
    let state_before_errors = rng.state();
    let invalid_name =
        NamedParameter::xavier_uniform("Decoder.weight", 2, 2, &mut rng).unwrap_err();
    let zero_fan_in =
        NamedParameter::xavier_uniform("decoder.invalid.weight", 0, 2, &mut rng).unwrap_err();
    let duplicate_name =
        NamedParameters::try_new(vec![projection.clone(), projection.clone()]).unwrap_err();
    let rng_unchanged = rng.state() == state_before_errors;
    // endregion:initialization-errors-example

    Ok(LearnerReport {
        scale,
        weights,
        same_seed_reproduces: projection.tensor().value() == matching.tensor().value(),
        different_seed_differs: projection.tensor().value() != alternate.tensor().value(),
        symmetry: zero_symmetry_probe()?,
        parameters,
        clone_same_node,
        recreated_same_node,
        invalid_name,
        duplicate_name,
        zero_fan_in,
        rng_unchanged,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn learner_fixture_matches_the_contract() {
        let report = learner_report().unwrap();
        assert_eq!(report.scale.target_variance(), 0.5);
        assert_eq!(report.scale.uniform_limit(), (1.5_f64).sqrt());
        assert_eq!(report.weights.shape(), &[2, 2]);
        assert_eq!(
            report
                .weights
                .as_slice()
                .iter()
                .map(|value| format!("{value:.12}"))
                .collect::<Vec<_>>(),
            [
                "0.004950883736",
                "-0.265932089217",
                "-0.420504358848",
                "-0.676313443233",
            ]
        );
        assert!(report.same_seed_reproduces);
        assert!(report.different_seed_differs);
    }

    #[test]
    fn zero_fixture_exposes_equal_gradient_columns() {
        let probe = zero_symmetry_probe().unwrap();
        assert_eq!(probe.output.to_bits(), 0);
        assert_eq!(probe.gradient.as_slice(), &[0.5, 0.5, -0.5, -0.5]);
        assert!(probe.columns_equal);
    }

    #[test]
    fn names_identity_and_errors_are_stable() {
        let report = learner_report().unwrap();
        assert_eq!(
            report
                .parameters
                .iter()
                .map(NamedParameter::name)
                .collect::<Vec<_>>(),
            [
                "decoder.block.0.attention.query.weight",
                "token_embedding.weight",
            ]
        );
        assert!(report.clone_same_node);
        assert!(!report.recreated_same_node);
        assert!(matches!(
            report.invalid_name,
            InitializationError::InvalidNameCharacter { .. }
        ));
        assert!(matches!(
            report.duplicate_name,
            InitializationError::DuplicateName { .. }
        ));
        assert_eq!(report.zero_fan_in, InitializationError::ZeroFanIn);
        assert!(report.rng_unchanged);
    }

    #[test]
    fn trace_is_deterministic_and_has_the_frozen_record_count() {
        let first = diagram_trace::render_trace().unwrap();
        let second = diagram_trace::render_trace().unwrap();
        assert_eq!(first, second);
        assert!(first.ends_with('\n'));
        assert_eq!(first.lines().count(), 15);
        assert_eq!(first.matches("\nDISTRIBUTION ").count(), 3);
        assert_eq!(first.matches("\nHISTOGRAM ").count(), 3);
        assert_eq!(first.matches("\nPROPAGATION ").count(), 3);
    }
}
