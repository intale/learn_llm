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

const llmPredecessorKind = z.enum([
  'language-model',
  'neural-architecture',
  'model-building-practice',
  'training-practice',
  'evaluation-method',
  'inference-design',
]);

const httpsSourceUrl = z.string().min(1).refine(
  (value) => {
    try {
      const parsed = new URL(value);
      return (
        parsed.protocol === 'https:' &&
        parsed.username === '' &&
        parsed.password === ''
      );
    } catch {
      return false;
    }
  },
  { message: 'History source URLs must be absolute HTTPS URLs.' },
);

function canonicalHistorySourceUrl(value: string) {
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    return parsed.href;
  } catch {
    return null;
  }
}

const llmEvolution = z
  .object({
    predecessor_kind: llmPredecessorKind,
    limitation: z.string().min(1),
    later_advance: z.string().min(1),
    modern_llm_role: z.string().min(1),
    sources: z
      .array(
        z
          .object({
            role: z.enum(['earlier', 'later']),
            year: z.number().int().min(1900).max(9999),
            name: z.string().min(1),
            source_url: httpsSourceUrl,
            claim: z.string().min(1),
          })
          .strict(),
      )
      .min(2),
  })
  .strict()
  .superRefine((evolution, context) => {
    const roles = new Set(evolution.sources.map((source) => source.role));
    for (const role of ['earlier', 'later'] as const) {
      if (!roles.has(role)) {
        context.addIssue({
          code: 'custom',
          path: ['sources'],
          message: `LLM-evolution sources require role ${role}.`,
        });
      }
    }
    const urls = new Set<string>();
    evolution.sources.forEach((source, index) => {
      const canonicalUrl = canonicalHistorySourceUrl(source.source_url);
      if (canonicalUrl === null) return;
      if (urls.has(canonicalUrl)) {
        context.addIssue({
          code: 'custom',
          path: ['sources', index, 'source_url'],
          message: 'History source URLs must be unique.',
        });
      }
      urls.add(canonicalUrl);
    });
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

const diagramComponent = z.string().regex(/^[A-Z][A-Za-z0-9]*Diagram$/);

const supplementaryVisualization = z
  .object({
    id: kebabId,
    component: diagramComponent,
    rationale: z.string().min(1),
  })
  .strict();

const visualization = z.discriminatedUnion('decision', [
  z
    .object({
      decision: z.literal('useful'),
      id: kebabId,
      component: diagramComponent.optional(),
      rationale: z.string().min(1),
      supplementary: z.array(supplementaryVisualization).optional(),
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
      chapter_kind: z.enum(['lesson', 'orientation']).optional(),
      locale: z.custom<Locale>(
        (value) => typeof value === 'string' && isLocale(value),
        'locale must be configured in src/i18n/locales.json',
      ),
      content_revision: z.number().int().positive(),
      order: z.number().int().nonnegative(),
      concept_id: kebabId,
      title: z.string().min(1),
      description: z.string().min(1),
      objective: z.string().min(1),
      worked_inputs: z.string().min(1),
      formula: formula.nullable(),
      history: z
        .object({
          llm_evolution: llmEvolution.optional(),
          approach: z.string().min(1),
          summary: z.string().min(1),
          rust_source: rustPath.nullable(),
        })
        .strict(),
      rust_sources: z.array(rustSource),
      visualization,
      decoder_connection: z.string().min(1),
    })
    .strict()
    .superRefine((chapter, context) => {
      const isOrientation = chapter.chapter_kind === 'orientation';
      if (isOrientation) {
        if (chapter.chapter_id !== '00-llm-parts' || chapter.order !== 0) {
          context.addIssue({
            code: 'custom',
            path: ['chapter_kind'],
            message: 'Only 00-llm-parts at order zero may use the orientation kind.',
          });
        }
        if (
          chapter.formula !== null ||
          chapter.history.rust_source !== null ||
          chapter.rust_sources.length !== 0
        ) {
          context.addIssue({
            code: 'custom',
            path: ['chapter_kind'],
            message: 'The orientation must have null formula/Rust history and no Rust sources.',
          });
        }
        if (
          chapter.visualization.decision !== 'useful' ||
          chapter.visualization.id !== 'llm-system-map' ||
          chapter.visualization.component !== 'LlmSystemDiagram' ||
          JSON.stringify(chapter.visualization.supplementary?.map(({ id }) => id) ?? []) !==
            JSON.stringify(['llm-parts-map']) ||
          chapter.visualization.supplementary?.[0]?.component !== 'LlmPartsDiagram'
        ) {
          context.addIssue({
            code: 'custom',
            path: ['visualization'],
            message:
              'The orientation must register llm-system-map with llm-parts-map as its sole supplementary visualization.',
          });
        }
      } else if (
        chapter.formula === null ||
        chapter.history.rust_source === null ||
        chapter.rust_sources.length === 0
      ) {
        context.addIssue({
          code: 'custom',
          path: ['chapter_kind'],
          message: 'Implementation lessons require formula and Rust evidence.',
        });
      }
      if (chapter.visualization.decision === 'useful') {
        const visualizationIds = [
          chapter.visualization.id,
          ...(chapter.visualization.supplementary?.map(({ id }) => id) ?? []),
        ];
        if (new Set(visualizationIds).size !== visualizationIds.length) {
          context.addIssue({
            code: 'custom',
            path: ['visualization'],
            message: 'Visualization IDs must be unique within a chapter.',
          });
        }
      }
      const requiresLlmEvolution =
        chapter.order >= 10 ||
        ([8, 9].includes(chapter.order) && chapter.content_revision >= 2);
      if (requiresLlmEvolution && chapter.history.llm_evolution === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['history', 'llm_evolution'],
          message:
            'history.llm_evolution is required for revised Chapters 8-9 and from Chapter 10 onward.',
        });
      }
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
