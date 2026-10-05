# Scoped Chapter39 command regression

Run: `20261005T044231Z-ch39-rendered-command-correction-03`.
Only the English/Russian raw HTML code wrappers were replaced by literal Markdown
code spans. The command is unchanged: `cargo run --quiet --locked -p ch39-end-to-end-llm`.
`before/` preserves all three pre-edit canonical inputs; `en/` and `ru/` are
the exact corrected static documents. They are audit artifacts, not site publication.

Cached offline invocation (three current canonical input mounts):

```bash
docker run --name learn-llm-ch39-command-20261005-044231 --pull=never --network none --cap-drop ALL --security-opt no-new-privileges --memory 4g --cpus 2 --pids-limit 512 --shm-size 512m --mount type=bind,source=/home/int/rust/learn_llm/site/src/content/chapters/en/39-end-to-end-llm.mdx,target=/workspace/site/src/content/chapters/en/39-end-to-end-llm.mdx,readonly --mount type=bind,source=/home/int/rust/learn_llm/site/src/content/chapters/ru/39-end-to-end-llm.mdx,target=/workspace/site/src/content/chapters/ru/39-end-to-end-llm.mdx,readonly --mount type=bind,source=/home/int/rust/learn_llm/site/tests/e2e/ch39-end-to-end-llm.spec.ts,target=/workspace/site/tests/e2e/ch39-end-to-end-llm.spec.ts,readonly --workdir /workspace --entrypoint bash sha256:fc6a74e246e7c6959d56df2488beee12f922d15bcf571212e47e4f3936cf97b5 -lc 'npm --prefix site run build && npm --prefix site run test:e2e -- tests/e2e/ch39-end-to-end-llm.spec.ts --grep "literal ASCII command flags" --workers=1'
```

Exit0; normal rendering85pages/12.56s; exactly1 sole-Firefox test passed/3.5s.
The test asserts exact ASCII text in static HTTP HTML and unique live DOM code
for both locales. No wholechapter checks, screenshots or new judgments ran.
The separate reference reframe remains blocked/unpublished; its failed evidence
is retained and no old whole-candidate binding is claimed current.

Source/ledger/test diff-check passed. An all-artifact staged diff-check reports
trailing spaces in the exact Astro-generated HTML. Those raw evidence bytes are
preserved, not normalized; this is not a source/test whitespace failure.
