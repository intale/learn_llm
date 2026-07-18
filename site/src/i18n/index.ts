import { en, type Messages } from './en';
import { ru } from './ru';

export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const messages: Readonly<Record<Locale, Messages>> = { en, ru };

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'ru' : 'en';
}

export function localePath(locale: Locale, suffix = '/'): string {
  const normalizedSuffix = suffix === '' || suffix === '/' ? '/' : `/${suffix.replace(/^\/+/, '')}`;
  return `/${locale}${normalizedSuffix}`;
}

export function switchLocalePath(path: string, targetLocale: Locale): string {
  const localePrefix = /^\/(en|ru)(?=\/|$)/;

  if (localePrefix.test(path)) {
    return path.replace(localePrefix, `/${targetLocale}`);
  }

  return localePath(targetLocale, path);
}
