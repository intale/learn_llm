// @ts-ignore Node filesystem access is used only while loading build-time content.
import { existsSync } from 'node:fs';

import { defineCollection } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';

import { isLocale, type Locale } from './i18n';
import { activeLocalesForChapter } from './lib/chapter-locales';

const kebabId = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
const chapterId = z.string().regex(/^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/);
const rustPath = z
  .string()
  .regex(
    /^rust\/(?:crates\/llm-from-scratch|demos\/[a-z0-9][a-z0-9-]*)\/src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.rs$/,
  )
  .refine((value) => !value.split('/').includes('..'), {
    message: 'Rust source paths cannot traverse outside their declared repository directory.',
  });

const formula = z
  .object({
    latex: z.string().min(1),
    symbols: z
      .array(
        z
          .object({
            symbol: z.string().min(1),
            meaning: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const rustSource = z
  .object({
    path: rustPath,
    region: kebabId.optional(),
    purpose: z.string().min(1),
  })
  .strict();

const visualization = z.discriminatedUnion('decision', [
  z
    .object({
      decision: z.literal('useful'),
      id: kebabId,
      rationale: z.string().min(1),
    })
    .strict(),
  z
    .object({
      decision: z.literal('not-useful'),
      id: z.null(),
      rationale: z.string().min(1),
    })
    .strict(),
]);

const chapterDirectory = new URL('./content/chapters/', import.meta.url);
const chapterLoader: Loader = existsSync(chapterDirectory)
  ? glob({
      base: './src/content/chapters',
      pattern: '**/*.{md,mdx}',
    })
  : {
      name: 'empty-chapter-directory',
      async load({ store }) {
        store.clear();
      },
    };

const chapters = defineCollection({
  loader: chapterLoader,
  schema: z
    .object({
      chapter_id: chapterId,
      locale: z.custom<Locale>(
        (value) => typeof value === 'string' && isLocale(value),
        'locale must be configured in src/i18n/locales.json',
      ),
      content_revision: z.number().int().positive(),
      order: z.number().int().positive(),
      concept_id: kebabId,
      title: z.string().min(1),
      description: z.string().min(1),
      objective: z.string().min(1),
      worked_inputs: z.string().min(1),
      formula,
      history: z
        .object({
          approach: z.string().min(1),
          summary: z.string().min(1),
          rust_source: rustPath,
        })
        .strict(),
      rust_sources: z.array(rustSource).min(1),
      visualization,
      decoder_connection: z.string().min(1),
    })
    .strict()
    .superRefine((chapter, context) => {
      let activeLocales: readonly Locale[];
      try {
        activeLocales = activeLocalesForChapter(chapter.chapter_id);
      } catch (error) {
        context.addIssue({
          code: 'custom',
          path: ['chapter_id'],
          message: error instanceof Error ? error.message : 'unknown chapter locale policy',
        });
        return;
      }
      if (!activeLocales.includes(chapter.locale)) {
        context.addIssue({
          code: 'custom',
          path: ['locale'],
          message:
            `locale "${chapter.locale}" is registered but not active for ` +
            chapter.chapter_id,
        });
      }
    }),
});

export const collections = { chapters };
