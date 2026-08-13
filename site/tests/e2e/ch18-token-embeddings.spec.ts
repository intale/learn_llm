// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  chapterLocales,
  chapterLocaleDefinitions,
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectSeoDescription,
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

interface LocalizedCopy {
  revisionLabel: string;
  title: string;
  description: string;
  headings: readonly string[];
  historyHeading: string;
  historyFragments: readonly string[];
  diagramTitle: string;
  diagramDescription: string;
  summaryLabels: readonly string[];
  stages: readonly string[];
  tableHeaders: {
    ids: readonly string[];
    table: readonly string[];
    lookup: readonly string[];
    gradients: readonly string[];
  };
  states: {
    unused: string;
    selectedOnce: string;
    selectedRepeated: string;
    singleRow: string;
    repeatedRow: string;
    unusedZero: string;
    singleCopy: string;
    repeatedSum: string;
    none: string;
  };
  notes: readonly string[];
  scrollers: readonly string[];
  boundaryFragments: readonly string[];
  rustCards: readonly {
    caption: string;
    label: string;
  }[];
  boundaryAnswers: readonly [string, string];
  cloneAnswer: string;
}

const chapterId = '18-token-embeddings';
const contentRevision = 8;
const formulaLatex = String.raw`X_{b,t,:}=E_{z_{b,t},:},\quad \bar{E}_{i,:}=\sum_{(b,t):z_{b,t}=i}\bar{X}_{b,t,:}`;
const upstreamAdjointLatex = String.raw`\bar{X}_{b,t,:}=\partial L/\partial X_{b,t,:}`;
const tableAdjointLatex = String.raw`\bar{E}_{i,:}=\partial L/\partial E_{i,:}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
] as const;

const normalizeRenderedTypography = (value: string) =>
  value.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();

const copy: Record<ChapterLocale, LocalizedCopy> = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Give token IDs trainable vectors',
    description:
      'Build a trainable token table, validate public token IDs once, pass owned selectors through a private validated gather plan, and scatter-add repeated-token gradients.',
    headings: [
      'Predict three selected rows and one shared gradient',
      'Select forward, accumulate backward',
      'Keep vocabulary axes separate from feature axes',
      'From sparse identity to the vector entrance of a Transformer',
      'Validate token IDs once, then reuse the gather rule',
      'Follow every selection back to its shared row',
      'Predict before checking the executable evidence',
      'Hand the final feature axis to a learned projection',
    ],
    historyHeading: 'From sparse identity to the vector entrance of a Transformer',
    historyFragments: [
      'A sparse one-hot word representation assigns one coordinate to each vocabulary item but expresses no graded similarity between words; explicitly carrying that vocabulary-wide vector also wastes work when only one row is needed.',
      'Bengio et al. learn one dense word-feature matrix jointly with a neural next-word model and reuse that matrix across context positions; each word index still selects its corresponding row. The Transformer retains learned token embeddings for subword tokens, then adds positional information before its stacked attention and feed-forward computations.',
      'One trainable vocabulary-by-feature matrix is reused at every batch item and sequence position. Each token ID selects its own vocabulary row: different IDs select different rows, while repeated occurrences of the same ID select the same row and accumulate gradients there. Reusing this input matrix across positions is separate from output-weight tying, which remains a later concern alongside positional information, embedding forward scaling, and attention.',
      'Bengio et al. represent the mapping from a vocabulary word index to distributed features as a trainable matrix with one row per vocabulary item and one column per learned feature, share it across context positions, and learn it jointly with next-word prediction.',
      'Vaswani et al. use learned embeddings whose width matches the model width for BPE or word-piece tokens and add positional encodings before the Transformer stack; their embedding forward scaling is separate from parameter initialization.',
    ],
    diagramTitle: 'Follow different and repeated token IDs through one shared table',
    diagramDescription:
      'Read the one-hot and direct-lookup equivalence as ID 1 selects row 1 and ID 2 selects row 2, then follow both occurrences of ID 2 as their reverse contributions add in that same row of one shared embedding table.',
    summaryLabels: [
      'Named parameter',
      'Vocabulary rows',
      'Embedding width',
      'Table shape',
      'Token-ID shape',
      'Output shape',
      'Table-gradient shape',
    ],
    stages: [
      'Start with integer token IDs',
      'Keep one shared trainable table',
      'Select rows without storing the zeros',
      'Return contributions to their shared rows',
    ],
    tableHeaders: {
      ids: ['Position', 'Token ID', 'Row status'],
      table: ['Table row', 'Trainable vector', 'Selections', 'Row status'],
      lookup: [
        'Position',
        'Token ID',
        'One-hot indicator',
        'Equivalent product',
        'Selected row',
        'Output vector',
        'Upstream gradient',
      ],
      gradients: [
        'Table row',
        'Contributing flat positions',
        'Feature-wise contributions',
        'Reverse rule',
        'Stored row gradient',
      ],
    },
    states: {
      unused: 'Unused row',
      selectedOnce: 'Selected once',
      selectedRepeated: 'Shared by the repeated token ID',
      singleRow: 'Selects one singly used row',
      repeatedRow: 'Shares one row with another position',
      unusedZero: 'No selection; keep zero',
      singleCopy: 'One selection; copy its contribution',
      repeatedSum: 'Repeated selections; add both contributions',
      none: 'None',
    },
    notes: [
      'Different IDs name different rows of one parameter matrix and stay outside the differentiation tape. Repeating an ID reuses that ID’s row.',
      'The indicator exposes the algebra: one active coordinate selects one table row. The implementation performs direct lookup.',
      'Reverse mode returns each upstream feature vector to its selected row. Only the repeated row receives two vectors and sums them.',
    ],
    scrollers: [
      'Scrollable token-ID positions',
      'Scrollable embedding table',
      'Scrollable one-hot and lookup evidence',
      'Scrollable table-gradient accumulation evidence',
    ],
    boundaryFragments: [
      'Public callers obtain an Embedding through new, from_parameter, or by cloning an already validated layer.',
      'The constructors establish a nonempty rank-two table, cloning preserves it, and private fields prevent callers from replacing it.',
      'Embedding::forward is the public boundary for token IDs supplied as u32.',
      'compute the number of positions described by token_shape, rejecting an invalid or overflowing shape',
      'require token_ids.len() to equal that position count',
      'scan the IDs in flat order, rejecting the first u32 value that cannot name one of the table\'s',
      'Only after all IDs pass does the method reserve an owned Vec<usize> and convert the selectors.',
      'Its trusted constructor does not rescan table rank, selector count, or selector bounds',
      'The constructor-or-clone invariant supplies the table rank, while this forward call has just established the selector shape, count, and bounds',
      'The public TensorValue::gather_rows method still checks table rank, selector shape, selector count, and the first out-of-range selector',
      'allocating the output buffer can still fail',
      'Only ownership and reuse of checked facts change; output values and shapes, failure precedence, the lookup equation, saved VJP facts, and repeated-row gradient addition stay the same.',
      'empty leading shapes append the width without producing values.',
    ],
    rustCards: [
      {
        caption: 'Multiply explicit one-hot rows by the tiny table as an algebraic baseline',
        label: 'Rust source for the Chapter 18 one-hot multiplication contrast',
      },
      {
        caption: 'Gather the repeated IDs and compare exact output values with the baseline',
        label: 'Rust source running the Chapter 18 known token-embedding lookup',
      },
      {
        caption: 'Keep embedding construction and selector failures typed and deterministic',
        label: 'Rust source declaring Chapter 18 embedding errors',
      },
      {
        caption: 'Construct one named rank-two table and retain its vocabulary and feature widths',
        label: 'Rust source constructing the Chapter 18 token-embedding layer',
      },
      {
        caption: 'Check each raw token-ID fact once and pass owned selectors through the validated plan',
        label: 'Rust source implementing the Chapter 18 validated token-ID handoff',
      },
      {
        caption: 'Reverse through the repeated lookup and read the stored table gradient',
        label: 'Rust source proving repeated token-gradient accumulation',
      },
      {
        caption: 'Initialize the table reproducibly and check clone identity',
        label: 'Rust source connecting Chapter 17 initialization to Chapter 18 embeddings',
      },
      {
        caption: 'Accept an empty token shape and reject the first out-of-range ID',
        label: 'Rust source checking Chapter 18 empty input and bounds behavior',
      },
      {
        caption: 'Print the selected vectors and the shared embedding-table gradient',
        label: 'Rust source displaying the Chapter 18 learner evidence',
      },
      {
        caption: "Collect the worked example's table rows, selections, and accumulated gradients",
        label: 'Rust source assembling the Chapter 18 token-embedding evidence',
      },
    ],
    boundaryAnswers: [
      'The method checks the token shape first, the exact ID count second, and the IDs in flat order third.',
      'The trusted plan owns those facts. A generic public caller has established none of them, so TensorValue::gather_rows must perform its complete validation. Allocating the output tensor\'s value buffer can still fail after the plan exists.',
    ],
    cloneAnswer: 'No. A clone is another handle to the same named table leaf.',
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Сопоставьте ID токенов с обучаемыми векторами',
    description:
      'Создайте обучаемую таблицу токенов, один раз проверьте ID токенов в публичной точке входа, передайте преобразованные селекторы во владение внутреннему проверенному плану выбора строк по индексам и сложите градиенты повторяющихся токенов.',
    headings: [
      'Предскажите три выбранные строки и один общий градиент',
      'Выбирайте строки в прямом проходе и накапливайте вклады в обратном',
      'Не смешивайте оси словаря и признаков',
      'От разреженного one-hot-кода к векторам на входе Transformer',
      'Проверьте ID токенов один раз и повторно используйте правило выбора строк',
      'Проследите каждый выбор обратно до общей строки',
      'Сначала предскажите, затем сверьтесь с исполняемым примером',
      'Используйте ширину последней оси как входную ширину обучаемой проекции',
    ],
    historyHeading: 'От разреженного one-hot-кода к векторам на входе Transformer',
    historyFragments: [
      'Разреженное one-hot-представление слова отводит одну координату каждому элементу словаря, но не выражает степень сходства между словами. Кроме того, явно создавать и обрабатывать такой вектор размером со словарь расточительно, когда нужна лишь одна строка.',
      'Bengio и соавторы обучают одну плотную матрицу признаков слов вместе с нейросетевой моделью следующего слова и используют эту матрицу во всех позициях контекста; при этом индекс каждого слова выбирает соответствующую ему строку. Transformer использует обучаемые эмбеддинги подсловных токенов: к ним добавляется позиционная информация, после чего результат поступает в стек слоёв внимания и сетей прямого распространения.',
      'Одна обучаемая матрица «словарь на признаки» используется для всех элементов пакета и позиций последовательности. Каждый ID токена выбирает соответствующую строку словаря: разные ID выбирают разные строки, а повторные вхождения одного ID снова выбирают ту же строку и накапливают в ней градиенты. Повторное использование этой входной матрицы во всех позициях — не то же самое, что связывание весов с выходной проекцией; оно, как и позиционная информация, масштабирование эмбеддингов и внимание, рассматривается позже.',
      'Bengio и соавторы задают отображение индекса словарного слова в набор распределённых признаков с помощью обучаемой матрицы: каждому элементу словаря соответствует строка, а каждому обучаемому признаку — столбец. Одна и та же матрица используется для всех позиций контекста и обучается вместе с моделью предсказания следующего слова.',
      'Vaswani и соавторы используют для токенов BPE или WordPiece обучаемые эмбеддинги, ширина которых совпадает с шириной модели, и перед стеком Transformer добавляют к ним позиционное кодирование. Масштабирование эмбеддингов в прямом проходе не относится к инициализации параметров.',
    ],
    diagramTitle: 'Разные и повторяющиеся ID в одной общей таблице',
    diagramDescription:
      'Сопоставьте one-hot-умножение с прямым выбором: ID 1 выбирает строку 1, ID 2 — строку 2. Затем проследите, как обратные вклады обоих вхождений ID 2 складываются в той же строке одной общей таблицы эмбеддингов.',
    summaryLabels: [
      'Именованный параметр',
      'Строки словаря',
      'Ширина эмбеддинга',
      'Форма таблицы',
      'Форма ID токенов',
      'Форма выхода',
      'Форма градиента таблицы',
    ],
    stages: [
      'Целочисленные ID токенов',
      'Общая обучаемая таблица',
      'Выбор строк без хранения нулей',
      'Накопление в общих строках',
    ],
    tableHeaders: {
      ids: ['Позиция', 'ID токена', 'Статус'],
      table: [
        'Строка таблицы',
        'Обучаемый вектор',
        'Число выборов',
        'Статус',
      ],
      lookup: [
        'Позиция',
        'ID токена',
        'One-hot-индикатор',
        'Равносильное произведение',
        'Выбранная строка',
        'Выходной вектор',
        'Входящий градиент',
      ],
      gradients: [
        'Строка таблицы',
        'Позиции',
        'Вклады',
        'Правило',
        'Градиент строки',
      ],
    },
    states: {
      unused: 'Строка не выбрана',
      selectedOnce: 'Выбрана один раз',
      selectedRepeated: 'Общая для повторов',
      singleRow: 'Строка без повторов',
      repeatedRow: 'Общая с другой позицией',
      unusedZero: 'Оставить ноль',
      singleCopy: 'Скопировать вклад',
      repeatedSum: 'Сложить вклады',
      none: 'Нет',
    },
    notes: [
      'Разные ID выбирают разные строки одной матрицы; повторяющийся ID снова выбирает свою строку. Сами ID не входят в ленту дифференцирования.',
      'Единица one-hot-индикатора выбирает одну строку таблицы; реализация получает эту строку напрямую.',
      'В обратном проходе каждый входящий вектор поступает в выбранную строку. В повторно выбранной строке два вектора складываются.',
    ],
    scrollers: [
      'Прокручиваемые позиции ID токенов',
      'Прокручиваемая таблица эмбеддингов',
      'Прокручиваемое доказательство равносильности выбора строк и one-hot-умножения',
      'Прокручиваемое доказательство накопления градиентов строк',
    ],
    boundaryFragments: [
      'Из внешнего кода получить Embedding можно тремя способами: вызвать new, вызвать from_parameter или клонировать уже проверенный слой.',
      'Оба конструктора гарантируют, что таблица имеет ранг два и ненулевые размеры, клон сохраняет эту таблицу, а закрытые поля не позволяют заменить её извне.',
      'Embedding::forward — публичная точка входа для ID токенов, поступающих как значения типа u32.',
      'вычисляет число позиций, заданное token_shape, и сообщает об ошибке формы или переполнении при вычислении',
      'требует, чтобы длина token_ids в точности совпадала с этим числом',
      'просматривает ID в плоском порядке и сообщает о первом значении u32',
      'Только после успешной проверки всех ID метод резервирует Vec<usize> и преобразует селекторы. Затем лента проверяет, что операнд с таблицей ещё доступен. Если он доступен, метод создаёт значение закрытого типа RowGatherPlan из главы 16 и передаёт ему вектор селекторов во владение',
      'Внутренний конструктор не проверяет повторно ранг таблицы, число селекторов и их границы.',
      'Ранг таблицы гарантируют конструкторы Embedding; при клонировании этот инвариант сохраняется.',
      'Публичный метод TensorValue::gather_rows по-прежнему принимает произвольные входные данные, поэтому сам проверяет ранг таблицы, форму и число селекторов, а также первый индекс за пределами таблицы.',
      'создание буфера выходных значений всё равно может завершиться ошибкой',
      'Изменились только владение проверенными данными и их повторное использование. Значения и формы выхода, порядок ошибок, формула выбора строк, данные, сохранённые для VJP, и накопление градиентов повторяющихся ID остались прежними.',
      'к любой пустой ведущей форме добавляется ширина эмбеддинга, но значений не появляется.',
    ],
    rustCards: [
      {
        caption: 'Умножьте явные one-hot-строки на маленькую таблицу как алгебраический эталон',
        label: 'Исходный код на Rust для сравнения с one-hot-умножением из главы 18',
      },
      {
        caption: 'Выберите строки по повторяющимся ID и сравните точный результат с эталоном',
        label: 'Исходный код на Rust для выбора эмбеддингов известных токенов из главы 18',
      },
      {
        caption: 'Сделайте ошибки создания эмбеддинга и проверки селекторов типизированными и детерминированными',
        label: 'Исходный код на Rust с ошибками эмбеддингов из главы 18',
      },
      {
        caption: 'Создайте одну именованную таблицу ранга два и сохраните размер словаря и ширину признаков',
        label: 'Исходный код на Rust, создающий слой эмбеддингов из главы 18',
      },
      {
        caption: 'Один раз проверьте форму и ID токенов и передайте преобразованные селекторы во владение проверенному плану выбора строк по индексам',
        label: 'Исходный код на Rust, реализующий проверенную передачу ID токенов в главе 18',
      },
      {
        caption: 'Проведите обратный проход через повторяющийся выбор и прочитайте сохранённый градиент таблицы',
        label: 'Исходный код на Rust, доказывающий накопление градиентов повторяющихся токенов',
      },
      {
        caption: 'Инициализируйте таблицу воспроизводимым образом и проверьте сохранение идентичности параметра при клонировании',
        label: 'Исходный код на Rust, связывающий инициализацию из главы 17 с эмбеддингами из главы 18',
      },
      {
        caption: 'Примите пустую форму токенов и отклоните первый ID за пределами таблицы',
        label: 'Исходный код на Rust, проверяющий пустой вход и границы в главе 18',
      },
      {
        caption: 'Выведите выбранные векторы и градиент общей таблицы эмбеддингов',
        label: 'Исходный код на Rust с учебными результатами главы 18',
      },
      {
        caption: 'Соберите строки таблицы, выборы и накопленные градиенты разобранного примера',
        label: 'Исходный код на Rust, собирающий данные об эмбеддингах из главы 18',
      },
    ],
    boundaryAnswers: [
      'Сначала метод проверяет форму токенов, затем точное число ID и только после этого просматривает ID в плоском порядке.',
      'Проверенный план выбора строк по индексам владеет преобразованными селекторами и их логической формой. У публичного вызова TensorValue::gather_rows таких гарантий нет, поэтому он выполняет все проверки сам. Даже после создания плана при выделении буфера выходных значений всё ещё может возникнуть ошибка.',
    ],
    cloneAnswer: 'Нет. Клон — отдельный объект слоя, но он хранит тот же именованный листовой узел-параметр таблицы; нового обучаемого листа не возникает.',
  },
};

const expectedRustRegions = [
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'one-hot-baseline'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'known-token-lookup'],
  ['rust/crates/llm-from-scratch/src/nn/embedding.rs', 'embedding-errors'],
  ['rust/crates/llm-from-scratch/src/nn/embedding.rs', 'embedding-layer'],
  ['rust/crates/llm-from-scratch/src/nn/embedding.rs', 'embedding-forward-boundary'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'repeated-token-gradient'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'initialized-token-embedding'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'embedding-edge-cases'],
  ['rust/demos/ch18-token-embeddings/src/main.rs', 'learner-token-embeddings-output'],
  ['rust/demos/ch18-token-embeddings/src/diagram_trace.rs', 'token-embeddings-trace'],
] as const;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex(
    (line: string) => line.trim() === `// region:${region}`,
  );
  const end = lines.findIndex(
    (line: string) => line.trim() === `// endregion:${region}`,
  );
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

async function expectRustCards(page: Page, locale: ChapterLocale) {
  const rustSources = page.locator('figure.rust-source');
  const localizedCards = copy[locale].rustCards;
  expect(localizedCards).toHaveLength(expectedRustRegions.length);
  await expect(rustSources).toHaveCount(expectedRustRegions.length);

  for (const [index, [path, region]] of expectedRustRegions.entries()) {
    const source = rustSources.nth(index);
    const localized = localizedCards[index]!;
    await expect(source).toHaveAttribute('data-source-path', path);
    await expect(source).toHaveAttribute('data-source-region', region);
    await expect(source.locator(':scope > figcaption > span')).toHaveText(
      localized.caption,
    );
    await expect(source.locator(':scope > pre')).toHaveAttribute(
      'aria-label',
      localized.label,
    );
  }

  const captionProblems = await rustSources.evaluateAll((sources) =>
    sources.flatMap((source, index) => {
      const frame = source.getBoundingClientRect();
      const caption = source.querySelector('figcaption');
      if (!(caption instanceof HTMLElement)) {
        return [`source card ${index} has no caption`];
      }
      const captionRect = caption.getBoundingClientRect();
      const captionStyle = getComputedStyle(caption);
      const problems: string[] = [];
      if (captionRect.left < frame.left - 1 || captionRect.right > frame.right + 1) {
        problems.push(`source card ${index} caption crosses its frame`);
      }
      if (caption.scrollWidth > caption.clientWidth + 1) {
        problems.push(`source card ${index} caption overflows horizontally`);
      }
      if (caption.scrollHeight > caption.clientHeight + 1) {
        problems.push(`source card ${index} caption overflows vertically`);
      }
      if (['hidden', 'clip'].includes(captionStyle.overflow)) {
        problems.push(`source card ${index} caption conceals overflow`);
      }
      return problems;
    }),
  );
  expect(captionProblems, `${locale} Rust source captions`).toEqual([]);
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function readMathAwareRows(rows: Locator) {
  return rows.evaluateAll((rowNodes) =>
    rowNodes.map((row) =>
      Array.from(row.children, (cell) => {
        const clone = cell.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.katex').forEach((math) => {
          const source =
            math.querySelector('annotation[encoding="application/x-tex"]')
              ?.textContent ?? '';
          math.replaceWith(document.createTextNode(` ${source} `));
        });
        return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
      }),
    ),
  );
}

async function expectFormulaGeometry(page: Page) {
  await settle(page);
  const problems = await page
    .locator(
      '.lesson-body .katex-display, .lesson-body .katex:not(.katex-display .katex)',
    )
    .evaluateAll((nodes) =>
      nodes.flatMap((node, index) => {
        const element = node as HTMLElement;
        if (element.closest('figure.course-diagram')) return [];
        const rect = element.getBoundingClientRect();
        const source =
          element.querySelector('annotation[encoding="application/x-tex"]')
            ?.textContent ?? `formula ${index}`;
        const issues: string[] = [];
        if (
          rect.left < -1 ||
          rect.right > document.documentElement.clientWidth + 1
        ) {
          issues.push(`${source} escapes the viewport`);
        }
        if (rect.width <= 0 || rect.height <= 0) {
          issues.push(`${source} has no visible box`);
        }
        const mathml = element.querySelector<HTMLElement>('.katex-mathml');
        if (!mathml) {
          issues.push(`${source} has no accessible MathML projection`);
        } else {
          const style = getComputedStyle(mathml);
          if (style.display !== 'block' || style.overflowX !== 'clip') {
            issues.push(`${source} does not contain its MathML projection`);
          }
        }
        const { direction, overflowY } = getComputedStyle(element);
        if (direction !== 'ltr') issues.push(`${source} is not left-to-right`);
        if (
          ['auto', 'clip', 'hidden', 'scroll'].includes(overflowY) &&
          element.scrollHeight > element.clientHeight + 2
        ) {
          issues.push(`${source} clips vertically`);
        }
        if (element.classList.contains('katex-display')) {
          const owner = element.parentElement;
          const next = owner?.nextElementSibling as HTMLElement | null;
          if (
            owner &&
            next &&
            owner.getBoundingClientRect().bottom >
              next.getBoundingClientRect().top + 1
          ) {
            issues.push(`${source} overlaps the following block`);
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectDiagramContainment(page: Page, locale: ChapterLocale) {
  await settle(page);
  const diagram = page.locator(
    'figure[data-visualization-id="token-embeddings"]',
  );
  const result = await diagram.evaluate((figure, allowedError) => {
    const root = figure as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const fullscreenRoot = document.fullscreenElement === root;
    const problems: string[] = [];
    const visible = (element: Element) => {
      const style = getComputedStyle(element as HTMLElement);
      return (
        element.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    };
    const describe = (element: Element) => {
      const node = element as HTMLElement;
      const classes =
        typeof node.className === 'string'
          ? node.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
      return `${node.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
    };
    const hasCompleteBorder = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const widths = [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ].map(Number.parseFloat);
      const styles = [
        style.borderTopStyle,
        style.borderRightStyle,
        style.borderBottomStyle,
        style.borderLeftStyle,
      ];
      return (
        widths.every((width) => Number.isFinite(width) && width > 0) &&
        styles.every((styleName) => !['none', 'hidden'].includes(styleName))
      );
    };
    const all = [root, ...root.querySelectorAll<HTMLElement>('*')].filter(
      (element) => visible(element) && !element.closest('.visually-hidden'),
    );
    const isBoundedBox = (element: HTMLElement) => {
      if (element === root && fullscreenRoot) return false;
      const display = getComputedStyle(element).display;
      if (
        element.hasAttribute('data-diagram-scroll') ||
        element.closest(
          '.katex, .katex-mathml, .visually-hidden, [aria-hidden="true"]',
        ) ||
        display === 'inline' ||
        display === 'contents' ||
        display.startsWith('table-row')
      ) {
        return false;
      }
      return (
        element === root ||
        element.hasAttribute('data-diagram-box') ||
        ['TH', 'TD'].includes(element.tagName) ||
        hasCompleteBorder(element)
      );
    };
    const boxes = all.filter(isBoundedBox);
    const boxSet = new Set(boxes);
    const nearestBoundedBox = (
      element: HTMLElement | null,
    ): HTMLElement | null => {
      if (!element) return null;
      const scrollOwner = element.closest<HTMLElement>('[data-diagram-scroll]');
      let candidate: HTMLElement | null = element;
      while (candidate && root.contains(candidate)) {
        if (boxSet.has(candidate)) {
          if (scrollOwner && !scrollOwner.contains(candidate)) return null;
          return candidate;
        }
        if (candidate === root) break;
        candidate = candidate.parentElement;
      }
      return null;
    };
    const innerEdges = (box: HTMLElement) => {
      const rect = box.getBoundingClientRect();
      const style = getComputedStyle(box);
      return {
        bottom: rect.bottom - Number.parseFloat(style.borderBottomWidth || '0'),
        left: rect.left + Number.parseFloat(style.borderLeftWidth || '0'),
        right: rect.right - Number.parseFloat(style.borderRightWidth || '0'),
        top: rect.top + Number.parseFloat(style.borderTopWidth || '0'),
      };
    };
    const auditPaintRect = (
      rect: DOMRect,
      box: HTMLElement,
      witness: HTMLElement,
      kind: string,
    ) => {
      if (rect.width <= 0 || rect.height <= 0) return;
      const edges = innerEdges(box);
      const escapes =
        rect.left < edges.left - allowedError ||
        rect.right > edges.right + allowedError ||
        rect.top < edges.top - allowedError ||
        rect.bottom > edges.bottom + allowedError;
      if (!escapes) return;
      const debt = Math.max(
        edges.left - rect.left,
        rect.right - edges.right,
        edges.top - rect.top,
        rect.bottom - edges.bottom,
      );
      problems.push(
        `${describe(witness)} paints ${kind} outside ${describe(box)} by ${debt.toFixed(1)}px`,
      );
    };

    const markedBoxes = all.filter((element) =>
      element.hasAttribute('data-diagram-box'),
    );
    for (const [index, box] of markedBoxes.entries()) {
      if (!hasCompleteBorder(box)) {
        problems.push(`marked box ${index} lacks a four-sided border`);
      }
    }
    for (const box of boxes) {
      const style = getComputedStyle(box);
      if (
        [style.overflowX, style.overflowY].some((overflow) =>
          ['hidden', 'clip'].includes(overflow),
        )
      ) {
        problems.push(`${describe(box)} hides or clips overflow`);
      }
      if (
        box.scrollWidth > box.clientWidth + allowedError ||
        box.scrollHeight > box.clientHeight + allowedError
      ) {
        problems.push(`${describe(box)} does not contain its content`);
      }
      const parentBox = nearestBoundedBox(box.parentElement);
      if (parentBox && parentBox !== box) {
        auditPaintRect(box.getBoundingClientRect(), parentBox, box, 'a nested box');
      }
    }

    const scrollers = Array.from(
      root.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
    );
    for (const [index, region] of scrollers.entries()) {
      const style = getComputedStyle(region);
      const rect = region.getBoundingClientRect();
      const owner = region.parentElement?.closest<HTMLElement>(
        '[data-diagram-box]',
      );
      const ownerRect = owner?.getBoundingClientRect();
      if (
        region.getAttribute('role') !== 'region' ||
        region.getAttribute('tabindex') !== '0' ||
        !(region.getAttribute('aria-label') ?? '').trim()
      ) {
        problems.push(`scroll region ${index} lacks its keyboard name or role`);
      }
      if (!['auto', 'scroll'].includes(style.overflowX)) {
        problems.push(`scroll region ${index} does not own horizontal overflow`);
      }
      if (
        ownerRect &&
        (rect.left < ownerRect.left - allowedError ||
          rect.right > ownerRect.right + allowedError)
      ) {
        problems.push(`scroll region ${index} escapes its bounded stage`);
      }
    }

    const excludedFromPaintAudit = (element: Element) =>
      element.closest('.katex-mathml, .visually-hidden') !== null ||
      element.closest('[aria-hidden="true"]') !== null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const parent = textNode.parentElement;
      const text = textNode.textContent?.trim() ?? '';
      if (
        parent &&
        text &&
        visible(parent) &&
        !parent.closest('.katex') &&
        !excludedFromPaintAudit(parent)
      ) {
        const box = nearestBoundedBox(parent);
        if (box) {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of Array.from(range.getClientRects())) {
            auditPaintRect(rect, box, parent, 'text');
          }
        }
      }
      textNode = walker.nextNode();
    }

    for (const formula of root.querySelectorAll<HTMLElement>('.katex')) {
      if (
        !visible(formula) ||
        formula.parentElement?.closest('.katex') ||
        formula.closest('.katex-mathml, .visually-hidden')
      ) {
        continue;
      }
      const box = nearestBoundedBox(formula.parentElement);
      if (box) {
        auditPaintRect(formula.getBoundingClientRect(), box, formula, 'formula');
      }
    }

    for (const [index, symbol] of Array.from(
      root.querySelectorAll<HTMLElement>('.state-symbol'),
    ).entries()) {
      if (
        symbol.scrollWidth > symbol.clientWidth + allowedError ||
        symbol.scrollHeight > symbol.clientHeight + allowedError
      ) {
        problems.push(`state symbol ${index} cannot contain its complete cue`);
      }
    }
    if (
      rootRect.left < -allowedError ||
      rootRect.right > document.documentElement.clientWidth + allowedError ||
      root.scrollWidth > root.clientWidth + allowedError
    ) {
      problems.push('figure escapes its inline or fullscreen boundary');
    }
    return {
      fullscreen: fullscreenRoot,
      markedBoxCount: markedBoxes.length,
      scrollerCount: scrollers.length,
      problems,
    };
  }, 2);
  expect(result.markedBoxCount).toBe(11);
  expect(result.scrollerCount).toBe(4);
  expect(result.problems, `${locale} diagram containment`).toEqual([]);
}

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 18,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: ['en', 'ru'],
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.description);
  await expectSeoDescription(page, localized.description);
  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);
  const learnerProse = normalizeRenderedTypography(
    await page
      .locator('.lesson-body > p, .lesson-body > ol, .lesson-body > ul')
      .allInnerTexts()
      .then((parts) => parts.join(' ')),
  );
  for (const fragment of localized.boundaryFragments) {
    expect(learnerProse).toContain(fragment);
  }
  if (locale === 'en') {
    const boundsParagraph = page
      .locator('.lesson-body li')
      .filter({ hasText: 'scan the IDs in flat order' });
    await expect(boundsParagraph).toHaveCount(1);
    await expect(boundsParagraph).toContainText('rows');
    await expect(
      boundsParagraph.locator(
        '.katex annotation[encoding="application/x-tex"]',
      ),
    ).toHaveText('V');
  }

  const historyNodes = page
    .getByRole('heading', {
      level: 2,
      name: localized.historyHeading,
      exact: true,
    })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.historyHeading}"]]`,
    );
  const historyText = (await historyNodes.allInnerTexts())
    .join(' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  for (const expected of localized.historyFragments) {
    expect(historyText).toContain(expected);
  }
  expect(historyText).not.toMatch(
    /programming-language history|Rust history|Python history|framework history/i,
  );
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    ),
  ).toEqual(historySources);

  const displayAnnotations = await page
    .locator('.lesson-body .katex-display annotation[encoding="application/x-tex"]')
    .allTextContents();
  expect(displayAnnotations).toContain(formulaLatex);
  const inlineAnnotationText = await page
    .locator(
      '.lesson-body .katex:not(.katex-display .katex) annotation[encoding="application/x-tex"]',
    )
    .allTextContents();
  expect(inlineAnnotationText.filter((text) => text === upstreamAdjointLatex)).toHaveLength(2);
  expect(inlineAnnotationText.filter((text) => text === tableAdjointLatex)).toHaveLength(2);
  await expect(page.locator('.lesson-body code').filter({ hasText: /^bar [XE]$/ })).toHaveCount(0);
  await expectFormulaGeometry(page);

  const rustSources = page.locator('figure.rust-source');
  await expectRustCards(page, locale);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted
      .locator('code')
      .evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  for (const evidence of await highlighted.evaluateAll((blocks) =>
    blocks.map((block) => ({
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
      colors: new Set(
        Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
          .map((token) => token.style.color)
          .filter(Boolean),
      ).size,
    })),
  )) {
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
    expect(evidence.colors).toBeGreaterThan(1);
  }

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'token-embeddings',
  });
  const diagram = page.locator(
    'figure[data-visualization-id="token-embeddings"]',
  );
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram).toHaveClass(/\bcourse-diagram\b/);
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(diagram).toHaveCSS('overflow-x', 'visible');
  await expect(diagram.locator(':scope > figcaption')).toHaveClass(
    /\bcourse-diagram__caption\b/,
  );
  await expect(diagram.locator('.shape-summary dt')).toHaveText(
    localized.summaryLabels,
  );
  expect(
    await readMathAwareRows(diagram.locator('.shape-summary > div')),
  ).toEqual([
    [localized.summaryLabels[0], 'token_embedding.weight'],
    [localized.summaryLabels[1], '4'],
    [localized.summaryLabels[2], '2'],
    [localized.summaryLabels[3], String.raw`\left[4,2\right]`],
    [localized.summaryLabels[4], String.raw`\left[1,3\right]`],
    [localized.summaryLabels[5], String.raw`\left[1,3,2\right]`],
    [localized.summaryLabels[6], String.raw`\left[4,2\right]`],
  ]);
  const stageHeadings = diagram.locator('.diagram-stage h4');
  await expect(stageHeadings).toHaveCount(localized.stages.length);
  await expect(stageHeadings.locator('.state-symbol')).toHaveText(['1', '2', '3', '4']);
  for (const [index, stage] of localized.stages.entries()) {
    await expect(stageHeadings.nth(index)).toContainText(stage);
  }
  for (const note of localized.notes) {
    await expect(diagram.getByText(note, { exact: true })).toBeVisible();
  }
  await expect(diagram.locator('.ids-stage thead th')).toHaveText(
    localized.tableHeaders.ids,
  );
  await expect(diagram.locator('.table-stage thead th')).toHaveText(
    localized.tableHeaders.table,
  );
  await expect(diagram.locator('.lookup-stage thead th')).toHaveText(
    localized.tableHeaders.lookup,
  );
  await expect(diagram.locator('.gradient-stage thead th')).toHaveText(
    localized.tableHeaders.gradients,
  );

  expect(await readMathAwareRows(diagram.locator('.ids-stage tbody tr'))).toEqual([
    [String.raw`\left(0,0\right)`, '2', localized.states.repeatedRow],
    [String.raw`\left(0,1\right)`, '1', localized.states.singleRow],
    [String.raw`\left(0,2\right)`, '2', localized.states.repeatedRow],
  ]);
  expect(await readMathAwareRows(diagram.locator('.table-stage tbody tr'))).toEqual([
    [
      String.raw`E_{0,:}`,
      String.raw`\left[10.000000000000,11.000000000000\right]`,
      '0',
      `○ ${localized.states.unused}`,
    ],
    [
      String.raw`E_{1,:}`,
      String.raw`\left[20.000000000000,21.000000000000\right]`,
      '1',
      `● ${localized.states.selectedOnce}`,
    ],
    [
      String.raw`E_{2,:}`,
      String.raw`\left[30.000000000000,31.000000000000\right]`,
      '2',
      `◆ ${localized.states.selectedRepeated}`,
    ],
    [
      String.raw`E_{3,:}`,
      String.raw`\left[40.000000000000,41.000000000000\right]`,
      '0',
      `○ ${localized.states.unused}`,
    ],
  ]);
  expect(await readMathAwareRows(diagram.locator('.lookup-stage tbody tr'))).toEqual([
    [
      String.raw`\left(0,0\right)`,
      '2',
      String.raw`\left[0,0,1,0\right]`,
      String.raw`e_{2}E`,
      String.raw`E_{2,:}`,
      String.raw`\left[30.000000000000,31.000000000000\right]`,
      String.raw`\left[1.000000000000,0.000000000000\right]`,
    ],
    [
      String.raw`\left(0,1\right)`,
      '1',
      String.raw`\left[0,1,0,0\right]`,
      String.raw`e_{1}E`,
      String.raw`E_{1,:}`,
      String.raw`\left[20.000000000000,21.000000000000\right]`,
      String.raw`\left[0.000000000000,2.000000000000\right]`,
    ],
    [
      String.raw`\left(0,2\right)`,
      '2',
      String.raw`\left[0,0,1,0\right]`,
      String.raw`e_{2}E`,
      String.raw`E_{2,:}`,
      String.raw`\left[30.000000000000,31.000000000000\right]`,
      String.raw`\left[3.000000000000,4.000000000000\right]`,
    ],
  ]);
  expect(await readMathAwareRows(diagram.locator('.gradient-stage tbody tr'))).toEqual([
    [
      String.raw`\bar E_{0,:}`,
      localized.states.none,
      localized.states.none,
      localized.states.unusedZero,
      String.raw`\left[0.000000000000,0.000000000000\right]`,
    ],
    [
      String.raw`\bar E_{1,:}`,
      '1',
      String.raw`\left[0.000000000000,2.000000000000\right]`,
      localized.states.singleCopy,
      String.raw`\left[0.000000000000,2.000000000000\right]`,
    ],
    [
      String.raw`\bar E_{2,:}`,
      '0,2',
      String.raw`\left[1.000000000000,0.000000000000\right] + \left[3.000000000000,4.000000000000\right]`,
      localized.states.repeatedSum,
      String.raw`\left[4.000000000000,4.000000000000\right]`,
    ],
    [
      String.raw`\bar E_{3,:}`,
      localized.states.none,
      localized.states.none,
      localized.states.unusedZero,
      String.raw`\left[0.000000000000,0.000000000000\right]`,
    ],
  ]);

  await expect(diagram.locator('[data-diagram-card]')).toHaveCount(2);
  await expect(diagram.locator('[data-diagram-box]')).toHaveCount(11);
  await expect(diagram.locator('[data-diagram-table]')).toHaveCount(4);
  const scrollers = diagram.locator('[data-diagram-scroll]');
  await expect(scrollers).toHaveCount(4);
  for (const [index, scroller] of (await scrollers.all()).entries()) {
    await expect(scroller).toHaveAttribute('role', 'region');
    await expect(scroller).toHaveAttribute('tabindex', '0');
    await expect(scroller).toHaveAccessibleName(localized.scrollers[index]!);
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }
  if (narrow) {
    for (const scroller of await scrollers.all()) {
      const widths = await scroller.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
  }
  const stagePositions = await diagram
    .locator('.stage-grid .diagram-stage')
    .evaluateAll((stages) =>
      stages.map((stage) => {
        const rectangle = stage.getBoundingClientRect();
        return {
          left: rectangle.left,
          top: rectangle.top,
          bottom: rectangle.bottom,
        };
      }),
    );
  expect(stagePositions).toHaveLength(2);
  expect(Math.abs(stagePositions[0]!.left - stagePositions[1]!.left)).toBeLessThan(1);
  expect(stagePositions[1]!.top).toBeGreaterThan(stagePositions[0]!.bottom);
  await expectDiagramContainment(page, locale);

  expect(
    await diagram.locator('code, bdi, .katex').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  const answers = exerciseDetails.locator('ol > li');
  await expect(answers).toHaveCount(11);
  expect(normalizeRenderedTypography(await answers.nth(5).innerText())).toContain(
    normalizeRenderedTypography(localized.boundaryAnswers[0]),
  );
  expect(normalizeRenderedTypography(await answers.nth(6).innerText())).toContain(
    normalizeRenderedTypography(localized.boundaryAnswers[1]),
  );
  expect(normalizeRenderedTypography(await answers.nth(7).innerText())).toContain(
    normalizeRenderedTypography(localized.cloneAnswer),
  );

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 18 localized token-embeddings vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 18 is eighteenth on both indexes with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(18);
      expect(chapters[17]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 18,
          title: localized.title,
        }),
      );
      await page.getByRole('link', { name: localized.title, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 18,
        revision: contentRevision,
        revisionLabel: localized.revisionLabel,
        title: localized.title,
        equivalentLocales: ['en', 'ru'],
      });
      await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
      await expectNoOverflowOrClientScripts(page);
    }

    for (const source of chapterLocaleDefinitions) {
      for (const target of chapterLocaleDefinitions.filter(
        ({ code }) => code !== source.code,
      )) {
        await page.goto(chapterPath(source.code, chapterId));
        const switchLink = page.locator(
          `.locale-switch a[data-locale="${target.code}"]`,
        );
        await expect(switchLink).not.toHaveAttribute(
          'data-locale-fallback',
          'course-index',
        );
        await switchLink.click();
        await expect(page).toHaveURL(
          new RegExp(`${chapterPath(target.code, chapterId)}$`),
        );
        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          target.languageTag,
        );
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: copy[target.code].title,
            exact: true,
          }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(
      `the complete ${locale} Rust-backed lesson renders at desktop and narrow widths`,
      async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const chapters = await readOrderedCourseChapters(page, locale);
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, locale, chapters, false);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, locale, chapters, true);
      },
    );
  }

  test('chapter 18 full view fits both locales without substantial travel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      const diagram = page.locator(
        'figure[data-visualization-id="token-embeddings"]',
      );
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'token-embeddings',
      );
      await settle(page);
      await expectDiagramContainment(page, locale);
      const geometry = await diagram.evaluate((node) => ({
        blockDebt: node.scrollHeight - node.clientHeight,
        blockBudget: Math.ceil(node.clientHeight * 0.25),
        inlineDebt: node.scrollWidth - node.clientWidth,
        parts: Array.from(node.children).map((part) => ({
          name: (part as HTMLElement).className,
          height: Math.round((part as HTMLElement).getBoundingClientRect().height),
        })),
        stageParts: Array.from(
          node.querySelectorAll<HTMLElement>('.diagram-stage'),
        ).map((part) => ({
          name: part.className,
          height: Math.round(part.getBoundingClientRect().height),
        })),
        regionInlineDebts: Array.from(
          node.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
        ).map((region) => ({
          name: region.className,
          debt: region.scrollWidth - region.clientWidth,
          clientWidth: region.clientWidth,
          scrollWidth: region.scrollWidth,
        })),
        boxDebts: Array.from(
          node.querySelectorAll<HTMLElement>('[data-diagram-box]'),
        ).map((box) => ({
          inline: box.scrollWidth - box.clientWidth,
          block: box.scrollHeight - box.clientHeight,
        })),
        topStages: Array.from(
          node.querySelectorAll<HTMLElement>('.stage-grid .diagram-stage'),
        ).map((stage) => {
          const rectangle = stage.getBoundingClientRect();
          return { left: rectangle.left, top: rectangle.top };
        }),
      }));
      const geometryLabel = `${locale}/token-embeddings`;
      expect(
        geometry.blockDebt,
        `${geometryLabel} full-view block debt: ${JSON.stringify({ parts: geometry.parts, stages: geometry.stageParts })}`,
      ).toBeLessThanOrEqual(geometry.blockBudget);
      expect(
        geometry.inlineDebt,
        `${geometryLabel} full-view inline debt`,
      ).toBeLessThanOrEqual(2);
      expect(
        geometry.regionInlineDebts.every(({ debt }) => debt <= 2),
        `${geometryLabel} named-region inline containment: ${JSON.stringify(geometry.regionInlineDebts)}`,
      ).toBe(true);
      expect(
        geometry.boxDebts.every(({ inline, block }) => inline <= 2 && block <= 2),
        `${geometryLabel} bounded-box containment`,
      ).toBe(true);
      expect(geometry.topStages).toHaveLength(2);
      expect(
        Math.abs(geometry.topStages[0]!.top - geometry.topStages[1]!.top),
      ).toBeLessThan(1);
      expect(
        Math.abs(geometry.topStages[0]!.left - geometry.topStages[1]!.left),
      ).toBeGreaterThan(1);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
  });

  test('repeated, single-use, and unused states survive forced colors in both locales', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="token-embeddings"]',
      );
      await expect(diagram.locator('.state-unused .state-symbol').first()).toHaveText('○');
      await expect(diagram.locator('.state-selected-once .state-symbol')).toHaveText('●');
      await expect(diagram.locator('.state-selected-repeated .state-symbol')).toHaveText('◆');
      expect(
        await diagram
          .locator('.state-unused td')
          .first()
          .evaluate((node) => window.getComputedStyle(node).borderBottomStyle),
      ).toBe('dotted');
      expect(
        await diagram
          .locator('.state-selected-once td')
          .first()
          .evaluate((node) => window.getComputedStyle(node).borderBottomStyle),
      ).toBe('solid');
      expect(
        await diagram
          .locator('.state-selected-repeated td')
          .first()
          .evaluate((node) => window.getComputedStyle(node).borderBottomStyle),
      ).toBe('double');
      expect(
        await diagram
          .locator('.rule-repeated-sum td')
          .first()
          .evaluate((node) => window.getComputedStyle(node).borderBottomStyle),
      ).toBe('double');
      await expectDiagramContainment(page, locale);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('localized prose follows direction while technical evidence remains left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="token-embeddings"]',
      );
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));

      await expect(diagram.locator('.course-diagram__description')).toHaveCSS(
        'direction',
        'rtl',
      );
      const rowState = diagram.locator('.ids-stage tbody td').last();
      await expect(rowState).toHaveText(copy[locale].states.repeatedRow);
      await expect(rowState).toHaveCSS('direction', 'rtl');
      expect(
        await diagram.locator('[dir="ltr"]').evaluateAll((nodes) =>
          nodes.length > 0 &&
          nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
        ),
      ).toBe(true);
      const stages = await diagram
        .locator('.stage-grid .diagram-stage')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const rectangle = node.getBoundingClientRect();
            return {
              right: rectangle.right,
              top: rectangle.top,
              bottom: rectangle.bottom,
            };
          }),
        );
      expect(stages).toHaveLength(2);
      expect(Math.abs(stages[0]!.right - stages[1]!.right)).toBeLessThan(1);
      expect(stages[1]!.top).toBeGreaterThan(stages[0]!.bottom);
      await expectDiagramContainment(page, locale);
      await expectNoOverflowOrClientScripts(page);
    }
  });

});
