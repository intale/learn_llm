// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

// @ts-ignore Repository checks are dependency-free plain ESM modules.
import { deriveSeoExpectations } from '../../../scripts/check-static-links.mjs';
import { normalizeSiteBase, sitePathForBase } from '../../src/lib/site-path';
// @ts-ignore Dependency-free ESM is shared by the Astro build and artifact audit.
import {
  DEFAULT_SITE_URL,
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

test('@sitemap serves the exact published static route set as XML', async ({
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
  const source = await response.text();
  expect(source).toBe(renderSitemapXml(expectedRoutes, siteUrl));
  const publishedLocations = [...source.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  expect(publishedLocations).toHaveLength(expectedRoutes.length);
  expect(publishedLocations.every((location) => location.startsWith(siteUrl))).toBe(
    true,
  );
});
