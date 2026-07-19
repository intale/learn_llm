---
{
  "chapter_id": "05-autoregressive-examples",
  "concept_id": "boundary-safe-causal-windows",
  "content_revision": 1,
  "order": 5,
  "objective": {
    "en": "Turn each encoded document into fixed-length input–target pairs for next-token prediction without joining documents or data partitions.",
    "ru": "Преобразовать каждый закодированный документ в пары фиксированной длины «вход — цель» для предсказания следующего токена, не объединяя документы и выборки данных."
  },
  "worked_inputs": {
    "en": "For the document [BOS, 41, 42, 43, 44, EOS], context length three, and stride one, find every complete input–target pair and the suffix at the next candidate start, which is too short to form another pair.",
    "ru": "Для документа [BOS, 41, 42, 43, 44, EOS] при длине контекста 3 и шаге 1 найдите все полные пары «вход — цель». Затем определите, какие токены остаются в следующей выбранной шагом позиции и почему из них нельзя построить новую пару."
  },
  "formula": {
    "latex": "x^{(s)}=z_{s:s+T}, \\quad y^{(s)}=z_{s+1:s+T+1}",
    "symbols": [
      {
        "symbol": "z",
        "en": "one encoded document, including its BOS and EOS boundary tokens",
        "ru": "последовательность токенов одного документа вместе с граничными токенами BOS и EOS"
      },
      {
        "symbol": "T",
        "en": "the positive context length and the length of both the input and target",
        "ru": "положительная длина контекста; столько токенов входит и во вход, и в целевую последовательность"
      },
      {
        "symbol": "s",
        "en": "a candidate start kS selected by the stride; it produces a pair only when the document contains all T+1 required source tokens",
        "ru": "одна из начальных позиций s=kS, задаваемых шагом S; пара строится, только если начиная с s в документе есть все T+1 исходных токенов"
      },
      {
        "symbol": "S",
        "en": "the positive distance between consecutive candidate starts",
        "ru": "положительное расстояние между соседними рассматриваемыми позициями"
      },
      {
        "symbol": "x^{(s)}",
        "en": "the T-token input sequence beginning at s",
        "ru": "входная последовательность из T токенов, начинающаяся в позиции s"
      },
      {
        "symbol": "y^{(s)}",
        "en": "the T-token target slice beginning one source position after the input, so each position names the next-token target",
        "ru": "участок той же исходной последовательности, сдвинутый на один токен вправо; в каждой позиции находится следующий токен, который нужно предсказать"
      }
    ]
  },
  "history": {
    "approach": {
      "en": "Task-specific hand-labeled examples and next-token targets derived from the sequence itself",
      "ru": "Ручная разметка ответов для отдельных задач и автоматическое получение целей из последовательности токенов"
    },
    "summary": {
      "en": "Task-specific supervised NLP uses answers supplied separately from the input. A language model can instead use the next token in the same sequence as the target at every usable position. Bengio et al. factorized a sentence into next-word conditionals over recent context, and the GPT-2 report emphasized learning from naturally occurring sequences rather than task-specific labeled datasets. Neither source defines this course's document boundaries, fixed train/validation/test split, stride, or too-short-suffix policy. Those choices preserve document and split identity so later fitting code can explicitly select training data, and they make example counts reproducible.",
      "ru": "В задачах с отдельной разметкой правильный ответ хранится отдельно от входа. Языковой модели отдельная метка для каждой позиции не нужна: целью служит следующий токен той же последовательности. Бенжио и соавторы раскладывают вероятность предложения в произведение условных вероятностей следующего слова при фиксированном числе предшествующих слов. В отчёте GPT-2 используется та же авторегрессионная факторизация, а обучение на текстах без разметки под конкретную задачу сопоставляется с обучением на специализированных размеченных наборах. Эти источники не определяют выбранные для курса границы документов, разбиение на обучающую, валидационную и тестовую выборки, шаг и правило обработки остатка, из которого нельзя построить пару. Наша реализация хранит ID каждого документа и его принадлежность к выборке. Благодаря этому код обучения может явно выбрать только обучающие документы, а фиксированные правила делают число примеров воспроизводимым."
    },
    "rust_contrast": "Print two token sequences with manually supplied sentiment-class labels, then derive three complete shifted pairs and report the too-short suffix at the next candidate start in one six-token document."
  },
  "rust": {
    "package": "ch05-autoregressive-examples",
    "sources": [
      "rust/crates/llm-from-scratch/src/data.rs",
      "rust/demos/ch05-autoregressive-examples/src/lib.rs",
      "rust/demos/ch05-autoregressive-examples/src/main.rs"
    ],
    "expected_output": "task-specific hand-labeled contrast: sentiment rows=2\nlabeled row 0: input=[41, 42, 43] label=negative\nlabeled row 1: input=[51, 52, 53] label=positive\nsource sequence for next-token targets: [0, 41, 42, 43, 44, 1]\nconfig: context=3 stride=1 required=4\ngenerated pairs: 3\npair start=0 input=[0, 41, 42] target=[41, 42, 43]\npair start=1 input=[41, 42, 43] target=[42, 43, 44]\npair start=2 input=[42, 43, 44] target=[43, 44, 1]\nnext start too short: start=3 tokens=[43, 44, 1] required=4 emitted=false\nshort document: [0, 61, 1] pairs=0 suffix=[0, 61, 1]\nfrozen encoded documents: train=8 validation=2 test=2\nencoded pairs at context=3 stride=1: train=1828 validation=465 test=438\nchapter 6 handoff: count each adjacent training-document transition once\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "autoregressive-examples",
    "rationale": {
      "en": "Separate partition and document tapes make the one-token shift, overlapping pairs, too-short suffixes, and boundaries between unrelated sequences visible at the same time.",
      "ru": "Отдельные области для выборок и отдельная лента для каждого документа одновременно показывают сдвиг на один токен, перекрывающиеся пары, остатки, из которых нельзя построить новую пару, и границы между независимыми последовательностями."
    }
  },
  "decoder_connection": {
    "en": "Each pair supplies an input sequence and the expected next-token ID at every position. The alignment defines targets but does not prevent a model from reading later input positions; model-side causal computation must enforce that limit. Chapter 6 returns to the original training documents so overlapping pairs do not multiply transition counts, and validation and test documents do not influence fitting.",
    "ru": "Каждая пара содержит входную последовательность и правильный ID следующего токена для каждой позиции. Такое выравнивание задаёт цели, но не мешает модели видеть более поздние позиции входа: доступ к ним нужно отдельно ограничить в самой модели. В главе 6 переходы считаются по исходным обучающим документам: так один и тот же переход не учитывается несколько раз из-за перекрывающихся пар, а валидационные и тестовые документы не используются при подборе параметров."
  },
  "terminology": [
    {
      "concept_id": "autoregressive-example",
      "en": "autoregressive example",
      "ru": "авторегрессионный пример"
    },
    {
      "concept_id": "input-target-pair",
      "en": "input–target pair",
      "ru": "пара «вход — цель»"
    },
    {
      "concept_id": "context-length",
      "en": "context length",
      "ru": "длина контекста"
    },
    {
      "concept_id": "stride",
      "en": "stride",
      "ru": "шаг"
    },
    {
      "concept_id": "shifted-target",
      "en": "one-token-shifted target",
      "ru": "целевая последовательность со сдвигом на один токен"
    },
    {
      "concept_id": "too-short-suffix",
      "en": "suffix too short for another pair",
      "ru": "остаток, которого недостаточно для новой пары"
    },
    {
      "concept_id": "sequence-derived-target",
      "en": "sequence-derived target",
      "ru": "цель, полученная из самой последовательности"
    }
  ],
  "translation_notes": [
    "Translate the autoregressive relation and pair-construction policy by meaning, not by copying English syntax. In Russian prose, explain sequence-derived targets directly; do not rely on an unexplained calque of self-supervision.",
    "Use the concise established term «шаг» for stride and define it as the distance between candidate starts.",
    "Describe the too-short suffix carefully: no separate pair starts there, although some of its tokens may already occur in an earlier complete input or target.",
    "Keep the formula, half-open slice notation, Rust identifiers, numeric IDs, arrays, trace grammar, partition names inside trace output, BOS, EOS, T, S, s, x, y, and z identical in every locale.",
    "Translate visible partition, document, input, target, candidate-start, pair, and suffix labels outside technical trace islands. Do not translate source URLs or paper titles.",
    "The cited papers support next-symbol factorization and the contrast with task-specific labeled supervision. Present document boundaries, fixed partitions, stride, and the complete-pair-only policy as course decisions, not as claims sourced from those papers."
  ],
  "acceptance_examples": [
    {
      "input": "z=[0,41,42,43,44,1], T=3, S=1",
      "expected": "Emit starts 0, 1, and 2 with inputs [0,41,42], [41,42,43], [42,43,44] and targets [41,42,43], [42,43,44], [43,44,1]; the suffix at start 3 is too short for another pair."
    },
    {
      "input": "z=[0,61,1], T=3, S=1",
      "expected": "Emit zero pairs and report the whole three-token document as the suffix at the first candidate start; do not pad it."
    },
    {
      "input": "z=[0,41,42,43,44,1], T=3, S=2",
      "expected": "Emit pairs at starts 0 and 2; skip otherwise valid start 1 because the stride does not select it; report suffix [44,1] at candidate start 4."
    },
    {
      "input": "z=[0,1], T=1, S=1",
      "expected": "Emit the valid boundary pair [BOS] -> [EOS]."
    },
    {
      "input": "a four-token document, T=3, S=5",
      "expected": "Emit one exact-fit pair at start 0 and report no empty suffix because the next candidate start lies beyond the document."
    },
    {
      "input": "suffix [43,44,1] at start 3 of the worked document",
      "expected": "Emit no new pair there, while retaining the same tokens in complete pairs that began earlier; the suffix is not discarded data."
    },
    {
      "input": "documents [0,10,1] and [0,20,1], T=2",
      "expected": "Iterate each document independently; never emit [10,1] -> [1,0], whose final target would cross the EOS-to-BOS boundary."
    },
    {
      "input": "the same encoded document iterated twice",
      "expected": "Both passes produce the same starts and borrowed slices without consuming or mutating the source."
    },
    {
      "input": "cargo run --quiet --locked -p ch05-autoregressive-examples",
      "expected": "Standard output is byte-for-byte equal to rust/demos/ch05-autoregressive-examples/expected.txt."
    },
    {
      "input": "Chapter 6 transition counting",
      "expected": "Read each original training document once rather than recounting adjacent transitions through overlapping pairs."
    },
    {
      "input": "one-token-shifted targets",
      "expected": "Treat them as the correct answers only; require left-to-right recurrent computation or a causal self-attention mask to prevent access to later input positions."
    },
    {
      "input": "cargo run --quiet --locked -p ch05-autoregressive-examples --example diagram_trace",
      "expected": "Standard output is byte-for-byte equal to rust/demos/ch05-autoregressive-examples/diagram-trace.txt."
    }
  ]
}
---

# Chapter 05: Building autoregressive input–target pairs / Авторегрессионные пары «вход — цель»

<!-- contract-section:scope -->
## Scope

An autoregressive language model predicts each token from earlier tokens. Turn
each frozen sequence with BOS and EOS into complete input–target pairs. Fix a
positive context length `T` and positive stride `S`; let the stride select
candidate starts `s=kS` for nonnegative integers `k=0,1,2,...` inside one document,
and emit a pair only when all `T+1` source tokens exist. Preserve document and
train/validation/test membership rather than concatenating sequences. Defer
probability estimation, randomized mini-batch sampling, padding, and tensor
storage. The pairs define the correct positionwise targets; they do not yet limit
which input positions a model may inspect for each prediction.

Авторегрессионная языковая модель предсказывает следующий токен по предшествующим
токенам. Из
каждой зафиксированной последовательности с BOS и EOS строятся полные пары «вход
— цель». Задаются положительная длина контекста `T` и положительный шаг `S`;
начальные позиции `s=kS`, где `k=0,1,2,...`, рассматриваются отдельно для каждого
документа. Пара появляется лишь тогда, когда от начальной позиции есть все `T+1`
исходных токенов. Документы и выборки не объединяются. Оценивание вероятностей,
случайное формирование мини-пакетов, дополнение коротких последовательностей и
хранение тензоров откладываются до следующих глав. Пары задают правильную цель в
каждой позиции, но пока не ограничивают доступ модели к более поздним элементам
входа.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use `z=[0,41,42,43,44,1]`, where `0` is BOS and `1` is EOS. With `T=3` and
`S=1`, starts 0, 1, and 2 each have four source tokens. They produce
`[0,41,42] -> [41,42,43]`, `[41,42,43] -> [42,43,44]`, and
`[42,43,44] -> [43,44,1]`. At candidate start 3 only `[43,44,1]` remains, so no
fourth pair is emitted. Those three tokens are not erased: they already occur in
earlier complete pairs; the suffix at start 3 is merely too short for another
pair.

Возьмём `z=[0,41,42,43,44,1]`, где `0` — BOS, а `1` — EOS. При `T=3` и `S=1`
для начальных позиций 0, 1 и 2 доступны четыре исходных токена. Получаются пары
`[0,41,42] -> [41,42,43]`, `[41,42,43] -> [42,43,44]` и
`[42,43,44] -> [43,44,1]`. В позиции 3 остаётся только `[43,44,1]`, поэтому
четвёртая пара не строится. Эти три токена не отбрасываются: они уже входят в
предыдущие полные пары. Токенов в остатке в позиции 3 просто недостаточно для
новой пары.

<!-- contract-section:formula -->
## Formula and symbols

$$
x^{(s)}=z_{s:s+T}, \quad y^{(s)}=z_{s+1:s+T+1}
$$

Both half-open slices contain exactly `T` token IDs. The target is the input span
shifted right by one position, so `y_i` is the observed next token after `x_i`.
A candidate start produces a pair exactly when `s+T < |z|`; equivalently, its
source span contains `T+1` tokens. `T` is the input length, target length, and
maximum context available inside one pair; causal computation for `y_i` may use
only `x_0` through `x_i`. `S` is the distance between candidate starts: `S=1`
considers every possible start, while a larger stride produces fewer pairs,
skips some otherwise complete starts, and can leave gaps when `S>T`.

Оба полуинтервала содержат ровно `T` ID токенов. Целевая последовательность —
это входной участок, сдвинутый на одну позицию вправо, поэтому `y_i` — токен
документа, непосредственно следующий за соответствующим `x_i`. Из начальной
позиции получается пара
тогда и только тогда, когда `s+T < |z|`, то есть в исходном участке есть `T+1`
токенов. `T` задаёт длину входа и цели, а также наибольший доступный контекст
внутри одной пары; при предсказании `y_i` модель должна использовать только
`x_0,...,x_i`, но не более поздние элементы входа. `S`
определяет расстояние между начальными позициями: при `S=1` рассматривается каждая
возможная позиция, а больший шаг даёт меньше пар, пропускает часть подходящих
позиций и при `S>T` может оставлять промежутки.

<!-- contract-section:history -->
## Deriving next-token targets from sequence order

In a task-specific classification dataset, people supply an answer separately
from each input. Language modeling can obtain many targets without adding such
labels by hand: the next token is already present in the sequence.
[Bengio et al. (2003)](https://www.jmlr.org/papers/v3/bengio03a.html) factorize a
sentence into next-word conditional probabilities and use a fixed recent context.
The [GPT-2 report (2019)](https://cdn.openai.com/better-language-models/language-models.pdf)
contrasts task-specific labeled datasets with learning from naturally occurring
sequences and uses the same autoregressive factorization.

В задаче классификации ответ задают отдельно от входа. Для языковой модели
правильные ответы уже содержатся в самой последовательности: после каждого
контекста, за которым в документе есть ещё один токен, этот токен и служит целью.
[Бенжио и соавторы (2003)](https://www.jmlr.org/papers/v3/bengio03a.html)
раскладывают вероятность предложения в произведение условных вероятностей
следующего слова при фиксированном числе предшествующих слов. В [отчёте GPT-2 (2019)](https://cdn.openai.com/better-language-models/language-models.pdf)
используется та же авторегрессионная факторизация; авторы сопоставляют обучение на
текстах без специальной разметки с обучением на наборах, размеченных под
конкретные задачи.

The Rust demo makes the difference concrete: two sentiment-classification rows
carry human-supplied class labels, while one six-token sequence yields three
aligned next-token pairs. This contrast does not imply that early language models
needed people to label every next word. The cited papers also do not prescribe
this course's document boundaries, fixed partitions, stride, or too-short-suffix
rule. Those choices preserve document identity and split membership so fitting
code can explicitly use training documents only, and they make the example count
reproducible.

В демонстрации на Rust это различие видно непосредственно: у двух примеров для
классификации тональности метки класса заданы людьми, а из одной
последовательности из шести токенов получаются три выровненные пары для
предсказания следующего токена. Это сравнение не означает, что для ранних
языковых моделей люди вручную размечали каждое следующее слово. Упомянутые статьи
не определяют выбранные для курса разбиение 8/2/2, границы документов, шаг и
правило обработки остатка, из которого нельзя построить пару. В реализации
каждый документ хранится вместе со своим ID и принадлежностью к выборке. Поэтому
код обучения может явно использовать только обучающие документы, а число
примеров остаётся воспроизводимым.

<!-- contract-section:rust-behavior -->
## Rust behavior

`CausalWindowConfig::new` rejects zero context length or stride and rejects
`T=usize::MAX`, for which `T+1` cannot be represented. `window_count` counts
candidate starts with a complete `T+1`-token span. The borrowed iterator yields
`CausalWindow { start, input, target }` without copying or mutating token IDs; the
target slice begins one source position after the input. `incomplete_tail` is the
API name for the suffix at the first candidate start that is too short for a
pair. It returns `None` when that start is at or beyond the document end. A
returned suffix may overlap earlier complete pairs and is never padded or emitted.
`CausalWindowConfig::windows` assumes its token slice contains exactly one
document; token IDs alone do not tell it where one document ends and another
begins. The canonical corpus path therefore calls `EncodedDocument::windows`.

`EncodedCorpusPartitions::from_partitions(&CorpusPartitions, &BpeTokenizer)`
infallibly calls `encode_utf8_document` with the frozen Chapter 4 tokenizer for
every Chapter 2 document and retains its ID and partition. It neither trains a
tokenizer nor reuses the temporary IDs on which Chapter 3 learned merge rules.
Callers request one partition at a time, then build pairs separately for each
`EncodedDocument`. Tests cover exact shifted slices, stride, BOS input, EOS
target, empty token slices, empty-content wrapped documents, exact fits,
too-short suffixes, repeatable iteration, overflow-resistant counts, and the
fixed 8/2/2 corpus split.

`CausalWindowConfig::new` отклоняет нулевую длину контекста, нулевой шаг и
`T=usize::MAX`, поскольку для такого значения невозможно представить `T+1`.
`window_count` подсчитывает позиции, в которых есть полный участок из `T+1`
токенов. Итератор возвращает `CausalWindow { start, input, target }`, не копируя и
не изменяя ID; целевой срез начинается на одну исходную позицию позже входного.
`incomplete_tail` возвращает остаток в первой выбранной шагом позиции, из которой
уже нельзя построить пару. При вычислении этой позиции проверяется переполнение.
Если позиция находится в конце документа или за ним, метод возвращает `None`.
Токены найденного остатка могли уже войти в предыдущие пары; остаток не
дополняется и не превращается в отдельный пример.
`CausalWindowConfig::windows` принимает срез токенов ровно одного документа: по
самим ID он не может определить границу между двумя документами. Поэтому основной
путь обхода вызывает `EncodedDocument::windows`.

`EncodedCorpusPartitions::from_partitions(&CorpusPartitions, &BpeTokenizer)` без
ошибок независимо кодирует каждый документ токенизатором, зафиксированным в
главе 4, и сохраняет ID документа и принадлежность к выборке. Метод `documents`
возвращает документы только из явно указанной выборки. Здесь используются
окончательные ID токенизатора главы 4, а не вспомогательное пространство ID, в
котором в главе 3 обучались правила слияния. Тесты проверяют точный сдвиг срезов,
шаг, BOS во входе, EOS в цели, пустые срезы токенов, документы с пустым
содержимым, точное заполнение пары, остатки без полной пары, повторный обход,
безопасный подсчёт и зафиксированное разбиение корпуса 8/2/2.

<!-- contract-section:visualization -->
## Visualization

Parse only the strict `TRACE autoregressive-examples-v1` block produced by
`cargo run --quiet --locked -p ch05-autoregressive-examples --example diagram_trace`.
Render train, validation, and test as separate regions, with a separate token tape
for every document. Align input and target rows under their source positions and
mark the one-position shift with arrows. Show an outlined, text-labeled suffix
that is too short for a pair at the next candidate start; never imply that its
tokens were deleted.
The parser validates trace grammar, identities, lengths, shift alignment, start
order, and boundaries, but does not choose or generate windows itself.

Каждая выборка и каждый документ показаны отдельно. Под исходной лентой токенов
выровнены строки входа и целевой последовательности, а стрелки обозначают сдвиг
на одну позицию. В следующей начальной позиции рамкой и текстовой подписью
отмечается остаток, которого недостаточно для новой пары; изображение не должно
создавать впечатление, будто его токены удалены. Технические ленты читаются слева направо, а порядок обхода с
клавиатуры совпадает с порядком объяснения. На узком экране документы и пары
располагаются вертикально. Граница, текст и форма служат независимыми от цвета
признаками.

<!-- contract-section:exercises -->
## Prediction checks

1. For `[0,41,42,43,44,1]`, predict every pair at `T=3, S=1` before running Rust.
2. Repeat with `S=2`; identify the pair-producing starts, the otherwise valid skipped start, and the suffix at candidate start 4.
3. Explain why `[0,61,1]` emits no pair at `T=3` and why padding would change the policy.
4. Decide whether `[BOS] -> [EOS]` is valid for `[BOS,EOS]` at `T=1`.
5. For two separate three-token documents at `T=2`, decide whether one pair can contain tokens from both documents.
6. For an exact-fit four-token document at `T=3, S=5`, decide whether an empty suffix should be reported.
7. Explain how a suffix too short for a new pair can overlap earlier complete pairs.
8. Explain why Chapter 6 must count the original document transitions rather than every overlapping pair.
9. Decide whether shifted targets alone prevent a model from inspecting later input positions.

Answers must appear after the questions in a collapsed `<details>` block in each
localized lesson. The learner checks the worked case against exact Rust output;
the tests and the local stride/context experiment verify the additional cases.

<!-- contract-section:decoder-connection -->
## Cumulative model connection

Each autoregressive pair states the decoder's relation: at position `i`, predict
`y_i` from `x_0` through `x_i`; causal computation must hide `x_{i+1}` and later
inputs. Future tensor
and neural-network chapters will change how predictions are represented and
optimized. Pair alignment alone does not hide later entries of `x` from an
earlier prediction. A left-to-right recurrent model enforces the limit through
sequential state; a self-attention decoder needs an explicit causal mask. Chapter 6
uses the original training documents, not this overlapping view, so each adjacent
transition is counted once and validation and test documents do not influence the
fitted transition counts.

Каждая авторегрессионная пара задаёт задачу декодера: в позиции `i` нужно
предсказать `y_i` по `x_0,...,x_i`. В следующих главах изменятся представление
предсказаний и способ обучения. Само выравнивание ещё не скрывает более поздние
элементы `x` от раннего предсказания.
В рекуррентной модели с обходом слева направо это ограничение задаёт
последовательное состояние; декодеру с самовниманием нужна явная каузальная маска. В
главе 6 переходы будут считаться по исходным обучающим документам, чтобы
перекрывающиеся пары не умножали одни и те же наблюдения, а валидационные и
тестовые документы не влияли на подсчитанные переходы.

<!-- contract-section:localization -->
## Localization notes

Use natural explanatory Russian rather than mirroring English clause order.
Introduce stride as «шаг», and explain sequence-derived targets directly rather
than relying on an unexplained calque of self-supervision. Preserve formula notation,
trace output, code identifiers, IDs, arrays, BOS/EOS, and source titles. Translate
all surrounding diagram labels and accessible descriptions. A fluent Russian
reviewer must approve the complete lesson and rendered labels before publication.

<!-- contract-section:acceptance -->
## Acceptance examples

The six-token fixture emits exactly three pairs and reports that start 3 is too
short for another. The short document emits none. Synthetic train, validation, and test
documents remain visibly and structurally separate. The cumulative API encodes
the fixed corpus as 8/2/2 documents without reading across boundaries.
Exact stdout, Rust format/test/lint, contract structure/integration, configured
locale parity, content, parser/unit, type, production build/link, focused browser,
full browser, static-host smoke, and fluent-human Russian approval all pass in the
staged overlay before atomic publication.
