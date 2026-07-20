#!/usr/bin/env bash
set -euo pipefail

script_directory=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
configuration_root=${CODEX_ORCHESTRATION_ROOT:-"${script_directory%/.codex}"}
config_file="$configuration_root/.codex/config.toml"
agent_directory="$configuration_root/.codex/agents"
structural_only=false

if (($# > 1)); then
  printf 'usage: %s [--structural]\n' "$0" >&2
  exit 2
fi
if (($# == 1)); then
  [[ $1 == --structural ]] || {
    printf 'usage: %s [--structural]\n' "$0" >&2
    exit 2
  }
  structural_only=true
fi

required_agents=(
  chapter_lead
  locale_activation_lead
  learning_researcher
  rust_implementer
  site_visualization_implementer
  content_author
  localization_author
  learning_reviewer
  localization_reviewer
  validation_runner
)

[[ -f $config_file ]] || {
  printf 'missing project config: %s\n' "$config_file" >&2
  exit 1
}
[[ -d $agent_directory ]] || {
  printf 'missing agent directory: %s\n' "$agent_directory" >&2
  exit 1
}

for expected_line in \
  'model = "gpt-5.6"' \
  'model_reasoning_effort = "max"' \
  'max_threads = 4' \
  'max_depth = 2' \
  'interrupt_message = true'; do
  grep -Fqx -- "$expected_line" "$config_file" || {
    printf 'missing required config line: %s\n' "$expected_line" >&2
    exit 1
  }
done

mapfile -t discovered_agents < <(
  find "$agent_directory" -mindepth 1 -maxdepth 1 -type f -name '*.toml' \
    -printf '%f\n' | sed 's/\.toml$//' | sort
)
mapfile -t expected_agents < <(printf '%s\n' "${required_agents[@]}" | sort)
if [[ ${discovered_agents[*]} != "${expected_agents[*]}" ]]; then
  printf 'agent set mismatch\nexpected: %s\nactual:   %s\n' \
    "${expected_agents[*]}" "${discovered_agents[*]}" >&2
  exit 1
fi

for agent in "${required_agents[@]}"; do
  agent_file="$agent_directory/$agent.toml"
  grep -Fqx -- "name = \"$agent\"" "$agent_file" || {
    printf '%s: missing matching name\n' "$agent_file" >&2
    exit 1
  }
  grep -Eq '^description = ".+"$' "$agent_file" || {
    printf '%s: missing description\n' "$agent_file" >&2
    exit 1
  }
  grep -Fq 'developer_instructions = """' "$agent_file" || {
    printf '%s: missing developer_instructions\n' "$agent_file" >&2
    exit 1
  }
  case "$agent" in
    validation_runner)
      expected_model='model = "gpt-5.6-terra"'
      expected_effort='model_reasoning_effort = "high"'
      ;;
    rust_implementer|site_visualization_implementer)
      expected_model='model = "gpt-5.6"'
      expected_effort='model_reasoning_effort = "high"'
      ;;
    *)
      expected_model='model = "gpt-5.6"'
      expected_effort='model_reasoning_effort = "max"'
      ;;
  esac
  grep -Fqx -- "$expected_model" "$agent_file" || {
    printf '%s: unexpected model\n' "$agent_file" >&2
    exit 1
  }
  grep -Fqx -- "$expected_effort" "$agent_file" || {
    printf '%s: unexpected reasoning effort\n' "$agent_file" >&2
    exit 1
  }
  grep -Eq '^sandbox_mode = "(read-only|workspace-write)"$' "$agent_file" || {
    printf '%s: missing intentional sandbox mode\n' "$agent_file" >&2
    exit 1
  }
  grep -Fqx -- "config_file = \"./agents/$agent.toml\"" "$config_file" || {
    printf '%s: role is not registered in config.toml\n' "$agent" >&2
    exit 1
  }
  for invariant in \
    'BUILD_STATE.yaml' \
    'DECISIONS.md' \
    'canonical product paths' \
    'Git' \
    'completion'; do
    grep -Fq -- "$invariant" "$agent_file" || {
      printf '%s: missing ownership invariant %s\n' "$agent_file" "$invariant" >&2
      exit 1
    }
  done
done

for agent in learning_researcher learning_reviewer localization_reviewer; do
  grep -Fqx -- 'sandbox_mode = "read-only"' "$agent_directory/$agent.toml" || {
    printf '%s must be read-only\n' "$agent" >&2
    exit 1
  }
done

for agent in chapter_lead locale_activation_lead rust_implementer \
  site_visualization_implementer content_author localization_author \
  validation_runner; do
  grep -Fqx -- 'sandbox_mode = "workspace-write"' "$agent_directory/$agent.toml" || {
    printf '%s must use workspace-write\n' "$agent" >&2
    exit 1
  }
done

grep -Fq 'The root session alone may edit BUILD_STATE.yaml' "$config_file"
grep -Fq 'checksum-gated artifact' "$config_file"
grep -Fq 'artifact DAG' "$agent_directory/chapter_lead.toml"
grep -Fq 'isolated assignment' "$agent_directory/chapter_lead.toml"
grep -Fq 'every transitive DAG descendant' "$agent_directory/chapter_lead.toml"
grep -Fq 'On a child failure, timeout' "$agent_directory/chapter_lead.toml"
grep -Fq 'interruption, stop dependent dispatch' "$agent_directory/chapter_lead.toml"
grep -Fq 'cross-cutting workflow' "$agent_directory/locale_activation_lead.toml"
grep -Fq 'proposed registry entry' "$agent_directory/locale_activation_lead.toml"
grep -Fq 'sole writers of explicitly' "$agent_directory/locale_activation_lead.toml"
grep -Fq 'activation contract-reconciliation phase' \
  "$agent_directory/content_author.toml"
grep -Fq 'checksum-frozen proposed' "$agent_directory/localization_author.toml"
grep -Fq 'registry entry; it need not' "$agent_directory/localization_author.toml"
grep -Fq 'never reimplement the concept in TypeScript' \
  "$agent_directory/site_visualization_implementer.toml"
grep -Fq 'For a not-useful decision' \
  "$agent_directory/site_visualization_implementer.toml"
grep -Fq 'reference-locale rendered page' "$agent_directory/learning_reviewer.toml"
grep -Fq 'cited primary source' "$agent_directory/learning_reviewer.toml"
grep -Fq 'monolingual rendered pass' "$agent_directory/localization_reviewer.toml"
grep -Fq 'fluent-human' "$agent_directory/localization_author.toml"
grep -Fq 'fluent-human' "$agent_directory/localization_reviewer.toml"
grep -Fq 'Do not repair failures' "$agent_directory/validation_runner.toml"

if ! $structural_only; then
  command -v codex >/dev/null || {
    printf 'codex CLI is required for strict configuration validation\n' >&2
    exit 1
  }
  command -v jq >/dev/null || {
    printf 'jq is required to inspect the Codex doctor report\n' >&2
    exit 1
  }
  doctor_output=$(mktemp /tmp/codex-orchestration-doctor-XXXXXXXX.json)
  doctor_error=$(mktemp /tmp/codex-orchestration-doctor-XXXXXXXX.err)
  cleanup_doctor() {
    rm -f -- "$doctor_output" "$doctor_error"
  }
  trap cleanup_doctor EXIT

  # Doctor also probes provider and historical-session health. Capture its
  # overall status, but make the parsed config.load object the deterministic
  # assertion for this checker.
  set +e
  codex --strict-config --cd "$configuration_root" doctor --json \
    >"$doctor_output" 2>"$doctor_error"
  doctor_status=$?
  set -e
  if ! jq -e \
    '.checks["config.load"].status == "ok" and
     .checks["config.load"].details["config.toml parse"] == "ok" and
     .checks["config.load"].details.model == "gpt-5.6"' \
    "$doctor_output" >/dev/null; then
    printf 'Codex did not strictly load the project configuration\n' >&2
    cat "$doctor_error" >&2
    exit 1
  fi
  if ((doctor_status != 0)); then
    printf 'note: Codex configuration loaded; doctor exited %d because another health check failed\n' \
      "$doctor_status" >&2
  fi

  cleanup_doctor
  trap - EXIT
fi

printf 'Codex orchestration check passed: %d roles, depth 2, thread cap 4.\n' \
  "${#required_agents[@]}"
