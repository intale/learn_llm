#!/usr/bin/env node
// No live acquisition authority is available at the Chapter41 boundary.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function runAcquisitionCommand(args, {write = text => process.stderr.write(text)} = {}) {
  if (args.length === 1 && args[0] === '--help') {
    write('Chapter41 implements a Rust-governed protocol and injected offline fixtures only. Live acquisition is disabled; the separate artifact-cache execution boundary remains pending.\n');
    return 0;
  }
  write('Live artifact acquisition refused: Chapter41 has no corpus-download or artifact-cache execution authority. Use the offline Rust fixture tests; this entrypoint does not open a network connection or write a corpus.\n');
  return 2;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href)
  process.exitCode = runAcquisitionCommand(process.argv.slice(2));
