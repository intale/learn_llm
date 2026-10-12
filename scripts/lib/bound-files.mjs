// Shared exact-byte plumbing for product locks and exported development evidence.
import {createHash} from 'node:crypto';
import {lstatSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

export const MAX_INPUT_FILE_BYTES = 16 * 1024 * 1024;
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const utf8Compare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort(utf8Compare).map(k => [k, canonical(value[k])]));
  return value;
}
export function canonicalJson(value) {
  return `${JSON.stringify(canonical(value))}\n`;
}
export function closed(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort()))
    throw new Error(label + ': exact closed keys required');
}
export function readRegularFile(root, path, limit = MAX_INPUT_FILE_BYTES) {
  if (typeof path !== 'string' || !path || !/^[A-Za-z0-9_./\[\]-]+$/.test(path) ||
      path.startsWith('/') || path.split('/').some(p => !p || p === '.' || p === '..'))
    throw new Error('unsafe repository-relative path');
  const parts = path.split('/');
  let current = resolve(root);
  for (let i = 0; i < parts.length; i++) {
    current = resolve(current, parts[i]);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || (i === parts.length - 1 ? !stat.isFile() : !stat.isDirectory()))
      throw new Error('symlink/nonregular input: ' + path);
    if (i === parts.length - 1 && stat.size > limit) throw new Error('oversized input: ' + path);
  }
  return readFileSync(current);
}
export function jsonFile(root, path, limit = MAX_INPUT_FILE_BYTES, canonicalBytes = false) {
  const bytes = readRegularFile(root, path, limit);
  const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  if (canonicalBytes && !bytes.equals(Buffer.from(canonicalJson(value))))
    throw new Error('noncanonical/duplicate JSON input: ' + path);
  return value;
}
