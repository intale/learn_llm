// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

// @ts-ignore Repository checks are dependency-free plain ESM modules.
import { deriveSeoExpectations } from '../../../scripts/check-static-links.mjs';
import { normalizeSiteBase, sitePathForBase } from '../../src/lib/site-path';
// @ts-ignore Dependency-free ESM is shared by the Astro build and artifact audit.
import {
  DEFAULT_SITE_ORIGIN,
  normalizeSiteOrigin,
  renderSitemapXml,
} from '../../sitemap.config.mjs';

declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
};

const deploymentBase = normalizeSiteBase(process.env.SITE_BASE ?? '/');
const siteOrigin = normalizeSiteOrigin(
  process.env.SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN,
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
  expect(source).toBe(
    renderSitemapXml(expectedRoutes, siteOrigin, deploymentBase),
  );
});
