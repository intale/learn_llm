import { generate, parse, walk } from 'css-tree';

export class CssScopeValidationError extends Error {
  constructor(issues, heading = 'CSS scope validation failed') {
    super(heading + ':\n- ' + issues.join('\n- '));
    this.name = 'CssScopeValidationError';
    this.issues = issues;
  }
}

function listToArray(list) {
  const values = [];
  list?.forEach((value) => values.push(value));
  return values;
}

function sourceLine(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function extractStyleBlocks(source, sourceName) {
  const blocks = [];
  const openingTag = /<style\b([^>]*)>/gi;
  let match;

  while ((match = openingTag.exec(source)) !== null) {
    const contentStart = openingTag.lastIndex;
    const closingOffset = source.indexOf('</style>', contentStart);
    if (closingOffset === -1) {
      throw new CssScopeValidationError([
        sourceName + ':' + sourceLine(source, match.index) + ': style element is not closed',
      ]);
    }
    blocks.push({
      attributes: match[1],
      css: source.slice(contentStart, closingOffset),
      line: sourceLine(source, contentStart),
    });
    openingTag.lastIndex = closingOffset + '</style>'.length;
  }

  return blocks;
}

function parseStylesheet(block, sourceName) {
  try {
    return parse(block.css, {
      context: 'stylesheet',
      filename: sourceName,
      positions: true,
    });
  } catch (error) {
    const location = error?.loc?.start ?? error?.location?.start;
    const line = location?.line ? block.line + location.line - 1 : block.line;
    const message = error instanceof Error ? error.message : String(error);
    throw new CssScopeValidationError([
      sourceName + ':' + line + ': CSS parser rejected style: ' + message,
    ]);
  }
}

function selectorLocation(block, selector) {
  const line = selector.loc?.start?.line;
  return block.line + (line ? line - 1 : 0);
}

function selectorDescription(selector) {
  try {
    return generate(selector);
  } catch {
    return '<unprintable selector>';
  }
}

function selectorNodes(selector) {
  return listToArray(selector.children);
}

function attributeSelectorName(node) {
  return typeof node.name === 'string' ? node.name : node.name?.name;
}

function isChapterRootCompound(nodes) {
  return (
    nodes.some((node) => node.type === 'TypeSelector' && node.name === 'article') &&
    nodes.some(
      (node) =>
        node.type === 'AttributeSelector' &&
        attributeSelectorName(node) === 'data-chapter-root',
    ) &&
    nodes.some(
      (node) =>
        node.type === 'AttributeSelector' &&
        attributeSelectorName(node) === 'data-chapter-id',
    )
  );
}

function hasChapterRootAnchor(selector) {
  const compounds = [[]];
  for (const node of selectorNodes(selector)) {
    if (node.type === 'Combinator') {
      compounds.push([]);
    } else {
      compounds.at(-1).push(node);
    }
  }
  return compounds.some(isChapterRootCompound);
}

function pseudoContainsScopedNode(pseudo) {
  if (!pseudo.children) return false;
  const children = listToArray(pseudo.children);
  if (children.length === 0) return false;
  return children.some((child) => {
    if (child.type === 'Selector') return selectorContainsScopedNode(child);
    if (child.type === 'SelectorList') {
      return listToArray(child.children).some(selectorContainsScopedNode);
    }
    return false;
  });
}

function selectorContainsScopedNode(selector) {
  return selectorNodes(selector).some((node) => {
    if (node.type === 'Combinator') return false;
    if (node.type !== 'PseudoClassSelector') return true;
    if (node.name === 'global') return false;
    if (['is', 'not', 'where', 'has'].includes(node.name)) {
      return pseudoContainsScopedNode(node);
    }
    return true;
  });
}

function pseudoContainsGlobalNode(pseudo) {
  if (pseudo.name === 'global') return true;
  if (!pseudo.children) return false;
  const children = listToArray(pseudo.children);
  return children.some((child) => {
    if (child.type === 'Selector') return selectorContainsGlobalNode(child);
    if (child.type === 'SelectorList') {
      return listToArray(child.children).some(selectorContainsGlobalNode);
    }
    return false;
  });
}

function selectorContainsGlobalNode(selector) {
  return selectorNodes(selector).some(
    (node) => node.type === 'PseudoClassSelector' && pseudoContainsGlobalNode(node),
  );
}

function visitRuleSelectors(stylesheet, block, sourceName, inspect) {
  const issues = [];
  walk(stylesheet, {
    visit: 'Rule',
    enter(node) {
      if (node.prelude?.type !== 'SelectorList') {
        issues.push(
          sourceName +
            ':' +
            block.line +
            ': CSS parser did not produce a selector list for a style rule',
        );
        return;
      }
      for (const selector of listToArray(node.prelude.children)) {
        inspect(selector, selectorLocation(block, selector), issues);
      }
    },
  });
  return issues;
}

function chapterRootTags(source) {
  return [...source.matchAll(/<article\b[^>]*\bdata-chapter-root\b[^>]*>/g)];
}

function tagsWithAttribute(source, attribute) {
  const attributePattern = new RegExp('\\b' + attribute + '(?:\\s*=|\\b)');
  return (source.match(/<[A-Za-z][^>]*>/g) ?? []).filter((tag) =>
    attributePattern.test(tag),
  );
}

export function validateChapterRouteCss(source, sourceName = 'chapter route') {
  const styles = extractStyleBlocks(source, sourceName);
  const globalStyles = styles.filter((block) => /(?:^|\s)is:global(?:\s|=|$)/.test(block.attributes));
  const issues = [];

  if (globalStyles.length !== 1) {
    issues.push(sourceName + ': requires exactly one route style is:global block');
  }

  for (const block of globalStyles) {
    const stylesheet = parseStylesheet(block, sourceName);
    issues.push(
      ...visitRuleSelectors(stylesheet, block, sourceName, (selector, line, selectorIssues) => {
        if (!hasChapterRootAnchor(selector)) {
          selectorIssues.push(
            sourceName +
              ':' +
              line +
              ': route selector "' +
              selectorDescription(selector) +
              '" must anchor to the chapter root article[data-chapter-root][data-chapter-id]',
          );
        }
      }),
    );
  }

  if (issues.length > 0) {
    throw new CssScopeValidationError(issues);
  }
  return { globalStyleCount: globalStyles.length };
}

export function validateDiagramComponentCss(source, sourceName = 'diagram component') {
  const styles = extractStyleBlocks(source, sourceName);
  const issues = [];
  const figures = [...source.matchAll(/<figure\b[^>]*>/g)].filter((match) =>
    /\bdata-visualization-id\s*=/.test(match[0]),
  );

  if (figures.length !== 1) {
    issues.push(sourceName + ': requires exactly one registered diagram figure');
  } else {
    const classAttribute = figures[0][0].match(/\bclass="([^"]*)"/);
    const classes = classAttribute?.[1]?.trim().split(/\s+/).filter(Boolean) ?? [];
    const conceptClasses = classes.filter((name) => name !== 'course-diagram');
    if (
      !classes.includes('course-diagram') ||
      conceptClasses.length !== 1
    ) {
      issues.push(
        sourceName +
          ': registered figure requires exactly one concept-specific root class besides course-diagram',
      );
    }
  }

  for (const block of styles) {
    if (/(?:^|\s)is:global(?:\s|=|$)/.test(block.attributes)) {
      issues.push(sourceName + ':' + block.line + ': component style is:global is forbidden');
      continue;
    }
    const stylesheet = parseStylesheet(block, sourceName);
    issues.push(
      ...visitRuleSelectors(stylesheet, block, sourceName, (selector, line, selectorIssues) => {
        if (
          selectorContainsGlobalNode(selector) &&
          !selectorContainsScopedNode(selector)
        ) {
          selectorIssues.push(
            sourceName +
              ':' +
              line +
              ': standalone :global selector branch "' +
              selectorDescription(selector) +
              '" is forbidden; qualify it with a local selector',
          );
        }
      }),
    );
  }

  if (issues.length > 0) {
    throw new CssScopeValidationError(issues);
  }
  return { conceptRootCount: 1, styleCount: styles.length };
}

export function validateChapterRouteScope(source, sourceName = 'chapter route') {
  const issues = [];
  const roots = chapterRootTags(source);
  const rootRegistrations = tagsWithAttribute(source, 'data-chapter-root');
  const idRegistrations = tagsWithAttribute(source, 'data-chapter-id');
  let cssResult;

  if (roots.length !== 1 || rootRegistrations.length !== 1) {
    issues.push(sourceName + ': requires exactly one article data-chapter-root');
  } else {
    const root = roots[0][0];
    if (!/\bclass="[^"]*\blesson\b[^"]*"/.test(root)) {
      issues.push(sourceName + ': chapter root must retain the lesson class');
    }
    if (!/\bdata-chapter-id=\{entry\.data\.chapter_id\}/.test(root)) {
      issues.push(
        sourceName + ': chapter root requires dynamic data-chapter-id={entry.data.chapter_id}',
      );
    }
  }
  if (idRegistrations.length !== 1) {
    issues.push(sourceName + ': requires exactly one data-chapter-id');
  }

  try {
    cssResult = validateChapterRouteCss(source, sourceName);
  } catch (error) {
    issues.push(...(error.issues ?? [error.message]));
  }

  if (issues.length > 0) {
    throw new CssScopeValidationError(issues);
  }
  return { chapterRootCount: roots.length, ...cssResult };
}
