// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

// @ts-ignore Repository checks are dependency-free plain ESM modules.
import { deriveSeoExpectations } from '../../../scripts/check-static-links.mjs';
import { normalizeSiteBase, sitePathForBase } from '../../src/lib/site-path';
// @ts-ignore Dependency-free ESM is shared by the Astro build and artifact audit.
import {
  DEFAULT_SITE_URL,
  MAX_SITEMAP_BYTES,
  MAX_SITEMAP_URL_LENGTH,
  SITEMAP_NAMESPACE,
  normalizeSiteUrl,
  renderSitemapXml,
} from '../../sitemap.config.mjs';

declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
};

const deploymentBase = normalizeSiteBase(process.env.SITE_BASE ?? '/');
const siteUrl = normalizeSiteUrl(
  process.env.SITE_URL ?? DEFAULT_SITE_URL,
);

test('@sitemap serves independently parseable Sitemap 0.9 XML for the exact published route set', async ({
  page,
  request,
}) => {
  const response = await request.get(
    sitePathForBase('/sitemap.xml', deploymentBase),
  );
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(
    /^(?:application|text)\/xml(?:\s*;\s*charset=utf-8)?$/i,
  );

  const expectedRoutes = [
    ...deriveSeoExpectations(resolve(process.cwd(), '..')).keys(),
  ];
  const body = await response.body();
  expect(body.byteLength).toBeLessThanOrEqual(MAX_SITEMAP_BYTES);
  expect([...body.subarray(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf]);
  const source = new TextDecoder('utf-8', { fatal: true }).decode(body);
  expect(source).not.toMatch(/[\r\n]/);
  expect(source).not.toContain(String.raw`\n`);
  expect(source).toBe(renderSitemapXml(expectedRoutes, siteUrl));

  const parsed = await page.evaluate(
    ({ xml, namespace }) => {
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      const root = document.documentElement;
      return {
        parserErrors: document.getElementsByTagName('parsererror').length,
        root: {
          localName: root.localName,
          namespace: root.namespaceURI,
        },
        entries: [...root.children].map((entry) => ({
          localName: entry.localName,
          namespace: entry.namespaceURI,
          attributes: entry.attributes.length,
          children: [...entry.children].map((child) => ({
            localName: child.localName,
            namespace: child.namespaceURI,
            attributes: child.attributes.length,
            value: child.textContent ?? '',
          })),
        })),
        namespaceLookup: root.lookupNamespaceURI(null),
        expectedNamespace: namespace,
      };
    },
    { xml: source, namespace: SITEMAP_NAMESPACE },
  );
  expect(parsed.parserErrors).toBe(0);
  expect(parsed.root).toEqual({
    localName: 'urlset',
    namespace: SITEMAP_NAMESPACE,
  });
  expect(parsed.namespaceLookup).toBe(parsed.expectedNamespace);
  expect(parsed.entries).toHaveLength(expectedRoutes.length);
  for (const entry of parsed.entries) {
    expect(entry).toMatchObject({
      localName: 'url',
      namespace: SITEMAP_NAMESPACE,
      attributes: 0,
    });
    expect(entry.children).toHaveLength(1);
    expect(entry.children[0]).toMatchObject({
      localName: 'loc',
      namespace: SITEMAP_NAMESPACE,
      attributes: 0,
    });
  }

  const publishedLocations = parsed.entries.map(
    (entry) => entry.children[0]!.value,
  );
  expect(publishedLocations).toHaveLength(expectedRoutes.length);
  expect(new Set(publishedLocations).size).toBe(publishedLocations.length);
  const publicBase = new URL(siteUrl);
  for (const location of publishedLocations) {
    expect(location.length).toBeLessThanOrEqual(MAX_SITEMAP_URL_LENGTH);
    const url = new URL(location);
    expect(url.href).toBe(location);
    expect(url.protocol).toBe('https:');
    expect(url.origin).toBe(publicBase.origin);
    expect(url.pathname.startsWith(publicBase.pathname)).toBe(true);
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  }
});
