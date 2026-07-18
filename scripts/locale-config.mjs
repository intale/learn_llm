import { readFileSync } from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALE_CODE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const EXPECTED_DEFINITION_KEYS = Object.freeze([
  'direction',
  'languageTag',
  'nativeName',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateLocaleConfiguration(
  value,
  sourceName = 'site/src/i18n/locales.json',
) {
  const issues = [];
  if (!isObject(value)) {
    throw new Error(sourceName + ': locale configuration must be an object');
  }
  if (!isObject(value.locales) || Object.keys(value.locales).length === 0) {
    issues.push('locales must be a non-empty object');
  }
  const localeEntries = isObject(value.locales) ? Object.entries(value.locales) : [];
  if (
    typeof value.defaultLocale !== 'string' ||
    !Object.hasOwn(value.locales ?? {}, value.defaultLocale)
  ) {
    issues.push('defaultLocale must name one configured locale');
  }

  const languageTags = new Set();
  for (const [code, definition] of localeEntries) {
    if (!LOCALE_CODE_PATTERN.test(code)) {
      issues.push('locale code "' + code + '" is not URL-safe BCP-47-style syntax');
    }
    if (!isObject(definition)) {
      issues.push('locale "' + code + '" metadata must be an object');
      continue;
    }
    const keys = Object.keys(definition).sort();
    if (JSON.stringify(keys) !== JSON.stringify(EXPECTED_DEFINITION_KEYS)) {
      issues.push(
        'locale "' + code + '" metadata keys must be exactly ' +
          EXPECTED_DEFINITION_KEYS.join(', '),
      );
    }
    if (!LOCALE_CODE_PATTERN.test(definition.languageTag ?? '')) {
      issues.push('locale "' + code + '" requires a valid languageTag');
    } else {
      const normalized = definition.languageTag.toLowerCase();
      if (languageTags.has(normalized)) {
        issues.push('languageTag "' + definition.languageTag + '" is duplicated');
      }
      languageTags.add(normalized);
    }
    if (typeof definition.nativeName !== 'string' || definition.nativeName.trim() === '') {
      issues.push('locale "' + code + '" requires a non-empty nativeName');
    }
    if (definition.direction !== 'ltr' && definition.direction !== 'rtl') {
      issues.push('locale "' + code + '" direction must be "ltr" or "rtl"');
    }
  }

  if (issues.length > 0) {
    throw new Error(sourceName + ': invalid locale configuration:\n- ' + issues.join('\n- '));
  }

  const locales = Object.freeze(localeEntries.map(([code]) => code));
  const definitions = Object.freeze(
    localeEntries.map(([code, metadata]) => Object.freeze({ code, ...metadata })),
  );
  return Object.freeze({
    defaultLocale: value.defaultLocale,
    locales,
    definitions,
  });
}

export function readLocaleConfiguration(repositoryRoot) {
  const path = nodePath.join(repositoryRoot, 'site/src/i18n/locales.json');
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(path + ': cannot read locale configuration: ' + error.message);
  }
  let value;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new Error(path + ': invalid JSON: ' + error.message);
  }
  return validateLocaleConfiguration(value, path);
}

const scriptDirectory = nodePath.dirname(fileURLToPath(import.meta.url));
const canonicalRepositoryRoot = nodePath.resolve(scriptDirectory, '..');
export const LOCALE_CONFIGURATION = readLocaleConfiguration(
  canonicalRepositoryRoot,
);
export const SUPPORTED_LOCALES = LOCALE_CONFIGURATION.locales;
export const LOCALE_DEFINITIONS = LOCALE_CONFIGURATION.definitions;
export const REFERENCE_LOCALE = LOCALE_CONFIGURATION.defaultLocale;
