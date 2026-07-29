// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

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
  readMathAwareText,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '13-gradient-checking';
const contentRevision = 4;
const formulaLatex = String.raw`f'(\theta)\approx\frac{f(\theta+h)-f(\theta-h)}{2h}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://arxiv.org/abs/1502.05767',
] as const;

interface LocalizedCopy {
  revisionLabel: string;
  chapterTitle: string;
  chapterDescription: string;
  headings: readonly string[];
  historyHeading: string;
  historyClaims: readonly string[];
  rustCaptions: readonly string[];
  rustLabels: readonly string[];
  diagramTitle: string;
  diagramDescription: string;
  diagramSections: readonly string[];
  diagramLabels: Record<
    'summary-quadratic' | 'numerical' | 'analytic' | 'scaled-error',
    { visible: string; accessible: string }
  >;
  restoredText: string;
  exerciseSummary: string;
}

const copy = {
  en: {
    revisionLabel: 'Content revision',
    chapterTitle: 'Check gradients before trusting backpropagation',
    chapterDescription:
      'Validate candidate derivatives for LLM training with central differences, scale-aware error, and deterministic tensor-coordinate sampling in dependency-free Rust.',
    headings: [
      'Predict one quadratic derivative',
      'Center two probes around one point',
      'Name the derivative-check quantities',
      'From next-word backpropagation to checked Transformer training',
      'Implement a sampled numerical oracle',
      'Watch the step size help, then hurt',
      'Predict before running Rust',
      'Prepare reverse-mode differentiation',
    ],
    historyHeading: 'From next-word backpropagation to checked Transformer training',
    historyClaims: [
      "Bengio et al.'s neural language model maximizes next-word log-likelihood with an explicit backward/update phase over output, hidden, and learned word-feature parameters. Those propagated derivatives make repeated training updates practical, but the implemented derivative path is not an independent check of itself.",
      "The Transformer carries gradient-based training into repeated attention and feed-forward layers, using Adam for 100,000 base-model or 300,000 big-model steps. Baydin et al. distinguish numerical differentiation from reverse-mode automatic differentiation: finite differences estimate one local derivative from repeated evaluations, while reverse mode efficiently produces a scalar objective's gradient over many parameters. Here, the independent estimate can reveal a local mistake in a candidate derivative.",
      'This chapter uses central differences only as a slow sampled oracle for analytic candidates, including the Chapter 12 indexed mean NLL derivative, before Chapter 14 builds reverse mode. It does not train or run the decoder; its step size, tolerance, coordinate selection, restoration, finite-input, storage, and error-order rules are course-local.',
    ],
    rustCaptions: [
      'Define one quadratic prediction and both analytic candidates',
      'Evaluate a checked minus probe and plus probe before forming the centered slope',
      'Normalize finite gradient disagreement by the larger magnitude or one',
      'Name invalid steps, probes, values, shapes, samples, views, and coordinates',
      'Choose unique ordered tensor coordinates without randomness',
      'Check deterministic tensor coordinates and restore every temporary perturbation',
      'Construct the hand-derived candidate for the two-row indexed mean NLL',
      'Compare four vocabulary-logit candidates with independent forward losses',
      'Prepare the complete deterministic learner evidence before printing',
      'Run one cubic derivative check across all six step sizes',
    ],
    rustLabels: [
      'Rust source defining the Chapter 13 predict-first quadratic gradient checks',
      'Rust source implementing the Chapter 13 scalar central difference',
      'Rust source implementing the scale-aware Chapter 13 comparison rule',
      'Rust source defining the Chapter 13 numerical gradient-check errors',
      'Rust source implementing deterministic Chapter 13 tensor-coordinate selection',
      'Rust source implementing the sampled tensor-coordinate gradient checker',
      'Rust source deriving the Chapter 13 analytic token-loss gradient candidate',
      'Rust source applying sampled gradient checking to Chapter 12 indexed mean NLL',
      'Rust source running the Chapter 13 learner gradient-check example',
      'Rust source implementing the Chapter 13 truncation-to-rounding step-size scan',
    ],
    diagramTitle: 'See a centered slope converge, then deteriorate',
    diagramDescription:
      'Compare scalar checks, token-loss gradients, exact restoration, and invalid inputs.',
    diagramSections: [
      'Check the quadratic at theta equals three',
      'Scan six step sizes around theta equals one point five',
      'Compare two finite gradient candidates',
      'Probe four coordinates of the token loss',
      'Reject unsafe numerical requests',
    ],
    diagramLabels: {
      'summary-quadratic': {
        visible: 'Quadratic numerical derivative',
        accessible: 'Quadratic numerical derivative',
      },
      numerical: { visible: 'Numerical gradient', accessible: 'Numerical gradient' },
      analytic: { visible: 'Analytic candidate', accessible: 'Analytic candidate' },
      'scaled-error': { visible: 'Scaled error', accessible: 'Scaled error' },
    },
    restoredText: 'yes, exactly',
    exerciseSummary: 'Check the predictions',
  },
  ru: {
    revisionLabel: 'Версия материала',
    chapterTitle: 'Проверяйте градиенты, прежде чем доверять обратному распространению',
    chapterDescription:
      'Проверяйте производные для обучения LLM с помощью центральных разностей, погрешности с учётом масштаба и детерминированно выбранных координат тензора; пример на Rust не требует сторонних зависимостей.',
    headings: [
      'Предскажите одну производную квадратичной функции',
      'Вычислите функцию в двух симметричных точках',
      'Назовите величины, используемые при проверке производной',
      'От обратного распространения для следующего слова к проверке производных при обучении Transformer',
      'Реализуйте выборочную численную проверку',
      'Проследите, как уменьшение шага сначала помогает, а затем мешает',
      'Сделайте предсказания до запуска Rust',
      'Подготовьте автоматическое дифференцирование в обратном режиме',
    ],
    historyHeading:
      'От обратного распространения для следующего слова к проверке производных при обучении Transformer',
    historyClaims: [
      'Нейронная языковая модель Бенжио и соавторов максимизирует логарифмическое правдоподобие следующего слова и явно выполняет этап обратного распространения и обновления параметров выходного и скрытого слоёв, а также обучаемых векторных представлений слов. Передаваемые назад производные позволяют многократно обновлять параметры, но вычисляющий их путь не может независимо проверить сам себя.',
      'Transformer обучает градиентным методом повторяющиеся слои внимания и полносвязные блоки, выполняя 100 000 шагов Adam для базовой модели или 300 000 для большой. Байдин и соавторы различают численное дифференцирование и автоматическое дифференцирование в обратном режиме: конечные разности оценивают одну локальную производную по нескольким вычислениям функции, а обратный режим эффективно получает градиент скалярной цели по множеству параметров. Здесь такая независимая оценка помогает обнаружить локальную ошибку в проверяемой производной.',
      'В этой главе центральные разности служат лишь медленным независимым численным эталоном для выборочной проверки аналитически вычисленных значений, в том числе производной среднего NLL по индексам из главы 12. В главе 14 появится обратный режим. Такая проверка не обучает и не запускает декодер; правила выбора шага, допуска и координат, восстановления значений, конечности входов, хранения и очерёдности проверок относятся к данной реализации курса.',
    ],
    rustCaptions: [
      'Задать квадратичный пример и оба аналитических значения',
      'Вычислить значения слева и справа, а затем наклон секущей',
      'Нормировать расхождение конечных производных по большей величине или единице',
      'Различать ошибки шагов, точек, значений, форм, координат и представлений',
      'Выбрать уникальные упорядоченные координаты тензора без случайности',
      'Проверить выбранные координаты тензора и восстановить каждое временное изменение',
      'Построить вручную производную среднего NLL по двум строкам',
      'Сравнить четыре производные по логитам словаря с независимыми прямыми вычислениями',
      'Подготовить полный детерминированный результат перед печатью',
      'Проверить производную кубической функции при всех шести величинах шага',
    ],
    rustLabels: [
      'Исходный код Rust с предварительно рассчитанной проверкой производной квадратичной функции в главе 13',
      'Исходный код Rust с реализацией скалярной центральной разности в главе 13',
      'Исходный код Rust с правилом сравнения градиентов с учётом масштаба в главе 13',
      'Исходный код Rust с типами ошибок численной проверки градиента в главе 13',
      'Исходный код Rust с детерминированным выбором координат тензора в главе 13',
      'Исходный код Rust с выборочной проверкой градиента по координатам тензора',
      'Исходный код Rust с аналитически вычисленной производной функции потерь по токенам в главе 13',
      'Исходный код Rust с выборочной проверкой производной среднего NLL из главы 12',
      'Исходный код Rust с запуском учебного примера численной проверки градиента в главе 13',
      'Исходный код Rust с перебором шагов от погрешности усечения к погрешности округления в главе 13',
    ],
    diagramTitle: 'Как шаг сначала улучшает, затем портит оценку производной',
    diagramDescription:
      'Сравните скалярные проверки, градиенты функции потерь по токенам, точное восстановление и недопустимые входные данные.',
    diagramSections: [
      'Квадратичная проверка',
      'Шесть величин шага для кубической функции',
      'Два аналитических значения',
      'Четыре координаты градиента NLL',
      'Недопустимые запросы',
    ],
    diagramLabels: {
      'summary-quadratic': {
        visible: 'Численная производная',
        accessible: 'Численная производная квадратичной функции',
      },
      numerical: { visible: 'Числ. градиент', accessible: 'Численный градиент' },
      analytic: { visible: 'Аналит. значение', accessible: 'Аналитическое значение' },
      'scaled-error': {
        visible: 'Норм. погрешность',
        accessible: 'Нормированная погрешность',
      },
    },
    restoredText: 'да, точно',
    exerciseSummary: 'Проверьте предсказания',
  },
} satisfies Record<ChapterLocale, LocalizedCopy>;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustRegions = [
  ['rust/demos/ch13-gradient-checking/src/lib.rs', 'quadratic-gradient-prediction'],
  ['rust/crates/llm-from-scratch/src/autograd/gradcheck.rs', 'central-difference'],
  ['rust/crates/llm-from-scratch/src/autograd/gradcheck.rs', 'scale-aware-comparison'],
  ['rust/crates/llm-from-scratch/src/autograd/gradcheck.rs', 'gradcheck-errors'],
  ['rust/crates/llm-from-scratch/src/autograd/gradcheck.rs', 'sample-tensor-coordinates'],
  ['rust/crates/llm-from-scratch/src/autograd/gradcheck.rs', 'sampled-tensor-gradient-check'],
  ['rust/demos/ch13-gradient-checking/src/lib.rs', 'hand-derived-nll-gradient'],
  ['rust/demos/ch13-gradient-checking/src/lib.rs', 'sampled-nll-gradient-check'],
  ['rust/demos/ch13-gradient-checking/src/main.rs', 'learner-gradient-check-output'],
  ['rust/demos/ch13-gradient-checking/src/lib.rs', 'step-size-scan'],
] as const;
const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 13,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.chapterDescription);
  await expectSeoDescription(page, localized.chapterDescription);
  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: localized.historyHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.historyHeading}"]]`,
    );
  const historyText = await readMathAwareText(historyNodes);
  for (const claim of localized.historyClaims) expect(historyText).toContain(claim);
  expect(historyText).not.toMatch(
    /FORTRAN|Genie|NumPy|programming-language history|array-library history/i,
  );
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(historySources);

  const formula = page
    .locator('.katex-display')
    .filter({
      has: page.locator('annotation[encoding="application/x-tex"]', {
        hasText: formulaLatex,
      }),
    });
  await expect(formula).toHaveCount(1);
  await expect(formula).toHaveCSS('direction', 'ltr');
  await expect(formula.locator('annotation[encoding="application/x-tex"]')).toHaveText(
    formulaLatex,
  );
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  await expect(rustSources.locator('figcaption > span')).toHaveText(localized.rustCaptions);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.textContent),
    ),
  ).toEqual(expectedRustSources);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual(expectedRustRegions.map(([, region]) => region));
  expect(
    await highlighted.evaluateAll((blocks) =>
      blocks.map((block) => block.getAttribute('aria-label')),
    ),
  ).toEqual(localized.rustLabels);
  for (const evidence of await highlighted.evaluateAll((blocks) =>
    blocks.map((block) => ({
      tabIndex: block.getAttribute('tabindex'),
      direction: block.getAttribute('dir'),
      colors: new Set(
        Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
          .map((token) => token.style.color)
          .filter(Boolean),
      ).size,
    })),
  )) {
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.direction).toBe('ltr');
    expect(evidence.colors).toBeGreaterThan(1);
  }

  await expectVisualizationDecision(page, { decision: 'useful', id: 'gradient-checking' });
  const diagram = page.locator('figure[data-visualization-id="gradient-checking"]');
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  for (const heading of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  for (const [key, label] of Object.entries(localized.diagramLabels)) {
    const displayed = diagram.locator(`[data-diagram-display-label="${key}"]`);
    const accessible = diagram.locator(`[data-diagram-accessible-label="${key}"]`);
    expect(await displayed.count()).toBeGreaterThan(0);
    await expect(displayed).toHaveText(
      Array.from({ length: await displayed.count() }, () => label.visible),
    );
    expect(await accessible.count()).toBe(await displayed.count());
    expect(await displayed.evaluateAll((nodes) => nodes.every((node) =>
      node.hasAttribute('data-diagram-accessible-label')
      && node.getAttribute('role') === 'group'
      && !node.hasAttribute('aria-hidden'),
    ))).toBe(true);
    for (let index = 0; index < await accessible.count(); index += 1) {
      await expect(accessible.nth(index)).toHaveAccessibleName(label.accessible);
      await expect(accessible.nth(index)).toBeVisible();
    }
    expect(await accessible.evaluateAll((nodes) =>
      nodes.every((node) => {
        const style = window.getComputedStyle(node);
        return style.position !== 'absolute' && style.clipPath === 'none';
      }),
    )).toBe(true);
  }
  await expect(diagram.locator('[data-diagram-box]')).toHaveCount(23);

  expect(
    await diagram.locator('.step-record[data-step-index]').evaluateAll((rows) =>
      rows.map((row) => ({
        index: row.getAttribute('data-step-index'),
        phase: row.getAttribute('data-phase'),
        status: row.getAttribute('data-status'),
        step: row.getAttribute('data-step'),
        numerical: row.getAttribute('data-numerical'),
        error: row.getAttribute('data-scaled-error'),
      })),
    ),
  ).toEqual([
    { index: '0', phase: 'truncation', status: 'fail', step: '1.000000000000e0', numerical: '5.750000000000', error: '1.739130434783e-1' },
    { index: '1', phase: 'truncation', status: 'fail', step: '1.000000000000e-1', numerical: '4.760000000000', error: '2.100840336136e-3' },
    { index: '2', phase: 'converging', status: 'pass', step: '1.000000000000e-3', numerical: '4.750001000000', error: '2.105262021379e-7' },
    { index: '3', phase: 'trusted', status: 'pass', step: '1.000000000000e-5', numerical: '4.750000000131', error: '2.758704376049e-11' },
    { index: '4', phase: 'rounding', status: 'pass', step: '1.000000000000e-8', numerical: '4.749999971132', error: '6.077470970922e-9' },
    { index: '5', phase: 'rounding', status: 'fail', step: '1.000000000000e-12', numerical: '4.750422277766', error: '8.889267973000e-5' },
  ]);
  expect(
    await diagram.locator('[data-comparison-name]').evaluateAll((cards) =>
      cards.map((card) => ({
        name: card.getAttribute('data-comparison-name'),
        analytic: card.getAttribute('data-analytic'),
        numerical: card.getAttribute('data-numerical'),
        error: card.getAttribute('data-scaled-error'),
        tolerance: card.getAttribute('data-tolerance'),
        status: card.getAttribute('data-status'),
      })),
    ),
  ).toEqual([
    {
      name: 'quadratic-correct',
      analytic: '6.000000000000',
      numerical: '6.000000000000',
      error: '8.881784197001e-16',
      tolerance: '1.000000000000e-6',
      status: 'pass',
    },
    {
      name: 'quadratic-wrong',
      analytic: '5.500000000000',
      numerical: '6.000000000000',
      error: '8.333333333333e-2',
      tolerance: '1.000000000000e-6',
      status: 'fail',
    },
  ]);
  expect(
    await diagram.locator('[data-sample-flat]').evaluateAll((cards) =>
      cards.map((card) => ({
        flat: card.getAttribute('data-sample-flat'),
        coordinate: card.getAttribute('data-coordinate'),
        analytic: card.getAttribute('data-analytic'),
        numerical: card.getAttribute('data-numerical'),
        error: card.getAttribute('data-scaled-error'),
        status: card.getAttribute('data-status'),
      })),
    ),
  ).toEqual([
    {
      flat: '0',
      coordinate: '0:0',
      analytic: '-0.377635764473',
      numerical: '-0.377635764481',
      error: '8.753164859598e-12',
      status: 'pass',
    },
    {
      flat: '1',
      coordinate: '0:1',
      analytic: '0.332620477887',
      numerical: '0.332620477894',
      error: '6.763478666016e-12',
      status: 'pass',
    },
    {
      flat: '3',
      coordinate: '1:0',
      analytic: '0.433406666099',
      numerical: '0.433406666089',
      error: '9.292122626903e-12',
      status: 'pass',
    },
    {
      flat: '5',
      coordinate: '1:2',
      analytic: '-0.492061880012',
      numerical: '-0.492061879998',
      error: '1.425926043908e-11',
      status: 'pass',
    },
  ]);
  await expect(diagram.locator('[data-restored-exactly]')).toHaveAttribute(
    'data-restored-exactly',
    'yes',
  );
  await expect(diagram.locator('[data-restored-exactly]')).toContainText(
    localized.restoredText,
  );
  expect(
    await diagram.locator('[data-error-kind]').evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-error-kind'),
        step: card.querySelector('[data-exact-step]')?.getAttribute('data-exact-step') ?? null,
        point: card.querySelector('[data-exact-point]')?.getAttribute('data-exact-point') ?? null,
        value: card.querySelector('[data-exact-value]')?.getAttribute('data-exact-value') ?? null,
        parameterShape:
          card.querySelector('[data-exact-parameter-shape]')?.getAttribute('data-exact-parameter-shape') ?? null,
        candidateShape:
          card.querySelector('[data-exact-candidate-shape]')?.getAttribute('data-exact-candidate-shape') ?? null,
      })),
    ),
  ).toEqual([
    {
      kind: 'invalid-step',
      step: '0.000000000000',
      point: null,
      value: null,
      parameterShape: null,
      candidateShape: null,
    },
    {
      kind: 'collapsed-perturbation',
      step: '1.000000000000e-20',
      point: '1.000000000000',
      value: null,
      parameterShape: null,
      candidateShape: null,
    },
    {
      kind: 'non-finite-evaluation',
      step: null,
      point: null,
      value: 'NaN',
      parameterShape: null,
      candidateShape: null,
    },
    {
      kind: 'shape-mismatch',
      step: null,
      point: null,
      value: null,
      parameterShape: '2',
      candidateShape: '1,2',
    },
  ]);

  if (locale === 'ru') {
    const visibleDiagramText = await diagram.innerText();
    expect(visibleDiagramText).not.toMatch(
      /\b(?:Probe side|Parameter shape|Candidate shape|yes, exactly)\b/,
    );
  }
  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const scrollers = diagram.locator('[data-diagram-scroll]');
  await expect(scrollers).toHaveCount(0);
  expect(
    await diagram.locator('[data-diagram-box]').evaluateAll((boxes) =>
      boxes
        .map((box) => ({
          inlineDebt: (box as HTMLElement).scrollWidth - (box as HTMLElement).clientWidth,
          blockDebt: (box as HTMLElement).scrollHeight - (box as HTMLElement).clientHeight,
        }))
        .filter(({ inlineDebt, blockDebt }) => inlineDebt > 2 || blockDebt > 2),
    ),
  ).toEqual([]);

  const exerciseQuestions = page.locator('.lesson-body > ol > li');
  await expect(exerciseQuestions).toHaveCount(8);
  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(8);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 13 localized gradient-checking vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 13 is thirteenth on every course index with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(13);
      expect(chapters[12]).toEqual(
        expect.objectContaining({ chapterId, order: 13, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        localeDefinition?.languageTag ?? '',
      );
      await page.getByRole('link', { name: localized.chapterTitle, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 13,
        revision: contentRevision,
        revisionLabel: localized.revisionLabel,
        title: localized.chapterTitle,
      });
      await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
      await expectNoOverflowOrClientScripts(page);
    }

    for (const source of chapterLocaleDefinitions) {
      for (const target of chapterLocaleDefinitions.filter(({ code }) => code !== source.code)) {
        await page.goto(chapterPath(source.code, chapterId));
        const switchLink = page.locator(`.locale-switch a[data-locale="${target.code}"]`);
        await expect(switchLink).not.toHaveAttribute('data-locale-fallback', 'course-index');
        await switchLink.click();
        await expect(page).toHaveURL(new RegExp(`${chapterPath(target.code, chapterId)}$`));
        await expect(page.locator('html')).toHaveAttribute('lang', target.languageTag);
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: copy[target.code].chapterTitle,
            exact: true,
          }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 13 ${locale} renders exact content at desktop and narrow widths`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters);
    });
  }

  test('chapter 13 full view fits both localized diagrams without substantial travel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      const diagram = page.locator('figure[data-visualization-id="gradient-checking"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'gradient-checking',
      );
      await settle(page);
      const geometry = await diagram.evaluate((node) => ({
        blockDebt: node.scrollHeight - node.clientHeight,
        blockBudget: Math.ceil(node.clientHeight * 0.2),
        inlineDebt: node.scrollWidth - node.clientWidth,
        regionInlineDebts: Array.from(
          node.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
        ).map((region) => region.scrollWidth - region.clientWidth),
        boxDebts: Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-box]')).map(
          (box) => ({
            inline: box.scrollWidth - box.clientWidth,
            block: box.scrollHeight - box.clientHeight,
          }),
        ),
      }));
      expect(geometry.blockDebt).toBeLessThanOrEqual(geometry.blockBudget);
      expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
      expect(geometry.regionInlineDebts.every((debt) => debt <= 2)).toBe(true);
      expect(
        geometry.boxDebts.every(({ inline, block }) => inline <= 2 && block <= 2),
      ).toBe(true);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 13 ${locale} keeps phase, verdict, and rejection cues in forced colors`, async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="gradient-checking"]');
      const truncation = diagram.locator('.state-symbol.phase-truncation').first();
      const converging = diagram.locator('.state-symbol.phase-converging').first();
      const trusted = diagram.locator('.state-symbol.phase-trusted').first();
      const rounding = diagram.locator('.state-symbol.phase-rounding').first();
      const passed = diagram.locator('[data-comparison-name="quadratic-correct"] .state-symbol');
      const failed = diagram.locator('[data-comparison-name="quadratic-wrong"] .state-symbol');
      const rejected = diagram.locator('[data-error-kind] .state-symbol').first();
      await expect(truncation).toHaveText('△');
      await expect(converging).toHaveText('→');
      await expect(trusted).toHaveText('✓');
      await expect(rounding).toHaveText('≈');
      await expect(passed).toHaveText('✓');
      await expect(failed).toHaveText('!');
      await expect(rejected).toHaveText('×');
      expect(await truncation.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('solid');
      expect(await converging.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
      expect(await trusted.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
      expect(await rounding.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dotted');
      expect(await passed.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
      expect(await failed.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
      expect(await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
      await expectNoOverflowOrClientScripts(page);
    });
  }

  test('both localized diagrams remain complete without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    try {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        await page.goto(chapterPath(locale, chapterId));
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: localized.chapterTitle,
            exact: true,
          }),
        ).toBeVisible();
        const diagram = page.locator('figure[data-visualization-id="gradient-checking"]');
        await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
        await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
        await expect(diagram.locator('.step-record[data-step-index]')).toHaveCount(6);
        await expect(diagram.locator('[data-comparison-name]')).toHaveCount(2);
        await expect(diagram.locator('[data-sample-flat]')).toHaveCount(4);
        await expect(diagram.locator('[data-error-kind]')).toHaveCount(4);
        await expect(diagram.locator('[data-diagram-box]')).toHaveCount(23);
        await expect(diagram.locator('[data-restored-exactly]')).toContainText(
          localized.restoredText,
        );
        await expect(diagram.locator('[data-diagram-full-view-controls]')).toHaveCount(0);
        await expectNoOverflowOrClientScripts(page);
      }
    } finally {
      await context.close();
    }
  });
});
