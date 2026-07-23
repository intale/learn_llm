# LLM, piece by piece

Curriculum website [https://intale.github.io/learn_llm/](https://intale.github.io/learn_llm/)

A static, localized course for learning how modern large language models work by
implementing each part from first principles in Rust. English and Russian are
currently enabled, and the published course covers text units, corpus partitions,
BPE training and application, autoregressive examples, and a bigram baseline.

## Requirements

The supported host is Linux with Bash 4 or newer, Git, `curl`, GNU
findutils/coreutils (including `sha256sum` and `mv --exchange`), Docker Engine
with BuildKit, and Docker Compose. The current workflow is tested with Docker
25.0.2, Compose 2.17.3, and GNU coreutils 9.7. Rust, Cargo, Node.js, npm, Python,
project dependencies, browser binaries, and compiler caches stay in Docker.

Run every command below from the repository root.

## Open the published course

Build the deployable Nginx image and serve it:

```bash
./course build
./course preview
```

Open <http://127.0.0.1:4321/> and choose English or Russian. Press `Ctrl+C` in
the terminal to stop the server.

The localized course indexes are available directly at:

- <http://127.0.0.1:4321/en/course/>
- <http://127.0.0.1:4321/ru/course/>

The indexes are the authoritative list of published chapters. Each lesson starts
with a small prediction, derives the relevant formula, contrasts the historical
approach, shows the exact tested Rust implementation, and ends with checks and
exercises.

## Review an unpublished chapter

Agents stage candidate files under `.build/runs/<run-id>/publish/`. Review a
candidate as a real static site instead of reading its MDX and source files:

```bash
./course review 20260719T135559Z-rewrite-ch06-bigram-baseline-01
```

The command validates the run ID, verifies its source manifest when present,
overlays the staged files through a Docker build context, runs the content,
parity, type, static-build, and link gates in Docker, and prints direct URLs for
every staged lesson. For the current Chapter 6 candidate it prints:

- <http://127.0.0.1:4321/en/course/06-bigram-baseline/>
- <http://127.0.0.1:4321/ru/course/06-bigram-baseline/>

Press `Ctrl+C` to stop the review server. To use another loopback port:

```bash
./course review 20260719T135559Z-rewrite-ch06-bigram-baseline-01 --port 4400
```

For an automated render check without starting a server:

```bash
./course review 20260719T135559Z-rewrite-ch06-bigram-baseline-01 --check
```

Review builds never publish the candidate or modify its `publish/` tree. Their
images and build cache remain in the Docker daemon. Human approval should name
the reviewed run and cover both localized pages, including captions and
accessible labels.

## Export a static release

Create a deployable static tree at `site/dist`:

```bash
./course release
```

The command builds the canonical deployable image used by `./course build`; it
never includes an unpublished `.build` candidate. It copies that image's document
root into a temporary sibling directory, verifies the localized indexes, and
atomically exchanges it with `site/dist`. Releasing again removes stale files
from an older build.

Deploy the **contents** of `site/dist/` at the host's URL root. The static host
must support directory `index.html` routes. Do not open
`site/dist/index.html` with `file://`, and do not serve the repository root and
browse to `/site/dist/`: generated links are root-relative, so `site/dist` must
be the HTTP document root. This remains the contract for `./course release`;
the GitHub Actions deployment below creates a separately validated project-base
build.

`site/dist` is the one intentional generated host tree. It contains only static
HTML, CSS, fonts, and other browser assets; it contains no Rust, Node.js, or
Python toolchain.

## Deploy with GitHub Pages

The Pages workflow publishes this repository at
<https://intale.github.io/learn_llm/>. One repository setting is required before
the first deployment: open **Settings → Pages**, then set **Build and deployment
→ Source** to **GitHub Actions**.

Every push to `main` runs `.github/workflows/deploy-pages.yml`. The workflow asks
GitHub Pages for the repository's current base path, builds and validates the
static site in the pinned Docker toolchain, uploads that exact static artifact,
and deploys it through the `github-pages` environment. To rerun it without a
commit, open **Actions → Deploy GitHub Pages → Run workflow** and select `main`.
Manual runs from other branches are skipped.

No personal access token, deployment branch, generated-site commit, or separate
repository is involved. The workflow uses only the current repository's scoped
`GITHUB_TOKEN`. The unused `intale/learn-llm.github.io` repository is not part of
this deployment. If this repository is renamed, its default Pages URL changes;
the workflow derives the new project base from GitHub rather than hard-coding
`/learn_llm/`.

## Run a Rust example

Run any chapter package inside the pinned workspace image. For example:

```bash
./course run cargo run --quiet --locked -p ch05-autoregressive-examples
```

Chapter demos live under `rust/demos/`, and each implemented demo has a committed
deterministic output fixture. The cumulative implementation lives in
`rust/crates/llm-from-scratch/`. No Rust artifact is written to the host.

## Validate changes

Build the canonical validated workspace image and audit the host boundary:

```bash
./course check
./course audit-host
```

The workspace image checks Rust formatting and tests plus Astro diagnostics,
configured-locale content/parity, the static build, and every local link and
asset reference. Additional repository gates can be run in the same ephemeral
image, for example:

```bash
./course run scripts/validate-in-container.sh
```

Show every supported wrapper command with:

```bash
./course help
```

## Content and localization

Configured languages are declared in `site/src/i18n/locales.json`. Lessons live
under `site/src/content/chapters/<locale>/`; interface messages live in
schema-checked `site/src/i18n/catalogs/<locale>.json` files. A chapter publishes
only when every configured locale has one same-revision lesson and the shared
formula, Rust-source, visualization, and order metadata agree.

Read the [chapter delivery playbook](SKILLS.md) and the
[localized curriculum workflow](curriculum/README.md) before authoring or
translating a lesson. Translation is meaning-first: establish terminology,
rewrite naturally in the target language, compare critical claims, perform an
anti-calque and monolingual pass, inspect the rendered page, and obtain the
required fluent-human approval before publication.

Adding another spoken language is one atomic activation step. It extends the
locale registry, message catalog, localized fields in every implemented chapter
contract, complete lesson set, pending-step outputs, and browser expectations.
Routes, `hreflang`, language switches, page direction, publication parity, and
validators derive from that registry rather than an English/Russian special
case.

## Repository layout

- `site/` — Astro/MDX static site, localized lessons, and browser/unit tests;
- `rust/demos/` — runnable deterministic chapter examples;
- `rust/crates/llm-from-scratch/` — cumulative model implementation;
- `curriculum/` — reviewed chapter contracts, course plan, and workflow;
- `scripts/` — deterministic content, dependency, link, CLI, and host checks;
- `.build/runs/` — ignored run-specific staging, manifests, and review evidence;
- `BUILD_STATE.yaml` — ordered build and checkpoint ledger;
- `DECISIONS.md` — durable architecture and process decisions; and
- `course` — the Docker-only host interface.
