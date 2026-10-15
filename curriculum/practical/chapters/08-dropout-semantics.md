---
{
  "chapter_id":"08-dropout-semantics","concept_id":"dropout-semantics","content_revision":2,"order":8,
  "objective":{"en":"Extend the existing decoder with optional inverted dropout whose training, evaluation, backward and replay behavior is explicit, while preserving the disabled path."},
  "worked_inputs":{"en":"Explain input [2,-4,0,6], supplied mask [1,0,1,1], drop probability 0.5 and upstream gradient [3,5,7,-2]. Inspect ten predetermined seeded masks and local recomputation and four-update continuation fixtures for the two-block bridge decoder."},
  "formula":{
    "latex":"q=1-p,\\qquad y_i=\\frac{m_i x_i}{q},\\qquad \\frac{\\partial\\mathcal L}{\\partial x_i}=\\frac{m_i}{q}g_i",
    "symbols":[
      {"symbol":"p","en":"requested probability of dropping an element, finite and at least zero but less than one"},
      {"symbol":"q","en":"keep probability, one minus the requested drop probability"},
      {"symbol":"i","en":"one element in batch, token, feature flattening order"},
      {"symbol":"m_i","en":"saved mask bit for element i: one keeps the element and zero drops it"},
      {"symbol":"x_i","en":"finite input value at element i of a complete projected residual branch"},
      {"symbol":"y_i","en":"training output at element i after multiplication by the saved mask and training scale"},
      {"symbol":"g_i","en":"supplied upstream derivative of the loss with respect to training output element i"},
      {"symbol":"\\mathcal L","en":"scalar loss; the worked linear probe deliberately fixes its upstream gradient"},
      {"symbol":"B,T,D","en":"rows, token positions per row, and residual features per token in the complete rectangular site tensor"},
      {"symbol":"L","en":"number of complete decoder blocks, each with an attention-output and feed-forward-output dropout site"}
    ]
  },
  "history":{
    "llm_evolution":{
      "predecessor_kind":"training-practice",
      "limitation":{"en":"A random training subnetwork needs a separate inference rule; its sampled result and gradient depend on the saved mask."},
      "later_advance":{"en":"The 2014 paper also describes backward through the sampled subnetwork."},
      "modern_llm_role":{"en":"Optional decoder dropout needs explicit mode, saved-mask backward and bound random-counter replay, with inference and continuation limits stated separately."},
      "sources":[
        {"role":"earlier","year":2012,"name":"Improving neural networks by preventing co-adaptation of feature detectors","source_url":"https://arxiv.org/abs/1207.0580","claim":{"en":"Hinton and colleagues' 2012 preprint describes random unit omission during training and an unthinned test network with halved outgoing weights in its one-half case. It does not specify the course's decoder placement or counter."}},
        {"role":"later","year":2014,"name":"Dropout: A Simple Way to Prevent Neural Networks from Overfitting","source_url":"https://www.jmlr.org/papers/v15/srivastava14a.html","claim":{"en":"Srivastava and colleagues' 2014 paper describes random unit removal during training and an unthinned inference network with retention-scaled outgoing weights. Its probability notation denotes retention, and its results do not establish benefit for this course's decoder."}}
      ]
    },
    "approach":{"en":"Use the existing TensorValue multiplier to compare unscaled training with retention-scaled evaluation against inverted training with identity evaluation on one linear contribution."},
    "summary":{"en":"The historical scaling intuition motivates distinct training and inference rules. The course chooses its own residual placement and deterministic counter, and claims correctness and bounded replay rather than improved model quality."},
    "rust_contrast":"For the same scalar input two and supplied keep bit one, use existing multiplication to compare earlier training/evaluation values two/one with inverted training/evaluation values four/two. Do not add another dropout implementation or attribute course placement and counter policy to either paper."
  },
  "rust":{
    "package":"practical-ch08-dropout-semantics",
    "sources":[
      "rust/crates/llm-from-scratch-practical/src/nn/dropout.rs",
      "rust/crates/llm-from-scratch-practical/src/models/decoder_dropout.rs",
      "rust/demos/practical-ch08-dropout-semantics/src/lib.rs",
      "rust/demos/practical-ch08-dropout-semantics/src/main.rs"
    ],
    "expected_output": "{\"accounting\":{\"fixture_limits\":{\"activation_entries\":1000000,\"compiled_workload_seconds\":600,\"cpu_rss_bytes\":268435456,\"disk_bytes\":1073741824,\"explicit_mask_bytes\":67108864},\"measurement_owner\":\"compiled execution receipt\",\"rows\":[{\"combined_payload_reserve_lower_bound\":34304656,\"disabled_mask_bytes\":0,\"evidence\":\"shape-derived plan; no large-profile or GPU execution\",\"interpretation\":\"conservative f64 payload/reserve liveness; mask subtotal alone is not a process or allocator peak; no measured GPU claim\",\"layers\":1,\"mandatory_profile_dropout\":\"optional correctness fixture\",\"nominal_shape\":[16,4,4],\"optional_f64_mask_data_bytes\":4096,\"optional_f64_output_data_bytes\":4096,\"optional_output_adjoint_reserve_bytes\":4096,\"optional_saved_graph_primal_bytes\":8192,\"profile\":\"reference-ci\",\"scale\":\"reference\",\"unique_parameters\":1188},{\"combined_payload_reserve_lower_bound\":37571488,\"disabled_mask_bytes\":0,\"evidence\":\"shape-derived plan; no large-profile or GPU execution\",\"interpretation\":\"conservative f64 payload/reserve liveness; mask subtotal alone is not a process or allocator peak; no measured GPU claim\",\"layers\":2,\"mandatory_profile_dropout\":\"optional correctness fixture\",\"nominal_shape\":[8,16,16],\"optional_f64_mask_data_bytes\":65536,\"optional_f64_output_data_bytes\":65536,\"optional_output_adjoint_reserve_bytes\":65536,\"optional_saved_graph_primal_bytes\":131072,\"profile\":\"bridge-ci\",\"scale\":\"bridge\",\"unique_parameters\":8304},{\"combined_payload_reserve_lower_bound\":1243980032,\"disabled_mask_bytes\":0,\"evidence\":\"shape-derived plan; no large-profile or GPU execution\",\"interpretation\":\"conservative f64 payload/reserve liveness; mask subtotal alone is not a process or allocator peak; no measured GPU claim\",\"layers\":8,\"mandatory_profile_dropout\":\"off\",\"nominal_shape\":[1,512,512],\"optional_f64_mask_data_bytes\":33554432,\"optional_f64_output_data_bytes\":33554432,\"optional_output_adjoint_reserve_bytes\":33554432,\"optional_saved_graph_primal_bytes\":67108864,\"profile\":\"8gb-gpu-core\",\"scale\":\"laptop\",\"unique_parameters\":32514560}]},\"chapter\":\"08-dropout-semantics\",\"counter_mapping\":\"course-dropout-counter-v1\",\"fixed_mask\":{\"drop_probability\":0.5,\"enumerated_masks\":16,\"enumerated_mean\":[2.0,-4.0,0.0,6.0],\"eval_end_counter\":0,\"eval_output\":[2.0,-4.0,0.0,6.0],\"eval_same_handle\":true,\"input\":[2.0,-4.0,0.0,6.0],\"input_gradient\":[6.0,0.0,14.0,-4.0],\"input_gradient_bits\":[\"4018000000000000\",\"0000000000000000\",\"402c000000000000\",\"c010000000000000\"],\"keep_probability\":0.5,\"linear_probe\":-12.0,\"mask\":[1,0,1,1],\"shape\":[1,1,4],\"training_output\":[4.0,-0.0,0.0,12.0],\"training_output_bits\":[\"4010000000000000\",\"8000000000000000\",\"0000000000000000\",\"4028000000000000\"],\"upstream_gradient\":[3.0,5.0,7.0,-2.0]},\"modes_grid_history\":{\"grid\":{\"half_equality_keeps\":true,\"largest_unit_bits\":\"3fefffffffffffff\",\"tiny_first_positive_grid_keeps\":true,\"tiny_probability_bits\":\"3c90000000000000\",\"tiny_requested_scale_bits\":\"3ff0000000000000\",\"tiny_zero_drops\":true,\"zero_drops_at_half\":true},\"history\":{\"drop_probability\":0.5,\"identity_eval\":2.0,\"input\":2.0,\"inverted_training\":4.0,\"keep_scaled_eval\":1.0,\"mask\":1,\"unscaled_training\":2.0},\"mode_pairs\":[{\"end_counter\":4,\"key_derived\":true,\"mode\":\"train\",\"output_bits\":[\"4010000000000000\",\"8000000000000000\",\"0000000000000000\",\"4028000000000000\"],\"output_tracks_gradient\":true,\"records_graph\":true,\"same_handle\":false},{\"end_counter\":4,\"key_derived\":true,\"mode\":\"train\",\"output_bits\":[\"4010000000000000\",\"8000000000000000\",\"0000000000000000\",\"4028000000000000\"],\"output_tracks_gradient\":false,\"records_graph\":false,\"same_handle\":false},{\"end_counter\":0,\"key_derived\":false,\"mode\":\"eval\",\"output_bits\":[\"4000000000000000\",\"c010000000000000\",\"0000000000000000\",\"4018000000000000\"],\"output_tracks_gradient\":true,\"records_graph\":true,\"same_handle\":true},{\"end_counter\":0,\"key_derived\":false,\"mode\":\"eval\",\"output_bits\":[\"4000000000000000\",\"c010000000000000\",\"0000000000000000\",\"4018000000000000\"],\"output_tracks_gradient\":true,\"records_graph\":false,\"same_handle\":true}],\"zero_probability_identity\":{\"end_counter\":0,\"exact_input_bits\":true,\"key_derived\":false,\"no_mask_record\":true,\"output_bits\":[\"8000000000000000\",\"0000000000000000\",\"c010000000000000\",\"4018000000000000\"],\"preserved_existing_tracking\":true,\"probability_bits\":\"8000000000000000\",\"same_handle\":true}},\"placement\":\"residual-output-element-dropout-v1\",\"primitive\":{\"input\":[2.0,-4.0,0.0,6.0],\"mode\":\"train\",\"probability_bits\":\"3fe0000000000000\",\"rows\":[{\"end_counter\":4,\"final_input_gradient_bits\":[\"0000000000000000\",\"4024000000000000\",\"402c000000000000\",\"0000000000000000\"],\"mask\":\"0110\",\"output_bits\":[\"0000000000000000\",\"c020000000000000\",\"0000000000000000\",\"0000000000000000\"],\"purpose\":4,\"range\":[0,4],\"seed\":0,\"words\":[\"4694c35b74d11c5c\",\"e882f4632bb6be39\",\"a9133cd1c9a3d6be\",\"09b685f5e3d139e2\"]},{\"end_counter\":4,\"final_input_gradient_bits\":[\"0000000000000000\",\"0000000000000000\",\"402c000000000000\",\"c010000000000000\"],\"mask\":\"0011\",\"output_bits\":[\"0000000000000000\",\"8000000000000000\",\"0000000000000000\",\"4028000000000000\"],\"purpose\":4,\"range\":[0,4],\"seed\":1,\"words\":[\"4000795f8e33b2a8\",\"76cdccb95a30b7da\",\"ed43b585a649a675\",\"8f330e2083ebd686\"]},{\"end_counter\":4,\"final_input_gradient_bits\":[\"4018000000000000\",\"4024000000000000\",\"0000000000000000\",\"c010000000000000\"],\"mask\":\"1101\",\"output_bits\":[\"4010000000000000\",\"c020000000000000\",\"0000000000000000\",\"4028000000000000\"],\"purpose\":4,\"range\":[0,4],\"seed\":2,\"words\":[\"91238e406d0dd441\",\"ba0d889380693bcd\",\"1e795ed161c2ddc7\",\"ee36d708c286603c\"]},{\"end_counter\":4,\"final_input_gradient_bits\":[\"4018000000000000\",\"0000000000000000\",\"0000000000000000\",\"c010000000000000\"],\"mask\":\"1001\",\"output_bits\":[\"4010000000000000\",\"8000000000000000\",\"0000000000000000\",\"4028000000000000\"],\"purpose\":4,\"range\":[0,4],\"seed\":3,\"words\":[\"c2c10f139f552372\",\"52778335c95915ab\",\"331d6add29276504\",\"dd24fb025ad0b2a5\"]},{\"end_counter\":4,\"final_input_gradient_bits\":[\"0000000000000000\",\"4024000000000000\",\"402c000000000000\",\"0000000000000000\"],\"mask\":\"0110\",\"output_bits\":[\"0000000000000000\",\"c020000000000000\",\"0000000000000000\",\"0000000000000000\"],\"purpose\":4,\"range\":[0,4],\"seed\":4,\"words\":[\"777e4c45e43490a4\",\"bc79c12c350cb6be\",\"90a2123911e8bb7f\",\"64a7cb26e5916cec\"]},{\"end_counter\":4,\"final_input_gradient_bits\":[\"4018000000000000\",\"4024000000000000\",\"402c000000000000\",\"0000000000000000\"],\"mask\":\"1110\",\"output_bits\":[\"4010000000000000\",\"c020000000000000\",\"0000000000000000\",\"0000000000000000\"],\"purpose\":4,\"range\":[0,4],\"seed\":5,\"words\":[\"e4d103cd1849f57a\",\"b58468f03a2e5b22\",\"c273cd48c333b2d2\",\"6f80da0d235b8fbc\"]},{\"end_counter\":4,\"final_input_gradient_bits\":[\"4018000000000000\",\"0000000000000000\",\"0000000000000000\",\"0000000000000000\"],\"mask\":\"1000\",\"output_bits\":[\"4010000000000000\",\"8000000000000000\",\"0000000000000000\",\"0000000000000000\"],\"purpose\":4,\"range\":[0,4],\"seed\":6,\"words\":[\"8b213a529a5825b0\",\"7883f31b625aa927\",\"681dc1904ed76174\",\"0055cdf1669e31a7\"]},{\"end_counter\":4,\"final_input_gradient_bits\":[\"0000000000000000\",\"0000000000000000\",\"402c000000000000\",\"c010000000000000\"],\"mask\":\"0011\",\"output_bits\":[\"0000000000000000\",\"8000000000000000\",\"0000000000000000\",\"4028000000000000\"],\"purpose\":4,\"range\":[0,4],\"seed\":7,\"words\":[\"292152587c1d190e\",\"01f2c025a526cb76\",\"9d79478e82f22276\",\"cad55a83414fbb5d\"]},{\"end_counter\":4,\"final_input_gradient_bits\":[\"4018000000000000\",\"0000000000000000\",\"402c000000000000\",\"c010000000000000\"],\"mask\":\"1011\",\"output_bits\":[\"4010000000000000\",\"8000000000000000\",\"0000000000000000\",\"4028000000000000\"],\"purpose\":4,\"range\":[0,4],\"seed\":8,\"words\":[\"88f7d9b9f7c6ea77\",\"1c6f91774a325d52\",\"a7f85fde5545c22b\",\"f9661fc165189901\"]},{\"end_counter\":4,\"final_input_gradient_bits\":[\"4018000000000000\",\"4024000000000000\",\"0000000000000000\",\"c010000000000000\"],\"mask\":\"1101\",\"output_bits\":[\"4010000000000000\",\"c020000000000000\",\"0000000000000000\",\"4028000000000000\"],\"purpose\":4,\"range\":[0,4],\"seed\":39,\"words\":[\"e0f2d7d7dd3d13ac\",\"bbe95911f05f90b5\",\"210c4710466fdb4c\",\"88a1d7a436e3ab9b\"]}],\"scale_bits\":\"4000000000000000\",\"shape\":[1,1,4],\"upstream\":[3.0,5.0,7.0,-2.0]},\"purpose_registry\":[[\"initialization\",1],[\"corpus-order\",2],[\"packing\",3],[\"optional-dropout\",4],[\"sampling\",5],[\"evaluation-bootstrap\",6]],\"recompute\":{\"changed_same_shape_text_rejected\":true,\"full_core\":{\"all_four_masks_equal\":true,\"every_parameter_gradient_equal\":true,\"final_live_counter\":192,\"logit_coordinates\":798,\"logits_equal\":true,\"logits_sha256\":\"e9fd691edb04d91fdab9ffa06ef510da504709db958847ea54710585446036c3\",\"loss_bits\":\"40179c626e4911a9\",\"loss_equal\":true,\"next_word\":\"1ca7c3cad4620c1a\",\"parameter_gradient_coordinates\":8304,\"parameter_gradients_sha256\":\"5f13758bbf1cbdfbb2b7699876a097549fe597c5cf44e4fd35c85a807075a2f3\"},\"points\":[{\"compared_coordinates\":{\"input_gradient\":48,\"multiplier\":48,\"output\":48},\"input_gradient_equal\":true,\"input_gradient_sha256\":\"fae3ff7a08be9c77b65595c699e4032a6df39978319f0ee4150637766ba05c9d\",\"layer\":0,\"live_cursor_after\":192,\"live_cursor_before\":192,\"multiplier_equal\":true,\"multiplier_sha256\":\"42eb7408494bb7e331a363e24ba2160acd600248200ddb79e4a79e9909009111\",\"output_equal\":true,\"output_sha256\":\"c060c6290356d0bae2571a571adeeb7a7232ad785c39d674c29ff6a55b4ecae2\",\"point\":\"R1\",\"range\":[0,48],\"shape\":[1,3,16],\"site\":\"attention-output\"},{\"compared_coordinates\":{\"input_gradient\":48,\"multiplier\":48,\"output\":48},\"input_gradient_equal\":true,\"input_gradient_sha256\":\"ee02e68203d4dd3d135974119ef8b3aef93d56d48bad9f366d7d1e7c1b5b8561\",\"layer\":0,\"live_cursor_after\":192,\"live_cursor_before\":192,\"multiplier_equal\":true,\"multiplier_sha256\":\"cfb2fac148de768d3b185c6566d68daf518b9e33dafe33bd82f7866b7b11fc42\",\"output_equal\":true,\"output_sha256\":\"3064514498d025cb01ae8bec36bc1f73463edc6ff0f04c54e0fafa8ad61d36a9\",\"point\":\"R2\",\"range\":[48,96],\"shape\":[1,3,16],\"site\":\"ffn-output\"},{\"compared_coordinates\":{\"input_gradient\":48,\"multiplier\":48,\"output\":48},\"input_gradient_equal\":true,\"input_gradient_sha256\":\"162009cbac2f780cc0bba3766fa2a71b018bd2cec7716835997c99e9950c937f\",\"layer\":1,\"live_cursor_after\":192,\"live_cursor_before\":192,\"multiplier_equal\":true,\"multiplier_sha256\":\"b89ae2a7cd6d1b6a69ee76719f61220f98955e5c0a2d377521e05eb7926df040\",\"output_equal\":true,\"output_sha256\":\"f7795d9a8a4d3fe646a68813345fc795f2a6cc25e9b82bc4cc71f1932b19ad18\",\"point\":\"R3\",\"range\":[96,144],\"shape\":[1,3,16],\"site\":\"attention-output\"}],\"scope\":\"operator and same-core text recomputation\"},\"replay_scope\":\"same scalar CPU environment and actual accepted text/layout; no quality benefit claim\",\"resume\":{\"failure_after_forward\":{\"counter_after_forward\":192,\"rejected\":true,\"restored_committed_phase\":true,\"restored_cursor_before_retry\":0,\"retried_update_equal\":true},\"final_counter\":768,\"final_moment_and_step_bits_sha256\":\"e36c6133033648c0d46e21661886cfb415a55f498e5f4e699cc3316e36d8466d\",\"final_next_word\":\"a8c1103f72c54933\",\"final_parameter_bits_sha256\":\"285595449edf24942a6122f88c8babe939b2d8b8d8e800d9f576e953b4b6bd90\",\"final_parameter_coordinates\":8304,\"invalid_snapshots\":[{\"case\":\"missing-counter\",\"rejected\":true},{\"case\":\"missing-phase\",\"rejected\":true},{\"case\":\"wrong-run\",\"rejected\":true},{\"case\":\"wrong-probability\",\"rejected\":true},{\"case\":\"wrong-batch-cursor\",\"rejected\":true},{\"case\":\"wrong-counter\",\"rejected\":true},{\"case\":\"incomplete-phase\",\"rejected\":true}],\"points\":[{\"all_final_declared_state_equal\":true,\"all_final_moment_and_step_bits_equal\":true,\"all_final_parameter_bits_equal\":true,\"all_remaining_tapes_equal\":true,\"compared_coordinates\":{\"adaptive-delta\":24912,\"adaptive-direction\":24912,\"clipped-gradient\":24912,\"corrected-first-moment\":24912,\"corrected-second-moment\":24912,\"decay-delta\":24912,\"effective-gradient\":24912,\"first-moment\":24912,\"logits\":2394,\"mask-bits\":576,\"mask-words\":576,\"parameter-after\":24912,\"parameter-before\":24912,\"raw-gradient\":24912,\"scalar-bits\":90,\"second-moment\":24912},\"continuation_summary_sha256\":\"7bf065997dbcb657876f62a256688008a19091f1fb2bc18a6e66700b58dd0e72\",\"final_counter\":768,\"next_word\":\"a8c1103f72c54933\",\"point\":\"U1\",\"remaining_updates_compared\":3,\"snapshot\":{\"backend\":\"scalar-cpu\",\"batch_cursor\":1,\"batch_sha256\":\"3ac964b33dc9f80d3e4f87a0a8c7ff2d3230eb2934c08de4250c590f84de2612\",\"clip_cap_bits\":\"3ff0000000000000\",\"completed_updates\":1,\"completed_valid_targets\":3,\"denominator\":\"token-mean-valid-targets-v1\",\"dropout_cursor\":192,\"dropout_key_derived\":true,\"dropout_mapping\":\"course-dropout-counter-v1\",\"dropout_probability_bits\":\"3fe0000000000000\",\"dropout_seed\":39,\"dtype\":\"f64\",\"execution_binding\":[\"31bda0c650a1fbbc88a5abb3bdd83eae3805cfa9c97491784c82f84852fdd35d\",\"c8c20c7164bc9f7feeab804cd7842b11aabe8fd39e42cc28d25b68cf12a1c9a6\",\"bf1fd30e9df48a660bab36227d49dd06c114df7c85cbab2713dd0d84c5822cf6\",8],\"gradient_bits_sha256\":\"bca9c70f51d57c8bbb5d61a31d7c4cbbb37e971bf66589203acdb40d1f72d939\",\"gradient_coordinates\":8304,\"gradient_zero\":true,\"moment_bits_sha256\":\"11e76d730845afee9de2b6794831cf98341ea5c421706e7533167a979fcb4506\",\"moment_coordinates\":16608,\"next_word\":\"1ca7c3cad4620c1a\",\"optimizer_power_bits\":[\"3feccccccccccccd\",\"3feff7ced916872b\"],\"optimizer_step\":1,\"parameter_bits_sha256\":\"02cb363ba12d270f3d7cbde1e2d99f320cc4f4bf6eeb9509966ba0ddf7b807d2\",\"parameter_coordinates\":8304,\"parameter_names\":[\"token_embedding.weight\",\"blocks.0.attention_norm.gain\",\"blocks.0.attention.query.weight\",\"blocks.0.attention.key.weight\",\"blocks.0.attention.value.weight\",\"blocks.0.attention.output.weight\",\"blocks.0.ffn_norm.gain\",\"blocks.0.ffn.gate.weight\",\"blocks.0.ffn.up.weight\",\"blocks.0.ffn.down.weight\",\"blocks.1.attention_norm.gain\",\"blocks.1.attention.query.weight\",\"blocks.1.attention.key.weight\",\"blocks.1.attention.value.weight\",\"blocks.1.attention.output.weight\",\"blocks.1.ffn_norm.gain\",\"blocks.1.ffn.gate.weight\",\"blocks.1.ffn.up.weight\",\"blocks.1.ffn.down.weight\",\"final_norm.gain\"],\"phase\":\"committed-zero-grad\",\"purpose\":4,\"remaining_updates\":3,\"run_sha256\":\"e3958d3647e65f12d73df1ccd181656258f9d00d3f3ba5ef7f1b93e5020456bd\",\"schedule_bits\":[\"3f50624dd2f1a9fc\",\"3f50624dd2f1a9fc\",\"3f50624dd2f1a9fc\",\"3f50624dd2f1a9fc\"]}},{\"all_final_declared_state_equal\":true,\"all_final_moment_and_step_bits_equal\":true,\"all_final_parameter_bits_equal\":true,\"all_remaining_tapes_equal\":true,\"compared_coordinates\":{\"adaptive-delta\":16608,\"adaptive-direction\":16608,\"clipped-gradient\":16608,\"corrected-first-moment\":16608,\"corrected-second-moment\":16608,\"decay-delta\":16608,\"effective-gradient\":16608,\"first-moment\":16608,\"logits\":1596,\"mask-bits\":384,\"mask-words\":384,\"parameter-after\":16608,\"parameter-before\":16608,\"raw-gradient\":16608,\"scalar-bits\":60,\"second-moment\":16608},\"continuation_summary_sha256\":\"2996c9155fa89fbb75db1e090918ad172109d413031692935648265c970edc9a\",\"final_counter\":768,\"next_word\":\"a8c1103f72c54933\",\"point\":\"U2\",\"remaining_updates_compared\":2,\"snapshot\":{\"backend\":\"scalar-cpu\",\"batch_cursor\":2,\"batch_sha256\":\"3ac964b33dc9f80d3e4f87a0a8c7ff2d3230eb2934c08de4250c590f84de2612\",\"clip_cap_bits\":\"3ff0000000000000\",\"completed_updates\":2,\"completed_valid_targets\":6,\"denominator\":\"token-mean-valid-targets-v1\",\"dropout_cursor\":384,\"dropout_key_derived\":true,\"dropout_mapping\":\"course-dropout-counter-v1\",\"dropout_probability_bits\":\"3fe0000000000000\",\"dropout_seed\":39,\"dtype\":\"f64\",\"execution_binding\":[\"31bda0c650a1fbbc88a5abb3bdd83eae3805cfa9c97491784c82f84852fdd35d\",\"c8c20c7164bc9f7feeab804cd7842b11aabe8fd39e42cc28d25b68cf12a1c9a6\",\"bf1fd30e9df48a660bab36227d49dd06c114df7c85cbab2713dd0d84c5822cf6\",8],\"gradient_bits_sha256\":\"bca9c70f51d57c8bbb5d61a31d7c4cbbb37e971bf66589203acdb40d1f72d939\",\"gradient_coordinates\":8304,\"gradient_zero\":true,\"moment_bits_sha256\":\"c16e8543b17d69a22d1a7268d211f82616dd3b3314907946d715e9927c39dac3\",\"moment_coordinates\":16608,\"next_word\":\"acb9215eba9bb7c5\",\"optimizer_power_bits\":[\"3fe9eb851eb851ec\",\"3fefef9fcb0c026d\"],\"optimizer_step\":2,\"parameter_bits_sha256\":\"78c86237e3874a9049ce56121b0ebcdb3ee8fa4f0c42c8f9d9ec761646178c00\",\"parameter_coordinates\":8304,\"parameter_names\":[\"token_embedding.weight\",\"blocks.0.attention_norm.gain\",\"blocks.0.attention.query.weight\",\"blocks.0.attention.key.weight\",\"blocks.0.attention.value.weight\",\"blocks.0.attention.output.weight\",\"blocks.0.ffn_norm.gain\",\"blocks.0.ffn.gate.weight\",\"blocks.0.ffn.up.weight\",\"blocks.0.ffn.down.weight\",\"blocks.1.attention_norm.gain\",\"blocks.1.attention.query.weight\",\"blocks.1.attention.key.weight\",\"blocks.1.attention.value.weight\",\"blocks.1.attention.output.weight\",\"blocks.1.ffn_norm.gain\",\"blocks.1.ffn.gate.weight\",\"blocks.1.ffn.up.weight\",\"blocks.1.ffn.down.weight\",\"final_norm.gain\"],\"phase\":\"committed-zero-grad\",\"purpose\":4,\"remaining_updates\":2,\"run_sha256\":\"e3958d3647e65f12d73df1ccd181656258f9d00d3f3ba5ef7f1b93e5020456bd\",\"schedule_bits\":[\"3f50624dd2f1a9fc\",\"3f50624dd2f1a9fc\",\"3f50624dd2f1a9fc\",\"3f50624dd2f1a9fc\"]}},{\"all_final_declared_state_equal\":true,\"all_final_moment_and_step_bits_equal\":true,\"all_final_parameter_bits_equal\":true,\"all_remaining_tapes_equal\":true,\"compared_coordinates\":{\"adaptive-delta\":8304,\"adaptive-direction\":8304,\"clipped-gradient\":8304,\"corrected-first-moment\":8304,\"corrected-second-moment\":8304,\"decay-delta\":8304,\"effective-gradient\":8304,\"first-moment\":8304,\"logits\":798,\"mask-bits\":192,\"mask-words\":192,\"parameter-after\":8304,\"parameter-before\":8304,\"raw-gradient\":8304,\"scalar-bits\":30,\"second-moment\":8304},\"continuation_summary_sha256\":\"b43d1a32284500b96ff73c4833f4fba4bafe9167597b199f5b577ab84efa9ad6\",\"final_counter\":768,\"next_word\":\"a8c1103f72c54933\",\"point\":\"U3\",\"remaining_updates_compared\":1,\"snapshot\":{\"backend\":\"scalar-cpu\",\"batch_cursor\":3,\"batch_sha256\":\"3ac964b33dc9f80d3e4f87a0a8c7ff2d3230eb2934c08de4250c590f84de2612\",\"clip_cap_bits\":\"3ff0000000000000\",\"completed_updates\":3,\"completed_valid_targets\":9,\"denominator\":\"token-mean-valid-targets-v1\",\"dropout_cursor\":576,\"dropout_key_derived\":true,\"dropout_mapping\":\"course-dropout-counter-v1\",\"dropout_probability_bits\":\"3fe0000000000000\",\"dropout_seed\":39,\"dtype\":\"f64\",\"execution_binding\":[\"31bda0c650a1fbbc88a5abb3bdd83eae3805cfa9c97491784c82f84852fdd35d\",\"c8c20c7164bc9f7feeab804cd7842b11aabe8fd39e42cc28d25b68cf12a1c9a6\",\"bf1fd30e9df48a660bab36227d49dd06c114df7c85cbab2713dd0d84c5822cf6\",8],\"gradient_bits_sha256\":\"bca9c70f51d57c8bbb5d61a31d7c4cbbb37e971bf66589203acdb40d1f72d939\",\"gradient_coordinates\":8304,\"gradient_zero\":true,\"moment_bits_sha256\":\"c192d621f7a0af72796f7e9c92415481bbe3b422299c2bdd6803d4ba805465fe\",\"moment_coordinates\":16608,\"next_word\":\"3f92295d6f3fedb8\",\"optimizer_power_bits\":[\"3fe753f7ced91688\",\"3fefe772d5570166\"],\"optimizer_step\":3,\"parameter_bits_sha256\":\"5016dda3002ea1e5928c80b7e27616857a1a31f5ccd2d177ebd966eed6a6ae8f\",\"parameter_coordinates\":8304,\"parameter_names\":[\"token_embedding.weight\",\"blocks.0.attention_norm.gain\",\"blocks.0.attention.query.weight\",\"blocks.0.attention.key.weight\",\"blocks.0.attention.value.weight\",\"blocks.0.attention.output.weight\",\"blocks.0.ffn_norm.gain\",\"blocks.0.ffn.gate.weight\",\"blocks.0.ffn.up.weight\",\"blocks.0.ffn.down.weight\",\"blocks.1.attention_norm.gain\",\"blocks.1.attention.query.weight\",\"blocks.1.attention.key.weight\",\"blocks.1.attention.value.weight\",\"blocks.1.attention.output.weight\",\"blocks.1.ffn_norm.gain\",\"blocks.1.ffn.gate.weight\",\"blocks.1.ffn.up.weight\",\"blocks.1.ffn.down.weight\",\"final_norm.gain\"],\"phase\":\"committed-zero-grad\",\"purpose\":4,\"remaining_updates\":1,\"run_sha256\":\"e3958d3647e65f12d73df1ccd181656258f9d00d3f3ba5ef7f1b93e5020456bd\",\"schedule_bits\":[\"3f50624dd2f1a9fc\",\"3f50624dd2f1a9fc\",\"3f50624dd2f1a9fc\",\"3f50624dd2f1a9fc\"]}}],\"scope\":\"four-update in-memory fixture; activation scheduler and complete job persistence remain separate\",\"updates\":[{\"categories\":{\"adaptive-delta\":{\"coordinates\":8304,\"sha256\":\"8ab57117f28a665e96dbd7cd1cbdd0612574d9368e3cee34f6a743328b95b5dd\"},\"adaptive-direction\":{\"coordinates\":8304,\"sha256\":\"440f959f67735d2ae43bed0d37b15b702e20e8da3052f3edc38c4d88104a6194\"},\"clipped-gradient\":{\"coordinates\":8304,\"sha256\":\"ca9035b81ecd84cf5d360e3857d580fab22c3fc8aff0e67c2b3992142547d88c\"},\"corrected-first-moment\":{\"coordinates\":8304,\"sha256\":\"d51d7aac45ba4189c7176e25df26d6082383dbc551420857c1734c3e4d100d64\"},\"corrected-second-moment\":{\"coordinates\":8304,\"sha256\":\"158b4926db2fe8c474bf37a865f3fc92b5bc358c426c27560d9b5bbb7522bf7e\"},\"decay-delta\":{\"coordinates\":8304,\"sha256\":\"c9c1c5f35c98ef44d8ed148fb67fd7021a6f4657e5bb45efdcec22037cab8200\"},\"effective-gradient\":{\"coordinates\":8304,\"sha256\":\"ca9035b81ecd84cf5d360e3857d580fab22c3fc8aff0e67c2b3992142547d88c\"},\"first-moment\":{\"coordinates\":8304,\"sha256\":\"918351831cc885693302379899ea601fe30a852c5f39bf04e651328c8f3d28bc\"},\"parameter-after\":{\"coordinates\":8304,\"sha256\":\"02cb363ba12d270f3d7cbde1e2d99f320cc4f4bf6eeb9509966ba0ddf7b807d2\"},\"parameter-before\":{\"coordinates\":8304,\"sha256\":\"3734d4d43805001e6cdc9baadffa74923f9bc70af9223818ef215be75066d43b\"},\"raw-gradient\":{\"coordinates\":8304,\"sha256\":\"5f13758bbf1cbdfbb2b7699876a097549fe597c5cf44e4fd35c85a807075a2f3\"},\"second-moment\":{\"coordinates\":8304,\"sha256\":\"2ccfa35c10c7c3a5226b77ea5a0527f3243e5aee73f449f722fc5af6c7510baa\"}},\"clip_transform_bits\":[\"0000000000000000\",\"3fd38bc6943609e5\"],\"clipped\":true,\"dropout_cursor\":192,\"events\":[\"forward\",\"backward\",\"finite-check\",\"clip\",\"adamw-step\",\"zero-grad\"],\"logit_coordinates\":798,\"logits_sha256\":\"e9fd691edb04d91fdab9ffa06ef510da504709db958847ea54710585446036c3\",\"next_word\":\"1ca7c3cad4620c1a\",\"optimizer_step\":1,\"parameter_tensors\":20,\"ranges\":[[0,48],[48,96],[96,144],[144,192]],\"scalar_bits\":[\"40179c626e4911a9\",\"3f50624dd2f1a9fc\",\"400a31d293b728f4\",\"3ff0000000000000\",\"3fb9999999999998\",\"3f50624dd2f1aa00\",\"3feccccccccccccd\",\"3feff7ced916872b\"],\"step\":1},{\"categories\":{\"adaptive-delta\":{\"coordinates\":8304,\"sha256\":\"776a13c8475e70c4d6c1a62ab989efaec042189229f1b1b8b2db6bee24f9eec6\"},\"adaptive-direction\":{\"coordinates\":8304,\"sha256\":\"7cc838a2feadb44c0d4e099c831c048a2c999c7237efcceda4e5db5071e5143d\"},\"clipped-gradient\":{\"coordinates\":8304,\"sha256\":\"b1a06d587b690c27268c54102038a9d33dd455f98ea68d504a6c1ca86aadd442\"},\"corrected-first-moment\":{\"coordinates\":8304,\"sha256\":\"e8204c5b345cfd6ee17f7195ac6f40a55228f2b2b248f90aeb0b03137f7ecd26\"},\"corrected-second-moment\":{\"coordinates\":8304,\"sha256\":\"78eead26ae31b181674b37a1f4973c61a0339ec2f0800aee437bcd1deed1c0ee\"},\"decay-delta\":{\"coordinates\":8304,\"sha256\":\"c9c0c232752a7f02780cac37f26a450d8048ff165aee10bb8397b11059c1cfbf\"},\"effective-gradient\":{\"coordinates\":8304,\"sha256\":\"b1a06d587b690c27268c54102038a9d33dd455f98ea68d504a6c1ca86aadd442\"},\"first-moment\":{\"coordinates\":8304,\"sha256\":\"6bdc1e52bca59c2983496857e3519669562a08c8936cf9d03dc0e165a9a8aee0\"},\"parameter-after\":{\"coordinates\":8304,\"sha256\":\"78c86237e3874a9049ce56121b0ebcdb3ee8fa4f0c42c8f9d9ec761646178c00\"},\"parameter-before\":{\"coordinates\":8304,\"sha256\":\"02cb363ba12d270f3d7cbde1e2d99f320cc4f4bf6eeb9509966ba0ddf7b807d2\"},\"raw-gradient\":{\"coordinates\":8304,\"sha256\":\"6899c936f3a0984bf29851f5ea14b11981d4a4faf6f42921f7621e56e0266a8f\"},\"second-moment\":{\"coordinates\":8304,\"sha256\":\"fd5375fcb2b5c96fee8656cdf981b27070f2fae98171e11f9ae7b4a538d8c037\"}},\"clip_transform_bits\":[\"0000000000000000\",\"3fc01317dca26049\"],\"clipped\":true,\"dropout_cursor\":384,\"events\":[\"forward\",\"backward\",\"finite-check\",\"clip\",\"adamw-step\",\"zero-grad\"],\"logit_coordinates\":798,\"logits_sha256\":\"b7c2b022c44d316ca017726b7762ddd2e584d0da36c3f14685dee4553f780dbe\",\"next_word\":\"acb9215eba9bb7c5\",\"optimizer_step\":2,\"parameter_tensors\":20,\"ranges\":[[192,240],[240,288],[288,336],[336,384]],\"scalar_bits\":[\"4016d261d8025cf4\",\"3f50624dd2f1a9fc\",\"401fd9fda23a2375\",\"3ff0000000000000\",\"3fc851eb851eb850\",\"3f606034f3fd9300\",\"3fe9eb851eb851ec\",\"3fefef9fcb0c026d\"],\"step\":2},{\"categories\":{\"adaptive-delta\":{\"coordinates\":8304,\"sha256\":\"f78df8a9cc3147c6ca058af1153642f118f5a2a0e7c34f0e26cc11378385af62\"},\"adaptive-direction\":{\"coordinates\":8304,\"sha256\":\"2f81f7f8fe167abe8f0d98957f8505f75b7dbbe462ca07a06c590be1a8cd28e0\"},\"clipped-gradient\":{\"coordinates\":8304,\"sha256\":\"c5a2854cd8f8d692c78e32d6ef0df28c6ff8af812ad72721326df7c8afe70ba2\"},\"corrected-first-moment\":{\"coordinates\":8304,\"sha256\":\"b30cc3b51ab2d61b179e8842cb1d4000c9b4f56cd26df27fc8cd13e9b7c15a3b\"},\"corrected-second-moment\":{\"coordinates\":8304,\"sha256\":\"ccd899781627823c79d7a70e6dcf9e3f31695049b08e81dc60ef3b80299ae4ad\"},\"decay-delta\":{\"coordinates\":8304,\"sha256\":\"ce669c1d6317f8835f838ae2dad54d95003dcb89d245ad4e4d33b47c86488ef8\"},\"effective-gradient\":{\"coordinates\":8304,\"sha256\":\"c5a2854cd8f8d692c78e32d6ef0df28c6ff8af812ad72721326df7c8afe70ba2\"},\"first-moment\":{\"coordinates\":8304,\"sha256\":\"739fc287957bf44acbb8f07442d95a274037bdfb8371825beca78296012879ec\"},\"parameter-after\":{\"coordinates\":8304,\"sha256\":\"5016dda3002ea1e5928c80b7e27616857a1a31f5ccd2d177ebd966eed6a6ae8f\"},\"parameter-before\":{\"coordinates\":8304,\"sha256\":\"78c86237e3874a9049ce56121b0ebcdb3ee8fa4f0c42c8f9d9ec761646178c00\"},\"raw-gradient\":{\"coordinates\":8304,\"sha256\":\"ec78593ba9b3c059db44276cb59de3f35cf18d6ed442018fa8881cce4d6c95e4\"},\"second-moment\":{\"coordinates\":8304,\"sha256\":\"2e6534f4b43799d8a42f9573b18df0dc935ef412fd122041b8cbbe7850a8f20c\"}},\"clip_transform_bits\":[\"0000000000000000\",\"3fcd32a2785ca721\"],\"clipped\":true,\"dropout_cursor\":576,\"events\":[\"forward\",\"backward\",\"finite-check\",\"clip\",\"adamw-step\",\"zero-grad\"],\"logit_coordinates\":798,\"logits_sha256\":\"9a4e218ea3c817805303dad3a2f9883cac0a7c738404b3e641de11047023e060\",\"next_word\":\"3f92295d6f3fedb8\",\"optimizer_step\":3,\"parameter_tensors\":20,\"ranges\":[[384,432],[432,480],[480,528],[528,576]],\"scalar_bits\":[\"401783ad76f91bff\",\"3f50624dd2f1a9fc\",\"4011891b4c7452d2\",\"3ff0000000000000\",\"3fd15810624dd2f0\",\"3f688d2aa8fe9a00\",\"3fe753f7ced91688\",\"3fefe772d5570166\"],\"step\":3},{\"categories\":{\"adaptive-delta\":{\"coordinates\":8304,\"sha256\":\"231a23ed006a836a4c5496421b093616c9c7059f5d962c25f6b6f74f73adc2dd\"},\"adaptive-direction\":{\"coordinates\":8304,\"sha256\":\"5c693087f9cd7a843a51f7b47eb720ab5548255ee6a982e89f68354c6ff7913e\"},\"clipped-gradient\":{\"coordinates\":8304,\"sha256\":\"a9b3c79e91023a2cd79783741f1a3d5ba693c7e15b524ba25775786144f83bbd\"},\"corrected-first-moment\":{\"coordinates\":8304,\"sha256\":\"1e55b176c774abf2a3d39094cf85a0161bbfd248e30662b31c3332e799174f16\"},\"corrected-second-moment\":{\"coordinates\":8304,\"sha256\":\"e6218ca6dfbdda482519d411cada4734df367204bd81463aee6897282336ab64\"},\"decay-delta\":{\"coordinates\":8304,\"sha256\":\"c1ff1c9520bed047c822fd6126760ffc38de413216b79696699d12f993a325f8\"},\"effective-gradient\":{\"coordinates\":8304,\"sha256\":\"a9b3c79e91023a2cd79783741f1a3d5ba693c7e15b524ba25775786144f83bbd\"},\"first-moment\":{\"coordinates\":8304,\"sha256\":\"d52cee914aa7cd9d9c4c9264ce0e4962330c3c52d57f9ce2b612c79c38d63aa5\"},\"parameter-after\":{\"coordinates\":8304,\"sha256\":\"285595449edf24942a6122f88c8babe939b2d8b8d8e800d9f576e953b4b6bd90\"},\"parameter-before\":{\"coordinates\":8304,\"sha256\":\"5016dda3002ea1e5928c80b7e27616857a1a31f5ccd2d177ebd966eed6a6ae8f\"},\"raw-gradient\":{\"coordinates\":8304,\"sha256\":\"1a2403584411548cace8d329892d5b93b308e3c3a526cc9cb4f25b6327770390\"},\"second-moment\":{\"coordinates\":8304,\"sha256\":\"fb07c10981af4b7a1779318e0f1675a253f8dabe345d2f79848f699f4add9fa5\"}},\"clip_transform_bits\":[\"0000000000000000\",\"3fcff920f863803b\"],\"clipped\":true,\"dropout_cursor\":768,\"events\":[\"forward\",\"backward\",\"finite-check\",\"clip\",\"adamw-step\",\"zero-grad\"],\"logit_coordinates\":798,\"logits_sha256\":\"9e89116da967c161e147fbd797912e112476f762bf5c0eddb62b4317c4d3e431\",\"next_word\":\"a8c1103f72c54933\",\"optimizer_step\":4,\"parameter_tensors\":20,\"ranges\":[[576,624],[624,672],[672,720],[720,768]],\"scalar_bits\":[\"4017f4a7e5246c65\",\"3f50624dd2f1a9fc\",\"4010037040d17c3c\",\"3ff0000000000000\",\"3fd6027525460aa4\",\"3f705c0448e48c80\",\"3fe4fec56d5cfaae\",\"3fefdf47f76e36e7\"],\"step\":4}]},\"run\":{\"dropout\":{\"counter_mapping\":\"course-dropout-counter-v1\",\"placement\":\"residual-output-element-dropout-v1\",\"probability_bits\":4602678819172646912,\"purpose\":4,\"schema_version\":1,\"seed\":39},\"legacy_run\":{\"accumulation\":1,\"b\":8,\"backend\":\"scalar-cpu\",\"collectives\":\"none\",\"device\":\"cpu\",\"kernel\":\"existing-scalar-v1\",\"microbatch\":8,\"n\":65536,\"resource_profile\":\"bridge-ci\",\"schema_version\":1,\"seeds\":{\"initialization\":39,\"sampling\":130363,\"shuffle\":104729},\"sharding\":\"none\",\"topology\":\"single-device\",\"world_size\":1},\"schema_version\":2},\"schema\":\"practical-dropout-semantics-v1\",\"schema_version\":1}\n"
  },
  "visualization":{"decision":"useful","id":"dropout-semantics","rationale":{"en":"One aligned relationship shows input transformed by the saved training mask and scale, then reuses that same mask for backward. A kept zero distinguishes a zero output from a dropped element; Eval identity and a replay range clarify execution state."}},
  "decoder_connection":{"en":"Carry exact mode, counter, cache and failure boundaries into Chapter 9's dependency and error contracts. Local site replay and four-update snapshots leave Chapter 12's activation scheduler and Chapter 14's durable job resume for later work."},
  "terminology":[
    {"concept_id":"dropout","en":"Dropout"},
    {"concept_id":"keep-probability","en":"Keep probability"},
    {"concept_id":"inverted-dropout","en":"Inverted dropout"},
    {"concept_id":"saved-mask","en":"Saved mask"},
    {"concept_id":"residual-branch","en":"Residual branch"},
    {"concept_id":"training-and-evaluation-modes","en":"Training and evaluation modes"},
    {"concept_id":"random-counter","en":"Random counter"}
  ],
  "translation_notes":[
    "Deliver English only; retain the locale-aware practical collections, shared math and diagram rendering, caller-owned figure labels and shared glossary dialog. Keep the exact dropout-semantics-term prefix, source/API names, counter ranges and signed-zero bitstrings. Preserve paper p as retention versus course p as dropping, and keep local replay distinct from durable job resume."
  ],
  "acceptance_examples":[
    {"input":"Apply the supplied mask [1,0,1,1] to finite input [2,-4,0,6] with shape [1,1,4], drop probability0.5 and upstream gradient [3,5,7,-2]","expected":"Saved coefficients [2,0,2,2] give training output [4,-0,0,12], final input gradient [6,0,14,-4] and linear probe-12. The third zero input is kept. The second forward output has bits8000000000000000 while its final accumulated input gradient has bits0000000000000000."},
    {"input":"Select Eval with an admitted policy, or Train with drop probability zero, on the worked input","expected":"Return the original input handle and exact input bits, preserving its existing gradient connection without a new dropout operation, mask, key derivation or random word. The worked Eval record reports eval_same_handle true and eval_end_counter0; no_grad does not detach the tracked handle."},
    {"input":"Compare represented-grid uniforms to the requested drop threshold","expected":"The high53-bit conversion produces j/2^53 below one and keeps equality. At half drop, u=0 drops and u=0.5 keeps. For requested p=2^-54, grid zero drops while 2^-53 keeps; the ideal Bernoulli expectation is distinct from the finite-grid and f64 calculation."},
    {"input":"Replay the bridge fixture's original R1, R2 and R3 sites after its complete fresh forward","expected":"Reuse ranges [0,48), [48,96) and [96,144), comparing each site's48 multiplier, output and original-full-loss input-gradient coordinates exactly. The live cursor stays192. Retain the fourth [144,192) ticket for same-core comparison of798 logits, loss and8304 parameter-gradient coordinates. This local recomputation is not the later activation scheduler."},
    {"input":"Restore U1, U2 and U3 committed in-memory snapshots in the four-update fixture","expected":"Restore after updates1,2,3 at live cursors192,384,576, then compare the remaining3,2,1 updates respectively. Each reaches final cursor768 and next word a8c1103f72c54933 with the declared state and tapes equal. The bounded snapshot fixture does not implement durable job resume."},
    {"input":"Compare scaling conventions with the same scalar input2, supplied keep bit1 and retention0.5 through the existing multiplier","expected":"Earlier unscaled Train and retention-scaled Eval give2 and1. Inverted Train and identity Eval give4 and2. This is a linear contribution comparison, not a whole-network equivalence or model-quality result."}
  ],
  "exercises":[
    {"input":"Explain the supplied mask's third zero input, zero output and nonzero input gradient","expected":"Mask bit one retains coefficient two. Upstream derivative seven gives input derivative fourteen. Output zero alone cannot identify a dropped element."},
    {"input":"Explain backward after later mode, policy or counter changes","expected":"The original derivative uses saved mask and scale, giving [6,0,14,-4] for the supplied upstream gradient. Resampling differentiates another forward and is incorrect; backward consumes zero new words."},
    {"input":"Explain an all-dropped small mask","expected":"Zero coefficients give zero numerical outputs and derivatives; a negative input may give negative-zero output. This legal sample has ideal probability one sixteenth in the four-element half-drop fixture and does not preserve each call's norm or sum."},
    {"input":"Inspect Eval under no-grad with an already tracked input","expected":"Identity returns the same tracked handle and gradient connection without creating a new graph. no_grad does not detach it. No mask, key derivation or live cursor advancement occurs."},
    {"input":"Explain changed layout and threshold equality","expected":"Full rectangular batch/token/feature traversal can assign different counters after repacking or changed call boundaries. Keep comparison is u>=p, so equality keeps. For p=2^-54, grid zero drops and 2^-53 keeps; equal seed does not remove layout or environment constraints."},
    {"input":"Compare R1 site replay and U1 four-update continuation","expected":"R1 reuses [0,48) while live cursor stays192. U1 restores declared in-memory state after update one at192, including optimizer and committed zero-gradient phase, then compares the remaining three updates. Neither completes the later activation scheduler or durable job restart capability."}
  ]
}
---
# Practical Chapter 8: optional dropout semantics

<!-- contract-section:scope -->
## Scope

Extend the existing practical decoder with optional inverted dropout. Keep
Train/Eval explicit per call and independent of AutogradContext. Default drop
probability is zero; the bounded correctness fixture uses one half. Preserve
the first course, preceding practical wording, legacy model/run version-one
bytes and digests, learned parameter identities/counts, indexed token-mean loss,
padding/packing and depth-initialization policies. The chapter establishes
mask/mode/gradient/replay correctness, not a generalization or quality benefit.

Reuse SplitMix word generation/conversion, existing constant elementwise
Multiply/VJP, the single prepared-text producer and private decoder core, and
the shared trainer/clipping/AdamW owners. No new random library, autodiff rule,
decoder loop, optimizer, tokenizer compatibility requirement, activation
scheduler or complete job-checkpoint wire format belongs to this chapter.

<!-- contract-section:worked-inputs -->
## Worked inputs

Use finite input `[2,-4,0,6]`, shape `[1,1,4]`, supplied mask `[1,0,1,1]`,
drop/keep probabilities $0.5/0.5$, and upstream `[3,5,7,-2]`. The prescribed
Multiply result is `[4,-0,0,12]` with final input adjoint `[6,0,14,-4]` and
linear probe $-12$. The third zero was kept. This is a supplied mathematical
mask, not a seeded-origin assertion. Enumerate all sixteen masks to separate
distribution averaging from a single call or a stochastic-frequency test.

Predetermined active primitive seeds are exactly `0,1,2,3,4,5,6,7,8,39`,
purpose four, start zero, end four. Compare every generated word, mask,
forward/final-gradient bit pattern and counter against the full blueprint's
predeclared vectors. Preserve signed-zero distinctions rather than normalize
output to hide them.

Use the actual bridge $V=266,D=16,L=2,H_q=H_{kv}=2,F=20,C=16$ with
initialization and dropout seeds `39`, inputs `[0,99,100]`, targets
`[99,100,1]` and positions `[0,1,2]`. All three targets are eligible. Each of
four complete sites has $48$ entries, so a fresh forward reserves $192$ words.
These are supplied valid-ID CPU fixtures, with no corpus or tokenizer claim.

<!-- contract-section:formula -->
## Formula

For fixed finite input and ideal Bernoulli mask, define requested drop
probability $p$, keep probability $q=1-p$, $0\le p<1$, mask bit
$m_i\in\{0,1\}$ and upstream $g_i=\partial\mathcal L/\partial y_i$.
One means keep and zero means drop. Train computes $y_i=m_i x_i/q$;
backward computes $(m_i/q)g_i$ from the same saved mask and scale. Eval returns
the input unchanged and passes the supplied derivative unchanged. Probability
is a fixed policy input, not learned.

Ideal $\mathbb E[y_i\mid x_i]=x_i$ and
$\operatorname{Var}(y_i\mid x_i)=p x_i^2/(1-p)$ apply only under the stated
Bernoulli assumption. Individual magnitude, sum or norm need not be preserved;
all-drop is legal. The expectation of a nonlinear stochastic network need not
equal deterministic Eval, and no quality benefit follows.

The concrete high-53-bit grid uses $u=j/2^{53}$ with integer
$0\le j<2^{53}$ and keeps on $u\ge p$. Under uniform words its effective
drop probability is $\lceil p2^{53}\rceil/2^{53}$. Half is exactly on-grid.
At $p=2^{-54}$, zero drops and $2^{-53}$ keeps. Requested-scale expectation
is $x_i(1-p_{\mathrm{effective}})/(1-p)$ off-grid even before `f64` rounding.
Keep requested probability/scale bits; do not silently substitute effective
probability. Local negative-zero Multiply contributions and final accumulated
adjoints are distinct; identity paths preserve exact input bits.

<!-- contract-section:history -->
## History

Use the dated 2012 Hinton et al. preprint's pages one–two for training unit
omission and an unthinned test network with halved outgoing weights in the
one-half case. Use the 2014 JMLR dropout paper for retention-probability masks,
sampled-subnetwork backward and retention-scaled outgoing inference weights.
The 2014 paper's $p$ is retention; ours is dropping with $q$ retention.

The related scalar Rust contrast uses the same existing multiplier. Scaling an
outgoing weight is equivalent to activation scaling for that linear
contribution. Explain earlier unscaled training/retention-scaled Eval versus
inverted training/identity Eval. Do not claim a whole-network equivalence,
global historical priority, course-policy provenance or a quality result.
PyTorch 2.14 notes supply contextual execution-environment limits only; do not
assign their inspection date as publication year or use them as an oracle.

<!-- contract-section:rust-behavior -->
## Rust behavior

`DropoutProbability` rejects invalid/nonfinite probabilities and nonfinite
scale; accepted exact policy bits are retained, including signed zero. Active
arithmetic validates finite input and generated output without clipping repairs.
`DropoutPolicy` defaults to zero. Eval and zero return the same handle with
exact bits/gradient connection, no new dropout graph, masks, key derivations or
words. no_grad prevents new graph recording, not retroactive identity detachment.
Positive Train samples with or without graph recording.

Freeze `residual-output-element-dropout-v1`: after the complete attention
$W_o$ and complete SwiGLU $W_{\mathrm{down}}$, immediately before their
residual additions. Do not mask the unchanged residual, attention probabilities,
embeddings, gains or vocabulary logits. Traverse ascending blocks, attention
then FFN, row-major $B,T,D$ including PAD cells. Separate attention/valid-target
masks remain unchanged. Layout or microbatch changes do not automatically
preserve stochastic masks.

Purpose registry is initialization1, corpus-order2, packing3,
optional-dropout4, sampling5, evaluation-bootstrap6. `course-dropout-counter-v1`
uses the existing SplitMix increment $G$ and one-next operation:
$k=\operatorname{next}(s\oplus(4G\bmod2^{64}))$,
$w(c)=\operatorname{next}((k+Gc)\bmod2^{64})$,
$u(c)=\lfloor w(c)/2^{11}\rfloor2^{-53}$.
Only specified PRNG word arithmetic wraps. Counts, allocations, range ends and
live cursor arithmetic are checked. Admit full shape/resource/range before
sampling; exhausted cursor never wraps. State isolation is not a statistical
independence or cryptographic guarantee.

One candidate state spans a complete forward and commits only after success.
A later failure retains caller cursor, parameters and pre-existing gradients,
publishing no partial result/tickets. Preserve disabled-path error precedence.
Do not promise allocator/graph-ID rewind or global backward/optimizer rollback.
An after-forward training failure requires last-good state/phase restoration
before retry. Cached legacy calls select explicit Eval and no_grad; cached
Train rejects before cache/work/dropout mutation.

Run wrapper `DropoutRunConfig` has schema two and domain
`decoder-dropout-run-v2`; dropout policy/mapping have version one. Legacy run
bytes/digest stay unchanged. Strict existing canonical parsing validates every
new policy field and bits, with mandatory `8gb-gpu-core` dropout disabled.

Opaque tickets bind versions, purpose, seed/key, policy/scale bits, range,
layer/site, actual shape, accepted run/text-layout/model-revision phase.
Complete replay checks original live parameter nodes/revisions and contiguous
site tickets before core work. Operator replay accepts no live counter and
consumes zero live words. Same shape alone does not authorize changed input or
weights. Replay remains text-owned; no public arbitrary hidden-input core is
introduced.

R1/R2/R3 regenerate sites `[0,48)`, `[48,96)`, `[96,144)` and compare
multiplier/output/input-gradient bits using original full-loss adjoints. Live
cursor stays192; the fourth `[144,192)` ticket is retained for same-core full
logits, loss and every parameter-gradient comparison after deliberate zero-grad.
This does not complete practical12 activation scheduling or measured savings.

U1/U2/U3 capture committed zero-gradient states after updates1/2/3 at
192/384/576, restoring the bounded repeated-batch four-update harness to final768.
Use existing scheduled AdamW/clip order with learning rate0.001, beta1/2
0.9/0.999, epsilon1e-8, decay0.01 and global norm cap1. Snapshots capture all
declared parameters/names/order/admitted identity, moments/step, zero-grad and
commit phase, dropout state, run/config/dtype/backend, batch identity/cursor,
target count/denominator, optimizer settings/schedule and remaining updates.
Restore typed independent parameter nodes and exact admitted identity. Compare
every remaining mask, word, logit, loss, gradient/clip/update trace, parameter,
moment, step, final cursor/next word and declared discrete state. Reject missing
or mismatched counter/phase/policy/run/batch state and restore after-forward
failure before retry. This in-memory harness is not practical14 durability or
complete job resume; component checkpoint wire version one stays unchanged and
does not acquire admitted training-job authority.

<!-- contract-section:visualization -->
## Visualization

One complete static semantic figure uses `dropout-semantics`, shared
`course-v1` roles and existing full-view behavior. Its aligned relationship is
input → saved mask/Train coefficient → output, then upstream → same coefficient
→ input gradient. Mark the third feature kept zero with text and structure.
Include Eval same-handle identity and a compact R1 original/replayed range with
unchanged live cursor. Caption and accessible description convey these
relationships without color, nearby prose or an unexplained list of numbers.
Use caller-localized labels and executed compact trace values. No private
script/control/dialog, duplicate tree, hydration, clipping or reduced type.
Use the smallest named keyboard-reachable shared scroll region for any aligned
table travel; mark bounded content boxes and contain their own text/math ink.

<!-- contract-section:exercises -->
## Exercises

After the direct explanation, worked formula/Rust, scoped history and figure,
offer optional reproduction/inspection/explanation with six checked answers:
kept-zero derivative; saved forward mask after later calls; legal all-drop;
tracked Eval under no-grad; finite-grid equality and layout-sensitive counters;
and local R1/U1 state versus future scheduler/durable resume. No rhetorical
opening or predict-before-teaching activity appears.

Reproduction uses repository-root Docker-backed offline locked Cargo with the
actual package and optional `--trace`. Place cwd, setup, inputs and observed
result beside commands; the default is compact canonical JSON and verbose
output is NDJSON from the same fixture owner, not a large committed tape.

<!-- contract-section:decoder-connection -->
## Decoder connection

Chapter7's admitted private text core now receives optional branch dropout
without altering earlier masks/loss/initialization. Chapter9
`09-dependency-error-contract` consumes precise failure timing and local
unchanged-state promises, including the difference between complete-forward
failure and later update failure. Practical12 and14 retain separate real
activation-scheduler and durable job-continuation gates.

<!-- contract-section:localization -->
## Localization

English only. Retain shared course/locale rendering, math, caller-localized
figure labels and progressive glossary architecture with exact term prefix
`dropout-semantics-term`. Do not create Russian practical placeholders or
alter previous learner wording. Author commitments and neutral semantic role
requirements are frozen outside product sources before independent review;
the author does not issue a publication verdict.

<!-- contract-section:acceptance -->
## Acceptance

Require the exact predeclared ten-seed words/masks/forward/final-gradient bits,
fixed-mask kept zero, all-keep/all-drop, probability/grid/signed-zero/identity,
all mode/tracking pairs, saved backward, range overflow and purpose isolation.
Central difference holds the mask fixed, step $10^{-6}$, bound
$|g_a-g_n|\le10^{-7}+10^{-5}\max(|g_a|,|g_n|)$.
Keep exact legacy reference/bridge/padded/packed logits, indexed mean loss and
all named unique parameter gradients, existing RNG/cache/trainer/checkpoint
regressions and late-failure/cached-Train/ticket-binding/resource cases.

Require all three R and all three U points with complete declared bitwise
comparisons. No resampled backward, second decoder/update algorithm, guessed
restart seed, seed replacement, omitted phase or final-loss-only comparison
substitutes for those boundaries. Preserve failed attempts separately.

Actual mask storage is `f64`: $8BTD$ data bytes per site or $16LBTD$ if both
sites across all blocks are live. Nominal reference/bridge/laptop subtotals are
4096/65536/33554432 bytes, not allocator peaks. Extend existing planner/liveness
accounting for outputs, saved primals, adjoints and reserve; laptop active
numbers are counterfactual, and mandatory core stays off. Bound activation
entries to1000000, explicit masks to67108864 bytes, actual CPU child RSS to
268435456 bytes, disk to1073741824 bytes and compiled workload to600seconds.
Static limits and calculations do not replace actual measured evidence.

Validate exact real default stdout/expected/compact site trace and detailed
NDJSON evidence, source regions, formulas, static content/links and sole
supported Firefox layout/behavior. Check figure inline/full view, narrow/
desktop/forced-color/direction, keyboard/focus and nearest-box text/math ink;
no routine image review. Complete candidate/evidence/source/built/policy/live
plan/full-blueprint four-artifact technical/adjudication packets remain below
2097152 bytes and pass independent two-review/two-adjudication gates. Root
owns final publication, canonical byte identity and completion decision.
