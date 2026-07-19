# LLM, piece by piece

A localized course, currently available in English and Russian, for learning how
modern large language models work by implementing each part from first principles
in Rust. The current course includes chapter 1, which follows text through UTF-8
bytes, Unicode scalar values, and deterministic vocabulary IDs.

## Quick start

The build runs in pinned Docker images. No Rust, Node.js, npm, Python, or project
dependencies need to be installed on the host; Docker and Docker Compose are the
only prerequisites.

From the repository root:

```bash
./course build
./course preview
```

Open <http://127.0.0.1:4321/> and choose English or Russian. Press `Ctrl+C` in
the terminal to stop the preview server.

> [!IMPORTANT]
> Do not open `site/dist/index.html` directly, and do not serve the repository
> root and browse to `/site/dist/`. Generated pages use root-relative URLs and
> directory routes. `site/dist` must be the web server's document root. The
> preview command above handles this correctly.

The `site/dist/` directory is produced through a bind mount and is served by the
Nginx preview container. Stop it with `Ctrl+C`.

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
./course run cargo run --locked -p ch01-text-units
```

The implementation is in
[`rust/demos/ch01-text-units/src/`](rust/demos/ch01-text-units/src/), and its
deterministic output is recorded in
[`expected.txt`](rust/demos/ch01-text-units/expected.txt). Verify the output
byte-for-byte with:

```bash
./course run cargo run --quiet --locked -p ch01-text-units
```

A successful `diff` prints nothing.

## Development and deployment

For a live development server, use the site image and mount the source tree:

```bash
docker run --rm -it -p 4321:4321 -v "$PWD/site:/workspace/site" \
  -v course_site_node_modules:/workspace/site/node_modules \
  -w /workspace/site node:22.12.0-bookworm-slim \
  sh -c 'npm ci && npm run dev -- --host 0.0.0.0'
```

After editing the site or lessons, rebuild the production artifact:

```bash
./course build
```

Deploy the **contents** of `site/dist/` at the host's URL root. The host must
support normal directory `index.html` routes. The current configuration is not
set up for direct `file://` browsing or deployment below a nested URL prefix.

## Validation

Run the repository gates in containers:

```bash
./course check
./course audit-host
```

The production build must exist before browser tests because Playwright previews
`site/dist`. Install its pinned Chromium browser once, then run the suite:

```bash
./course build
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
