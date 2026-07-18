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

describe('localized message catalogs', () => {
  it('loads one exact-shape catalog for every configured locale', () => {
    expect(Object.keys(messages.en).sort()).toEqual(
      Object.keys(messages.ru).sort(),
    );
    expect(Object.keys(messages).sort()).toEqual([...locales].sort());
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
