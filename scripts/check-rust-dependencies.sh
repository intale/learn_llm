#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
readonly repository_root

# Supporting crates must be listed explicitly after their rationale is recorded
# in DECISIONS.md. Every transitive package is checked too.
readonly -a allowed_supporting_crates=()

# These crates are called out separately to make a concept-policy violation
# clearer than a merely undeclared supporting dependency.
readonly -a concept_implementing_crates=(
  autograd
  burn
  candle-core
  candle-nn
  dfdx
  nalgebra
  ndarray
  smartcore
  tch
  tokenizers
  tract-core
  tract-onnx
)

is_listed() {
  local needle=$1
  shift

  local item
  for item in "$@"; do
    if [[ $item == "$needle" ]]; then
      return 0
    fi
  done

  return 1
}

dependency_tree=$(cd "$repository_root" && \
  cargo tree --workspace --locked --edges normal,build,dev --prefix none --format '{p}')

declare -a concept_violations=()
declare -a undeclared_dependencies=()

while IFS= read -r package_spec; do
  [[ -z $package_spec ]] && continue

  # Workspace packages are identified by Cargo's canonical local package path.
  if [[ $package_spec == *"($repository_root/"* ]]; then
    continue
  fi

  package_name=${package_spec%% *}
  if is_listed "$package_name" "${concept_implementing_crates[@]}"; then
    concept_violations+=("$package_name")
  elif ! is_listed "$package_name" "${allowed_supporting_crates[@]}"; then
    undeclared_dependencies+=("$package_name")
  fi
done < <(printf '%s\n' "$dependency_tree" | sort -u)

if ((${#concept_violations[@]} > 0)); then
  printf 'error: concept-implementing Rust dependencies are forbidden: %s\n' \
    "${concept_violations[*]}" >&2
  exit 1
fi

if ((${#undeclared_dependencies[@]} > 0)); then
  printf 'error: Rust dependencies are not allowlisted: %s\n' \
    "${undeclared_dependencies[*]}" >&2
  printf 'record supporting-library rationale in DECISIONS.md before allowlisting\n' >&2
  exit 1
fi

printf 'Rust dependency policy passed: workspace packages only; no external crates.\n'
