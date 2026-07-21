use std::error::Error;

use ch09_tensor_views::{
    copying_transpose, frozen_tensor_fixture, logical_offsets, logical_values,
};
use llm_from_scratch::tensor::storage::Tensor;

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-view-output
    let tensor = frozen_tensor_fixture()?;
    let copied = copying_transpose(&tensor)?;
    let view = tensor.view();
    let reshaped = view.reshape(&[3, 2])?;
    let transposed = view.transpose(0, 1)?;
    let slice = view.slice(1, 1..3)?;
    let materialized = slice.materialize()?;

    let reshape_error = view.reshape(&[4, 2]).unwrap_err();
    let contiguity_error = transposed.reshape(&[2, 3]).unwrap_err();
    let slice_error = view.slice(1, 1..4).unwrap_err();

    let scalar = Tensor::from_vec(vec![], vec![7.0])?;
    let empty = Tensor::from_vec(vec![2, 0, 3], vec![])?;
    // endregion:learner-view-output

    println!(
        "copying transpose: allocated=true shape={:?} strides={:?} values={:?}",
        copied.shape(),
        copied.strides(),
        copied.as_slice()
    );
    println!(
        "borrowed transpose: shared=true shape={:?} strides={:?} base={} contiguous={}",
        transposed.shape(),
        transposed.strides(),
        transposed.base_offset(),
        transposed.is_contiguous()
    );
    println!(
        "borrowed transpose order: offsets={:?} values={:?}",
        logical_offsets(&transposed)?,
        logical_values(&transposed)?
    );
    println!(
        "reshape: shared=true shape={:?} strides={:?} values={:?}",
        reshaped.shape(),
        reshaped.strides(),
        logical_values(&reshaped)?
    );
    println!(
        "slice columns 1..3: shape={:?} strides={:?} base={} offsets={:?} values={:?} contiguous={}",
        slice.shape(),
        slice.strides(),
        slice.base_offset(),
        logical_offsets(&slice)?,
        logical_values(&slice)?,
        slice.is_contiguous()
    );
    println!(
        "materialized slice: independent=true shape={:?} strides={:?} values={:?}",
        materialized.shape(),
        materialized.strides(),
        materialized.as_slice()
    );
    println!("reshape error: {reshape_error}");
    println!("contiguity error: {contiguity_error}");
    println!("slice error: {slice_error}");
    println!(
        "scalar view: shape={:?} strides={:?} base={} value={:.1}",
        scalar.view().shape(),
        scalar.view().strides(),
        scalar.view().base_offset(),
        scalar.view().get(&[])?
    );
    println!(
        "empty view: shape={:?} strides={:?} values={} contiguous={}",
        empty.view().shape(),
        empty.view().strides(),
        empty.view().len(),
        empty.view().is_contiguous()
    );
    println!("chapter 10 handoff: explicit axes for broadcasting and reductions");

    Ok(())
}
