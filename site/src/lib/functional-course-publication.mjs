// Filesystem-neutral publication decisions. Inputs are already parsed data;
// evidence is produced by the maintained receipt verifier, not semantic guesses.
export const FUNCTIONAL_CHAPTER_IDS = Object.freeze(["40-reference-core-handoff","41-governed-corpus-acquisition","42-deterministic-corpus-filtering","43-deduplication-decontamination","44-scalable-bpe-tokenizer","45-padded-variable-batches","46-packed-sequence-masks","47-depth-stable-decoder","48-configurable-decoder-core","49-dropout-semantics","50-dependency-error-contract","51-serving-config-admission","52-accelerator-tensor-parity","53-mixed-precision-training","54-memory-bounded-training","55-optimizer-schedules-clipping","56-tensor-artifact-interchange","57-immutable-artifact-persistence","58-exact-job-resume","59-resource-observability","60-multi-seed-evaluation","61-quantized-gguf-artifacts","62-laptop-hardware-admission","63-gqa-context-policy","64-online-tiled-attention","65-kv-block-pool","66-nucleus-penalties-logprobs","67-stop-strings-unicode-streaming","68-continuous-batch-scheduling","69-cancellation-backpressure-budgets","70-loopback-serving-metrics","71-lora-sft-adapters","72-direct-preference-optimization","73-qlora-boundary","74-prefix-cache-reuse","75-rope-context-scaling","76-retrieval-provenance","77-constrained-json-decoding","78-authorized-tools","79-safety-privacy-model-card","80-from-scratch-laptop-capstone","81-import-adapt-serve-capstone","82-advanced-decoding-serving","83-distributed-schedule-simulation","84-moe-routing-simulation","85-persistence-scale-decision"]);

function exactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

export function validateFunctionalManifest(value) {
  if (!exactKeys(value, ['schemaVersion', 'planId', 'planRevision', 'policyId', 'referenceLocale', 'chapters']) ||
      value.schemaVersion !== 1 || value.planId !== 'functional-laptop-llm-extension' ||
      value.planRevision !== 1 || value.policyId !== 'functional-current-locale-activation' ||
      value.referenceLocale !== 'en' || !Array.isArray(value.chapters) || value.chapters.length !== 46) {
    throw new Error('invalid functional manifest identity/closed schema');
  }
  const chapters = value.chapters.map((chapter, i) => {
    const locales = i === 0 ? ['en', 'ru'] : ['en'];
    if (!exactKeys(chapter, ['chapterId', 'order', 'activeLocales']) ||
        chapter.chapterId !== FUNCTIONAL_CHAPTER_IDS[i] || chapter.order !== i + 40 ||
        JSON.stringify(chapter.activeLocales) !== JSON.stringify(locales)) {
      throw new Error('functional manifest order/ID/active-locale drift at ' + (40 + i));
    }
    return Object.freeze({ ...chapter, activeLocales: Object.freeze([...locales]) });
  });
  return Object.freeze({ ...value, chapters: Object.freeze(chapters),
    byChapter: Object.freeze(Object.fromEntries(chapters.map(c => [c.chapterId, c]))) });
}

export function composeChapterConfigurations(base, functional) {
  const extension = validateFunctionalManifest(functional);
  if (base.planRevision !== 78 || base.chapters.length !== 40 ||
      base.chapters.some((c, i) => c.order !== i || Number(c.chapterId.slice(0, 2)) !== i) ||
      base.referenceLocale !== extension.referenceLocale) {
    throw new Error('immutable revision-78 reference prefix required');
  }
  const chapters = Object.freeze([...base.chapters, ...extension.chapters]);
  return Object.freeze({ ...base, chapters,
    byChapter: Object.freeze(Object.fromEntries(chapters.map(c => [c.chapterId, c]))),
    functional: extension });
}

// Same neutral field projection used by the existing contract/lesson parity
// checks. No language judgment is inferred from equality of these data fields.
export function functionalChapterSignature(data) {
  return JSON.stringify({
    chapter_id: data.chapter_id, order: data.order, concept_id: data.concept_id,
    chapter_kind: data.chapter_kind ?? 'lesson',
    formula: data.formula ? { latex: data.formula.latex,
      symbols: data.formula.symbols.map(s => s.symbol) } : null,
    history_rust_source: data.history.rust_source,
    history_llm_evolution: data.history.llm_evolution ? {
      predecessor_kind: data.history.llm_evolution.predecessor_kind,
      sources: data.history.llm_evolution.sources.map(({role, year, name, source_url}) =>
        ({role, year, name, source_url})) } : null,
    rust_sources: data.rust_sources.map(({path, region}) => ({path, region: region ?? null})),
    visualization: {
      decision: data.visualization.decision, id: data.visualization.id,
      ...(data.visualization.component ? {component: data.visualization.component} : {}),
      ...((data.visualization.supplementary?.length ?? 0) > 0 ? {
        supplementary: data.visualization.supplementary.map(({id, component}) => ({id, component}))
      } : {}),
    },
  });
}

function prefix(baseSets) {
  if (baseSets.length !== 40 || baseSets.some((s, i) => s.reference.data.order !== i)) {
    throw new Error('complete immutable reference prefix required before successor activation');
  }
}

export function selectProductionChapterSets({baseSets, entries, configuration, evidence}) {
  prefix(baseSets);
  const sets = [...baseSets];
  if (!entries.some(e => e.data.order >= 40)) return sets;
  for (const chapter of configuration.functional.chapters) {
    const group = entries.filter(e => e.data.chapter_id === chapter.chapterId);
    if (group.length !== chapter.activeLocales.length) break;
    const byLocale = {};
    for (const locale of chapter.activeLocales) {
      const localized = group.filter(e => e.data.locale === locale);
      if (localized.length !== 1) return sets;
      byLocale[locale] = localized[0];
    }
    const reference = byLocale.en;
    const signature = functionalChapterSignature(reference.data);
    const proof = evidence[chapter.chapterId];
    if (!proof || proof.verified !== true || proof.chapterId !== chapter.chapterId ||
        proof.revision !== reference.data.content_revision || proof.signature !== signature ||
        JSON.stringify(proof.activeLocales) !== JSON.stringify(chapter.activeLocales) ||
        chapter.activeLocales.some(locale => {
          const e = byLocale[locale], catalog = proof.catalogs[locale];
          return e.data.order !== chapter.order ||
            e.data.content_revision !== reference.data.content_revision ||
            functionalChapterSignature(e.data) !== signature ||
            !proof.sheets.includes(locale) || !catalog ||
            catalog.title !== e.data.title || catalog.description !== e.data.description ||
            catalog.objective !== e.data.objective;
        })) break;
    sets.push({chapterId: chapter.chapterId, revision: reference.data.content_revision,
      activeLocales: chapter.activeLocales, reference, byLocale: Object.freeze(byLocale)});
  }
  return sets;
}

export function validatePrivateReviewScope(value) {
  if (!exactKeys(value, ['schemaVersion', 'chapterId', 'scopeId', 'sourceHashes']) ||
      value.schemaVersion !== 1 || !FUNCTIONAL_CHAPTER_IDS.includes(value.chapterId) ||
      typeof value.scopeId !== 'string' || !/^[a-z][a-z0-9._-]{0,127}$/.test(value.scopeId) ||
      !(exactKeys(value.sourceHashes, ['en']) ||
        (value.chapterId === FUNCTIONAL_CHAPTER_IDS[0] && exactKeys(value.sourceHashes, ['en','ru']))) ||
      Object.values(value.sourceHashes).some(hash => !/^[0-9a-f]{64}$/.test(hash))) {
    throw new Error('invalid bounded English private-review scope');
  }
  return Object.freeze({...value, sourceHashes: Object.freeze({...value.sourceHashes})});
}

// This explicit candidate selector cannot be passed as a production option.
export function selectPrivateReviewChapterSets({productionSets, entries, configuration, scope, buildRole}) {
  if (buildRole !== 'private-review') throw new Error('private build role required');
  scope = validatePrivateReviewScope(scope);
  const chapter = configuration.functional.byChapter[scope.chapterId];
  const nextOrder = productionSets.at(-1)?.reference.data.order + 1;
  if (chapter.order !== nextOrder) throw new Error('private candidate must be the next contiguous chapter');
  const group = entries.filter(e => e.data.chapter_id === chapter.chapterId);
  const reference = group.find(e => e.data.locale === 'en');
  if (!reference || group.filter(e => e.data.locale === 'en').length !== 1 ||
      reference.data.order !== chapter.order ||
      group.some(e => !chapter.activeLocales.includes(e.data.locale))) {
    throw new Error('missing/duplicate/inactive private candidate source');
  }
  const byLocale = {};
  for (const locale of Object.keys(scope.sourceHashes)) {
    const localized = group.filter(e => e.data.locale === locale);
    if (localized.length !== 1 ||
        localized[0].data.content_revision !== reference.data.content_revision ||
        functionalChapterSignature(localized[0].data) !== functionalChapterSignature(reference.data)) {
      throw new Error('private actual-locale revision/signature drift');
    }
    byLocale[locale] = localized[0];
  }
  return [...productionSets, {chapterId: chapter.chapterId,
    revision: reference.data.content_revision, activeLocales: chapter.activeLocales,
    reference, byLocale: Object.freeze(byLocale), privateReview: true}];
}
