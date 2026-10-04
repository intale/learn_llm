use std::io::Write;
use std::process::{Command, Stdio};

use llm_from_scratch::artifact_identity::{
    ArtifactIdentity, IdentityError, MAX_ENCODED_BYTES, MAX_FIELDS, MAX_INPUT_BYTES,
    MAX_VALUE_BYTES, sha256,
};

fn identity(fields: &[(&str, &str)]) -> ArtifactIdentity {
    ArtifactIdentity::new("reference-core-v1", fields.iter().copied()).unwrap()
}

#[test]
fn published_sha256_vectors_use_the_supporting_library() {
    assert_eq!(
        sha256(b"").as_hex(),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    assert_eq!(
        sha256(b"abc").as_hex(),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    assert_eq!(sha256(b"abc").as_bytes().len(), 32);
    assert_eq!(sha256(b"abc").to_string(), sha256(b"abc").as_hex());
}

#[test]
fn canonical_keys_and_one_final_lf() {
    let record = identity(&[
        ("source_revision", "abc"),
        ("fixture", "tiny"),
        ("config", "1188"),
    ]);
    assert_eq!(
        record.canonical_bytes().unwrap(),
        b"{\"domain\":\"reference-core-v1\",\"fields\":{\"config\":\"1188\",\"fixture\":\"tiny\",\"source_revision\":\"abc\"},\"schema_version\":1}\n"
    );
    assert_eq!(record.domain(), "reference-core-v1");
    assert_eq!(record.fields()["config"], "1188");
    assert_eq!(
        record,
        identity(&[
            ("config", "1188"),
            ("source_revision", "abc"),
            ("fixture", "tiny")
        ])
    );
}

#[test]
fn framing_distinguishes_concatenation_and_domains() {
    let first = identity(&[("a", "a"), ("b", "bc")]);
    let second = identity(&[("a", "ab"), ("b", "c")]);
    assert_ne!(
        first.canonical_bytes().unwrap(),
        second.canonical_bytes().unwrap()
    );
    assert_ne!(first.digest().unwrap(), second.digest().unwrap());
    let other = ArtifactIdentity::new("another-v1", [("a", "a"), ("b", "bc")]).unwrap();
    assert_ne!(first.digest().unwrap(), other.digest().unwrap());
}

#[test]
fn unicode_controls_and_delimiters_round_trip_without_normalization() {
    let record = identity(&[
        ("value", "т \0\n\"\\"),
        ("composed", "é"),
        ("decomposed", "e\u{301}"),
    ]);
    let encoded = record.canonical_bytes().unwrap();
    assert_eq!(
        ArtifactIdentity::from_canonical_bytes(&encoded).unwrap(),
        record
    );
    assert_ne!(
        identity(&[("value", "é")]).digest().unwrap(),
        identity(&[("value", "e\u{301}")]).digest().unwrap()
    );
    assert!(encoded.windows(6).any(|slice| slice == b"\\u0000"));
}

#[test]
fn duplicate_fields_are_rejected_without_overwriting() {
    assert_eq!(
        ArtifactIdentity::new("test", [("a", "first"), ("a", "second")]),
        Err(IdentityError::DuplicateField)
    );
    let duplicate = b"{\"domain\":\"test\",\"fields\":{\"a\":\"first\",\"a\":\"second\"},\"schema_version\":1}\n";
    assert_eq!(
        ArtifactIdentity::from_canonical_bytes(duplicate),
        Err(IdentityError::NonCanonical)
    );
}

#[test]
fn identifiers_are_explicit_ascii_bounded_and_not_normalized() {
    for bad in ["", "Test", "1test", "a b", "т", "a/b"] {
        assert_eq!(
            ArtifactIdentity::new(bad, [("a", "b")]),
            Err(IdentityError::InvalidDomain)
        );
        assert_eq!(
            ArtifactIdentity::new("test", [(bad, "b")]),
            Err(IdentityError::InvalidKey)
        );
    }
    let boundary = "a".repeat(64);
    assert!(ArtifactIdentity::new(&boundary, [(&boundary[..], "v")]).is_ok());
    let too_long = "a".repeat(65);
    assert_eq!(
        ArtifactIdentity::new(&too_long, [("a", "v")]),
        Err(IdentityError::InvalidDomain)
    );
    assert_eq!(
        ArtifactIdentity::new("test", [(&too_long[..], "v")]),
        Err(IdentityError::InvalidKey)
    );
}

#[test]
fn field_count_is_bounded_even_for_an_infinite_iterator() {
    assert_eq!(
        ArtifactIdentity::new("test", []),
        Err(IdentityError::EmptyFields)
    );
    let owned: Vec<_> = (0..MAX_FIELDS)
        .map(|n| (format!("key{n:03}"), String::new()))
        .collect();
    let fields = || owned.iter().map(|(k, v)| (k.as_str(), v.as_str()));
    assert!(ArtifactIdentity::new("test", fields()).is_ok());
    assert_eq!(
        ArtifactIdentity::new("test", fields().chain(std::iter::repeat(("extra", "")))),
        Err(IdentityError::TooManyFields)
    );
}

#[test]
fn value_limits_count_utf8_bytes_not_characters() {
    let at_limit = "т".repeat(MAX_VALUE_BYTES / 2);
    assert!(ArtifactIdentity::new("test", [("value", at_limit.as_str())]).is_ok());
    let over = at_limit + "a";
    assert_eq!(
        ArtifactIdentity::new("test", [("value", over.as_str())]),
        Err(IdentityError::ValueTooLarge)
    );
}

#[test]
fn aggregate_limit_is_exact_and_json_escape_expansion_remains_bounded() {
    let first = "\0".repeat(MAX_VALUE_BYTES);
    let final_length = MAX_INPUT_BYTES - 1 - 4 - 3 * MAX_VALUE_BYTES;
    let last = "\0".repeat(final_length);
    let record = ArtifactIdentity::new(
        "t",
        [
            ("a", first.as_str()),
            ("b", first.as_str()),
            ("c", first.as_str()),
            ("d", last.as_str()),
        ],
    )
    .unwrap();
    let encoded = record.canonical_bytes().unwrap();
    assert!(encoded.len() <= MAX_ENCODED_BYTES);
    assert_eq!(
        ArtifactIdentity::from_canonical_bytes(&encoded).unwrap(),
        record
    );
    let over = last + "x";
    assert_eq!(
        ArtifactIdentity::new(
            "t",
            [
                ("a", first.as_str()),
                ("b", first.as_str()),
                ("c", first.as_str()),
                ("d", over.as_str())
            ]
        ),
        Err(IdentityError::InputTooLarge)
    );
}

#[test]
fn decoder_rejects_alternate_serializations_and_unknown_fields() {
    let valid = identity(&[("a", "b")]).canonical_bytes().unwrap();
    let without_lf = &valid[..valid.len() - 1];
    assert_eq!(
        ArtifactIdentity::from_canonical_bytes(without_lf),
        Err(IdentityError::NonCanonical)
    );
    let mut extra_lf = valid.clone();
    extra_lf.push(b'\n');
    assert_eq!(
        ArtifactIdentity::from_canonical_bytes(&extra_lf),
        Err(IdentityError::NonCanonical)
    );
    for alternate in [
        b"{\"fields\":{\"a\":\"b\"},\"domain\":\"reference-core-v1\",\"schema_version\":1}\n"
            .as_slice(),
        b"{\"domain\":\"reference-core-v1\", \"fields\":{\"a\":\"b\"},\"schema_version\":1}\n"
            .as_slice(),
        b"{\"domain\":\"reference-core-v1\",\"fields\":{\"a\":\"\\u0062\"},\"schema_version\":1}\n"
            .as_slice(),
    ] {
        assert_eq!(
            ArtifactIdentity::from_canonical_bytes(alternate),
            Err(IdentityError::NonCanonical)
        );
    }
    let extra =
        b"{\"domain\":\"test\",\"fields\":{\"a\":\"b\"},\"schema_version\":1,\"extra\":0}\n";
    assert_eq!(
        ArtifactIdentity::from_canonical_bytes(extra),
        Err(IdentityError::InvalidJson)
    );
}

#[test]
fn decoder_refuses_schema_type_and_byte_errors_before_reuse() {
    let version = b"{\"domain\":\"test\",\"fields\":{\"a\":\"b\"},\"schema_version\":2}\n";
    assert_eq!(
        ArtifactIdentity::from_canonical_bytes(version),
        Err(IdentityError::UnsupportedSchema)
    );
    for bad in [
        b"not json".as_slice(),
        &[0xff],
        b"{\"domain\":\"t\",\"fields\":{\"a\":1},\"schema_version\":1}\n".as_slice(),
    ] {
        assert_eq!(
            ArtifactIdentity::from_canonical_bytes(bad),
            Err(IdentityError::InvalidJson)
        );
    }
    assert_eq!(
        ArtifactIdentity::from_canonical_bytes(&vec![b' '; MAX_ENCODED_BYTES + 1]),
        Err(IdentityError::EncodedTooLarge)
    );
}

#[test]
fn field_changes_do_not_mutate_previous_identity() {
    let before = identity(&[("config", "1188"), ("fixture", "tiny")]);
    let bytes = before.canonical_bytes().unwrap();
    let after = identity(&[("config", "1189"), ("fixture", "tiny")]);
    assert_ne!(before.digest().unwrap(), after.digest().unwrap());
    assert_eq!(before.canonical_bytes().unwrap(), bytes);
}

#[test]
fn node_builtin_oracle_hashes_the_exact_rust_serialized_bytes() {
    // Node is test-only and required by the closed foundation target, not a
    // product dependency or a fallback for course Rust.
    for record in [
        identity(&[
            ("config", "1188"),
            ("fixture", "tiny"),
            ("source_revision", "abc"),
        ]),
        identity(&[("value", "т \0\n\"\\")]),
    ] {
        let bytes = record.canonical_bytes().unwrap();
        let mut child = Command::new("node")
            .args(["--input-type=module", "-e", "import {createHash} from 'node:crypto'; const chunks=[]; for await (const chunk of process.stdin) chunks.push(chunk); process.stdout.write(createHash('sha256').update(Buffer.concat(chunks)).digest('hex'));"])
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
            .spawn().expect("closed target must provide the pinned Node runtime");
        child.stdin.take().unwrap().write_all(&bytes).unwrap();
        let output = child.wait_with_output().unwrap();
        assert!(
            output.status.success(),
            "Node oracle failed: {:?}",
            output.stderr
        );
        assert_eq!(
            String::from_utf8(output.stdout).unwrap(),
            record.digest().unwrap().as_hex()
        );
    }
}
