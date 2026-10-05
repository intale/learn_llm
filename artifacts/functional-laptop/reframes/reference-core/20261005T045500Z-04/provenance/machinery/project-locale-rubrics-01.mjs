import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] ?? '.');
const old = '.build/runs/20261005T020709Z-reference-core-cheat-sheet-correction-02';
const run = '.build/runs/20261005T045500Z-reference-core-command-reframe-04';
const proposalPath = `${run}/publish/audits/functional-laptop/reviews/reference-core-reframe/russian-selection-01/inventory-proposal.json`;
const read = p => readFileSync(resolve(root, p)), sha = b => createHash('sha256').update(b).digest('hex');
if (sha(read(proposalPath)) !== '27326faec5942dca4abc02eace54d1e05f9c328a4d583948cf8a33afd7ea1be8') throw Error('Approved locale proposal drift');
const proposal = JSON.parse(read(proposalPath));
const roles = proposal.neutralRoleMap;
if (roles.length !== 84 || roles.some((r, i) => r.order !== i + 1)) throw Error('Approved role order drift');
const reports = [];
for (const role of ['bilingual', 'target-only']) {
  const input = `${old}/authoring/${role}-rubric-03.md`, output = `${run}/authoring/${role}-rubric-04.md`;
  const original = read(input).toString(), marker = '```json\n';
  const start = original.indexOf(marker), end = original.indexOf('\n```', start + marker.length);
  if (start < 0 || end < 0 || original.indexOf(marker, start + marker.length) >= 0) throw Error('Nonunique root role map');
  const existing = JSON.parse(original.slice(start + marker.length, end));
  if (existing.length !== 82) throw Error('Prior rubric map count');
  const prefix = original.slice(0, start + marker.length), suffix = original.slice(end);
  const text = prefix + JSON.stringify(roles, null, 2) + suffix;
  writeFileSync(resolve(root, output), text, { flag: 'wx' });
  if (!read(output).subarray(0, Buffer.byteLength(prefix)).equals(Buffer.from(prefix)) || !read(output).subarray(-Buffer.byteLength(suffix)).equals(Buffer.from(suffix))) throw Error('Root rubric note bytes changed');
  reports.push({ input, inputSha256: sha(read(input)), output, outputSha256: sha(read(output)), roles: roles.length, prefixAndSuffixByteExact: true });
}
writeFileSync(resolve(root, run, 'authoring/locale-rubric-projection-01.json'), JSON.stringify({ schemaVersion: 1, rootApprovedProposalSha256: sha(read(proposalPath)), reports, limitations: 'Mechanical approved neutral-map projection only, no language judgment or new role semantics.' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(reports));
