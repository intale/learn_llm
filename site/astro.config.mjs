import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

const siteBaseSegmentPattern = /^[A-Za-z0-9._~-]+$/;

export function normalizeSiteBase(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('SITE_BASE must be a non-empty absolute path.');
  }
  if (!value.startsWith('/') || value.includes('\\') || /[?#]/.test(value)) {
    throw new Error(
      'SITE_BASE must start with / and contain no query, fragment, or backslash.',
    );
  }

  const segments = value.split('/').filter(Boolean);
  if (
    segments.some(
      (segment) =>
        segment === '.' ||
        segment === '..' ||
        !siteBaseSegmentPattern.test(segment),
    )
  ) {
    throw new Error('SITE_BASE contains an unsafe path segment.');
  }

  const normalized = segments.length === 0 ? '/' : `/${segments.join('/')}/`;
  if (value !== normalized) {
    throw new Error(`SITE_BASE must use normalized directory syntax: ${normalized}`);
  }
  return normalized;
}

const siteBase = normalizeSiteBase(process.env.SITE_BASE ?? '/');

function rehypeLeftToRightCode() {
  return (tree) => {
    const pending = [tree];
    while (pending.length > 0) {
      const node = pending.pop();
      if (node?.type === 'element' && node.tagName === 'pre') {
        node.properties = { ...node.properties, dir: 'ltr' };
      }
      if (Array.isArray(node?.children)) pending.push(...node.children);
    }
  };
}

export default defineConfig({
  output: 'static',
  base: siteBase,
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
  },
  integrations: [mdx()],
  markdown: {
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['math'],
    },
    shikiConfig: {
      theme: 'github-dark-high-contrast',
    },
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex, rehypeLeftToRightCode],
    }),
  },
});
