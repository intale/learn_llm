// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  MAX_SITEMAP_URLS,
  normalizeSiteOrigin,
  normalizeSitemapBase,
  normalizeSitemapRoute,
  renderSitemapXml,
} from '../sitemap.config.mjs';

describe('sitemap configuration', () => {
  it('passes the validated origin through the pinned Docker build', () => {
    const dockerfile = readFileSync(
      new URL('../../Dockerfile', import.meta.url),
      'utf8',
    );
    expect(dockerfile.match(/^ARG SITE_ORIGIN=https:\/\/intale\.github\.io$/gm)).toHaveLength(1);
    expect(dockerfile.match(/^ENV SITE_ORIGIN=\$\{SITE_ORIGIN\}$/gm)).toHaveLength(1);
  });

  it('normalizes an HTTPS origin without accepting URL state', () => {
    expect(normalizeSiteOrigin('https://Example.TEST/')).toBe(
      'https://example.test',
    );
    expect(normalizeSiteOrigin('https://example.test:8443')).toBe(
      'https://example.test:8443',
    );

    for (const value of [
      '',
      ' https://example.test',
      'http://example.test',
      'https://user@example.test',
      'https://example.test/path/',
      'https://example.test?query=1',
      'https://example.test#fragment',
    ]) {
      expect(() => normalizeSiteOrigin(value)).toThrow(/SITE_ORIGIN/);
    }
  });

  it('accepts only normalized site bases and directory routes', () => {
    expect(normalizeSitemapBase('/')).toBe('/');
    expect(normalizeSitemapBase('/learn_llm/')).toBe('/learn_llm/');
    expect(normalizeSitemapRoute('/')).toBe('/');
    expect(normalizeSitemapRoute('/en/course/30-multi-head-attention/')).toBe(
      '/en/course/30-multi-head-attention/',
    );

    for (const value of ['learn_llm/', '/learn_llm', '/../', '/a//b/']) {
      expect(() => normalizeSitemapBase(value)).toThrow(/Sitemap base/);
    }
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
      'https://example.test',
      '/learn_llm/',
    );

    expect(result).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
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
    expect(() => renderSitemapXml([], 'https://example.test', '/')).toThrow(
      /non-empty array/,
    );
    expect(() =>
      renderSitemapXml(['/', '/'], 'https://example.test', '/'),
    ).toThrow(/unique/);
    expect(() =>
      renderSitemapXml(['/safe/', '/unsafe.xml'], 'https://example.test', '/'),
    ).toThrow(/directory routes/);
    expect(() =>
      renderSitemapXml(
        Array.from({ length: MAX_SITEMAP_URLS + 1 }, () => '/'),
        'https://example.test',
        '/',
      ),
    ).toThrow(/at most 50000 URLs/);
  });
});
