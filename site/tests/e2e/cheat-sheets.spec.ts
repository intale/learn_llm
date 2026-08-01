import { expect, test } from '@playwright/test';

import { chapterPath } from './chapter-helpers';

const sheets = [
  {
    chapter: 1,
    chapterId: '01-text-units',
    title: 'Text units and vocabulary IDs',
    terms: [
      'UTF-8 byte',
      'Unicode scalar value',
      'Vocabulary',
      'Token ID',
      'Unknown token',
      'Reversible round trip',
      'Grapheme cluster',
      'Subword tokenizer',
    ],
  },
  {
    chapter: 2,
    chapterId: '02-corpus-partitions',
    title: 'Corpus documents and frozen partitions',
    terms: [
      'Corpus',
      'Whole document',
      'Training partition',
      'Validation partition',
      'Test partition',
      'Disjoint split',
      'Holdout',
      'Data leakage',
      'Provenance group',
    ],
  },
  {
    chapter: 3,
    chapterId: '03-learn-bpe-merges',
    title: 'Learning deterministic BPE merges',
    terms: [
      'Byte Pair Encoding (BPE)',
      'Adjacent-pair candidate',
      'Candidate count',
      'Merge round',
      'Merge rank',
      'Deterministic tie-break',
      'Non-overlapping replacement',
      'Byte expansion',
      'Document boundary',
    ],
  },
  {
    chapter: 4,
    chapterId: '04-apply-bpe-tokenizer',
    title: 'Applying and reversing a BPE tokenizer',
    terms: [
      'Byte-level BPE tokenizer',
      'Frozen merge rank',
      'Canonical encoding',
      'Content token',
      'Control token',
      'BOS and EOS',
      'Content offset',
      'Byte fallback',
      'Byte-exact decoding',
      'Strict UTF-8 view',
    ],
  },
  {
    chapter: 5,
    chapterId: '05-autoregressive-examples',
    title: 'Building autoregressive input–target pairs',
    terms: [
      'Autoregressive language model',
      'Input–target pair',
      'One-token shift',
      'Context length',
      'Stride',
      'Overlapping pairs',
      'BOS and EOS boundary tokens',
      'Causal computation',
      'Causal mask',
    ],
  },
  {
    chapter: 6,
    chapterId: '06-bigram-baseline',
    title: 'From transition counts to a bigram model',
    terms: [
      'Bigram model',
      'Transition count',
      'Context',
      'Probability row',
      'Maximum-likelihood estimate (MLE)',
      'Unobserved successor',
      'Unseen context',
      'Add-one smoothing',
      'Pseudocount',
    ],
  },
  {
    chapter: 7,
    chapterId: '07-language-model-metrics',
    title: 'From assigned probability to perplexity',
    terms: [
      'Assigned probability',
      'Surprise',
      'Sequence likelihood',
      'Negative log-likelihood (NLL)',
      'Mean NLL',
      'Length normalization',
      'Nat',
      'Perplexity',
      'Empirical cross-entropy',
      'Argmax',
    ],
  },
  {
    chapter: 8,
    chapterId: '08-tensor-storage',
    title: 'From tensor coordinates to one flat buffer',
    terms: [
      'Tensor',
      'Shape',
      'Axis',
      'Rank',
      'Extent',
      'Coordinate',
      'Row-major order',
      'Element stride',
      'Offset',
      'Contiguous storage',
    ],
  },
  {
    chapter: 9,
    chapterId: '09-tensor-views',
    title: 'Shared views and explicit tensor copies',
    terms: [
      'Tensor view',
      'Reshape',
      'Transpose',
      'Axis permutation',
      'Slice',
      'Base offset',
      'Row-major contiguity',
      'Materialization',
      'Query, key, and value (Q/K/V)',
      'Attention head',
    ],
  },
  {
    chapter: 10,
    chapterId: '10-broadcasting-reductions',
    title: 'Align compatible shapes, reduce a named axis',
    terms: [
      'Broadcasting',
      'Trailing-axis alignment',
      'Singleton axis',
      'Elementwise operation',
      'Reduction',
      'Reduction axis',
      'Keep dimension',
      'Feature axis',
      'Attention softmax',
      'Feature normalization',
    ],
  },
  {
    chapter: 11,
    chapterId: '11-matrix-multiplication',
    title: 'Multiply rows by columns, then reuse batches',
    terms: [
      'Matrix multiplication',
      'Activation matrix',
      'Projection weight',
      'Output cell',
      'Inner dimension',
      'Contraction',
      'Batched matrix multiplication',
      'Batch broadcasting',
      'Logical transpose',
      'Attention score',
    ],
  },
  {
    chapter: 12,
    chapterId: '12-stable-softmax',
    title: 'Turn extreme logits into stable probabilities',
    terms: ['Logit', 'Softmax', 'Maximum shift', 'Normalization group', 'Class axis', 'Log-sum-exp', 'Log-softmax', 'Indexed NLL', 'Overflow', 'Underflow'],
  },
  {
    chapter: 13,
    chapterId: '13-gradient-checking',
    title: 'Check gradients before trusting backpropagation',
    terms: ['Gradient check', 'Central difference', 'Numerical derivative', 'Analytic gradient', 'Step size', 'Truncation error', 'Rounding error', 'Scale-aware error', 'Tolerance', 'Deterministic coordinate sampling'],
  },
  {
    chapter: 14,
    chapterId: '14-scalar-autodiff',
    title: 'Accumulate gradients through a scalar graph',
    terms: ['Computation graph', 'Reverse mode', 'Adjoint', 'Operand-use edge', 'Local derivative', 'Reverse topological order', 'Gradient accumulation', 'Backward pass', 'Detach', 'Zeroing gradients'],
  },
  {
    chapter: 15,
    chapterId: '15-tensor-autodiff-core',
    title: 'Reverse tensor operations with edge-local VJPs',
    terms: ['Tensor autodiff tape', 'Vector-Jacobian product (VJP)', 'Jacobian', 'Operand-use edge', 'Upstream adjoint', 'Parent adjoint', 'Broadcast reversal', 'Reduction VJP', 'Non-scalar seed', 'Graph retention'],
  },
  {
    chapter: 16,
    chapterId: '16-model-autodiff-ops',
    title: 'Reverse the operations that turn token IDs into loss',
    terms: ['Embedding table', 'Row gather', 'Token ID', 'Repeated selector', 'Scatter-add', 'Matrix VJP', 'SiLU', 'Log-softmax', 'Indexed mean NLL', 'Target-logit gradient'],
  },
  {
    chapter: 17,
    chapterId: '17-parameter-initialization',
    title: 'Initialize trainable weights reproducibly',
    terms: ['Parameter initialization', 'Hidden-unit symmetry', 'Fan-in', 'Fan-out', 'Xavier-style initialization', 'Target variance', 'Uniform bound', 'Seed', 'Reproducibility', 'Pseudorandom generator'],
  },
  {
    chapter: 18,
    chapterId: '18-token-embeddings',
    title: 'Give token IDs trainable vectors',
    terms: ['Token embedding', 'Embedding table', 'Vocabulary size', 'Embedding width', 'Token ID', 'Direct row lookup', 'One-hot vector', 'Gather operation', 'Repeated-token gradient', 'Scatter-add'],
  },
] as const;

for (const sheet of sheets) {
  test.describe(`Chapter ${sheet.chapter} cheat sheet`, () => {
    test('opens one modal, closes by Escape and button, and restores focus', async ({
      page,
    }) => {
      await page.goto(chapterPath('en', sheet.chapterId));

      const root = page.locator('[data-cheat-sheet]');
      const trigger = root.getByRole('button', { name: 'Open cheat sheet' });
      const dialog = root.getByRole('dialog', { name: sheet.title });
      const fallback = root.locator('[data-cheat-sheet-fallback]');

      await expect(root).toHaveCount(1);
      await expect(trigger).toBeVisible();
      await expect(fallback).toBeHidden();
      await expect(dialog).not.toBeVisible();

      await trigger.focus();
      await trigger.click();
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('dt')).toHaveText([...sheet.terms]);
      await expect(
        root.getByRole('button', { name: 'Close cheat sheet' }),
      ).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();

      await trigger.click();
      await root.getByRole('button', { name: 'Close cheat sheet' }).click();
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    });

    test('contains every term at a narrow viewport without page or dialog overflow', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(chapterPath('en', sheet.chapterId));
      await page.getByRole('button', { name: 'Open cheat sheet' }).click();

      const dialog = page.getByRole('dialog', { name: sheet.title });
      await expect(dialog).toBeVisible();
      const geometry = await dialog.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const terms = Array.from(node.querySelectorAll('dt, dd')).map(
          (term) => {
            const termRect = term.getBoundingClientRect();
            return {
              left: termRect.left,
              right: termRect.right,
            };
          },
        );
        return {
          bodyClientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.documentElement.scrollWidth,
          dialog: {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          },
          terms,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        };
      });

      expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(
        geometry.bodyClientWidth + 1,
      );
      expect(geometry.dialog.left).toBeGreaterThanOrEqual(0);
      expect(geometry.dialog.right).toBeLessThanOrEqual(
        geometry.viewport.width,
      );
      expect(geometry.dialog.top).toBeGreaterThanOrEqual(0);
      expect(geometry.dialog.bottom).toBeLessThanOrEqual(
        geometry.viewport.height,
      );
      for (const term of geometry.terms) {
        expect(term.left).toBeGreaterThanOrEqual(geometry.dialog.left);
        expect(term.right).toBeLessThanOrEqual(geometry.dialog.right);
      }
    });

    test('retains a collapsed semantic disclosure when JavaScript is disabled', async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        baseURL: String(testInfo.project.use.baseURL),
        javaScriptEnabled: false,
      });
      const page = await context.newPage();
      await page.goto(chapterPath('en', sheet.chapterId));

      const root = page.locator('[data-cheat-sheet]');
      const fallback = root.locator('[data-cheat-sheet-fallback]');
      await expect(root.locator('[data-cheat-sheet-open]')).toBeHidden();
      await expect(fallback).toBeVisible();
      await expect(fallback).not.toHaveAttribute('open', '');
      await fallback.locator('summary').click();
      await expect(fallback).toHaveAttribute('open', '');
      await expect(fallback.locator('dt')).toHaveText([...sheet.terms]);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
      ).toBe(true);
      await context.close();
    });
  });
}

test('Chapter 0, Russian chapters, and later English chapters remain sheet-free', async ({
  page,
}) => {
  await page.goto(chapterPath('en', '00-llm-parts'));
  await expect(page.locator('[data-cheat-sheet]')).toHaveCount(0);

  for (const sheet of sheets) {
    await page.goto(chapterPath('ru', sheet.chapterId));
    await expect(page.locator('[data-cheat-sheet]')).toHaveCount(0);
  }

  await page.goto(chapterPath('en', '19-linear-layers'));
  await expect(page.locator('[data-cheat-sheet]')).toHaveCount(0);
});
