// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync, readdirSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  getCheatSheetCopy,
  indexCheatSheets,
  type CheatSheetData,
} from '../src/lib/cheat-sheets';

declare const process: { cwd(): string };

const root = process.cwd();
const contentRoot = resolve(root, 'src/content/cheat-sheets');

const expectedSheets = {
  '01-text-units': {
    file: '01-text-units.json',
    lesson: '01-text-units.mdx',
    title: 'Text units and vocabulary IDs',
    entries: [
      ['UTF-8 byte', 'scalar occupies two UTF-8 bytes here'],
      ['Unicode scalar value', 'Unicode scalar values'],
      ['Vocabulary', 'A deterministic scalar vocabulary'],
      ['Token ID', 'the token ID at sequence position'],
      ['Unknown token', 'unknown token <UNK>'],
      ['Reversible round trip', 'round trip is reversible for known units'],
      ['Grapheme cluster', 'user-perceived grapheme clusters'],
      ['Subword tokenizer', 'Modern subword methods'],
    ],
  },
  '02-corpus-partitions': {
    file: '02-corpus-partitions.json',
    lesson: '02-corpus-partitions.mdx',
    title: 'Corpus documents and frozen partitions',
    entries: [
      ['Corpus', 'six-document corpus'],
      ['Whole document', 'original whole document first'],
      ['Training partition', 'Only the training set may'],
      ['Validation partition', 'Validation may later guide choices'],
      ['Test partition', 'test remains sealed for the final report'],
      ['Disjoint split', 'three roles cover the entire corpus'],
      ['Holdout', 'fixed holdouts developed'],
      ['Data leakage', 'particular leakage path'],
      ['Provenance group', 'provenance group remains within one role'],
    ],
  },
  '03-learn-bpe-merges': {
    file: '03-learn-bpe-merges.json',
    lesson: '03-learn-bpe-merges.mdx',
    title: 'Learning deterministic BPE merges',
    entries: [
      ['Byte Pair Encoding (BPE)', 'family of repeated-pair procedures'],
      ['Adjacent-pair candidate', 'an ordered adjacent pair'],
      ['Candidate count', 'two candidate positions'],
      ['Merge round', 'For each round'],
      ['Merge rank', 'Rank 0 therefore selects'],
      ['Deterministic tie-break', 'smaller left and then smaller right'],
      ['Non-overlapping replacement', 'without overlap'],
      ['Byte expansion', 'byte expansions'],
      ['Document boundary', 'across the boundary'],
    ],
  },
  '04-apply-bpe-tokenizer': {
    file: '04-apply-bpe-tokenizer.json',
    lesson: '04-apply-bpe-tokenizer.mdx',
    title: 'Applying and reversing a BPE tokenizer',
    entries: [
      ['Byte-level BPE tokenizer', 'base alphabet of only 256 symbols'],
      ['Frozen merge rank', 'Rank is priority'],
      ['Canonical encoding', 'canonical encoding'],
      ['Content token', 'content token ID'],
      ['Control token', 'Document controls are a structural layer'],
      ['BOS and EOS', 'BOS and EOS appear only after encoding'],
      ['Content offset', 'shifted by two'],
      ['Byte fallback', 'One-byte fallback'],
      ['Byte-exact decoding', 'Guarantee exact bytes in one direction'],
      ['Strict UTF-8 view', 'separate strict view'],
    ],
  },
  '05-autoregressive-examples': {
    file: '05-autoregressive-examples.json',
    lesson: '05-autoregressive-examples.mdx',
    title: 'Building autoregressive input–target pairs',
    entries: [
      ['Autoregressive language model', 'An autoregressive language model predicts each token'],
      ['Input–target pair', 'input–target pairs that provide the correct'],
      ['One-token shift', 'Express the one-token shift with slices'],
      ['Context length', 'Choose context length'],
      ['Stride', 'The stride selects candidate starts'],
      ['Overlapping pairs', 'across overlapping pairs'],
      ['BOS and EOS boundary tokens', 'BOS and EOS boundary tokens'],
      ['Causal computation', 'causal computation may use only'],
      ['Causal mask', 'needs an explicit causal mask'],
    ],
  },
  '06-bigram-baseline': {
    file: '06-bigram-baseline.json',
    lesson: '06-bigram-baseline.mdx',
    title: 'From transition counts to a bigram model',
    entries: [
      ['Bigram model', 'This is a **bigram** model'],
      ['Transition count', 'number of observed transitions'],
      ['Context', 'one current token'],
      ['Probability row', 'probability distribution'],
      ['Maximum-likelihood estimate (MLE)', 'maximum-likelihood estimate (MLE)'],
      ['Unobserved successor', 'unobserved successor after `A`'],
      ['Unseen context', 'unseenContext'],
      ['Add-one smoothing', 'Add-one smoothing'],
      ['Pseudocount', 'positive pseudocount added'],
    ],
  },
  '07-language-model-metrics': {
    file: '07-language-model-metrics.json',
    lesson: '07-language-model-metrics.mdx',
    title: 'From assigned probability to perplexity',
    entries: [
      ['Assigned probability', 'Assigned probability'],
      ['Surprise', 'define its **surprise**'],
      ['Sequence likelihood', 'sequence likelihood'],
      ['Negative log-likelihood (NLL)', 'negative log-likelihood'],
      ['Mean NLL', 'mean negative log-likelihood (mean NLL)'],
      ['Length normalization', 'length normalization missing'],
      ['Nat', 'nats per target'],
      ['Perplexity', 'Perplexity is'],
      ['Empirical cross-entropy', 'empirical cross-entropy'],
      ['Argmax', 'argmax alone'],
    ],
  },
  '08-tensor-storage': {
    file: '08-tensor-storage.json',
    lesson: '08-tensor-storage.mdx',
    title: 'From tensor coordinates to one flat buffer',
    entries: [
      ['Tensor', 'A tensor gives'],
      ['Shape', 'For shape [2,2,3]'],
      ['Axis', 'It has three axes'],
      ['Rank', 'its **rank** is'],
      ['Extent', 'Axis `1` has extent'],
      ['Coordinate', 'coordinate `[1,0,2]`'],
      ['Row-major order', 'In row-major order'],
      ['Element stride', 'element stride'],
      ['Offset', 'Offset `8` is'],
      ['Contiguous storage', 'contiguous row-major buffer'],
    ],
  },
  '09-tensor-views': {
    file: '09-tensor-views.json',
    lesson: '09-tensor-views.mdx',
    title: 'Shared views and explicit tensor copies',
    entries: [
      ['Tensor view', 'shared tensor views'],
      ['Reshape', 'First, reshape the view'],
      ['Transpose', 'transpose axes `0` and `1`'],
      ['Axis permutation', 'axis permutation'],
      ['Slice', 'The frozen inner-axis slice'],
      ['Base offset', 'base offset'],
      ['Row-major contiguity', 'row-major contiguous'],
      ['Materialization', 'Materialization is the operation'],
      ['Query, key, and value (Q/K/V)', 'query, key, and value matrices'],
      ['Attention head', 'parallel heads'],
    ],
  },
  '10-broadcasting-reductions': {
    file: '10-broadcasting-reductions.json',
    lesson: '10-broadcasting-reductions.mdx',
    title: 'Align compatible shapes, reduce a named axis',
    entries: [
      ['Broadcasting', 'Broadcasting and mean reduction'],
      ['Trailing-axis alignment', 'trailing-axis alignment'],
      ['Singleton axis', 'singleton and missing leading dimensions'],
      ['Elementwise operation', 'elementwise operations'],
      ['Reduction', 'A reduction is also not'],
      ['Reduction axis', 'explicit zero-based reduction axis'],
      ['Keep dimension', 'Keep dimension'],
      ['Feature axis', 'final feature axis'],
      ['Attention softmax', 'attention softmax'],
      ['Feature normalization', 'feature normalization'],
    ],
  },
  '11-matrix-multiplication': {
    file: '11-matrix-multiplication.json',
    lesson: '11-matrix-multiplication.mdx',
    title: 'Multiply rows by columns, then reuse batches',
    entries: [
      ['Matrix multiplication', 'Checked matrix multiplication'],
      ['Activation matrix', 'The activation matrix'],
      ['Projection weight', 'projection weight'],
      ['Output cell', 'One output cell'],
      ['Inner dimension', 'inner dimension'],
      ['Contraction', 'row-column contraction'],
      ['Batched matrix multiplication', 'batched matrix multiplication'],
      ['Batch broadcasting', 'batch broadcasting'],
      ['Logical transpose', 'logical transpose flags'],
      ['Attention score', 'attention scores'],
    ],
  },
  '12-stable-softmax': {
    file: '12-stable-softmax.json',
    lesson: '12-stable-softmax.mdx',
    title: 'Turn extreme logits into stable probabilities',
    entries: [
      ['Logit', 'These values are logits: scores before normalization, not probabilities.'],
      ['Softmax', "The chapter's stable softmax formula is:"],
      ['Maximum shift', 'The maximum shift removes a'],
      ['Normalization group', 'An axis divides a tensor into independent normalization groups.'],
      ['Class axis', 'class axis gives group shape'],
      ['Log-sum-exp', 'Log-sum-exp adds the maximum back'],
      ['Log-softmax', 'Log-softmax keeps the safer shifted difference'],
      ['Indexed NLL', 'Indexed NLL selects one target'],
      ['Overflow', 'directly exponentiating unshifted large logits can overflow'],
      ['Underflow', 'negative extremes become zero divided by zero'],
    ],
  },
  '13-gradient-checking': {
    file: '13-gradient-checking.json',
    lesson: '13-gradient-checking.mdx',
    title: 'Check gradients before trusting backpropagation',
    entries: [
      ['Gradient check', 'Start with a small scalar gradient check:'],
      ['Central difference', 'The central-difference formula is:'],
      ['Numerical derivative', 'predicts a numerical derivative of'],
      ['Analytic gradient', 'the analytic derivative is'],
      ['Step size', 'the six-step scan'],
      ['Truncation error', 'truncation error of order'],
      ['Rounding error', 'rounding has raised the displayed result'],
      ['Scale-aware error', 'passes exactly when scaled error is no greater than'],
      ['Tolerance', 'declared finite nonnegative tolerance'],
      ['Deterministic coordinate sampling', 'No random generator or hidden state is involved.'],
    ],
  },
} as const;

function readSheet(fileName: string) {
  return JSON.parse(
    readFileSync(resolve(contentRoot, 'en', fileName), 'utf8'),
  ) as CheatSheetData;
}

describe('English chapter cheat-sheet content', () => {
  it('publishes exactly the independently checkpointed English records', () => {
    expect(readdirSync(resolve(contentRoot, 'en')).sort()).toEqual(
      Object.values(expectedSheets)
        .map(({ file }) => file)
        .sort(),
    );
    expect(() => readdirSync(resolve(contentRoot, 'ru'))).toThrow();
  });

  for (const [chapterId, expected] of Object.entries(expectedSheets)) {
    it(`${chapterId} contains concise terms grounded in its canonical lesson`, () => {
      const sheet = readSheet(expected.file);
      const lesson = readFileSync(
        resolve(root, 'src/content/chapters/en', expected.lesson),
        'utf8',
      );

      expect(sheet.chapter_id).toBe(chapterId);
      expect(sheet.locale).toBe('en');
      expect(sheet.title).toBe(expected.title);
      expect(sheet.description.trim()).toBe(sheet.description);
      expect(sheet.description).toMatch(/\.$/);
      expect(sheet.terms.map(({ term }) => term)).toEqual(
        expected.entries.map(([term]) => term),
      );
      expect(
        new Set(sheet.terms.map(({ term }) => term.toLowerCase())).size,
      ).toBe(sheet.terms.length);

      expected.entries.forEach(([, evidence], index) => {
        expect(lesson).toContain(evidence);
        expect(sheet.terms[index]?.definition.trim()).toBe(
          sheet.terms[index]?.definition,
        );
        expect(sheet.terms[index]?.definition).toMatch(/\.$/);
        expect(
          sheet.terms[index]?.definition.split(/\s+/).length,
        ).toBeGreaterThan(7);
      });

      expect(sheet.terms.map(({ term }) => term).join(' ')).not.toMatch(
        /\b(?:Vec|usize|Result|borrow checker|TypeScript|Python)\b/,
      );
    });
  }
});

describe('cheat-sheet integration contract', () => {
  it('uses a separate strict content collection and one shared progressive dialog', () => {
    const config = readFileSync(resolve(root, 'src/content.config.ts'), 'utf8');
    const route = readFileSync(
      resolve(root, 'src/pages/[locale]/course/[...slug].astro'),
      'utf8',
    );
    const component = readFileSync(
      resolve(root, 'src/components/CheatSheet.astro'),
      'utf8',
    );

    expect(config).toContain("pattern: '**/*.json'");
    expect(config).toContain('const cheatSheets = defineCollection');
    expect(config).toContain(
      'export const collections = { chapters, cheatSheets }',
    );
    expect(route).toContain("await getCollection('cheatSheets')");
    expect(route).toContain('<CheatSheet sheet={cheatSheet.data} />');
    expect(component).toContain('<dialog');
    expect(component).toContain('aria-labelledby={titleId}');
    expect(component).toContain('aria-describedby={descriptionId}');
    expect(component).toContain('aria-haspopup="dialog"');
    expect(component).toContain('dialog.showModal()');
    expect(component).toContain("dialog.addEventListener('close'");
    expect(component).toContain('opener?.focus()');
    expect(component).toContain('<details');
    expect(component).not.toMatch(/client:|React|Vue|Svelte/);
  });

  it('indexes one sheet per existing localized non-orientation chapter', () => {
    const sheet = { data: readSheet('01-text-units.json') };
    const chapter = {
      data: { chapter_id: '01-text-units', locale: 'en' as const },
    };

    expect(indexCheatSheets([chapter], [sheet]).get('en:01-text-units')).toBe(
      sheet,
    );
    expect(() => indexCheatSheets([chapter], [sheet, sheet])).toThrow(
      /duplicated/,
    );
    expect(() => indexCheatSheets([], [sheet])).toThrow(/does not match/);
    expect(() =>
      indexCheatSheets(
        [{ data: { ...chapter.data, chapter_kind: 'orientation' as const } }],
        [sheet],
      ),
    ).toThrow(/Orientation/);
  });

  it('exposes interface copy only for locales with published cheat sheets', () => {
    expect(getCheatSheetCopy('en')).toEqual({
      closeLabel: 'Close cheat sheet',
      eyebrow: 'Quick reference',
      fallbackSummary: 'Cheat sheet',
      openLabel: 'Open cheat sheet',
    });
    expect(getCheatSheetCopy('ru')).toBeNull();
  });
});
