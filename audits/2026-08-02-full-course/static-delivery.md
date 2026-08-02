# Static delivery audit

Audited product revision: `2b24a50d86609445ed19aa33a4162414904dc4ca`

Toolchain: Linux x86_64 in Docker, Node 22.12.0, npm 10.9.0, Astro 7.1.1,
Vitest 3.2.7, Docker 29.6.2, and Docker Compose 5.3.1. The reconstructed
immutable audit image is `learn-llm-full-audit-source:local` at
`sha256:994383fb740655e2c9a5437c5bac111880bcfdd0eae6cf2f962a0fec6d103c26`.
It was composed from the exact Git archive of the audited revision
(`sha256:28b19bbf8fdab9ee072d61f14397d41d0495ca840a3278333382238707cea969`)
and the previously accepted pinned workspace toolchain. Lockfile, locale
projection, and Chapter 39 sheet hashes match the host revision.

## Findings

### Low: the README describes only the first six implementation chapters

`README.md:5-8` says that the published course ends with the bigram baseline.
The generated site and locale projection contain the orientation plus all
implementation Chapters 1-39 in both English and Russian. This is documentation
drift; it does not hide or break any static route.

### Audit-environment limitation: the course CLI contract cannot run in either available audit shell

`scripts/check-course-cli.sh` reached the release fixture and stopped because
`course:89-91` requires GNU `mv --exchange` and `--no-copy`. The immutable
Debian bookworm source image lacks those options, while the available Windows
Git Bash provides GNU coreutils 8.32 and also lacks them. The README explicitly
requires a supported Linux host with GNU coreutils 9.7, so this is not evidence
that the documented supported host fails. It is a reproducibility gap in the
current Docker-only audit environment: the CLI contract could not be exercised
end to end here. The failure is preserved in `course-cli.log`; no release was
published.

### Workspace hygiene warning: the host-artifact gate correctly fails on ignored generated trees

The host contains generated `.astro`, `node_modules`, `target`, `test-results`,
`site/.astro`, `site/dist`, `site/node_modules`, `site/playwright-report`, and
`site/test-results` paths. `scripts/check-host-artifacts.sh` therefore exits 1,
first identifying `.astro`. These paths are ignored and did not enter the Git
archive or immutable audit image, so they do not affect the audited product or
the static build. They do mean the current host workspace does not satisfy its
own clean-host hygiene check. A failed Git-Bash CLI fixture cleanup also left
`.build/course-cli-release-1677/`; it is ignored and outside the product tree.

## Verified passes

- `npm --prefix site run check`: 210 files, zero errors, warnings, or hints.
- `npm --prefix site test -- --run`: 53 files and 946 tests passed.
- `npm --prefix site run check:content` and `check:parity`: 80 localized
  lessons, 40 publishable locale sets, 32 catalog keys, and 42 registered shared
  full-view diagram components passed.
- Default static build: 85 HTML pages built. The link audit passed 2,447 local
  references, 85 description/SEO routes, 85 sitemap URLs, 85 Analytics routes,
  and 163 total artifacts.
- GitHub Pages build with `SITE_BASE=/learn_llm/` and
  `SITE_URL=https://intale.github.io/learn_llm/`: the same 85 pages and all
  2,447 references, SEO routes, sitemap URLs, and Analytics routes passed. The
  sitemap is therefore rooted under the project URL, not the account root.
- `node scripts/check-deployment-workflow.mjs`: the main-only Pages workflow,
  least-privilege job permissions, configured Pages base path/site URL, pinned
  action identities, artifact checks, and deployment dependency passed.
- Generated head coverage is complete for the agreed basic SEO contract: all
  85 HTML pages have one description and the Google Analytics tag in `head`.
  The curriculum contract intentionally excludes canonical, Open Graph,
  Twitter-card, keywords, and robots metadata, so their absence is not a finding.
- Tracked shell entry points retain executable Git modes; `git diff --check`
  reports no whitespace error.

## Evidence and limitations

Complete command output is preserved under
`.build/runs/20260802T095110Z-audit-static-delivery-01/`, notably
`npm-check.log`, `npm-unit.log`, `content.log`, `parity.log`,
`build-links.log`, `gh-pages-build-links.log`, `deployment.log`,
`course-cli.log`, and `host-artifacts.log`.

This step audited static generation and delivery contracts. Interactive layout,
fullscreen, no-JavaScript behavior, and browser console compatibility belong to
the separate Chromium/Firefox audit. The CLI limitation prevents a claim that
the release wrapper itself passed on the documented GNU coreutils 9.7 host.
