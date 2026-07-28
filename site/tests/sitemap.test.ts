// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SITE_URL,
  MAX_SITEMAP_URLS,
  normalizeSitemapRoute,
  normalizeSiteUrl,
  renderSitemapXml,
} from '../sitemap.config.mjs';

describe('sitemap configuration', () => {
  it('passes the complete public project URL through the pinned Docker build', () => {
    const dockerfile = readFileSync(
      new URL('../../Dockerfile', import.meta.url),
      'utf8',
    );
    expect(DEFAULT_SITE_URL).toBe('https://intale.github.io/learn_llm/');
    expect(dockerfile.match(/^ARG SITE_URL=https:\/\/intale\.github\.io\/learn_llm\/$/gm)).toHaveLength(1);
    expect(dockerfile.match(/^ENV SITE_URL=\$\{SITE_URL\}$/gm)).toHaveLength(1);
  });

  it('normalizes a complete HTTPS site URL without dropping its project path', () => {
    expect(normalizeSiteUrl('https://Example.TEST/project')).toBe(
      'https://example.test/project/',
    );
    expect(normalizeSiteUrl('https://example.test:8443/course/')).toBe(
      'https://example.test:8443/course/',
    );

    for (const value of [
      '',
      ' https://example.test',
      'http://example.test',
      'https://user@example.test',
      'https://example.test?query=1',
      'https://example.test#fragment',
      'https://example.test/../other/',
      'https://example.test/project//nested/',
      'https://example.test/project%2Fother/',
      'https://intale.github.io/',
      'https://intale.github.io/another-project/',
    ]) {
      expect(() => normalizeSiteUrl(value)).toThrow(/SITE_URL/);
    }
  });

  it('accepts only normalized logical directory routes', () => {
    expect(normalizeSitemapRoute('/')).toBe('/');
    expect(normalizeSitemapRoute('/en/course/30-multi-head-attention/')).toBe(
      '/en/course/30-multi-head-attention/',
    );

    for (const value of [
      '',
      'en/',
      '/en',
      '//en/',
      '/en/?query=1',
      '/en/#fragment',
      '/en/../ru/',
    ]) {
      expect(() => normalizeSitemapRoute(value)).toThrow(/Sitemap routes/);
    }
  });

  it('renders a deterministic absolute-URL sitemap without speculative fields', () => {
    const result = renderSitemapXml(
      ['/ru/', '/', '/en/course/', '/en/'],
      'https://example.test/learn_llm/',
    );

    expect(result).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
        '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"',
        '        xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
        '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"',
        '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"',
        '        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"',
        '        xmlns:pagemap="http://www.google.com/schemas/sitemap-pagemap/1.0" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        '  <url><loc>https://example.test/learn_llm/</loc></url>',
        '  <url><loc>https://example.test/learn_llm/en/</loc></url>',
        '  <url><loc>https://example.test/learn_llm/en/course/</loc></url>',
        '  <url><loc>https://example.test/learn_llm/ru/</loc></url>',
        '</urlset>',
        '',
      ].join('\n'),
    );
    expect(result).not.toMatch(/<lastmod>|<changefreq>|<priority>/);
  });

  it('rejects empty, duplicate, excessive, and unsafe route sets', () => {
    expect(() => renderSitemapXml([], 'https://example.test/learn_llm/')).toThrow(
      /non-empty array/,
    );
    expect(() =>
      renderSitemapXml(['/', '/'], 'https://example.test/learn_llm/'),
    ).toThrow(/unique/);
    expect(() =>
      renderSitemapXml(
        ['/safe/', '/unsafe.xml'],
        'https://example.test/learn_llm/',
      ),
    ).toThrow(/directory routes/);
    expect(() =>
      renderSitemapXml(
        Array.from({ length: MAX_SITEMAP_URLS + 1 }, () => '/'),
        'https://example.test/learn_llm/',
      ),
    ).toThrow(/at most 50000 URLs/);
  });
});
