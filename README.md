# LLM, piece by piece

A bilingual English/Russian course for learning how modern large language models
work by implementing each part from first principles in Rust. The current course
includes chapter 1, which follows text through UTF-8 bytes, Unicode scalar values,
and deterministic vocabulary IDs.

## Quick start

Prerequisites:

- Node.js 22.12 or newer and npm 10.9.2;
- Rust 1.93 or newer (the repository is validated with Rust 1.93.1); and
- Bash and `diff` for the complete validation matrix.

From the repository root:

```bash
npm --prefix site ci
npm --prefix site run build
npm --prefix site run preview -- --host 127.0.0.1
```

Open <http://127.0.0.1:4321/> and choose English or Russian. Press `Ctrl+C` in
the terminal to stop the preview server.

> [!IMPORTANT]
> Do not open `site/dist/index.html` directly, and do not serve the repository
> root and browse to `/site/dist/`. Generated pages use root-relative URLs and
> directory routes. `site/dist` must be the web server's document root. The
> preview command above handles this correctly.

To use a generic static file server instead of Astro preview, run this from the
repository root:

```bash
python3 -m http.server 8000 --directory site/dist
```

Then open <http://127.0.0.1:8000/>. This serves only static files; the deployed
course does not require a server-side application.

## Learn with the course

The generated site currently contains these routes:

- `/` — language chooser;
- `/en/` and `/ru/` — localized home pages;
- `/en/course/` and `/ru/course/` — chapter indexes; and
- `/en/course/01-text-units/` and `/ru/course/01-text-units/` — chapter 1.

Each chapter starts with a small worked example. Predict its output, connect the
observable behavior to the formula and historical approach, inspect the exact
Rust implementation, and then expand the exercise answers after checking your
prediction. English and Russian lessons use the same tested Rust sources.

## Run the Rust example

Run chapter 1 and its focused tests from the repository root:

```bash
cargo run --locked -p ch01-text-units
cargo test --locked -p ch01-text-units
```

The implementation is in
[`rust/demos/ch01-text-units/src/`](rust/demos/ch01-text-units/src/), and its
deterministic output is recorded in
[`expected.txt`](rust/demos/ch01-text-units/expected.txt). Verify the output
byte-for-byte with:

```bash
cargo run --quiet --locked -p ch01-text-units | diff -u rust/demos/ch01-text-units/expected.txt -
```

A successful `diff` prints nothing.

## Development and deployment

Run the source development server without creating a production build:

```bash
npm --prefix site run dev -- --host 127.0.0.1
```

After editing the site or lessons, rebuild the production artifact:

```bash
npm --prefix site run build
```

Deploy the **contents** of `site/dist/` at the host's URL root. The host must
support normal directory `index.html` routes. The current configuration is not
set up for direct `file://` browsing or deployment below a nested URL prefix.

## Validation

Install the locked site dependencies with `npm --prefix site ci`, then run the
repository gates from the root:

```bash
cargo fmt --all -- --check
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
cargo run --quiet --locked -p ch01-text-units | diff -u rust/demos/ch01-text-units/expected.txt -

npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run check:content
npm --prefix site run check:parity
npm --prefix site run build
npm --prefix site run test:links
```

The production build must exist before browser tests because Playwright previews
`site/dist`. Install its pinned Chromium browser once, then run the suite:

```bash
npm --prefix site exec -- playwright install chromium
npm --prefix site run test:e2e
```

## Content and localization

English and Russian lessons live in `site/src/content/chapters/en/` and
`site/src/content/chapters/ru/`. A chapter is published only when both lessons
exist at the same content revision and their shared formula, Rust-source,
visualization, and ordering metadata agree. Interface translations live in
`site/src/i18n/`.

See the [bilingual chapter workflow](curriculum/README.md) before adding or
translating a lesson. Reviewed contracts in `curriculum/chapters/` define the
learning objective and observable behavior before implementation begins.

## Repository layout

- `site/` — Astro/MDX static site, localized content, and browser/unit tests;
- `rust/demos/` — runnable chapter examples;
- `rust/crates/llm-from-scratch/` — cumulative model implementation;
- `curriculum/` — reviewed chapter contracts and authoring workflow;
- `scripts/` — deterministic content, dependency, and static-link checks;
- `BUILD_STATE.yaml` — ordered build and checkpoint ledger; and
- `DECISIONS.md` — durable architecture and process decisions.
