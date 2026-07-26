import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

import { locales } from '../i18n';
import { findPublishableChapterSets } from '../lib/chapter-publication';
import { renderSitemapXml } from '../../sitemap.config.mjs';

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error('Astro public site URL is required to generate sitemap.xml.');
  }

  const chapterModules = import.meta.glob(
    '../content/chapters/**/*.{md,mdx}',
  );
  const allChapters =
    Object.keys(chapterModules).length === 0
      ? []
      : await getCollection('chapters');
  const chapterRoutes = findPublishableChapterSets(allChapters).flatMap((set) =>
    set.activeLocales.map(
      (locale) => `/${locale}/course/${set.chapterId}/`,
    ),
  );
  const routes = [
    '/',
    ...locales.flatMap((locale) => [`/${locale}/`, `/${locale}/course/`]),
    ...chapterRoutes,
  ];

  return new Response(
    renderSitemapXml(routes, site.href),
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    },
  );
};
