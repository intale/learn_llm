# Codex validation tools

These tools move deterministic verification and raster assembly out of agent
context. They do not select work, grant network access, launch a browser, or
authorize writes outside the invoking run. `AGENTS.md`, `BUILD_STATE.yaml`, and
the selected step remain authoritative.

## Commands

```bash
# The only networked command; builds the digest- and snapshot-pinned image.
./course tools build

# Runs both deterministic test suites with networking disabled.
./course tools test

# Inputs are relative to .build/runs/<RUN_ID>/.
./course tools verify-run <RUN_ID> --manifest authority.json
./course tools visual-evidence <RUN_ID> --contract visual-evidence.json
```

Each runtime command mounts the repository read-only and creates exactly one
fresh mode-0700 output directory below
`.build/runs/<RUN_ID>/tooling/`. It refuses to reuse that directory, including
after a failed attempt. Preserve the old evidence and use a new run when inputs
change.

## Authority manifest, schema v1

```json
{
  "schemaVersion": 1,
  "runId": "20260811T120000Z-example-step-01",
  "authorities": {
    "files": [
      {
        "path": "AGENTS.md",
        "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      }
    ],
    "sha256Manifests": [
      {
        "path": ".build/runs/20260811T120000Z-example-step-01/product.sha256",
        "base": "manifest-directory",
        "expectedCount": 3,
        "exhaustiveRoot": "product",
        "excludes": ["product/debug.log"]
      }
    ],
    "statusFiles": [
      {
        "path": ".build/runs/20260811T120000Z-example-step-01/check.status"
      }
    ]
  },
  "scope": {
    "declaredOutputs": [
      "BUILD_STATE.yaml",
      "DECISIONS.md",
      "tools/example.mjs"
    ]
  }
}
```

All object keys are closed by the schema. Paths are normalized ASCII paths,
authority arrays and `declaredOutputs` are unique and C-sorted, hashes are
lower-case SHA-256, and status files contain exactly a canonical integer plus
LF. A SHA manifest uses `64hex`, two ASCII spaces, a normalized path, and LF.
An empty SHA manifest is exactly zero bytes.

`base` is either `repository` or `manifest-directory`; row paths,
`exhaustiveRoot`, and `excludes` use that coordinate system. An exhaustive
manifest must equal the complete regular-file set below its root. The scope
must equal the current tracked diff from `HEAD` plus non-ignored untracked
files. The output is `authority-report.json`, written mode 0600 and atomically.

## Visual-evidence contract, schema v1

```json
{
  "schemaVersion": 1,
  "runId": "20260811T120000Z-example-step-01",
  "browser": "firefox",
  "javaScriptEnabled": true,
  "traceArchives": [
    {
      "path": "browser/test-results/example/trace.zip",
      "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
  ],
  "images": [
    {
      "path": "browser/frames/example-desktop.png",
      "sha256": "123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"
    },
    {
      "path": "browser/frames/example-narrow.png",
      "sha256": "23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01"
    }
  ],
  "groups": [
    {
      "id": "example-layouts",
      "columns": 2,
      "images": [
        "browser/frames/example-desktop.png",
        "browser/frames/example-narrow.png"
      ]
    }
  ]
}
```

Contract paths are relative to the selected run. Every list is nonempty,
unique, and C-sorted. PNGs must be explicitly allowlisted, hash-locked, and
used by exactly one group. Trace archives must prove Firefox contexts with
JavaScript explicitly enabled, DOM snapshots, and present screencast resources.

The tool records trace and image inventories, exact tool versions, a SHA
manifest, and deterministic PNG contact sheets. It writes `summary.json` last;
only `"complete": true` is a completion marker. Source traces and images remain
unchanged. Contact sheets are navigation aids for a visual reviewer; they do
not replace inspection of raw frames, accessibility/geometry assertions, or
Terra's visual judgment.

## Runtime boundary

The image uses the hard-coded Playwright base digest and Ubuntu snapshot in
`toolchain.lock.json`. Its build verifies the exact newly installed package set,
package versions, copied source hash, and copied lock hash. Offline commands run
as the invoking UID/GID with networking disabled, a read-only root and repository,
no Docker socket or ports, and all capabilities dropped. `/output` is the only
persistent writable mount; `/tmp` is a non-executable 512 MiB tmpfs.
