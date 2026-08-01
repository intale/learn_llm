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
  '14-scalar-autodiff': {
    file: '14-scalar-autodiff.json',
    lesson: '14-scalar-autodiff.mdx',
    title: 'Accumulate gradients through a scalar graph',
    entries: [
      ['Computation graph', 'One scalar value stored in the computation graph.'],
      ['Reverse mode', 'Baydin et al. describe reverse mode as recording dependencies'],
      ['Adjoint', 'pass-local adjoint'],
      ['Operand-use edge', 'operand-use edges'],
      ['Local derivative', 'local derivative'],
      ['Reverse topological order', 'topological list is traversed in reverse'],
      ['Gradient accumulation', 'Accumulation across separate backward calls'],
      ['Backward pass', 'Every backward call computes a fresh pass'],
      ['Detach', 'detached branch has no edge to the original'],
      ['Zeroing gradients', 'clears every reachable tracked node'],
    ],
  },
  '15-tensor-autodiff-core': {
    file: '15-tensor-autodiff-core.json',
    lesson: '15-tensor-autodiff-core.mdx',
    title: 'Reverse tensor operations with edge-local VJPs',
    entries: [
      ['Tensor autodiff tape', 'reusable eight-node tensor tape'],
      ['Vector-Jacobian product (VJP)', 'Apply one edge-local VJP instead of building a Jacobian'],
      ['Jacobian', 'The conceptual Jacobian'],
      ['Operand-use edge', 'operand-use edge'],
      ['Upstream adjoint', 'fresh upstream adjoint'],
      ['Parent adjoint', 'fresh parent-adjoint accumulator'],
      ['Broadcast reversal', 'Explicit broadcast sums missing'],
      ['Reduction VJP', 'reductions save their axis, retained-dimension choice, and input extent'],
      ['Non-scalar seed', 'non-scalar seed'],
      ['Graph retention', 'A retained second pass recomputes fresh intermediates'],
    ],
  },
  '16-model-autodiff-ops': {
    file: '16-model-autodiff-ops.json',
    lesson: '16-model-autodiff-ops.mdx',
    title: 'Reverse the operations that turn token IDs into loss',
    entries: [
      ['Embedding table', 'three-row embedding table'],
      ['Row gather', 'Row gather materializes'],
      ['Token ID', 'four token IDs'],
      ['Repeated selector', 'Repeated selectors therefore accumulate'],
      ['Scatter-add', 'embedding scatter-add'],
      ['Matrix VJP', 'Matrix VJPs transpose'],
      ['SiLU', "SiLU's derivative at zero"],
      ['Log-softmax', 'log-softmax produces'],
      ['Indexed mean NLL', 'combined indexed mean NLL'],
      ['Loss-logit gradient', 'target-logit gradient'],
    ],
  },
  '17-parameter-initialization': {
    file: '17-parameter-initialization.json',
    lesson: '17-parameter-initialization.mdx',
    title: 'Initialize trainable weights reproducibly',
    entries: [
      ['Parameter initialization', 'Initialize a projection of shape'],
      ['Hidden-unit symmetry', "preserves the hidden units' equality"],
      ['Fan-in', 'fan-in'],
      ['Fan-out', 'fan-out'],
      ['Xavier-style initialization', 'Xavier-style rule'],
      ['Target variance', 'target variance'],
      ['Uniform bound', 'uniform bound'],
      ['Seed', 'The seed is the raw state'],
      ['Reproducibility', 'The same seed, shape, fan values, and construction order'],
      ['Pseudorandom generator', 'deterministic pseudorandom'],
    ],
  },
  '18-token-embeddings': {
    file: '18-token-embeddings.json',
    lesson: '18-token-embeddings.mdx',
    title: 'Give token IDs trainable vectors',
    entries: [
      ['Token embedding', 'Transformers keep learned token embeddings'],
      ['Embedding table', 'trainable token table'],
      ['Vocabulary size', 'vocabulary size'],
      ['Embedding width', 'embedding width'],
      ['Token ID', 'integer token ID'],
      ['Direct row lookup', 'direct row lookup'],
      ['One-hot vector', 'One-hot vectors make token identity explicit'],
      ['Gather operation', 'calls the Chapter 16 gather operation'],
      ['Repeated-token gradient', 'repeated-token gradients add'],
      ['Scatter-add', 'scatter-add algorithm'],
    ],
  },
  '19-linear-layers': {
    file: '19-linear-layers.json',
    lesson: '19-linear-layers.mdx',
    title: "Mix each token's features with one learned projection",
    entries: [
      ['Linear layer', 'linear layer'],
      ['Learned projection', 'learned projection'],
      ['Input feature width', 'input feature width'],
      ['Output feature width', 'output feature width'],
      ['Leading axes', 'leading axes'],
      ['Weight matrix', 'trainable matrix'],
      ['Bias', 'optional named bias'],
      ['Affine map', 'affine rather than strictly linear'],
      ['Parameter sharing', 'Because every position shares'],
      ['Bias-free projection', 'bias-free policy'],
    ],
  },
  '20-swiglu-feed-forward': {
    file: '20-swiglu-feed-forward.json',
    lesson: '20-swiglu-feed-forward.mdx',
    title: 'Let one learned branch gate another',
    entries: [
      ['SwiGLU', 'bias-free SwiGLU sublayer'],
      ['Position-wise feed-forward network', 'feed-forward network separately at every sequence position'],
      ['Gate projection', 'owns gate, up, and down'],
      ['Up projection', 'second projection before the output projection'],
      ['Down projection', 'down projection'],
      ['SiLU', 'SiLU uses a sigmoid internally'],
      ['Sigmoid', 'sigmoid internally'],
      ['Elementwise product', 'two projected branches meet through elementwise multiplication'],
      ['Feed-forward width', 'input, branch, and output feature widths'],
      ['Position independence', 'SwiGLU transforms positions independently'],
    ],
  },
  '21-mini-batches': {
    file: '21-mini-batches.json',
    lesson: '21-mini-batches.mdx',
    title: 'Count real tokens in every mini-batch',
    entries: [
      ['Causal window', 'separate causal windows'],
      ['Mini-batch', 'mini-batches of fixed-length rows'],
      ['Requested batch capacity', 'With requested capacity'],
      ['Smaller final batch', 'The final batch stays smaller'],
      ['Target occurrence', 'target occurrences'],
      ['Actual target-token denominator', 'actual target-token denominator'],
      ['Token-mean gradient', 'token-mean loss plus gradient coordinates'],
      ['Raw accumulator', 'raw accumulators'],
      ['Token-weighted mean', 'token-weighted mean'],
      ['No-padding batch', 'no padding'],
    ],
  },
  '22-adamw': {
    file: '22-adamw.json',
    lesson: '22-adamw.mdx',
    title: 'Keep decay out of the gradient moments',
    entries: [
      ['AdamW', 'AdamW instead moves the shrinkage term outside'],
      ['First gradient moment', 'first raw gradient moment'],
      ['Second gradient moment', 'second raw moment tracks recent squared magnitude'],
      ['Bias correction', 'corrects their early zero-initialization bias'],
      ['Adaptive update', 'adaptive delta'],
      ['Decoupled weight decay', 'moves parameter-proportional decay outside the gradient'],
      ['Learning rate', 'is the learning rate'],
      ['Numerical stabilizer', 'stabilizes the adaptive denominator'],
      ['Decay group', 'decay-group parameter'],
      ['No-decay group', 'no-decay parameter'],
    ],
  },
  '23-neural-ngram': {
    file: '23-neural-ngram.json',
    lesson: '23-neural-ngram.mdx',
    title: 'Train a fixed-context neural language model',
    entries: [
      ['Neural n-gram', 'The neural n-gram is'],
      ['Fixed context', 'a concatenated fixed context'],
      ['Token embedding', 'maps a token ID to'],
      ['Context concatenation', 'concatenate those rows in chronological order'],
      ['SwiGLU hidden layer', 'SwiGLU receives'],
      ['Vocabulary projection', 'a vocabulary projection for next-token prediction'],
      ['Next-token logit', 'next-token logits'],
      ['Indexed mean loss', 'The indexed mean loss is'],
      ['Held-out validation loss', 'held-out validation loss falls'],
      ['Greedy generation', 'greedy generation'],
    ],
  },
  '24-residual-connections': {
    file: '24-residual-connections.json',
    lesson: '24-residual-connections.mdx',
    title: 'Keep an identity path around each learned update',
    entries: [
      ['Residual connection', 'The entire residual connection is'],
      ['Identity path', 'identity path'],
      ['Residual branch', 'learned branch mapping'],
      ['Residual stream', 'residual stream'],
      ['Learned update', 'learned update'],
      ['Exact-shape merge', 'exact-shape merge'],
      ['Vector-Jacobian product', 'vector-Jacobian product'],
      ['Upstream adjoint', 'upstream output adjoint'],
      ['Gradient accumulation', 'gradient contributions accumulate'],
      ['Branch Jacobian', 'branch Jacobian'],
    ],
  },
  '25-rmsnorm': {
    file: '25-rmsnorm.json',
    lesson: '25-rmsnorm.mdx',
    title: 'Normalize feature scale without centering',
    entries: [
      ['RMSNorm', 'For one final-axis vector, RMSNorm is'],
      ['Mean square', 'compute the mean square'],
      ['Reciprocal RMS', 'The reciprocal RMS'],
      ['Root-mean-square scale', 'root-mean-square scale'],
      ['Learned gain', 'The learned gain'],
      ['Epsilon stabilizer', 'stabilizes the reciprocal square root'],
      ['Final feature axis', 'final feature axis'],
      ['Approximate scale invariance', 'scale-invariant away from zero'],
      ['Pre-normalization', 'A pre-normalized decoder'],
      ['LayerNorm', 'LayerNorm centers the anchor'],
    ],
  },
  '26-qkv-projections': {
    file: '26-qkv-projections.json',
    lesson: '26-qkv-projections.mdx',
    title: 'Create query, key, and value views',
    entries: [
      ['Query, key, and value projections', 'query, key, and value projections'],
      ['Hidden-state tensor', 'hidden-state tensor entering self-attention'],
      ['Model width', 'is the input feature width'],
      ['Head width', 'is the output width for this one-head chapter'],
      ['Query view', 'is the query view'],
      ['Key view', 'is the key view'],
      ['Value view', 'is the value view'],
      ['Self-attention', 'define self-attention over one sequence'],
      ['Bias-free projection', 'three independent bias-free projections'],
      ['Independent projection weights', 'are independent learned weights'],
    ],
  },
  '27-self-attention': {
    file: '27-self-attention.json',
    lesson: '27-self-attention.mdx',
    title: 'Compute one unmasked self-attention head',
    entries: [
      ['Scaled dot-product self-attention', 'scaled dot-product attention'],
      ['Unmasked attention', 'unmasked scaled dot-product attention head'],
      ['Query', 'one query row per token position'],
      ['Key', 'candidate key rows'],
      ['Value', 'value rows whose content is mixed'],
      ['Attention score', 'score row'],
      ['Query/key width', 'shared query/key width'],
      ['Square-root scaling', 'square-root scaling'],
      ['Row-wise softmax', 'Softmax runs across key positions independently for each query'],
      ['Attention weight', 'a retrieval weight'],
      ['Weighted value mixture', 'weighted value mixture'],
    ],
  },
  '28-causal-masking': {
    file: '28-causal-masking.json',
    lesson: '28-causal-masking.mdx',
    title: 'Block future keys with a causal mask',
    entries: [
      ['Causal mask', 'each query attends only to its available prefix'],
      ['Inclusive diagonal', 'The diagonal is deliberately allowed'],
      ['Additive mask', 'use the additive mask'],
      ['Query row', 'For query row'],
      ['Key column', 'key column'],
      ['Allowed prefix', 'Each allowed prefix keeps the full'],
      ['Blocked future key', 'after the future keys are excluded'],
      ['Causal softmax', 'causal_softmax'],
      ['Shifted decoder input', 'Decoder inputs are shifted by one target position'],
      ['Prefix invariance', 'prefix-invariance result'],
      ['Position signal', 'absolute or relative position signal'],
    ],
  },
  '29-rope': {
    file: '29-rope.json',
    lesson: '29-rope.mdx',
    title: 'Turn query and key pairs with RoPE',
    entries: [
      ['Rotary position embedding (RoPE)', 'geometry to query-key scores'],
      ['Adjacent coordinate pair', 'pairs coordinates'],
      ['Rotation matrix', 'rotation matrix'],
      ['Pair frequency', 'one adjacent coordinate pair and its frequency'],
      ['Frequency base', 'positive finite base'],
      ['Absolute position', 'rotations receive absolute positions'],
      ['Signed relative position', 'signed position of the key relative to the query'],
      ['Equal-shift invariance', 'adding the same offset to both positions'],
      ['Orthogonal rotation', 'preserves squared norm and therefore norm'],
      ['Query-key rotation', 'values $V$ are not rotated here'],
      ['Causal mask', 'mask still blocks future keys'],
    ],
  },
  '30-multi-head-attention': {
    file: '30-multi-head-attention.json',
    lesson: '30-multi-head-attention.mdx',
    title: 'Keep attention head-local until output mixing',
    entries: [
      ['Multi-head causal self-attention', 'complete multi-head causal self-attention layer'],
      ['Packed Q/K/V projections', 'first lets every $W_i^Q$, $W_i^K$, and $W_i^V$ read the whole input row'],
      ['Model width', 'input and output width of the complete layer'],
      ['Head count', 'number of independently normalized attention heads'],
      ['Head width', 'is the width of one head; it is even here'],
      ['Head split', 'transpose then produce'],
      ['Per-head RoPE', 'apply RoPE only to its query and key rows'],
      ['Per-head causal attention', "softmax runs separately over each head's key"],
      ['Head output', "is head $i$'s weighted value mixture"],
      ['Head concatenation', 'it does not normalize or mix them'],
      ['Output projection', 'only multiplication by $W_O$ permits'],
    ],
  },
  '31-decoder-block': {
    file: '31-decoder-block.json',
    lesson: '31-decoder-block.mdx',
    title: 'Compose a pre-norm decoder block in exact order',
    entries: [
      ['Pre-normalized decoder block', 'pre-normalized decoder block'],
      ['Residual stream', 'model-width residual stream entering the block'],
      ['Attention RMSNorm', 'Attention RMSNorm input'],
      ['Causal multi-head attention', 'causal multi-head attention'],
      ['First residual merge', 'first residual merge'],
      ['Feed-forward RMSNorm', 'feed-forward RMSNorm'],
      ['SwiGLU feed-forward branch', 'SwiGLU feed-forward branch'],
      ['Second residual merge', 'second residual merge'],
      ['Identity path', 'identity path'],
      ['Post-norm order', 'post-norm order'],
    ],
  },
  '32-decoder-model': {
    file: '32-decoder-model.json',
    lesson: '32-decoder-model.mdx',
    title: 'Trace one tied table through a decoder stack',
    entries: [
      ['Decoder stack', 'one decoder stack'],
      ['Decoder depth', 'decoder depth'],
      ['Distinct decoder blocks', 'Two distinct decoder blocks'],
      ['Embedding lookup', 'Embedding lookup'],
      ['Final RMSNorm', 'Final RMSNorm'],
      ['Weight tying', 'Weight tying is stronger than equal initialization'],
      ['Tied projection', 'Tied projection'],
      ['Vocabulary logits', 'vocabulary logits'],
      ['Mean indexed negative log likelihood', 'mean indexed negative log likelihood'],
      ['Prefix invariance', 'prefix invariance'],
      ['Tied gradient accumulation', 'adds both contributions on the same leaf'],
    ],
  },
} as const;

const exactDefinitions = {
  '12-stable-softmax': {
    Underflow: 'A finite-precision effect where a tiny magnitude becomes subnormal or rounds to zero.',
  },
  '15-tensor-autodiff-core': {
    'Reduction VJP': 'A reverse rule that reinserts and broadcasts a reduced axis, dividing by its extent for a mean.',
  },
  '16-model-autodiff-ops': {
    'Indexed mean NLL': 'Average negative log-likelihood over examples or token positions, selecting one target class in each row.',
    'Loss-logit gradient': 'Gradient of mean token loss with respect to every class logit in each row.',
  },
  '19-linear-layers': {
    'Affine map': 'A matrix transformation followed by addition of a fixed or trainable bias vector.',
  },
  '27-self-attention': {
    'Attention weight': 'A normalized retrieval coefficient for one query-key pair, not confidence in correctness.',
  },
  '28-causal-masking': {
    'Causal mask': 'An attention visibility rule allowing each query to use its own key and all earlier keys, but no later keys.',
    'Shifted decoder input': 'A training input offset by one target position so the allowed diagonal contains an earlier known token, not the predicted target.',
    'Position signal': 'Separate absolute or relative information that distinguishes token order; the causal mask provides visibility, not position.',
  },
  '29-rope': {
    'Absolute position': "The token index supplied to RoPE when determining each pair's local angle.",
    'Signed relative position': 'The key position minus the query position, preserving direction rather than only distance.',
    'Query-key rotation': 'RoPE rotates queries and keys while leaving value vectors unrotated in this lesson.',
    'Causal mask': 'The separate visibility rule blocking future key positions independently of RoPE geometry.',
  },
  '30-multi-head-attention': {
    'Multi-head causal self-attention': 'An attention layer that computes separately normalized causal attention in several projected head views before concatenation and output mixing.',
    'Packed Q/K/V projections': "Three dense model-width maps applied before the head split; every head's output columns can read and mix all input features.",
    'Model width': "The feature count of the complete layer's input and output, restored after all head outputs are concatenated.",
    'Head count': 'The number of independently normalized attention heads, required here to be nonzero and divide model width exactly.',
    'Head width': 'The feature count inside one head, equal to model width divided by head count and even for this RoPE design.',
    'Head split': 'A reshape and transpose of projected queries, keys, and values into a head axis, performed only after their dense projections.',
    'Per-head RoPE': 'Pairwise position rotations applied independently inside each head to queries and keys, while values remain unrotated.',
    'Per-head causal attention': "Each head's masked scaled-score table, row softmax over key positions, and weighted value mixture, normalized independently of other heads.",
    'Head output': "The weighted mixture of unrotated value rows produced by one head using that head's causal attention probabilities.",
    'Head concatenation': 'A parameter-free join of completed head outputs along the final feature axis that restores model width without averaging or mixing.',
    'Output projection': 'The learned map after concatenation that can recombine completed head features, while earlier dense query, key, and value maps may already mix input features.',
  },
  '31-decoder-block': {
    'Pre-normalized decoder block': "A block that normalizes each sublayer input, runs its transformation, then adds the result to that branch's entering residual stream.",
    'Residual stream': 'A same-shaped model-width tensor updated by each branch while preserving a direct identity route.',
    'Attention RMSNorm': 'The first independently parameterized normalization, applied to the block input before causal attention.',
    'Causal multi-head attention': 'The token-mixing first branch that attends only to the current and earlier token positions.',
    'First residual merge': 'The addition of causal-attention output to the unchanged block input, producing the intermediate stream.',
    'Feed-forward RMSNorm': 'The second independently parameterized normalization, applied to the intermediate stream before SwiGLU.',
    'SwiGLU feed-forward branch': 'The per-token feature transformation whose model-width output returns to the second residual merge.',
    'Second residual merge': 'The addition of the SwiGLU output to the unchanged intermediate stream, producing the block output.',
    'Identity path': "A bypass that carries a branch's entering residual value unchanged around its learned transformation.",
    'Post-norm order': 'The contrasting layout that performs a residual merge before applying LayerNorm to the merged value.',
  },
  '32-decoder-model': {
    'Decoder stack': 'The ordered sequence of zero or more causal decoder blocks between token lookup and final normalization.',
    'Decoder depth': 'The configured number of repeated decoder blocks; zero is valid and makes the empty block composition the identity.',
    'Distinct decoder blocks': 'Repeated blocks with the same configuration but separately owned parameters, so matching structure does not imply shared weights.',
    'Embedding lookup': 'Gathering one row from the vocabulary-by-feature table for each input token ID, producing model-width feature vectors.',
    'Final RMSNorm': 'The independently parameterized learned-gain normalization applied after the entire block stack, including at zero depth.',
    'Weight tying': 'Using one parameter table for both token lookup and vocabulary scoring, not two separate tables that merely start with equal values.',
    'Tied projection': 'Multiplying final hidden states by a differentiable transpose view of the embedding table instead of a separate output-head parameter.',
    'Vocabulary logits': 'The unnormalized output scores over every vocabulary item at each batch and token position, distinct from the scalar training loss.',
    'Mean indexed negative log likelihood': "The scalar loss formed by selecting each target token's negative log probability and averaging over all batch-position pairs.",
    'Prefix invariance': 'The causal guarantee that changing only a later token leaves every earlier logit row bitwise unchanged.',
    'Tied gradient accumulation': "Reverse-mode addition of the table's lookup-role gradient and output-role gradient onto the one shared parameter leaf.",
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

      for (const [term, definition] of Object.entries(
        exactDefinitions[chapterId as keyof typeof exactDefinitions] ?? {},
      )) {
        expect(sheet.terms.find((entry) => entry.term === term)?.definition).toBe(
          definition,
        );
      }
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
