---
{
  "chapter_id": "29-rope",
  "concept_id": "rotary-position-embedding",
  "content_revision": 1,
  "order": 29,
  "objective": {
    "en": "Rotate query and key feature pairs by absolute position, then observe relative offsets in their dot products."
  },
  "worked_inputs": {
    "en": "First predict a single pair with $q=[1,0]$, $k=[0,1]$, and $\\theta_0=1$: compare $(m,n)=(0,0)$, $(1,0)$, and the common shift $(3,2)$. Then inspect the Rust fixture, which repeats $[1,0,1,0]$ at positions $0,1,2$ with $b=100$."
  },
  "formula": {
    "latex": "\\left(\\operatorname{RoPE}(x_m)\\right)_{2k:2k+2}=R(m\\theta_k)(x_m)_{2k:2k+2}",
    "symbols": [
      {
        "symbol": "\\operatorname{RoPE}",
        "en": "the pairwise rotary position transformation applied independently to a query or key"
      },
      {
        "symbol": "x_m",
        "en": "one query or key feature vector assigned to zero-based absolute position m"
      },
      {
        "symbol": "m",
        "en": "the absolute position, including the sequence offset supplied by the caller"
      },
      {
        "symbol": "k",
        "en": "the feature-pair and frequency index from zero through d/2 minus one"
      },
      {
        "symbol": "2k:2k+2",
        "en": "the half-open slice selecting adjacent coordinates 2k and 2k+1"
      },
      {
        "symbol": "R",
        "en": "the counterclockwise two-dimensional rotation matrix"
      },
      {
        "symbol": "\\theta_k",
        "en": "the radians advanced per position by feature pair k"
      },
      {
        "symbol": "b",
        "en": "the positive finite frequency base; the teaching fixture uses 100"
      },
      {
        "symbol": "d",
        "en": "the nonzero even query or key feature width"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "neural-architecture",
      "limitation": {
        "en": "Recurrent neural language models carried token order through a state updated one step at a time; removing recurrence made order unavailable unless the attention model received explicit position information."
      },
      "later_advance": {
        "en": "The original Transformer added fixed sinusoidal or learned position vectors to input embeddings. RoFormer instead rotates query and key feature pairs by absolute position so their inner product exposes a relative offset."
      },
      "modern_llm_role": {
        "en": "Rotary position embeddings are used by influential decoder-only LLMs such as the original LLaMA, which applies RoPE at every layer; they shape query-key scores while causal masking remains a separate visibility rule."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://arxiv.org/abs/1706.03762",
          "claim": {
            "en": "Vaswani et al. remove recurrence and convolution, add position encodings to input embeddings, use multiple sinusoidal frequencies, and report a learned-position alternative with nearly identical translation results in their comparison."
          }
        },
        {
          "role": "later",
          "year": 2021,
          "name": "Su et al., RoFormer: Enhanced Transformer with Rotary Position Embedding",
          "source_url": "https://arxiv.org/abs/2104.09864",
          "claim": {
            "en": "Su et al. encode absolute position with rotations of query and key subspaces and derive a self-attention inner product whose positional term uses the difference between their positions."
          }
        },
        {
          "role": "later",
          "year": 2023,
          "name": "Touvron et al., LLaMA: Open and Efficient Foundation Language Models",
          "source_url": "https://arxiv.org/abs/2302.13971",
          "claim": {
            "en": "Touvron et al. document that the original LLaMA removes absolute positional embeddings and adds RoPE at each layer of its Transformer network."
          }
        }
      ]
    },
    "approach": {
      "en": "From sequence order carried by recurrent state, through position vectors added to embeddings, to multiplicative query-key rotations"
    },
    "summary": {
      "en": "Attention without a position signal cannot distinguish a consistent reordering of otherwise identical content. Absolute rotary angles restore position information, while shared rotation algebra makes a fixed query-key dot product depend on their relative offset as well as their contents and pair frequencies."
    },
    "rust_contrast": "Emit precomputed tables, exact adjacent-pair rotations, the complete relative-offset dot grid, a common-shift replay, and the inverse-rotation VJP. This exposes the model invariant without attributing the course API, base, layout, rounding, or trace grammar to the papers."
  },
  "rust": {
    "package": "ch29-rope",
    "sources": [
      "rust/crates/llm-from-scratch/src/attention/rope.rs",
      "rust/crates/llm-from-scratch/src/autograd/model_ops.rs",
      "rust/crates/llm-from-scratch/src/autograd/tensor_core.rs",
      "rust/demos/ch29-rope/src/lib.rs",
      "rust/demos/ch29-rope/src/main.rs",
      "rust/demos/ch29-rope/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=29-rope\nprediction=position zero is the identity; equal shifts preserve every fixed query-key dot product\nconfig=features:4 pairs:2 positions:6 base:100 layout:adjacent offset:0->3\ninverse_frequencies=[1.000000,0.100000]\nquery=shape:[3,4] values:[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000]\nkey=shape:[3,4] values:[1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000,1.000000,0.000000]\nangles=shape:[3,2] values:[0.000000,0.000000,1.000000,0.100000,2.000000,0.200000]\ncosines=shape:[3,2] values:[1.000000,1.000000,0.540302,0.995004,-0.416147,0.980067]\nsines=shape:[3,2] values:[0.000000,0.000000,0.841471,0.099833,0.909297,0.198669]\nrotated_query=[1.000000,0.000000,1.000000,0.000000,0.540302,0.841471,0.995004,0.099833,-0.416147,0.909297,0.980067,0.198669]\nrotated_key=[1.000000,0.000000,1.000000,0.000000,0.540302,0.841471,0.995004,0.099833,-0.416147,0.909297,0.980067,0.198669]\nnorms=input:[1.414214,1.414214,1.414214] rotated:[1.414214,1.414214,1.414214] shifted:[1.414214,1.414214,1.414214] preserved:true\ndot_grid=shape:[3,3] values:[2.000000,1.535306,0.563920,1.535306,2.000000,1.535306,0.563920,1.535306,2.000000]\nshifted_dot_grid=shape:[3,3] values:[2.000000,1.535306,0.563920,1.535306,2.000000,1.535306,0.563920,1.535306,2.000000] common_shift_preserved:true\nposition_zero_identity=true\nupstream=query:[1.000000,-0.500000,0.250000,0.750000,-0.300000,0.800000,1.200000,-0.400000,0.600000,0.100000,-0.700000,0.900000] key:[-0.200000,0.400000,0.900000,-0.600000,0.500000,1.100000,-0.800000,0.300000,1.000000,-0.900000,0.200000,0.700000] loss:2.479438\nquery_gradient=[1.000000,-0.500000,0.250000,0.750000,0.511086,0.684683,1.154072,-0.517802,-0.158758,-0.587193,-0.507244,1.021128]\nkey_gradient=[-0.200000,0.400000,0.900000,-0.600000,1.195769,0.173597,-0.766053,0.378368,-1.234515,-0.534765,0.335082,0.646313]\nshapes=rank3:[2,3,4] rank4:[2,2,3,4] empty_leading:[0,3,4] empty_tokens:[2,0,4]\nerrors=zero_width:true odd_width:true invalid_base:true rank:true width_mismatch:true range:true overflow:true released:true\ngradcheck=query_checks:12 key_checks:12 tolerance:0.000004 passed:true\nhistory=earlier:recurrent-order-in-state transformer:absolute-vectors-added-to-embeddings rotary:absolute-qk-rotations-relative-dot modern_example:llama-rope-each-layer causal_boundary:separate-mask\nproof=tape_finite:true norm_preserved:true relative_dot:true replay:bitwise\nnext=split the position-aware feature axis into multiple attention heads\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "rotary-position-pairs",
    "rationale": {
      "en": "Position rows make each fast and slow pair rotation inspectable, while a query-by-key dot grid reveals repeated values along equal relative offsets and a common-shift comparison proves the local invariant."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder can now rotate each query and key row before the Chapter 28 causal score computation. Chapter 30 partitions that position-aware feature axis into multiple heads, applies attention per head, concatenates the results, and projects them."
  },
  "terminology": [
    {
      "concept_id": "rotary-position-embedding",
      "en": "rotary position embedding"
    },
    {
      "concept_id": "feature-pair",
      "en": "adjacent feature pair"
    },
    {
      "concept_id": "inverse-frequency",
      "en": "inverse frequency"
    },
    {
      "concept_id": "position-offset",
      "en": "absolute position offset"
    },
    {
      "concept_id": "relative-offset",
      "en": "relative query-key offset"
    }
  ],
  "translation_notes": [
    "Chapter 29 has the exact active locale set {en}. Russian is registered but inactive, so this contract intentionally has no ru keys and no Russian lesson or placeholder route.",
    "Keep RoPE, R, x_m, q_m, k_n, m, n, k, b, d, theta, coordinate slices, shapes, source roles, URLs, trace tokens, and numeric values unchanged when another locale is activated later.",
    "RoPE receives absolute positions. The relative offset appears after combining query and key rotations in their dot product; never say that the API receives a relative index.",
    "The relative-dot statement concerns fixed query and key contents. It does not make a complete decoder prediction invariant to shifting a sequence.",
    "Rotate queries and keys, not values. Keep Chapter 28's causal mask separate: rotation shapes scores, while masking controls which key positions are visible.",
    "Adjacent coordinate pairs, base 100 in the teaching fixture, exact error precedence, tolerances, fixed decimals, and trace grammar are course-local choices rather than universal RoPE requirements.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace provenance, and literal program data. The neural-model history and mathematics remain language-independent.",
    "Render every learner-facing mathematical expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data."
  ],
  "acceptance_examples": [
    {
      "input": "Rotate the frozen four-feature row at positions zero, one, and two",
      "expected": "Position zero is the bitwise identity; the first pair advances by 1 radian per position and the second by 0.1 radians, producing the exact fixed-decimal rows in expected.txt."
    },
    {
      "input": "Compare every frozen query position with every frozen key position",
      "expected": "The three-by-three dot grid is [[2,1.535306,0.563920],[1.535306,2,1.535306],[0.563920,1.535306,2]], so equal relative offsets repeat along diagonals."
    },
    {
      "input": "Shift both three-position inputs from positions zero through two to positions three through five",
      "expected": "Absolute rotated coordinates change, but all nine query-key dot products match the original grid within 0.000000000001."
    },
    {
      "input": "Compare vector norms before rotation, after the original rotation, and after the common shift",
      "expected": "Every norm remains 1.414214 within the invariant tolerance because each pair uses an orthogonal rotation."
    },
    {
      "input": "Backpropagate the frozen query and key output seeds",
      "expected": "The VJP applies the transposed pair rotation, every saved tensor stays finite, and all 12 query plus 12 key coordinates pass central differences within 0.000004."
    },
    {
      "input": "Use rank-two, rank-three, rank-four, empty-leading, and empty-token layouts",
      "expected": "The operation preserves every shape, treats the penultimate axis as tokens, treats the final axis as features, and accepts offset equal to capacity only for an empty token interval."
    },
    {
      "input": "Supply zero or odd width, invalid base, rank one, the wrong final width, an out-of-range or overflowing offset, or a released tape",
      "expected": "The typed boundary rejects the first invalid condition without publishing a partial rotated tensor."
    },
    {
      "input": "cargo run --quiet --locked -p ch29-rope",
      "expected": "stdout equals rust/demos/ch29-rope/expected.txt byte for byte, including the final newline."
    },
    {
      "input": "cargo run --quiet --locked -p ch29-rope --example diagram_trace",
      "expected": "stdout equals rust/demos/ch29-rope/diagram-trace.txt byte for byte and follows the exact 29-line Chapter 29 trace grammar."
    }
  ]
}
---

# Chapter 29: Rotary positional embeddings

<!-- contract-section:scope -->
## Scope

This chapter gives query and key rows a position signal without changing the
Chapter 28 visibility boundary. It teaches why content-only self-attention is
equivariant to a consistent token permutation, adjacent two-coordinate
rotations on the final feature axis, fixed frequencies, nonzero even width,
absolute positions plus a checked sequence offset, norm preservation, the
relative-dot identity, and the inverse rotation used by reverse mode.

Values remain unchanged, and the causal mask remains a separate operation.
Partial rotary dimensions, alternative coordinate layouts, multi-head
split/merge, output projection, cache storage, prefill, long-context frequency
scaling, and context-extension claims remain deferred.

<!-- contract-section:worked-inputs -->
## Worked inputs

Start with one pair and the first frequency, $\theta_0=1$. Let
$q=[1,0]$ and $k=[0,1]$. At $m=n=0$, neither vector moves and
$q^\top k=0$. At $m=1$ and $n=0$,

$$
R(1)q\approx[0.540302,0.841471],\qquad R(0)k=[0,1],
$$

so their dot product is approximately $0.841471$. Shift both absolute
positions by $2$: the pair $(m,n)=(3,2)$ keeps $n-m=-1$, so the dot
product remains approximately $0.841471$ even though both rotated coordinates
change. Predict this before running the example.

The Rust fixture then uses two pairs with $d=4$, $b=100$, and three repeated
rows $[1,0,1,0]$. Its frequencies are $[1,0.1]$, which makes one pair turn ten
times more slowly than the other. The complete query-key grid reveals the
relative-offset pattern rather than hiding it in one scalar.

<!-- contract-section:formula -->
## Formula and symbols

For each adjacent pair,

$$
\left(\operatorname{RoPE}(x_m)\right)_{2k:2k+2}
=R(m\theta_k)(x_m)_{2k:2k+2}.
$$

The counterclockwise rotation and fixed frequency schedule are

$$
R(\phi)=
\begin{bmatrix}
\cos\phi&-\sin\phi\\
\sin\phi&\cos\phi
\end{bmatrix},
\qquad
\theta_k=b^{-2k/d}.
$$

Thus $m=0$ is the identity. Orthogonality preserves each pair norm:

$$
R(\phi)^\top R(\phi)=I,
\qquad
\lVert R(\phi)x\rVert_2=\lVert x\rVert_2.
$$

For the $k$th query and key pairs,

$$
\bigl(R(m\theta_k)q_m^{(k)}\bigr)^\top
\bigl(R(n\theta_k)k_n^{(k)}\bigr)
=(q_m^{(k)})^\top R((n-m)\theta_k)k_n^{(k)},
$$

because $R(a)^\top R(b)=R(b-a)$. Summing the pair contributions gives the
full dot product. It depends on $n-m$, but also on query/key contents and on
every $\theta_k$; RoPE does not turn the score into distance alone.

For reverse mode, the saved sine and cosine values apply the transpose:

$$
\begin{bmatrix}\bar{x}_{2k}\\\bar{x}_{2k+1}\end{bmatrix}
=R(m\theta_k)^\top
\begin{bmatrix}\bar{y}_{2k}\\\bar{y}_{2k+1}\end{bmatrix}.
$$

<!-- contract-section:history -->
## LLM evolution

Recurrent neural language models carried sequence order through a state that
advanced one step at a time. The recurrence-free Transformer therefore needed
an explicit position signal. Vaswani et al. added fixed sinusoidal vectors to
input embeddings and also compared a learned-position alternative. Their
sinusoidal choice was motivated by a hypothesis about learning fixed offsets,
not a universal length-extrapolation guarantee.

Su et al. moved the position operation into multiplicative rotations of query
and key subspaces. Absolute positions enter the rotations; relative offsets
emerge when the two rotations meet in the attention dot product. Touvron et al.
later documented one influential decoder-only use: the original LLaMA removes
absolute positional embeddings and applies RoPE at each layer. This is a
bounded modern example, not a claim that every LLM uses RoPE.

Primary evidence: [Vaswani et al. (2017)](https://arxiv.org/abs/1706.03762),
[Su et al. (2021)](https://arxiv.org/abs/2104.09864), and
[Touvron et al. (2023)](https://arxiv.org/abs/2302.13971).

<!-- contract-section:rust-behavior -->
## Rust behavior

`RotaryEmbedding::new` validates the configuration and precomputes inverse
frequencies plus sine/cosine tables. `RotaryEmbedding::rotate` reads tokens on
the penultimate axis, reads adjacent pairs on the final axis, validates the
checked absolute interval, and records one linear-time `rotary_pairs` tape
operation. Calling it independently for query and key avoids a specialized
wrapper and prepares the same API for later cached decoding.

The fixture freezes known signs, both frequency rates, position-zero identity,
norms, every cell in the relative-offset dot grid, a common shift, rank-three
and rank-four layouts, empty axes, typed failures, finite saved context,
deterministic replay, and all query/key gradient coordinates. It does not use a
library that implements RoPE.

<!-- contract-section:visualization -->
## Visualization decision

A visualization is useful. The page should render Rust-authored position rows
for the two pairs, a semantic query-by-key dot table whose equal offsets repeat
along diagonals, and a common-shift comparison. The component must preserve
trace strings without numeric conversion or browser-side trigonometry, norms,
dot products, or gradients. Technical tables use named keyboard-focusable
scrollers at narrow widths and retain logical left-to-right axes under
right-to-left prose.

<!-- contract-section:exercises -->
## Exercises and misconception check

1. Prove that position $0$ is the identity rotation.
2. Compute the single-pair example at $(m,n)=(1,0)$.
3. Predict what changes after shifting both positions by the same amount.
4. Explain why shifting only one position changes the score.
5. Derive norm preservation from $R(\phi)^\top R(\phi)=I$.
6. Decide whether values or the causal mask should be rotated.
7. Diagnose a feature width of $3$.
8. Distinguish the absolute positions passed to RoPE from the relative offset
   exposed by a query-key dot product.
9. Explain why the local fixed-vector common-shift invariant does not guarantee
   shift invariance for an entire decoder prediction.

Misconception: RoPE is relative because it receives relative indices.
Correction: query and key receive absolute positions. Shared rotation algebra
makes their dot product expose a relative difference. RoPE shapes scores; it
does not replace the causal mask and this chapter does not rotate values.

<!-- contract-section:decoder-connection -->
## Decoder connection

The cumulative decoder can now rotate each projected query and key row before
computing the Chapter 28 causal scores. Chapter 30 will split the feature axis
into several smaller heads, apply the same position-aware causal attention in
each head, concatenate their outputs, and apply the output projection.

<!-- contract-section:localization -->
## Localization notes

English is the sole active Chapter 29 locale. Russian remains registered but
inactive and must publish no placeholder. Keep mathematical symbols, source
metadata, tensor shapes, fixture values, and trace tokens locale-neutral.
Translate surrounding prose when another locale is activated, but preserve the
distinction between absolute input position, relative dot-product offset,
rotation, and causal visibility.

<!-- contract-section:acceptance -->
## Acceptance

The chapter is complete only when the course plan and contract agree on the
corrected positioned-vector notation; the Rust core and demo pass formatting,
warning-denying lint, workspace tests, dependency policy, deterministic report,
strict trace, edge cases, and all-coordinate gradients; the English lesson is
the complete active locale set with one description meta tag and no Russian
route; every learner-facing expression is server-rendered math; the static
diagram projects exact Rust strings without arithmetic; and desktop plus narrow
Chromium and Firefox checks prove accessible, contained formulas and tables.
