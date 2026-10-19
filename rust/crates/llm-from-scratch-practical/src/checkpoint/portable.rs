//! Named logical weights and composition, independent of execution or training.
//! SafeTensors owns the file format; config-lib owns the settings grammar.

use super::CheckpointTokenizer;
use crate::{
    models::{
        causal_decoder_core::{DecoderBackbone, OwnedDecoderBackbone},
        decoder::{DecoderModel, DecoderModelConfig},
        decoder_block::DecoderBlockConfig,
    },
    nn::init::NamedParameter,
    tokenizer::bpe::BpeTokenizer,
    training::trainer::DecoderModelState,
};
use config_lib::Config;
use safetensors::{Dtype, SafeTensors, tensor::TensorView};
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, error::Error, fs, path::Path};

pub type ArchiveResult<T> = Result<T, Box<dyn Error>>;
const SETTINGS_KEY: &str = "learn-llm.settings.conf";
const ID_KEY: &str = "learn-llm.model-sha256";
const MERGES: &str = "assets.text.merge_pairs";
const CONSTANTS: &str = "settings.backbone_constants";

/// This is model assembly, not a registry of arbitrary executable plugins.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ModelComposition {
    TextDecoder,
    Backbone,
}

/// A graph-free model archive. It contains no optimizer or device allocation.
pub struct PortableModel {
    pub(super) settings: Config,
    pub(super) tensors: BTreeMap<String, NamedData>,
}

#[derive(Clone)]
pub(super) struct NamedData {
    pub dtype: Dtype,
    pub shape: Vec<usize>,
    pub bytes: Vec<u8>,
}

impl NamedData {
    pub fn f64(shape: Vec<usize>, values: &[f64]) -> Self {
        Self {
            dtype: Dtype::F64,
            shape,
            bytes: values.iter().flat_map(|x| x.to_le_bytes()).collect(),
        }
    }
    pub fn u64(values: &[u64]) -> Self {
        Self {
            dtype: Dtype::U64,
            shape: vec![values.len()],
            bytes: values.iter().flat_map(|x| x.to_le_bytes()).collect(),
        }
    }
    pub fn float_values(&self) -> ArchiveResult<Vec<f64>> {
        if self.dtype != Dtype::F64 || !self.bytes.len().is_multiple_of(8) {
            return Err("expected a logical F64 tensor".into());
        }
        Ok(self
            .bytes
            .chunks_exact(8)
            .map(|b| f64::from_le_bytes(b.try_into().unwrap()))
            .collect())
    }
    pub fn unsigned_values(&self) -> ArchiveResult<Vec<u64>> {
        if self.dtype != Dtype::U64 || !self.bytes.len().is_multiple_of(8) {
            return Err("expected a logical U64 tensor".into());
        }
        Ok(self
            .bytes
            .chunks_exact(8)
            .map(|b| u64::from_le_bytes(b.try_into().unwrap()))
            .collect())
    }
}

pub(super) fn integer(config: &Config, key: &str) -> ArchiveResult<usize> {
    Ok(usize::try_from(crate::config::settings::number(
        config.as_value(),
        key,
    )?)?)
}
pub(super) fn text(config: &Config, key: &str) -> ArchiveResult<String> {
    Ok(crate::config::settings::text(config.as_value(), key)?)
}
pub(super) fn real(config: &Config, key: &str) -> ArchiveResult<f64> {
    let value = crate::config::settings::field(config.as_value(), key)?;
    let result = match value {
        config_lib::Value::Integer(n) => *n as f64,
        _ => value.as_float()?,
    };
    if !result.is_finite() {
        return Err("non-finite saved setting".into());
    }
    Ok(result)
}

fn settings(config: DecoderBlockConfig, layers: usize) -> ArchiveResult<Config> {
    let mut result = Config::new();
    result.set("version", 1_i64)?;
    result.set("backbone.kind", "causal-pre-rmsnorm-rope-swiglu-v1")?;
    for (name, n) in [
        ("width", config.model_width()),
        ("heads", config.heads()),
        ("feed_forward_width", config.feed_forward_width()),
        ("layers", layers),
        ("positions", config.max_positions()),
    ] {
        result.set(&format!("backbone.{name}"), i64::try_from(n)?)?;
    }
    result.set("backbone.constants", CONSTANTS)?;
    Ok(result)
}

impl PortableModel {
    // region:portable-text-snapshot
    /// Preserve the real text composition, including its sole shared token table.
    pub fn from_text(model: &DecoderModel, tokenizer: &BpeTokenizer) -> ArchiveResult<Self> {
        if tokenizer.layout().vocabulary_size() != model.config().vocabulary_size() {
            return Err("saved text tokenizer and model vocabulary differ".into());
        }
        let state = DecoderModelState::snapshot(model);
        let mut config = settings(state.config().block_config(), state.config().layers())?;
        config.set("composition", "text-decoder-v1")?;
        config.set("encoder.kind", "byte-bpe-embedding-v1")?;
        config.set(
            "encoder.vocabulary",
            i64::try_from(state.config().vocabulary_size())?,
        )?;
        config.set("head.kind", "tied-embedding-transpose-v1")?;
        config.set("head.alias", "token_embedding.weight")?;
        config.set(
            "encoder.tokenizer_layout",
            i64::from(tokenizer.layout().version()),
        )?;
        let mut tensors = state
            .named_tensors()
            .map(|(name, tensor)| {
                (
                    name.to_owned(),
                    NamedData::f64(tensor.shape().to_vec(), tensor.as_slice()),
                )
            })
            .collect::<BTreeMap<_, _>>();
        let pairs = tokenizer
            .merge_rules()
            .iter()
            .flat_map(|rule| {
                let pair = rule.training_pair();
                [pair.left(), pair.right()]
                    .into_iter()
                    .flat_map(u32::to_le_bytes)
            })
            .collect();
        tensors.insert(
            MERGES.into(),
            NamedData {
                dtype: Dtype::U32,
                shape: vec![tokenizer.merge_rules().len(), 2],
                bytes: pairs,
            },
        );
        tensors.insert(
            CONSTANTS.into(),
            NamedData::f64(
                vec![2],
                &[state.config().rope_base(), state.config().rms_epsilon()],
            ),
        );
        Ok(Self {
            settings: config,
            tensors,
        })
    }
    // endregion:portable-text-snapshot

    /// A backbone archive has no vocabulary, encoder, head, or tokenizer asset.
    pub fn from_backbone(backbone: &DecoderBackbone<'_>) -> ArchiveResult<Self> {
        let mut config = settings(backbone.config(), backbone.blocks().len())?;
        config.set("composition", "backbone-v1")?;
        let mut tensors = backbone
            .parameters()
            .map(|p| {
                let tensor = p.tensor().value();
                (
                    p.name().to_owned(),
                    NamedData::f64(tensor.shape().to_vec(), tensor.as_slice()),
                )
            })
            .collect::<BTreeMap<_, _>>();
        tensors.insert(
            CONSTANTS.into(),
            NamedData::f64(
                vec![2],
                &[
                    backbone.config().rope_base(),
                    backbone.config().rms_epsilon(),
                ],
            ),
        );
        Ok(Self {
            settings: config,
            tensors,
        })
    }

    pub fn composition(&self) -> ArchiveResult<ModelComposition> {
        match text(&self.settings, "composition")?.as_str() {
            "text-decoder-v1" => Ok(ModelComposition::TextDecoder),
            "backbone-v1" => Ok(ModelComposition::Backbone),
            _ => Err("unsupported saved model composition".into()),
        }
    }

    /// Identity covers semantics, named shapes/dtypes/values and necessary assets.
    /// File byte order, optimizer state and device selection are not model identity.
    pub fn model_id(&self) -> ArchiveResult<String> {
        let normalized = self.normalized_settings()?.serialize()?;
        Ok(logical_digest(
            b"learn-llm-portable-model-v1\0",
            &BTreeMap::from([("configuration".into(), normalized)]),
            &self.tensors,
        ))
    }

    pub fn tensor_names(&self) -> impl Iterator<Item = &str> {
        self.tensors.keys().map(String::as_str)
    }

    pub fn configuration(&self) -> ArchiveResult<String> {
        Ok(self.normalized_settings()?.serialize()?)
    }

    fn backbone_config(&self) -> ArchiveResult<(DecoderBlockConfig, usize)> {
        if integer(&self.settings, "version")? != 1
            || text(&self.settings, "backbone.kind")? != "causal-pre-rmsnorm-rope-swiglu-v1"
            || text(&self.settings, "backbone.constants")? != CONSTANTS
        {
            return Err("unsupported saved model version or backbone".into());
        }
        let constants = self
            .tensors
            .get(CONSTANTS)
            .ok_or("missing backbone numerical constants")?;
        if constants.shape != [2] {
            return Err("invalid backbone numerical constants shape".into());
        }
        let constants = constants.float_values()?;
        Ok((
            DecoderBlockConfig::new(
                integer(&self.settings, "backbone.width")?,
                integer(&self.settings, "backbone.heads")?,
                integer(&self.settings, "backbone.feed_forward_width")?,
                integer(&self.settings, "backbone.positions")?,
                constants[0],
                constants[1],
            ),
            integer(&self.settings, "backbone.layers")?,
        ))
    }

    fn normalized_settings(&self) -> ArchiveResult<Config> {
        let (backbone, layers) = self.backbone_config()?;
        let mut config = settings(backbone, layers)?;
        match self.composition()? {
            ModelComposition::TextDecoder => {
                if text(&self.settings, "encoder.kind")? != "byte-bpe-embedding-v1"
                    || text(&self.settings, "head.kind")? != "tied-embedding-transpose-v1"
                    || text(&self.settings, "head.alias")? != "token_embedding.weight"
                    || integer(&self.settings, "encoder.tokenizer_layout")?
                        != crate::tokenizer::bpe::TOKENIZER_LAYOUT_VERSION as usize
                {
                    return Err(
                        "unsupported text encoder, tokenizer layout, or tied-head alias".into(),
                    );
                }
                config.set("composition", "text-decoder-v1")?;
                config.set("encoder.kind", "byte-bpe-embedding-v1")?;
                config.set(
                    "encoder.vocabulary",
                    i64::try_from(integer(&self.settings, "encoder.vocabulary")?)?,
                )?;
                config.set(
                    "encoder.tokenizer_layout",
                    i64::from(crate::tokenizer::bpe::TOKENIZER_LAYOUT_VERSION),
                )?;
                config.set("head.kind", "tied-embedding-transpose-v1")?;
                config.set("head.alias", "token_embedding.weight")?;
            }
            ModelComposition::Backbone => {
                config.set("composition", "backbone-v1")?;
            }
        }
        if let Some(group_size) = self.quantization_group_size()? {
            config.set("quantization.scheme", super::quantization::I4_SCHEME)?;
            config.set("quantization.group_size", i64::try_from(group_size)?)?;
        }
        if config.as_value() != self.settings.as_value() {
            return Err("unknown or inconsistent model settings".into());
        }
        Ok(config)
    }

    pub(super) fn parameters(&self) -> ArchiveResult<Vec<NamedParameter>> {
        let (_, layers) = self.backbone_config()?;
        let text_model = self.composition()? == ModelComposition::TextDecoder;
        let mut expected = layers
            .checked_mul(crate::models::decoder::BLOCK_PARAMETER_SUFFIXES.len())
            .and_then(|n| n.checked_add(2 + 2 * usize::from(text_model)))
            .ok_or("saved layer count overflows tensor count")?;
        let quantization = self.quantization_group_size()?;
        if quantization.is_some() {
            let matrices_per_block = crate::models::decoder::BLOCK_PARAMETER_SUFFIXES
                .iter()
                .filter(|suffix| suffix.ends_with(".weight"))
                .count();
            expected = layers
                .checked_mul(matrices_per_block)
                .and_then(|n| n.checked_add(usize::from(text_model)))
                .and_then(|n| n.checked_mul(2))
                .and_then(|n| expected.checked_add(n))
                .ok_or("quantization sidecar count overflows")?;
        }
        if self.tensors.len() != expected {
            return Err("saved tensor set is missing or has extra entries".into());
        }
        let mut names = Vec::new();
        if text_model {
            names.push("token_embedding.weight".to_owned());
        }
        for layer in 0..layers {
            for suffix in crate::models::decoder::BLOCK_PARAMETER_SUFFIXES {
                names.push(format!("blocks.{layer}.{suffix}"));
            }
        }
        names.push("final_norm.gain".into());
        // Existing constructors own tensor rank, shape, finite-value and alias checks.
        let parameters = names
            .into_iter()
            .map(|name| {
                let tensor = self.tensors.get(&name).ok_or("missing model tensor")?;
                let value = self.logical_parameter(&name, tensor, quantization)?;
                Ok(NamedParameter::from_tensor(name, value)?)
            })
            .collect::<ArchiveResult<Vec<_>>>()?;
        Ok(parameters)
    }

    // region:portable-model-restore
    pub fn restore_text(&self) -> ArchiveResult<(DecoderModel, BpeTokenizer)> {
        self.normalized_settings()?;
        if self.composition()? != ModelComposition::TextDecoder {
            return Err("archive is a backbone, not a text model".into());
        }
        let (config, layers) = self.backbone_config()?;
        let merges = self.tensors.get(MERGES).ok_or("missing tokenizer asset")?;
        if merges.dtype != Dtype::U32 || merges.shape.len() != 2 || merges.shape[1] != 2 {
            return Err("invalid text merge asset shape or dtype".into());
        }
        let pairs = merges
            .bytes
            .chunks_exact(8)
            .map(|b| {
                crate::tokenizer::bpe_trainer::TokenPair::new(
                    u32::from_le_bytes(b[..4].try_into().unwrap()),
                    u32::from_le_bytes(b[4..].try_into().unwrap()),
                )
            })
            .collect();
        let saved_tokenizer = CheckpointTokenizer::from_byte_bpe_pairs(pairs)?;
        let vocabulary = integer(&self.settings, "encoder.vocabulary")?;
        if saved_tokenizer.vocabulary_size() != vocabulary {
            return Err("saved text vocabulary and tokenizer asset differ".into());
        }
        let model_config = DecoderModelConfig::new(
            vocabulary,
            config.model_width(),
            config.heads(),
            config.feed_forward_width(),
            layers,
            config.max_positions(),
            config.rope_base(),
            config.rms_epsilon(),
        );
        let model = DecoderModel::from_parameters(model_config, self.parameters()?)?;
        let tokenizer = saved_tokenizer
            .restore_bpe()?
            .ok_or("missing byte BPE tokenizer")?;
        Ok((model, tokenizer))
    }

    pub fn restore_backbone(&self) -> ArchiveResult<OwnedDecoderBackbone> {
        self.normalized_settings()?;
        if self.composition()? != ModelComposition::Backbone {
            return Err("archive contains a complete text model".into());
        }
        let (config, layers) = self.backbone_config()?;
        Ok(OwnedDecoderBackbone::from_parameters(
            config,
            layers,
            self.parameters()?,
        )?)
    }
    // endregion:portable-model-restore

    pub fn to_bytes(&self) -> ArchiveResult<Vec<u8>> {
        self.validate()?;
        encode(
            &self.tensors,
            [
                (SETTINGS_KEY.into(), self.configuration()?),
                (ID_KEY.into(), self.model_id()?),
            ],
        )
    }

    pub fn from_bytes(bytes: &[u8]) -> ArchiveResult<Self> {
        let (tensors, metadata) = decode(bytes)?;
        if metadata.len() != 2 {
            return Err("unexpected portable model metadata".into());
        }
        let config = metadata.get(SETTINGS_KEY).ok_or("missing model settings")?;
        let model = Self {
            settings: Config::from_string(config, Some("conf"))?,
            tensors,
        };
        if metadata.get(ID_KEY) != Some(&model.model_id()?) {
            return Err("saved model identity mismatch".into());
        }
        model.validate()?;
        Ok(model)
    }

    pub fn validate(&self) -> ArchiveResult<()> {
        match self.composition()? {
            ModelComposition::TextDecoder => {
                self.restore_text()?;
            }
            ModelComposition::Backbone => {
                self.restore_backbone()?;
            }
        }
        Ok(())
    }

    pub fn load(path: impl AsRef<Path>) -> ArchiveResult<Self> {
        Self::from_bytes(&fs::read(path)?)
    }

    pub fn save_atomic(&self, path: impl AsRef<Path>) -> ArchiveResult<()> {
        super::atomic_replace(path.as_ref(), &self.to_bytes()?)?;
        Ok(())
    }
}

fn hash_field(hasher: &mut Sha256, bytes: &[u8]) {
    hasher.update((bytes.len() as u64).to_le_bytes());
    hasher.update(bytes);
}

/// Hash logical fields in name order, independently of file metadata ordering.
pub(super) fn logical_digest(
    domain: &[u8],
    metadata: &BTreeMap<String, String>,
    tensors: &BTreeMap<String, NamedData>,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(domain);
    hasher.update((metadata.len() as u64).to_le_bytes());
    for (key, value) in metadata {
        hash_field(&mut hasher, key.as_bytes());
        hash_field(&mut hasher, value.as_bytes());
    }
    hasher.update((tensors.len() as u64).to_le_bytes());
    for (name, tensor) in tensors {
        hash_field(&mut hasher, name.as_bytes());
        hash_field(&mut hasher, format!("{:?}", tensor.dtype).as_bytes());
        hasher.update((tensor.shape.len() as u64).to_le_bytes());
        for &dimension in &tensor.shape {
            hasher.update((dimension as u64).to_le_bytes());
        }
        hash_field(&mut hasher, &tensor.bytes);
    }
    format!("{:x}", hasher.finalize())
}

pub(super) fn encode(
    tensors: &BTreeMap<String, NamedData>,
    metadata: impl IntoIterator<Item = (String, String)>,
) -> ArchiveResult<Vec<u8>> {
    let views = tensors
        .iter()
        .map(|(name, tensor)| {
            Ok((
                name,
                TensorView::new(tensor.dtype, tensor.shape.clone(), &tensor.bytes)?,
            ))
        })
        .collect::<ArchiveResult<Vec<_>>>()?;
    Ok(safetensors::serialize(
        views,
        Some(metadata.into_iter().collect()),
    )?)
}

pub(super) fn decode(
    bytes: &[u8],
) -> ArchiveResult<(BTreeMap<String, NamedData>, BTreeMap<String, String>)> {
    let (_, metadata) = SafeTensors::read_metadata(bytes)?;
    let metadata = metadata
        .metadata()
        .as_ref()
        .ok_or("missing model metadata")?
        .iter()
        .map(|(key, value)| (key.clone(), value.clone()))
        .collect();
    let archive = SafeTensors::deserialize(bytes)?;
    let tensors = archive
        .iter()
        .map(|(name, tensor)| {
            (
                name.to_owned(),
                NamedData {
                    dtype: tensor.dtype(),
                    shape: tensor.shape().to_vec(),
                    bytes: tensor.data().to_vec(),
                },
            )
        })
        .collect();
    Ok((tensors, metadata))
}

#[cfg(test)]
#[path = "portable_tests.rs"]
mod tests;
