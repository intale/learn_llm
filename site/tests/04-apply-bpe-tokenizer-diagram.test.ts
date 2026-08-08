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
const sharedStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/diagram.module.css'),
  'utf8',
);
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch04-apply-bpe-tokenizer/expected.txt'),
  'utf8',
);
const bpeSource = readFileSync(
  resolve(repositoryRoot, 'rust/crates/llm-from-scratch/src/tokenizer/bpe.rs'),
  'utf8',
);
const bpeTrainerSource = readFileSync(
  resolve(repositoryRoot, 'rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs'),
  'utf8',
);
const contractSource = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/04-apply-bpe-tokenizer.md'),
  'utf8',
);
const englishChapterSource = readFileSync(
  resolve(process.cwd(), 'src/content/chapters/en/04-apply-bpe-tokenizer.mdx'),
  'utf8',
);
const russianChapterSource = readFileSync(
  resolve(process.cwd(), 'src/content/chapters/ru/04-apply-bpe-tokenizer.mdx'),
  'utf8',
);
const componentSource = readFileSync(
  resolve(process.cwd(), 'src/components/chapters/ApplyBpeTokenizerDiagram.astro'),
  'utf8',
);

function frontmatter(source: string): Record<string, unknown> {
  const match = source.match(/^---\n(.*?)\n---\n/s);
  if (!match) throw new Error('Chapter 4 frontmatter is missing.');
  return JSON.parse(match[1]) as Record<string, unknown>;
}

function contractVisualizationId(): string {
  return (frontmatter(contractSource) as { visualization: { id: string } }).visualization.id;
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

function normalizeCss(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function cssRuleBody(styles: string, ...selectorFragments: string[]): string {
  const normalizedFragments = selectorFragments.map(normalizeCss);
  const rule = [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/gs)].find((match) => {
    const selector = normalizeCss(match[1]);
    return normalizedFragments.every((fragment) => selector.includes(fragment));
  });
  if (!rule) {
    throw new Error(
      `Missing CSS rule containing: ${normalizedFragments.join(' and ')}`,
    );
  }
  return normalizeCss(rule[2]);
}

describe('apply-BPE-tokenizer trace parser', () => {
  it('keeps ordinary encoding lean while both APIs share one merge loop', () => {
    const leanStart = bpeSource.indexOf('    pub fn encode_content(&self, bytes: &[u8])');
    const leanEnd = bpeSource.indexOf('    /// Encodes a valid UTF-8 string', leanStart);
    const tracedStart = bpeSource.indexOf(
      '    pub fn encode_content_with_trace(&self, bytes: &[u8])',
    );
    const tracedEnd = bpeSource.indexOf(
      '    /// Encodes arbitrary bytes into the canonical rank-ordered content sequence.',
      tracedStart,
    );
    expect(leanStart).toBeGreaterThan(-1);
    expect(leanEnd).toBeGreaterThan(leanStart);
    expect(tracedStart).toBeGreaterThan(-1);
    expect(tracedEnd).toBeGreaterThan(tracedStart);

    const leanBody = bpeSource.slice(leanStart, leanEnd);
    const tracedBody = bpeSource.slice(tracedStart, tracedEnd);
    expect(leanBody).toContain('self.initial_content_tokens(bytes)');
    expect(leanBody).toContain('self.apply_ranked_merges');
    expect(leanBody).not.toContain('encode_content_with_trace');
    expect(leanBody).not.toContain('BpeEncodingTrace');
    expect(leanBody).not.toContain('BpeMergeApplication');
    expect(tracedBody).toContain('self.apply_ranked_merges');
    expect(tracedBody).toContain('BpeMergeApplication');
    expect(bpeSource.match(/for rule in &self\.merge_rules/g)).toHaveLength(1);

    for (const source of [contractSource, englishChapterSource, russianChapterSource]) {
      expect(frontmatter(source).content_revision).toBe(9);
    }
    expect(englishChapterSource).toContain(
      'The ordinary and traced methods call the same ranked-merge loop.',
    );
    expect(russianChapterSource).toContain(
      'Обычный метод и метод с трассировкой используют один и тот же цикл',
    );
  });

  it('copies sealed training state but fully validates raw pair tables', () => {
    const trustedStart = bpeSource.indexOf(
      '    pub fn from_training(training: &BpeTraining)',
    );
    const rawStart = bpeSource.indexOf(
      '    pub fn from_merge_pairs(pairs: &[TokenPair])',
    );
    const rawEnd = bpeSource.indexOf('    /// Returns the validated layout extent.', rawStart);
    expect(trustedStart).toBeGreaterThan(-1);
    expect(rawStart).toBeGreaterThan(trustedStart);
    expect(rawEnd).toBeGreaterThan(rawStart);

    const trustedBody = bpeSource.slice(trustedStart, rawStart);
    expect(trustedBody).toContain('TokenizerLayout::new(training.rules().len())?');
    expect(trustedBody).toContain('training.vocabulary().to_vec()');
    expect(trustedBody).toContain('rule.rank()');
    expect(trustedBody).toContain('rule.token_id()');
    expect(trustedBody).toContain('rule.pair()');
    expect(trustedBody).not.toContain('from_merge_pairs');
    expect(trustedBody).not.toContain('expected_rank');
    expect(trustedBody).not.toContain('training.token_bytes');
    expect(bpeSource).not.toContain('InvalidTrainingRule');
    expect(bpeSource).not.toContain('InconsistentTrainingVocabulary');
    expect(bpeTrainerSource).toContain(
      'pub(crate) fn vocabulary(&self) -> &[Vec<u8>]',
    );

    const rawBody = bpeSource.slice(rawStart, rawEnd);
    expect(rawBody).toContain('TokenizerLayout::new(pairs.len())?');
    expect(rawBody).toContain('BpeTokenizerError::UnknownMergeOperand');
    expect(rawBody).toContain('BpeTokenizerError::DuplicateMergePair');
    expect(rawBody).toContain('training_vocabulary.push(merged_bytes)');

    expect(englishChapterSource).toContain(
      "copies each rule's rank, pair, and assigned training-space ID",
    );
    expect(englishChapterSource).toContain(
      '`BpeTokenizer::from_merge_pairs`, by contrast, accepts raw pairs supplied by a',
    );
    expect(englishChapterSource).not.toContain('rebuilds every byte expansion');
    expect(russianChapterSource).not.toContain('заново строит');
    expect(russianChapterSource).toMatch(
      /Метод не строит байтовые представления заново и не\s+проверяет повторно инварианты из главы 3\./,
    );
  });

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
    const source = componentSource;
    expect(source).toContain('<figure');
    expect(source).toContain('<figcaption class="course-diagram__caption">');
    expect(source).toContain('<ol class="example-list course-diagram__grid">');
    expect(source).toContain('<section class="example"');
    expect(source).toContain('<ol class="pipeline course-diagram__grid">');
    expect(source).toContain('class="piece-scroll course-diagram__scroll"');
    expect(source).toContain('<ol class="piece-list course-diagram__grid">');
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
    expect(source).toContain('data-diagram-scroll');
    expect(source).not.toContain('overflow-x: auto');
    expect(sharedStyles).toContain(':focus-visible');
    expect(source).toContain('@container course-diagram (max-width: 48rem)');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('data-diagram-box');
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

  it('keeps one static figure and delegates scrolling and expansion to shared presentation', () => {
    expect(componentSource.match(/<figure\b/g) ?? []).toHaveLength(1);
    expect(componentSource.match(/<\/figure>/g) ?? []).toHaveLength(1);
    expect(componentSource).toContain(
      'data-visualization-id={applyBpeTokenizerDiagramId}',
    );
    expect(componentSource).not.toMatch(/<script\b/i);
    expect(componentSource).not.toMatch(/\b(?:client:[\w-]+|server:defer)\b/);
    expect(componentSource).not.toMatch(/<(?:dialog|button)\b/i);

    const styleStart = componentSource.indexOf('<style>');
    const styleEnd = componentSource.lastIndexOf('</style>');
    expect(styleStart).toBeGreaterThan(-1);
    expect(styleEnd).toBeGreaterThan(styleStart);
    const localStyles = componentSource.slice(styleStart, styleEnd);
    expect(localStyles).not.toMatch(/\boverflow(?:-[\w-]+)?\s*:/i);
  });

  it('keeps each grouped-piece list inside the smallest neutral named scroll region', () => {
    expect(componentSource).toContain(
      '<h5 id={`${caseId}-grouped-label`}>{labels.lanes.grouped}</h5>',
    );

    const pieceScrollTags = (componentSource.match(/<div\b[^>]*>/gs) ?? []).filter(
      (tag: string) => /\bclass="[^"]*\bpiece-scroll\b[^"]*"/.test(tag),
    );
    expect(pieceScrollTags).toHaveLength(1);
    const pieceScrollTag = pieceScrollTags[0] ?? '';
    const classNames = pieceScrollTag
      .match(/\bclass="([^"]+)"/)?.[1]
      .split(/\s+/);
    expect(classNames).toEqual(['piece-scroll', 'course-diagram__scroll']);
    expect(pieceScrollTag).toMatch(/\brole="region"/);
    expect(pieceScrollTag).toMatch(/\btabindex="0"/);
    expect(pieceScrollTag).toContain(
      'aria-labelledby={`${caseId}-grouped-label`}',
    );
    expect(pieceScrollTag).toMatch(/\bdata-diagram-scroll(?:\s|>)/);
    expect(pieceScrollTag).not.toMatch(/\bdata-diagram-box(?:\s|>)/);

    const pieceListTags = (componentSource.match(/<ol\b[^>]*>/gs) ?? []).filter(
      (tag: string) => /\bclass="[^"]*\bpiece-list\b[^"]*"/.test(tag),
    );
    expect(pieceListTags).toEqual([
      '<ol class="piece-list course-diagram__grid">',
    ]);
    expect(pieceListTags[0]).not.toMatch(
      /\b(?:role|tabindex|data-diagram-scroll|data-diagram-box)=?/,
    );
    expect(componentSource).toContain('.piece-scroll {\n    direction: ltr;');
    expect(componentSource).toContain(
      '.apply-bpe-diagram:dir(rtl) .piece-list > li {\n    direction: rtl;',
    );
  });

  it('composes a side rail, peer examples, and compact vertical lanes in full view', () => {
    const fullscreenStart = componentSource.indexOf(
      "figure.apply-bpe-diagram.course-diagram[data-diagram-style='course-v1']:fullscreen {",
    );
    const fullscreenEnd = componentSource.indexOf(
      '@container course-diagram',
      fullscreenStart,
    );
    expect(fullscreenStart).toBeGreaterThan(-1);
    expect(fullscreenEnd).toBeGreaterThan(fullscreenStart);
    const fullscreenStyles = componentSource.slice(fullscreenStart, fullscreenEnd);

    const root = cssRuleBody(
      fullscreenStyles,
      "figure.apply-bpe-diagram.course-diagram[data-diagram-style='course-v1']:fullscreen",
    );
    expect(root).toMatch(/grid-template-columns: [^;]*repeat\(2,/);
    expect(root).toContain('align-items: start;');

    const caption = cssRuleBody(
      fullscreenStyles,
      '.apply-bpe-diagram:fullscreen > figcaption',
    );
    expect(caption).toContain('grid-column: 1;');
    expect(caption).toContain('grid-row: 2;');

    const controls = cssRuleBody(
      fullscreenStyles,
      '.apply-bpe-diagram:fullscreen > :global(.diagram-full-view-actions)',
    );
    expect(controls).toContain('grid-column: 1;');
    expect(controls).toContain('grid-row: 1;');

    const examples = cssRuleBody(
      fullscreenStyles,
      '.apply-bpe-diagram:fullscreen > .example-list',
    );
    expect(examples).toContain('grid-column: 2 / -1;');
    expect(examples).toContain('grid-row: 1 / span 3;');
    expect(examples).toMatch(/grid-template-columns: repeat\(2,/);

    const invariants = cssRuleBody(
      fullscreenStyles,
      '.apply-bpe-diagram:fullscreen > .invariants',
    );
    expect(invariants).toContain('grid-column: 1;');
    expect(invariants).toContain('grid-row: 3;');

    const lane = cssRuleBody(
      fullscreenStyles,
      '.apply-bpe-diagram:fullscreen .pipeline > [data-lane]',
    );
    expect(lane).toMatch(/grid-template-columns: [^;]+ [^;]+;/);
    expect(lane).toContain('column-gap:');
    expect(lane).toContain('align-items: start;');

    const groupedPieces = cssRuleBody(
      fullscreenStyles,
      ".pipeline > [data-lane='grouped'] > .piece-scroll",
    );
    expect(groupedPieces).toContain('grid-column: 1 / -1;');
    expect(groupedPieces).toContain('grid-row: 2;');

    const groupedPieceList = cssRuleBody(
      fullscreenStyles,
      ".pipeline > [data-lane='grouped']",
      '> .piece-scroll',
      '> .piece-list',
    );
    expect(groupedPieceList).toContain('grid-auto-flow: column;');
    expect(groupedPieceList).toContain('grid-auto-columns: minmax(');

    const documentAndDecodedHeadings = cssRuleBody(
      fullscreenStyles,
      "> :is([data-lane='document'], [data-lane='decoded'])",
      '> h5',
    );
    expect(documentAndDecodedHeadings).toContain('grid-column: 1 / -1;');
    expect(documentAndDecodedHeadings).toContain('grid-row: 1;');

    const documentAndDecodedTapes = cssRuleBody(
      fullscreenStyles,
      "> :is([data-lane='document'], [data-lane='decoded'])",
      '> .token-tape',
    );
    expect(documentAndDecodedTapes).toContain('grid-column: 1;');
    expect(documentAndDecodedTapes).toContain('grid-row: 2;');

    const outcomeEvidence = cssRuleBody(
      fullscreenStyles,
      "[data-lane='document'] > .control-key",
      "[data-lane='decoded'] > .exact-cue",
    );
    expect(outcomeEvidence).toContain('grid-column: 2;');
    expect(outcomeEvidence).toContain('grid-row: 2;');

    expect(fullscreenStyles).not.toMatch(/\bfont-size\s*:/i);
    expect(fullscreenStyles).not.toMatch(/\bzoom\s*:/i);
    expect(fullscreenStyles).not.toMatch(/\b(?:transform\s*:[^;{}]*scale\s*\(|scale\s*:)/i);
    expect(fullscreenStyles).not.toMatch(
      /\boverflow(?:-[\w-]+)?\s*:\s*(?:hidden|clip)\b/i,
    );
  });
});
