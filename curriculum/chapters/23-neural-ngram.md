---
{
  "chapter_id": "23-neural-ngram",
  "concept_id": "neural-ngram",
  "content_revision": 5,
  "order": 23,
  "objective": {
    "en": "Train an embedding-plus-SwiGLU fixed-context language model whose validation loss improves from initialization.",
    "ru": "Обучить языковую модель с фиксированным контекстом, использующую эмбеддинги и SwiGLU, так чтобы её функция потерь на валидационной выборке снизилась относительно начального значения."
  },
  "worked_inputs": {
    "en": "Take one complete two-token context $[z_{t-2},z_{t-1}]$ and its single following target $z_t$. With $D=4$, $H=8$, and $V=266$, predict the shapes after lookup, concatenation, SwiGLU, and vocabulary projection before inspecting any numeric output.",
    "ru": "Возьмите один полный двухтокенный контекст $[z_{t-2},z_{t-1}]$ и единственный следующий за ним целевой токен $z_t$. При $D=4$, $H=8$ и $V=266$ заранее определите формы тензоров после выбора строк эмбеддингов по ID токенов, конкатенации, SwiGLU и проекции в пространство словаря, прежде чем смотреть на числовые результаты."
  },
  "formula": {
    "latex": "h=\\operatorname{SwiGLU}([E_{z_{t-C}},\\ldots,E_{z_{t-1}}]),\\quad \\ell=hW_o",
    "symbols": [
      {
        "symbol": "h",
        "en": "the hidden vector computed from one complete fixed context",
        "ru": "скрытый вектор, вычисленный по одному полному фиксированному контексту"
      },
      {
        "symbol": "\\operatorname{SwiGLU}",
        "en": "the gated feed-forward transformation from concatenated context features to the hidden vector",
        "ru": "вентильное преобразование сети прямого распространения, переводящее конкатенированные признаки контекста в скрытый вектор"
      },
      {
        "symbol": "E",
        "en": "the trainable vocabulary-by-feature token embedding table",
        "ru": "обучаемая таблица эмбеддингов токенов с осями словаря и признаков"
      },
      {
        "symbol": "z_i",
        "en": "the integer token ID at sequence position i",
        "ru": "целочисленный ID токена в позиции i последовательности"
      },
      {
        "symbol": "t",
        "en": "the sequence position whose token the model is predicting",
        "ru": "позиция последовательности, токен в которой предсказывает модель"
      },
      {
        "symbol": "C",
        "en": "the positive fixed number of preceding token IDs used for one prediction",
        "ru": "фиксированное положительное число предшествующих ID токенов, используемых для одного предсказания"
      },
      {
        "symbol": "[\\,\\cdot\\,]",
        "en": "concatenation of the C embedding vectors along one feature axis",
        "ru": "конкатенация C векторов эмбеддингов вдоль одной оси признаков"
      },
      {
        "symbol": "W_o",
        "en": "the hidden-to-vocabulary output matrix",
        "ru": "выходная матрица проекции из скрытого пространства в пространство словаря"
      },
      {
        "symbol": "\\ell",
        "en": "the vector of V next-token logits",
        "ru": "вектор из V логитов следующего токена"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "language-model",
      "limitation": {
        "en": "Classical count n-grams estimate each short context separately, so rare or unseen combinations receive little usable evidence as the number of possible sequences grows.",
        "ru": "Классические счётные n-граммные модели оценивают каждый короткий контекст отдельно, поэтому по мере роста числа возможных последовательностей для редких и невстречавшихся сочетаний остаётся мало полезной статистики."
      },
      "later_advance": {
        "en": "Bengio et al. jointly learn distributed word vectors and a feed-forward function over a concatenated fixed context, so evidence about one word sequence can inform sequences made from nearby word representations.",
        "ru": "В этой модели распределённые векторы слов и функция сети прямого распространения, применяемая к конкатенированному фиксированному контексту, обучаются совместно. Благодаря этому сведения об одной последовательности помогают оценивать последовательности, составленные из слов с близкими векторными представлениями."
      },
      "modern_llm_role": {
        "en": "Transformers later replace fixed-context mixing with masked self-attention while retaining learned embeddings, position-wise feed-forward transformations, and a vocabulary projection for next-token prediction.",
        "ru": "Позднее модели Transformer заменяют смешивание фиксированного контекста маскированным механизмом самовнимания, сохраняя обучаемые эмбеддинги, преобразования сети прямого распространения, одинаково применяемые к каждой позиции, и проекцию в пространство словаря для предсказания следующего токена."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2003,
          "name": "Bengio et al., A Neural Probabilistic Language Model",
          "source_url": "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": {
            "en": "Bengio et al. map a fixed context through learned distributed word features and a feed-forward network to a next-word probability distribution.",
            "ru": "Бенжио и соавторы преобразуют фиксированный контекст с помощью обучаемых распределённых представлений слов и сети прямого распространения в распределение вероятностей следующего слова."
          }
        },
        {
          "role": "later",
          "year": 2017,
          "name": "Vaswani et al., Attention Is All You Need",
          "source_url": "https://arxiv.org/pdf/1706.03762",
          "claim": {
            "en": "Vaswani et al. replace recurrence and convolution with attention, and mask decoder self-attention so a position cannot use later positions during autoregressive prediction.",
            "ru": "Васвани и соавторы заменяют рекуррентные и свёрточные слои механизмом внимания и маскируют самовнимание декодера, чтобы при авторегрессионном предсказании позиция не могла использовать последующие позиции."
          }
        }
      ]
    },
    "approach": {
      "en": "From separately counted short contexts, through learned distributed features in a feed-forward language model, toward masked attention over decoder sequences",
      "ru": "От раздельного подсчёта коротких контекстов — через обучаемые распределённые признаки в языковой модели на основе сети прямого распространения — к маскированному вниманию по последовательностям декодера"
    },
    "summary": {
      "en": "The neural n-gram is an important integration point on the road to modern LLMs: embeddings share information across token identities, a learned nonlinear map combines the complete context, and next-token loss trains every matrix together. Attention later removes this fixed-context concatenation bottleneck.",
      "ru": "Нейронная n-граммная модель — важный связующий этап на пути к современным LLM: эмбеддинги позволяют разным токенам использовать общие признаки, обучаемое нелинейное преобразование объединяет полный контекст, а функция потерь следующего токена совместно обучает все матрицы. Позднее механизм внимания устраняет ограничение, связанное с конкатенацией фиксированного контекста."
    },
    "rust_contrast": "Count exact context-to-follower frequencies, then run the same fixed token IDs through one owned embedding-plus-SwiGLU parameter set to expose the transition from exact count n-grams to shared learned language-model representations."
  },
  "rust": {
    "package": "ch23-neural-ngram",
    "sources": [
      "rust/crates/llm-from-scratch/src/models/neural_ngram.rs",
      "rust/demos/ch23-neural-ngram/src/lib.rs",
      "rust/demos/ch23-neural-ngram/src/main.rs",
      "rust/demos/ch23-neural-ngram/src/diagram_trace.rs"
    ],
    "expected_output": "chapter=23-neural-ngram\nprediction=[1, 2] -> [1, 2, 4] -> [1, 8] -> [1, 8] -> [1, 266]\nconfig=vocabulary:266 context:2 embedding:4 hidden:8 parameters:3384 batch:64 evaluation_batch:512 steps:15\nsplit=train_documents:8 validation_documents:2 train_contexts:1836 validation_contexts:467 test_text_used:false\nprobe_context=[67, 118]\nprobe_embeddings=shape:[1, 2, 4] values:[0.064154, 0.021328, 0.083333, -0.012260, 0.057176, 0.111494, -0.126703, -0.068284]\nprobe_hidden=shape:[1, 8] values:[-0.002448, -0.000051, 0.003220, 0.003477, 0.002033, 0.004016, 0.003727, 0.003874]\nprobe_logits=shape:[1, 266] preview:[0.000075, -0.000037, 0.000496, -0.001047, -0.000055, -0.001032] argmax:44 value:0.002350\nfirst_gradient_l1=[0.020983, 0.002079, 0.002420, 0.002044, 0.019548]\ncheckpoint[0]=train:5.583505 validation:5.583482\ncheckpoint[8]=train:5.580106 validation:5.580365\ncheckpoint[15]=train:5.555850 validation:5.557362\nvalidation_improvement=0.026120\ngeneration=prompt:At prompt_ids:[67, 118] ids:[259, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211] stop:limit bytes_hex:d0b0d1d1d1d1d1d1d1d1d1d1d1\nhistorical=bigram_followers:2 fixed_context_followers:[1, 1] neural_context_width:8\nall_parameter_gradient_l1_positive_finite=true\nall_parameter_nodes_preserved=true\nall_post_update_gradients_cleared=true\nsame_seed_replays_bitwise=true\ntest_text_encoded_or_scored=false\nnext=replace fixed concatenation with causal sequence mixing\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "neural-ngram",
    "rationale": {
      "en": "A five-stage pipeline keeps context, embedding, concatenated-feature, hidden, and vocabulary axes distinct while the adjacent loss trace makes the held-out improvement visible.",
      "ru": "Пятиэтапная схема не смешивает оси контекста, эмбеддингов, конкатенированных признаков, скрытого пространства и словаря, а расположенная рядом последовательность значений функции потерь показывает улучшение на отложенных данных."
    }
  },
  "decoder_connection": {
    "en": "The components built so far now train a complete fixed-context next-token model with frozen data partitions and AdamW, then produce deterministic greedy tokens. Chapters 24–32 replace fixed-context concatenation with residual, normalized, attention-based causal information mixing between sequence positions.",
    "ru": "Теперь собранные компоненты обучают полную модель следующего токена с фиксированным контекстом, используя зафиксированное разбиение данных и AdamW, а затем детерминированно генерируют токены жадным алгоритмом. В главах 24–32 конкатенацию фиксированного контекста заменит каузальное смешивание информации между позициями последовательности на основе остаточных связей, нормализации и механизма внимания."
  },
  "terminology": [
    {
      "concept_id": "neural-ngram",
      "en": "neural n-gram language model",
      "ru": "нейронная n-граммная языковая модель"
    },
    {
      "concept_id": "fixed-context",
      "en": "fixed context",
      "ru": "фиксированный контекст"
    },
    {
      "concept_id": "context-concatenation",
      "en": "context embedding concatenation",
      "ru": "конкатенация эмбеддингов контекста"
    },
    {
      "concept_id": "held-out-loss",
      "en": "held-out validation loss",
      "ru": "функция потерь на отложенной валидационной выборке"
    },
    {
      "concept_id": "greedy-generation",
      "en": "greedy generation",
      "ru": "жадная генерация"
    },
    {
      "concept_id": "parameter-owner",
      "en": "parameter owner",
      "ru": "владелец параметров"
    }
  ],
  "translation_notes": [
    "Chapter 23 has the exact active locale set {en, ru}. Russian is translated directly from canonical English content revision 5 with SHA-256 6fc56422f84a6c3f285dc41102dcd1b1835946b82d67d5939b65dec227093a02 and becomes stale whenever that source changes.",
    "Keep V, C, D, H, E, h, W_o, ell, z with its indices, shapes, token IDs, parameter names, trace keywords, source roles, and source URLs unchanged across both locales.",
    "Translate neural n-gram as «нейронная n-граммная языковая модель»: a fixed-context feed-forward language model, not a count table and not a Transformer.",
    "Translate held-out validation loss as «функция потерь на отложенной валидационной выборке» when the distinction matters; do not use a calque that implies data are physically outside the model.",
    "The gradient proof concerns one positive finite matrix-level L1 norm for each of five parameter matrices; it does not claim that every gradient element is nonzero.",
    "The parameter-node proof means that the ordered registry and the persistent embedding, SwiGLU, and output-projection handles share the same five nodes before and after AdamW writes new values; never translate it as leaf replacement or layer reconstruction.",
    "The gradients-cleared proof belongs to the training fixture after its explicit zero_grad call. AdamW itself leaves each accumulated raw gradient unchanged on the live node.",
    "The test boundary proves that test text is not encoded or scored. Reading test document IDs from the frozen split manifest is not the same as using test text.",
    "Keep the validation history in two stages: an exploratory benchmark inspected validation loss and established the 15-update budget; the subsequently frozen published run reports steps 0, 8, and 15 without using them for dynamic checkpoint selection.",
    "Bengio et al. support the distributed fixed-context language-model architecture, and Vaswani et al. support the later attention-only and masked-decoder claims. Neither paper defines this course's BPE, SwiGLU, dimensions, AdamW constants, seeds, target extraction, stopping rule, trace, or accessibility projection.",
    "Name Rust only for executable source, concrete APIs, commands, paths, trace tokens, and literal program data. The language-model architecture and history remain language-independent.",
    "Render every learner-facing mathematical expression through inline or display math delimiters. Reserve code spans for actual code, APIs, commands, paths, trace tokens, and literal program data.",
    "Validate Russian diagram labels in Firefox with JavaScript enabled at desktop, narrow, and native full-view surfaces; use natural concise wording or reflow rather than clipping, truncation, overlap, or reduced text size."
  ],
  "acceptance_examples": [
    {
      "input": "Pass one context batch with shape [B,C] through the frozen model",
      "expected": "The visible tensor chain is [B,C] to [B,C,D] to [B,CD] to [B,H] to [B,V], with [B,2], [B,2,4], [B,8], [B,8], and [B,266] in the fixture."
    },
    {
      "input": "Read one Chapter 21 shifted target row",
      "expected": "Only target_row[C-1], the token after the complete context, contributes to the Chapter 23 indexed mean NLL."
    },
    {
      "input": "Inspect the first reverse pass",
      "expected": "All five matrix-level gradient L1 values are finite and positive, including the embedding and output matrices."
    },
    {
      "input": "Commit one successful AdamW update",
      "expected": "The five parameter nodes keep their identities, every persistent layer handle observes the updated values, and AdamW leaves each raw gradient on its node. The fixture explicitly clears those post-update gradients before the next forward pass."
    },
    {
      "input": "Compare step 0 with fixed final step 15",
      "expected": "Train loss falls from 5.583505 to 5.555850 and validation loss falls from 5.583482 to 5.557362."
    },
    {
      "input": "Build the same corpus, tokenizer, batches, model, and optimizer twice",
      "expected": "Initial tensors, gradients, checkpoints, final parameters, and generated token IDs match bit for bit."
    },
    {
      "input": "Prepare the held-out objective",
      "expected": "Every validation row is scored and unequal final batches are weighted by actual row count rather than averaging batch means equally."
    },
    {
      "input": "Audit split access",
      "expected": "BPE learns from training documents, train and validation text are encoded separately, and test text is not encoded or scored."
    },
    {
      "input": "Generate after training from content IDs [67,118]",
      "expected": "Greedy selection masks BOS, permits EOS, breaks exact ties by lower ID, and stops at EOS or twelve new tokens without sampling."
    },
    {
      "input": "Compare exact count contexts with learned context features",
      "expected": "A count bigram keyed only by final token 11 mixes two followers, while the wider contexts [10,11] and [20,11] each retain one; the neural model then maps every token through a shared four-feature table before concatenation."
    },
    {
      "input": "cargo run --quiet --locked -p ch23-neural-ngram",
      "expected": "stdout equals rust/demos/ch23-neural-ngram/expected.txt byte for byte, including the final newline, within the declared debug-profile ceiling."
    },
    {
      "input": "cargo run --quiet --locked -p ch23-neural-ngram --example ch23-neural-ngram-trace",
      "expected": "stdout equals rust/demos/ch23-neural-ngram/diagram-trace.txt byte for byte and follows the exact 13-line Chapter 23 trace grammar."
    }
  ]
}
---

# Chapter 23: Train a fixed-context neural language model

<!-- contract-section:scope -->
## Scope

This chapter assembles the cumulative tokenizer, complete-context mini-batches,
embedding table, tensor tape, SwiGLU block, vocabulary projection, indexed mean
negative log-likelihood, and AdamW into the first trained neural language model.
One ordered parameter registry and the persistent embedding, SwiGLU, and output
projection handles refer to the same five trainable leaf nodes. AdamW updates
the values in those nodes, so every later forward observes the update through
the existing layer handles.

The model deliberately keeps a fixed context of $C=2$ token IDs. Attention,
residual connections, normalization, positional treatment, schedules,
checkpoint serialization, validation-based model selection, stochastic
sampling, weight tying, and distributed training remain later chapters.

Before this teaching fixture was frozen, an exploratory benchmark inspected
validation loss and established that a budget of $15$ updates cleared the
chapter's improvement threshold. The published run then fixes that budget
before it begins. It reports losses at steps $0$, $8$, and $15$ but never uses
them to select a checkpoint dynamically.

<!-- contract-section:worked-inputs -->
## Worked inputs

Take one complete two-token context $[z_{t-2},z_{t-1}]$ and its single
following target $z_t$. With embedding width $D=4$, hidden width $H=8$, and
vocabulary size $V=266$, predict the shapes before inspecting values:

$$
[1,2]\to[1,2,4]\to[1,8]\to[1,8]\to[1,266].
$$

The frozen prompt `At` encodes to the literal program IDs `[67, 118]`. Its
  initial feature vectors, hidden state, logit preview, and maximum-scoring token all come from
the deterministic Rust fixture. The objective trace then compares the complete
training and validation partitions at steps $0$, $8$, and $15$.

<!-- contract-section:formula -->
## Formula and symbols

For one target position, concatenate the $C$ embedding rows in chronological
order, transform the resulting $CD$ features, and project the hidden vector to
$V$ logits:

$$
h=\operatorname{SwiGLU}([E_{z_{t-C}},\ldots,E_{z_{t-1}}]),\quad \ell=hW_o
$$

Here $z_i$ is the token ID at position $i$, $t$ is the position being
predicted, and $C$ is the fixed context length. $E\in\mathbb{R}^{V\times D}$
is the shared token table. Brackets mean concatenation along the feature axis,
so the SwiGLU input has width $CD$. The hidden vector is
$h\in\mathbb{R}^{H}$, the output matrix is
$W_o\in\mathbb{R}^{H\times V}$, and
$\ell\in\mathbb{R}^{V}$ contains the next-token logits.

For a mini-batch, the output matrix orientation gives
$[B,H][H,V]=[B,V]$. One class target belongs to each of the $B$ rows, so the
training objective is the indexed mean negative log-likelihood

$$
L=-\frac{1}{B}\sum_{b=1}^{B}\log
\frac{\exp(\ell_{b,y_b})}{\sum_{j=0}^{V-1}\exp(\ell_{b,j})}.
$$

The Chapter 21 row contains $C$ shifted targets, but Chapter 23 uses only
$y_b=\operatorname{target\_row}(b)_{C-1}$: the token immediately after the
whole context. Scoring all shifted targets would train a different objective.

<!-- contract-section:history -->
## From sparse counts to learned contexts and attention

Classical count n-grams estimate each short context separately, so rare or
unseen combinations receive little usable evidence as the number of possible
sequences grows. The `historical_context_evidence` calculation also shows what
a wider context adds: a bigram keyed only by final token $11$ mixes two
followers, while the contexts $[10,11]$ and $[20,11]$ each retain one distinct
follower.

[Bengio et al., *A Neural Probabilistic Language Model*](https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf)
provide the neural step. Bengio et al. map a fixed context through learned
distributed word features and a feed-forward network to a next-word probability
distribution. Bengio et al. jointly learn distributed word vectors and a
feed-forward function over a concatenated fixed context, so evidence about one
word sequence can inform sequences made from nearby word representations.

[Vaswani et al., *Attention Is All You Need*](https://arxiv.org/pdf/1706.03762)
provide the later sequence-model step. Vaswani et al. replace recurrence and
convolution with attention, and mask decoder self-attention so a position cannot
use later positions during autoregressive prediction. Transformers later
replace fixed-context mixing with masked self-attention while retaining learned
embeddings, position-wise feed-forward transformations, and a vocabulary
projection for next-token prediction.

The neural n-gram is an important integration point on the road to modern LLMs:
embeddings share information across token identities, a learned nonlinear map
combines the complete context, and next-token loss trains every matrix together.
Attention later removes this fixed-context concatenation bottleneck. The papers
do not specify this course's byte-pair vocabulary, SwiGLU activation, dimensions,
AdamW constants, seeds, final-target policy, trace grammar, or stopping rule.
`historical_context_evidence` isolates the model transition from exact count
tables to shared learned features and then to masked sequence mixing.

<!-- contract-section:rust-behavior -->
## Rust behavior

`NeuralNgramConfig::new` validates positive $V$, $C$, $D$, and $H$, plus every
derived width and parameter count. `NeuralNgram` owns exactly these stable
parameters in pipeline order: `ngram.embedding.weight`, the gate, up, and down
matrices beneath `ngram.ffn`, and `ngram.output.weight`. Their shapes are
$[V,D]$, $[CD,H]$, $[CD,H]$, $[H,H]$, and $[H,V]$. The ordered registry and
the persistent embedding, SwiGLU, and bias-free output-projection objects share
those exact five nodes. Every forward validates the batch width and token count,
then runs the already-owned layer objects.

`NeuralNgram::loss` rejects a mini-batch whose context length differs from the
model, extracts only the final shifted target per row, and applies indexed mean
NLL along vocabulary axis $1$. Reverse mode releases the per-batch graph after
committing finite gradients. AdamW atomically writes the checked parameter
values into the same five leaf nodes. The registry and layer handles therefore
observe one shared update without rebuilding the model. AdamW deliberately
leaves the accumulated gradients in place; after every successful step, the
fixture explicitly calls `zero_grad()` on all five live parameters before it
starts the next forward pass.

The frozen data path trains eight BPE ranks only on the eight training documents,
encodes training and validation documents separately, and never requests test
text. It materializes a 64-row shuffled training order with seed `23`, consumes
the first $15$ batches, and evaluates complete objectives in 512-row groups.
Batch means are weighted by their actual row counts. Two independent runs with seed `23`
must match bit for bit. The learner report performs that replay under a
conservative 60-second debug-profile ceiling; the measured pinned-container run
took 27.161 seconds.

Greedy generation starts with content IDs `[67, 118]`, masks only BOS, permits
EOS, chooses the lower token ID on an exact logit tie, and stops at EOS or after
twelve new tokens. It preserves bytes even when the generated sequence is not
valid UTF-8. Sampling remains outside scope.

Run `cargo run --quiet --locked -p ch23-neural-ngram`. Its stdout must equal
`rust/demos/ch23-neural-ngram/expected.txt`, including the final newline. The
named example `ch23-neural-ngram-trace` must likewise equal the exact 13-line
diagram trace.

<!-- contract-section:visualization -->
## Visualization

The locale-neutral trace provides one configuration record, split evidence,
five ordered stage records, three loss checkpoints, one result, deterministic
generation, and proof tokens. The static component validates exact line and
field order and projects those values without model, loss, optimizer, comparison,
or generation arithmetic.

The visible reading order is context IDs, embeddings, concatenation, hidden
state, logits, loss checkpoints, result, generation, and proof. The pipeline is
a keyboard-focusable local horizontal scroller at narrow widths; cards keep
natural height. Solid, dashed, and double borders plus explicit text labels
carry meaning without color. Program identities and math remain left-to-right
inside right-to-left localized prose. No SVG, client script, or hydration is
needed.

<!-- contract-section:exercises -->
## Prediction checks

1. Predict every shape for a batch width of $64$ before running the fixture.
2. Decide which target is used from a shifted row of width $C$.
3. Predict which parameter matrices should have a positive finite gradient
   $L_1$ norm after one loss.
4. Decide how the final mini-batch contributes to a complete-partition mean.
5. Predict whether step-$15$ validation loss must be below every intermediate
   value or only below initialization.
6. Decide what a persistent layer handle and a cloned `NamedParameter` handle
   observe after AdamW updates their shared node, and whether AdamW itself clears
   the accumulated gradient.
7. Predict what happens when BOS has the greatest generation logit.
8. Identify which test-partition operation would invalidate the held-out proof.

Checks: the shape chain ends at $[64,266]$; only index $C-1$ of each target row
is scored; all five matrices have positive finite first-step gradient $L_1$
norms; evaluation
weights by the actual number of rows; only final improvement from initialization
is required; cloning a `NamedParameter` copies the handle, which still points to
the same updated `TensorValue` node as the persistent layer handle, while AdamW
retains the raw gradient and the caller explicitly clears it; BOS is masked
before $\operatorname{argmax}$; and reading, encoding, fitting, selecting,
or scoring test text would violate the fixture boundary.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The components built so far now train a complete fixed-context next-token model
with frozen data partitions and AdamW, then produce deterministic greedy tokens.
Chapters 24–32 replace fixed-context concatenation with residual, normalized,
attention-based causal information mixing between sequence positions.

<!-- contract-section:localization -->
## Localization notes

English and Russian are the exact active Chapter 23 locales. English content
revision 5 is the sole semantic source; the Russian lesson translates that exact
revision directly and becomes stale whenever the English meaning or presentation
changes. The contract, route, alternate links, lesson, diagram labels, accessible
descriptions, exercises, answers, SEO, and terminology publish together.

Keep $V$, $C$, $D$, $H$, $E$, $h$, $W_o$, $\ell$, indexed $z$, shapes,
token IDs, parameter names, trace keywords, source roles, and URLs unchanged.
Translate “neural n-gram” as «нейронная n-граммная языковая модель», not as
though it were only a count table or a Transformer. The gradient proof states
that all five matrix-level $L_1$ norms are finite and positive; it does not claim
that every gradient element is nonzero. The test boundary covers text that is
not encoded or scored, not frozen manifest IDs. Name Rust only when referring to
executable source, APIs, commands, paths, trace tokens, or literal program data.

<!-- contract-section:acceptance -->
## Acceptance examples

- `node scripts/check-course-plan.mjs` preserves the exact Chapter 23 outcome,
  formula, history contrast, visualization, and evidence requirements.
- `npm --prefix site run check:contract -- ../curriculum/chapters/23-neural-ngram.md`
  validates the bilingual contract and its exact Rust output.
- Formatting, clippy, all workspace tests, dependency policy, demo policy, and
  both exact Chapter 23 stdout diffs pass without a concept-implementing crate.
- Chapter, parity, content, Astro, unit, production-build, link, SEO, and focused
  plus full browser gates pass.
- Browser checks cover both locales at desktop and 390-pixel widths, formula
  annotations and spacing, natural-height containment, local scrolling, native
  full view, forced colors, RTL/LTR isolation, navigation, reciprocal alternates,
  and localized labels in Firefox with JavaScript enabled.
