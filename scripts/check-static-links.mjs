#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ContentValidationError,
  parseJsonFrontmatter,
  repositoryRootFromCwd,
} from './check-site-content.mjs';
import { LOCALE_CONFIGURATION } from './locale-config.mjs';
import {
  activeLocalesForChapter,
  readChapterLocaleConfiguration,
} from './chapter-locale-config.mjs';
import {
  DEFAULT_SITE_URL,
  renderSitemapXml,
} from '../site/sitemap.config.mjs';

export const GOOGLE_ANALYTICS_MEASUREMENT_ID = 'G-B5JVTL721S';
export const GOOGLE_ANALYTICS_SCRIPT_URL =
  'https://www.googletagmanager.com/gtag/js?id=' +
  GOOGLE_ANALYTICS_MEASUREMENT_ID;
const googleAnalyticsScriptBase =
  'https://www.googletagmanager.com/gtag/js';

function listFiles(directory) {
  const files = [];
  if (!existsSync(directory)) return files;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = nodePath.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }

  return files.sort();
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) {
    result[match[1].toLowerCase()] = match[2];
  }
  return result;
}

function hasBooleanAttribute(tag, name) {
  return new RegExp('\\s' + name + '(?=\\s|=|/?>)', 'i').test(tag);
}

function scriptElements(source) {
  return [...source.matchAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)].map(
    (match) => {
      const opening = match[0].match(/^<script\b[^>]*>/i)?.[0] ?? '';
      const body = match[0]
        .slice(opening.length)
        .replace(/<\/script\s*>$/i, '');
      return {
        index: match.index,
        opening,
        body,
        values: attributes(opening),
      };
    },
  );
}

function normalizeInlineScript(source) {
  return source
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n');
}

function isExternalReference(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
}

function cleanReference(value) {
  return value
    .replaceAll('&amp;', '&')
    .split('#', 1)[0]
    .split('?', 1)[0];
}

const siteBaseSegmentPattern = /^[A-Za-z0-9._~-]+$/;

export function normalizeSiteBase(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Site base must be a non-empty absolute path.');
  }
  if (!value.startsWith('/') || value.includes('\\') || /[?#]/.test(value)) {
    throw new Error(
      'Site base must start with / and contain no query, fragment, or backslash.',
    );
  }

  const segments = value.split('/').filter(Boolean);
  if (
    segments.some(
      (segment) =>
        segment === '.' ||
        segment === '..' ||
        !siteBaseSegmentPattern.test(segment),
    )
  ) {
    throw new Error('Site base contains an unsafe path segment.');
  }

  const normalized = segments.length === 0 ? '/' : `/${segments.join('/')}/`;
  if (value !== normalized) {
    throw new Error(`Site base must use normalized directory syntax: ${normalized}`);
  }
  return normalized;
}

function siteReference(path, siteBase) {
  return siteBase === '/' ? path : siteBase + path.slice(1);
}

export function referenceCandidates(
  reference,
  ownerRelativePath,
  siteBase = '/',
) {
  const normalizedBase = normalizeSiteBase(siteBase);
  if (
    typeof reference !== 'string' ||
    reference.length === 0 ||
    reference.startsWith('#') ||
    isExternalReference(reference)
  ) {
    return [];
  }

  let cleaned = cleanReference(reference);
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch {
    return { error: 'contains invalid percent encoding' };
  }

  const ownerDirectory = nodePath.posix.dirname(
    ownerRelativePath.replaceAll('\\', '/'),
  );
  let relative;
  if (cleaned.startsWith('/')) {
    if (normalizedBase === '/') {
      relative = cleaned.slice(1);
    } else if (cleaned === normalizedBase.slice(0, -1)) {
      relative = '';
    } else if (cleaned.startsWith(normalizedBase)) {
      relative = cleaned.slice(normalizedBase.length);
    } else {
      return { error: `escapes configured site base ${normalizedBase}` };
    }
  } else {
    relative = nodePath.posix.join(ownerDirectory, cleaned);
  }
  relative = nodePath.posix.normalize(relative);
  if (relative === '.' || relative === '') relative = '';

  if (
    nodePath.posix.isAbsolute(relative) ||
    relative === '..' ||
    relative.startsWith('../')
  ) {
    return { error: 'escapes the static output directory' };
  }

  if (cleaned.endsWith('/') || relative === '') {
    return [nodePath.posix.join(relative, 'index.html')];
  }

  if (nodePath.posix.extname(relative)) {
    return [relative];
  }

  return [
    relative,
    relative + '.html',
    nodePath.posix.join(relative, 'index.html'),
  ];
}

function referencesFromHtml(source) {
  const references = [];
  for (const tag of source.matchAll(/<(?:a|area|link|script|img|source|video|audio)\b[^>]*>/g)) {
    const values = attributes(tag[0]);
    if (values.href) references.push(values.href);
    if (values.src) references.push(values.src);
    if (values.poster) references.push(values.poster);
    if (values.srcset) {
      values.srcset.split(',').forEach((candidate) => {
        const value = candidate.trim().split(/\s+/, 1)[0];
        if (value) references.push(value);
      });
    }
  }
  return references;
}

function referencesFromCss(source) {
  return [...source.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)].map(
    (match) => match[2],
  );
}

function htmlRoute(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/');
  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) {
    return '/' + normalized.slice(0, -'index.html'.length);
  }
  return '/' + normalized;
}

export const MATHML_FIXED_ARITY = Object.freeze({
  mfrac: 2,
  mroot: 2,
  msub: 2,
  msup: 2,
  munder: 2,
  mover: 2,
  msubsup: 3,
  munderover: 3,
});

function mathmlFormulaLabel(fragment, index) {
  const annotation = fragment.match(
    /<annotation\b[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation\s*>/i,
  );
  const source = annotation ? decodeHtmlEntities(annotation[1]).trim() : '';
  return source === '' ? 'formula ' + index : 'formula "' + source + '"';
}

function validateFixedMathmlArity(frame, relativePath, formula, issues) {
  const expected = MATHML_FIXED_ARITY[frame.tagName];
  if (expected === undefined || frame.elementChildren === expected) return;
  issues.push(
    relativePath + ': ' + formula + ' has <' + frame.tagName + '> with ' +
      frame.elementChildren + ' element children; expected ' + expected,
  );
}

export function mathmlCompatibilityIssues(relativePath, source) {
  const issues = [];
  const fragments = [
    ...String(source).matchAll(/<math\b[^>]*>[\s\S]*?<\/math\s*>/gi),
  ];

  for (const [formulaIndex, fragmentMatch] of fragments.entries()) {
    const fragment = fragmentMatch[0];
    const formula = mathmlFormulaLabel(fragment, formulaIndex);
    const stack = [];

    for (const tagMatch of fragment.matchAll(
      /<(\/?)([A-Za-z][\w:-]*)\b[^>]*>/g,
    )) {
      const closing = tagMatch[1] === '/';
      const tagName = tagMatch[2].toLowerCase();
      if (closing) {
        const frame = stack.pop();
        if (!frame || frame.tagName !== tagName) {
          issues.push(
            relativePath + ': ' + formula + ' has invalid MathML nesting at </' +
              tagName + '>',
          );
          stack.length = 0;
          break;
        }
        validateFixedMathmlArity(frame, relativePath, formula, issues);
        continue;
      }

      if (stack.length > 0) stack[stack.length - 1].elementChildren += 1;
      const values = attributes(tagMatch[0]);
      if (
        typeof values.mathvariant === 'string' &&
        !(
          tagName === 'mi' &&
          values.mathvariant.toLowerCase() === 'normal'
        )
      ) {
        issues.push(
          relativePath + ': ' + formula + ' has unsupported mathvariant="' +
            values.mathvariant + '" on <' + tagName +
            '>; only normal on <mi> is allowed',
        );
      }

      const frame = { tagName, elementChildren: 0 };
      if (/\/\s*>$/.test(tagMatch[0])) {
        validateFixedMathmlArity(frame, relativePath, formula, issues);
      } else {
        stack.push(frame);
      }
    }

    if (stack.length > 0) {
      issues.push(
        relativePath + ': ' + formula + ' has unclosed MathML element <' +
          stack[stack.length - 1].tagName + '>',
      );
    }
  }
  return issues;
}

export const SEO_PLACEHOLDER_SENTINELS = Object.freeze([
  'todo',
  'tbd',
  'placeholder',
  'placeholder text',
  'description',
  'page description',
  'seo description',
  'coming soon',
  'replace me',
  'заполнитель',
  'текст-заполнитель',
  'описание',
  'описание страницы',
  'seo-описание',
  'скоро',
  'будет позже',
]);

const seoPlaceholderSentinels = new Set(SEO_PLACEHOLDER_SENTINELS);
const namedHtmlEntities = Object.freeze({
  amp: '&',
  apos: "'",
  emsp: '\u2003',
  ensp: '\u2002',
  gt: '>',
  lt: '<',
  nbsp: '\u00a0',
  newline: '\n',
  quot: '"',
  tab: '\t',
  thinsp: '\u2009',
  zwj: '\u200d',
  zwnj: '\u200c',
});

function decodeHtmlEntities(value) {
  return String(value).replace(
    /&(?:#([0-9]+)|#x([0-9a-f]+)|([a-z][a-z0-9]+));/gi,
    (entity, decimal, hexadecimal, named) => {
      if (decimal !== undefined || hexadecimal !== undefined) {
        const codePoint = Number.parseInt(decimal ?? hexadecimal, hexadecimal ? 16 : 10);
        if (
          !Number.isInteger(codePoint) ||
          codePoint < 0 ||
          codePoint > 0x10ffff ||
          (codePoint >= 0xd800 && codePoint <= 0xdfff)
        ) {
          return '\ufffd';
        }
        return String.fromCodePoint(codePoint);
      }
      return namedHtmlEntities[named.toLowerCase()] ?? entity;
    },
  );
}

function normalizedDescriptionText(value) {
  return value
    .replace(/\p{Cf}/gu, '')
    .trim()
    .replace(/\s+/gu, ' ');
}

function isPlaceholderDescription(value) {
  const normalized = normalizedDescriptionText(value).toLocaleLowerCase();
  return (
    seoPlaceholderSentinels.has(normalized) ||
    /^(?:todo|tbd)(?::.*)?$/iu.test(normalized) ||
    /^(?:add|write|replace)(?:\s+\S+)*\s+description(?:\s+here)?[.!]?$/iu.test(
      normalized,
    ) ||
    /^(?:добавьте|напишите|замените)(?:\s+\S+)*\s+описани\p{L}*[.!]?$/iu.test(
      normalized,
    ) ||
    /^здесь\s+будет\s+описани\p{L}*[.!]?$/iu.test(normalized)
  );
}

function normalizeSeoExpectationMap(value, issues) {
  if (!(value instanceof Map)) {
    issues.push('SEO expectations must be a Map from logical routes to descriptions');
    return new Map();
  }

  const normalized = new Map();
  for (const [route, description] of value) {
    if (
      typeof route !== 'string' ||
      (route !== '/' &&
        !/^\/(?:[A-Za-z0-9._~-]+\/)+$/.test(route))
    ) {
      issues.push(
        'SEO expectation route "' + String(route) +
          '" must be / or a normalized logical directory route',
      );
      continue;
    }
    if (typeof description !== 'string') {
      issues.push(route + ': expected SEO description must be a string');
      continue;
    }
    const trimmed = description.trim();
    if (normalizedDescriptionText(trimmed) === '') {
      issues.push(route + ': expected SEO description must not be blank');
    } else if (isPlaceholderDescription(trimmed)) {
      issues.push(route + ': expected SEO description is placeholder text');
    }
    normalized.set(route, trimmed);
  }
  return normalized;
}

function readSeoCatalog(repositoryRoot, locale, issues) {
  const path = nodePath.join(
    repositoryRoot,
    'site/src/i18n/catalogs',
    locale + '.json',
  );
  let value;
  try {
    value = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    issues.push(path + ': cannot read SEO catalog data: ' + error.message);
    return null;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    issues.push(path + ': SEO catalog data must be an object');
    return null;
  }
  return { path, value };
}

function addSeoExpectation(expectations, route, description, sourceName, issues) {
  if (expectations.has(route)) {
    issues.push(sourceName + ': duplicates SEO route ' + route);
    return;
  }
  if (typeof description !== 'string') {
    issues.push(sourceName + ': SEO description must be a string');
    return;
  }
  expectations.set(route, description);
}

/**
 * Derives the complete logical route/description contract from source content.
 * Site base prefixes are deliberately absent: routes describe the static output tree.
 */
export function deriveSeoExpectations(
  repositoryRoot,
  localeConfiguration = LOCALE_CONFIGURATION,
  chapterLocaleConfiguration = readChapterLocaleConfiguration(
    repositoryRoot,
    localeConfiguration,
  ),
) {
  const issues = [];
  const expectations = new Map();
  const catalogs = new Map();

  for (const locale of localeConfiguration.locales ?? []) {
    const catalog = readSeoCatalog(repositoryRoot, locale, issues);
    if (catalog) catalogs.set(locale, catalog);
  }

  const defaultCatalog = catalogs.get(localeConfiguration.defaultLocale);
  if (!defaultCatalog) {
    issues.push(
      'default locale "' + String(localeConfiguration.defaultLocale) +
        '" has no readable SEO catalog',
    );
  } else {
    addSeoExpectation(
      expectations,
      '/',
      defaultCatalog.value.siteDescription,
      defaultCatalog.path + '.siteDescription',
      issues,
    );
  }

  for (const locale of localeConfiguration.locales ?? []) {
    const catalog = catalogs.get(locale);
    if (!catalog) continue;
    addSeoExpectation(
      expectations,
      '/' + locale + '/',
      catalog.value.siteDescription,
      catalog.path + '.siteDescription',
      issues,
    );
    addSeoExpectation(
      expectations,
      '/' + locale + '/course/',
      catalog.value.courseDescription,
      catalog.path + '.courseDescription',
      issues,
    );
  }

  const lessonRoot = nodePath.join(
    repositoryRoot,
    'site/src/content/chapters',
  );
  for (const path of listFiles(lessonRoot).filter((candidate) =>
    ['.md', '.mdx'].includes(nodePath.extname(candidate).toLowerCase()),
  )) {
    const relative = nodePath
      .relative(lessonRoot, path)
      .replaceAll('\\', '/');
    const sourceName = 'site/src/content/chapters/' + relative;
    const sourceMatch = relative.match(
      /^([^/]+)\/(\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*)\.(?:md|mdx)$/,
    );
    if (!sourceMatch) {
      issues.push(
        sourceName + ': lesson path must be <locale>/<chapter-id>.md or .mdx',
      );
      continue;
    }

    let data;
    try {
      data = parseJsonFrontmatter(readFileSync(path, 'utf8'), sourceName).data;
    } catch (error) {
      if (error instanceof ContentValidationError) {
        issues.push(...error.issues);
      } else {
        issues.push(sourceName + ': cannot read lesson frontmatter: ' + error.message);
      }
      continue;
    }

    const [, pathLocale, pathChapterId] = sourceMatch;
    if (data.locale !== pathLocale || data.chapter_id !== pathChapterId) {
      issues.push(
        sourceName + ': frontmatter locale and chapter_id must match its path',
      );
      continue;
    }
    if (!(localeConfiguration.locales ?? []).includes(data.locale)) {
      issues.push(sourceName + ': lesson locale is not registered');
      continue;
    }
    const chapter = chapterLocaleConfiguration?.byChapter?.[data.chapter_id];
    if (!chapter) {
      issues.push(sourceName + ': lesson chapter is absent from chapter-locales.json');
      continue;
    }
    if (!chapter.activeLocales.includes(data.locale)) {
      issues.push(sourceName + ': lesson locale is not active for this chapter');
      continue;
    }

    addSeoExpectation(
      expectations,
      '/' + data.locale + '/course/' + data.chapter_id + '/',
      data.description,
      sourceName + '.description',
      issues,
    );
  }

  const normalized = normalizeSeoExpectationMap(expectations, issues);
  if (issues.length > 0) {
    throw new ContentValidationError(issues, 'SEO expectation derivation failed');
  }
  return normalized;
}

function validateSeoDescription(relativePath, source, expected, issues) {
  const route = htmlRoute(relativePath);
  const headOpenings = [...source.matchAll(/<head\b[^>]*>/gi)];
  const headClosings = [...source.matchAll(/<\/head\s*>/gi)];
  const headElements = [
    ...source.matchAll(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi),
  ];
  if (
    headOpenings.length !== 1 ||
    headClosings.length !== 1 ||
    headElements.length !== 1
  ) {
    issues.push(
      relativePath + ': expected exactly one complete head element; found ' +
        headOpenings.length + ' opening and ' + headClosings.length + ' closing tag(s)',
    );
  }

  const descriptionMetas = [...source.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => ({
      index: match.index,
      values: attributes(match[0]),
    }))
    .filter(
      ({ values }) =>
        typeof values.name === 'string' &&
        values.name.toLocaleLowerCase() === 'description',
    );
  if (descriptionMetas.length !== 1) {
    issues.push(
      relativePath +
        ': expected exactly one meta[name="description"]; found ' +
        descriptionMetas.length,
    );
  }

  const head = headElements.length === 1 ? headElements[0] : null;
  const headStart = head?.index ?? -1;
  const headEnd = head ? headStart + head[0].length : -1;
  const outsideHead = descriptionMetas.filter(
    ({ index }) => !head || index < headStart || index >= headEnd,
  );
  if (outsideHead.length > 0) {
    issues.push(
      relativePath + ': meta[name="description"] must be inside the head element',
    );
  }

  if (descriptionMetas.length !== 1) return;
  const content = descriptionMetas[0].values.content;
  const decoded = typeof content === 'string'
    ? decodeHtmlEntities(content).trim()
    : '';
  if (normalizedDescriptionText(decoded) === '') {
    issues.push(
      relativePath + ': meta[name="description"] content must not be blank',
    );
  } else if (isPlaceholderDescription(decoded)) {
    issues.push(
      relativePath + ': meta[name="description"] content is placeholder text',
    );
  }
  if (expected !== undefined && decoded !== expected) {
    issues.push(
      relativePath + ': SEO description for ' + route +
        ' does not match its source; expected "' + expected +
        '", found "' + decoded + '"',
    );
  }
}

function validateGoogleAnalytics(
  relativePath,
  source,
  measurementId,
  issues,
) {
  const expectedScriptUrl =
    googleAnalyticsScriptBase + '?id=' + measurementId;
  const headElements = [
    ...source.matchAll(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi),
  ];
  const head = headElements.length === 1 ? headElements[0] : null;
  const headStart = head?.index ?? -1;
  const headEnd = head ? headStart + head[0].length : -1;
  const isInsideHead = (script) =>
    Boolean(head) && script.index >= headStart && script.index < headEnd;
  const scripts = scriptElements(source);
  const loaders = scripts.filter(({ values }) =>
    values.src?.startsWith(googleAnalyticsScriptBase),
  );

  if (loaders.length !== 1) {
    issues.push(
      relativePath +
        ': expected exactly one Google Analytics loader; found ' +
        loaders.length,
    );
  } else {
    const loader = loaders[0];
    if (loader.values.src !== expectedScriptUrl) {
      issues.push(
        relativePath +
          ': Google Analytics loader must use exactly ' +
          expectedScriptUrl,
      );
    }
    if (!hasBooleanAttribute(loader.opening, 'async')) {
      issues.push(relativePath + ': Google Analytics loader must be async');
    }
    if (loader.body.trim() !== '') {
      issues.push(
        relativePath + ': Google Analytics loader must not contain inline code',
      );
    }
    if (!isInsideHead(loader)) {
      issues.push(
        relativePath + ': Google Analytics loader must be inside the head element',
      );
    }
  }

  const initializers = scripts.filter(
    ({ body, values }) =>
      !values.src &&
      (body.includes('window.dataLayer') ||
        /function\s+gtag\b/.test(body) ||
        /gtag\s*\(\s*['"]config['"]/.test(body)),
  );
  if (initializers.length !== 1) {
    issues.push(
      relativePath +
        ': expected exactly one Google Analytics initializer; found ' +
        initializers.length,
    );
  } else {
    const initializer = initializers[0];
    const normalized = normalizeInlineScript(initializer.body);
    const expectedInitializer = [
      'window.dataLayer = window.dataLayer || [];',
      'function gtag(){dataLayer.push(arguments);}',
      "gtag('js', new Date());",
      "gtag('config', '" + measurementId + "');",
    ].join('\n');
    if (normalized !== expectedInitializer) {
      issues.push(
        relativePath +
          ': Google Analytics initializer must exactly reproduce the supplied dataLayer, gtag, js-time, and ' +
          measurementId,
      );
    }
    if (
      [...initializer.body.matchAll(/gtag\s*\(\s*['"]config['"]\s*,/g)]
        .length !== 1
    ) {
      issues.push(
        relativePath +
          ': Google Analytics initializer must contain exactly one config call',
      );
    }
    if (!isInsideHead(initializer)) {
      issues.push(
        relativePath +
          ': Google Analytics initializer must be inside the head element',
      );
    }
    if (loaders.length === 1 && loaders[0].index >= initializer.index) {
      issues.push(
        relativePath +
          ': Google Analytics loader must appear before its initializer',
      );
    }
  }
}

function validateSeoRouteMatrix(htmlDocuments, expectationsValue, issues) {
  const expectations = normalizeSeoExpectationMap(expectationsValue, issues);
  const byRoute = new Map();
  for (const document of htmlDocuments) {
    const route = htmlRoute(document.relativePath);
    const existing = byRoute.get(route) ?? [];
    existing.push(document);
    byRoute.set(route, existing);
  }

  for (const [route, documents] of byRoute) {
    if (documents.length !== 1) {
      issues.push(
        route + ': expected exactly one generated HTML file; found ' +
          documents.length,
      );
    }
    if (!expectations.has(route)) {
      issues.push(
        documents[0].relativePath +
          ': generated HTML route ' + route + ' has no SEO expectation',
      );
    }
    for (const document of documents) {
      validateSeoDescription(
        document.relativePath,
        document.source,
        expectations.get(route),
        issues,
      );
    }
  }

  for (const route of expectations.keys()) {
    if (!byRoute.has(route)) {
      issues.push(route + ': expected SEO route has no generated HTML file');
    }
  }
  return expectations;
}

function validateSitemapArtifact(
  absoluteDist,
  knownFiles,
  logicalRoutes,
  sitemapUrl,
  issues,
) {
  const sitemapFiles = [...knownFiles].filter((relativePath) =>
    /(?:^|\/)sitemap\.xml$/i.test(relativePath),
  );
  if (
    sitemapFiles.length !== 1 ||
    sitemapFiles[0] !== 'sitemap.xml'
  ) {
    issues.push(
      'static output must contain exactly one root sitemap.xml; found ' +
        (sitemapFiles.length === 0 ? 'none' : sitemapFiles.join(', ')),
    );
    return 0;
  }

  let expected;
  try {
    expected = renderSitemapXml(logicalRoutes, sitemapUrl);
  } catch (error) {
    issues.push('sitemap.xml expectation is invalid: ' + error.message);
    return 0;
  }

  const source = readFileSync(nodePath.join(absoluteDist, 'sitemap.xml'), 'utf8');
  if (source !== expected) {
    issues.push(
      'sitemap.xml must exactly contain one absolute URL for every generated HTML route in deterministic order',
    );
  }
  return logicalRoutes.length;
}

function validateHreflang(
  relativePath,
  source,
  issues,
  localeConfiguration,
  siteBase,
  chapterLocaleConfiguration,
) {
  const route = htmlRoute(relativePath);
  const htmlTag = source.match(/<html\b[^>]*>/);
  const htmlAttributes = htmlTag ? attributes(htmlTag[0]) : {};
  const language = htmlAttributes.lang;
  const direction = htmlAttributes.dir;
  const routeMatch = route.match(/^\/([^/]+)(\/.*)$/);
  const routeLocale = routeMatch?.[1];
  const localeDefinition = localeConfiguration.definitions.find(
    (candidate) => candidate.code === routeLocale,
  );
  const chapterRoute = route.match(
    /^\/([^/]+)\/course\/(\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*)\/$/,
  );
  let activeChapterLocales = null;
  if (chapterRoute && chapterLocaleConfiguration) {
    try {
      activeChapterLocales = activeLocalesForChapter(
        chapterLocaleConfiguration,
        chapterRoute[2],
      );
    } catch (error) {
      issues.push(relativePath + ': ' + error.message);
      activeChapterLocales = [];
    }
  }
  const equivalentDefinitions = activeChapterLocales
    ? localeConfiguration.definitions.filter((definition) =>
        activeChapterLocales.includes(definition.code),
      )
    : localeConfiguration.definitions;
  const alternateLinks = [...source.matchAll(/<link\b[^>]*>/g)]
    .map((match) => attributes(match[0]))
    .filter((entry) => entry.rel?.split(/\s+/).includes('alternate'));
  const alternatesByLanguage = new Map();
  for (const alternate of alternateLinks) {
    if (!alternate.hreflang || !alternate.href) {
      issues.push(
        relativePath +
          ': every alternate link must contain non-empty hreflang and href attributes',
      );
      continue;
    }
    const entries = alternatesByLanguage.get(alternate.hreflang) ?? [];
    entries.push(alternate.href);
    alternatesByLanguage.set(alternate.hreflang, entries);
  }
  const anchorEntries = [...source.matchAll(/<a\b[^>]*>/g)].map((match) =>
    attributes(match[0]),
  );
  const anchorHrefs = anchorEntries.map((entry) => entry.href).filter(Boolean);
  const expectedAlternateTags = new Set([
    ...equivalentDefinitions.map((definition) => definition.languageTag),
    'x-default',
  ]);
  for (const alternate of alternatesByLanguage.keys()) {
    if (!expectedAlternateTags.has(alternate)) {
      issues.push(relativePath + ': unexpected hreflang "' + alternate + '"');
    }
  }
  for (const tag of expectedAlternateTags) {
    const count = alternatesByLanguage.get(tag)?.length ?? 0;
    if (count !== 1) {
      issues.push(
        relativePath +
          ': expected exactly one hreflang ' +
          tag +
          '; found ' +
          count,
      );
    }
  }
  const alternateHref = (tag) =>
    alternatesByLanguage.get(tag)?.length === 1
      ? alternatesByLanguage.get(tag)[0]
      : undefined;

  if (route === '/') {
    if (language !== 'mul') {
      issues.push(relativePath + ': root language chooser must use html lang="mul"');
    }
    for (const definition of localeConfiguration.definitions) {
      const expected = siteReference('/' + definition.code + '/', siteBase);
      if (alternateHref(definition.languageTag) !== expected) {
        issues.push(
          relativePath +
            ': expected hreflang ' +
            definition.languageTag +
            ' to point to ' +
            expected,
        );
      }
      if (!anchorHrefs.includes(expected)) {
        issues.push(
          relativePath + ': root language chooser must link to ' + expected,
        );
      }
    }
    if (alternateHref('x-default') !== siteBase) {
      issues.push(
        relativePath + ': expected hreflang x-default to point to ' + siteBase,
      );
    }
    return;
  }

  if (!localeDefinition) return;
  const suffix = routeMatch[2];
  if (
    activeChapterLocales &&
    !activeChapterLocales.includes(localeDefinition.code)
  ) {
    issues.push(
      relativePath + ': generated chapter route is inactive for locale ' +
        localeDefinition.code,
    );
  }
  if (language !== localeDefinition.languageTag) {
    issues.push(
      relativePath +
        ': html lang="' +
        language +
        '" does not match route locale ' +
        localeDefinition.code,
    );
  }
  if (direction !== localeDefinition.direction) {
    issues.push(
      relativePath +
        ': html dir="' +
        direction +
        '" does not match locale direction ' +
        localeDefinition.direction,
    );
  }
  for (const alternate of equivalentDefinitions) {
    const expected = siteReference('/' + alternate.code + suffix, siteBase);
    if (alternateHref(alternate.languageTag) !== expected) {
      issues.push(
        relativePath +
          ': expected hreflang ' +
          alternate.languageTag +
          ' to point to ' +
          expected,
      );
    }
  }
  for (const alternate of localeConfiguration.definitions) {
    if (alternate.code === localeDefinition.code) continue;
    const equivalent =
      !activeChapterLocales || activeChapterLocales.includes(alternate.code);
    const expected = equivalent
      ? siteReference('/' + alternate.code + suffix, siteBase)
      : siteReference('/' + alternate.code + '/course/', siteBase);
    if (equivalent) {
      if (!anchorHrefs.includes(expected)) {
        issues.push(
          relativePath + ': locale switch must include an ordinary link to ' + expected,
        );
      }
    } else {
      const fallbackLinks = anchorEntries.filter(
        (entry) => entry['data-locale'] === alternate.code,
      );
      if (fallbackLinks.length !== 1) {
        issues.push(
          relativePath +
            ': locale switch must include exactly one fallback link for ' +
            alternate.code,
        );
      }
      const fallback = fallbackLinks[0];
      if (fallback?.href !== expected) {
        issues.push(
          relativePath +
            ': fallback link for ' +
            alternate.code +
            ' must point to ' +
            expected,
        );
      }
      if (fallback?.['data-locale-fallback'] !== 'course-index') {
        issues.push(
          relativePath +
            ': fallback link for ' +
            alternate.code +
            ' must set data-locale-fallback="course-index"',
        );
      }
      if (
        fallback?.lang !== alternate.languageTag ||
        fallback?.hreflang !== alternate.languageTag ||
        fallback?.dir !== alternate.direction
      ) {
        issues.push(
          relativePath +
            ': fallback link for ' +
            alternate.code +
            ' must declare its target lang, hreflang, and dir',
        );
      }
      const fallbackName = fallback?.['aria-label']?.trim();
      if (!fallbackName || fallbackName === alternate.nativeName) {
        issues.push(
          relativePath +
            ': fallback link for ' +
            alternate.code +
            ' must provide an accessible fallback name',
        );
      }
      const unavailable = siteReference('/' + alternate.code + suffix, siteBase);
      if (anchorHrefs.includes(unavailable)) {
        issues.push(
          relativePath + ': inactive locale switch must not link to ' + unavailable,
        );
      }
    }
  }
  if (alternateHref('x-default') !== siteBase) {
    issues.push(
      relativePath +
        ': localized page must include hreflang x-default="' +
        siteBase +
        '"',
    );
  }
}

function validateLocalizedCourseEntry(
  relativePath,
  source,
  issues,
  localeConfiguration,
  siteBase,
) {
  const route = htmlRoute(relativePath);
  const localeMatch = route.match(/^\/([^/]+)\/$/);
  if (!localeMatch) return;
  if (!localeConfiguration.locales.includes(localeMatch[1])) return;

  const expected = siteReference('/' + localeMatch[1] + '/course/', siteBase);
  const anchorHrefs = [...source.matchAll(/<a\b[^>]*>/g)]
    .map((match) => attributes(match[0]).href)
    .filter(Boolean);

  if (!anchorHrefs.includes(expected)) {
    issues.push(
      relativePath +
        ': localized home must include an ordinary link to ' +
        expected,
    );
  }
}

/**
 * @param {string} distDirectory
 * @param {*} localeConfiguration
 * @param {{
 *   basePath?: string,
 *   chapterLocaleConfiguration?: *,
 *   seoExpectations?: Map<string, string>,
 *   sitemapUrl?: string,
 *   googleAnalyticsMeasurementId?: string
 * }} options
 */
export function auditStaticSite(
  distDirectory,
  localeConfiguration = LOCALE_CONFIGURATION,
  {
    basePath = '/',
    chapterLocaleConfiguration = undefined,
    seoExpectations = undefined,
    sitemapUrl = DEFAULT_SITE_URL,
    googleAnalyticsMeasurementId = undefined,
  } = {},
) {
  if (!existsSync(distDirectory)) {
    throw new ContentValidationError([
      'static output does not exist: ' + distDirectory + '; run the production build first',
    ]);
  }

  const absoluteDist = nodePath.resolve(distDirectory);
  const siteBase = normalizeSiteBase(basePath);
  const files = listFiles(absoluteDist);
  const knownFiles = new Set(
    files.map((filePath) =>
      nodePath.relative(absoluteDist, filePath).replaceAll('\\', '/'),
    ),
  );
  const issues = [];
  const analyticsEnabled = googleAnalyticsMeasurementId !== undefined;
  const analyticsMeasurementIdIsValid =
    typeof googleAnalyticsMeasurementId === 'string' &&
    /^G-[A-Z0-9]+$/.test(googleAnalyticsMeasurementId);
  if (analyticsEnabled && !analyticsMeasurementIdIsValid) {
    issues.push(
      'Google Analytics measurement ID must match G-[A-Z0-9]+',
    );
  }
  let referenceCount = 0;
  let htmlCount = 0;
  let analyticsRouteCount = 0;
  const htmlDocuments = [];

  for (const filePath of files) {
    const relative = nodePath
      .relative(absoluteDist, filePath)
      .replaceAll('\\', '/');
    const extension = nodePath.extname(filePath);
    if (!['.html', '.css'].includes(extension)) continue;
    const source = readFileSync(filePath, 'utf8');
    const references =
      extension === '.html' ? referencesFromHtml(source) : referencesFromCss(source);

    if (extension === '.html') {
      htmlCount += 1;
      htmlDocuments.push({ relativePath: relative, source });
      issues.push(...mathmlCompatibilityIssues(relative, source));
      validateHreflang(
        relative,
        source,
        issues,
        localeConfiguration,
        siteBase,
        chapterLocaleConfiguration,
      );
      validateLocalizedCourseEntry(
        relative,
        source,
        issues,
        localeConfiguration,
        siteBase,
      );
      if (analyticsMeasurementIdIsValid) {
        validateGoogleAnalytics(
          relative,
          source,
          googleAnalyticsMeasurementId,
          issues,
        );
        analyticsRouteCount += 1;
      }
    }

    for (const reference of references) {
      const candidates = referenceCandidates(reference, relative, siteBase);
      if (Array.isArray(candidates) && candidates.length === 0) continue;
      referenceCount += 1;
      if (!Array.isArray(candidates)) {
        issues.push(relative + ': "' + reference + '" ' + candidates.error);
        continue;
      }
      if (!candidates.some((candidate) => knownFiles.has(candidate))) {
        issues.push(
          relative +
            ': local reference "' +
            reference +
            '" resolves to no static file (tried ' +
            candidates.join(', ') +
            ')',
        );
      }
    }
  }

  if (htmlCount === 0) {
    issues.push('static output contains no HTML files');
  }
  const normalizedSeoExpectations =
    seoExpectations === undefined
      ? null
      : validateSeoRouteMatrix(htmlDocuments, seoExpectations, issues);
  const sitemapRouteCount = normalizedSeoExpectations
    ? validateSitemapArtifact(
        absoluteDist,
        knownFiles,
        [...normalizedSeoExpectations.keys()],
        sitemapUrl,
        issues,
      )
    : 0;
  if (issues.length > 0) {
    throw new ContentValidationError(issues, 'Static link and asset audit failed');
  }

  const result = {
    fileCount: files.length,
    htmlCount,
    referenceCount,
  };
  if (normalizedSeoExpectations) {
    result.seoRouteCount = normalizedSeoExpectations.size;
    result.sitemapRouteCount = sitemapRouteCount;
  }
  if (analyticsEnabled) {
    result.analyticsRouteCount = analyticsRouteCount;
  }
  return result;
}

export function runStaticLinkCheck(cwd = process.cwd()) {
  const repositoryRoot = repositoryRootFromCwd(cwd);
  const chapterLocaleConfiguration = readChapterLocaleConfiguration(
    repositoryRoot,
    LOCALE_CONFIGURATION,
  );
  const seoExpectations = deriveSeoExpectations(
    repositoryRoot,
    LOCALE_CONFIGURATION,
    chapterLocaleConfiguration,
  );
  return auditStaticSite(
    nodePath.join(repositoryRoot, 'site/dist'),
    LOCALE_CONFIGURATION,
    {
      basePath: process.env.SITE_BASE ?? '/',
      chapterLocaleConfiguration,
      seoExpectations,
      sitemapUrl: process.env.SITE_URL ?? DEFAULT_SITE_URL,
      googleAnalyticsMeasurementId: GOOGLE_ANALYTICS_MEASUREMENT_ID,
    },
  );
}

function isMainModule() {
  return (
    process.argv[1] &&
    nodePath.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  try {
    const result = runStaticLinkCheck();
    console.log(
      'Static link check passed: ' +
        result.htmlCount +
        ' HTML file(s), ' +
        result.referenceCount +
        ' local reference(s), ' +
        result.seoRouteCount +
        ' SEO route(s), ' +
        result.sitemapRouteCount +
        ' sitemap URL(s), ' +
        result.analyticsRouteCount +
        ' analytics route(s), ' +
        result.fileCount +
        ' total artifact(s).',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
