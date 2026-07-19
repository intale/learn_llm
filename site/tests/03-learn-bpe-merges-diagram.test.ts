// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertLearnBpeMergesDiagramLabels,
  learnBpeMergesDiagramId,
  parseLearnBpeMergesTrace,
  type LearnBpeMergesDiagramLabels,
} from '../src/lib/learn-bpe-merges-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch03-learn-bpe-merges/expected.txt'),
  'utf8',
);

function contractVisualizationId(): string {
  const source = readFileSync(
    resolve(repositoryRoot, 'curriculum/chapters/03-learn-bpe-merges.md'),
    'utf8',
  );
  const frontmatter = source.match(/^---\n(.*?)\n---\n/s);
  if (!frontmatter) throw new Error('Chapter 3 contract frontmatter is missing.');
  return (JSON.parse(frontmatter[1]) as { visualization: { id: string } })
    .visualization.id;
}

const englishLabels: LearnBpeMergesDiagramLabels = {
  title: 'Two deterministic BPE merge rounds',
  description: 'Follow token tapes, candidate counts, and the selected pair.',
  trainingSource: 'Training documents only',
  stagesLabel: 'Token stages',
  roundsLabel: 'Merge rounds',
  documentBoundary: 'Document boundary: pairs stop here',
  fields: {
    stage: 'Stage',
    document: 'Document',
    tokens: 'Token IDs',
    candidates: 'Adjacent-pair candidates',
    pair: 'Pair',
    count: 'Overlapping count',
    selected: 'Selected',
    rank: 'Merge rank',
    newToken: 'New token ID',
    bytesHex: 'Byte expansion (hex)',
    replacements: 'Non-overlapping replacements',
  },
  values: {
    winner: 'Selected pair',
    notWinner: 'Not selected',
  },
  invariantsLabel: 'What the trace proves',
  invariants: {
    overlap: 'Candidate counting includes overlapping positions.',
    replacement: 'Replacement scans left to right without overlap.',
    tie: 'Equal counts use the numerically smallest pair.',
    barrier: 'No pair crosses a document boundary.',
  },
};

const russianLabels: LearnBpeMergesDiagramLabels = {
  title: 'Два раунда BPE с детерминированным выбором',
  description: 'Проследите, как меняются последовательности токенов, сколько раз встречаются пары-кандидаты и какая пара выбирается.',
  trainingSource: 'Только обучающие документы',
  stagesLabel: 'Состояния последовательностей токенов',
  roundsLabel: 'Раунды слияний',
  documentBoundary: 'Граница документа: пары через неё не подсчитываются',
  fields: {
    stage: 'Состояние',
    document: 'Документ',
    tokens: 'ID токенов',
    candidates: 'Соседние пары-кандидаты',
    pair: 'Пара',
    count: 'Число перекрывающихся вхождений',
    selected: 'Выбор',
    rank: 'Ранг слияния',
    newToken: 'ID нового токена',
    bytesHex: 'Байты токена (hex)',
    replacements: 'Неперекрывающиеся замены',
  },
  values: {
    winner: 'Выбранная пара',
    notWinner: 'Не выбрана',
  },
  invariantsLabel: 'Что показывает трассировка',
  invariants: {
    overlap: 'При подсчёте учитываются перекрывающиеся позиции.',
    replacement: 'Замена идёт слева направо без перекрытий.',
    tie: 'При равной частоте выбирается численно наименьшая пара.',
    barrier: 'Пара не пересекает границу документа.',
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
  labels: LearnBpeMergesDiagramLabels,
  path: readonly string[],
): LearnBpeMergesDiagramLabels {
  const copy = structuredClone(labels) as unknown as Record<string, unknown>;
  let cursor = copy;
  for (const key of path.slice(0, -1)) {
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[path.at(-1) ?? ''] = '   ';
  return copy as unknown as LearnBpeMergesDiagramLabels;
}

function mutate(before: string, after: string): string {
  expect(fixture).toContain(before);
  return fixture.replace(before, after);
}

describe('learn-BPE-merges trace parser', () => {
  it('matches the contract and exact Rust-authored worked trace', () => {
    expect(learnBpeMergesDiagramId).toBe('learn-bpe-merges');
    expect(learnBpeMergesDiagramId).toBe(contractVisualizationId());

    const trace = parseLearnBpeMergesTrace(fixture);
    expect(trace.stages).toEqual([
      {
        index: 0,
        documents: [
          { id: 'train-aaa', tokens: [97, 97, 97] },
          { id: 'train-aba', tokens: [97, 98, 97] },
        ],
      },
      {
        index: 1,
        documents: [
          { id: 'train-aaa', tokens: [256, 97] },
          { id: 'train-aba', tokens: [97, 98, 97] },
        ],
      },
      {
        index: 2,
        documents: [
          { id: 'train-aaa', tokens: [256, 97] },
          { id: 'train-aba', tokens: [257, 97] },
        ],
      },
    ]);
    expect(trace.rounds).toEqual([
      {
        rank: 0,
        candidates: [
          { left: 97, right: 97, count: 2, winner: true },
          { left: 97, right: 98, count: 1, winner: false },
          { left: 98, right: 97, count: 1, winner: false },
        ],
        merge: {
          rank: 0,
          left: 97,
          right: 97,
          count: 2,
          replacements: 1,
          token: 256,
          bytesHex: ['61', '61'],
        },
      },
      {
        rank: 1,
        candidates: [
          { left: 97, right: 98, count: 1, winner: true },
          { left: 98, right: 97, count: 1, winner: false },
          { left: 256, right: 97, count: 1, winner: false },
        ],
        merge: {
          rank: 1,
          left: 97,
          right: 98,
          count: 1,
          replacements: 1,
          token: 257,
          bytesHex: ['61', '62'],
        },
      },
    ]);
  });

  it('rejects missing, duplicated, empty, and reversed trace markers', () => {
    expect(() =>
      parseLearnBpeMergesTrace(fixture.replace('TRACE bpe-merges-v1 BEGIN\n', '')),
    ).toThrow(/exactly one BEGIN/);
    expect(() =>
      parseLearnBpeMergesTrace(`${fixture}TRACE bpe-merges-v1 END\n`),
    ).toThrow(/exactly one BEGIN/);
    expect(() =>
      parseLearnBpeMergesTrace('TRACE bpe-merges-v1 BEGIN\nTRACE bpe-merges-v1 END\n'),
    ).toThrow(/empty or reversed/);
    expect(() =>
      parseLearnBpeMergesTrace('TRACE bpe-merges-v1 END\nTRACE bpe-merges-v1 BEGIN\n'),
    ).toThrow(/empty or reversed/);
  });

  it('rejects discontinuous stages or ranks and changing document identity', () => {
    expect(() =>
      parseLearnBpeMergesTrace(mutate('STAGE index=1', 'STAGE index=2')),
    ).toThrow(/stage index 2 is not contiguous/);
    expect(() =>
      parseLearnBpeMergesTrace(
        mutate('CANDIDATE rank=1 left=97', 'CANDIDATE rank=2 left=97'),
      ),
    ).toThrow(/candidate rank 2 is not contiguous/);
    expect(() =>
      parseLearnBpeMergesTrace(
        mutate(
          'DOCUMENT stage=1 id=train-aaa tokens=256,97',
          'DOCUMENT stage=1 id=train-aab tokens=256,97',
        ),
      ),
    ).toThrow(/document identity or order changes/);
    expect(() =>
      parseLearnBpeMergesTrace(
        mutate(
          'DOCUMENT stage=0 id=train-aba tokens=97,98,97',
          'DOCUMENT stage=0 id=train-aaa tokens=97,98,97',
        ),
      ),
    ).toThrow(/repeats document train-aaa/);
    expect(() =>
      parseLearnBpeMergesTrace(
        mutate(
          'DOCUMENT stage=1 id=train-aaa tokens=256,97',
          'DOCUMENT stage=0 id=train-aaa tokens=256,97',
        ),
      ),
    ).toThrow(/document stage differs/);
  });

  it('rejects duplicate, unsorted, unselected, multiply selected, and wrong winners', () => {
    const firstCandidate =
      'CANDIDATE rank=0 left=97 right=97 count=2 winner=yes';
    expect(() =>
      parseLearnBpeMergesTrace(mutate(firstCandidate, `${firstCandidate}\n${firstCandidate}`)),
    ).toThrow(/not unique numeric pairs in order/);

    const ordered =
      'CANDIDATE rank=0 left=97 right=97 count=2 winner=yes\nCANDIDATE rank=0 left=97 right=98 count=1 winner=no';
    const reversed =
      'CANDIDATE rank=0 left=97 right=98 count=1 winner=no\nCANDIDATE rank=0 left=97 right=97 count=2 winner=yes';
    expect(() => parseLearnBpeMergesTrace(mutate(ordered, reversed))).toThrow(
      /not unique numeric pairs in order/,
    );

    expect(() =>
      parseLearnBpeMergesTrace(mutate('count=2 winner=yes', 'count=2 winner=no')),
    ).toThrow(/exactly one winner/);
    expect(() =>
      parseLearnBpeMergesTrace(
        mutate('left=97 right=98 count=1 winner=no', 'left=97 right=98 count=1 winner=yes'),
      ),
    ).toThrow(/exactly one winner/);

    const correctTie =
      'CANDIDATE rank=1 left=97 right=98 count=1 winner=yes\nCANDIDATE rank=1 left=98 right=97 count=1 winner=no';
    const wrongTie =
      'CANDIDATE rank=1 left=97 right=98 count=1 winner=no\nCANDIDATE rank=1 left=98 right=97 count=1 winner=yes';
    expect(() => parseLearnBpeMergesTrace(mutate(correctTie, wrongTie))).toThrow(
      /violates the numeric tie rule/,
    );
  });

  it('rejects inconsistent merge provenance and unknown trace syntax', () => {
    expect(() =>
      parseLearnBpeMergesTrace(mutate('tokens=97,97,97', 'tokens=999,97,97')),
    ).toThrow(/stage 0 document train-aaa references unknown token ID 999/);
    expect(() =>
      parseLearnBpeMergesTrace(
        mutate(
          'CANDIDATE rank=1 left=256 right=97 count=1 winner=no',
          'CANDIDATE rank=1 left=300 right=97 count=1 winner=no',
        ),
      ),
    ).toThrow(/candidate references an unknown token ID/);
    expect(() =>
      parseLearnBpeMergesTrace(
        mutate(
          'MERGE rank=0 left=97 right=97 count=2',
          'MERGE rank=0 left=97 right=98 count=2',
        ),
      ),
    ).toThrow(/MERGE differs from its winner/);
    expect(() =>
      parseLearnBpeMergesTrace(mutate('count=2 replacements=1', 'count=2 replacements=3')),
    ).toThrow(/replaces more positions/);
    expect(() =>
      parseLearnBpeMergesTrace(mutate('token=256 bytes_hex=61,61', 'token=260 bytes_hex=61,61')),
    ).toThrow(/must create token 256/);
    expect(() =>
      parseLearnBpeMergesTrace(mutate('token=256 bytes_hex=61,61', 'token=256 bytes_hex=61,62')),
    ).toThrow(/byte expansion is inconsistent/);

    const knownWinner =
      'CANDIDATE rank=1 left=97 right=98 count=1 winner=yes';
    const unknownWinner =
      'CANDIDATE rank=1 left=97 right=999 count=1 winner=yes';
    const unknownMerge = mutate(knownWinner, unknownWinner).replace(
      'MERGE rank=1 left=97 right=98 count=1',
      'MERGE rank=1 left=97 right=999 count=1',
    );
    expect(() => parseLearnBpeMergesTrace(unknownMerge)).toThrow(
      /references an unknown token ID/,
    );

    expect(() =>
      parseLearnBpeMergesTrace(mutate('CANDIDATE rank=0', 'NOT-A-CANDIDATE rank=0')),
    ).toThrow(/has no candidates/);
    expect(() =>
      parseLearnBpeMergesTrace(
        fixture.replace(
          /^MERGE rank=0.*\n/m,
          '',
        ),
      ),
    ).toThrow(/missing its MERGE line/);
  });

  it('validates every locale-owned label leaf', () => {
    expect(() => assertLearnBpeMergesDiagramLabels(englishLabels)).not.toThrow();
    expect(() => assertLearnBpeMergesDiagramLabels(russianLabels)).not.toThrow();

    const paths = stringLeafPaths(englishLabels);
    expect(paths).toHaveLength(24);
    for (const path of paths) {
      expect(() =>
        assertLearnBpeMergesDiagramLabels(blankLabelAt(englishLabels, path)),
      ).toThrow(path.join('.'));
    }
  });
});

describe('learn-BPE-merges diagram component contract', () => {
  it('keeps fixture rendering semantic, responsive, accessible, and locale-neutral', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'src/components/chapters/LearnBpeMergesDiagram.astro',
      ),
      'utf8',
    );

    expect(source).toContain('<figure');
    expect(source).toContain('<figcaption');
    expect(source).toContain('<ol class="bpe-timeline">');
    expect(source).toContain('<table>');
    expect(source).toContain('<caption>{labels.fields.candidates}</caption>');
    expect(source).toContain('tabindex="0"');
    expect(source).toContain('aria-labelledby={titleId}');
    expect(source).toContain('aria-describedby={descriptionId}');
    expect(source).toContain('data-stage={stage.index}');
    expect(source).toContain('data-document={document.id}');
    expect(source).toContain('data-round={round.rank}');
    expect(source).toContain("data-winner={candidate.winner ? 'true' : 'false'}");
    expect(source).toContain('<code dir="ltr">{document.id}</code>');
    expect(source).toContain('<dd class="token-tape" dir="ltr">');
    expect(source).toContain('<code dir="ltr">{round.merge.bytesHex.join');
    expect(source).toContain('grid-template-columns: minmax(0, 1fr) minmax(17rem, 0.9fr)');
    expect(source).toContain('@media (max-width: 48rem)');
    expect(source).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(source).toContain('overflow-x: auto');
    expect(source).toContain('unicode-bidi: isolate');
    expect(source).toContain(':focus-visible');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(source).toContain('parseLearnBpeMergesTrace');
    expect(source).toContain('<span aria-hidden="true">◆</span>');
    expect(source).not.toContain('[TR]');
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('<script');
    expect(source).not.toContain('client:');

    for (const localizedText of [
      englishLabels.title,
      englishLabels.fields.candidates,
      englishLabels.invariants.barrier,
      russianLabels.title,
      russianLabels.fields.candidates,
      russianLabels.invariants.barrier,
    ]) {
      expect(source).not.toContain(localizedText);
    }
  });
});
