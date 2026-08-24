# Pinned API contract — ADD-OS Postman collection

## Why a snapshot exists at all

The canonical, always-current collection lives **outside this repo**, in the backend
project:

    C:\Users\User\Desktop\Aleppo Digital District\ADDCore\postman\ADD-OS.postman_collection.json

That file is kept up to date by the backend team, which is exactly why it cannot be
what a code comment or doc cites: "confirmed from the collection" is meaningless if the
file changed after the claim was written. `ADD-OS.postman_collection.json` in this
directory is a **byte-for-byte, dated copy** of that file. Any "per the collection" /
"confirmed from the collection" claim in this codebase cites *this* snapshot, by the
pin date below — never the live file directly.

`pnpm api:collection:check` (`scripts/check-api-collection.js`) hashes both files and
reports whether they still match. **A mismatch means every claim sourced from this
snapshot is unverified until someone re-reads the canonical file and re-pins it.**

## Current pin

| | |
|---|---|
| Pinned | 2026-08-24 |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time |
| Size | 785,293 bytes / 7,627 lines |
| Leaf endpoints (parsed) | 205 — `GET` 64, `POST` 80, `PUT` 21, `PATCH` 18, `DELETE` 22 |

That count is 205, not the 192 that had been quoted going into this pass — noted, not
reconciled: either the canonical file moved again between when 192 was last counted and
this pin, or a different counting method was used. Whichever it is, 205 is what a
structural parse of *this* pinned copy returns.

## Credential scan at pin time (2026-08-24) — clean

- Every one of the 20 collection-level variables (`member_token`,
  `member_refresh_token`, `member_reset_token`, and assorted `*_id` variables) has an
  **empty** `value`. No collection-level `auth` block. No literal `base_url` anywhere —
  every reference is the placeholder `{{base_url}}`.
- 21 requests carry a per-request `auth: {type: "bearer", ...}` block; every one
  resolves to the placeholder `{{member_token}}`, never a literal value.
- 5 requests carry a literal `Authorization` header string; every one is exactly
  `Bearer {{member_token}}` — placeholder, not a populated token.
- Zero `Cookie` headers anywhere in the file.
- A broad scan for AWS-style keys, PEM private keys, Stripe-style `sk_`/`pk_` secrets,
  JWT-shaped strings, and long hex/base64 blobs found zero matches.

Per Invariant 6, this record names variables, never values — there is nothing here to
redact because nothing here is populated.

## Encoding finding at pin time (2026-08-24) — not fixed, source is authoritative

The file's raw bytes decode as **strict, valid UTF-8** — no invalid byte sequences. But
some description fields carry real mojibake baked into those valid bytes: the sequence
`â€”` (a double-encoded em dash — UTF-8 bytes for three separate characters, itself
valid UTF-8, but not the character it was supposed to be) appears **66 times**,
alongside a correctly-encoded literal em dash (`—`) appearing **17 times** in the same
file. The corruption is inconsistent within one document, which points at mixed
authoring sources upstream (e.g. some descriptions pasted through a tool that
mis-decoded UTF-8 as Latin-1/CP1252 before re-saving, others typed directly). This is
present in the canonical source itself, not introduced by pinning it here, and it is
**not corrected** in this snapshot — an edited contract is no longer the contract.
Worth raising with the backend team separately; not actioned here.

## Re-pinning

1. Run `pnpm api:collection:check`. If it reports `MATCH`, nothing to do.
2. If it reports `MISMATCH`: read the canonical file fresh, repeat the credential scan
   and encoding check above, and report findings the same way — stop and report instead
   of committing if anything credential-shaped now has a populated value.
3. Copy the canonical file over this one byte-for-byte (no hand edits, no reformatting).
4. Update "Current pin" above with the new date, size, endpoint count, and scan
   results — **append**, don't overwrite the prior pin's record, so a future reader can
   see when a given claim's citation stopped being current.
5. Update the pin date in `CLAUDE.md`.
