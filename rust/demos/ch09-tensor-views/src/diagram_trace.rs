//! Locale-neutral Rust evidence for the Chapter 9 visualization.

use llm_from_scratch::tensor::view::{TensorView, TensorViewError};

use crate::{frozen_tensor_fixture, logical_offsets, logical_values};

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

fn yes_no(value: bool) -> &'static str {
    if value { "yes" } else { "no" }
}

fn view_record(
    id: &str,
    operation: &str,
    storage: &str,
    view: &TensorView<'_>,
) -> Result<String, TensorViewError> {
    Ok(format!(
        "VIEW id={id} operation={operation} storage={storage} shape={} strides={} base={} row-major-contiguous={} offsets={} values={}",
        usize_csv(view.shape()),
        usize_csv(view.strides()),
        view.base_offset(),
        yes_no(view.is_contiguous()),
        usize_csv(&logical_offsets(view)?),
        value_csv(&logical_values(view)?),
    ))
}

/// Renders the exact storage and view records consumed by the static diagram.
pub fn render_tensor_views_trace() -> Result<String, TensorViewError> {
    // region:tensor-views-trace
    let tensor = frozen_tensor_fixture()?;
    let base = tensor.view();
    let reshaped = base.reshape(&[3, 2])?;
    let transposed = base.transpose(0, 1)?;
    let slice = base.slice(1, 1..3)?;
    let slice_offsets = logical_offsets(&slice)?;
    let materialized = slice.materialize()?;
    let materialized_view = materialized.view();

    let count_error = base.reshape(&[4, 2]).unwrap_err();
    let contiguity_error = transposed.reshape(&[2, 3]).unwrap_err();
    let slice_error = base.slice(1, 1..4).unwrap_err();

    let count_status = match count_error {
        TensorViewError::ReshapeElementCountMismatch {
            current: 6,
            requested: 8,
        } => "element-count-mismatch",
        error => return Err(error),
    };
    let contiguity_status = match contiguity_error {
        TensorViewError::NonContiguousReshape => "non-row-major-contiguous",
        error => return Err(error),
    };
    let slice_status = match slice_error {
        TensorViewError::SliceEndOutOfBounds {
            axis: 1,
            end: 4,
            dimension: 3,
        } => "out-of-bounds",
        error => return Err(error),
    };

    let lines = vec![
        "TRACE tensor-views-v1 BEGIN".to_owned(),
        format!(
            "STORAGE id=base ownership=owned values={}",
            value_csv(tensor.as_slice())
        ),
        view_record("base", "identity", "base", &base)?,
        view_record("reshape", "reshape", "base", &reshaped)?,
        format!(
            "VIEW id=transpose operation=transpose axes=0,1 storage=base shape={} strides={} base={} row-major-contiguous={} offsets={} values={}",
            usize_csv(transposed.shape()),
            usize_csv(transposed.strides()),
            transposed.base_offset(),
            yes_no(transposed.is_contiguous()),
            usize_csv(&logical_offsets(&transposed)?),
            value_csv(&logical_values(&transposed)?),
        ),
        format!(
            "VIEW id=slice operation=slice axis=1 start=1 end=3 storage=base shape={} strides={} base={} row-major-contiguous={} offsets={} values={}",
            usize_csv(slice.shape()),
            usize_csv(slice.strides()),
            slice.base_offset(),
            yes_no(slice.is_contiguous()),
            usize_csv(&slice_offsets),
            value_csv(&logical_values(&slice)?),
        ),
        format!(
            "STORAGE id=materialized ownership=owned source=slice values={}",
            value_csv(materialized.as_slice())
        ),
        format!(
            "VIEW id=materialized operation=identity storage=materialized shape={} strides={} base={} row-major-contiguous={} offsets={} source-offsets={} values={}",
            usize_csv(materialized_view.shape()),
            usize_csv(materialized_view.strides()),
            materialized_view.base_offset(),
            yes_no(materialized_view.is_contiguous()),
            usize_csv(&logical_offsets(&materialized_view)?),
            usize_csv(&slice_offsets),
            value_csv(&logical_values(&materialized_view)?),
        ),
        format!(
            "ERROR operation=reshape source=base requested-shape=4,2 status={count_status} source-elements=6 requested-elements=8"
        ),
        format!(
            "ERROR operation=reshape source=transpose requested-shape=2,3 status={contiguity_status}"
        ),
        format!(
            "ERROR operation=slice source=base axis=1 start=1 end=4 status={slice_status} size=3"
        ),
        "TRACE tensor-views-v1 END".to_owned(),
    ];
    // endregion:tensor-views-trace

    Ok(format!("{}\n", lines.join("\n")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_freezes_rust_derived_view_and_copy_evidence() {
        let trace = render_tensor_views_trace().unwrap();

        assert!(trace.starts_with("TRACE tensor-views-v1 BEGIN\n"));
        assert!(trace.contains(
            "VIEW id=transpose operation=transpose axes=0,1 storage=base shape=3,2 strides=1,3 base=0 row-major-contiguous=no offsets=0,3,1,4,2,5 values=10.0,20.0,11.0,21.0,12.0,22.0"
        ));
        assert!(trace.contains(
            "VIEW id=slice operation=slice axis=1 start=1 end=3 storage=base shape=2,2 strides=3,1 base=1 row-major-contiguous=no offsets=1,2,4,5 values=11.0,12.0,21.0,22.0"
        ));
        assert!(trace.contains("source-offsets=1,2,4,5"));
        assert!(trace.ends_with("TRACE tensor-views-v1 END\n"));
        assert_eq!(trace.lines().count(), 12);
    }
}
