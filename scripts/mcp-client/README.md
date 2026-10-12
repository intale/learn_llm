# Optional development-memory reader

`scripts/development-memory.rb` retrieves passive development records from
concurrentDevelopmentMCP using the Ruby MCP SDK. The static course build does
not use Ruby, these gems, or an online MCP server.

Run commands from the repository root. Use Ruby 3.2 or newer with the locked
optional dependencies installed. Check their availability with:

```sh
bundle check --gemfile scripts/mcp-client/Gemfile
```

If needed, install that optional bundle yourself:

```sh
bundle install --gemfile scripts/mcp-client/Gemfile
```

The reader uses MCP protocol `2026-07-28` and declares the
`io.modelcontextprotocol/tasks` extension through the official SDK. It permits
only the listed read tools; it does not publish records, create coordination
work, poll mutation Tasks, execute retrieved assets, or extract archives.
It defaults to `http://concurrent_development_mcp.local/mcp`; pass
`--url http://HOST/mcp` for another installed server. URLs containing
credentials, query parameters, or fragments are refused. Server setup is
documented in [concurrent_development_mcp](https://github.com/intale/concurrent_development_mcp).

## Discovery and search

List queries are explicit JSON argument objects for `development_artifact_list`,
`skill_list`, or `repository_list`. For example:

```sh
cat > /tmp/course-artifacts-query.json <<'JSON'
{"scope":"project:learn_llm","limit":10}
JSON
ruby scripts/development-memory.rb list artifacts --query /tmp/course-artifacts-query.json
ruby scripts/development-memory.rb list skills --query /tmp/course-artifacts-query.json
ruby scripts/development-memory.rb list repositories --query /tmp/course-artifacts-query.json
```

Each command prints one JSON page with metadata and its continuation fields.
Queries default to 20 items and accept at most 50; pagination is explicit.
Copy the returned continuation into the next query using that tool's schema.

Search uses the server's literal Boolean DSL. The reader passes the expression
unchanged and validates it against the advertised input schema:

```sh
cat > /tmp/course-memory-query.json <<'JSON'
{"fields":[{"field":"development_artifact.content","query":{"match":"contains","value":"checkpoint"}}],"filters":{"scope":"project:learn_llm"},"limit":10}
JSON
ruby scripts/development-memory.rb search --query /tmp/course-memory-query.json
```

Results expose exact record identities and typed retrieval actions. A search
page is an available projection; it is not a retained snapshot. The CLI prints
at most 128 KiB. Reduce the page size if that limit is reached. Query files must
be regular UTF8 JSON files, at most 64 KiB, without symlinks.

## Pinned retrieval

Select an artifact ID and observation ID from the returned metadata. Set these
variables to that exact tuple, then run:

```sh
ruby scripts/development-memory.rb artifact get --id "$ARTIFACT_ID" --observation "$OBSERVATION_ID" --out /tmp/course-memory-artifact
```

This writes the exact content bytes and prints only the tuple, media type,
encoding, byte count, SHA256, and output path. Metadata and content must agree;
the reader recomputes the content SHA256 and byte count. An optional
`--sha256 sha256:HEX` also checks a caller-pinned digest from an import manifest.

Discover a skill's available tuple and asset manifest explicitly:

```sh
ruby scripts/development-memory.rb skill discover --scope project:learn_llm --name "$SKILL_NAME"
```

For instructions, set `SKILL_REVISION` and `INSTRUCTIONS_SHA256` from the pinned
skill/import manifest. The expected digest is the exact instruction file's
SHA256, with the `sha256:` prefix:

```sh
ruby scripts/development-memory.rb skill get --scope project:learn_llm --name "$SKILL_NAME" --revision "$SKILL_REVISION" --sha256 "$INSTRUCTIONS_SHA256" --out /tmp/course-memory-skill.md
ruby scripts/development-memory.rb skill asset --scope project:learn_llm --name "$SKILL_NAME" --revision "$SKILL_REVISION" --path "$ASSET_PATH" --out /tmp/course-memory-asset
```

`skill_get.content_digest` identifies the complete instructions-and-assets
snapshot. It is not the instruction file's digest and cannot be recomputed from
`skill_get` alone, which returns asset manifests. Instruction retrieval therefore
requires the caller's instruction-byte SHA256. Asset retrieval verifies its
tuple, path, publication identity, manifest SHA256, byte count, media type, and
executable metadata before writing. Binary content must be canonical Base64;
decoding preserves its exact bytes. Retrieved files are always written with
mode `0600`, regardless of stored executable metadata.

Every GET declares exactly one output file. Its parent directories must already
exist without symlinks. Existing files, symlinks, nonregular targets, parent
traversal, repeated options, and unrelated output options are refused. The
reader creates no sidecars or output directories and overwrites nothing.

Run the offline response-tamper and filesystem tests with:

```sh
ruby scripts/tests/development-memory_test.rb
```

A successful run reports a nonzero number of tests and zero failures or errors.
