use std::error::Error;
use std::fmt::Write;

use llm_from_scratch::autograd::tensor_core::{GraphRetention, TensorValue};

use crate::{INPUT_SHAPE, INPUT_VALUES, UPSTREAM_SHAPE, UPSTREAM_VALUES, known_linear, tensor};

fn fixed(value: f64) -> String {
    format!("{value:.12}")
}

fn fixed_list(values: &[f64]) -> String {
    values
        .iter()
        .map(|value| fixed(*value))
        .collect::<Vec<_>>()
        .join(",")
}

fn shape(dimensions: &[usize]) -> String {
    dimensions
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join("x")
}

fn products(input: &[f64], output: usize, weights: &[f64], output_width: usize) -> String {
    input
        .iter()
        .enumerate()
        .map(|(feature, value)| {
            format!(
                "{}*{}",
                fixed(*value),
                fixed(weights[feature * output_width + output])
            )
        })
        .collect::<Vec<_>>()
        .join("|")
}

// region:linear-layers-trace
pub fn render_trace() -> Result<String, Box<dyn Error>> {
    let layer = known_linear(true);
    let input = TensorValue::parameter(tensor(&INPUT_SHAPE, &INPUT_VALUES))?;
    let output = layer.forward(&input)?;
    let upstream = tensor(&UPSTREAM_SHAPE, &UPSTREAM_VALUES);
    output.backward_with_seed(&upstream.view(), GraphRetention::Retain)?;
    let input_gradient = input.gradient().expect("input gradient");
    let weight_gradient = layer.weight().tensor().gradient().expect("weight gradient");
    let bias_gradient = layer
        .bias()
        .expect("affine fixture bias")
        .tensor()
        .gradient()
        .expect("bias gradient");
    let input_value = input.value();
    let output_value = output.value();
    let weight_value = layer.weight().tensor().value();
    let bias_value = layer.bias().expect("affine fixture bias").tensor().value();
    let bias_free = known_linear(false);
    let bias_free_output = bias_free
        .forward(&TensorValue::constant(tensor(&INPUT_SHAPE, &INPUT_VALUES))?)?
        .value();

    let mut trace = String::new();
    writeln!(trace, "TRACE linear-layers-v1 BEGIN")?;
    writeln!(
        trace,
        "FIXTURE name=known-affine-projection parameter-prefix=token_projection input-width={} output-width={} bias={} parameter-count={} input-shape={} output-shape={} upstream-shape={}",
        layer.input_width(),
        layer.output_width(),
        layer.has_bias(),
        layer.parameter_count(),
        shape(input_value.shape()),
        shape(output_value.shape()),
        shape(&UPSTREAM_SHAPE),
    )?;
    writeln!(trace, "INPUT values={}", fixed_list(input_value.as_slice()))?;
    for input_feature in 0..layer.input_width() {
        let start = input_feature * layer.output_width();
        writeln!(
            trace,
            "WEIGHT-ROW input-feature={input_feature} values={}",
            fixed_list(&weight_value.as_slice()[start..start + layer.output_width()])
        )?;
    }
    writeln!(trace, "BIAS values={}", fixed_list(bias_value.as_slice()))?;

    for position in 0..INPUT_SHAPE[1] {
        let input_start = position * INPUT_SHAPE[2];
        let output_start = position * layer.output_width();
        let position_input =
            &input_value.as_slice()[input_start..input_start + layer.input_width()];
        for (output_feature, &bias) in bias_value.as_slice().iter().enumerate() {
            let result = output_value.as_slice()[output_start + output_feature];
            writeln!(
                trace,
                "CELL position={position} coordinate=0,{position} output-feature={output_feature} input={} products={} weighted-sum={} bias={} result={}",
                fixed_list(position_input),
                products(
                    position_input,
                    output_feature,
                    weight_value.as_slice(),
                    layer.output_width(),
                ),
                fixed(result - bias),
                fixed(bias),
                fixed(result)
            )?;
        }
        writeln!(
            trace,
            "POSITION-GRADIENT position={position} coordinate=0,{position} upstream={} input-gradient={}",
            fixed_list(&UPSTREAM_VALUES[output_start..output_start + layer.output_width()]),
            fixed_list(&input_gradient.as_slice()[input_start..input_start + layer.input_width()])
        )?;
    }

    writeln!(
        trace,
        "WEIGHT-GRADIENT shape={} values={}",
        shape(weight_gradient.shape()),
        fixed_list(weight_gradient.as_slice())
    )?;
    writeln!(
        trace,
        "BIAS-GRADIENT shape={} values={}",
        shape(bias_gradient.shape()),
        fixed_list(bias_gradient.as_slice())
    )?;
    writeln!(
        trace,
        "POLICY affine-parameters={} bias-free-parameters={} bias-free-output={}",
        layer.parameter_count(),
        bias_free.parameter_count(),
        fixed_list(bias_free_output.as_slice())
    )?;
    writeln!(
        trace,
        "AXES input-leading={} output-leading={} preserved=true mixed-axis=feature",
        shape(&input_value.shape()[..input_value.shape().len() - 1]),
        shape(&output_value.shape()[..output_value.shape().len() - 1]),
    )?;
    writeln!(trace, "TRACE linear-layers-v1 END")?;
    Ok(trace)
}
// endregion:linear-layers-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_freezes_feature_contributions_policy_and_gradients() {
        let trace = render_trace().unwrap();
        assert!(trace.contains(
            "CELL position=0 coordinate=0,0 output-feature=0 input=1.000000000000,2.000000000000 products=1.000000000000*1.000000000000|2.000000000000*2.000000000000 weighted-sum=5.000000000000 bias=0.500000000000 result=5.500000000000"
        ));
        assert!(trace.contains(
            "POSITION-GRADIENT position=1 coordinate=0,1 upstream=0.500000000000,2.000000000000,1.000000000000 input-gradient=-0.500000000000,3.000000000000"
        ));
        assert!(trace.contains("POLICY affine-parameters=9 bias-free-parameters=6"));
        assert_eq!(trace.lines().count(), 19);
    }
}
