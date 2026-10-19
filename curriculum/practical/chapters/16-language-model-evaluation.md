---
{
  "chapter_id": "16-language-model-evaluation",
  "concept_id": "language-model-evaluation",
  "content_revision": 1,
  "order": 16,
  "objective": {
    "en": "Evaluate the existing text model with token-weighted loss and perplexity, identify observed overfitting, and keep baseline and seed comparisons within the fixed experiment."
  },
  "worked_inputs": {
    "en": "Train on aaab and aab, evaluate the separate abaa and baa documents, and retain nine targets per split. Inspect updates 0, 10, 20, 40 and 80 for initialization seeds 39, 40 and 41, compare a training-only bigram, and load the final seed-39 model in a new CPU process."
  },
  "formula": {
    "latex": "\\begin{aligned}\nS_b&=-\\sum_{i\\in I_b}\\ln p_\\theta(y_i\\mid x_i),&N_b&=|I_b|,\\\\\nS&=\\sum_b S_b,&N&=\\sum_b N_b>0,\\\\\nL&=S/N,&\\mathrm{PPL}&=\\exp(L).\n\\end{aligned}",
    "symbols": [
      { "symbol": "b", "en": "index of an evaluation batch" },
      { "symbol": "I_b", "en": "set of selected valid next-token target occurrences in batch b, excluding padding" },
      { "symbol": "i", "en": "index of one selected target occurrence" },
      { "symbol": "x_i", "en": "permitted document-local context for target occurrence i, including beginning-of-sequence when present" },
      { "symbol": "y_i", "en": "observed next token at occurrence i; selected end-of-sequence targets also count" },
      { "symbol": "\\theta", "en": "one fixed learned-parameter state shared by the training and validation evaluations at a checkpoint" },
      { "symbol": "p_\\theta(y_i\\mid x_i)", "en": "probability assigned to the observed target by the model's unmodified evaluation distribution" },
      { "symbol": "\\ln", "en": "natural logarithm, giving negative log-likelihood in nats" },
      { "symbol": "S_b", "en": "sum of negative log-likelihoods in batch b, measured in nats" },
      { "symbol": "N_b", "en": "number of selected valid targets in batch b" },
      { "symbol": "S", "en": "total negative log-likelihood over the evaluated split, measured in nats" },
      { "symbol": "N", "en": "positive total number of selected valid targets in the evaluated split" },
      { "symbol": "L", "en": "mean negative log-likelihood, measured in nats per selected target" },
      { "symbol": "\\mathrm{PPL}", "en": "dimensionless perplexity, the exponential of the target-weighted mean negative log-likelihood" }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "evaluation-method",
      "limitation": { "en": "Short-context count models provide a useful comparison, but fitting the observed training transitions does not establish performance on separate documents." },
      "later_advance": { "en": "Neural language models learn distributed representations and can be compared with n-gram models through held-out likelihood and perplexity." },
      "modern_llm_role": { "en": "The decoder's evaluation must preserve target accounting and split separation, while aggregate likelihood remains narrower than a detailed account of learned linguistic properties." },
      "sources": [
        {
          "role": "earlier", "year": 2003, "name": "A Neural Probabilistic Language Model",
          "source_url": "https://jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
          "claim": { "en": "Bengio, Ducharme, Vincent and Jauvin compare neural and n-gram language models with perplexity derived from average negative log-likelihood, separating training, validation choices and final testing." }
        },
        {
          "role": "later", "year": 2021, "name": "Language Model Evaluation Beyond Perplexity",
          "source_url": "https://aclanthology.org/2021.acl-long.414.pdf",
          "claim": { "en": "Meister and Cotterell explain that held-out perplexity is a monotonic transformation of average token log-likelihood and does not identify in detail which linguistic properties a model learned." }
        }
      ]
    },
    "approach": { "en": "Fit the existing add-one-smoothed bigram only to training documents, then compare its probabilities with the neural decoder on the same selected targets." },
    "summary": { "en": "The bounded Rust comparison measures both models on four constructed strings. Its tokenizer, baseline, seeds and update budget are course choices, not a reproduction of either paper's results." },
    "rust_contrast": "Reuse BigramModel fitted only to the encoded training documents and the existing smoothed probabilities. Score the same mask-selected input/target occurrences as the neural model, declaring the bigram's one-token context and the decoder's permitted prefix."
  },
  "rust": {
    "package": "practical-ch16-language-model-evaluation",
    "sources": [
      "rust/crates/llm-from-scratch-practical/src/metrics.rs",
      "rust/crates/llm-from-scratch-practical/src/training/trainer.rs",
      "rust/crates/llm-from-scratch-practical/src/evaluation/language_model.rs",
      "rust/demos/practical-ch16-language-model-evaluation/src/lib.rs",
      "rust/demos/practical-ch16-language-model-evaluation/src/main.rs"
    ],
    "expected_output": "{\n  \"baseline\": {\n    \"fitted_documents\": 2,\n    \"fitted_transitions\": 9,\n    \"kind\": \"training-only-add-one-bigram\",\n    \"train\": {\n      \"mean_nll_nats_per_target\": 4.402665,\n      \"perplexity\": 81.668227,\n      \"total_nll_nats\": 39.623985,\n      \"valid_targets\": 9\n    },\n    \"validation\": {\n      \"mean_nll_nats_per_target\": 5.04497,\n      \"perplexity\": 155.23962,\n      \"total_nll_nats\": 45.404729,\n      \"valid_targets\": 9\n    }\n  },\n  \"chapter\": \"16-language-model-evaluation\",\n  \"data_scope\": \"four constructed text documents; validation inspected repeatedly; no final test or natural-language quality claim\",\n  \"display_decimal_places\": 6,\n  \"execution\": \"scalar-cpu-f64\",\n  \"final_validation_seed_summary\": {\n    \"interpretation\": \"descriptive initialization variation on this fixed constructed split; no population confidence interval\",\n    \"maximum_nll\": 4.328176,\n    \"mean_nll\": 3.68203,\n    \"minimum_nll\": 2.545169,\n    \"sample_standard_deviation_nll\": 0.987613,\n    \"seed_count\": 3\n  },\n  \"layout_comparison\": {\n    \"batch_counts\": [\n      2,\n      1,\n      1\n    ],\n    \"maximum_absolute_nll_difference\": 1.7763568394002505e-15,\n    \"mean_nll\": [\n      5.615827,\n      5.615827,\n      5.615827\n    ],\n    \"recorded_graphs\": [\n      0,\n      0,\n      0\n    ],\n    \"valid_targets\": [\n      9,\n      9,\n      9\n    ]\n  },\n  \"runs\": [\n    {\n      \"checkpoints\": [\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 5.632313,\n            \"perplexity\": 279.307536,\n            \"total_nll_nats\": 50.690821,\n            \"valid_targets\": 9\n          },\n          \"update\": 0,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 5.615827,\n            \"perplexity\": 274.740388,\n            \"total_nll_nats\": 50.542439,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 2.539183,\n            \"perplexity\": 12.669315,\n            \"total_nll_nats\": 22.852647,\n            \"valid_targets\": 9\n          },\n          \"update\": 10,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 2.642929,\n            \"perplexity\": 14.054304,\n            \"total_nll_nats\": 23.786358,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 0.874321,\n            \"perplexity\": 2.397246,\n            \"total_nll_nats\": 7.868885,\n            \"valid_targets\": 9\n          },\n          \"update\": 20,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 1.267297,\n            \"perplexity\": 3.551242,\n            \"total_nll_nats\": 11.405676,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 0.203748,\n            \"perplexity\": 1.225989,\n            \"total_nll_nats\": 1.833734,\n            \"valid_targets\": 9\n          },\n          \"update\": 40,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 2.746938,\n            \"perplexity\": 15.594806,\n            \"total_nll_nats\": 24.722441,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 0.157051,\n            \"perplexity\": 1.170056,\n            \"total_nll_nats\": 1.413463,\n            \"valid_targets\": 9\n          },\n          \"update\": 80,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 4.172745,\n            \"perplexity\": 64.893323,\n            \"total_nll_nats\": 37.554703,\n            \"valid_targets\": 9\n          }\n        }\n      ],\n      \"initialization_seed\": 39,\n      \"overfitting_intervals\": [\n        {\n          \"from_update\": 20,\n          \"to_update\": 40\n        },\n        {\n          \"from_update\": 40,\n          \"to_update\": 80\n        }\n      ]\n    },\n    {\n      \"checkpoints\": [\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 5.676367,\n            \"perplexity\": 291.887164,\n            \"total_nll_nats\": 51.087306,\n            \"valid_targets\": 9\n          },\n          \"update\": 0,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 5.656397,\n            \"perplexity\": 286.11602,\n            \"total_nll_nats\": 50.907577,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 2.777229,\n            \"perplexity\": 16.074413,\n            \"total_nll_nats\": 24.995059,\n            \"valid_targets\": 9\n          },\n          \"update\": 10,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 2.907706,\n            \"perplexity\": 18.314728,\n            \"total_nll_nats\": 26.16935,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 0.783685,\n            \"perplexity\": 2.189526,\n            \"total_nll_nats\": 7.053166,\n            \"valid_targets\": 9\n          },\n          \"update\": 20,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 1.157378,\n            \"perplexity\": 3.18158,\n            \"total_nll_nats\": 10.416402,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 0.178195,\n            \"perplexity\": 1.195058,\n            \"total_nll_nats\": 1.603754,\n            \"valid_targets\": 9\n          },\n          \"update\": 40,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 2.615175,\n            \"perplexity\": 13.669605,\n            \"total_nll_nats\": 23.536573,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 0.156296,\n            \"perplexity\": 1.169172,\n            \"total_nll_nats\": 1.406666,\n            \"valid_targets\": 9\n          },\n          \"update\": 80,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 4.328176,\n            \"perplexity\": 75.805902,\n            \"total_nll_nats\": 38.953585,\n            \"valid_targets\": 9\n          }\n        }\n      ],\n      \"initialization_seed\": 40,\n      \"overfitting_intervals\": [\n        {\n          \"from_update\": 20,\n          \"to_update\": 40\n        },\n        {\n          \"from_update\": 40,\n          \"to_update\": 80\n        }\n      ]\n    },\n    {\n      \"checkpoints\": [\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 5.637867,\n            \"perplexity\": 280.862985,\n            \"total_nll_nats\": 50.740803,\n            \"valid_targets\": 9\n          },\n          \"update\": 0,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 5.626418,\n            \"perplexity\": 277.665846,\n            \"total_nll_nats\": 50.637766,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 2.365049,\n            \"perplexity\": 10.644562,\n            \"total_nll_nats\": 21.285443,\n            \"valid_targets\": 9\n          },\n          \"update\": 10,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 2.376238,\n            \"perplexity\": 10.764335,\n            \"total_nll_nats\": 21.386145,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 0.968714,\n            \"perplexity\": 2.634554,\n            \"total_nll_nats\": 8.718424,\n            \"valid_targets\": 9\n          },\n          \"update\": 20,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 1.003991,\n            \"perplexity\": 2.729152,\n            \"total_nll_nats\": 9.035918,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 0.400165,\n            \"perplexity\": 1.49207,\n            \"total_nll_nats\": 3.601481,\n            \"valid_targets\": 9\n          },\n          \"update\": 40,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 1.655677,\n            \"perplexity\": 5.236623,\n            \"total_nll_nats\": 14.901091,\n            \"valid_targets\": 9\n          }\n        },\n        {\n          \"recorded_graphs\": 0,\n          \"train\": {\n            \"mean_nll_nats_per_target\": 0.165934,\n            \"perplexity\": 1.180496,\n            \"total_nll_nats\": 1.493409,\n            \"valid_targets\": 9\n          },\n          \"update\": 80,\n          \"validation\": {\n            \"mean_nll_nats_per_target\": 2.545169,\n            \"perplexity\": 12.745386,\n            \"total_nll_nats\": 22.906524,\n            \"valid_targets\": 9\n          }\n        }\n      ],\n      \"initialization_seed\": 41,\n      \"overfitting_intervals\": [\n        {\n          \"from_update\": 20,\n          \"to_update\": 40\n        },\n        {\n          \"from_update\": 40,\n          \"to_update\": 80\n        }\n      ]\n    }\n  ],\n  \"saved_first_seed_model\": {\n    \"model_sha256\": \"f485cea6228baa825076855af99cc71bad66b462c540590a4767df9064e07e2d\",\n    \"reloaded_scores\": {\n      \"train\": {\n        \"batches\": 2,\n        \"metrics\": {\n          \"mean_nll_nats_per_target\": 0.157051,\n          \"perplexity\": 1.170056,\n          \"total_nll_nats\": 1.413463,\n          \"valid_targets\": 9\n        },\n        \"recorded_graphs\": 0\n      },\n      \"validation\": {\n        \"batches\": 2,\n        \"metrics\": {\n          \"mean_nll_nats_per_target\": 4.172745,\n          \"perplexity\": 64.893323,\n          \"total_nll_nats\": 37.554703,\n          \"valid_targets\": 9\n        },\n        \"recorded_graphs\": 0\n      }\n    },\n    \"seed\": 39,\n    \"update\": 80\n  },\n  \"training_documents\": [\n    {\n      \"id\": \"train-a\",\n      \"tokens\": [\n        0,\n        99,\n        99,\n        99,\n        100,\n        1\n      ]\n    },\n    {\n      \"id\": \"train-b\",\n      \"tokens\": [\n        0,\n        99,\n        99,\n        100,\n        1\n      ]\n    }\n  ],\n  \"validation_documents\": [\n    {\n      \"id\": \"validation-a\",\n      \"tokens\": [\n        0,\n        99,\n        100,\n        99,\n        99,\n        1\n      ]\n    },\n    {\n      \"id\": \"validation-b\",\n      \"tokens\": [\n        0,\n        100,\n        99,\n        99,\n        1\n      ]\n    }\n  ],\n  \"weighting\": {\n    \"batch_mean_nll\": [\n      1.039721,\n      0.866434\n    ],\n    \"batch_targets\": [\n      2,\n      4\n    ],\n    \"correct\": {\n      \"mean_nll_nats_per_target\": 0.924196,\n      \"perplexity\": 2.519842,\n      \"total_nll_nats\": 5.545177,\n      \"valid_targets\": 6\n    },\n    \"incorrect_mean_perplexity\": 2.603421,\n    \"incorrect_unweighted_mean_nll\": 0.953077\n  }\n}\n"
  },
  "visualization": {
    "decision": "useful", "id": "language-model-evaluation", "component": "LanguageModelEvaluationDiagram",
    "rationale": { "en": "Connect training-only updates to one fixed parameter state read by both split evaluations, then compare every declared checkpoint for all three seeds without hiding the intervals where the two losses move apart." }
  },
  "decoder_connection": {
    "en": "The same text encoder, source-independent backbone and tied head now have shared valid-target evaluation across fixed, padded and packed batches. The saved model can be scored independently on CPU. Planned Chapter 17, Weight quantization, will use evaluation as a reference when inspecting weight-rounding effects; physical-GPU and full-corpus results remain separate evidence."
  },
  "terminology": [
    { "concept_id": "valid-next-token-target", "en": "Valid next-token target" },
    { "concept_id": "negative-log-likelihood", "en": "Negative log-likelihood" },
    { "concept_id": "perplexity", "en": "Perplexity" },
    { "concept_id": "training-loss", "en": "Training loss" },
    { "concept_id": "held-out-validation-loss", "en": "Held-out validation loss" },
    { "concept_id": "observed-overfitting", "en": "Observed overfitting" },
    { "concept_id": "smoothed-bigram-baseline", "en": "Smoothed bigram baseline" },
    { "concept_id": "initialization-variation", "en": "Initialization variation" }
  ],
  "translation_notes": [
    "English is the only active practical locale. Preserve registered-locale support, typed catalogs, separate cheat sheets and caller-owned diagram labels; use glossary prefix language-model-evaluation-term.",
    "Keep BOS context distinct from selected EOS targets, batch count distinct from target count, no-grad recording distinct from dropout evaluation, and the two-row packed nine-target observation distinct from the separate six-target same-row test.",
    "Preserve every declared seed and checkpoint, six-decimal display rounding, unrounded Rust tolerances, the constructed probability probe's separate status, and the conditional descriptive scope of seed statistics.",
    "The same selected gold occurrences and vocabulary permit a baseline comparison, while the bigram and neural decoder intentionally use different context lengths. Retain this distinction and the repeatedly inspected validation/no-final-test boundary.",
    "Chapter 0 changes only revision, published/planned availability and row 16 promotion. Chapter 15 and all first-course wording remain unchanged; Chapter 17, Weight quantization, stays planned and unlinked."
  ],
  "acceptance_examples": [
    { "input": "Aggregate two and four constructed target probabilities", "expected": "Lists [0.5,0.25] and [0.5,0.5,0.25,0.5] contribute six targets and total NLL 8ln2. Mean NLL is 0.924196 and perplexity 2.519842. Incorrect equal weighting of batch means gives 0.953077; incorrect mean perplexity is 2.603421. These are constructed probabilities, not decoder observations." },
    { "input": "Account for the four fixed documents", "expected": "Train texts aaab/aab and validation texts abaa/baa have disjoint IDs and text. The frozen existing Chapter 4 tokenizer supplies BOS context and selected EOS targets. Each split has five plus four valid targets, nine total. Only training documents enter optimizer updates and baseline fitting; validation is repeatedly observed and no final test set is used." },
    { "input": "Compare shared evaluation across storage layouts", "expected": "Initial seed-39 validation has nine targets and zero graphs in separate, padded and packed storage, using two, one and one batches. Displayed NLL is 5.615827; maximum unrounded absolute difference is 1.7763568394002505e-15, below 1e-12. The packed observation has two rows because five plus four targets exceed capacity eight. A separate six-target test covers actual same-row packing alongside fixed and padded evaluation." },
    { "input": "Preserve evaluation state and failure boundaries", "expected": "The shared reducer selects no-grad graph policy, while the model path separately selects non-dropout evaluation. Actual nonzero gradients, learned values and revisions are unchanged; explicit Eval with configured probability 0.25 consumes no counter draws. Empty or nonfinite neural evaluation, wrong partition/binding and validation training contamination are refused. Lower-level probability-zero scoring retains infinite NLL/perplexity semantics." },
    { "input": "Inspect all three bounded training runs", "expected": "Seeds 39,40,41 each expose updates 0,10,20,40,80. Every run has lower training and higher validation NLL over 20 to 40 and 40 to 80. Update 20 is each run's lowest validation score among those five observations, not a global optimum. Seed 39 moves from train 0.874321/validation 1.267297 at 20 to train 0.157051/validation 4.172745 at 80." },
    { "input": "Compare the frozen baseline and final initialization variation", "expected": "The training-only add-one bigram fits two documents and nine transitions, scoring the same nine occurrences per split. Train NLL/PPL are 4.402665/81.668227; validation values are 5.044970/155.239620. Final neural validation NLLs 4.172745,4.328176,2.545169 yield mean 3.682030, sample standard deviation 0.987613 and observed range 2.545169 to 4.328176. These are conditional descriptive statistics, not a population confidence interval or broad quality claim." },
    { "input": "Save, exit and evaluate actual learned state", "expected": "Save the first predeclared seed 39 at update 80, then run two independent CPU evaluate processes with one and two rows. Both load model identity f485cea6228baa825076855af99cc71bad66b462c540590a4767df9064e07e2d with its actual tokenizer, no refitting or training. Both print train NLL 0.157051/validation NLL 4.172745, nine targets and zero graphs per split. Batch counts change from two to one. Equal printed values establish six-decimal equality; unrounded tolerance comes from Rust tests." }
  ],
  "exercises": [
    { "input": "Inspect unequal-target weighting with the default command", "expected": "Add the two NLL sums and counts: 8ln2 over six targets gives 0.924196 nats per target and perplexity 2.519842. The unweighted mean 0.953077 overweights each short-batch target; mean batch perplexity 2.603421 is also incorrect." },
    { "input": "Inspect all checkpoint trajectories", "expected": "All three seeds show the bounded overfitting signal over 20 to 40 and 40 to 80. Update 20 is the lowest measured validation NLL among five checkpoints, without a claim about unobserved intermediate updates." },
    { "input": "Compare baseline and initialization summaries", "expected": "Seed 39 beats baseline validation NLL 5.044970 at both 20 and 80 but deteriorates from 1.267297 to 4.172745. The three final scores give mean 3.682030, sample standard deviation 0.987613 and range 2.545169 to 4.328176, descriptive only for this fixed split." },
    { "input": "Inspect layouts and run the ten demo tests", "expected": "The same nine selected targets use two, one and one batches in separate, padded and packed storage. Packed storage still has two rows. Unrounded NLL difference is below 1e-12. No-grad graph recording and non-dropout evaluation are separate choices; actual nonzero gradients and an explicit Eval dropout counter are preserved." },
    { "input": "Reproduce independent saved-model evaluation", "expected": "Run the complete one-container sequence. The producer exits before the two evaluate programs. Both restore the same first-seed model and tokenizer, retain nine targets and zero graphs, and print NLLs 0.157051/4.172745. One versus two rows changes two batches into one, without training." }
  ]
}
---

# Practical Chapter 16: Compare training and held-out language-model loss

<!-- contract-section:scope -->
## Scope

Extend the existing metric, fixed-batch evaluator, variable/packed loss and
portable text-model paths. Reuse one text encoder, source-independent backbone,
tied head, tokenizer, optimizer and accumulated update owner. Add no dependency,
parser, trainer, report framework or benchmark service. Preserve the first
course and earlier practical teaching bytes. Only Chapter 0 availability,
revision and row 16 promotion accompany the new lesson.

Teach valid-target evaluation, a bounded observed overfitting pattern, a frozen
training-only baseline and descriptive variation over three initialization
seeds. Do not implement early stopping, choose a favorable seed, open a final
test set or begin Chapter 17. Separate operations from claims about general
language quality, hardware throughput and population uncertainty.

<!-- contract-section:worked-inputs -->
## Worked inputs

Explain the concrete failure of relying on training loss before notation or
practice. Show seed 39 at update 20 and update 80 as an explained result, then
retain every seed and checkpoint in the complete evidence. No learner
prediction questions belong anywhere.

Freeze train-a/aaab and train-b/aab separately from validation-a/abaa and
validation-b/baa. Reuse the already learned Chapter 4 tokenizer; do not claim
it was fitted on these two new training strings. Encode with actual BOS/content/
EOS behavior and preserve the output's literal token arrays. Count five and
four next-token targets per split, including selected EOS and excluding BOS
as a target and padding entirely. Distinct document IDs/text do not make this
related constructed split a random corpus sample. Repeated validation is not
an untouched final test.

Use the Root-frozen scalar CPU f64 experiment: seeds 39/40/41; width 8, heads 2,
feed-forward width 16, one layer and capacity 8; 80 successful updates; fixed
rate 0.02; AdamW beta1 0.9, beta2 0.999, epsilon 1e-8, weight decay zero;
clip norm 1; two one-document microbatches per update; no training dropout.
Evaluate at 0/10/20/40/80 without changing learned or optimizer state.

<!-- contract-section:formula -->
## Target-weighted NLL and perplexity

Render the exact shared formula once and define all symbols locally. For
positive total target count, add token-summed negative natural log-likelihood
and target counts before division and exponentiation. The padded model loss
provides a mean and count; recover its numerator with represented f64
multiplication, retaining normal rounding rather than promising an exact
real-number inverse.

The two-list probability probe is constructed arithmetic, not model evidence.
Show its six-target answer, incorrect equal-batch mean and incorrect mean
perplexity. Comparability requires the same selected gold occurrences,
vocabulary and declared scoring frame. State each model's context rule; the
historical bigram intentionally conditions on only one previous token, while
the decoder can use the permitted document prefix.

Metrics round to six decimals only after calculation. The layout tolerance
uses unrounded NLLs. Probability zero retains the lower-level metric's infinite
surprise semantics; the neural evaluator rejects a nonfinite loss. Empty
targets, invalid probability values and count overflow are refused. A finite
NLL can generally yield an overflowing exponential; fixture PPLs are finite.

<!-- contract-section:history -->
## History and baseline

Render every localized historical narrative and bounded source claim with its
direct primary link. Bengio et al. (2003) support neural/n-gram perplexity
comparison, distributed representations and separation of train, validation
choices and final testing. Meister and Cotterell (2021) support the aggregate
likelihood interpretation and limits of a detailed linguistic-quality inference.
Attribute no local tokenizer, add-one policy, four-string fixture, seed list,
sample-standard-deviation formula or update budget to either paper.

Reuse BigramModel fitting only the encoded training documents and its existing
smoothed probability. Show the add-one formula with locally defined counts and
vocabulary. Score exactly the same selected targets using the existing
transition scorer; never refit on validation or join document boundaries.
State the baseline's two fitted documents and nine transitions, both split
scores and seed 39's validation comparison at updates 20/80. Beating the weak
baseline does not cancel the observed deterioration or establish useful prose.

<!-- contract-section:rust-behavior -->
## Rust behavior

Render the declared seven regions once: merge-token-metrics;
shared-evaluation-reduction; evaluate-selected-targets;
score-selected-bigram-targets; weighting-contrast;
descriptive-seed-summary; loaded-model-evaluation. Keep source-path parity
between contract and lesson. No new site-side evaluation algorithm is allowed.

The fixed evaluator and variable/packed entry point share one no-grad reducer.
Graph recording and dropout mode are separate choices: the actual padded
evaluation path is non-dropout and the explicit Eval comparison consumes no
draws even with configured probability 0.25. Tests preserve seeded nonzero
gradient bits, learned values and value revisions. Evaluation does not call
backward or AdamW. Check partition and tokenizer/split binding before scoring.
The split identity is consistency evidence, not a certificate that arbitrary
caller-provided data are separate.

Retain the reported nine-target layout result: separate/padded/packed means
5.615827 with two/one/one batches and no recorded graphs; maximum unrounded
absolute difference 1.7763568394002505e-15 below tolerance 1e-12. Packed storage
has two rows, since five plus four targets exceed row capacity eight. A
separate six-target test establishes real same-row packed/fixed/padded
agreement. Do not turn either observation into universal backend equality or
a compact-storage claim.

Display all fifteen seed/checkpoint observations. For each seed the observed
overfitting intervals are 20 to 40 and 40 to 80. Update 20 has the lowest
validation NLL among five measurements, not a proved global optimum. Mean,
sample standard deviation with denominator K-1, and range summarize all three
unrounded final validation NLLs. Their scope is initialization variation on one
fixed constructed split, not confidence intervals or data-sampling uncertainty.

Reuse PortableModel to save the first seed at final update 80, not the best
validation seed. Independent evaluate programs restore actual encoder assets
and learned tensors, encode the same fixture and score without training or
refitting a tokenizer. Preserve the model identity and observed one/two-row
CLI comparison. Match at printed six-decimal precision without inferring an
unrounded tolerance from equal rounded text. Portable CPU scoring does not
claim exact training continuation or a physical CUDA-to-CPU experiment.

<!-- contract-section:visualization -->
## Visualization

Register LanguageModelEvaluationDiagram as language-model-evaluation. Show the
training-only update, one frozen learned state and both split evaluations as
one explicit relationship. Follow it with all five checkpoints for each of
the three seeds. Read values directly from the Rust expected output using
standard JSON parsing and presentation rounding only. Do not independently
compute loss, fit a model, choose checkpoints or infer intervals in TypeScript.

Author every label and the associated nonvisual description in the lesson.
State the shared weights, train-only update/baseline fitting, two nine-target
evaluations and actual diverging intervals without relying on position or
color. Use one static semantic figure, shared course-v1 roles and the shared
full-view enhancement. Component CSS expresses geometry only. Preserve readable
narrow tables with the smallest named keyboard-reachable shared scroll region
if needed; never clip or shrink text to conceal a containment failure.

<!-- contract-section:exercises -->
## Optional practice and checked answers

After the explanation, history, Rust and visualization, offer five optional
inspection/reproduction tasks with checked answers: target weighting;
checkpoint overfitting/selection scope; baseline and seed-summary scope;
layouts and evaluation state; independent saved-model evaluation. Supply
copyable supported commands, repository-root directory, existing Docker setup,
included inputs and observable results. No function name alone is a run task.

The no-subcommand CPU command prints the full bounded fixture and in-memory
round trip. The complete one-container sequence runs experiment --save-model,
then evaluate with batch rows one and two; each program exits before the next
starts. Separate wrapper invocations do not retain the saved file. The demo
test command executes ten library tests. Keep development review and
publication machinery out of learner prose.

<!-- contract-section:decoder-connection -->
## Decoder connection and handoff

Preserve the shared text composition and add reusable evaluation over its
existing valid targets. Saved weights and tokenizer assets now support
independent CPU scoring. Planned Chapter 17 is Weight quantization, unlinked:
evaluation provides a reference for inspecting weight-rounding effects on
numerics and held-out likelihood. Include no Chapter 17 implementation or
exercise. Physical-GPU, accelerated mixed-precision and full-corpus evidence
remain separate pending work.

<!-- contract-section:localization -->
## Localization

English is the only active practical locale. Retain existing locale-aware
catalogs, cheat sheets, route construction and caller-owned diagram copy.
Use glossary prefix language-model-evaluation-term. Promote only Chapter 0's
availability boundary and roadmap row 16, with revision 11: published 0–16,
planned 17–32, all 33 individual rows retained. Do not change Chapter 15's
teaching wording or the first course.

<!-- contract-section:acceptance -->
## Acceptance

Require actual target aggregation, failure boundaries, graph/dropout separation,
state preservation, fixed/variable/packed agreement, all declared observations,
baseline parity, descriptive seed summary and independent saved-model CPU
scoring. Keep exact expected stdout identical to expected.txt; machinery inserts
those already frozen bytes into the frontmatter field before review freeze.

Use fresh independent technical/pedagogical and isolated English reviews and
same-role adjudications over one exact candidate. The author cannot certify
publication. Run maintained contract, content, parity, Rust, dependency, site,
link and Firefox JavaScript gates with shared-diagram narrow/full-view,
keyboard, containment, forced-color and direction coverage at both site bases.
No routine screenshots, first-course edits, GPU execution or full-corpus claim.

From repository root with the existing course Docker setup, the CPU commands
require no external corpus, downloaded model or GPU:

```bash
COURSE_CORPUS=false ./course run cargo run --quiet --offline --locked -p practical-ch16-language-model-evaluation
COURSE_CORPUS=false ./course run cargo test --offline --locked -p practical-ch16-language-model-evaluation
```

Validate the lesson's literal complete single-container save/evaluate sequence
and its observable results, preserving the distinction between printed and
unrounded metric equality.
