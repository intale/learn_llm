// Filesystem-neutral publication decisions. Inputs are already parsed data;
// evidence is produced by the maintained receipt verifier, not semantic guesses.
export const FUNCTIONAL_CHAPTER_IDS = Object.freeze(["40-reference-core-handoff","41-corpus-preparation","42-scalable-bpe-tokenizer","43-padded-variable-batches","44-packed-sequence-masks","45-depth-stable-decoder","46-configurable-decoder-core","47-dropout-semantics","48-dependency-error-contract","49-serving-config-admission","50-accelerator-tensor-parity","51-mixed-precision-training","52-memory-bounded-training","53-optimizer-schedules-clipping","54-tensor-artifact-interchange","55-immutable-artifact-persistence","56-exact-job-resume","57-resource-observability","58-multi-seed-evaluation","59-quantized-gguf-artifacts","60-laptop-hardware-admission","61-gqa-context-policy","62-online-tiled-attention","63-kv-block-pool","64-nucleus-penalties-logprobs","65-stop-strings-unicode-streaming","66-continuous-batch-scheduling","67-cancellation-backpressure-budgets","68-loopback-serving-metrics","69-lora-sft-adapters","70-direct-preference-optimization","71-qlora-boundary","72-prefix-cache-reuse","73-rope-context-scaling","74-retrieval-provenance","75-constrained-json-decoding","76-authorized-tools","77-safety-privacy-model-card","78-from-scratch-laptop-capstone","79-import-adapt-serve-capstone","80-advanced-decoding-serving","81-distributed-schedule-simulation","82-moe-routing-simulation","83-persistence-scale-decision"]);

function exactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

export function validateFunctionalManifest(value) {
  if (!exactKeys(value, ['schemaVersion', 'planId', 'planRevision', 'policyId', 'referenceLocale', 'chapters']) ||
      value.schemaVersion !== 1 || value.planId !== 'functional-laptop-llm-extension' ||
      value.planRevision !== 2 || value.policyId !== 'functional-current-locale-activation' ||
      value.referenceLocale !== 'en' || !Array.isArray(value.chapters) || value.chapters.length !== 44) {
    throw new Error('invalid functional manifest identity/closed schema');
  }
  const chapters = value.chapters.map((chapter, i) => {
    const locales = ['en'];
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
  if (value?.schemaVersion === 2) {
    if (!exactKeys(value, ['schemaVersion','scopeId','candidates']) ||
        typeof value.scopeId !== 'string' || !/^[a-z][a-z0-9._-]{0,127}$/.test(value.scopeId) ||
        !Array.isArray(value.candidates) || value.candidates.length !== 2 ||
        value.candidates.some((candidate, index) =>
          !exactKeys(candidate, ['chapterId','contentRevision','sourceHashes']) ||
          candidate.chapterId !== FUNCTIONAL_CHAPTER_IDS[index] ||
          !Number.isSafeInteger(candidate.contentRevision) || candidate.contentRevision < 1 ||
          (index === 0 && candidate.contentRevision !== 2) ||
          !exactKeys(candidate.sourceHashes, ['en']) ||
          !/^[0-9a-f]{64}$/.test(candidate.sourceHashes.en))) {
      throw new Error('invalid bounded40/41 English private-review group');
    }
    return Object.freeze({...value,candidates:Object.freeze(value.candidates.map(candidate =>
      Object.freeze({...candidate,sourceHashes:Object.freeze({...candidate.sourceHashes})})))});
  }
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

// One normalized view serves the existing hash/parity/link/browser adapters.
// Version1 remains the legacy single candidate; version2 is only current40/41.
export function privateReviewCandidates(scope) {
  scope = validatePrivateReviewScope(scope);
  return scope.schemaVersion === 2 ? scope.candidates : [scope];
}

export function privateReviewCandidateForChapter(scope, chapterId) {
  return scope ? privateReviewCandidates(scope).find(candidate => candidate.chapterId === chapterId) ?? null : null;
}

// An explicit v2 candidate group is not production evidence. Verify only its
// preceding production prefix; legacy/private-v1 and production stay unchanged.
export function productionEvidenceConfiguration(configuration, scope) {
  if (!scope) return configuration;
  const validated = validatePrivateReviewScope(scope);
  if (validated.schemaVersion !== 2) return configuration;
  const first = configuration.functional.byChapter[validated.candidates[0].chapterId];
  if (!first) throw new Error('private evidence prefix requires configured candidate');
  return {...configuration,functional:{...configuration.functional,
    chapters:configuration.functional.chapters.filter(chapter => chapter.order < first.order)}};
}

// This explicit candidate selector cannot be passed as a production option.
export function selectPrivateReviewChapterSets({productionSets, entries, configuration, scope, buildRole}) {
  if (buildRole !== 'private-review') throw new Error('private build role required');
  const sets = [...productionSets];
  for (const candidate of privateReviewCandidates(scope)) {
  const chapter = configuration.functional.byChapter[candidate.chapterId];
  const nextOrder = sets.at(-1)?.reference.data.order + 1;
  if (chapter.order !== nextOrder) throw new Error('private candidate must be the next contiguous chapter');
  const group = entries.filter(e => e.data.chapter_id === chapter.chapterId);
  const reference = group.find(e => e.data.locale === 'en');
  if (!reference || group.filter(e => e.data.locale === 'en').length !== 1 ||
      reference.data.order !== chapter.order ||
      (candidate.contentRevision !== undefined && reference.data.content_revision !== candidate.contentRevision) ||
      group.some(e => !chapter.activeLocales.includes(e.data.locale))) {
    throw new Error('missing/duplicate/inactive private candidate source');
  }
  const byLocale = {};
  for (const locale of Object.keys(candidate.sourceHashes)) {
    const localized = group.filter(e => e.data.locale === locale);
    if (localized.length !== 1 ||
        localized[0].data.content_revision !== reference.data.content_revision ||
        functionalChapterSignature(localized[0].data) !== functionalChapterSignature(reference.data)) {
      throw new Error('private actual-locale revision/signature drift');
    }
    byLocale[locale] = localized[0];
  }
  sets.push({chapterId: chapter.chapterId,
    revision: reference.data.content_revision, activeLocales: chapter.activeLocales,
    reference, byLocale: Object.freeze(byLocale), privateReview: true});
  }
  return sets;
}
