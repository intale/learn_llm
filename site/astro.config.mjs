import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

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
