use super::*;

fn scalar(value: f64) -> Tensor {
    Tensor::from_vec(vec![], vec![value]).unwrap()
}

#[test]
fn checkpoint_vjp_is_pure_and_preserves_shared_parameter_contributions() {
    let x = TensorValue::parameter(scalar(2.0)).unwrap();
    let w = TensorValue::parameter(scalar(3.0)).unwrap();
    let captured = w.clone();
    let output = TensorValue::checkpoint_with_context(
        AutogradContext::recording(),
        &x,
        std::slice::from_ref(&w),
        scalar(12.0),
        0,
        move |x, context| {
            x.mul_with_context(context, x)?
                .mul_with_context(context, &captured)
        },
    )
    .unwrap();
    let total = output.add(&w).unwrap();
    let counters = total.recomputation_counters().unwrap();
    assert_eq!(counters.len(), 1);
    assert_eq!(total.retained_tape_storage().unwrap().checkpoint_nodes, 1);
    for pass in 1..=3 {
        total
            .backward_with_seed(
                &scalar(1.0).view(),
                if pass == 3 {
                    GraphRetention::Release
                } else {
                    GraphRetention::Retain
                },
            )
            .unwrap();
        assert_eq!(x.gradient().unwrap().as_slice(), [12.0 * f64::from(pass)]);
        assert_eq!(w.gradient().unwrap().as_slice(), [5.0 * f64::from(pass)]);
        assert_eq!(counters[0].completed_forwards(), pass as usize);
    }
    assert!(total.is_released());
    assert!(output.is_released());
}

#[test]
fn checkpoint_output_drift_and_reverse_overflow_do_not_commit_gradients() {
    let x = TensorValue::parameter(scalar(1.0)).unwrap();
    x.backward_with_seed(&scalar(7.0).view(), GraphRetention::Retain)
        .unwrap();
    let wrong = TensorValue::checkpoint_with_context(
        AutogradContext::recording(),
        &x,
        &[],
        scalar(1.0),
        0,
        |x, context| x.add_with_context(context, x),
    )
    .unwrap();
    assert!(matches!(
        wrong.backward(),
        Err(TensorAutodiffError::Checkpoint { .. })
    ));
    assert_eq!(x.gradient().unwrap().as_slice(), [7.0]);
    assert!(!wrong.is_released());
    let square = TensorValue::checkpoint_with_context(
        AutogradContext::recording(),
        &x,
        &[],
        scalar(1.0),
        0,
        |x, context| x.mul_with_context(context, x),
    )
    .unwrap();
    assert!(matches!(
        square.backward_with_seed(&scalar(f64::MAX).view(), GraphRetention::Release),
        Err(TensorAutodiffError::NonFinitePassAdjoint { .. })
    ));
    assert_eq!(x.gradient().unwrap().as_slice(), [7.0]);
    assert!(!square.is_released());
}

#[test]
fn checkpoint_requires_recorded_execution_and_counts_saved_tensor_payload() {
    let x = TensorValue::parameter(scalar(2.0)).unwrap();
    let execution =
        TensorExecution::cpu_with_precision(crate::tensor::precision::MatmulPrecision::F16F32);
    let checkpoint = TensorValue::checkpoint_with_context(
        AutogradContext::recording().with_execution(&execution),
        &x,
        &[],
        scalar(4.0),
        0,
        |x, context| x.mul_with_context(context, x),
    )
    .unwrap();
    assert!(matches!(
        checkpoint.backward(),
        Err(TensorAutodiffError::Checkpoint { .. })
    ));
    checkpoint.backward_with_execution(&execution).unwrap();
    assert_eq!(x.gradient().unwrap().as_slice(), [4.0]);
    let ordinary = x.mul(&x).unwrap();
    let retained = ordinary.retained_tape_storage().unwrap();
    assert_eq!(retained.nonparameter_primal_values, 1);
    assert_eq!(retained.saved_context_values, 2);
    assert_eq!(retained.tensor_payload_bytes().unwrap(), 24);
    assert_eq!(
        checkpoint
            .retained_tape_storage()
            .unwrap()
            .tensor_payload_bytes()
            .unwrap(),
        8
    );
}
