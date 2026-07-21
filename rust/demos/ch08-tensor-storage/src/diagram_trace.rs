//! Locale-neutral trace evidence for the Chapter 8 visualization.

use llm_from_scratch::tensor::storage::{Tensor, TensorError};

use crate::{FROZEN_SHAPE, INVALID_COORDINATE, SELECTED_COORDINATE, frozen_tensor_fixture};

fn usize_csv(values: &[usize]) -> String {
    values
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join(",")
}

fn value_csv(values: &[f64]) -> String {
    values
        .iter()
        .map(|value| format!("{value:.1}"))
        .collect::<Vec<_>>()
        .join(",")
}

fn row_csv(tensor: &Tensor, axis0: usize, axis1: usize) -> Result<String, TensorError> {
    (0..FROZEN_SHAPE[2])
        .map(|axis2| {
            tensor
                .get(&[axis0, axis1, axis2])
                .map(|value| format!("{value:.1}"))
        })
        .collect::<Result<Vec<_>, _>>()
        .map(|values| values.join(","))
}

/// Renders the exact tensor metadata and lookup consumed by the static diagram.
pub fn render_tensor_storage_trace() -> Result<String, TensorError> {
    // region:tensor-storage-trace
    let tensor = frozen_tensor_fixture()?;
    let offset = tensor.offset(&SELECTED_COORDINATE)?;
    let value = tensor.get(&SELECTED_COORDINATE)?;
    let bounds_error = match tensor.offset(&INVALID_COORDINATE) {
        Err(error) => error,
        Ok(_) => {
            return Err(TensorError::IndexOutOfBounds {
                axis: 1,
                index: 2,
                dimension: 2,
            });
        }
    };
    let shape = usize_csv(tensor.shape());
    let strides = usize_csv(tensor.strides());
    let buffer = value_csv(tensor.as_slice());
    let coordinate = usize_csv(&SELECTED_COORDINATE);
    let slice0 = format!(
        "SLICE axis0=0 row0={} row1={}",
        row_csv(&tensor, 0, 0)?,
        row_csv(&tensor, 0, 1)?
    );
    let slice1 = format!(
        "SLICE axis0=1 row0={} row1={}",
        row_csv(&tensor, 1, 0)?,
        row_csv(&tensor, 1, 1)?
    );
    let terms = SELECTED_COORDINATE
        .iter()
        .zip(tensor.strides())
        .enumerate()
        .map(|(axis, (&index, &stride))| {
            format!(
                "TERM axis={axis} index={index} stride={stride} contribution={}",
                index * stride
            )
        })
        .collect::<Vec<_>>();
    // endregion:tensor-storage-trace

    let TensorError::IndexOutOfBounds {
        axis,
        index,
        dimension,
    } = bounds_error
    else {
        unreachable!("the frozen invalid coordinate must fail its second axis");
    };

    let mut lines = vec![
        "TRACE tensor-storage-v1 BEGIN".to_owned(),
        format!(
            "TENSOR id=tiny rank={} shape={shape} strides={strides} length={}",
            tensor.rank(),
            tensor.len()
        ),
        slice0,
        slice1,
        format!("BUFFER values={buffer}"),
        format!("COORDINATE indices={coordinate}"),
    ];
    lines.extend(terms);
    lines.extend([
        format!("LOOKUP offset={offset} value={value:.1}"),
        format!(
            "BOUNDS coordinate=1,2,0 status=out-of-bounds axis={axis} index={index} size={dimension}"
        ),
        "TRACE tensor-storage-v1 END".to_owned(),
    ]);

    Ok(format!("{}\n", lines.join("\n")))
}

#[cfg(test)]
mod tests {
    use super::*;

    const EXPECTED_TRACE: &str = include_str!("../diagram-trace.txt");

    #[test]
    fn rendered_trace_matches_the_checked_in_bytes() {
        let trace = render_tensor_storage_trace().unwrap();

        assert_eq!(trace, EXPECTED_TRACE);
        assert_eq!(trace.lines().count(), 12);
        assert!(trace.ends_with('\n'));
        assert!(!trace.ends_with("\n\n"));
    }

    #[test]
    fn trace_lookup_is_computed_by_the_core_tensor() {
        let tensor = frozen_tensor_fixture().unwrap();
        let offset = tensor.offset(&SELECTED_COORDINATE).unwrap();
        let value = tensor.get(&SELECTED_COORDINATE).unwrap();
        let trace = render_tensor_storage_trace().unwrap();

        assert!(trace.contains(&format!("LOOKUP offset={offset} value={value:.1}\n")));
        assert!(
            trace.contains("BOUNDS coordinate=1,2,0 status=out-of-bounds axis=1 index=2 size=2\n")
        );
    }
}
