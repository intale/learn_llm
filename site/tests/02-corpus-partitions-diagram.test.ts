// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertCorpusPartitionsDiagramLabels,
  corpusPartitionRoles,
  corpusPartitionsDiagramId,
  createCorpusPartitionsDiagramData,
  fnv1a64,
  parseCorpusDocumentMetadata,
  type CorpusPartitionsDiagramLabels,
} from '../src/lib/corpus-partitions-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const sharedStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/diagram.module.css'),
  'utf8',
);
const corpusSource = readFileSync(
  resolve(repositoryRoot, 'rust/data/tiny-bilingual-corpus.json'),
  'utf8',
);
const manifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'rust/data/splits.json'), 'utf8'),
) as Record<string, unknown> & {
  train: string[];
  validation: string[];
  test: string[];
};
const lessonSources = {
  en: readFileSync(
    resolve(process.cwd(), 'src/content/chapters/en/02-corpus-partitions.mdx'),
    'utf8',
  ),
  ru: readFileSync(
    resolve(process.cwd(), 'src/content/chapters/ru/02-corpus-partitions.mdx'),
    'utf8',
  ),
};
const contractSource = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/02-corpus-partitions.md'),
  'utf8',
);
const rustCorpusSource = readFileSync(
  resolve(repositoryRoot, 'rust/crates/llm-from-scratch/src/corpus.rs'),
  'utf8',
);

function contractMetadata() {
  const frontmatter = contractSource.match(/^---\n(.*?)\n---\n/s);
  if (!frontmatter) throw new Error('Chapter 2 contract frontmatter is missing.');
  return JSON.parse(frontmatter[1]) as {
    content_revision: number;
    translation_notes: string[];
    visualization: { id: string };
  };
}

function contractVisualizationId(): string {
  return contractMetadata().visualization.id;
}

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const englishLabels: CorpusPartitionsDiagramLabels = {
  title: 'One corpus, three disjoint document sets',
  description: 'Inspect every frozen whole-document assignment.',
  partitionListLabel: 'Corpus partitions',
  roles: {
    train: {
      title: 'Training',
      purpose: 'Used to learn',
      documentListLabel: 'Training documents',
    },
    validation: {
      title: 'Validation',
      purpose: 'Used to choose',
      documentListLabel: 'Validation documents',
    },
    test: {
      title: 'Test',
      purpose: 'Used once for final evidence',
      documentListLabel: 'Test documents',
    },
  },
  fields: {
    documents: 'Documents',
    wholeDocument: 'Whole document',
    documentId: 'Document ID',
    language: 'Language',
    provenanceGroup: 'Provenance group',
  },
  summary: {
    assignedDocuments: 'Assigned documents',
    repeatedIds: 'Repeated IDs',
  },
  invariantsLabel: 'Verified partition invariants',
  invariants: {
    complete: 'Complete: every corpus ID appears',
    disjoint: 'Disjoint: no corpus ID repeats',
    provenance: 'Paired provenance stays in one partition',
  },
};

const russianLabels: CorpusPartitionsDiagramLabels = {
  title: 'Один корпус, три непересекающиеся выборки',
  description: 'Проверьте зафиксированное распределение целых документов по выборкам.',
  partitionListLabel: 'Выборки корпуса',
  roles: {
    train: {
      title: 'Обучающая',
      purpose: 'Для обучения',
      documentListLabel: 'Обучающие документы',
    },
    validation: {
      title: 'Валидационная',
      purpose: 'Для выбора настроек',
      documentListLabel: 'Валидационные документы',
    },
    test: {
      title: 'Тестовая',
      purpose: 'Один раз для итоговой оценки',
      documentListLabel: 'Тестовые документы',
    },
  },
  fields: {
    documents: 'Документов',
    wholeDocument: 'Целый документ',
    documentId: 'ID документа',
    language: 'Язык',
    provenanceGroup: 'Группа происхождения',
  },
  summary: {
    assignedDocuments: 'Распределено документов',
    repeatedIds: 'Повторяющихся ID',
  },
  invariantsLabel: 'Проверенные свойства разбиения',
  invariants: {
    complete: 'Полнота: присутствует каждый ID корпуса',
    disjoint: 'Непересечение: ID не повторяются',
    provenance: 'Документы из одной группы происхождения остаются в одной выборке',
  },
};

function stringLeafPaths(value: object): string[][] {
  const leaves: string[][] = [];
  function visit(current: unknown, path: string[]) {
    if (typeof current === 'string') {
      leaves.push(path);
      return;
    }
    if (typeof current === 'object' && current !== null) {
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
  cursor[path.at(-1) ?? ''] = '   ';
  return copy as unknown as CorpusPartitionsDiagramLabels;
}

describe('corpus-partitions diagram data', () => {
  it('delegates JSON decoding while keeping document and split invariants explicit', () => {
    const contract = contractMetadata();
    expect(contract.content_revision).toBe(8);
    expect(lessonSources.en).toContain('"content_revision": 8');
    expect(lessonSources.ru).toContain('"content_revision": 8');
    expect(normalizeWhitespace(contractSource)).toContain(
      normalizeWhitespace(
        '`Corpus::from_json` accepts the JSON text as `&str`, so Rust guarantees valid UTF-8 before the method begins.',
      ),
    );
    expect(normalizeWhitespace(lessonSources.en)).toContain(
      normalizeWhitespace(
        '`Corpus::from_json` accepts the JSON text as `&str`, so Rust guarantees valid UTF-8 before the method begins.',
      ),
    );
    expect(normalizeWhitespace(lessonSources.en)).toContain(
      normalizeWhitespace(
        '`SplitManifest::from_json` uses a separate private Rust record for the manifest\'s six required fields and the same `&str` boundary.',
      ),
    );
    expect(normalizeWhitespace(lessonSources.en)).toContain(
      normalizeWhitespace(
        'the text contains at least one non-whitespace character; IDs and decoded texts do not repeat; and array order is preserved',
      ),
    );
    expect(normalizeWhitespace(lessonSources.en)).toContain(
      'Those format checks do not validate whether the document assignments satisfy the train/validation/test invariants.',
    );
    expect(normalizeWhitespace(lessonSources.ru)).toContain(
      normalizeWhitespace(
        '`Corpus::from_json` принимает текст JSON как `&str`. Тип `&str` уже гарантирует корректность UTF-8.',
      ),
    );
    expect(normalizeWhitespace(lessonSources.ru)).toContain(
      normalizeWhitespace(
        '`SplitManifest::from_json` использует отдельную внутреннюю структуру данных Rust для шести обязательных полей манифеста и также принимает `&str`.',
      ),
    );
    expect(normalizeWhitespace(lessonSources.ru)).toContain(
      normalizeWhitespace(
        'текст содержит хотя бы один непробельный символ; ID и десериализованные тексты не повторяются; порядок элементов массива сохранён',
      ),
    );
    expect(normalizeWhitespace(lessonSources.ru)).toContain(
      'Эти проверки формата не определяют, соблюдены ли инварианты распределения документов между обучающей, валидационной и тестовой выборками.',
    );
    expect(contract.translation_notes.join(' ')).toContain(
      'SHA-256 dd6e3b6cd70f6299e84c56061a311ba043908cb27e3d82e3c330d32f57e5d9b3',
    );
    expect(rustCorpusSource).toContain('use serde::Deserialize;');
    expect(rustCorpusSource).toContain('struct DocumentJson');
    expect(rustCorpusSource).toContain('struct SplitManifestJson');
    expect(rustCorpusSource).toContain('#[serde(deny_unknown_fields)]');
    expect(rustCorpusSource).toContain('pub fn from_json(source: &str)');
    expect(rustCorpusSource).toContain('serde_json::from_str(source)');
    expect(rustCorpusSource).toContain('fnv1a64(source.as_bytes())');
    expect(rustCorpusSource).not.toContain('serde_json::from_slice');
    expect(rustCorpusSource).toContain('invalid corpus JSON:');
    expect(rustCorpusSource).toContain('invalid split manifest JSON:');
    expect(rustCorpusSource).not.toContain('Corpus::from_utf8');
    expect(rustCorpusSource).not.toContain('%% document');
    expect(rustCorpusSource).not.toContain('struct ManifestParser');
  });

  it('explains the fixture counts and diagram evidence in every locale', () => {
    expect(lessonSources.en).toContain('"content_revision": 8');
    expect(lessonSources.en.replace(/\s+/g, ' ')).toContain(
      '`8 / 2 / 2` (eight documents in training, two in validation, and two in test)',
    );
    expect(lessonSources.ru).toContain('"content_revision": 8');
    expect(lessonSources.ru.replace(/\s+/g, ' ')).toContain(
      '`8 / 2 / 2` (восемь документов в обучающей выборке, два — в валидационной и два — в тестовой)',
    );
    expect(lessonSources.ru).not.toContain('соотношение `8 / 2 / 2`');
    expect(lessonSources.en.replace(/\s+/g, ' ')).toContain(
      'Use each region heading to identify its partition, then use the stable ID on each card to verify that every document appears exactly once.',
    );
    expect(lessonSources.ru.replace(/\s+/g, ' ')).toContain(
      'По заголовку каждой области определите, какая это выборка, а по стабильному ID на каждой карточке проверьте, что каждый документ встречается ровно один раз.',
    );
    expect(lessonSources.en).not.toContain('without relying on color');
    expect(lessonSources.ru).not.toContain('без опоры на цвет');
    expect(lessonSources.en.replace(/\s+/g, ' ')).toContain(
      'Different IDs alone do not prove that the underlying text is different. For example, imagine cutting `north star glows softly` into two windows: call them `window-A` (`north star glows`) and `window-B` (`star glows softly`).',
    );
    expect(lessonSources.en.replace(/\s+/g, ' ')).toContain(
      'assign the original whole document first. Place it in exactly one partition, tokenize it, and keep every window created from it in that same partition.',
    );
    expect(lessonSources.ru.replace(/\s+/g, ' ')).toContain(
      'Разные ID сами по себе ещё не означают, что за ними стоит разный текст. Например, строку `north star glows softly` можно разбить на два окна и назвать их `window-A` (`north star glows`) и `window-B` (`star glows softly`).',
    );
    expect(lessonSources.ru.replace(/\s+/g, ' ')).toContain(
      'сначала целиком отнести исходный документ ровно к одной выборке, затем токенизировать его, а все созданные из него окна оставить в той же выборке.',
    );
    expect(lessonSources.en).not.toContain('learning window');
    expect(lessonSources.ru).not.toContain('обучающие окна');
    expect(lessonSources.en).not.toContain('what is the unit represented by each ID?');
    expect(lessonSources.ru).not.toContain('какую исходную единицу обозначает каждый ID?');
  });

  it('matches the contract and exact frozen Rust fixture', () => {
    expect(corpusPartitionsDiagramId).toBe('corpus-partitions');
    expect(corpusPartitionsDiagramId).toBe(contractVisualizationId());
    expect(fnv1a64(corpusSource)).toBe('fnv1a64:723b071980ae8a22');

    const corpusDocuments = parseCorpusDocumentMetadata(corpusSource);
    const partitions = createCorpusPartitionsDiagramData(manifest, corpusSource);
    expect(partitions.map(({ role }) => role)).toEqual(corpusPartitionRoles);
    expect(partitions.map(({ documents }) => documents.length)).toEqual([8, 2, 2]);
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

  it('reads an ordinary JSON document array and rejects invalid document shapes', () => {
    const decoded = JSON.parse(corpusSource) as Array<Record<string, unknown>>;
    expect(decoded).toHaveLength(12);
    expect(decoded[0]).toEqual({
      id: 'en-river-dawn',
      language: 'en',
      provenance_group: 'pair-river-dawn',
      text:
        'At dawn, Mira carries a blue notebook to the river. She writes down the wind direction, counts three boats, and circles the quietest bend. Before leaving, she checks every number once more.',
    });
    expect(() => parseCorpusDocumentMetadata('{}')).toThrow(/array/);
    expect(() => parseCorpusDocumentMetadata('not JSON')).toThrow(/valid JSON/);
    expect(() =>
      parseCorpusDocumentMetadata(JSON.stringify([{ ...decoded[0], extra: true }])),
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

  it('rejects duplicate, omitted, unknown, empty, reordered, and unknown-role mutations', () => {
    const duplicate = structuredClone(manifest);
    duplicate.test.unshift(duplicate.train[0]);
    expect(() => createCorpusPartitionsDiagramData(duplicate, corpusSource)).toThrow(
      /more than once/,
    );

    const omitted = structuredClone(manifest);
    omitted.test.pop();
    expect(() => createCorpusPartitionsDiagramData(omitted, corpusSource)).toThrow(
      /omits corpus document/,
    );

    const unknown = structuredClone(manifest);
    unknown.test[1] = 'ghost-document';
    expect(() => createCorpusPartitionsDiagramData(unknown, corpusSource)).toThrow(
      /unknown document/,
    );

    const empty = structuredClone(manifest);
    empty.validation = [];
    expect(() => createCorpusPartitionsDiagramData(empty, corpusSource)).toThrow(
      /nonempty array/,
    );

    const reordered = structuredClone(manifest);
    reordered.train.reverse();
    expect(() => createCorpusPartitionsDiagramData(reordered, corpusSource)).toThrow(
      /source order/,
    );

    const unknownRole = { ...structuredClone(manifest), development: [] };
    expect(() =>
      createCorpusPartitionsDiagramData(unknownRole, corpusSource),
    ).toThrow(/unknown role or field/);
  });

  it('validates every locale-owned label leaf', () => {
    expect(() => assertCorpusPartitionsDiagramLabels(englishLabels)).not.toThrow();
    expect(() => assertCorpusPartitionsDiagramLabels(russianLabels)).not.toThrow();

    const paths = stringLeafPaths(englishLabels);
    expect(paths.length).toBeGreaterThan(20);
    for (const path of paths) {
      expect(() =>
        assertCorpusPartitionsDiagramLabels(blankLabelAt(englishLabels, path)),
      ).toThrow(path.join('.'));
    }
  });
});

describe('corpus-partitions diagram component contract', () => {
  it('keeps fixture rendering semantic, responsive, accessible, and locale-neutral', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'src/components/chapters/CorpusPartitionsDiagram.astro',
      ),
      'utf8',
    );

    expect(source).toContain('<figure');
    expect(source).toContain('<figcaption');
    expect(source).toContain('<section');
    expect(source).toContain('<ol');
    expect(source).toContain('tabindex="0"');
    expect(source).toContain('aria-labelledby={titleId}');
    expect(source).toContain('aria-describedby={descriptionId}');
    expect(source).toContain('data-partition={partition.role}');
    expect(source).toContain('data-document-id={document.id}');
    expect(source).toContain('data-provenance-group={document.provenanceGroup}');
    expect(source).toContain('<code class="role-badge state-symbol" dir="ltr">');
    expect(source).toContain('<dd><code dir="ltr">{document.id}</code></dd>');
    expect(source).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(source).toContain('@container course-diagram (max-width: 44rem)');
    expect(source).toContain('grid-template-columns: 1fr');
    expect(sharedStyles).toContain('unicode-bidi: isolate');
    expect(source).not.toContain('letter-spacing');
    expect(sharedStyles).toContain(':focus-visible');
    expect(sharedStyles).toContain('@media (forced-colors: active)');
    expect(source).toContain('data-diagram-box');
    expect(source).not.toContain('<script');
    expect(source).not.toContain('client:');

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
