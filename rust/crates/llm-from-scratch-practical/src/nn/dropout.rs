//! Optional elementwise dropout on complete residual-branch outputs.

use std::{error::Error, fmt};

use crate::{
    artifact_identity::ArtifactDigest,
    autograd::tensor_core::{AutogradContext, TensorAutodiffError, TensorValue},
    nn::init::SplitMix64,
    tensor::storage::{Tensor, TensorError},
};

pub const DROPOUT_PLACEMENT: &str = "residual-output-element-dropout-v1";
pub const DROPOUT_COUNTER_VERSION: &str = "course-dropout-counter-v1";
pub const PURPOSE_REGISTRY: [(&str, u64); 6] = [
    ("initialization", 1),
    ("corpus-order", 2),
    ("packing", 3),
    ("optional-dropout", 4),
    ("sampling", 5),
    ("evaluation-bootstrap", 6),
];
pub const DROPOUT_PURPOSE: u64 = 4;
pub const MAX_ACTIVATION_ENTRIES: usize = 1_000_000;
pub const MAX_MASK_BYTES: usize = 67_108_864;
pub const MAX_ADDITIONAL_PAYLOAD_BYTES: usize = 268_435_456;

#[derive(Clone, Debug, PartialEq)]
pub enum DropoutError {
    InvalidProbability {
        bits: u64,
    },
    UnrepresentableScale,
    Shape {
        actual: Vec<usize>,
    },
    Arithmetic(&'static str),
    CounterExhausted,
    Resource {
        role: &'static str,
        requested: usize,
        maximum: usize,
    },
    Allocation {
        entries: usize,
    },
    NonFiniteInput {
        index: usize,
    },
    InvalidMask,
    Binding(&'static str),
    CachedTrain,
    Tensor(TensorError),
    Autodiff(TensorAutodiffError),
}
impl fmt::Display for DropoutError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidProbability { bits } => {
                write!(f, "invalid dropout probability bits {bits:016x}")
            }
            Self::UnrepresentableScale => f.write_str("dropout scale is not finite"),
            Self::Shape { actual } => write!(
                f,
                "dropout requires a rectangular B,T,D tensor, got {actual:?}"
            ),
            Self::Arithmetic(role) => write!(f, "dropout checked arithmetic failed: {role}"),
            Self::CounterExhausted => f.write_str("dropout counter range is exhausted"),
            Self::Resource {
                role,
                requested,
                maximum,
            } => write!(f, "dropout {role} needs {requested}, exceeding {maximum}"),
            Self::Allocation { entries } => write!(f, "cannot reserve {entries} dropout entries"),
            Self::NonFiniteInput { index } => write!(f, "dropout input {index} is not finite"),
            Self::InvalidMask => {
                f.write_str("supplied dropout mask must contain one bit per element")
            }
            Self::Binding(reason) => write!(f, "dropout replay binding mismatch: {reason}"),
            Self::CachedTrain => f.write_str("cached decoding accepts Eval mode only"),
            Self::Tensor(e) => e.fmt(f),
            Self::Autodiff(e) => e.fmt(f),
        }
    }
}
impl Error for DropoutError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Tensor(e) => Some(e),
            Self::Autodiff(e) => Some(e),
            _ => None,
        }
    }
}
impl From<TensorError> for DropoutError {
    fn from(e: TensorError) -> Self {
        Self::Tensor(e)
    }
}
impl From<TensorAutodiffError> for DropoutError {
    fn from(e: TensorAutodiffError) -> Self {
        Self::Autodiff(e)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DropoutMode {
    Train,
    Eval,
}

#[derive(Clone, Copy, Debug)]
pub struct DropoutProbability {
    bits: u64,
    keep: f64,
    scale: f64,
}
impl PartialEq for DropoutProbability {
    fn eq(&self, other: &Self) -> bool {
        self.bits == other.bits
    }
}
impl Eq for DropoutProbability {}
impl DropoutProbability {
    pub fn new(p: f64) -> Result<Self, DropoutError> {
        if !p.is_finite() || !(0.0..1.0).contains(&p) {
            return Err(DropoutError::InvalidProbability { bits: p.to_bits() });
        }
        let keep = 1.0 - p;
        let scale = 1.0 / keep;
        if !keep.is_finite() || keep <= 0.0 || !scale.is_finite() {
            return Err(DropoutError::UnrepresentableScale);
        }
        Ok(Self {
            bits: p.to_bits(),
            keep,
            scale,
        })
    }
    pub fn from_bits(bits: u64) -> Result<Self, DropoutError> {
        Self::new(f64::from_bits(bits))
    }
    pub const fn bits(self) -> u64 {
        self.bits
    }
    pub fn value(self) -> f64 {
        f64::from_bits(self.bits)
    }
    pub const fn keep_probability(self) -> f64 {
        self.keep
    }
    pub const fn scale(self) -> f64 {
        self.scale
    }
    pub fn is_zero(self) -> bool {
        self.value() == 0.0
    }
    pub fn keeps_word(self, word: u64) -> bool {
        SplitMix64::unit_f64_from_word(word) >= self.value()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DropoutPolicy {
    probability: DropoutProbability,
}
impl DropoutPolicy {
    pub fn new(probability: f64) -> Result<Self, DropoutError> {
        Ok(Self {
            probability: DropoutProbability::new(probability)?,
        })
    }
    pub const fn probability(self) -> DropoutProbability {
        self.probability
    }
    pub fn active(self, mode: DropoutMode) -> bool {
        mode == DropoutMode::Train && !self.probability.is_zero()
    }
}
impl Default for DropoutPolicy {
    fn default() -> Self {
        Self::new(0.0).expect("zero is a valid dropout probability")
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DropoutCounterState {
    seed: u64,
    next: u64,
    key: Option<u64>,
}
impl DropoutCounterState {
    pub const fn from_seed(seed: u64) -> Self {
        Self {
            seed,
            next: 0,
            key: None,
        }
    }
    pub const fn at_counter(seed: u64, next: u64) -> Self {
        Self {
            seed,
            next,
            key: None,
        }
    }
    pub const fn seed(&self) -> u64 {
        self.seed
    }
    pub const fn next_counter(&self) -> u64 {
        self.next
    }
    pub const fn key_is_derived(&self) -> bool {
        self.key.is_some()
    }
    pub fn snapshot(&self) -> Self {
        self.clone()
    }
    /// Inspect the next word without deriving a key in, or advancing, this state.
    pub fn peek_next_word(&self) -> Result<u64, DropoutError> {
        checked_range(self.next, 1)?;
        Ok(word_at(
            self.key.unwrap_or_else(|| derive_key(self.seed)),
            self.next,
        ))
    }
}
// region:dropout-counter
fn derive_key(seed: u64) -> u64 {
    SplitMix64::from_state(seed ^ SplitMix64::WORD_INCREMENT.wrapping_mul(DROPOUT_PURPOSE))
        .next_u64()
}
fn word_at(key: u64, counter: u64) -> u64 {
    SplitMix64::from_state(key.wrapping_add(SplitMix64::WORD_INCREMENT.wrapping_mul(counter)))
        .next_u64()
}
fn checked_range(start: u64, count: usize) -> Result<u64, DropoutError> {
    let n = u64::try_from(count).map_err(|_| DropoutError::Arithmetic("counter count"))?;
    if n > 0 && start == u64::MAX {
        return Err(DropoutError::CounterExhausted);
    }
    start.checked_add(n).ok_or(DropoutError::CounterExhausted)
}
// endregion:dropout-counter

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DropoutSiteKind {
    AttentionOutput,
    FeedForwardOutput,
}
impl DropoutSiteKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::AttentionOutput => "attention-output",
            Self::FeedForwardOutput => "ffn-output",
        }
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DropoutSiteId {
    pub layer: usize,
    pub kind: DropoutSiteKind,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DropoutBinding {
    run: ArtifactDigest,
    layout: ArtifactDigest,
    phase: ArtifactDigest,
}
impl DropoutBinding {
    /// Operator callers own these identities; decoder entries derive them from checked text.
    pub fn for_operator(
        run: ArtifactDigest,
        layout: ArtifactDigest,
        phase: ArtifactDigest,
    ) -> Self {
        Self { run, layout, phase }
    }
    pub const fn run(&self) -> &ArtifactDigest {
        &self.run
    }
    pub const fn layout(&self) -> &ArtifactDigest {
        &self.layout
    }
    pub const fn phase(&self) -> &ArtifactDigest {
        &self.phase
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DropoutLimits {
    pub activation_entries: usize,
    pub mask_bytes: usize,
    pub additional_payload_bytes: usize,
}
impl Default for DropoutLimits {
    fn default() -> Self {
        Self {
            activation_entries: MAX_ACTIVATION_ENTRIES,
            mask_bytes: MAX_MASK_BYTES,
            additional_payload_bytes: MAX_ADDITIONAL_PAYLOAD_BYTES,
        }
    }
}
impl DropoutLimits {
    pub(crate) fn admit(self, entries: usize, sites: usize) -> Result<(), DropoutError> {
        let all = entries
            .checked_mul(sites)
            .ok_or(DropoutError::Arithmetic("site entries"))?;
        let mask = all
            .checked_mul(8)
            .ok_or(DropoutError::Arithmetic("multiplier bytes"))?;
        // Existing Multiply allocates output plus two saved primal copies in
        // addition to the constant multiplier, even for its transient no-grad path.
        let payload = mask
            .checked_mul(4)
            .ok_or(DropoutError::Arithmetic("multiply payload bytes"))?;
        for (role, requested, maximum) in [
            (
                "activation entries",
                all.checked_mul(4)
                    .ok_or(DropoutError::Arithmetic("multiply entries"))?,
                self.activation_entries.min(MAX_ACTIVATION_ENTRIES),
            ),
            (
                "multiplier bytes",
                mask,
                self.mask_bytes.min(MAX_MASK_BYTES),
            ),
            (
                "additional payload bytes",
                payload,
                self.additional_payload_bytes
                    .min(MAX_ADDITIONAL_PAYLOAD_BYTES),
            ),
        ] {
            if requested > maximum {
                return Err(DropoutError::Resource {
                    role,
                    requested,
                    maximum,
                });
            }
        }
        Ok(())
    }
}
fn input_entries(input: &TensorValue) -> Result<usize, DropoutError> {
    let shape = input.shape();
    if shape.len() != 3 {
        return Err(DropoutError::Shape { actual: shape });
    }
    let count = shape
        .iter()
        .try_fold(1usize, |n, &d| n.checked_mul(d))
        .ok_or(DropoutError::Arithmetic("B*T*D"))?;
    for (index, x) in input.value().as_slice().iter().enumerate() {
        if !x.is_finite() {
            return Err(DropoutError::NonFiniteInput { index });
        }
    }
    Ok(count)
}

/// Immutable evidence for one site; it grants no authority to change text or weights.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DropoutReplayTicket {
    version: &'static str,
    placement: &'static str,
    purpose: u64,
    seed: u64,
    key: u64,
    start: u64,
    end: u64,
    probability_bits: u64,
    scale_bits: u64,
    site: DropoutSiteId,
    shape: [usize; 3],
    binding: DropoutBinding,
}
impl DropoutReplayTicket {
    pub const fn start(&self) -> u64 {
        self.start
    }
    pub const fn end(&self) -> u64 {
        self.end
    }
    pub const fn seed(&self) -> u64 {
        self.seed
    }
    pub const fn key(&self) -> u64 {
        self.key
    }
    pub const fn purpose(&self) -> u64 {
        self.purpose
    }
    pub const fn version(&self) -> &'static str {
        self.version
    }
    pub const fn site(&self) -> DropoutSiteId {
        self.site
    }
    pub const fn shape(&self) -> [usize; 3] {
        self.shape
    }
    pub const fn probability_bits(&self) -> u64 {
        self.probability_bits
    }
    pub const fn scale_bits(&self) -> u64 {
        self.scale_bits
    }
    pub const fn binding(&self) -> &DropoutBinding {
        &self.binding
    }
    pub fn words(&self) -> Vec<u64> {
        (self.start..self.end)
            .map(|c| word_at(self.key, c))
            .collect()
    }
    pub(crate) fn validate_descriptor(
        &self,
        shape: [usize; 3],
        policy: DropoutPolicy,
        site: DropoutSiteId,
        binding: &DropoutBinding,
        seed: u64,
    ) -> Result<(), DropoutError> {
        if self.version != DROPOUT_COUNTER_VERSION
            || self.placement != DROPOUT_PLACEMENT
            || self.purpose != DROPOUT_PURPOSE
        {
            return Err(DropoutError::Binding("version or purpose"));
        }
        if self.seed != seed || self.key != derive_key(self.seed) {
            return Err(DropoutError::Binding("seed/key"));
        }
        if self.probability_bits != policy.probability.bits()
            || self.scale_bits != policy.probability.scale().to_bits()
            || policy.probability.is_zero()
        {
            return Err(DropoutError::Binding("probability or scale"));
        }
        if self.site != site || self.shape != shape {
            return Err(DropoutError::Binding("site or shape"));
        }
        if &self.binding != binding {
            return Err(DropoutError::Binding("run, text/layout or model phase"));
        }
        let n = shape
            .into_iter()
            .try_fold(1usize, |n, d| n.checked_mul(d))
            .ok_or(DropoutError::Arithmetic("ticket shape"))?;
        if checked_range(self.start, n)? != self.end {
            return Err(DropoutError::Binding("counter range"));
        }
        Ok(())
    }
    fn validate(
        &self,
        input: &TensorValue,
        policy: DropoutPolicy,
        site: DropoutSiteId,
        binding: &DropoutBinding,
    ) -> Result<usize, DropoutError> {
        let n = input_entries(input)?;
        let shape = input.shape();
        self.validate_descriptor(
            [shape[0], shape[1], shape[2]],
            policy,
            site,
            binding,
            self.seed,
        )?;
        Ok(n)
    }
}

#[derive(Clone, Debug)]
pub struct DropoutSiteRecord {
    ticket: DropoutReplayTicket,
    input: TensorValue,
    multiplier: TensorValue,
    output: TensorValue,
}
impl DropoutSiteRecord {
    pub const fn ticket(&self) -> &DropoutReplayTicket {
        &self.ticket
    }
    pub const fn input(&self) -> &TensorValue {
        &self.input
    }
    pub const fn multiplier(&self) -> &TensorValue {
        &self.multiplier
    }
    pub const fn output(&self) -> &TensorValue {
        &self.output
    }
    pub fn mask(&self) -> Vec<u8> {
        self.multiplier
            .value()
            .as_slice()
            .iter()
            .map(|v| u8::from(*v != 0.0))
            .collect()
    }
}
#[derive(Clone, Debug)]
pub struct DropoutApplication {
    output: TensorValue,
    record: Option<DropoutSiteRecord>,
}
impl DropoutApplication {
    pub const fn output(&self) -> &TensorValue {
        &self.output
    }
    pub const fn record(&self) -> Option<&DropoutSiteRecord> {
        self.record.as_ref()
    }
    pub fn into_output(self) -> TensorValue {
        self.output
    }
}
fn multiply(
    context: AutogradContext,
    input: &TensorValue,
    coefficients: Vec<f64>,
) -> Result<(TensorValue, TensorValue), DropoutError> {
    let multiplier = TensorValue::constant(Tensor::from_vec(input.shape(), coefficients)?)?;
    let output = input.mul_with_context(context, &multiplier)?;
    Ok((multiplier, output))
}
fn coefficients_from_validated_range(
    start: u64,
    end: u64,
    n: usize,
    probability: DropoutProbability,
    key: impl FnOnce() -> u64,
) -> Result<(u64, Vec<f64>), DropoutError> {
    let mut coefficients = Vec::new();
    coefficients
        .try_reserve_exact(n)
        .map_err(|_| DropoutError::Allocation { entries: n })?;
    let key = key();
    for c in start..end {
        coefficients.push(if probability.keeps_word(word_at(key, c)) {
            probability.scale()
        } else {
            0.0
        });
    }
    Ok((key, coefficients))
}

// region:dropout-primitive
/// Train samples even under no-grad; Eval and zero probability preserve the handle.
#[allow(clippy::too_many_arguments)]
pub fn apply_dropout_with_context(
    context: AutogradContext,
    input: &TensorValue,
    mode: DropoutMode,
    policy: DropoutPolicy,
    site: DropoutSiteId,
    binding: &DropoutBinding,
    counter: &mut DropoutCounterState,
    limits: DropoutLimits,
) -> Result<DropoutApplication, DropoutError> {
    if !policy.active(mode) {
        return Ok(DropoutApplication {
            output: input.clone(),
            record: None,
        });
    }
    let n = input_entries(input)?;
    let end = checked_range(counter.next, n)?;
    limits.admit(n, 1)?;
    if n == 0 {
        return Ok(DropoutApplication {
            output: input.clone(),
            record: None,
        });
    }
    let (key, coefficients) =
        coefficients_from_validated_range(counter.next, end, n, policy.probability, || {
            counter.key.unwrap_or_else(|| derive_key(counter.seed))
        })?;
    let (multiplier, output) = multiply(context, input, coefficients)?;
    let shape = input.shape();
    let ticket = DropoutReplayTicket {
        version: DROPOUT_COUNTER_VERSION,
        placement: DROPOUT_PLACEMENT,
        purpose: DROPOUT_PURPOSE,
        seed: counter.seed,
        key,
        start: counter.next,
        end,
        probability_bits: policy.probability.bits(),
        scale_bits: policy.probability.scale().to_bits(),
        site,
        shape: [shape[0], shape[1], shape[2]],
        binding: binding.clone(),
    };
    counter.next = end;
    counter.key = Some(key);
    Ok(DropoutApplication {
        output: output.clone(),
        record: Some(DropoutSiteRecord {
            ticket,
            input: input.clone(),
            multiplier,
            output,
        }),
    })
}
// endregion:dropout-primitive

/// Regenerates the forward multiplier; no live counter is accepted or advanced.
pub fn replay_dropout_with_context(
    context: AutogradContext,
    input: &TensorValue,
    ticket: &DropoutReplayTicket,
    policy: DropoutPolicy,
    site: DropoutSiteId,
    binding: &DropoutBinding,
    limits: DropoutLimits,
) -> Result<DropoutApplication, DropoutError> {
    let n = ticket.validate(input, policy, site, binding)?;
    limits.admit(n, 1)?;
    let (_, coefficients) =
        coefficients_from_validated_range(ticket.start, ticket.end, n, policy.probability, || {
            ticket.key
        })?;
    let (multiplier, output) = multiply(context, input, coefficients)?;
    Ok(DropoutApplication {
        output: output.clone(),
        record: Some(DropoutSiteRecord {
            ticket: ticket.clone(),
            input: input.clone(),
            multiplier,
            output,
        }),
    })
}

/// A fixed mathematical mask uses the same Multiply operation as sampled dropout.
pub fn apply_supplied_mask_with_context(
    context: AutogradContext,
    input: &TensorValue,
    policy: DropoutPolicy,
    mask: &[u8],
    limits: DropoutLimits,
) -> Result<DropoutApplication, DropoutError> {
    let n = input_entries(input)?;
    limits.admit(n, 1)?;
    if mask.len() != n || mask.iter().any(|m| *m > 1) {
        return Err(DropoutError::InvalidMask);
    }
    let mut coefficients = Vec::new();
    coefficients
        .try_reserve_exact(n)
        .map_err(|_| DropoutError::Allocation { entries: n })?;
    coefficients.extend(mask.iter().map(|m| {
        if *m == 1 {
            policy.probability.scale()
        } else {
            0.0
        }
    }));
    let (_, output) = multiply(context, input, coefficients)?;
    Ok(DropoutApplication {
        output,
        record: None,
    })
}

pub(crate) enum DropoutExecution<'a> {
    Identity,
    Fresh {
        policy: DropoutPolicy,
        binding: DropoutBinding,
        candidate: DropoutCounterState,
        limits: DropoutLimits,
        records: Vec<DropoutSiteRecord>,
    },
    Replay {
        policy: DropoutPolicy,
        binding: DropoutBinding,
        tickets: &'a [DropoutSiteRecord],
        next: usize,
        limits: DropoutLimits,
        records: Vec<DropoutSiteRecord>,
    },
}
impl DropoutExecution<'_> {
    pub(crate) fn apply(
        &mut self,
        context: AutogradContext,
        input: &TensorValue,
        site: DropoutSiteId,
    ) -> Result<TensorValue, DropoutError> {
        let application = match self {
            Self::Identity => return Ok(input.clone()),
            Self::Fresh {
                policy,
                binding,
                candidate,
                limits,
                ..
            } => apply_dropout_with_context(
                context,
                input,
                DropoutMode::Train,
                *policy,
                site,
                binding,
                candidate,
                *limits,
            )?,
            Self::Replay {
                policy,
                binding,
                tickets,
                next,
                limits,
                ..
            } => {
                let ticket = tickets
                    .get(*next)
                    .ok_or(DropoutError::Binding("missing site ticket"))?
                    .ticket();
                let a = replay_dropout_with_context(
                    context, input, ticket, *policy, site, binding, *limits,
                )?;
                *next += 1;
                a
            }
        };
        let output = application.output;
        if let Some(record) = application.record {
            match self {
                Self::Fresh { records, .. } | Self::Replay { records, .. } => records.push(record),
                Self::Identity => unreachable!(),
            }
        }
        Ok(output)
    }
    pub(crate) fn admit_full(
        shape: [usize; 3],
        sites: usize,
        state: &DropoutCounterState,
        limits: DropoutLimits,
    ) -> Result<(), DropoutError> {
        let n = shape
            .into_iter()
            .try_fold(1usize, |n, d| n.checked_mul(d))
            .ok_or(DropoutError::Arithmetic("full B*T*D"))?;
        let all = n
            .checked_mul(sites)
            .ok_or(DropoutError::Arithmetic("full counter count"))?;
        checked_range(state.next, all)?;
        limits.admit(n, sites)
    }
    pub(crate) fn finish(
        self,
        live: Option<&mut DropoutCounterState>,
    ) -> Result<Vec<DropoutSiteRecord>, DropoutError> {
        match self {
            Self::Identity => Ok(Vec::new()),
            Self::Fresh {
                candidate, records, ..
            } => {
                if let Some(live) = live {
                    *live = candidate;
                }
                Ok(records)
            }
            Self::Replay {
                tickets,
                next,
                records,
                ..
            } => {
                if next != tickets.len() {
                    return Err(DropoutError::Binding("extra site tickets"));
                }
                Ok(records)
            }
        }
    }
}

#[cfg(test)]
#[path = "dropout_tests.rs"]
mod tests;
