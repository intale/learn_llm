use std::fs;
use std::path::PathBuf;

use llm_from_scratch::artifact_identity::sha256;
use llm_from_scratch::reference_source_identity::{
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
        fs::read(root.join("configs/functional-reference-source-v1.json")).unwrap(),
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
        "3ddda34cc3e765a3f96021abff6000e9520f5a15"
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
    let changed = source.replace("3ddda34cc3e765a3f96021abff6000e9520f5a15", &"0".repeat(40));
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
        source.replace(
            "rust/crates/llm-from-scratch/src/artifact_identity.rs",
            "../artifact_identity.rs",
        ),
        source.replace("3ddda34", "3DDDA34"),
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
fn lib_prefix_and_course_source_only_census_remain_exact() {
    let bytes = fs::read(repository().join("rust/crates/llm-from-scratch/src/lib.rs")).unwrap();
    assert_eq!(
        sha256(&bytes[..1819]).as_hex(),
        "d84daa75c403999975a266475788a4969d1c9c4d925b1b8926cc6f16dcf1d9d7"
    );
    assert_eq!(
        std::str::from_utf8(&bytes[1819..]).unwrap(),
        "\ninclude!(concat!(env!(\"OUT_DIR\"), \"/functional-modules.rs\"));\n"
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

#[test]
fn registry_parser_preserves_exact_owned_ascii_grammar() {
    let filename = "ch41-corpus-preparation.module";
    let good =
        "version=1\nmodule=functional::data::prepared_corpus\nsource=src/data/prepared_corpus.rs\n";
    assert_eq!(
        registry::parse_fragment(filename, good.as_bytes())
            .unwrap()
            .len(),
        1
    );
    for bad in [
        good.replace("version=1", "version=2"),
        good.replace("module=", "unknown="),
        good.replace("data::prepared_corpus", "other::prepared_corpus"),
        good.replace("src/data", "src/../data"),
        good.replace("src/", "src\\"),
        good.replace("\n", "\r\n"),
        format!("{good}\n"),
        good.trim_end().to_owned(),
        format!("{good}\n{good}"),
        good.replace("prepared_corpus.rs", "prepared_corpüs.rs"),
    ] {
        assert!(registry::parse_fragment(filename, bad.as_bytes()).is_err());
    }
    assert!(
        registry::parse_fragment("ch40-reference-core-handoff.module", good.as_bytes()).is_err()
    );
    assert!(registry::parse_fragment("ch40-reference-core-handoff.module", b"version=1\nmodule=functional::integration::reference_handoff\nsource=src/integration/reference_handoff.rs\n").is_err());
}

#[test]
fn an_empty_registry_is_valid_without_partial_chapter_modules() {
    let root =
        std::env::temp_dir().join(format!("functional-empty-registry-{}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    let source = registry::registry_source(&root).unwrap();
    fs::remove_dir(&root).unwrap();
    assert!(source.contains("pub mod functional {\n}"));
    assert!(!source.contains("reference_handoff"));
}
