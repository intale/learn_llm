import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const overlay = process.argv[2] ?? '/evidence/publish';
const copies = {};
for (const locale of ['en', 'ru']) {
  const text = readFileSync(`${overlay}/site/src/content/chapters/${locale}/17-parameter-initialization.mdx`, 'utf8');
  const metadata = JSON.parse(/^---\n([\s\S]*?)\n---/.exec(text)[1]);
  const literal = /export const diagramLabels = (\{[\s\S]*?\n\});/.exec(text)[1];
  const labels = runInNewContext(`(${literal})`, {}, { timeout: 1000 });
  const headings = [...text.matchAll(/^## (.+)$/gm)].map(match => match[1]);
  if (headings.length !== 8 || metadata.content_revision !== 5) throw Error('Unexpected chapter copy/revision');
  const history = metadata.history.llm_evolution;
  copies[locale] = {
    revisionLabel: locale === 'en' ? 'Content revision' : 'Версия материала',
    title: metadata.title,
    description: metadata.description,
    headings,
    historyHeading: headings[3],
    historyFragments: [history.limitation, history.later_advance, history.sources[1].claim, history.sources[2].claim, history.modern_llm_role],
    diagramTitle: labels.title,
    diagramDescription: labels.description,
    diagramSections: [labels.sections.distributions, labels.sections.propagation, labels.sections.reproducibility],
    summaryLabels: ['seed', 'width', 'samples', 'fanIn', 'fanOut', 'inputVariance', 'generator', 'statistic'].map(key => labels.summary[key]),
    diagramTerms: [labels.summary.assumption, ...['strategy', 'seed', 'limit', 'minimum', 'maximum', 'mean', 'variance', 'layer', 'limitRatio'].map(key => labels.fields[key]), labels.pairing],
    strategies: labels.strategies,
    noSeed: labels.states.noSeed,
    sameStream: labels.states.sameStream,
    sameSeedEqual: labels.states.sameSeedEqual,
    alternateSeedDifferent: labels.states.alternateSeedDifferent,
    histogramTable: labels.accessibility.histogramTable,
    histogramRows: labels.accessibility.histograms,
    representativeBinName: labels.accessibility.binTemplate.replace('{range}', '[-0.15,-0.05)').replace('{count}', '962').replace('{share}', '23.486328125000%'),
    propagationTable: labels.accessibility.propagationTable,
  };
}
const path = `${overlay}/site/tests/e2e/ch17-parameter-initialization.spec.ts`;
const original = readFileSync(path, 'utf8');
const start = original.indexOf('const copy: Record<ChapterLocale, LocalizedCopy> = ');
const end = original.indexOf('\nconst expectedRustRegions = ', start);
if (start < 0 || end < 0) throw Error('Missing expectation-only boundary');
const updated = `${original.slice(0, start)}const copy: Record<ChapterLocale, LocalizedCopy> = ${JSON.stringify(copies, null, 2)};\n${original.slice(end)}`;
writeFileSync(path, updated);
process.stdout.write('Updated reviewed copy expectations; all following assertions preserved.\n');
