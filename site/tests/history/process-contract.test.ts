// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { createHash } from "node:crypto";
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import * as nodeFs from "node:fs";
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { tmpdir } from "node:os";
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import * as chapterContractChecks from "../../../scripts/check-chapter-contract.mjs";
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import * as coursePlanChecks from "../../../scripts/check-course-plan.mjs";
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import * as siteContentChecks from "../../../scripts/check-site-content.mjs";
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import * as staticLinkChecks from "../../../scripts/check-static-links.mjs";
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { validateChapterLocaleConfiguration } from "../../../scripts/chapter-locale-config.mjs";
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { validateLocaleConfiguration } from "../../../scripts/locale-config.mjs";
import {
  findChapterNeighbors,
  orderChapterTargets,
} from "../../src/lib/chapter-navigation";

const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = nodeFs;
const {
  validateChapterContractIntegration,
  validateChapterContractText,
  validateContractLesson,
  validateExpectedOutput,
} = chapterContractChecks;
const {
  deriveScheduledStepIds,
  validateCoursePlanText,
  validateImplementedContracts,
  validateLedgerText,
} = coursePlanChecks;
const {
  findPublishableChapterSets,
  validateCatalogParity,
  validateChapterDocument,
  validateChapterMetadata,
  validateChapterLocaleSet,
  validatePublishedContractSequence,
  validatePublishedChapterSequence,
} = siteContentChecks;
const { auditStaticSite, referenceCandidates } = staticLinkChecks;

declare const process: { cwd(): string; env: Record<string,string|undefined> };
const historyRoot=process.env.COURSE_HISTORY_ROOT;
if(!historyRoot)throw new Error("COURSE_HISTORY_ROOT must select an exact MCP-exported checkpoint");

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function replaceOnce(source: string, search: string, replacement: string) {
  expect(source.split(search)).toHaveLength(2);
  return source.replace(search, replacement);
}

function repositoryRoot() {
  return resolve(historyRoot);
}

function jsonFrontmatter(source: string): Record<string, unknown> {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]) as Record<string, unknown>;
}

const LANGUAGE_BOUNDARY_CHAPTERS = [
  "08-tensor-storage",
  "09-tensor-views",
  "10-broadcasting-reductions",
  "11-matrix-multiplication",
  "12-stable-softmax",
  "13-gradient-checking",
  "14-scalar-autodiff",
  "15-tensor-autodiff-core",
  "16-model-autodiff-ops",
  "17-parameter-initialization",
  "18-token-embeddings",
] as const;

const UNJUSTIFIED_LANGUAGE_ACTOR_PATTERNS = [
  /\bTypeScript\b/i,
  /\bAstro component\b/i,
  /\bbrowser(?:-side| code)\b/i,
  /\bclient script\b/i,
  /\bhydration directive\b/i,
  /\bpage parser\b/i,
  /\bRust (?:validates|returns|never materializes|commits)\b/i,
  /\bthis Rust (?:API|implementation|course)\b/i,
  /\brepository's Rust errors\b/i,
] as const;

function canonicalContract() {
  const root = repositoryRoot();
  const path = join(root, "curriculum/chapters/01-text-units.md");
  return validateChapterContractText(readFileSync(path, "utf8"), {
    sourceName: "curriculum/chapters/01-text-units.md",
  });
}

function canonicalLesson(locale: "en" | "ru") {
  const path = join(
    repositoryRoot(),
    "site/src/content/chapters",
    locale,
    "01-text-units.mdx",
  );
  return validateChapterDocument(readFileSync(path, "utf8"), {
    sourceName: `${locale}/01-text-units.mdx`,
    checkSourceFiles: false,
  });
}

function canonicalLessonSection(locale: "en" | "ru", section: string): string {
  const body = canonicalLesson(locale).body;
  const marker = `{/* chapter-section:${section} */}`;
  const start = body.indexOf(marker);
  if (start === -1) {
    throw new Error(`${locale} Chapter 1 is missing section ${section}`);
  }
  const contentStart = start + marker.length;
  const next = body.indexOf("{/* chapter-section:", contentStart);
  return body
    .slice(contentStart, next === -1 ? body.length : next)
    .replace(/\s+/g, " ")
    .trim();
}

function chapterMetadata(locale: string = "en") {
  const english = locale === "en";
  const russian = locale === "ru";
  const localized = (englishText: string, russianText: string) =>
    english
      ? englishText
      : russian
        ? russianText
        : `[${locale}] ${englishText}`;
  return {
    chapter_id: "01-text-units",
    locale,
    content_revision: 1,
    order: 1,
    concept_id: "text-units",
    title: localized("Text units", "Единицы текста"),
    description: localized(
      "Map text to stable IDs.",
      "Преобразуйте текст в устойчивые ID.",
    ),
    objective: localized(
      "Implement an observable mapping.",
      "Реализуйте наблюдаемое отображение.",
    ),
    worked_inputs: localized(
      "Use one tiny fixed input and predict its IDs.",
      "Используйте один небольшой фиксированный вход и предскажите его ID.",
    ),
    formula: {
      latex: "i = V(t)",
      symbols: [
        {
          symbol: "t",
          meaning: localized("text unit", "единица текста"),
        },
        {
          symbol: "i",
          meaning: localized("vocabulary ID", "ID словаря"),
        },
      ],
    },
    history: {
      approach: localized("Whitespace splitting", "Разбиение по пробелам"),
      summary: localized("Words came first.", "Сначала использовали слова."),
      rust_source: "rust/demos/ch01-text-units/src/main.rs",
    },
    rust_sources: [
      {
        path: "rust/demos/ch01-text-units/src/main.rs",
        purpose: localized("Runnable contrast", "Исполняемое сравнение"),
      },
    ],
    visualization: {
      decision: "useful" as const,
      id: "text-units",
      rationale: localized(
        "Shows each mapping.",
        "Показывает каждое отображение.",
      ),
    },
    decoder_connection: localized(
      "The resulting IDs become the discrete input to the decoder.",
      "Полученные ID становятся дискретным входом декодера.",
    ),
  };
}

const EARLIER_HISTORY_URL =
  "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf";
const LATER_HISTORY_URL =
  "https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf";

function contractLlmEvolution(locales: readonly string[] = ["en", "ru"]) {
  const localized = (text: string) =>
    Object.fromEntries(locales.map((locale) => [locale, `${locale}: ${text}`]));
  return {
    predecessor_kind: "language-model",
    limitation: localized(
      "the fixed context cannot represent all prior positions",
    ),
    later_advance: localized("self-attention exposes the full prefix"),
    modern_llm_role: localized("tensor views implement attention layouts"),
    sources: [
      {
        role: "earlier",
        year: 2003,
        name: "A Neural Probabilistic Language Model",
        source_url: EARLIER_HISTORY_URL,
        claim: localized(
          "the model concatenates a fixed number of earlier word features",
        ),
      },
      {
        role: "later",
        year: 2017,
        name: "Attention Is All You Need",
        source_url: LATER_HISTORY_URL,
        claim: localized(
          "multi-head attention projects and rearranges Q, K, and V",
        ),
      },
    ],
  };
}

function lessonLlmEvolution(locale: string = "en") {
  const localized = (text: string) => `${locale}: ${text}`;
  return {
    predecessor_kind: "language-model",
    limitation: localized(
      "the fixed context cannot represent all prior positions",
    ),
    later_advance: localized("self-attention exposes the full prefix"),
    modern_llm_role: localized("tensor views implement attention layouts"),
    sources: [
      {
        role: "earlier",
        year: 2003,
        name: "A Neural Probabilistic Language Model",
        source_url: EARLIER_HISTORY_URL,
        claim: localized(
          "the model concatenates a fixed number of earlier word features",
        ),
      },
      {
        role: "later",
        year: 2017,
        name: "Attention Is All You Need",
        source_url: LATER_HISTORY_URL,
        claim: localized(
          "multi-head attention projects and rearranges Q, K, and V",
        ),
      },
    ],
  };
}

function lessonMetadataWithLlmEvolution(locale: string = "en", order = 10) {
  const data = chapterMetadata(locale);
  return {
    ...data,
    order,
    history: {
      ...data.history,
      llm_evolution: lessonLlmEvolution(locale),
    },
  };
}

function chapterBody(formula = "i = V(t)") {
  return [
    "{/* chapter-section:worked-example */}",
    "## Worked example",
    "Predict the stable IDs for one tiny input, then compare every intermediate representation.",
    "{/* chapter-section:formula */}",
    "## Formula",
    "$$",
    formula,
    "$$",
    "Apply one deterministic vocabulary lookup at each sequence position and inspect the result.",
    "{/* chapter-section:symbol-glossary */}",
    "## Symbols",
    "| Symbol | Meaning |",
    "| :--- | :--- |",
    "| $t$ | the input text unit used at this position |",
    "| $i$ | the resulting stable vocabulary identifier |",
    "{/* chapter-section:history */}",
    "## History",
    "Contrast whitespace splitting with smaller units and explain the earlier method’s limitation.",
    "{/* chapter-section:rust-implementation */}",
    "## Rust",
    "Run the dependency-free implementation and inspect the exact deterministic output before editing it.",
    '<RustSource path="rust/demos/ch01-text-units/src/main.rs" caption="Runnable source" label="Rust source code" />',
    "{/* chapter-section:visualization */}",
    "## Visualization",
    "Trace the same position through every representation using labels in addition to color.",
    "<FixtureDiagram />",
    "{/* chapter-section:exercises */}",
    "## Exercises",
    "1. Predict the output before running the example.",
    "2. Explain which common boundary mistake changes the result.",
    "<details><summary>Check the predictions</summary>",
    "1. The fixed example preserves every known unit.",
    "2. The mistaken boundary changes the observable sequence.",
    "</details>",
    "{/* chapter-section:decoder-connection */}",
    "## Decoder connection",
    "The verified integer sequence becomes the explicit boundary consumed by the cumulative decoder.",
    "",
  ].join("\n");
}

function bodyWithHistoryCitations(
  body = chapterBody(),
  evolution = lessonLlmEvolution(),
) {
  return body.replace(
    "{/* chapter-section:rust-implementation */}",
    [
      evolution.limitation,
      evolution.later_advance,
      evolution.modern_llm_role,
      ...evolution.sources.map(
        (source) => `[${source.claim}](${source.source_url})`,
      ),
      "{/* chapter-section:rust-implementation */}",
    ].join("\n"),
  );
}

function contractSource(data: unknown, body: string) {
  return ["---", JSON.stringify(data, null, 2), "---", body].join("\n");
}

function chapterSource(
  data = chapterMetadata(),
  body = chapterBody(data.formula.latex),
) {
  return ["---", JSON.stringify(data, null, 2), "---", "", body].join("\n");
}

function parsedChapter(
  locale: string,
  supportedLocales: readonly string[] = ["en", "ru"],
) {
  return validateChapterDocument(chapterSource(chapterMetadata(locale)), {
    sourceName: locale + " fixture",
    checkSourceFiles: false,
    supportedLocales,
  });
}


describe("explicit exported development history",()=>{
it("projects the Chapter 18 clarification and functional successor handoff in plan revision 78 with exact bilingual chapter revisions", () => {
    const root = repositoryRoot();
    const planSource = readFileSync(
      join(root, "curriculum/course-plan.md"),
      "utf8",
    );
    const plan = jsonFrontmatter(planSource);
    const projectionSource = readFileSync(
      join(root, "site/src/i18n/chapter-locales.json"),
      "utf8",
    );
    const projection = JSON.parse(projectionSource) as {
      planRevision: number;
      chapters: Array<{
        chapterId: string;
        order: number;
        activeLocales: string[];
      }>;
    };
    expect(createHash("sha256").update(planSource).digest("hex")).toBe(
      "d9bd8273e3a3c834d093b2d1113b683acc729029696d5010915ad0c9a4a48868",
    );
    expect(createHash("sha256").update(projectionSource).digest("hex")).toBe(
      "565880ee28fefc47178e8c9da788cca6150cfbaa06b22603df1453bb4b7dfd93",
    );
    expect(plan.plan_revision).toBe(78);
    expect(projection.planRevision).toBe(78);
    expect(planSource).toContain(
      "Content revision 8 distinguishes reuse of one embedding parameter matrix across all batch and sequence positions from row selection inside it: different token IDs select different rows, repeated occurrences of one ID reuse its row, and this position-wise reuse is separate from later output-weight tying.",
    );
    expect(planSource).toContain(
      "- **Handoff:** Chapter 35 serializes the trainer-captured selected model and matching optimizer state for reproducible inference; the immutable evaluation report remains separate, and the sampling RNG is initialized independently.",
    );
    expect(planSource).toContain(
      "- **Outcome:** Save and load a versioned tokenizer, decoder, optimizer, and sampling-state checkpoint, then replay one caller-specified update from a trainer-issued selected-state capture.",
    );
    expect(planSource).toContain(
      "Explicitly leave corpus/split identity, batch order/cursor, training RNG, inputs/targets, learning-rate schedule, clipping, and validation policy to the caller; defer cache state and whole-job resume.",
    );
    expect(planSource).toContain(
      "changed batch or learning rate diverges and no whole-trainer resume is claimed.",
    );
    expect(planSource).not.toContain(
      "Save and load a versioned checkpoint that reproduces tokenizer/configuration, parameters, optimizer/RNG state, logits, and one resumed update.",
    );
    expect(planSource).toContain(
      "Report the existing test comparison as a mean over overlapping window-target slots; distinguish it from, but do not compute, a corpus metric that would score each of 442 within-document transition occurrences once, give the decoder the longest available causal prefix capped at four tokens, and use only its newest-position distribution; numeric mean NLL and perplexity are not reported for that policy.",
    );
    expect(planSource).toContain(
      "`N_{\\mathrm{slot}}=W_{\\mathrm{test}}C=436\\cdot4=1744`; `\\operatorname{PPL}_{\\mathrm{slot}}=\\exp(\\mathcal L_{\\mathrm{slot}})`; and `N_{\\mathrm{transition}}=\\sum_d(|z^{(d)}|-1)=444-2=442`",
    );
    expect(planSource).toContain(
      "The two test documents contain 442 within-document transition occurrences, but the conventional maximal-prefix metric that scores each occurrence once is explicitly not reported.",
    );
    expect(planSource).toContain(
      "Content revision 9 identifies the 1,744 reported observations as overlapping window-target slots, labels the fixed values as mean NLL in nats per slot and their exponentials as dimensionless window-slot perplexities",
    );
    expect(planSource).toContain(
      "mean NLL 3.866087547 and 3.981342714 in nats per slot and dimensionless window-slot perplexities 47.755180205 and 53.588940583",
    );
    expect(planSource).toContain(
      "Four within-document transition occurrences appear in one slot, four in two slots, four in three slots, and 430 in four slots",
    );
    expect(planSource).not.toMatch(/1,744 (?:identical|same) targets/);
    expect(planSource).toContain(
      "Content revision 6 preserves the ideal real-arithmetic top-k formula while distinguishing the exact rank-retained set from positive representable `f64` sampling support.",
    );
    expect(planSource).toContain(
      "- **Formula:** `q_i^{(\\tau,k)}=\\frac{\\mathbf{1}[i\\in K_k]\\exp(\\ell_i/\\tau)}{\\sum_j\\mathbf{1}[j\\in K_k]\\exp(\\ell_j/\\tau)},\\quad \\lvert K_k\\rvert=k,\\quad S_{\\tau,k}^{(\\mathrm{f64})}=\\{i\\in K_k\\mid\\widehat q_i^{(\\tau,k)}>0\\}\\subseteq K_k`.",
    );
    expect(planSource).toContain(
      "the `[2,2,1]` `f64::MIN_POSITIVE` fixture with retained IDs `[0,1,2]`, positive support `[0,1]`, and stored probability `\\widehat q_2=0`",
    );
    expect(planSource).toContain(
      "Exact-zero probabilities are excluded from categorical traversal without claiming that every positive stored probability necessarily owns a nonempty reachable interval.",
    );

    for (const [chapterId, order, revision] of [
      ["00-llm-parts", 0, 5],
      ["02-corpus-partitions", 2, 9],
      ["07-language-model-metrics", 7, 7],
      ["18-token-embeddings", 18, 8],
      ["22-adamw", 22, 8],
      ["33-training-selection", 33, 12],
      ["34-final-evaluation", 34, 7],
      ["35-checkpoints", 35, 5],
      ["36-temperature-top-k", 36, 6],
      ["38-cached-generation", 38, 6],
      ["39-end-to-end-llm", 39, 9],
    ] as const) {
      expect(
        projection.chapters.find((chapter) => chapter.chapterId === chapterId),
      ).toEqual({
        chapterId,
        order,
        activeLocales: ["en", "ru"],
      });
      const contract = jsonFrontmatter(
        readFileSync(join(root, `curriculum/chapters/${chapterId}.md`), "utf8"),
      );
      expect(contract.content_revision).toBe(revision);
      for (const locale of ["en", "ru"]) {
        const lesson = jsonFrontmatter(
          readFileSync(
            join(root, `site/src/content/chapters/${locale}/${chapterId}.mdx`),
            "utf8",
          ),
        );
        expect(lesson).toMatchObject({
          chapter_id: chapterId,
          locale,
          content_revision: revision,
          order,
        });
      }
    }
  });
it("keeps the checked-in chapter template structurally valid", () => {
    const template = readFileSync(
      resolve(repositoryRoot(), "curriculum/chapter-template.md"),
      "utf8",
    );
    const result = validateChapterContractText(template, {
      sourceName: "chapter-template.md",
      supportedLocales: ["en", "ru"],
    });

    expect(result.data.visualization.decision).toBe("useful");
    expect(Object.keys(result.data.objective)).toEqual(["en", "ru"]);
  });
it("keeps localization review mandatory without a pre-publication approval pause", () => {
    const root = repositoryRoot();
    const policyPaths = [
      "README.md",
      "AGENTS.md",
      ".agents/skills/localize-llm-course/SKILL.md",
      "SKILLS.md",
      "curriculum/README.md",
      "curriculum/chapters/05-autoregressive-examples.md",
      "curriculum/chapters/06-bigram-baseline.md",
      "curriculum/chapters/07-language-model-metrics.md",
      "curriculum/course-plan.md",
    ];
    const blockingApprovalPatterns = [
      /must (?:explicitly )?approve/i,
      /requires? (?:explicit )?fluent-human approval/i,
      /required fluent-human approval/i,
      /approval (?:remains )?mandatory before publish/i,
      /publication (?:still )?requires approval/i,
      /publication (?:waits|is gated) on [^.\n]*approval/i,
      /obtain the required [^.\n]*approval before publication/i,
      /cannot publish without [^.\n]*approval/i,
    ];

    for (const path of policyPaths) {
      const source = readFileSync(join(root, path), "utf8");
      for (const pattern of blockingApprovalPatterns) {
        expect(source, `${path} contains ${pattern}`).not.toMatch(pattern);
      }
    }

    for (const path of [
      "README.md",
      "AGENTS.md",
      ".agents/skills/localize-llm-course/SKILL.md",
      "SKILLS.md",
      "curriculum/README.md",
      "curriculum/course-plan.md",
    ]) {
      expect(readFileSync(join(root, path), "utf8")).toMatch(
        /user review(?:s)?[\s\S]{0,80}(?:after delivery|follows delivery)/i,
      );
    }
  });
it("requires learner-facing equations to use rendered math instead of code styling", () => {
    const agents = readFileSync(resolve(repositoryRoot(), "AGENTS.md"), "utf8");
    const playbook = readFileSync(
      resolve(repositoryRoot(), "SKILLS.md"),
      "utf8",
    );

    expect(agents).toContain(
      "Every learner-facing mathematical expression or equation must use the site",
    );
    expect(agents).toContain("use `$...$` for inline notation and `$$...$$`");
    expect(agents).toContain(
      "components must emit equivalent server-rendered math",
    );
    expect(agents).toContain(
      "Do not present mathematics as ordinary text or a code span.",
    );
    expect(playbook).toContain("Route every learner-facing mathematical");
    expect(playbook).toContain(
      "inline notation in `$...$` and display notation in `$$...$$`",
    );
    expect(playbook).toContain(
      "Source tests must reject math-shaped code spans",
    );
  });
it("rejects plan-body, ledger, and implemented-prefix drift", () => {
    const root = repositoryRoot();
    const planPath = join(root, "curriculum/course-plan.md");
    const statePath = join(root, "BUILD_STATE.yaml");
    const planSource = readFileSync(planPath, "utf8");
    const stateSource = readFileSync(statePath, "utf8");
    const metadata = validateCoursePlanText(planSource, planPath);

    expect(() =>
      validateLedgerText(stateSource, metadata, statePath),
    ).not.toThrow();

    const missingIntroductionBuild = replaceOnce(
      stateSource,
      "  - build_id: introduce-ch00-llm-map",
      "  - build_id: missing-ch00-llm-map",
    );
    expect(() =>
      validateLedgerText(missingIntroductionBuild, metadata, statePath),
    ).toThrow(/missing build introduce-ch00-llm-map/);

    const missingStandaloneBuild = replaceOnce(
      stateSource,
      "  - build_id: activate-ch00-russian-localization",
      "  - build_id: missing-ch00-russian-localization",
    );
    expect(() =>
      validateLedgerText(missingStandaloneBuild, metadata, statePath),
    ).toThrow(/missing build activate-ch00-russian-localization/);

    const standaloneBuildStart = stateSource.indexOf(
      "  - build_id: activate-ch00-russian-localization",
    );
    expect(standaloneBuildStart).toBeGreaterThan(-1);
    const wrongStandaloneStep =
      stateSource.slice(0, standaloneBuildStart) +
      replaceOnce(
        stateSource.slice(standaloneBuildStart),
        "      - id: activate-ch00-russian-localization",
        "      - id: wrong-ch00-russian-localization",
      );
    expect(() =>
      validateLedgerText(wrongStandaloneStep, metadata, statePath),
    ).toThrow(/must own exactly activate-ch00-russian-localization/);

    const replacementBuildStart = stateSource.indexOf(
      "  - build_id: revise-ch00-orientation",
    );
    expect(replacementBuildStart).toBeGreaterThan(-1);
    const mutateReplacementBuild = (before: string, after: string) =>
      stateSource.slice(0, replacementBuildStart) +
      replaceOnce(stateSource.slice(replacementBuildStart), before, after);

    const missingReplacementBuild = mutateReplacementBuild(
      "  - build_id: revise-ch00-orientation",
      "  - build_id: missing-revise-ch00-orientation",
    );
    expect(() =>
      validateLedgerText(missingReplacementBuild, metadata, statePath),
    ).toThrow(/missing build revise-ch00-orientation/);

    const introductionDependencyDrift = mutateReplacementBuild(
      [
        "      - id: revise-ch00-orientation",
        '        objective: "Identify the major parts of a decoder-only LLM, understand how they connect, and use the course links to find the chapter that builds each part."',
        "        depends_on:",
        "          - implement-ch39-end-to-end-llm",
      ].join("\n"),
      [
        "      - id: revise-ch00-orientation",
        '        objective: "Identify the major parts of a decoder-only LLM, understand how they connect, and use the course links to find the chapter that builds each part."',
        "        depends_on:",
        "          - implement-ch38-cached-generation",
      ].join("\n"),
    );
    expect(() =>
      validateLedgerText(introductionDependencyDrift, metadata, statePath),
    ).toThrow(/must depend only on the completed capstone step/);

    const missingIntroductionOutput = mutateReplacementBuild(
      [
        "        outputs:",
        '          - "curriculum/course-plan.md"',
        '          - "curriculum/README.md"',
        '          - "curriculum/chapters/00-llm-parts.md"',
      ].join("\n"),
      [
        "        outputs:",
        '          - "curriculum/course-plan.md"',
        '          - "curriculum/README.md"',
      ].join("\n"),
    );
    expect(() =>
      validateLedgerText(missingIntroductionOutput, metadata, statePath),
    ).toThrow(/does not own curriculum\/chapters\/00-llm-parts\.md/);

    const missingIntroductionValidation = mutateReplacementBuild(
      '          - "npm --prefix site run check:parity -- --chapter 00-llm-parts"',
      '          - "npm --prefix site run check:parity -- --chapter wrong"',
    );
    expect(() =>
      validateLedgerText(missingIntroductionValidation, metadata, statePath),
    ).toThrow(/is missing validation/);

    expect(() =>
      validateImplementedContracts(metadata, [
        {
          path: "00-llm-parts.md",
          data: validateChapterContractText(
            readFileSync(
              join(root, "curriculum/chapters/00-llm-parts.md"),
              "utf8",
            ),
            {
              sourceName: "curriculum/chapters/00-llm-parts.md",
              supportedLocales: ["en", "ru"],
            },
          ).data,
        },
        { path: "01-text-units.md", data: canonicalContract().data },
      ]),
    ).not.toThrow();

    const staleAudit = replaceOnce(
      planSource,
      "The revision-2 repair replaced",
      "One defect remains; a later step replaces",
    );
    expect(() => validateCoursePlanText(staleAudit)).toThrow(
      /must describe the completed revision-2 repair/,
    );

    const highlightingPrerequisiteDrift = replaceOnce(
      planSource,
      '"add-static-rust-syntax-highlighting"',
      '"missing-rust-highlighting"',
    );
    expect(() => validateCoursePlanText(highlightingPrerequisiteDrift)).toThrow(
      /cross-cutting prerequisites/,
    );

    const missingRussianActivationSchedule = replaceOnce(
      planSource,
      '"standalone_build_id": "activate-ch00-russian-localization"',
      '"standalone_build_id": "wrong-ch00-russian-localization"',
    );
    expect(() =>
      validateCoursePlanText(missingRussianActivationSchedule),
    ).toThrow(/Chapter 0 Russian activation schedule is incomplete/);

    const blockingHumanApproval = replaceOnce(
      planSource,
      '"requires_fluent_human_approval": false',
      '"requires_fluent_human_approval": true',
    );
    expect(() => validateCoursePlanText(blockingHumanApproval)).toThrow(
      /future locale activation policy is incomplete/,
    );

    const staleHistoryPolicy = replaceOnce(
      planSource,
      '"plan_revision": 78',
      '"plan_revision": 15',
    );
    expect(() => validateCoursePlanText(staleHistoryPolicy)).toThrow(
      /plan_revision must include the LLM-evolution history policy/,
    );

    const missingHistoryCorrection = replaceOnce(
      planSource,
      '"step_id": "realign-ch08-llm-history"',
      '"step_id": "missing-ch08-history-correction"',
    );
    expect(() => validateCoursePlanText(missingHistoryCorrection)).toThrow(
      /LLM-history correction schedule is incomplete/,
    );

    const programmingHistoryRegression = replaceOnce(
      planSource,
      "official GPT-2 code",
      "FORTRAN and NumPy array history",
    );
    expect(() => validateCoursePlanText(programmingHistoryRegression)).toThrow(
      /history must follow the road to modern LLMs/,
    );

    const missingCorrectiveThreshold = replaceOnce(
      planSource,
      "Corrected content revisions of Chapters 8 and 9",
      "Only future chapters",
    );
    expect(() => validateCoursePlanText(missingCorrectiveThreshold)).toThrow(
      /shared LLM-history policy must cover corrected Chapters 8-9/,
    );

    const finalPlacement = replaceOnce(
      planSource,
      [
        "      {",
        '        "step_id": "generalize-localization-infrastructure",',
        '        "before_chapter": "02-corpus-partitions"',
        "      }",
      ].join("\n"),
      [
        "      {",
        '        "step_id": "generalize-localization-infrastructure",',
        '        "before_chapter": "02-corpus-partitions"',
        "      },",
        "      {",
        '        "step_id": "activate-locale-ar-eg",',
        '        "after_chapter": "39-end-to-end-llm"',
        "      }",
      ].join("\n"),
    );
    const finalPlacementMetadata = validateCoursePlanText(
      finalPlacement,
      "post-course locale activation plan",
    );
    const finalPlacementStepIds = deriveScheduledStepIds(
      finalPlacementMetadata,
    );
    expect(finalPlacementStepIds.indexOf("activate-locale-ar-eg")).toBe(
      finalPlacementStepIds.indexOf("implement-ch39-end-to-end-llm") + 1,
    );
    expect(finalPlacementStepIds.indexOf("activate-locale-ar-eg")).toBeLessThan(
      finalPlacementStepIds.indexOf("activate-ch00-russian-localization"),
    );

    const ambiguousPlacement = replaceOnce(
      planSource,
      [
        "      {",
        '        "step_id": "generalize-localization-infrastructure",',
        '        "before_chapter": "02-corpus-partitions"',
        "      }",
      ].join("\n"),
      [
        "      {",
        '        "step_id": "generalize-localization-infrastructure",',
        '        "before_chapter": "02-corpus-partitions",',
        '        "after_chapter": "01-text-units"',
        "      }",
      ].join("\n"),
    );
    expect(() => validateCoursePlanText(ambiguousPlacement)).toThrow(
      /exactly one of before_chapter or after_chapter/,
    );

    const dependencyDrift = replaceOnce(
      planSource,
      "- **Depends on:** `01-text-units`.",
      "- **Depends on:** `39-end-to-end-llm`.",
    );
    expect(() => validateCoursePlanText(dependencyDrift)).toThrow(
      /body dependency mismatch/,
    );

    const visualizationDrift = replaceOnce(
      planSource,
      "- **Visualization:** Not useful —",
      "- **Visualization:** Useful —",
    );
    expect(() => validateCoursePlanText(visualizationDrift)).toThrow(
      /body visualization decision mismatch/,
    );

    const missingHistoricalCheckpointObjective = replaceOnce(
      planSource,
      "- **Historical checkpoint objective:** Partition data, learn/apply BPE, train/select/evaluate, save/reload, and cache-generate with one functional bilingual decoder-only LLM in Rust.\n",
      "",
    );
    expect(() =>
      validateCoursePlanText(missingHistoricalCheckpointObjective),
    ).toThrow(/Chapter 39 must preserve its historical checkpoint objective/);

    const objectiveDrift = replaceOnce(
      stateSource,
      'objective: "Partition an original bilingual corpus into disjoint train, validation, and test documents before learning any tokenizer or model statistic."',
      'objective: "Drifted Chapter 2 objective."',
    );
    expect(() => validateLedgerText(objectiveDrift, metadata)).toThrow(
      /objective does not match/,
    );

    const tagDrift = replaceOnce(
      stateSource,
      `          - "npm --prefix site run test:e2e -- --grep '@chapter:02-corpus-partitions'"`,
      `          - "npm --prefix site run test:e2e -- --grep '@chapter:wrong'"`,
    );
    expect(() => validateLedgerText(tagDrift, metadata)).toThrow(
      /missing validation/,
    );

    const invalidatedDependencyDrift = replaceOnce(
      stateSource,
      [
        "      - id: harden-diagram-containment-full-view",
        '        objective: "Guarantee that ordinary content stays inside every bounded diagram box and expose full view for every registered desktop diagram."',
        "        depends_on:",
        "          - standardize-course-diagram-full-view",
      ].join("\n"),
      [
        "      - id: harden-diagram-containment-full-view",
        '        objective: "Guarantee that ordinary content stays inside every bounded diagram box and expose full view for every registered desktop diagram."',
        "        depends_on:",
        "          - standardize-course-diagram-design-system",
      ].join("\n"),
    );
    expect(() =>
      validateLedgerText(invalidatedDependencyDrift, metadata),
    ).toThrow(
      /harden-diagram-containment-full-view must depend only on standardize-course-diagram-full-view/,
    );
  });
it("aggregates scheduled lesson activation without rewriting implementation history", () => {
    const root = repositoryRoot();
    const planSource = readFileSync(
      join(root, "curriculum/course-plan.md"),
      "utf8",
    );
    const stateSource = readFileSync(join(root, "BUILD_STATE.yaml"), "utf8");
    const localeConfiguration = validateLocaleConfiguration({
      defaultLocale: "en",
      locales: {
        en: { languageTag: "en", nativeName: "English", direction: "ltr" },
        ru: { languageTag: "ru", nativeName: "Русский", direction: "ltr" },
        es: { languageTag: "es", nativeName: "Español", direction: "ltr" },
      },
    });
    const deferredPlanSource = replaceOnce(
      planSource,
      '    "deferred_locales": [],',
      ['    "deferred_locales": [', '      "es"', "    ],"].join("\n"),
    );
    const metadata = validateCoursePlanText(
      deferredPlanSource,
      "synthetic three-locale plan",
      localeConfiguration,
    );
    const mutateLedgerStep = (
      source: string,
      stepId: string,
      before: string,
      after: string,
    ) => {
      const marker = `      - id: ${stepId}\n`;
      const start = source.indexOf(marker);
      expect(start).toBeGreaterThan(-1);
      const next = source.indexOf("\n      - id: ", start + marker.length);
      const end = next === -1 ? source.length : next;
      return (
        source.slice(0, start) +
        replaceOnce(source.slice(start, end), before, after) +
        source.slice(end)
      );
    };

    expect(
      stateSource.slice(
        stateSource.indexOf("      - id: implement-ch08-tensor-storage\n"),
        stateSource.indexOf(
          "\n      - id: ",
          stateSource.indexOf("      - id: implement-ch08-tensor-storage\n") +
            1,
        ),
      ),
    ).not.toContain("site/src/content/chapters/ru/08-tensor-storage.mdx");
    expect(() =>
      validateLedgerText(
        stateSource,
        metadata,
        "synthetic three-locale ledger",
        localeConfiguration,
      ),
    ).not.toThrow();

    const missingActiveLocaleOutput = mutateLedgerStep(
      stateSource,
      "activate-ch08-russian-localization",
      `          - "site/src/content/chapters/ru/08-tensor-storage.mdx"\n`,
      "",
    );
    const missingActiveLocale = mutateLedgerStep(
      missingActiveLocaleOutput,
      "activate-ch08-russian-localization",
      `          - "./course run npm --prefix site run check:chapter -- --locale ru --chapter 08-tensor-storage"\n`,
      "",
    );
    expect(() =>
      validateLedgerText(
        missingActiveLocale,
        metadata,
        "missing active Chapter 8 locale ledger",
        localeConfiguration,
      ),
    ).toThrow(
      /scheduled lesson ownership for 08-tensor-storage must match chapter-active locales en, ru/,
    );

    const extraDeferredLocaleOutput = mutateLedgerStep(
      stateSource,
      "implement-ch08-tensor-storage",
      `          - "site/src/content/chapters/en/08-tensor-storage.mdx"\n`,
      [
        `          - "site/src/content/chapters/en/08-tensor-storage.mdx"`,
        `          - "site/src/content/chapters/es/08-tensor-storage.mdx"`,
        "",
      ].join("\n"),
    );
    const extraDeferredLocale = mutateLedgerStep(
      extraDeferredLocaleOutput,
      "implement-ch08-tensor-storage",
      `          - "npm --prefix site run check:chapter -- --locale en --chapter 08-tensor-storage"\n`,
      [
        `          - "npm --prefix site run check:chapter -- --locale en --chapter 08-tensor-storage"`,
        `          - "npm --prefix site run check:chapter -- --locale es --chapter 08-tensor-storage"`,
        "",
      ].join("\n"),
    );
    expect(() =>
      validateLedgerText(
        extraDeferredLocale,
        metadata,
        "extra deferred Chapter 8 locale ledger",
        localeConfiguration,
      ),
    ).toThrow(
      /must not own a locale outside the chapter-active locales en, ru/,
    );

    const missingReferenceLocaleOutput = mutateLedgerStep(
      stateSource,
      "implement-ch08-tensor-storage",
      "site/src/content/chapters/en/08-tensor-storage.mdx",
      "site/src/content/chapters/ru/08-tensor-storage.mdx",
    );
    const missingReferenceLocale = mutateLedgerStep(
      missingReferenceLocaleOutput,
      "implement-ch08-tensor-storage",
      "npm --prefix site run check:chapter -- --locale en --chapter 08-tensor-storage",
      "npm --prefix site run check:chapter -- --locale ru --chapter 08-tensor-storage",
    );
    expect(() =>
      validateLedgerText(
        missingReferenceLocale,
        metadata,
        "missing reference Chapter 8 locale ledger",
        localeConfiguration,
      ),
    ).toThrow(/implement-ch08-tensor-storage must own the reference locale en/);

    const outputCheckMismatch = mutateLedgerStep(
      stateSource,
      "activate-ch08-russian-localization",
      "./course run npm --prefix site run check:chapter -- --locale ru --chapter 08-tensor-storage",
      "./course run npm --prefix site run check:chapter -- --locale es --chapter 08-tensor-storage",
    );
    expect(() =>
      validateLedgerText(
        outputCheckMismatch,
        metadata,
        "mismatched Chapter 8 activation ledger",
        localeConfiguration,
      ),
    ).toThrow(
      /activate-ch08-russian-localization lesson outputs and per-locale checks differ/,
    );

    const uncoveredChapter = replaceOnce(
      deferredPlanSource,
      '        "through_chapter": "39-end-to-end-llm",',
      '        "through_chapter": "13-gradient-checking",',
    );
    expect(() =>
      validateCoursePlanText(
        uncoveredChapter,
        "gapped synthetic chapter-locale plan",
        localeConfiguration,
      ),
    ).toThrow(/chapter locale ranges must cover every chapter exactly once/);

    expect(() =>
      validateCoursePlanText(
        planSource,
        "unacknowledged synthetic registry expansion",
        localeConfiguration,
      ),
    ).toThrow(
      /deferred_locales must be the registered locales outside the final active range/,
    );
  });
});
