import { expect, test } from '@playwright/test';

import {
  CHEAT_SHEET_PAGE_SIZE,
  paginateCheatSheetTerms,
  sortCheatSheetTerms,
} from '../../src/lib/cheat-sheets';
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
    terms: ['Embedding table', 'Row gather', 'Token ID', 'Repeated selector', 'Scatter-add', 'Matrix VJP', 'SiLU', 'Log-softmax', 'Indexed mean NLL', 'Loss-logit gradient'],
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
  {
    chapter: 19,
    chapterId: '19-linear-layers',
    title: "Mix each token's features with one learned projection",
    terms: ['Linear layer', 'Learned projection', 'Input feature width', 'Output feature width', 'Leading axes', 'Weight matrix', 'Bias', 'Affine map', 'Parameter sharing', 'Bias-free projection'],
  },
  {
    chapter: 20,
    chapterId: '20-swiglu-feed-forward',
    title: 'Let one learned branch gate another',
    terms: ['SwiGLU', 'Position-wise feed-forward network', 'Gate projection', 'Up projection', 'Down projection', 'SiLU', 'Sigmoid', 'Elementwise product', 'Feed-forward width', 'Position independence'],
  },
  {
    chapter: 21,
    chapterId: '21-mini-batches',
    title: 'Count real tokens in every mini-batch',
    terms: ['Causal window', 'Mini-batch', 'Requested batch capacity', 'Smaller final batch', 'Target occurrence', 'Actual target-token denominator', 'Token-mean gradient', 'Raw accumulator', 'Token-weighted mean', 'No-padding batch'],
  },
  {
    chapter: 22,
    chapterId: '22-adamw',
    title: 'Keep decay out of the gradient moments',
    terms: ['AdamW', 'First gradient moment', 'Second gradient moment', 'Bias correction', 'Adaptive update', 'Decoupled weight decay', 'Learning rate', 'Numerical stabilizer', 'Decay group', 'No-decay group'],
  },
  {
    chapter: 23,
    chapterId: '23-neural-ngram',
    title: 'Train a fixed-context neural language model',
    terms: ['Neural n-gram', 'Fixed context', 'Token embedding', 'Context concatenation', 'SwiGLU hidden layer', 'Vocabulary projection', 'Next-token logit', 'Indexed mean loss', 'Held-out validation loss', 'Greedy generation'],
  },
  {
    chapter: 24,
    chapterId: '24-residual-connections',
    title: 'Keep an identity path around each learned update',
    terms: ['Residual connection', 'Identity path', 'Residual branch', 'Residual stream', 'Learned update', 'Exact-shape merge', 'Vector-Jacobian product', 'Upstream adjoint', 'Gradient accumulation', 'Branch Jacobian'],
  },
  {
    chapter: 25,
    chapterId: '25-rmsnorm',
    title: 'Normalize feature scale without centering',
    terms: ['RMSNorm', 'Mean square', 'Reciprocal RMS', 'Root-mean-square scale', 'Learned gain', 'Epsilon stabilizer', 'Final feature axis', 'Approximate scale invariance', 'Pre-normalization', 'LayerNorm'],
  },
  {
    chapter: 26,
    chapterId: '26-qkv-projections',
    title: 'Create query, key, and value views',
    terms: ['Query, key, and value projections', 'Hidden-state tensor', 'Model width', 'Head width', 'Query view', 'Key view', 'Value view', 'Self-attention', 'Bias-free projection', 'Independent projection weights'],
  },
  {
    chapter: 27,
    chapterId: '27-self-attention',
    title: 'Compute one unmasked self-attention head',
    terms: ['Scaled dot-product self-attention', 'Unmasked attention', 'Query', 'Key', 'Value', 'Attention score', 'Query/key width', 'Square-root scaling', 'Row-wise softmax', 'Attention weight', 'Weighted value mixture'],
  },
  {
    chapter: 28,
    chapterId: '28-causal-masking',
    title: 'Block future keys with a causal mask',
    terms: ['Causal mask', 'Inclusive diagonal', 'Additive mask', 'Query row', 'Key column', 'Allowed prefix', 'Blocked future key', 'Causal softmax', 'Shifted decoder input', 'Prefix invariance', 'Position signal'],
  },
  {
    chapter: 29,
    chapterId: '29-rope',
    title: 'Turn query and key pairs with RoPE',
    terms: ['Rotary position embedding (RoPE)', 'Adjacent coordinate pair', 'Rotation matrix', 'Pair frequency', 'Frequency base', 'Absolute position', 'Signed relative position', 'Equal-shift invariance', 'Orthogonal rotation', 'Query-key rotation', 'Causal mask'],
  },
  {
    chapter: 30,
    chapterId: '30-multi-head-attention',
    title: 'Keep attention head-local until output mixing',
    terms: ['Multi-head causal self-attention', 'Packed Q/K/V projections', 'Model width', 'Head count', 'Head width', 'Head split', 'Per-head RoPE', 'Per-head causal attention', 'Head output', 'Head concatenation', 'Output projection'],
  },
  {
    chapter: 31,
    chapterId: '31-decoder-block',
    title: 'Compose a pre-norm decoder block in exact order',
    terms: ['Pre-normalized decoder block', 'Residual stream', 'Attention RMSNorm', 'Causal multi-head attention', 'First residual merge', 'Feed-forward RMSNorm', 'SwiGLU feed-forward branch', 'Second residual merge', 'Identity path', 'Post-norm order'],
  },
  {
    chapter: 32,
    chapterId: '32-decoder-model',
    title: 'Trace one tied table through a decoder stack',
    terms: ['Decoder stack', 'Decoder depth', 'Distinct decoder blocks', 'Embedding lookup', 'Final RMSNorm', 'Weight tying', 'Tied projection', 'Vocabulary logits', 'Mean indexed negative log likelihood', 'Prefix invariance', 'Tied gradient accumulation'],
  },
  {
    chapter: 33,
    chapterId: '33-training-selection',
    title: 'Select a decoder with validation checkpoints',
    terms: ['Training mini-batch', 'Partition roles', 'Learning-rate schedule', 'Raw gradient', 'Global-norm clipping', 'Clipped gradient', 'AdamW update', 'Optimizer moment state', 'Graph-free validation loss', 'Checkpoint set', 'Earliest validation minimum', 'Token-weighted mean'],
  },
  {
    chapter: 34,
    chapterId: '34-final-evaluation',
    title: 'Freeze choices before one final test report',
    terms: ['Validation-selected checkpoint', 'Frozen selected state', 'Single-use test evaluation boundary', 'Final test evaluation', 'Token-weighted mean NLL', 'Perplexity', 'Aligned target slot', 'Evaluation provenance', 'No-grad evaluation', 'Frozen final evaluation report', 'Frozen bigram', 'Like-for-like targets'],
  },
  {
    chapter: 35,
    chapterId: '35-checkpoints',
    title: 'Save every state, resume exactly',
    terms: ['Versioned decoder checkpoint', 'Checkpoint schema', 'Same-step boundary', 'AdamW optimizer state', 'Continuation RNG state', 'Checkpoint payload record', 'Checkpoint record descriptor', 'Checkpoint payload offset', 'Canonical checkpoint encoding', 'Checkpoint integrity checksum (FNV-1a)', 'Exact round trip', 'Exact resumed update', 'Atomic checkpoint replacement'],
  },
  {
    chapter: 36,
    chapterId: '36-temperature-top-k',
    title: 'Shape a stable top-k distribution, then draw once',
    terms: ['Temperature', 'Stable ranking', 'Top-k candidate set', 'Tie-breaking rule', 'Top-k renormalization', 'Max-shifted softmax', 'Removed-token probability', 'Categorical draw', 'Half-open sampling interval', 'Greedy decoding', 'Stochastic top-1', 'RNG-state replay'],
  },
  {
    chapter: 37,
    chapterId: '37-incremental-attention',
    title: 'Keep the prefix, project only the new row',
    terms: ['Incremental multi-head attention', 'Layer-bound KV cache', 'Absolute RoPE position', 'Rotated key', 'Unrotated value', 'Current query', 'Logical cache length', 'Cache capacity', 'Candidate key/value pair', 'Full-prefix reference', 'Projection reuse', 'Transactional cache update'],
  },
  {
    chapter: 38,
    chapterId: '38-cached-generation',
    title: 'Prefill once, then decode one token at a time',
    terms: ['Model-wide KV cache', 'Per-layer KV cache', 'Prompt prefill', 'One-token decode', 'Complete-prefix reference', 'Newest-logit equivalence', 'Retained prefix length', 'Attention-score work', 'Context-limit stop', 'EOS stop', 'Coherent cache commit', 'Cached-generation replay', 'Cache reset'],
  },
  {
    chapter: 39,
    chapterId: '39-end-to-end-llm',
    title: 'Run the whole tiny LLM',
    terms: ['End-to-end LLM pipeline', 'Decoder-only LLM', 'Frozen document split', 'Training-only BPE', 'Causal window', 'Bitwise training replay', 'Validation-selected state', 'Selection-isolated final test evaluation', 'Frozen alpha-one bigram baseline', 'Same-target test-loss comparison', 'Exact checkpoint round trip', 'Exact logit probe', 'KV-cached generation', 'Joint sequence probability', 'Autoregressive factorization', 'Next-token conditional distribution'],
  },
] as const;

function expectedPages(terms: readonly string[]) {
  const sorted = sortCheatSheetTerms(
    terms.map((term) => ({ definition: 'Browser-test definition.', term })),
    'en',
  );
  return paginateCheatSheetTerms(sorted).map((page) =>
    page.map(({ term }) => term),
  );
}

function expectedStatus(pageIndex: number, pageCount: number, termCount: number) {
  const start = pageIndex * CHEAT_SHEET_PAGE_SIZE + 1;
  const end = Math.min((pageIndex + 1) * CHEAT_SHEET_PAGE_SIZE, termCount);
  return `Terms ${start}\u2013${end} of ${termCount}; page ${pageIndex + 1} of ${pageCount}`;
}

for (const sheet of sheets) {
  test.describe(`Chapter ${sheet.chapter} cheat sheet`, () => {
    test('presents sorted page slices with accessible controls and restores focus', async ({ page }) => {
      await page.goto(chapterPath('en', sheet.chapterId));

      const termPages = expectedPages(sheet.terms);
      const sortedTerms = termPages.flat();
      if (sheet.chapterId === '35-checkpoints') {
        expect(termPages.map((termPage) => termPage.length)).toEqual([10, 3]);
        expect(sortedTerms).toEqual([
          'AdamW optimizer state',
          'Atomic checkpoint replacement',
          'Canonical checkpoint encoding',
          'Checkpoint integrity checksum (FNV-1a)',
          'Checkpoint payload offset',
          'Checkpoint payload record',
          'Checkpoint record descriptor',
          'Checkpoint schema',
          'Continuation RNG state',
          'Exact resumed update',
          'Exact round trip',
          'Same-step boundary',
          'Versioned decoder checkpoint',
        ]);
      }
      if (sheet.chapterId === '38-cached-generation') {
        expect(termPages.map((termPage) => termPage.length)).toEqual([10, 3]);
        expect(sortedTerms).toEqual([
          'Attention-score work',
          'Cache reset',
          'Cached-generation replay',
          'Coherent cache commit',
          'Complete-prefix reference',
          'Context-limit stop',
          'EOS stop',
          'Model-wide KV cache',
          'Newest-logit equivalence',
          'One-token decode',
          'Per-layer KV cache',
          'Prompt prefill',
          'Retained prefix length',
        ]);
      }
      if (sheet.chapterId === '39-end-to-end-llm') {
        expect(termPages.map((termPage) => termPage.length)).toEqual([10, 6]);
        expect(sortedTerms).toEqual([
          'Autoregressive factorization',
          'Bitwise training replay',
          'Causal window',
          'Decoder-only LLM',
          'End-to-end LLM pipeline',
          'Exact checkpoint round trip',
          'Exact logit probe',
          'Frozen alpha-one bigram baseline',
          'Frozen document split',
          'Joint sequence probability',
          'KV-cached generation',
          'Next-token conditional distribution',
          'Same-target test-loss comparison',
          'Selection-isolated final test evaluation',
          'Training-only BPE',
          'Validation-selected state',
        ]);
      }
      const root = page.locator('[data-cheat-sheet]');
      const trigger = root.getByRole('button', { name: 'Open cheat sheet' });
      const dialog = root.getByRole('dialog', { name: sheet.title });
      const fallback = root.locator('[data-cheat-sheet-fallback]');
      const pages = dialog.locator('[data-cheat-sheet-pages]');
      const visibleTerms = dialog.locator(
        '[data-cheat-sheet-page]:not([hidden]) dt',
      );
      const pagination = dialog.getByRole('navigation', {
        name: 'Cheat sheet term pages',
      });
      const previous = dialog.getByRole('button', { name: 'Previous terms' });
      const next = dialog.getByRole('button', { name: 'Next terms' });
      const status = dialog.getByRole('status');
      const pagesId = `cheat-sheet-${sheet.chapterId}-pages`;

      await expect(root).toHaveCount(1);
      await expect(root).toHaveAttribute(
        'data-cheat-sheet-page-count',
        String(termPages.length),
      );
      await expect(trigger).toBeVisible();
      await expect(fallback).toBeHidden();
      await expect(dialog).not.toBeVisible();

      await trigger.focus();
      await trigger.click();
      await expect(dialog).toBeVisible();
      await expect(pages).toHaveAttribute('id', pagesId);
      await expect(dialog.locator('[data-cheat-sheet-page] dt')).toHaveText(
        sortedTerms,
      );
      expect(new Set(sortedTerms).size).toBe(sortedTerms.length);
      await expect(visibleTerms).toHaveText(termPages[0] ?? []);
      await expect(
        root.getByRole('button', { name: 'Close cheat sheet' }),
      ).toBeFocused();

      if (termPages.length === 1) {
        await expect(pagination).toHaveCount(0);
        await expect(previous).toHaveCount(0);
        await expect(next).toHaveCount(0);
        await expect(status).toHaveCount(0);
      } else {
        await expect(pagination).toBeVisible();
        await expect(previous).toHaveAttribute('aria-controls', pagesId);
        await expect(next).toHaveAttribute('aria-controls', pagesId);
        await expect(previous).toBeDisabled();
        await expect(next).toBeEnabled();

        for (let pageIndex = 0; pageIndex < termPages.length; pageIndex += 1) {
          const pageStatus = expectedStatus(
            pageIndex,
            termPages.length,
            sortedTerms.length,
          );
          await expect(root).toHaveAttribute(
            'data-cheat-sheet-current-page',
            String(pageIndex + 1),
          );
          await expect(visibleTerms).toHaveText(termPages[pageIndex] ?? []);
          await expect(status).toHaveText(pageStatus);
          await expect(
            dialog.getByRole('group', { name: pageStatus }),
          ).toBeVisible();
          if (pageIndex === 0) {
            await expect(previous).toBeDisabled();
          } else {
            await expect(previous).toBeEnabled();
          }
          if (pageIndex === termPages.length - 1) {
            await expect(next).toBeDisabled();
          } else {
            await expect(next).toBeEnabled();
          }

          if (pageIndex < termPages.length - 1) {
            await next.click();
          }
        }

        await expect(previous).toBeFocused();
        for (let pageIndex = termPages.length - 1; pageIndex > 0; pageIndex -= 1) {
          await previous.click();
          await expect(visibleTerms).toHaveText(termPages[pageIndex - 1] ?? []);
        }
        await expect(next).toBeFocused();
      }

      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();

      await trigger.click();
      await expect(root).toHaveAttribute('data-cheat-sheet-current-page', '1');
      await expect(visibleTerms).toHaveText(termPages[0] ?? []);
      await root.getByRole('button', { name: 'Close cheat sheet' }).click();
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    });

    test('contains every modal page at narrow width and keeps it reachable at short height', async ({
      page,
    }) => {
      const termPages = expectedPages(sheet.terms);
      await page.setViewportSize({ width: 360, height: 500 });
      await page.goto(chapterPath('en', sheet.chapterId));
      await page.getByRole('button', { name: 'Open cheat sheet' }).click();

      const dialog = page.getByRole('dialog', { name: sheet.title });
      const next = dialog.getByRole('button', { name: 'Next terms' });
      await expect(dialog).toBeVisible();

      for (let pageIndex = 0; pageIndex < termPages.length; pageIndex += 1) {
        await expect(
          dialog.locator('[data-cheat-sheet-page]:not([hidden]) dt'),
        ).toHaveText(termPages[pageIndex] ?? []);

        const geometry = await dialog.evaluate((node) => {
          const bounds = (element: Element) => {
            const rect = element.getBoundingClientRect();
            return {
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
              top: rect.top,
            };
          };
          const dialogRect = bounds(node);
          const panel = node.querySelector('.cheat-sheet-panel');
          const visiblePage = node.querySelector(
            '[data-cheat-sheet-page]:not([hidden])',
          );
          const bounded = [
            panel,
            visiblePage,
            node.querySelector('[data-cheat-sheet-pagination]'),
            node.querySelector('[data-cheat-sheet-page-status]'),
            node.querySelector('[data-cheat-sheet-previous]'),
            node.querySelector('[data-cheat-sheet-next]'),
          ]
            .filter((element): element is Element => element !== null)
            .map(bounds);
          const paintedText = Array.from(
            node.querySelectorAll(
              '[data-cheat-sheet-page]:not([hidden]) dt, [data-cheat-sheet-page]:not([hidden]) dd',
            ),
          ).flatMap((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return Array.from(range.getClientRects()).map((rect) => ({
              left: rect.left,
              right: rect.right,
            }));
          });

          return {
            bodyClientWidth: document.documentElement.clientWidth,
            bodyScrollWidth: document.documentElement.scrollWidth,
            bounded,
            dialog: dialogRect,
            dialogClientWidth: node.clientWidth,
            dialogScrollWidth: node.scrollWidth,
            paintedText,
            viewport: { height: window.innerHeight, width: window.innerWidth },
          };
        });

        expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(
          geometry.bodyClientWidth + 1,
        );
        expect(geometry.dialogScrollWidth).toBeLessThanOrEqual(
          geometry.dialogClientWidth + 1,
        );
        expect(geometry.dialog.left).toBeGreaterThanOrEqual(0);
        expect(geometry.dialog.right).toBeLessThanOrEqual(
          geometry.viewport.width,
        );
        expect(geometry.dialog.top).toBeGreaterThanOrEqual(0);
        expect(geometry.dialog.bottom).toBeLessThanOrEqual(
          geometry.viewport.height,
        );
        for (const bounds of geometry.bounded) {
          expect(bounds.left).toBeGreaterThanOrEqual(geometry.dialog.left - 1);
          expect(bounds.right).toBeLessThanOrEqual(geometry.dialog.right + 1);
        }
        for (const ink of geometry.paintedText) {
          expect(ink.left).toBeGreaterThanOrEqual(geometry.dialog.left - 1);
          expect(ink.right).toBeLessThanOrEqual(geometry.dialog.right + 1);
        }

        const reachability = await dialog.evaluate((node) => {
          node.scrollTop = node.scrollHeight;
          const target =
            node.querySelector('[data-cheat-sheet-pagination]') ??
            Array.from(
              node.querySelectorAll(
                '[data-cheat-sheet-page]:not([hidden]) .cheat-sheet-term',
              ),
            ).at(-1);
          const dialogRect = node.getBoundingClientRect();
          const targetRect = target?.getBoundingClientRect();
          return {
            clientHeight: node.clientHeight,
            dialogBottom: dialogRect.bottom,
            dialogTop: dialogRect.top,
            scrollHeight: node.scrollHeight,
            scrollTop: node.scrollTop,
            targetBottom: targetRect?.bottom ?? Number.NaN,
            targetTop: targetRect?.top ?? Number.NaN,
          };
        });
        expect(
          reachability.scrollTop + reachability.clientHeight,
        ).toBeGreaterThanOrEqual(reachability.scrollHeight - 1);
        expect(reachability.targetTop).toBeGreaterThanOrEqual(
          reachability.dialogTop - 1,
        );
        expect(reachability.targetBottom).toBeLessThanOrEqual(
          reachability.dialogBottom + 1,
        );

        if (pageIndex < termPages.length - 1) {
          await next.click();
          expect(
            await dialog.evaluate((node) => node.scrollTop),
          ).toBeLessThanOrEqual(1);
        }
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

      const sortedTerms = expectedPages(sheet.terms).flat();
      const root = page.locator('[data-cheat-sheet]');
      const fallback = root.locator('[data-cheat-sheet-fallback]');
      await expect(root.locator('[data-cheat-sheet-open]')).toBeHidden();
      await expect(fallback).toBeVisible();
      await expect(fallback).not.toHaveAttribute('open', '');
      await fallback.locator('summary').click();
      await expect(fallback).toHaveAttribute('open', '');
      await expect(fallback.locator('dt')).toHaveText(sortedTerms);
      await expect(fallback.locator('[data-cheat-sheet-pagination]')).toHaveCount(0);
      await expect(fallback.locator('[data-cheat-sheet-page]')).toHaveCount(0);
      expect(await fallback.locator('dt:visible').count()).toBe(sortedTerms.length);
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

test('Chapter 0 and Russian chapters remain sheet-free', async ({
  page,
}) => {
  await page.goto(chapterPath('en', '00-llm-parts'));
  await expect(page.locator('[data-cheat-sheet]')).toHaveCount(0);

  for (const sheet of sheets) {
    await page.goto(chapterPath('ru', sheet.chapterId));
    await expect(page.locator('[data-cheat-sheet]')).toHaveCount(0);
  }
});
