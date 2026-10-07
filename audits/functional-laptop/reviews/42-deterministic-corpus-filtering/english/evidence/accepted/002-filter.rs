// One versioned sequence of first-terminal record decisions.

use super::{
    privacy::{contains_ascii_case_insensitive, contains_case_sensitive, validate_markers},
    stream::{DataError, Frame, FrameData, FramingPolicy, decimal},
};
use crate::artifact_identity::sha256;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Rule {
    RawSize,
    Utf8,
    MinLength,
    AsciiLetters,
    SecretMarker,
    ManualMarker,
    AsciiShareReview,
}
pub const ALL_RULES: [Rule; 7] = [
    Rule::RawSize,
    Rule::Utf8,
    Rule::MinLength,
    Rule::AsciiLetters,
    Rule::SecretMarker,
    Rule::ManualMarker,
    Rule::AsciiShareReview,
];
impl Rule {
    pub fn code(self) -> &'static str {
        match self {
            Self::RawSize => "raw-size",
            Self::Utf8 => "utf8",
            Self::MinLength => "min-length",
            Self::AsciiLetters => "ascii-letters",
            Self::SecretMarker => "secret-marker",
            Self::ManualMarker => "manual-marker",
            Self::AsciiShareReview => "ascii-share-review",
        }
    }
    pub fn terminal_disposition(self) -> Disposition {
        if matches!(self, Self::ManualMarker | Self::AsciiShareReview) {
            Disposition::ManualReview
        } else {
            Disposition::Rejected
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Disposition {
    Retained,
    Rejected,
    ManualReview,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FilterPolicy {
    #[serde(with = "decimal")]
    pub ascii_letter_minimum: u64,
    #[serde(with = "decimal")]
    pub ascii_share_denominator: u64,
    #[serde(with = "decimal")]
    pub ascii_share_numerator: u64,
    pub framing: FramingPolicy,
    pub manual_markers: Vec<String>,
    #[serde(with = "decimal")]
    pub minimum_normalized_bytes: u64,
    pub normalization: String,
    pub secret_markers: Vec<String>,
    pub stages: Vec<Rule>,
    pub version: String,
}
impl FilterPolicy {
    pub fn validate(&self) -> Result<(), DataError> {
        self.framing.validate()?;
        validate_markers(&self.secret_markers)?;
        validate_markers(&self.manual_markers)?;
        let unique: std::collections::BTreeSet<_> = self.stages.iter().copied().collect();
        if self.version != "ordered-first-terminal-v1"
            || self.normalization != "crlf-then-ascii-edge-trim-v1"
            || self.stages.len() != ALL_RULES.len()
            || self.stages.get(..2) != Some(&[Rule::RawSize, Rule::Utf8])
            || unique != ALL_RULES.into_iter().collect()
            || self.minimum_normalized_bytes == 0
            || self.ascii_share_denominator == 0
            || self.ascii_share_numerator > self.ascii_share_denominator
        {
            return Err(DataError::InvalidPolicy(
                "versions, complete ordered rules or thresholds",
            ));
        }
        Ok(())
    }
    pub fn digest(&self) -> Result<String, DataError> {
        self.validate()?;
        Ok(sha256(&canonical_json(self)?).as_hex().into())
    }
}

/// Standard serde handles JSON; sorted object maps and one LF fix its bytes.
pub fn canonical_json<T: Serialize>(value: &T) -> Result<Vec<u8>, DataError> {
    let value =
        serde_json::to_value(value).map_err(|_| DataError::InvalidRecord("serialization"))?;
    let mut bytes =
        serde_json::to_vec(&value).map_err(|_| DataError::InvalidRecord("serialization"))?;
    bytes.push(b'\n');
    Ok(bytes)
}

// region:narrow-normalization
pub fn normalize(text: &str) -> String {
    text.replace("\r\n", "\n")
        .trim_matches([' ', '\t', '\r', '\n'])
        .to_owned()
}
// endregion:narrow-normalization

fn ascii_space(character: char) -> bool {
    matches!(
        character,
        ' ' | '\t' | '\n' | '\u{000b}' | '\u{000c}' | '\r'
    )
}

pub struct Decision {
    pub disposition: Disposition,
    pub evaluated_rules: Vec<Rule>,
    pub first_terminal_rule: Option<Rule>,
    pub normalized_bytes: Option<u64>,
    pub raw_decoded: bool,
    pub raw_bytes: u64,
    /// Only retained decisions expose a body to the destination.
    retained_text: Option<String>,
}
impl Decision {
    pub fn retained_text(&self) -> Option<&str> {
        self.retained_text.as_deref()
    }
    fn terminal(raw_bytes: u64, rules: Vec<Rule>, rule: Rule, normalized: Option<u64>) -> Self {
        Self {
            disposition: rule.terminal_disposition(),
            evaluated_rules: rules,
            first_terminal_rule: Some(rule),
            normalized_bytes: normalized,
            raw_decoded: normalized.is_some(),
            raw_bytes,
            retained_text: None,
        }
    }
}

fn normalized_terminal(text: &str, rule: Rule, policy: &FilterPolicy) -> Result<bool, DataError> {
    let letters = u64::try_from(text.chars().filter(char::is_ascii_alphabetic).count())
        .map_err(|_| DataError::Overflow)?;
    match rule {
        Rule::MinLength => Ok((text.len() as u64) < policy.minimum_normalized_bytes),
        Rule::AsciiLetters => Ok(letters < policy.ascii_letter_minimum),
        Rule::SecretMarker => Ok(contains_ascii_case_insensitive(
            text,
            &policy.secret_markers,
        )),
        Rule::ManualMarker => Ok(contains_case_sensitive(text, &policy.manual_markers)),
        Rule::AsciiShareReview => {
            let scalars = u64::try_from(text.chars().filter(|&c| !ascii_space(c)).count())
                .map_err(|_| DataError::Overflow)?;
            // A missing text-coverage denominator is not a measured zero share.
            if scalars == 0 {
                return Ok(true);
            }
            let left = letters
                .checked_mul(policy.ascii_share_denominator)
                .ok_or(DataError::Overflow)?;
            let right = scalars
                .checked_mul(policy.ascii_share_numerator)
                .ok_or(DataError::Overflow)?;
            Ok(left < right)
        }
        Rule::RawSize | Rule::Utf8 => Err(DataError::InvalidPolicy("raw rule after normalization")),
    }
}

// region:ordered-record-filter
pub fn evaluate(frame: &Frame, policy: &FilterPolicy) -> Result<Decision, DataError> {
    policy.validate()?;
    let raw_bytes = frame.raw_bytes()?;
    let mut visited = vec![Rule::RawSize];
    if raw_bytes > policy.framing.max_payload_bytes {
        return Ok(Decision::terminal(raw_bytes, visited, Rule::RawSize, None));
    }
    let bytes = match &frame.data {
        FrameData::Bytes(bytes) if bytes.len() as u64 == raw_bytes => bytes,
        _ => return Err(DataError::InvalidRecord("frame body/span disagreement")),
    };
    visited.push(Rule::Utf8);
    let text = match std::str::from_utf8(bytes) {
        Ok(text) => normalize(text),
        Err(_) => return Ok(Decision::terminal(raw_bytes, visited, Rule::Utf8, None)),
    };
    let normalized_bytes = text.len() as u64;
    for &rule in &policy.stages[2..] {
        visited.push(rule);
        if normalized_terminal(&text, rule, policy)? {
            return Ok(Decision::terminal(
                raw_bytes,
                visited,
                rule,
                Some(normalized_bytes),
            ));
        }
    }
    Ok(Decision {
        disposition: Disposition::Retained,
        evaluated_rules: visited,
        first_terminal_rule: None,
        normalized_bytes: Some(normalized_bytes),
        raw_decoded: true,
        raw_bytes,
        retained_text: Some(text),
    })
}
// endregion:ordered-record-filter

/// Check the normalized part of an already selected retained-stage record.
/// Raw provenance and complete payload integrity are separate required checks.
pub fn accepts_normalized(text: &str, policy: &FilterPolicy) -> Result<bool, DataError> {
    policy.validate()?;
    if normalize(text) != text {
        return Ok(false);
    }
    for &rule in &policy.stages[2..] {
        if normalized_terminal(text, rule, policy)? {
            return Ok(false);
        }
    }
    Ok(true)
}

#[cfg(test)]
pub(crate) fn test_policy() -> FilterPolicy {
    use super::stream::EofBoundary;
    FilterPolicy {
        ascii_letter_minimum: 1,
        ascii_share_denominator: 1,
        ascii_share_numerator: 0,
        framing: FramingPolicy {
            delimiter: "END".into(),
            eof: EofBoundary::CloseNonemptyFinalPayload,
            max_payload_bytes: 64,
            version: "end-of-input-delimited-v2".into(),
        },
        manual_markers: vec!["contact=".into()],
        minimum_normalized_bytes: 4,
        normalization: "crlf-then-ascii-edge-trim-v1".into(),
        secret_markers: vec!["demo-key=CANARY".into()],
        stages: ALL_RULES.to_vec(),
        version: "ordered-first-terminal-v1".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::super::stream::ByteSpan;
    use super::*;
    fn decision(bytes: &[u8], policy: &FilterPolicy) -> Decision {
        evaluate(
            &Frame {
                data: FrameData::Bytes(bytes.to_vec()),
                delimiter: None,
                span: ByteSpan {
                    start: 0,
                    end: bytes.len() as u64,
                },
            },
            policy,
        )
        .unwrap()
    }
    #[test]
    fn each_terminal_rule_excludes_later_rules() {
        let policy = test_policy();
        for (bytes, rule) in [
            (&[0xff, b'\n'][..], Rule::Utf8),
            (&b"hi\n"[..], Rule::MinLength),
            (&b"....\n"[..], Rule::AsciiLetters),
            (&b"demo-key=CANARY\n"[..], Rule::SecretMarker),
            (&b"contact=alex@example.invalid\n"[..], Rule::ManualMarker),
        ] {
            let d = decision(bytes, &policy);
            assert_eq!(d.first_terminal_rule, Some(rule));
            assert_eq!(d.evaluated_rules.last(), Some(&rule));
            assert!(d.retained_text().is_none());
        }
        assert_eq!(
            decision(&[b'x'; 65], &policy).first_terminal_rule,
            Some(Rule::RawSize)
        );
    }
    #[test]
    fn changing_order_changes_the_hash_and_first_terminal_only_when_reached() {
        let mut policy = test_policy();
        let raw = b"demo-key=CANARY contact=alex@example.invalid\n";
        assert_eq!(decision(raw, &policy).disposition, Disposition::Rejected);
        let original = policy.digest().unwrap();
        policy.stages.swap(4, 5);
        let d = decision(raw, &policy);
        assert_eq!(d.disposition, Disposition::ManualReview);
        assert!(!d.evaluated_rules.contains(&Rule::SecretMarker));
        assert_ne!(original, policy.digest().unwrap());
    }
    #[test]
    fn normalization_preserves_case_internal_spaces_and_unicode() {
        assert_eq!(normalize(" \tCAT  sat.\r\n \n"), "CAT  sat.");
        assert_eq!(
            normalize("\u{00a0}É\r\n猫\u{00a0}"),
            "\u{00a0}É\n猫\u{00a0}"
        );
        assert_eq!(normalize("a\rb"), "a\rb");
    }
    #[test]
    fn exact_scalar_coverage_is_not_a_language_classifier() {
        let mut p = test_policy();
        p.ascii_letter_minimum = 0;
        p.minimum_normalized_bytes = 1;
        p.ascii_share_numerator = 1;
        p.ascii_share_denominator = 2;
        assert_eq!(
            decision("字字ab".as_bytes(), &p).disposition,
            Disposition::Retained
        );
        assert_eq!(
            decision("字字字ab".as_bytes(), &p).disposition,
            Disposition::ManualReview
        );
        assert_eq!(decision(b"qwerty", &p).disposition, Disposition::Retained);
        assert_eq!(
            decision(b"\x0b\x0c", &p).disposition,
            Disposition::ManualReview
        );
    }
    #[test]
    fn production_risk_markers_reach_the_marker_rules() {
        let mut p = test_policy();
        p.minimum_normalized_bytes = 16;
        p.ascii_letter_minimum = 8;
        p.framing.max_payload_bytes = 65_536;
        p.secret_markers = vec![
            "-----BEGIN PRIVATE KEY-----".into(),
            "CANARY".into(),
            "api_key=".into(),
            "password=".into(),
        ];
        p.manual_markers = vec!["@".into(), "contact=".into()];
        for raw in [
            b"note demo-key=CANARY\n".as_slice(),
            b"note api_key=fiction\n",
            b"note password=fiction\n",
            b"note -----BEGIN PRIVATE KEY-----\n",
        ] {
            assert_eq!(
                decision(raw, &p).first_terminal_rule,
                Some(Rule::SecretMarker)
            );
        }
        assert_eq!(
            decision(b"reach contact=alex@example.invalid\n", &p).disposition,
            Disposition::ManualReview
        );
        assert_eq!(
            decision(b"demo-key=CANARY\n", &p).first_terminal_rule,
            Some(Rule::MinLength)
        );
    }
    #[test]
    fn stage_set_thresholds_and_checked_ratio_refuse_invalid_policies() {
        let mut p = test_policy();
        p.stages[6] = Rule::Utf8;
        assert!(p.validate().is_err());
        p = test_policy();
        p.ascii_share_denominator = 0;
        assert!(p.validate().is_err());
        p = test_policy();
        p.ascii_share_numerator = 2;
        assert!(p.validate().is_err());
        p = test_policy();
        p.ascii_share_denominator = u64::MAX;
        p.ascii_share_numerator = 1;
        let frame = Frame {
            data: FrameData::Bytes(b"hello".to_vec()),
            delimiter: None,
            span: ByteSpan { start: 0, end: 5 },
        };
        assert!(matches!(evaluate(&frame, &p), Err(DataError::Overflow)));
    }
    #[test]
    fn threshold_change_changes_identity_even_with_the_same_retained_text() {
        let p = test_policy();
        let mut q = p.clone();
        q.minimum_normalized_bytes = 5;
        assert_ne!(p.digest().unwrap(), q.digest().unwrap());
        assert_eq!(
            decision(b"cat sat.\n", &p).retained_text(),
            decision(b"cat sat.\n", &q).retained_text()
        );
    }
}
