// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync, readdirSync } from "node:fs";
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  validateDiagramComponents,
  validateDiagramComponentSource,
} from "../../scripts/check-site-content.mjs";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const componentDirectory = resolve(process.cwd(), "src/components/chapters");
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");
const components = (readdirSync(componentDirectory) as string[])
  .filter((name) => name.endsWith("Diagram.astro"))
  .sort();

const fixture = `
  <figure class="course-diagram fixture-diagram" data-diagram-style="course-v1"
    data-visualization-id="fixture" tabindex="0"
    aria-labelledby="fixture-title" aria-describedby="fixture-description">
    <figcaption class="course-diagram__caption">
      <h3 id="fixture-title">Fixture</h3>
      <p id="fixture-description" class="course-diagram__description">Description</p>
    </figcaption>
    <section>
      <article data-diagram-card data-diagram-box>Card</article>
      <div class="course-diagram__scroll" data-diagram-scroll role="region"
        tabindex="0" aria-label="Evidence">
        <table data-diagram-table><tbody><tr><td>1</td></tr></tbody></table>
      </div>
    </section>
  </figure>`;

describe("course diagram design system", () => {
  it("applies one complete source contract to every current diagram", () => {
    expect(components).toHaveLength(38);
    expect(validateDiagramComponents(repositoryRoot)).toBe(components.length);

    for (const component of components) {
      const source = read(`site/src/components/chapters/${component}`);
      expect(source.match(/class="course-diagram\s/g)).toHaveLength(1);
      expect(source.match(/data-diagram-style="course-v1"/g)).toHaveLength(1);
      expect(source.match(/course-diagram__caption/g)).toHaveLength(1);
      expect(source).toContain("course-diagram__description");
      expect(source).not.toMatch(/@media\s*\(\s*max-width\s*:/);
      expect(source).not.toMatch(/contain\s*:\s*paint\b/);
      expect(source).not.toMatch(/overflow-x\s*:\s*(?:auto|scroll)\b/);
    }
  });

  it("loads all diagram presentation from one CSS module", () => {
    const layout = read("site/src/layouts/BaseLayout.astro");
    const module = read("site/src/styles/diagram.module.css");
    const global = read("site/src/styles/global.css");

    expect(layout.match(/diagram\.module\.css/g)).toHaveLength(1);
    expect(layout).toContain("<body class={diagramStyles.host}>");
    expect(module).toContain("--course-diagram-style-version: course-v1");
    expect(module).toContain(
      "figure.course-diagram[data-diagram-style='course-v1']",
    );
    expect(module).toContain(".course-diagram__scroll[data-diagram-scroll]");
    expect(module).toContain("[data-diagram-card][data-diagram-box]");
    expect(module).toContain("table[data-diagram-table]");
    expect(module).toContain("--diagram-summary-min");
    expect(module).toContain("--diagram-cell-padding-inline");
    expect(module).toContain("--diagram-scroll-inline-size");
    expect(module).toMatch(/\.state-symbol[\s\S]*min-inline-size:\s*1\.7rem/);
    expect(module).toMatch(/\.state-symbol[\s\S]*white-space:\s*nowrap/);
    expect(module).toMatch(
      /\.course-diagram__scroll\[data-diagram-scroll\][\s\S]*position:\s*relative/,
    );
    expect(global).not.toMatch(
      /data-diagram-full-view|figure\[data-visualization-id\]/,
    );
  });

  it("rejects style drift, clipped roots, and private scroll implementations", () => {
    expect(() => validateDiagramComponentSource(fixture)).not.toThrow();
    expect(() =>
      validateDiagramComponentSource(fixture.replace("course-diagram ", "")),
    ).toThrow(/course-diagram class/);
    expect(() =>
      validateDiagramComponentSource(
        fixture.replace(' data-diagram-style="course-v1"', ""),
      ),
    ).toThrow(/data-diagram-style/);
    expect(() =>
      validateDiagramComponentSource(
        fixture.replace(" data-diagram-scroll", ""),
      ),
    ).toThrow(/data-diagram-scroll/);
    expect(() =>
      validateDiagramComponentSource(
        fixture.replace(" data-diagram-table", ""),
      ),
    ).toThrow(/data-diagram-table/);
    expect(() =>
      validateDiagramComponentSource(
        `${fixture}<style>.fixture-diagram { overflow: hidden; }</style>`,
      ),
    ).toThrow(/must not hide or clip overflow/);
    expect(() =>
      validateDiagramComponentSource(
        `${fixture}<style>.private { overflow-x: auto; }</style>`,
      ),
    ).toThrow(/private horizontal-scroll implementation/);
    expect(() =>
      validateDiagramComponentSource(
        `${fixture}<style>@media (max-width: 40rem) {}</style>`,
      ),
    ).toThrow(/viewport-width diagram breakpoint/);
  });

  it("keeps the permanent rules in both authoring sources of truth", () => {
    const agents = read("AGENTS.md");
    const skills = read("SKILLS.md");

    expect(agents).toContain("site/src/styles/diagram.module.css");
    expect(agents).toContain("Never use `overflow: hidden`, `overflow: clip`");
    expect(agents).toMatch(
      /Use the shared\s+container, not the browser viewport/,
    );
    expect(agents).toContain("an ancestor scroller owns travel");
    expect(agents).toContain("complete four-sided computed borders");
    expect(skills).toContain('data-diagram-style="course-v1"');
    expect(skills).toContain("data-diagram-card");
    expect(skills).toContain("data-diagram-scroll");
    expect(skills).toContain("A named ancestor scroller never");
    expect(skills).toContain("complete four-sided computed borders");
    expect(skills).toContain("--diagram-scroll-inline-size");
    expect(skills).toContain("painted text");
  });
});
