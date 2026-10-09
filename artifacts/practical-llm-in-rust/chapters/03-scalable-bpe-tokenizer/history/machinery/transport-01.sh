#!/usr/bin/env bash
set -euo pipefail
history=/home/int/rust/learn_llm/.build/runs/20261008T090138Z-implement-ch42-scalable-bpe-tokenizer-01/history
[[ -f $history/current-source-spec.json ]] || exit 2
[[ ! -e $history/transport-01 ]] || exit 2
mkdir -m 0700 "$history/transport-01"
curl --version > "$history/transport-01/curl-version.txt"
sha256sum "$(command -v curl)" > "$history/transport-01/curl-executable.sha256"
for source_id in SRC-DTH-TOK-01 SRC-DTH-TOK-04; do
  evidence="$history/transport-01/$source_id"
  mkdir -m 0700 "$evidence"
  case $source_id in
    SRC-DTH-TOK-01) request_url=https://aclanthology.org/P16-1162.pdf ;;
    SRC-DTH-TOK-04) request_url=https://github.com/openai/gpt-2/blob/e5c5054474f583d6d9499624649353995d63c70a/src/encoder.py ;;
  esac
  argv=(curl --silent --show-error --fail-with-body --request GET --proto '=https' --proto-redir '=https' --location --max-redirs 0 --connect-timeout 30 --max-time 900 --max-filesize 67108864 --header 'Accept: text/html,application/xhtml+xml,application/pdf,text/plain,application/json;q=0.9' --header 'Accept-Encoding: identity,gzip,br' --header 'Authorization:' --header 'Cookie:' --dump-header "$evidence/response-headers.bin" --output "$evidence/response-body.bin" --write-out '%{json}\n%{header_json}\n' "$request_url")
  printf '%s\0' "${argv[@]}" > "$evidence/argv.nul"
  date -u '+%Y-%m-%dT%H:%M:%SZ' > "$evidence/started-at.txt"
  if "${argv[@]}" > "$evidence/curl-metadata.jsonl" 2> "$evidence/stderr.txt"; then status=0; else status=$?; fi
  printf '%s\n' "$status" > "$evidence/exit-status.txt"
  date -u '+%Y-%m-%dT%H:%M:%SZ' > "$evidence/finished-at.txt"
  printf '%s %s\n' "$source_id" "$status"
done
