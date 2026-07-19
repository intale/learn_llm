// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  applyBpeTokenizerDiagramId,
  assertApplyBpeTokenizerDiagramLabels,
  parseApplyBpeTokenizerTrace,
  type ApplyBpeTokenizerDiagramLabels,
} from '../src/lib/apply-bpe-tokenizer-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch04-apply-bpe-tokenizer/expected.txt'),
  'utf8',
);

function contractVisualizationId(): string {
  const source = readFileSync(
    resolve(repositoryRoot, 'curriculum/chapters/04-apply-bpe-tokenizer.md'),
    'utf8',
  );
  const frontmatter = source.match(/^---\n(.*?)\n---\n/s);
  if (!frontmatter) throw new Error('Chapter 4 contract frontmatter is missing.');
  return (JSON.parse(frontmatter[1]) as { visualization: { id: string } }).visualization.id;
}

const englishLabels: ApplyBpeTokenizerDiagramLabels = {
  title: 'Ranked byte groups reverse to the exact input',
  description: 'Follow two inputs from UTF-8 bytes to wrapped IDs and back.',
  caseTitles: {
    asciiBee: 'ASCII example: bee plus a space',
    cyrillicA: 'Cyrillic example: a space plus а',
  },
  lanes: {
    input: 'Input text',
    bytes: 'UTF-8 bytes (hex)',
    initial: 'Initial byte-token IDs',
    grouped: 'Canonical ranked groups',
    document: 'Document IDs',
    decoded: 'Recovered bytes (hex)',
  },
  fields: {
    layoutVersion: 'Layout version',
    contentOffset: 'Content offset',
    tokenId: 'Token ID',
    byteExpansion: 'Stored bytes',
    appliedRank: 'Applied rank',
    byteFallback: 'One-byte fallback',
    bos: 'beginning boundary',
    eos: 'ending boundary',
  },
  values: {
    exactMatch: 'Exact byte match',
  },
  invariantsLabel: 'What both pipelines prove',
  invariants: {
    ranks: 'Frozen ranks run in ascending order.',
    offset: 'Every content ID is its training ID plus two.',
    controls: 'BOS and EOS appear only at document endpoints.',
    bytes: 'Piece bytes concatenate to the exact input.',
  },
};

const russianLabels: ApplyBpeTokenizerDiagramLabels = {
  title: 'Из групп байтов без потерь восстанавливаются исходные данные',
  description: 'Проследите кодирование двух примеров: от байтов UTF-8 до последовательности ID документа и обратно.',
  caseTitles: {
    asciiBee: 'ASCII: bee с пробелом в конце',
    cyrillicA: 'Кириллица: пробел перед «а»',
  },
  lanes: {
    input: 'Входной текст',
    bytes: 'Байты UTF-8 (hex)',
    initial: 'Начальные ID токенов содержимого (со сдвигом)',
    grouped: 'Канонические группы после слияний',
    document: 'Последовательность ID документа',
    decoded: 'Восстановленные байты (hex)',
  },
  fields: {
    layoutVersion: 'Версия схемы ID',
    contentOffset: 'Смещение ID токенов содержимого',
    tokenId: 'ID токена',
    byteExpansion: 'Сохранённые байты',
    appliedRank: 'Применённый ранг',
    byteFallback: 'Однобайтовый резервный токен',
    bos: 'начальная граница',
    eos: 'конечная граница',
  },
  values: {
    exactMatch: 'Байты совпадают с исходными',
  },
  invariantsLabel: 'Что подтверждают оба примера',
  invariants: {
    ranks: 'Слияния применяются по возрастанию ранга.',
    offset: 'Каждый ID содержимого на два больше соответствующего ID из пространства обучения.',
    controls: 'BOS и EOS встречаются только по краям документа.',
    bytes: 'Последовательное объединение байтов токенов восстанавливает вход.',
  },
};

function mutate(before: string, after: string): string {
  expect(fixture).toContain(before);
  return fixture.replace(before, after);
}

function stringLeafPaths(value: object): string[][] {
  const leaves: string[][] = [];
  function visit(current: unknown, path: string[]) {
    if (typeof current === 'string') {
      leaves.push(path);
    } else if (typeof current === 'object' && current !== null) {
      for (const [key, child] of Object.entries(current)) visit(child, [...path, key]);
    }
  }
  visit(value, []);
  return leaves;
}

function blankLabelAt(
  labels: ApplyBpeTokenizerDiagramLabels,
  path: readonly string[],
): ApplyBpeTokenizerDiagramLabels {
  const copy = structuredClone(labels) as unknown as Record<string, unknown>;
  let cursor = copy;
  for (const key of path.slice(0, -1)) cursor = cursor[key] as Record<string, unknown>;
  cursor[path.at(-1) ?? ''] = '  ';
  return copy as unknown as ApplyBpeTokenizerDiagramLabels;
}

describe('apply-BPE-tokenizer trace parser', () => {
  it('matches the contract and exact Rust-authored pipelines', () => {
    expect(applyBpeTokenizerDiagramId).toBe('apply-bpe-tokenizer');
    expect(applyBpeTokenizerDiagramId).toBe(contractVisualizationId());
    const trace = parseApplyBpeTokenizerTrace(fixture);
    expect(trace.layout).toEqual({
      version: 1,
      bos: 0,
      eos: 1,
      contentOffset: 2,
      byteCount: 256,
      mergeCount: 8,
      vocabularySize: 266,
    });
    expect(trace.rules).toHaveLength(8);
    expect(trace.rules[0]).toEqual({
      rank: 0,
      trainingLeft: 32,
      trainingRight: 208,
      trainingToken: 256,
      contentLeft: 34,
      contentRight: 210,
      contentToken: 258,
      bytesHex: ['20', 'd0'],
    });
    expect(trace.rules[7].contentToken).toBe(265);
    expect(trace.cases).toEqual([
      {
        id: 'ascii-bee',
        inputBytesHex: ['62', '65', '65', '20'],
        inputText: 'bee ',
        initialTokens: [100, 103, 103, 34],
        appliedRanks: [7],
        contentTokens: [100, 103, 265],
        documentTokens: [0, 100, 103, 265, 1],
        pieces: [
          { index: 0, token: 100, bytesHex: ['62'], mergeRank: null },
          { index: 1, token: 103, bytesHex: ['65'], mergeRank: null },
          { index: 2, token: 265, bytesHex: ['65', '20'], mergeRank: 7 },
        ],
        decodedBytesHex: ['62', '65', '65', '20'],
      },
      {
        id: 'cyrillic-a',
        inputBytesHex: ['20', 'd0', 'b0'],
        inputText: ' а',
        initialTokens: [34, 210, 178],
        appliedRanks: [0],
        contentTokens: [258, 178],
        documentTokens: [0, 258, 178, 1],
        pieces: [
          { index: 0, token: 258, bytesHex: ['20', 'd0'], mergeRank: 0 },
          { index: 1, token: 178, bytesHex: ['b0'], mergeRank: null },
        ],
        decodedBytesHex: ['20', 'd0', 'b0'],
      },
    ]);
  });

  it('rejects missing, duplicated, empty, and reversed markers', () => {
    expect(() =>
      parseApplyBpeTokenizerTrace(fixture.replace('TRACE apply-bpe-tokenizer-v1 BEGIN\n', '')),
    ).toThrow(/exactly one BEGIN/);
    expect(() =>
      parseApplyBpeTokenizerTrace(`${fixture}TRACE apply-bpe-tokenizer-v1 END\n`),
    ).toThrow(/exactly one BEGIN/);
    expect(() =>
      parseApplyBpeTokenizerTrace(
        'TRACE apply-bpe-tokenizer-v1 BEGIN\nTRACE apply-bpe-tokenizer-v1 END\n',
      ),
    ).toThrow(/empty or reversed/);
    expect(() =>
      parseApplyBpeTokenizerTrace(
        'TRACE apply-bpe-tokenizer-v1 END\nTRACE apply-bpe-tokenizer-v1 BEGIN\n',
      ),
    ).toThrow(/empty or reversed/);
  });

  it('rejects layout, rank, mapping, operand, pair, and byte-expansion drift', () => {
    expect(() =>
      parseApplyBpeTokenizerTrace(mutate('LAYOUT version=1', 'LAYOUT version=2')),
    ).toThrow(/layout version 1/);
    expect(() =>
      parseApplyBpeTokenizerTrace(mutate('RULE rank=1', 'RULE rank=2')),
    ).toThrow(/expected RULE rank=1|\+2 ID mapping/);
    expect(() =>
      parseApplyBpeTokenizerTrace(
        mutate('content_pair=34,210 content_token=258', 'content_pair=35,210 content_token=258'),
      ),
    ).toThrow(/\+2 ID mapping/);
    expect(() =>
      parseApplyBpeTokenizerTrace(
        mutate(
          'training_pair=32,208 training_token=256 content_pair=34,210',
          'training_pair=256,208 training_token=256 content_pair=258,210',
        ),
      ),
    ).toThrow(/future operand/);
    const duplicate = fixture
      .replace('training_pair=208,176', 'training_pair=32,208')
      .replace('content_pair=210,178', 'content_pair=34,210')
      .replace('bytes_hex=d0,b0', 'bytes_hex=20,d0');
    expect(() => parseApplyBpeTokenizerTrace(duplicate)).toThrow(/repeats pair/);
    expect(() =>
      parseApplyBpeTokenizerTrace(mutate('bytes_hex=20,d0', 'bytes_hex=20,d1')),
    ).toThrow(/inconsistent bytes/);
  });

  it('rejects initial-ID, applied-rank, content, and wrapper drift', () => {
    expect(() =>
      parseApplyBpeTokenizerTrace(
        mutate('INITIAL case=ascii-bee tokens=100,103,103,34', 'INITIAL case=ascii-bee tokens=98,103,103,34'),
      ),
    ).toThrow(/does not map bytes through \+2/);
    expect(() =>
      parseApplyBpeTokenizerTrace(mutate('APPLIED case=ascii-bee ranks=7', 'APPLIED case=ascii-bee ranks=7,6')),
    ).toThrow(/not unique and ascending/);
    expect(() =>
      parseApplyBpeTokenizerTrace(mutate('APPLIED case=ascii-bee ranks=7', 'APPLIED case=ascii-bee ranks=6')),
    ).toThrow(/PIECE merge rank 7 is absent from APPLIED/);
    expect(() =>
      parseApplyBpeTokenizerTrace(
        mutate('CONTENT case=ascii-bee tokens=100,103,265', 'CONTENT case=ascii-bee tokens=0,103,265'),
      ),
    ).toThrow(/control or unknown/);
    expect(() =>
      parseApplyBpeTokenizerTrace(
        mutate('DOCUMENT case=ascii-bee tokens=0,100,103,265,1', 'DOCUMENT case=ascii-bee tokens=0,100,1,103,265'),
      ),
    ).toThrow(/endpoint-only wrapper/);
  });

  it('rejects missing, reordered, unknown, or byte-inconsistent pieces and decode', () => {
    expect(() =>
      parseApplyBpeTokenizerTrace(
        fixture.replace('PIECE case=ascii-bee index=1 token=103 bytes_hex=65\n', ''),
      ),
    ).toThrow(/one PIECE per content token/);
    expect(() =>
      parseApplyBpeTokenizerTrace(
        mutate('PIECE case=ascii-bee index=1 token=103', 'PIECE case=ascii-bee index=2 token=103'),
      ),
    ).toThrow(/PIECE 1 is inconsistent/);
    expect(() =>
      parseApplyBpeTokenizerTrace(
        mutate('PIECE case=ascii-bee index=0 token=100', 'PIECE case=ascii-bee index=0 token=999'),
      ),
    ).toThrow(/PIECE 0 is inconsistent/);
    expect(() =>
      parseApplyBpeTokenizerTrace(
        mutate('PIECE case=ascii-bee index=2 token=265 bytes_hex=65,20', 'PIECE case=ascii-bee index=2 token=265 bytes_hex=65,21'),
      ),
    ).toThrow(/PIECE 2 is inconsistent/);
    expect(() =>
      parseApplyBpeTokenizerTrace(
        mutate('DECODED case=cyrillic-a bytes_hex=20,d0,b0', 'DECODED case=cyrillic-a bytes_hex=20,d0,b1'),
      ),
    ).toThrow(/does not recover its exact input bytes/);
  });

  it('requires both exact cases once and rejects unknown trace syntax', () => {
    const secondCase = fixture.slice(fixture.indexOf('CASE id=cyrillic-a'));
    const duplicate = fixture.replace(
      'TRACE apply-bpe-tokenizer-v1 END',
      `${secondCase.slice(0, secondCase.indexOf('TRACE apply-bpe-tokenizer-v1 END'))}TRACE apply-bpe-tokenizer-v1 END`,
    );
    expect(() => parseApplyBpeTokenizerTrace(duplicate)).toThrow(/repeats case cyrillic-a/);
    expect(() =>
      parseApplyBpeTokenizerTrace(mutate('CASE id=ascii-bee', 'UNKNOWN id=ascii-bee')),
    ).toThrow(/expected a CASE/);
  });

  it('validates every locale-owned label leaf', () => {
    expect(() => assertApplyBpeTokenizerDiagramLabels(englishLabels)).not.toThrow();
    expect(() => assertApplyBpeTokenizerDiagramLabels(russianLabels)).not.toThrow();
    const paths = stringLeafPaths(englishLabels);
    expect(paths).toHaveLength(24);
    for (const path of paths) {
      expect(() =>
        assertApplyBpeTokenizerDiagramLabels(blankLabelAt(englishLabels, path)),
      ).toThrow(path.join('.'));
    }
  });
});

describe('apply-BPE-tokenizer diagram component contract', () => {
  it('stays semantic, static, responsive, keyboard-readable, and locale-neutral', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/chapters/ApplyBpeTokenizerDiagram.astro'),
      'utf8',
    );
    expect(source).toContain('<figure');
    expect(source).toContain('<figcaption>');
    expect(source).toContain('<ol class="example-list">');
    expect(source).toContain('<section class="example"');
    expect(source).toContain('<ol class="pipeline">');
    expect(source).toContain('<ol class="piece-list">');
    expect(source).toContain('data-case={sample.id}');
    expect(source).toContain('data-lane="grouped"');
    expect(source).toContain('data-control={isBos');
    expect(source).toContain('data-round-trip="exact"');
    expect(source).toContain('tabindex="0"');
    expect(source).toContain('aria-labelledby={titleId}');
    expect(source).toContain('aria-describedby={descriptionId}');
    expect(source).toContain('dir="ltr"');
    expect(source).toContain('labels.fields.layoutVersion');
    expect(source).toContain('labels.fields.contentOffset');
    expect(source).toContain('<bdi dir="ltr">{piece.mergeRank}</bdi>');
    expect(source).toContain('overflow-x: auto');
    expect(source).toContain(':focus-visible');
    expect(source).toContain('@media (max-width: 48rem)');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(source).toContain('parseApplyBpeTokenizerTrace');
    expect(source).toContain("piece.mergeRank === null ? '◇' : '◆'");
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('<script');
    expect(source).not.toContain('client:');
    for (const localized of [
      englishLabels.title,
      englishLabels.lanes.grouped,
      russianLabels.title,
      russianLabels.lanes.grouped,
    ]) {
      expect(source).not.toContain(localized);
    }
  });
});
