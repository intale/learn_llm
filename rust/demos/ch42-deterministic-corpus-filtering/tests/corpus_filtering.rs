use ch42_deterministic_corpus_filtering::{
    demo_report, fictional_lineage, fixture_policy, raw_fixture, run_fixture, withdrawal_fixture,
};
use llm_from_scratch::{
    artifact_identity::sha256,
    functional::{
        artifact::{inventory::verify_bundle, lineage::DatasetPolicy},
        data::{
            deletion::{GraphLimits, LineageEdge},
            filter::{Rule, canonical_json},
            governance::{
                JsonlSink, OutputLimits, RetainedRow, RetainedSelection, filter_source,
                record_identity,
            },
            privacy::RedactedFinding,
            stream::{DataError, SourceBinding},
        },
    },
};

#[test]
fn fixture_counts_and_byte_conservation() {
    let run = run_fixture(&fixture_policy()).unwrap();
    assert_eq!(run.report.disposition_totals().unwrap(), (1, 6, 1));
    let expected = [
        (8, 1, 7),
        (7, 1, 6),
        (6, 1, 5),
        (5, 1, 4),
        (4, 2, 2),
        (2, 1, 1),
        (1, 0, 1),
    ];
    for (stage, (seen, terminal, survived)) in run.report.stages.iter().zip(expected) {
        assert_eq!(
            (stage.seen, stage.terminal, stage.survived),
            (seen, terminal, survived)
        );
    }
    assert_eq!(run.report.sources[0].scan.source_bytes, 136);
    assert_eq!(run.report.sources[1].scan.source_bytes, 151);
    assert_eq!(
        run.report
            .sources
            .iter()
            .map(|s| s.scan.payload_bytes)
            .sum::<u64>(),
        175
    );
    assert_eq!(
        run.report
            .sources
            .iter()
            .map(|s| s.scan.delimiter_bytes)
            .sum::<u64>(),
        112
    );
    assert_eq!(
        run.report
            .sources
            .iter()
            .map(|s| s.decoded_raw_bytes)
            .sum::<u64>(),
        107
    );
    assert_eq!(
        run.report
            .sources
            .iter()
            .map(|s| s.undecoded_raw_bytes)
            .sum::<u64>(),
        68
    );
    assert_eq!(
        run.report
            .sources
            .iter()
            .map(|s| s.normalized_bytes)
            .sum::<u64>(),
        101
    );
    assert_eq!(
        run.report
            .sources
            .iter()
            .map(|s| s.normalized_retained_bytes)
            .sum::<u64>(),
        8
    );
    assert_eq!(
        run.report
            .sources
            .iter()
            .map(|s| s.normalized_rejected_bytes)
            .sum::<u64>(),
        65
    );
    assert_eq!(
        run.report
            .sources
            .iter()
            .map(|s| s.normalized_manual_bytes)
            .sum::<u64>(),
        28
    );
    let row: RetainedRow = serde_json::from_slice(&run.retained).unwrap();
    assert_eq!(row.text, "cat sat.");
    assert_eq!(row.raw_span.start, 0);
    assert_eq!(row.raw_span.end, 9);
    assert_eq!(row.text_sha256, sha256(b"cat sat.").as_hex());
}

#[test]
fn swapping_secret_and_review_changes_first_terminal() {
    let policy = fixture_policy();
    let original = run_fixture(&policy).unwrap();
    let mut changed = policy.clone();
    changed.stages.swap(4, 5);
    let alternate = run_fixture(&changed).unwrap();
    assert_eq!(alternate.report.disposition_totals().unwrap(), (1, 5, 2));
    assert_ne!(policy.digest().unwrap(), changed.digest().unwrap());
    assert_ne!(
        original.stage_bundle.artifact_id(),
        alternate.stage_bundle.artifact_id()
    );
    assert_eq!(original.raw_artifact_id, alternate.raw_artifact_id);
    let last = |bytes: &[u8]| -> RedactedFinding {
        serde_json::from_slice(bytes.split_inclusive(|&b| b == b'\n').next_back().unwrap()).unwrap()
    };
    let a = last(&original.findings);
    let b = last(&alternate.findings);
    assert_eq!(a.record_id, b.record_id);
    assert_eq!(a.first_terminal_rule, Rule::SecretMarker);
    assert!(!a.evaluated_rules.contains(&Rule::ManualMarker));
    assert_eq!(b.first_terminal_rule, Rule::ManualMarker);
    assert!(!b.evaluated_rules.contains(&Rule::SecretMarker));
}

#[test]
fn withdrawal_reaches_known_descendants_once() {
    let plan = withdrawal_fixture().unwrap();
    assert_eq!(plan.sources, ["r0"]);
    assert_eq!(plan.artifacts, ["a0", "f0", "s0", "tok0", "w0"]);
    assert!(!plan.artifacts.iter().any(|id| id == "f9"));
}

#[test]
fn repeated_attempts_produce_exact_bytes_not_just_matching_counts() {
    let a = run_fixture(&fixture_policy()).unwrap();
    let b = run_fixture(&fixture_policy()).unwrap();
    assert_eq!(a.retained, b.retained);
    assert_eq!(a.findings, b.findings);
    assert_eq!(a.receipt, b.receipt);
    assert_eq!(a.stage_bundle.artifact_id(), b.stage_bundle.artifact_id());
    assert_eq!(demo_report().unwrap(), demo_report().unwrap());
}

#[test]
fn findings_have_no_secret_body_and_manual_is_not_consumable() {
    let policy = fixture_policy();
    let run = run_fixture(&policy).unwrap();
    let body = std::str::from_utf8(&run.findings).unwrap();
    assert!(!body.contains("CANARY"));
    assert!(!body.contains("alex@"));
    assert_eq!(body.lines().count(), 7);
    assert!(
        RetainedSelection::from_bundle(
            &run.selected_stage,
            &run.stage_bundle,
            &policy,
            &run.bindings,
            "findings"
        )
        .is_err()
    );
}

#[test]
fn selected_retained_rows_are_checked_again_and_callbacks_remain_provisional() {
    let policy = fixture_policy();
    let run = run_fixture(&policy).unwrap();
    let selected = RetainedSelection::from_bundle(
        &run.selected_stage,
        &run.stage_bundle,
        &policy,
        &run.bindings,
        "retained",
    )
    .unwrap();
    let mut texts = Vec::new();
    assert_eq!(
        selected
            .read(run.retained.as_slice(), |row| {
                texts.push(row.text.clone());
                Ok(())
            })
            .unwrap(),
        1
    );
    assert_eq!(texts, ["cat sat."]);
    let mut row: RetainedRow = serde_json::from_slice(&run.retained).unwrap();
    row.text = "contact=alex@example.invalid".into();
    row.text_sha256 = sha256(row.text.as_bytes()).as_hex().into();
    assert!(
        selected
            .read(canonical_json(&row).unwrap().as_slice(), |_| Ok(()))
            .is_err()
    );
    let mut wrong = run.retained.clone();
    wrong.pop();
    assert!(selected.read(wrong.as_slice(), |_| Ok(())).is_err());
}

#[test]
fn matching_proofs_do_not_override_manual_review_eligibility() {
    let policy = fixture_policy();
    let run = run_fixture(&policy).unwrap();
    // A test-only selected stage contains a correctly referenced manual row.
    // Matching its bytes and provenance must not bypass the current rules.
    let source = &run.bindings[1];
    let mut row: RetainedRow = serde_json::from_slice(&run.retained).unwrap();
    row.payload_id = source.payload_id().into();
    row.source_id = source.source_id().into();
    row.source_file_sha256 = source.file_sha256().into();
    row.source_artifact_id = source.artifact_id().into();
    row.raw_span = llm_from_scratch::functional::data::stream::ByteSpan { start: 49, end: 78 };
    row.raw_bytes = 29;
    row.record_id = record_identity(source, row.raw_span).unwrap();
    row.text = "contact=alex@example.invalid".into();
    row.text_sha256 = sha256(row.text.as_bytes()).as_hex().into();
    let bytes = canonical_json(&row).unwrap();
    let mut manifest = run.selected_stage.manifest().clone();
    let entry = manifest
        .payload
        .iter_mut()
        .find(|entry| entry.id == "retained")
        .unwrap();
    entry.bytes = bytes.len() as u64;
    entry.sha256 = sha256(&bytes).as_hex().into();
    let selected_stage = DatasetPolicy::new(manifest, "synthetic-offline-fixture").unwrap();
    let mut supplied = run.stage_source.clone();
    supplied.payloads.insert("retained".into(), bytes.clone());
    let bundle = verify_bundle(selected_stage.manifest(), &selected_stage, &mut supplied).unwrap();
    let selection = RetainedSelection::from_bundle(
        &selected_stage,
        &bundle,
        &policy,
        &run.bindings,
        "retained",
    )
    .unwrap();
    let mut calls = 0;
    assert!(matches!(
        selection.read(bytes.as_slice(), |_| {
            calls += 1;
            Ok(())
        }),
        Err(DataError::InvalidRecord(_))
    ));
    assert_eq!(calls, 0);
}

#[test]
fn retained_selection_joins_the_selected_raw_artifact_and_complete_source_set() {
    let policy = fixture_policy();
    let run = run_fixture(&policy).unwrap();
    for change_source in [false, true] {
        let mut manifest = run.selected_stage.manifest().clone();
        if change_source {
            manifest.sources[1].source_id = "unrelated-source".into();
        } else {
            manifest.dataset_scope.selected_source = "unrelated-raw-artifact".into();
        }
        let selected_stage = DatasetPolicy::new(manifest, "synthetic-offline-fixture").unwrap();
        let mut supplied = run.stage_source.clone();
        let bundle =
            verify_bundle(selected_stage.manifest(), &selected_stage, &mut supplied).unwrap();
        assert!(matches!(
            RetainedSelection::from_bundle(
                &selected_stage,
                &bundle,
                &policy,
                &run.bindings,
                "retained"
            ),
            Err(DataError::SourceMismatch)
        ));
    }
    for bindings in [
        vec![run.bindings[0].clone()],
        vec![run.bindings[0].clone(), run.bindings[0].clone()],
    ] {
        assert!(matches!(
            RetainedSelection::from_bundle(
                &run.selected_stage,
                &run.stage_bundle,
                &policy,
                &bindings,
                "retained"
            ),
            Err(DataError::SourceMismatch)
        ));
    }
}

#[test]
fn raw_proof_joins_exact_selected_source_and_payload() {
    let (policy, mut source) = raw_fixture().unwrap();
    let proof = verify_bundle(policy.manifest(), &policy, &mut source).unwrap();
    assert!(SourceBinding::from_bundle(&policy, &proof, "fixture-train", "validation").is_err());
    assert!(SourceBinding::from_bundle(&policy, &proof, "unknown", "train").is_err());
    let binding = SourceBinding::from_bundle(&policy, &proof, "fixture-train", "train").unwrap();
    let mut altered = source.payloads["train"].clone();
    altered[0] = b'b';
    let mut sink = JsonlSink::new(
        Vec::new(),
        Vec::new(),
        OutputLimits {
            metadata_bytes_exclusive: 1_048_576,
            retained_bytes_inclusive: 1_048_576,
            total_bytes_inclusive: 2_097_152,
        },
    )
    .unwrap();
    assert!(matches!(
        filter_source(altered.as_slice(), &binding, &fixture_policy(), &mut sink),
        Err(DataError::SourceMismatch)
    ));
}

#[test]
fn an_output_cap_fails_before_publishing_a_truncated_report() {
    let (policy, mut source) = raw_fixture().unwrap();
    let proof = verify_bundle(policy.manifest(), &policy, &mut source).unwrap();
    let binding = SourceBinding::from_bundle(&policy, &proof, "fixture-train", "train").unwrap();
    let mut sink = JsonlSink::new(
        Vec::new(),
        Vec::new(),
        OutputLimits {
            metadata_bytes_exclusive: 100,
            retained_bytes_inclusive: 10_000,
            total_bytes_inclusive: 10_100,
        },
    )
    .unwrap();
    assert!(matches!(
        filter_source(
            source.payloads["train"].as_slice(),
            &binding,
            &fixture_policy(),
            &mut sink
        ),
        Err(DataError::OutputLimit)
    ));
    let (_, findings) = sink.into_inner();
    assert!(findings.is_empty());
}

#[test]
fn lineage_refuses_unknown_roots_dangling_edges_and_cycles() {
    let limits = GraphLimits {
        max_edges: 16,
        max_nodes: 16,
    };
    assert!(
        fictional_lineage()
            .withdrawal(&["missing".into()], limits)
            .is_err()
    );
    let mut g = fictional_lineage();
    g.edges.push(LineageEdge {
        parent: "w0".into(),
        child: "f0".into(),
    });
    assert!(g.withdrawal(&["r0".into()], limits).is_err());
    let mut g = fictional_lineage();
    g.edges[0].child = "missing".into();
    assert!(g.withdrawal(&["r0".into()], limits).is_err());
}

#[test]
fn policy_drift_and_role_relabeling_do_not_authorize_consumption() {
    let p = fixture_policy();
    let run = run_fixture(&p).unwrap();
    let mut q = p.clone();
    q.minimum_normalized_bytes = 5;
    assert!(
        RetainedSelection::from_bundle(
            &run.selected_stage,
            &run.stage_bundle,
            &q,
            &run.bindings,
            "retained"
        )
        .is_err()
    );
    let mut manifest = run.selected_stage.manifest().clone();
    manifest
        .payload
        .iter_mut()
        .find(|entry| entry.id == "findings")
        .unwrap()
        .role = "privacy-filtered-corpus".into();
    let mut supplied = run.stage_source.clone();
    assert!(verify_bundle(&manifest, &run.selected_stage, &mut supplied).is_err());
}
