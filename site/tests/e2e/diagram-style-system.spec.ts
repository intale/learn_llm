// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync, readdirSync } from "node:fs";
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import chapterLocaleManifest from "../../src/i18n/chapter-locales.json" with {
  type: "json",
};
import localeManifest from "../../src/i18n/locales.json" with { type: "json" };

// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { parseJsonFrontmatter } from "../../../scripts/check-site-content.mjs";

declare const process: { cwd(): string };

type DiagramLocale = keyof typeof localeManifest.locales;

interface DiagramRoute {
  chapterId: string;
  locale: DiagramLocale;
  order: number;
  pageFigureCount: number;
  path: string;
  visualizationId: string;
}

interface LocalizedPageRoute {
  chapterId: string;
  locale: DiagramLocale;
  order: number;
  path: string;
}

interface ProjectedChapter {
  activeLocales: readonly DiagramLocale[];
  order: number;
}

interface DiagramAudit {
  errors: string[];
  signatures: {
    caption: string;
    card: string | null;
    root: string;
    scroll: string | null;
    section: string | null;
    table: string | null;
  };
}

const desktop = { width: 1280, height: 900 } as const;
const medium = { width: 1024, height: 768 } as const;
const mobile = { width: 390, height: 844 } as const;
const tolerance = 2;

function isDiagramLocale(value: string): value is DiagramLocale {
  return Object.prototype.hasOwnProperty.call(localeManifest.locales, value);
}

function requireDiagramLocale(value: string): DiagramLocale {
  if (!isDiagramLocale(value)) {
    throw new Error(
      `Chapter-locale projection uses unregistered locale "${value}".`,
    );
  }
  return value;
}

const referenceLocale = requireDiagramLocale(
  chapterLocaleManifest.referenceLocale,
);
const defaultLocale = requireDiagramLocale(localeManifest.defaultLocale);

if (referenceLocale !== defaultLocale) {
  throw new Error(
    `Reference locale "${referenceLocale}" differs from default locale "${defaultLocale}".`,
  );
}

const projectedChapters = new Map<string, ProjectedChapter>();

for (const chapter of chapterLocaleManifest.chapters) {
  if (projectedChapters.has(chapter.chapterId)) {
    throw new Error(`Duplicate projected chapter "${chapter.chapterId}".`);
  }
  const activeLocales = chapter.activeLocales.map(requireDiagramLocale);
  if (
    new Set(activeLocales).size !== activeLocales.length ||
    !activeLocales.includes(referenceLocale)
  ) {
    throw new Error(`Invalid active locales for "${chapter.chapterId}".`);
  }
  projectedChapters.set(chapter.chapterId, {
    activeLocales: Object.freeze(activeLocales),
    order: chapter.order,
  });
}

const referenceChapterDirectory = resolve(
  process.cwd(),
  "src/content/chapters",
  referenceLocale,
);

const referenceRoutes = (readdirSync(referenceChapterDirectory) as string[])
  .filter((name: string) => name.endsWith(".mdx"))
  .flatMap((name: string): DiagramRoute[] => {
    const source = readFileSync(resolve(referenceChapterDirectory, name), "utf8");
    const { data } = parseJsonFrontmatter(source, name);
    if (data.visualization.decision !== "useful") return [];
    const registrations = [
      { id: data.visualization.id as string },
      ...((data.visualization.supplementary ?? []) as Array<{ id: string }>),
    ];
    return registrations.map(({ id }) => ({
      chapterId: data.chapter_id as string,
      locale: referenceLocale,
      order: data.order as number,
      pageFigureCount: registrations.length,
      path: `/${referenceLocale}/course/${data.chapter_id}/`,
      visualizationId: id,
    }));
  })
  .sort((left, right) => left.order - right.order);

const routes = referenceRoutes.flatMap((route): DiagramRoute[] => {
  const projection = projectedChapters.get(route.chapterId);
  if (!projection) {
    throw new Error(
      `Diagram chapter "${route.chapterId}" is absent from chapter-locales.json.`,
    );
  }
  if (projection.order !== route.order) {
    throw new Error(
      `Diagram chapter "${route.chapterId}" order differs from chapter-locales.json.`,
    );
  }
  return projection.activeLocales.map((locale) => ({
    ...route,
    locale,
    path: `/${locale}/course/${route.chapterId}/`,
  }));
});

const localizedPageRoutes = chapterLocaleManifest.chapters.flatMap(
  (chapter): LocalizedPageRoute[] =>
    chapter.activeLocales
      .map(requireDiagramLocale)
      .filter((locale) => locale !== referenceLocale)
      .map((locale) => ({
        chapterId: chapter.chapterId,
        locale,
        order: chapter.order,
        path: `/${locale}/course/${chapter.chapterId}/`,
      })),
);

function figureFor(page: Page, route: DiagramRoute): Locator {
  return page.locator(
    `figure[data-visualization-id="${route.visualizationId}"]`,
  );
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function gotoLocalizedRoute(
  page: Page,
  route: Pick<LocalizedPageRoute, "locale" | "path">,
) {
  const response = await page.goto(route.path);
  expect(response, `${route.path} must return a document response`).not.toBeNull();
  const status = response?.status() ?? 0;
  expect(status, `${route.path} returned HTTP ${status}`).toBeGreaterThanOrEqual(
    200,
  );
  expect(status, `${route.path} returned HTTP ${status}`).toBeLessThan(400);
  const definition = localeManifest.locales[route.locale];
  await expect(page.locator("html")).toHaveAttribute(
    "lang",
    definition.languageTag,
  );
  await expect(page.locator("html")).toHaveAttribute(
    "dir",
    definition.direction,
  );
}

async function auditFigure(
  page: Page,
  route: DiagramRoute,
): Promise<DiagramAudit> {
  return figureFor(page, route).evaluate((figure, allowedError) => {
    const root = figure as HTMLElement;
    const errors: string[] = [];
    const visible = (element: Element) => {
      const node = element as HTMLElement;
      const style = getComputedStyle(node);
      return (
        node.getClientRects().length > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    };
    const label = (element: Element) => {
      const direct = element.getAttribute("aria-label")?.trim();
      if (direct) return direct;
      return (element.getAttribute("aria-labelledby") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
    };
    const describe = (element: Element) => {
      const node = element as HTMLElement;
      const classes =
        typeof node.className === "string"
          ? node.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";
      return `${node.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
    };
    const inlineDebt = (element: Element) => {
      const node = element as HTMLElement;
      return Math.max(0, node.scrollWidth - node.clientWidth);
    };
    const fullscreenRoot = document.fullscreenElement === root;
    const excludedFromPaintAudit = (element: Element) =>
      element.closest(".katex-mathml, .visually-hidden") !== null ||
      element.closest('[aria-hidden="true"]') !== null;

    if (fullscreenRoot && inlineDebt(root) > allowedError) {
      errors.push(
        `fullscreen root requires ${inlineDebt(root).toFixed(1)}px of horizontal travel`,
      );
    }

    if (root.firstElementChild?.tagName !== "FIGCAPTION") {
      errors.push("figcaption is not the first element child");
    }
    const caption = root.firstElementChild as HTMLElement | null;
    if (!caption?.classList.contains("course-diagram__caption")) {
      errors.push("caption does not use the shared role");
    }
    const directTitles = caption
      ? [...caption.children].filter((child) => child.tagName === "H3")
      : [];
    const directDescriptions = caption
      ? [...caption.children].filter((child) =>
          child.classList.contains("course-diagram__description"),
        )
      : [];
    if (directTitles.length !== 1) {
      errors.push(`caption has ${directTitles.length} direct title headings`);
    }
    if (directDescriptions.length !== 1) {
      errors.push(
        `caption has ${directDescriptions.length} direct learner descriptions`,
      );
    }
    const title = directTitles[0] as HTMLElement | undefined;
    const description = directDescriptions[0] as HTMLElement | undefined;
    if (
      caption &&
      title &&
      description &&
      title.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_PRECEDING
    ) {
      errors.push("caption description precedes its title");
    }
    if (caption && title && description) {
      const captionStyle = getComputedStyle(caption);
      const titleStyle = getComputedStyle(title);
      const descriptionStyle = getComputedStyle(description);
      if (captionStyle.display !== "grid") {
        errors.push(`caption display is ${captionStyle.display}, not grid`);
      }
      for (const [kind, style] of [
        ["title", titleStyle],
        ["description", descriptionStyle],
      ] as const) {
        if (["absolute", "fixed"].includes(style.position)) {
          errors.push(`caption ${kind} is positioned ${style.position}`);
        }
        if (style.cssFloat !== "none") {
          errors.push(`caption ${kind} floats ${style.cssFloat}`);
        }
      }

      const titleRect = title.getBoundingClientRect();
      const descriptionRect = description.getBoundingClientRect();
      const captionRect = caption.getBoundingClientRect();
      const boxGap = descriptionRect.top - titleRect.bottom;
      if (boxGap < 1) {
        errors.push(
          `caption description box starts ${boxGap.toFixed(1)}px after the title box`,
        );
      }
      for (const [kind, rect] of [
        ["title", titleRect],
        ["description", descriptionRect],
      ] as const) {
        if (
          rect.left < captionRect.left - allowedError ||
          rect.right > captionRect.right + allowedError ||
          rect.top < captionRect.top - allowedError ||
          rect.bottom > captionRect.bottom + allowedError
        ) {
          errors.push(`caption ${kind} escapes the caption box`);
        }
      }

      const paintedTextBounds = (container: HTMLElement) => {
        const rects: DOMRect[] = [];
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
        );
        let node = walker.nextNode();
        while (node) {
          const parent = node.parentElement;
          if (
            parent &&
            node.textContent?.trim() &&
            visible(parent) &&
            !parent.closest(
              '.visually-hidden, .katex-mathml, [aria-hidden="true"]',
            )
          ) {
            const range = document.createRange();
            range.selectNodeContents(node);
            rects.push(
              ...[...range.getClientRects()].filter(
                (rect) => rect.width > 0 && rect.height > 0,
              ),
            );
          }
          node = walker.nextNode();
        }
        return rects.length
          ? {
              bottom: Math.max(...rects.map((rect) => rect.bottom)),
              top: Math.min(...rects.map((rect) => rect.top)),
            }
          : null;
      };
      const titlePaint = paintedTextBounds(title);
      const descriptionPaint = paintedTextBounds(description);
      if (!titlePaint || !descriptionPaint) {
        errors.push("caption title or description paints no readable text");
      } else {
        const paintGap = descriptionPaint.top - titlePaint.bottom;
        if (paintGap < 1) {
          errors.push(
            `caption description ink starts ${paintGap.toFixed(1)}px after title ink`,
          );
        }
      }
    }
    const rootStyle = getComputedStyle(root);
    if (
      rootStyle.getPropertyValue("--course-diagram-style-version").trim() !==
      "course-v1"
    ) {
      errors.push("shared module version is not applied");
    }
    if (
      matchMedia("(forced-colors: active)").matches &&
      rootStyle.borderTopColor !== rootStyle.color
    ) {
      errors.push("forced-colors frame border does not follow current text");
    }

    const scrollRegions = [
      ...root.querySelectorAll<HTMLElement>("[data-diagram-scroll]"),
    ];
    for (const region of scrollRegions) {
      const style = getComputedStyle(region);
      const rect = region.getBoundingClientRect();
      const owner = region.parentElement?.closest<HTMLElement>(
        "[data-diagram-box], section, figure.course-diagram",
      );
      const ownerRect = owner?.getBoundingClientRect();
      if (!region.classList.contains("course-diagram__scroll")) {
        errors.push(`${describe(region)} lacks the shared scroll class`);
      }
      if (
        region.getAttribute("role") !== "region" ||
        region.getAttribute("tabindex") !== "0"
      ) {
        errors.push(`${describe(region)} is not a keyboard region`);
      }
      if (!label(region))
        errors.push(`${describe(region)} has no accessible name`);
      if (!["auto", "scroll"].includes(style.overflowX)) {
        errors.push(`${describe(region)} does not own horizontal overflow`);
      }
      if (
        ownerRect &&
        (rect.left < ownerRect.left - allowedError ||
          rect.right > ownerRect.right + allowedError)
      ) {
        errors.push(`${describe(region)} escapes its semantic box`);
      }
    }

    const all = [root, ...root.querySelectorAll<HTMLElement>("*")].filter(
      (element) => visible(element) && !element.closest(".visually-hidden"),
    );
    const rootFontSize = Number.parseFloat(getComputedStyle(root).fontSize);
    const ordinaryTextFloor = rootFontSize * 0.875;
    const floorRoles = [
      ...new Set(
        root.querySelectorAll<HTMLElement>(
          [
            ".course-diagram__card-stack > h5",
            ".course-diagram__card-heading > :is(h5, h6)",
            ":is(h5, h6).course-diagram__card-heading",
            "dt",
            ".cue-list > li",
            "small",
            "code",
            "bdi",
          ].join(", "),
        ),
      ),
    ].filter(
      (element) =>
        visible(element) &&
        !element.closest(
          '.katex-mathml, .visually-hidden, [aria-hidden="true"]',
        ),
    );
    for (const element of floorRoles) {
      const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
      if (!Number.isFinite(fontSize) || fontSize + 0.01 < ordinaryTextFloor) {
        errors.push(
          `${describe(element)} uses ${fontSize.toFixed(2)}px text below the ${ordinaryTextFloor.toFixed(2)}px ordinary-role floor`,
        );
      }
    }
    const hasCompleteBorder = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const widths = [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ].map((width) => Number.parseFloat(width));
      const styles = [
        style.borderTopStyle,
        style.borderRightStyle,
        style.borderBottomStyle,
        style.borderLeftStyle,
      ];
      return (
        widths.every((width) => Number.isFinite(width) && width > 0) &&
        styles.every((borderStyle) => !["none", "hidden"].includes(borderStyle))
      );
    };
    const isBoundedBox = (element: HTMLElement) => {
      if (element === root && document.fullscreenElement === root) return false;
      const display = getComputedStyle(element).display;
      if (
        element.hasAttribute("data-diagram-scroll") ||
        element.closest(
          '.katex, .katex-mathml, .visually-hidden, [aria-hidden="true"]',
        ) ||
        display === "inline" ||
        display === "contents" ||
        display.startsWith("table-row")
      ) {
        return false;
      }
      return (
        element === root ||
        (element.parentElement === root && element.tagName === "SECTION") ||
        (element.parentElement?.tagName === "DL" &&
          element.parentElement.parentElement === root) ||
        element.hasAttribute("data-diagram-box") ||
        ["TH", "TD"].includes(element.tagName) ||
        hasCompleteBorder(element)
      );
    };
    const boxes = all.filter(isBoundedBox);
    const boxSet = new Set(boxes);
    const nearestBoundedBox = (
      element: HTMLElement | null,
    ): HTMLElement | null => {
      if (!element) return null;
      const scrollOwner = element.closest<HTMLElement>("[data-diagram-scroll]");
      let candidate: HTMLElement | null = element;
      while (candidate && root.contains(candidate)) {
        if (boxSet.has(candidate)) {
          // A scroller may license travel only for content without a nearer box.
          // If the candidate sits outside that scroller, its boundary is not the
          // content's box and the paint is intentionally owned by the scroller.
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
        bottom: rect.bottom - Number.parseFloat(style.borderBottomWidth || "0"),
        left: rect.left + Number.parseFloat(style.borderLeftWidth || "0"),
        right: rect.right - Number.parseFloat(style.borderRightWidth || "0"),
        top: rect.top + Number.parseFloat(style.borderTopWidth || "0"),
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
      errors.push(
        `${describe(witness)} paints ${kind} outside ${describe(box)} by ${debt.toFixed(1)}px`,
      );
    };
    const auditHorizontalPaintRect = (
      rect: DOMRect,
      box: HTMLElement,
      witness: HTMLElement,
      kind: string,
    ) => {
      if (rect.width <= 0 || rect.height <= 0) return;
      const edges = innerEdges(box);
      const escapes =
        rect.left < edges.left - allowedError ||
        rect.right > edges.right + allowedError;
      if (!escapes) return;
      const debt = Math.max(edges.left - rect.left, rect.right - edges.right);
      errors.push(
        `${describe(witness)} paints ${kind} horizontally outside ${describe(box)} by ${debt.toFixed(1)}px`,
      );
    };

    for (const element of all) {
      const style = getComputedStyle(element);
      if (
        boxSet.has(element) &&
        [style.overflowX, style.overflowY].some((overflow) =>
          ["hidden", "clip"].includes(overflow),
        )
      ) {
        errors.push(`${describe(element)} hides or clips overflow`);
      }

      if (
        element.classList.contains("state-symbol") &&
        (inlineDebt(element) > allowedError ||
          element.scrollHeight > element.clientHeight + allowedError)
      ) {
        errors.push(
          `${describe(element)} cannot contain its complete state label`,
        );
      }
    }

    for (const box of boxes) {
      const parentBox = nearestBoundedBox(box.parentElement);
      if (parentBox && parentBox !== box) {
        auditPaintRect(
          box.getBoundingClientRect(),
          parentBox,
          box,
          "a nested box",
        );
      } else if (fullscreenRoot && !box.closest("[data-diagram-scroll]")) {
        auditHorizontalPaintRect(
          box.getBoundingClientRect(),
          root,
          box,
          "a top-level box",
        );
      }
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const parent = textNode.parentElement;
      const text = textNode.textContent?.trim() ?? "";
      if (
        parent &&
        text &&
        visible(parent) &&
        !parent.closest(".katex") &&
        !excludedFromPaintAudit(parent)
      ) {
        const box = nearestBoundedBox(parent);
        if (box) {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of range.getClientRects()) {
            auditPaintRect(rect, box, parent, "text");
          }
        } else if (
          fullscreenRoot &&
          !parent.closest("[data-diagram-scroll]")
        ) {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of range.getClientRects()) {
            auditHorizontalPaintRect(rect, root, parent, "text");
          }
        }
      }
      textNode = walker.nextNode();
    }

    const formulas = root.querySelectorAll<HTMLElement>(".katex");
    for (const formula of formulas) {
      if (
        !visible(formula) ||
        formula.parentElement?.closest(".katex") ||
        formula.closest(".katex-mathml, .visually-hidden")
      ) {
        continue;
      }
      const box = nearestBoundedBox(formula.parentElement);
      if (box)
        auditPaintRect(
          formula.getBoundingClientRect(),
          box,
          formula,
          "formula",
        );
      else if (
        fullscreenRoot &&
        !formula.closest("[data-diagram-scroll]")
      )
        auditHorizontalPaintRect(
          formula.getBoundingClientRect(),
          root,
          formula,
          "formula",
        );
    }

    const signature = (element: Element | null, properties: string[]) => {
      if (!element) return null;
      const style = getComputedStyle(element);
      return JSON.stringify(
        Object.fromEntries(
          properties.map((property) => [
            property,
            style.getPropertyValue(property),
          ]),
        ),
      );
    };
    const firstCard =
      root.querySelector(
        ":scope > section[data-diagram-card][data-diagram-box]",
      ) ?? root.querySelector("[data-diagram-card][data-diagram-box]");
    const firstSection = root.querySelector(
      ":scope > section:not([data-diagram-card][data-diagram-box])",
    );
    const firstTable = root.querySelector("table[data-diagram-table]");
    const firstScroll = root.querySelector("[data-diagram-scroll]");

    return {
      errors: [...new Set(errors)],
      signatures: {
        root: signature(root, [
          "display",
          "margin-inline-start",
          "margin-inline-end",
          "padding-inline-start",
          "border-top-width",
          "border-top-style",
          "border-radius",
          "background-color",
          "box-shadow",
          "color",
          "font-size",
          "line-height",
        ])!,
        caption: signature(caption, [
          "display",
          "padding-inline-start",
          "font-family",
          "font-size",
          "line-height",
          "color",
        ])!,
        section: signature(firstSection, [
          "padding-inline-start",
          "border-top-width",
          "border-radius",
          "background-color",
          "color",
        ]),
        card: signature(firstCard, [
          "padding-inline-start",
          "border-radius",
          "border-top-color",
          "background-color",
          "color",
        ]),
        table: signature(firstTable, [
          "border-collapse",
          "background-color",
          "color",
          "font-size",
          "line-height",
        ]),
        scroll: signature(firstScroll, [
          "overflow-x",
          "max-inline-size",
          "border-radius",
          "outline-offset",
        ]),
      },
    };
  }, tolerance);
}

async function auditPageWidth(page: Page, route: LocalizedPageRoute) {
  const pageWidths = await page.evaluate((allowedError) => {
    const viewport = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        if (element.closest("[data-diagram-scroll]")) return false;
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden")
          return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -allowedError || rect.right > viewport + allowedError;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const classes =
          typeof element.className === "string"
            ? element.className.trim().split(/\s+/).slice(0, 2).join(".")
            : "";
        return {
          debt: Math.max(-rect.left, rect.right - viewport),
          label: `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`,
        };
      })
      .sort((left, right) => right.debt - left.debt)
      .slice(0, 3)
      .map(({ debt, label }) => `${label} (${debt.toFixed(1)}px)`);
    return {
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      offenders,
      viewport,
    };
  }, tolerance);
  if (
    pageWidths.body <= pageWidths.viewport + tolerance &&
    pageWidths.document <= pageWidths.viewport + tolerance
  ) {
    return [];
  }
  return [
    `${route.locale}/${route.chapterId}: page width ` +
      `${Math.max(pageWidths.body, pageWidths.document)}px exceeds ` +
      `${pageWidths.viewport}px viewport; offenders: ${pageWidths.offenders.join(", ")}`,
  ];
}

async function auditLocalizedPageBoxes(page: Page, route: LocalizedPageRoute) {
  const errors = await page.locator("article.lesson").evaluate(
    (article, allowedError) => {
      const root = article as HTMLElement;
      const problems: string[] = [];
      const visible = (element: Element) => {
        const node = element as HTMLElement;
        const style = getComputedStyle(node);
        return (
          node.getClientRects().length > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      };
      const describe = (element: Element) => {
        const node = element as HTMLElement;
        const classes =
          typeof node.className === "string"
            ? node.className.trim().split(/\s+/).slice(0, 2).join(".")
            : "";
        return `${node.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
      };
      const hasCompleteBorder = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        const widths = [
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth,
        ].map((width) => Number.parseFloat(width));
        const styles = [
          style.borderTopStyle,
          style.borderRightStyle,
          style.borderBottomStyle,
          style.borderLeftStyle,
        ];
        return (
          widths.every((width) => Number.isFinite(width) && width > 0) &&
          styles.every(
            (borderStyle) => !["none", "hidden"].includes(borderStyle),
          )
        );
      };
      const all = [...root.querySelectorAll<HTMLElement>("*")].filter(
        (element) =>
          visible(element) &&
          !element.closest(
            'figure[data-visualization-id], .katex-mathml, .visually-hidden, [aria-hidden="true"]',
          ),
      );
      const boxes = all.filter((element) => {
        const display = getComputedStyle(element).display;
        return (
          !element.hasAttribute("data-diagram-scroll") &&
          display !== "inline" &&
          display !== "contents" &&
          !display.startsWith("table-row") &&
          (element.hasAttribute("data-diagram-box") ||
            ["TH", "TD"].includes(element.tagName) ||
            hasCompleteBorder(element))
        );
      });
      const boxSet = new Set(boxes);
      const nearestHorizontalScroller = (element: HTMLElement) => {
        let candidate: HTMLElement | null = element;
        while (candidate && root.contains(candidate)) {
          const overflowX = getComputedStyle(candidate).overflowX;
          if (["auto", "scroll"].includes(overflowX)) return candidate;
          candidate = candidate.parentElement;
        }
        return null;
      };
      const nearestBoundedBox = (element: HTMLElement | null) => {
        if (!element) return null;
        const scrollOwner = nearestHorizontalScroller(element);
        let candidate: HTMLElement | null = element;
        while (candidate && root.contains(candidate)) {
          if (boxSet.has(candidate)) {
            if (scrollOwner && !scrollOwner.contains(candidate)) return null;
            return candidate;
          }
          candidate = candidate.parentElement;
        }
        return null;
      };
      const innerEdges = (box: HTMLElement) => {
        const rect = box.getBoundingClientRect();
        const style = getComputedStyle(box);
        return {
          bottom:
            rect.bottom - Number.parseFloat(style.borderBottomWidth || "0"),
          left: rect.left + Number.parseFloat(style.borderLeftWidth || "0"),
          right:
            rect.right - Number.parseFloat(style.borderRightWidth || "0"),
          top: rect.top + Number.parseFloat(style.borderTopWidth || "0"),
        };
      };
      const auditRect = (
        rect: DOMRect,
        box: HTMLElement,
        witness: HTMLElement,
        kind: string,
      ) => {
        if (rect.width <= 0 || rect.height <= 0) return;
        const edges = innerEdges(box);
        const debt = Math.max(
          edges.left - rect.left,
          rect.right - edges.right,
          edges.top - rect.top,
          rect.bottom - edges.bottom,
        );
        if (debt <= allowedError) return;
        problems.push(
          `${describe(witness)} paints ${kind} outside ${describe(box)} by ${debt.toFixed(1)}px`,
        );
      };

      for (const box of boxes) {
        const style = getComputedStyle(box);
        const clips = [style.overflowX, style.overflowY].some((overflow) =>
          ["hidden", "clip"].includes(overflow),
        );
        const hasHiddenDebt =
          box.scrollWidth > box.clientWidth + allowedError ||
          box.scrollHeight > box.clientHeight + allowedError;
        if (clips && hasHiddenDebt) {
          problems.push(`${describe(box)} clips content that does not fit`);
        }
        const parentBox = nearestBoundedBox(box.parentElement);
        if (parentBox && parentBox !== box) {
          auditRect(
            box.getBoundingClientRect(),
            parentBox,
            box,
            "a nested box",
          );
        }
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        const parent = textNode.parentElement;
        const text = textNode.textContent?.trim() ?? "";
        if (
          parent &&
          text &&
          visible(parent) &&
          !parent.closest(
            'figure[data-visualization-id], .katex, .katex-mathml, .visually-hidden, [aria-hidden="true"]',
          )
        ) {
          const box = nearestBoundedBox(parent);
          if (box) {
            const range = document.createRange();
            range.selectNodeContents(textNode);
            for (const rect of range.getClientRects()) {
              auditRect(rect, box, parent, "text");
            }
          }
        }
        textNode = walker.nextNode();
      }

      for (const formula of root.querySelectorAll<HTMLElement>(".katex")) {
        if (
          !visible(formula) ||
          formula.parentElement?.closest(".katex") ||
          formula.closest(
            'figure[data-visualization-id], .katex-mathml, .visually-hidden',
          )
        ) {
          continue;
        }
        const box = nearestBoundedBox(formula.parentElement);
        if (box) {
          auditRect(
            formula.getBoundingClientRect(),
            box,
            formula,
            "formula",
          );
        }
      }

      return [...new Set(problems)];
    },
    tolerance,
  );
  return errors.map(
    (error) => `${route.locale}/${route.chapterId}: ${error}`,
  );
}

async function auditLocalizedPages(
  page: Page,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  const failures: string[] = [];
  for (const route of localizedPageRoutes) {
    await gotoLocalizedRoute(page, route);
    await settle(page);
    await expect(page.locator("article.lesson")).toBeVisible();
    failures.push(...(await auditPageWidth(page, route)));
    failures.push(...(await auditLocalizedPageBoxes(page, route)));
  }
  expect(failures).toEqual([]);
}

async function auditRoutes(
  page: Page,
  viewport: { width: number; height: number },
  selectedRoutes = routes,
) {
  await page.setViewportSize(viewport);
  const failures: string[] = [];
  const baselines = new Map<keyof DiagramAudit["signatures"], string>();

  for (const route of selectedRoutes) {
    await gotoLocalizedRoute(page, route);
    await settle(page);
    await expect(page.locator("figure[data-visualization-id]")).toHaveCount(
      route.pageFigureCount,
    );
    const figure = figureFor(page, route);
    await expect(figure).toHaveAttribute("class", /\bcourse-diagram\b/);
    await expect(figure).toHaveAttribute("data-diagram-style", "course-v1");
    failures.push(...(await auditPageWidth(page, route)));
    const audit = await auditFigure(page, route);
    failures.push(
      ...audit.errors.map(
        (error) => `${route.locale}/${route.chapterId}: ${error}`,
      ),
    );

    for (const [kind, value] of Object.entries(audit.signatures) as Array<
      [keyof DiagramAudit["signatures"], string | null]
    >) {
      if (!value) continue;
      const baseline = baselines.get(kind);
      if (!baseline) baselines.set(kind, value);
      else if (baseline !== value) {
        failures.push(
          `${route.locale}/${route.chapterId}: ${kind} style differs from shared baseline`,
        );
      }
    }
  }

  expect(failures).toEqual([]);
}

async function auditFullscreenRoutes(page: Page, selectedRoutes = routes) {
  await page.setViewportSize(desktop);
  const failures: string[] = [];

  for (const route of selectedRoutes) {
    await gotoLocalizedRoute(page, route);
    await settle(page);
    const figure = figureFor(page, route);
    const toggle = figure.locator("[data-diagram-full-view-toggle]");
    await expect(toggle).toHaveCount(1);
    await toggle.click();
    await page.waitForFunction(
      (visualizationId) =>
        document.fullscreenElement?.getAttribute("data-visualization-id") ===
        visualizationId,
      route.visualizationId,
    );
    await settle(page);

    const audit = await auditFigure(page, route);
    failures.push(
      ...audit.errors.map(
        (error) => `${route.locale}/${route.chapterId}: ${error}`,
      ),
    );

    await toggle.click();
    await page.waitForFunction(() => document.fullscreenElement === null);
  }

  expect(failures).toEqual([]);
}

test.describe("course diagram style system", { tag: "@diagram-style" }, () => {
  test("route inventory is the exact active-locale projection", () => {
    expect(referenceLocale).toBe("en");
    const routeKey = (route: DiagramRoute) =>
      `${route.locale}/${route.chapterId}/${route.visualizationId}`;
    expect(new Set(routes.map(routeKey)).size).toBe(routes.length);

    const expectedCount = referenceRoutes.reduce((count, route) => {
      const projection = projectedChapters.get(route.chapterId);
      expect(projection).toBeDefined();
      const actualLocales = routes
        .filter(
          (candidate) =>
            candidate.chapterId === route.chapterId &&
            candidate.visualizationId === route.visualizationId,
        )
        .map(({ locale }) => locale);
      expect(actualLocales).toEqual(projection?.activeLocales);
      return count + (projection?.activeLocales.length ?? 0);
    }, 0);

    expect(routes).toHaveLength(expectedCount);
    for (const route of routes) {
      expect(route.path).toBe(
        `/${route.locale}/course/${route.chapterId}/`,
      );
    }

    const localizedPageKeys = localizedPageRoutes.map(
      ({ chapterId, locale }) => `${locale}/${chapterId}`,
    );
    expect(new Set(localizedPageKeys).size).toBe(localizedPageKeys.length);
  });

  test("all published diagrams share one contained desktop presentation", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await auditRoutes(page, desktop);
  });

  test("all published diagrams remain contained in the narrow fallback", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await auditRoutes(page, mobile);
  });

  test("all published diagrams keep every bounded box contained in full view", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await auditFullscreenRoutes(page);
  });

  for (const [viewportName, viewport] of Object.entries({
    desktop,
    narrow: mobile,
  })) {
    test(`every non-English page contains localized boxes at ${viewportName} width`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await auditLocalizedPages(page, viewport);
    });
  }

  test("Chapters 12 and 13 contain every cell, card, and text fragment", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const focused = referenceRoutes.filter(
      ({ order }) => order === 12 || order === 13,
    );
    expect(focused).toHaveLength(2);
    await auditRoutes(page, medium, focused);
  });

  test("Chapters 22 and 23 contain every nested formula box", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const focused = referenceRoutes.filter(
      ({ order }) => order === 22 || order === 23,
    );
    expect(focused).toHaveLength(3);
    await auditRoutes(page, medium, focused);
  });

  test("a sanctioned scroller never exempts an overflowing nested box", async ({
    page,
  }) => {
    const chapter22 = referenceRoutes.find(({ order }) => order === 22);
    if (!chapter22)
      throw new Error("Chapter 22 must register a useful diagram.");
    await page.setViewportSize(desktop);
    await gotoLocalizedRoute(page, chapter22);
    await settle(page);
    await figureFor(page, chapter22)
      .locator(".bypass-origin")
      .first()
      .evaluate((box) => {
        (box as HTMLElement).style.inlineSize = "2rem";
      });
    const audit = await auditFigure(page, chapter22);
    expect(
      audit.errors.some(
        (error) =>
          error.includes("bypass-origin") &&
          error.includes("paints formula outside"),
      ),
    ).toBe(true);
  });

  test("the shared system remains legible and contained in forced colors", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.emulateMedia({ forcedColors: "active" });
    await auditRoutes(page, desktop);
  });
});
