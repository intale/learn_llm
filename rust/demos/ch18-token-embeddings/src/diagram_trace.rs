use std::error::Error;
use std::fmt::Write;

use llm_from_scratch::autograd::tensor_core::GraphRetention;
use llm_from_scratch::tensor::storage::Tensor;

use crate::{
    TABLE_SHAPE, TOKEN_IDS, TOKEN_SHAPE, UPSTREAM_VALUES, explicit_one_hot_product,
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

fn token_list(values: &[u32]) -> String {
    values
        .iter()
        .map(u32::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

fn shape(shape: &[usize]) -> String {
    integer_list(shape).replace(',', "x")
}

fn row_major_coordinate(mut flat: usize, shape: &[usize]) -> Vec<usize> {
    let mut coordinate = vec![0; shape.len()];
    for axis in (0..shape.len()).rev() {
        coordinate[axis] = flat % shape[axis];
        flat /= shape[axis];
    }
    assert_eq!(flat, 0, "flat token position must fit its declared shape");
    coordinate
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
    let mut repeated_ids = TOKEN_IDS
        .iter()
        .copied()
        .filter(|candidate| TOKEN_IDS.iter().filter(|id| *id == candidate).count() > 1)
        .collect::<Vec<_>>();
    repeated_ids.sort_unstable();
    repeated_ids.dedup();
    assert_eq!(
        repeated_ids.len(),
        1,
        "fixture must contain one repeated token ID"
    );
    let repeated_id = repeated_ids[0];
    let repeated_positions = TOKEN_IDS
        .iter()
        .enumerate()
        .filter_map(|(position, id)| (*id == repeated_id).then_some(position))
        .collect::<Vec<_>>();

    let mut trace = String::new();
    writeln!(trace, "TRACE token-embeddings-v1 BEGIN")?;
    writeln!(
        trace,
        "FIXTURE name=known-table-repeated-id parameter={} vocabulary={} width={} table-shape={} id-shape={} output-shape={} upstream-shape={} gradient-shape={} accumulation=scatter-add",
        embedding.table().name(),
        embedding.vocabulary_size(),
        embedding.embedding_width(),
        shape(embedding.table().tensor().shape().as_slice()),
        shape(&TOKEN_SHAPE),
        shape(output.shape().as_slice()),
        shape(upstream.shape()),
        shape(gradient.shape()),
    )?;
    writeln!(
        trace,
        "IDS values={} repeated-id={repeated_id} repeated-flat-positions={}",
        token_list(&TOKEN_IDS),
        integer_list(&repeated_positions),
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
        let start = row * embedding.embedding_width();
        writeln!(
            trace,
            "TABLE row={row} uses={uses} state={state} values={}",
            fixed_list(
                &embedding.table().tensor().value().as_slice()
                    [start..start + embedding.embedding_width()]
            )
        )?;
    }

    for (flat, (&id, one_hot)) in TOKEN_IDS.iter().zip(&one_hot_rows).enumerate() {
        let start = flat * embedding.embedding_width();
        let coordinate = row_major_coordinate(flat, &TOKEN_SHAPE);
        let uses = TOKEN_IDS
            .iter()
            .filter(|&&candidate| candidate == id)
            .count();
        writeln!(
            trace,
            "LOOKUP flat={flat} coordinate={} id={id} sharing={} one-hot={} selected-row={id} output={} upstream={}",
            integer_list(&coordinate),
            if uses > 1 {
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
            fixed_list(&output.value().as_slice()[start..start + embedding.embedding_width()]),
            fixed_list(&UPSTREAM_VALUES[start..start + embedding.embedding_width()])
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
        let start = row * embedding.embedding_width();
        let rule = match positions.len() {
            0 => "unused-zero",
            1 => "single-copy",
            _ => "repeated-sum",
        };
        writeln!(
            trace,
            "ROW-GRADIENT row={row} flat-positions={positions_text} contributions={contributions_text} rule={rule} accumulated={}",
            fixed_list(&gradient.as_slice()[start..start + embedding.embedding_width()])
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
        assert_eq!(trace, include_str!("../diagram-trace.txt"));
    }
}
