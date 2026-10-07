// Narrow marker heuristics and structurally body-free findings, not privacy proof.

use super::{
    filter::{Disposition, Rule},
    stream::{ByteSpan, DataError, decimal},
};
use serde::{Deserialize, Serialize};

pub const MAX_MARKER_BYTES: usize = 256;
pub const MAX_MARKERS_PER_RULE: usize = 64;

pub fn validate_markers(markers: &[String]) -> Result<(), DataError> {
    if markers.len() > MAX_MARKERS_PER_RULE
        || markers.iter().any(|marker| {
            marker.is_empty() || !marker.is_ascii() || marker.len() > MAX_MARKER_BYTES
        })
        || markers.windows(2).any(|pair| pair[0] >= pair[1])
    {
        return Err(DataError::InvalidPolicy(
            "ASCII markers must be bounded, sorted and unique",
        ));
    }
    Ok(())
}

// region:literal-marker-decisions
pub fn contains_ascii_case_insensitive(text: &str, markers: &[String]) -> bool {
    markers.iter().any(|marker| {
        !marker.is_empty()
            && text
                .as_bytes()
                .windows(marker.len())
                .any(|window| window.eq_ignore_ascii_case(marker.as_bytes()))
    })
}

pub fn contains_case_sensitive(text: &str, markers: &[String]) -> bool {
    markers
        .iter()
        .any(|marker| !marker.is_empty() && text.contains(marker))
}
// endregion:literal-marker-decisions

/// This schema intentionally has no text, snippet, capture or matching value.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RedactedFinding {
    pub disposition: Disposition,
    pub evaluated_rules: Vec<Rule>,
    pub first_terminal_rule: Rule,
    #[serde(with = "optional_decimal")]
    pub normalized_bytes: Option<u64>,
    pub payload_id: String,
    #[serde(with = "decimal")]
    pub raw_bytes: u64,
    pub raw_span: ByteSpan,
    pub record_id: String,
    pub source_artifact_id: String,
    pub source_file_sha256: String,
    pub source_id: String,
}
mod optional_decimal {
    use serde::{Deserialize, Deserializer, Serializer, de::Error};
    pub fn serialize<S: Serializer>(value: &Option<u64>, serializer: S) -> Result<S::Ok, S::Error> {
        match value {
            Some(value) => serializer.serialize_some(&value.to_string()),
            None => serializer.serialize_none(),
        }
    }
    pub fn deserialize<'de, D: Deserializer<'de>>(
        deserializer: D,
    ) -> Result<Option<u64>, D::Error> {
        Option::<String>::deserialize(deserializer)?
            .map(|value| {
                let n = value.parse::<u64>().map_err(D::Error::custom)?;
                if value != n.to_string() {
                    return Err(D::Error::custom("noncanonical count"));
                }
                Ok(n)
            })
            .transpose()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn secret_marker_is_ascii_case_insensitive_not_a_general_detector() {
        let markers = vec!["api_key=".into()];
        assert!(contains_ascii_case_insensitive(
            "note API_KEY=fiction",
            &markers
        ));
        assert!(contains_ascii_case_insensitive(
            "Never write api_key= here",
            &markers
        ));
        assert!(!contains_ascii_case_insensitive(
            "An api key: hidden",
            &markers
        ));
    }
    #[test]
    fn manual_marker_is_case_sensitive_and_has_false_positives_and_negatives() {
        let markers = vec!["@".into(), "contact=".into()];
        assert!(contains_case_sensitive(
            "contact= is a field name",
            &markers
        ));
        assert!(!contains_case_sensitive(
            "CONTACT=alex(at)example.invalid",
            &markers
        ));
    }
    #[test]
    fn empty_duplicate_nonascii_and_overlong_markers_refuse() {
        for markers in [
            vec!["".into()],
            vec!["a".into(), "a".into()],
            vec!["é".into()],
            vec!["x".repeat(MAX_MARKER_BYTES + 1)],
        ] {
            assert!(validate_markers(&markers).is_err());
        }
        assert!(validate_markers(&[]).is_ok());
    }
    #[test]
    fn finding_schema_cannot_accept_a_snippet() {
        let finding = RedactedFinding {
            disposition: Disposition::Rejected,
            evaluated_rules: vec![Rule::RawSize],
            first_terminal_rule: Rule::RawSize,
            normalized_bytes: None,
            payload_id: "opaque".into(),
            raw_bytes: 65,
            raw_span: ByteSpan { start: 0, end: 65 },
            record_id: "a".repeat(64),
            source_artifact_id: "b".repeat(64),
            source_file_sha256: "c".repeat(64),
            source_id: "source".into(),
        };
        let mut value = serde_json::to_value(&finding).unwrap();
        value["snippet"] = serde_json::json!("fictional secret");
        assert!(serde_json::from_value::<RedactedFinding>(value).is_err());
        assert!(
            !serde_json::to_string(&finding)
                .unwrap()
                .contains("fictional secret")
        );
    }
}
