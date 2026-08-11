---
{
  "chapter_id": "36-temperature-top-k",
  "concept_id": "temperature-top-k",
  "content_revision": 6,
  "order": 36,
  "objective": {
    "en": "Shape one next-token distribution with positive-temperature scaling and stable top-k filtering, distinguish its rank-retained set from its positive representable sampling support, then reproduce a categorical choice by restoring the same random-generator state in an uncached autoregressive loop.",
    "ru": "Научиться формировать распределение следующего токена с положительной температурой и фильтрацией top-k в однозначно заданном порядке; различать множество кандидатов, отобранных по рангу, и носитель распределения в f64, то есть токены с положительной представимой вероятностью; воспроизводить случайный выбор, восстанавливая состояние генератора в авторегрессионном цикле без кэша."
  },
  "worked_inputs": {
    "en": "Rank logits [0,1,1,2] by descending value and ascending token ID, compare temperatures 0.5, 1, and 2, keep two tokens across the tied boundary, and replay eight top-three draws from SplitMix64 seed 36 before loading the Chapter 35 checkpoint.",
    "ru": "Упорядочить логиты [0,1,1,2] по убыванию значения, а при равенстве — по возрастанию ID токена, сравнить температуры 0.5, 1 и 2, отобрать два токена, однозначно разрешив равенство на границе top-k, и повторить восемь случайных выборов из трёх кандидатов с начальным значением генератора SplitMix64, равным 36, прежде чем загрузить контрольную точку из главы 35."
  },
  "formula": {
    "latex": "q_i^{(\\tau,k)}=\\frac{\\mathbf{1}[i\\in K_k]\\exp(\\ell_i/\\tau)}{\\sum_j\\mathbf{1}[j\\in K_k]\\exp(\\ell_j/\\tau)},\\quad \\lvert K_k\\rvert=k,\\quad S_{\\tau,k}^{(\\mathrm{f64})}=\\{i\\in K_k\\mid\\widehat q_i^{(\\tau,k)}>0\\}\\subseteq K_k",
    "symbols": [
      {
        "symbol": "q_i^{(\\tau,k)}",
        "en": "the ideal real-arithmetic probability assigned to token i after temperature scaling, top-k filtering, and renormalization",
        "ru": "идеальная вероятность токена i в арифметике действительных чисел после изменения масштаба температурой, фильтрации top-k и повторной нормализации"
      },
      {
        "symbol": "\\widehat q_i^{(\\tau,k)}",
        "en": "the probability actually stored for token i in f64 after max-shifted f64 exponentiation and normalization",
        "ru": "вероятность токена i, фактически сохранённая в f64 после вычисления экспонент со сдвигом на максимум и нормализации в f64"
      },
      {
        "symbol": "S_{\\tau,k}^{(\\mathrm{f64})}",
        "en": "the positive representable sampling support: retained token IDs whose stored f64 probability is strictly greater than zero",
        "ru": "носитель распределения в f64 — ID токенов, отобранных по рангу и имеющих положительную представимую вероятность"
      },
      {
        "symbol": "\\tau",
        "en": "a finite positive temperature; smaller values enlarge scaled-logit gaps and concentrate the probability distribution, while larger values shrink those gaps and flatten the distribution",
        "ru": "конечная положительная температура; меньшие значения увеличивают различия между масштабированными логитами и концентрируют распределение вероятностей, а большие уменьшают эти различия и сглаживают распределение"
      },
      {
        "symbol": "k",
        "en": "the exact number of ranked token IDs retained for stochastic sampling",
        "ru": "точное число ID токенов, отобранных по рангу для случайного выбора"
      },
      {
        "symbol": "V",
        "en": "the vocabulary size, which bounds the retained candidate count k",
        "ru": "размер словаря; значение k, то есть число отобранных кандидатов, не может превышать V"
      },
      {
        "symbol": "K_k",
        "en": "the set of token IDs for the exactly k highest-ranked logits, with equal logits ordered by ascending token ID in this implementation",
        "ru": "множество ID ровно тех k токенов, чьи логиты занимают первые места в порядке ранжирования; в этой реализации токены с равными логитами упорядочиваются по возрастанию ID"
      },
      {
        "symbol": "\\mathbf{1}[i\\in K_k]",
        "en": "the indicator that is one for a retained token and zero for a filtered token",
        "ru": "индикатор, равный единице для отобранного токена и нулю для исключённого"
      },
      {
        "symbol": "\\ell_i",
        "en": "the decoder logit for candidate token i at the current final prefix position",
        "ru": "логит, который декодер выдаёт для токена-кандидата i в последней позиции текущего префикса"
      },
      {
        "symbol": "i",
        "en": "the candidate token ID whose final probability is being computed",
        "ru": "ID токена-кандидата, для которого вычисляется итоговая вероятность"
      },
      {
        "symbol": "j",
        "en": "the denominator index ranging across the vocabulary, where filtered terms contribute zero",
        "ru": "индекс суммирования в знаменателе; он пробегает весь словарь, а слагаемые исключённых токенов равны нулю"
      },
      {
        "symbol": "\\exp",
        "en": "the real exponential in the ideal formula; the implementation evaluates a max-shifted f64 exponential whose represented result can round to zero",
        "ru": "экспонента в идеальной формуле; реализация вычисляет её в f64 после сдвига на максимум, поэтому представимый результат может округлиться до нуля"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "inference-design",
      "limitation": {
        "en": "Likelihood-maximizing beam decoding is useful when a source tightly constrains the target, but open-ended continuation admits many plausible futures; beam output can become generic or repetitive, while unrestricted sampling can admit an unreliable low-probability tail.",
        "ru": "Лучевое декодирование, максимизирующее правдоподобие, полезно, когда исходный текст жёстко ограничивает результат. Но у свободного продолжения много допустимых вариантов: лучевой поиск может давать шаблонный или повторяющийся текст, а при случайном выборе без ограничения множества кандидатов в результат может попасть маловероятный токен из ненадёжного хвоста распределения."
      },
      "later_advance": {
        "en": "Open-ended story systems combined softmax temperature with top-k sampling, GPT-2 used top-k for summaries and long continuations, and later GPT-2 analysis made the truncation and renormalization trade-off explicit while showing why one fixed $k$ cannot fit every context.",
        "ru": "Ранние системы генерации историй сочетали температуру softmax с top-k, модель GPT-2 использовала top-k для кратких изложений и длинных продолжений, а последующий анализ GPT-2 подробно описал компромисс между отсечением и повторной нормализацией и показал, почему фиксированное $k$ подходит не для каждого контекста."
      },
      "modern_llm_role": {
        "en": "Controlled stochastic decoding turns an autoregressive LLM distribution into an adjustable diversity-versus-concentration distribution. Restoring the same random-generator state while preserving deterministic tie-breaking and interval traversal lets the sampler replay its choices. Later methods can replace the fixed candidate count without changing the decoder logits.",
        "ru": "Управляемое стохастическое декодирование задаёт баланс между разнообразием и концентрацией в распределении авторегрессионной LLM. Если восстановить то же состояние генератора псевдослучайных чисел и сохранить однозначные правила разрешения равенств и обхода интервалов, алгоритм случайного выбора сможет воспроизвести свои результаты. Более поздние методы позволяют числу кандидатов зависеть от контекста, не меняя логиты декодера."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2018,
          "name": "Hierarchical Neural Story Generation",
          "source_url": "https://arxiv.org/pdf/1805.04833",
          "claim": {
            "en": "Fan, Lewis, and Dauphin sample at each step from the ten most likely words, tune a generation-time softmax temperature, and report that this task-bounded strategy works better for their open-ended stories than beam search, while unrestricted random sampling can introduce damaging unlikely words.",
            "ru": "Фэн, Льюис и Дофин на каждом шаге выбирают случайное слово среди десяти наиболее вероятных, настраивают температуру softmax во время генерации и сообщают, что в их задаче продолжения историй такой подход работает лучше лучевого поиска. Выбор без ограничений, напротив, может добавить маловероятное слово, которое серьёзно ухудшит текст."
          }
        },
        {
          "role": "later",
          "year": 2019,
          "name": "Language Models are Unsupervised Multitask Learners",
          "source_url": "https://cdn.openai.com/better-language-models/language-models.pdf",
          "claim": {
            "en": "The GPT-2 report uses top-k random sampling with $k=2$ for one summarization setup and $k=40$ for open WebText continuations, showing truncated stochastic decoding in large Transformer language-model practice without claiming one $k$ is universal.",
            "ru": "В отчёте о GPT-2 случайный выбор top-k с $k=2$ используется в одном режиме составления краткого изложения, а с $k=40$ — для свободных продолжений WebText. Это пример усечённого стохастического декодирования в крупной языковой модели на основе архитектуры Transformer, но не утверждение об универсальности одного значения $k$."
          }
        },
        {
          "role": "later",
          "year": 2020,
          "name": "The Curious Case of Neural Text Degeneration",
          "source_url": "https://arxiv.org/pdf/1904.09751",
          "claim": {
            "en": "Holtzman and colleagues compare maximization and stochastic decoders on GPT-2, define top-k as sampling from the $k$ highest-probability tokens after renormalization, give the temperature-scaled softmax, and show why flat and peaked contexts make a fixed $k$ an imperfect compromise.",
            "ru": "Хольцман и соавторы на примере GPT-2 сопоставляют декодирование, максимизирующее правдоподобие, со случайным выбором, определяют top-k как выбор среди $k$ самых вероятных токенов после повторной нормализации, приводят softmax с температурой и показывают, почему фиксированное $k$ оказывается несовершенным компромиссом и в контекстах с относительно близкими вероятностями токенов, и в контекстах с резко концентрированным распределением."
          }
        }
      ]
    },
    "approach": {
      "en": "Move from choosing one high-likelihood continuation toward controlled stochastic decoding for open-ended language-model continuations, while keeping greedy selection as an explicit deterministic policy.",
      "ru": "Перейти от единственного продолжения с высоким правдоподобием к управляемому стохастическому декодированию свободных продолжений языковой модели, сохранив жадный выбор как отдельное детерминированное правило."
    },
    "summary": {
      "en": "The road to modern LLM generation distinguishes constrained search from open-ended continuation, truncates unreliable tails before sampling, and treats temperature and candidate-set policy as visible inference choices. Stable token-ID ties, seed replay, error precedence, and stop rules are course-specific reproducibility decisions.",
      "ru": "На пути к современной генерации LLM важно отличать поиск при жёстких ограничениях от свободного продолжения, отсекать ненадёжный хвост перед случайным выбором и явно задавать температуру и порядок формирования множества кандидатов. Чтобы результаты можно было воспроизвести, эта реализация однозначно разрешает равные логиты по ID токена, повторяет выбор после восстановления того же состояния генератора, проверяет ошибки в заданном порядке и явно задаёт правила остановки."
    },
    "rust_contrast": "Measure one explicit greedy choice, the three token IDs retained by top-k, and the full-softmax probability mass retained and removed by that truncation; then load the Chapter 35 checkpoint and audit every full-prefix call, saved RNG continuation, EOS stop, and context stop."
  },
  "rust": {
    "package": "ch36-temperature-top-k",
    "sources": [
      "rust/crates/llm-from-scratch/src/generation/sampling.rs",
      "rust/demos/ch36-temperature-top-k/src/lib.rs",
      "rust/demos/ch36-temperature-top-k/src/main.rs"
    ],
    "expected_output": "chapter=36-temperature-top-k\ninput=logits:[0.000000,1.000000,1.000000,2.000000] stable_order:[3,1,2,0]\ntemperature=tau:0.500000 probabilities:[0.014209336619,0.104993585404,0.104993585404,0.775803492574] tau:1.000000 probabilities:[0.072329488129,0.196611933241,0.196611933241,0.534446645389] tau:2.000000 probabilities:[0.142536956597,0.235003712202,0.235003712202,0.387455619000]\ntop_k=k:2 retained:[3,1] tied_boundary:keep:1 remove:2 sum:1.000000000000\nsupport=tau:2.2250738585072014e-308 top_k:3 retained:[0,1,2] positive_support:[0,1] probabilities:[0.500000000000,0.500000000000,0.000000000000]\nsample=seed:36 top_k:3 sequence:[3,2,2,2,3,3,3,3] draws:8 greedy_token:3 greedy_draw:none\ncheckpoint=loaded_bytes:6330 rng_state:0x9e3779b97f4a7c38 vocabulary:5 context:2 eos:none max_new_tokens:4 prompt:[0] generated:[4,4] prefixes:[1,2] stop:context-limit full_prefix_calls:2 replay_identical:true\neos=vocabulary:5 context:2 eos_token:4 max_new_tokens:4 generated:[4] stop:eos full_prefix_calls:1\nerrors=temperature_zero:true top_k_zero:true nonfinite_logit:true rng_unchanged:true\nhistory=greedy_token:3 greedy_rng_advanced:false top_k:3 retained:[3,1,2] retained_full_mass:0.927670511871 removed_full_mass:0.072329488129\nnext=cache one attention layer while preserving its newest-position output\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "temperature-top-k",
    "rationale": {
      "en": "Aligned probability bars make temperature sharpening and flattening visible, while the tied-boundary and underflow evidence distinguish rank retention from positive f64 sampling support before a seeded interval list shows where each ordinary draw lands.",
      "ru": "Совмещённые полосы вероятностей показывают, как температура усиливает и сглаживает различия. Данные о разрешении равенства на границе top-k и об округлении веса до нуля позволяют отличить множество кандидатов, отобранных по рангу, от носителя распределения в f64. Список интервалов для выборов с заданным начальным состоянием генератора показывает, куда попадает каждое случайное число при вызове sample_next_token."
    }
  },
  "decoder_connection": {
    "en": "The cumulative decoder can now load its selected checkpoint, turn each final-position logit row into a controlled next-token distribution, replay choices from a restored random-generator state, stop at EOS or context capacity, and expose the uncached reference sequence that Chapter 37 will preserve incrementally.",
      "ru": "К этому этапу программа умеет загрузить выбранную контрольную точку, преобразовать строку логитов последней позиции в управляемое распределение следующего токена, повторить выбор после восстановления состояния генератора, остановиться при появлении EOS или исчерпании ёмкости контекста и получить эталонную последовательность без кэша, которую поэтапные вычисления в главе 37 должны точно воспроизвести."
  },
  "terminology": [
    {
      "concept_id": "temperature-top-k",
      "en": "temperature and top-k sampling",
      "ru": "случайный выбор с температурой после фильтрации top-k"
    },
    {
      "concept_id": "greedy-decoding",
      "en": "greedy decoding",
      "ru": "жадное декодирование"
    },
    {
      "concept_id": "temperature",
      "en": "sampling temperature",
      "ru": "температура при случайном выборе"
    },
    {
      "concept_id": "top-k-set",
      "en": "rank-retained top-k set",
      "ru": "множество кандидатов top-k, отобранных по рангу"
    },
    {
      "concept_id": "positive-sampling-support",
      "en": "positive representable sampling support",
      "ru": "носитель распределения в f64 — токены с положительной представимой вероятностью"
    },
    {
      "concept_id": "categorical-sampling",
      "en": "seeded categorical sampling",
      "ru": "случайный выбор из категориального распределения с заданным начальным состоянием генератора"
    },
    {
      "concept_id": "uncached-generation",
      "en": "uncached full-prefix generation",
      "ru": "генерация без кэша с полным пересчётом префикса"
    }
  ],
  "translation_notes": [
    "Chapter 36 has the exact active locale set {en, ru}. English content revision 6 is the canonical semantic source; Russian was translated directly from that frozen revision and must be refreshed if it changes.",
    "canonical English SHA-256: c7cb002e4cdacae8ef3e1c2d49499a7dc699a6402097c6661b0a5652621f66f1",
    "reviewed Russian SHA-256: 1d2648a7190f16e4920e8295dd181f373c43ef000ddbf84f63f92bc7d0c83360",
    "The English and reviewed Russian Chapter 36 cheat sheets have SHA-256 693476c26ca9178e781e6b2d6f81ed7be9f82e5a3975b46159bdce007d032bdf and bf7dd37eae2a00e1d1af1fe870e4c54d8544c77f203398cf5b45d9135db05b1f respectively; both expose the same thirteen concepts, including a dedicated positive representable sampling support entry.",
    "Preserve tau, k, K_k, ell_i, q_i, q-hat_i, S_(tau,k)^(f64), token IDs, seeds, logits, probabilities, f64::MIN_POSITIVE, half-open intervals, and exact trace tokens.",
    "Keep the rank-retained top-k set distinct from positive representable sampling support. In Russian use множество кандидатов top-k, отобранных по рангу and носитель распределения в f64 — токены с положительной представимой вероятностью.",
    "Keep the ordinary compact SampledToken result distinct from the explicitly requested SamplingDecision distribution trace without implying that the algorithm needs no private ranking or probability workspace.",
    "Preserve the generation ownership order: read the saved RNG state from the loaded checkpoint, consume the checkpoint with into_model so its owned model buffers move into the decoder, and replay from the recorded RNG state.",
    "For Russian, describe checkpoint ownership naturally as вызвать для загруженной контрольной точки метод into_model, передав её по значению, and describe the result as переместить принадлежащие ей буферы модели; avoid потребить контрольную точку, случайное состояние, уже владеемые буферы, and translating prompt as подсказка.",
    "Greedy is a separate valid mode; tau equals zero is only a mathematical limit and is rejected as a stochastic setting.",
    "Top-k is a useful controlled decoder but not a universal quality guarantee, hallucination defense, or endpoint of decoding research.",
    "The history must remain about language-model decoding from constrained search to open-ended sampling, not programming languages."
  ],
  "acceptance_examples": [
    {
      "input": "Rank logits [0,1,1,2] with k equal to 2",
      "expected": "Token 3 ranks first; equal-logit tokens 1 and 2 are ordered by ID, so token 1 survives and token 2 receives exactly zero probability."
    },
    {
      "input": "Use temperature 1 and k equal to 2",
      "expected": "The retained token-ID probabilities are q_1 approximately 0.268941421370 and q_3 approximately 0.731058578630, and they sum to one within 1e-12."
    },
    {
      "input": "Use logits [2,2,1], temperature f64::MIN_POSITIVE, and k equal to 3",
      "expected": "Stable rank retains IDs [0,1,2], while token 2's represented exponential weight and stored probability round to zero, so positive representable sampling support is [0,1]."
    },
    {
      "input": "Replay eight draws from SplitMix64 seed 36 with temperature 1 and k equal to 3",
      "expected": "Both runs select [3,2,2,2,3,3,3,3] and finish with identical RNG state."
    },
    {
      "input": "Choose greedy and then stochastic k equal to 1 on the same logits",
      "expected": "Both choose token 3; greedy consumes no draw, while the stochastic policy consumes exactly one draw."
    },
    {
      "input": "Load the Chapter 35 checkpoint, resume its RNG, and generate from prompt [0] without EOS",
      "expected": "The fixture records the checkpoint's saved RNG state, consumes the checkpoint by moving its owned model buffers into the decoder, emits [4,4] from complete prefixes of lengths [1,2], performs two full-prefix calls, and stops before any third call would exceed context capacity."
    },
    {
      "input": "Repeat the loaded run with token 4 configured as EOS",
      "expected": "The generated sequence includes [4], reports an EOS stop, and performs exactly one full-prefix call."
    },
    {
      "input": "Pass temperature zero, k zero, or a nonfinite logit",
      "expected": "A typed error is returned before SplitMix64 state advances."
    },
    {
      "input": "cargo run --quiet --locked -p ch36-temperature-top-k",
      "expected": "stdout equals rust/demos/ch36-temperature-top-k/expected.txt byte for byte, including the final newline."
    }
  ]
}
---

# Chapter 36: Shape the next-token distribution, then draw one token

<!-- contract-section:scope -->
## Scope

This chapter teaches one inference boundary: turn the decoder's final-position
logits into a controlled next-token distribution using explicit greedy selection
or positive-temperature top-k sampling, then replay stochastic choices by
restoring the same random-generator state. It covers stable ties, numerical
renormalization, the difference between rank retention and positive representable
sampling support, one seeded categorical draw, EOS, token and context limits,
invalid settings, and an uncached full-prefix loop.

The implementation retains the entire prefix and recomputes it for every next
token. It does not slide a full context window, search multiple sequences, claim
that top-k guarantees quality, or cache attention keys and values. Chapter 37
makes one attention layer incremental; Chapter 38 owns model-wide cached
generation.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use token-ID-ordered logits $[0,1,1,2]$. The stable descending-logit order,
with ascending token ID as the tie-breaker, is $[3,1,2,0]$: token $3$ has the
largest logit, and equal-logit tokens $1$ and $2$ keep ascending ID order. With
$\tau=1$ and $k=2$, only IDs $3$ and $1$ are retained. The stored probabilities
are approximately $\widehat q_1=0.268941421370$ and
$\widehat q_3=0.731058578630$; IDs $0$ and $2$ receive exact zero.

Use logits $[2,2,1]$, temperature `f64::MIN_POSITIVE`, and $k=3$ to expose the
floating-point boundary. Stable rank retains $K_3=[0,1,2]$, while token $2$'s
represented exponential weight and stored probability round to zero. Therefore
$\widehat q_2=0$ and $S_{\tau,3}^{(\mathrm{f64})}=\{0,1\}$.

At $k=3$, seed $36$ produces the eight-token sequence
$[3,2,2,2,3,3,3,3]$. The ordinary fixture's selections use its recorded
positive-probability intervals in ascending token-ID order. The same seed repeats
the same draws, intervals, tokens, and final RNG state. Exact-zero probabilities
are excluded; no universal claim is made that every positive stored probability
must receive a nonempty reachable interval.

The loaded Chapter 35 decoder has context capacity $2$. Prompt $[0]$ therefore
supports full-prefix calls at lengths $1$ and $2$, producing $[4,4]$, after
which another call would exceed capacity. Configuring token $4$ as EOS stops
after the first emitted token.

<!-- contract-section:formula -->
## Formula and symbols

For finite logits and positive temperature, real arithmetic defines the ideal
distribution $q_i^{(\tau,k)}$. The implementation stores
$\widehat q_i^{(\tau,k)}$ in `f64`, whose positive support may be a strict subset
of the rank-retained set:

$$
q_i^{(\tau,k)}=\frac{\mathbf{1}[i\in K_k]\exp(\ell_i/\tau)}{\sum_j\mathbf{1}[j\in K_k]\exp(\ell_j/\tau)},\quad \lvert K_k\rvert=k,\quad S_{\tau,k}^{(\mathrm{f64})}=\{i\in K_k\mid\widehat q_i^{(\tau,k)}>0\}\subseteq K_k.
$$

$\ell_i$ is token $i$'s final-position logit. $K_k$ contains exactly the $k$
highest ranked IDs, where $V$ is the vocabulary size and $1\le k\le V$. The
indicator $\mathbf{1}[i\in K_k]$ makes a retained term $1$ and a filtered term
$0$ in the ideal formula. Its denominator sums over vocabulary index $j$, so the
ideal probabilities sum to one. $\widehat q_i^{(\tau,k)}$ is the stored `f64`
probability, and $S_{\tau,k}^{(\mathrm{f64})}$ contains exactly the retained IDs
whose stored probability is positive. A retained weight may round to zero after
the rank decision, making the inclusion strict.

$\tau>0$ controls shape without changing rank. As $\tau\to0^+$, a unique
maximum concentrates toward one greedy choice; increasing $\tau$ flattens the
retained probabilities. The API does not divide by literal zero: greedy is a
separate mode. With $k=1$, stochastic top-k selects the greedy token but still
consumes one categorical draw by contract.

<!-- contract-section:history -->
## Before controlled open-ended LLM sampling

[Fan, Lewis, and Dauphin](https://arxiv.org/pdf/1805.04833) make the open-ended
distinction concrete: their story system samples from the ten most likely next
words, tunes a softmax temperature, and reports that beam search is too common
and repetitive for that task while unrestricted sampling can admit damaging
unlikely words.

The [GPT-2 report](https://cdn.openai.com/better-language-models/language-models.pdf)
then documents top-k random sampling with $k=2$ for one summarization setup and
$k=40$ for long open continuations. Those choices show top-k in large
Transformer language-model practice; they do not establish $40$ as optimal or
specify this course's seed and tie rules.

[Holtzman and colleagues](https://arxiv.org/pdf/1904.09751) analyze GPT-2
decoding directly. They contrast repetitive maximization, incoherent unrestricted
tail sampling, temperature shaping, and truncated sampling; define top-k as
sampling from the $k$ highest-probability tokens after renormalization; and show
why one fixed $k$ is context-insensitive when distributions vary from flat to
peaked. Their nucleus method is a later response to that limitation. This
chapter keeps top-k because it is the smallest controlled stochastic decoder
that exposes every decision clearly, not because it ends the history.

<!-- contract-section:rust-behavior -->
## Rust behavior

`SamplingMode::Greedy` validates finite nonempty logits, chooses the lowest ID
among maxima, and leaves RNG state untouched. `TemperatureTopK` additionally
requires finite $\tau>0$ and $1\le k\le V$, keeps exactly $k$ stable ranks,
uses max-shifted exponentials, stores exact zero for removed IDs, permits a
retained represented weight to underflow to zero, and consumes one SplitMix64
draw only after validation succeeds.

`sample_next_token`, `sample_next_token_with_trace`, and
`sampling_distribution` share one calculation that validates the inputs, ranks
and filters the logits, and turns the retained logits into stored probabilities.
The ordinary `sample_next_token` result contains only the selected
token ID, optional draw, and half-open interval. The traced call additionally
builds the complete token-ID-ordered candidate records and rank-ordered retained
list before the draw, while `sampling_distribution` builds the same records
without a draw. Both sampling calls use one interval-selection implementation.
The ordinary path still owns the temporary ranked IDs and probabilities required
to perform the algorithm; it does not build the additional inspection records.
Interval traversal skips every stored zero probability. That certainly excludes
zero-probability retained tokens from selection without asserting that every
positive stored probability owns a nonempty reachable interval in every case.

`generate_uncached` validates prompt and EOS IDs, runs the complete decoder
prefix under the no-gradient boundary, extracts the last vocabulary row, and
records each compact selection without constructing a complete inspectable
candidate distribution per generated token. The result includes emitted IDs,
per-step prefix lengths, the stop reason, and full-prefix call count. EOS remains
in the emitted sequence.

The demo loads bytes produced by the Chapter 35 checkpoint fixture. It first
records the saved RNG state, then consumes the checkpoint and moves its owned
model buffers into the decoder because no later operation needs that checkpoint
object. Generation starts from the recorded RNG state. Its standard output and
separate diagram trace are exact, deterministic Rust evidence.

Over the full temperature-$1$ distribution, greedy chooses token $3$ without
advancing the random generator. Fixed $k=3$ keeps IDs $[3,1,2]$, retaining
probability mass $0.927670511871$ and removing mass $0.072329488129$ before
renormalization. These measurements expose the truncation mechanism; they do
not by themselves establish which policy produces better text.

<!-- contract-section:visualization -->
## Visualization

One locale-neutral figure consumes the exact Rust trace. Three aligned bar groups
show the same four logits at $\tau=0.5$, $\tau=1$, and $\tau=2$. A semantic
top-k table shows stable rank, retained versus removed status, and renormalized
probability. A compact underflow card then shows retained IDs $[0,1,2]$, positive
support $[0,1]$, and $\widehat q_2=0$; each of its three token rows states the
stored probability and whether the token is inside or outside positive `f64`
support. The figure labels the change from that
support fixture to the $\tau=1$, $k=3$, seed-$36$ draw policy before showing its
half-open intervals.
It then labels the fixture change from synthetic $V=4$ logits to the loaded
$V=5$ decoder and displays the context-stop run's absent EOS policy beside the
EOS-token-$4$ run. Text, double versus dashed borders, and kept/removed words
repeat every distinction so color is never the only cue.

The reading order is temperature comparison, tied boundary, positive-support
boundary, seeded draw, then loaded generation proof. The smallest wide table is
the only named keyboard region on a narrow screen.

<!-- contract-section:exercises -->
## Prediction checks

1. Which ID wins greedy when IDs $1$ and $2$ have equal logits but ID $3$ has
   logit $2$?
2. Which equal-logit ID survives the $k=2$ boundary?
3. Does raising $\tau$ change stable rank?
4. Why is literal $\tau=0$ rejected even though the zero-temperature limit is
   useful?
5. Does stochastic $k=1$ consume a draw?
6. Which interval contains unit draw $0.338833394523$ for the $k=3$ fixture?
7. Is EOS included in emitted token IDs?
8. Why may a capacity-two prefix still emit one token before a context stop?
9. For logits $[2,2,1]$, temperature `f64::MIN_POSITIVE`, and $k=3$, does
   rank-retained token $2$ belong to positive `f64` sampling support?

Checks: greedy selects $3$; the lower tied ID $1$ survives; temperature changes
probability ratios but not rank; division by zero is undefined, so greedy owns
that deterministic policy; stochastic $k=1$ consumes one draw; the stated draw
falls in token $2$'s half-open interval; EOS is included; and a valid capacity-two
prefix predicts one next token even though the resulting sequence cannot be fed
back for another uncached call; and token $2$ remains in $K_3$ but has
$\widehat q_2=0$, so positive support is $\{0,1\}$.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

The selected checkpoint now produces controlled next-token distributions and,
when the same random-generator state and deterministic traversal rules are
restored, one replayable uncached reference sequence. Chapter 37 will append one
position's key and value vectors inside one attention layer and check that its
newest-position result matches this full-prefix computation.

<!-- contract-section:localization -->
## Localization notes

English is the canonical source. Keep mathematical symbols and exact trace
values language-neutral. Distinguish greedy selection, the limit
$\tau\to0^+$, and the invalid setting $\tau=0$. Translate top-k as a candidate
set of fixed cardinality, not a probability threshold. Replayability requires
the same random-generator state and deterministic ordering; it does not follow
from temperature or top-k alone. Translate rank-retained top-k set as
`множество кандидатов top-k, отобранных по рангу` and positive representable
sampling support as `носитель распределения в f64 — токены с положительной
представимой вероятностью`.

<!-- contract-section:acceptance -->
## Acceptance examples

The acceptance examples in frontmatter freeze the tied boundary, normalized
probabilities, the retained-set versus positive-support underflow boundary,
seed-$36$ sequence, greedy and stochastic draw behavior, loaded checkpoint
sequence, EOS and context stops, and transactional errors. The
declared Rust, content, static-build, link, and Firefox commands with JavaScript
enabled must all pass before publication.
