# Fresh-context capacity recovery

Two initial named reviewer-spawn attempts were refused by the platform before
creating a reviewer context. Neither failure is review evidence.

Root inspected `list_agents` and metadata-only current child records. The only
selected archival targets were these completed, non-running machinery tasks:

- `/root/ch42_content_templates`: native thread
  `01a1116d-01c3-7fe1-a738-f8e6aaca4f04`.
- `/root/ch42_startup_machinery`: native thread
  `01a11106-a250-7ca0-b159-304f5a921fdd`.

Root reports `set_thread_archived(true)` confirmed both exact targets archived;
the first archival removed the completed content task from the live agent tree.
This reversible capacity action preserved their files, logs and history. Root
and the running packager were not archived, and no unrelated app task was touched.
The ledger worker may be restored for its later operational handoff.

Current fresh reviewer routing retries use the already frozen identities and
inputs. Native linkage capture distinguishes uncreated earlier attempts from
the actual newly created child; no judgment, verdict or settings are fabricated.
This note records root-reported operational results, not independent plaintext
recovery of encrypted native API arguments or any language-review approval.
