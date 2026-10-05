# Независимая проверка русского учебного текста

Читайте каждый обязательный фрагмент как исходный русский технический текст,
не обращаясь к версии на другом языке. Проверяйте полные документы, связные
фрагменты в порядке чтения и отдельно представленные значения в их указанных
ролях. Проверьте, не пропущены ли затронутые подписи, названия, описания и другие
самостоятельные элементы. Не разбивайте смысловую группу, которая действительно
представлена вместе, и не требуйте от контекстуального заголовка повторения
содержимого связанного с ним раздела.

Оцените связность объяснения, естественность синтаксиса и порядка информации,
техническую терминологию в контексте, явные названия действующих объектов и
операций, причинные связи, условия, переходы, грамматику и пунктуацию. Там, где
это необходимо для понимания, должны быть названы величина, единица измерения,
значение результата и границы вывода. Термин должен объяснять механизм, а не
заставлять читателя угадывать смысл буквального перевода.

Отдельно проверьте заголовки, подписи, названия ссылок и элементов управления,
описания для поиска, доступные имена и описания. Их смысл не должен зависеть от
непредоставленного соседнего текста, цвета или положения. Учитывайте реальную
роль элемента: заголовок раздела не обязан повторять весь раздел, а
самостоятельное описание должно содержать необходимые для него пояснения.
Код, имена API, пути, идентификаторы и буквальный вывод программы могут
оставаться на языке их записи; это не разрешает подменять ими русское
объяснение.

Используйте только предоставленные неизменяемые материалы. Не ищите версию на
другом языке, не изменяйте текст и не запрашивайте мнение другого проверяющего.
Не требуйте правок только ради личных стилистических предпочтений. Положительный
вердикт без замечаний допустим. Для блокирующего замечания укажите точные
идентификаторы затронутых фрагментов, процитируйте доступное вам свидетельство,
объясните конкретную языковую проблему и её последствия для учащегося, затем
сформулируйте проверяемый критерий исправления.

Верните только запись по предоставленной схеме, указав каждый обязательный
идентификатор фрагмента ровно один раз. Ответ должен быть одним компактным
объектом JSON; ключи каждого объекта упорядочиваются по беззнаковым байтам
UTF-8. После объекта должен следовать ровно один байт LF, без дальнейшего текста.
Списки проверенных идентификаторов, замечаний и ссылок на идентификаторы также
упорядочиваются по беззнаковым байтам UTF-8, если схема не требует другого
конкретного порядка. Не добавляйте ограждение блока кода или комментарии.


## Frozen actual role requirements

The following neutral map assigns every supplied surface its actual role and required meaning. It is review instruction, not learner-facing copy, an expected verdict or English semantic source. Judge each surface using this requirement and its actual presented context; do not invent or narrow requirements. Every supplied surface must be covered exactly once.

The four doc.contract.* documents are complete locale-owned learner-field projections, not translations of the English-only instructional contract body. The doc.rendered.001 document is a locale-owned chooser audit projection: its words and choice links come from the actual route, while minimal wrapping is audit scaffolding, not a second published presentation. Original mixed-language file and root-route identities and extraction locations are bound externally. Do not infer a Russian judgment on the omitted English fields or parallel English introduction.

Reading-order groups follow real headings, paragraphs, cards or accessible-description relationships. Contextual headings do not need to repeat every fact supplied by their associated section; deliberately standalone metadata, captions and destination names must supply the referents required for that actual role. Literal Rust output, code identifiers and formulas remain untranslated. Normalized report snapshots do not prove exact stdout bytes; the complete rendered report and separately bound executable evidence retain that distinction.

```json
[
  {
    "id": "doc.catalog",
    "kind": "complete-document",
    "order": 1,
    "requirementKey": "catalog",
    "roleRequirement": "Keep Russian site, chooser and home copy consistent with the implemented scalar CPU reference and separate planned laptop extension. Preserve the actual published course links, navigation semantics and shared unchanged catalog values; planned capabilities must not be presented as published or measured."
  },
  {
    "id": "doc.contract.00",
    "kind": "complete-document",
    "order": 2,
    "requirementKey": "ch00",
    "roleRequirement": "Orient the learner to how text, token IDs, embeddings, repeated pre-norm decoder blocks, a tied vocabulary head, selection, loss, gradients and AdamW connect in the scalar CPU reference. Preserve the existing architectural relationships, source qualifications and implementation links. Distinguish a structural map and bounded reference capstone from language quality or measured laptop-scale capability; describe Chapters 40–85 only as a planned continuation."
  },
  {
    "id": "doc.contract.32",
    "kind": "complete-document",
    "order": 3,
    "requirementKey": "ch32",
    "roleRequirement": "Explain the existing differentiable decoder forward path, shared vocabulary table, indexed loss and coherent parameter boundary without changing formulas, tiny evidence, historical claims or checked exercises. Identify the implementation as a scalar CPU reference; preserve the valid completeness of its forward computation without implying measured laptop capability, and hand off bounded validation-selected training to Chapter 33."
  },
  {
    "id": "doc.contract.38",
    "kind": "complete-document",
    "order": 4,
    "requirementKey": "ch38",
    "roleRequirement": "Explain the existing model-bound graph-free KV session, prefill, decode, compatibility, read-only parameter access, cache staleness and exact finite-fixture comparisons without changing algorithms, formulas or omissions. Preserve complete-prefix as the name of the reference computation and distinguish score-value counts from runtime. Hand off a bounded CPU scalar pipeline to Chapter 39 while distinguishing within-execution test isolation from repository fixed-fixture regression; no laptop performance or independent generalization claim follows."
  },
  {
    "id": "doc.contract.39",
    "kind": "complete-document",
    "order": 5,
    "requirementKey": "ch39",
    "roleRequirement": "Explain the existing deterministic CPU scalar reference pipeline and its document partitioning, BPE, overlapping causal windows, training, validation selection, fixed-fixture evaluation, exact reload and cached generation. Preserve the exact 1,744 slot and 442 occurrence distinction, metric units and unreported once-per-transition scores, all numerical evidence and historical qualifications. Do not infer useful language quality, independent generalization, whole-job resume or measured laptop capability. End with inspecting the reference's configuration, evidence and limits before the separately planned extension."
  },
  {
    "id": "doc.lesson.00",
    "kind": "complete-document",
    "order": 6,
    "requirementKey": "ch00",
    "roleRequirement": "Orient the learner to how text, token IDs, embeddings, repeated pre-norm decoder blocks, a tied vocabulary head, selection, loss, gradients and AdamW connect in the scalar CPU reference. Preserve the existing architectural relationships, source qualifications and implementation links. Distinguish a structural map and bounded reference capstone from language quality or measured laptop-scale capability; describe Chapters 40–85 only as a planned continuation."
  },
  {
    "id": "doc.lesson.32",
    "kind": "complete-document",
    "order": 7,
    "requirementKey": "ch32",
    "roleRequirement": "Explain the existing differentiable decoder forward path, shared vocabulary table, indexed loss and coherent parameter boundary without changing formulas, tiny evidence, historical claims or checked exercises. Identify the implementation as a scalar CPU reference; preserve the valid completeness of its forward computation without implying measured laptop capability, and hand off bounded validation-selected training to Chapter 33."
  },
  {
    "id": "doc.lesson.38",
    "kind": "complete-document",
    "order": 8,
    "requirementKey": "ch38",
    "roleRequirement": "Explain the existing model-bound graph-free KV session, prefill, decode, compatibility, read-only parameter access, cache staleness and exact finite-fixture comparisons without changing algorithms, formulas or omissions. Preserve complete-prefix as the name of the reference computation and distinguish score-value counts from runtime. Hand off a bounded CPU scalar pipeline to Chapter 39 while distinguishing within-execution test isolation from repository fixed-fixture regression; no laptop performance or independent generalization claim follows."
  },
  {
    "id": "doc.lesson.39",
    "kind": "complete-document",
    "order": 9,
    "requirementKey": "ch39",
    "roleRequirement": "Explain the existing deterministic CPU scalar reference pipeline and its document partitioning, BPE, overlapping causal windows, training, validation selection, fixed-fixture evaluation, exact reload and cached generation. Preserve the exact 1,744 slot and 442 occurrence distinction, metric units and unreported once-per-transition scores, all numerical evidence and historical qualifications. Do not infer useful language quality, independent generalization, whole-job resume or measured laptop capability. End with inspecting the reference's configuration, evidence and limits before the separately planned extension. Preserve the literal executable Cargo command, including its ASCII option prefixes, in source and rendered code."
  },
  {
    "id": "doc.rendered.001",
    "kind": "complete-document",
    "order": 10,
    "requirementKey": "chooser",
    "roleRequirement": "Present the existing language choice clearly, with the Russian introduction distinguishing the implemented scalar reference from the separate laptop-track plan. Preserve the actual language links and their names. Bind the complete current bilingual route, while judging only the Russian-owned copy in this localization role."
  },
  {
    "id": "doc.rendered.002",
    "kind": "complete-document",
    "order": 11,
    "requirementKey": "home",
    "roleRequirement": "Introduce the implemented scalar CPU reference and separate planned laptop extension coherently in Russian hero copy, feature-region name and course note. Preserve the current published navigation and do not turn a plan into an available lesson or measured capability."
  },
  {
    "id": "doc.rendered.003",
    "kind": "complete-document",
    "order": 12,
    "requirementKey": "index",
    "roleRequirement": "List the actual published Russian course chapters in order, with the revised orientation and scalar reference capstone names and descriptions accurately identifying their destinations. Preserve all other chapter cards and navigation; do not expose a partial Chapter 40 route."
  },
  {
    "id": "doc.rendered.004",
    "kind": "complete-document",
    "order": 13,
    "requirementKey": "ch00",
    "roleRequirement": "Orient the learner to how text, token IDs, embeddings, repeated pre-norm decoder blocks, a tied vocabulary head, selection, loss, gradients and AdamW connect in the scalar CPU reference. Preserve the existing architectural relationships, source qualifications and implementation links. Distinguish a structural map and bounded reference capstone from language quality or measured laptop-scale capability; describe Chapters 40–85 only as a planned continuation."
  },
  {
    "id": "doc.rendered.005",
    "kind": "complete-document",
    "order": 14,
    "requirementKey": "ch01-neighbor",
    "roleRequirement": "Preserve Chapter 1's complete existing teaching and render its previous-chapter link with the revised orientation title, accurately naming Chapter 0 as the destination. This navigation update does not authorize rewriting Chapter 1."
  },
  {
    "id": "doc.rendered.006",
    "kind": "complete-document",
    "order": 15,
    "requirementKey": "ch32",
    "roleRequirement": "Explain the existing differentiable decoder forward path, shared vocabulary table, indexed loss and coherent parameter boundary without changing formulas, tiny evidence, historical claims or checked exercises. Identify the implementation as a scalar CPU reference; preserve the valid completeness of its forward computation without implying measured laptop capability, and hand off bounded validation-selected training to Chapter 33."
  },
  {
    "id": "doc.rendered.007",
    "kind": "complete-document",
    "order": 16,
    "requirementKey": "ch38-rendered",
    "roleRequirement": "Explain the existing model-bound graph-free KV session, prefill, decode, compatibility, read-only parameter access, cache staleness and exact finite-fixture comparisons without changing algorithms, formulas or omissions. Preserve complete-prefix as the name of the reference computation and distinguish score-value counts from runtime. Hand off a bounded CPU scalar pipeline to Chapter 39 while distinguishing within-execution test isolation from repository fixed-fixture regression; no laptop performance or independent generalization claim follows. Its rendered terminology definition must distinguish numerical logit agreement from the separately checked fixed-example selected tokens, preserving the matching selection-policy/random-state conditions without a universal guarantee."
  },
  {
    "id": "doc.rendered.008",
    "kind": "complete-document",
    "order": 17,
    "requirementKey": "ch39",
    "roleRequirement": "Explain the existing deterministic CPU scalar reference pipeline and its document partitioning, BPE, overlapping causal windows, training, validation selection, fixed-fixture evaluation, exact reload and cached generation. Preserve the exact 1,744 slot and 442 occurrence distinction, metric units and unreported once-per-transition scores, all numerical evidence and historical qualifications. Do not infer useful language quality, independent generalization, whole-job resume or measured laptop capability. End with inspecting the reference's configuration, evidence and limits before the separately planned extension. Preserve the literal executable Cargo command, including its ASCII option prefixes, in source and rendered code."
  },
  {
    "id": "catalog.courseNote",
    "kind": "source-field",
    "order": 18,
    "requirementKey": "home-course-note",
    "roleRequirement": "Direct the learner to Chapter 0's scalar-reference map and then the Rust chapters implementing its parts, without claiming the planned extension is already published."
  },
  {
    "id": "catalog.eyebrow",
    "kind": "source-field",
    "order": 19,
    "requirementKey": "home-eyebrow",
    "roleRequirement": "Orient the home-page reader from text toward the scalar reference in its associated hero context, without implying a completed laptop-scale model."
  },
  {
    "id": "catalog.homeIntro",
    "kind": "source-field",
    "order": 20,
    "requirementKey": "home-intro",
    "roleRequirement": "Explain the bounded CPU Rust integration of tensors, attention, training and generation and identify the laptop track as planned work with separate implementation and measured capability."
  },
  {
    "id": "catalog.homeTitle",
    "kind": "source-field",
    "order": 21,
    "requirementKey": "home-title",
    "roleRequirement": "Name building the scalar reference language model as the home-page subject without implying laptop performance or useful language quality."
  },
  {
    "id": "catalog.languagePickerIntro",
    "kind": "source-field",
    "order": 22,
    "requirementKey": "chooser-intro",
    "roleRequirement": "Introduce building a tiny Rust scalar reference and examining a separate laptop-track plan in the language chooser, without presenting the plan as implemented."
  },
  {
    "id": "catalog.siteDescription",
    "kind": "source-field",
    "order": 23,
    "requirementKey": "site-description",
    "roleRequirement": "Describe the Rust scalar CPU reference and separate planned laptop extension accurately in standalone site or search-result copy; do not imply measured laptop-scale capability."
  },
  {
    "id": "reading.009",
    "kind": "reading-order-group",
    "order": 24,
    "requirementKey": "home-hero",
    "roleRequirement": "Introduce the scalar reference coherently through the actual hero eyebrow, heading and explained bounded CPU Rust example, distinguishing the laptop extension's planned implementation and separate measured capabilities."
  },
  {
    "id": "reading.010",
    "kind": "reading-order-group",
    "order": 25,
    "requirementKey": "ch00-course-card",
    "roleRequirement": "Name the Chapter 0 scalar-reference architectural map and accurately describe its tiny CPU component relationships without equating them with measured laptop capability. Preserve the card's actual destination and content-revision metadata."
  },
  {
    "id": "reading.011",
    "kind": "reading-order-group",
    "order": 26,
    "requirementKey": "ch39-course-card",
    "roleRequirement": "Name the Chapter 39 scalar reference capstone and accurately describe its bounded CPU integration, overlapping-slot versus unreported transition scoring, reload and cached generation without inferring quality or laptop performance. Preserve the card's actual destination and content-revision metadata."
  },
  {
    "id": "reading.012",
    "kind": "reading-order-group",
    "order": 27,
    "requirementKey": "ch00-overview",
    "roleRequirement": "Explain the CPU f64 scalar implementation and architectural relationships locally, and distinguish demonstrating component integration from language quality or laptop performance."
  },
  {
    "id": "reading.013",
    "kind": "reading-order-group",
    "order": 28,
    "requirementKey": "ch00-path-handoff",
    "roleRequirement": "Describe Chapter 39's bounded scalar reference capstone and Chapters 40–85 as a separately planned extension that begins with inspecting reference configuration, evidence and limits; no future implementation or measured result is implied."
  },
  {
    "id": "reading.014",
    "kind": "reading-order-group",
    "order": 29,
    "requirementKey": "ch32-connection",
    "roleRequirement": "Hand off differentiable scalar reference next-token logits and mean indexed loss to Chapter 33's bounded CPU training and validation-only state selection; no measured laptop capability is implied."
  },
  {
    "id": "reading.015",
    "kind": "reading-order-group",
    "order": 30,
    "requirementKey": "ch38-handoff",
    "roleRequirement": "Connect the exact model-bound inference evidence to Chapter 39's bounded CPU scalar program, preserving cached-versus-complete-prefix fixture scope and distinguishing test selection isolation from fixed-fixture regression rather than new independent generalization."
  },
  {
    "id": "reading.016",
    "kind": "reading-order-group",
    "order": 31,
    "requirementKey": "ch39-handoff",
    "roleRequirement": "State the bounded CPU f64 integration evidence, retained metric and fixed-fixture limitations, and planned Chapter 40 configuration/evidence/limits handoff without claiming useful language quality, independently established generalization or measured laptop capability."
  },
  {
    "id": "source-unit.005",
    "kind": "source-field",
    "order": 32,
    "requirementKey": "ch00-connection",
    "roleRequirement": "Connect token IDs, feature vectors, repeated pre-norm blocks, tied logits, token selection and loss/gradient/AdamW learning as the scalar reference's structural map, not evidence of language quality or laptop capability."
  },
  {
    "id": "source-unit.011",
    "kind": "source-field",
    "order": 33,
    "requirementKey": "ch32-connection",
    "roleRequirement": "Hand off differentiable scalar reference next-token logits and mean indexed loss to Chapter 33's bounded CPU training and validation-only state selection; no measured laptop capability is implied."
  },
  {
    "id": "source-unit.016",
    "kind": "source-field",
    "order": 34,
    "requirementKey": "ch38-connection",
    "roleRequirement": "Explain the bound model's graph-free prefill/decode and read-only parameter semantics, post-session update/cache-staleness condition, and bounded CPU successor. Keep within-execution selection isolation separate from Chapter 39's fixed-fixture regression ordering, not independent generalization or laptop performance."
  },
  {
    "id": "source-unit.021",
    "kind": "source-field",
    "order": 35,
    "requirementKey": "ch39-objective",
    "roleRequirement": "State the deterministic scalar reference integration objective with slot mean NLL/perplexity and the 1,744-versus-442 distinction, preserving selection, regression, reload and cached-generation evidence boundaries."
  },
  {
    "id": "source-unit.023",
    "kind": "source-field",
    "order": 36,
    "requirementKey": "ch39-connection",
    "roleRequirement": "Connect the reference's actual document/BPE/window/training/evaluation/reload/generation operations and preserve test-after-selection, slot-versus-occurrence and unreported-score conditions. These operations do not establish useful language quality or measured laptop capability."
  },
  {
    "id": "source-unit.030",
    "kind": "source-field",
    "order": 37,
    "requirementKey": "ch00-connection",
    "roleRequirement": "Connect token IDs, feature vectors, repeated pre-norm blocks, tied logits, token selection and loss/gradient/AdamW learning as the scalar reference's structural map, not evidence of language quality or laptop capability."
  },
  {
    "id": "source-unit.031",
    "kind": "source-field",
    "order": 38,
    "requirementKey": "ch32-connection",
    "roleRequirement": "Hand off differentiable scalar reference next-token logits and mean indexed loss to Chapter 33's bounded CPU training and validation-only state selection; no measured laptop capability is implied."
  },
  {
    "id": "source-unit.032",
    "kind": "source-field",
    "order": 39,
    "requirementKey": "ch38-connection",
    "roleRequirement": "Explain the bound model's graph-free prefill/decode and read-only parameter semantics, post-session update/cache-staleness condition, and bounded CPU successor. Keep within-execution selection isolation separate from Chapter 39's fixed-fixture regression ordering, not independent generalization or laptop performance."
  },
  {
    "id": "source-unit.036",
    "kind": "source-field",
    "order": 40,
    "requirementKey": "ch39-connection",
    "roleRequirement": "Connect the reference's actual document/BPE/window/training/evaluation/reload/generation operations and preserve test-after-selection, slot-versus-occurrence and unreported-score conditions. These operations do not establish useful language quality or measured laptop capability."
  },
  {
    "id": "unit.003",
    "kind": "seo-description",
    "order": 41,
    "requirementKey": "site-description",
    "roleRequirement": "Describe the Rust scalar CPU reference and separate planned laptop extension accurately in standalone site or search-result copy; do not imply measured laptop-scale capability."
  },
  {
    "id": "unit.004",
    "kind": "p",
    "order": 42,
    "requirementKey": "home-eyebrow",
    "roleRequirement": "Orient the home-page reader from text toward the scalar reference in its associated hero context, without implying a completed laptop-scale model."
  },
  {
    "id": "unit.005",
    "kind": "h1",
    "order": 43,
    "requirementKey": "home-title",
    "roleRequirement": "Name building the scalar reference language model as the home-page subject without implying laptop performance or useful language quality."
  },
  {
    "id": "unit.006",
    "kind": "p",
    "order": 44,
    "requirementKey": "home-intro",
    "roleRequirement": "Explain the bounded CPU Rust integration of tensors, attention, training and generation and identify the laptop track as planned work with separate implementation and measured capability."
  },
  {
    "id": "unit.007",
    "kind": "section.aria-label",
    "order": 45,
    "requirementKey": "home-feature-name",
    "roleRequirement": "Name the home feature region consistently with building the scalar reference; do not claim an independently measured laptop result."
  },
  {
    "id": "unit.008",
    "kind": "p",
    "order": 46,
    "requirementKey": "home-course-note",
    "roleRequirement": "Direct the learner to Chapter 0's scalar-reference map and then the Rust chapters implementing its parts, without claiming the planned extension is already published."
  },
  {
    "id": "unit.010",
    "kind": "a",
    "order": 47,
    "requirementKey": "ch00-title",
    "roleRequirement": "Identify an architectural map of the scalar reference decoder as the page or linked destination; a contextual chapter number or direction may accompany the title but must not change the destination's meaning."
  },
  {
    "id": "unit.011",
    "kind": "p",
    "order": 48,
    "requirementKey": "ch00-description",
    "roleRequirement": "Describe how tokenizer, embeddings, decoder blocks, training, sampling and caching connect in the tiny CPU reference; do not equate that structural example with measured laptop-scale capability."
  },
  {
    "id": "unit.013",
    "kind": "a",
    "order": 49,
    "requirementKey": "ch39-title",
    "roleRequirement": "Identify running the scalar reference end to end as the chapter or linked destination; do not imply a useful-language-quality or measured laptop-scale result."
  },
  {
    "id": "unit.014",
    "kind": "p",
    "order": 50,
    "requirementKey": "ch39-description",
    "roleRequirement": "Describe the scalar CPU validation-selected reference, overlapping-window fixed-fixture comparison, exact reload and cached generation. Distinguish the scored overlapping window-target slots from the separate 442 once-per-document-transition occurrences with no reported numeric scores, and exclude quality or laptop-performance inference. This standalone summary need not reproduce the full fixture's scored-slot count."
  },
  {
    "id": "unit.017",
    "kind": "seo-description",
    "order": 51,
    "requirementKey": "ch00-description",
    "roleRequirement": "Describe how tokenizer, embeddings, decoder blocks, training, sampling and caching connect in the tiny CPU reference; do not equate that structural example with measured laptop-scale capability."
  },
  {
    "id": "unit.018",
    "kind": "title",
    "order": 52,
    "requirementKey": "ch00-title",
    "roleRequirement": "Identify an architectural map of the scalar reference decoder as the page or linked destination; a contextual chapter number or direction may accompany the title but must not change the destination's meaning."
  },
  {
    "id": "unit.019",
    "kind": "p",
    "order": 53,
    "requirementKey": "revision-badge",
    "roleRequirement": "Identify the associated chapter number and actual content revision as publication metadata, not a training step, model size or quality measurement. Preserve the existing label's meaning and exact revision value."
  },
  {
    "id": "unit.020",
    "kind": "h1",
    "order": 54,
    "requirementKey": "ch00-title",
    "roleRequirement": "Identify an architectural map of the scalar reference decoder as the page or linked destination; a contextual chapter number or direction may accompany the title but must not change the destination's meaning."
  },
  {
    "id": "unit.021",
    "kind": "p",
    "order": 55,
    "requirementKey": "ch00-description",
    "roleRequirement": "Describe how tokenizer, embeddings, decoder blocks, training, sampling and caching connect in the tiny CPU reference; do not equate that structural example with measured laptop-scale capability."
  },
  {
    "id": "unit.023",
    "kind": "h3",
    "order": 56,
    "requirementKey": "ch00-system-title",
    "roleRequirement": "Identify the scalar reference whose major computation and learning paths the system figure presents; the title need not repeat every component or limitation supplied by the figure."
  },
  {
    "id": "unit.024",
    "kind": "p",
    "order": 57,
    "requirementKey": "ch00-system-description",
    "roleRequirement": "Explain the figure's tiny CPU text-to-logits path and generation-versus-learning relationship, distinguishing these computational connections from language quality and laptop performance."
  },
  {
    "id": "unit.025",
    "kind": "h4",
    "order": 58,
    "requirementKey": "ch00-system-section",
    "roleRequirement": "Orient the learner to how the scalar reference's major parts connect in the associated figure section; this contextual section heading need not enumerate every part or limitation."
  },
  {
    "id": "unit.026",
    "kind": "h3",
    "order": 59,
    "requirementKey": "ch00-detail-title",
    "roleRequirement": "Identify the scalar reference decoder detail map and its implementation-chapter links, without implying a complete measured laptop system."
  },
  {
    "id": "unit.027",
    "kind": "p",
    "order": 60,
    "requirementKey": "ch00-detail-description",
    "roleRequirement": "Describe tracing inference and learning and inspecting the scalar reference decoder's parts and implementation links; preserve the actual accessible relationship with the capstone summary rather than inventing unrelated context."
  },
  {
    "id": "unit.028",
    "kind": "a.aria-label",
    "order": 61,
    "requirementKey": "ch39-title",
    "roleRequirement": "Identify running the scalar reference end to end as the chapter or linked destination; do not imply a useful-language-quality or measured laptop-scale result."
  },
  {
    "id": "unit.031",
    "kind": "a",
    "order": 62,
    "requirementKey": "ch00-title",
    "roleRequirement": "Identify an architectural map of the scalar reference decoder as the page or linked destination; a contextual chapter number or direction may accompany the title but must not change the destination's meaning."
  },
  {
    "id": "unit.033",
    "kind": "p",
    "order": 63,
    "requirementKey": "revision-badge",
    "roleRequirement": "Identify the associated chapter number and actual content revision as publication metadata, not a training step, model size or quality measurement. Preserve the existing label's meaning and exact revision value."
  },
  {
    "id": "unit.034",
    "kind": "h2",
    "order": 64,
    "requirementKey": "ch32-rust-heading",
    "roleRequirement": "Orient the learner to the explicit scalar reference model boundary in the associated Rust section; valid completeness of its forward computation is not a laptop-scale product claim."
  },
  {
    "id": "unit.035",
    "kind": "h3",
    "order": 65,
    "requirementKey": "ch32-figure-title",
    "roleRequirement": "Orient the learner to the one shared vocabulary table through the scalar reference decoder in the figure's context; retain the tied-table relationship without claiming measured laptop capability."
  },
  {
    "id": "unit.038",
    "kind": "p",
    "order": 66,
    "requirementKey": "revision-badge",
    "roleRequirement": "Identify the associated chapter number and actual content revision as publication metadata, not a training step, model size or quality measurement. Preserve the existing label's meaning and exact revision value."
  },
  {
    "id": "unit.039",
    "kind": "h2",
    "order": 67,
    "requirementKey": "ch38-handoff-heading",
    "roleRequirement": "Orient the learner from the existing inference mechanism to the scalar reference pipeline in the associated handoff section; do not imply a measured laptop-scale pipeline."
  },
  {
    "id": "unit.042",
    "kind": "a",
    "order": 68,
    "requirementKey": "ch39-title",
    "roleRequirement": "Identify running the scalar reference end to end as the chapter or linked destination; do not imply a useful-language-quality or measured laptop-scale result."
  },
  {
    "id": "unit.044",
    "kind": "seo-description",
    "order": 69,
    "requirementKey": "ch39-description",
    "roleRequirement": "Describe the scalar CPU validation-selected reference, overlapping-window fixed-fixture comparison, exact reload and cached generation. Distinguish the scored overlapping window-target slots from the separate 442 once-per-document-transition occurrences with no reported numeric scores, and exclude quality or laptop-performance inference. This standalone summary need not reproduce the full fixture's scored-slot count."
  },
  {
    "id": "unit.045",
    "kind": "title",
    "order": 70,
    "requirementKey": "ch39-title",
    "roleRequirement": "Identify running the scalar reference end to end as the chapter or linked destination; do not imply a useful-language-quality or measured laptop-scale result."
  },
  {
    "id": "unit.046",
    "kind": "p",
    "order": 71,
    "requirementKey": "revision-badge",
    "roleRequirement": "Identify the associated chapter number and actual content revision as publication metadata, not a training step, model size or quality measurement. Preserve the existing label's meaning and exact revision value."
  },
  {
    "id": "unit.047",
    "kind": "h1",
    "order": 72,
    "requirementKey": "ch39-title",
    "roleRequirement": "Identify running the scalar reference end to end as the chapter or linked destination; do not imply a useful-language-quality or measured laptop-scale result."
  },
  {
    "id": "unit.048",
    "kind": "p",
    "order": 73,
    "requirementKey": "ch39-description",
    "roleRequirement": "Describe the scalar CPU validation-selected reference, overlapping-window fixed-fixture comparison, exact reload and cached generation. Distinguish the scored overlapping window-target slots from the separate 442 once-per-document-transition occurrences with no reported numeric scores, and exclude quality or laptop-performance inference. This standalone summary need not reproduce the full fixture's scored-slot count."
  },
  {
    "id": "unit.049",
    "kind": "p",
    "order": 74,
    "requirementKey": "ch39-objective",
    "roleRequirement": "State the deterministic scalar reference integration objective with slot mean NLL/perplexity and the 1,744-versus-442 distinction, preserving selection, regression, reload and cached-generation evidence boundaries."
  },
  {
    "id": "unit.050",
    "kind": "pre",
    "order": 75,
    "requirementKey": "ch39-output",
    "roleRequirement": "The displayed report must retain the actual Rust report's values, conditions and order, with only its final next= line redirecting the learner to inspect the scalar reference and its limits before extending it. Preserve all existing metric classifications. Exact stdout-byte equality is separate executable evidence, not an inference from normalized rendered-text extraction. Literal report syntax is program output, not mathematical prose."
  },
  {
    "id": "unit.051",
    "kind": "h2",
    "order": 76,
    "requirementKey": "ch39-handoff-heading",
    "roleRequirement": "Orient the learner toward continuing from the scalar reference rather than treating it as a laptop-scale result; the heading's associated section supplies the concrete evidence and limits."
  },
  {
    "id": "unit.055",
    "kind": "chooser-introduction",
    "order": 77,
    "requirementKey": "chooser-intro",
    "roleRequirement": "Introduce building a tiny Rust scalar reference and examining a separate laptop-track plan in the language chooser, without presenting the plan as implemented."
  },
  {
    "id": "unit.056",
    "kind": "capstone-name-purpose-destination",
    "order": 78,
    "requirementKey": "ch00-capstone",
    "roleRequirement": "Identify the capstone as connecting the scalar reference's parts in one bounded training-to-generation example; its name, purpose and destination must not imply useful language quality or laptop performance."
  },
  {
    "id": "unit.057",
    "kind": "rust-source-caption",
    "order": 79,
    "requirementKey": "ch32-rust-caption",
    "roleRequirement": "Describe one coherent evidence record for the scalar reference decoder boundary, not a quality benchmark or measured laptop result."
  },
  {
    "id": "doc.cheat-sheet.38",
    "kind": "complete-document",
    "order": 80,
    "requirementKey": "ch38-cheat-sheet",
    "roleRequirement": "Present the existing Chapter 38 quick-reference terms coherently, preserving unchanged cache/session/phase/reset definitions. Define newest-position logit agreement as a numerical comparison, keep selected-token agreement a separate finite-example check, state matching selection policy and initial random-generator state for those comparisons, and exclude any universal selected-token guarantee from close logits."
  },
  {
    "id": "source-unit.043",
    "kind": "source-field",
    "order": 81,
    "requirementKey": "ch38-newest-logit-definition",
    "roleRequirement": "Define numerical agreement between cached and complete-prefix logits at the newest token position, distinguish it from selected-token agreement checked separately in fixed examples, name the matched selection policy and initial random-generator state, and state that close logits alone do not guarantee the same selected token."
  },
  {
    "id": "unit.058",
    "kind": "cheat-sheet-term-definition",
    "order": 82,
    "requirementKey": "ch38-newest-logit-definition",
    "roleRequirement": "Define numerical agreement between cached and complete-prefix logits at the newest token position, distinguish it from selected-token agreement checked separately in fixed examples, name the matched selection policy and initial random-generator state, and state that close logits alone do not guarantee the same selected token."
  },
  {
    "id": "source-unit.044",
    "kind": "copyable-command",
    "order": 83,
    "requirementKey": "ch39-cargo-command",
    "roleRequirement": "Provide the literal Cargo command for running the Chapter 39 demo, preserving the package name and the two ASCII hyphens of each long option so the command can be copied and executed."
  },
  {
    "id": "unit.059",
    "kind": "copyable-command",
    "order": 84,
    "requirementKey": "ch39-cargo-command",
    "roleRequirement": "Provide the literal Cargo command for running the Chapter 39 demo, preserving the package name and the two ASCII hyphens of each long option so the command can be copied and executed."
  }
]
```
