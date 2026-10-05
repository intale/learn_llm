import type { Locator } from "@playwright/test";

export interface DiagramAudit {
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

export async function auditDiagramContainment(
  locator: Locator,
  tolerance = 2,
): Promise<DiagramAudit> {
  return locator.evaluate((figure, allowedError) => {
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
