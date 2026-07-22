use std::error::Error;

use ch08_tensor_storage::{
    INVALID_COORDINATE, SELECTED_COORDINATE, frozen_tensor_fixture, llm_shape_history_fixture,
};
use llm_from_scratch::tensor::storage::Tensor;

fn main() -> Result<(), Box<dyn Error>> {
    // region:learner-output
    let llm_shapes = llm_shape_history_fixture()?;

    let mut tensor = frozen_tensor_fixture()?;
    let selected_offset = tensor.offset(&SELECTED_COORDINATE)?;
    let selected_value = *tensor.get(&SELECTED_COORDINATE)?;
    *tensor.get_mut(&[0, 1, 1])? = 99.0;

    let scalar = Tensor::from_vec(vec![], vec![7.0])?;
    let scalar_offset = scalar.offset(&[])?;
    let scalar_value = scalar.get(&[])?;
    let empty = Tensor::from_vec(vec![2, 0, 3], vec![])?;

    let rank_error = tensor.offset(&[1, 0]).unwrap_err();
    let bounds_error = tensor.offset(&INVALID_COORDINATE).unwrap_err();
    let overflow_error = Tensor::from_vec(vec![usize::MAX, 2], vec![]).unwrap_err();
    // endregion:learner-output

    for (label, tensor) in llm_shapes {
        println!(
            "{label}: shape={:?} strides={:?} elements={}",
            tensor.shape(),
            tensor.strides(),
            tensor.len()
        );
    }
    println!("tensor shape: {:?}", tensor.shape());
    println!("tensor strides: {:?}", tensor.strides());
    println!("flat data: {:?}", frozen_tensor_fixture()?.as_slice());
    println!(
        "coordinate {SELECTED_COORDINATE:?}: offset={selected_offset} value={selected_value:.1}"
    );
    println!("after [0, 1, 1] = 99: {:?}", tensor.as_slice());
    println!(
        "scalar: shape={:?} strides={:?} offset={scalar_offset} value={scalar_value:.1}",
        scalar.shape(),
        scalar.strides()
    );
    println!(
        "empty: shape={:?} strides={:?} values={}",
        empty.shape(),
        empty.strides(),
        empty.len()
    );
    println!("rank error: {rank_error}");
    println!("bounds error: {bounds_error}");
    println!("overflow error: {overflow_error}");
    println!("chapter 9 handoff: same storage, new shape/strides/base offset");

    Ok(())
}
