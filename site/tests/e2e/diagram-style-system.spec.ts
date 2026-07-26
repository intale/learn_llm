// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync, readdirSync } from "node:fs";
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { parseJsonFrontmatter } from "../../../scripts/check-site-content.mjs";

declare const process: { cwd(): string };

interface DiagramRoute {
  chapterId: string;
  locale: "en" | "ru";
  order: number;
  path: string;
  visualizationId: string;
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
const englishChapterDirectory = resolve(
  process.cwd(),
  "src/content/chapters/en",
);

const englishRoutes = (readdirSync(englishChapterDirectory) as string[])
  .filter((name: string) => name.endsWith(".mdx"))
  .flatMap((name: string): DiagramRoute[] => {
    const source = readFileSync(resolve(englishChapterDirectory, name), "utf8");
    const { data } = parseJsonFrontmatter(source, name);
    if (data.visualization.decision !== "useful") return [];
    return [
      {
        chapterId: data.chapter_id as string,
        locale: "en",
        order: data.order as number,
        path: `/en/course/${data.chapter_id}/`,
        visualizationId: data.visualization.id as string,
      },
    ];
  })
  .sort((left, right) => left.order - right.order);

const routes: DiagramRoute[] = [
  ...englishRoutes,
  ...englishRoutes
    .filter(({ order }) => order <= 7)
    .map((route) => ({
      ...route,
      locale: "ru" as const,
      path: `/ru/course/${route.chapterId}/`,
    })),
];

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
    const excludedFromPaintAudit = (element: Element) =>
      element.closest(".katex-mathml, .visually-hidden") !== null ||
      element.closest('[aria-hidden="true"]') !== null;

    if (root.firstElementChild?.tagName !== "FIGCAPTION") {
      errors.push("figcaption is not the first element child");
    }
    const caption = root.firstElementChild as HTMLElement | null;
    if (!caption?.classList.contains("course-diagram__caption")) {
      errors.push("caption does not use the shared role");
    }
    if (!caption?.querySelector("h3, .visually-hidden + h3")) {
      errors.push("caption has no title heading");
    }
    if (!caption?.querySelector(".course-diagram__description")) {
      errors.push("caption has no shared learner description");
    }
    if (
      getComputedStyle(root)
        .getPropertyValue("--course-diagram-style-version")
        .trim() !== "course-v1"
    ) {
      errors.push("shared module version is not applied");
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
    const firstCard = root.querySelector(
      "[data-diagram-card][data-diagram-box]",
    );
    const firstSection = root.querySelector(":scope > section");
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

async function auditRoutes(
  page: Page,
  viewport: { width: number; height: number },
  selectedRoutes = routes,
) {
  await page.setViewportSize(viewport);
  const failures: string[] = [];
  const baselines = new Map<keyof DiagramAudit["signatures"], string>();

  for (const route of selectedRoutes) {
    await page.goto(route.path);
    await settle(page);
    const figure = figureFor(page, route);
    await expect(figure).toHaveAttribute("class", /\bcourse-diagram\b/);
    await expect(figure).toHaveAttribute("data-diagram-style", "course-v1");
    const pageWidths = await page.evaluate((allowedError) => {
      const viewport = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((element) => {
          if (element.closest("[data-diagram-scroll]")) return false;
          const style = getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden")
            return false;
          const rect = element.getBoundingClientRect();
          return (
            rect.left < -allowedError || rect.right > viewport + allowedError
          );
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
      pageWidths.body > pageWidths.viewport + tolerance ||
      pageWidths.document > pageWidths.viewport + tolerance
    ) {
      failures.push(
        `${route.locale}/${route.chapterId}: page width ` +
          `${Math.max(pageWidths.body, pageWidths.document)}px exceeds ` +
          `${pageWidths.viewport}px viewport; offenders: ${pageWidths.offenders.join(", ")}`,
      );
    }
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
    await page.goto(route.path);
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
      ...audit.errors.map((error) => `${route.chapterId}: ${error}`),
    );

    await toggle.click();
    await page.waitForFunction(() => document.fullscreenElement === null);
  }

  expect(failures).toEqual([]);
}

test.describe("course diagram style system", { tag: "@diagram-style" }, () => {
  test("all published diagrams share one contained desktop presentation", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    expect(englishRoutes).toHaveLength(33);
    expect(routes).toHaveLength(40);
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

  test("Chapters 12 and 13 contain every cell, card, and text fragment", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const focused = englishRoutes.filter(
      ({ order }) => order === 12 || order === 13,
    );
    expect(focused).toHaveLength(2);
    await auditRoutes(page, medium, focused);
  });

  test("Chapters 22 and 23 contain every nested formula box", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const focused = englishRoutes.filter(
      ({ order }) => order === 22 || order === 23,
    );
    expect(focused).toHaveLength(2);
    await auditRoutes(page, medium, focused);
  });

  test("a sanctioned scroller never exempts an overflowing nested box", async ({
    page,
  }) => {
    const chapter22 = englishRoutes.find(({ order }) => order === 22);
    if (!chapter22)
      throw new Error("Chapter 22 must register a useful diagram.");
    await page.setViewportSize(desktop);
    await page.goto(chapter22.path);
    await settle(page);
    await figureFor(page, chapter22)
      .locator(".bypass-origin")
      .first()
      .evaluate((box) => {
        (box as HTMLElement).style.inlineSize = "8rem";
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
    test.setTimeout(90_000);
    await page.emulateMedia({ forcedColors: "active" });
    const focused = englishRoutes.filter(
      ({ order }) => order === 12 || order === 13,
    );
    await auditRoutes(page, desktop, focused);
    for (const route of focused) {
      await page.goto(route.path);
      await settle(page);
      const colors = await figureFor(page, route).evaluate((figure) => {
        const style = getComputedStyle(figure);
        return {
          background: style.backgroundColor,
          border: style.borderTopColor,
          color: style.color,
        };
      });
      expect(colors.border).toBe(colors.color);
    }
  });
});
