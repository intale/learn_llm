import { describe, expect, it } from 'vitest';

import {
  alternateLocales,
  getLocaleDefinition,
  getMessages,
  isLocale,
  localeDefinitions,
  localePath,
  locales,
  messages,
  switchLocalePath,
  switchLocalePathForLocales,
  validateMessageCatalog,
  validateLocaleManifest,
} from '../src/i18n';
import {
  normalizeSiteBase,
  sitePathForBase,
} from '../src/lib/site-path';

describe('localized message catalogs', () => {
  it('loads one exact-shape catalog for every configured locale', () => {
    expect(Object.keys(messages.en).sort()).toEqual(
      Object.keys(messages.ru).sort(),
    );
    expect(Object.keys(messages).sort()).toEqual([...locales].sort());
  });

  it('provides localized labels for browsing every repository example', () => {
    expect(getMessages('en').repositoryLinkLabel).toBe(
      'Browse all examples on GitHub',
    );
    expect(getMessages('ru').repositoryLinkLabel).toBe(
      'Посмотреть все примеры на GitHub',
    );
  });

  it('rejects blank, missing, or extra catalog values at build time', () => {
    const catalog = { ...messages.en };
    expect(() => validateMessageCatalog(catalog)).not.toThrow();
    expect(() =>
      validateMessageCatalog({ ...catalog, footerNote: '   ' }),
    ).toThrow(/footerNote must be a non-empty string/);
    const { footerNote: _removed, ...missing } = catalog;
    expect(() => validateMessageCatalog(missing)).toThrow(/keys must be exactly/);
    expect(() => validateMessageCatalog({ ...catalog, extra: 'no' })).toThrow(
      /keys must be exactly/,
    );
  });

  it('recognizes only the supported locales', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(getMessages('ru').languagePickerTitle).toBe('Выберите язык');
    expect(getLocaleDefinition('ru').nativeName).toBe('Русский');
    expect(alternateLocales('en').map(({ code }) => code)).toEqual(['ru']);
  });

  it('accepts compound and right-to-left locale metadata without code changes', () => {
    expect(() =>
      validateLocaleManifest({
        defaultLocale: 'en',
        locales: {
          en: { languageTag: 'en', nativeName: 'English', direction: 'ltr' },
          'pt-br': {
            languageTag: 'pt-BR',
            nativeName: 'Português (Brasil)',
            direction: 'ltr',
          },
          'ar-eg': {
            languageTag: 'ar-EG',
            nativeName: 'العربية (مصر)',
            direction: 'rtl',
          },
        },
      }),
    ).not.toThrow();
    expect(localeDefinitions).toHaveLength(2);
  });
});

describe('localized route helpers', () => {
  it('keeps root builds unchanged and prefixes project-site routes exactly once', () => {
    expect(normalizeSiteBase('/')).toBe('/');
    expect(normalizeSiteBase('/learn_llm/')).toBe('/learn_llm/');
    expect(sitePathForBase('/', '/')).toBe('/');
    expect(sitePathForBase('/en/course/', '/')).toBe('/en/course/');
    expect(sitePathForBase('/', '/learn_llm/')).toBe('/learn_llm/');
    expect(sitePathForBase('/en/course/', '/learn_llm/')).toBe(
      '/learn_llm/en/course/',
    );
    expect(
      sitePathForBase(
        '/ru/course/01-text-units/?view=code#formula',
        '/learn_llm/',
      ),
    ).toBe('/learn_llm/ru/course/01-text-units/?view=code#formula');
  });

  it('rejects ambiguous or escaping deployment paths', () => {
    expect(() => normalizeSiteBase('learn_llm/')).toThrow(/start with/);
    expect(() => normalizeSiteBase('/learn_llm')).toThrow(/normalized/);
    expect(() => normalizeSiteBase('/learn_llm/../')).toThrow(/unsafe/);
    expect(() => sitePathForBase('//example.test/path', '/learn_llm/')).toThrow(
      /absolute-path reference/,
    );
    expect(() => sitePathForBase('/../en/', '/learn_llm/')).toThrow(
      /dot segments/,
    );
  });

  it('builds locale-prefixed static paths', () => {
    expect(localePath('en')).toBe('/en/');
    expect(localePath('ru', '/course/01-text-units/')).toBe('/ru/course/01-text-units/');
  });

  it('switches locale without losing the known route suffix, query, or fragment', () => {
    expect(switchLocalePath('/en/course/01-text-units/?view=code#formula', 'ru')).toBe(
      '/ru/course/01-text-units/?view=code#formula',
    );
    expect(switchLocalePath('/course/', 'en')).toBe('/en/course/');
  });

  it('switches among an arbitrary configured locale set, including compound codes', () => {
    const configured = ['en', 'pt-br', 'ar-eg'];
    expect(
      switchLocalePathForLocales(
        '/pt-br/course/01-text-units/?view=code#formula',
        'ar-eg',
        configured,
      ),
    ).toBe('/ar-eg/course/01-text-units/?view=code#formula');
    expect(switchLocalePathForLocales('/course/', 'pt-br', configured)).toBe(
      '/pt-br/course/',
    );
    expect(() =>
      switchLocalePathForLocales('/en/', 'de', configured),
    ).toThrow(/include the target locale/);
  });
});
