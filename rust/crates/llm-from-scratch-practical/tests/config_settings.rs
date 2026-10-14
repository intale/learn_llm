use config_lib::{Config, SchemaBuilder, schema::FieldType};
use llm_from_scratch_practical::{
    artifact_identity::canonical_json_bytes,
    config::{
        ConfigError, DecoderProfiles,
        dropout_run::{DropoutRunConfig, DropoutRunPolicy},
        model::ModelConfig,
        profile::ResourceProfile,
        run::{NamedSeeds, RunConfig},
    },
};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

const CATALOG: &str = include_str!("../configs/decoder-profiles.conf");
const REFERENCE_MODEL_RECORD: &str = r##"{"c":4,"causal_mask_policy":"occurrence-local-causal-v1","d":4,"dtype_policy":"scalar-f64","f":4,"hkv":1,"hq":1,"l":1,"parameter_family":"residual-output-init-depth-v1","rms_epsilon_bits":"3eb0c6f7a0b5ed8d","rope_base_bits":"40c3880000000000","rope_policy":"adjacent-pairs-v1","schema":"model_schema(version=1;family=causal-decoder-only-autoregressive-text-token;normalization=pre-rmsnorm;position=rope;attention=causal-gqa;activation=swiglu;bias=false;embedding_head=tied-transpose;input=token-ids;output=text-token-logits)","schema_version":1,"tied_head_policy":"embedding-transpose-v1","tokenizer_id":"opaque-source-identity-v1","v":266,"vocabulary_id":"controlled-layout-v1"}
"##;
const REFERENCE_MODEL_DIGEST: &str =
    "cb053bc16f5fafa2e5843ad30e3e43e26ba74e6d1d853823c30a3706f102bdfc";
const REFERENCE_RUN_RECORD: &str = r##"{"accumulation":1,"b":16,"backend":"scalar-cpu","collectives":"none","device":"cpu","kernel":"existing-scalar-v1","microbatch":16,"n":2048,"resource_profile":"reference-ci","schema_version":1,"seeds":{"initialization":4701,"sampling":130363,"shuffle":104729},"sharding":"none","topology":"single-device","world_size":1}
"##;
const REFERENCE_RUN_DIGEST: &str =
    "e2c50615797b78a2f95f7ff95b8e0684e80243c41f9647733aa4f705189f4985";
const REFERENCE_PROFILE_RECORD: &str = r##"{"all_seeds_wall_seconds":600,"calibration":null,"device_bytes":0,"device_headroom":0,"device_partitions":null,"disk_bytes":1073741824,"download_bytes":0,"dtype_policy":"scalar-f64","host_bytes":268435456,"id":"reference-ci","installed_host_min":1073741824,"installed_host_recommended":1073741824,"max_accumulation":1,"max_context":4,"max_microbatch":16,"max_parameters":1188,"max_training_tokens":2048,"scale":"reference","state":"executable","wall_seconds":600}
"##;

fn native(source: &str) -> Config {
    Config::from_string(source, Some("conf")).unwrap()
}

fn model_source() -> String {
    Config::from(native(CATALOG).get("models.reference").unwrap().clone())
        .serialize()
        .unwrap()
}

fn run_source(profile: &str) -> String {
    let catalog = native(CATALOG);
    let mut config = Config::from(catalog.get(&format!("runs.{profile}")).unwrap().clone());
    config
        .set(
            "seeds",
            catalog
                .get(&format!("runs.{profile}.seeds"))
                .unwrap()
                .clone(),
        )
        .unwrap();
    config.serialize().unwrap()
}

fn dropout_source(profile: &str) -> String {
    let catalog = native(CATALOG);
    let policy = DropoutRunPolicy::new(0.5, 7).unwrap();
    let mut config = Config::new();
    config.set("schema_version", 2_i64).unwrap();
    config
        .set(
            "legacy_run",
            catalog.get(&format!("runs.{profile}")).unwrap().clone(),
        )
        .unwrap();
    config
        .set(
            "legacy_run.seeds",
            catalog
                .get(&format!("runs.{profile}.seeds"))
                .unwrap()
                .clone(),
        )
        .unwrap();
    config.set("dropout.schema_version", 1_i64).unwrap();
    config.set("dropout.placement", policy.placement).unwrap();
    config
        .set("dropout.counter_mapping", policy.counter_mapping)
        .unwrap();
    config
        .set("dropout.purpose", i64::try_from(policy.purpose).unwrap())
        .unwrap();
    config
        .set(
            "dropout.probability_bits",
            i64::try_from(policy.probability_bits).unwrap(),
        )
        .unwrap();
    config.set("dropout.seed", 7_i64).unwrap();
    config.serialize().unwrap()
}

#[test]
fn native_model_matches_the_frozen_bound_record_and_digest() {
    let expected = ModelConfig::from_canonical_bytes(REFERENCE_MODEL_RECORD.as_bytes()).unwrap();
    let loaded = ModelConfig::from_config(&native(&model_source())).unwrap();
    assert_eq!(loaded, expected);
    assert_eq!(ModelConfig::scale("reference").unwrap(), expected);
    assert_eq!(
        loaded.canonical_bytes().unwrap(),
        REFERENCE_MODEL_RECORD.as_bytes()
    );
    assert_eq!(loaded.digest().unwrap().to_string(), REFERENCE_MODEL_DIGEST);
}

#[test]
fn native_run_matches_frozen_bytes_and_preserves_full_width_unsigned_strings() {
    let baseline = RunConfig::from_canonical_bytes(REFERENCE_RUN_RECORD.as_bytes()).unwrap();
    let source = run_source("reference-ci");
    let loaded = RunConfig::from_config(&native(&source)).unwrap();
    assert_eq!(loaded, baseline);
    assert_eq!(
        loaded.canonical_bytes().unwrap(),
        REFERENCE_RUN_RECORD.as_bytes()
    );
    assert_eq!(loaded.digest().unwrap().to_string(), REFERENCE_RUN_DIGEST);

    let full_width = source
        .replacen(
            "initialization = 4701\n",
            "initialization = \"18446744073709551615\"\n",
            1,
        )
        .replacen(
            "shuffle = 104729\n",
            "shuffle = \"9223372036854775809\"\n",
            1,
        )
        .replacen("sampling = 130363\n", "sampling = 0\n", 1);
    let mut expected = baseline.clone();
    expected.seeds = NamedSeeds {
        initialization: u64::MAX,
        shuffle: (1_u64 << 63) + 1,
        sampling: 0,
    };
    let loaded = RunConfig::from_config(&native(&full_width)).unwrap();
    assert_eq!(loaded, expected);
    assert_eq!(
        loaded.canonical_bytes().unwrap(),
        expected.canonical_bytes().unwrap()
    );
    assert_eq!(loaded.digest().unwrap(), expected.digest().unwrap());
    assert_eq!(
        RunConfig::from_canonical_bytes(&loaded.canonical_bytes().unwrap()).unwrap(),
        expected
    );

    let exact_signed = source
        .replacen(
            "initialization = 4701\n",
            "initialization = 9223372036854775807\n",
            1,
        )
        .replacen("shuffle = 104729\n", "shuffle = 9007199254740993\n", 1);
    let mut expected = baseline;
    expected.seeds.initialization = i64::MAX as u64;
    expected.seeds.shuffle = (1_u64 << 53) + 1;
    assert_eq!(
        RunConfig::from_config(&native(&exact_signed)).unwrap(),
        expected
    );
}

#[test]
fn native_dropout_keeps_legacy_identity_negative_zero_bits_and_full_width_seed() {
    let source = dropout_source("reference-ci");
    let baseline = DropoutRunConfig::new(
        RunConfig::from_canonical_bytes(REFERENCE_RUN_RECORD.as_bytes()).unwrap(),
        DropoutRunPolicy::new(0.5, 7).unwrap(),
    )
    .unwrap();
    let loaded = DropoutRunConfig::from_config(&native(&source)).unwrap();
    assert_eq!(loaded, baseline);
    assert_eq!(
        loaded.canonical_bytes().unwrap(),
        baseline.canonical_bytes().unwrap()
    );
    assert_eq!(loaded.digest().unwrap(), baseline.digest().unwrap());

    let full_width = source
        .replacen(
            "initialization = 4701\n",
            "initialization = \"18446744073709551615\"\n",
            1,
        )
        .replacen(
            "probability_bits = 4602678819172646912\n",
            "probability_bits = \"9223372036854775808\"\n",
            1,
        )
        .replacen("seed = 7\n", "seed = \"18446744073709551615\"\n", 1);
    let mut legacy = baseline.legacy_run;
    legacy.seeds.initialization = u64::MAX;
    let expected =
        DropoutRunConfig::new(legacy, DropoutRunPolicy::new(-0.0, u64::MAX).unwrap()).unwrap();
    let loaded = DropoutRunConfig::from_config(&native(&full_width)).unwrap();
    assert_eq!(loaded, expected);
    assert_eq!(loaded.dropout.probability_bits, (-0.0_f64).to_bits());
    assert_eq!(
        loaded.canonical_bytes().unwrap(),
        expected.canonical_bytes().unwrap()
    );
    assert_eq!(loaded.digest().unwrap(), expected.digest().unwrap());
    assert_eq!(
        DropoutRunConfig::from_canonical_bytes(&loaded.canonical_bytes().unwrap()).unwrap(),
        expected
    );
}

#[test]
fn library_schemas_reject_missing_and_mistyped_required_fields() {
    let source = model_source();
    let schema = SchemaBuilder::new()
        .field(
            "v",
            FieldType::Union(vec![FieldType::Integer, FieldType::String]),
            true,
        )
        .build();
    for replacement in ["", "v = true\n", "v = 1.0\n", "v = null\n"] {
        let config = native(&source.replacen("v = 266\n", replacement, 1));
        assert!(config.validate_schema(&schema).is_err());
        assert!(matches!(
            ModelConfig::from_config(&config),
            Err(ConfigError::Invalid("model settings schema"))
        ));
    }
    let source = run_source("reference-ci");
    for input in [
        source.replacen("initialization = 4701\n", "", 1),
        source.replacen("topology = single-device\n", "topology = 1\n", 1),
    ] {
        assert!(RunConfig::from_config(&native(&input)).is_err());
    }
    let source = dropout_source("reference-ci");
    for input in [
        source.replacen("schema_version = 2\n", "", 1),
        source.replacen("purpose = 4\n", "purpose = true\n", 1),
    ] {
        assert!(DropoutRunConfig::from_config(&native(&input)).is_err());
    }
}

#[test]
fn unsigned_configuration_rejects_floats_negatives_and_out_of_range_values() {
    let source = run_source("reference-ci");
    for token in [
        "4701.0",
        "-1",
        "9223372036854775808",
        "18446744073709551616",
        "\"18446744073709551616\"",
        "\"not-a-number\"",
        "\"1.5\"",
    ] {
        let input = source.replacen(
            "initialization = 4701\n",
            &format!("initialization = {token}\n"),
            1,
        );
        assert!(
            RunConfig::from_config(&native(&input)).is_err(),
            "accepted {token}"
        );
    }
}

#[test]
fn decoder_head_topology_and_dropout_policies_remain_enforced() {
    let model = model_source();
    for input in [
        model.replacen("hq = 1\n", "hq = 3\n", 1),
        model.replacen("c = 4\n", "c = 0\n", 1),
        model.replacen("schema_version = 1\n", "schema_version = 2\n", 1),
    ] {
        assert!(ModelConfig::from_config(&native(&input)).is_err());
    }
    let run = run_source("reference-ci");
    for input in [
        run.replacen("world_size = 1\n", "world_size = 2\n", 1),
        run.replacen("backend = scalar-cpu\n", "backend = unknown\n", 1),
    ] {
        assert!(RunConfig::from_config(&native(&input)).is_err());
    }
    let dropout = dropout_source("reference-ci");
    for input in [
        dropout.replacen("purpose = 4\n", "purpose = 0\n", 1),
        dropout.replacen(
            "probability_bits = 4602678819172646912\n",
            "probability_bits = 9218868437227405312\n",
            1,
        ),
        dropout.replacen("schema_version = 2\n", "schema_version = 1\n", 1),
        dropout_source("8gb-gpu-core"),
    ] {
        assert!(DropoutRunConfig::from_config(&native(&input)).is_err());
    }
}

#[test]
fn unknown_native_fields_follow_library_semantics_while_bound_records_stay_strict() {
    let mut input = model_source();
    input.push_str("future_option = true\n");
    let loaded = ModelConfig::from_config(&native(&input)).unwrap();
    assert_eq!(
        loaded.canonical_bytes().unwrap(),
        REFERENCE_MODEL_RECORD.as_bytes()
    );
    let extra = REFERENCE_MODEL_RECORD.replacen("\"c\":4", "\"extra\":true,\"c\":4", 1);
    assert!(ModelConfig::from_canonical_bytes(extra.as_bytes()).is_err());
}

#[test]
fn catalog_seed_list_is_read_from_native_configuration() {
    let changed = CATALOG.replacen(
        "seed_sensitivity_seeds = 104729 130363 15485863\n",
        "seed_sensitivity_seeds = 104729 130363\n",
        1,
    );
    let profiles = DecoderProfiles::from_config(native(&changed)).unwrap();
    assert_eq!(
        profiles.seed_sensitivity_seeds().unwrap(),
        vec![104729, 130363]
    );
    assert_eq!(
        DecoderProfiles::from_config(native(CATALOG))
            .unwrap()
            .seed_sensitivity_seeds()
            .unwrap(),
        vec![104729, 130363, 15485863]
    );
}

#[test]
fn caller_supplied_conf_file_changes_profile_id_and_limit_without_changing_defaults() {
    let pair = "host_bytes = 268435456\nid = reference-ci\n";
    assert_eq!(CATALOG.matches(pair).count(), 1);
    let changed = CATALOG
        .replacen(
            "[resource_profiles.reference-ci]",
            "[resource_profiles.custom-ci]",
            1,
        )
        .replacen(pair, "host_bytes = 123456789\nid = custom-ci\n", 1);
    let directory = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../tmp");
    fs::create_dir_all(&directory).unwrap();
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let path = directory.join(format!(
        "config-settings-{}-{nonce}.conf",
        std::process::id()
    ));
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .unwrap();
    fs::write(&path, changed).unwrap();
    let profiles = DecoderProfiles::from_file(&path).unwrap();
    let custom = profiles.profile("custom-ci").unwrap();
    fs::remove_file(&path).unwrap();
    assert_eq!(custom.id, "custom-ci");
    assert_eq!(custom.host_bytes, 123456789);
    assert!(profiles.profile("reference-ci").is_err());
    let default = ResourceProfile::named("reference-ci").unwrap();
    assert_eq!(default.id, "reference-ci");
    assert_eq!(default.host_bytes, 268435456);
    assert_eq!(
        canonical_json_bytes(&default).unwrap(),
        REFERENCE_PROFILE_RECORD.as_bytes()
    );
}
