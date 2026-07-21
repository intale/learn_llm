import { readFileSync } from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LOCALE_CONFIGURATION,
  readLocaleConfiguration,
} from './locale-config.mjs';

const CHAPTER_ID_PATTERN = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const POLICY_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ROOT_KEYS = Object.freeze([
  'chapters',
  'planId',
  'planRevision',
  'policyId',
  'referenceLocale',
  'schemaVersion',
]);
const CHAPTER_KEYS = Object.freeze(['activeLocales', 'chapterId', 'order']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return (
    isObject(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected)
  );
}

export function validateChapterLocaleConfiguration(
  value,
  localeConfiguration = LOCALE_CONFIGURATION,
  sourceName = 'site/src/i18n/chapter-locales.json',
) {
  const issues = [];
  if (!isObject(value)) {
    throw new Error(sourceName + ': chapter-locale configuration must be an object');
  }
  if (!exactKeys(value, ROOT_KEYS)) {
    issues.push('root keys must be exactly ' + ROOT_KEYS.join(', '));
  }
  if (value.schemaVersion !== 1) {
    issues.push('schemaVersion must equal 1');
  }
  if (typeof value.planId !== 'string' || !POLICY_ID_PATTERN.test(value.planId)) {
    issues.push('planId must be a lowercase kebab-case identifier');
  }
  if (!Number.isInteger(value.planRevision) || value.planRevision < 1) {
    issues.push('planRevision must be a positive integer');
  }
  if (
    typeof value.policyId !== 'string' ||
    !POLICY_ID_PATTERN.test(value.policyId)
  ) {
    issues.push('policyId must be a lowercase kebab-case identifier');
  }
  if (value.referenceLocale !== localeConfiguration.defaultLocale) {
    issues.push('referenceLocale must equal the registered default locale');
  }
  if (!Array.isArray(value.chapters) || value.chapters.length === 0) {
    issues.push('chapters must be a non-empty array');
  }

  const registered = new Set(localeConfiguration.locales);
  const chapterIds = new Set();
  const orders = new Set();
  const chapters = [];
  for (const [index, chapter] of (
    Array.isArray(value.chapters) ? value.chapters : []
  ).entries()) {
    const label = 'chapters[' + index + ']';
    if (!exactKeys(chapter, CHAPTER_KEYS)) {
      issues.push(label + ' keys must be exactly ' + CHAPTER_KEYS.join(', '));
      continue;
    }
    if (!CHAPTER_ID_PATTERN.test(chapter.chapterId ?? '')) {
      issues.push(label + '.chapterId must match NN-lowercase-kebab-case');
    }
    if (chapterIds.has(chapter.chapterId)) {
      issues.push('chapterId "' + chapter.chapterId + '" is duplicated');
    }
    chapterIds.add(chapter.chapterId);

    const expectedOrder = index + 1;
    const expectedPrefix = String(expectedOrder).padStart(2, '0') + '-';
    if (
      !Number.isInteger(chapter.order) ||
      chapter.order !== expectedOrder ||
      !String(chapter.chapterId).startsWith(expectedPrefix)
    ) {
      issues.push(label + ' must preserve contiguous plan order ' + expectedOrder);
    }
    if (orders.has(chapter.order)) {
      issues.push('chapter order ' + chapter.order + ' is duplicated');
    }
    orders.add(chapter.order);

    const activeLocales = chapter.activeLocales;
    if (!Array.isArray(activeLocales) || activeLocales.length === 0) {
      issues.push(label + '.activeLocales must be a non-empty array');
    } else {
      if (new Set(activeLocales).size !== activeLocales.length) {
        issues.push(label + '.activeLocales must be unique');
      }
      for (const locale of activeLocales) {
        if (typeof locale !== 'string' || !registered.has(locale)) {
          issues.push(label + ' names unregistered locale "' + locale + '"');
        }
      }
      if (!activeLocales.includes(value.referenceLocale)) {
        issues.push(label + ' must include reference locale ' + value.referenceLocale);
      }
      const registryOrder = localeConfiguration.locales.filter((locale) =>
        activeLocales.includes(locale),
      );
      if (JSON.stringify(activeLocales) !== JSON.stringify(registryOrder)) {
        issues.push(label + '.activeLocales must follow locale registry order');
      }
    }

    chapters.push(
      Object.freeze({
        chapterId: chapter.chapterId,
        order: chapter.order,
        activeLocales: Object.freeze([...(activeLocales ?? [])]),
      }),
    );
  }

  if (issues.length > 0) {
    throw new Error(
      sourceName + ': invalid chapter-locale configuration:\n- ' + issues.join('\n- '),
    );
  }

  const frozenChapters = Object.freeze(chapters);
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    planId: value.planId,
    planRevision: value.planRevision,
    policyId: value.policyId,
    referenceLocale: value.referenceLocale,
    chapters: frozenChapters,
    byChapter: Object.freeze(
      Object.fromEntries(frozenChapters.map((chapter) => [chapter.chapterId, chapter])),
    ),
  });
}

export function readChapterLocaleConfiguration(
  repositoryRoot,
  localeConfiguration = readLocaleConfiguration(repositoryRoot),
) {
  const path = nodePath.join(
    repositoryRoot,
    'site/src/i18n/chapter-locales.json',
  );
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(path + ': cannot read chapter-locale configuration: ' + error.message);
  }
  let value;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new Error(path + ': invalid JSON: ' + error.message);
  }
  return validateChapterLocaleConfiguration(value, localeConfiguration, path);
}

export function validateChapterLocaleProjectionAgainstPlan(
  configuration,
  planMetadata,
  sourceName = 'site/src/i18n/chapter-locales.json',
) {
  const issues = [];
  const policy = planMetadata.chapter_locale_policy;
  const plannedChapters = planMetadata.chapters;
  if (configuration.planId !== planMetadata.plan_id) {
    issues.push('planId differs from course plan plan_id');
  }
  if (configuration.planRevision !== planMetadata.plan_revision) {
    issues.push(
      'planRevision ' +
        configuration.planRevision +
        ' differs from course plan revision ' +
        planMetadata.plan_revision,
    );
  }
  if (configuration.policyId !== policy?.policy_id) {
    issues.push('policyId differs from chapter_locale_policy.policy_id');
  }
  if (configuration.referenceLocale !== policy?.reference_locale) {
    issues.push('referenceLocale differs from chapter_locale_policy.reference_locale');
  }
  if (!Array.isArray(plannedChapters)) {
    issues.push('course plan chapters must be an array');
  } else if (configuration.chapters.length !== plannedChapters.length) {
    issues.push(
      'chapter count differs: projection=' +
        configuration.chapters.length +
        ', plan=' +
        plannedChapters.length,
    );
  }

  for (const [index, planned] of (plannedChapters ?? []).entries()) {
    const projected = configuration.chapters[index];
    if (!projected) {
      issues.push('missing projection for ' + planned.chapter_id);
      continue;
    }
    if (
      projected.chapterId !== planned.chapter_id ||
      projected.order !== planned.order
    ) {
      issues.push(
        'projection position ' +
          (index + 1) +
          ' differs from planned chapter ' +
          planned.chapter_id,
      );
    }
    if (
      JSON.stringify(projected.activeLocales) !==
      JSON.stringify(planned.active_locales)
    ) {
      issues.push(
        planned.chapter_id +
          ': activeLocales differ from the authoritative course plan',
      );
    }
  }

  if (issues.length > 0) {
    throw new Error(sourceName + ': chapter-locale projection drift:\n- ' + issues.join('\n- '));
  }
  return configuration;
}

export function activeLocalesForChapter(configuration, chapterId) {
  const chapter = configuration.byChapter[chapterId];
  if (!chapter) {
    throw new Error('chapter-locale configuration has no chapter "' + chapterId + '"');
  }
  return chapter.activeLocales;
}

const scriptDirectory = nodePath.dirname(fileURLToPath(import.meta.url));
const canonicalRepositoryRoot = nodePath.resolve(scriptDirectory, '..');
export const CHAPTER_LOCALE_CONFIGURATION = readChapterLocaleConfiguration(
  canonicalRepositoryRoot,
);
