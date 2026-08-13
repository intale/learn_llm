# Functional laptop LLM capability requirements

This is the audit boundary and dependency map, not an implementation design or a claim that paper-scale results transfer to a laptop. The existing course remains the scalar reference core. The mandatory path must fit one measured 8 GB VRAM profile with explicit host RAM, storage, download, wall time, throughput, and reproducibility receipts and no hidden cloud dependency. That laptop envelope is a named validation profile, not a hard-coded model limit: one versioned causal decoder-only autoregressive text/token configuration must expose the exact 1,188 -> approximately-8,000 -> laptop -> production-shaped planning ladder. The same decoder must expose one crate-internal checked PreparedDecoderInput seam for residual embeddings, positions, masks, loss eligibility, dtype/device, and identity metadata; ordinary text token IDs are its only supported producer, cached decoding shares the same causal-decoder core, and text-token logits remain the only output family. This adds no second encoder or decoder, public modality trait or enum, non-text producer, modality adapter, image/audio/video path, diffusion model, encoder-only model, encoder-decoder model, dependency, dataset, objective, or capability claim. Exact datasets, model revisions, dependency graphs, optional vector-database choice, and hardware profiles remain frozen by the next resource-contract step before acquisition or implementation.

Classifications have one meaning throughout: `reference-core-proven` preserves an already demonstrated bounded invariant; `mandatory-laptop-implementation` is required for the promised endpoint; `laptop-feasible-advanced-exercise` is useful but optional; and `bounded-scale-extension` teaches a local oracle or simulation without claiming the scale result. The static course remains deployable without a server. Any learner-visible change requires canonical English review, direct Russian localization review, static evidence, and supported Firefox validation.

Provisional estimates assume one laptop-class GPU with 8 GB VRAM, at least 16 GB host RAM, 30 GB free storage, loopback-only serving, and refusal before allocation when a request exceeds its declared bound. These are conservative audit estimates, not accepted measurements. Retrieval and persistence requirements are backend-neutral: bounded in-memory or filesystem-backed exact search is the mandatory laptop path. PostgreSQL/pgvector is unselected and may appear only as an advanced adapter if a later measured vector collection or query workload exceeds that simpler design.

The source register is bounded: papers and specifications support mechanisms and risk classes, not quality, safety, scale, or throughput transfer. Living standards and project specifications must be revision-pinned at implementation time. The complete run-scoped lane evidence is:

- `.build/runs/20260813T154026Z-audit-functional-laptop-llm-capability-gaps-01/course-inventory.md`: 9e51fa56d27563cf0876082dadae128951dfa31ce484d33f49ae67d938296eeb
- `.build/runs/20260813T154026Z-audit-functional-laptop-llm-capability-gaps-01/data-training-hardware.md`: 89c8e510aff7cbb9cc421add2c76297f269fa52a679abde46b79c64b78fc0b06
- `.build/runs/20260813T154026Z-audit-functional-laptop-llm-capability-gaps-01/inference-serving-apps.md`: c71b7f445e7f0563cb034fb45814308bb69ed370f6464c76fedd0d1bc28851fb

## Source register

### SRC-DTH-DATA-01 — Datasheets for Datasets
- Kind: primary-paper
- URL: https://arxiv.org/abs/1803.09010
- Supports: documenting motivation, composition, collection process, preprocessing, recommended uses, distribution, maintenance, and legal or ethical considerations for a dataset.
- Claim limit: A datasheet improves traceability and reviewability; it does not itself prove that collection, licensing, representativeness, privacy, or downstream use is lawful or safe.

### SRC-DTH-DATA-02 — Documenting Large Webtext Corpora: A Case Study on the Colossal Clean Crawled Corpus
- Kind: primary-paper
- URL: https://aclanthology.org/2021.emnlp-main.98/
- Supports: direct inspection of C4 found unexpected machine-generated text, benchmark contamination, demographic skews, and exclusion effects from filtering.
- Claim limit: Findings describe the studied C4 releases and methods; they are evidence for an audit requirement, not rates to assign to a future course corpus.

### SRC-DTH-DATA-03 — Deduplicating Training Data Makes Language Models Better
- Kind: primary-paper
- URL: https://aclanthology.org/2022.acl-long.577/
- Supports: exact and approximate duplication can cross train-validation boundaries, increase memorized output, and distort evaluation; the paper reports more than 4 percent validation overlap in studied standard corpora and up to 10-fold lower memorization after its deduplication.
- Claim limit: Those rates and improvements are specific to the studied corpora, models, and algorithms; they do not set a universal threshold or guarantee.

### SRC-DTH-DATA-04 — Extracting Training Data from Large Language Models
- Kind: primary-paper
- URL: https://www.usenix.org/conference/usenixsecurity21/presentation/carlini-extracting
- Supports: an empirical extraction attack recovered hundreds of verbatim training sequences from GPT-2, including personally identifying information, demonstrating a memorization and privacy risk that corpus controls must address.
- Claim limit: The experiment establishes possibility under its model and attack conditions; it does not quantify leakage for this course model or make PII detection sufficient.

### SRC-DTH-DATA-05 — The BigScience ROOTS Corpus
- Kind: primary-paper
- URL: https://arxiv.org/abs/2303.03915
- Supports: a large multilingual corpus can document governance, source selection, language coverage, processing, and ethical decisions as first-class construction work.
- Claim limit: ROOTS is a design precedent, not an approved course dataset, license clearance, size target, or quality guarantee.

### SRC-DTH-DATA-06 — The RefinedWeb Dataset for Falcon LLM
- Kind: primary-paper
- URL: https://proceedings.neurips.cc/paper_files/paper/2023/hash/fa3ed726cc5073b9c31e3e49a807789c-Abstract-Datasets_and_Benchmarks.html
- Supports: large-scale web data requires explicit filtering and deduplication stages whose retained volume and model effects can be measured.
- Claim limit: The reported multi-trillion-token scale, pipeline, and comparisons are not a laptop recipe, a license audit, or evidence that the same filters transfer to another corpus.

### SRC-DTH-DATA-07 — Scaling Language Models: Methods, Analysis and Insights from Training Gopher
- Kind: primary-paper
- URL: https://arxiv.org/abs/2112.11446
- Supports: quality filtering, deduplication, source mixture, and evaluation are material parts of a language-model data pipeline rather than incidental preprocessing.
- Claim limit: Gopher's corpus, model scale, and ablations do not define the course corpus or predict laptop-scale gains.

### SRC-DTH-DATA-08 — General Data Protection Regulation, Regulation (EU) 2016/679
- Kind: official-standard
- URL: https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04
- Supports: Article 5 states purpose limitation, data minimisation, accuracy, storage limitation, integrity/confidentiality, and accountability principles; Article 17 defines a right to erasure subject to conditions and exceptions.
- Claim limit: This is the official legal text, not legal advice; applicability, lawful basis, territorial scope, exceptions, and required actions are fact-specific and require qualified review.

### SRC-DTH-DATA-09 — SPDX 3.0.1 License Expressions
- Kind: official-standard
- URL: https://spdx.github.io/spdx-spec/v3.0.1/annexes/spdx-license-expressions/
- Supports: a machine-readable syntax can represent single licenses, alternatives, conjunctions, exceptions, additions, and custom LicenseRef identifiers.
- Claim limit: An SPDX expression records an asserted license relationship; it neither grants permission nor resolves provenance, copyright ownership, conflicting terms, privacy, or jurisdiction.

### SRC-DTH-DATA-10 — SPDX 3.0.1 Licensing Model
- Kind: official-standard
- URL: https://spdx.github.io/spdx-spec/v3.0.1/model/Licensing/Licensing/
- Supports: declared and concluded licensing assertions and their evidence can be represented separately.
- Claim limit: The model is metadata vocabulary, not a legal determination or proof that training and redistribution are permitted.

### SRC-DTH-TOK-01 — Neural Machine Translation of Rare Words with Subword Units
- Kind: primary-paper
- URL: https://aclanthology.org/P16-1162/
- Supports: byte-pair-style subword segmentation learns a fixed vocabulary from corpus symbol-pair frequencies and can represent open-vocabulary text compositionally.
- Claim limit: The paper's translation experiments do not prescribe byte-level initialization, normalization, special-token layout, runtime complexity, or a production tokenizer format for this decoder.

### SRC-DTH-TOK-02 — SentencePiece: A Simple and Language Independent Subword Tokenizer and Detokenizer for Neural Text Processing
- Kind: primary-paper
- URL: https://aclanthology.org/D18-2012/
- Supports: tokenization can operate from raw sentences while treating whitespace as an ordinary symbol and exposing a reproducible segmentation model.
- Claim limit: SentencePiece demonstrates a design and implementation; it does not authorize hiding the course-owned BPE concept behind a library or prove equivalence to the repository tokenizer.

### SRC-DTH-TOK-03 — Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates
- Kind: primary-paper
- URL: https://arxiv.org/abs/1804.10959
- Supports: segmentation choice can be stochastic during training, so tokenizer determinism and RNG policy must be explicit when such controls are taught or evaluated.
- Claim limit: Reported translation improvements do not imply that stochastic segmentation is required or beneficial for the course decoder.

### SRC-DTH-TOK-04 — OpenAI GPT-2 byte-level BPE encoder at commit e5c5054474f583d6d9499624649353995d63c70a
- Kind: official-specification
- URL: https://github.com/openai/gpt-2/blob/e5c5054474f583d6d9499624649353995d63c70a/src/encoder.py
- Supports: the pinned official OpenAI implementation defines GPT-2's byte-to-Unicode mapping and its concrete pretokenization alternatives for apostrophe contractions, optional leading spaces, Unicode letter and number categories, non-space/non-letter/non-number punctuation, and whitespace before byte-level BPE.
- Claim limit: This historical implementation is evidence for those exact pinned rules, not a normative tokenizer standard; behavior also depends on the compatible regex library and Unicode tables, and the file does not establish special-control forgery protection, a normalization policy for another tokenizer, or compatibility with an artifact not independently tested.

### SRC-DTH-PACK-01 — Efficient Sequence Packing without Cross-contamination
- Kind: primary-paper
- URL: https://arxiv.org/abs/2107.02027
- Supports: packing can remove substantial padding while preserving mathematical equivalence only when attention and loss interactions between examples are prevented; the paper reports up to 50 percent padding in a studied BERT setting and an 89 percent packing-efficiency example.
- Claim limit: The figures and speedups are BERT workload results, not a decoder-laptop guarantee; equivalence still requires local logits, valid-loss, gradient, position, and attention tests.

### SRC-DTH-ARCH-01 — Understanding the difficulty of training deep feedforward neural networks
- Kind: primary-paper
- URL: https://proceedings.mlr.press/v9/glorot10a.html
- Supports: initialization scale affects forward activation and backward gradient variance; the proposed normalized initialization depends on fan-in and fan-out.
- Claim limit: Xavier initialization is not a proof of stability for arbitrary residual Transformers, depths, nonlinearities, or low-precision kernels.

### SRC-DTH-ARCH-02 — On Layer Normalization in the Transformer Architecture
- Kind: primary-paper
- URL: https://proceedings.mlr.press/v119/xiong20b.html
- Supports: normalization placement changes gradient behavior at initialization; the paper analyzes Post-LN and Pre-LN Transformers and their warm-up sensitivity.
- Claim limit: Its theory and experiments do not prove stability of this repository's RMSNorm/SwiGLU decoder at a chosen depth or eliminate the need for local gradient measurements.

### SRC-DTH-ARCH-03 — DeepNet: Scaling Transformers to 1,000 Layers
- Kind: primary-paper
- URL: https://arxiv.org/abs/2203.00555
- Supports: depth-dependent residual scaling and initialization can be designed explicitly to stabilize very deep Transformers.
- Claim limit: DeepNorm's constants and architecture assumptions must not be copied into the course's pre-norm RMSNorm decoder without derivation and controlled comparison.

### SRC-DTH-ARCH-04 — Dropout: A Simple Way to Prevent Neural Networks from Overfitting
- Kind: primary-paper
- URL: https://www.jmlr.org/papers/v15/srivastava14a.html
- Supports: dropout randomly drops units and their connections during training and uses a corresponding unthinned-network inference treatment, making training/evaluation mode and stochastic-mask semantics explicit parts of the algorithm.
- Claim limit: The paper's supervised-task improvements do not prove benefit for this decoder, select a dropout probability or placement, define this course's inverted-scaling convention, or make dropout mandatory.

### SRC-DTH-CPU-01 — BLAS Technical Forum standard
- Kind: official-standard
- URL: https://www.netlib.org/blas/blast-forum/
- Supports: BLAS specifies standard kernel interfaces for vector, matrix-vector, matrix-matrix, sparse, and mixed-precision linear-algebra operations and distinguishes reference from optimized implementations.
- Claim limit: A standardized interface does not select a Rust binding, layout conversion, thread policy, numeric tolerance, or implementation, and it does not authorize delegating a learner-facing matrix multiplication or gradient algorithm to BLAS.

### SRC-DTH-CPU-02 — Rust core::arch SIMD and vendor intrinsics
- Kind: official-specification
- URL: https://doc.rust-lang.org/stable/core/arch/index.html
- Supports: Rust documents architecture-specific SIMD intrinsics, static and dynamic CPU-feature detection, portability constraints, and the role of higher-level abstractions over low-level intrinsics.
- Claim limit: The documentation does not guarantee vectorization, safety, portability, speedup, or a stable feature set for an arbitrary dependency; this workspace forbids unsafe course code, so any intrinsic use requires an approved safe supporting boundary.

### SRC-DTH-TRAIN-01 — Mixed Precision Training
- Kind: primary-paper
- URL: https://arxiv.org/abs/1710.03740
- Supports: FP16 arithmetic can reduce memory and improve throughput while retaining FP32 master weights and using loss scaling to preserve small gradients.
- Claim limit: Convergence and speed results depend on the studied hardware, kernels, models, and scaling policy; FP16 never by itself establishes numerical parity or safety.

### SRC-DTH-TRAIN-02 — A Study of BFLOAT16 for Deep Learning Training
- Kind: primary-paper
- URL: https://arxiv.org/abs/1905.12322
- Supports: BF16 keeps FP32's exponent width with fewer significand bits, changing the underflow and rounding tradeoff relative to FP16.
- Claim limit: Format properties do not prove that a particular laptop kernel supports BF16 efficiently or that one tolerance is valid for every operation.

### SRC-DTH-TRAIN-03 — FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
- Kind: primary-paper
- URL: https://papers.neurips.cc/paper_files/paper/2022/hash/67d57c32e20fd0a7a302cb81d36e40d5-Abstract-Conference.html
- Supports: exact attention can reduce high-bandwidth-memory traffic with tiled IO-aware computation, changing the practical memory/throughput boundary without changing mathematical attention.
- Claim limit: Paper results do not show that an approved Rust backend exposes a compatible kernel, that every shape is faster, or that a kernel preserves the course's mask semantics.

### SRC-DTH-TRAIN-04 — Training Deep Nets with Sublinear Memory Cost
- Kind: primary-paper
- URL: https://arxiv.org/abs/1604.06174
- Supports: activation checkpointing trades recomputation for activation memory and the paper gives an O(sqrt(n)) storage construction for an n-layer network.
- Claim limit: Its reported 48 GB to 7 GB example and roughly 30 percent extra forward cost are experiment-specific, not a laptop budget or universal overhead.

### SRC-DTH-TRAIN-05 — Decoupled Weight Decay Regularization
- Kind: primary-paper
- URL: https://arxiv.org/abs/1711.05101
- Supports: AdamW decouples weight decay from the adaptive gradient update, making the event definition and excluded parameter groups important.
- Claim limit: The paper does not select this course's learning rate, decay, schedule, beta values, clipping threshold, or convergence target.

### SRC-DTH-TRAIN-06 — On the difficulty of training Recurrent Neural Networks
- Kind: primary-paper
- URL: https://proceedings.mlr.press/v28/pascanu13.html
- Supports: exploding gradients can be bounded by a norm-clipping operation, whose placement and threshold are part of the optimizer contract.
- Claim limit: The RNN analysis does not establish the optimal clipping threshold or necessity for every Transformer run.

### SRC-DTH-TRAIN-07 — Training Compute-Optimal Large Language Models
- Kind: primary-paper
- URL: https://arxiv.org/abs/2203.15556
- Supports: parameter count and training-token count are jointly consequential; the paper reports compute-optimal scaling findings over its studied large-model range.
- Claim limit: The fitted laws and quality conclusions must not be extrapolated as a guarantee for a 1M-125M-parameter course model, narrow corpus, or single laptop.

### SRC-DTH-RESUME-01 — CheckFreq: Frequent, Fine-Grained DNN Checkpointing
- Kind: primary-paper
- URL: https://www.microsoft.com/en-us/research/publication/checkfreq-frequent-fine-grained-dnn-checkpointing/
- Supports: frequent checkpointing requires coordinated model, optimizer, and input-pipeline continuation; CheckFreq describes resumable data iteration and exactly-once sample semantics.
- Claim limit: Its overhead and recovery results depend on the studied framework and storage stack; they do not validate this repository's checkpoint format.

### SRC-DTH-RESUME-02 — TensorFlow Checkpoint Guide
- Kind: official-specification
- URL: https://www.tensorflow.org/guide/checkpoint
- Supports: a training checkpoint commonly tracks optimizer, model, step, and related state as a dependency graph for restoration.
- Claim limit: This is an official TensorFlow mechanism, not an interchange standard, a dependency recommendation, or proof that these fields are sufficient for this course's exact resume contract.

### SRC-DTH-RESUME-03 — PyTorch Saving and Loading Models
- Kind: official-specification
- URL: https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html
- Supports: a general training checkpoint includes at least model state, optimizer state, epoch, and loss; the documentation notes such checkpoints are often two to three times the size of model weights alone.
- Claim limit: The size observation reflects the documented PyTorch convention and does not bound a Rust format or cover data cursor, RNG, accumulation, evaluation policy, and kernel determinism.

### SRC-DTH-EVAL-01 — On the Stability of Fine-tuning BERT
- Kind: primary-paper
- URL: https://arxiv.org/abs/2002.06305
- Supports: random seeds can materially change downstream results, motivating multiple frozen seeds and distributional reporting instead of a privileged run.
- Claim limit: The reported BERT fine-tuning variance is not a variance estimate for decoder pretraining or this course's scale.

### SRC-DTH-EVAL-02 — Show Your Work: Improved Reporting of Experimental Results
- Kind: primary-paper
- URL: https://aclanthology.org/D19-1224/
- Supports: experimental claims should report variability, hyperparameter search, and enough detail to distinguish robust findings from selective results.
- Claim limit: The checklist does not define a universal seed count, metric, confidence method, or pass threshold.

### SRC-DTH-EVAL-03 — An Empirical Investigation of Statistical Significance in NLP
- Kind: primary-paper
- URL: https://aclanthology.org/P18-1128/
- Supports: observed NLP score differences require an uncertainty or significance analysis matched to the experimental unit and sampling process.
- Claim limit: No one test from the paper is automatically valid for autoregressive token loss, dependent samples, or a small fixed seed set.

### SRC-DTH-EVAL-04 — Language Models are Few-Shot Learners
- Kind: primary-paper
- URL: https://proceedings.neurips.cc/paper/2020/hash/1457c0d6bfcb4967418bfb8ac142f64a-Abstract.html
- Supports: benchmark contamination was explicitly investigated in a large language-model evaluation, demonstrating that train-evaluation overlap is a validity threat.
- Claim limit: GPT-3 results and its contamination procedure do not validate a future course dataset, benchmark, threshold, or model quality.

### SRC-DTH-ART-01 — SafeTensors 0.8.0 format documentation
- Kind: official-specification
- URL: https://github.com/safetensors/safetensors/blob/v0.8.0/README.md
- Supports: the tagged format stores an 8-byte little-endian JSON-header length, a restricted JSON header with dtype, shape, and data offsets, and a contiguous byte buffer.
- Claim limit: SafeTensors covers tensor serialization; it does not contain a complete model architecture, tokenizer, optimizer/job state, provenance, integrity signature, or semantic-compatibility guarantee.

### SRC-DTH-ART-02 — GGUF format documentation
- Kind: official-specification
- URL: https://ggml-org-ggml.mintlify.app/formats/gguf
- Supports: GGUF is a versioned binary tensor and metadata container designed for extensibility and memory mapping.
- Claim limit: The living documentation must be frozen to a resolved revision before fixtures; GGUF metadata does not guarantee course architecture compatibility, safe conversion, tokenizer parity, or training resume.

### SRC-DTH-ART-03 — ONNX Intermediate Representation
- Kind: official-standard
- URL: https://onnx.ai/onnx/repo-docs/IR.html
- Supports: ONNX defines a versioned graph, operators, types, initializers, and external tensor-data references for model interchange.
- Claim limit: The IR does not guarantee that all decoder operators, dynamic-cache semantics, custom kernels, tokenizer behavior, or numerical results round-trip.

### SRC-DTH-ART-04 — Hugging Face Transformers big-model loading
- Kind: official-specification
- URL: https://huggingface.co/docs/transformers/main/en/big_models
- Supports: sharded checkpoint indexes map parameter names to shard files and can bound loader peak to approximately model size plus the largest shard in the documented implementation.
- Claim limit: This is framework documentation, not an authorization to add Transformers, a universal memory bound, or a complete artifact standard.

### SRC-DTH-QUANT-01 — GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers
- Kind: primary-paper
- URL: https://arxiv.org/abs/2210.17323
- Supports: layerwise second-order post-training weight quantization can compress studied Transformer weights to three or four bits with measured accuracy and runtime tradeoffs.
- Claim limit: Reported compression, perplexity, and speed depend on model, calibration data, kernel, and hardware; nominal bit width is not total VRAM or end-to-end speed.

### SRC-DTH-QUANT-02 — AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration
- Kind: primary-paper
- URL: https://proceedings.mlsys.org/paper_files/paper/2024/hash/42a452cbafa9dd64e9ba4aa95cc1ef21-Abstract-Conference.html
- Supports: activation-aware selection and scaling can improve low-bit weight-only quantization for studied language models, and deployment speedups require suitable kernels.
- Claim limit: AWQ results do not establish a course calibration set, legal right to imported weights, exact quality tolerance, or speedup on the RTX 4070 Laptop GPU.

### SRC-DTH-HW-01 — NVIDIA GeForce RTX 40 Series Laptop GPUs
- Kind: official-hardware
- URL: https://www.nvidia.com/en-us/geforce/laptops/40-series/
- Supports: NVIDIA lists the GeForce RTX 4070 Laptop GPU with 4,608 CUDA cores, 8 GB GPU memory, a 1,230-2,175 MHz boost-clock range, and 321 AI TOPS.
- Claim limit: Marketing/specification maxima do not state sustained training throughput, tensor dtype mix, usable allocator bytes, thermals, or a particular OEM laptop's power limit.

### SRC-DTH-HW-02 — NVIDIA GeForce RTX 40 Laptop GPU comparison
- Kind: official-hardware
- URL: https://www.nvidia.com/pt-br/geforce/laptops/compare/
- Supports: NVIDIA's comparison lists RTX 4070 Laptop GPU memory as 8 GB GDDR6 on a 128-bit interface and GPU subsystem power from 35 W to 115 W.
- Claim limit: The vendor range is not a promise that every chassis sustains 115 W, and it does not specify host RAM, SSD, cooling, driver reserve, or end-to-end application performance.

### SRC-DTH-HW-03 — CUDA C++ Programming Guide 13.0
- Kind: official-specification
- URL: https://docs.nvidia.com/cuda/archive/13.0.0/cuda-c-programming-guide/index.html
- Supports: CUDA documents IEEE-like floating-point behavior, Tensor Core and alternate-precision operations, memory spaces, synchronization, and device/runtime feature constraints.
- Claim limit: The guide does not select an approved Rust backend, guarantee that a kernel is used, or make different execution orders bitwise equal.

### SRC-DTH-HW-04 — NVIDIA Management Library device queries
- Kind: official-specification
- URL: https://docs.nvidia.com/deploy/nvml-api/group__nvmlDeviceQueries.html
- Supports: NVML can report total, free, reserved, and used device memory in bytes; used memory includes reserved memory, and support/behavior varies by platform and virtualization mode.
- Claim limit: A query is an observation at one time, not a future peak bound; the implementation must handle unsupported fields and concurrent device consumers.

### SRC-DTH-HW-05 — NVML memory structure
- Kind: official-specification
- URL: https://docs.nvidia.com/deploy/nvml-api/structnvmlMemory__t.html
- Supports: the official structure defines total, free, reserved, and used bytes, with used including allocated and reserved device memory.
- Claim limit: NVML accounting is not identical to a backend allocator's live-tensor accounting and cannot by itself attribute every byte to the course process.

### SRC-DTH-HW-06 — Floating Point and IEEE 754 Compliance for NVIDIA GPUs
- Kind: official-specification
- URL: https://docs.nvidia.com/cuda/archive/13.1.1/pdf/Floating_Point_on_NVIDIA_GPU.pdf
- Supports: rounding, fused multiply-add, operation order, compiler choices, and precision modes can change floating-point results.
- Claim limit: The document explains mechanisms; it does not supply operation-specific course tolerances or justify accepting an unexplained mismatch.

### SRC-DTH-HW-07 — PyTorch reproducibility notes
- Kind: official-specification
- URL: https://docs.pytorch.org/docs/stable/notes/randomness
- Supports: the official framework documentation says complete reproducibility is not guaranteed across releases, commits, platforms, or CPU/GPU execution, and deterministic algorithms can reduce performance.
- Claim limit: This is boundary evidence, not a dependency choice; the course must freeze and test its own backend, kernels, RNG streams, modes, and tolerance contract.

### SRC-DTH-SCALE-01 — Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism
- Kind: primary-paper
- URL: https://arxiv.org/abs/1909.08053
- Supports: tensor-model parallelism partitions Transformer matrix operations across multiple accelerators and introduces explicit communication.
- Claim limit: Reported scaling on multi-GPU systems cannot be reproduced or performance-validated on one RTX 4070 Laptop GPU.

### SRC-DTH-SCALE-02 — ZeRO: Memory Optimizations Toward Training Trillion Parameter Models
- Kind: primary-paper
- URL: https://doi.org/10.1109/SC41405.2020.00024
- Supports: optimizer state, gradients, and parameters can be partitioned across data-parallel processes to reduce per-device memory at the cost of communication and orchestration.
- Claim limit: The paper's cluster results do not make ZeRO meaningful on one GPU or prove network, collective, failure, or elastic behavior.

### SRC-DTH-SCALE-03 — GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism
- Kind: primary-paper
- URL: https://arxiv.org/abs/1811.06965
- Supports: pipeline parallelism partitions layers and uses microbatches, producing a schedule and pipeline-bubble tradeoff.
- Claim limit: A single-process simulation can teach scheduling but cannot validate inter-device transfer, topology, overlap, distributed failure, or real speedup.

### SRC-DTH-SCALE-04 — Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity
- Kind: primary-paper
- URL: https://www.jmlr.org/papers/v23/21-0998.html
- Supports: sparse expert routing activates a subset of parameters per token and requires routing, capacity, dropped-token, load-balancing, and expert-placement policies.
- Claim limit: The paper's TPU-scale quality and speed claims do not transfer to a laptop; sparse parameter count is not equivalent to low total storage or simple distributed execution.

### SRC-ISA-001 — Nucleus sampling
- Kind: primary-paper
- URL: https://arxiv.org/abs/1904.09751v2
- Supports: Nucleus sampling draws from a dynamic high-probability prefix rather than retaining a fixed token count.
- Claim limit: It does not specify this course's tie rule, processor order, numeric tolerance, or quality on the selected model.

### SRC-ISA-002 — Transformers generation configuration and processors
- Kind: official-specification
- URL: https://github.com/huggingface/transformers/tree/v4.57.1/src/transformers/generation
- Supports: A deployed generation library exposes temperature, top-k/top-p, stop criteria, repetition controls, scores/logits, and cache settings as distinct controls.
- Claim limit: It is corroborating implementation vocabulary, not a normative standard; design must pin exact files/commit and must not import its sampler as the taught algorithm.

### SRC-ISA-003 — CTRL
- Kind: primary-paper
- URL: https://arxiv.org/abs/1909.05858v2
- Supports: Historical controllable generation and a repetition-penalty formulation.
- Claim limit: It does not make that multiplicative penalty equivalent to additive presence/frequency penalties or establish a universal ordering.

### SRC-ISA-004 — WHATWG Encoding Standard TextDecoder
- Kind: official-standard
- URL: https://encoding.spec.whatwg.org/#interface-textdecoder
- Supports: Streaming UTF-8 decoding preserves decoder state; fatal and replacement behavior are distinct.
- Claim limit: It does not define token, stop-string, or server-event semantics; implementation must pin a dated snapshot if exact prose matters.

### SRC-ISA-005 — WHATWG server-sent events
- Kind: official-standard
- URL: https://html.spec.whatwg.org/multipage/server-sent-events.html
- Supports: Event streams use UTF-8 and line/event framing; an incomplete final event is not dispatched.
- Claim limit: It does not choose this course's queue, cancellation, keepalive, authentication, or retry policy.

### SRC-ISA-006 — HTTP Semantics
- Kind: official-standard
- URL: https://www.rfc-editor.org/rfc/rfc9110.html
- Supports: Standard HTTP request/response and status semantics, including overload and timeout vocabulary.
- Claim limit: It does not define this service's capacity model, fairness, phase deadlines, or resource admission algorithm.

### SRC-ISA-007 — safetensors format
- Kind: official-specification
- URL: https://github.com/huggingface/safetensors/blob/v0.6.2/README.md#format
- Supports: An 8-byte little-endian header length, UTF-8 JSON tensor metadata, half-open offsets, and an indexed contiguous byte buffer.
- Claim limit: The container stores tensors; it does not by itself specify architecture, tokenizer, generation defaults, licensing, authenticity, or provenance.

### SRC-ISA-008 — GGUF specification
- Kind: official-specification
- URL: https://github.com/ggml-org/ggml/blob/master/docs/gguf.md
- Supports: GGUF is a typed, extensible, alignment- and mmap-oriented inference container with model metadata and tensors.
- Claim limit: The format and quantization set evolve; implementation must pin a commit and support only a declared architecture/version/type subset.

### SRC-ISA-009 — Multi-query attention
- Kind: primary-paper
- URL: https://arxiv.org/abs/1911.02150v1
- Supports: Incremental decoding repeatedly loads K/V; sharing K/V across query heads reduces cache size and memory bandwidth.
- Claim limit: It does not select the course architecture or prove the paper's speed/quality on laptop hardware.

### SRC-ISA-010 — Grouped-query attention
- Kind: primary-paper
- URL: https://arxiv.org/abs/2305.13245v3
- Supports: GQA uses fewer KV heads than query heads and occupies a design point between MHA and MQA.
- Claim limit: Reported quality/speed tradeoffs do not transfer to an untrained reference model or unspecified backend.

### SRC-ISA-011 — FlashAttention
- Kind: primary-paper
- URL: https://arxiv.org/abs/2205.14135v2
- Supports: IO-aware tiling can compute exact attention without materializing the full score/probability matrices in high-bandwidth memory.
- Claim limit: Exact math need not be bitwise identical under different reduction order, and paper hardware performance is not a laptop gate.

### SRC-ISA-012 — Mistral 7B
- Kind: primary-paper
- URL: https://arxiv.org/abs/2310.06825v1
- Supports: A concrete modern decoder combines GQA and sliding-window attention.
- Claim limit: Its quality and context claims do not imply unbounded memory, position encoding, or recall after eviction in this course.

### SRC-ISA-013 — PagedAttention and vLLM
- Kind: primary-paper
- URL: https://arxiv.org/abs/2309.06180v1
- Supports: Per-request KV state grows and shrinks dynamically; block paging targets fragmentation, duplication, and flexible sharing.
- Claim limit: Published throughput and production implementation complexity are hardware/workload specific and are not acceptance thresholds here.

### SRC-ISA-014 — Orca
- Kind: primary-paper
- URL: https://www.usenix.org/conference/osdi22/presentation/yu
- Supports: Iteration-level scheduling permits completed requests to depart and new requests to enter instead of holding a static batch until all finish.
- Claim limit: The distributed 175B system result does not establish local feasibility or prescribe this scheduler's policy.

### SRC-ISA-015 — Sarathi-Serve
- Kind: primary-paper
- URL: https://arxiv.org/abs/2403.02310v3
- Supports: Prefill and decode have different utilization/latency behavior; chunking prefill can alter throughput and tail-latency tradeoffs.
- Claim limit: A100 results are not laptop predictions, and chunk size/fairness remain measured engineering choices.

### SRC-ISA-016 — Fairness in serving LLMs
- Kind: primary-paper
- URL: https://arxiv.org/abs/2401.00588v2
- Supports: Fair scheduling must account for token cost and unpredictable output length, not only request count.
- Claim limit: Its multi-tenant policy and benchmark results do not define the one-user course scheduler or a universal fairness objective.

### SRC-ISA-017 — Prometheus exposition formats
- Kind: official-specification
- URL: https://prometheus.io/docs/instrumenting/exposition_formats/
- Supports: Counters, gauges, histograms, summaries, labels, and text exposition have defined representation conventions.
- Claim limit: It does not choose metric names, units, buckets, privacy policy, or cardinality limits; the implementation must pin a supported format.

### SRC-ISA-018 — OpenTelemetry generative-AI semantic attributes
- Kind: official-specification
- URL: https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/
- Supports: Request settings, finish reasons, usage, and time-to-first-chunk have interoperable vocabulary; prompt/output/retrieval/tool fields can be sensitive.
- Claim limit: The registry neither requires collecting content nor proves safe retention; exact convention version must be pinned before implementation.

### SRC-ISA-019 — LoRA
- Kind: primary-paper
- URL: https://arxiv.org/abs/2106.09685v2
- Supports: Freeze pretrained weights and train low-rank update matrices inserted into selected weight transformations.
- Claim limit: Large-model parameter/memory ratios and quality results are paper-specific; they do not prove this laptop recipe or useful adaptation.

### SRC-ISA-020 — QLoRA
- Kind: primary-paper
- URL: https://arxiv.org/abs/2305.14314v1
- Supports: Backpropagation through a frozen 4-bit base into LoRA parameters, with NF4, double quantization, and paged-optimizer techniques.
- Claim limit: A 65B model on a 48 GiB GPU is not evidence that a selected model or training length fits 8 GiB.

### SRC-ISA-021 — Direct Preference Optimization
- Kind: primary-paper
- URL: https://arxiv.org/abs/2305.18290v3
- Supports: A common KL-constrained preference objective can be optimized as a classification-style loss without a separately trained reward model and PPO loop.
- Claim limit: DPO on a tiny fixed preference set does not prove broad alignment, safety, or superiority over other objectives.

### SRC-ISA-022 — InstructGPT
- Kind: primary-paper
- URL: https://arxiv.org/abs/2203.02155v1
- Supports: A representative RLHF pipeline includes demonstrations/SFT, ranked preferences, reward-model training, and PPO optimization.
- Claim limit: Its workforce, model scale, quality results, and safety conclusions are beyond the mandatory laptop exercise.

### SRC-ISA-023 — Retrieval-Augmented Generation
- Kind: primary-paper
- URL: https://arxiv.org/abs/2005.11401v4
- Supports: Generation can condition on retrieved non-parametric records whose identity/provenance can be exposed separately from model parameters.
- Claim limit: Retrieval does not guarantee truth, citation entailment, freshness, authorization, or resistance to malicious documents.

### SRC-ISA-024 — ReAct
- Kind: primary-paper
- URL: https://openreview.net/forum?id=WE_vluYUL-X
- Supports: Model reasoning traces can be interleaved with actions and observations in an external environment.
- Claim limit: Reported task gains are not evidence that arbitrary model-proposed actions are valid, authorized, safe, or deterministic.

### SRC-ISA-025 — Toolformer
- Kind: primary-paper
- URL: https://arxiv.org/abs/2302.04761v1
- Supports: A model can be trained to decide whether and how to call APIs rather than relying only on host-side orchestration.
- Claim limit: Learned tool selection is distinct from schema validation, authorization, confirmation, timeout, and execution isolation.

### SRC-ISA-026 — PICARD constrained decoding
- Kind: primary-paper
- URL: https://aclanthology.org/2021.emnlp-main.779/
- Supports: An incremental parser can reject inadmissible tokens during autoregressive decoding rather than only validating the final string.
- Claim limit: The SQL grammar/result does not supply a complete JSON Schema implementation or guarantee semantic correctness.

### SRC-ISA-027 — JSON Schema 2020-12
- Kind: official-specification
- URL: https://json-schema.org/draft/2020-12/json-schema-core
- Supports: JSON Schema defines schemas, vocabularies, references, instances, and annotation/assertion processing.
- Claim limit: A valid JSON instance may still be factually wrong, unauthorized, unsafe to execute, or outside the course's explicitly supported subset.

### SRC-ISA-028 — JSON Schema validation vocabulary
- Kind: official-specification
- URL: https://json-schema.org/draft/2020-12/json-schema-validation
- Supports: Defines validation keywords and their assertion semantics separately from core schema structure.
- Claim limit: The course must enumerate unsupported keywords/formats and cannot advertise full draft compliance from a small grammar subset.

### SRC-ISA-029 — Model Context Protocol tools
- Kind: official-specification
- URL: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- Supports: Tools expose input/output schemas; implementations should validate inputs/results and clients should apply confirmation, timeout, and audit controls for sensitive operations.
- Claim limit: Tool annotations are untrusted, and the protocol does not grant authority or make a model-proposed call safe.

### SRC-ISA-030 — llama.cpp GBNF guide
- Kind: official-specification
- URL: https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md
- Supports: A practical inference implementation constrains output with grammars and converts a documented subset of JSON Schema to grammar rules.
- Claim limit: It is not proof of complete JSON Schema support; implementation must pin a commit and may not delegate the taught token-mask algorithm.

### SRC-ISA-031 — Training-data extraction
- Kind: primary-paper
- URL: https://www.usenix.org/conference/usenixsecurity21/presentation/carlini-extracting
- Supports: Memorized training examples, including sensitive strings, can sometimes be extracted from language models.
- Claim limit: The paper establishes a risk class, not leakage by this tiny model, and no finite canary suite proves absence of memorization.

### SRC-ISA-032 — Indirect prompt injection
- Kind: primary-paper
- URL: https://arxiv.org/abs/2302.12173v2
- Supports: Untrusted retrieved or tool-provided content can manipulate an LLM-integrated application and cross instruction/data trust boundaries.
- Claim limit: Delimiters or warnings alone are not a proof of containment; the paper does not prescribe a complete authorization architecture.

### SRC-ISA-033 — HELM
- Kind: primary-paper
- URL: https://arxiv.org/abs/2211.09110v2
- Supports: Evaluation should make scenarios, metrics, prompting/adaptation, and omitted coverage explicit rather than compressing capability into one score.
- Claim limit: HELM's suite and results do not define this course's model-specific thresholds or prove universal capability/safety.

### SRC-ISA-034 — Model Cards
- Kind: primary-paper
- URL: https://doi.org/10.1145/3287560.3287596
- Supports: A model report should state intended uses, evaluation conditions, limitations, and risk-relevant context.
- Claim limit: Documentation does not itself validate claims, mitigate harm, establish legal compliance, or certify safety.

### SRC-ISA-035 — NIST AI RMF Generative AI Profile
- Kind: official-specification
- URL: https://doi.org/10.6028/NIST.AI.600-1
- Supports: Voluntary lifecycle risk-management guidance covering confabulation, privacy, information security, and component integration among other risks.
- Claim limit: It is not a certification, exhaustive checklist, legal determination, or model-specific acceptance threshold.

### SRC-ISA-036 — PostgreSQL concurrency and isolation
- Kind: official-specification
- URL: https://www.postgresql.org/docs/18/mvcc.html
- Supports: MVCC permits concurrent access while preserving defined visibility behavior.
- Claim limit: MVCC alone does not choose schema boundaries, make a workflow idempotent, eliminate conflicts, or remove the need for application tests.

### SRC-ISA-037 — PostgreSQL transaction isolation
- Kind: official-specification
- URL: https://www.postgresql.org/docs/18/transaction-iso.html
- Supports: Serializable execution aims at results consistent with some serial order and applications must be prepared to retry serialization failures.
- Claim limit: Serializable does not make external side effects transactional or automatically choose safe retry/idempotency semantics.

### SRC-ISA-038 — PostgreSQL unique constraints and conflict handling
- Kind: official-specification
- URL: https://www.postgresql.org/docs/18/sql-insert.html
- Supports: Unique indexes/constraints and INSERT ON CONFLICT can atomically arbitrate a conflicting row insertion.
- Claim limit: They do not define an idempotency key's scope, bind it to a request hash, or make a second different request safe.

### SRC-ISA-039 — PostgreSQL dump and restore
- Kind: official-specification
- URL: https://www.postgresql.org/docs/18/backup-dump.html
- Supports: Logical dumps can be produced consistently and restored into another database; archive formats support selective restore.
- Claim limit: A dump is not a verified recovery until restored and checked; restoring untrusted dumps can execute code chosen by source superusers.

### SRC-ISA-040 — PostgreSQL continuous archiving and PITR
- Kind: official-specification
- URL: https://www.postgresql.org/docs/18/continuous-archiving.html
- Supports: Base backups plus archived WAL permit point-in-time recovery.
- Claim limit: PITR adds operational storage, retention, security, and drill obligations and is not justified by a single-user teaching database alone.

### SRC-ISA-041 — Megatron-LM
- Kind: primary-paper
- URL: https://arxiv.org/abs/1909.08053v4
- Supports: Tensor/model parallel training partitions large Transformer computation across devices and introduces collective-communication boundaries.
- Claim limit: Multi-GPU scale/performance results do not transfer to one 8 GiB laptop or define a local inference service.

### SRC-ISA-042 — Switch Transformers
- Kind: primary-paper
- URL: https://arxiv.org/abs/2101.03961v3
- Supports: Sparse expert routing activates a subset of experts per token and introduces capacity and load-balancing considerations.
- Claim limit: Sparse activation reduces active computation relative to dense total parameters; it does not make all expert weights, routing imbalance, or communication free.

### SRC-ISA-043 — GShard
- Kind: primary-paper
- URL: https://arxiv.org/abs/2006.16668v1
- Supports: Conditional computation at scale needs sharding annotations, communication, capacity control, and load-balancing behavior.
- Claim limit: Its distributed infrastructure and scale are outside the laptop endpoint; a simulator cannot claim measured distributed speedup.

### SRC-ISA-044 — Mixtral of Experts
- Kind: primary-paper
- URL: https://arxiv.org/abs/2401.04088v1
- Supports: A modern decoder can use top-k expert routing while retaining a much larger total parameter set than the active subset per token.
- Claim limit: Model quality, memory, expert layout, and serving throughput do not transfer to a tiny course simulation.

### SRC-ISA-045 — Fast inference through speculative decoding
- Kind: primary-paper
- URL: https://arxiv.org/abs/2211.17192v2
- Supports: A draft model can propose several tokens and a target model can verify/correct them while preserving the target distribution under the specified acceptance procedure.
- Claim limit: Reported speedups, hardware, draft-target pair, and implementation costs do not transfer to the selected laptop; incorrect acceptance/correction changes the distribution.

### SRC-ISA-046 — Cargo dependency resolution and lock files
- Kind: official-specification
- URL: https://doc.rust-lang.org/cargo/guide/cargo-toml-vs-cargo-lock.html
- Supports: Cargo.toml declares dependency requirements and Cargo.lock records the exact resolved dependency graph for reproducible builds.
- Claim limit: A lockfile does not itself assess source, license, advisories, duplicate versions, supporting-library role, or whether a dependency hides a taught concept.

### SRC-ISA-047 — Cargo offline and locked modes
- Kind: official-specification
- URL: https://doc.rust-lang.org/cargo/commands/cargo-build.html
- Supports: Cargo build supports locked and offline modes that refuse lockfile drift and network access when required artifacts are already available.
- Claim limit: Offline locked success depends on a provisioned cache/toolchain and does not authorize downloads or prove dependency suitability/security.

### SRC-ISA-048 — RoFormer rotary position embedding
- Kind: primary-paper
- URL: https://arxiv.org/abs/2104.09864v5
- Supports: RoPE applies pairwise rotations whose angles depend on absolute position and a frequency schedule, producing relative-position structure in attention.
- Claim limit: Its sequence-length flexibility and task results do not prove that an already trained model generalizes beyond its trained context or that changing the frequency base is harmless.

### SRC-ISA-049 — GPT-NeoX partial rotary dimensions
- Kind: primary-paper
- URL: https://arxiv.org/abs/2204.06745v1
- Supports: GPT-NeoX-20B documents a concrete partial-RoPE architecture that applies rotation to the first 25 percent of each embedding vector rather than every dimension.
- Claim limit: The 25 percent choice, 20B model results, and training hardware do not transfer to the selected course model; an imported model must reproduce its own declared rotary layout exactly.

### SRC-ISA-050 — Position Interpolation
- Kind: primary-paper
- URL: https://arxiv.org/abs/2306.15595v2
- Supports: Position Interpolation extends a RoPE model by linearly scaling position indices into the original trained range and uses additional fine-tuning/evaluation rather than treating longer allocation as proof.
- Claim limit: Its 7B-to-65B results, 32,768-token examples, and training recipe do not establish laptop feasibility, quality, or safe extrapolation for another model.

### SRC-ISA-051 — YaRN context extension
- Kind: primary-paper
- URL: https://arxiv.org/abs/2309.00071v3
- Supports: YaRN is a frequency-aware RoPE extension method and reports that ordinary RoPE models can fail beyond their trained length, motivating explicit retraining and long-context evaluation.
- Claim limit: Its method-specific scaling, 128k result, data, quality, and efficiency comparisons do not transfer; merely changing a base or advertised maximum context is not equivalent to YaRN.

### SRC-ISA-052 — pgvector exact and approximate search
- Kind: official-specification
- URL: https://github.com/pgvector/pgvector/blob/v0.8.6/README.md
- Supports: pgvector adds exact vector distance ordering and optional HNSW/IVFFlat approximate indexes to PostgreSQL; approximate indexes trade recall for speed and filtering can alter returned counts.
- Claim limit: This optional extension does not justify a database for the bounded 1,000-record course fixture, preserve the course tie/citation/authorization contract automatically, or establish that approximate retrieval meets any recall, latency, concurrency, or recovery need.

## Capability records

Capabilities are intentionally finer-grained than future chapters. Each Dependencies field lists directional prerequisite capability edges, and the complete capability graph must remain acyclic. Symmetric differential and integration obligations belong in gates or boundaries rather than backward prerequisites. The design step may group records only when it preserves every edge, gate, resource ceiling, misconception warning, and boundary below and projects them into an acyclic implementation-step graph. Every exact English chapter or cheat-sheet path in a capability is paired literally with its same-slug Russian path; there is no implicit localization wildcard.

## CAP-DTH-DATA-01 — Immutable acquisition provenance, licensing, attribution, and redistribution
- Classification: mandatory-laptop-implementation
- Domain: data-governance
- Source evidence: SRC-DTH-DATA-01, SRC-DTH-DATA-05, SRC-DTH-DATA-09, and SRC-DTH-DATA-10 support structured source/composition/process documentation and separate declared/concluded license assertions; none proves that a proposed source is licensed for training or redistribution.
- Current repo evidence: `rust/crates/llm-from-scratch/src/corpus.rs` retains document ID, language, provenance_group, ordered-corpus checksum, and split membership after a bundled corpus already exists; `curriculum/chapters/02-corpus-partitions.md` teaches that a split manifest cannot prove where text came from, what collection terms applied, or whether the sample is representative.
- Gap: There is no pre-acquisition inventory, immutable exact-revision URL, expected SHA-256 and byte count, media type, per-source license text and hash, attribution/notice bundle, access date, redistribution flag, collection method, transformation chain, revocation/removal procedure, resumable partial-download protocol, or fail-closed offline fixture manifest.
- Exact affected files: Proposed future owners are `rust/crates/llm-from-scratch/src/data_manifest.rs`, `rust/crates/llm-from-scratch/src/corpus_pipeline.rs`, `scripts/acquire-functional-llm-artifacts.mjs`, `curriculum/chapters/02-corpus-partitions.md`, `curriculum/chapters/03-learn-bpe-merges.md`, `site/src/content/chapters/en/02-corpus-partitions.mdx`, `site/src/content/chapters/ru/02-corpus-partitions.mdx`, `site/src/content/chapters/en/03-learn-bpe-merges.mdx`, `site/src/content/chapters/ru/03-learn-bpe-merges.mdx`, `rust/demos/ch02-corpus-partitions/`, `rust/demos/ch03-learn-bpe-merges/`, and matching Rust/site tests; `Cargo.toml`, `Cargo.lock`, and `DECISIONS.md` change only after a supporting-parser/downloader decision.
- Dependencies: Legal review of each chosen source, the frozen resource contract, and the repository supporting-library allowlist.
- Conservative laptop/resource estimate: Manifest plus license and attribution text should be under 10 MiB; mandatory approved downloads must be at most 4 GB, resumable in chunks no larger than 64 MiB, with 10-60 min budget at 25-100 Mbit/s and at most 30 GB total working disk under the core profile.
- Falsifiable gates: With networking disabled, reject one-bit SHA-256 drift, byte-count drift, URL/revision drift, missing or changed license-text hash, absent attribution, a source marked non-redistributable in a redistribution build, partial-file publication, undeclared source bytes, and a transformation whose tool/version/config/input/output hashes are absent; accept only when every retained document maps to one frozen source record and the assembled corpus hash reproduces twice.
- Learner misconception risk: A checksum proves byte identity, not lawful acquisition; an SPDX identifier records an assertion, not permission; public accessibility is not a training or redistribution license; a provenance group is not a complete chain of custody.
- Boundary: The course may ship only redistributable, review-cleared fixtures and reproducible manifests; legally ambiguous, access-controlled, revocable, or large corpora remain optional user-supplied inputs outside acceptance, and this audit gives no legal advice.

## CAP-DTH-DATA-02 — Privacy inventory, PII controls, deletion, and non-memorization probes
- Classification: mandatory-laptop-implementation
- Domain: safety-privacy
- Source evidence: SRC-DTH-DATA-04 establishes that verbatim extraction including PII is possible under studied model/attack conditions; SRC-DTH-DATA-08 states official minimisation, storage, accountability, and conditional erasure principles; neither provides a universal detector or legal determination.
- Current repo evidence: `rust/crates/llm-from-scratch/src/corpus.rs` validates schema, duplicates, checksum, and split partitioning but has no consent/lawful-basis field, PII annotation, retention deadline, subject-removal tombstone, detector receipt, leakage probe, or derivative-artifact invalidation graph.
- Gap: The course lacks a documented privacy threat model, source-level sensitive-data policy, deterministic high-precision detector plus review queue, allow/deny decisions, opt-out/removal workflow, derivative invalidation, canary-free memorization tests, and a statement that automated detection is incomplete.
- Exact affected files: Proposed future owners are `rust/crates/llm-from-scratch/src/data_manifest.rs`, `rust/crates/llm-from-scratch/src/corpus_pipeline.rs`, `rust/crates/llm-from-scratch/src/evaluation.rs`, `curriculum/chapters/03-learn-bpe-merges.md`, `curriculum/chapters/34-final-evaluation.md`, `site/src/content/chapters/en/03-learn-bpe-merges.mdx`, `site/src/content/chapters/ru/03-learn-bpe-merges.mdx`, `site/src/content/chapters/en/34-final-evaluation.mdx`, `site/src/content/chapters/ru/34-final-evaluation.mdx`, `rust/demos/ch03-learn-bpe-merges/`, `rust/demos/ch34-final-evaluation/`, and matching tests; any detector dependency requires manifest, lockfile, allowlist, and `DECISIONS.md` entries.
- Dependencies: CAP-DTH-DATA-01 source identity and qualified privacy/legal review for the selected corpus.
- Conservative laptop/resource estimate: Run deterministic scans in streaming chunks of at most 64 MiB with at most 2 GiB host RAM; retain under 100 MiB of redacted findings/receipts; a 4 GB input at an estimated 20-100 MB/s local scan rate costs about 40-200 s per pass before human review, with 2 complete passes budgeted under 10 min.
- Falsifiable gates: A seeded test corpus must yield 100 percent detection of the frozen high-risk fixtures and zero raw sensitive values in logs; every finding must have source-byte offsets and a review disposition; deleting one source record must deterministically change the corpus/token/checkpoint lineage and prevent stale training, and later artifact, persistence, and resume implementations must reject every descendant that retains the removed identity; an extraction/memorization probe threshold and sample plan must be frozen before results; acceptance fails if the course claims exhaustive PII detection or legal compliance.
- Learner misconception risk: Removing obvious email addresses does not anonymize text; small models can still memorize; a low probe hit rate is not proof of privacy; deletion from source without invalidating token shards and checkpoints is not deletion from the pipeline.
- Boundary: Only synthetic or expressly cleared privacy fixtures may be bundled; real-person data, re-identification, jurisdictional compliance, production data-subject request handling, and formal privacy guarantees require external specialists and remain outside laptop acceptance.

## CAP-DTH-DATA-03 — Deterministic filtering, quality accounting, and source-mixture controls
- Classification: mandatory-laptop-implementation
- Domain: data-quality
- Source evidence: SRC-DTH-DATA-02, SRC-DTH-DATA-06, and SRC-DTH-DATA-07 show that web-corpus filtering and source mixture materially affect composition, can create exclusion/skew, and need measured stage-level accounting; their specific filters and gains do not transfer automatically.
- Current repo evidence: `rust/crates/llm-from-scratch/src/corpus.rs` checks nonempty text and language/provenance fields, while `curriculum/chapters/03-learn-bpe-merges.md` demonstrates a tiny fixed transformation; there is no scalable encoding validation, language-confidence threshold, boilerplate/repetition/quality rule set, per-stage reject ledger, or mixture budget.
- Gap: The future corpus path needs versioned deterministic rules with reason codes, before/after byte-document-token counts by source/language, bounded manual audit samples, encoding and control-character policy, quality/repetition metrics, mixture caps, and a retained reject-hash ledger without retaining disallowed raw text unnecessarily.
- Exact affected files: Proposed future owners are `rust/crates/llm-from-scratch/src/corpus_pipeline.rs`, `rust/crates/llm-from-scratch/src/data_manifest.rs`, `curriculum/chapters/03-learn-bpe-merges.md`, `site/src/content/chapters/en/03-learn-bpe-merges.mdx`, `site/src/content/chapters/ru/03-learn-bpe-merges.mdx`, `rust/demos/ch03-learn-bpe-merges/`, `site/src/content.config.ts`, and new unit/integration fixture tests; dependency changes, if any, belong in `rust/crates/llm-from-scratch/Cargo.toml`, `Cargo.lock`, and `DECISIONS.md`.
- Dependencies: CAP-DTH-DATA-01, CAP-DTH-DATA-02, a frozen language/quality policy, and the required canonical-English and localization review workflows before changing learner-facing surfaces.
- Conservative laptop/resource estimate: Stream a maximum 4 GB compressed/core input with at most 4 GiB host peak and at most 2 times input bytes of transient filtered output; budget 2-6 linear passes, 5-60 min total on a modern laptop SSD/CPU, and under 100 MiB for aggregate receipts and bounded audit samples.
- Falsifiable gates: Two executions over identical bytes/config/tool versions must produce identical retained-document order, reject reason codes, stage counts, and SHA-256; every input document must appear in exactly one retained or rejected count; per-source/language mixture differences must reconcile exactly; fixture tests must force each rule and verify that changing one threshold changes the filter-config hash and downstream lineage.
- Learner misconception risk: “Clean” is not a scalar truth; a heuristic can delete dialects or minority-language text; higher classifier score is not license, truth, representativeness, or safety; reporting only retained count hides selection effects.
- Boundary: The mandatory path teaches and measures a small explicit rule set; opaque learned quality classifiers and web-scale distributed filtering require separately licensed models/data, bias analysis, and a bounded extension.

## CAP-DTH-DATA-04 — Exact/near deduplication and train-evaluation decontamination
- Classification: mandatory-laptop-implementation
- Domain: data-quality
- Source evidence: SRC-DTH-DATA-03 supports exact and approximate deduplication and demonstrates studied memorization/validation-overlap effects; SRC-DTH-EVAL-04 supports treating benchmark contamination as an evaluation-validity threat; neither supplies a universal similarity threshold.
- Current repo evidence: `rust/crates/llm-from-scratch/src/corpus.rs` rejects exact duplicate full-document text and split overlap by document ID/provenance group; `rust/crates/llm-from-scratch/src/data.rs` keeps windows within documents. It cannot detect normalization variants, substrings, fuzzy duplicates, copied benchmark items, or train-test n-gram leakage.
- Gap: Add canonicalization that retains raw-to-normalized lineage, exact content hashes, a course-owned inspectable near-duplicate method, connected-component/canonical-retention policy, cross-split and benchmark overlap scans, threshold-sensitivity evidence, and a decontamination report frozen before final evaluation.
- Exact affected files: Proposed future owners are `rust/crates/llm-from-scratch/src/corpus_pipeline.rs`, `rust/crates/llm-from-scratch/src/evaluation.rs`, `curriculum/chapters/03-learn-bpe-merges.md`, `curriculum/chapters/34-final-evaluation.md`, `site/src/content/chapters/en/03-learn-bpe-merges.mdx`, `site/src/content/chapters/ru/03-learn-bpe-merges.mdx`, `site/src/content/chapters/en/34-final-evaluation.mdx`, `site/src/content/chapters/ru/34-final-evaluation.mdx`, `rust/demos/ch03-learn-bpe-merges/`, `rust/demos/ch34-final-evaluation/`, and deterministic adversarial fixtures/tests.
- Dependencies: CAP-DTH-DATA-01 source lineage, CAP-DTH-DATA-03 canonical filtering order, a predeclared held-out evaluation/benchmark inventory, and a supporting hash/index decision that does not hide the taught similarity rule.
- Conservative laptop/resource estimate: For at most 30M core-profile tokens, use streaming fingerprints with at most 6 GiB host RAM, at most 8 GB index/scratch disk, and 5-60 min; exact-document hashing must be linear, and any quadratic reference comparison is restricted to fixtures of at most 10,000 documents.
- Falsifiable gates: At least 6 frozen fixtures must distinguish exact, Unicode/whitespace-normalized, overlapping-substring, paraphrase-like nonduplicate, and below/above-threshold cases; identical input/config must yield identical duplicate components and canonical survivor; zero train-validation-test exact hash overlap and zero above-threshold benchmark overlap are required, while every excluded match records score, threshold, source IDs, and retained side; threshold is frozen before held-out metrics.
- Learner misconception risk: Document-ID disjointness is not content disjointness; exact hashes miss near duplicates; fuzzy matching can delete legitimately repeated boilerplate or related language; decontamination prevents a known overlap class but does not prove generalization.
- Boundary: Laptop acceptance covers bounded deterministic exact and inspectable approximate checks over the approved core corpus; semantic deduplication with external embedding models and internet-scale benchmark search is optional and cannot be acceptance-critical.

## CAP-DTH-TOK-01 — Deterministic byte-covering train-only BPE reference
- Classification: reference-core-proven
- Domain: tokenization
- Source evidence: SRC-DTH-TOK-01 supports learned pair-merge subwords and SRC-DTH-TOK-02 supports explicit raw-text segmentation models; the repository's byte-level layout and exact tie-breaks are course-owned choices beyond those papers.
- Current repo evidence: `rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs` learns only from the training partition with explicit merge ordering and tie-breaks; `rust/crates/llm-from-scratch/src/tokenizer/bpe.rs` provides all 256 byte values, BOS/EOS, versioned layout, strict validation, deterministic encode/decode, and no PAD token; tokenizer, split, pipeline, and checkpoint tests bind this behavior.
- Gap: No gap inside the deliberately tiny reference contract; the proof is limited by small fixtures and does not establish scalable training/application complexity, normalization policy, interoperability, or padding semantics.
- Exact affected files: Existing proof owners are `rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs`, `rust/crates/llm-from-scratch/src/tokenizer/bpe.rs`, `rust/crates/llm-from-scratch/src/pipeline.rs`, `rust/crates/llm-from-scratch/src/checkpoint.rs`, `curriculum/chapters/03-learn-bpe-merges.md`, `curriculum/chapters/04-apply-bpe-tokenizer.md`, `curriculum/chapters/18-token-embeddings.md`, `site/src/content/chapters/en/03-learn-bpe-merges.mdx`, `site/src/content/chapters/ru/03-learn-bpe-merges.mdx`, `site/src/content/chapters/en/04-apply-bpe-tokenizer.mdx`, `site/src/content/chapters/ru/04-apply-bpe-tokenizer.mdx`, `rust/demos/ch03-learn-bpe-merges/`, and `rust/demos/ch04-apply-bpe-tokenizer/`; no new file is required for this narrow classification.
- Dependencies: CAP-DTH-DATA-04, the current deterministic corpus/split contract, and the course-owned tokenizer implementation.
- Conservative laptop/resource estimate: Current eight-merge fixtures require under 1 MiB input, under 256 MiB host RAM, 0 B external download, and under 10 s CPU time; these are audit ceilings, not measured benchmark receipts.
- Falsifiable gates: All 256 singleton bytes and frozen multilingual/invalid-UTF8 byte fixtures must encode then decode exactly where the API promises byte identity; training-partition reordering rules and pair-tie fixtures must reproduce identical serialized artifacts; validation/test text must not affect learned merges; one-bit artifact corruption, illegal special-token IDs, duplicate merges, and incompatible version must be rejected; every later scalable or imported tokenizer path must remain additive and differentially checked against this exact reference wherever their contracts overlap.
- Learner misconception risk: Byte coverage prevents unknown bytes but does not make segmentation linguistically meaningful, efficient, normalized, or compatible with another tokenizer; deterministic BPE does not imply production speed.
- Boundary: This classification proves only the inspectable tiny CPU reference; larger vocabularies, fast streaming application, PAD semantics, imported tokenizer compatibility, and stochastic segmentation belong to CAP-DTH-TOK-02.

## CAP-DTH-TOK-02 — Scalable tokenizer controls, artifacts, and efficiency
- Classification: mandatory-laptop-implementation
- Domain: tokenization
- Source evidence: SRC-DTH-TOK-01, SRC-DTH-TOK-02, and SRC-DTH-TOK-03 support explicit learned segmentation, raw-text/whitespace policy, and frozen randomness; SRC-DTH-TOK-04 narrowly establishes the pinned GPT-2 apostrophe/leading-space/Unicode-letter/Unicode-number/punctuation/whitespace pretokenization alternatives and byte mapping, not a generic or normative tokenizer policy.
- Current repo evidence: The BPE implementation is deterministic and inspectable but applies learned merges by repeatedly scanning sequences in rank order, uses an eight-merge teaching artifact, has no PAD token, no explicit normalization/pretokenization or Unicode-category-barrier record, no structural-only special-control insertion API, no streaming corpus trainer, no production vocabulary target, and no independent imported-tokenizer compatibility fixture.
- Gap: Add a versioned tokenizer artifact that binds an explicit normalization-or-no-normalization byte policy, pinned pretokenization/whitespace/category rules and Unicode/regex version, byte fallback, structurally inserted special-token IDs including PAD when used, merge/vocabulary order, training-corpus hash, trainer version/config/RNG, and efficiency counters; retain a course-owned reference path, implement a faster path without changing segmentation, and independently prove the one selected imported artifact's IDs and decoded bytes.
- Exact affected files: Proposed future owners are `rust/crates/llm-from-scratch/src/tokenizer/artifact.rs`, `rust/crates/llm-from-scratch/src/tokenizer/streaming.rs`, updates to `rust/crates/llm-from-scratch/src/tokenizer/bpe.rs` and `rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs`, `curriculum/chapters/03-learn-bpe-merges.md`, `curriculum/chapters/04-apply-bpe-tokenizer.md`, `site/src/content/chapters/en/03-learn-bpe-merges.mdx`, `site/src/content/chapters/ru/03-learn-bpe-merges.mdx`, `site/src/content/chapters/en/04-apply-bpe-tokenizer.mdx`, `site/src/content/chapters/ru/04-apply-bpe-tokenizer.mdx`, `rust/demos/ch03-learn-bpe-merges/`, `rust/demos/ch04-apply-bpe-tokenizer/`, and proposed `rust/crates/llm-from-scratch/tests/tokenizer_equivalence.rs`; any support dependency changes `rust/crates/llm-from-scratch/Cargo.toml`, `Cargo.lock`, and `DECISIONS.md`.
- Dependencies: CAP-DTH-DATA-01, CAP-DTH-DATA-02, CAP-DTH-DATA-03, CAP-DTH-DATA-04, CAP-DTH-TOK-01 as scalar oracle, a pinned Unicode/regex and normalization decision, one provenance-cleared imported tokenizer artifact/revision, and approved supporting containers.
- Conservative laptop/resource estimate: Core target estimate is a 4,096-16,384 token vocabulary trained over at most 30M tokens with at most 4 GiB host RAM, at most 4 GB scratch disk, and under 60 min CPU time; artifact including vocabulary/merges/config should remain under 10 MiB; encode throughput gate is at least 1 MiB/s on the frozen host fixture.
- Falsifiable gates: Reference and fast implementations must emit identical token IDs for every frozen fixture and 10,000 seeded randomized byte strings; at least 32 frozen pretoken fixtures spanning Unicode letter/number categories, multilingual scripts, apostrophe contractions, leading/interior/trailing whitespace, digits, punctuation, combining marks, and line breaks must match exact expected pretoken pieces; the declared no-normalization policy must preserve distinct input bytes exactly, or a selected normalizer must emit frozen before/after bytes with its version; ordinary text equal to a displayed special-token spelling must encode as ordinary input and can never forge BOS/EOS/PAD/control IDs, which only a typed structural API may insert; the one selected imported tokenizer artifact must match exact token IDs and decoded bytes from an independent oracle on at least 100 frozen strings; two training runs must produce byte-identical artifacts; peak RAM/disk/time counters must remain within limits; no validation/test byte may influence training; all special/ordinary ID ranges must be disjoint and versioned.
- Learner misconception risk: A larger vocabulary can shorten sequences while increasing embedding/output parameters; “characters” are not bytes; normalization changes identity; fast application that changes tie/order semantics is a different tokenizer; a tokenizer file is not the model.
- Boundary: The course must own the taught BPE decisions and differential oracle; a narrow parser/serialization/container library may support plumbing, but a library may not replace merge counting, selection, application, special-token policy, or invariants.

## CAP-DTH-BATCH-01 — Boundary-preserving fixed-length minibatch reference
- Classification: reference-core-proven
- Domain: reference-core
- Source evidence: SRC-DTH-PACK-01 supports preventing cross-example attention/loss contamination when sequences share storage; the current implementation takes the simpler reference boundary of never packing documents together.
- Current repo evidence: `rust/crates/llm-from-scratch/src/data.rs` constructs complete next-token windows within one document, and `rust/crates/llm-from-scratch/src/training/batch.rs` creates deterministic fixed-length minibatches with no padding rows or padding token IDs, explicit shuffle provenance, and raw loss/gradient numerators plus valid-token denominators.
- Gap: No gap in the current fixed-length/no-pack reference; it does not cover variable lengths, partial final batches, padding, multiple documents in one row, reset positions, or block-diagonal attention.
- Exact affected files: Existing proof owners are `rust/crates/llm-from-scratch/src/data.rs`, `rust/crates/llm-from-scratch/src/training/batch.rs`, `curriculum/chapters/05-autoregressive-examples.md`, `curriculum/chapters/21-mini-batches.md`, `site/src/content/chapters/en/05-autoregressive-examples.mdx`, `site/src/content/chapters/ru/05-autoregressive-examples.mdx`, `site/src/content/chapters/en/21-mini-batches.mdx`, `site/src/content/chapters/ru/21-mini-batches.mdx`, `rust/demos/ch05-autoregressive-examples/`, and `rust/demos/ch21-mini-batches/`; no new file is required for this narrow classification.
- Dependencies: CAP-DTH-TOK-01 and current split/corpus identity.
- Conservative laptop/resource estimate: Frozen fixtures use context 4 and tiny batches, with under 256 MiB host RAM, under 10 MiB disk, 0 B download, and under 10 s CPU time.
- Falsifiable gates: Across at least 10 frozen windows, every target must be the immediate next token from the same document; seeded epoch ordering must be a deterministic permutation with no duplicate/omitted eligible window; raw batch numerators divided once by total valid tokens must equal the scalar per-token mean; incomplete windows and any cross-document target must be absent; every later padded or packed path must remain differentially comparable with this exact no-padding reference on their shared valid tokens.
- Learner misconception risk: No-padding fixed windows avoid masking bugs by construction but do not teach variable-length efficiency; shuffled windows do not make documents independent; one-document windows do not prove a future packer is safe.
- Boundary: This is the tiny correctness oracle only; claims about padding, packing efficiency, segment isolation, or long-context memory require CAP-DTH-BATCH-02.

## CAP-DTH-BATCH-02 — Padding, packing, segment, position, attention, and loss masks
- Classification: mandatory-laptop-implementation
- Domain: sequence-packing
- Source evidence: SRC-DTH-PACK-01 supports packing efficiency and the requirement to prevent cross-example contamination, but its BERT-specific efficiency and speed results do not validate decoder semantics.
- Current repo evidence: `rust/crates/llm-from-scratch/src/training/batch.rs` explicitly has no padding; `rust/crates/llm-from-scratch/src/data.rs` handles one document at a time; `curriculum/chapters/21-mini-batches.md` defers variable length and padding; attention currently has only a causal mask and loss has no padding/segment mask.
- Gap: Define PAD identity, ragged-to-padded representation, segment IDs, per-segment position policy, causal plus same-segment attention mask, valid-target/loss mask, boundary/EOS policy, deterministic length bucketing/packing, partial-batch behavior, and raw-sum accumulation that divides once across all valid tokens.
- Exact affected files: Proposed future owner is `rust/crates/llm-from-scratch/src/training/packed_batch.rs` with changes to `rust/crates/llm-from-scratch/src/training/batch.rs`, `rust/crates/llm-from-scratch/src/attention/causal_mask.rs`, `rust/crates/llm-from-scratch/src/attention/multi_head.rs`, `rust/crates/llm-from-scratch/src/models/decoder.rs`, `rust/crates/llm-from-scratch/src/evaluation.rs`, `curriculum/chapters/21-mini-batches.md`, `curriculum/chapters/28-causal-masking.md`, `site/src/content/chapters/en/21-mini-batches.mdx`, `site/src/content/chapters/ru/21-mini-batches.mdx`, `site/src/content/chapters/en/28-causal-masking.mdx`, `site/src/content/chapters/ru/28-causal-masking.mdx`, `rust/demos/ch21-mini-batches/`, and proposed `rust/crates/llm-from-scratch/tests/packed_batch_equivalence.rs`.
- Dependencies: CAP-DTH-TOK-02 special-token contract and CAP-DTH-BATCH-01 oracle.
- Conservative laptop/resource estimate: Core estimate uses context 256-512, microbatch 1-2, int32 token/segment/position tensors and boolean/implicit masks; explicit dense BxHxTxT masks are forbidden in the mandatory profile; packing metadata must stay under 64 MiB and the full training allocator under 6.25 GiB.
- Falsifiable gates: For at least 100 seeded ragged/packed fixtures, valid-token logits, summed loss, and parameter gradients must match separate unpadded execution within pre-frozen f64 tolerance and accelerated dtype tolerances; changing padding bytes cannot change valid outputs; cross-segment attention probability and gradient influence must be exactly zero in the reference; no boundary target crosses documents; position resets/increments must match the declared policy; denominator equals counted valid targets exactly; later accelerated mask kernels must preserve these results, and later accumulation must consume the same raw valid-token sums and denominator without changing sequence semantics.
- Learner misconception risk: A causal mask alone permits later tokens to attend to earlier documents in the same packed row; masking loss does not mask attention; PAD token embedding is not a mask; averaging per microbatch biases gradients when valid-token counts differ.
- Boundary: Mandatory acceptance covers deterministic single-device padding/packing with mathematical equivalence; heuristic sequence scheduling across workers and framework-specific fused varlen kernels are optimizations, not prerequisites.

## CAP-DTH-ARCH-01 — Narrow pre-norm decoder and Xavier initialization reference
- Classification: reference-core-proven
- Domain: architecture
- Source evidence: SRC-DTH-ARCH-01 supports fan-in/fan-out-scaled initialization and SRC-DTH-ARCH-02 supports treating normalization placement as a gradient-stability choice; neither proves arbitrary depth stability.
- Current repo evidence: `rust/crates/llm-from-scratch/src/nn/init.rs` has deterministic Xavier initialization, `rust/crates/llm-from-scratch/src/models/decoder_block.rs` is pre-norm RMSNorm with causal attention and SwiGLU residual branches, and `rust/crates/llm-from-scratch/src/models/decoder.rs` tests repeated zero/one/two-block execution; the capstone binds a one-block 1,188-parameter model.
- Gap: No gap for the current one-block reference; it lacks depth-aware residual/output projection scaling, depth stress tests, width/depth configuration profiles, parameter-count budgeting, and layerwise activation/gradient health receipts.
- Exact affected files: Existing proof owners are `rust/crates/llm-from-scratch/src/nn/init.rs`, `rust/crates/llm-from-scratch/src/models/decoder_block.rs`, `rust/crates/llm-from-scratch/src/models/decoder.rs`, `rust/crates/llm-from-scratch/src/pipeline.rs`, `curriculum/chapters/17-parameter-initialization.md`, `curriculum/chapters/31-decoder-block.md`, `curriculum/chapters/39-end-to-end-llm.md`, `site/src/content/chapters/en/17-parameter-initialization.mdx`, `site/src/content/chapters/ru/17-parameter-initialization.mdx`, `site/src/content/chapters/en/31-decoder-block.mdx`, `site/src/content/chapters/ru/31-decoder-block.mdx`, `site/src/content/chapters/en/39-end-to-end-llm.mdx`, `site/src/content/chapters/ru/39-end-to-end-llm.mdx`, `rust/demos/ch17-parameter-initialization/`, and `rust/demos/ch31-decoder-block/`.
- Dependencies: CAP-DTH-TOK-01, CAP-DTH-BATCH-01, and the current tensor/autodiff scalar reference.
- Conservative laptop/resource estimate: Current one-block width-4 model has 1,188 parameters, needs under 256 MiB host RAM, 0 B download, and under 60 s for its complete CPU fixture; this says nothing about useful scale.
- Falsifiable gates: Frozen parameter census must equal 1,188; identical seed/config/input must give bitwise-identical f64 parameters, logits, and gradients on the same supported host; zero/one/two-block fixtures must preserve shape and causal behavior; initial activation and gradient values must be finite; every later configurable or accelerated decoder must extend rather than replace this oracle and must preserve its exact reference-profile behavior.
- Learner misconception risk: Passing two-block tests is not evidence for 24 or 48 layers; pre-norm reduces one instability mechanism but does not guarantee convergence; Xavier is a family of scale rules, not a universal Transformer recipe.
- Boundary: This proof remains a pedagogical scalar/narrow oracle; useful-width/depth claims and low-precision stability require CAP-DTH-ARCH-02 and CAP-DTH-BACKEND-01.

## CAP-DTH-ARCH-02 — One configurable autoregressive decoder from reference to production-shaped profiles
- Classification: mandatory-laptop-implementation
- Domain: architecture
- Source evidence: SRC-DTH-ARCH-01, SRC-DTH-ARCH-02, and SRC-DTH-ARCH-03 support explicit initialization, normalization placement, and depth-dependent residual reasoning; DeepNorm constants are not directly transferable to this pre-norm RMSNorm/SwiGLU decoder.
- Current repo evidence: The decoder can repeat blocks but the capstone pipeline selects a one-block width-4 one-head context-4 configuration in code; initialization is generic Xavier, and there is no single versioned model/profile schema, exact approximately-8,000-parameter teaching profile, 20M-50M laptop profile, production-shaped dry-run profile, or proof that every path derives dimensions and capacity from that schema.
- Gap: Define one serialized decoder-only autoregressive text/token configuration whose semantic dimensions include vocabulary V, model width D, layer count L, query heads Hq, KV heads Hkv, FFN width F, context C, positional policy, tying, and parameter families, plus run-profile batch B and training tokens N; world size, topology, sharding, and collective policy are versioned runtime settings, never compiler features, and single-device profiles select world_size=1 with no communication events. Compile-time features may select backend/device/kernel plumbing only and must never encode model dimensions, capacities, topology, or another semantic path. Derive exact parameter, optimizer, KV, activation, FLOP, and communication formulas with checked arithmetic; make reference, approximately-8K, laptop, and production-shaped profiles data rather than algorithm forks or hard-coded maxima; derive depth scaling and initialize each family explicitly. Implement one private internal `PreparedDecoderInput` seam after embedding lookup: it carries checked `[B,T,D]` embeddings, positions, attention and segment metadata, loss eligibility, provenance, configuration identity, dtype/device identity, and artifact identity. The ordinary token-ID path is the only supported producer, and full-sequence and cached decoding share one causal-decoder core through this seam.
- Exact affected files: Changes belong in proposed `rust/crates/llm-from-scratch/src/models/config.rs`, proposed `rust/crates/llm-from-scratch/src/models/decoder_input.rs`, `rust/crates/llm-from-scratch/src/nn/init.rs`, `rust/crates/llm-from-scratch/src/models/decoder_block.rs`, `rust/crates/llm-from-scratch/src/models/decoder.rs`, `rust/crates/llm-from-scratch/src/generation/kv_cache.rs`, `rust/crates/llm-from-scratch/src/pipeline.rs`, proposed `rust/crates/llm-from-scratch/src/observability.rs`, proposed `rust/crates/llm-from-scratch/tests/config_scale_ladder.rs`, proposed `rust/crates/llm-from-scratch/tests/prepared_decoder_input.rs`, `curriculum/chapters/17-parameter-initialization.md`, `curriculum/chapters/31-decoder-block.md`, `curriculum/chapters/32-decoder-model.md`, `curriculum/chapters/38-cached-generation.md`, `curriculum/chapters/39-end-to-end-llm.md`, `site/src/content/chapters/en/17-parameter-initialization.mdx`, `site/src/content/chapters/ru/17-parameter-initialization.mdx`, `site/src/content/chapters/en/31-decoder-block.mdx`, `site/src/content/chapters/ru/31-decoder-block.mdx`, `site/src/content/chapters/en/32-decoder-model.mdx`, `site/src/content/chapters/ru/32-decoder-model.mdx`, `site/src/content/chapters/en/38-cached-generation.mdx`, `site/src/content/chapters/ru/38-cached-generation.mdx`, `site/src/content/chapters/en/39-end-to-end-llm.mdx`, `site/src/content/chapters/ru/39-end-to-end-llm.mdx`, `site/tests/32-decoder-model-diagram.test.ts`, `site/tests/38-cached-generation-diagram.test.ts`, `site/tests/e2e/ch32-decoder-model.spec.ts`, `site/tests/e2e/ch38-cached-generation.spec.ts`, and `rust/demos/ch31-decoder-block/`.
- Dependencies: CAP-DTH-TOK-02, CAP-DTH-BATCH-02, CAP-DTH-ARCH-01, and the accepted versioned model/profile schema and depth-initialization policy.
- Conservative laptop/resource estimate: The exact frozen scale ladder is reference (V=266,D=4,L=1,Hq=1,Hkv=1,F=4,C=4,B=16,N=2048,P=1188), bridge (V=266,D=16,L=2,Hq=2,Hkv=2,F=20,C=16,B=8,N=65536,P=8304), laptop (V=16384,D=512,L=8,Hq=8,Hkv=2,F=1536,C=512,B=1,N=20000000,P=32514560), and production-plan (V=128000,D=8192,L=80,Hq=64,Hkv=8,F=28672,C=32768,B=1,N=15000000000000,P=69500936192). Exact linear-plus-nonmasked-causal attention MAC records are mac_causal(reference=76544), mac_causal(bridge=1122304), mac_causal(laptop=17718837248), and mac_causal(production-plan=2981072375644160); exact current materialized-full-attention records are mac_dense(reference=77312), mac_dense(bridge=1183744), mac_dense(laptop=18790481920), and mac_dense(production-plan=3684738342584320). Both exclude RMSNorm, RoPE, softmax, activation, masking, and other scalar operations and therefore are not total FLOP counts. Laptop stability probes cover at least 32 batches within 6.25 GiB allocator, 12 GiB host RAM, and 30 minutes, while production-plan allocates 0 parameter/KV/optimizer bytes and its BF16 full-context KV estimate alone is 10737418240 bytes, forcing refusal under the laptop profile.
- Falsifiable gates: For bias-free tied embeddings, parse and recompute P=V*D+L*(2*D*D+2*D*D*Hkv/Hq+3*D*F+2*D)+D, KV_bytes=2*B*L*C*Hkv*(D/Hq)*bkv, MAC_causal=B*C*(L*(2*D*D+2*D*D*Hkv/Hq+3*D*F)+D*V)+B*L*D*C*(C+1), and MAC_dense=B*C*(L*(2*D*D+2*D*D*Hkv/Hq+3*D*F)+D*V)+2*B*L*D*C*C for exact machine-readable records scale(reference;V=266;D=4;L=1;Hq=1;Hkv=1;F=4;C=4;B=16;N=2048;P=1188), scale(bridge;V=266;D=16;L=2;Hq=2;Hkv=2;F=20;C=16;B=8;N=65536;P=8304), scale(laptop;V=16384;D=512;L=8;Hq=8;Hkv=2;F=1536;C=512;B=1;N=20000000;P=32514560), and scale(production-plan;V=128000;D=8192;L=80;Hq=64;Hkv=8;F=28672;C=32768;B=1;N=15000000000000;P=69500936192), with bkv=2 giving production-plan KV_bytes=10737418240. Exact state accounting uses State_bytes=sum_i(elements_i*bytes_i) over named weights, master weights, gradients, moments, and persistent buffers; Activation_peak_bytes=max_event(sum_i(live_elements_i*bytes_i)+workspace_event) over a generated liveness ledger; Comm_bytes=sum_event(message_count_event*payload_elements_event*dtype_bytes_event) over the selected data/tensor/pipeline/expert topology, with zero events for the single-device profiles. Changing only versioned settings must transform reference into bridge and laptop without source edits or recompilation; every loop/shape/cache/checkpoint/artifact identity derives from that config; invalid Hq divisibility, Hkv grouping, dimensions, integer products, kernels, and resource excess reject before allocation; every enabled backend/device/kernel feature preserves the semantic config and matches scalar fixtures; both four-record MAC series must recompute exactly, selected kernels must separately report padded/tiled/executed operations and scalar-op counts rather than relabel either algorithmic MAC series as total FLOPs, every state/liveness/communication subtotal must reconcile with enumerated tensors/events and measured allocated peaks must not exceed the plan, and production-plan reports checked parameter, parameter-state, KV, activation/workspace, MAC/FLOP, and communication estimates then refuses locally without attempting allocation; same-seed initialization and layerwise stability gates pass at executed profiles. The ordinary token-ID path and cached token-ID path must both wrap the private internal `PreparedDecoderInput`, share one causal-decoder core, and reproduce the pre-refactor logits, loss, gradients, parameter identity/order, KV state, RNG behavior, and work counters exactly on frozen fixtures; malformed `[B,T,D]` shape, position, attention, segment, loss-eligibility, provenance, configuration identity, dtype/device identity, or artifact identity must reject before decoder-block execution.
- Learner misconception risk: Configurability and a production-shaped planner do not prove production throughput, convergence, distributed correctness, quality, or that increasing width/depth alone is useful; a compiler feature must not silently select different model math, and rounded labels such as 8K never replace the exact tensor census.
- Boundary: One causal decoder-only autoregressive text/token architecture scales through explicit settings and optional backend/distributed adapters. `PreparedDecoderInput` is an implemented private internal seam, not a future adapter or supported alternate input family; the tied text-token vocabulary head remains the only output family. It adds no public generic modality trait, no stub modality enum, no second encoder/decoder, no non-text producer, no new dependency, and no multimodal capability. Encoder-only, encoder-decoder, bidirectional, image/audio/video encoders or generators, diffusion, and other multimodal model families are outside scope, while real cluster execution remains separately bounded evidence rather than a hard-coded limitation in the model.

## CAP-DTH-ARCH-03 — Deliberate optional dropout semantics and reproducible masks
- Classification: laptop-feasible-advanced-exercise
- Domain: architecture
- Source evidence: SRC-DTH-ARCH-04 supports stochastic unit dropping during training and a distinct unthinned inference treatment, but does not select this decoder's probability, placement, mask granularity, inverted scaling, or expected benefit.
- Current repo evidence: `curriculum/course-plan.md` explicitly excludes dropout from the current capstone; `curriculum/chapters/31-decoder-block.md`, `curriculum/chapters/32-decoder-model.md`, and `curriculum/chapters/33-training-selection.md` name it as deferred; model/training code has no dropout operation, training/evaluation mode, dropout RNG stream, mask, or checkpoint state.
- Gap: An optional advanced path must freeze placement, element/token/channel mask granularity, probability p with keep probability q=1-p, inverted-training rule y=x times mask/q, evaluation identity, a dedicated deterministic counter/state mapping, mask-recompute behavior under activation checkpointing, and exact resume/event semantics without changing the mandatory no-dropout profile.
- Exact affected files: Proposed owner is `rust/crates/llm-from-scratch/src/nn/dropout.rs` with changes to `rust/crates/llm-from-scratch/src/models/decoder_block.rs`, `rust/crates/llm-from-scratch/src/training/trainer.rs`, `rust/crates/llm-from-scratch/src/training/job_checkpoint.rs`, `rust/crates/llm-from-scratch/src/evaluation.rs`, `curriculum/course-plan.md`, `curriculum/chapters/31-decoder-block.md`, `curriculum/chapters/33-training-selection.md`, `site/src/content/chapters/en/31-decoder-block.mdx`, `site/src/content/chapters/ru/31-decoder-block.mdx`, `site/src/content/chapters/en/33-training-selection.mdx`, `site/src/content/chapters/ru/33-training-selection.mdx`, `rust/demos/ch31-decoder-block/`, and proposed `rust/crates/llm-from-scratch/tests/dropout_semantics.rs`.
- Dependencies: CAP-DTH-ARCH-02 and a dedicated dropout RNG/mode policy isolated from initialization, data ordering, sampling, and stochastic tokenization.
- Conservative laptop/resource estimate: Exercise fixtures use at most 1M activations and 10 seeded masks, store at most 64 MiB of explicit reference masks, stay under 2 GiB RAM/VRAM and 1 GB disk, require 0 B download, and finish within 15 min; dropout remains disabled in the 20M-50M mandatory core profile.
- Falsifiable gates: Probability p=0 must be exact identity in forward/backward and consume 0 dropout draws, while p<0 or p>=1 must reject; at p=0.5 at least 10 seeded hand fixtures must match exact binary masks, inverted outputs, and input gradients; evaluation must be exact identity and consume 0 draws; dropout masks and updates must match uninterrupted execution after at least 3 activation-recompute and 3 job-resume interruption points; changing initialization, shuffle, or sampling draws must not change the dropout stream; repeated evaluation must be bitwise stable.
- Learner misconception risk: Dropout is disabled rather than “automatically handled” at evaluation; inverted scaling changes training activations, not evaluation outputs; the mask and RNG cursor are algorithmic state; activation recomputation with a new mask changes gradients; regularization does not guarantee better validation loss at this scale.
- Boundary: Dropout is a laptop-feasible advanced exercise and deliberately not required for the functional mandatory profile; a no-dropout run can satisfy core acceptance, and the exercise may claim only mask/mode/resume correctness unless a pre-frozen multi-seed comparison separately demonstrates a generalization effect.

## CAP-DTH-BACKEND-01 — Explicit device/dtype backend with course-owned kernels and scalar oracle
- Classification: mandatory-laptop-implementation
- Domain: accelerator
- Source evidence: SRC-DTH-HW-03 and SRC-DTH-HW-06 support explicit device capabilities and floating-point/order differences; SRC-DTH-TRAIN-03 supports IO-aware exact attention as a possible optimization; SRC-DTH-CPU-01 defines BLAS kernel interfaces and SRC-DTH-CPU-02 defines nonportable SIMD/feature-detection constraints; SRC-DTH-HW-07 limits cross-platform reproducibility claims.
- Current repo evidence: `rust/crates/llm-from-scratch/src/tensor/storage.rs` stores only Vec<f64>, math modules execute scalar CPU loops, and the workspace has no accelerator/device/dtype abstraction, approved SIMD/BLAS path, or GPU dependency; this provides an inspectable scalar oracle but no optimized-CPU or laptop-GPU proof.
- Gap: Select and allowlist narrow safe Rust device, CPU-SIMD, and/or BLAS plumbing dependencies without outsourcing learner-facing tensor/LLM algorithms; add explicit scalar-CPU/optimized-CPU/GPU devices and f64/f32/BF16/FP16 contracts, course-owned forward/backward operation boundaries, CPU/GPU capability and BLAS layout/thread checks, kernel-selection receipts, synchronization/error handling, and fail-closed no-silent-fallback behavior for every acceptance profile.
- Exact affected files: Proposed owners are `rust/crates/llm-from-scratch/src/tensor/backend.rs`, `rust/crates/llm-from-scratch/src/tensor/device.rs`, and `rust/crates/llm-from-scratch/src/tensor/dtype.rs`, with changes to `rust/crates/llm-from-scratch/src/tensor/storage.rs`, `rust/crates/llm-from-scratch/src/tensor/matmul.rs`, `rust/crates/llm-from-scratch/src/tensor/ops.rs`, `rust/crates/llm-from-scratch/src/autograd/tensor_core.rs`, `rust/crates/llm-from-scratch/src/autograd/model_ops.rs`, `rust/crates/llm-from-scratch/src/models/decoder.rs`, `rust/crates/llm-from-scratch/src/training/trainer.rs`, `rust/crates/llm-from-scratch/Cargo.toml`, root `Cargo.toml`, `Cargo.lock`, `DECISIONS.md`, proposed `curriculum/chapters/40-hardware-acceleration.md`, `site/src/content/chapters/en/40-hardware-acceleration.mdx`, `site/src/content/chapters/ru/40-hardware-acceleration.mdx`, `rust/demos/ch40-hardware-acceleration/`, `rust/crates/llm-from-scratch/tests/cpu_backend_differential.rs`, and `rust/crates/llm-from-scratch/tests/accelerator_differential.rs`.
- Dependencies: CAP-DTH-BATCH-02, CAP-DTH-ARCH-02, the supporting-library role/complete-graph decision, a safe wrapper compatible with the workspace unsafe-code prohibition if SIMD/BLAS is selected, pinned compiler/CPU-feature/BLAS-thread and driver/backend versions, and access to the physical RTX 4070 Laptop GPU for its later hardware-validation consumer.
- Conservative laptop/resource estimate: Optimized-CPU differential fixtures cover matrices up to 512x512 under 2 GiB RAM and 15 min with at most 1 GB build output; GPU smoke is 1M-5M parameters, context 128, microbatch 1, at most 2.0 GiB allocator and 15 min; mandatory core is at most 6.25 GiB allocator and 30 h; all compiled caches/build artifacts remain under 10 GB.
- Falsifiable gates: Every taught primitive's forward output and backward gradient must match the f64 scalar oracle on adversarial shapes within operation-specific pre-frozen absolute/relative/ULP tolerances; for at least 32 matrix/vector fixtures including zero, unit, odd, non-square, transposed, and non-contiguous views, forced scalar, selected SIMD, and selected BLAS paths must match the oracle and preserve declared row/column/layout semantics; CPU feature set, BLAS implementation/version/thread count, dispatch path, GPU device/dtype/kernel, and allocation peak must be logged; unsupported forced SIMD/BLAS/GPU paths must reject before work, a GPU trap must prove no CPU fallback, and a scalar trap must prove an optimized-CPU acceptance did not silently use the scalar oracle.
- Learner misconception risk: BLAS names an interface family rather than one implementation or reduction order; SIMD width does not promise speedup; compiler auto-vectorization and explicit dispatch differ; CUDA availability does not prove Tensor Core use; GPU output need not be bitwise CPU output; asynchronous timing without synchronization is false.
- Boundary: Approved safe CPU SIMD/BLAS and GPU libraries are supporting backend implementation/plumbing only after the course-owned scalar algorithm and differential oracle exist; they may provide allocation, dispatch, compiled kernels, and primitive execution, but may not replace or hide the taught matrix multiplication, attention, autodiff, loss, optimizer, masking, or update invariants, and unsafe code remains forbidden in course-owned crates.

## CAP-DTH-MP-01 — Mixed precision, loss scaling, and numerical health
- Classification: mandatory-laptop-implementation
- Domain: accelerator
- Source evidence: SRC-DTH-TRAIN-01 supports low-precision working arithmetic with FP32 master weights and loss scaling for FP16; SRC-DTH-TRAIN-02 distinguishes BF16 exponent/significand behavior; SRC-DTH-HW-06 explains rounding/order effects.
- Current repo evidence: Model values, gradients, optimizer state, loss, and checkpoint tensors are f64 only; `rust/crates/llm-from-scratch/src/training/trainer.rs` checks finiteness but has no autocast policy, master weights, scaler, overflow detection, skipped-update semantics, or dtype-specific tolerances.
- Gap: Define per-operation storage/accumulation dtype, prefer BF16 only when measured supported/efficient, implement FP16 dynamic/static loss scaling when used, keep protected FP32 reductions/master state, specify unscale-before-clip ordering, detect overflow across a whole accumulated update, and record skipped-update/schedule/RNG behavior exactly.
- Exact affected files: Proposed owner is `rust/crates/llm-from-scratch/src/training/mixed_precision.rs` with changes to `rust/crates/llm-from-scratch/src/tensor/dtype.rs`, `rust/crates/llm-from-scratch/src/tensor/backend.rs`, `rust/crates/llm-from-scratch/src/training/trainer.rs`, `rust/crates/llm-from-scratch/src/training/adamw.rs`, `rust/crates/llm-from-scratch/src/checkpoint.rs`, proposed `curriculum/chapters/40-hardware-acceleration.md`, `site/src/content/chapters/en/40-hardware-acceleration.mdx`, `site/src/content/chapters/ru/40-hardware-acceleration.mdx`, `rust/demos/ch40-hardware-acceleration/`, `curriculum/chapters/33-training-selection.md`, `site/src/content/chapters/en/33-training-selection.mdx`, `site/src/content/chapters/ru/33-training-selection.mdx`, and proposed `rust/crates/llm-from-scratch/tests/mixed_precision.rs`.
- Dependencies: CAP-DTH-BACKEND-01 capability query and differential oracle, CAP-DTH-ARCH-02 dtype/state census, a frozen mixed-precision event policy, and physical GPU access for the executed profile.
- Conservative laptop/resource estimate: Keep FP32 master weights and two FP32 Adam moments; estimated parameter-related state is 16-18 bytes/parameter before activations/workspaces, or 0.80-0.90 GB at 50M parameters; numeric stress suite must run in at most 2.0 GiB allocator and 15 min before core admission.
- Falsifiable gates: Frozen fixtures must force normal, underflow-prone, and overflow gradients; unscaled finite gradients and post-update weights must match f32/f64 references within pre-frozen operation/update tolerances; overflow must skip every parameter/moment update atomically, update scaler exactly once, and follow frozen scheduler/RNG semantics; clipping must use unscaled gradients; BF16/FP16 kernel capability and actual dtype must be logged, not inferred.
- Learner misconception risk: FP16 and BF16 are not interchangeable; loss scaling does not recover significand precision; keeping FP32 master weights means “16-bit training” is not 2 bytes per parameter; a finite loss can coexist with corrupt gradients.
- Boundary: Mandatory acceptance supports only explicitly enumerated operations/dtypes on the frozen backend; FP8, stochastic rounding, vendor-specific fused optimizers, and unverified kernels remain out of scope.

## CAP-DTH-MEM-01 — Accumulation, activation checkpointing, and memory-bounded execution
- Classification: mandatory-laptop-implementation
- Domain: training-memory
- Source evidence: SRC-DTH-TRAIN-04 supports recomputation-for-memory tradeoffs; SRC-DTH-PACK-01 supports counting only valid tokens under padding/packing; paper-specific memory and speed numbers are not local budgets.
- Current repo evidence: `rust/crates/llm-from-scratch/src/training/trainer.rs` performs one full batch per update, and `training/batch.rs` exposes raw sums/valid-token denominators but no microbatch accumulation; there is no activation recomputation, saved-tensor policy, allocator accounting, preflight estimator, or recoverable OOM boundary.
- Gap: Accumulate raw loss and gradient numerators across variable-valid-token microbatches and divide once; define zero_grad/backward/unscale/clip/step/schedule order; implement deterministic activation checkpoints with RNG replay; model parameter/optimizer/gradient/activation/workspace bytes; preflight/refuse unsupported shapes; and keep atomic last-good checkpoints outside OOM-prone operations.
- Exact affected files: Proposed changes are `rust/crates/llm-from-scratch/src/training/trainer.rs`, `rust/crates/llm-from-scratch/src/training/batch.rs`, future `rust/crates/llm-from-scratch/src/training/packed_batch.rs`, `rust/crates/llm-from-scratch/src/training/mixed_precision.rs`, `rust/crates/llm-from-scratch/src/training/job_checkpoint.rs`, `rust/crates/llm-from-scratch/src/tensor/backend.rs`, `rust/crates/llm-from-scratch/src/observability.rs`, `curriculum/chapters/21-mini-batches.md`, `site/src/content/chapters/en/21-mini-batches.mdx`, `site/src/content/chapters/ru/21-mini-batches.mdx`, `curriculum/chapters/33-training-selection.md`, `site/src/content/chapters/en/33-training-selection.mdx`, `site/src/content/chapters/ru/33-training-selection.mdx`, `curriculum/chapters/35-checkpoints.md`, `site/src/content/chapters/en/35-checkpoints.mdx`, `site/src/content/chapters/ru/35-checkpoints.mdx`, `rust/demos/ch33-training-selection/`, and proposed `rust/crates/llm-from-scratch/tests/memory_bounded_training.rs`.
- Dependencies: CAP-DTH-BATCH-02, CAP-DTH-ARCH-02, CAP-DTH-BACKEND-01, and CAP-DTH-MP-01.
- Conservative laptop/resource estimate: Mandatory core uses microbatch 1-2 and 16,384-65,536 valid tokens per update, course allocator at most 6.25 GiB, at least 0.50 GiB device-wide peak headroom, host peak at most 12 GiB, and checkpoint scratch at most 2 times one atomic checkpoint; checkpointing overhead is budgeted at up to 50 percent wall time until measured.
- Falsifiable gates: For uneven microbatches, accumulated update must match one logical unpadded batch in f64 within pre-frozen tolerance and count identical valid tokens; checkpointed/non-checkpointed logits, summed loss, gradients, parameter updates, and RNG consumption must agree, and an independently enabled CAP-DTH-ARCH-03 exercise must also prove that its dropout masks survive recomputation exactly; estimator must conservatively bound measured peak on 20 fixtures; one-byte-over-limit configuration must refuse before large allocation; injected OOM must preserve the last-good checkpoint and never publish a partial artifact.
- Learner misconception risk: Gradient accumulation does not create additional independent data or reduce total optimizer state; averaging microbatch means is wrong when token counts differ; activation checkpointing saves activations, not weights/moments, and costs recomputation; offload can shift rather than eliminate a bottleneck.
- Boundary: Single-device accumulation/checkpointing/offload sufficient for the frozen laptop profile is mandatory; ZeRO-style state partitioning is not a single-GPU memory feature and belongs to CAP-DTH-DIST-02.

## CAP-DTH-OPT-01 — AdamW, schedules, clipping, and update-event semantics
- Classification: mandatory-laptop-implementation
- Domain: training-memory
- Source evidence: SRC-DTH-TRAIN-05 supports decoupled weight decay and SRC-DTH-TRAIN-06 supports norm clipping as an explicit operation; SRC-DTH-TRAIN-07 supports treating parameter/token budgets jointly but cannot supply a laptop-small-model schedule.
- Current repo evidence: `rust/crates/llm-from-scratch/src/training/adamw.rs` implements course-owned AdamW and `training/trainer.rs` consumes an explicit learning-rate vector, performs global-norm clipping and finite checks, and specifies update order; the capstone uses 32 constant-rate updates and no parameter groups, warmup/decay policy, accumulation, mixed precision, or schedule-resume proof.
- Gap: Add named/frozen warmup-plus-decay schedules computed from optimizer-update count, explicit decay-exclusion groups, valid-token accumulation semantics, pre/post-unscale clipping order, zero/NaN/Inf behavior, schedule exhaustion/refusal, and receipt fields that distinguish tokens, microsteps, attempted updates, successful optimizer steps, and skipped overflows.
- Exact affected files: Proposed owner is `rust/crates/llm-from-scratch/src/training/schedule.rs` with changes to `rust/crates/llm-from-scratch/src/training/adamw.rs`, `rust/crates/llm-from-scratch/src/training/trainer.rs`, `rust/crates/llm-from-scratch/src/pipeline.rs`, `rust/crates/llm-from-scratch/src/checkpoint.rs`, future `rust/crates/llm-from-scratch/src/training/job_checkpoint.rs`, `curriculum/chapters/22-adamw.md`, `site/src/content/chapters/en/22-adamw.mdx`, `site/src/content/chapters/ru/22-adamw.mdx`, `curriculum/chapters/33-training-selection.md`, `site/src/content/chapters/en/33-training-selection.mdx`, `site/src/content/chapters/ru/33-training-selection.mdx`, `rust/demos/ch22-adamw/`, `rust/demos/ch33-training-selection/`, and proposed `rust/crates/llm-from-scratch/tests/training_event_order.rs`.
- Dependencies: CAP-DTH-BATCH-02 valid-token sums, CAP-DTH-MP-01 unscale/overflow policy, CAP-DTH-MEM-01 accumulation, and a pre-frozen profile-specific schedule.
- Conservative laptop/resource estimate: Schedule/group metadata must be under 1 MiB and add under 10 MiB RAM; optimizer parameter-state estimate remains 16-18 bytes/parameter before activations, and the complete 20M-50M core run remains at most 30M valid tokens and 30 h.
- Falsifiable gates: At least 5 boundary-step fixtures must match closed-form learning-rate values exactly in f64; excluded parameters must receive zero decay and included zero-gradient parameters the exact decay update; clipping at below/equal/above threshold must match scalar calculations; 1 large logical batch and its uneven microbatch partition must match within frozen tolerance; later resume support must restore these counters and consume the exact remaining schedule without duplicate or skipped successful step, and later observability must report rather than redefine the event order.
- Learner misconception risk: AdamW weight decay is not L2 regularization inserted into Adam's gradient; warmup length is counted in optimizer updates, not necessarily batches; clipping scaled or per-microbatch gradients changes the algorithm; a scaling-law paper does not choose a small-run learning rate.
- Boundary: Mandatory acceptance covers a small explicit schedule family and course-owned AdamW/event order; hyperparameter sweeps, automatic schedule search, fused third-party optimizers, and compute-optimality claims remain outside.

## CAP-DTH-RESUME-01 — Complete job checkpoint and exact continuation
- Classification: mandatory-laptop-implementation
- Domain: resume
- Source evidence: SRC-DTH-RESUME-01 supports resumable input iteration and exactly-once sample semantics; SRC-DTH-RESUME-02 and SRC-DTH-RESUME-03 support restoring model, optimizer, and progress state, while explicitly not proving this job's sufficiency or exactness.
- Current repo evidence: `rust/crates/llm-from-scratch/src/checkpoint.rs` stores a versioned tokenizer, f64 model, AdamW state, selected step metadata, and sampling RNG with atomic write and checksum; its contract and `curriculum/chapters/35-checkpoints.md` explicitly exclude corpus identity, batch ordering/cursor, training RNG, remaining schedule, in-flight gradients, clipping, and validation policy and report whole_job_resume:false.
- Gap: Add a whole-job manifest binding exact code/config/corpus/split/filter/tokenizer/model/backend/dtype/kernel identities; all RNG stream states; epoch/shard/document/window/batch/microstep cursors; current accumulated raw loss/gradient sums and valid-token count; optimizer/scaler/scheduler/clip policy; evaluation/early-stop state; counters; atomic artifact hashes; and a declared compatibility/migration refusal policy.
- Exact affected files: Proposed owner is `rust/crates/llm-from-scratch/src/training/job_checkpoint.rs` with changes to `rust/crates/llm-from-scratch/src/checkpoint.rs`, `rust/crates/llm-from-scratch/src/training/trainer.rs`, `rust/crates/llm-from-scratch/src/training/batch.rs`, `rust/crates/llm-from-scratch/src/training/schedule.rs`, `rust/crates/llm-from-scratch/src/training/mixed_precision.rs`, `rust/crates/llm-from-scratch/src/pipeline.rs`, `rust/crates/llm-from-scratch/src/evaluation.rs`, `curriculum/chapters/35-checkpoints.md`, `site/src/content/chapters/en/35-checkpoints.mdx`, `site/src/content/chapters/ru/35-checkpoints.mdx`, `rust/demos/ch35-checkpoints/`, and proposed `rust/crates/llm-from-scratch/tests/whole_job_resume.rs`.
- Dependencies: CAP-DTH-DATA-01, CAP-DTH-DATA-02, CAP-DTH-DATA-03, CAP-DTH-DATA-04, CAP-DTH-TOK-02, CAP-DTH-BATCH-02, CAP-DTH-ARCH-02, CAP-DTH-BACKEND-01, CAP-DTH-MP-01, CAP-DTH-MEM-01, CAP-DTH-OPT-01, CAP-DTH-ART-01, and CAP-DTH-PERSIST-01.
- Conservative laptop/resource estimate: At 50M parameters and estimated 16-18 bytes/parameter training state, one uncompressed job checkpoint is approximately 0.8-0.9 GB plus metadata/accumulation; reserve at most 2.5 GB per atomic checkpoint and 7.5 GB for last-good plus 2 rotations, with save under 120 s and load under 120 s on the target SSD.
- Falsifiable gates: For CPU f64, uninterrupted and interruption after each of at least 5 event boundaries must end bitwise equal in parameters, moments, cursor, RNG, counters, metrics, and next batch; for the frozen discrete GPU backend, same-build/same-device resume must match the predeclared deterministic contract exactly, or a predeclared numeric contract only where a documented nondeterministic operation is unavoidable; reject any one-bit corruption, missing shard, stale corpus/tokenizer/config/kernel identity, partial accumulation field, schedule mismatch, or partial atomic publication before training resumes.
- Learner misconception risk: Saving weights is not resuming training; saving optimizer state alone does not restore which tokens occur next; an epoch integer is not an iterator cursor; “same seed” does not recover advanced RNG streams; a numerically close restart is not bitwise exact.
- Boundary: Exact continuation is promised only inside a frozen compatibility envelope; migration across changed code, backend, driver, kernel, dtype, world size, corpus, or schedule must fail closed unless a separately versioned migration with new gates is implemented.

## CAP-DTH-EVAL-01 — Fixed no-grad token-weighted reference evaluation
- Classification: reference-core-proven
- Domain: evaluation
- Source evidence: SRC-DTH-EVAL-02 supports exposing experimental configuration and metric aggregation; the current course owns its token-weighted loss calculation and does not rely on the paper for correctness.
- Current repo evidence: `rust/crates/llm-from-scratch/src/evaluation.rs` evaluates without gradient retention and aggregates raw token loss divided once by token count; `rust/crates/llm-from-scratch/src/pipeline.rs` uses fixed train/validation/test partitions and checks deterministic selected-checkpoint behavior on the tiny fixture.
- Gap: No gap for the narrow local regression; it is not an independent benchmark, broad-domain generalization result, multi-seed estimate, statistical comparison, contamination proof, or human-quality evaluation.
- Exact affected files: Existing proof owners are `rust/crates/llm-from-scratch/src/evaluation.rs`, `rust/crates/llm-from-scratch/src/pipeline.rs`, `curriculum/chapters/34-final-evaluation.md`, `site/src/content/chapters/en/34-final-evaluation.mdx`, `site/src/content/chapters/ru/34-final-evaluation.mdx`, `rust/demos/ch34-final-evaluation/`, `curriculum/chapters/39-end-to-end-llm.md`, `site/src/content/chapters/en/39-end-to-end-llm.mdx`, `site/src/content/chapters/ru/39-end-to-end-llm.mdx`, and `rust/demos/ch39-end-to-end-llm/`.
- Dependencies: Current corpus split, CAP-DTH-BATCH-01, CAP-DTH-ARCH-01, and the frozen tiny fixture.
- Conservative laptop/resource estimate: Current fixed fixture uses under 1 MiB data, under 256 MiB RAM, 0 B download, and under 30 s CPU wall time for evaluation and replay checks.
- Falsifiable gates: Gradient buffers and model parameters must remain exactly unchanged across evaluation; permuting batch grouping without permuting tokens must leave total loss equal within f64 order-aware tolerance; reported denominator must equal exact target-token count; an intentionally biased mean-of-batch-means fixture must be rejected; the selected checkpoint/test invocation count must match the frozen policy exactly; every later multi-seed or imported-model evaluator must retain this aggregation as its overlapping scalar oracle.
- Learner misconception risk: A deterministic held-out loss can be precisely reproducible and still meaningless outside a 12-document fixture; lower validation loss is not automatically truthful, safe, fluent, or useful generation.
- Boundary: This is regression evidence for course mechanics only; any generalization or usefulness claim requires CAP-DTH-EVAL-02 and a separately governed corpus.

## CAP-DTH-EVAL-02 — Generalization, contamination controls, multi-seed uncertainty, and honest claims
- Classification: mandatory-laptop-implementation
- Domain: evaluation
- Source evidence: SRC-DTH-EVAL-01 supports material seed variation, SRC-DTH-EVAL-02 supports complete experimental reporting, SRC-DTH-EVAL-03 supports uncertainty matched to the sampling unit, and SRC-DTH-EVAL-04 supports pre-evaluation contamination analysis; none dictates a universal seed count or pass threshold.
- Current repo evidence: The repository has one frozen corpus, one training seed, deterministic two-run replay, fixed validation checkpoint selection, and one final test; no independent corpus, benchmark registry, multi-seed distribution, uncertainty interval, baseline comparison, sample-level qualitative rubric, or pre-frozen claim boundary exists.
- Gap: Separate correctness, learning, generalization, generation-quality, and efficiency claims; freeze datasets/metrics/baselines/seeds/stopping/selection/thresholds before runs; decontaminate against training; execute one resource-qualified expensive RTX core run plus at least 3 complete runs of a cheaper seed-sensitivity profile; report every result/failure separately; choose uncertainty units honestly; and never transfer the cheaper profile's seed distribution to the full core profile.
- Exact affected files: Changes belong in `rust/crates/llm-from-scratch/src/evaluation.rs`, `rust/crates/llm-from-scratch/src/pipeline.rs`, proposed `rust/crates/llm-from-scratch/src/observability.rs`, `curriculum/chapters/34-final-evaluation.md`, `site/src/content/chapters/en/34-final-evaluation.mdx`, `site/src/content/chapters/ru/34-final-evaluation.mdx`, `rust/demos/ch34-final-evaluation/`, `curriculum/chapters/39-end-to-end-llm.md`, `site/src/content/chapters/en/39-end-to-end-llm.mdx`, `site/src/content/chapters/ru/39-end-to-end-llm.mdx`, `rust/demos/ch39-end-to-end-llm/`, and proposed `rust/crates/llm-from-scratch/tests/multi_seed_evaluation.rs`.
- Dependencies: CAP-DTH-DATA-01, CAP-DTH-DATA-02, CAP-DTH-DATA-03, CAP-DTH-DATA-04, CAP-DTH-TOK-02, CAP-DTH-EVAL-01, CAP-DTH-RESUME-01, CAP-DTH-OBS-01, frozen resource profiles, and predeclared evaluation inputs/baselines/seeds; any new learner-facing claim triggers the repository's independent English review/adjudication and localization workflow.
- Conservative laptop/resource estimate: Mandatory acceptance budgets 1 expensive 20M-50M-parameter RTX core run over 10M-30M valid tokens at at most 30 h, plus at least 3 cheaper 1M-5M-parameter seed-profile runs over 0.5M-2M valid tokens at at most 2 h each and at most 6 h combined; total training budget is at most 36 h, evaluation inputs at most 2 GB, evaluation disk at most 10 GB, host peak at most 12 GiB, and evaluation allocator at most 6.25 GiB.
- Falsifiable gates: Before training, freeze exactly 1 core seed and at least 3 distinct cheaper-profile seeds, both profile configs/hashes, metric code/hash, per-profile baseline and success bound, selection rule, overlap threshold, and claim map; zero above-threshold train-evaluation overlaps are required; all non-seed fields inside the cheaper profile must match, every scheduled run must produce a result or retained failure receipt, and no replacement seed is allowed; report the core point result without a seed interval, while the cheaper profile reports every value/failure, median, min, max, and its predeclared uncertainty interval; both profiles must meet their own frozen gates, and the cheaper interval must never be labeled uncertainty for the core run.
- Learner misconception risk: Three cheap-profile seeds do not reveal every tail or estimate the 20M-50M core profile's variance; standard deviation across seeds is not uncertainty over documents; one favorable expensive run is a point result, not robust evidence; decontamination cannot prove semantic independence; statistically detectable improvement can be practically useless.
- Boundary: Mandatory laptop acceptance includes one expensive envelope/quality point and a separate cheaper at-least-3-seed sensitivity experiment; a robust seed-distribution claim for the full core profile requires separately budgeted multiple full runs, while broad language competence, state-of-the-art comparison, safety, and production reliability remain excluded.

## CAP-DTH-ART-01 — Standard tensor artifacts, conversion, and complete interchange manifests
- Classification: mandatory-laptop-implementation
- Domain: artifacts
- Source evidence: SRC-DTH-ART-01 specifies SafeTensors tensor layout, SRC-DTH-ART-02 specifies a versioned tensor/metadata GGUF container, SRC-DTH-ART-03 specifies ONNX graph IR, and SRC-DTH-ART-04 documents sharded indexes; each source's claim limit excludes complete semantic compatibility.
- Current repo evidence: `rust/crates/llm-from-scratch/src/checkpoint.rs` owns a custom versioned binary format with checksum and strict tensor layout for course component replay; there is no standard tensor export/import, sharded index, architecture/config schema, tokenizer bundle, conversion receipt, external-data graph, or cross-runtime comparison.
- Gap: Select a minimal mandatory interchange surface, most plausibly SafeTensors weights plus a versioned course config/tokenizer/provenance manifest; optionally add GGUF inference export and ONNX only when all operations are representable; implement strict shapes/dtypes/offset/range/duplicate/name/size checks, bounded reads, whole-file SHA-256, atomic shards, conversion receipts, and round-trip comparisons.
- Exact affected files: Proposed owners are `rust/crates/llm-from-scratch/src/artifact/mod.rs`, `rust/crates/llm-from-scratch/src/artifact/safetensors.rs`, optional `rust/crates/llm-from-scratch/src/artifact/gguf.rs` and `rust/crates/llm-from-scratch/src/artifact/onnx.rs`, changes to `rust/crates/llm-from-scratch/src/checkpoint.rs`, `rust/crates/llm-from-scratch/src/pipeline.rs`, `curriculum/chapters/35-checkpoints.md`, `site/src/content/chapters/en/35-checkpoints.mdx`, `site/src/content/chapters/ru/35-checkpoints.mdx`, `rust/demos/ch35-checkpoints/`, and proposed `rust/crates/llm-from-scratch/tests/artifact_interchange.rs`; dependencies require `rust/crates/llm-from-scratch/Cargo.toml`, `Cargo.lock`, and `DECISIONS.md`.
- Dependencies: Supporting-parser decision, exact frozen format revision, CAP-DTH-TOK-02, CAP-DTH-ARCH-02 config census, CAP-DTH-BACKEND-01 dtype semantics, CAP-DTH-OPT-01 parameter/state identity, and license/security review of imported artifacts.
- Conservative laptop/resource estimate: Core weights/config/tokenizer should be at most 500 MB; shards at most 512 MiB each; streaming conversion host peak at most 4 GiB above model-resident memory, disk scratch at most 2 times source plus output, and 5 GB conversion fixture cap with each conversion under 10 min.
- Falsifiable gates: For at least 3 tensor shapes and every supported dtype, export-import must preserve names, shapes, byte order, values exactly where lossless and within a frozen error bound where conversion changes dtype; logits on at least 100 frozen prompts must match the source runtime within dtype-specific tolerance; reject overlapping/out-of-range offsets, duplicate names, unsupported dtype/op/version, missing shard, one-bit SHA-256 drift, architecture/tokenizer mismatch, excess declared size, and non-atomic partial output.
- Learner misconception risk: SafeTensors means safer tensor parsing, not trusted weights; a tensor container is not a complete model; GGUF is not synonymous with four-bit quantization; ONNX export does not guarantee executable parity; filename extension does not prove format or checksum.
- Boundary: Mandatory interchange is the smallest audited weight/config/tokenizer bundle needed for the course; the later resume capability owns optimizer/job-state continuation, the later quantization capability may add only explicitly versioned quantized representations, and unsupported architectures/ops/quantizers fail rather than approximate silently.

## CAP-DTH-PERSIST-01 — Immutable file lineage and optional transactional metadata boundary
- Classification: mandatory-laptop-implementation
- Domain: persistence
- Source evidence: SRC-DTH-DATA-01 supports durable dataset documentation, SRC-DTH-ART-01 supports bounded tensor-file structure, and SRC-DTH-RESUME-01 supports coordinated checkpoint/input state; none requires a database.
- Current repo evidence: The course uses deterministic local files for corpus/split/tokenizer/checkpoint artifacts and no database dependency; checksums are mixed between FNV integrity/determinism checks and stronger run-level SHA-256 expectations, and there is no unified immutable artifact DAG or garbage-collection/refcount policy.
- Gap: Define content-addressed immutable artifacts and a run manifest linking inputs, transformations, configs, receipts, and outputs; distinguish fast accidental-corruption checks from SHA-256 identity; provide atomic write/fsync/rename rules and recovery; state when a relational store is justified for concurrent mutable orchestration while keeping learner artifacts portable without it.
- Exact affected files: Proposed owners are `rust/crates/llm-from-scratch/src/artifact/mod.rs`, `rust/crates/llm-from-scratch/src/training/job_checkpoint.rs`, `rust/crates/llm-from-scratch/src/data_manifest.rs`, `scripts/acquire-functional-llm-artifacts.mjs`, and `rust/crates/llm-from-scratch/tests/artifact_lineage.rs`; DTH adds no database path or dependency, while any optional backend-neutral vector-store adapter belongs to a separately approved retrieval capability and must not enter the static-site runtime.
- Dependencies: CAP-DTH-DATA-01, CAP-DTH-ART-01, filesystem semantics for the supported host, and a decision on single-writer versus concurrent orchestration.
- Conservative laptop/resource estimate: Manifest/receipt metadata at most 100 MiB per complete run, atomic scratch at most 1 full artifact, total mandatory working disk at most 30 GB, and 0 running database/vector-store services for every DTH profile; any separately approved retrieval store needs its own RAM/disk/time envelope.
- Falsifiable gates: Rebuilding an artifact DAG from immutable files must reproduce every SHA-256 and fail on 1-bit drift, missing parent, cycle, partial temp file, or undeclared version; killing a writer at each of at least 5 injection points must leave either old or new complete state; a clean checkout plus declared offline inputs must pass with zero database or vector-store services, and DTH tests/manifests must contain no required database endpoint or backend-specific driver; later resume and observability consumers must preserve this artifact identity and atomicity rather than invent parallel lineage.
- Learner misconception risk: A database is not automatically more durable than correctly synchronized files; FNV is not collision-resistant identity; atomic rename does not flush all storage layers by itself; deleting a file without lineage can strand or invalidate descendants.
- Boundary: Immutable portable files are mandatory and sufficient for DTH; a backend-neutral vector store is optional only if a separately scoped retrieval capability proves it necessary, and no particular database or service can become a DTH or static-HTML runtime dependency.

## CAP-DTH-QUANT-01 — Calibrated quantization with memory and quality receipts
- Classification: mandatory-laptop-implementation
- Domain: quantization
- Source evidence: SRC-DTH-QUANT-01 supports second-order low-bit post-training weight quantization and SRC-DTH-QUANT-02 supports activation-aware weight-only quantization with kernel-dependent acceleration; neither guarantees this model/hardware result.
- Current repo evidence: All tensors and checkpoint values are f64 and there is no calibration set, quantizer, scale/zero/group metadata, packed low-bit representation, dequantization kernel, quantized artifact, or perplexity/logit/memory/latency comparison.
- Gap: Teach a course-owned reference symmetric weight-only quantizer, freeze calibration/evaluation partitions, define granularity/group/outlier/rounding/clipping metadata, add a packed representation and compatible kernel or explicitly dequantize, record theoretical and actual bytes, compare quality/latency/energy, and separate quantized inference from mixed-precision training.
- Exact affected files: Proposed owner is `rust/crates/llm-from-scratch/src/quantization.rs` with integrations in `rust/crates/llm-from-scratch/src/tensor/dtype.rs`, `rust/crates/llm-from-scratch/src/tensor/backend.rs`, `rust/crates/llm-from-scratch/src/artifact/safetensors.rs`, optional `rust/crates/llm-from-scratch/src/artifact/gguf.rs`, `rust/crates/llm-from-scratch/src/evaluation.rs`, `rust/crates/llm-from-scratch/src/observability.rs`, proposed `curriculum/chapters/41-quantization.md`, `site/src/content/chapters/en/41-quantization.mdx`, `site/src/content/chapters/ru/41-quantization.mdx`, `rust/demos/ch41-quantization/`, and `rust/crates/llm-from-scratch/tests/quantization.rs`.
- Dependencies: CAP-DTH-DATA-04 decontamination, CAP-DTH-BACKEND-01, CAP-DTH-EVAL-02, CAP-DTH-ART-01, CAP-DTH-OBS-01, and a frozen permitted model/calibration artifact with provenance/license/privacy review.
- Conservative laptop/resource estimate: Mandatory own-model exercise should quantize at most 500 MB source weights with at most 4 GiB host RAM, 2.0 GiB GPU allocator, 5 GB disk, and 30 min; a bounded imported-model exercise may use 0.5B-1.5B parameters at 4 bits, at most 3 GB download, 25 GB disk, 24 GiB host peak, 6.25 GiB GPU allocator, and 1-12 h only if separately approved.
- Falsifiable gates: Frozen small tensors must match hand-calculated scales, codes, saturation, packing, and dequantization exactly; artifact byte accounting must reconcile within 1 byte per declared section; on at least 100 frozen evaluation sequences, predeclared loss/logit degradation must stay within its bound; report synchronized median/p95 latency and measured allocator peak for float and quantized paths; reject mismatched calibration hash, shape/group metadata, unsupported kernel, silent float fallback, or quality-bound failure.
- Learner misconception risk: Four-bit weights do not mean total model memory is one-quarter because scales, embeddings, activations, KV cache, workspace, and runtime packing remain; compression does not ensure speed; calibration on evaluation data contaminates the result; quantized inference is not quantized training.
- Boundary: A transparent small reference quantizer and one measured accelerated path are mandatory; reproducing GPTQ/AWQ optimizers, quantizing unlicensed large weights, or claiming production-quality compression is outside acceptance unless separately scoped.

## CAP-DTH-OBS-01 — Resource and numerical observability with enforceable ceilings
- Classification: mandatory-laptop-implementation
- Domain: observability
- Source evidence: SRC-DTH-HW-04 and SRC-DTH-HW-05 define official device-memory counters and their accounting limits; SRC-DTH-HW-06 and SRC-DTH-HW-07 support recording numeric modes and determinism boundaries; none makes telemetry a causal profiler.
- Current repo evidence: Tests assert tiny CPU timeouts and finite values, but training produces no structured version/device/dtype/kernel receipt, allocator peak, device-wide free/used bytes, host RSS, disk/download bytes, throughput, power/temperature sample, overflow/clip/skip counts, or phase timing.
- Gap: Add structured start/end/interval receipts; distinguish backend live/reserved/peak allocator bytes from NVML device-wide total/free/reserved/used; sample host RSS and disk; synchronize GPU timings; count valid tokens not padded tokens; capture driver/backend/kernel/determinism/dtype/config IDs; enforce preflight and runtime ceilings without making optional sensors acceptance-critical.
- Exact affected files: Proposed owner is `rust/crates/llm-from-scratch/src/observability.rs` with integrations in `rust/crates/llm-from-scratch/src/tensor/backend.rs`, `rust/crates/llm-from-scratch/src/training/trainer.rs`, `rust/crates/llm-from-scratch/src/training/job_checkpoint.rs`, `rust/crates/llm-from-scratch/src/pipeline.rs`, `rust/crates/llm-from-scratch/src/evaluation.rs`, proposed `curriculum/chapters/40-hardware-acceleration.md`, `site/src/content/chapters/en/40-hardware-acceleration.mdx`, `site/src/content/chapters/ru/40-hardware-acceleration.mdx`, `rust/demos/ch40-hardware-acceleration/`, `curriculum/chapters/33-training-selection.md`, `site/src/content/chapters/en/33-training-selection.mdx`, `site/src/content/chapters/ru/33-training-selection.mdx`, `curriculum/chapters/39-end-to-end-llm.md`, `site/src/content/chapters/en/39-end-to-end-llm.mdx`, `site/src/content/chapters/ru/39-end-to-end-llm.mdx`, and `rust/crates/llm-from-scratch/tests/resource_observability.rs`.
- Dependencies: CAP-DTH-BACKEND-01 allocator API, CAP-DTH-MP-01, CAP-DTH-MEM-01, CAP-DTH-OPT-01, CAP-DTH-RESUME-01, stable host process metrics, and an optional narrowly scoped NVML binding decision.
- Conservative laptop/resource estimate: Sample at no more than 2 Hz, retain at most 50 MiB compressed telemetry per 30 h core run, keep instrumentation under 2 percent measured wall time, and enforce 6.25 GiB course allocator, 0.50 GiB device-wide free-at-peak, 12 GiB host peak, 30 GB disk, and 30 h core wall ceilings.
- Falsifiable gates: Synthetic counter fixtures must reconcile allocations/deallocations exactly and detect a 1 MiB injected leak; synchronized timing must report at least 100 measured steps and valid tok/s; an injected 1-byte ceiling breach must cause a nonzero refusal/failure with last-good state preserved; receipts must carry exact units and distinguish decimal GB/binary GiB; unsupported NVML/power fields must be marked unavailable while required allocator/RSS/disk/time counters still gate acceptance.
- Learner misconception risk: NVML used memory includes reservations and other consumers; backend reserved memory is not live tensors; asynchronous kernel launch time is not execution time; GPU utilization is not model-flop utilization; a telemetry correlation does not identify a bottleneck.
- Boundary: Memory/RAM/disk/time/throughput identities and ceilings are mandatory; power, temperature, energy, and hardware counters are informative when available and cannot fail otherwise-valid runs on unsupported OEM/platform interfaces.

## CAP-DTH-HW-01 — Exact RTX 4070 Laptop 8 GB admission and conservative host envelope
- Classification: mandatory-laptop-implementation
- Domain: resource-envelope
- Source evidence: SRC-DTH-HW-01 and SRC-DTH-HW-02 supply the exact named GPU's 8 GB GDDR6, 128-bit, 4,608-core, 35-115 W, and clock-range facts; SRC-DTH-HW-04 and SRC-DTH-HW-05 support runtime byte measurements; no source guarantees sustained throughput or usable training memory.
- Current repo evidence: The current f64 CPU fixture has no GPU preflight, resource profiles, hardware-identity receipt, free-memory check, host-RAM/disk/download admission, thermal-aware duration bound, or refusal semantics; its tiny timeout cannot evidence the requested laptop envelope.
- Gap: Freeze CI, GPU-smoke, mandatory-core, and optional advanced profiles; query actual device name/UUID/total/free bytes and backend capability; pre-compute state/activation/workspace budgets; require host RAM/disk/download/time bounds; run a short synchronized throughput/thermal probe; derive upper wall time; fail before acquisition/training if any hard ceiling or compatibility condition is unsatisfied.
- Exact affected files: Proposed owners are `rust/crates/llm-from-scratch/src/resource_profile.rs`, `rust/crates/llm-from-scratch/src/observability.rs`, `rust/crates/llm-from-scratch/src/tensor/backend.rs`, `rust/crates/llm-from-scratch/src/training/trainer.rs`, `rust/crates/llm-from-scratch/src/pipeline.rs`, `scripts/acquire-functional-llm-artifacts.mjs`, proposed `scripts/validate-functional-llm-resource-envelope.mjs`, `curriculum/course-plan.md`, `curriculum/chapters/39-end-to-end-llm.md`, `site/src/content/chapters/en/39-end-to-end-llm.mdx`, `site/src/content/chapters/ru/39-end-to-end-llm.mdx`, and `rust/crates/llm-from-scratch/tests/resource_envelope.rs`; exact values must be recorded in `DECISIONS.md`.
- Dependencies: CAP-DTH-DATA-01, CAP-DTH-BACKEND-01, CAP-DTH-MP-01, CAP-DTH-MEM-01, CAP-DTH-OPT-01, CAP-DTH-ART-01, CAP-DTH-PERSIST-01, CAP-DTH-RESUME-01, CAP-DTH-EVAL-02, CAP-DTH-QUANT-01, CAP-DTH-OBS-01, physical RTX 4070 Laptop GPU 8 GB evidence, and approval of the final resource contract.
- Conservative laptop/resource estimate: Mandatory candidate is 20M-50M parameters, context 256-512, 10M-30M valid tokens, 350-2,000 measured valid tok/s planning range, 2-30 h budget, at least 7.00 GiB free VRAM at start, at most 6.25 GiB course allocator, at least 0.50 GiB device-wide free at peak, at most 12 GiB host peak, 16 GiB installed RAM floor/32 GiB recommended, 4 GB download, and 30 GB disk.
- Falsifiable gates: Reject before large allocation if GPU identity is not an RTX 4070 Laptop GPU, reported total is below 7.40 GiB, startup free is below 7.00 GiB, estimated allocator exceeds 6.25 GiB, disk/download/RAM bound fails, required dtype/kernel is unavailable, or a 5-15 min probe projects above 30 h; during the run fail safely if allocator exceeds 6.25 GiB, device-wide free falls below 0.50 GiB, host peak exceeds 12 GiB, disk exceeds 30 GB, or wall time exceeds 30 h; preserve measured receipts and last-good checkpoint.
- Learner misconception risk: 8 GB is not necessarily 8 GiB usable; the desktop RTX 4070 and laptop RTX 4070 are not the same envelope; CUDA-core/AI-TOPS marketing values do not predict training tok/s; 115 W is a range maximum, not every OEM's sustained power; fitting memory does not imply finishing on time or learning useful behavior.
- Boundary: Acceptance is for one specified 8 GB laptop class under a measured frozen stack; other GPUs may run opportunistically but cannot substitute acceptance, and exceeding the core envelope moves the activity to an optional advanced/bounded profile rather than silently shrinking the claim.

## CAP-DTH-DIST-01 — Single-process distributed schedule and collective simulations
- Classification: laptop-feasible-advanced-exercise
- Domain: distributed
- Source evidence: SRC-DTH-SCALE-01 supports tensor-parallel partition/communication, SRC-DTH-SCALE-02 supports state partitioning, and SRC-DTH-SCALE-03 supports pipeline/microbatch scheduling; none lets one GPU validate real distributed systems behavior.
- Current repo evidence: There is one CPU process and no rank/world topology, collective, partition plan, communication trace, pipeline scheduler, shard optimizer, or failure simulation.
- Gap: Add deterministic small-array simulations of all-reduce, reduce-scatter/all-gather, tensor partition, ZeRO-style state ownership, and GPipe-style stage/microbatch schedules, with byte/message counts and comparisons to an unpartitioned scalar oracle; teach why simulation is not a performance result.
- Exact affected files: Proposed owners are `rust/crates/llm-from-scratch/src/distributed.rs`, `curriculum/chapters/42-distributed-training.md`, `site/src/content/chapters/en/42-distributed-training.mdx`, `site/src/content/chapters/ru/42-distributed-training.mdx`, `rust/demos/ch42-distributed-training/`, and `rust/crates/llm-from-scratch/tests/distributed_simulation.rs`; no networking or MPI/NCCL dependency is needed for this exercise.
- Dependencies: CAP-DTH-ARCH-02, CAP-DTH-BATCH-02 microbatch semantics, CAP-DTH-MEM-01 accumulation, CAP-DTH-RESUME-01 state ownership concepts, CAP-DTH-OBS-01 units, and the scalar tensor oracle.
- Conservative laptop/resource estimate: Simulate at most 8 logical ranks and tensors at most 64 MiB, under 2 GiB host RAM, under 1 GB disk, 0 B network/download, and under 15 min CPU wall time.
- Falsifiable gates: For 1, 2, 4, and 8 logical ranks, reconstructed parameters/gradients/optimizer updates must match the unpartitioned f64 oracle exactly or within a pre-frozen reduction-order tolerance; trace byte/message formulas must match hand calculations; injected missing/duplicate/out-of-order collective events must reject; the output must explicitly set real_multi_device_validated:false and measured_speedup:null.
- Learner misconception risk: Logical ranks are not devices; reducing per-rank state can increase communication; theoretical byte counts omit latency/contention; a schedule without concurrent hardware cannot demonstrate overlap, deadlock freedom, fault tolerance, or speedup.
- Boundary: This advanced exercise is fully laptop-feasible because it is simulation; it cannot satisfy any actual multi-device, network, collective-library, elastic, or failure-recovery claim.

## CAP-DTH-DIST-02 — Actual multi-device data/tensor/pipeline parallel training
- Classification: bounded-scale-extension
- Domain: distributed
- Source evidence: SRC-DTH-SCALE-01, SRC-DTH-SCALE-02, and SRC-DTH-SCALE-03 establish algorithms whose defining behavior includes multiple accelerators and communication.
- Current repo evidence: No distributed runtime, second accelerator, interconnect, collective backend, process launcher, rank-local checkpoint, rendezvous, failure injection, or multi-device resource budget exists, and the accepted hardware floor names one 8 GB GPU.
- Gap: A genuine extension would need a supported multi-device topology, approved collective/runtime dependency, sharding plan, deterministic/reduction tolerance contract, distributed sampler, rank RNG/cursor state, coordinated atomic checkpoints, timeout/error propagation, topology/communication receipts, and baseline efficiency analysis.
- Exact affected files: Any future extension would affect `rust/crates/llm-from-scratch/src/distributed.rs`, `rust/crates/llm-from-scratch/src/tensor/backend.rs`, `rust/crates/llm-from-scratch/src/training/trainer.rs`, `rust/crates/llm-from-scratch/src/training/job_checkpoint.rs`, `rust/crates/llm-from-scratch/src/observability.rs`, `rust/crates/llm-from-scratch/Cargo.toml`, `Cargo.lock`, `curriculum/chapters/42-distributed-training.md`, `site/src/content/chapters/en/42-distributed-training.mdx`, `site/src/content/chapters/ru/42-distributed-training.mdx`, `rust/demos/ch42-distributed-training/`, `rust/crates/llm-from-scratch/tests/distributed_hardware.rs`, `BUILD_STATE.yaml`, and `DECISIONS.md`; these are not authorized outputs of the laptop build.
- Dependencies: CAP-DTH-DIST-01, CAP-DTH-HW-01, at least 2 physical compatible accelerators, approved multi-node/process runtime and collectives, network/interconnect access, every mandatory training/resume/observability capability, and a new resource/authority decision.
- Conservative laptop/resource estimate: Minimum meaningful local validation requires at least 2 GPUs and therefore exceeds the specified 1-GPU laptop; a bounded external smoke could use 2-4 GPUs for 1-8 h, at least 16-32 GB aggregate VRAM, at least 50 GB disk, and network traffic measured rather than estimated; cost and service are unapproved.
- Falsifiable gates: Actual acceptance must run at world sizes 1 and at least 2, match a frozen single-device update within declared reduction tolerance, consume each sample exactly once per global epoch, restore every rank after at least 3 interruption points, detect one missing rank/collective timeout, publish per-rank peaks and collective bytes, and demonstrate measured throughput scaling above a predeclared threshold; a one-GPU simulation must fail this classification.
- Learner misconception risk: More GPUs do not multiply usable memory or speed linearly; data, tensor, and pipeline parallelism solve different constraints; distributed nondeterminism cannot be waved away; aggregate VRAM is not a single address space.
- Boundary: This capability is outside the mandatory laptop acceptance and may proceed only as a separately budgeted extension with real hardware; documents or simulations alone cannot mark it complete.

## CAP-DTH-MOE-01 — Exact sparse-expert routing and capacity simulation
- Classification: laptop-feasible-advanced-exercise
- Domain: mixture-of-experts
- Source evidence: SRC-DTH-SCALE-04 supports sparse top-expert routing with explicit capacity, dropped-token, load-balancing, and placement concerns; its TPU-scale quality/speed results do not transfer.
- Current repo evidence: The decoder has one dense SwiGLU FFN per block and no router logits, top-k selection, tie-break, expert capacity, overflow policy, auxiliary balance loss, dispatch/combine map, or expert-usage telemetry.
- Gap: Implement a tiny course-owned deterministic router and dense-reference comparison; freeze top-k tie-breaking, capacity rounding, overflow/drop/reroute policy, auxiliary loss, dispatch order, gradient paths, and per-expert utilization; distinguish active compute from total stored parameters.
- Exact affected files: Proposed owner is `rust/crates/llm-from-scratch/src/moe.rs` with optional integration in `rust/crates/llm-from-scratch/src/models/decoder_block.rs`, `rust/crates/llm-from-scratch/src/observability.rs`, proposed `curriculum/chapters/43-mixture-of-experts.md`, `site/src/content/chapters/en/43-mixture-of-experts.mdx`, `site/src/content/chapters/ru/43-mixture-of-experts.mdx`, `rust/demos/ch43-mixture-of-experts/`, and `rust/crates/llm-from-scratch/tests/moe_routing.rs`.
- Dependencies: CAP-DTH-ARCH-02, CAP-DTH-BATCH-02 masks, CAP-DTH-OBS-01, and pedagogy scoped by SRC-DTH-SCALE-04; CAP-DTH-BACKEND-01 is an additional prerequisite only for an optional GPU execution path.
- Conservative laptop/resource estimate: Use at most 8 experts, top-1 or top-2 routing, at most 1M total expert parameters, at most 1,024 routed tokens per fixture, under 2 GiB RAM/VRAM, under 1 GB disk, 0 B download, and under 15 min.
- Falsifiable gates: Hand fixtures must match exact expert IDs, stable tie-break, capacity count, overflow outcome, combine weights, auxiliary loss, and gradients; across at least 100 seeded batches every token must be processed or explicitly counted as dropped exactly once; reported active and total parameter counts must match formulas; output must set expert_parallel_validated:false and distributed_speedup:null.
- Learner misconception risk: Sparse activation does not make all parameters fit for free; top-k selection can be nondifferentiable at ties; balanced counts do not guarantee equal compute; a local router simulation is not expert parallelism or evidence of quality gain.
- Boundary: Laptop feasibility is limited to tiny routing/math and single-device execution; realistic expert counts, all-to-all dispatch, and sparse-kernel speedups belong to CAP-DTH-MOE-02.

## CAP-DTH-MOE-02 — Expert-parallel sparse model scale
- Classification: bounded-scale-extension
- Domain: mixture-of-experts
- Source evidence: SRC-DTH-SCALE-04 demonstrates large sparse expert models whose system behavior depends on distributed expert placement and communication; it does not establish a laptop path.
- Current repo evidence: There is no MoE implementation or distributed runtime, and one RTX 4070 Laptop GPU cannot validate expert-parallel all-to-all, placement imbalance, network contention, rank loss, or cluster throughput.
- Gap: A true extension needs real expert partitioning, all-to-all dispatch/combine, token-capacity coordination, load-balance monitoring, sparse checkpoint/shard ownership, rank-local RNG/cursors, topology-aware placement, failure behavior, dense/one-device baselines, and a quality-versus-total/active-parameter analysis.
- Exact affected files: Future extension paths include `rust/crates/llm-from-scratch/src/moe.rs`, `rust/crates/llm-from-scratch/src/distributed.rs`, `rust/crates/llm-from-scratch/src/tensor/backend.rs`, `rust/crates/llm-from-scratch/src/training/job_checkpoint.rs`, `rust/crates/llm-from-scratch/src/observability.rs`, `rust/crates/llm-from-scratch/src/artifact/mod.rs`, `rust/crates/llm-from-scratch/Cargo.toml`, `Cargo.lock`, `curriculum/chapters/43-mixture-of-experts.md`, `site/src/content/chapters/en/43-mixture-of-experts.mdx`, `site/src/content/chapters/ru/43-mixture-of-experts.mdx`, `rust/demos/ch43-mixture-of-experts/`, and `rust/crates/llm-from-scratch/tests/moe_expert_parallel.rs`; none is authorized by this audit.
- Dependencies: CAP-DTH-MOE-01, CAP-DTH-DIST-02, multiple physical accelerators/nodes, approved collective/sparse-kernel dependencies, governed scale data, and a separately approved compute/network/storage budget.
- Conservative laptop/resource estimate: Real expert-parallel validation requires at least 2 devices/nodes and exceeds the 1-device 8 GB envelope; a bounded external exercise might use 4-8 GPUs, at least 64 GB aggregate VRAM, 100-500 GB disk, and 2-24 h, but these are unapproved order-of-magnitude estimates to be replaced by a provider quote and measured profile.
- Falsifiable gates: Run with at least 2 physical expert-owning ranks; match single-device routing/logits/gradients within frozen tolerance on a shared fixture; account for exactly 100 percent of tokens as processed/dropped/rerouted; measure all-to-all bytes and per-expert load; recover or fail consistently after at least 3 rank-loss points; beat a predeclared dense or replicated baseline on a declared metric; any one-device result must fail the expert-parallel gate.
- Learner misconception risk: Total sparse parameters are not active FLOPs, quality, memory, or throughput; all-to-all can dominate; unused experts still occupy storage; a trillion-parameter headline does not mean a trillion parameters execute per token.
- Boundary: Expert-parallel MoE is a bounded-scale extension requiring real distributed hardware and cannot block or be claimed by the functional single-laptop course.

## CAP-ISA-DEC-001 — Preserve the greedy and temperature/top-k scalar oracle
- Classification: reference-core-proven
- Domain: decoding
- Source evidence: SRC-ISA-002 corroborates that greedy, temperature, and top-k are separable real controls; its claim limit means the repository, not that implementation, is authority for this course's exact stable-tie and RNG behavior.
- Current repo evidence: rust/crates/llm-from-scratch/src/generation/sampling.rs validates finite logits, positive finite temperature, top-k in 1..=vocabulary, exact retained count, descending-logit/ascending-token-ID ties, stable f64 normalization, half-open intervals, deterministic SplitMix64 state, and failure atomicity; Chapters 36 and 38 expose the bounded proof.
- Gap: The proof is scalar f64, one request, and does not include top-p, penalties, stop strings, logprobs, constraints, or streaming.
- Exact affected files: Preserve inline oracle tests in `rust/crates/llm-from-scratch/src/generation/sampling.rs`; add `rust/crates/llm-from-scratch/src/generation/decoding.rs` and `rust/crates/llm-from-scratch/tests/realistic_decoding.rs` as differential wrappers.
- Dependencies: None; a supporting library must not replace sampling rank, support selection, normalization, categorical interval selection, or RNG-transition policy.
- Conservative laptop/resource estimate: Estimate: CPU-only differential suite below 256 MiB peak host RAM and 30 seconds; no GPU or model artifact is required.
- Falsifiable gates: Existing tests remain behavior-compatible; 10,000 fixed-logit/fixed-seed replay decisions reproduce token ID, retained IDs, interval, probability vector, error, and final RNG state exactly; the new wrapper with top-p 1, zero penalties, no constraints, and no stops is identical.
- Learner misconception risk: Temperature and top-k do not change model weights or make an answer correct; they only transform/select from logits for this step.
- Boundary: Proves a protected scalar policy oracle, not useful language quality, multi-request isolation, accelerator bitwise identity, or any omitted control.

## CAP-ISA-DEC-002 — Define the exact nucleus/top-p set and combination order
- Classification: mandatory-laptop-implementation
- Domain: decoding
- Source evidence: SRC-ISA-001 supports dynamic nucleus selection and SRC-ISA-002 corroborates combined top-k/top-p controls; neither source standardizes ties, cumulative arithmetic, processor order, or invalid-input behavior.
- Current repo evidence: rust/crates/llm-from-scratch/src/generation/sampling.rs already provides stable rank order, compensated/stable f64 probability arithmetic, typed validation, and deterministic categorical selection, but SamplingMode has no top-p field or cumulative-prefix decision.
- Gap: No exact top-p retained set, boundary-token rule, combined top-k/top-p ordering, serialized policy identity, or differential fixture exists.
- Exact affected files: `rust/crates/llm-from-scratch/src/generation/decoding.rs`; `rust/crates/llm-from-scratch/src/generation/mod.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/tests/realistic_decoding.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: None for the algorithm; JSON serialization may be supporting plumbing, while ranking, cumulative support selection, renormalization, and RNG behavior remain course-owned.
- Conservative laptop/resource estimate: Estimate: exhaustive small-vocabulary plus one 100,000-token stress fixture below 512 MiB peak host RAM and 60 seconds on CPU.
- Falsifiable gates: After penalties and temperature, rank by descending transformed logit then ascending ID; for 0<p<=1 retain the smallest nonempty prefix whose compensated cumulative full-vocabulary probability is at least p, including the boundary token; intersect that prefix with the stable top-k prefix and renormalize; exhaustive ties and p just below/equal/above boundaries assert exact IDs and f64 sum error at most 1e-12; invalid p fails before RNG/output allocation.
- Learner misconception risk: Top-p is not “every token with individual probability above p,” is not a fixed k, and can differ from sequential top-k-then-renormalize/top-p processing.
- Boundary: This explicit course policy is interoperable only when processor order/version is serialized; it must not be claimed byte-identical to every external engine.

## CAP-ISA-DEC-003 — Add count penalties without mutable-logit leakage
- Classification: mandatory-laptop-implementation
- Domain: decoding
- Source evidence: SRC-ISA-002 and SRC-ISA-018 support presence/frequency/repetition controls as real request vocabulary, while SRC-ISA-003 supplies one historical multiplicative repetition formulation; no source makes the formulas equivalent or universal.
- Current repo evidence: generation/sampling.rs receives one logit vector per decision and has no prefix-count state, penalty configuration, or invariant protecting reusable model logits across request/step processing.
- Gap: Presence/frequency penalty math, count scope, application order, validation, base-logit immutability, and distinction from multiplicative repetition penalty are undefined.
- Exact affected files: `rust/crates/llm-from-scratch/src/generation/decoding.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/tests/realistic_decoding.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: None; token counting and logit transformation are learner-facing course algorithms, not supporting-library work.
- Conservative laptop/resource estimate: Estimate: token-count state O(vocabulary) or sparse O(distinct-prefix-tokens), below 512 MiB host RAM and 30 seconds for deterministic CPU tests.
- Falsifiable gates: On a fresh step buffer compute adjusted_i = base_i - presence_coefficient×I(count_i>0) - frequency_coefficient×count_i, with prompt-plus-generated scope serialized and penalties before temperature/truncation; hand fixtures cover positive/zero/negative logits and counts; 100 interleavings leave base-logit bits unchanged; zero penalties exactly match CAP-ISA-DEC-001 and CAP-ISA-DEC-002; non-finite coefficients fail before RNG movement.
- Learner misconception risk: A decoding penalty is not learned anti-repetition behavior or a safety filter; in-place logit reuse can look plausible while leaking earlier request/step state.
- Boundary: Additive presence/frequency penalties are mandatory; any sign-aware multiplicative repetition comparison needs a distinct name/formula and is optional advanced material.

## CAP-ISA-DEC-004 — Match multi-token stop strings with frozen finish precedence
- Classification: mandatory-laptop-implementation
- Domain: decoding
- Source evidence: SRC-ISA-002 and SRC-ISA-018 corroborate stop sequences and finish reasons as deployed vocabulary; SRC-ISA-004 and SRC-ISA-005 constrain UTF-8 stream behavior but do not define token-spanning stop semantics.
- Current repo evidence: generation/sampling.rs and generation/kv_cache.rs stop only for EOS, token limit, or context limit; tokenizer/bpe.rs exposes token bytes, but no stateful byte matcher or emission holdback exists.
- Gap: Stops within/across token pieces, overlapping prefixes, mid-token suppression, prompt exclusion, output holdback, collision precedence, configuration caps, and exactly-one-finish-reason behavior are absent.
- Exact affected files: `rust/crates/llm-from-scratch/src/generation/stopping.rs`; `rust/crates/llm-from-scratch/src/generation/streaming.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/tests/realistic_decoding.rs`; `rust/crates/llm-local-server/tests/local_api.rs`.
- Dependencies: A mature finite-automaton utility is permissible only as generic matching plumbing if it exposes deterministic byte semantics; stop scope, limits, precedence, token evidence, and emission policy remain course-owned.
- Conservative laptop/resource estimate: Estimate: cap at 16 nonempty UTF-8 stop strings and 256 total stop bytes; holdback at most longest_stop_bytes-1 plus one token piece; tests below 256 MiB and 30 seconds.
- Falsifiable gates: Pass 7 stop classes if matching applies only to generated bytes; fixtures cover one-token, multi-token, shared-prefix, overlapping, mid-token, and Unicode-split stops; no matched or potentially matched suffix leaks to SSE; freeze post-selection precedence as fatal decode error, earliest stop-byte position with configured-order tie, EOS, output-token limit, context limit, cancellation, then internal error; exactly one typed reason occurs and invalid/oversized stops fail before model/KV allocation.
- Learner misconception risk: A stop string is not necessarily one token, and already-emitted bytes cannot be retracted safely.
- Boundary: Literal generated-byte matching only; no regex, semantic stopping, moderation, or prompt-side stop matching is implied.

## CAP-ISA-DEC-005 — Report model and sampling logprobs without changing decisions
- Classification: mandatory-laptop-implementation
- Domain: decoding
- Source evidence: SRC-ISA-002 and SRC-ISA-018 support token score/logprob and finish metadata as real observability vocabulary; they do not define which transformed distribution a generic “logprob” denotes.
- Current repo evidence: sampling.rs records selected token, RNG draw, and interval for its scalar choice, but generation results discard the complete distribution and do not distinguish raw-model likelihood from final sampling-policy likelihood.
- Gap: Per-token model_logprob, sampling_logprob, bounded alternatives, ranks/bytes, excluded-support handling, serialization limits, and observer noninterference are missing.
- Exact affected files: `rust/crates/llm-from-scratch/src/generation/decoding.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-local-server/src/http.rs`; `rust/crates/llm-from-scratch/tests/realistic_decoding.rs`; `rust/crates/llm-local-server/tests/local_api.rs`.
- Dependencies: Standard JSON serialization may be plumbing; log-sum-exp, transformed distribution, rank/support, and observation noninterference remain course-owned.
- Conservative laptop/resource estimate: Estimate: caller-selected 0..20 top alternatives, response-evidence byte cap checked before generation, and CPU oracle below 512 MiB/60 seconds.
- Falsifiable gates: exp(sampling_logprob) matches the selected token's final constrained/truncated renormalized probability within 1e-12; model_logprob matches an independent full-vocabulary temperature-1 log-sum-exp oracle; enabling/disabling logprobs and alternatives leaves token sequence, intervals, finish reason, and final RNG identical; excluded tokens cannot appear selectable.
- Learner misconception risk: High logprob is not factual correctness or calibrated confidence, and post-truncation sampling logprob is not raw model likelihood.
- Boundary: CPU f64 is the oracle; accelerator paths use a predeclared numeric tolerance and identical discrete support, not a blanket bitwise-cross-backend claim.

## CAP-ISA-DEC-006 — Stream Unicode and SSE without corrupting token bytes
- Classification: mandatory-laptop-implementation
- Domain: decoding
- Source evidence: SRC-ISA-004 requires stateful incremental UTF-8 handling and distinguishes fatal/replacement modes; SRC-ISA-005 requires UTF-8, line-framed, complete SSE events.
- Current repo evidence: tokenizer/bpe.rs round-trips arbitrary token bytes and supports strict whole-result UTF-8, while Chapter 38 decodes only after generation completes and the workspace has no SSE server.
- Gap: Incremental UTF-8 state, split-scalar handling, stop holdback interaction, terminal invalid/incomplete behavior, complete JSON event framing, and slow-consumer behavior are absent.
- Exact affected files: `rust/crates/llm-from-scratch/src/generation/streaming.rs`; `rust/crates/llm-local-server/src/sse.rs`; `rust/crates/llm-local-server/tests/local_api.rs`; `rust/crates/llm-from-scratch/tests/realistic_decoding.rs`.
- Dependencies: HTTP/SSE framing and async I/O may use mature libraries; UTF-8/stop buffering semantics, caps, error types, and event evidence remain course-owned.
- Conservative laptop/resource estimate: Estimate: pending buffer max(3, longest_stop_bytes-1) plus one token piece; deterministic CPU and Firefox-loopback integration below 256 MiB and 60 seconds, excluding server build time.
- Falsifiable gates: Split every 1..4-byte Unicode scalar at every byte/token/event boundary; concatenated events equal one-shot strict decode; every SSE data payload independently parses as UTF-8 JSON and ends in a complete event; server never inserts replacement characters; invalid or incomplete final bytes emit the declared typed terminal error; cancellation/slow-client tests never expose partial JSON.
- Learner misconception risk: Token boundaries are neither character nor grapheme boundaries, and whole-response String::from_utf8 does not prove safe streaming.
- Boundary: Mandatory correctness is byte fidelity and Unicode-scalar validity; grapheme-aware UI animation and raw arbitrary-byte streaming require separately named interfaces.

## CAP-ISA-DEC-007 — Compare beam, multiple-candidate, and speculative decoding honestly
- Classification: laptop-feasible-advanced-exercise
- Domain: decoding
- Source evidence: SRC-ISA-002 corroborates beam and multiple-return-sequence controls in a real generation implementation but does not standardize course ordering; SRC-ISA-045 supports speculative decoding with exact target-distribution correction but cannot transfer its speedups or draft-model choice.
- Current repo evidence: `rust/crates/llm-from-scratch/src/generation/sampling.rs` generates one greedy or sampled continuation; no beam state/score normalization, candidate tree, per-candidate RNG/cache ownership, draft model, acceptance/rejection correction, or target-call counter exists.
- Gap: F09's omitted beam, multiple-candidate search, and speculative decoding need explicit optional classification so they cannot be mistaken for mandatory realistic single-sequence decoding or claimed from top-k alone.
- Exact affected files: `rust/crates/llm-from-scratch/src/generation/search.rs`; `rust/crates/llm-from-scratch/src/generation/speculative.rs`; `rust/crates/llm-from-scratch/tests/advanced_decoding.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Generic priority queues/buffers and a second selected draft artifact may be plumbing; beam expansion/pruning/score/tie policy, candidate RNG/cache ownership, speculative acceptance/correction, target verification, and counters remain course-owned.
- Conservative laptop/resource estimate: Estimate: beam width 2..4, 2..4 returned candidates, speculative block at most 8 tokens, tiny exact CPU fixtures below 2 GiB/10 minutes, and selected-model comparison below 6.5 GiB VRAM/12 GiB host and 2 hours only if a compatible draft fits.
- Falsifiable gates: Pass at least 50 tiny fixtures if exhaustive enumeration and stable descending score/ascending token-path ties exactly match beam outputs; each of 2..4 candidates owns isolated RNG/cache/finish state; speculative output distributions match ordinary target sampling within a predeclared statistical test across at least 10,000 draws and every emitted token is target-verified; acceptance zero/one edge cases and draft mismatch fail loudly; measure target calls/accepted tokens and freeze any speed threshold before runs.
- Learner misconception risk: Beam search is not sampling and can reduce diversity, “n candidates” are not independent if state is shared, and speculative decoding changes performance—not the target distribution when correction is implemented correctly.
- Boundary: Optional bounded search/speculation mechanics; mandatory endpoint remains one audited sequence, no speedup is promised, and production tree search/speculative schedulers are excluded.

## CAP-ISA-ART-001 — Preserve the course-native exact checkpoint oracle
- Classification: reference-core-proven
- Domain: artifacts
- Source evidence: No external format source establishes this custom wire format; current executable repository evidence is the authority, while SRC-ISA-007 establishes why it must not be called safetensors-compatible.
- Current repo evidence: rust/crates/llm-from-scratch/src/checkpoint.rs implements versioned LLMCP35 with tokenizer, f64 model bits, selected trainer state, AdamW moments/shared step, sampling RNG, checked lengths, checksum rejection, and same-directory atomic publication on Unix; Chapter 35 states explicit omissions.
- Gap: The proof does not establish universal interchange, cryptographic authenticity/lineage, cross-platform crash durability, or complete trainer/data resume.
- Exact affected files: Preserve `rust/crates/llm-from-scratch/src/checkpoint.rs`, `curriculum/chapters/35-checkpoints.md`, `site/src/content/chapters/en/35-checkpoints.mdx`, `site/src/content/chapters/ru/35-checkpoints.mdx`, `site/tests/35-checkpoints.test.ts`, and `site/tests/e2e/ch35-checkpoints.spec.ts`; downstream format separation is explicit in `rust/crates/llm-from-scratch/src/artifact/mod.rs` and `rust/crates/llm-from-scratch/src/artifact/manifest.rs`.
- Dependencies: Existing narrow serialization plumbing only; no new dependency is required for this proof.
- Conservative laptop/resource estimate: Estimate: ordinary fixtures remain kilobytes and below 512 MiB/60 seconds; any 1 GiB corruption/streaming stress case belongs to a separately budgeted profile.
- Falsifiable gates: Existing exact-byte, round-trip, truncation, corruption, unknown-version, allocation-bound, and failure-atomicity tests pass unchanged; external import/export work never relabels LLMCP35 as a standard format or complete resume artifact.
- Learner misconception risk: Exact reload is not complete interrupted-job resume, trusted provenance, model safety, or external compatibility.
- Boundary: Reference-only custom pedagogical format; it is not the distribution format for third-party pretrained models.

## CAP-ISA-ART-002 — Admit the DTH SafeTensors bundle into the serving identity chain
- Classification: mandatory-laptop-implementation
- Domain: artifacts
- Source evidence: SRC-ISA-007 specifies a bounded tensor container and its structural fields but explicitly cannot supply architecture, tokenizer, provenance, generation, or serving-admission semantics.
- Current repo evidence: checkpoint.rs serializes named course state only in LLMCP35; sibling CAP-DTH-ART-01 owns the missing SafeTensors realization/interchange policy, but no serving loader binds that bundle to the exact config/tokenizer/template/license identity and resource plan.
- Gap: ISA must not create a second SafeTensors parser or conversion policy; it must consume CAP-DTH-ART-01's validated dense bundle/receipt, bind its exact CAP-DTH-ARCH-02 config and tokenizer/template hashes, and reject mismatches before serving allocation.
- Exact affected files: `rust/crates/llm-from-scratch/src/artifact/serving_import.rs`; `rust/crates/llm-from-scratch/src/artifact/manifest.rs`; `rust/crates/llm-from-scratch/src/serving/config.rs`; `rust/crates/llm-from-scratch/tests/serving_artifact_admission.rs`; `rust/crates/llm-local-server/tests/local_api.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Requires CAP-DTH-ART-01 as the sole owner of SafeTensors parsing/writing, tensor interchange/conversion, offset/dtype checks, and independent-runtime evidence; CAP-DTH-ARCH-02 owns semantic config, and CAP-ISA-ARCH-004 owns serving projection. ISA owns only receipt verification, identity/resource admission, and service construction from the already validated bundle.
- Conservative laptop/resource estimate: Estimate: selected dense artifact at most 2 GiB; mmap/stream path process peak no more than mapped artifact plus 1 GiB host overhead; independent tiny CI fixture below 100 MiB and 2 minutes.
- Falsifiable gates: Pass if 2 independently produced CAP-DTH-ART-01 receipt fixtures are accepted only when whole-file/tensor/config/tokenizer/template/license hashes and declared shapes/dtypes match exactly; the service reports those identical identities and reference logits remain within the DTH-frozen tolerance; one-bit receipt, tensor, config, tokenizer, template, source/license, name, shape, dtype, or size drift fails before model/KV allocation; a fixture rejected by CAP-DTH-ART-01 can never be reinterpreted or repaired by ISA; bytes read and peak RAM remain within the selected profile.
- Learner misconception risk: A service successfully opening a non-pickle tensor file does not independently prove interchange, authenticity, licensing, benign behavior, correct architecture, or numerical quality.
- Boundary: Serving admission of the smallest CAP-DTH-ART-01 dense bundle only; DTH owns SafeTensors implementation and conversion, while ISA makes no arbitrary framework, sharding, or universal-loader claim.

## CAP-ISA-ART-003 — Import one selected quantized GGUF subset and bind adapter lineage
- Classification: mandatory-laptop-implementation
- Domain: quantization
- Source evidence: SRC-ISA-008 supplies GGUF's typed/extensible/aligned container boundary, while its claim limit requires a commit-pinned subset; quantized arithmetic and accepted tolerance remain course decisions.
- Current repo evidence: There is no GGUF reader, external metadata/name mapping, dense-to-quantized lineage receipt, base-model fingerprint, or adapter sidecar; sibling CAP-DTH-QUANT-01 owns the missing quantizer, packed representation, dequantization/kernel, calibration, quality, and resource oracle.
- Gap: The required serving container import, commit-pinned metadata/name/offset mapping, selected GGUF subset, exact CAP-DTH-QUANT-01 representation identity, dense-to-quantized lineage, unsupported-type refusal, base/config/tokenizer/adapter binding, and adapter interchange are absent without requiring a second quantizer or dequantization algorithm.
- Exact affected files: `rust/crates/llm-from-scratch/src/artifact/gguf.rs`; `rust/crates/llm-from-scratch/src/artifact/manifest.rs`; `rust/crates/llm-from-scratch/src/artifact/adapter.rs`; `rust/crates/llm-from-scratch/tests/artifact_interchange.rs`; `Cargo.toml`; `Cargo.lock`.
- Dependencies: Requires CAP-DTH-QUANT-01 as the exclusive owner of quantization, packed layout, dequantization/kernel arithmetic, calibration, quality comparison, and memory/resource oracle; CAP-DTH-ART-01 supplies interchange-manifest policy, CAP-DTH-ARCH-02 supplies semantic config, and CAP-ISA-ARCH-004 supplies serving projection. A pinned GGUF binary parser/mmap library may provide syntax plumbing; ISA owns checked container metadata/offset/name mapping, subset admission, lineage, and adapter identity only.
- Conservative laptop/resource estimate: Estimate: mandatory path uses the same exact 20M..50M-parameter base as CAP-ISA-PT-001 and CAP-ISA-ENDPOINT-001, with quantized GGUF at most 128 MiB and measured total process peak below 6.25 GiB VRAM and 12 GiB host RAM; the optional 0.5..1.5B QLoRA path remains CAP-ISA-PT-004 only.
- Falsifiable gates: A small independently produced redistribution-safe GGUF fixture yields exact container version, metadata, tensor names/shapes/types, alignment, and offsets matching a hand/independent parser; its quantized payload/layout/hash must match an immutable passing CAP-DTH-QUANT-01 receipt and ISA never recalculates quantizer/dequant-kernel correctness; the mandatory selected base binds exact CAP-DTH-ARCH-02 config, tokenizer/template, dense canonical tensor, quantized derivative, and conversion hashes; unsupported version/family/type or any semantic/config/name/offset mismatch fails before allocation; wrong base/derivative hash prevents adapter load; adapter import/export preserves target names, ranks, alpha/scales, dtypes, and lineage exactly.
- Learner misconception risk: “4-bit” is not exactly 0.5 byte/parameter at runtime, does not preserve identical logits, and does not mean every 7B model fits an 8 GiB laptop.
- Boundary: One declared GGUF container/version/decoder/tokenizer/quantized-representation subset plus course adapter sidecar; CAP-DTH-QUANT-01 owns all quantization arithmetic and kernels, while arbitrary conversions, multimodal metadata, all GGML quant types, and sharded loading are excluded.

## CAP-ISA-ATT-001 — Preserve the single-session scalar KV-cache oracle
- Classification: reference-core-proven
- Domain: reference-core
- Source evidence: SRC-ISA-009, SRC-ISA-010, and SRC-ISA-013 explain why KV organization matters in modern decoders, but current executable comparisons rather than those papers prove this exact batch-one cache behavior.
- Current repo evidence: rust/crates/llm-from-scratch/src/attention/incremental.rs has fixed-capacity staged append/commit/reset, and generation/kv_cache.rs transactionally binds a complete layer stack to exact model/config/revisions and proves cached rows/logits/tokens/RNG against complete-prefix decoding; model-wide construction hard-codes batch size one.
- Gap: No GQA/windowed layout, ragged request slot, shared pool/page, request identity, scheduler integration, cancellation reclamation, or accelerator allocation evidence exists.
- Exact affected files: Preserve inline tests in `rust/crates/llm-from-scratch/src/attention/incremental.rs` and `rust/crates/llm-from-scratch/src/generation/kv_cache.rs`, plus `curriculum/chapters/37-incremental-attention.md`, `curriculum/chapters/38-cached-generation.md`, `site/src/content/chapters/en/37-incremental-attention.mdx`, `site/src/content/chapters/ru/37-incremental-attention.mdx`, `site/src/content/chapters/en/38-cached-generation.mdx`, and `site/src/content/chapters/ru/38-cached-generation.mdx`; add `rust/crates/llm-from-scratch/src/attention/page_pool.rs`, `rust/crates/llm-from-scratch/src/serving/cache_pool.rs`, and `rust/crates/llm-from-scratch/tests/modern_attention.rs`.
- Dependencies: None for the oracle; backend storage/copy primitives may be supporting plumbing only after device design.
- Conservative laptop/resource estimate: Estimate: existing tiny CPU tests below 1 GiB host RAM and 2 minutes; no imported model or GPU required.
- Falsifiable gates: Pass at least 100 fixed rows if existing row/logit/token/work-counter/reset/binding/failure-atomicity tests remain unchanged and every compatible MHA batch-one backend path differentially matches this oracle under predeclared numeric tolerance and identical discrete finish behavior.
- Learner misconception risk: KV caching avoids recomputing prior K/V but does not remove attention work, make memory free, or create independent concurrent sessions.
- Boundary: Proves only fixed-capacity scalar MHA batch-one cache semantics, not serving, paging, GQA, sliding windows, cancellation, or production performance.

## CAP-ISA-ATT-002 — Implement GQA and explicit sliding-window/context semantics
- Classification: mandatory-laptop-implementation
- Domain: architecture
- Source evidence: SRC-ISA-009 supports KV sharing, SRC-ISA-010 supports grouped KV heads, and SRC-ISA-012 supplies a concrete GQA plus sliding-window architecture; none selects this course model or context policy.
- Current repo evidence: Current attention and LayerKvCache assume equal query/KV head layout and full retained prefix through fixed max_positions; imported architecture metadata and absolute-position-versus-cache-slot semantics do not exist.
- Gap: Query-to-KV head mapping, KV-based cache sizing, retained-window mask, absolute RoPE positions, prompt-over-window behavior, context/position caps, and metadata validation are undefined.
- Exact affected files: `rust/crates/llm-from-scratch/src/attention/grouped_query.rs`; `rust/crates/llm-from-scratch/src/attention/sliding_window.rs`; `rust/crates/llm-from-scratch/src/attention/page_pool.rs`; `rust/crates/llm-from-scratch/src/models/config.rs`; `rust/crates/llm-from-scratch/src/models/decoder.rs`; `rust/crates/llm-from-scratch/src/checkpoint.rs`; `rust/crates/llm-from-scratch/src/artifact/manifest.rs`; `rust/crates/llm-from-scratch/tests/modern_attention.rs`.
- Dependencies: Prerequisites are CAP-DTH-ARCH-02 for the exclusive query/KV-head, width, context, and position-policy config axes and CAP-ISA-ARCH-004 for their artifact-bound serving projection; these point from GQA/window execution to already frozen config/admission policy. No concept-implementing attention library is allowed, while tensor/device primitives may provide storage and matmul only and ISA owns head mapping, masks, positions, eviction, serving validation, and KV byte accounting from that config.
- Conservative laptop/resource estimate: Estimate: tiny f64 proof below 1 GiB/2 minutes; illustrative 24-layer, 4-KV-head, width-64, 2,048-token, 4-request fp16 KV is 192 MiB before metadata.
- Falsifiable gates: Require query_heads modulo kv_heads equals zero before weights/cache allocation; duplicated-K/V GQA/MQA equals its constructed MHA oracle within 1e-12 f64; hand masks show no key outside the retained window while absolute positions continue; byte counters use kv_heads; prompts/positions/windows beyond declared limits fail before partial state.
- Learner misconception risk: GQA is not FlashAttention, and a sliding window does not provide unbounded positional validity or coherent recall of evicted content.
- Boundary: Implement only the selected model's head and position scheme; arbitrary RoPE scaling/extrapolation and every long-context method require separate evidence.

## CAP-ISA-ATT-003 — Teach exact online/tiled attention against the materialized oracle
- Classification: mandatory-laptop-implementation
- Domain: architecture
- Source evidence: SRC-ISA-011 establishes that IO-aware tiled attention can be mathematically exact without a full materialized matrix; paper speed/utilization and reduction order are outside its transferable claim.
- Current repo evidence: rust/crates/llm-from-scratch/src/attention/self_attention.rs materializes scores, log-softmax/probabilities, and value products for tiny contexts; no running-max/running-normalizer online recurrence or allocation proof exists.
- Gap: Course-owned online softmax, causal/window mask integration, tile invariance, all-masked/non-finite failure semantics, materialization counter, and accelerator-path evidence are absent.
- Exact affected files: `rust/crates/llm-from-scratch/src/attention/online.rs`; proposed `rust/crates/llm-from-scratch/src/tensor/online_attention_kernel.rs`; `rust/crates/llm-from-scratch/tests/modern_attention.rs`; `Cargo.toml`; `Cargo.lock`.
- Dependencies: Mature low-level GEMM/device/buffer primitives may be supporting libraries; a ready-made attention/softmax operator that hides running maximum, renormalization, masking, and accumulation is disallowed at the learner-facing call site.
- Conservative laptop/resource estimate: Estimate: CPU tests through sequence length 512 below 2 GiB/5 minutes; selected GPU smoke must remain below 6.5 GiB measured VRAM, with no speedup threshold until pre-run calibration.
- Falsifiable gates: Random, tied, extreme, causal, sliding, padded, and all-masked rows across several tile sizes match the materialized f64 oracle within a frozen tolerance; tile size never changes the legal discrete support; an allocation counter proves no sequence-by-sequence score matrix; non-finite/all-masked input fails atomically; GPU receipts detect hidden CPU fallback.
- Learner misconception risk: FlashAttention is not approximate attention, mathematical exactness does not promise bitwise-identical reductions, and a correct scalar tiled algorithm is not automatically a tuned GPU kernel.
- Boundary: Mandatory work proves the recurrence and bounded device path; a highly tuned FlashAttention-2-class kernel and long-context performance study are advanced and cannot inherit A100 results.

## CAP-ISA-ATT-004 — Allocate KV in a bounded request-aware block pool
- Classification: mandatory-laptop-implementation
- Domain: serving
- Source evidence: SRC-ISA-013 supports the fragmentation/duplication motivation for page-like KV blocks; its production throughput and full prefix-sharing design are outside this small allocator's claim.
- Current repo evidence: generation/kv_cache.rs allocates a fixed-capacity batch-one cache per model session; no global pool, logical-to-physical map, reservation, ownership/refcount, poison/erase, or resource counter exists.
- Gap: Dynamic bounded KV allocation, worst-case admission reservation, nonaliasing, reclamation, optional copy-on-write sharing, security reuse behavior, and fragmentation evidence are missing.
- Exact affected files: `rust/crates/llm-from-scratch/src/attention/page_pool.rs`; `rust/crates/llm-from-scratch/src/serving/cache_pool.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/tests/modern_attention.rs`; `rust/crates/llm-from-scratch/tests/serving_equivalence.rs`.
- Dependencies: Generic buffer allocation may use device plumbing; block geometry, logical mapping, reservation, ownership/refcount, poisoning/erasure, accounting, and reclamation are course-owned.
- Conservative laptop/resource estimate: Estimate: deterministic oracle pool 64 blocks × 16 token slots below 512 MiB; selected service pool sized from measured bytes/block so whole process remains below 6.5 GiB GPU and 12 GiB host RAM.
- Falsifiable gates: Pass 1,000 random allocate/append/share-if-enabled/free/cancel schedules if free + uniquely_owned + shared_physical = total physical blocks, predecessor poison/bytes remain unobserved, exhaustion has zero partial reservation, copy-on-write is preserved, and all blocks return within one scheduler iteration after every terminal path; measured pool plus metadata equals declared bound.
- Learner misconception risk: Paging reduces fragmentation and enables noncontiguous growth; it does not reduce mathematical KV bytes per retained token or make memory infinite.
- Boundary: No remote/distributed KV, production prefix-cache eviction, cross-tenant sharing, or speculative-decoding cache graph is required.

## CAP-ISA-ATT-005 — Compare partial RoPE and explicit frequency/context scaling
- Classification: laptop-feasible-advanced-exercise
- Domain: architecture
- Source evidence: SRC-ISA-048 supports the pairwise RoPE frequency/position mechanism, SRC-ISA-049 supports a concrete 25-percent partial-rotation layout, and SRC-ISA-050 and SRC-ISA-051 support explicit trained-context extension methods; their claim limits forbid inferring long-context quality from a larger table or paper result.
- Current repo evidence: `rust/crates/llm-from-scratch/src/attention/rope.rs` applies a configurable positive base to every even feature pair, precomputes exactly max_positions rows, and rejects positions beyond that capacity; `attention/multi_head.rs` rotates the full per-head width, while Chapter 29 defers partial rotation, frequency scaling, and context extension.
- Gap: Imported partial rotary dimensions, an exact base/frequency-scaling method identifier, original trained length, separately admitted length, interpolation/extrapolation policy, long-context validation, and request refusal at the validated boundary are undefined.
- Exact affected files: `rust/crates/llm-from-scratch/src/attention/rope.rs`; `rust/crates/llm-from-scratch/src/attention/rope_scaling.rs`; `rust/crates/llm-from-scratch/src/attention/multi_head.rs`; `rust/crates/llm-from-scratch/src/artifact/manifest.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/tests/modern_attention.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Prerequisites are CAP-DTH-ARCH-02 for rotary/context config axes, CAP-ISA-ARCH-004 for serving projection, CAP-ISA-ATT-002 for absolute-position/window semantics, CAP-ISA-ART-002 and CAP-ISA-ART-003 for configuration identity, CAP-ISA-SRV-007 for KV admission, and CAP-DTH-EVAL-02 for predeclared evaluation; every edge points from this optional comparison to an already established input, and tensor libraries may not hide the taught rotation/scaling transformation.
- Conservative laptop/resource estimate: Estimate: exact CPU fixtures for head widths 8..128 and positions through 8,192 below 1 GiB host RAM/5 minutes; an optional selected-model exercise admits at most 2 times its declared trained length and must still remain below 6.5 GiB VRAM, 12 GiB host RAM, 512 output tokens, and 2 hours of frozen evaluation.
- Falsifiable gates: Pass at least 20 hand fixtures if rotary_width is even and at most head_width, zero/unrotated suffix dimensions remain bit-identical, and full-width/no-scaling exactly matches the current oracle; base and per-pair inverse frequencies plus partial/interpolated angles match an independent f64 formula within 1e-12; manifest binds rotary width, base, scaling method/version/factor, trained_context_tokens, and validated_context_tokens; default admitted length is at most trained length; any extension requires predeclared short- and long-context CAP-DTH-EVAL-02 cases and admits at most the validated length; one token over that or over the resource fit fails before KV allocation.
- Learner misconception risk: Allocating a longer sine/cosine table, increasing the RoPE base, or rotating fewer dimensions does not itself extend learned context, preserve short-context quality, or make evicted information available.
- Boundary: Optional exact comparison for the selected architecture and at most one pinned extension method; arbitrary base tuning, unvalidated extrapolation, advertised 32k/128k transfer, and broad long-context usefulness are excluded.

## CAP-ISA-SRV-001 — Prove serial-versus-batched semantic equivalence
- Classification: mandatory-laptop-implementation
- Domain: serving
- Source evidence: SRC-ISA-014 motivates per-iteration mixed-request execution, but it does not establish equivalence for this model, padding/mask scheme, RNG layout, or finish contract.
- Current repo evidence: generation/sampling.rs and generation/kv_cache.rs prove only one serial sequence; no ragged request batch, slot mapping, per-row mask/position, or serial differential harness exists.
- Gap: Batching could silently change positions, masks, logits, random draws, stop precedence, cache contents, or completion timing without any present test detecting it.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; proposed `rust/crates/llm-from-scratch/src/serving/batch.rs`; `rust/crates/llm-from-scratch/src/attention/page_pool.rs`; proposed `rust/crates/llm-from-scratch/src/tensor/backend.rs`; `rust/crates/llm-from-scratch/tests/serving_equivalence.rs`.
- Dependencies: Tensor/device batch storage may use supporting primitives; request-to-row mapping, masks, positions, RNG decisions, terminal semantics, and differential comparison remain course-owned.
- Conservative laptop/resource estimate: Estimate: 100 deterministic schedules of 2..8 tiny requests below 2 GiB host RAM and 5 minutes CPU; selected accelerator smoke batch at most 4 and whole-process peak below 6.5 GiB VRAM.
- Falsifiable gates: For fixed requests/seeds, serial execution and every tested padded/packed/ragged batch/interleaving produce identical token bytes, per-step legal support, finish reason, terminal error, and per-request final RNG/cache length; f64 logits match within 1e-12 and selected accelerator logits within a frozen tolerance; empty, early-EOS, max-length, stop-string, and context-limit rows are covered.
- Learner misconception risk: “Same tensor shapes” does not prove the same sequences; padding masks, positions, RNG draw order, and early row removal are semantic state.
- Boundary: Equivalence is per selected backend/tolerance and request contract, not a claim that all batching layouts or floating-point devices are bitwise identical.

## CAP-ISA-SRV-002 — Admit, step, and complete requests continuously
- Classification: mandatory-laptop-implementation
- Domain: serving
- Source evidence: SRC-ISA-014 supports iteration-level admission/completion and SRC-ISA-013 supports dynamic request state; paper throughput and distributed scheduler details are excluded.
- Current repo evidence: DecoderKvCache represents one mutable session and cached generation runs a request to completion; there is no queued/admitted/prefill/decode/terminal state machine or scheduler boundary.
- Gap: New request admission between iterations, heterogeneous lengths, immediate removal of finished rows, slot compaction/remapping, exactly-once terminal delivery, and scheduler invariants are absent.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/mod.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; `rust/crates/llm-from-scratch/src/serving/cache_pool.rs`; `rust/crates/llm-from-scratch/tests/serving_equivalence.rs`; `rust/crates/llm-local-server/src/http.rs`.
- Dependencies: A bounded async channel/runtime may provide wakeup plumbing; the lifecycle, admission, row selection, completion, state transition, and fairness policy remain course-owned.
- Conservative laptop/resource estimate: Estimate: provisional queue 32, active batch 4, one decode token per active request per iteration, tiny scheduler simulation below 1 GiB/2 minutes; resource contract may choose smaller caps.
- Falsifiable gates: Deterministic clock tests inject short/long requests at iteration boundaries; newcomers enter without waiting for the oldest request's full completion; a row exits in the same iteration it reaches a terminal state; every accepted ID emits exactly one terminal record; slot compaction preserves CAP-ISA-SRV-001; queue/active/block counts return to zero.
- Learner misconception risk: Continuous batching is not “run several complete prompts in one static batch”; membership can change every scheduling iteration.
- Boundary: One-process, one-device, one-model scheduler; multi-node coordination, service-level fairness guarantees, and throughput claims require separate evidence.

## CAP-ISA-SRV-003 — Isolate request RNG, cache, decoder state, and observation
- Classification: mandatory-laptop-implementation
- Domain: serving
- Source evidence: SRC-ISA-013 and SRC-ISA-014 show independent dynamic sequences in one engine, but neither paper proves this implementation's security/noninterference; the exact isolation property is a course engineering contract.
- Current repo evidence: One SplitMix64 state and one DecoderKvCache are passed through a single generation path; there is no request-ID-owned RNG, cache mapping, stop state, logprob buffer, adapter binding, or isolation test.
- Gap: Interleaving-dependent RNG, cache cross-read/reuse, mutable-logit leakage, stop-state leakage, request-ID collision, adapter mismatch, and debug-observer interference could all occur silently.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; `rust/crates/llm-from-scratch/src/serving/cache_pool.rs`; `rust/crates/llm-from-scratch/src/generation/decoding.rs`; `rust/crates/llm-from-scratch/src/generation/stopping.rs`; `rust/crates/llm-from-scratch/tests/serving_equivalence.rs`.
- Dependencies: Cryptographic request-ID generation may use a mature OS RNG if external IDs are needed; generation RNG semantics and all state ownership/noninterference checks remain course-owned.
- Conservative laptop/resource estimate: Estimate: 1,000 randomized two-to-eight-request interleavings with poisoned blocks below 2 GiB/5 minutes CPU; no large model required.
- Falsifiable gates: Pass 1,000 randomized interleavings if each request owns seed/RNG, KV mapping, positions, counts, stops, output, adapter, and metrics accumulator; changing seed/prompt/stops/logprob observation or cancelling one request cannot alter any control request token/evidence/final RNG; reused blocks are poisoned and never observed; duplicate active IDs and wrong adapter/base hashes fail before allocation.
- Learner misconception risk: A global seeded RNG is deterministic yet still wrong for isolation because scheduling order changes which request receives each draw.
- Boundary: Proves deterministic in-process state separation for one user; it is not an OS sandbox, adversarial multi-tenant confidentiality proof, or side-channel elimination.

## CAP-ISA-SRV-004 — Cancel at every phase and reclaim within a bounded iteration
- Classification: mandatory-laptop-implementation
- Domain: serving
- Source evidence: SRC-ISA-005 and SRC-ISA-006 supply transport/disconnection semantics only; cancellation latency, cooperative safe points, and resource reclamation are explicit course-owned policies.
- Current repo evidence: Serial generation has no cancellation token, queued request, blocked stream, request-owned page set, or terminal cancellation reason.
- Gap: Queue removal, prefill/decode safe points, blocked-consumer cancellation, no-post-cancel event guarantee, exactly-once terminal record, KV/output/RNG reclamation, and unaffected-peer proof are absent.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; `rust/crates/llm-from-scratch/src/serving/cache_pool.rs`; `rust/crates/llm-local-server/src/http.rs`; `rust/crates/llm-local-server/src/sse.rs`; `rust/crates/llm-from-scratch/tests/serving_equivalence.rs`; `rust/crates/llm-local-server/tests/local_api.rs`.
- Dependencies: Async cancellation/wakeup primitives may be supporting plumbing; phase checks, terminal transition, cleanup ordering, and observable contract remain course-owned.
- Conservative laptop/resource estimate: Estimate: cancellation acknowledged within one scheduler iteration and 100 milliseconds in loopback integration under an unloaded tiny fixture; tests below 1 GiB/2 minutes.
- Falsifiable gates: Cancel queued, partially prefetched, decoding, stop-holdback, and full-output-channel requests; by the next scheduler iteration they own zero active rows/pages/output capacity and consume no further RNG/model step; no subsequent token event occurs; exactly one cancelled terminal record is retained; concurrent controls remain CAP-ISA-SRV-001 and CAP-ISA-SRV-003 equivalent.
- Learner misconception risk: Dropping an HTTP socket does not necessarily stop compute or free KV, and freeing buffers before the device operation completes can corrupt another request.
- Boundary: Cooperative in-process cancellation at explicit safe points; preempting an uninterruptible device kernel or distributed cancellation is outside scope.

## CAP-ISA-SRV-005 — Bound queues, phase timeouts, output buffers, and backpressure
- Classification: mandatory-laptop-implementation
- Domain: serving
- Source evidence: SRC-ISA-005 constrains event delivery and SRC-ISA-006 provides HTTP overload/timeout vocabulary; neither source chooses queue length, deadline phases, slow-consumer policy, or memory caps.
- Current repo evidence: No service, async tasks, request queue, channel, deadline, retry response, or bounded response buffer exists in Cargo.toml or rust/.
- Gap: Unbounded body/context/output intake, queue growth, detached task growth, slow-client memory growth, ambiguous timeout origin, overload response, and backpressure cancellation are unimplemented.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; `rust/crates/llm-local-server/src/main.rs`; `rust/crates/llm-local-server/src/http.rs`; `rust/crates/llm-local-server/src/sse.rs`; proposed `rust/crates/llm-local-server/config/default.toml`; `rust/crates/llm-local-server/tests/local_api.rs`.
- Dependencies: A mature HTTP/async runtime and bounded-channel implementation are allowed plumbing; all configured limits, deadline clock, admission response, slow-consumer action, cleanup, and retry metadata remain course-owned.
- Conservative laptop/resource estimate: Estimate: provisional caps 64 KiB JSON body, 2,048 input tokens, 512 output tokens, 32 queued, 4 active, 8 pending SSE events/request, 5-second queue deadline, and profile-measured execution deadline; exact values must be frozen by the resource contract.
- Falsifiable gates: Pass at least 5 one-over-limit body/tokens/queue/channel/deadline fixtures if they fail with typed status and no request-specific model/KV allocation; overload returns a frozen HTTP status plus bounded Retry-After policy; slow reader cannot grow memory/tasks beyond declared caps and is cancelled/reclaimed; fake-clock queue, prefill, decode, and stream timeouts produce distinct metrics/reasons; zero orphan tasks/pages remain.
- Learner misconception risk: Async I/O is not backpressure; without bounded queues/channels, a local service can exhaust memory even when model batch size is capped.
- Boundary: Local one-user overload semantics, not an internet-facing SLA, admission-control protocol, retry guarantee, or defense against hostile networks.

## CAP-ISA-SRV-006 — Expose a loopback-only versioned HTTP and SSE service
- Classification: mandatory-laptop-implementation
- Domain: serving
- Source evidence: SRC-ISA-005 defines SSE framing, SRC-ISA-006 defines HTTP semantics, and SRC-ISA-018 provides useful generation vocabulary; none defines this API schema or confers production security.
- Current repo evidence: Workspace Cargo manifests have no HTTP server crate and static course pages do not require a local runtime; there are no health, generation, stream, cancellation, or metrics endpoints.
- Gap: Learner-runnable local serving, versioned request/response schema, request IDs, exact semantic-config/artifact identity, configured-cap reporting, typed errors, health/readiness distinction, loopback default, complete stream events, and static-site independence are absent.
- Exact affected files: `rust/crates/llm-local-server/Cargo.toml`; `rust/crates/llm-local-server/src/main.rs`; `rust/crates/llm-local-server/src/http.rs`; `rust/crates/llm-local-server/src/sse.rs`; `rust/crates/llm-local-server/tests/local_api.rs`; `Cargo.toml`; `Cargo.lock`; `README.md`; `curriculum/functional-laptop-llm-extension-plan.md`; `site/tests/deployment.test.ts`; `site/tests/firefox-only-browser-policy.test.ts`.
- Dependencies: Requires CAP-DTH-ARCH-02 and CAP-ISA-ARCH-004; mature narrowly scoped HTTP/async/JSON/SSE libraries are allowed and must be pinned with minimal features, while config/artifact identity, model execution, runtime limits, scheduler, decoding, state, and error policy remain course-owned.
- Conservative laptop/resource estimate: Estimate: default bind 127.0.0.1 on one documented port, startup below 15 seconds after local artifact availability, idle host overhead below 256 MiB beyond model/runtime, and no internet/cloud dependency.
- Falsifiable gates: POST /v1/generate, POST /v1/generate/stream, DELETE or explicit cancel by request ID, GET /healthz, GET /readyz, and GET /metrics obey a frozen schema; readiness and generation receipts expose exact config/base/tokenizer/template/adapter hashes plus runtime configured context/batch/input/output/total-token/KV/page caps; defaults bind loopback only; nonloopback requires an explicit unsafe development flag and warning; SSE events are complete and ordered; malformed/unknown fields and config/artifact mismatches fail; a production static build and Firefox content tests pass with the service stopped.
- Learner misconception risk: “Localhost” does not make inputs safe or constitute authentication, and API-shape similarity does not imply complete compatibility with a commercial service.
- Boundary: Single-user educational loopback service with no TLS, accounts, remote authorization, internet exposure, or production hardening claim.

## CAP-ISA-SRV-007 — Refuse requests from a checked resource budget before allocation
- Classification: mandatory-laptop-implementation
- Domain: resource-envelope
- Source evidence: SRC-ISA-009, SRC-ISA-010, and SRC-ISA-013 support the KV-memory components and dynamic allocation problem; exact model/workspace/output/fragmentation budgeting is an engineering estimate that must be measured locally.
- Current repo evidence: Fixed tiny tensors allocate directly and generation checks context length, but there is no device/host memory profile, model residency budget, request worst-case calculation, preallocation admission, or hidden-fallback detection.
- Gap: Startup model-fit check, runtime-config-derived per-request worst-case KV/workspace/output estimate, integer-overflow checks, fragmentation margin, concurrent reservation, release, and typed refusal reason are absent; fixed constants could silently disagree with CAP-DTH-ARCH-02.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; `rust/crates/llm-from-scratch/src/serving/cache_pool.rs`; `rust/crates/llm-from-scratch/src/serving/metrics.rs`; `rust/crates/llm-local-server/src/main.rs`; `rust/crates/llm-local-server/tests/local_api.rs`; proposed `audits/2026-08-10-functional-llm-capability/schemas/resource-profile.schema.json`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Requires CAP-DTH-ARCH-02 and CAP-ISA-ARCH-004; device/OS memory queries may use mature low-level libraries, while serving sizing formulas, checked arithmetic, configured caps, safety margin, reservation state, refusal, and no-fallback invariant remain course-owned.
- Conservative laptop/resource estimate: Estimate: total measured course peak ceiling 6.5 GiB VRAM, 12 GiB process host RAM, 20 GiB disk; reserve model + backend workspace + KV + output/logprob buffers + allocator metadata + at least 10 percent measured fragmentation margin, with exact profile replacing these provisional numbers.
- Falsifiable gates: Pass exact-boundary cases for all 4 CAP-DTH-ARCH-02 fixtures if checked arithmetic derives model-residency input plus workspace, configured context/batch/input/output/total-token/KV/page capacities, and rejects overflow; exact-at-limit admits only for an executable profile and one-byte/one-token/one-slot-over refuses before request-specific allocation or RNG movement; the production-shaped profile plans then refuses with zero model/KV allocation; concurrent reservations never exceed the selected profile; every terminal path releases reservation; allocator failure yields typed error without CPU/smaller-model/precision/context fallback; receipts record config hash plus predicted/measured peaks and fail if measured exceeds profile.
- Learner misconception risk: Physical 8 GiB VRAM is not an 8 GiB model budget, and an advertised context length says nothing about safe concurrent KV/workspace allocation.
- Boundary: Conservative selected-profile admission, not optimal packing, dynamic GPU tenancy, OS-wide memory guarantees, or a promise on unspecified laptops.

## CAP-ISA-SRV-008 — Compare chunked prefill and token-cost-aware fairness
- Classification: laptop-feasible-advanced-exercise
- Domain: serving
- Source evidence: SRC-ISA-015 supports chunked prefill tradeoffs and SRC-ISA-016 supports token-cost-aware fairness; both claim limits prohibit importing published A100 latency/throughput as laptop acceptance.
- Current repo evidence: Cached generation prefills one serial token at a time before decode; there is no competing workload, chunk boundary, service/deficit accounting, starvation measure, or tail-latency receipt.
- Gap: Long-prefill interference, configurable chunks, decode-priority tradeoff, token-cost fairness, starvation prevention, and before/after measured evidence are absent.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; `rust/crates/llm-from-scratch/src/serving/metrics.rs`; `rust/crates/llm-from-scratch/tests/serving_equivalence.rs`; `rust/crates/llm-local-server/tests/local_api.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Deterministic clock/histogram plumbing may be supporting; chunk scheduling, service accounting, fairness invariant, and measurement workload remain course-owned.
- Conservative laptop/resource estimate: Estimate: chunks of at most 64 prompt tokens, synthetic mix of 1..2,048-token prompts and 1..128 outputs, below 6.5 GiB VRAM/12 GiB host and 2 hours including selected-model measurement.
- Falsifiable gates: Pass if chunked and unchunked modes are CAP-ISA-SRV-001 output-equivalent; decode-ready requests are reconsidered between chunks; deterministic service-deficit tests bound starvation by a predeclared number of scheduler iterations; fixed workload reports p50/p95/p99 queue, TTFT, intertoken, and throughput with raw receipts, and any performance threshold is frozen before the measured run.
- Learner misconception risk: Chunked prefill is not universally faster; it trades batch efficiency, queueing, and tail latency and can harm throughput with a poor chunk size.
- Boundary: Educational one-device comparison only; production multi-tenant fairness, priority classes, preemption, and SLA enforcement are bounded-scale work.

## CAP-ISA-SRV-009 — Reuse and evict exact prefixes within a bounded cache
- Classification: mandatory-laptop-implementation
- Domain: serving
- Source evidence: SRC-ISA-013 supports block-based KV sharing, copy-on-write, and dynamic reclamation; its production throughput and cache policy are excluded, so exact keying, bounded admission, and eviction remain course contracts.
- Current repo evidence: `rust/crates/llm-from-scratch/src/generation/kv_cache.rs` owns one private batch-one prefix and CAP-ISA-ATT-004 supplies only the proposed request-aware block pool; no reusable-prefix identity, eligibility rule, reference ownership, collision check, capacity-bound eviction, or isolation evidence exists.
- Gap: The accepted bounded endpoint requires exact prefix reuse and deterministic eviction rather than merely a page allocator; without explicit identity and reclamation, reuse can cross model/tokenizer/adapter/template boundaries or retain memory indefinitely.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/prefix_cache.rs`; `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; `rust/crates/llm-from-scratch/src/serving/cache_pool.rs`; `rust/crates/llm-from-scratch/tests/serving_equivalence.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Requires CAP-ISA-ATT-004, CAP-ISA-SRV-001, CAP-ISA-SRV-003, CAP-ISA-SRV-004, CAP-ISA-SRV-007, and CAP-ISA-PT-002; a hash/LRU container may be plumbing, while canonical prefix identity, eligibility, full-identity collision check, reference ownership/copy-on-write, eviction, erasure, and accounting remain course-owned.
- Conservative laptop/resource estimate: Estimate: cache at most 64 blocks and at most 256 MiB within the shared 6.5 GiB VRAM/12 GiB host profile; 1,000 deterministic reuse/eviction/cancel traces below 2 GiB host RAM and 10 minutes, plus a selected-model smoke below 30 minutes.
- Falsifiable gates: Pass at least 1,000 hit/miss/hash-collision/share/append/cancel/eviction traces if keys bind exact model/tokenizer/config/adapter/chat-template/token IDs/positions and full identity is compared after a hash hit; shared blocks are read-only/refcounted and appending performs copy-on-write; cancellation cannot free a live share; deterministic LRU or the frozen policy returns the cache to at most 64 blocks and 256 MiB; poison proves zero predecessor/cross-request bytes; reused and cold execution match CAP-ISA-SRV-001 tokens/logits/finish/RNG within frozen tolerances; every terminal path and model/adapter unload reclaims eligible references; one-block-over admission evicts or refuses before allocation without exceeding the global resource reservation.
- Learner misconception risk: Prefix sharing is not semantic similarity, eviction does not shorten live request state, and a cache hit does not prove useful output or a latency win.
- Boundary: Mandatory single-user bounded exact-prefix reuse and deterministic eviction only; approximate matching, cross-tenant or remote KV caches, distributed eviction, persistence across process restart, and promised speedup are excluded.

## CAP-ISA-SRV-010 — Compare serial and parallel prefill without changing request semantics
- Classification: laptop-feasible-advanced-exercise
- Domain: serving
- Source evidence: SRC-ISA-014 supports iteration-level mixed-request execution and SRC-ISA-015 supports prefill/decode scheduling tradeoffs; neither establishes a laptop speedup, a parallel row layout, or equivalence for this implementation.
- Current repo evidence: Cached generation prefills one request serially; CAP-ISA-SRV-008 proposes chunking and CAP-ISA-SRV-009 owns prefix reuse, but neither proves simultaneous prefill rows, ragged masking/positions, row-to-request ownership, cancellation, or peak-resource behavior.
- Gap: Parallel prefill could reduce elapsed work on a selected backend, but it can also change masks/positions, starve decode, inflate peak memory, or corrupt request mapping; it needs an explicit optional differential exercise.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; proposed `rust/crates/llm-from-scratch/src/serving/batch.rs`; `rust/crates/llm-from-scratch/tests/serving_equivalence.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Direct prerequisites are CAP-ISA-SRV-001, CAP-ISA-SRV-003, CAP-ISA-SRV-004, and CAP-ISA-SRV-007; each supplies frozen equivalence, isolation, cancellation, or admission behavior before the optional parallel-prefill comparison. Low-level batched tensor primitives may be plumbing, while row packing, masks, positions, request mapping, scheduling, and accounting remain course-owned.
- Conservative laptop/resource estimate: Estimate: at most 4 simultaneous prompts × 512 tokens, below 6.5 GiB VRAM and 12 GiB host RAM; deterministic fixtures below 2 GiB/10 minutes and one frozen selected-model workload below 2 hours.
- Falsifiable gates: Pass at least 100 ragged/interleaved/cancel fixtures if serial and parallel-prefill logits, token bytes, cache rows, finish reasons, request RNG states, and prefix-cache identities match CAP-ISA-SRV-001 within frozen tolerances; padding is never attended, rows never cross requests, cancellation reclaims within 1 scheduler iteration, decode-ready work is reconsidered at each frozen boundary, and measured peak stays at most 6.5 GiB VRAM/12 GiB host; record TTFT, p95/p99 latency, throughput, and peak bytes before any benefit claim.
- Learner misconception risk: Parallel prefill is neither prefix caching nor automatically faster; additional batching can raise memory and tail latency even when outputs remain equivalent.
- Boundary: Optional one-device comparison on the selected backend; production parallelism, multi-device prefill, cross-tenant scheduling, and any guaranteed speedup remain outside the mandatory endpoint.

## CAP-ISA-OBS-001 — Measure latency, throughput, queue, KV, failures, and resources without content leakage
- Classification: mandatory-laptop-implementation
- Domain: observability
- Source evidence: SRC-ISA-017 supports metric types/exposition and SRC-ISA-018 supplies GenAI setting/finish/usage/time-to-first-chunk vocabulary plus explicit sensitivity of prompts, outputs, retrieval, and tool data.
- Current repo evidence: Current demos print frozen teaching reports and some work counters, but there is no service clock, histogram, queue/active/KV gauge, finish/error counter, process/device peak record, cardinality policy, or scrape endpoint.
- Gap: Units and timestamp boundaries, TTFT/queue/prefill/decode/intertoken/end-to-end measurements, tokens/second, resource high-water marks, finish/reject/cancel/timeout reasons, and privacy-safe labels are absent.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/metrics.rs`; `rust/crates/llm-local-server/src/http.rs`; `rust/crates/llm-local-server/src/main.rs`; `rust/crates/llm-local-server/tests/local_api.rs`; `rust/crates/llm-from-scratch/tests/serving_equivalence.rs`; proposed `audits/2026-08-10-functional-llm-capability/schemas/serving-receipt.schema.json`.
- Dependencies: A pinned metrics encoder and OS/device resource query library may be plumbing; metric definitions, timestamps, buckets, label allowlist, content prohibition, and peak reconciliation remain course-owned.
- Conservative laptop/resource estimate: Estimate: metrics state below 16 MiB, fixed histogram buckets, no request-ID/prompt/token/model-path labels, scrape payload below 1 MiB, and less than 5 percent latency overhead on a predeclared tiny workload.
- Falsifiable gates: Pass at least 10 fake-clock traces if they assert exact queue, prefill, first-complete-SSE-event TTFT, decode/intertoken, and terminal timestamps in documented units; counters/gauges reconcile accepted = active + terminal and KV used + free = total; rejection/cancel/timeout/error/finish reasons are exhaustive; process/GPU peaks appear in receipts; secret canaries in prompt/output/tool/retrieval never occur in metric names, labels, logs, or default traces.
- Learner misconception risk: Average tokens/second hides tail latency and queueing, and attaching prompts/request IDs as labels creates privacy and cardinality failures.
- Boundary: Local diagnostic observability and deterministic receipts, not a production telemetry backend, distributed trace guarantee, or authorization/audit-log system.

## CAP-ISA-PT-001 — Perform response-masked SFT with trainable LoRA parameters
- Classification: mandatory-laptop-implementation
- Domain: post-training
- Source evidence: SRC-ISA-019 supports frozen-base low-rank updates, while its paper-scale memory/quality results do not establish this recipe; actual response-masked SFT behavior is a course contract.
- Current repo evidence: training modules implement dense reference backpropagation, AdamW, selection, and partial checkpoints, but repository-wide search finds no instruction record, chat boundary, response-only mask, low-rank parameter, frozen-base invariant, or adapter update.
- Gap: Actual post-training—not evaluation-only—is absent: no SFT data contract, versioned chat-template/control-token renderer, exact prompt/response boundary map, response-token loss mask, LoRA forward/backward/update, base freeze, adapter optimizer state, multi-seed receipt, or held-out task evidence exists.
- Exact affected files: `rust/crates/llm-from-scratch/src/training/sft.rs`; `rust/crates/llm-from-scratch/src/training/lora.rs`; `rust/crates/llm-from-scratch/src/training/trainer.rs`; proposed `rust/crates/llm-from-scratch/src/training/job_checkpoint.rs`; `rust/crates/llm-from-scratch/src/artifact/chat_template.rs`; `rust/crates/llm-from-scratch/src/artifact/adapter.rs`; `rust/crates/llm-from-scratch/tests/post_training.rs`; proposed `site/src/content/chapters/en/functional-laptop-sft-lora.mdx`; proposed `site/src/content/chapters/ru/functional-laptop-sft-lora.mdx`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Direct prerequisites are CAP-DTH-DATA-01, CAP-DTH-DATA-02, CAP-DTH-DATA-03, CAP-DTH-DATA-04, CAP-DTH-TOK-02, CAP-DTH-BATCH-02, CAP-DTH-ARCH-02, CAP-DTH-BACKEND-01, CAP-DTH-MEM-01, CAP-DTH-OPT-01, CAP-DTH-RESUME-01, CAP-DTH-EVAL-02, CAP-DTH-ART-01, CAP-DTH-HW-01, CAP-ISA-ARCH-004, and CAP-ISA-ART-002; these frozen data/config/backend/memory/optimizer/resume/evaluation/artifact inputs precede SFT/LoRA. Standard record parsing and low-level device matmul/autodiff may be plumbing; instruction assembly/masking, LoRA equation, gradients, frozen-base check, optimizer selection, and evaluation remain course-owned.
- Conservative laptop/resource estimate: Estimate: exact CPU fixture below 2 GiB/10 minutes; mandatory path uses the same exact 20M..50M base as CAP-ISA-ART-003 and CAP-ISA-ENDPOINT-001, rank 4..16 adapters, context at most 512, microbatch 1, predeclared 250..1,000 optimizer steps, below 6.25 GiB VRAM/12 GiB host/4 GiB disk and 2..6 hours.
- Falsifiable gates: Pass at least 20 template fixtures if a versioned canonical chat-template artifact deterministically renders exact system/user/assistant control-token IDs and byte/token boundary maps; labels and loss mask are zero on system/user/control/padding tokens and one exactly on assistant-response target tokens, including empty/multi-turn/Unicode cases; implement y = Wx + (alpha/r)BAx for declared targets; finite-difference checks cover A/B; after an actual optimizer step at least one adapter bit changes while every frozen base bit remains identical; fixed train/held-out fixtures and at least 3 predeclared seeds report loss/task metrics; an evaluation-only, ambiguous-boundary, or zero-update run fails acceptance.
- Learner misconception risk: LoRA is still training and still needs activation/optimizer memory; few trainable parameters do not guarantee little total memory, useful instruction following, or preserved safety.
- Boundary: Bounded SFT/LoRA mechanics and one narrow selected task, not broad instruction tuning, general chat quality, dataset acquisition/governance, or large-model claims.

## CAP-ISA-PT-002 — Bind, merge, unmerge, and isolate adapter artifacts
- Classification: mandatory-laptop-implementation
- Domain: artifacts
- Source evidence: SRC-ISA-019 supports low-rank updates to selected base transformations; SRC-ISA-007 and SRC-ISA-008 show why tensor containers and model metadata must be complemented by an explicit base/target lineage manifest.
- Current repo evidence: checkpoint.rs binds course model state but has no independently loadable adapter schema, base SHA-256, target tensor map, rank/alpha metadata, merge operation, or request adapter binding.
- Gap: Adapter provenance, safe shape/name validation, optimizer versus inference artifact separation, merge/unmerge equivalence, quantized-base restrictions, mixed-adapter request isolation, and unsupported-target refusal are absent.
- Exact affected files: `rust/crates/llm-from-scratch/src/artifact/adapter.rs`; `rust/crates/llm-from-scratch/src/artifact/manifest.rs`; `rust/crates/llm-from-scratch/src/training/lora.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/tests/artifact_interchange.rs`; `rust/crates/llm-from-scratch/tests/post_training.rs`.
- Dependencies: Direct prerequisites are CAP-DTH-ARCH-02, CAP-DTH-ART-01, CAP-ISA-ARCH-004, CAP-ISA-ART-002, CAP-ISA-ART-003, and CAP-ISA-PT-001; the validated base/config representations and actual trained adapter precede inference-artifact binding. Standard tensor/JSON serialization may be plumbing; base fingerprint, target allowlist, rank/shape/scale invariants, merge math, mutability, and request ownership remain course-owned.
- Conservative laptop/resource estimate: Estimate: rank-8 adapters for selected targets below 256 MiB on the selected small model, load/validation under 5 seconds after base residency, and mixed-adapter batch no more than 4 active requests within the 6.5 GiB profile.
- Falsifiable gates: Manifest records schema version, base SHA-256, exact target names/shapes, rank, alpha, dtype, tokenizer/config hash, and training lineage; wrong hash/name/shape/dtype fails before mutation; unmerged and fp32-merged logits match within 1e-6 on fixed inputs and unmerge restores base bits exactly; quantized merge is refused unless a separately specified safe path exists; changing one request's adapter cannot affect controls.
- Learner misconception risk: An adapter is not a standalone model and matching layer names are not proof that the base weights/tokenizer/config are the intended revision.
- Boundary: Course sidecar for the selected architecture and declared targets; arbitrary PEFT formats, composition arithmetic, hot-swapping across incompatible bases, and production adapter caching are excluded.

## CAP-ISA-PT-003 — Execute direct preference optimization on real chosen/rejected pairs
- Classification: mandatory-laptop-implementation
- Domain: post-training
- Source evidence: SRC-ISA-021 supports the DPO classification-style objective without a reward model/PPO loop; its broad alignment and benchmark outcomes cannot be inferred from a tiny course run.
- Current repo evidence: The trainer supports supervised next-token loss only; no paired preference record, response-only sequence logprob, frozen reference policy, beta parameter, DPO loss/gradient, adapter update, or preference metric exists.
- Gap: Actual preference training is absent and could be misrepresented by scoring pairs without updating parameters.
- Exact affected files: `rust/crates/llm-from-scratch/src/training/dpo.rs`; `rust/crates/llm-from-scratch/src/training/lora.rs`; `rust/crates/llm-from-scratch/src/artifact/adapter.rs`; `rust/crates/llm-from-scratch/tests/post_training.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Direct prerequisites are CAP-DTH-DATA-01, CAP-DTH-DATA-02, CAP-DTH-DATA-03, CAP-DTH-DATA-04, CAP-DTH-TOK-02, CAP-DTH-BATCH-02, CAP-DTH-ARCH-02, CAP-DTH-BACKEND-01, CAP-DTH-MEM-01, CAP-DTH-OPT-01, CAP-DTH-RESUME-01, CAP-DTH-EVAL-02, CAP-DTH-ART-01, CAP-DTH-HW-01, CAP-ISA-ARCH-004, CAP-ISA-ART-002, CAP-ISA-ART-003, CAP-ISA-PT-001, and CAP-ISA-PT-002; governed pairs, the frozen policy/reference base, and the SFT adapter/artifact path precede DPO. Record parsing/device primitives may be supporting; response masking, policy/reference logprob, stable logsigmoid loss, beta, gradients, update, and evaluation are course-owned.
- Conservative laptop/resource estimate: Estimate: exact CPU fixture below 2 GiB/10 minutes; selected-base adapter run 64..512 pairs, context at most 512, microbatch 1, 100..500 steps, below 6.5 GiB VRAM/12 GiB host and 2..8 hours; freeze plan before run.
- Falsifiable gates: Pass at least 3 hand/finite-difference fixtures if computing -log sigmoid(beta×[(log pi_theta(chosen|x)-log pi_ref(chosen|x))-(log pi_theta(rejected|x)-log pi_ref(rejected|x))]) over response tokens only matches them; reference/base bits stay fixed while adapter bits change; at least one actual update occurs; predeclared held-out pair margin/accuracy and three seeds are reported even if worse; chosen=rejected yields the analytically expected neutral loss/gradient behavior.
- Learner misconception risk: DPO is not human feedback collection, not PPO, and a lower preference loss on curated pairs is not proof of alignment or safety.
- Boundary: One bounded offline pairwise objective and selected adapter, not reward-model training, online preference collection, constitutional methods, or general value alignment.

## CAP-ISA-PT-004 — Compare QLoRA-style training through a frozen quantized base
- Classification: laptop-feasible-advanced-exercise
- Domain: post-training
- Source evidence: SRC-ISA-020 supports gradient flow through a frozen 4-bit base into LoRA and specific NF4/double-quantization/paged-optimizer ideas; its 65B-on-48-GiB result is explicitly outside this laptop estimate.
- Current repo evidence: No quantized training storage, dequantization-backward path, NF4/codebook, scale quantization, paged optimizer, or LoRA integration exists.
- Gap: Quantization-aware frozen-base forward/backward, memory decomposition, gradient parity, optimizer paging behavior, and quality/memory comparison with nonquantized LoRA are absent.
- Exact affected files: `rust/crates/llm-from-scratch/src/training/lora.rs`; proposed `rust/crates/llm-from-scratch/src/quantization.rs`; proposed `rust/crates/llm-from-scratch/src/tensor/dtype.rs`; proposed `rust/crates/llm-from-scratch/src/tensor/backend.rs`; `rust/crates/llm-from-scratch/tests/post_training.rs`; `rust/crates/llm-from-scratch/tests/artifact_interchange.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Low-level quantized storage/device kernels may be supporting only if the selected quant/dequant and gradient path remains exposed; importing a complete QLoRA trainer that hides the concept is disallowed.
- Conservative laptop/resource estimate: Estimate: selected 0.5..1.5B base, rank 4..16, context 512..1,024, microbatch 1, 100..500 steps, below 6.5 GiB measured VRAM/12 GiB host and 2..8 hours; these ranges require calibration and may shrink.
- Falsifiable gates: Pass at least 3 exact tiny fixtures if dequantization and LoRA gradients match a high-precision oracle within frozen tolerance; base quantized storage and scales never update; adapter updates are nonzero; measured model/activation/gradient/optimizer/workspace peaks reconcile and remain below profile; compare a fixed small run with nonquantized LoRA without claiming equal quality; unsupported quant path fails with no dense hidden fallback.
- Learner misconception risk: QLoRA does not train 4-bit base weights, eliminate activations, or guarantee a large model fits merely because static weights are compressed.
- Boundary: Optional selected-model exercise; comprehensive quantization research, 65B training, custom production kernels, and quality equivalence are not promised.

## CAP-ISA-PT-005 — Bound reward-model and PPO-style RLHF as a scale/process extension
- Classification: bounded-scale-extension
- Domain: post-training
- Source evidence: SRC-ISA-022 supports a representative demonstrations/preferences/reward-model/PPO pipeline; its human process, model scale, and results are not transferable.
- Current repo evidence: No human-feedback collection, annotator protocol, preference quality control, reward model, policy/value heads, rollout system, KL controller, PPO objective, or safety evaluation exists.
- Gap: A complete RLHF process requires data governance and human coordination in addition to code; merely explaining or evaluating reward scores would not constitute actual training.
- Exact affected files: `curriculum/functional-laptop-llm-extension-plan.md`; proposed `rust/crates/llm-from-scratch/src/training/rlhf_sim.rs`; `audits/2026-08-10-functional-llm-capability/requirements.md`; `audits/2026-08-10-functional-llm-capability/coverage.md`.
- Dependencies: Would require governed feedback records, separate model/checkpoint state, rollout infrastructure, and optimizer/device support; these dependencies are neither selected nor justified by the functional endpoint.
- Conservative laptop/resource estimate: Estimate: a tiny synthetic bandit/PPO arithmetic simulation can run below 1 GiB/10 minutes, but meaningful feedback collection plus separate policy/reference/reward/value model training exceeds the mandatory 8 GiB/one-session envelope and has no honest fixed ETA.
- Falsifiable gates: Pass all 6 named stages if local material distinguishes demonstrations, rankings, reward modeling, rollouts, KL control, and PPO updates; any tiny simulator proves only formulas/invariants and is labelled synthetic; acceptance fails if “RLHF implemented” is claimed without actual governed feedback, reward-model training, policy updates, held-out evaluation, at least 3 seed receipts, and resource evidence.
- Learner misconception risk: RLHF is not one loss function, DPO is not identical to PPO RLHF, and human preference optimization does not automatically make a model truthful or safe.
- Boundary: Conceptual/synthetic local treatment only; meaningful human-feedback operations and useful multi-model PPO are bounded-scale extensions, not blockers for functional laptop completion.

## CAP-ISA-RT-001 — Retrieve a stable top-k context with visible provenance
- Classification: mandatory-laptop-implementation
- Domain: retrieval-tools
- Source evidence: SRC-ISA-023 supports combining retrieved non-parametric records with generation; its claim limit means retrieval cannot be presented as a truth, citation, freshness, or authorization guarantee.
- Current repo evidence: No document record/index, provided-vector fixture, vector provenance/dimension/hash contract, host eligibility filter, deterministic similarity/rank code, context assembler, citation/provenance field, retrieval metric, or untrusted-content boundary exists.
- Gap: A functional application cannot demonstrate model-plus-data behavior, bind vectors to records, filter authorization before scoring, inspect what was retrieved, detect stable tie/order errors, or expose retrieval injection without an implemented path.
- Exact affected files: `rust/crates/llm-from-scratch/src/application/mod.rs`; `rust/crates/llm-from-scratch/src/application/retrieval.rs`; `rust/crates/llm-from-scratch/src/safety/evals.rs`; `rust/crates/llm-from-scratch/tests/applications_safety.rs`; service schema in `rust/crates/llm-local-server/src/http.rs`.
- Dependencies: Standard UTF-8/JSON/file parsing may be plumbing; mandatory scope uses explicit provided vectors with a manifest binding source/provenance, document hash/ID, dimension, dtype, normalization, and vector bytes hash, not an implied course-trained embedding model; authorization filtering, similarity, stable top-k, citations, and prompt assembly remain course-owned.
- Conservative laptop/resource estimate: Estimate: at most 1,000 records × 384 f32 dimensions = 1,536,000 bytes (1.465 MiB) raw vectors plus at most 16 MiB text/metadata; brute-force CPU query under 100 milliseconds after warmup and total test below 512 MiB/2 minutes.
- Falsifiable gates: Pass at least 10 exact cosine/dot fixtures only after host authorization removes ineligible records before normalization/scoring/top-k; each eligible vector manifest matches exact source/provenance, record ID/content SHA-256, dimension, dtype, normalization, and vector SHA-256; rank descending score then ascending document ID and return exactly min(k, eligible_count); ties, zero norms, non-finite vectors, missing/mismatched hashes, dimensions, and unauthorized records fail or filter per frozen policy; assembled context and generated citations may name only eligible retrieved IDs; changing/removing the top eligible record changes context predictably; retrieval-disabled baseline plus at least one relevance and malicious-document scenario are frozen.
- Learner misconception risk: Retrieved evidence is not necessarily relevant, current, true, authorized, or entailed by the answer, and similarity score is not factual confidence.
- Boundary: Small local inspectable brute-force retrieval over provided records; web search, hosted vector databases, learned retriever training, corpus governance, and broad RAG quality are outside this lane.

## CAP-ISA-RT-002 — Execute only schema-valid, authorized, bounded tools
- Classification: mandatory-laptop-implementation
- Domain: retrieval-tools
- Source evidence: SRC-ISA-024 and SRC-ISA-025 establish action/observation and learned-tool-use patterns; SRC-ISA-029 requires schema validation and emphasizes confirmation, timeout, result validation, and untrusted annotations; none grants execution authority.
- Current repo evidence: No tool registry, call envelope, JSON Schema validator, allowlist, permission/confirmation state, executor, timeout/output cap, observation sanitizer, or audit record exists.
- Gap: Tool-calling demonstrations could otherwise conflate model text with trusted commands and permit invalid, side-effecting, unbounded, or injection-bearing execution.
- Exact affected files: `rust/crates/llm-from-scratch/src/application/tools.rs`; `rust/crates/llm-from-scratch/src/application/constrained.rs`; `rust/crates/llm-from-scratch/src/safety/evals.rs`; `rust/crates/llm-from-scratch/tests/applications_safety.rs`; `rust/crates/llm-local-server/src/http.rs`.
- Dependencies: A pinned JSON/JSON-Schema-subset validator, process clock, and bounded executor may be plumbing; registry allowlist, authorization, confirmation, schema subset, timeout/output cap, result provenance, and model/host separation remain course-owned.
- Conservative laptop/resource estimate: Estimate: two deterministic tools only—a pure calculator and a read-only provided-record lookup—250-millisecond execution timeout, 8 KiB argument/result caps, no network, subprocess, shell, arbitrary path, or write access; tests below 512 MiB/2 minutes.
- Falsifiable gates: Pass at least 20 invalid name/schema/type/extra field/oversize/unauthorized/unconfirmed requests if executor-invocation count stays zero; valid calls execute at most once under an idempotency key, time out and reclaim predictably, return typed structured result/provenance, and treat result text as untrusted; adversarial arguments cannot escape tool capability; replay with same key/hash returns same recorded outcome while same key/different hash fails.
- Learner misconception risk: The model proposing JSON is not validation, permission, confirmation, or execution; a tool description/annotation is untrusted metadata.
- Boundary: Allowlisted local deterministic tools with no external side effects; learned Toolformer-style selection is advanced, and arbitrary shell/filesystem/network/email/purchase tools are excluded.

## CAP-ISA-RT-003 — Constrain tokens to an explicit JSON Schema subset and post-validate
- Classification: mandatory-laptop-implementation
- Domain: retrieval-tools
- Source evidence: SRC-ISA-026 supports incremental parser rejection, SRC-ISA-027 and SRC-ISA-028 define JSON Schema core/validation, and SRC-ISA-030 demonstrates a practical subset conversion; claim limits prohibit advertising full draft support or semantic correctness.
- Current repo evidence: Sampling supports only unconstrained full/top-k support; no grammar state, token-byte admissibility test, supported-schema declaration, dead-end error, or post-generation validator exists.
- Gap: Structured output can be invalid until token-time constraints, tokenizer-boundary handling, supported-keyword limits, schema canonicalization, state/resource caps, and independent post-validation are implemented.
- Exact affected files: `rust/crates/llm-from-scratch/src/application/constrained.rs`; `rust/crates/llm-from-scratch/src/generation/decoding.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-from-scratch/tests/applications_safety.rs`; `rust/crates/llm-local-server/tests/local_api.rs`.
- Dependencies: A mature JSON parser and validator for the explicitly supported subset may provide syntax/plumbing; incremental grammar/DFA state, token-byte prefix admissibility, vocabulary mask, caps, dead-end policy, and declared subset remain course-owned.
- Conservative laptop/resource estimate: Estimate: schemas at most 16 KiB, 64 states after bounded compilation target or a separately measured safe cap, output 8 KiB/512 tokens, alternatives 20, and deterministic tests below 1 GiB/5 minutes.
- Falsifiable gates: Publish exact supported keywords/types and reject every unsupported keyword/ref/format before model/KV allocation; at each step only token byte strings preserving at least one valid completion are selectable; 100 seeds across objects/arrays/strings/Unicode/numbers/booleans/null produce final JSON that an independent validator accepts; invalid high-logit tokens are never selected; empty legal support yields a typed constrained-decode error with no fallback; unconstrained mode remains equivalent to CAP-ISA-DEC-001 and CAP-ISA-DEC-002.
- Learner misconception risk: Prompting “return JSON” is not constrained decoding, syntactically valid JSON is not necessarily schema-valid, and schema-valid content can still be false or unsafe to execute.
- Boundary: Explicit finite JSON Schema 2020-12 subset and local grammars only; full regex/reference/vocabulary support, semantic database constraints, and arbitrary programming-language generation are excluded.

## CAP-ISA-SAFE-001 — Publish a threat model, scenario matrix, uncertainty, and model card
- Classification: mandatory-laptop-implementation
- Domain: safety-privacy
- Source evidence: SRC-ISA-033 supports scenario/metric-explicit evaluation, SRC-ISA-034 supports intended-use/limitation reporting, and SRC-ISA-035 supplies voluntary lifecycle risk categories; none certifies model safety.
- Current repo evidence: Chapter 34 and the capstone explicitly limit their fixed-fixture evaluation; no functional-endpoint threat model, risk register, model card, capability/safety scenario suite, uncertainty interval, multiple-seed receipt, or failure taxonomy exists.
- Gap: Without predeclared evaluation, a single fluent sample or passing regression can be misreported as usefulness, alignment, safety, privacy, tool correctness, or generalization.
- Exact affected files: `rust/crates/llm-from-scratch/src/safety/mod.rs`; `rust/crates/llm-from-scratch/src/safety/evals.rs`; `rust/crates/llm-from-scratch/tests/applications_safety.rs`; proposed `audits/2026-08-10-functional-llm-capability/schemas/model-card.schema.json`; proposed `audits/2026-08-10-functional-llm-capability/schemas/threat-model.schema.json`; `curriculum/functional-laptop-llm-extension-plan.md`; `audits/2026-08-10-functional-llm-capability/coverage.md`.
- Dependencies: Statistical interval and JSON/report serialization libraries may be plumbing; scenario definitions, frozen prompts/seeds, metric interpretation, thresholds, missing-coverage disclosure, and claims remain course-owned.
- Conservative laptop/resource estimate: Estimate: at least 100 fixed cases spanning generation, retrieval, tools, constrained output, injection, privacy, refusal/error, plus at least 5 generation seeds where stochastic; below 6.5 GiB VRAM/12 GiB host and 4 hours after model residency.
- Falsifiable gates: Pass at least 100 frozen scenarios if threat actors/assets/trust boundaries, intended/excluded uses, prompts, seeds, adaptations, metrics, thresholds, and confidence/uncertainty computation are frozen before running; report every case and failure, not only aggregate pass; compare mandatory baselines; model card states artifact hashes/resource profile/evaluation dates/known gaps; any missing mandatory scenario or post-result threshold edit fails closure.
- Learner misconception risk: A benchmark score, refusal rate, model card, or NIST mapping is evidence with stated coverage, not proof or certification of universal safety/capability.
- Boundary: Bounded endpoint-specific evaluation and disclosure; no legal compliance determination, red-team completeness, social-impact certification, or universal generalization claim.

## CAP-ISA-SAFE-002 — Default to content-minimal telemetry and test deletion/leakage risk
- Classification: mandatory-laptop-implementation
- Domain: safety-privacy
- Source evidence: SRC-ISA-018 identifies prompt/output/retrieval/system/tool fields as potentially sensitive and SRC-ISA-031 establishes training-data extraction as a real risk class; neither proves this model leaks nor defines local retention.
- Current repo evidence: No service telemetry or persistence currently exists, but no explicit future content-off default, opt-in, retention/deletion contract, redaction limit, secret-canary scan, extraction probe, or artifact access rule is recorded.
- Gap: Adding logs, metrics, or persisted records could silently retain content, while an eval-only privacy statement would not test telemetry, deletion, artifact access, or memorization behavior.
- Exact affected files: `rust/crates/llm-from-scratch/src/safety/privacy.rs`; `rust/crates/llm-from-scratch/src/serving/metrics.rs`; `rust/crates/llm-from-scratch/src/application/retrieval.rs`; `rust/crates/llm-from-scratch/tests/applications_safety.rs`; `rust/crates/llm-persistence-api/src/memory.rs`; `rust/crates/llm-persistence-api/src/files.rs`; `rust/crates/llm-local-server/tests/local_api.rs`.
- Dependencies: Cryptographic hashing and structured-log capture may be supporting; field allowlist, content-off default, explicit opt-in, retention clock, deletion semantics, canary generation, scan scope, and access policy remain course-owned.
- Conservative laptop/resource estimate: Estimate: zero persisted request content by default, in-memory output lifetime only through terminal cleanup, optional debug capture capped at 1 MiB and 24 hours only if design explicitly approves it, and 1,000 bounded extraction probes below 4 hours/selected profile.
- Falsifiable gates: Pass at least 10 unique canaries if they never appear in default logs, metrics, traces, persisted records, filenames, or error text; content capture requires explicit per-run opt-in and visible warning; fake-clock expiry plus deletion makes records unreachable through every API and selected backup policy; artifact permissions/manifest exclude secrets; 1,000 extraction probes report observed rates with controls and never claim absence from zero hits.
- Learner misconception risk: “Local” does not mean private if logs, swap, artifacts, backups, or tools retain content, and redaction cannot reliably infer every secret.
- Boundary: Data minimization, retention/deletion verification, and bounded extraction evidence; no formal confidentiality proof, secure erasure guarantee across storage media, differential privacy, or regulatory conclusion.

## CAP-ISA-SAFE-003 — Treat retrieved/tool content as untrusted and keep authorization in the host
- Classification: mandatory-laptop-implementation
- Domain: safety-privacy
- Source evidence: SRC-ISA-032 supports indirect prompt injection through external content and SRC-ISA-029 says annotations are untrusted and sensitive operations need client controls; neither source offers a complete defense.
- Current repo evidence: No retrieval/tool application exists, hence no trust labels, provenance-preserving prompt assembly, capability boundary, host policy, confirmation, side-effect denial, or injection regression exists.
- Gap: A retrieved page or tool result could be mistaken for trusted instruction and induce a call that bypasses user intent; delimiters alone would be an unfalsifiable defense.
- Exact affected files: `rust/crates/llm-from-scratch/src/application/retrieval.rs`; `rust/crates/llm-from-scratch/src/application/tools.rs`; `rust/crates/llm-from-scratch/src/safety/evals.rs`; `rust/crates/llm-from-scratch/tests/applications_safety.rs`; `rust/crates/llm-local-server/src/http.rs`.
- Dependencies: Standard escaping/schema parsing may be plumbing; provenance tags, trust classification, capability/authorization/confirmation policy, argument/result limits, and host refusal remain course-owned.
- Conservative laptop/resource estimate: Estimate: at least 50 fixed malicious-document/result variants across two harmless tools, no network or write authority, below 1 GiB/2 hours including generation.
- Falsifiable gates: Pass at least 50 hostile cases if retrieved/tool text is serialized with source/trust provenance and never changes host permissions; records asking for hidden instructions, secret exfiltration, schema bypass, or side effects cannot invoke an unauthorized/unconfirmed tool; executor-invocation counter stays zero for blocked cases; at least one valid user-confirmed control still works; raw tool outputs cannot inject a second tool envelope; all failures remain reported.
- Learner misconception risk: XML tags, system prompts, or telling a model to ignore attacks are not authorization boundaries; the host must enforce capability even when the model is persuaded.
- Boundary: Defense-in-depth for the bounded local tool set, not proof against all prompt injection, browser/web agents, arbitrary plugins, remote code, or covert channels.

## CAP-ISA-PER-001 — Store immutable large artifacts as hash-bound files
- Classification: mandatory-laptop-implementation
- Domain: persistence
- Source evidence: SRC-ISA-007 and SRC-ISA-008 support file-oriented tensor/model containers; neither format requires a relational service, and neither supplies authenticity, lineage, or crash-publication semantics.
- Current repo evidence: checkpoint.rs performs same-directory temporary publication and rename on Unix with a noncryptographic checksum, but there is no general content-addressed artifact store, SHA-256 manifest, platform durability contract, garbage-collection reachability rule, or crash-injection suite.
- Gap: Imported base, tokenizer, adapter, checkpoint, and evaluation artifacts need immutable identity, checked publication, bounded reads, lineage, and backup policy without conflating file storage with mutable metadata.
- Exact affected files: `rust/crates/llm-persistence-api/src/files.rs`; `rust/crates/llm-persistence-api/src/lib.rs`; `rust/crates/llm-persistence-api/tests/conformance.rs`; `rust/crates/llm-from-scratch/src/artifact/manifest.rs`; `rust/crates/llm-from-scratch/src/checkpoint.rs`; proposed `audits/2026-08-10-functional-llm-capability/schemas/artifact-receipt.schema.json`; proposed `audits/2026-08-10-functional-llm-capability/schemas/run-receipt.schema.json`.
- Dependencies: SHA-256, safe temporary-file, and platform fsync primitives may be mature plumbing; canonical manifest bytes, content identity, limits, publication ordering, reachability, and corruption policy remain course-owned.
- Conservative laptop/resource estimate: Estimate: at most 20 GiB managed disk under the provisional envelope, individual selected model at most 2 GiB, streaming copy/hash buffer at most 8 MiB, and peak host overhead below 256 MiB beyond mappings.
- Falsifiable gates: Compute SHA-256 while streaming to a same-filesystem temporary file, enforce size/type limits, flush file then atomic-rename and sync parent directory where the declared platform supports it, and publish manifest reference last; repeated same bytes return same immutable ID; different bytes cannot overwrite that ID; truncation/hash/manifest mismatch fails before load; fault injection at every publication boundary yields either old/absent or complete new object, never a referenced partial; recovery scans classify orphans.
- Learner misconception risk: A rename alone is not a cross-platform crash-durability proof, and a checksum/content hash does not authenticate who produced a model or whether it is safe/licensed.
- Boundary: Local content-addressed files for large immutable bytes; network object stores, deduplicating filesystems, secure erase, and universal filesystem crash semantics are excluded.

## CAP-ISA-PER-002 — Keep persistence and retrieval storage backend-neutral with local defaults
- Classification: mandatory-laptop-implementation
- Domain: persistence
- Source evidence: SRC-ISA-007 and SRC-ISA-008 establish bounded file containers but do not prescribe application storage; repository policy supplies the backend-neutral boundary and CAP-ISA-RT-001 supplies the exact local retrieval semantics.
- Current repo evidence: Only checkpoint file APIs exist; there is no narrow store contract, memory/file conformance oracle, provided-vector file layout, crash/retry rule, idempotent retained-outcome rule, or retention/deletion policy.
- Gap: The mandatory endpoint needs deterministic memory/file behavior without leaking a particular storage product into model, decoder, serving, or retrieval semantics; an optional future adapter must implement the same course-owned contract.
- Exact affected files: `rust/crates/llm-persistence-api/Cargo.toml`; `rust/crates/llm-persistence-api/src/lib.rs`; `rust/crates/llm-persistence-api/src/memory.rs`; `rust/crates/llm-persistence-api/src/files.rs`; `rust/crates/llm-persistence-api/tests/conformance.rs`; `rust/crates/llm-from-scratch/src/application/retrieval.rs`; root `Cargo.toml` and `Cargo.lock`.
- Dependencies: Standard file/serialization/error plumbing may be supporting; record/vector identity, SHA-256 bindings, legal transitions, idempotency hash semantics, authorization-before-rank inputs, stable exact search, retention/deletion, and adapter conformance remain course-owned.
- Conservative laptop/resource estimate: Estimate: 1,000 records × 384 f32 dimensions plus at most 16 MiB text/metadata, 10,000 small retained metadata/outcome records, total below 256 MiB host RAM and 2 minutes for conformance; immutable model bytes remain CAP-ISA-PER-001 files.
- Falsifiable gates: Pass at least 100 conformance traces if memory and file adapters return byte-identical canonical records and CAP-ISA-RT-001 exact ranks across restart/crash/retry fixtures; same idempotency key plus same request hash returns one outcome and same key plus different hash fails; corrupt/truncated/hash-mismatched files fail before exposure; authorization filtering occurs before rank; the default endpoint starts, retrieves, serves, and restores permitted local state with zero external database process, socket, client crate, extension, migration, or container.
- Learner misconception risk: Backend-neutral does not mean semantics-free, and a local file is not automatically atomic, authenticated, crash-durable, or safe to parse.
- Boundary: Mandatory adapters are bounded process memory and course-owned local files with exact brute-force vector search; generic relational storage, hosted vector services, and approximate indexes are not selected.

## CAP-ISA-PER-003 — Optionally compare PostgreSQL plus pgvector after measured vector-store need
- Classification: laptop-feasible-advanced-exercise
- Domain: persistence
- Source evidence: SRC-ISA-052 documents exact vector ordering and optional HNSW/IVFFlat indexes; SRC-ISA-036, SRC-ISA-037, and SRC-ISA-038 document concurrency, transaction-retry, and uniqueness primitives, but none proves course rank/citation/authorization semantics or justifies selecting the products.
- Current repo evidence: Cargo.lock has no PostgreSQL client, pgvector extension, pooling, migrations, relational/vector schema, container, adapter, workload receipt, or integration test; the bounded CAP-ISA-RT-001 fixture fits memory/files and therefore supplies no present selection reason.
- Gap: Only if a later declared vector collection/query workload measurably exceeds the local exact-search budget would extension versioning, distance/operator mapping, authorization-before-rank filtering, exact/approximate behavior, recall, concurrency, transaction, credentials, and conformance require study.
- Exact affected files: Conditional-only `rust/crates/llm-persistence-pgvector/Cargo.toml`; `rust/crates/llm-persistence-pgvector/src/lib.rs`; `rust/crates/llm-persistence-pgvector/tests/conformance.rs`; `infra/pgvector/migrations/0001_vectors.sql`; `compose.functional-llm-pgvector.yaml`; root `Cargo.toml` and `Cargo.lock` only if the advanced profile is selected.
- Dependencies: Requires CAP-ISA-RT-001 and CAP-ISA-PER-002 plus a pre-run workload decision; if selected, pin exact PostgreSQL image, pgvector version, Rust client/pool, migration runner, and minimal features/licenses/lock graph without broadening network/container authority.
- Conservative laptop/resource estimate: Estimate for an optional comparison: 100,000 × 384 f32 vectors = 153,600,000 bytes (146.49 MiB) raw before row/index overhead, database 0.5..2 GiB RAM and 2..6 GiB disk, 1,000 frozen queries and 1..16 clients below 30 minutes; exact caps freeze before provisioning.
- Falsifiable gates: The advanced profile may run only if a predeclared local baseline exceeds at least one frozen threshold for corpus bytes, p95 query latency, 1..16-client throughput, transactional vector/authorization updates, or recovery; pass if the database exact operator returns the same eligible IDs/order/scores as CAP-ISA-RT-001 on at least 1,000 queries after authorization filtering, approximate mode reports recall@k against that exact oracle above a predeclared floor and never cites an ineligible ID, concurrency/retry preserves one canonical record per ID/hash, and disabling the profile leaves the mandatory endpoint passing with zero PostgreSQL/pgvector dependency or process.
- Learner misconception risk: A vector extension does not create embeddings, truth, authorization, stable course tie rules, useful recall, or a need for a database; an approximate index can return fewer filtered results.
- Boundary: Unselected optional local comparison for a measured vector workload only; generic request/run metadata, immutable artifacts, the 1,000-record fixture, static HTML, and mandatory serving do not justify or depend on PostgreSQL/pgvector.

## CAP-ISA-PER-004 — Conditionally prove vector-adapter migrations and restore
- Classification: laptop-feasible-advanced-exercise
- Domain: persistence
- Source evidence: SRC-ISA-039 supports logical dump/restore and warns that restore inputs can execute source-chosen code; SRC-ISA-040 supports base-backup-plus-WAL PITR but also implies additional operational machinery.
- Current repo evidence: CAP-ISA-PER-003 is not selected and no vector database/schema exists, so no migration, backup command, restore drill, vector/authorization reconciliation, corrupted-backup behavior, rollback/forward-fix policy, or retention schedule exists or is required by default.
- Gap: If and only if CAP-ISA-PER-003 is later selected, a fresh-schema test or dump file alone would not prove that vector bytes, metadata, authorization eligibility, exact ranks, and approximate-index rebuild survive migration/recovery.
- Exact affected files: Conditional-only `infra/pgvector/migrations/0001_vectors.sql`; proposed conditional `infra/pgvector/migrations/0002_vector_metadata.sql`; `rust/crates/llm-persistence-pgvector/tests/conformance.rs`; `compose.functional-llm-pgvector.yaml`; proposed conditional `scripts/backup-functional-llm-pgvector.sh`; proposed conditional `scripts/restore-functional-llm-pgvector.sh`; proposed `audits/2026-08-10-functional-llm-capability/schemas/pgvector-restore-receipt.schema.json`.
- Dependencies: CAP-ISA-PER-003 must be explicitly selected first; then exact PostgreSQL dump/restore binaries, pinned PostgreSQL+pgvector image/extension, checksum utility, and isolated fresh database are required only inside that advanced profile.
- Conservative laptop/resource estimate: Estimate if selected: vector database below 6 GiB disk/2 GiB RAM, compressed dump below 2 GiB, fresh restore and index rebuild below 60 minutes; PITR lab, if separately approved, needs at least 8 GiB additional disk.
- Falsifiable gates: Default-profile pass records CAP-ISA-PER-003 and CAP-ISA-PER-004 as not selected with zero database dependency/process; if selected, seed exact vectors/metadata/eligibility states, dump consistently, restore into a fresh empty instance, apply every supported predecessor-to-current migration, and match canonical IDs/hashes/eligibility plus CAP-ISA-RT-001 exact ranks on at least 100 queries; approximate indexes are rebuilt and remeet the frozen recall floor; corrupted/truncated dump fails loudly; PITR is not claimed unless a base-backup/WAL timestamp drill passes.
- Learner misconception risk: Backup success is not restore success, schema migrations are not automatically reversible, and restoring a dump from an untrusted source can execute privileged database code.
- Boundary: Conditional recovery exercise only for a separately selected CAP-ISA-PER-003 vector adapter; it is skipped—not simulated—by the mandatory local-file endpoint, and production PITR/replicas/key management/RPO/RTO remain outside scope.

## CAP-ISA-ARCH-001 — Keep the static learning product separate from the local model process
- Classification: mandatory-laptop-implementation
- Domain: architecture
- Source evidence: SRC-ISA-005 and SRC-ISA-006 describe transport only; repository AGENTS.md is authoritative that production output is static HTML and interactive support is Firefox with JavaScript.
- Current repo evidence: site/ builds static course pages and current demos are learner-run binaries; no runtime API dependency exists, which is the correct boundary to preserve.
- Gap: Adding local serving could accidentally turn course navigation/content/formulas/figures into client-only fetched material, require a model or persistence process to view lessons, or claim unsupported browser/network behavior.
- Exact affected files: `AGENTS.md` only if policy is intentionally revised; `README.md`; `curriculum/functional-laptop-llm-extension-plan.md`; `rust/crates/llm-local-server/Cargo.toml`; `rust/crates/llm-local-server/src/main.rs`; `rust/crates/llm-local-server/src/http.rs`; `rust/crates/llm-local-server/tests/local_api.rs`; `site/src/pages/[locale]/course/[...slug].astro`; `site/tests/deployment.test.ts`; `site/tests/firefox-only-browser-policy.test.ts`; `site/tests/e2e/localized-shell.spec.ts`; `scripts/check-functional-laptop-llm-plan.mjs`.
- Dependencies: Static site build dependencies remain separate from Rust server and optional persistence-profile dependencies; any optional browser client must use the one Firefox project and progressive failure states without hiding crawler-visible lesson evidence.
- Conservative laptop/resource estimate: Estimate: production site build adds 0 MiB model or persistence-service resident memory and makes zero service network requests; local service uses a distinct explicitly started process and loopback port.
- Falsifiable gates: Pass 1 production build if HTML is inspectable with every model/persistence process stopped and zero service URLs; all learner formulas/prose/figures/evidence remain in static HTML; sole Firefox project passes required static interactions offline; local API documentation works as copyable commands; optional live panel shows an explicit unavailable state and never blocks chapter reading; dependency graph shows no server crate in site runtime bundle.
- Learner misconception risk: “Static site teaches serving” does not mean the deployed website hosts inference, and a browser demo is not the same security/resource boundary as a Rust process.
- Boundary: Static course plus separately invoked loopback executable; no server-side-rendered production app, hidden hosted inference, alternate browser guarantee, or database-backed course runtime.

## CAP-ISA-ARCH-002 — Fail loudly at every artifact, dependency, request, and optional-capability boundary
- Classification: mandatory-laptop-implementation
- Domain: architecture
- Source evidence: SRC-ISA-006, SRC-ISA-007, SRC-ISA-008, SRC-ISA-029, and SRC-ISA-037 expose failure-bearing transport, format, tool, and selected-optional-transaction boundaries; exact typed-error and no-fallback policy is a repository engineering decision, not inherited from a source.
- Current repo evidence: Sampling/checkpoint/cache code already validates many invalid values and uses staged commit, but no cross-system error taxonomy or test prevents silent CPU, smaller-model, lower-precision, shorter-context, unconstrained-output, no-adapter, unrequested persistence-backend, or skipped-eval fallback.
- Gap: The integrated endpoint could appear to work after abandoning the requested backend/model/adapter/schema/persistence/eval policy unless every substitution is explicit and observable.
- Exact affected files: Proposed `rust/crates/llm-from-scratch/src/error.rs`; `rust/crates/llm-from-scratch/src/artifact/mod.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-local-server/src/main.rs`; `rust/crates/llm-from-scratch/tests/fail_loud.rs`; `rust/crates/llm-local-server/tests/local_api.rs`; `scripts/check-functional-laptop-llm-plan.mjs`.
- Dependencies: Supporting libraries' errors must be mapped without erasing source/category; feature flags and optional adapters are compile/startup/request-visible; no dependency may implement hidden concept fallback.
- Conservative laptop/resource estimate: Estimate: failure matrix at least 50 injected cases below 2 GiB/30 minutes for the mandatory profile; a selected optional persistence restore has its own CAP-ISA-PER-004 budget, and each knowable rejection precedes large allocation.
- Falsifiable gates: Pass at least 50 injected cases if exhaustive typed categories and phase/terminal reason are frozen; inject missing/wrong hash/version/dtype/quant/device/kernel/adapter/config/schema/tool/selected-optional-persistence/migration/resource/timeout/cancel failures; assert zero silent substitution and no partial request state/RNG/page leak; startup readiness distinguishes unavailable required capability from health; response/metric/receipt identifies the actual selected backend/model/config/policy; optional feature off returns explicit unsupported, never a degraded approximation.
- Learner misconception risk: Graceful degradation can falsify a teaching experiment when it silently changes the algorithm or resource profile; an error message after partial mutation is not failure atomicity.
- Boundary: Fail-loud behavior for declared course profiles and integrations, not exhaustive recovery from hardware faults, hostile kernels, Byzantine services, or every OS failure.

## CAP-ISA-ARCH-003 — Freeze and audit the complete supporting-dependency graph
- Classification: mandatory-laptop-implementation
- Domain: architecture
- Source evidence: SRC-ISA-046 supports manifests plus an exact resolved lock graph and SRC-ISA-047 supports locked/offline build enforcement; their claim limits require separate role/license/advisory/call-site review and do not authorize acquisition.
- Current repo evidence: Root `Cargo.toml`/`Cargo.lock` describe the current dependency-light scalar course, and AGENTS.md requires narrow supporting roles recorded in DECISIONS.md, minimal features, complete allowlisting, and course-owned learner algorithms; no future service/GPU/format/compression/CLI or optional-persistence graph is selected or audited.
- Gap: Adding device, tensor, serialization, HTTP, compression, CLI, metrics, schema, or optional persistence plumbing could import undeclared transitive crates, duplicate stacks, license/advisory risk, native downloads, hidden network/build code, or ready-made implementations of taught concepts.
- Exact affected files: `Cargo.toml`; `Cargo.lock`; proposed `rust/crates/llm-local-server/Cargo.toml`; proposed `rust/crates/llm-persistence-api/Cargo.toml`; `DECISIONS.md`; `scripts/check-functional-laptop-dependencies.mjs`; `scripts/check-functional-laptop-llm-plan.mjs`; proposed `audits/2026-08-10-functional-llm-capability/schemas/dependency-allowlist.schema.json`; proposed `audits/2026-08-10-functional-llm-capability/schemas/dependency-audit-receipt.schema.json`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: The checker may consume Cargo metadata and pinned license/advisory data already provisioned by the resource contract; it must not download packages/databases implicitly, and a supporting library grants no network, paid-service, filesystem, GPU, container, or execution authority.
- Conservative laptop/resource estimate: Estimate: complete direct/transitive graph at most 500 packages, duplicate/license/advisory/call-site scan below 2 GiB host RAM and 10 minutes, and provisioned offline cargo build below 12 GiB host RAM/60 minutes; exact caps freeze before acquisition.
- Falsifiable gates: Pass if 100 percent of direct and transitive packages are in a path/version/source/checksum/license/role allowlist; each direct dependency enables only listed features; zero unapproved git/path/registry/native-download/build-script/network dependencies and zero unresolved advisories at the frozen policy threshold; duplicate versions are enumerated and justified; call-site audit proves GPU/tensor libraries do not perform taught attention/optimizer/sampling, serializers do not enforce course invariants, network libraries do not schedule/admit, compression does not replace quantization, and CLI libraries do not own course policy; `cargo build --workspace --locked --offline` succeeds from the declared provisioned cache and fails on lock drift/missing artifact.
- Learner misconception risk: A popular or Rust-native crate is not automatically narrow, safe, licensed, reproducible, or outside the learner concept; Cargo.lock is necessary but not a role audit.
- Boundary: Complete supporting-plumbing graph for the selected profiles only; it neither vendors/acquires dependencies nor certifies supply-chain security, and every graph change invalidates the receipt.

## CAP-ISA-ARCH-004 — Project the DTH runtime config into serving admission
- Classification: mandatory-laptop-implementation
- Domain: architecture
- Source evidence: SRC-ISA-008 supports typed architecture metadata and SRC-ISA-010 supports distinct query/KV-head counts; their claim limits mean the course must define, validate, count, and bind its exact configuration rather than infer semantics from a filename or compile feature.
- Current repo evidence: `rust/crates/llm-from-scratch/src/models/decoder.rs` has runtime `DecoderModelConfig` fields for vocabulary, model width, one head count, feed-forward width, layers, maximum positions, RoPE base, and RMS epsilon, while `pipeline.rs` exposes only a frozen tiny Chapter 39 configuration; sibling CAP-DTH-ARCH-02 owns the missing shared model schema/scale ladder, but no artifact manifest, service configuration, request planner, readiness response, or receipt is bound to it today.
- Gap: Even after DTH defines one versioned decoder configuration, artifact and serving layers could hardcode different context, batch, token, KV, or page capacities or use Cargo features as semantic switches; ISA must consume the identical config bytes/hash, project only serving caps, and refuse production-shaped excess before allocation.
- Exact affected files: `rust/crates/llm-from-scratch/src/artifact/manifest.rs`; `rust/crates/llm-from-scratch/src/serving/config.rs`; `rust/crates/llm-from-scratch/src/serving/request.rs`; `rust/crates/llm-local-server/src/main.rs`; `rust/crates/llm-local-server/src/http.rs`; `rust/crates/llm-from-scratch/tests/config_serving.rs`; `rust/crates/llm-local-server/tests/local_api.rs`; root `Cargo.toml` and `Cargo.lock`.
- Dependencies: Prerequisites are CAP-DTH-ARCH-02 as the exclusive owner of versioned semantic/run config, model axes, decoder construction, exact profiles/census/formulas, depth/initialization, and feature parity; CAP-ISA-ARCH-002 supplies fail-loud error policy and CAP-ISA-ARCH-003 supplies dependency/feature policy. These three foundational edges point into this serving-projection capability; artifact, attention, and serving implementations are downstream and are not prerequisites. Checked integer/parsing plumbing is allowed; ISA owns only artifact/config-hash binding, serving projection, admission, reporting, and refusal.
- Conservative laptop/resource estimate: Estimate: project serving caps for the 4 exact CAP-DTH-ARCH-02 fixtures below 256 MiB host RAM and 30 seconds with zero weight allocation; only its selected 20M..50M laptop fixture may run and must remain below the DTH 6.25 GiB VRAM ceiling/12 GiB host RAM, while the production-shaped fixture is plan/refuse only.
- Falsifiable gates: Pass if artifact/server code consumes the exact versioned CAP-DTH-ARCH-02 config bytes/SHA-256 without redefining model axes and projects runtime admitted context, maximum batch requests, input/output/total-token caps, KV block geometry/count, page-pool bytes, and tokenizer/template/artifact hashes; the same serving planner accepts the exact ~1K, ~8K, and laptop DTH fixtures and its KV/page/resource results match independent checked serving formulas; every bound semantic field change alters the DTH config hash and invalidates mismatched weights/cache/adapter; at least 2 compiled backend/device/kernel feature sets give equivalent tiny service outputs under frozen tolerance and Cargo features contain zero semantic dimensions/caps; the DTH production-shaped fixture reaches readiness/resource planning but fails before tensor/KV allocation with zero fallback; malformed, overflowed, config/artifact-mismatched, or one-cap-over requests fail loudly.
- Learner misconception risk: Runtime configurability does not mean every architecture is supported or every valid shape fits; a compile feature is not a model dimension, and successful parsing is not successful execution.
- Boundary: ISA owns serving projection/admission only for CAP-DTH-ARCH-02's decoder-only autoregressive text/token family; CAP-DTH-ARCH-02 owns all model/run config semantics, axes, formulas, construction, and scale profiles, while production-shaped execution, multimodal recognition/generation, encoders, encoder-decoder models, diffusion, non-autoregressive generation, audio/image/video paths, and arbitrary model families are excluded.

## CAP-ISA-ENDPOINT-001 — Bind one exact open model through import, adaptation, evaluation, and serving
- Classification: mandatory-laptop-implementation
- Domain: resource-envelope
- Source evidence: SRC-ISA-008 supports the selected quantized import container, SRC-ISA-019 supports nonzero LoRA adaptation, SRC-ISA-034 supports model identity/intended-use/limitation disclosure, and SRC-ISA-035 supports lifecycle evaluation; none selects a model or guarantees useful quality/safety.
- Current repo evidence: The Chapter 39 fixture composes training/reload/generation only for its own tiny 1,188-parameter configuration; there is no versioned external semantic-config artifact, open pretrained revision import, nonzero SFT adapter, versioned post-preference successor adapter, frozen-base comparison, or same-config/artifact local-service receipt.
- Gap: CAP-ISA-ARCH-004, CAP-ISA-ART-003, CAP-ISA-PT-001, CAP-ISA-PT-002, CAP-ISA-PT-003, sibling CAP-DTH-EVAL-02, CAP-ISA-SRV-006, resource, and safety records could each pass on different configurations or artifacts; no current gate proves identity continuity or a narrow functional endpoint from one exact config/base through one SFT adapter, its bounded preference-updated successor, and served outputs.
- Exact affected files: `curriculum/functional-laptop-llm-extension-plan.md`; `rust/crates/llm-from-scratch/src/artifact/manifest.rs`; `rust/crates/llm-from-scratch/src/artifact/adapter.rs`; `rust/crates/llm-from-scratch/tests/functional_endpoint.rs`; `rust/crates/llm-local-server/tests/local_api.rs`; `audits/2026-08-10-functional-llm-capability/coverage.md`; proposed `audits/2026-08-10-functional-llm-capability/schemas/endpoint-receipt.schema.json`.
- Dependencies: This terminal composition has exactly these direct mandatory prerequisites: CAP-DTH-ARCH-02, CAP-DTH-EVAL-02, CAP-DTH-HW-01; CAP-ISA-ARCH-002, CAP-ISA-ARCH-003, CAP-ISA-ARCH-004; CAP-ISA-ART-002, CAP-ISA-ART-003; CAP-ISA-PT-001, CAP-ISA-PT-002, CAP-ISA-PT-003; CAP-ISA-SAFE-001, CAP-ISA-SAFE-002, CAP-ISA-SAFE-003; CAP-ISA-DEC-002, CAP-ISA-DEC-003, CAP-ISA-DEC-004, CAP-ISA-DEC-005, CAP-ISA-DEC-006; CAP-ISA-ATT-002, CAP-ISA-ATT-003, CAP-ISA-ATT-004; CAP-ISA-SRV-001, CAP-ISA-SRV-002, CAP-ISA-SRV-003, CAP-ISA-SRV-004, CAP-ISA-SRV-005, CAP-ISA-SRV-006, CAP-ISA-SRV-007, CAP-ISA-SRV-009; and CAP-ISA-OBS-001. Every edge points from the endpoint to a prerequisite receipt; chunked/fairness and parallel-prefill exercises remain optional outside this field, and exact artifact acquisition remains blocked on the resource contract.
- Conservative laptop/resource estimate: Estimate: one exact 20M..50M open pretrained revision, one dense training representation, one bound quantized GGUF derivative at most 128 MiB, one adapter, at most 512 MiB total downloaded artifact bytes, 6.25 GiB measured peak VRAM, 12 GiB host RAM, 20 GiB disk, and adaptation/evaluation/serving smoke within 12 hours after provisioned artifacts; 0.5..1.5B adaptation remains optional CAP-ISA-PT-004.
- Falsifiable gates: Pass 1 terminal composition only if every direct prerequisite receipt binds one identical run identity and the same exact 20M..50M upstream revision/license/model card/download SHA-256, CAP-DTH-ARCH-02 config bytes/SHA-256, dense base tensors, CAP-ISA-ART-003 quantized derivative/conversion, tokenizer, and versioned chat template/control-token mapping; CAP-ISA-PT-001 produces a nonzero SFT adapter bound under the CAP-ISA-PT-002 schema, CAP-ISA-PT-003 updates that exact adapter and emits a new versioned successor adapter whose lineage binds the SFT-parent hash, and CAP-DTH-EVAL-02 evaluates adapter-disabled, SFT, and post-preference successor states on that same derivative/config before CAP-ISA-SRV-006 serves the post-preference successor; CAP-ISA-DEC-002 through CAP-ISA-DEC-006, CAP-ISA-ATT-002 through CAP-ISA-ATT-004, CAP-ISA-SRV-001 through CAP-ISA-SRV-007, mandatory CAP-ISA-SRV-009, CAP-ISA-OBS-001, CAP-ISA-SAFE-001 through CAP-ISA-SAFE-003, and the resource/admission receipts all report that identical identity/config and the terminal successor-adapter hash plus their configured vocabulary/d_model/layers/query-KV-heads/d_ff/context/batch/token/KV caps; substituting a different run, config, base, derivative, tokenizer, template, SFT adapter, successor adapter, or individually passing artifact fails, as do zero SFT/preference updates, compile-time semantic-cap substitution, and silent larger/smaller-model fallback.
- Learner misconception risk: Individually passing import, tuning, evaluation, and server demos do not compose a functional model if they use different bases/tokenizers/adapters, and a narrow improvement is not broad usefulness.
- Boundary: One resource-contract-selected decoder-only autoregressive text/token configuration and one honest narrow-domain adapter served locally; the same path safely plans/refuses larger configs under CAP-ISA-ARCH-004, but multimodal and non-autoregressive families, broad chat/quality/safety claims, hidden cloud, and PostgreSQL prerequisites are excluded.

## CAP-ISA-DIST-001 — Simulate distributed-serving placement atop the DTH collective oracle
- Classification: laptop-feasible-advanced-exercise
- Domain: distributed
- Source evidence: SRC-ISA-041 supports model-parallel collective boundaries and SRC-ISA-043 supports sharded conditional computation; their multi-GPU arithmetic and throughput are context only, while this record asks how already-validated shards affect service placement.
- Current repo evidence: No request/session router, model-shard placement table, KV/adapter affinity rule, rank-aware admission, cancellation propagation, rank-failure terminal mapping, or service-placement metric exists; sibling CAP-DTH-DIST-01 is designated to own training partition and collective arithmetic.
- Gap: A learner cannot connect an immutable DTH collective trace to serving consequences such as session affinity, KV/adapter co-location, queue placement, capacity refusal, cancellation, and failure domains without a separate service scheduler.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/distributed_placement.rs`; `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; `rust/crates/llm-from-scratch/src/serving/metrics.rs`; `rust/crates/llm-from-scratch/tests/distributed_serving.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Requires immutable validated CAP-DTH-DIST-01 partition/collective trace-oracle fixtures plus CAP-ISA-SRV-002, CAP-ISA-SRV-003, CAP-ISA-SRV-004, CAP-ISA-SRV-007, and CAP-ISA-OBS-001; ISA must not recompute or redefine tensor splits, training gradients, collective arithmetic, or byte-count oracle values.
- Conservative laptop/resource estimate: Estimate: 2..8 logical service ranks, at least 1,000 request-placement events, placement metadata below 64 MiB, total host peak below 1 GiB and run below 5 minutes; no sockets, containers, GPU, or claimed speedup.
- Falsifiable gates: Pass at least 1,000 deterministic placement/admission/complete/cancel/failure events if each consumes a hash-bound CAP-DTH-DIST-01 oracle trace unchanged; model shards, request/session IDs, KV blocks, and adapter identity remain explicit; stable ties choose ascending logical rank; no placement exceeds declared memory/queue capacity; cancellation or injected rank loss reaches every dependent request within 100 steps with exactly one terminal result and zero leaked placement; DTH-provided collective bytes/order are reported but never recalculated as new ISA evidence.
- Learner misconception risk: A correct one-process service-placement simulation does not validate training partition math, interconnect performance, asynchronous races, kernel overlap, fault tolerance, or multi-GPU setup.
- Boundary: ISA owns only deterministic serving placement/lifecycle over the frozen DTH oracle; CAP-DTH-DIST-01 owns local training partition/collective arithmetic, and real distributed serving belongs to CAP-ISA-DIST-002.

## CAP-ISA-DIST-002 — Treat real multi-device distributed serving as bounded scale
- Classification: bounded-scale-extension
- Domain: distributed
- Source evidence: SRC-ISA-041 and SRC-ISA-043 support real multi-device collective/sharding mechanisms at scale; their hardware/software results cannot be reproduced on the declared one-GPU envelope and do not specify this service lifecycle.
- Current repo evidence: Cargo manifests and course plan deliberately have no distributed serving runtime, multiple-device service profile, topology, launcher, request placement, distributed KV/adapter residency, or rank-failure/cancellation receipt.
- Gap: Real service communication, placement, overlap, rank lifecycle, sharded serving-artifact consistency, network security, partial failure, and latency cannot be validated with CAP-ISA-DIST-001's one-process scheduler.
- Exact affected files: `curriculum/functional-laptop-llm-extension-plan.md`; future gated `rust/crates/llm-local-server/src/distributed.rs`; proposed `rust/crates/llm-local-server/tests/distributed_api.rs`; proposed `audits/2026-08-10-functional-llm-capability/schemas/distributed-serving-receipt.schema.json`; `audits/2026-08-10-functional-llm-capability/coverage.md`.
- Dependencies: Requires CAP-DTH-DIST-02 for the real collective/backend arithmetic boundary plus CAP-ISA-DIST-001, CAP-ISA-SRV-002, CAP-ISA-SRV-004, CAP-ISA-SRV-007, and CAP-ISA-OBS-001; it also needs multiple compatible devices/nodes, pinned drivers/runtime, launcher/network/storage, sharded serving artifacts, and expanded authority, none mandatory.
- Conservative laptop/resource estimate: Estimate: unavailable on the declared single 8 GiB GPU; meaningful run needs at least 2 compatible devices plus interconnect and cannot receive an honest laptop time/memory threshold.
- Falsifiable gates: Pass if mandatory course closure makes zero claims of real distributed-serving speedup/correctness; any future promotion requires at least 2 actual service ranks and receipts for single-service output equivalence, DTH collective bytes/order, model/KV/adapter placement, peak memory per rank, queue/TTFT/intertoken/p95/p99 latency, throughput, cancellation, rank loss/recovery, and topology, with no single-process substitution.
- Learner misconception risk: Code paths named “distributed” or several logical ranks do not prove communication performance, memory scaling, correctness under failures, or usable larger models.
- Boundary: Optional future distributed-serving extension only; CAP-DTH-DIST-02 owns real training collective/partition validation, and neither is part of the functional laptop or static-site runtime.

## CAP-ISA-MOE-001 — Schedule expert serving atop the DTH router oracle
- Classification: laptop-feasible-advanced-exercise
- Domain: mixture-of-experts
- Source evidence: SRC-ISA-042 supports expert capacity/load imbalance and SRC-ISA-044 supplies a modern top-k-expert decoder example; their router arithmetic, training, quality, and scale are context, while ISA studies queues after a frozen route decision.
- Current repo evidence: No per-expert request/token queue, expert-residency table, batching rule, hot-expert mitigation, service-capacity admission, cancellation cleanup, or expert-serving latency/utilization metric exists; sibling CAP-DTH-MOE-01 is designated to own router/top-k/capacity/drop/combine/gradient arithmetic.
- Gap: Even correct router outputs can overload a hot expert, strand capacity, mix request ownership, or leak cancelled work; serving scheduling needs an explicit trace consumer rather than a competing MoE implementation.
- Exact affected files: `rust/crates/llm-from-scratch/src/serving/expert_scheduler.rs`; `rust/crates/llm-from-scratch/src/serving/scheduler.rs`; `rust/crates/llm-from-scratch/src/serving/metrics.rs`; `rust/crates/llm-from-scratch/tests/expert_serving.rs`; `curriculum/functional-laptop-llm-extension-plan.md`.
- Dependencies: Requires immutable validated CAP-DTH-MOE-01 router/capacity/drop/combine trace-oracle fixtures plus CAP-ISA-SRV-002, CAP-ISA-SRV-003, CAP-ISA-SRV-004, CAP-ISA-SRV-005, and CAP-ISA-OBS-001; ISA must not recompute router logits, top-k ties, capacity/drop decisions, auxiliary loss, or gradients.
- Conservative laptop/resource estimate: Estimate: 4..16 logical experts, at least 1,000 routed-token events from fixed traces, scheduling metadata below 64 MiB, host peak below 1 GiB and CPU run below 10 minutes.
- Falsifiable gates: Pass at least 1,000 route/enqueue/batch/complete/cancel events if every event consumes an unchanged hash-bound CAP-DTH-MOE-01 decision; each accepted routed token enters exactly its declared expert queues once, request order/tie policy is stable, no expert service batch exceeds its configured cap, hot-expert fixtures expose queue/p95 delay and frozen mitigation, cancellation removes all pending work within 100 steps, and input = completed + DTH-declared-dropped + cancelled + terminal-error accounting holds exactly without recomputing router math.
- Learner misconception risk: MoE activates fewer parameters per token but still stores total expert weights and can suffer routing imbalance, capacity drops, communication, and poor expert specialization.
- Boundary: ISA owns only expert-serving queues, batches, residency, lifecycle, and metrics over CAP-DTH-MOE-01; DTH owns router/training arithmetic, and no useful sparse model or throughput claim is made.

## CAP-ISA-MOE-002 — Treat useful distributed expert serving as bounded scale
- Classification: bounded-scale-extension
- Domain: mixture-of-experts
- Source evidence: SRC-ISA-043 supports distributed conditional-computation sharding and SRC-ISA-044 illustrates total-versus-active expert scale; neither supports useful expert serving on one 8 GiB laptop.
- Current repo evidence: There is no MoE model artifact, expert placement, all-to-all dispatch, expert cache/load policy, router batching, hot-expert mitigation, distributed checkpoint, or service failure behavior.
- Gap: A tiny simulator cannot validate full-weight residency, inter-device token exchange, imbalance-driven tail latency, expert placement, partial expert failure, or useful output quality.
- Exact affected files: `curriculum/functional-laptop-llm-extension-plan.md`; future gated `rust/crates/llm-local-server/src/distributed_experts.rs`; proposed `rust/crates/llm-local-server/tests/distributed_expert_api.rs`; proposed `audits/2026-08-10-functional-llm-capability/schemas/distributed-expert-serving-receipt.schema.json`; `audits/2026-08-10-functional-llm-capability/coverage.md`.
- Dependencies: Requires CAP-DTH-MOE-02 and CAP-DTH-DIST-02 for real router/collective arithmetic boundaries plus CAP-ISA-MOE-001 and CAP-ISA-DIST-002 for serving scheduling; multiple devices/nodes, all-to-all runtime, expert artifacts, topology-aware placement, distributed cache, and expanded authority remain unselected.
- Conservative laptop/resource estimate: Estimate: out of the single-8-GiB-GPU envelope; even if only 2 experts are active per token, total expert weight residency plus routing/communication exceeds the active parameter bytes and has no honest single-laptop acceptance time in seconds.
- Falsifiable gates: Mandatory closure reports zero real expert-serving claims; any future promotion requires actual artifact/output evidence, DTH-validated route/collective traces, total/active weight and peak per-device bytes, all-to-all volume, expert queue/utilization/capacity drops, p95/p99 latency, cancellation/rank/expert failure/recovery, and comparison with a dense serving baseline on declared hardware.
- Learner misconception risk: Sparse compute is not sparse storage by default, “active parameters” is not total memory, and expert count does not translate directly into quality or speed.
- Boundary: Future bounded multi-device expert-serving investigation only; CAP-DTH-MOE-02 owns real MoE routing/training validation, and this is not a functional-laptop requirement or fallback.

## CAP-AUDIT-POSITION-01 — Position Chapters 0–39 as the scalar reference core and hand off honestly
- Classification: mandatory-laptop-implementation
- Domain: reference-core
- Source evidence: SRC-DTH-EVAL-01 supports multiple-seed distributional reporting; SRC-ISA-034 supports documenting intended uses, evaluation conditions, limitations, and risk-relevant context, and neither source turns this course's local evidence into a quality claim.
- Current repo evidence: README.md:5-9, curriculum/course-plan.md:773-815 and :1594-1610, Chapter 0, Chapter 38, and Chapter 39 titles and handoffs use whole, complete, or functional language while their nearby scope text correctly bounds the current 1,188-parameter scalar fixture.
- Gap: The accurate limitations are not local to every isolated title, catalog, accessibility, terminal-output, and handoff role, so readers can infer that the reference integration already satisfies the accepted functional-laptop endpoint.
- Exact affected files: `README.md`; `curriculum/course-plan.md`; `curriculum/chapters/00-llm-parts.md`; `curriculum/chapters/32-decoder-model.md`; `curriculum/chapters/38-cached-generation.md`; `curriculum/chapters/39-end-to-end-llm.md`; `site/src/content/chapters/en/00-llm-parts.mdx`; `site/src/content/chapters/ru/00-llm-parts.mdx`; `site/src/content/chapters/en/32-decoder-model.mdx`; `site/src/content/chapters/ru/32-decoder-model.mdx`; `site/src/content/chapters/en/38-cached-generation.mdx`; `site/src/content/chapters/ru/38-cached-generation.mdx`; `site/src/content/chapters/en/39-end-to-end-llm.mdx`; `site/src/content/chapters/ru/39-end-to-end-llm.mdx`; `site/src/i18n/catalogs/en.json`; `site/src/i18n/catalogs/ru.json`; `rust/demos/ch39-end-to-end-llm/expected.txt`; `site/tests/00-llm-parts-diagram.test.ts`; `site/tests/32-decoder-model-diagram.test.ts`; `site/tests/38-cached-generation-diagram.test.ts`; `site/tests/39-end-to-end-llm-diagram.test.ts`; `site/tests/e2e/ch00-llm-parts.spec.ts`; `site/tests/e2e/ch32-decoder-model.spec.ts`; `site/tests/e2e/ch38-cached-generation.spec.ts`; `site/tests/e2e/ch39-end-to-end-llm.spec.ts`; `site/tests/content-contract.test.ts`.
- Dependencies: All current reference-core bytes remain authoritative for their bounded claims; reframe canonical English and machine evidence first, complete independent English review/adjudication, then translate directly to Russian and complete bilingual/target-only plus rendered Firefox review.
- Conservative laptop/resource estimate: Copy-only planning estimate below 1 GiB host RAM and 30 minutes deterministic checks before semantic review; rendered English/Russian Firefox review adds at most 2 hours and no GPU or download.
- Falsifiable gates: Pass if all 21 OVER-* rows in coverage have an exact reframe or preserve disposition, all 19 reframe rows name the bounded referent locally, both preserve rows remain unchanged in meaning, zero isolated learner roles use whole/complete/functional without a local scalar-reference referent, protected algorithms and numeric evidence match exactly, and both locale/review chains pass with zero blocking findings.
- Learner misconception risk: Without a local referent, a complete computation graph or batch-one program can be mistaken for realistic data quality, useful generation, complete resume, modern serving, post-training, safety, or production readiness.
- Boundary: Reframing must preserve the genuine Chapters 0–39 scalar oracle and integration achievement; it neither weakens current proofs nor claims any new laptop capability before implementation evidence exists.

## CAP-AUDIT-FROM-SCRATCH-ENDPOINT-01 — Compose one measured from-scratch narrow-domain laptop endpoint
- Classification: mandatory-laptop-implementation
- Domain: resource-envelope
- Source evidence: SRC-DTH-HW-01 establishes that the RTX 4070 Laptop GPU has 8 GB physical memory; SRC-DTH-EVAL-01 and SRC-DTH-EVAL-02 support multiple-seed distributional reporting and explicit experiment reporting, but no source predicts this course model's quality or runtime.
- Current repo evidence: Chapters 0–39 prove the scalar algorithms and one 1,188-parameter deterministic fixture, while CAP-DTH-DATA-01 through CAP-DTH-HW-01 specify the missing governed data, backend, memory, resume, evaluation, and resource contracts independently.
- Gap: Individually passing data, training, resume, evaluation, and serving capabilities could use different model/config/data identities and never demonstrate one coherent from-scratch model that trains, resumes, improves on frozen held-out evidence, and serves under the promised laptop envelope.
- Exact affected files: `curriculum/functional-laptop-llm-extension-plan.md`; `rust/crates/llm-from-scratch/src/pipeline.rs`; `rust/crates/llm-from-scratch/tests/functional_from_scratch_endpoint.rs`; proposed `audits/2026-08-10-functional-llm-capability/receipts/from-scratch-identity.json`; proposed `audits/2026-08-10-functional-llm-capability/receipts/from-scratch-training.json`; proposed `audits/2026-08-10-functional-llm-capability/receipts/from-scratch-resume.json`; proposed `audits/2026-08-10-functional-llm-capability/receipts/from-scratch-evaluation.json`; proposed `audits/2026-08-10-functional-llm-capability/receipts/from-scratch-serving.json`.
- Dependencies: CAP-DTH-DATA-01, CAP-DTH-DATA-02, CAP-DTH-DATA-03, CAP-DTH-DATA-04, CAP-DTH-TOK-02, CAP-DTH-BATCH-02, CAP-DTH-ARCH-02, CAP-DTH-BACKEND-01, CAP-DTH-MP-01, CAP-DTH-MEM-01, CAP-DTH-OPT-01, CAP-DTH-ART-01, CAP-DTH-PERSIST-01, CAP-DTH-RESUME-01, CAP-DTH-EVAL-02, CAP-DTH-OBS-01, CAP-DTH-HW-01, CAP-ISA-ARCH-003, CAP-ISA-ARCH-004, CAP-ISA-SRV-006, and CAP-ISA-SRV-007; artifact acquisition remains blocked on the resource contract.
- Conservative laptop/resource estimate: Provisional from-scratch ceiling: 8 GB VRAM physical, at most 6.25 GiB measured course allocation, 16 GB host RAM, 30 GB storage, at most 4 GB download, one core run at most 30 hours, and a cheaper at-least-3-seed profile at most 2 hours per seed and 6 hours combined; final values must be frozen before results.
- Falsifiable gates: Pass if one immutable identity graph binds corpus revision and licenses, tokenizer, model/config, optimizer/schedule, seed, backend/dtype, checkpoint, held-out policy, and served artifact; interruption at at least 3 frozen event boundaries resumes with exact discrete state and declared numeric tolerance; one RTX 4070 Laptop 8 GB core run remains within every ceiling and beats its predeclared narrow-domain baseline; a distinct cheaper profile completes at least 3 frozen seeds and reports every result plus spread/uncertainty; the same selected artifact serves locally with no hidden cloud.
- Learner misconception risk: A successful kernel test, a checkpoint replay, one favorable seed, or a server response can each look like a functional trained endpoint while failing to compose data identity, learned quality, resume, resource, and serving evidence.
- Boundary: This is a narrow-domain laptop demonstration, not a general-purpose chat model, production-scale training, benchmark leadership, broad safety proof, or evidence that results transfer to another GPU or corpus.
