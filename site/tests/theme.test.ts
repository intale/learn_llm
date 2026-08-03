// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  COLOR_THEMES,
  DARK_THEME_MEDIA,
  THEME_STORAGE_KEY,
  isColorTheme,
  readStoredTheme,
  resolveColorTheme,
} from '../src/lib/theme';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), 'utf8');

describe('shared color theme', () => {
  it('accepts only one locale-independent light or dark preference', () => {
    expect(COLOR_THEMES).toEqual(['light', 'dark']);
    expect(THEME_STORAGE_KEY).toBe('learn-llm-color-theme');
    expect(DARK_THEME_MEDIA).toBe('(prefers-color-scheme: dark)');

    expect(isColorTheme('light')).toBe(true);
    expect(isColorTheme('dark')).toBe(true);
    expect(isColorTheme('sepia')).toBe(false);
    expect(isColorTheme(null)).toBe(false);
    expect(resolveColorTheme(null, false)).toBe('light');
    expect(resolveColorTheme(undefined, true)).toBe('dark');
    expect(resolveColorTheme('light', true)).toBe('light');
    expect(resolveColorTheme('dark', false)).toBe('dark');
  });

  it('rejects invalid or inaccessible stored values without throwing', () => {
    expect(readStoredTheme({ getItem: () => 'light' })).toBe('light');
    expect(readStoredTheme({ getItem: () => 'dark' })).toBe('dark');
    expect(readStoredTheme({ getItem: () => 'contrast' })).toBeNull();
    expect(readStoredTheme(null)).toBeNull();
    expect(
      readStoredTheme({
        getItem() {
          throw new Error('storage denied');
        },
      }),
    ).toBeNull();
  });

  it('renders one progressive button from locale catalogs and no theme link', () => {
    const layout = read('site/src/layouts/BaseLayout.astro');
    const rootPage = read('site/src/pages/index.astro');
    const toggle = read('site/src/components/ThemeToggle.astro');
    const bootstrap = read('site/src/components/ThemeBootstrap.astro');
    const english = JSON.parse(
      read('site/src/i18n/catalogs/en.json'),
    ) as Record<string, string>;
    const russian = JSON.parse(
      read('site/src/i18n/catalogs/ru.json'),
    ) as Record<string, string>;

    expect(english.darkThemeLabel).toBe('Dark theme');
    expect(russian.darkThemeLabel).toBe('Тёмная тема');
    expect(Object.keys(russian).sort()).toEqual(Object.keys(english).sort());
    expect(layout).toContain('<ThemeToggle label={copy.darkThemeLabel} />');
    expect(layout).toContain('<ThemeBootstrap />');
    expect(rootPage).toContain('<ThemeBootstrap />');
    expect(layout).toContain('data-theme-storage-key={THEME_STORAGE_KEY}');
    expect(rootPage).toContain('data-theme-storage-key={THEME_STORAGE_KEY}');
    expect(layout).toContain('<meta name="color-scheme" content="light dark" />');
    expect(rootPage).toContain('<meta name="color-scheme" content="light dark" />');

    expect(toggle).toMatch(/<button[\s\S]*type="button"/);
    expect(toggle).toContain('aria-pressed="false"');
    expect(toggle).toContain('data-theme-toggle');
    expect(toggle).toContain('hidden');
    expect(toggle).toContain('class="theme-toggle__state"');
    expect(toggle).toContain("[aria-pressed='true'] .theme-toggle__state");
    expect(toggle).toContain('overflow-wrap: anywhere');
    expect(toggle).not.toMatch(/<a\b|href=|rel=|nofollow/i);
    expect(bootstrap).toContain('window.localStorage.getItem');
    expect(bootstrap).toContain('root.dataset.theme = storedTheme');
    expect(bootstrap).toContain('delete root.dataset.theme');
    expect(bootstrap).not.toContain('matchMedia');
    expect(bootstrap).not.toMatch(/location|history|document\.cookie|URLSearchParams/);
  });

  it('uses shared theme surfaces rather than a chapter-local dark palette', () => {
    const globalStyles = read('site/src/styles/global.css');
    const diagramStyles = read('site/src/styles/diagram.module.css');
    const chapterComponents = read('site/src/components/chapters/LlmSystemDiagram.astro');

    expect(globalStyles).toContain('color-scheme: light dark');
    expect(globalStyles).toContain(":root[data-theme='light']");
    expect(globalStyles).toContain(":root[data-theme='dark']");
    expect(globalStyles).toContain('light-dark(#f7f4ec, #2b2b2b)');
    expect(globalStyles).toContain('--accent-ink:');
    expect(globalStyles).toContain('--accent-fill:');
    expect(globalStyles).toContain('--on-accent:');
    expect(globalStyles).toContain('--diagram-frame-surface:');
    expect(diagramStyles).toContain('var(--diagram-frame-surface)');
    expect(diagramStyles).toContain('var(--diagram-panel-surface)');
    expect(diagramStyles).toContain('var(--diagram-raised-surface)');
    expect(diagramStyles).not.toMatch(/color-mix\([^)]*\bwhite\b/i);
    expect(chapterComponents).not.toMatch(/data-theme|prefers-color-scheme/);
  });
});
