//! Exact continuation at a complete logical-update boundary.
//! The caller owns the data source and update loop; this module preserves state.

use super::{
    Checkpoint, CheckpointTokenizer,
    portable::{
        ArchiveResult, NamedData, PortableModel, decode, encode, integer, logical_digest, real,
        text,
    },
};
use crate::{
    config::dropout_run::DropoutRunPolicy,
    models::decoder::DecoderModel,
    nn::dropout::DropoutCounterState,
    tokenizer::bpe::BpeTokenizer,
    training::{
        adamw::{AdamW, AdamWConfig, AdamWParameterGroups, AdamWState, AdamWStateEntry},
        loss_scaling::{DynamicLossScaler, LossScaleState},
        trainer::{DecoderModelState, LearningRateSchedule, TrainerConfig},
    },
};
use config_lib::Config;
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::Path,
};

/// An attributed execution envelope, separate from portable learned identity.
/// The demo supplies the actual executable digest and explicitly uses CPU F64.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ResumeEnvelope {
    pub executable_sha256: String,
    pub numerical_execution: String,
}

// region:training-resume-progress
/// The exact next data position and randomness for the caller's training loop.
/// Order lists document indices; cursor points to the next document in that order.
/// Saves in this version require zero pending microbatches and cleared gradients.
#[derive(Clone, Debug)]
pub struct TrainingProgress {
    pub data_sha256: String,
    pub document_order: Vec<usize>,
    pub cursor: usize,
    pub epoch: u64,
    pub accumulation_microbatches: usize,
    pub pending_microbatches: usize,
    pub recompute_blocks: bool,
    pub dropout: DropoutRunPolicy,
    pub dropout_counter: DropoutCounterState,
    pub sampling_rng_state: u64,
}

impl TrainingProgress {
    fn validate(&self) -> ArchiveResult<()> {
        self.dropout.validate()?;
        if self.pending_microbatches != 0 || self.accumulation_microbatches == 0 {
            return Err(
                "checkpoint requires a complete update with zero pending accumulation".into(),
            );
        }
        let mut order = self.document_order.clone();
        order.sort_unstable();
        if order.is_empty()
            || !order.iter().copied().eq(0..order.len())
            || self.cursor >= order.len()
        {
            return Err("invalid training document order or next-document cursor".into());
        }
        if self.dropout.seed != self.dropout_counter.seed() || self.data_sha256.is_empty() {
            return Err("dropout seed or data identity mismatch".into());
        }
        Ok(())
    }
}
// endregion:training-resume-progress

pub struct TrainingCheckpoint {
    model: PortableModel,
    settings: Config,
    tensors: BTreeMap<String, NamedData>,
}

pub struct RestoredTraining {
    pub model: DecoderModel,
    pub tokenizer: BpeTokenizer,
    pub optimizer: AdamW,
    pub plan: TrainerConfig,
    pub progress: TrainingProgress,
    pub scaler: DynamicLossScaler,
}

impl TrainingCheckpoint {
    // region:capture-training-checkpoint
    #[allow(clippy::too_many_arguments)]
    pub fn capture(
        model: &DecoderModel,
        tokenizer: &BpeTokenizer,
        optimizer: &AdamW,
        plan: &TrainerConfig,
        progress: &TrainingProgress,
        scaler: &DynamicLossScaler,
        envelope: &ResumeEnvelope,
    ) -> ArchiveResult<Self> {
        progress.validate()?;
        for parameter in model.parameters() {
            let gradient = parameter
                .tensor()
                .gradient()
                .ok_or("missing parameter gradient")?;
            if gradient.as_slice().iter().any(|&g| g != 0.) {
                return Err("cannot checkpoint partial or uncleared training gradients".into());
            }
        }
        if optimizer.step_count() > plan.schedule().steps() as u64 {
            return Err("completed optimizer step exceeds the saved schedule".into());
        }
        let state = optimizer.persistence_state();
        // Reuse the existing component relationship checks, not a second validator.
        Checkpoint::from_owned_parts(
            CheckpointTokenizer::byte_bpe(tokenizer),
            DecoderModelState::snapshot(model),
            state.clone(),
            state.step_count(),
            progress.sampling_rng_state,
        )?;
        let mut config = Config::new();
        config.set("version", 1_i64)?;
        config.set(
            "envelope.executable_sha256",
            format!("sha256:{}", envelope.executable_sha256),
        )?;
        config.set(
            "envelope.numerical_execution",
            envelope.numerical_execution.clone(),
        )?;
        config.set("data.sha256", format!("sha256:{}", progress.data_sha256))?;
        config.set("data.cursor", i64::try_from(progress.cursor)?)?;
        config.set(
            "accumulation.microbatches",
            i64::try_from(progress.accumulation_microbatches)?,
        )?;
        config.set("accumulation.pending", 0_i64)?;
        config.set("recompute_blocks", progress.recompute_blocks)?;
        config.set("gradient_clip", plan.max_gradient_norm())?;
        config.set(
            "dropout.algorithm",
            crate::nn::dropout::DROPOUT_COUNTER_VERSION,
        )?;
        config.set("sampling.algorithm", "splitmix64-v1")?;
        let mut tensors = BTreeMap::new();
        tensors.insert(
            "run.dropout_probability".into(),
            NamedData::f64(
                vec![1],
                &[f64::from_bits(progress.dropout.probability_bits)],
            ),
        );
        let counts = [
            state.step_count(),
            progress.epoch,
            progress.dropout.seed,
            progress.dropout_counter.next_counter(),
            progress.sampling_rng_state,
        ];
        tensors.insert("run.counters".into(), NamedData::u64(&counts));
        tensors.insert(
            "run.document_order".into(),
            NamedData::u64(
                &progress
                    .document_order
                    .iter()
                    .map(|&n| u64::try_from(n))
                    .collect::<Result<Vec<_>, _>>()?,
            ),
        );
        tensors.insert(
            "run.learning_rates".into(),
            NamedData::f64(vec![plan.schedule().steps()], plan.schedule().rates()),
        );
        tensors.insert(
            "run.validation_steps".into(),
            NamedData::u64(
                &plan
                    .validation_steps()
                    .iter()
                    .map(|&n| u64::try_from(n))
                    .collect::<Result<Vec<_>, _>>()?,
            ),
        );
        let c = state.config();
        tensors.insert(
            "optimizer.constants".into(),
            NamedData::f64(
                vec![7],
                &[
                    c.learning_rate(),
                    c.beta1(),
                    c.beta2(),
                    c.epsilon(),
                    c.weight_decay(),
                    state.beta1_power(),
                    state.beta2_power(),
                ],
            ),
        );
        config.set("optimizer.grouped", state.parameter_groups().is_some())?;
        let excluded = state
            .parameter_groups()
            .map(|g| g.excluded_names().collect::<BTreeSet<_>>())
            .unwrap_or_default();
        let mut excluded_indices = Vec::new();
        for (index, name) in state.parameter_names().enumerate() {
            let moments = state.state(name).unwrap();
            tensors.insert(
                format!("optimizer.first.{name}"),
                NamedData::f64(moments.shape().to_vec(), moments.first_moment()),
            );
            tensors.insert(
                format!("optimizer.second.{name}"),
                NamedData::f64(moments.shape().to_vec(), moments.second_moment()),
            );
            if excluded.contains(name) {
                excluded_indices.push(index as u64);
            }
        }
        if state.parameter_groups().is_some() && state.step_count() == 0 {
            // Names must also survive a checkpoint before the first update.
            let groups = state.parameter_groups().unwrap();
            let mut names = groups
                .decayed_names()
                .chain(groups.excluded_names())
                .collect::<Vec<_>>();
            names.sort_unstable();
            for (index, name) in names.iter().enumerate() {
                config.set(&format!("optimizer.group_names.n{index}"), *name)?;
                if excluded.contains(*name) {
                    excluded_indices.push(index as u64);
                }
            }
        }
        tensors.insert(
            "optimizer.excluded_indices".into(),
            NamedData::u64(&excluded_indices),
        );
        let scale = scaler.persistence_state();
        tensors.insert(
            "run.loss_scale".into(),
            NamedData::f64(vec![3], &[scale.scale, scale.minimum, scale.maximum]),
        );
        tensors.insert(
            "run.loss_scale_counts".into(),
            NamedData::u64(&[scale.growth_interval as u64, scale.finite_updates as u64]),
        );
        let snapshot = DecoderModelState::snapshot(model);
        config.set(
            "execution_binding.present",
            snapshot.execution_binding().is_some(),
        )?;
        if let Some((semantic, run, construction, max_rows)) = snapshot.execution_binding() {
            config.set("execution_binding.semantic", format!("sha256:{semantic}"))?;
            config.set("execution_binding.run", format!("sha256:{run}"))?;
            config.set("execution_binding.construction", construction)?;
            config.set("execution_binding.max_rows", i64::try_from(max_rows)?)?;
        }
        Ok(Self {
            model: PortableModel::from_text(model, tokenizer)?,
            settings: config,
            tensors,
        })
    }
    // endregion:capture-training-checkpoint

    pub fn model(&self) -> &PortableModel {
        &self.model
    }

    /// Checks compatibility before returning any independent mutable training state.
    // region:restore-training-checkpoint
    pub fn restore(
        &self,
        envelope: &ResumeEnvelope,
        data_sha256: &str,
    ) -> ArchiveResult<RestoredTraining> {
        if integer(&self.settings, "version")? != 1
            || text(&self.settings, "envelope.executable_sha256")?
                != format!("sha256:{}", envelope.executable_sha256)
            || text(&self.settings, "envelope.numerical_execution")? != envelope.numerical_execution
            || text(&self.settings, "data.sha256")? != format!("sha256:{data_sha256}")
        {
            return Err("exact resume execution envelope or data identity differs".into());
        }
        if text(&self.settings, "dropout.algorithm")? != crate::nn::dropout::DROPOUT_COUNTER_VERSION
            || text(&self.settings, "sampling.algorithm")? != "splitmix64-v1"
        {
            return Err("unsupported training randomness algorithm".into());
        }
        let counts = self.unsigned("run.counters", 5)?;
        let constants = self.floats("optimizer.constants", 7)?;
        let (model, tokenizer) = self.model.restore_text()?;
        let mut parameters = model.parameters().iter().collect::<Vec<_>>();
        parameters.sort_by_key(|p| p.name());
        let grouped = self.boolean("optimizer.grouped")?;
        let mut group_names = parameters
            .iter()
            .map(|p| p.name().to_owned())
            .collect::<Vec<_>>();
        if counts[0] == 0 && grouped {
            let group = self
                .settings
                .get("optimizer.group_names")
                .ok_or("missing optimizer group names")?;
            group_names = (0..group.as_table()?.len())
                .map(|i| crate::config::settings::text(group, &format!("n{i}")).map_err(Into::into))
                .collect::<ArchiveResult<_>>()?;
        }
        let indices = self.unsigned_any("optimizer.excluded_indices")?;
        let mut excluded = BTreeSet::new();
        for index in indices {
            let name = group_names
                .get(usize::try_from(index)?)
                .ok_or("invalid optimizer exclusion index")?;
            if !excluded.insert(name.clone()) {
                return Err("duplicate optimizer exclusion index".into());
            }
        }
        if !grouped && !excluded.is_empty() {
            return Err("unexpected optimizer exclusions".into());
        }
        let groups = if grouped {
            Some(AdamWParameterGroups::new(
                group_names
                    .iter()
                    .filter(|name| !excluded.contains(*name))
                    .cloned()
                    .collect::<Vec<_>>(),
                excluded,
            )?)
        } else {
            None
        };
        let mut expected = [
            "run.counters",
            "run.document_order",
            "run.learning_rates",
            "run.validation_steps",
            "optimizer.constants",
            "optimizer.excluded_indices",
            "run.loss_scale",
            "run.loss_scale_counts",
            "run.dropout_probability",
        ]
        .into_iter()
        .map(str::to_owned)
        .collect::<BTreeSet<_>>();
        let mut entries = Vec::new();
        if counts[0] > 0 {
            for parameter in parameters {
                let name = parameter.name();
                let first_name = format!("optimizer.first.{name}");
                let second_name = format!("optimizer.second.{name}");
                let first = self
                    .tensors
                    .get(&first_name)
                    .ok_or("missing optimizer first moment")?;
                let second = self
                    .tensors
                    .get(&second_name)
                    .ok_or("missing optimizer second moment")?;
                if first.shape != second.shape || first.shape != parameter.tensor().value().shape()
                {
                    return Err("optimizer and model shapes differ".into());
                }
                entries.push(AdamWStateEntry::new(
                    name,
                    first.shape.clone(),
                    first.float_values()?,
                    second.float_values()?,
                )?);
                expected.insert(first_name);
                expected.insert(second_name);
            }
        }
        if !self.tensors.keys().eq(expected.iter()) {
            return Err("unexpected or missing resume tensors".into());
        }
        let optimizer_state = AdamWState::new(
            AdamWConfig::new(
                constants[0],
                constants[1],
                constants[2],
                constants[3],
                constants[4],
            )?,
            groups,
            counts[0],
            constants[5],
            constants[6],
            entries,
        )?;
        Checkpoint::from_owned_parts(
            CheckpointTokenizer::byte_bpe(&tokenizer),
            DecoderModelState::snapshot(&model),
            optimizer_state.clone(),
            counts[0],
            counts[4],
        )?;
        let plan = TrainerConfig::new(
            LearningRateSchedule::new(self.float_any("run.learning_rates")?)?,
            self.unsigned_any("run.validation_steps")?
                .into_iter()
                .map(usize::try_from)
                .collect::<Result<Vec<_>, _>>()?,
            real(&self.settings, "gradient_clip")?,
        )?;
        if counts[0] > plan.schedule().steps() as u64 {
            return Err("resume step exceeds schedule".into());
        }
        let progress = TrainingProgress {
            data_sha256: data_sha256.into(),
            document_order: self
                .unsigned_any("run.document_order")?
                .into_iter()
                .map(usize::try_from)
                .collect::<Result<Vec<_>, _>>()?,
            cursor: integer(&self.settings, "data.cursor")?,
            epoch: counts[1],
            accumulation_microbatches: integer(&self.settings, "accumulation.microbatches")?,
            pending_microbatches: integer(&self.settings, "accumulation.pending")?,
            recompute_blocks: self.boolean("recompute_blocks")?,
            dropout: DropoutRunPolicy::new(
                self.floats("run.dropout_probability", 1)?[0],
                counts[2],
            )?,
            dropout_counter: DropoutCounterState::at_counter(counts[2], counts[3]),
            sampling_rng_state: counts[4],
        };
        progress.validate()?;
        let scale = self.floats("run.loss_scale", 3)?;
        let scale_counts = self.unsigned("run.loss_scale_counts", 2)?;
        let scaler = DynamicLossScaler::from_persistence_state(LossScaleState {
            scale: scale[0],
            minimum: scale[1],
            maximum: scale[2],
            growth_interval: usize::try_from(scale_counts[0])?,
            finite_updates: usize::try_from(scale_counts[1])?,
        })?;
        if self.boolean("execution_binding.present")? {
            model.bind_execution_identity(
                strip_sha256(&text(&self.settings, "execution_binding.semantic")?)?,
                strip_sha256(&text(&self.settings, "execution_binding.run")?)?,
                text(&self.settings, "execution_binding.construction")?,
                integer(&self.settings, "execution_binding.max_rows")?,
            )?;
        }
        Ok(RestoredTraining {
            model,
            tokenizer,
            optimizer: AdamW::from_persistence_state(&optimizer_state),
            plan,
            progress,
            scaler,
        })
    }
    // endregion:restore-training-checkpoint

    fn boolean(&self, key: &str) -> ArchiveResult<bool> {
        Ok(crate::config::settings::field(self.settings.as_value(), key)?.as_bool()?)
    }
    fn unsigned_any(&self, name: &str) -> ArchiveResult<Vec<u64>> {
        let tensor = self
            .tensors
            .get(name)
            .ok_or("missing unsigned resume tensor")?;
        if tensor.shape.len() != 1 {
            return Err("resume vector rank differs".into());
        }
        tensor.unsigned_values()
    }
    fn unsigned(&self, name: &str, len: usize) -> ArchiveResult<Vec<u64>> {
        let values = self.unsigned_any(name)?;
        if values.len() != len {
            return Err("unsigned resume vector length differs".into());
        }
        Ok(values)
    }
    fn float_any(&self, name: &str) -> ArchiveResult<Vec<f64>> {
        let tensor = self
            .tensors
            .get(name)
            .ok_or("missing float resume tensor")?;
        if tensor.shape.len() != 1 {
            return Err("resume vector rank differs".into());
        }
        tensor.float_values()
    }
    fn floats(&self, name: &str, len: usize) -> ArchiveResult<Vec<f64>> {
        let values = self.float_any(name)?;
        if values.len() != len {
            return Err("float resume vector length differs".into());
        }
        Ok(values)
    }

    pub fn to_bytes(&self) -> ArchiveResult<Vec<u8>> {
        let tensors = self
            .model
            .tensors
            .iter()
            .chain(&self.tensors)
            .map(|(name, tensor)| {
                (
                    name.clone(),
                    NamedData {
                        dtype: tensor.dtype,
                        shape: tensor.shape.clone(),
                        bytes: tensor.bytes.clone(),
                    },
                )
            })
            .collect::<BTreeMap<_, _>>();
        // Model and run tensor namespaces are disjoint by construction.
        if tensors.len() != self.model.tensors.len() + self.tensors.len() {
            return Err("model/run tensor name collision".into());
        }
        let model_config = self.model.configuration()?;
        let run_config = self.settings.serialize()?;
        let mut metadata = BTreeMap::from([
            ("model.conf".into(), model_config),
            ("resume.conf".into(), run_config),
            ("model.sha256".into(), self.model.model_id()?),
        ]);
        metadata.insert(
            "resume.sha256".into(),
            logical_digest(b"learn-llm-training-checkpoint-v1\0", &metadata, &tensors),
        );
        encode(&tensors, metadata)
    }

    pub fn from_bytes(bytes: &[u8]) -> ArchiveResult<Self> {
        let (mut tensors, mut metadata) = decode(bytes)?;
        let checksum = metadata
            .remove("resume.sha256")
            .ok_or("missing resume payload digest")?;
        if checksum != logical_digest(b"learn-llm-training-checkpoint-v1\0", &metadata, &tensors) {
            return Err("resume payload digest mismatch".into());
        }
        if metadata.len() != 3 {
            return Err("unexpected resume metadata".into());
        }
        let mut model_tensors = BTreeMap::new();
        let keys = tensors
            .keys()
            .filter(|name| !name.starts_with("run.") && !name.starts_with("optimizer."))
            .cloned()
            .collect::<Vec<_>>();
        for key in keys {
            model_tensors.insert(key.clone(), tensors.remove(&key).unwrap());
        }
        let model = PortableModel {
            settings: Config::from_string(
                metadata
                    .get("model.conf")
                    .ok_or("missing model configuration")?,
                Some("conf"),
            )?,
            tensors: model_tensors,
        };
        if model.quantization_group_size()?.is_some() {
            return Err("exact training resume requires unquantized model weights".into());
        }
        if metadata.get("model.sha256") != Some(&model.model_id()?) {
            return Err("resume model identity mismatch".into());
        }
        model.validate()?;
        Ok(Self {
            model,
            settings: Config::from_string(
                metadata
                    .get("resume.conf")
                    .ok_or("missing resume configuration")?,
                Some("conf"),
            )?,
            tensors,
        })
    }

    pub fn save_atomic(&self, path: impl AsRef<Path>) -> ArchiveResult<()> {
        super::atomic_replace(path.as_ref(), &self.to_bytes()?)?;
        Ok(())
    }
    pub fn load(path: impl AsRef<Path>) -> ArchiveResult<Self> {
        Self::from_bytes(&fs::read(path)?)
    }
}

fn strip_sha256(value: &str) -> ArchiveResult<String> {
    value
        .strip_prefix("sha256:")
        .map(str::to_owned)
        .ok_or_else(|| "missing digest label".into())
}
