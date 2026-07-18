# LLM, piece by piece

A localized course, currently available in English and Russian, for learning how
modern large language models work by implementing each part from first principles
in Rust. The current course includes chapter 1, which follows text through UTF-8
bytes, Unicode scalar values, and deterministic vocabulary IDs.

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

Configured languages are declared once in `site/src/i18n/locales.json`. English
and Russian lessons currently live in `site/src/content/chapters/en/` and
`site/src/content/chapters/ru/`. A chapter is published only when exactly one
lesson for every configured locale exists at the same content revision and their
shared formula, Rust-source, visualization, and ordering metadata agree. Interface
translations live in matching, schema-checked
`site/src/i18n/catalogs/<locale>.json` catalogs.

See the [localized chapter workflow](curriculum/README.md) before adding or
translating a lesson. Reviewed contracts in `curriculum/chapters/` define the
learning objective and observable behavior before implementation begins.

To add a spoken language, prepare one atomic change that:

1. registers a dedicated activation step in
   `curriculum/course-plan.md` under `scheduling.cross_cutting_steps`, immediately
   before the first pending chapter, or after the final chapter when the course
   is already complete;
2. adds its URL-safe locale code, BCP-47 language tag, native name, and `ltr` or
   `rtl` direction to `site/src/i18n/locales.json`;
3. adds a complete, schema-checked
   `site/src/i18n/catalogs/<locale>.json` message catalog;
4. adds that locale key to every localized field in each implemented chapter
   contract and supplies one matching lesson under
   `site/src/content/chapters/<locale>/`; and
5. adds the locale's concrete lesson output and `check:chapter` command to each
   still-pending chapter step in `BUILD_STATE.yaml`;
6. runs the complete plan, content, type, build, link, and browser gates below.

The activation step owns translations, contract/catalog extensions, and browser
expectations for chapters that were already completed. Never rewrite those
chapters' completed step declarations or commits; only pending chapter steps adopt
the expanded locale output set directly.

Routes, the root chooser, language switches, `hreflang` links, page direction,
content loading, publication parity, and validators all derive from the manifest.
The course-plan gate checks the declarative pending-step ledger against that same
locale set while preserving historical locale sets on completed steps, so expanding
the ledger does not require validator code changes.
The checks fail closed if a catalog, contract value, lesson, or alternate route is
missing, so do not enable a locale with placeholder or partial public content.

## Repository layout

- `site/` — Astro/MDX static site, localized content, and browser/unit tests;
- `rust/demos/` — runnable chapter examples;
- `rust/crates/llm-from-scratch/` — cumulative model implementation;
- `curriculum/` — reviewed chapter contracts and authoring workflow;
- `scripts/` — deterministic content, dependency, and static-link checks;
- `BUILD_STATE.yaml` — ordered build and checkpoint ledger; and
- `DECISIONS.md` — durable architecture and process decisions.
