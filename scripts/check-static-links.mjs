#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ContentValidationError,
  repositoryRootFromCwd,
} from './check-site-content.mjs';
import { LOCALE_CONFIGURATION } from './locale-config.mjs';
import {
  activeLocalesForChapter,
  readChapterLocaleConfiguration,
} from './chapter-locale-config.mjs';

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
 * @param {{basePath?: string, chapterLocaleConfiguration?: *}} options
 */
export function auditStaticSite(
  distDirectory,
  localeConfiguration = LOCALE_CONFIGURATION,
  { basePath = '/', chapterLocaleConfiguration = undefined } = {},
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
  let referenceCount = 0;
  let htmlCount = 0;

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
  if (issues.length > 0) {
    throw new ContentValidationError(issues, 'Static link and asset audit failed');
  }

  return {
    fileCount: files.length,
    htmlCount,
    referenceCount,
  };
}

export function runStaticLinkCheck(cwd = process.cwd()) {
  const repositoryRoot = repositoryRootFromCwd(cwd);
  const chapterLocaleConfiguration = readChapterLocaleConfiguration(
    repositoryRoot,
    LOCALE_CONFIGURATION,
  );
  return auditStaticSite(
    nodePath.join(repositoryRoot, 'site/dist'),
    LOCALE_CONFIGURATION,
    {
      basePath: process.env.SITE_BASE ?? '/',
      chapterLocaleConfiguration,
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
        result.fileCount +
        ' total artifact(s).',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
