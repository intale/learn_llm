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
const corpusSource = readFileSync(
  resolve(repositoryRoot, 'rust/data/tiny-bilingual-corpus.txt'),
  'utf8',
);
const manifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'rust/data/splits.json'), 'utf8'),
) as Record<string, unknown> & {
  train: string[];
  validation: string[];
  test: string[];
};

function contractVisualizationId(): string {
  const source = readFileSync(
    resolve(repositoryRoot, 'curriculum/chapters/02-corpus-partitions.md'),
    'utf8',
  );
  const frontmatter = source.match(/^---\n(.*?)\n---\n/s);
  if (!frontmatter) throw new Error('Chapter 2 contract frontmatter is missing.');
  return (JSON.parse(frontmatter[1]) as { visualization: { id: string } })
    .visualization.id;
}

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
  it('matches the contract and exact frozen Rust fixture', () => {
    expect(corpusPartitionsDiagramId).toBe('corpus-partitions');
    expect(corpusPartitionsDiagramId).toBe(contractVisualizationId());
    expect(fnv1a64(corpusSource)).toBe('fnv1a64:04786e7303f1dfd6');

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
    expect(source).toContain('<code class="role-badge" dir="ltr">');
    expect(source).toContain('<dd><code dir="ltr">{document.id}</code></dd>');
    expect(source).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(source).toContain('@media (max-width: 44rem)');
    expect(source).toContain('grid-template-columns: 1fr');
    expect(source).toContain('unicode-bidi: isolate');
    expect(source).not.toContain('letter-spacing');
    expect(source).toContain(':focus-visible');
    expect(source).toContain('@media (forced-colors: active)');
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
