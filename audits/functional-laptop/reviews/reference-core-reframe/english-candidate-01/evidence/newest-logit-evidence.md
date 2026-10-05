# Newest-logit and selected-token evidence

Internal author evidence, not learner prose or a publication verdict.

Chapter 38's Rust fixture declares `TOLERANCE = 2e-12` in
`rust/demos/ch38-cached-generation/src/lib.rs`. `max_abs_difference` compares
coordinates of same-width logit vectors; `learner_evidence` checks prefill and
decode differences against that tolerance. These checks establish closeness
on their specified newest-position fixtures, not a universal token guarantee.

`loaded_generation_evidence` separately loads the Chapter 35 checkpoint and
compares cached and uncached generation. Both paths receive the same
`GenerationConfig` (`TemperatureTopK` with temperature 1 and top-k 3), prompt
and model. Their generators begin at the checkpoint's same `rng_state`, using
cloned `SplitMix64` state. `same_generation` and final generator-state equality
are checked independently; the EOS comparison repeats the matched initial
state. These are fixed-example observations, not a claim that shared settings
alone guarantee identical output for every approximate logit comparison.

For the mathematical distinction, let `epsilon = 1e-12` and compare the
two-token vectors `[0, epsilon]` and `[epsilon, 0]`, with IDs 0 and 1 in that
order. Their maximum absolute coordinate difference is `epsilon`, below the
fixture's `2e-12` tolerance. Greedy argmax nevertheless selects ID 1 from the
first vector and ID 0 from the second. Both maxima are strict, so tie-breaking
does not rescue a guarantee. The derivation is an independent mathematical
counterexample, not output from the model fixture.

Matching a sampling rule also does not specify its random-generator state.
Conversely, even matching that state and policy does not turn approximate
logit agreement into a general selected-token theorem. The correction names
the fixture conditions, separates the two evidence obligations and expressly
excludes the unsupported implication. No Rust algorithm, test behavior,
formula, historical claim or recorded trace is changed.
