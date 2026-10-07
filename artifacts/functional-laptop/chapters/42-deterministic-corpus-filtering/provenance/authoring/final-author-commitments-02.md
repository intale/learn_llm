## Evidence and claims

C1 Problem and scope: complete lesson opening and metadata must establish that
byte verification does not admit every record for training. Ordered first-terminal
filtering preserves reason and reached population. The first reached rejecting
or manual-review rule supplies a terminal decision and stops evaluation; surviving
every rule yields retention with no first terminal rule. Each record receives one
disposition under the ordered policy. Only synthetic course-authored evidence is
available. Evidence: actual demo fixture_records/run_fixture/demo_report,
FilterPolicy/evaluate, source-bound verification, output and tests; Chapter41
selection contract. Exclude real-corpus rates, model training, unrestricted use,
privacy, fairness, memorization and quality certificates.

C2 Framing: selected end-of-input-delimited-v2 uses complete physical marker lines
with LF/CRLF/exact EOF; embedded text is not a separator. Final nonempty payload
closes at EOF; final separator adds no phantom; consecutive separators empty.
Half-open payload and delimiter spans cover each raw byte once. Failed read is
not EOF and no successful report follows mismatch. Evidence: stream.rs and its
8 tests plus body-free independently measured real-source framing observations.
No fallback-format inference or newline/token equivalence.

C3 Worked fixture: literal eight records in fixture_records; firstfour train/
lastfour validation,14separatorbytes per record,136/151sourcebytes. Raw175,
separator112,physical287;decoded107/undecoded68;normalized101 split8/65/28.
Raw source names do not define final splits. Raw payload length is not a
normalized-byte count; records rejected before decoding have no normalized
length. Evidence: actual generated stdout and fixture_counts test.
No captured real secret/address or production filtration report.

C4 Rules: rawlimit64,strictUTF8,normmin4,ASCIIlettersmin1,case-insensitive ASCII
literal demo-key=CANARY,case-sensitive contact=,share0/1. Exact normalization
CRLF-to-LF then edge space/tab/CR/LF only; preserve case/internal/Unicode.
The decoded fixture payloads' trailing LF is trimmed at the text edge;
internal LF characters remain unchanged. ASCIIshare counts non-ASCII-whitespace
Unicode scalars, not bytes/tokens; exact integer crossproducts/checked overflow,
zero denominator unavailable. Production65,536/16/8/share1/2 distinct; no implied
fixture rates under that policy. Evidence: FilterPolicy/evaluate/normalize,
normalization_preserves_case_internal_spaces_and_unicode, coverage/matcher tests
and the literal fixture payloads.

C5 Accounting: the first reached rejection or manual-review decision stops
evaluation; retention follows survival of every rule and has no first terminal
rule or rule-terminal count. Seen populations8,7,6,5,4,2,1;each row
seen=terminal+survived;secret2/4 not2/8. Terminal includes rejection and manual
hold; zero seen gives unavailable, never zero. The manual-marker rule sees two
records, holds one and has one survivor; reaching that rule is not receiving its
review disposition. Final8=1ret+6rej+1manual;coarse ineligible7=6+1. Only retained
candidates consumable, no approval override. Evidence: evaluate and core stage
rate tests, demo actual12tests/stdout; math derivation.

C6 Order/identity: r7 secret first/manual not evaluated;swap moves it to manual,
counts1/5/2;raw selection and occurrence IDs unchanged;policy and derivedartifact
IDs change. Occurrence binds selected rawartifact/payload/source/filehash/span;
same text different spans distinct. Selection-config hash differs from canonical
manifest artifact hash. Evidence: swapped-order, policy/proof and occurrence
regressions, matching-proofs manualeligibility failure.

C7 Output/consumption: generic Read/FilterSink/Write; library JSON/SHA/I/O plumbing,
Rustowns taught algorithm. Boundedoversized drain; callbacks/writes provisional
until complete length/hash/finalization success. Body-free findings only source/
span/ID/evaluatedrules/reason, no snippet/capture. First32samples/source/reason
do not truncate counters/fullfindings. Findings+receipt strict<100MiB metadata
budget; overbudget fails, not truncated success. Independently selected retained
artifact+role/policy/source/span/text digest and normalizedeligibility rechecked;
no prefix training/self-selected authority/relabelingmanual. Evidence: complete
core implementation/core33tests, demo12tests, selected consumption tests. Adapter
owns atomic publication/durability/cleanup; no universal arbitraryadapter crash
claim and no hardcoded filesystem/source retrieval.

C8 Historical: C4 2021 SRC-DTH-DATA-02 approvedACL paper supports studying
exclusions/blocklist disproportionate minority-content removals. RefinedWeb2023
SRC-DTH-DATA-06 approvedNeurIPS paper supports filtered+deduplicated largeweb
corpus/model evaluation. Bounded author primary-source observations/locators bind claims, not raw HTTP responses or extractor captures. No isolated
causal benefit, adoption/scale/result transfer to this fixture. Binarybooldemo
is course-local reporting contrast, not either paper implementation.

C9 Figure: actual Rusttrace7stage rows originalintegerstrings/exactfractions,
threefinaldispositions/r7stop. Readingorderpopulation→stageflow→totals/earlystop.
Each denominator explicitly reachedrecords; the two records reaching the
manual-marker rule comprise one terminal review hold and one survivor, not two
review dispositions. No later fabricated result. One static
semanticfigure/sharedmodule/fullview/no privateclienttree. Programmatic
Firefox/static/math/a11y evidence only; no image interpretation verdict.

C10 Practice/withdrawal/handoff: optional explained tasks exactrepo-rootDocker
commands, corpusdisabled, and the named tests' existing Cargo behavior. Literal
Docker commands remain a required later operational validation gate, not a
successful command run already observed for this candidate. The byte-accounting
answer identifies the trailing LF in each decoded fixture payload: trimming that
text-edge LF changes normalized bytes, not raw/physical bytes already read;
internal LF characters remain unchanged. Evidence: literal fixture_records,
normalize and its tests, fixture_counts_and_byte_conservation and actual stdout.
Fictionalgraph raw sourcealiasr0 differsfrom recordlabelr0 and realdigest.
a0/f0/s0/tok0/w0 known descendants once sorted,w0two paths,f9unrelated.
Validatebounds/references/cycles before traversal. No physicaldeletion/unlearning/
unknowncopydiscovery/trained checkpoint. Retained candidates go to deduplication
then finalsplit/tokenizer; scalarreference unchanged. Evidence:
deletion4tests/demolineage2tests/current accepted Cargo unit/demo/golden proofs
and nextownercontract. The authentic receipt-bound production candidate must pass
all four exact documented Docker commands after the fresh English chain and
before publication; no failed activation/build attempt is learner-command success.
