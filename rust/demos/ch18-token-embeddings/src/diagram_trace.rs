use std::error::Error;
use std::fmt::Write;

use llm_from_scratch::autograd::tensor_core::GraphRetention;
use llm_from_scratch::tensor::storage::Tensor;

use crate::{
    TABLE_SHAPE, TABLE_VALUES, TOKEN_IDS, TOKEN_SHAPE, UPSTREAM_VALUES, explicit_one_hot_product,
    known_embedding, known_table,
};

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

fn integer_list(values: &[usize]) -> String {
    values
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

// region:token-embeddings-trace
pub fn render_trace() -> Result<String, Box<dyn Error>> {
    let embedding = known_embedding();
    let output = embedding.forward(&TOKEN_IDS, &TOKEN_SHAPE)?;
    let upstream = Tensor::from_vec(vec![1, 3, 2], UPSTREAM_VALUES.to_vec())?;
    output.backward_with_seed(&upstream.view(), GraphRetention::Retain)?;
    let gradient = embedding
        .table()
        .tensor()
        .gradient()
        .expect("trainable table stores its gradient");
    let (one_hot_rows, baseline) = explicit_one_hot_product(&known_table(), &TOKEN_IDS);
    assert_eq!(baseline, output.value().as_slice());

    let mut trace = String::new();
    writeln!(trace, "TRACE token-embeddings-v1 BEGIN")?;
    writeln!(
        trace,
        "FIXTURE name=known-table-repeated-id parameter=token_embedding.weight vocabulary=4 width=2 table-shape=4x2 id-shape=1x3 output-shape=1x3x2 upstream-shape=1x3x2 gradient-shape=4x2 accumulation=scatter-add"
    )?;
    writeln!(
        trace,
        "IDS values=2,1,2 repeated-id=2 repeated-flat-positions=0,2"
    )?;

    for row in 0..TABLE_SHAPE[0] {
        let uses = TOKEN_IDS
            .iter()
            .filter(|&&id| usize::try_from(id).ok() == Some(row))
            .count();
        let state = match uses {
            0 => "unused",
            1 => "selected-once",
            _ => "selected-repeated",
        };
        let start = row * TABLE_SHAPE[1];
        writeln!(
            trace,
            "TABLE row={row} uses={uses} state={state} values={}",
            fixed_list(&TABLE_VALUES[start..start + TABLE_SHAPE[1]])
        )?;
    }

    for (flat, (&id, one_hot)) in TOKEN_IDS.iter().zip(&one_hot_rows).enumerate() {
        let start = flat * TABLE_SHAPE[1];
        writeln!(
            trace,
            "LOOKUP flat={flat} coordinate=0,{flat} id={id} sharing={} one-hot={} selected-row={id} output={} upstream={}",
            if id == 2 {
                "repeated-row"
            } else {
                "single-row"
            },
            integer_list(
                &one_hot
                    .iter()
                    .map(|&value| usize::from(value))
                    .collect::<Vec<_>>()
            ),
            fixed_list(&output.value().as_slice()[start..start + TABLE_SHAPE[1]]),
            fixed_list(&UPSTREAM_VALUES[start..start + TABLE_SHAPE[1]])
        )?;
    }

    for row in 0..TABLE_SHAPE[0] {
        let positions = TOKEN_IDS
            .iter()
            .enumerate()
            .filter_map(|(position, &id)| {
                (usize::try_from(id).ok() == Some(row)).then_some(position)
            })
            .collect::<Vec<_>>();
        let positions_text = if positions.is_empty() {
            "none".to_owned()
        } else {
            integer_list(&positions)
        };
        let contributions_text = if positions.is_empty() {
            "none".to_owned()
        } else {
            positions
                .iter()
                .map(|position| {
                    let start = position * TABLE_SHAPE[1];
                    fixed_list(&UPSTREAM_VALUES[start..start + TABLE_SHAPE[1]])
                })
                .collect::<Vec<_>>()
                .join("|")
        };
        let start = row * TABLE_SHAPE[1];
        let rule = match positions.len() {
            0 => "unused-zero",
            1 => "single-copy",
            _ => "repeated-sum",
        };
        writeln!(
            trace,
            "ROW-GRADIENT row={row} flat-positions={positions_text} contributions={contributions_text} rule={rule} accumulated={}",
            fixed_list(&gradient.as_slice()[start..start + TABLE_SHAPE[1]])
        )?;
    }
    writeln!(trace, "TRACE token-embeddings-v1 END")?;
    Ok(trace)
}
// endregion:token-embeddings-trace

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_freezes_lookup_and_repeated_row_accumulation() {
        let trace = render_trace().unwrap();
        assert!(trace.contains(
            "LOOKUP flat=0 coordinate=0,0 id=2 sharing=repeated-row one-hot=0,0,1,0 selected-row=2 output=30.000000000000,31.000000000000 upstream=1.000000000000,0.000000000000"
        ));
        assert!(trace.contains(
            "ROW-GRADIENT row=2 flat-positions=0,2 contributions=1.000000000000,0.000000000000|3.000000000000,4.000000000000 rule=repeated-sum accumulated=4.000000000000,4.000000000000"
        ));
        assert_eq!(trace.lines().count(), 15);
    }
}
