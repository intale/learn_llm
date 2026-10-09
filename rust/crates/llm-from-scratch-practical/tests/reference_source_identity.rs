use std::fs;
use std::path::PathBuf;

use llm_from_scratch_practical::artifact_identity::sha256;
use llm_from_scratch_practical::reference_source_identity::{
    MAX_MANIFEST_BYTES, ReferenceSourceError, verify_compiled_reference_source,
    verify_reference_source,
};

#[allow(dead_code)]
#[path = "../build.rs"]
mod registry;

fn repository() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .unwrap()
        .to_path_buf()
}

fn inputs() -> (Vec<u8>, Vec<(&'static str, Vec<u8>)>) {
    let root = repository();
    (
        fs::read(root.join("configs/practical-reference-source-v1.json")).unwrap(),
        registry::SOURCE_CENSUS
            .iter()
            .map(|&path| (path, fs::read(root.join(path)).unwrap()))
            .collect(),
    )
}

fn verify(manifest: &[u8], files: &[(&str, Vec<u8>)]) -> Result<(), ReferenceSourceError> {
    verify_reference_source(
        manifest,
        &files
            .iter()
            .map(|(p, b)| (*p, b.as_slice()))
            .collect::<Vec<_>>(),
    )
    .map(|_| ())
}

#[test]
fn exact_compiled_reference_produces_an_immutable_identity() {
    let (manifest, files) = inputs();
    let borrowed = files
        .iter()
        .map(|(p, b)| (*p, b.as_slice()))
        .collect::<Vec<_>>();
    let proof = verify_reference_source(&manifest, &borrowed).unwrap();
    assert_eq!(
        proof.source_revision(),
        "9f38a060903c472c4d571efd8e52da1f17e553ff"
    );
    assert_eq!(proof.identity().domain(), "functional_reference_source");
    assert_eq!(proof.identity().digest().unwrap(), *proof.digest());
    assert_eq!(proof, verify_compiled_reference_source().unwrap());
    assert_eq!(
        proof.identity().fields()["manifest_sha256"],
        sha256(&manifest).as_hex()
    );
}

#[test]
fn missing_extra_duplicate_or_stale_bytes_never_produce_proof() {
    let (manifest, mut files) = inputs();
    let last = files.pop().unwrap();
    assert_eq!(
        verify(&manifest, &files),
        Err(ReferenceSourceError::Coverage)
    );
    files.push(last.clone());
    files.push(last);
    assert!(verify(&manifest, &files).is_err());
    files.pop();
    files[1] = files[0].clone();
    assert_eq!(
        verify(&manifest, &files),
        Err(ReferenceSourceError::DuplicatePath)
    );
    let (_, mut files) = inputs();
    files[0].1.push(b' ');
    assert_eq!(
        verify(&manifest, &files),
        Err(ReferenceSourceError::SourceDrift)
    );
    files[0].0 = "unexpected.rs";
    assert_eq!(
        verify(&manifest, &files),
        Err(ReferenceSourceError::Coverage)
    );
}

#[test]
fn caller_revision_or_rewritten_hashes_cannot_rebind_the_baseline() {
    let (manifest, files) = inputs();
    let source = String::from_utf8(manifest).unwrap();
    let changed = source.replace("9f38a060903c472c4d571efd8e52da1f17e553ff", &"0".repeat(40));
    assert_eq!(
        verify(changed.as_bytes(), &files),
        Err(ReferenceSourceError::UnapprovedManifest)
    );
}

#[test]
fn duplicate_unknown_noncanonical_and_oversized_json_are_rejected() {
    let (manifest, files) = inputs();
    let source = String::from_utf8(manifest).unwrap();
    for bad in [
        source.replacen("{", "{\"schema\":1,", 1),
        source.replacen("{", "{\"unknown\":0,", 1),
        source.replacen(
            "\"sourceHashes\":{",
            "\"sourceHashes\":{\"duplicate\":\"x\",\"duplicate\":\"x\",",
            1,
        ),
        source.replacen("\"schema\":1", "\"schema\":2", 1),
        source.replacen(
            "\"domain\":\"functional-reference-source\"",
            "\"domain\":\"other\"",
            1,
        ),
        source.replace("rust/crates/llm-from-scratch/src/lib.rs", "../lib.rs"),
        source.replace("9f38a06", "9F38A06"),
        source.trim_end().to_owned(),
        format!(" {source}"),
    ] {
        assert!(verify(bad.as_bytes(), &files).is_err(), "accepted {bad}");
    }
    assert_eq!(
        verify(&vec![b' '; MAX_MANIFEST_BYTES + 1], &files),
        Err(ReferenceSourceError::Oversize)
    );
}

#[test]
fn complete_original_lib_and_course_source_only_census_remain_exact() {
    let bytes = fs::read(repository().join("rust/crates/llm-from-scratch/src/lib.rs")).unwrap();
    assert_eq!(
        sha256(&bytes).as_hex(),
        "e28fb34befb4a2539e2b932efc6bdd5022091810f080f1e57d22cb654b8e7c67"
    );
    assert!(registry::SOURCE_CENSUS.contains(&"rust/crates/llm-from-scratch/src/lib.rs"));
    assert!(
        !registry::SOURCE_CENSUS.contains(&"rust/crates/llm-from-scratch/src/artifact_identity.rs")
    );
    assert_eq!(registry::SOURCE_CENSUS.len(), 40);
    assert!(
        registry::SOURCE_CENSUS
            .iter()
            .all(|path| path.ends_with(".rs"))
    );
    let manifest: serde_json::Value = serde_json::from_slice(&inputs().0).unwrap();
    assert_eq!(manifest["dependencyHashes"], serde_json::json!({}));
    let mut changed = manifest;
    changed["dependencyHashes"] = serde_json::json!({"Cargo.lock": "0".repeat(64)});
    let mut changed_bytes = serde_json::to_vec(&changed).unwrap();
    changed_bytes.push(b'\n');
    assert_eq!(
        verify(&changed_bytes, &inputs().1),
        Err(ReferenceSourceError::Coverage)
    );
}
