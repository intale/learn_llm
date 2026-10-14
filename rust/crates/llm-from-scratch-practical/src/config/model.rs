//! Semantic axes and the shared constructor/planner census.
use super::{ConfigError, add, checked_u64, checked_usize, mul};
use crate::{
    artifact_identity::{ArtifactDigest, canonical_json_bytes},
    models::decoder::{BLOCK_PARAMETER_SUFFIXES, DecoderModelConfig},
    nn::residual_scale::DEPTH_POLICY_ID,
};
use serde::{Deserialize, Serialize};
pub const MODEL_SCHEMA: &str = "model_schema(version=1;family=causal-decoder-only-autoregressive-text-token;normalization=pre-rmsnorm;position=rope;attention=causal-gqa;activation=swiglu;bias=false;embedding_head=tied-transpose;input=token-ids;output=text-token-logits)";
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelConfig {
    pub schema_version: u64,
    pub schema: String,
    pub v: u64,
    pub d: u64,
    pub l: u64,
    pub hq: u64,
    pub hkv: u64,
    pub f: u64,
    pub c: u64,
    pub rope_base_bits: String,
    pub rms_epsilon_bits: String,
    pub rope_policy: String,
    pub causal_mask_policy: String,
    pub tied_head_policy: String,
    pub vocabulary_id: String,
    pub tokenizer_id: String,
    pub dtype_policy: String,
    pub parameter_family: String,
}
fn float_bits(s: &str) -> Result<f64, ConfigError> {
    if s.len() != 16
        || !s
            .bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
    {
        return Err(ConfigError::Invalid("binary64 spelling"));
    }
    let value = f64::from_bits(
        u64::from_str_radix(s, 16).map_err(|_| ConfigError::Invalid("binary64 bits"))?,
    );
    if !value.is_finite() {
        return Err(ConfigError::Invalid("nonfinite numerical constant"));
    }
    Ok(value)
}
fn identifier(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 128
        && s.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._:-".contains(&b))
}
impl ModelConfig {
    pub fn from_canonical_bytes(bytes: &[u8]) -> Result<Self, ConfigError> {
        let m: Self = super::parse(bytes)?;
        m.validate()?;
        Ok(m)
    }
    pub fn canonical_bytes(&self) -> Result<Vec<u8>, ConfigError> {
        self.validate()?;
        canonical_json_bytes(self).map_err(|_| ConfigError::Invalid("model JSON"))
    }
    pub fn digest(&self) -> Result<ArtifactDigest, ConfigError> {
        self.validate()?;
        super::digest("decoder-model-v1", self)
    }
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.schema_version != 1
            || self.schema != MODEL_SCHEMA
            || self.rope_policy != "adjacent-pairs-v1"
            || self.causal_mask_policy != "occurrence-local-causal-v1"
            || self.tied_head_policy != "embedding-transpose-v1"
            || self.parameter_family != DEPTH_POLICY_ID
        {
            return Err(ConfigError::Invalid("model family or policy"));
        }
        if [self.v, self.d, self.l, self.hq, self.hkv, self.f, self.c].contains(&0) {
            return Err(ConfigError::Invalid("positive model dimensions"));
        }
        self.shape().validate()?;
        if self.rope_base()? <= 0.0 || self.rms_epsilon()? < 0.0 {
            return Err(ConfigError::Invalid("RoPE base or RMS epsilon"));
        }
        if !identifier(&self.vocabulary_id) || !identifier(&self.tokenizer_id) {
            return Err(ConfigError::Invalid("vocabulary or tokenizer identity"));
        }
        if ![
            "scalar-f64",
            "bf16-accounting",
            "wgpu-vulkan-fp16-fp32-protected-dynamicv1",
        ]
        .contains(&self.dtype_policy.as_str())
        {
            return Err(ConfigError::Invalid("dtype policy"));
        }
        Ok(())
    }
    pub fn rope_base(&self) -> Result<f64, ConfigError> {
        float_bits(&self.rope_base_bits)
    }
    pub fn rms_epsilon(&self) -> Result<f64, ConfigError> {
        float_bits(&self.rms_epsilon_bits)
    }
    pub fn shape(&self) -> DecoderShape {
        DecoderShape {
            v: self.v.into(),
            d: self.d.into(),
            l: self.l.into(),
            hq: self.hq.into(),
            hkv: self.hkv.into(),
            f: self.f.into(),
        }
    }
    pub fn executable_config(&self) -> Result<DecoderModelConfig, ConfigError> {
        self.validate()?;
        if self.hq != self.hkv {
            return Err(ConfigError::Invalid(
                "unequal-head GQA has no execution kernel here",
            ));
        }
        if self.dtype_policy != "scalar-f64" {
            return Err(ConfigError::Invalid("no selected dtype execution kernel"));
        }
        Ok(DecoderModelConfig::new(
            checked_usize(self.v.into())?,
            checked_usize(self.d.into())?,
            checked_usize(self.hq.into())?,
            checked_usize(self.f.into())?,
            checked_usize(self.l.into())?,
            checked_usize(self.c.into())?,
            self.rope_base()?,
            self.rms_epsilon()?,
        ))
    }
    pub fn scale(id: &str) -> Result<Self, ConfigError> {
        let (v, d, l, hq, hkv, f, c, dtype) = match id {
            "reference" => (266, 4, 1, 1, 1, 4, 4, "scalar-f64"),
            "bridge" => (266, 16, 2, 2, 2, 20, 16, "scalar-f64"),
            "laptop" | "laptop-smoke-c128-v1" => (
                16384,
                512,
                8,
                8,
                2,
                1536,
                if id == "laptop" { 512 } else { 128 },
                "wgpu-vulkan-fp16-fp32-protected-dynamicv1",
            ),
            "seed-sensitivity" => (
                8192,
                256,
                3,
                4,
                1,
                768,
                256,
                "wgpu-vulkan-fp16-fp32-protected-dynamicv1",
            ),
            "production" => (128000, 8192, 80, 64, 8, 28672, 32768, "bf16-accounting"),
            _ => return Err(ConfigError::Invalid("scale ID")),
        };
        Ok(Self {
            schema_version: 1,
            schema: MODEL_SCHEMA.into(),
            v,
            d,
            l,
            hq,
            hkv,
            f,
            c,
            rope_base_bits: format!("{:016x}", 10000.0_f64.to_bits()),
            rms_epsilon_bits: format!("{:016x}", 1e-6_f64.to_bits()),
            rope_policy: "adjacent-pairs-v1".into(),
            causal_mask_policy: "occurrence-local-causal-v1".into(),
            tied_head_policy: "embedding-transpose-v1".into(),
            vocabulary_id: if v == 266 {
                "controlled-layout-v1"
            } else {
                "declared-vocabulary-v1"
            }
            .into(),
            tokenizer_id: "opaque-source-identity-v1".into(),
            dtype_policy: dtype.into(),
            parameter_family: DEPTH_POLICY_ID.into(),
        })
    }
}
// region:configurable-model-shapes
/// Zero blocks remain legal for the existing legacy API, not the typed profile.
#[derive(Clone, Copy, Debug)]
pub struct DecoderShape {
    pub v: u128,
    pub d: u128,
    pub l: u128,
    pub hq: u128,
    pub hkv: u128,
    pub f: u128,
}
#[derive(Clone, Debug, Serialize)]
pub struct TensorGroup {
    pub name: &'static str,
    pub category: &'static str,
    pub rows: u64,
    pub columns: u64,
    pub repetitions: u64,
    pub partition_axis: &'static str,
    pub shape: Vec<u64>,
}
impl TensorGroup {
    pub fn elements_per_tensor(&self) -> Result<u128, ConfigError> {
        mul(self.rows.into(), self.columns.into(), "tensor shape")
    }
    pub fn elements(&self) -> Result<u128, ConfigError> {
        mul(
            self.elements_per_tensor()?,
            self.repetitions.into(),
            "tensor repetitions",
        )
    }
}
#[derive(Clone, Debug, Serialize)]
pub struct ParameterCensus {
    pub embedding: u64,
    pub attention: u64,
    pub feed_forward: u64,
    pub norms: u64,
    pub total: u64,
    pub tensors: Vec<TensorGroup>,
    pub tied_head_alias: &'static str,
}
impl DecoderShape {
    pub fn validate(self) -> Result<(), ConfigError> {
        if [self.v, self.d, self.hq, self.hkv, self.f].contains(&0)
            || self.hkv > self.hq
            || !self.d.is_multiple_of(self.hq)
            || !self.hq.is_multiple_of(self.hkv)
        {
            return Err(ConfigError::Invalid("head grouping or dimensions"));
        }
        if !(self.d / self.hq).is_multiple_of(2) {
            return Err(ConfigError::Invalid("even RoPE head width"));
        }
        Ok(())
    }
    pub fn head_width(self) -> Result<u128, ConfigError> {
        self.validate()?;
        Ok(self.d / self.hq)
    }
    pub fn kv_width(self) -> Result<u128, ConfigError> {
        mul(self.hkv, self.head_width()?, "KV width")
    }
    pub fn census(self) -> Result<ParameterCensus, ConfigError> {
        self.validate()?;
        let k = self.kv_width()?;
        let mut tensors = Vec::with_capacity(11);
        for (name, category, rows, cols, repetitions, axis) in [
            (
                "token_embedding.weight",
                "embedding",
                self.v,
                self.d,
                1,
                "rows",
            ),
            (
                BLOCK_PARAMETER_SUFFIXES[0],
                "norms",
                self.d,
                1,
                self.l,
                "replicated",
            ),
            (
                BLOCK_PARAMETER_SUFFIXES[1],
                "attention",
                self.d,
                self.d,
                self.l,
                "columns",
            ),
            (
                BLOCK_PARAMETER_SUFFIXES[2],
                "attention",
                self.d,
                k,
                self.l,
                "columns",
            ),
            (
                BLOCK_PARAMETER_SUFFIXES[3],
                "attention",
                self.d,
                k,
                self.l,
                "columns",
            ),
            (
                BLOCK_PARAMETER_SUFFIXES[4],
                "attention",
                self.d,
                self.d,
                self.l,
                "rows",
            ),
            (
                BLOCK_PARAMETER_SUFFIXES[5],
                "norms",
                self.d,
                1,
                self.l,
                "replicated",
            ),
            (
                BLOCK_PARAMETER_SUFFIXES[6],
                "feed_forward",
                self.d,
                self.f,
                self.l,
                "columns",
            ),
            (
                BLOCK_PARAMETER_SUFFIXES[7],
                "feed_forward",
                self.d,
                self.f,
                self.l,
                "columns",
            ),
            (
                BLOCK_PARAMETER_SUFFIXES[8],
                "feed_forward",
                self.f,
                self.d,
                self.l,
                "rows",
            ),
            ("final_norm.gain", "norms", self.d, 1, 1, "replicated"),
        ] {
            tensors.push(TensorGroup {
                name,
                category,
                rows: checked_u64(rows)?,
                columns: checked_u64(cols)?,
                repetitions: checked_u64(repetitions)?,
                partition_axis: axis,
                shape: if category == "norms" {
                    vec![checked_u64(rows)?]
                } else {
                    vec![checked_u64(rows)?, checked_u64(cols)?]
                },
            });
        }
        let mut totals = [0u128; 4];
        for t in &tensors {
            let i = match t.category {
                "embedding" => 0,
                "attention" => 1,
                "feed_forward" => 2,
                _ => 3,
            };
            totals[i] = add(totals[i], t.elements()?, "parameter group")?;
        }
        let total = totals
            .iter()
            .try_fold(0, |a, &b| add(a, b, "parameter census"))?;
        Ok(ParameterCensus {
            embedding: checked_u64(totals[0])?,
            attention: checked_u64(totals[1])?,
            feed_forward: checked_u64(totals[2])?,
            norms: checked_u64(totals[3])?,
            total: checked_u64(total)?,
            tensors,
            tied_head_alias: "token_embedding.weight",
        })
    }
}
// endregion:configurable-model-shapes
