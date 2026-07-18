#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ContentValidationError,
  repositoryRootFromCwd,
} from './check-site-content.mjs';

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

export function referenceCandidates(reference, ownerRelativePath) {
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
  let relative = cleaned.startsWith('/')
    ? cleaned.slice(1)
    : nodePath.posix.join(ownerDirectory, cleaned);
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

function validateHreflang(relativePath, source, issues) {
  const route = htmlRoute(relativePath);
  const htmlTag = source.match(/<html\b[^>]*>/);
  const language = htmlTag ? attributes(htmlTag[0]).lang : undefined;
  const localeMatch = route.match(/^\/(en|ru)(\/.*)$/);
  const alternateLinks = [...source.matchAll(/<link\b[^>]*>/g)]
    .map((match) => attributes(match[0]))
    .filter((entry) => entry.rel?.split(/\s+/).includes('alternate'));
  const alternates = new Map(
    alternateLinks
      .filter((entry) => entry.hreflang && entry.href)
      .map((entry) => [entry.hreflang, entry.href]),
  );

  if (route === '/') {
    if (language !== 'mul') {
      issues.push(relativePath + ': root language chooser must use html lang="mul"');
    }
    for (const [locale, expected] of [
      ['en', '/en/'],
      ['ru', '/ru/'],
      ['x-default', '/'],
    ]) {
      if (alternates.get(locale) !== expected) {
        issues.push(
          relativePath +
            ': expected hreflang ' +
            locale +
            ' to point to ' +
            expected,
        );
      }
    }
    return;
  }

  if (!localeMatch) return;
  const locale = localeMatch[1];
  const suffix = localeMatch[2];
  if (language !== locale) {
    issues.push(
      relativePath + ': html lang="' + language + '" does not match route locale ' + locale,
    );
  }
  for (const alternateLocale of ['en', 'ru']) {
    const expected = '/' + alternateLocale + suffix;
    if (alternates.get(alternateLocale) !== expected) {
      issues.push(
        relativePath +
          ': expected hreflang ' +
          alternateLocale +
          ' to point to ' +
          expected,
      );
    }
  }
  if (alternates.get('x-default') !== '/') {
    issues.push(relativePath + ': localized page must include hreflang x-default="/"');
  }
}

export function auditStaticSite(distDirectory) {
  if (!existsSync(distDirectory)) {
    throw new ContentValidationError([
      'static output does not exist: ' + distDirectory + '; run the production build first',
    ]);
  }

  const absoluteDist = nodePath.resolve(distDirectory);
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
      validateHreflang(relative, source, issues);
    }

    for (const reference of references) {
      const candidates = referenceCandidates(reference, relative);
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
  return auditStaticSite(nodePath.join(repositoryRoot, 'site/dist'));
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
