import { describe, expect, it } from 'vitest';

import { en } from '../src/i18n/en';
import { getMessages, isLocale, localePath, messages, otherLocale, switchLocalePath } from '../src/i18n';
import { ru } from '../src/i18n/ru';

describe('localized message catalogs', () => {
  it('keeps English and Russian keys in exact parity', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
    expect(messages.en).toBe(en);
    expect(messages.ru).toBe(ru);
  });

  it('recognizes only the supported locales', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(getMessages('ru').languageName).toBe('Русский');
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
    expect(otherLocale('en')).toBe('ru');
    expect(otherLocale('ru')).toBe('en');
  });
});
