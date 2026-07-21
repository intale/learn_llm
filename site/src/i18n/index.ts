import { sitePath } from '../lib/site-path';
import localeManifest from './locales.json';
import { messageKeys, type Messages } from './messages';

export type Locale = keyof typeof localeManifest.locales;
export type TextDirection = 'ltr' | 'rtl';

export interface LocaleDefinition {
  code: Locale;
  languageTag: string;
  nativeName: string;
  direction: TextDirection;
}

interface LocaleManifestShape {
  defaultLocale: string;
  locales: Record<
    string,
    { languageTag: string; nativeName: string; direction: TextDirection }
  >;
}

const localeCodePattern = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function validateLocaleManifest(value: unknown): LocaleManifestShape {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Locale manifest must be an object.');
  }
  const manifest = value as Partial<LocaleManifestShape>;
  if (
    typeof manifest.defaultLocale !== 'string' ||
    manifest.locales === null ||
    typeof manifest.locales !== 'object' ||
    Array.isArray(manifest.locales)
  ) {
    throw new Error('Locale manifest requires defaultLocale and a locales object.');
  }

  const entries = Object.entries(manifest.locales);
  if (entries.length === 0 || !(manifest.defaultLocale in manifest.locales)) {
    throw new Error('Locale manifest defaultLocale must name a configured locale.');
  }
  const languageTags = new Set<string>();
  for (const [code, definition] of entries) {
    if (!localeCodePattern.test(code)) {
      throw new Error(`Locale code "${code}" is not URL-safe BCP-47-style syntax.`);
    }
    if (
      definition === null ||
      typeof definition !== 'object' ||
      !localeCodePattern.test(definition.languageTag ?? '') ||
      typeof definition.nativeName !== 'string' ||
      definition.nativeName.trim() === '' ||
      !['ltr', 'rtl'].includes(definition.direction)
    ) {
      throw new Error(`Locale "${code}" has invalid language metadata.`);
    }
    const normalizedTag = definition.languageTag.toLowerCase();
    if (languageTags.has(normalizedTag)) {
      throw new Error(`Locale language tag "${definition.languageTag}" is duplicated.`);
    }
    languageTags.add(normalizedTag);
  }
  return manifest as LocaleManifestShape;
}

const validatedManifest = validateLocaleManifest(localeManifest);

export const defaultLocale = validatedManifest.defaultLocale as Locale;
export const locales = Object.freeze(
  Object.keys(validatedManifest.locales) as Locale[],
);
export const localeDefinitions: readonly LocaleDefinition[] = Object.freeze(
  locales.map((code) => ({ code, ...validatedManifest.locales[code] })),
);

export function validateMessageCatalog(
  value: unknown,
  sourceName = 'message catalog',
): Messages {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${sourceName} must be an object.`);
  }
  const catalog = value as Record<string, unknown>;
  const actualKeys = Object.keys(catalog).sort();
  const expectedKeys = [...messageKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`${sourceName} keys must be exactly ${expectedKeys.join(', ')}.`);
  }
  for (const key of messageKeys) {
    if (typeof catalog[key] !== 'string' || catalog[key].trim() === '') {
      throw new Error(`${sourceName}.${key} must be a non-empty string.`);
    }
  }
  return catalog as Messages;
}

const catalogModules = import.meta.glob<{ default: unknown }>(
  './catalogs/*.json',
  { eager: true },
);

export const messages = Object.freeze(
  Object.fromEntries(
    locales.map((locale) => {
      const module = catalogModules[`./catalogs/${locale}.json`];
      if (!module) {
        throw new Error(`Configured locale "${locale}" is missing its message catalog.`);
      }
      return [
        locale,
        validateMessageCatalog(module.default, `Message catalog "${locale}"`),
      ];
    }),
  ) as Record<Locale, Messages>,
);

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

export function getLocaleDefinition(locale: Locale): LocaleDefinition {
  const definition = localeDefinitions.find((candidate) => candidate.code === locale);
  if (!definition) throw new Error(`Missing locale definition for "${locale}".`);
  return definition;
}

export function alternateLocales(locale: Locale): readonly LocaleDefinition[] {
  return localeDefinitions.filter((candidate) => candidate.code !== locale);
}

export function localePath(locale: Locale, suffix = '/'): string {
  const normalizedSuffix =
    suffix === '' || suffix === '/' ? '/' : `/${suffix.replace(/^\/+/, '')}`;
  return sitePath(`/${locale}${normalizedSuffix}`);
}

export function switchLocalePathForLocales(
  path: string,
  targetLocale: string,
  configuredLocales: readonly string[],
): string {
  if (
    configuredLocales.length === 0 ||
    new Set(configuredLocales).size !== configuredLocales.length ||
    !configuredLocales.includes(targetLocale)
  ) {
    throw new Error('Route locales must be unique and include the target locale.');
  }
  const firstSegment = path.match(/^\/([^/?#]+)(?=\/|[?#]|$)/)?.[1];

  if (firstSegment && configuredLocales.includes(firstSegment)) {
    return `/${targetLocale}${path.slice(firstSegment.length + 1)}`;
  }

  const normalizedSuffix =
    path === '' || path === '/' ? '/' : `/${path.replace(/^\/+/, '')}`;
  return `/${targetLocale}${normalizedSuffix}`;
}

export function switchLocalePath(path: string, targetLocale: Locale): string {
  return sitePath(switchLocalePathForLocales(path, targetLocale, locales));
}

export type { Messages } from './messages';
