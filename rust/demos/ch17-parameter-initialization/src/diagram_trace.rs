use std::error::Error;
use std::fmt::Write;

use llm_from_scratch::nn::init::{NamedParameter, SplitMix64, xavier_scale};

use crate::{ALTERNATE_SEED, FIXTURE_SEED};

const WIDTH: usize = 64;
const SAMPLE_COUNT: usize = WIDTH * WIDTH;
const EDGES: [f64; 10] = [
    -0.45, -0.35, -0.25, -0.15, -0.05, 0.05, 0.15, 0.25, 0.35, 0.45,
];

#[derive(Clone, Debug)]
struct Statistics {
    minimum: f64,
    maximum: f64,
    mean: f64,
    variance: f64,
}

#[derive(Clone, Debug)]
struct Histogram {
    counts: [usize; 9],
    underflow: usize,
    overflow: usize,
}

fn normalized_zero(value: f64) -> f64 {
    if value == 0.0 { 0.0 } else { value }
}

fn fixed(value: f64) -> String {
    format!("{:.12}", normalized_zero(value))
}

fn fixed_list(values: &[f64]) -> String {
    values
        .iter()
        .map(|value| fixed(*value))
        .collect::<Vec<_>>()
        .join(",")
}

fn integer_list(values: &[usize]) -> String {
    values
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

fn statistics(values: &[f64]) -> Statistics {
    let minimum = values.iter().copied().fold(f64::INFINITY, f64::min);
    let maximum = values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values
        .iter()
        .map(|value| {
            let centered = value - mean;
            centered * centered
        })
        .sum::<f64>()
        / values.len() as f64;
    Statistics {
        minimum,
        maximum,
        mean,
        variance,
    }
}

fn histogram(values: &[f64]) -> Histogram {
    let mut histogram = Histogram {
        counts: [0; 9],
        underflow: 0,
        overflow: 0,
    };
    for &value in values {
        if value < EDGES[0] {
            histogram.underflow += 1;
            continue;
        }
        if value > EDGES[EDGES.len() - 1] {
            histogram.overflow += 1;
            continue;
        }
        let bin = (0..histogram.counts.len())
            .find(|&index| {
                value >= EDGES[index]
                    && (value < EDGES[index + 1]
                        || (index + 1 == EDGES.len() - 1 && value == EDGES[index + 1]))
            })
            .expect("in-range value belongs to one bin");
        histogram.counts[bin] += 1;
    }
    histogram
}

fn percentages(counts: &[usize]) -> Vec<f64> {
    counts
        .iter()
        .map(|count| *count as f64 * 100.0 / SAMPLE_COUNT as f64)
        .collect()
}

fn expected_variances(multiplier: f64) -> [f64; 5] {
    let mut values = [1.0; 5];
    for depth in 1..values.len() {
        values[depth] = values[depth - 1] * multiplier;
    }
    values
}

fn distribution_line(kind: &str, seed: &str, limit: f64, stats: &Statistics) -> String {
    format!(
        "DISTRIBUTION kind={kind} seed={seed} limit={} min={} max={} mean={} variance={}",
        fixed(limit),
        fixed(stats.minimum),
        fixed(stats.maximum),
        fixed(stats.mean),
        fixed(stats.variance),
    )
}

fn histogram_line(kind: &str, histogram: &Histogram) -> String {
    format!(
        "HISTOGRAM kind={kind} counts={} bar-percent={} underflow={} overflow={}",
        integer_list(&histogram.counts),
        fixed_list(&percentages(&histogram.counts)),
        histogram.underflow,
        histogram.overflow,
    )
}

// region:parameter-initialization-trace
pub fn render_trace() -> Result<String, Box<dyn Error>> {
    let scale = xavier_scale(WIDTH, WIDTH)?;
    let mut rng = SplitMix64::from_seed(FIXTURE_SEED);
    let xavier = NamedParameter::xavier_uniform("diagnostic.xavier", WIDTH, WIDTH, &mut rng)?
        .tensor()
        .value()
        .into_vec();
    let oversized: Vec<_> = xavier.iter().map(|value| value * 2.0).collect();
    let zero = vec![0.0; SAMPLE_COUNT];

    let zero_statistics = statistics(&zero);
    let oversized_statistics = statistics(&oversized);
    let xavier_statistics = statistics(&xavier);
    let zero_histogram = histogram(&zero);
    let oversized_histogram = histogram(&oversized);
    let xavier_histogram = histogram(&xavier);

    let mut same_seed_rng = SplitMix64::from_seed(FIXTURE_SEED);
    let same_seed =
        NamedParameter::xavier_uniform("diagnostic.same", WIDTH, WIDTH, &mut same_seed_rng)?
            .tensor()
            .value()
            .into_vec();
    let mut alternate_rng = SplitMix64::from_seed(ALTERNATE_SEED);
    let alternate =
        NamedParameter::xavier_uniform("diagnostic.alternate", WIDTH, WIDTH, &mut alternate_rng)?
            .tensor()
            .value()
            .into_vec();

    let mut trace = String::new();
    writeln!(trace, "TRACE parameter-initialization-v1 BEGIN")?;
    writeln!(
        trace,
        "FIXTURE name=fixed-seed-width64 generator=splitmix64 mapping=top53-affine seed=17 shape=64x64 samples=4096 fan-in=64 fan-out=64 statistic=population-two-pass layers=0,1,2,3,4 propagation=expected-linear-independent input-variance=1.000000000000"
    )?;
    writeln!(
        trace,
        "BINNING edges={} width=0.100000000000 closure=left-closed-right-open-last-closed",
        fixed_list(&EDGES)
    )?;
    writeln!(
        trace,
        "{}",
        distribution_line("zero", "none", 0.0, &zero_statistics)
    )?;
    writeln!(trace, "{}", histogram_line("zero", &zero_histogram))?;
    writeln!(
        trace,
        "{}",
        distribution_line(
            "oversized",
            "17",
            scale.uniform_limit() * 2.0,
            &oversized_statistics,
        )
    )?;
    writeln!(
        trace,
        "{}",
        histogram_line("oversized", &oversized_histogram)
    )?;
    writeln!(
        trace,
        "{}",
        distribution_line("xavier", "17", scale.uniform_limit(), &xavier_statistics)
    )?;
    writeln!(trace, "{}", histogram_line("xavier", &xavier_histogram))?;
    writeln!(
        trace,
        "PAIRING seed=17 base-draws-equal=yes oversized-to-xavier-limit=2.000000000000"
    )?;
    writeln!(
        trace,
        "PROPAGATION kind=zero variances={}",
        fixed_list(&expected_variances(0.0))
    )?;
    writeln!(
        trace,
        "PROPAGATION kind=oversized variances={}",
        fixed_list(&expected_variances(4.0))
    )?;
    writeln!(
        trace,
        "PROPAGATION kind=xavier variances={}",
        fixed_list(&expected_variances(1.0))
    )?;
    writeln!(
        trace,
        "REPRODUCIBILITY seed=17 same-seed-equal={} alternate-seed=18 alternate-seed-different={}",
        if xavier == same_seed { "yes" } else { "no" },
        if xavier != alternate { "yes" } else { "no" },
    )?;
    writeln!(trace, "TRACE parameter-initialization-v1 END")?;
    Ok(trace)
}
// endregion:parameter-initialization-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_statistics_histograms_and_variance_rail_match() {
        let trace = render_trace().unwrap();
        assert!(trace.contains(
            "DISTRIBUTION kind=xavier seed=17 limit=0.216506350946 min=-0.216490455462 max=0.216323818551 mean=-0.003369028566 variance=0.015801410985"
        ));
        assert!(trace.contains("HISTOGRAM kind=xavier counts=0,0,674,962,919,930,611,0,0"));
        assert!(
            trace.contains("HISTOGRAM kind=oversized counts=409,498,482,472,469,445,476,443,402")
        );
        assert!(trace.contains(
            "PROPAGATION kind=oversized variances=1.000000000000,4.000000000000,16.000000000000,64.000000000000,256.000000000000"
        ));
    }
}
