#![cfg(feature = "cuda")]
use llm_from_scratch_practical::autograd::tensor_core::{AutogradContext, TensorValue};
use llm_from_scratch_practical::tensor::{
    execution::{ExecutionDevice, TensorExecution},
    matmul::matmul_with_transpose,
    ops::{max_axis, mean_axis, sum_axis},
    storage::Tensor,
};
use practical_ch11_accelerated_tensor_execution::{
    compare_snapshots, compare_tensor, model_fixture, snapshot_with_model,
};

#[test]
#[ignore = "requires explicitly provisioned CUDA libraries and a real selected GPU"]
fn cuda_view_batch_and_reduction_operations_match_existing_cpu() {
    let gpu = TensorExecution::cuda(0).unwrap();
    let left = Tensor::from_vec(vec![2, 2, 4], (1..=16).map(f64::from).collect()).unwrap();
    let right = Tensor::from_vec(vec![1, 2, 4], vec![1., 0., 2., 0., 0., 1., 0., 2.]).unwrap();
    let a = left.view().slice(2, 1..4).unwrap();
    let b = right.view().slice(2, 1..4).unwrap();
    let cpu = matmul_with_transpose(&a, &b, false, true).unwrap();
    let actual = gpu.matmul_with_transpose(&a, &b, false, true).unwrap();
    compare_tensor(&cpu, &actual).unwrap();
    assert_eq!(actual.shape(), [2, 2, 2]);

    // Both source operands are noncontiguous views after permutation.
    let a_t = a.transpose(1, 2).unwrap();
    let b_t = b.transpose(1, 2).unwrap();
    let cpu = matmul_with_transpose(&a_t, &b_t, true, false).unwrap();
    compare_tensor(
        &cpu,
        &gpu.matmul_with_transpose(&a_t, &b_t, true, false).unwrap(),
    )
    .unwrap();
    for axis in 0..a_t.rank() {
        for keep in [false, true] {
            let cpu = sum_axis(&a_t, axis, keep).unwrap();
            compare_tensor(&cpu, &gpu.sum_axis(&a_t, axis, keep).unwrap()).unwrap();
            let cpu = mean_axis(&a_t, axis, keep).unwrap();
            compare_tensor(&cpu, &gpu.mean_axis(&a_t, axis, keep).unwrap()).unwrap();
        }
    }
    let before = gpu.stats();
    let _ = max_axis(&a_t, 0, false).unwrap();
    let empty_left = Tensor::from_vec(vec![2, 0], vec![]).unwrap();
    let empty_right = Tensor::from_vec(vec![0, 3], vec![]).unwrap();
    assert_eq!(
        gpu.matmul(&empty_left.view(), &empty_right.view())
            .unwrap()
            .as_slice(),
        [0.; 6]
    );
    assert_eq!(
        gpu.sum_axis(&empty_left.view(), 1, false)
            .unwrap()
            .as_slice(),
        [0.; 2]
    );
    assert!(gpu.mean_axis(&empty_left.view(), 1, false).is_err());
    assert_eq!(
        gpu.stats(),
        before,
        "max and empty identities must not claim native work"
    );
    assert!(before.completed_gemm_requests > 0);
    assert!(before.host_to_device_bytes > 0 && before.device_to_host_bytes > 0);
}

#[test]
#[ignore = "requires explicitly provisioned CUDA libraries and a real selected GPU"]
fn cuda_text_forward_loss_and_every_parameter_gradient_match_cpu() {
    let gpu = TensorExecution::cuda(0).unwrap();
    let model = model_fixture().unwrap();
    let parameters = model
        .parameters()
        .iter()
        .map(|p| p.tensor().clone())
        .collect::<Vec<_>>();
    let weights = parameters
        .iter()
        .map(|p| p.value_snapshot())
        .collect::<Vec<_>>();
    let cpu = snapshot_with_model(&TensorExecution::cpu(), &model).unwrap();
    let actual = snapshot_with_model(&gpu, &model).unwrap();
    for ((before, values), parameter) in parameters.iter().zip(&weights).zip(model.parameters()) {
        assert!(before.is_same_node(parameter.tensor()));
        assert_eq!(values, &parameter.tensor().value_snapshot());
    }
    let comparison = compare_snapshots(&cpu, &actual).unwrap();
    assert_eq!(comparison["compared_logits"], 774);
    assert_eq!(comparison["compared_gradient_tensors"], 20);
    assert_eq!(comparison["compared_gradient_values"], 1372);
    assert!(
        gpu.stats().completed_gemm_requests > 3,
        "model must execute beyond the three toy operations"
    );
    assert_eq!(
        AutogradContext::recording().execution().device(),
        ExecutionDevice::Cpu
    );
}

#[test]
#[ignore = "requires explicitly provisioned CUDA libraries and a real selected GPU"]
fn cuda_execution_is_explicit_in_forward_backward_and_graph_policy() {
    let gpu = TensorExecution::cuda(0).unwrap();
    let context = AutogradContext::recording().with_execution(&gpu);
    let left = TensorValue::parameter(Tensor::from_vec(vec![1, 2], vec![2., 3.]).unwrap()).unwrap();
    let right = TensorValue::constant(Tensor::from_vec(vec![2, 1], vec![4., 5.]).unwrap()).unwrap();
    let product = left.matmul_with_context(context, &right).unwrap();
    let loss = product
        .sum_axis_with_context(context, 0, false)
        .unwrap()
        .sum_axis_with_context(context, 0, false)
        .unwrap();
    let before_backward = gpu.stats().completed_gemm_requests;
    loss.backward_with_execution(&gpu).unwrap();
    assert!(gpu.stats().completed_gemm_requests > before_backward);
    let gpu_gradient = left.gradient_snapshot().unwrap();
    left.zero_grad().unwrap();

    // Ordinary calls stay on CPU even after an explicit CUDA forward/backward.
    let before_cpu = gpu.stats();
    let cpu_product = left.matmul(&right).unwrap();
    cpu_product
        .sum_axis(0, false)
        .unwrap()
        .sum_axis(0, false)
        .unwrap()
        .backward()
        .unwrap();
    compare_tensor(&gpu_gradient, &left.gradient_snapshot().unwrap()).unwrap();
    assert_eq!(before_cpu, gpu.stats());
    assert_eq!(
        AutogradContext::recording().execution().device(),
        ExecutionDevice::Cpu
    );

    let no_grad = AutogradContext::no_grad().with_execution(&gpu);
    let untracked = left.matmul_with_context(no_grad, &right).unwrap();
    assert!(!untracked.tracks_gradient());
    assert!(untracked.backward_with_execution(&gpu).is_err());
    let before_error = gpu.stats();
    assert!(
        gpu.matmul(&left.value().view(), &left.value().view())
            .is_err()
    );
    assert_eq!(before_error, gpu.stats());
    assert!(TensorExecution::cuda(usize::MAX).is_err());
}
