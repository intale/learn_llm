// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { createHash } from "node:crypto";
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertCorpusPartitionsDiagramLabels,
  corpusPartitionRoles,
  corpusPartitionsDiagramId,
  createCorpusPartitionsDiagramData,
  fnv1a64,
  parseCorpusDocumentMetadata,
  type CorpusPartitionsDiagramLabels,
} from "../src/lib/corpus-partitions-diagram";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const sharedStyles = readFileSync(
  resolve(process.cwd(), "src/styles/diagram.module.css"),
  "utf8",
);
const corpusSource = readFileSync(
  resolve(repositoryRoot, "rust/data/tiny-bilingual-corpus.json"),
  "utf8",
);
const manifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, "rust/data/splits.json"), "utf8"),
) as Record<string, unknown> & {
  train: string[];
  validation: string[];
  test: string[];
};
const lessonSources = {
  en: readFileSync(
    resolve(process.cwd(), "src/content/chapters/en/02-corpus-partitions.mdx"),
    "utf8",
  ),
  ru: readFileSync(
    resolve(process.cwd(), "src/content/chapters/ru/02-corpus-partitions.mdx"),
    "utf8",
  ),
};
const contractSource = readFileSync(
  resolve(repositoryRoot, "curriculum/chapters/02-corpus-partitions.md"),
  "utf8",
);
const rustCorpusSource = readFileSync(
  resolve(repositoryRoot, "rust/crates/llm-from-scratch/src/corpus.rs"),
  "utf8",
);

function contractMetadata() {
  const frontmatter = contractSource.match(/^---\n(.*?)\n---\n/s);
  if (!frontmatter)
    throw new Error("Chapter 2 contract frontmatter is missing.");
  return JSON.parse(frontmatter[1]) as {
    content_revision: number;
    translation_notes: string[];
    visualization: { id: string };
  };
}

function contractVisualizationId(): string {
  return contractMetadata().visualization.id;
}

const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const englishLabels: CorpusPartitionsDiagramLabels = {
  title: "One corpus, three disjoint document sets",
  description: "Inspect every frozen whole-document assignment.",
  partitionListLabel: "Corpus partitions",
  roles: {
    train: {
      title: "Training",
      purpose: "Used to learn",
      documentListLabel: "Training documents",
    },
    validation: {
      title: "Validation",
      purpose: "Used to choose",
      documentListLabel: "Validation documents",
    },
    test: {
      title: "Test",
      purpose: "Reserved for post-selection evidence",
      documentListLabel: "Test documents",
    },
  },
  fields: {
    documents: "Documents",
    wholeDocument: "Whole document",
    documentId: "Document ID",
    language: "Language",
    provenanceGroup: "Provenance group",
  },
  summary: {
    assignedDocuments: "Assigned documents",
    repeatedIds: "Repeated IDs",
  },
  invariantsLabel: "Verified partition invariants",
  invariants: {
    complete: "Complete: every corpus ID appears",
    disjoint: "Disjoint: no corpus ID repeats",
    provenance: "Paired provenance stays in one partition",
  },
};

const russianLabels: CorpusPartitionsDiagramLabels = {
  title: "Один корпус, три непересекающиеся выборки",
  description:
    "Проверьте зафиксированное распределение целых документов по выборкам.",
  partitionListLabel: "Выборки корпуса",
  roles: {
    train: {
      title: "Обучающая",
      purpose: "Для обучения",
      documentListLabel: "Обучающие документы",
    },
    validation: {
      title: "Валидационная",
      purpose: "Для выбора настроек",
      documentListLabel: "Валидационные документы",
    },
    test: {
      title: "Тестовая",
      purpose: "Для оценки после завершения выбора",
      documentListLabel: "Тестовые документы",
    },
  },
  fields: {
    documents: "Документов",
    wholeDocument: "Целый документ",
    documentId: "ID документа",
    language: "Язык",
    provenanceGroup: "Группа происхождения",
  },
  summary: {
    assignedDocuments: "Распределено документов",
    repeatedIds: "Повторяющихся ID",
  },
  invariantsLabel: "Проверенные свойства разбиения",
  invariants: {
    complete: "Полнота: присутствует каждый ID корпуса",
    disjoint: "Непересечение: ID не повторяются",
    provenance:
      "Документы из одной группы происхождения остаются в одной выборке",
  },
};

function stringLeafPaths(value: object): string[][] {
  const leaves: string[][] = [];
  function visit(current: unknown, path: string[]) {
    if (typeof current === "string") {
      leaves.push(path);
      return;
    }
    if (typeof current === "object" && current !== null) {
      for (const [key, child] of Object.entries(current)) {
        visit(child, [...path, key]);
      }
    }
  }
  visit(value, []);
  return leaves;
}

function blankLabelAt(
  labels: CorpusPartitionsDiagramLabels,
  path: readonly string[],
): CorpusPartitionsDiagramLabels {
  const copy = structuredClone(labels) as unknown as Record<string, unknown>;
  let cursor = copy;
  for (const key of path.slice(0, -1)) {
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[path.at(-1) ?? ""] = "   ";
  return copy as unknown as CorpusPartitionsDiagramLabels;
}

describe("corpus-partitions diagram data", () => {
  it("delegates JSON decoding while keeping document and split invariants explicit", () => {
    const contract = contractMetadata();
    expect(contract.content_revision).toBe(10);
    expect(lessonSources.en).toContain("\"content_revision\": 10");
    expect(lessonSources.ru).toContain("\"content_revision\": 10");
    expect(normalizeWhitespace(contractSource)).toContain(
      normalizeWhitespace(
        "JSON text arrives as `&str`, which already guarantees valid UTF-8. `serde_json::from_str` handles JSON syntax and typed fields.",
      ),
    );
    expect(normalizeWhitespace(lessonSources.en)).toContain(
      normalizeWhitespace(
        "Its input is JSON text as `&str`, so valid UTF-8 is already guaranteed at that boundary.",
      ),
    );
    expect(normalizeWhitespace(lessonSources.en)).toContain(
      normalizeWhitespace(
        "`SplitManifest::from_json` decodes its fields",
      ),
    );
    expect(normalizeWhitespace(lessonSources.en)).toContain(
      normalizeWhitespace(
        "`Corpus::from_json` separately validates document metadata and nonempty text, rejects duplicate document IDs and exact duplicate decoded texts, and preserves the array's source order:",
      ),
    );
    expect(normalizeWhitespace(lessonSources.en)).toContain(
      "successful JSON decoding alone says nothing about whether its assignments are a valid split of this corpus.",
    );
    expect(normalizeWhitespace(lessonSources.ru)).toContain(
      normalizeWhitespace(
        "Его вход — текст JSON в виде `&str`, поэтому на этой границе уже гарантирован корректный UTF-8.",
      ),
    );
    expect(normalizeWhitespace(lessonSources.ru)).toContain(
      normalizeWhitespace(
        "`SplitManifest::from_json` декодирует поля",
      ),
    );
    expect(normalizeWhitespace(lessonSources.ru)).toContain(
      normalizeWhitespace(
        "Отдельно `Corpus::from_json` проверяет метаданные документов и непустой текст, отклоняет повторяющиеся ID и точные совпадения декодированных текстов, а также сохраняет порядок исходного массива:",
      ),
    );
    expect(normalizeWhitespace(lessonSources.ru)).toContain(
      "успешное декодирование JSON само по себе ничего не говорит о корректности разбиения этого корпуса.",
    );
    expect(contract.translation_notes).toContain(
      "Preserve the distinction between serde_json format decoding, document validation, and split validation; Rust's &str boundary already guarantees valid UTF-8.",
    );
    expect(createHash("sha256").update(lessonSources.en).digest("hex")).toBe(
      "70e7433388b3be76ad388d908e62964c1f93d5da6b4ade9e7dbc3b1edcbcc91a",
    );
    expect(createHash("sha256").update(lessonSources.ru).digest("hex")).toBe(
      "eb46d2ea88e1f6568ae24f6c13c23c1ae137e89a0af045e062dc7f1c88c7251a",
    );
    expect(rustCorpusSource).toContain("use serde::Deserialize;");
    expect(rustCorpusSource).toContain("struct DocumentJson");
    expect(rustCorpusSource).toContain("struct SplitManifestJson");
    expect(rustCorpusSource).toContain("#[serde(deny_unknown_fields)]");
    expect(rustCorpusSource).toContain("pub fn from_json(source: &str)");
    expect(rustCorpusSource).toContain("serde_json::from_str(source)");
    expect(rustCorpusSource).toContain("fnv1a64(source.as_bytes())");
    expect(rustCorpusSource).not.toContain("serde_json::from_slice");
    expect(rustCorpusSource).toContain("invalid corpus JSON:");
    expect(rustCorpusSource).toContain("invalid split manifest JSON:");
    expect(rustCorpusSource).not.toContain("Corpus::from_utf8");
    expect(rustCorpusSource).not.toContain("%% document");
    expect(rustCorpusSource).not.toContain("struct ManifestParser");
  });

  it("explains the fixture counts and diagram evidence in every locale", () => {
    expect(lessonSources.en).toContain("\"content_revision\": 10");
    expect(lessonSources.en.replace(/\s+/g, " ")).toContain(
      "eight documents in four groups. Validation contains the night-station pair: two documents in one group. Test contains the winter-window pair: two documents in one group.",
    );
    expect(lessonSources.ru).toContain("\"content_revision\": 10");
    expect(lessonSources.ru.replace(/\s+/g, " ")).toContain(
      "восемь документов в четырёх группах. Валидационная выборка содержит пару night-station — два документа одной группы. Тестовая содержит пару winter-window — также два документа одной группы.",
    );
    expect(lessonSources.ru).not.toContain("соотношение `8 / 2 / 2`");
    expect(lessonSources.en.replace(/\s+/g, " ")).toContain(
      "The figure lists every exact ID, language, and group. Its three lists are peer sets, not stages through which a document moves. Read each card as one whole document and read the cards within each role in corpus source order:",
    );
    expect(lessonSources.ru.replace(/\s+/g, " ")).toContain(
      "На схеме приведены точные ID, языки и группы всех документов. Три списка — равноправные множества, а не этапы перемещения документа. Каждая карточка представляет целый документ; карточки внутри выборки идут в порядке корпуса:",
    );
    expect(lessonSources.en).not.toContain("without relying on color");
    expect(lessonSources.ru).not.toContain("без опоры на цвет");
    expect(lessonSources.en.replace(/\s+/g, " ")).toContain(
      "The existing Rust contrast shows one way a holdout label can conceal shared source context. It takes the single sentence `north star glows softly` and calls `overlapping_word_windows(\"north star glows softly\", 3)`. The two resulting windows are `[\"north\", \"star\", \"glows\"]` and `[\"star\", \"glows\", \"softly\"]`. `shared_words` reports `[\"star\", \"glows\"]` in the first window's order:",
    );
    expect(lessonSources.en.replace(/\s+/g, " ")).toContain(
      "Assign whole source documents and known provenance groups first. Fit tokenizer statistics only on training documents, freeze the learned rules, and apply those rules separately to text in each role. Any later token windows must remain inside an original document and retain its role.",
    );
    expect(lessonSources.ru.replace(/\s+/g, " ")).toContain(
      "`overlapping_word_windows(\"north star glows softly\", 3)` создаёт два окна: `[\"north\", \"star\", \"glows\"]` и `[\"star\", \"glows\", \"softly\"]`.",
    );
    expect(lessonSources.ru.replace(/\s+/g, " ")).toContain(
      "Сначала распределяйте целые исходные документы и известные группы происхождения. Собирайте статистику для обучения токенизатора только по обучающим документам, зафиксируйте полученные правила и применяйте их отдельно к текстам каждой выборки. Любые последующие токеновые окна должны оставаться внутри исходного документа и сохранять его роль.",
    );
    expect(lessonSources.en).not.toContain("learning window");
    expect(lessonSources.ru).not.toContain("обучающие окна");
    expect(lessonSources.en).not.toContain(
      "what is the unit represented by each ID?",
    );
    expect(lessonSources.ru).not.toContain(
      "какую исходную единицу обозначает каждый ID?",
    );
  });

  it("scopes the test role to one execution without claiming repository-global sealing", () => {
    const english = normalizeWhitespace(lessonSources.en);
    const russian = normalizeWhitespace(lessonSources.ru);
    expect(english).toContain(
      "Chapter 34 later demonstrates that order with a local evaluator inside one execution. Its gate cannot enforce unique access across all callers or later executions, and its caller-supplied provenance labels do not independently establish data history.",
    );
    expect(english).toContain(
      "Rerunning a known test result checks for regression; it does not supply a fresh, independent estimate of generalization each time.",
    );
    expect(russian).toContain(
      "В главе 34 этот порядок показан локальным механизмом оценки внутри одного выполнения. Такой механизм не обеспечивает однократный доступ к тестовым данным за пределами одного выполнения: другие программы и будущие запуски могут прочитать их снова. Переданные вызывающей стороной метки происхождения сами по себе не дают независимого подтверждения истории данных.",
    );
    expect(russian).toContain(
      "Более позднее сравнение специально подобрано, а его известный результат служит проверке регрессий, не оценке обобщения на нетронутых данных.",
    );
    expect(russian).toContain(
      "Повторный запуск с известным тестовым результатом проверяет отсутствие регрессий, а не даёт каждый раз новую независимую оценку способности модели обобщать.",
    );
    for (const source of [english, normalizeWhitespace(contractSource)]) {
      expect(source).not.toMatch(
        /test remains sealed for the final report|test partition, by contrast, is reserved for final evidence|Test neither fits nor selects and is used only for the final loss report|Used once for final evidence/i,
      );
    }
    for (const source of [russian, normalizeWhitespace(contractSource)]) {
      expect(source).not.toMatch(
        /Один раз для итоговой оценки|тестовая выборка остаётся закрытой до итоговой оценки|используется только для итогового отчёта|при каждом запуске оцениваются ранее не использованные данные|сохранённый пример никогда прежде не открывали/i,
      );
    }
  });

  it("matches the contract and exact frozen Rust fixture", () => {
    expect(corpusPartitionsDiagramId).toBe("corpus-partitions");
    expect(corpusPartitionsDiagramId).toBe(contractVisualizationId());
    expect(fnv1a64(corpusSource)).toBe("fnv1a64:723b071980ae8a22");

    const corpusDocuments = parseCorpusDocumentMetadata(corpusSource);
    const partitions = createCorpusPartitionsDiagramData(
      manifest,
      corpusSource,
    );
    expect(partitions.map(({ role }) => role)).toEqual(corpusPartitionRoles);
    expect(partitions.map(({ documents }) => documents.length)).toEqual([
      8, 2, 2,
    ]);
    expect(
      partitions.map(({ documents }) => documents.map(({ id }) => id)),
    ).toEqual([manifest.train, manifest.validation, manifest.test]);

    const flattened = partitions.flatMap(({ documents }) =>
      documents.map(({ id }) => id),
    );
    const corpusIds = corpusDocuments.map(({ id }) => id);
    expect(new Set(flattened).size).toBe(flattened.length);
    expect(new Set(flattened)).toEqual(new Set(corpusIds));
    expect(flattened).toHaveLength(corpusIds.length);

    const rolesById = new Map(
      partitions.flatMap(({ role, documents }) =>
        documents.map(({ id }) => [id, role] as const),
      ),
    );
    for (const document of corpusDocuments) {
      const pair = corpusDocuments.filter(
        ({ provenanceGroup }) => provenanceGroup === document.provenanceGroup,
      );
      expect(pair).toHaveLength(2);
      expect(new Set(pair.map(({ id }) => rolesById.get(id))).size).toBe(1);
    }
  });

  it("reads an ordinary JSON document array and rejects invalid document shapes", () => {
    const decoded = JSON.parse(corpusSource) as Array<Record<string, unknown>>;
    expect(decoded).toHaveLength(12);
    expect(decoded[0]).toEqual({
      id: "en-river-dawn",
      language: "en",
      provenance_group: "pair-river-dawn",
      text: "At dawn, Mira carries a blue notebook to the river. She writes down the wind direction, counts three boats, and circles the quietest bend. Before leaving, she checks every number once more.",
    });
    expect(() => parseCorpusDocumentMetadata("{}")).toThrow(/array/);
    expect(() => parseCorpusDocumentMetadata("not JSON")).toThrow(/valid JSON/);
    expect(() =>
      parseCorpusDocumentMetadata(
        JSON.stringify([{ ...decoded[0], extra: true }]),
      ),
    ).toThrow(/unknown fields/);
    const missingText = { ...decoded[0] };
    delete missingText.text;
    expect(() =>
      parseCorpusDocumentMetadata(JSON.stringify([missingText])),
    ).toThrow(/missing: text/);
    expect(() =>
      parseCorpusDocumentMetadata(JSON.stringify([decoded[0], decoded[0]])),
    ).toThrow(/Duplicate corpus document ID/);
  });

  it("rejects duplicate, omitted, unknown, empty, reordered, and unknown-role mutations", () => {
    const duplicate = structuredClone(manifest);
    duplicate.test.unshift(duplicate.train[0]);
    expect(() =>
      createCorpusPartitionsDiagramData(duplicate, corpusSource),
    ).toThrow(/more than once/);

    const omitted = structuredClone(manifest);
    omitted.test.pop();
    expect(() =>
      createCorpusPartitionsDiagramData(omitted, corpusSource),
    ).toThrow(/omits corpus document/);

    const unknown = structuredClone(manifest);
    unknown.test[1] = "ghost-document";
    expect(() =>
      createCorpusPartitionsDiagramData(unknown, corpusSource),
    ).toThrow(/unknown document/);

    const empty = structuredClone(manifest);
    empty.validation = [];
    expect(() =>
      createCorpusPartitionsDiagramData(empty, corpusSource),
    ).toThrow(/nonempty array/);

    const reordered = structuredClone(manifest);
    reordered.train.reverse();
    expect(() =>
      createCorpusPartitionsDiagramData(reordered, corpusSource),
    ).toThrow(/source order/);

    const unknownRole = { ...structuredClone(manifest), development: [] };
    expect(() =>
      createCorpusPartitionsDiagramData(unknownRole, corpusSource),
    ).toThrow(/unknown role or field/);
  });

  it("validates every locale-owned label leaf", () => {
    expect(() =>
      assertCorpusPartitionsDiagramLabels(englishLabels),
    ).not.toThrow();
    expect(() =>
      assertCorpusPartitionsDiagramLabels(russianLabels),
    ).not.toThrow();

    const paths = stringLeafPaths(englishLabels);
    expect(paths.length).toBeGreaterThan(20);
    for (const path of paths) {
      expect(() =>
        assertCorpusPartitionsDiagramLabels(blankLabelAt(englishLabels, path)),
      ).toThrow(path.join("."));
    }
  });
});

describe("corpus-partitions diagram component contract", () => {
  it("keeps fixture rendering semantic, responsive, accessible, and locale-neutral", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/components/chapters/CorpusPartitionsDiagram.astro",
      ),
      "utf8",
    );

    expect(source).toContain("<figure");
    expect(source).toContain("<figcaption");
    expect(source).toContain("<section");
    expect(source).toContain("<ol");
    expect(source).toContain('tabindex="0"');
    expect(source).toContain("aria-labelledby={titleId}");
    expect(source).toContain("aria-describedby={descriptionId}");
    expect(source).toContain("data-partition={partition.role}");
    expect(source).toContain("data-document-id={document.id}");
    expect(source).toContain(
      "data-provenance-group={document.provenanceGroup}",
    );
    expect(source).toContain(
      '<code class="role-badge state-symbol" dir="ltr">',
    );
    expect(source).toContain('<dd><code dir="ltr">{document.id}</code></dd>');
    expect(source).toContain(
      "grid-template-columns: repeat(3, minmax(0, 1fr))",
    );
    expect(source).toContain("@container course-diagram (max-width: 44rem)");
    expect(source).toContain("grid-template-columns: 1fr");
    const fullViewStyles = source.slice(
      source.indexOf(".corpus-partitions-diagram:fullscreen {"),
      source.indexOf("\n</style>"),
    );
    expect(fullViewStyles).toContain(
      "grid-template-columns: repeat(2, minmax(0, 1fr));",
    );
    expect(fullViewStyles).toContain("align-content: start;");
    expect(fullViewStyles).toContain(
      "@media (min-width: 64rem) and (min-height: 42rem)",
    );
    expect(fullViewStyles).toContain(
      "grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) max-content;",
    );
    expect(fullViewStyles).toContain(
      "> :global(.diagram-full-view-actions)",
    );
    expect(fullViewStyles).toContain("grid-column: 1 / 3;");
    expect(source).not.toContain(
      "@container course-diagram (min-width: 64rem)",
    );
    expect(fullViewStyles).toContain(
      ".partition-card[data-partition='train'] {",
    );
    expect(fullViewStyles).toContain("grid-column: 1 / -1;");
    expect(fullViewStyles).toContain(
      "grid-template-columns: 8rem minmax(0, 1fr);",
    );
    expect(fullViewStyles).toContain(
      "grid-template-columns: repeat(4, minmax(0, 1fr));",
    );
    expect(fullViewStyles).toContain(
      ".partition-card:not([data-partition='train'])",
    );
    expect(fullViewStyles).not.toMatch(
      /font-size|zoom\s*:|transform\s*:\s*scale|overflow\s*:\s*(?:hidden|clip)/,
    );
    expect(sharedStyles).toContain("unicode-bidi: isolate");
    expect(source).not.toContain("letter-spacing");
    expect(sharedStyles).toContain(":focus-visible");
    expect(sharedStyles).toContain("@media (forced-colors: active)");
    expect(source).toContain("data-diagram-box");
    expect(source).not.toContain("<script");
    expect(source).not.toContain("client:");

    for (const localizedText of [
      englishLabels.title,
      englishLabels.roles.train.title,
      englishLabels.fields.wholeDocument,
      russianLabels.title,
      russianLabels.roles.validation.title,
      russianLabels.fields.wholeDocument,
    ]) {
      expect(source).not.toContain(localizedText);
    }
  });
});
