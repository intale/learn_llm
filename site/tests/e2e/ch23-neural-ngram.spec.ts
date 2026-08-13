import { expect, test, type Page } from '@playwright/test';

import {
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectSeoDescription,
  expectVisualizationDecision,
  readMathAwareText,
  readOrderedCourseChapters,
  type CourseChapterLink,
} from './chapter-helpers';

const chapterId = '23-neural-ngram';
type ChapterLocale = 'en' | 'ru';

const locales = ['en', 'ru'] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Train a fixed-context neural language model',
    description:
      'Assemble embeddings, a SwiGLU hidden layer, indexed next-token loss, mini-batches, and AdamW into a deterministic neural n-gram whose held-out loss improves.',
    headings: [
      'Predict one token from the complete context',
      'Concatenate embeddings before the hidden layer',
      'Keep context, feature, and vocabulary axes distinct',
      'From sparse counts to learned contexts and attention',
      'Own one parameter set across every update',
      'Follow one context and the held-out loss',
      'Predict before training',
      'Replace fixed context with causal information mixing next',
    ],
    historyFragments: [
      'Classical count n-grams estimate each short context separately',
      'bigram keyed only by final token',
      'mixes two followers',
      'learned distributed word features and a feed-forward network',
      'replace recurrence and convolution with attention',
      'road to modern LLMs',
    ],
    diagramTitle: 'Follow one context through training',
    diagramDescription:
      'Follow exact Rust-authored token IDs through embeddings, concatenation, a hidden state, and vocabulary logits, then compare complete training and validation losses.',
    stageNames: [
      'Context IDs',
      'Embedding rows',
      'Concatenated features',
      'SwiGLU hidden state',
      'Vocabulary logits',
    ],
    pipelineScroller: 'Scrollable fixed-context model pipeline',
    generationScroller: 'Scrollable generated token ID sequence',
    checkpointHistory:
      'Each loss covers its complete partition and weights every batch by its actual row count. An earlier exploratory benchmark inspected validation loss and established the 15-update budget. The published run fixes that budget before it begins and reports checkpoints without dynamically selecting one.',
    resultHistory: [
      'Before this teaching fixture was frozen, an exploratory benchmark inspected validation loss',
      'measurements at steps 0, 8, and 15 are reports, not inputs to dynamic checkpoint selection',
    ],
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Обучите нейронную языковую модель с фиксированным контекстом',
    description:
      'Объедините эмбеддинги, скрытый слой SwiGLU, функцию потерь следующего токена с выбором по индексу, мини-пакеты и AdamW в детерминированной нейронной n-граммной модели со снижением валидационных потерь.',
    headings: [
      'Предскажите один токен по полному контексту',
      'Перед скрытым слоем конкатенируйте эмбеддинги',
      'Не смешивайте оси контекста, признаков и словаря',
      'От разреженных счётчиков к обучаемым контекстам и вниманию',
      'Храните единый набор параметров на всех шагах',
      'Проследите один контекст и функцию потерь на отложенных данных',
      'Сначала сделайте предсказания',
      'Далее замените фиксированный контекст каузальным обменом информацией',
    ],
    historyFragments: [
      'Классические счётные n-граммные модели оценивают каждый короткий контекст отдельно',
      'ключом которой служит только последний токен',
      'объединяет статистику по двум возможным следующим токенам',
      'обучаемых распределённых представлений слов и сети прямого распространения',
      'заменяют рекуррентные и свёрточные слои механизмом внимания',
      'на пути к современным LLM',
    ],
    diagramTitle: 'Проследите путь одного контекста через обучение',
    diagramDescription:
      'Проследите, как точные ID токенов из вывода Rust проходят через эмбеддинги, конкатенацию, скрытое состояние и логиты словаря, а затем сравните функции потерь на полных обучающей и валидационной выборках.',
    stageNames: [
      'ID токенов контекста',
      'Строки эмбеддингов',
      'Конкатенированные признаки',
      'Скрытое состояние SwiGLU',
      'Логиты словаря',
    ],
    pipelineScroller: 'Прокручиваемая схема модели с фиксированным контекстом',
    generationScroller: 'Прокручиваемая последовательность ID сгенерированных токенов',
    checkpointHistory:
      'Каждая функция потерь охватывает всю соответствующую выборку и взвешивает каждый пакет по фактическому числу строк. В ходе предварительного эксперимента результаты на валидационной выборке использовали, чтобы установить бюджет из 15 обновлений. В опубликованном запуске этот бюджет задан до начала обучения, а показанные измерения не используются для выбора контрольного шага.',
    resultHistory: [
      'До фиксации этого учебного примера в ходе предварительного эксперимента результаты на валидационной выборке использовали',
      'измерения на шагах 0, 8 и 15 только попадают в отчёт и не используются для динамического выбора контрольного шага',
    ],
  },
} as const;

const normalizeMath = (value: string) => value.replace(/\s+/g, '');

async function expectFormulaGeometry(page: Page) {
  const problems = await page
    .locator('.lesson-body .katex-display, .lesson-body [data-inline-math]')
    .evaluateAll((nodes) =>
      nodes.flatMap((node, index) => {
        const element = node as HTMLElement;
        const rect = element.getBoundingClientRect();
        const source =
          element.querySelector('annotation[encoding="application/x-tex"]')?.textContent ??
          `formula ${index}`;
        const issues: string[] = [];
        let ancestor: HTMLElement | null = element.parentElement;
        let localScroller = false;
        while (ancestor && ancestor !== document.body) {
          const { overflowX } = getComputedStyle(ancestor);
          if (
            ['auto', 'scroll'].includes(overflowX) &&
            ancestor.scrollWidth > ancestor.clientWidth + 1
          ) {
            localScroller = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        if (
          (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) &&
          !localScroller
        ) {
          issues.push(`${source} escapes the viewport`);
        }
        if (rect.width <= 0 || rect.height <= 0) issues.push(`${source} has no visible box`);
        const style = getComputedStyle(element);
        if (style.direction !== 'ltr') issues.push(`${source} is not left-to-right`);
        if (
          ['auto', 'clip', 'hidden', 'scroll'].includes(style.overflowY) &&
          element.scrollHeight > element.clientHeight + 2
        ) {
          issues.push(`${source} clips vertically`);
        }
        if (element.classList.contains('katex-display')) {
          const renderedBoxes = Array.from(
            element.querySelectorAll<HTMLElement>('.katex-html *'),
          )
            .map((rendered) => rendered.getBoundingClientRect())
            .filter((rendered) => rendered.width > 0 && rendered.height > 0);
          if (renderedBoxes.length === 0) {
            issues.push(`${source} has no rendered HTML boxes`);
          } else {
            const renderedTop = Math.min(...renderedBoxes.map((rendered) => rendered.top));
            const renderedBottom = Math.max(...renderedBoxes.map((rendered) => rendered.bottom));
            if (renderedTop < rect.top - 1) {
              issues.push(`${source} clips its upper rendered limit`);
            }
            if (renderedBottom > rect.bottom + 1) {
              issues.push(`${source} clips its lower rendered limit`);
            }
          }
          const container = element.parentElement;
          const next = container?.nextElementSibling as HTMLElement | null;
          if (
            container &&
            next &&
            container.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 1
          ) {
            issues.push(`${source} overlaps the following block`);
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectLocalFormulaSeparation(page: Page) {
  const overlaps = await page
    .locator(
      'figure[data-visualization-id="neural-ngram"] .pipeline-card, figure[data-visualization-id="neural-ngram"] .checkpoint-card, figure[data-visualization-id="neural-ngram"] .result-grid',
    )
    .evaluateAll((containers) =>
      containers.flatMap((container, containerIndex) => {
        const formulas = Array.from(container.querySelectorAll<HTMLElement>('[data-inline-math]'));
        const issues: string[] = [];
        for (let leftIndex = 0; leftIndex < formulas.length; leftIndex += 1) {
          const left = formulas[leftIndex].getBoundingClientRect();
          for (let rightIndex = leftIndex + 1; rightIndex < formulas.length; rightIndex += 1) {
            const right = formulas[rightIndex].getBoundingClientRect();
            const horizontal = left.left < right.right - 1 && right.left < left.right - 1;
            const vertical = left.top < right.bottom - 1 && right.top < left.bottom - 1;
            if (horizontal && vertical) {
              issues.push(
                `container ${containerIndex} formulas ${leftIndex} and ${rightIndex} overlap`,
              );
            }
          }
        }
        return issues;
      }),
    );
  expect(overlaps).toEqual([]);
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 23,
    revision: 5,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: locales,
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.description);
  await expectSeoDescription(page, localized.description);
  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);

  const annotations = await page
    .locator('.lesson-body annotation[encoding="application/x-tex"]')
    .allTextContents();
  for (const expected of [
    String.raw`[1,2]\to[1,2,4]\to[1,8]\to[1,8]\to[1,266]`,
    String.raw`h=\operatorname{SwiGLU}([E_{z_{t-C}},\ldots,E_{z_{t-1}}]),\quad \ell=hW_o`,
    String.raw`E\in\mathbb{R}^{V\times D}`,
    String.raw`[B,H][H,V]=[B,V]`,
    String.raw`L=-\frac{1}{B}\sum_{b=1}^{B}\log`,
    String.raw`\sum_{j=0}^{V-1}\exp(\ell_{b,j})`,
    String.raw`y_b=\operatorname{target\_row}(b)_{C-1}`,
    String.raw`V=266,\ C=2,\ D=4,\ H=8`,
    String.raw`N_{\mathrm{train}}=1836,\ N_{\mathrm{val}}=467`,
    String.raw`\eta=0.010000,\ t_{\mathrm{max}}=15`,
    String.raw`L_{\mathrm{train}}=5.555850`,
    String.raw`L_{\mathrm{val}}=5.557362`,
    String.raw`\Delta L_{\mathrm{val}}=0.026120`,
  ]) {
    expect(
      annotations.map(normalizeMath).some((formula) => formula.includes(normalizeMath(expected))),
      `expected a rendered formula containing ${expected}`,
    ).toBe(true);
  }
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);
  const code = await page.locator('.lesson-body :not(pre) > code').allTextContents();
  for (const expression of [
    'hW_o',
    'C*D',
    '[B,C]',
    '[B,C,D]',
    '[B,CD]',
    '[B,H]',
    '[B,V]',
    'target_row(b)[C-1]',
  ]) {
    expect(code).not.toContain(expression);
  }
  await expectFormulaGeometry(page);

  const history = page
    .getByRole('heading', {
      level: 2,
      name: localized.headings[3],
      exact: true,
    })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.headings[3]}"]]`,
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  for (const fragment of localized.historyFragments) expect(historyText).toContain(fragment);
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(2);

  await expect(page.locator('figure.rust-source')).toHaveCount(7);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'neural-ngram' });
  const diagram = page.locator('figure[data-visualization-id="neural-ngram"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);

  const cards = diagram.locator('.pipeline-card');
  await expect(cards).toHaveCount(5);
  expect(await cards.evaluateAll((nodes) => nodes.map((node) => node.dataset.stage))).toEqual([
    'context_ids',
    'embeddings',
    'concatenated',
    'hidden',
    'logits',
  ]);
  await expect(cards.locator('h5')).toHaveText(localized.stageNames);
  const shapes = await cards.evaluateAll((nodes) =>
    nodes.map(
      (node) =>
        node.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? '',
    ),
  );
  expect(shapes.map(normalizeMath)).toEqual([
    '[1,2]',
    '[1,2,4]',
    '[1,8]',
    '[1,8]',
    '[1,266]',
  ]);
  await expect(cards.nth(0)).toContainText('67');
  await expect(cards.nth(0)).toContainText('118');
  await expect(cards.nth(1)).toContainText('0.064154');
  await expect(cards.nth(2)).toContainText('-0.068284');
  await expect(cards.nth(3)).toContainText('-0.002448');
  await expect(cards.nth(4)).toContainText('0.002350');

  const checkpoints = diagram.locator('.checkpoint-card');
  await expect(diagram.locator('.checkpoint-stage .stage-heading > p').last()).toHaveText(
    localized.checkpointHistory,
  );
  await expect(checkpoints).toHaveCount(3);
  expect(await checkpoints.evaluateAll((nodes) => nodes.map((node) => node.dataset.step))).toEqual([
    '0',
    '8',
    '15',
  ]);
  await expect(checkpoints.nth(0)).toContainText('5.583505');
  await expect(checkpoints.nth(0)).toContainText('5.583482');
  await expect(checkpoints.nth(1)).toContainText('5.580106');
  await expect(checkpoints.nth(1)).toContainText('5.580365');
  await expect(checkpoints.nth(2)).toContainText('5.555850');
  await expect(checkpoints.nth(2)).toContainText('5.557362');

  const result = diagram.locator('.result-stage');
  await expect(result).toContainText('5.583482');
  await expect(result).toContainText('5.557362');
  await expect(result).toContainText('0.026120');
  const resultHistory = diagram.locator('xpath=following-sibling::p[1]');
  const resultHistoryText = await readMathAwareText(resultHistory);
  for (const fragment of localized.resultHistory) expect(resultHistoryText).toContain(fragment);
  const generated = diagram.locator('.token-list li');
  await expect(generated).toHaveCount(12);
  expect(
    await generated
      .locator('annotation[encoding="application/x-tex"]')
      .allTextContents(),
  ).toEqual([
    '259',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
  ]);
  const proof = diagram.locator('.proof-grid');
  for (const token of [
    'bitwise',
    'not_encoded_or_scored',
    'final_shifted',
    'five_positive_finite',
    'preserved',
    'cleared',
    'deterministic',
  ]) {
    await expect(proof).toContainText(token);
  }

  const pipelineScroller = diagram.locator('.pipeline-scroll');
  await expect(pipelineScroller).toHaveAttribute('role', 'region');
  await expect(pipelineScroller).toHaveAccessibleName(localized.pipelineScroller);
  await pipelineScroller.focus();
  await expect(pipelineScroller).toBeFocused();
  const generationScroller = diagram.locator('.generation-scroll');
  await expect(generationScroller).toHaveAttribute('role', 'region');
  await expect(generationScroller).toHaveAccessibleName(localized.generationScroller);
  await generationScroller.focus();
  await expect(generationScroller).toBeFocused();

  const containment = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    natural: Array.from(
      node.querySelectorAll<HTMLElement>(
        '.pipeline-card, .checkpoint-card, .result-grid > div, .generation-summary > div, .proof-grid > div',
      ),
    ).map((part) => ({ clientHeight: part.clientHeight, scrollHeight: part.scrollHeight })),
  }));
  expect(containment.scrollWidth).toBeLessThanOrEqual(containment.clientWidth);
  for (const part of containment.natural) {
    expect(part.scrollHeight).toBeLessThanOrEqual(part.clientHeight + 2);
  }
  const modelSummaryOverflow = await diagram
    .locator('.fixture-summary > div')
    .first()
    .evaluate((card) => {
      const cardRect = card.getBoundingClientRect();
      return Array.from(card.querySelectorAll<HTMLElement>('.katex'))
        .map((formula) => formula.getBoundingClientRect())
        .flatMap((formula, index) => {
          const issues: string[] = [];
          if (formula.left < cardRect.left - 1 || formula.right > cardRect.right + 1) {
            issues.push(`Model-configuration formula ${index} crosses its card horizontally`);
          }
          if (formula.top < cardRect.top - 1 || formula.bottom > cardRect.bottom + 1) {
            issues.push(`Model-configuration formula ${index} crosses its card vertically`);
          }
          return issues;
        });
    });
  expect(modelSummaryOverflow).toEqual([]);
  await expectLocalFormulaSeparation(page);

  if (narrow) {
    const checkpointTops = await checkpoints.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    );
    expect(checkpointTops[1]).toBeGreaterThan(checkpointTops[0]);
    expect(checkpointTops[2]).toBeGreaterThan(checkpointTops[1]);
    for (const scroller of [pipelineScroller, generationScroller]) {
      const width = await scroller.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(width.scroll).toBeGreaterThan(width.client);
    }
  }

  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(8);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 23 neural n-gram vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English and Russian publish reciprocal Chapter 23 routes', async ({ page }) => {
    for (const locale of locales) {
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.find((chapter) => chapter.chapterId === chapterId)).toEqual(
        expect.objectContaining({ chapterId, order: 23, title: copy[locale].title }),
      );
      await page.goto(chapterPath(locale, chapterId));
      const other: ChapterLocale = locale === 'en' ? 'ru' : 'en';
      await expect(page.locator(`.locale-switch a[data-locale="${other}"]`)).toHaveAttribute(
        'href',
        chapterPath(other, chapterId),
      );
      await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveCount(1);
      await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
    }
  });

  test('both complete Rust-backed lessons render at desktop and narrow widths', async ({ page }) => {
    for (const locale of locales) {
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, chapters, false, locale);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, chapters, true, locale);
    }
  });

  test('input, learned, output, checkpoint, and proof structures remain distinct in forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="neural-ngram"]');
      await expect(diagram.locator('.input-card')).toHaveCSS('border-top-style', 'solid');
      await expect(diagram.locator('.learned-card').first()).toHaveCSS(
        'border-top-style',
        'dashed',
      );
      await expect(diagram.locator('.output-card')).toHaveCSS('border-top-style', 'double');
      await expect(diagram.locator('.checkpoint-card').first()).toHaveCSS(
        'border-top-style',
        'dashed',
      );
      await expect(diagram.locator('.final-checkpoint')).toHaveCSS('border-top-style', 'double');
      await expect(diagram.locator('.improvement-result')).toHaveCSS(
        'border-top-style',
        'double',
      );
      await expect(diagram.locator('.proof-stage')).toHaveCSS('border-top-style', 'solid');
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('corrected checkpoint history remains readable in full view for both locales', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="neural-ngram"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'neural-ngram',
      );
      await expect(diagram.locator('.checkpoint-stage .stage-heading > p').last()).toHaveText(
        copy[locale].checkpointHistory,
      );
      const geometry = await diagram.evaluate((node) => {
        const paintedDebt = (box: HTMLElement) => {
          const bounds = box.getBoundingClientRect();
          const style = getComputedStyle(box);
          const inner = {
            left: bounds.left + Number.parseFloat(style.borderLeftWidth),
            right: bounds.right - Number.parseFloat(style.borderRightWidth),
            top: bounds.top + Number.parseFloat(style.borderTopWidth),
            bottom: bounds.bottom - Number.parseFloat(style.borderBottomWidth),
          };
          let inline = 0;
          let block = 0;
          const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
          for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            if (!text.textContent?.trim()) continue;
            const parent = text.parentElement;
            if (parent?.closest('[data-diagram-box]') !== box) continue;
            const range = document.createRange();
            range.selectNodeContents(text);
            for (const ink of range.getClientRects()) {
              inline = Math.max(inline, inner.left - ink.left, ink.right - inner.right);
              block = Math.max(block, inner.top - ink.top, ink.bottom - inner.bottom);
            }
          }
          return { inline: Math.max(0, inline), block: Math.max(0, block) };
        };
        return {
          inlineDebt: Math.max(0, node.scrollWidth - node.clientWidth),
          boxDebts: Array.from(
            node.querySelectorAll<HTMLElement>('[data-diagram-box]'),
            paintedDebt,
          ),
        };
      });
      expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
      expect(geometry.boxDebts.every(({ inline, block }) => inline <= 2 && block <= 2)).toBe(true);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
  });

  test('RTL prose keeps arrows mirrored while program identities and formulas stay left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="neural-ngram"]');
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
      await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
      const arrowTransform = await diagram
        .locator('.pipeline-card')
        .first()
        .evaluate((node) => getComputedStyle(node, '::after').transform);
      expect(arrowTransform).not.toBe('none');
      expect(
        await diagram.locator('bdi[dir="ltr"]').evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
        ),
      ).toBe(true);
      expect(
        await diagram.locator('[data-inline-math]').evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
        ),
      ).toBe(true);
      await expectNoOverflowOrClientScripts(page);
    }
  });

});
