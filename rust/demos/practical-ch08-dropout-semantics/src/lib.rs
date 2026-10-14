//! Bounded correctness fixtures use the course's existing tensor, decoder and trainer owners.
use llm_from_scratch_practical::{
    artifact_identity::{ArtifactDigest, canonical_json_bytes, sha256},
    autograd::tensor_core::{AutogradContext, GraphRetention, TensorValue},
    config::{
        dropout_run::{DropoutRunConfig, DropoutRunPolicy},
        model::ModelConfig,
        planner::{self, ForwardMode},
        run::RunConfig,
    },
    models::decoder::{DecoderModel, DropoutModelForward},
    nn::{dropout::*, init::SplitMix64},
    tensor::storage::Tensor,
    training::{
        adamw::{AdamW, AdamWConfig, AdamWGradientTransform, AdamWState},
        trainer::{
            DecoderModelState, DecoderUpdateObserver, LearningRateSchedule, TrainerConfig,
            TrainerError, decoder_update_with_forward,
        },
    },
};
use serde_json::{Value, json};
use std::{collections::BTreeMap, error::Error};

type FixtureResult<T> = Result<T, Box<dyn Error>>;
const INPUT: [f64; 4] = [2.0, -4.0, 0.0, 6.0];
const UPSTREAM: [f64; 4] = [3.0, 5.0, 7.0, -2.0];
const INPUT_IDS: [u32; 3] = [0, 99, 100];
const TARGETS: [usize; 3] = [99, 100, 1];
pub const TRACE_SCHEMA: &str = "practical-dropout-semantics-v1";
fn tensor(shape: &[usize], values: &[f64]) -> FixtureResult<Tensor> {
    Ok(Tensor::from_vec(shape.to_vec(), values.to_vec())?)
}
fn bits(values: &[f64]) -> Vec<u64> {
    values.iter().map(|v| v.to_bits()).collect()
}
fn hex_bits(values: &[u64]) -> Vec<String> {
    values.iter().map(|v| format!("{v:016x}")).collect()
}
fn hash_bits(values: &[u64]) -> FixtureResult<String> {
    Ok(sha256(&canonical_json_bytes(&hex_bits(values))?).to_string())
}
fn require(equal: bool, message: &'static str) -> FixtureResult<()> {
    if equal { Ok(()) } else { Err(message.into()) }
}
fn binding() -> DropoutBinding {
    DropoutBinding::for_operator(
        sha256(b"dropout-four-element-run-v1"),
        sha256(b"dropout-four-element-layout-v1"),
        sha256(b"dropout-four-element-phase-v1"),
    )
}
fn fixture_site() -> DropoutSiteId {
    DropoutSiteId {
        layer: 0,
        kind: DropoutSiteKind::AttentionOutput,
    }
}
fn gradients(model: &DecoderModel) -> Vec<u64> {
    model
        .parameters()
        .iter()
        .flat_map(|p| {
            bits(
                p.tensor()
                    .gradient()
                    .expect("named leaves own gradients")
                    .as_slice(),
            )
        })
        .collect()
}
fn zero(model: &DecoderModel) -> FixtureResult<()> {
    for p in model.parameters() {
        p.tensor().zero_grad()?;
    }
    Ok(())
}
fn bridge_run() -> FixtureResult<DropoutRunConfig> {
    let mut run = RunConfig::fixture("bridge-ci")?;
    run.seeds.initialization = 39;
    Ok(DropoutRunConfig::new(run, DropoutRunPolicy::new(0.5, 39)?)?)
}
fn bridge(run: &DropoutRunConfig) -> FixtureResult<DecoderModel> {
    let accepted = planner::admit_dropout_decoder(&ModelConfig::scale("bridge")?, run)?;
    let initialized = accepted.construct(&mut SplitMix64::from_seed(
        run.legacy_run.seeds.initialization,
    ))?;
    Ok(initialized.model().clone())
}

pub struct Evidence {
    pub summary: Value,
    pub trace: Vec<Value>,
}

fn primitive_evidence() -> FixtureResult<Value> {
    let mut rows = Vec::new();
    for seed in [0, 1, 2, 3, 4, 5, 6, 7, 8, 39] {
        let input = TensorValue::parameter(tensor(&[1, 1, 4], &INPUT)?)?;
        let mut state = DropoutCounterState::from_seed(seed);
        let y = apply_dropout_with_context(
            AutogradContext::recording(),
            &input,
            DropoutMode::Train,
            DropoutPolicy::new(0.5)?,
            fixture_site(),
            &binding(),
            &mut state,
            DropoutLimits::default(),
        )?;
        let record = y.record().ok_or("active fixture must record its mask")?;
        y.output().backward_with_seed(
            &tensor(&[1, 1, 4], &UPSTREAM)?.view(),
            GraphRetention::Release,
        )?;
        rows.push(json!({"seed":seed,"purpose":record.ticket().purpose(),"range":[record.ticket().start(),record.ticket().end()],"words":hex_bits(&record.ticket().words()),"mask":record.mask().iter().map(|m| char::from(b'0'+m)).collect::<String>(),"output_bits":hex_bits(&bits(y.output().value().as_slice())),"final_input_gradient_bits":hex_bits(&bits(input.gradient().ok_or("input gradient")?.as_slice())),"end_counter":state.next_counter()}));
    }
    Ok(
        json!({"shape":[1,1,4],"mode":"train","probability_bits":format!("{:016x}",0.5_f64.to_bits()),"scale_bits":format!("{:016x}",2.0_f64.to_bits()),"input":INPUT,"upstream":UPSTREAM,"rows":rows}),
    )
}

// region:dropout-fixed-mask-evidence
/// The kept zero differentiates through its saved coefficient of two.
pub fn fixed_mask_evidence() -> FixtureResult<Value> {
    let input = TensorValue::parameter(tensor(&[1, 1, 4], &INPUT)?)?;
    let y = apply_supplied_mask_with_context(
        AutogradContext::recording(),
        &input,
        DropoutPolicy::new(0.5)?,
        &[1, 0, 1, 1],
        DropoutLimits::default(),
    )?;
    y.output().backward_with_seed(
        &tensor(&[1, 1, 4], &UPSTREAM)?.view(),
        GraphRetention::Release,
    )?;
    let mut state = DropoutCounterState::from_seed(39);
    let eval = apply_dropout_with_context(
        AutogradContext::recording(),
        &input,
        DropoutMode::Eval,
        DropoutPolicy::new(0.5)?,
        fixture_site(),
        &binding(),
        &mut state,
        DropoutLimits::default(),
    )?;
    let mut average = [0.0; 4];
    for code in 0u8..16 {
        let mask = std::array::from_fn::<_, 4, _>(|i| (code >> i) & 1);
        let out = apply_supplied_mask_with_context(
            AutogradContext::no_grad(),
            &input,
            DropoutPolicy::new(0.5)?,
            &mask,
            DropoutLimits::default(),
        )?;
        for (sum, value) in average.iter_mut().zip(out.output().value().as_slice()) {
            *sum += value;
        }
    }
    for sum in &mut average {
        *sum /= 16.0;
    }
    require(average == INPUT, "mask enumeration mean differs")?;
    Ok(
        json!({"shape":[1,1,4],"input":INPUT,"drop_probability":0.5,"keep_probability":0.5,"mask":[1,0,1,1],"training_output":y.output().value().as_slice(),"training_output_bits":hex_bits(&bits(y.output().value().as_slice())),"upstream_gradient":UPSTREAM,"input_gradient":input.gradient().ok_or("fixed input gradient")?.as_slice(),"input_gradient_bits":hex_bits(&bits(input.gradient().ok_or("fixed input gradient")?.as_slice())),"eval_same_handle":eval.output().is_same_node(&input),"eval_output":eval.output().value().as_slice(),"eval_end_counter":state.next_counter(),"enumerated_masks":16,"enumerated_mean":average,"linear_probe":y.output().value().as_slice().iter().zip(UPSTREAM).map(|(x,g)| x*g).sum::<f64>()}),
    )
}
// endregion:dropout-fixed-mask-evidence

fn mode_grid_history_evidence() -> FixtureResult<Value> {
    let mut modes = Vec::new();
    for mode in [DropoutMode::Train, DropoutMode::Eval] {
        for context in [AutogradContext::recording(), AutogradContext::no_grad()] {
            let input = TensorValue::parameter(tensor(&[1, 1, 4], &INPUT)?)?;
            let mut state = DropoutCounterState::from_seed(8);
            let y = apply_dropout_with_context(
                context,
                &input,
                mode,
                DropoutPolicy::new(0.5)?,
                fixture_site(),
                &binding(),
                &mut state,
                DropoutLimits::default(),
            )?;
            modes.push(json!({"mode":if mode==DropoutMode::Train {"train"}else{"eval"},"records_graph":context.records_graph(),"same_handle":y.output().is_same_node(&input),"output_tracks_gradient":y.output().tracks_gradient(),"end_counter":state.next_counter(),"key_derived":state.key_is_derived(),"output_bits":hex_bits(&bits(y.output().value().as_slice()))}));
        }
    }
    let tiny = DropoutProbability::new(2.0_f64.powi(-54))?;
    // region:dropout-historical-scaling
    let half = DropoutProbability::new(0.5)?;
    let x = TensorValue::constant(tensor(&[1, 1, 1], &[2.0])?)?;
    let one = TensorValue::constant(tensor(&[1, 1, 1], &[1.0])?)?;
    let q = TensorValue::constant(tensor(&[1, 1, 1], &[0.5])?)?;
    let two = TensorValue::constant(tensor(&[1, 1, 1], &[half.scale()])?)?;
    let historical_train = x.mul_with_context(AutogradContext::no_grad(), &one)?;
    let historical_eval = x.mul_with_context(AutogradContext::no_grad(), &q)?;
    let inverted_train = historical_train.mul_with_context(AutogradContext::no_grad(), &two)?;
    let mut off = DropoutCounterState::from_seed(39);
    let inverted_eval = apply_dropout_with_context(
        AutogradContext::no_grad(),
        &x,
        DropoutMode::Eval,
        DropoutPolicy::new(0.5)?,
        fixture_site(),
        &binding(),
        &mut off,
        DropoutLimits::default(),
    )?;
    // endregion:dropout-historical-scaling
    let identity_input = TensorValue::parameter(tensor(&[1, 1, 4], &[-0.0, 0.0, -4.0, 6.0])?)?;
    let mut identity_state = DropoutCounterState::from_seed(39);
    let identity_policy = DropoutPolicy::new(-0.0)?;
    let identity = apply_dropout_with_context(
        AutogradContext::no_grad(),
        &identity_input,
        DropoutMode::Train,
        identity_policy,
        fixture_site(),
        &binding(),
        &mut identity_state,
        DropoutLimits {
            activation_entries: 0,
            mask_bytes: 0,
            additional_payload_bytes: 0,
        },
    )?;
    Ok(
        json!({"mode_pairs":modes,"zero_probability_identity":{"probability_bits":format!("{:016x}",identity_policy.probability().bits()),"same_handle":identity.output().is_same_node(&identity_input),"exact_input_bits":bits(identity.output().value().as_slice())==bits(identity_input.value().as_slice()),"output_bits":hex_bits(&bits(identity.output().value().as_slice())),"no_mask_record":identity.record().is_none(),"end_counter":identity_state.next_counter(),"key_derived":identity_state.key_is_derived(),"preserved_existing_tracking":identity.output().tracks_gradient()},"grid":{"zero_drops_at_half":!half.keeps_word(0),"half_equality_keeps":half.keeps_word(1u64<<63),"largest_unit_bits":format!("{:016x}",SplitMix64::unit_f64_from_word(u64::MAX).to_bits()),"tiny_probability_bits":format!("{:016x}",tiny.bits()),"tiny_zero_drops":!tiny.keeps_word(0),"tiny_first_positive_grid_keeps":tiny.keeps_word(1u64<<11),"tiny_requested_scale_bits":format!("{:016x}",tiny.scale().to_bits())},"history":{"input":2.0,"mask":1,"drop_probability":0.5,"unscaled_training":historical_train.value().as_slice()[0],"keep_scaled_eval":historical_eval.value().as_slice()[0],"inverted_training":inverted_train.value().as_slice()[0],"identity_eval":inverted_eval.output().value().as_slice()[0]}}),
    )
}

fn recompute_evidence(run: &DropoutRunConfig) -> FixtureResult<(Value, Vec<Value>)> {
    let model = bridge(run)?;
    let mut live = run.dropout.initial_counter()?;
    let original = model.forward_with_dropout(
        AutogradContext::recording(),
        &INPUT_IDS,
        &[1, 3],
        DropoutMode::Train,
        &run.dropout,
        &mut live,
        DropoutLimits::default(),
    )?;
    require(
        original.sites().len() == 4 && live.next_counter() == 192,
        "bridge site traversal",
    )?;
    let loss = original.logits().indexed_mean_nll(2, &TARGETS)?;
    let loss_bits = loss.value().as_slice()[0].to_bits();
    let selected: Vec<_> = original
        .sites()
        .iter()
        .flat_map(|s| [s.input().clone(), s.output().clone()])
        .collect();
    let adjoints = loss.backward_with_selected_adjoints(&selected)?;
    let original_gradients = gradients(&model);
    let original_logits = bits(original.logits().value().as_slice());
    zero(&model)?;
    let mut points = Vec::new();
    let mut trace = Vec::new();
    for (i, record) in original.sites().iter().take(3).enumerate() {
        let cursor_before = live.next_counter();
        let leaf = TensorValue::parameter(record.input().value_snapshot())?;
        let replay = replay_dropout_with_context(
            AutogradContext::recording(),
            &leaf,
            record.ticket(),
            run.dropout.policy()?,
            record.ticket().site(),
            original.binding().ok_or("active binding")?,
            DropoutLimits::default(),
        )?;
        let multiplier_bits = bits(record.multiplier().value().as_slice());
        let output_bits = bits(record.output().value().as_slice());
        let upstream = adjoints[2 * i + 1]
            .as_ref()
            .ok_or("original output adjoint")?;
        replay
            .output()
            .backward_with_seed(&upstream.view(), GraphRetention::Release)?;
        let gradient_bits = bits(
            leaf.gradient()
                .ok_or("recomputed input gradient")?
                .as_slice(),
        );
        let original_input_gradient = bits(
            adjoints[2 * i]
                .as_ref()
                .ok_or("original input adjoint")?
                .as_slice(),
        );
        let multiplier_equal = multiplier_bits
            == bits(
                replay
                    .record()
                    .ok_or("recomputed mask")?
                    .multiplier()
                    .value()
                    .as_slice(),
            );
        let output_equal = output_bits == bits(replay.output().value().as_slice());
        let gradient_equal = gradient_bits == original_input_gradient;
        require(
            multiplier_equal
                && output_equal
                && gradient_equal
                && live.next_counter() == cursor_before,
            "operator recomputation differs",
        )?;
        points.push(json!({"point":format!("R{}",i+1),"layer":record.ticket().site().layer,"site":record.ticket().site().kind.as_str(),"shape":record.ticket().shape(),"range":[record.ticket().start(),record.ticket().end()],"live_cursor_before":cursor_before,"live_cursor_after":live.next_counter(),"multiplier_equal":multiplier_equal,"output_equal":output_equal,"input_gradient_equal":gradient_equal,"compared_coordinates":{"multiplier":multiplier_bits.len(),"output":output_bits.len(),"input_gradient":gradient_bits.len()},"multiplier_sha256":hash_bits(&multiplier_bits)?,"output_sha256":hash_bits(&output_bits)?,"input_gradient_sha256":hash_bits(&gradient_bits)?}));
        trace.push(json!({"schema":TRACE_SCHEMA,"record_type":"operator-recompute","point":format!("R{}",i+1),"input_bits":hex_bits(&bits(record.input().value().as_slice())),"words":hex_bits(&record.ticket().words()),"multiplier_bits":hex_bits(&multiplier_bits),"output_bits":hex_bits(&output_bits),"upstream_bits":hex_bits(&bits(upstream.as_slice())),"input_gradient_bits":hex_bits(&gradient_bits),"range":[record.ticket().start(),record.ticket().end()],"binding":{"run":record.ticket().binding().run().as_hex(),"layout":record.ticket().binding().layout().as_hex(),"phase":record.ticket().binding().phase().as_hex()}}));
    }
    let replay = model.replay_forward_with_dropout(
        AutogradContext::recording(),
        &INPUT_IDS,
        &[1, 3],
        &run.dropout,
        &original,
        DropoutLimits::default(),
    )?;
    let replay_loss = replay.logits().indexed_mean_nll(2, &TARGETS)?;
    replay_loss.backward()?;
    let logits_equal = original_logits == bits(replay.logits().value().as_slice());
    let loss_equal = loss_bits == replay_loss.value().as_slice()[0].to_bits();
    let gradients_equal = original_gradients == gradients(&model);
    let masks_equal = original
        .sites()
        .iter()
        .zip(replay.sites())
        .all(|(a, b)| a.mask() == b.mask() && a.ticket() == b.ticket());
    require(
        logits_equal && loss_equal && gradients_equal && masks_equal && live.next_counter() == 192,
        "full-core replay differs",
    )?;
    trace.push(json!({"schema":TRACE_SCHEMA,"record_type":"full-core-recompute","logits_bits":hex_bits(&original_logits),"loss_bits":format!("{loss_bits:016x}"),"parameter_names":model.parameters().iter().map(|p| p.name()).collect::<Vec<_>>(),"parameter_gradient_bits":hex_bits(&original_gradients),"ranges":original.sites().iter().map(|s| [s.ticket().start(),s.ticket().end()]).collect::<Vec<_>>()}));
    let wrong_layout_rejected = model
        .replay_forward_with_dropout(
            AutogradContext::recording(),
            &[0, 99, 101],
            &[1, 3],
            &run.dropout,
            &original,
            DropoutLimits::default(),
        )
        .is_err();
    require(wrong_layout_rejected, "changed text authorized replay")?;
    Ok((
        json!({"scope":"operator and same-core text recomputation","points":points,"full_core":{"logits_equal":logits_equal,"loss_equal":loss_equal,"every_parameter_gradient_equal":gradients_equal,"all_four_masks_equal":masks_equal,"logit_coordinates":original_logits.len(),"parameter_gradient_coordinates":original_gradients.len(),"logits_sha256":hash_bits(&original_logits)?,"parameter_gradients_sha256":hash_bits(&original_gradients)?,"loss_bits":format!("{loss_bits:016x}"),"final_live_counter":live.next_counter(),"next_word":format!("{:016x}",live.peek_next_word()?)},"changed_same_shape_text_rejected":wrong_layout_rejected}),
        trace,
    ))
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Phase {
    CommittedZeroGrad,
    ForwardInFlight,
}
struct Fixture {
    model: DecoderModel,
    optimizer: AdamW,
    dropout: DropoutCounterState,
    run: DropoutRunConfig,
    config: TrainerConfig,
    completed: usize,
    batch_cursor: usize,
    completed_valid_targets: usize,
    phase: Phase,
}
struct Snapshot {
    model: DecoderModelState,
    optimizer: AdamWState,
    dropout: Option<DropoutCounterState>,
    run: DropoutRunConfig,
    config: TrainerConfig,
    completed: usize,
    remaining: usize,
    batch_cursor: usize,
    batch: ArtifactDigest,
    completed_valid_targets: usize,
    denominator: &'static str,
    dtype: &'static str,
    backend: String,
    phase: Option<Phase>,
    gradient_bits: Vec<u64>,
}
fn trainer_config() -> FixtureResult<TrainerConfig> {
    Ok(TrainerConfig::new(
        LearningRateSchedule::new(vec![0.001; 4])?,
        vec![0, 4],
        1.0,
    )?)
}
fn optimizer_config() -> FixtureResult<AdamWConfig> {
    Ok(AdamWConfig::new(0.001, 0.9, 0.999, 1e-8, 0.01)?)
}
fn batch_identity() -> FixtureResult<ArtifactDigest> {
    Ok(sha256(&canonical_json_bytes(
        &json!({"inputs":INPUT_IDS,"targets":TARGETS,"positions":[0,1,2],"shape":[1,3],"valid_targets":[true,true,true],"denominator":"token-mean-valid-targets-v1"}),
    )?))
}
impl Fixture {
    fn new(run: &DropoutRunConfig) -> FixtureResult<Self> {
        Ok(Self {
            model: bridge(run)?,
            optimizer: AdamW::new(optimizer_config()?),
            dropout: run.dropout.initial_counter()?,
            run: run.clone(),
            config: trainer_config()?,
            completed: 0,
            batch_cursor: 0,
            completed_valid_targets: 0,
            phase: Phase::CommittedZeroGrad,
        })
    }
    fn snapshot(&self) -> FixtureResult<Snapshot> {
        require(
            self.phase == Phase::CommittedZeroGrad,
            "snapshot requires completed zero-grad phase",
        )?;
        let gradient_bits = gradients(&self.model);
        require(
            gradient_bits.iter().all(|g| *g == 0),
            "snapshot gradients are not exact positive zero",
        )?;
        Ok(Snapshot {
            model: DecoderModelState::snapshot(&self.model),
            optimizer: self.optimizer.persistence_state(),
            dropout: Some(self.dropout.snapshot()),
            run: self.run.clone(),
            config: self.config.clone(),
            completed: self.completed,
            remaining: 4usize
                .checked_sub(self.completed)
                .ok_or("remaining updates")?,
            batch_cursor: self.batch_cursor,
            batch: batch_identity()?,
            completed_valid_targets: self.completed_valid_targets,
            denominator: "token-mean-valid-targets-v1",
            dtype: "f64",
            backend: self.run.legacy_run.backend.clone(),
            phase: Some(self.phase),
            gradient_bits,
        })
    }
    fn restore(
        snapshot: &Snapshot,
        run: &DropoutRunConfig,
        completed: usize,
    ) -> FixtureResult<Self> {
        let dropout = snapshot.dropout.as_ref().ok_or("missing dropout counter")?;
        require(
            snapshot.phase == Some(Phase::CommittedZeroGrad),
            "missing or incomplete commit phase",
        )?;
        require(
            &snapshot.run == run && snapshot.run.digest()? == run.digest()?,
            "stale run or dropout policy",
        )?;
        require(
            snapshot.config == trainer_config()?
                && snapshot.optimizer.config() == optimizer_config()?,
            "optimizer or schedule changed",
        )?;
        require(
            snapshot.completed == completed
                && snapshot.batch_cursor == completed
                && snapshot.remaining == 4usize.checked_sub(completed).ok_or("remaining")?,
            "batch cursor or remaining updates changed",
        )?;
        require(
            snapshot.completed_valid_targets
                == completed.checked_mul(3).ok_or("valid target count")?
                && snapshot.batch == batch_identity()?
                && snapshot.denominator == "token-mean-valid-targets-v1",
            "batch, target count or denominator changed",
        )?;
        require(
            snapshot.dtype == "f64"
                && snapshot.backend == run.legacy_run.backend
                && snapshot.model.config() == ModelConfig::scale("bridge")?.executable_config()?,
            "model/backend/dtype binding changed",
        )?;
        require(
            snapshot.optimizer.step_count() == u64::try_from(completed)?
                && dropout.seed() == run.dropout.seed
                && dropout.next_counter()
                    == u64::try_from(completed.checked_mul(192).ok_or("snapshot counter")?)?,
            "optimizer phase or dropout state changed",
        )?;
        require(
            snapshot.gradient_bits.iter().all(|g| *g == 0)
                && snapshot.gradient_bits.len() == snapshot.model.scalar_count(),
            "saved gradient-zero state changed",
        )?;
        let model = snapshot.model.restore_independent_model()?;
        let restored = DecoderModelState::snapshot(&model);
        require(
            restored.bit_pattern() == snapshot.model.bit_pattern()
                && restored.parameter_names().collect::<Vec<_>>()
                    == snapshot.model.parameter_names().collect::<Vec<_>>(),
            "restored parameter bits or order differ",
        )?;
        require(
            restored.execution_binding() == snapshot.model.execution_binding()
                && restored.execution_binding().is_some(),
            "restored admitted execution binding differs",
        )?;
        require(
            gradients(&model) == snapshot.gradient_bits,
            "restored gradients differ",
        )?;
        Ok(Self {
            model,
            optimizer: AdamW::from_persistence_state(&snapshot.optimizer),
            dropout: dropout.snapshot(),
            run: run.clone(),
            config: snapshot.config.clone(),
            completed,
            batch_cursor: snapshot.batch_cursor,
            completed_valid_targets: snapshot.completed_valid_targets,
            phase: Phase::CommittedZeroGrad,
        })
    }
    fn update(&mut self, inject_after_forward: bool) -> FixtureResult<StepTape> {
        require(
            self.phase == Phase::CommittedZeroGrad,
            "retry requires a restored committed phase",
        )?;
        let step = self.completed.checked_add(1).ok_or("update index")?;
        self.phase = Phase::ForwardInFlight;
        let mut forward: Option<DropoutModelForward> = None;
        let mut observer = CaptureUpdate {
            inject_after_forward,
            raw: Vec::new(),
            clipped: Vec::new(),
        };
        let execution = decoder_update_with_forward(
            &self.model,
            &mut self.optimizer,
            &self.config,
            step,
            || {
                let f = self.model.forward_with_dropout(
                    AutogradContext::recording(),
                    &INPUT_IDS,
                    &[1, 3],
                    DropoutMode::Train,
                    &self.run.dropout,
                    &mut self.dropout,
                    DropoutLimits::default(),
                )?;
                let loss = f.logits().indexed_mean_nll(2, &TARGETS)?;
                forward = Some(f);
                Ok(loss)
            },
            &mut observer,
        )?;
        let forward = forward.ok_or("successful update did not forward")?;
        let trace = execution
            .optimizer_trace
            .ok_or("bounded fixture needs actual optimizer trace")?;
        let mut categories = BTreeMap::new();
        categories.insert("raw-gradient".into(), observer.raw);
        categories.insert("clipped-gradient".into(), observer.clipped);
        for (name,read) in [
            ("parameter-before",llm_from_scratch_practical::training::adamw::AdamWParameterUpdate::before as fn(&llm_from_scratch_practical::training::adamw::AdamWParameterUpdate)->&[f64]),
            ("effective-gradient",llm_from_scratch_practical::training::adamw::AdamWParameterUpdate::gradient),
            ("first-moment",llm_from_scratch_practical::training::adamw::AdamWParameterUpdate::first_moment),
            ("second-moment",llm_from_scratch_practical::training::adamw::AdamWParameterUpdate::second_moment),
            ("corrected-first-moment",llm_from_scratch_practical::training::adamw::AdamWParameterUpdate::corrected_first_moment),
            ("corrected-second-moment",llm_from_scratch_practical::training::adamw::AdamWParameterUpdate::corrected_second_moment),
            ("adaptive-direction",llm_from_scratch_practical::training::adamw::AdamWParameterUpdate::adaptive_direction),
            ("adaptive-delta",llm_from_scratch_practical::training::adamw::AdamWParameterUpdate::adaptive_delta),
            ("decay-delta",llm_from_scratch_practical::training::adamw::AdamWParameterUpdate::decay_delta),
            ("parameter-after",llm_from_scratch_practical::training::adamw::AdamWParameterUpdate::after),
        ] { categories.insert(name.into(),trace.updates().iter().flat_map(|u| bits(read(u))).collect()); }
        require(
            categories["clipped-gradient"] == categories["effective-gradient"],
            "observed clipping differs from AdamW input",
        )?;
        self.completed = step;
        self.batch_cursor = self.batch_cursor.checked_add(1).ok_or("batch cursor")?;
        self.completed_valid_targets = self
            .completed_valid_targets
            .checked_add(3)
            .ok_or("valid targets")?;
        self.phase = Phase::CommittedZeroGrad;
        require(
            gradients(&self.model).iter().all(|g| *g == 0),
            "update did not clear exact gradient bits",
        )?;
        let state = self.optimizer.persistence_state();
        Ok(StepTape {
            step,
            parameter_names: trace
                .updates()
                .iter()
                .map(|u| u.name().to_owned())
                .collect(),
            parameter_shapes: trace.updates().iter().map(|u| u.shape().to_vec()).collect(),
            masks: forward.sites().iter().map(|s| s.mask()).collect(),
            words: forward.sites().iter().map(|s| s.ticket().words()).collect(),
            ranges: forward
                .sites()
                .iter()
                .map(|s| [s.ticket().start(), s.ticket().end()])
                .collect(),
            logits: bits(forward.logits().value().as_slice()),
            scalar_bits: vec![
                execution.step.train_loss().to_bits(),
                execution.step.learning_rate().to_bits(),
                execution.step.gradient_norm_before().to_bits(),
                execution.step.gradient_norm_after().to_bits(),
                trace.first_correction().to_bits(),
                trace.second_correction().to_bits(),
                state.beta1_power().to_bits(),
                state.beta2_power().to_bits(),
            ],
            transform: transform_bits(execution.step.gradient_transform()),
            clipped: execution.step.clipped(),
            decay_flags: trace.updates().iter().map(|u| u.decay_applied()).collect(),
            decay_bits: trace
                .updates()
                .iter()
                .map(|u| u.effective_weight_decay().to_bits())
                .collect(),
            categories,
            events: execution
                .step
                .events()
                .iter()
                .map(|s| (*s).to_owned())
                .collect(),
            optimizer_step: state.step_count(),
            cursor: self.dropout.next_counter(),
            next_word: self.dropout.peek_next_word()?,
        })
    }
}
fn transform_bits(transform: AdamWGradientTransform) -> Vec<u64> {
    match transform {
        AdamWGradientTransform::Uniform { scale } => vec![0, scale.to_bits()],
        AdamWGradientTransform::Normalized {
            divisor,
            multiplier,
        } => vec![1, divisor.to_bits(), multiplier.to_bits()],
    }
}
struct CaptureUpdate {
    inject_after_forward: bool,
    raw: Vec<u64>,
    clipped: Vec<u64>,
}
impl DecoderUpdateObserver for CaptureUpdate {
    fn after_forward(&mut self, _loss: &TensorValue) -> Result<(), TrainerError> {
        if self.inject_after_forward {
            Err(TrainerError::ObserverRejected(
                "bounded injected failure after forward",
            ))
        } else {
            Ok(())
        }
    }
    fn before_update(
        &mut self,
        model: &DecoderModel,
        transform: AdamWGradientTransform,
    ) -> Result<(), TrainerError> {
        for p in model.parameters() {
            let gradient = p
                .tensor()
                .gradient()
                .ok_or_else(|| TrainerError::MissingGradient {
                    name: p.name().into(),
                })?;
            self.raw.extend(bits(gradient.as_slice()));
            self.clipped.extend(
                gradient
                    .as_slice()
                    .iter()
                    .map(|g| transform.apply(*g).to_bits()),
            );
        }
        Ok(())
    }
    fn records_update_trace(&self) -> bool {
        true
    }
}

#[derive(Debug, PartialEq, Eq)]
struct StepTape {
    step: usize,
    parameter_names: Vec<String>,
    parameter_shapes: Vec<Vec<usize>>,
    masks: Vec<Vec<u8>>,
    words: Vec<Vec<u64>>,
    ranges: Vec<[u64; 2]>,
    logits: Vec<u64>,
    scalar_bits: Vec<u64>,
    transform: Vec<u64>,
    clipped: bool,
    decay_flags: Vec<bool>,
    decay_bits: Vec<u64>,
    categories: BTreeMap<String, Vec<u64>>,
    events: Vec<String>,
    optimizer_step: u64,
    cursor: u64,
    next_word: u64,
}
impl StepTape {
    fn summary(&self) -> FixtureResult<Value> {
        let categories = self
            .categories
            .iter()
            .map(|(name, data)| {
                Ok((
                    name.clone(),
                    json!({"coordinates":data.len(),"sha256":hash_bits(data)?}),
                ))
            })
            .collect::<FixtureResult<serde_json::Map<_, _>>>()?;
        Ok(
            json!({"step":self.step,"ranges":self.ranges,"dropout_cursor":self.cursor,"next_word":format!("{:016x}",self.next_word),"logit_coordinates":self.logits.len(),"logits_sha256":hash_bits(&self.logits)?,"scalar_bits":hex_bits(&self.scalar_bits),"clip_transform_bits":hex_bits(&self.transform),"clipped":self.clipped,"parameter_tensors":self.parameter_names.len(),"optimizer_step":self.optimizer_step,"categories":categories,"events":self.events}),
        )
    }
    fn trace_records(&self, branch: &str) -> Vec<Value> {
        let mut records = vec![
            json!({"schema":TRACE_SCHEMA,"record_type":"update-header","branch":branch,"step":self.step,"parameter_names":self.parameter_names,"parameter_shapes":self.parameter_shapes,"masks":self.masks,"words":self.words.iter().map(|w| hex_bits(w)).collect::<Vec<_>>(),"ranges":self.ranges,"logits_bits":hex_bits(&self.logits),"scalar_bits":hex_bits(&self.scalar_bits),"clip_transform_bits":hex_bits(&self.transform),"clipped":self.clipped,"decay_flags":self.decay_flags,"effective_decay_bits":hex_bits(&self.decay_bits),"events":self.events,"optimizer_step":self.optimizer_step,"dropout_cursor":self.cursor,"next_word":format!("{:016x}",self.next_word)}),
        ];
        records.extend(self.categories.iter().map(|(name,data)| json!({"schema":TRACE_SCHEMA,"record_type":"update-category","branch":branch,"step":self.step,"category":name,"bits":hex_bits(data)})));
        records
    }
}

impl Snapshot {
    fn independent(&self) -> Self {
        Self {
            model: self.model.independent_snapshot(),
            optimizer: self.optimizer.clone(),
            dropout: self.dropout.clone(),
            run: self.run.clone(),
            config: self.config.clone(),
            completed: self.completed,
            remaining: self.remaining,
            batch_cursor: self.batch_cursor,
            batch: self.batch.clone(),
            completed_valid_targets: self.completed_valid_targets,
            denominator: self.denominator,
            dtype: self.dtype,
            backend: self.backend.clone(),
            phase: self.phase,
            gradient_bits: self.gradient_bits.clone(),
        }
    }
    fn summary(&self) -> FixtureResult<Value> {
        let state = self.dropout.as_ref().ok_or("snapshot dropout state")?;
        let moment_bits = self
            .optimizer
            .parameter_names()
            .flat_map(|name| {
                let moment = self.optimizer.state(name).expect("listed state exists");
                bits(moment.first_moment())
                    .into_iter()
                    .chain(bits(moment.second_moment()))
            })
            .collect::<Vec<_>>();
        Ok(
            json!({"completed_updates":self.completed,"remaining_updates":self.remaining,"dropout_seed":state.seed(),"dropout_cursor":state.next_counter(),"dropout_key_derived":state.key_is_derived(),"next_word":format!("{:016x}",state.peek_next_word()?),"dropout_mapping":DROPOUT_COUNTER_VERSION,"purpose":DROPOUT_PURPOSE,"dropout_probability_bits":format!("{:016x}",self.run.dropout.probability_bits),"run_sha256":self.run.digest()?.as_hex(),"execution_binding":self.model.execution_binding(),"batch_sha256":self.batch.as_hex(),"batch_cursor":self.batch_cursor,"completed_valid_targets":self.completed_valid_targets,"denominator":self.denominator,"dtype":self.dtype,"backend":self.backend,"phase":match self.phase {Some(Phase::CommittedZeroGrad)=>"committed-zero-grad",Some(Phase::ForwardInFlight)=>"forward-in-flight",None=>"missing"},"parameter_names":self.model.parameter_names().collect::<Vec<_>>(),"parameter_coordinates":self.model.scalar_count(),"parameter_bits_sha256":hash_bits(&self.model.bit_pattern())?,"moment_coordinates":moment_bits.len(),"moment_bits_sha256":hash_bits(&moment_bits)?,"optimizer_step":self.optimizer.step_count(),"optimizer_power_bits":hex_bits(&[self.optimizer.beta1_power().to_bits(),self.optimizer.beta2_power().to_bits()]),"gradient_coordinates":self.gradient_bits.len(),"gradient_bits_sha256":hash_bits(&self.gradient_bits)?,"gradient_zero":self.gradient_bits.iter().all(|v| *v==0),"schedule_bits":hex_bits(&bits(self.config.schedule().rates())),"clip_cap_bits":format!("{:016x}",self.config.max_gradient_norm().to_bits())}),
        )
    }
    fn trace_record(&self) -> FixtureResult<Value> {
        let moments=self.optimizer.parameter_names().map(|name| {
            let value=self.optimizer.state(name).expect("listed state exists");
            json!({"name":name,"shape":value.shape(),"first_moment_bits":hex_bits(&bits(value.first_moment())),"second_moment_bits":hex_bits(&bits(value.second_moment()))})
        }).collect::<Vec<_>>();
        let config = self.optimizer.config();
        Ok(
            json!({"schema":TRACE_SCHEMA,"record_type":"committed-snapshot","summary":self.summary()?,"run":self.run,"parameter_bits":hex_bits(&self.model.bit_pattern()),"gradient_bits":hex_bits(&self.gradient_bits),"moments":moments,"optimizer_config_bits":hex_bits(&[config.learning_rate().to_bits(),config.beta1().to_bits(),config.beta2().to_bits(),config.epsilon().to_bits(),config.weight_decay().to_bits()]),"validation_steps":self.config.validation_steps()}),
        )
    }
}

fn optimizer_bits(optimizer: &AdamW) -> Vec<u64> {
    let state = optimizer.persistence_state();
    let mut values = vec![
        state.step_count(),
        state.beta1_power().to_bits(),
        state.beta2_power().to_bits(),
    ];
    for name in state.parameter_names() {
        let moment = state.state(name).expect("listed moment");
        values.extend(bits(moment.first_moment()));
        values.extend(bits(moment.second_moment()));
    }
    values
}

fn resume_evidence(run: &DropoutRunConfig) -> FixtureResult<(Value, Vec<Value>)> {
    let mut control = Fixture::new(run)?;
    let initial = control.snapshot()?;
    let mut updates = Vec::new();
    let mut snapshots = Vec::new();
    let mut trace = vec![initial.trace_record()?];
    for _ in 0..4 {
        let tape = control.update(false)?;
        trace.extend(tape.trace_records("uninterrupted"));
        updates.push(tape);
        if control.completed < 4 {
            let snapshot = control.snapshot()?;
            trace.push(snapshot.trace_record()?);
            snapshots.push(snapshot);
        }
    }
    let control_final = DecoderModelState::snapshot(&control.model);
    let control_moments = optimizer_bits(&control.optimizer);
    let control_next = control.dropout.peek_next_word()?;
    let mut points = Vec::new();
    for (i, snapshot) in snapshots.iter().enumerate() {
        let point = format!("U{}", i + 1);
        let mut branch = Fixture::restore(snapshot, run, i + 1)?;
        let mut compared = BTreeMap::<String, usize>::new();
        let mut continuation = Vec::new();
        let mut all_remaining_tapes_equal = true;
        while branch.completed < 4 {
            let expected = &updates[branch.completed];
            let actual = branch.update(false)?;
            let equal = &actual == expected;
            all_remaining_tapes_equal &= equal;
            if !equal {
                return Err(format!(
                    "{point} update {} differs: expected {}, actual {}",
                    actual.step,
                    sha256(&canonical_json_bytes(&expected.summary()?)?),
                    sha256(&canonical_json_bytes(&actual.summary()?)?)
                )
                .into());
            }
            for (name, data) in &actual.categories {
                *compared.entry(name.clone()).or_default() += data.len();
            }
            *compared.entry("logits".into()).or_default() += actual.logits.len();
            *compared.entry("mask-words".into()).or_default() +=
                actual.words.iter().map(Vec::len).sum::<usize>();
            *compared.entry("mask-bits".into()).or_default() +=
                actual.masks.iter().map(Vec::len).sum::<usize>();
            *compared.entry("scalar-bits".into()).or_default() +=
                actual.scalar_bits.len() + actual.transform.len() + actual.decay_bits.len();
            let summary = actual.summary()?;
            trace.push(json!({"schema":TRACE_SCHEMA,"record_type":"resume-update-comparison","point":point,"all_discrete_and_scalar_bits_equal":actual==*expected,"actual":summary,"expected_summary_sha256":sha256(&canonical_json_bytes(&expected.summary()?)?).as_hex()}));
            continuation.push(actual.summary()?);
        }
        let restored_binding = DecoderModelState::snapshot(&branch.model);
        let parameters_equal = restored_binding.bit_pattern() == control_final.bit_pattern();
        let moments_equal = optimizer_bits(&branch.optimizer) == control_moments;
        let final_state_equal = branch.dropout == control.dropout
            && branch.completed == control.completed
            && branch.batch_cursor == control.batch_cursor
            && branch.completed_valid_targets == control.completed_valid_targets
            && branch.phase == control.phase
            && restored_binding.execution_binding() == control_final.execution_binding();
        require(
            parameters_equal
                && moments_equal
                && final_state_equal
                && branch.dropout.peek_next_word()? == control_next,
            "continuation final state differs",
        )?;
        points.push(json!({"point":point,"snapshot":snapshot.summary()?,"remaining_updates_compared":4-(i+1),"all_remaining_tapes_equal":all_remaining_tapes_equal,"compared_coordinates":compared,"continuation_summary_sha256":sha256(&canonical_json_bytes(&continuation)?).as_hex(),"all_final_parameter_bits_equal":parameters_equal,"all_final_moment_and_step_bits_equal":moments_equal,"all_final_declared_state_equal":final_state_equal,"final_counter":branch.dropout.next_counter(),"next_word":format!("{:016x}",branch.dropout.peek_next_word()?)}));
    }
    let mut failed = Fixture::restore(&initial, run, 0)?;
    let injection_rejected = failed.update(true).is_err();
    let advanced_after_successful_forward = failed.dropout.next_counter();
    require(
        injection_rejected
            && failed.phase == Phase::ForwardInFlight
            && advanced_after_successful_forward == 192,
        "injection did not stop after a successful forward",
    )?;
    failed = Fixture::restore(&initial, run, 0)?;
    let retry_cursor = failed.dropout.next_counter();
    let retry_phase = failed.phase;
    let retry = failed.update(false)?;
    require(
        retry == updates[0] && retry_cursor == 0 && retry_phase == Phase::CommittedZeroGrad,
        "retry did not restore last good state",
    )?;
    let mut rejection_cases = Vec::new();
    let mut bad = snapshots[0].independent();
    bad.dropout = None;
    rejection_cases.push(("missing-counter", Fixture::restore(&bad, run, 1).is_err()));
    let mut bad = snapshots[0].independent();
    bad.phase = None;
    rejection_cases.push(("missing-phase", Fixture::restore(&bad, run, 1).is_err()));
    let mut bad = snapshots[0].independent();
    bad.run.legacy_run.seeds.shuffle += 1;
    rejection_cases.push(("wrong-run", Fixture::restore(&bad, run, 1).is_err()));
    let mut bad = snapshots[0].independent();
    bad.run.dropout = DropoutRunPolicy::new(0.25, 39)?;
    rejection_cases.push(("wrong-probability", Fixture::restore(&bad, run, 1).is_err()));
    let mut bad = snapshots[0].independent();
    bad.batch_cursor += 1;
    rejection_cases.push((
        "wrong-batch-cursor",
        Fixture::restore(&bad, run, 1).is_err(),
    ));
    let mut bad = snapshots[0].independent();
    bad.dropout = Some(DropoutCounterState::at_counter(39, 193));
    rejection_cases.push(("wrong-counter", Fixture::restore(&bad, run, 1).is_err()));
    let mut bad = snapshots[0].independent();
    bad.phase = Some(Phase::ForwardInFlight);
    rejection_cases.push(("incomplete-phase", Fixture::restore(&bad, run, 1).is_err()));
    require(
        rejection_cases.iter().all(|(_, rejected)| *rejected),
        "invalid snapshot was accepted",
    )?;
    let control_summaries = updates
        .iter()
        .map(StepTape::summary)
        .collect::<FixtureResult<Vec<_>>>()?;
    Ok((
        json!({"scope":"four-update in-memory fixture; activation scheduler and complete job persistence remain separate","updates":control_summaries,"points":points,"failure_after_forward":{"rejected":injection_rejected,"counter_after_forward":advanced_after_successful_forward,"restored_cursor_before_retry":retry_cursor,"restored_committed_phase":retry_phase==Phase::CommittedZeroGrad,"retried_update_equal":retry==updates[0]},"invalid_snapshots":rejection_cases.into_iter().map(|(case,rejected)| json!({"case":case,"rejected":rejected})).collect::<Vec<_>>(),"final_counter":control.dropout.next_counter(),"final_next_word":format!("{control_next:016x}"),"final_parameter_coordinates":control_final.scalar_count(),"final_parameter_bits_sha256":hash_bits(&control_final.bit_pattern())?,"final_moment_and_step_bits_sha256":hash_bits(&control_moments)?}),
        trace,
    ))
}

fn accounting_evidence() -> FixtureResult<Value> {
    let mut rows = Vec::new();
    for (scale, profile) in [
        ("reference", "reference-ci"),
        ("bridge", "bridge-ci"),
        ("laptop", "8gb-gpu-core"),
    ] {
        let model = ModelConfig::scale(scale)?;
        let run = RunConfig::fixture(profile)?;
        let plan = planner::plan_decoder(&model, &run, ForwardMode::TrackedFull)?;
        let active = planner::plan_dropout_accounting(
            &plan,
            DropoutProbability::new(0.5)?,
            DropoutMode::Train,
        )?;
        let off = planner::plan_dropout_accounting(
            &plan,
            DropoutProbability::new(0.0)?,
            DropoutMode::Train,
        )?;
        rows.push(json!({"scale":scale,"profile":profile,"nominal_shape":[run.b,model.c,model.d],"layers":model.l,"unique_parameters":plan.census.total,"optional_f64_mask_data_bytes":active.mask_data_bytes,"optional_f64_output_data_bytes":active.output_data_bytes,"optional_saved_graph_primal_bytes":active.saved_graph_primal_bytes,"optional_output_adjoint_reserve_bytes":active.output_adjoint_reserve_bytes,"combined_payload_reserve_lower_bound":active.liveness.known_lower_bound_peak,"disabled_mask_bytes":off.mask_data_bytes,"interpretation":active.interpretation,"mandatory_profile_dropout":if profile=="8gb-gpu-core" {"off"}else{"optional correctness fixture"},"evidence":"shape-derived plan; no large-profile or GPU execution"}));
    }
    Ok(
        json!({"rows":rows,"fixture_limits":{"activation_entries":MAX_ACTIVATION_ENTRIES,"explicit_mask_bytes":MAX_MASK_BYTES,"cpu_rss_bytes":268435456,"disk_bytes":1073741824,"compiled_workload_seconds":600},"measurement_owner":"compiled execution receipt"}),
    )
}

pub fn evidence() -> FixtureResult<Evidence> {
    let run = bridge_run()?;
    let primitive = primitive_evidence()?;
    let fixed_mask = fixed_mask_evidence()?;
    let modes_grid_history = mode_grid_history_evidence()?;
    let (recompute, mut trace) = recompute_evidence(&run)?;
    let (resume, training_trace) = resume_evidence(&run)?;
    trace.extend(training_trace);
    let summary = json!({"schema":TRACE_SCHEMA,"schema_version":1,"chapter":"08-dropout-semantics","placement":DROPOUT_PLACEMENT,"counter_mapping":DROPOUT_COUNTER_VERSION,"purpose_registry":PURPOSE_REGISTRY,"run":run,"primitive":primitive,"fixed_mask":fixed_mask,"modes_grid_history":modes_grid_history,"recompute":recompute,"resume":resume,"accounting":accounting_evidence()?,"replay_scope":"same scalar CPU environment and actual accepted text/layout; no quality benefit claim"});
    trace.insert(0,json!({"schema":TRACE_SCHEMA,"record_type":"primitive-fixtures","primitive":summary["primitive"],"fixed_mask":summary["fixed_mask"],"modes_grid_history":summary["modes_grid_history"]}));
    trace.push(json!({"schema":TRACE_SCHEMA,"record_type":"summary","summary":summary}));
    Ok(Evidence { summary, trace })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn u1_u2_u3_every_remaining_state_and_failure_phase() {
        let (evidence, _) = resume_evidence(&bridge_run().unwrap()).unwrap();
        assert_eq!(evidence["points"].as_array().unwrap().len(), 3);
        assert_eq!(evidence["final_counter"], 768);
        assert!(
            evidence["points"]
                .as_array()
                .unwrap()
                .iter()
                .all(|p| p["all_remaining_tapes_equal"] == true)
        );
    }
    #[test]
    fn r1_r2_r3_original_loss_adjoints_and_same_core() {
        let (evidence, _) = recompute_evidence(&bridge_run().unwrap()).unwrap();
        assert_eq!(evidence["points"].as_array().unwrap().len(), 3);
        assert_eq!(
            evidence["full_core"]["parameter_gradient_coordinates"],
            8304
        );
        assert_eq!(
            evidence["full_core"]["every_parameter_gradient_equal"],
            true
        );
    }
    #[test]
    fn fixed_zero_and_historical_scaling_are_actual_tensor_results() {
        let fixed = fixed_mask_evidence().unwrap();
        assert_eq!(fixed["input_gradient"][2], 14.0);
        let mode = mode_grid_history_evidence().unwrap();
        assert_eq!(mode["history"]["unscaled_training"], 2.0);
        assert_eq!(mode["history"]["keep_scaled_eval"], 1.0);
        assert_eq!(mode["history"]["inverted_training"], 4.0);
        assert_eq!(mode["history"]["identity_eval"], 2.0);
    }
}
