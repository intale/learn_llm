// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  assertSitemapByteLimit,
  DEFAULT_SITE_URL,
  MAX_SITEMAP_BYTES,
  MAX_SITEMAP_URL_LENGTH,
  MAX_SITEMAP_URLS,
  SITEMAP_NAMESPACE,
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
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url><loc>https://example.test/learn_llm/</loc></url>',
        '  <url><loc>https://example.test/learn_llm/en/</loc></url>',
        '  <url><loc>https://example.test/learn_llm/en/course/</loc></url>',
        '  <url><loc>https://example.test/learn_llm/ru/</loc></url>',
        '</urlset>',
      ].join(''),
    );
    expect(result).not.toMatch(/<lastmod>|<changefreq>|<priority>/);
    expect(SITEMAP_NAMESPACE).toBe(
      'http://www.sitemaps.org/schemas/sitemap/0.9',
    );
    expect(MAX_SITEMAP_BYTES).toBe(52_428_800);
    expect(MAX_SITEMAP_URL_LENGTH).toBe(2_047);
    expect(assertSitemapByteLimit(result)).toBe(
      new TextEncoder().encode(result).byteLength,
    );
    expect(result).not.toMatch(/[\r\n]/);
    expect(result).not.toContain(String.raw`\n`);
  });

  it('measures the uncompressed UTF-8 representation rather than code units', () => {
    expect(assertSitemapByteLimit('é', 2)).toBe(2);
    expect(() => assertSitemapByteLimit('é', 1)).toThrow(
      /at most 1 uncompressed UTF-8 bytes/,
    );
    expect(() => assertSitemapByteLimit('valid', 0)).toThrow(
      /positive safe integer/,
    );
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
    const siteUrl = 'https://example.test/learn_llm/';
    const longestAcceptedSegment = 'a'.repeat(
      MAX_SITEMAP_URL_LENGTH - siteUrl.length - 1,
    );
    expect(() =>
      renderSitemapXml([`/${longestAcceptedSegment}/`], siteUrl),
    ).not.toThrow();
    expect(() =>
      renderSitemapXml([`/${longestAcceptedSegment}a/`], siteUrl),
    ).toThrow(/at most 2047 characters/);
  });
});
