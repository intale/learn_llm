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
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '04-apply-bpe-tokenizer';
const contentRevision = 9;
const formulaLatex = String.raw`\operatorname{decode}_{content}(\operatorname{encode}_{content}(x))=\operatorname{bytes}(x)`;
const repositoryRoot = resolve(process.cwd(), '..');

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

const expectedRustSources = [
  readRustRegion('rust/demos/ch04-apply-bpe-tokenizer/src/lib.rs', 'unknown-token-loss'),
  readRustRegion('rust/crates/llm-from-scratch/src/tokenizer/bpe.rs', 'token-id-layout'),
  readRustRegion(
    'rust/crates/llm-from-scratch/src/tokenizer/bpe.rs',
    'ranked-content-encoding',
  ),
  readRustRegion('rust/crates/llm-from-scratch/src/tokenizer/bpe.rs', 'byte-exact-decoding'),
  readRustRegion('rust/crates/llm-from-scratch/src/tokenizer/bpe.rs', 'document-wrapping'),
  readRustRegion('rust/demos/ch04-apply-bpe-tokenizer/src/main.rs', 'chapter-output'),
];

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    chapterTitle: 'Applying and reversing a BPE tokenizer',
    revisionLabel: 'Content revision',
    headings: {
      formula: 'Guarantee exact bytes in one direction',
      history: 'Replace the unknown-string hole with byte coverage',
      rust: 'Build a frozen, strict tokenizer in Rust',
      visualization: 'Follow grouping and exact inverse concatenation',
      exercises: 'Predict, then check',
      decoder: 'Preserve one boundary-aware sequence per document',
    },
    rustCaptions: [
      'A fixed whole-word vocabulary that cannot recover an unseen spelling',
      'Tokenizer layout version 1 with validated ID ranges',
      'Initialize byte IDs and replay every frozen rank',
      'Recover bytes first; validate text only on request',
      'Add endpoint controls after encoding and validate them strictly',
      'Print the tokenizer layout and edge-case results',
    ],
    diagramTitle: 'Ranked byte groups reverse to the exact input',
    cases: [
      'ASCII example: bee plus a space',
      'Cyrillic example: a space plus а',
    ],
    grouped: 'Canonical ranked groups',
    exact: 'Exact byte match',
    invariants: [
      'Frozen ranks run in ascending order; the input never changes their priority.',
      'Every content ID is its Chapter 3 training ID plus two.',
      'BOS and EOS appear only after encoding and only at document endpoints.',
      'Stored piece bytes concatenate to the exact input without normalization.',
    ],
    exerciseSummary: 'Check your predictions',
    exerciseAnswer: 'IDs [257,256] recover bytes ff fe exactly',
    observation: 'The ordinary and traced methods call the same ranked-merge loop.',
    trainingBoundary:
      'It does not reconstruct byte expansions or repeat the Chapter 3 invariants.',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    chapterTitle: 'Кодирование и декодирование с помощью BPE-токенизатора',
    revisionLabel: 'Версия материала',
    headings: {
      formula: 'Односторонняя гарантия: точное восстановление байтов',
      history: 'Как байтовый алфавит устраняет необходимость в <UNK>',
      rust: 'Реализуйте на Rust зафиксированный токенизатор со строгой проверкой',
      visualization: 'Проследите группировку и восстановление исходных байтов',
      exercises: 'Сначала предскажите, затем проверьте',
      decoder: 'Сохраняйте каждый документ как отдельную последовательность с границами',
    },
    rustCaptions: [
      'Словарь с фиксированным набором слов не восстанавливает незнакомое написание',
      'Схема ID токенизатора версии 1 с проверкой диапазонов',
      'Преобразуйте байты в ID и примените слияния по возрастанию ранга',
      'Сначала восстановите байты, а корректность UTF-8 проверяйте только при преобразовании в текст',
      'После кодирования добавьте управляющие токены и проверьте их положение',
      'Выведите схему токенизатора и результаты для граничных случаев',
    ],
    diagramTitle: 'Из групп байтов без потерь восстанавливаются исходные данные',
    cases: [
      'ASCII: bee с пробелом в конце',
      'Кириллица: пробел перед «а»',
    ],
    grouped: 'Канонические группы после слияний',
    exact: 'Байты совпадают с исходными',
    invariants: [
      'Слияния применяются по возрастанию ранга; новый вход не меняет их порядок.',
      'Каждый ID содержимого на два больше соответствующего ID из пространства обучения главы 3.',
      'BOS и EOS добавляются после кодирования и встречаются только по краям документа.',
      'Последовательное объединение байтов токенов восстанавливает вход без нормализации.',
    ],
    exerciseSummary: 'Проверьте ответы',
    exerciseAnswer: 'ID [257,256] точно восстанавливают ff fe',
    observation: 'Обычный метод и метод с трассировкой используют один и тот же цикл: он перебирает правила в порядке рангов и выполняет слияния.',
    trainingBoundary:
      'Метод не строит байтовые представления заново и не проверяет повторно инварианты из главы 3.',
  },
} as const satisfies Record<ChapterLocale, unknown>;

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function readTokenizerGeometry(diagram: Locator) {
  return diagram.evaluate((root) => {
    const tolerance = 2;
    const problems: string[] = [];
    const boxes = Array.from(
      root.querySelectorAll<HTMLElement>('[data-diagram-box]'),
    );
    const scrollers = Array.from(
      root.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
    );

    const border = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return {
        colors: [
          style.borderTopColor,
          style.borderRightColor,
          style.borderBottomColor,
          style.borderLeftColor,
        ],
        styles: [
          style.borderTopStyle,
          style.borderRightStyle,
          style.borderBottomStyle,
          style.borderLeftStyle,
        ],
        widths: [
          Number.parseFloat(style.borderTopWidth),
          Number.parseFloat(style.borderRightWidth),
          Number.parseFloat(style.borderBottomWidth),
          Number.parseFloat(style.borderLeftWidth),
        ],
      };
    };
    const colorIsTransparent = (value: string) => {
      const normalized = value.toLowerCase().replaceAll(' ', '');
      return (
        normalized === 'transparent' ||
        /^rgba\([^)]*,0(?:\.0+)?\)$/.test(normalized) ||
        /\/0(?:\.0+)?\)$/.test(normalized)
      );
    };
    const completeBorder = (element: HTMLElement) => {
      const evidence = border(element);
      return (
        evidence.widths.every((width) => Number.isFinite(width) && width > 0) &&
        evidence.styles.every((value) => value !== 'none' && value !== 'hidden') &&
        evidence.colors.every((value) => !colorIsTransparent(value))
      );
    };
    const clipped = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return [style.overflowX, style.overflowY].some(
        (value) => value === 'hidden' || value === 'clip',
      );
    };
    const innerRect = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const widths = border(element).widths;
      return {
        left: rect.left + widths[3]!,
        right: rect.right - widths[1]!,
        top: rect.top + widths[0]!,
        bottom: rect.bottom - widths[2]!,
      };
    };
    const within = (
      child: { left: number; right: number; top: number; bottom: number },
      owner: { left: number; right: number; top: number; bottom: number },
      checkInline = true,
      checkBlock = true,
    ) =>
      (!checkBlock ||
        (child.top >= owner.top - tolerance &&
          child.bottom <= owner.bottom + tolerance)) &&
      (!checkInline ||
        (child.left >= owner.left - tolerance &&
          child.right <= owner.right + tolerance));

    const borderedOwners = [
      root as HTMLElement,
      ...root.querySelectorAll<HTMLElement>('*'),
    ].filter(
      (element) =>
        !element.closest('[data-diagram-full-view-controls]') &&
        completeBorder(element),
    );
    const boundedOwners = new Set<HTMLElement>([...boxes, ...borderedOwners]);
    const nearestBoundedOwner = (element: HTMLElement | null) => {
      let current = element;
      while (current && root.contains(current)) {
        if (boundedOwners.has(current)) return current;
        if (current === root) break;
        current = current.parentElement;
      }
      return null;
    };

    for (const [index, ownerElement] of [...boundedOwners].entries()) {
      if (!completeBorder(ownerElement)) {
        problems.push(`owner-${index}: incomplete border`);
      }
      if (clipped(ownerElement)) problems.push(`owner-${index}: clips overflow`);

      const inlineDebt = Math.max(
        0,
        ownerElement.scrollWidth - ownerElement.clientWidth,
      );
      const blockDebt = Math.max(
        0,
        ownerElement.scrollHeight - ownerElement.clientHeight,
      );
      if (ownerElement !== root && blockDebt > tolerance) {
        problems.push(`owner-${index}: vertical scroll debt ${blockDebt}`);
      }
      if (
        ownerElement !== root &&
        !ownerElement.matches('[data-diagram-scroll]') &&
        inlineDebt > tolerance
      ) {
        problems.push(`owner-${index}: horizontal scroll debt ${inlineDebt}`);
      }

      const ancestor = nearestBoundedOwner(ownerElement.parentElement);
      if (!ancestor) continue;
      const interveningScroller = ownerElement.parentElement?.closest<HTMLElement>(
        '[data-diagram-scroll]',
      );
      const checkInline =
        !interveningScroller || !ancestor.contains(interveningScroller);
      if (
        !within(
          ownerElement.getBoundingClientRect(),
          innerRect(ancestor),
          checkInline,
          ancestor !== root,
        )
      ) {
        problems.push(`owner-${index}: escapes its nearest bounded ancestor`);
      }
    }

    for (const [index, scroller] of scrollers.entries()) {
      const labelled =
        Boolean(scroller.getAttribute('aria-label')?.trim()) ||
        Boolean(scroller.getAttribute('aria-labelledby')?.trim());
      if (
        scroller.getAttribute('role') !== 'region' ||
        scroller.getAttribute('tabindex') !== '0' ||
        !labelled
      ) {
        problems.push(`scroller-${index}: incomplete accessible region`);
      }
      if (!scroller.classList.contains('course-diagram__scroll')) {
        problems.push(`scroller-${index}: missing shared scroll role`);
      }
      const blockDebt = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (blockDebt > tolerance) {
        problems.push(`scroller-${index}: unexpected vertical travel ${blockDebt}`);
      }
      if (clipped(scroller)) problems.push(`scroller-${index}: clips overflow`);
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      if (!textNode.textContent?.trim()) continue;
      const parent = textNode.parentElement;
      if (
        !parent ||
        parent.closest(
          '.visually-hidden, .katex-mathml, [data-diagram-full-view-controls]',
        )
      ) {
        continue;
      }
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const owner = nearestBoundedOwner(parent);
      if (!owner) continue;

      const ownerInner = innerRect(owner);
      const range = document.createRange();
      range.selectNodeContents(textNode);
      for (const paint of Array.from(range.getClientRects())) {
        if (paint.width <= 0 || paint.height <= 0) continue;
        if (!within(paint, ownerInner)) {
          problems.push(
            `${owner.tagName.toLowerCase()}: painted text crossed its nearest border`,
          );
          break;
        }
      }
    }

    for (const [index, math] of Array.from(
      root.querySelectorAll<HTMLElement>('.katex-html'),
    ).entries()) {
      const owner = nearestBoundedOwner(math);
      if (!owner) continue;
      if (!within(math.getBoundingClientRect(), innerRect(owner))) {
        problems.push(`math-${index}: visible formula crossed its nearest border`);
      }
    }

    const allElements = [root, ...root.querySelectorAll<HTMLElement>('*')];
    const fontSizes = allElements.flatMap((element, index) => {
      if (
        element.closest('[data-diagram-full-view-controls]') ||
        element.closest('.visually-hidden, .katex-mathml')
      ) {
        return [];
      }
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return [];
      const hasDirectText = [...element.childNodes].some(
        (child) =>
          child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()),
      );
      if (!hasDirectText) return [];
      return [{ index, pixels: Number.parseFloat(style.fontSize) }];
    });
    const localTravel = scrollers.map((scroller) =>
      Math.max(0, scroller.scrollWidth - scroller.clientWidth),
    );

    return {
      blockBudget: Math.ceil(root.clientHeight * 0.2),
      blockDebt: Math.max(0, root.scrollHeight - root.clientHeight),
      blockViewport: root.clientHeight,
      borderedOwnerCount: borderedOwners.length,
      boxCount: boxes.length,
      dualScrollerCount: scrollers.filter((scroller) =>
        scroller.matches('[data-diagram-box]'),
      ).length,
      fontSizes,
      inlineDebt: Math.max(0, root.scrollWidth - root.clientWidth),
      maxLocalTravel: localTravel.length === 0 ? 0 : Math.max(...localTravel),
      problems,
      scrollerCount: scrollers.length,
      tokenBoxCount: root.querySelectorAll('.token-tape > code[data-diagram-box]')
        .length,
      unmarkedBorderOwnerCount: borderedOwners.filter(
        (owner) => !owner.matches('[data-diagram-box]'),
      ).length,
      viewportHeight: window.innerHeight,
    };
  });
}

function expectCompleteTokenizerGeometry(
  geometry: Awaited<ReturnType<typeof readTokenizerGeometry>>,
) {
  expect(geometry.boxCount).toBe(67);
  expect(geometry.borderedOwnerCount).toBeGreaterThanOrEqual(67);
  expect(geometry.unmarkedBorderOwnerCount).toBeGreaterThanOrEqual(2);
  expect(geometry.scrollerCount).toBe(10);
  expect(geometry.dualScrollerCount).toBe(8);
  expect(geometry.tokenBoxCount).toBe(30);
  expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
  expect(geometry.problems).toEqual([]);
}

async function readTokenizerEvidence(diagram: Locator) {
  return diagram.evaluate((root) => ({
    cases: Array.from(root.querySelectorAll<HTMLElement>('[data-case]')).map(
      (sample) => ({
        controls: Array.from(
          sample.querySelectorAll<HTMLElement>('[data-control]'),
        ).map((control) => ({
          id: control.dataset.tokenId ?? null,
          kind: control.dataset.control ?? null,
        })),
        id: sample.dataset.case ?? null,
        lanes: Array.from(
          sample.querySelectorAll<HTMLElement>('.pipeline > [data-lane]'),
        ).map((lane) => lane.dataset.lane ?? null),
        pieces: Array.from(
          sample.querySelectorAll<HTMLElement>('[data-piece-index]'),
        ).map((piece) => ({
          index: piece.dataset.pieceIndex ?? null,
          rank: piece.dataset.mergeRank ?? null,
          token:
            piece.querySelector<HTMLElement>('[data-token-id]')?.dataset.tokenId ??
            null,
        })),
      }),
    ),
    formulas: Array.from(
      root.querySelectorAll<HTMLElement>(
        'annotation[encoding="application/x-tex"]',
      ),
    ).map((formula) => formula.textContent),
    roundTrips: Array.from(
      root.querySelectorAll<HTMLElement>('[data-round-trip]'),
    ).map((result) => result.dataset.roundTrip ?? null),
  }));
}

async function readTokenizerComposition(diagram: Locator) {
  return diagram.evaluate((root) => {
    const rect = (element: Element) => {
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    };
    const trackCount = (element: Element) =>
      getComputedStyle(element)
        .gridTemplateColumns.split(/\s+/)
        .filter(Boolean).length;
    const cases = Array.from(root.querySelectorAll<HTMLElement>('[data-case]'));
    const controls = root.querySelector<HTMLElement>(
      ':scope > [data-diagram-full-view-controls]',
    );
    return {
      caption: rect(root.querySelector(':scope > figcaption')!),
      caseRects: cases.map(rect),
      controls: controls ? rect(controls) : null,
      direction: getComputedStyle(root).direction,
      exampleColumns: trackCount(root.querySelector('.example-list')!),
      examples: rect(root.querySelector('.example-list')!),
      invariants: rect(root.querySelector(':scope > .invariants')!),
      arrows: cases.map((sample) =>
        Array.from(
          sample.querySelectorAll<HTMLElement>('.pipeline > .flow-arrow'),
        ).map((arrow) => ({
          display: getComputedStyle(arrow).display,
          text: arrow.textContent?.trim() ?? '',
          visibility: getComputedStyle(arrow).visibility,
          ...rect(arrow),
        })),
      ),
      lanes: cases.map((sample) =>
        Array.from(
          sample.querySelectorAll<HTMLElement>('.pipeline > [data-lane]'),
        ).map((lane) => ({
          name: lane.dataset.lane ?? null,
          ...rect(lane),
        })),
      ),
      pipelineColumns: cases.map((sample) =>
        trackCount(sample.querySelector('.pipeline')!),
      ),
      rootColumns: trackCount(root),
    };
  });
}

function expectFontsNotShrunk(
  inlineGeometry: Awaited<ReturnType<typeof readTokenizerGeometry>>,
  fullGeometry: Awaited<ReturnType<typeof readTokenizerGeometry>>,
) {
  expect(fullGeometry.fontSizes.map(({ index }) => index)).toEqual(
    inlineGeometry.fontSizes.map(({ index }) => index),
  );
  for (let index = 0; index < fullGeometry.fontSizes.length; index += 1) {
    expect(fullGeometry.fontSizes[index]!.pixels + 0.01).toBeGreaterThanOrEqual(
      inlineGeometry.fontSizes[index]!.pixels,
    );
  }
}

function expectCoherentTokenizerComposition(
  composition: Awaited<ReturnType<typeof readTokenizerComposition>>,
) {
  const tolerance = 2;
  expect(composition.rootColumns).toBe(3);
  expect(composition.exampleColumns).toBe(2);
  expect(composition.pipelineColumns).toEqual([1, 1]);
  expect(composition.controls).not.toBeNull();
  expect(composition.caseRects).toHaveLength(2);

  const [firstCase, secondCase] = composition.caseRects;
  expect(firstCase).toBeDefined();
  expect(secondCase).toBeDefined();
  expect(Math.abs(firstCase!.top - secondCase!.top)).toBeLessThanOrEqual(
    tolerance,
  );
  expect(Math.abs(firstCase!.width - secondCase!.width)).toBeLessThanOrEqual(
    tolerance,
  );
  const horizontalCases = [...composition.caseRects].sort(
    (left, right) => left.left - right.left,
  );
  expect(horizontalCases[1]!.left).toBeGreaterThan(horizontalCases[0]!.right);

  const rail = [composition.caption, composition.invariants, composition.controls!];
  if (composition.direction === 'rtl') {
    expect(Math.min(...rail.map(({ left }) => left))).toBeGreaterThanOrEqual(
      Math.max(...composition.caseRects.map(({ right }) => right)) - tolerance,
    );
  } else {
    expect(Math.max(...rail.map(({ right }) => right))).toBeLessThanOrEqual(
      Math.min(...composition.caseRects.map(({ left }) => left)) + tolerance,
    );
  }
  expect(composition.controls!.top).toBeLessThanOrEqual(
    composition.caption.top + tolerance,
  );
  expect(composition.caption.top).toBeLessThan(composition.invariants.top);

  expect(composition.lanes).toHaveLength(2);
  expect(composition.arrows).toHaveLength(2);
  for (let caseIndex = 0; caseIndex < composition.lanes.length; caseIndex += 1) {
    const lanes = composition.lanes[caseIndex]!;
    const arrows = composition.arrows[caseIndex]!;
    expect(lanes.map(({ name }) => name)).toEqual([
      'bytes',
      'initial',
      'grouped',
      'document',
      'decoded',
    ]);
    for (let index = 1; index < lanes.length; index += 1) {
      expect(lanes[index]!.top).toBeGreaterThanOrEqual(
        lanes[index - 1]!.bottom - tolerance,
      );
    }
    expect(
      Math.max(...lanes.map(({ left }) => left)) -
        Math.min(...lanes.map(({ left }) => left)),
    ).toBeLessThanOrEqual(tolerance);
    expect(
      Math.max(...lanes.map(({ width }) => width)) -
        Math.min(...lanes.map(({ width }) => width)),
    ).toBeLessThanOrEqual(tolerance);
    expect(arrows).toHaveLength(4);
    expect(arrows.map(({ text }) => text)).toEqual(['↓', '↓', '↓', '↓']);
    for (let arrowIndex = 0; arrowIndex < arrows.length; arrowIndex += 1) {
      const arrow = arrows[arrowIndex]!;
      expect(arrow.display).not.toBe('none');
      expect(arrow.visibility).toBe('visible');
      expect(arrow.width).toBeGreaterThan(0);
      expect(arrow.height).toBeGreaterThan(0);
      expect(arrow.top).toBeGreaterThanOrEqual(
        lanes[arrowIndex]!.bottom - tolerance,
      );
      expect(arrow.bottom).toBeLessThanOrEqual(
        lanes[arrowIndex + 1]!.top + tolerance,
      );
    }
  }
}

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedExampleColumns: number,
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 4,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });

  for (const heading of Object.values(localized.headings)) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
  const observation = page.locator('.lesson-body p').filter({
    hasText: localized.observation,
  });
  await expect(observation).toHaveCount(1);
  await expect(observation).toBeVisible();
  const trainingBoundary = page.locator('.lesson-body p').filter({
    hasText: localized.trainingBoundary,
  });
  await expect(trainingBoundary).toHaveCount(1);
  await expect(trainingBoundary).toBeVisible();
  const displayedFormula = page.locator('.katex-display');
  await expect(displayedFormula).toHaveCount(1);
  await expect(displayedFormula).toHaveCSS('direction', 'ltr');
  await expect(
    displayedFormula.locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText(formulaLatex);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(6);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(6);
  const highlightingEvidence = await highlightedRust.evaluateAll((blocks) =>
    blocks.map((block) => ({
      lineCount: block.querySelectorAll('code > span.line').length,
      tokenColors: [
        ...new Set(
          Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
            .map((token) => token.style.color)
            .filter(Boolean),
        ),
      ],
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
    })),
  );
  for (const evidence of highlightingEvidence) {
    expect(evidence.lineCount).toBeGreaterThan(0);
    expect(evidence.tokenColors.length).toBeGreaterThan(1);
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
  }
  expect(
    await highlightedRust.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.textContent),
    ),
  ).toEqual(expectedRustSources);
  await expect(rustSources.locator('figcaption span')).toHaveText([
    ...localized.rustCaptions,
  ]);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual([
    'unknown-token-loss',
    'token-id-layout',
    'ranked-content-encoding',
    'byte-exact-decoding',
    'document-wrapping',
    'chapter-output',
  ]);
  await highlightedRust.first().focus();
  await expect(highlightedRust.first()).toBeFocused();

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'apply-bpe-tokenizer',
  });
  const diagram = page.locator('figure[data-visualization-id="apply-bpe-tokenizer"]');
  await expect(
    diagram.getByRole('heading', { level: 3, name: localized.diagramTitle }),
  ).toBeVisible();
  const cases = diagram.locator('[data-case]');
  await expect(cases).toHaveCount(2);
  await expect(cases.getByRole('heading', { level: 4 })).toHaveText([
    ...localized.cases,
  ]);
  expect(
    await cases.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-case'))),
  ).toEqual(['ascii-bee', 'cyrillic-a']);

  const exactPipelines = await cases.evaluateAll((nodes) =>
    nodes.map((node) => ({
      initial: Array.from(node.querySelectorAll('[data-lane="initial"] [data-token-id]')).map(
        (token) => token.getAttribute('data-token-id'),
      ),
      pieces: Array.from(node.querySelectorAll('[data-lane="grouped"] [data-piece-index]')).map(
        (piece) => ({
          index: piece.getAttribute('data-piece-index'),
          rank: piece.getAttribute('data-merge-rank'),
          token: piece.querySelector('[data-token-id]')?.getAttribute('data-token-id'),
        }),
      ),
      document: Array.from(node.querySelectorAll('[data-lane="document"] [data-token-id]')).map(
        (token) => token.getAttribute('data-token-id'),
      ),
      decoded: Array.from(node.querySelectorAll('[data-lane="decoded"] [data-byte]')).map(
        (byte) => byte.getAttribute('data-byte'),
      ),
    })),
  );
  expect(exactPipelines).toEqual([
    {
      initial: ['100', '103', '103', '34'],
      pieces: [
        { index: '0', rank: 'byte', token: '100' },
        { index: '1', rank: 'byte', token: '103' },
        { index: '2', rank: '7', token: '265' },
      ],
      document: ['0', '100', '103', '265', '1'],
      decoded: ['62', '65', '65', '20'],
    },
    {
      initial: ['34', '210', '178'],
      pieces: [
        { index: '0', rank: '0', token: '258' },
        { index: '1', rank: 'byte', token: '178' },
      ],
      document: ['0', '258', '178', '1'],
      decoded: ['20', 'd0', 'b0'],
    },
  ]);
  await expect(cases.locator('[data-lane="grouped"] h5')).toHaveText([
    localized.grouped,
    localized.grouped,
  ]);
  await expect(diagram.locator('[data-control="bos"]')).toHaveCount(2);
  await expect(diagram.locator('[data-control="eos"]')).toHaveCount(2);
  await expect(diagram.locator('[data-round-trip="exact"]')).toContainText([
    localized.exact,
    localized.exact,
  ]);
  await expect(diagram.locator('.invariants li')).toContainText([
    ...localized.invariants,
  ]);
  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  await diagram.focus();
  await expect(diagram).toBeFocused();
  await diagram.locator('.token-tape').first().focus();
  await expect(diagram.locator('.token-tape').first()).toBeFocused();
  const columnCount = await diagram.locator('.example-list').evaluate((node) =>
    window
      .getComputedStyle(node)
      .gridTemplateColumns.split(/\s+/)
      .filter(Boolean).length,
  );
  expect(columnCount).toBe(expectedExampleColumns);
  await settle(page);
  expectCompleteTokenizerGeometry(await readTokenizerGeometry(diagram));

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails).toContainText(localized.exerciseAnswer);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 4 localized vertical slice', { tag: chapterTag(chapterId) }, () => {
  test.describe.configure({ mode: 'serial' });

  test('chapter 4 is fourth on every course index and preserves locale switching', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(4);
      expect(chapters[3]).toEqual(
        expect.objectContaining({ chapterId, order: 4, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        localeDefinition?.languageTag ?? '',
      );
      await expect(
        page.getByRole('heading', { level: 1, name: localized.indexTitle }),
      ).toBeVisible();
      await page.getByRole('link', { name: localized.chapterTitle }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 4,
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
        await page.locator(`.locale-switch a[data-locale="${target.code}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${chapterPath(target.code, chapterId)}$`));
        await expect(page.locator('html')).toHaveAttribute('lang', target.languageTag);
        await expect(
          page.getByRole('heading', { level: 1, name: copy[target.code].chapterTitle }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 4 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, 2, chapters);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, 1, chapters);
    });
  }

  test('both localized figures recompose in place for readable full view', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="apply-bpe-tokenizer"]',
      );
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toBeVisible();
      expect((await toggle.getAttribute('aria-label'))?.trim()).toBeTruthy();
      await settle(page);

      const inlineGeometry = await readTokenizerGeometry(diagram);
      expectCompleteTokenizerGeometry(inlineGeometry);
      const inlineEvidence = await readTokenizerEvidence(diagram);
      const staticMarkup = await diagram.evaluate((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone
          .querySelectorAll('[data-diagram-full-view-controls]')
          .forEach((control) => control.remove());
        return clone.innerHTML;
      });
      await diagram.evaluate((node) => {
        (
          window as unknown as { __chapter04Figure?: Element }
        ).__chapter04Figure = node;
      });

      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'apply-bpe-tokenizer',
      );
      await settle(page);

      expect(
        await diagram.evaluate(
          (node) =>
            (
              window as unknown as { __chapter04Figure?: Element }
            ).__chapter04Figure === node,
        ),
      ).toBe(true);
      expect(
        await diagram.evaluate((node) => {
          const clone = node.cloneNode(true) as HTMLElement;
          clone
            .querySelectorAll('[data-diagram-full-view-controls]')
            .forEach((control) => control.remove());
          return clone.innerHTML;
        }),
      ).toBe(staticMarkup);
      expect(await readTokenizerEvidence(diagram)).toEqual(inlineEvidence);

      const composition = await readTokenizerComposition(diagram);
      expectCoherentTokenizerComposition(composition);
      const fullGeometry = await readTokenizerGeometry(diagram);
      expectCompleteTokenizerGeometry(fullGeometry);
      expect(fullGeometry.blockDebt).toBeLessThanOrEqual(fullGeometry.blockBudget);
      expect(fullGeometry.maxLocalTravel).toBeLessThanOrEqual(120);
      expectFontsNotShrunk(inlineGeometry, fullGeometry);
      await expect(diagram.locator('[data-case]')).toHaveCount(2);
      await expect(diagram.locator('[data-lane]')).toHaveCount(10);
      await expect(diagram.locator('[data-piece-index]')).toHaveCount(5);
      await expect(diagram.locator('[data-control]')).toHaveCount(4);
      await expect(diagram.locator('[data-round-trip="exact"]')).toHaveCount(2);
      await expect(
        diagram.locator('annotation[encoding="application/x-tex"]'),
      ).toHaveText(['+2']);

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('chapter 4 keeps one coherent composition at the minimum full-view size', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 576 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await page.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === 'true',
      );
      const diagram = page.locator(
        'figure[data-visualization-id="apply-bpe-tokenizer"]',
      );
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await settle(page);

      const inlineGeometry = await readTokenizerGeometry(diagram);
      expectCompleteTokenizerGeometry(inlineGeometry);
      const inlineEvidence = await readTokenizerEvidence(diagram);
      await diagram.evaluate((node) => {
        (
          window as unknown as { __chapter04BoundaryFigure?: Element }
        ).__chapter04BoundaryFigure = node;
      });

      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'apply-bpe-tokenizer',
      );
      await settle(page);

      expect(
        await diagram.evaluate(
          (node) =>
            (
              window as unknown as { __chapter04BoundaryFigure?: Element }
            ).__chapter04BoundaryFigure === node,
        ),
      ).toBe(true);
      expect(await readTokenizerEvidence(diagram)).toEqual(inlineEvidence);
      expectCoherentTokenizerComposition(await readTokenizerComposition(diagram));

      const fullGeometry = await readTokenizerGeometry(diagram);
      expectCompleteTokenizerGeometry(fullGeometry);
      expectFontsNotShrunk(inlineGeometry, fullGeometry);
      expect(fullGeometry.maxLocalTravel).toBeLessThanOrEqual(234);
      if (fullGeometry.blockViewport <= 600) {
        expect(fullGeometry.blockDebt).toBeLessThanOrEqual(
          fullGeometry.blockViewport,
        );
      } else {
        expect(fullGeometry.blockDebt).toBeLessThanOrEqual(
          fullGeometry.blockBudget,
        );
      }

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('Russian full view remains explicit in forced colors and synthetic RTL', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('ru', chapterId));
    const diagram = page.locator(
      'figure[data-visualization-id="apply-bpe-tokenizer"]',
    );
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    const toggle = diagram.locator('[data-diagram-full-view-toggle]');
    await expect(toggle).toBeVisible();
    await settle(page);
    expectCompleteTokenizerGeometry(await readTokenizerGeometry(diagram));
    expect(
      await diagram.locator('code, bdi').evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    await expect(diagram.locator('.invariants li')).toContainText([
      ...copy.ru.invariants,
    ]);
    await expect(diagram.locator('[data-round-trip="exact"]')).toContainText([
      copy.ru.exact,
      copy.ru.exact,
    ]);

    await toggle.click();
    await page.waitForFunction(
      () =>
        document.fullscreenElement?.getAttribute('data-visualization-id') ===
        'apply-bpe-tokenizer',
    );
    await settle(page);
    const pieceFlow = await diagram.locator('[data-case]').evaluateAll((samples) =>
      samples.map((sample) => {
        const region = sample.querySelector<HTMLElement>('.piece-scroll')!;
        const list = region.querySelector<HTMLOListElement>(':scope > .piece-list')!;
        const cards = Array.from(
          list.querySelectorAll<HTMLElement>(':scope > [data-piece-index]'),
        );
        return {
          cardDirections: cards.map((card) => getComputedStyle(card).direction),
          indices: cards.map((card) => card.dataset.pieceIndex),
          lefts: cards.map((card) => card.getBoundingClientRect().left),
          listRole: list.getAttribute('role'),
          regionDirection: getComputedStyle(region).direction,
          regionRole: region.getAttribute('role'),
        };
      }),
    );
    expect(pieceFlow.map(({ indices }) => indices)).toEqual([
      ['0', '1', '2'],
      ['0', '1'],
    ]);
    for (const flow of pieceFlow) {
      expect(flow.listRole).toBeNull();
      expect(flow.regionRole).toBe('region');
      expect(flow.regionDirection).toBe('ltr');
      expect(flow.cardDirections.every((direction) => direction === 'rtl')).toBe(
        true,
      );
      for (let index = 1; index < flow.lefts.length; index += 1) {
        expect(flow.lefts[index]!).toBeGreaterThan(flow.lefts[index - 1]!);
      }
    }
    expectCoherentTokenizerComposition(await readTokenizerComposition(diagram));
    const fullGeometry = await readTokenizerGeometry(diagram);
    expectCompleteTokenizerGeometry(fullGeometry);
    expect(fullGeometry.blockDebt).toBeLessThanOrEqual(fullGeometry.blockBudget);
    expect(fullGeometry.maxLocalTravel).toBeLessThanOrEqual(120);
    expect(
      await diagram.locator('code, bdi').evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.fullscreenElement === null);
    await expect(toggle).toBeFocused();
    await expectNoOverflowOrClientScripts(page);
  });

  test('the complete Russian lesson remains available without JavaScript at desktop and narrow widths', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(60_000);
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(chapterPath('ru', chapterId));
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByRole('heading', { level: 1, name: copy.ru.chapterTitle }),
      ).toBeVisible();
      await expect(page.locator('.katex-display')).toHaveCount(1);
      await expect(page.locator('[data-case]')).toHaveCount(2);
      await expect(page.locator('[data-lane]')).toHaveCount(10);
      await expect(page.locator('.lesson-body details')).toHaveCount(1);
      await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
      const diagram = page.locator(
        'figure[data-visualization-id="apply-bpe-tokenizer"]',
      );
      await expect(diagram).toBeVisible();
      expect(await diagram.evaluate((node) => node.getBoundingClientRect().width)).toBeGreaterThan(0);
      expect(await diagram.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThan(0);
      const expectedColumns = viewport.width >= 768 ? 2 : 1;
      expect(
        await diagram.locator('.example-list').evaluate((node) =>
          getComputedStyle(node)
            .gridTemplateColumns.split(/\s+/)
            .filter(Boolean).length,
        ),
      ).toBe(expectedColumns);
      expectCompleteTokenizerGeometry(await readTokenizerGeometry(diagram));
      await expectNoOverflowOrClientScripts(page);
    }
    await context.close();
  });
});
