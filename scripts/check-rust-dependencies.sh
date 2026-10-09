#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
readonly repository_root

# Supporting crates must be listed explicitly after their rationale is recorded
# in DECISIONS.md. Every transitive package is checked too.
readonly -a allowed_supporting_crates=(
  aho-corasick
  atomic-waker
  base64
  bit-set
  bit-vec
  bitflags
  block-buffer
  bumpalo
  bytes
  cc
  cfg-if
  core-foundation
  core-foundation-sys
  cpufeatures
  crypto-common
  digest
  displaydoc
  errno
  fancy-regex
  fastrand
  find-msvc-tools
  foreign-types
  foreign-types-shared
  form_urlencoded
  futures-channel
  futures-core
  futures-io
  futures-sink
  futures-task
  futures-util
  generic-array
  getrandom
  http
  http-body
  http-body-util
  httparse
  hyper
  hyper-tls
  hyper-util
  icu_collections
  icu_locale_core
  icu_normalizer
  icu_normalizer_data
  icu_properties
  icu_properties_data
  icu_provider
  idna
  idna_adapter
  ipnet
  itoa
  js-sys
  libc
  linux-raw-sys
  litemap
  log
  memchr
  mime
  mio
  native-tls
  once_cell
  openssl
  openssl-macros
  openssl-probe
  openssl-sys
  percent-encoding
  pin-project-lite
  pkg-config
  potential_utf
  proc-macro2
  quote
  r-efi
  regex-automata
  regex-syntax
  reqwest
  rustix
  rustls-pki-types
  rustversion
  schannel
  security-framework
  security-framework-sys
  serde
  serde_core
  serde_derive
  serde_json
  sha2
  shlex
  slab
  smallvec
  socket2
  stable_deref_trait
  syn
  sync_wrapper
  synstructure
  tempfile
  tinystr
  tokio
  tokio-native-tls
  tower
  tower-http
  tower-layer
  tower-service
  tracing
  tracing-core
  try-lock
  typenum
  unicode-ident
  url
  utf8_iter
  vcpkg
  version_check
  want
  wasi
  wasm-bindgen
  wasm-bindgen-futures
  wasm-bindgen-macro
  wasm-bindgen-macro-support
  wasm-bindgen-shared
  web-sys
  windows-link
  windows-sys
  writeable
  yoke
  yoke-derive
  zerofrom
  zerofrom-derive
  zeroize
  zerotrie
  zerovec
  zerovec-derive
  zmij
)

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
  cargo tree --workspace --locked --offline --edges normal,build,dev --prefix none --format '{p}')

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

printf 'Rust dependency policy passed: every external crate is allowlisted; concept denylist clear.\n'
