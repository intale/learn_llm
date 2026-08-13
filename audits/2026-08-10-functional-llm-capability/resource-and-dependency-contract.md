# Functional laptop LLM resource and dependency contract

- Contract ID: `functional-laptop-llm-resource-v1`
- Status: `frozen-before-acquisition`
- Accepted capability coverage SHA-256: `42a2fd6ea482995c280f1c55d1a8c30a494968116edc57594579a7b1da2f4fb1`
- Accepted capability requirements SHA-256: `d3ae678bcfb1695c8c7e21ac047f2da5b415f31220842e3be07c9d4b7e6d4006`
- Accepted capability validator SHA-256: `ce71141c802c2411cc29a2322d20bef277a92ab550316cb4c295b13ac387bf0f`
- Input commit: `d719c6dae3dcc74675e1ecb19a2b1fabd89a5925`
- Hardware/profile evidence SHA-256: `3b386511afb3e1ddc4e87ca5df2ad5e66f21f5e0bfc515ea8692747623488f81`
- Dataset/model evidence SHA-256: `b8c14707c3b88ec0f08817f704638d01b3edadbccf533e3ffc6d427728075930`
- Dependency/artifact/persistence evidence SHA-256: `8552345408cc86639cb041d1fb2e097dc4cc3fc2aeadad067e17372ca9b9aebe`
- Scalar source manifest SHA-256: `397c5ff4b406adf9446eae525d1c7337e010c785d9e142d0e3eeaa09d4cf36e8` over exactly 40 regular files as C-sorted repository-relative `sha256sum` lines.
- Scope: one causal decoder-only autoregressive text/token model family, its resource planner, its future supporting-plumbing boundary, and its offline artifact provenance.
- Acquisition state: no corpus shard, model weight, CUDA artifact, database image, GPU kernel, or training job was acquired or executed by this contract step; pinned validation rebuilt the repository workspace image and rehydrated only the pre-existing locked Rust crate cache, selecting no dependency and changing no manifest, lockfile, or product source.

This is an admission contract, not evidence that the future GPU implementation has
already met the limits. An implementation may claim a named executable profile only
after its calibration and acceptance receipt passes. Until then the profile is
`planned`. A known violation, checked-arithmetic overflow, missing measurement, or
identity mismatch is a refusal before model, optimizer, KV-cache, or workspace
allocation.

## 1. Fixed model family and versioned configuration

The only model family is a bias-free pre-norm causal decoder with RMSNorm, RoPE,
grouped-query causal self-attention, SwiGLU, one input embedding table, and the
transpose of that same table as the text-token vocabulary head. Inputs are token IDs;
outputs are next-token logits. Encoder-only, encoder-decoder, bidirectional,
non-autoregressive, diffusion, image, audio, video, and multimodal models are not
implemented or planned by this contract.

The versioned semantic configuration owns `V`, `D`, `L`, `Hq`, `Hkv`, `F`, `C`,
RoPE policy/base, RMS epsilon, causal-mask policy, tied-head policy, vocabulary and
tokenizer identities, dtype policy, and parameter-family version. The versioned run
configuration owns `B`, `N`, microbatch, accumulation, seed streams, world size,
topology, sharding, collective policy, backend, device, kernel policy, and resource
profile. A compile feature may enable backend, device, or kernel plumbing only. It
must not encode any semantic dimension, capacity, topology, sharding, collective,
tokenizer, artifact, or model-family choice.

`model_schema(version=1;family=causal-decoder-only-autoregressive-text-token;normalization=pre-rmsnorm;position=rope;attention=causal-gqa;activation=swiglu;bias=false;embedding_head=tied-transpose;input=token-ids;output=text-token-logits)`

`config_ownership(semantic=V,D,L,Hq,Hkv,F,C,rope-policy,rope-base,rms-epsilon,causal-mask,tied-head,vocabulary-id,tokenizer-id,dtype-policy,parameter-family;run=B,N,microbatch,accumulation,seeds,world-size,topology,sharding,collectives,backend,device,kernel,resource-profile;features=backend,device,kernel)`

Every configuration is canonical UTF-8 JSON of at most 1 MiB with unique keys,
canonical unsigned integers, and no unknown schema-1 field. Every dimension and
count is positive where the schema does not explicitly admit zero. Parsing and
planning use checked `u128`; divisibility is proved before division, and each later
conversion to `u64`, `usize`, or a file offset is range-checked. Saturating,
wrapping, truncating, and floating-point resource arithmetic are forbidden. `D %
Hq = 0`, `Hq % Hkv = 0`, and the RoPE head width `D/Hq` is even. Every failure occurs
before allocation. No rounded profile name is an identity; the complete tuple and
its canonical serialization hash are.

`planner_arithmetic(version=1;input_bytes_max=1048576;encoding=canonical-json-utf8;keys=unique;integers=canonical-unsigned;arithmetic=checked-u128;dimensions=positive;division=exact-before-multiply;conversions=range-checked-u64-usize-file-offset;forbidden=saturating,wrapping,truncating,floating-resource-planning;failure=before-allocation)`

`scale(reference;V=266;D=4;L=1;Hq=1;Hkv=1;F=4;C=4;B=16;N=2048;P=1188)`

`scale(bridge;V=266;D=16;L=2;Hq=2;Hkv=2;F=20;C=16;B=8;N=65536;P=8304)`

`scale(laptop;V=16384;D=512;L=8;Hq=8;Hkv=2;F=1536;C=512;B=1;N=20000000;P=32514560)`

`scale(production-plan;V=128000;D=8192;L=80;Hq=64;Hkv=8;F=28672;C=32768;B=1;N=15000000000000;P=69500936192)`

The multi-seed sensitivity experiment uses the same schema but is deliberately not
one of the four scale-ladder identities: `V=8192,D=256,L=3,Hq=4,Hkv=1,F=768,C=256,
B=1,N=1000000,P=4359936`. It exists solely to measure sensitivity cheaply and its
distribution cannot be transferred to the 32.5M core point.

`evaluation_scale(seed-sensitivity;V=8192;D=256;L=3;Hq=4;Hkv=1;F=768;C=256;B=1;N=1000000;P=4359936;KV_bf16=196608;MAC_causal=1166213120;MAC_dense=1216348160)`

Changing only versioned settings must transform the reference model into bridge and
laptop models without a source edit or recompilation. `production-plan` must parse,
validate, and produce a cost ledger using the same code; the 8 GB profiles must then
reject it before allocation.

## 2. Exact accounting formulas

For the frozen bias-free, tied-head schema:

- Parameter elements: `P = V*D + L*(2*D*D + 2*D*D*Hkv/Hq + 3*D*F + 2*D) + D`.
- KV bytes: `KV_bytes = 2*B*L*C*Hkv*(D/Hq)*bkv`.
- Linear plus nonmasked-causal matmul MACs: `MAC_causal = B*C*(L*(2*D*D + 2*D*D*Hkv/Hq + 3*D*F) + D*V) + B*L*D*C*(C+1)`.
- Current materialized-dense-attention matmul MACs: `MAC_dense = B*C*(L*(2*D*D + 2*D*D*Hkv/Hq + 3*D*F) + D*V) + 2*B*L*D*C*C`.
- Persistent state bytes: `State_bytes = sum_i(round_up(elements_i*bytes_i, alignment_i))` over separately named weights, master weights, gradients, optimizer moments, scaler state, and persistent buffers. Aliased tied weights and views are counted once at their owning allocation.
- Peak activation bytes: `Activation_peak_bytes = max_event(sum_i(live_elements_i*bytes_i) + workspace_bytes_event)` over a generated liveness/event ledger.
- Communication bytes: `Comm_bytes = sum_event(message_count_event*payload_elements_event*dtype_bytes_event)` over the selected topology, with exactly zero events and zero bytes for `world_size=1`.
- Algorithmic FLOP reporting: each executed profile reports the explicit convention used to convert MACs and separately enumerates RMSNorm, RoPE, softmax, activation, masking, optimizer, recomputation, padding/tile, and other scalar/kernel operations. Neither MAC formula may be relabeled total FLOPs.

`mac_causal(reference=76544;bridge=1122304;laptop=17718837248;production-plan=2981072375644160)`

`mac_dense(reference=77312;bridge=1183744;laptop=18790481920;production-plan=3684738342584320)`

`kv_bf16_full_context(reference=1024;bridge=16384;laptop=2097152;production-plan=10737418240)`

For the conservative mandatory WGPU mixed-precision AdamW admission census, every
dense trainable parameter contributes 18 bytes: FP16 working weight 2, FP32 master weight
4, FP32 accumulated gradient 4, and two FP32 moments 8. Scaler, alignment, excluded
or frozen parameters, adapter-only state, and every nonparameter buffer remain named
separate census entries. The following dense-parameter witnesses deliberately use
alignment 1 and zero extras, so they are lower bounds rather than total planned
`State_bytes`; executed tensor enumeration is authoritative. The production-only
record uses BF16 accounting for its future-backend plan.

`dense_parameter_state_lower_bound(alignment=1;extras=0;reference_fp16=2376;reference_fp32=4752;reference_mixed_adamw=21384;bridge_fp16=16608;bridge_fp32=33216;bridge_mixed_adamw=149472;laptop_fp16=65029120;laptop_fp32=130058240;laptop_mixed_adamw=585262080;production_bf16=139001872384;production_fp32=278003744768;production_mixed_adamw=1251016851456)`

All executable profiles select `world_size=1`, `topology=single-device`,
`sharding=none`, `collectives=none`, an empty communication event ledger, and
`Comm_bytes=0`. A plan-only TP=8 ring fixture demonstrates that scale settings can
carry nonzero topology without a compiler fork or execution claim: 2 all-reduce
events per layer for 80 layers, each event has 14 per-rank messages of 33,554,432
BF16 elements, or 939,524,096 bytes per rank/event; 160 events total
150,323,855,360 bytes per rank and 1,202,590,842,880 bytes across eight ranks.

`communication_fixture(id=production-tp8-forward-plan;world_size=8;topology=tensor-parallel-ring;layers=80;events_per_layer=2;events=160;messages_per_rank_event=14;payload_elements_per_message=33554432;dtype_bytes=2;bytes_per_rank_event=939524096;bytes_per_rank=150323855360;bytes_all_ranks=1202590842880;execution=none)`

The planner emits every named tensor/event subtotal, formula inputs, checked result,
and measured peak. An implementation receipt fails if an enumerated subtotal does
not sum to the reported result, if a measured allocator peak exceeds its plan or
profile ceiling, or if a selected kernel's padded/tiled executed-operation count is
not reported separately.

## 3. Internal prepared-input seam

The implementation will extract exactly one crate-private sealed
`PreparedDecoderInput` checked constructor after text embedding lookup. It carries
the residual tensor `[B,T,D]`, absolute positions, causal attention and segment
metadata, loss eligibility, provenance identity, semantic/run configuration hashes,
dtype, device, and artifact identity. It rejects an empty or mismatched dimension,
position overflow, cross-segment mask inconsistency, loss-mask mismatch, unsupported
dtype/device, stale config, or artifact mismatch before any decoder block or cache
allocation executes.

The ordinary text token-ID path and cached single-token path are its only supported
producers. They share one internal causal block-stack/final-normalization/tied-head
core. A differential refactor receipt must preserve parameter names and order,
embedding values, logits, loss, gradients, KV rows and cursor, generated tokens,
RNG state, errors, and work counters on frozen full-sequence and cached fixtures.

This seam reserves clean internal architecture without claiming an adapter. It adds
no public generic input trait, modality enum, non-text producer, image/audio/video
parser, encoder, projector, resampler, cross-attention path, dataset, output head,
dependency, learner claim, or second encoder/decoder.

`prepared_input(version=1;visibility=crate-private;shape=B,T,D;metadata=positions,attention-mask,segment-ids,loss-eligibility,provenance-id,semantic-config-sha256,run-config-sha256,dtype,device,artifact-id;producers=text-token-ids,cached-text-token;core=one-causal-decoder;tied-text-head=true)`

## 4. Named execution and admission profiles

All byte ceilings are powers-of-two GiB/MiB unless a field explicitly says decimal
download bytes. `device-allocation` covers course-owned live device allocations and
workspace. Device-wide free-memory checks additionally preserve headroom for the
display/driver/other processes. A profile is refused before allocation when its
planner cannot prove every ceiling.

The three RTX profiles require an NVML-reported NVIDIA GeForce RTX 4070 Laptop GPU,
compute capability 8.9, total device memory at least 7,945,689,498 bytes (the ceiling
of 7.4 GiB), and free device memory at startup at least 7,516,192,768 bytes (7.0 GiB).
Free device memory at measured peak remains at least 536,870,912 bytes. The product
label “8 GB” is neither interpreted as 8 GiB nor accepted without the runtime
identity/capability/memory receipt.

The core's 6,710,886,400-byte course allocation is partitioned into hard component
ceilings: 805,306,368 bytes persistent parameter/gradient/optimizer/scaler state;
3,221,225,472 bytes saved/recomputed activation liveness; 1,610,612,736 bytes kernel
workspace; 67,108,864 bytes KV state; 67,108,864 bytes batches/masks/metadata; and
939,524,096 bytes allocator fragmentation/slack. The exact sum is 6,710,886,400.
No component borrows another component's ceiling without a new profile version and
pre-result decision.

`device_admission(name=rtx4070-laptop-8gb;nvml-name=NVIDIA-GeForce-RTX-4070-Laptop-GPU;compute-capability=8.9;total_bytes_min=7945689498;startup_free_bytes_min=7516192768;peak_free_bytes_min=536870912)`

`core_partition(state=805306368;activations=3221225472;workspace=1610612736;kv=67108864;batch_metadata=67108864;slack=939524096;total=6710886400)`

`calibration_policy(id=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;synchronized_microsteps_min=100;windows=10;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;warmup=discard-named-segment;hidden-fallback=reject)`

### PROFILE-REFERENCE-CI

- State: planned
- Model scale: reference
- Backend/device/dtype: scalar CPU / host / f64
- Parameter ceiling: 1,188; the 8,304 bridge is parsed and checked in a separate census/differential fixture
- Context ceiling: 4 tokens
- Valid train-token ceiling: 2,048
- Microbatch ceiling: 16 sequences
- Accumulation ceiling: 1 microstep per optimizer update
- Host-RAM ceiling: 256 MiB process peak
- Installed host RAM: at least 1 GiB; 1 GiB recommended
- Device-allocation ceiling: 0 bytes
- Device-wide headroom floor: not applicable
- Working-disk ceiling: 1 GiB
- Download ceiling: 0 bytes
- Wall-time ceiling: 10 minutes for complete deterministic tests
- Throughput calibration: not an admission dependency; report tokens/second after a synchronized warmup-free timed region
- Admission/refusal: reject non-scalar backend, any GPU allocation, any network input, or any scale/config mismatch before execution

`profile(reference-ci;state=planned;scale=reference;device=cpu;dtype=f64;P_max=1188;C_max=4;N_max=2048;microbatch_max=16;accumulation_max=1;installed_host_bytes_min=1073741824;installed_host_bytes_recommended=1073741824;host_bytes_max=268435456;device_bytes_max=0;device_headroom_bytes_min=0;disk_bytes_max=1073741824;download_bytes_max=0;wall_seconds_max=600;calibration_tokens_min=0)`

### PROFILE-BRIDGE-CI

- State: planned
- Model scale: bridge
- Backend/device/dtype: scalar CPU / host / f64
- Parameter ceiling: 8,304
- Context ceiling: 16 tokens
- Valid train-token ceiling: 65,536
- Microbatch ceiling: 8 sequences
- Accumulation ceiling: 1 microstep per optimizer update
- Installed host RAM: at least 1 GiB; 1 GiB recommended
- Host-RAM ceiling: 256 MiB process peak
- Device-allocation ceiling: 0 bytes
- Device-wide headroom floor: not applicable
- Working-disk ceiling: 1 GiB
- Download ceiling: 0 bytes
- Wall-time ceiling: 10 minutes
- Throughput calibration: not an admission dependency; report synchronized valid tokens/second
- Admission/refusal: same scalar-only, offline, exact-config, and preallocation rules as reference CI

`profile(bridge-ci;state=planned;scale=bridge;device=cpu;dtype=f64;P_max=8304;C_max=16;N_max=65536;microbatch_max=8;accumulation_max=1;installed_host_bytes_min=1073741824;installed_host_bytes_recommended=1073741824;host_bytes_max=268435456;device_bytes_max=0;device_headroom_bytes_min=0;disk_bytes_max=1073741824;download_bytes_max=0;wall_seconds_max=600;calibration_tokens_min=0)`

### PROFILE-8GB-GPU-SMOKE

- State: planned and not executable until the accelerator dependency graph is approved
- Model scale: laptop, with a smoke-only run profile
- Backend/device/dtype: WGPU Vulkan / exact admitted RTX 4070 Laptop GPU / FP16 working storage and compute, FP32 accumulation, reductions, gradients, master weights and Adam state, with `DynamicV1` loss scaling
- Parameter ceiling: 32,514,560
- Context ceiling: 128 tokens
- Valid train-token ceiling: 65,536
- Microbatch ceiling: 1 sequence
- Accumulation ceiling: 8 microsteps per optimizer update
- Host-RAM ceiling: 8 GiB process peak
- Installed host RAM: at least 8 GiB; 16 GiB recommended
- Device-allocation ceiling: 2 GiB
- Device-wide headroom floor: 512 MiB at peak
- Working-disk ceiling: 5,000,000,000 bytes
- Download ceiling: 536,870,912 bytes across already approved offline inputs; this contract downloads 0
- Wall-time ceiling: 15 minutes after provisioned offline dependencies
- Throughput calibration: discard a named warmup, then measure at least 100 synchronized successful microsteps and at least 300 seconds with a hard 900-second probe ceiling, divided into 10 equal-duration windows and totaling at least 10,240 valid tokens; admit the lower of aggregate throughput and the 10th-percentile window throughput only when it is at least 128 valid tokens/second and the second-half median remains at least 85% of the first-half median
- Admission/refusal: require WGPU `SHADER_F16` and measured actual FP16 execution; reject an unverified device identity, insufficient free memory, unsupported actual dtype/kernel, hidden CPU or f32 fallback, one-byte-over plan, or calibration projected beyond the wall ceiling

`profile(8gb-gpu-smoke;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=128;N_max=65536;microbatch_max=1;accumulation_max=8;installed_host_bytes_min=8589934592;installed_host_bytes_recommended=17179869184;host_bytes_max=8589934592;device_bytes_max=2147483648;device_headroom_bytes_min=536870912;disk_bytes_max=5000000000;download_bytes_max=536870912;wall_seconds_max=900;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=128;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)`

### PROFILE-8GB-SEED-SENSITIVITY

- State: planned and dependent on the same smoke/dependency/corpus gates as core
- Model scale: exact `seed-sensitivity` configuration with 4,359,936 parameters
- Backend/device/dtype: exact smoke-admitted WGPU Vulkan FP16/FP32-protected `DynamicV1` policy
- Context ceiling: 256 tokens
- Valid train-token ceiling: 1,000,000 per seed
- Microbatch ceiling: 1 sequence
- Accumulation ceiling: 32 microsteps per update
- Installed host RAM: at least 16 GiB; 32 GiB recommended
- Host-RAM ceiling: 8 GiB process peak
- Device-allocation ceiling: 4 GiB
- Device-wide headroom floor: 512 MiB at peak
- Working-disk ceiling: 10,000,000,000 bytes
- Download ceiling: 0 new bytes; reuse only the hash-verified core input cache
- Wall-time ceiling: 7,200 seconds per seed and 21,600 seconds across all three
- Throughput calibration: for each seed, use the same 300–900-second, at-least-100-synchronized-microstep, 10-window lower-aggregate-or-p10 protocol and 85% anti-throttling floor; require at least 200 valid tokens/second and a checked per-seed projection within 7,200 seconds
- Admission/refusal: exactly seeds 104729, 130363, and 15485863; no replacement, best-seed selection, or transfer of its interval to core

`profile(8gb-seed-sensitivity;state=planned;scale=seed-sensitivity;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=4359936;C_max=256;N_max=1000000;microbatch_max=1;accumulation_max=32;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=8589934592;device_bytes_max=4294967296;device_headroom_bytes_min=536870912;disk_bytes_max=10000000000;download_bytes_max=0;wall_seconds_max=7200;all_seeds_wall_seconds_max=21600;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=200;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;seeds=104729,130363,15485863)`

### PROFILE-8GB-GPU-CORE

- State: planned and not executable until smoke, calibration, dependencies, and corpus receipts pass
- Model scale: laptop
- Backend/device/dtype: the exact smoke-admitted WGPU Vulkan FP16/FP32-protected `DynamicV1` policy
- Parameter ceiling: 32,514,560
- Context ceiling: 512 tokens
- Valid train-token ceiling: 20,000,000
- Microbatch ceiling: 1 sequence
- Accumulation ceiling: 64 microsteps per optimizer update and at most 32,768 valid tokens per update
- Host-RAM ceiling: 12 GiB process peak
- Installed host RAM: at least 16 GiB; 32 GiB recommended
- Device-allocation ceiling: 6.25 GiB (6,710,886,400 bytes)
- Device-wide headroom floor: 512 MiB at peak
- Working-disk ceiling: 30,000,000,000 bytes
- Download ceiling: 4,000,000,000 bytes across all acquired inputs
- Wall-time ceiling: 30 hours for one frozen core run
- Throughput calibration: use the 300–900-second, at-least-100-synchronized-microstep, 10-window lower-aggregate-or-p10 protocol and 85% anti-throttling floor; require at least 350 valid tokens/second and checked projection `3,600 + 1.5*N/rate <= 108,000` seconds; otherwise refuse and redesign before seeing quality results
- Admission/refusal: reject a missing/changed calibration, projected time excess, insufficient free memory/disk, state/activation/workspace excess, unbound data/config/kernel identity, hidden fallback, or production-plan config before allocation

`profile(8gb-gpu-core;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=512;N_max=20000000;microbatch_max=1;accumulation_max=64;valid_tokens_per_update_max=32768;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=30000000000;download_bytes_max=4000000000;wall_seconds_max=108000;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=350;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;projection=fixed3600-plus-1.5N-over-rate)`

### PROFILE-8GB-ADAPTER

- State: blocked until one compatible open model revision and its derivative-license path are selected
- Model scale: an exact selected 20M–50M decoder-only revision compatible with the same model schema; no architecture approximation
- Backend/device/dtype: the core-admitted WGPU Vulkan device with artifact-declared FP16/FP32-protected `DynamicV1` adaptation and exact derivative inference policy
- Parameter ceiling: 50,000,000
- Context ceiling: 512 tokens
- Valid adaptation-token ceiling: 1,048,576
- Microbatch ceiling: 1 sequence
- Accumulation ceiling: 32 microsteps per optimizer update
- Host-RAM ceiling: 12 GiB process peak
- Installed host RAM: at least 16 GiB; 32 GiB recommended
- Device-allocation ceiling: 6.25 GiB (6,710,886,400 bytes)
- Device-wide headroom floor: 512 MiB at peak
- Working-disk ceiling: 20 GiB (21,474,836,480 bytes)
- Download ceiling: 536,870,912 bytes
- Wall-time ceiling: 12 hours for import, nonzero SFT, bounded preference update, evaluation, and serving smoke after acquisition
- Throughput calibration: for SFT and preference phases separately, use the 300–900-second, at-least-100-synchronized-microstep, 10-window lower-aggregate-or-p10 protocol and 85% anti-throttling floor; require at least 100 SFT response tokens/second and at least 25 preference response tokens/second, then project every lifecycle phase separately
- Admission/refusal: remain blocked until exact compatible config, revision, model card, license chain, bytes, hashes, tokenizer/template, and acquisition manifest pass; reject any architecture translation, larger/smaller fallback, zero update, or identity discontinuity

`profile(8gb-adapter;state=blocked-artifact-selection;scale=selected-compatible-20m-50m;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound;P_max=50000000;C_max=512;N_max=1048576;microbatch_max=1;accumulation_max=32;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=21474836480;download_bytes_max=536870912;wall_seconds_max=43200;calibration_policy=gpu-synchronized-v1;probe_seconds_min_per_phase=300;probe_seconds_max_per_phase=900;probe_synchronized_microsteps_min_per_phase=100;probe_windows=10;calibration_tokens_min=10240;throughput_sft_response_tokens_per_second_min=100;throughput_preference_response_tokens_per_second_min=25;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)`

### PROFILE-PRODUCTION-PLAN-ONLY

- State: parse/cost/refuse only
- Model scale: production-plan
- Backend/device/dtype: planning metadata only / no device / BF16 accounting plus declared topology
- Parameter ceiling: exactly 69,500,936,192 for this fixture
- Context ceiling: 32,768 tokens
- Train-token planning value: 15,000,000,000,000
- Microbatch planning value: 1 sequence
- World/topology: a versioned non-laptop planning value supplied by the manifest
- Host-RAM ceiling: 256 MiB for parsing and checked cost planning
- Installed host RAM: at least 1 GiB; 1 GiB recommended
- Device-allocation ceiling: 0 bytes
- Working-disk ceiling: 64 MiB planning output
- Download ceiling: 0 bytes
- Wall-time ceiling: 30 seconds
- Throughput calibration: none; no production throughput claim is permitted
- Admission/refusal: emit exact costs, including BF16 full-context KV = 10,737,418,240 bytes, then reject every executable laptop profile before tensor/KV/workspace allocation

`profile(production-plan-only;state=plan-refuse;scale=production-plan;device=none;dtype=bf16-accounting;P_max=69500936192;C_max=32768;N_max=15000000000000;microbatch_max=1;accumulation_max=1;installed_host_bytes_min=1073741824;installed_host_bytes_recommended=1073741824;host_bytes_max=268435456;device_bytes_max=0;device_headroom_bytes_min=0;disk_bytes_max=67108864;download_bytes_max=0;wall_seconds_max=30;calibration_tokens_min=0)`

## 5. Measurement, failure atomicity, and reproducibility

Every executable receipt binds canonical semantic/run config bytes and SHA-256,
source commit, complete dependency receipt, device identity, driver/backend/kernel
identity, dtype policy, artifact DAG root, allocator counters, synchronized timer
method, measured tokens, valid-token denominator, and all thresholds/seeds frozen in
that implementation fingerprint before results are observed.

The canonical configuration manifest owns the exact decoder schema, all semantic
and run fields, tokenizer and artifact identities, and selected resource profile.
The separate run manifest binds that configuration to the source/dependency/device
stack, artifact DAG, checked plan, measured counters, frozen decisions, phase, and
terminal state. Both reject unknown schema-1 fields and use the canonical JSON and
SHA-256 identity rules in Section 6.

`config_manifest(version=1;canonical-json=true;identity=sha256;binds=model-schema,semantic-fields,run-fields,tokenizer-id,artifact-id,resource-profile;unknown-fields=reject)`

`run_manifest(version=1;canonical-json=true;identity=sha256;binds=semantic-config-sha256,run-config-sha256,source-commit,dependency-receipt-sha256,device-driver-backend-kernel-dtype-identity,artifact-dag-root,resource-profile,resource-plan,allocator-counters,thresholds,seeds,phase,terminal-state;unknown-fields=reject)`

CPU/reference resume is bitwise for parameters, gradients, moments, cursors, all RNG
streams, counters, and next batch. GPU resume restores discrete cursor/RNG/event and
artifact state exactly. It uses deterministic mode where the selected kernel/backend
supports it; every remaining numeric difference uses a predeclared per-operation and
end-to-end absolute/relative/ULP contract rather than a post-result tolerance.

For every numeric element, both conditions combine as
`abs(actual-reference) <= atol + rtol*max(abs(actual),abs(reference))`; NaN,
infinity, finite/nonfinite class, signed-zero policy, discrete decisions, and shape
metadata never pass by tolerance. Low-precision oracles first round inputs to the
actual storage bits, decode them to f64, then run the course scalar operation.
For f32 dot/matmul with reduction length `k`, `u=2^-24`, and `k*u<1`, the bound is
`4*gamma_k*sum_i(abs(a_i*b_i)) + output_rounding_bound`, where
`gamma_k=(k*u)/(1-k*u)`. Unknown accumulation, `k*u>=1`, or an unbounded fused
algorithm refuses.

The BF16 tolerance records below are frozen only for a future safe native-BF16
backend and production-plan comparison. They do not authorize BF16 on WGPU or
satisfy any executable laptop profile; the mandatory WGPU path uses the FP16
records and protected FP32 state.

`numeric_policy(version=1;combine=atol-plus-rtol-max-abs;f32-u=2^-24;gamma-k=k*u/(1-k*u);dot-matmul-bound=4*gamma-k*sum-abs-products-plus-output-rounding;require=k*u<1;unknown-accumulation=refuse;nonfinite=exact-class;discrete=exact)`

`tolerance(id=scalar-f64;atol=0;rtol=0;extra=bitwise-bytes-and-events)`

`tolerance(id=f32-elementwise;atol=0.000001;rtol=0.00001;extra=exact-special-value-policy)`

`tolerance(id=f32-rmsnorm-softmax-rope-logits-loss;atol=0.00001;rtol=0.0001;extra=probability-row-sum-0.00001-and-masked-zero)`

`tolerance(id=f32-gradients-update;atol=0.00001;rtol=0.0005;extra=gradient-cosine-0.99999-and-same-clip-skip)`

`tolerance(id=bf16-stored-primitive;atol=0.0078125;rtol=0.015625;extra=decode-exact-bf16-bits)`

`tolerance(id=bf16-logits-loss;atol=0.03125;rtol=0.03125;extra=top1-margin-over-twice-max-error)`

`tolerance(id=bf16-gradients-update;atol=0.0625;rtol=0.0625;extra=gradient-cosine-0.999-and-same-clip-overflow-skip)`

`tolerance(id=fp16-stored-primitive;atol=0.001953125;rtol=0.00390625;extra=exact-fp16-bits-and-loss-scaling)`

`tolerance(id=fp16-logits-loss;atol=0.015625;rtol=0.015625;extra=finite-and-top1-margin)`

`tolerance(id=fp16-gradients-update;atol=0.03125;rtol=0.03125;extra=gradient-cosine-0.999-and-same-unscale-clip-skip)`

The test matrix includes scalar-versus-accelerated forward and backward operations,
full versus packed/microbatched execution, checkpointed versus non-checkpointed
execution, uninterrupted versus resumed execution, and full-sequence versus cached
decoding. Exact discrete identities, shapes, masks, cursor/event ordering, selected
tokens, cache occupancy, hashes, and error categories are always exact. Numeric
tolerances are operation-, dtype-, and reduction-order-specific and frozen with the
test fixture before execution.

A GPU trap proves a forced GPU profile did not execute on CPU; a scalar trap proves
an optimized CPU profile did not silently use the scalar oracle. An injected OOM at
every allocation/commit phase must preserve the last-good checkpoint, RNG/cursor,
cache/page ownership, filesystem state, and response state. One-byte-over-limit
fixtures reject before large allocation. No partial artifact is published.

`freeze_policy(version=1;before-result=quality-thresholds,equivalence-tolerances,resource-limits,latency-limits,memory-limits,seeds,selection-rule,stopping-rule,overlap-threshold;replacement-after-result=forbidden)`

`resume_policy(cpu=bitwise;gpu-discrete=exact;gpu-numeric=predeclared-deterministic-or-tolerance;hidden-fallback=forbidden;oom=atomic-last-good)`

The frozen seed registry is purpose-separated and counter-based. The one expensive
core point uses seed 39. Cheaper sensitivity uses three complete otherwise-identical
seeds 104729, 130363, and 15485863 under its separate at-most-two-hour-each profile;
its distribution is never transferred to the core point. Adapter SFT seeds are
41,43,47; preference-update seeds 53,59,61; stochastic generation/evaluation seeds
101,103,107,109,127. Stream IDs are initialization 1, corpus order 2, packing 3,
optional dropout 4, sampling 5, evaluation bootstrap 6. No best-seed substitution or
replacement after a failure is allowed.

`seed_registry(version=1;reference=39;gpu-smoke=4070;core=39;cheap-sensitivity=104729,130363,15485863;adapter-sft=41,43,47;adapter-preference=53,59,61;generation-evaluation=101,103,107,109,127;stream-initialization=1;stream-corpus-order=2;stream-packing=3;stream-optional-dropout=4;stream-sampling=5;stream-evaluation-bootstrap=6)`

Dataset/model-specific quality thresholds are intentionally not invented before the
filtered split, imported base, and metric scale exist. Their absence is a blocking
preflight state, not permission to report. The design-created implementation
fingerprint must freeze exact retained-corpus hashes, overlap limit, baselines,
metrics, quality thresholds, selection/stopping rules, evaluation cases, and seed
pairing before the first corresponding model output or held-out result is observed.

## 6. Artifact acquisition and offline provenance

This step authorizes no bulk acquisition. The curriculum design must create one
separate bulk-artifact acquisition step after resource/profile/dependency approval.
It uses resumable bounded downloads only for the exact approved entries, verifies
the downloaded bytes in staging, and atomically promotes them into a gitignored
content-addressed cache. Raw corpora, model weights, converted weights, and generated
training artifacts never enter Git.

Each acquisition entry contains:

- stable artifact ID and kind;
- exact upstream revision (commit/tag/dataset revision, never a floating branch);
- requested URL and final resolved URL after redirects;
- SHA-256 of exact bytes and exact byte count;
- media type and archive/compression/member rules;
- upstream license identifier plus SHA-256 of the exact retained license text;
- attribution/model-card/dataset-card references;
- source data and transformation provenance;
- SHA-256 of every filtering/conversion script and its canonical configuration;
- redistribution decision separately for raw input, derived model, and adapter;
- expected cache path, atomic temporary path, and offline-consumer identity;
- refusal behavior for redirect drift, range mismatch, excess bytes, hash/license/
  media mismatch, archive traversal, duplicate member, decompression bomb, or missing
  provenance.

`acquisition_manifest(version=1;required=artifact-id,kind,upstream-revision,requested-url,resolved-url,sha256,bytes,media-type,license-id,license-text-sha256,attribution,provenance,filter-script-sha256,filter-config-sha256,redistribution,cache-path;publication=staged-verify-atomic;raw-cache=gitignored;network=separate-declared-step)`

Every managed dataset/config/tokenizer/weight/adapter/checkpoint/evaluation bundle
contains canonical `artifact-manifest.json` bytes plus an exact payload inventory.
Canonical JSON is compact UTF-8 without BOM, has keys sorted by UTF-8 bytes, unique
keys at every level, no defaulted or unknown schema-1 fields, canonical integers or
hex IEEE bits for identity-bearing numerics, declared array ordering, and exactly one
final LF. Portable payload paths forbid absolute paths, empty/dot/dot-dot segments,
backslashes, drive prefixes, NULs, symlinks, hardlinks, devices, and case collisions.
Every payload regular file appears exactly once with role, media type, size, and
SHA-256; there are no unindexed bytes. Bundle identity is the SHA-256 of the canonical
manifest, not a filename, ETag, extension, or authenticity signature.

Common provenance binds producer/tool/source commit/build/invocation receipt;
publisher/project/upstream URI/revision/file/hash; retained cards and exact license
texts; per-role redistribution decision; transformation receipts; format name,
version, immutable specification revision and hash; parent/data/base/config/tokenizer/
template/adapter/evaluation links; exact decoder-family compatibility; and declared
file/tensor/rank/dimension/metadata byte limits.

The mandatory dense interchange is SafeTensors syntax plus the course wrapper. Its
payload records the pinned SafeTensors release, header length/hash, file/shard index,
and every tensor's canonical course name, external name, dtype, shape, byte range,
alias owner, finite policy, and conversion receipt. The loader verifies whole-file
hash, bounded header and offsets, no holes/overlaps/duplicates, exact census/config/
tokenizer identity, shard completeness, and value policy before allocating tensors.
SafeTensors does not replace Chapter 35's course-owned checkpoint wire format.

The later served quantized derivative uses one commit-pinned GGUF v3 subset only
after its bounded parser gate. Its wrapper binds dense-parent and quantization
receipts, architecture/config/tokenizer mappings, exact tensor types/shapes/offsets,
packing/scales/zero-points, and supported metadata keys. Unknown versions, families,
types, quantizers, sidecars including `mmproj`, duplicate keys, unsafe sizes/offsets,
or an architecture approximation reject. Course code owns quantization,
dequantization, calibration, quality, semantic name mapping, and parity; a format
parser cannot perform them.

Adapter manifests bind the exact dense and optional served quantized base, semantic
config/tokenizer/template, method/rank/scale/target tensors, trainable tensor census,
training-run receipt, parent adapter/checkpoint, nonzero-update proof, and base-frozen
proof. A preference successor is a new artifact whose lineage includes its SFT-parent
hash; it never overwrites the SFT artifact. Complete-resume manifests additionally
bind dataset/split/filter/batch cursor, every RNG stream, accumulation numerator and
valid-token denominator, parameter/gradient/optimizer/scaler/scheduler state,
evaluation state, backend/kernel/numeric contract, counters, and prior checkpoint.

`artifact_schema(version=1;canonical-json=true;identity=manifest-sha256;kinds=dataset,config-manifest,run-manifest,tokenizer,dense-safetensors,quantized-gguf-v3-subset,adapter,reference-checkpoint,training-resume,retrieval-fixture,evaluation;unknown-fields=reject;payload-coverage=exact;paths=portable-regular-only)`

`dense_format(name=safetensors;release=0.8.0;role=container-syntax-only;course-wrapper=required;chapter35-checkpoint-replacement=false)`

`quantized_format(name=gguf;version=3;status=required-later-but-parser-unselected;subset=one-commit-pinned-decoder-only-family;sidecars=reject;quantization-course-owned=true)`

The original TinyStories train and validation text files are selected as raw-source
inputs for the later governed acquisition step. The selection is narrow: it does not
select the repository snapshot, Parquet conversion, NumPy/Pickle artifact, archive,
GPT-4-only variant, pretrained model, filtered corpus, split, tokenizer, model, or
adapter. The raw pair is English synthetic short stories attributed to GPT-3.5 and
GPT-4 generation, declared `CDLA-Sharing-1.0`, and totals 1,943,728,838 bytes. Its
license, domain, and origin are limitations, not quality or privacy guarantees.

The raw selection remains nonexecutable until acquisition captures the exact official
license-text bytes/hash and attribution; strict streaming UTF-8 parsing; record
framing; PII/secret and manual-review receipts; exact and inspectable near-duplicate
components; prompt/train/held-out overlap; stable component-grouped validation/test
partition; deletion lineage; and frozen filter/split/tokenizer identities. Only the
training file may affect tokenizer learning and parameter updates. The validation
file supplies whole-story records that are grouped and frozen into validation and an
untouched test role before tuning. The source's English-only synthetic story domain
cannot support Russian-language, natural-corpus, broad-language, privacy, or
independent-generalization claims.

Dataset license never implies a derived model or adapter license. Raw/enhanced data
redistribution, computational-result/weight redistribution, tokenizer, SFT fixture,
preference successor, adapter, GGUF derivative, and generated samples each receive a
separate decision. A later qualified license review and extraction/leakage gate are
required before calling weights a redistributable computational result.

`source_file(id=tinystories-train-raw;kind=raw-corpus;revision=f54c09fd23315a6f9c86f9dc80f725de7d8f9c64;relative-path=TinyStories-train.txt;resolved-url=https://huggingface.co/datasets/roneneldan/TinyStories/resolve/f54c09fd23315a6f9c86f9dc80f725de7d8f9c64/TinyStories-train.txt;bytes=1924281556;sha256=c5cf5e22ff13614e830afbe61a99fbcbe8bcb7dd72252b989fa1117a368d401f;media-type=text/plain-utf8-expected;license=CDLA-Sharing-1.0;language=en;domain=synthetic-short-stories;acquisition=blocked-until-manifest)`

`source_file(id=tinystories-valid-raw;kind=raw-heldout-source;revision=f54c09fd23315a6f9c86f9dc80f725de7d8f9c64;relative-path=TinyStories-valid.txt;resolved-url=https://huggingface.co/datasets/roneneldan/TinyStories/resolve/f54c09fd23315a6f9c86f9dc80f725de7d8f9c64/TinyStories-valid.txt;bytes=19447282;sha256=94e431816c4cce81ff71e4408ff8d3bda9a42e8d2663986697c3954288cb38b4;media-type=text/plain-utf8-expected;license=CDLA-Sharing-1.0;language=en;domain=synthetic-short-stories;acquisition=blocked-until-manifest)`

`candidate(dataset;disposition=selected-raw-source-only;id=roneneldan-TinyStories-original-text-pair;revision=f54c09fd23315a6f9c86f9dc80f725de7d8f9c64;bytes=1943728838;license=CDLA-Sharing-1.0;derived-corpus=blocked-filter-split-license-receipts)`

`candidate(imported-model;disposition=deferred;reason=selection-requires-exact-revision-compatible-schema-license-model-card-bytes-tokenizer-template-and-derivative-license-path)`

The pinned Pythia-31M and TinyStories-33M candidates are rejected because their
GPT-NeoX/GPT-Neo LayerNorm/GELU/position/attention/bias/tied-head semantics differ
from the accepted decoder. Karpathy's pinned `stories42M.bin` is the leading deferred
candidate because its related primary code is Llama-shaped and its bytes fit, but its
artifact repository does not bind the weight to exact config/tensors, tokenizer,
training-code revision, seed, corpus revision, or a complete weight-license and
conversion chain. A private prepared-input seam cannot convert incompatible math.

`model_candidate(id=EleutherAI-pythia-31m;revision=e556ace21b489575e94e9d50b6dad2fcc7419679;artifact=model.safetensors;bytes=60997960;sha256=02ddadd516061264cd44b47c84ae49c6641f869e6d3f06c7d0e4855f31e34059;disposition=rejected-incompatible-gpt-neox)`

`model_candidate(id=roneneldan-TinyStories-33M;revision=2ad0a164221b7c4d21cac7c46aec74f6f98dbfc8;artifact=pytorch_model.bin;bytes=290854321;sha256=41316d3bad3cf7766cbc36443a71c5ef05321a1c4fa14855df537998c6dad302;disposition=rejected-incompatible-gpt-neo-and-incomplete-license-tokenizer)`

`model_candidate(id=karpathy-stories42M;revision=0bd21da7698eaf29a0d7de3992de8a46ef624add;artifact=stories42M.bin;bytes=167020572;sha256=9f65a1000e17d0bc167dd6332e0ce5119a0222a3d920cead5bce413bfab2ee7b;disposition=deferred-leading-candidate-incomplete-config-tokenizer-training-license-conversion-lineage)`

## 7. Supporting dependency boundary

The current scalar reference remains dependency-light and byte-protected. New
dependencies live behind explicit adapters/crates and a complete direct/transitive
allowlist. A supporting dependency supplies general-purpose plumbing only; course
Rust retains every operation learners predict, inspect, reproduce, or compare.

Permitted roles are checked allocation/storage, host↔device transfer, device/stream
management, GEMM or narrowly selected primitive dispatch under the scalar oracle,
standard tensor-container parsing, JSON/HTTP/SSE/CLI/TLS/compression/checksum
plumbing, metrics emission, and optional database client/pool/migration plumbing
only if its profile is separately selected. Each call site remains course-owned for
shape/layout, masking, ordering, identity, admission, authorization, and failure
atomicity.

Forbidden replacement roles are tokenization/pretokenization/BPE policy, corpus
filtering/dedup/packing, causal or segment masking, RoPE, attention or online
softmax, RMSNorm, SwiGLU, decoder blocks, loss, autodiff, optimizer/update policy,
gradient clipping/accumulation/checkpointing, quantization/calibration, sampling,
constrained decoding, KV-cache scheduling, PEFT/LoRA/preference optimization,
retrieval ranking/authorization, generation engines, trainers, or a ready-made
transformer/model runtime.

The future dependency allowlist records for every direct and transitive package:
path/name, exact version, source and source checksum, license expression and retained
license-text hash, enabled features, build script/native/network behavior, role,
direct parent, duplicate-version rationale, advisory disposition, and authorized
call sites. It permits no unapproved Git/path/registry source, implicit download,
networked build, hidden native artifact, unresolved advisory at the frozen policy,
or role drift. The provisioned graph must build with `--locked --offline`.

In short, compiler features are limited to backend/device/kernel plumbing; they do
not select semantic model behavior.

`dependency_policy(version=1;scalar-reference=byte-protected;allowed=allocation,storage,transfer,device,stream,gemm,primitive-dispatch,tensor-container,json,http,sse,cli,tls,compression,checksum,metrics,conditional-database-plumbing;forbidden=tokenizer,pretokenizer,bpe,filtering,dedup,packing,masking,rope,attention,online-softmax,rmsnorm,swiglu,decoder,loss,autodiff,optimizer,clipping,accumulation,checkpoint-policy,quantization,calibration,sampling,constrained-decoding,kv-scheduler,peft,lora,preference-optimization,retrieval-policy,generation,trainer,model-runtime;offline-lock=true)`

The dependency direction is selected, while each new crate remains prospective and
nonexecutable until its exact resolved graph passes. Existing `serde` 1.0.229 with
derive and `serde_json` 1.0.151 remain selected for syntax only. Preferred later
plumbing candidates are SafeTensors 0.8.0; `sha2` 0.11.0; WGPU 30.0.0 with defaults
off and only `std,vulkan,wgsl,strict_asserts`; `pollster` 1.0.1 without macros for
small synchronous initialization; `bytemuck` 1.25.2 with defaults/derive off for
checked primitive host byte views; optional `nvml-wrapper` 0.12.1 observation;
`clap` 4.6.6 builder API with defaults off and `std,help,usage,error-context`; and
loopback HTTP `axum` 0.8.9 plus `tokio` 1.53.1 with minimal HTTP/runtime/net/signal/
sync/time features. Node's pinned built-in `fetch` is the preferred acquisition
transport, so `reqwest` is deferred. Compression/archive crates remain off unless an
approved artifact actually requires one.

WGPU supplies safe Vulkan resource/dispatch primitives and course WGSL kernels. The
mandatory GPU lane requires discrete Vulkan identity and `SHADER_F16`; an absent
feature or actual f32 execution refuses. A separately named f32 differential/debug
profile may exist but cannot satisfy mixed-precision or core acceptance. WGSL has no
BF16 type, so this backend returns `UnsupportedDType` rather than silently recoding
BF16. A later safe native-BF16 backend would require a new graph/profile/receipt.

No GGUF parser is admitted yet. `gguf-rs-lib` 0.2.5 is the narrowest observed
candidate but remains blocked on exact spec revision/subset, bounded-preallocation
and adversarial parser tests, maintenance review, and its complete graph. Candle,
Burn, tch/libtorch, llama.cpp bindings, mistral.rs, model runtimes, tokenizer/
SentencePiece runtimes, and similar model stacks are rejected from course call sites
because they perform learner-owned concepts. `cudarc` is rejected for the first
backend because its relevant documented call sites require unsafe code, conflicting
with the workspace's course-owned `unsafe_code = "forbid"` policy. PostgreSQL client,
pool, migration, ORM, query, and pgvector crates are deliberately not chosen.

The protected current resolved third-party graph is exactly `serde` 1.0.229,
`serde_core` 1.0.229, `serde_derive` 1.0.229, `serde_json` 1.0.151, `itoa` 1.0.18,
`memchr` 2.8.3, `proc-macro2` 1.0.107, `quote` 1.0.47, `syn` 3.0.3,
`unicode-ident` 1.0.24, and `zmij` 1.0.23. This is a byte-protected baseline, not a
fresh license/advisory certification.

`current_dependency_graph(version=1;packages=itoa@1.0.18,memchr@2.8.3,proc-macro2@1.0.107,quote@1.0.47,serde@1.0.229,serde_core@1.0.229,serde_derive@1.0.229,serde_json@1.0.151,syn@3.0.3,unicode-ident@1.0.24,zmij@1.0.23;cargo-lock-sha256=b9491c2c89096a48ea62c98f79b5851272df4cb3afca09d41b80ed679b5a7fe1)`

`dependency(id=serde;version=1.0.229;status=selected-current;features=derive;role=json-shape-adapter-only)`

`dependency(id=serde_json;version=1.0.151;status=selected-current;features=default;role=json-syntax-only)`

`dependency(id=safetensors;version=0.8.0;status=prospective-graph-blocked;features=none-to-be-confirmed;role=dense-container-syntax-only)`

`dependency(id=sha2;version=0.11.0;status=prospective-graph-blocked;features=default-off-std-if-required;role=streaming-sha256-only)`

`dependency(id=wgpu;version=30.0.0;status=prospective-graph-blocked;features=std,vulkan,wgsl,strict_asserts;role=safe-vulkan-allocation-transfer-course-kernel-dispatch)`

`dependency(id=pollster;version=1.0.1;status=prospective-graph-blocked;features=no-macro;role=bounded-wgpu-init-only)`

`dependency(id=bytemuck;version=1.25.2;status=prospective-graph-blocked;features=default-off-no-derive;role=checked-primitive-host-byte-views)`

`dependency(id=nvml-wrapper;version=0.12.1;status=optional-prospective-graph-blocked;features=none;role=nvidia-observation-only)`

`dependency(id=clap;version=4.6.6;status=prospective-graph-blocked;features=std,help,usage,error-context;role=cli-syntax-only)`

`dependency(id=axum;version=0.8.9;status=prospective-graph-blocked;features=http1,json,tokio;role=loopback-http-sse-framing-only)`

`dependency(id=tokio;version=1.53.1;status=prospective-graph-blocked;features=rt-multi-thread,net,signal,sync,time;role=local-transport-runtime-only)`

`dependency(id=gguf-rs-lib;version=0.2.5;status=deferred-parser-admission;features=std-only-if-admitted;role=gguf-v3-primitive-syntax-only)`

`dependency(id=postgresql-pgvector-stack;version=none;status=unselected;features=none;role=none-mandatory)`

Every prospective exact version is an observed candidate, not an approved lock entry.
A later dependency-changing run may replace a candidate only before implementation
results, with a new decision and equivalent or narrower role. It must produce a
direct/transitive node and edge inventory with name/version/source/checksum/manifest
hash/features/target/dependency kind; proc macros, build scripts, `links`, native and
dynamic libraries; exact license expression plus retained license/notice hashes;
role IDs and direct call sites; duplicate justification; frozen advisory database and
disposition; and network/build/runtime-loader audit. It separately validates scalar,
SafeTensors, WGPU Vulkan FP16, local HTTP, NVIDIA observation, conditional
compression, and only-if-selected database graphs with `--frozen` and OS-denied
network from a read-only preinventoried cache. Any graph or role change invalidates
the receipt.

## 8. Artifacts, persistence, retrieval, and optional database boundary

The mandatory artifact system is content-addressed immutable files plus canonical
manifests. Writes use same-filesystem temporary files, bounded streaming, file and
directory synchronization where the supported filesystem requires it, and atomic
rename; kill-point tests leave either the old or new complete state. SHA-256 is
identity. Faster checksums, if used, are corruption diagnostics only.

Mandatory retrieval consumes provenance-bound provided vectors of fixed dimension
and uses stable brute-force exact top-k in bounded memory/files. Host authorization
filters eligible IDs before ranking. Score ties use a frozen total order. Generated
context may cite only eligible returned IDs. Retrieval does not claim to create or
train embeddings.

The mandatory conformance envelope is at most 1,000 documents/vectors, exactly 384
f32 dimensions per vector (1,536,000 raw vector bytes), at most 16 MiB UTF-8 text and
canonical metadata, `k<=10`, and at most 512 MiB complete process memory. Ingestion
rejects duplicate/mismatched IDs, hash/length/dimension errors, nonfinite values, and
zero-norm cosine vectors. Query dot products and squared norms accumulate as f64 in
strictly increasing dimension order. Authorization removes records first; scoring
then sorts by f64 score descending and canonical document-ID UTF-8 bytes ascending.
It returns exactly `min(k, eligible_count)` hits with IDs, content/vector/provenance
hashes, and exact score bits. At least 100 generated memory/file conformance traces
and 10 fixed dot/cosine/tie fixtures are byte-identical across restart, crash, retry,
corruption, authorization, nonfinite/zero, and dimension/hash faults. The warm
1,000-record exact-search p95 is below 100 ms on the admitted laptop.

`retrieval_envelope(records_max=1000;dimension=384;vector_bytes=1536000;text_metadata_bytes_max=16777216;k_max=10;process_bytes_max=536870912;queries_min=100;fixed_score_fixtures_min=10;warm_p95_milliseconds_max=100;authorization=before-ranking;score_order=descending;tie_order=document-id-utf8-ascending)`

PostgreSQL and pgvector are not selected and are dependencies of no mandatory
profile. Generic run metadata, static HTML, immutable artifacts, and the frozen local
retrieval fixture do not justify them. A later advanced comparison may be proposed
only after a predeclared memory/file oracle demonstrates at least one concrete need:
the admitted vector collection cannot fit its frozen memory/disk envelope, exact
p95 latency or 1–16-client throughput exceeds its frozen bound, or atomic concurrent
vector-plus-authorization updates and recovery are required. The trigger and result
are frozen before provisioning.

If selected later, a narrow course-owned vector-store interface must retain vector
identity, authorization-before-ranking, stable ordering, provenance, experiment,
resume, serving, retention, and recovery rules. PostgreSQL client/pool/migration/
query plumbing and an exact pgvector version may sit behind it; no SQL/client type
may leak into model, trainer, evaluator, retrieval-policy, or scheduler cores. The
advanced profile additionally requires a dedicated Dockerfile and Compose service,
an exact stable PostgreSQL image digest and pgvector version, clean empty-database
initialization, migrations, health checks, least-privilege roles, concurrent Rust
conformance, durable restart, deterministic memory/file oracle equivalence,
backup/restore, schema rollback and forward-fix, and upgrade evidence. It remains
optional and removable.

The only frozen optional comparison trigger uses 100,000 records × 384 f32 values
(153,600,000 raw vector bytes), 1,000 queries, `k=10`, eligibility selectivities
100/10/1 percent, concurrency 1/4/8/16, three repetitions, and identical target,
affinity/power, warmup, cache and process inventories. A database comparison may be
selected only if a need is declared first and the local baseline crosses it in at
least two of three runs: single-client warm p95 over 100 ms, 16-client p95 over 250
ms, peak RSS over 512 MiB, restart/recovery over 30 seconds, or an actual at-least-
four-writer atomic vector-plus-authorization/relational need the file snapshot cannot
meet inside those limits. Corpus size, installed software, or a desire to teach SQL
is not a trigger. Exact DB results must first match eligible IDs/order/scores for all
1,000 queries; approximate search is a separately named experiment with frozen
recall@k and zero-ineligible-ID gates.

`postgresql_trigger(records=100000;dimension=384;raw_vector_bytes=153600000;queries=1000;k=10;selectivities_percent=100,10,1;concurrency=1,4,8,16;repetitions=3;crossings_min=2;single_p95_milliseconds_over=100;concurrency16_p95_milliseconds_over=250;rss_bytes_over=536870912;recovery_seconds_over=30;writers_min=4;decision=unselected-until-crossed)`

`postgresql_adapter_requirements(version=1;status=conditional-only;artifacts=Dockerfile,Compose;pins=postgresql-image-digest,pgvector-version;tests=clean-empty-initialization,migrations,health,least-privilege,concurrent-rust-conformance,durable-restart,backup-restore,schema-rollback-forward-fix,upgrade,oracle-equivalence;interface=course-owned;sql-client-types-in-core=forbidden)`

`persistence(default=immutable-content-addressed-files;identity=sha256;publication=fsync-and-atomic-rename;database=unselected)`

`retrieval(default=bounded-in-memory-filesystem-exact-top-k;vectors=provided-provenance-bound;authorization=before-ranking;ties=frozen-total-order;database=not-required)`

`postgresql(disposition=unselected-optional-advanced;trigger=measured-capacity-or-latency-or-concurrency-recovery-need;mandatory-dependency=false;pgvector=unselected)`

## 9. Candidate/source disposition register

The official-source research for this contract is bounded to metadata and primary
documentation. A source can constrain a field but does not prove local execution,
compatibility, safety, quality, or license interpretation beyond its stated limit.

`source_record(id=HWP-01;kind=official-hardware;url=https://www.nvidia.com/en-us/geforce/laptops/40-series/;supports=RTX-4070-Laptop-product-label-cores-memory-clock;limit=marketing-table-does-not-prove-usable-bytes-throughput-thermals-or-dtype)`

`source_record(id=HWP-02;kind=official-hardware;url=https://www.nvidia.com/pt-br/geforce/laptops/compare/;supports=Ada-8GB-GDDR6-128bit-and-35-to-115W-product-range;limit=range-does-not-prove-OEM-sustained-power-or-performance)`

`source_record(id=HWP-03;kind=official-specification;url=https://docs.nvidia.com/cuda/archive/12.8.1/pdf/Ada_Compatibility_Guide.pdf;supports=Ada-compute-capability-8.9-and-binary-compatibility-boundary;limit=does-not-prove-kernel-dtype-determinism-speed-or-memory)`

`source_record(id=HWP-04;kind=official-specification;url=https://docs.nvidia.com/deploy/nvml-api/group__nvmlDeviceQueries.html;supports=device-name-UUID-and-byte-memory-queries;limit=one-sample-is-not-a-future-peak-or-course-allocation-attribution)`

`source_record(id=HWP-05;kind=official-specification;url=https://docs.nvidia.com/cuda/cuda-runtime-api/structcudaDeviceProp.html;supports=CUDA-name-UUID-compute-capability-and-global-memory-fields;limit=does-not-guarantee-future-allocation-or-course-ownership)`

`source_record(id=HWP-06;kind=official-specification;url=https://docs.nvidia.com/cuda/archive/12.8.1/cublas/index.html#results-reproducibility;supports=conditional-fixed-stack-cuBLAS-repeatability-and-concurrency-caveats;limit=does-not-prove-whole-job-determinism-or-authorize-hidden-algorithms)`

`source_record(id=HWP-07;kind=official-specification;url=https://docs.nvidia.com/cuda/archive/13.1.1/pdf/Floating_Point_on_NVIDIA_GPU.pdf;supports=rounding-FMA-order-and-precision-can-change-results;limit=supplies-no-course-tolerance-or-mismatch-waiver)`

`source_record(id=HWP-08;kind=primary-paper;url=https://arxiv.org/abs/1710.03740v3;supports=FP16-working-values-FP32-master-weights-and-loss-scaling;limit=paper-results-do-not-prove-this-device-path-or-memory)`

`source_record(id=HWP-09;kind=primary-paper;url=https://arxiv.org/abs/1905.12322v3;supports=BF16-exponent-significand-and-explicit-mixed-tensor-flows;limit=does-not-prove-local-kernel-speed-quality-or-tolerance)`

`source_record(id=HWP-10;kind=primary-paper;url=https://arxiv.org/abs/1604.06174v2;supports=activation-checkpoint-recomputation-memory-tradeoff;limit=does-not-remove-weights-moments-workspaces-or-set-this-budget)`

`source_record(id=HWP-11;kind=primary-paper;url=https://arxiv.org/abs/1909.08053v4;supports=tensor-parallel-matrix-partition-and-collective-communication;limit=logical-byte-planning-is-not-cluster-execution-throughput-or-reliability)`

`source_record(id=DM-01;kind=official-artifact-metadata;url=https://huggingface.co/api/datasets/roneneldan/TinyStories/revision/f54c09fd23315a6f9c86f9dc80f725de7d8f9c64?blobs=true;supports=immutable-dataset-revision-file-sizes-and-LFS-digests;limit=metadata-does-not-prove-content-privacy-quality-or-legal-conclusion)`

`source_record(id=DM-02;kind=official-artifact-metadata;url=https://huggingface.co/datasets/roneneldan/TinyStories/blob/f54c09fd23315a6f9c86f9dc80f725de7d8f9c64/README.md;supports=declared-CDLA-English-synthetic-generator-and-original-file-roles;limit=card-is-not-exhaustive-provenance-PII-scan-or-token-count)`

`source_record(id=DM-03;kind=primary-paper;url=https://arxiv.org/abs/2305.07759v2;supports=TinyStories-generation-method-and-narrow-English-story-domain;limit=does-not-prove-course-quality-hardware-license-contamination-or-evaluation)`

`source_record(id=DM-04;kind=official-license;url=https://cdla.dev/sharing-1-0/;supports=CDLA-data-sharing-conditions-and-computational-results-distinction;limit=not-legal-advice-and-not-automatic-weight-or-adapter-license)`

`source_record(id=DM-05;kind=official-artifact-metadata;url=https://huggingface.co/api/models/EleutherAI/pythia-31m/revision/e556ace21b489575e94e9d50b6dad2fcc7419679?blobs=true;supports=pinned-Pythia-artifact-size-hash-and-revision;limit=does-not-establish-course-architecture-compatibility)`

`source_record(id=DM-06;kind=official-artifact-metadata;url=https://huggingface.co/EleutherAI/pythia-31m/blob/e556ace21b489575e94e9d50b6dad2fcc7419679/config.json;supports=exact-GPT-NeoX-LayerNorm-GELU-partial-RoPE-parallel-residual-untied-config;limit=config-rejects-rather-than-authorizes-import)`

`source_record(id=DM-07;kind=official-artifact-metadata;url=https://huggingface.co/api/models/roneneldan/TinyStories-33M/revision/2ad0a164221b7c4d21cac7c46aec74f6f98dbfc8?blobs=true;supports=pinned-TinyStories-33M-artifact-size-hash-and-revision;limit=does-not-cure-architecture-tokenizer-or-license-gaps)`

`source_record(id=DM-08;kind=official-artifact-metadata;url=https://huggingface.co/roneneldan/TinyStories-33M/blob/2ad0a164221b7c4d21cac7c46aec74f6f98dbfc8/config.json;supports=exact-GPT-Neo-LayerNorm-GELU-local-global-learned-position-config;limit=config-rejects-rather-than-authorizes-import)`

`source_record(id=DM-09;kind=official-artifact-metadata;url=https://huggingface.co/api/models/karpathy/tinyllamas/revision/0bd21da7698eaf29a0d7de3992de8a46ef624add?blobs=true;supports=pinned-stories42M-bytes-hash-and-terse-repository-metadata;limit=omits-exact-config-tokenizer-training-lineage-and-complete-license-chain)`

`source_record(id=DM-10;kind=official-source;url=https://github.com/karpathy/llama2.c/tree/350e04fe35433e6d2941dce5a1f53308f87058eb;supports=primary-Llama-shaped-code-42M-table-and-tokenizer-warning;limit=does-not-bind-older-weight-bytes-to-this-code-or-defaults)`

`source_record(id=DAP-01;kind=official-specification;url=https://github.com/safetensors/safetensors/blob/v0.8.0/README.md;supports=SafeTensors-v0.8.0-format-header-offset-and-buffer-rules;limit=tag-ref-observed-2026-08-13-must-be-commit-pinned-before-implementation-and-does-not-prove-model-semantics-provenance-trust-or-course-caps)`

`source_record(id=DAP-02;kind=official-source;url=https://docs.rs/safetensors/0.8.0/safetensors/;supports=SafeTensors-Rust-parser-API-at-exact-release;limit=does-not-approve-the-unresolved-graph-or-replace-course-validation)`

`source_record(id=DAP-03;kind=official-specification;url=https://github.com/ggml-org/ggml/blob/master/docs/gguf.md;supports=GGUF-v3-container-structures-types-alignment-filename-convention-and-sidecars;limit=mutable-master-observed-2026-08-13-must-be-commit-pinned-before-implementation)`

`source_record(id=DAP-04;kind=official-source;url=https://docs.rs/crate/gguf-rs-lib/0.2.5;supports=gguf-rs-lib-0.2.5-default-parser-optional-feature-and-declared-license-documentation;limit=documentation-does-not-prove-bounded-preallocation-security-or-maintenance)`

`source_record(id=DAP-05;kind=official-source;url=https://docs.rs/crate/gguf-rs-lib/0.2.5/source/Cargo.toml.orig;supports=gguf-rs-lib-0.2.5-original-default-feature-and-direct-dependency-manifest;limit=manifest-does-not-prove-the-resolved-target-graph-or-call-site-role)`

`source_record(id=DAP-06;kind=official-source;url=https://docs.rs/crate/gguf-rs-lib/0.2.5/features;supports=gguf-rs-lib-0.2.5-docsrs-feature-expansion-inventory;limit=feature-page-does-not-prove-the-resolved-target-graph-or-call-site-role)`

`source_record(id=DAP-07;kind=official-source;url=https://docs.rs/gguf-rs/0.1.8/gguf_rs/;supports=gguf-rs-0.1.8-convenience-API-tokenizer-array-truncation;limit=supports-rejection-for-complete-identity-not-parser-selection)`

`source_record(id=DAP-08;kind=official-source;url=https://docs.rs/wgpu/30.0.0/wgpu/;supports=wgpu-30-safe-API-backends-WGSL-and-feature-surface;limit=does-not-prove-device-memory-kernel-correctness-or-determinism)`

`source_record(id=DAP-09;kind=official-source;url=https://docs.rs/wgpu/30.0.0/wgpu/struct.AdapterInfo.html;supports=wgpu-30-AdapterInfo-backend-device-type-name-driver-driver-info-vendor-and-device-fields;limit=fields-do-not-prove-NVML-correlation-or-target-device-selection)`

`source_record(id=DAP-10;kind=official-source;url=https://docs.rs/wgpu-types/30.0.0/wgpu_types/enum.DeviceType.html;supports=wgpu-types-30-DeviceType-discrete-integrated-virtual-CPU-and-other-categories;limit=device-category-does-not-prove-identity-memory-fit-or-dispatch)`

`source_record(id=DAP-11;kind=official-specification;url=https://www.w3.org/TR/WGSL/#extension-f16;supports=WGSL-f16-extension-capability-and-scalar-vector-matrix-type-surface;limit=mutable-TR-observed-2026-08-13-must-be-version-pinned-before-implementation-and-does-not-define-course-mixed-precision-policy)`

`source_record(id=DAP-12;kind=official-source;url=https://docs.rs/pollster/1.0.1/pollster/;supports=pollster-1.0.1-minimal-no-dependency-block-on-bridge;limit=does-not-authorize-unbounded-blocking-or-define-runtime-policy)`

`source_record(id=DAP-13;kind=official-source;url=https://docs.rs/bytemuck/1.25.2/bytemuck/;supports=bytemuck-1.25.2-primitive-byte-casts-fallible-variants-feature-gated-derives-and-unsafe-manual-trait-boundary;limit=course-use-remains-safe-checked-primitive-views-only)`

`source_record(id=DAP-14;kind=official-source;url=https://docs.rs/sha2/0.11.0/sha2/;supports=sha2-0.11-incremental-SHA-256-plumbing;limit=content-hash-is-not-authentication-or-a-signature)`

`source_record(id=DAP-15;kind=official-source;url=https://docs.rs/crate/nvml-wrapper/0.12.1/features;supports=nvml-wrapper-0.12.1-safe-observation-wrapper-and-zero-default-optional-features;limit=observation-does-not-authorize-execution-or-guarantee-free-memory)`

`source_record(id=DAP-16;kind=official-source;url=https://docs.rs/cudarc/latest/cudarc/cublas/safe/trait.Gemm.html;supports=cudarc-latest-observed-2026-08-13-GEMM-unsafe-call-requirement;limit=latest-alias-must-be-exact-version-pinned-and-the-requirement-supports-first-backend-rejection-only)`

`source_record(id=DAP-17;kind=official-source;url=https://docs.rs/cudarc/latest/cudarc/driver/safe/struct.LaunchArgs.html;supports=cudarc-latest-observed-2026-08-13-kernel-launch-unsafe-call-requirement;limit=latest-alias-must-be-exact-version-pinned-and-the-requirement-supports-first-backend-rejection-only)`

`source_record(id=DAP-18;kind=official-source;url=https://docs.rs/clap/4.6.6/clap/;supports=clap-4.6.6-command-argument-parser-and-help-API;limit=does-not-own-course-policy-validation-or-authority)`

`source_record(id=DAP-19;kind=official-source;url=https://docs.rs/clap/4.6.6/clap/_features/index.html;supports=clap-4.6.6-feature-gates-and-default-feature-expansion;limit=feature-page-does-not-select-the-course-feature-set-or-prove-the-resolved-graph)`

`source_record(id=DAP-20;kind=official-source;url=https://docs.rs/axum/0.8.9/axum/;supports=axum-0.8.9-router-extractor-response-and-SSE-transport-surface;limit=does-not-select-loopback-binding-or-own-model-serving-scheduling-or-trust-policy)`

`source_record(id=DAP-21;kind=official-source;url=https://docs.rs/crate/tokio/1.53.1/features;supports=tokio-1.53.1-zero-default-features-and-granular-runtime-net-signal-sync-and-time-features;limit=does-not-define-model-scheduler-semantics)`

`source_record(id=DAP-22;kind=official-source;url=https://docs.rs/reqwest/0.13.4/reqwest/;supports=reqwest-0.13.4-high-level-HTTP-default-transport-breadth-and-optional-features;limit=supports-deferral-and-minimal-feature-review-not-selection)`

`source_record(id=DAP-23;kind=official-source;url=https://docs.rs/flate2/1.1.9/flate2/;supports=flate2-1.1.9-miniz_oxide-safe-Rust-backend-feature-interactions-and-gzip-member-behavior;limit=does-not-provide-course-expansion-or-member-count-caps)`

`source_record(id=DAP-24;kind=official-source;url=https://docs.rs/tar/0.4.46/tar/;supports=tar-0.4.46-best-effort-path-traversal-defense-and-concurrent-destination-mutation-boundary;limit=supports-keeping-blind-unpack-disabled-and-does-not-provide-course-caps)`

`source_record(id=DAP-25;kind=official-source;url=https://doc.rust-lang.org/cargo/commands/cargo-metadata.html;supports=Cargo-metadata-resolved-package-dependency-and-feature-graph-output;limit=mutable-stable-docs-observed-2026-08-13-do-not-perform-call-site-license-or-role-judgment)`

`source_record(id=DAP-26;kind=official-source;url=https://doc.rust-lang.org/cargo/commands/cargo-tree.html;supports=Cargo-tree-feature-duplicate-and-inverted-dependency-inspection;limit=mutable-stable-docs-observed-2026-08-13-do-not-prove-call-site-role-or-license-compliance)`

`source_record(id=DAP-27;kind=official-source;url=https://doc.rust-lang.org/cargo/commands/cargo-build.html;supports=Cargo-build-locked-offline-and-frozen-command-semantics;limit=mutable-stable-docs-observed-2026-08-13-do-not-prove-OS-network-denial-or-dependency-policy-compliance)`

`source_record(id=DAP-28;kind=official-source;url=https://embarkstudios.github.io/cargo-deny/checks/index.html;supports=cargo-deny-advisory-ban-license-and-source-check-category-surface;limit=mutable-project-docs-observed-2026-08-13-do-not-prove-policy-correctness-or-license-obligations)`

`source_record(id=DAP-29;kind=official-source;url=https://embarkstudios.github.io/cargo-deny/checks/licenses/index.html;supports=cargo-deny-license-gathering-clarification-and-license-check-configuration;limit=mutable-project-docs-observed-2026-08-13-say-gathering-is-not-a-substitute-for-reviewing-license-terms)`

`source_record(id=DAP-30;kind=official-source;url=https://embarkstudios.github.io/cargo-deny/checks/sources/index.html;supports=cargo-deny-source-allow-and-deny-check-configuration;limit=mutable-project-docs-observed-2026-08-13-does-not-prove-source-trust-or-call-site-role)`

`source_record(id=DAP-31;kind=official-source;url=https://github.com/pgvector/pgvector/blob/v0.8.1/README.md;supports=pgvector-0.8.1-exact-and-approximate-search-distance-operators-dimension-limits-recall-tradeoff-and-filtering-caveat;limit=tag-ref-observed-2026-08-13-must-be-commit-pinned-before-implementation-and-does-not-justify-database-selection-or-define-authorization-and-ties)`

`source_record(id=DAP-32;kind=official-source;url=https://www.postgresql.org/docs/18/transaction-iso.html;supports=PostgreSQL-18-transaction-isolation-level-and-serialization-mechanics;limit=rolling-major-docs-observed-2026-08-13-do-not-prove-course-adapter-conformance-or-create-a-database-need)`

`source_record(id=DAP-33;kind=official-source;url=https://www.postgresql.org/docs/18/backup-dump.html;supports=PostgreSQL-18-SQL-dump-logical-backup-and-restore-mechanics;limit=rolling-major-docs-observed-2026-08-13-do-not-prove-PITR-or-course-recovery-conformance)`

`source_record(id=DAP-34;kind=official-source;url=https://www.postgresql.org/docs/18/continuous-archiving.html;supports=PostgreSQL-18-WAL-continuous-archiving-base-backup-and-PITR-mechanics;limit=rolling-major-docs-observed-2026-08-13-do-not-prove-course-recovery-conformance-or-operational-readiness)`

`source_register(version=1;HWP=11;DM=10;DAP=34;total=55;dap_sorted_record_sha256=4aa352946cead209e5a64bf89884c162c0e27d1d2e0f5439903c72826ecd3aca;all_sorted_record_sha256=0c25614afa82de281a96235429a969d4aecd3d22c73c5b75ad1962434199951b;observation_date=2026-08-13)`

## 10. Publication and downstream authority

The validated canonical contract authorizes the next design step to create a
sequenced curriculum/implementation/acquisition plan. It does not authorize a
download, dependency edit, lockfile change, product edit, GPU run, database service,
or learner claim by itself. Every later profile starts blocked and becomes executable
only through its named prerequisites and immutable receipt.

The design step must preserve one causal decoder-only text/token implementation, the
runtime scale ladder, private prepared-input seam, 6.25 GiB course-allocation ceiling,
and fail-closed production planner. It may refine a provisional runtime value only by
adding a superseding decision, new fingerprint, updated validator, and new profile
version before observing the affected result.
