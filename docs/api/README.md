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
| Pinned | 2026-08-25 — **second pin of this date**, see the citation note below |
| `sha256` | `86d330d9…dafede8a` |
| Source | the canonical path above, read directly, copied byte-for-byte (`Copy-Item`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time, plus a full byte-sequence comparison (the `cmp` step) |
| Size | 788,798 bytes / 7,664 lines |
| Leaf endpoints (parsed) | 207 — `POST` 80, `GET` 66, `DELETE` 22, `PUT` 21, `PATCH` 18 |
| Distinct `METHOD + URL` pairs | 188 |

### Citation note — two pins share the date 2026-08-25

This is the first time a re-pin has landed on the same calendar day as the pin it
supersedes, which momentarily breaks the "cite by date" scheme: a comment reading "pinned
2026-08-25" now matches two records. **Existing citations remain valid, and none needs
editing**, for a reason specific to this delta rather than as a general rule — see the next
section: the only change was a `description` string on `Public (Site) / Get Kiosk Data`. No
endpoint, method, URL, body or rule moved, so every claim sourced from the first
2026-08-25 pin is sourced identically from this one.

Where the two must be told apart, the `sha256` prefix in the table above is the
disambiguator: `86d330d9…` is this pin, `de3e1f14…` was the first. A future same-day
re-pin that *does* change a contract should record the `sha256` in the citing comment, not
just the date.

### What changed since the first 2026-08-25 pin

The delta was measured line-by-line against the outgoing snapshot before copying, not
assumed from the size difference. It is **two diff entries, which are the two halves of one
changed string**, and nothing else:

- `Public (Site) / Get Kiosk Data` — its `description` now documents
  `app_download.app_store` / `app_download.google_play` where it previously documented a
  single `app_download.url`, notes that the `plans` section carries no currency conversion
  and resolves `name` to one string for the request's `lang` header, and adds that the
  Setting rows behind `app_download` / `arrival_qr` are editable via Admin > Settings.

Line counts are identical on both sides (7,664); the file grew 170 bytes. **No endpoint was
added or removed, and no existing request's method or URL changed** — which is why the leaf
count stays 207 and the distinct-pair count stays 188, both unchanged from the first
2026-08-25 pin.

Relevance to work in flight: the ADD OS kiosk module
(`docs/superpowers/specs/2026-08-25-kiosk-module-design.md`) does not call
`GET /api/v1/public/kiosk` at all — that endpoint is consumed by the kiosk display device.
Its `Announcements` and `Arrival Requests` folders are byte-identical across both pins. The
changed description matters to whoever builds the Settings screen, and is carried into that
spec's Open table for them.

### Counting conventions, so no two numbers here read as a contradiction

- **Lines.** 7,664 counts the trailing split after the file's final newline, which is the
  convention every record in this file uses. Tools that count content lines report 7,663
  for the identical bytes. Both describe the same file.
- **Endpoints.** 207 counts *leaf requests*; the collection deliberately ships same-URL
  variants under different names (a success case and its `— Error:` sibling). Counting
  distinct `METHOD + URL` pairs instead gives 188. Both are unchanged across this re-pin.

## Credential scan at pin time (2026-08-25, second pin) — clean

Both halves re-run against the canonical file before copying, not carried over from the
previous record. Structural checks, all passing:

- Every one of the 20 collection-level variables (`member_token`,
  `member_refresh_token`, `member_reset_token`, and assorted `*_id` variables) has an
  **empty** `value`. No collection-level `auth` block. Zero literal `base_url` values —
  all 414 references are the placeholder `{{base_url}}`.
- 21 requests carry a per-request `auth: {type: "bearer", ...}` block; all 21 auth
  entries resolve to a `{{...}}` placeholder, never a literal value.
- 5 requests carry a literal `Authorization` header string; every one matches
  `Bearer {{placeholder}}` — never a populated token.
- Zero `Cookie` headers anywhere in the file.
- A broad scan for AWS-style keys, PEM private keys, Stripe-style `sk_`/`pk_` secrets,
  JWT-shaped strings, Google API keys, GitHub tokens, Slack tokens, Sanctum-style
  `id|hash` tokens, and long hex blobs found **zero** matches.
- One long base64-alphabet match, as before, cleared as a false positive — re-verified
  structurally this time rather than by eye: it sits inside a `description` field, is a
  7-segment slash-separated run of alphabetic words, and contains no digits. Not encoded
  data.

The password-field check that the 2026-08-24 pass lacked, and the first 2026-08-25 pass
added, was re-run here. It reports **the same three distinct literal values across the same
seven fields in the same three requests** — `password` / `password_confirmation` in
`Admin (Dashboard) / Password / Update Password` and `Admin (Dashboard) / Users / Create
User`, and `password` / `password_confirmation` / `token` in
`Admin (Dashboard) / Password / Reset Password`.

They are unchanged: the measured delta for this re-pin is one `description` string, so
these fields are byte-identical to both prior snapshots and were already committed to this
repo and its history. Re-pinning does not increase exposure, and declining to re-pin would
not reduce it. The structural assessment is re-confirmed independently — each is a run of
complete alphabetic words joined by a single separator, spanning 2 of 4 character classes,
with no digits, and the `token` one all-caps. No entropy; documentation placeholders, not
credentials.

Per Invariant 6 and `.claude/rules/docs-discipline.md`, this record names fields and
requests and **never a value, any fragment of one, or a length precise enough to narrow a
guess.**

**Owner: Backend.** Still worth asking the ADDCore team to replace these with `{{...}}`
variables, the way every other sensitive field in the collection already is. Carried
forward unactioned across three pins now; it is their file.

## Encoding finding at pin time (2026-08-25, second pin) — not fixed, source is authoritative

Re-measured against this copy, not carried over. The file's raw bytes decode as **strict,
valid UTF-8** — verified by a byte round-trip, not merely by the absence of replacement
characters. But some description fields carry real mojibake baked into those valid bytes:
the sequence `â€”` (a double-encoded em dash — UTF-8 bytes for three separate characters,
itself valid UTF-8, but not the character it was supposed to be) appears **66 times**,
alongside a correctly-encoded literal em dash (`—`) appearing **17 times** in the same
file. Both counts are identical to the two prior pins, so the changed description
introduced no new corruption. The corruption is inconsistent within one document, which
points at mixed authoring sources upstream (e.g. some descriptions pasted through a tool
that mis-decoded UTF-8 as Latin-1/CP1252 before re-saving, others typed directly). This is
present in the canonical source itself, not introduced by pinning it here, and it is **not
corrected** in this snapshot. Worth raising with the backend team separately; not actioned
here.

## Re-pinning

1. Run `pnpm api:collection:check`. If it reports `MATCH`, nothing to do.
2. If it reports `MISMATCH`: read the canonical file fresh and repeat **both** halves of
   the scan above — the structural checks (variables, `auth` blocks, `Authorization` and
   `Cookie` headers, literal `base_url`), *and* the pattern and password-field checks.
   Stop and report instead of copying if anything credential-shaped now holds a
   populated value that is not a `{{placeholder}}`. Report findings the same way: name
   the field and the request, never the value.
3. Copy the canonical file over this one byte-for-byte (no hand edits, no reformatting).
   Verify with `sha256` **and** `cmp`.
4. Update "Current pin" above with the new date, size, endpoint count, and scan
   results — **append**, don't overwrite the prior pin's record, so a future reader can
   see when a given claim's citation stopped being current. Move the outgoing record
   into "Superseded pins" below, verbatim.
5. Check `CLAUDE.md`'s "API contract" section still reads correctly. **It deliberately
   carries no pin date** — it points here instead ("see `docs/api/README.md` for the pin
   date"), so there is normally nothing to change in step 5. This step used to say
   "update the pin date in `CLAUDE.md`", which described an edit that file has no place
   for; corrected at the 2026-08-25 re-pin. Keep it that way: a date in two files is a
   date that can disagree with itself, and the table above is the one that must win.

   > **Step 5 did fire once**, at the second 2026-08-25 re-pin. Not with a date — with a
   > rule. `CLAUDE.md` said claims cite the snapshot "**by date**", and that stopped being
   > sufficient the moment two pins shared one, so the sentence gained a clause pointing
   > at the `sha256` disambiguator here. Recorded because "normally nothing to change" is
   > the kind of line that turns into "never check"; the check is what caught it.

---

## Superseded pins

Kept verbatim. A claim written while one of these was current cites *that* pin, and a
future reader needs to see what it actually said.

### Pin of 2026-08-25 (first) — superseded 2026-08-25 (second), same day

`sha256` `de3e1f14…70010021`. See the citation note under "Current pin" for how to tell a
claim citing this pin from one citing its same-day successor — and why, for this
particular delta, no existing claim needed re-sourcing.

| | |
|---|---|
| Pinned | 2026-08-25 |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time, plus a `cmp` byte comparison |
| Size | 788,628 bytes / 7,664 lines |
| Leaf endpoints (parsed) | 207 — `POST` 80, `GET` 66, `DELETE` 22, `PUT` 21, `PATCH` 18 |

**What changed since the 2026-08-24 pin**

> The delta is **two additions and nothing else** — no endpoint was removed, and no
> existing request's method or URL changed:
>
> - `GET /api/v1/admin/reception/bookings/pending-approval`
>   (folder `Admin (Dashboard) / Reception Operations / Booking Approvals`)
> - `GET /api/v1/admin/reception/sessions/active`
>   (folder `Admin (Dashboard) / Reception Operations / Active Sessions`)
>
> That is the whole reason 205 became 207, and why `GET` went 64 → 66.
>
> These two matter beyond the count. Until they appeared, `Booking Approvals` held only
> action endpoints (`approve`, `reject`, `extend`) and `Active Sessions` did not exist, so
> the event-hall approval queue and the walk-in session dashboard (S3-AD-01/02) were
> blocked with nothing to fetch a list from. **That blocker is lifted as of this pin.**
>
> Counting note, so two numbers in this file don't read as a contradiction: 207 counts
> *leaf requests*, and the collection deliberately ships several same-URL variants under
> different names (e.g. a success case and its `— Error:` sibling). Counting *distinct*
> `METHOD + URL` pairs instead gives 186 → 188 across the same re-pin. Both are +2.

**Credential scan at pin time (2026-08-25) — clean**

> Structural checks, all passing:
>
> - Every one of the 20 collection-level variables (`member_token`,
>   `member_refresh_token`, `member_reset_token`, and assorted `*_id` variables) has an
>   **empty** `value`. No collection-level `auth` block. No literal `base_url` anywhere —
>   every reference is the placeholder `{{base_url}}`.
> - 21 requests carry a per-request `auth: {type: "bearer", ...}` block; every one
>   resolves to a `{{...}}` placeholder, never a literal value.
> - 5 requests carry a literal `Authorization` header string; every one is exactly
>   `Bearer {{member_token}}` — placeholder, not a populated token.
> - Zero `Cookie` headers anywhere in the file.
> - A broad scan for AWS-style keys, PEM private keys, Stripe-style `sk_`/`pk_` secrets,
>   JWT-shaped strings, Google API keys, GitHub tokens, Slack tokens, Sanctum-style
>   `id|hash` tokens, and long hex blobs found **zero** matches.
> - One long base64-alphabet match was flagged and manually cleared as a false positive:
>   it is a slash-separated word list inside a `description` field, not encoded data.
>
> **Methodology correction — this scan checked something the last one did not**
>
> The 2026-08-24 record below declares its scan "clean", and it was, *for what it
> scanned*: key-shaped and token-shaped patterns. **It never inspected literal values in
> password-named body fields.** This pass added that check, and it fires.
>
> Three distinct literal values appear across seven fields in three requests:
>
> | Fields | Requests |
> |---|---|
> | `password`, `password_confirmation` | `Admin (Dashboard) / Password / Update Password` |
> | `password`, `password_confirmation`, `token` | `Admin (Dashboard) / Password / Reset Password` |
> | `password`, `password_confirmation` | `Admin (Dashboard) / Users / Create User` |
>
> Assessed as documentation placeholders, not credentials, on structure alone: each is a
> short run of complete English words joined by a single separator, carrying **no
> entropy** — and the `token` one is all-caps with no digits, which reads as an
> instruction to the person running the request rather than as a token. A real password
> or reset token looks nothing like this.
>
> Two facts that bound the exposure:
>
> 1. All seven were **already present, byte-identical, in the 2026-08-24 snapshot** — so
>    they were already committed to this repo and its git history. Re-pinning does not
>    increase exposure, and declining to re-pin would not have reduced it.
> 2. They originate in the canonical source. This snapshot is not edited to remove them,
>    for the same reason the mojibake below is not corrected: an edited contract is no
>    longer the contract.
>
> Per Invariant 6 and `.claude/rules/docs-discipline.md`, this record names fields and
> requests and **never a value or any fragment of one** — including lengths precise enough
> to narrow a guess.
>
> **Owner: Backend.** Worth asking the ADDCore team to replace these with `{{...}}`
> variables, the way every other sensitive field in the collection already is. Not
> actioned here; it is their file.

**Encoding finding at pin time (2026-08-25) — not fixed, source is authoritative**

> Unchanged from the previous pin, and re-measured against this copy. The file's raw bytes
> decode as **strict, valid UTF-8** — no invalid byte sequences. But some description
> fields carry real mojibake baked into those valid bytes: the sequence `â€”` (a
> double-encoded em dash — UTF-8 bytes for three separate characters, itself valid UTF-8,
> but not the character it was supposed to be) appears **66 times**, alongside a
> correctly-encoded literal em dash (`—`) appearing **17 times** in the same file. Both
> counts are identical to 2026-08-24, so the two added endpoints introduced no new
> corruption. The corruption is inconsistent within one document, which points at mixed
> authoring sources upstream (e.g. some descriptions pasted through a tool that
> mis-decoded UTF-8 as Latin-1/CP1252 before re-saving, others typed directly). This is
> present in the canonical source itself, not introduced by pinning it here, and it is
> **not corrected** in this snapshot. Worth raising with the backend team separately; not
> actioned here.

### Pin of 2026-08-24 — superseded 2026-08-25

| | |
|---|---|
| Pinned | 2026-08-24 |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time |
| Size | 785,293 bytes / 7,627 lines |
| Leaf endpoints (parsed) | 205 — `GET` 64, `POST` 80, `PUT` 21, `PATCH` 18, `DELETE` 22 |

> That count is 205, not the 192 that had been quoted going into this pass — noted, not
> reconciled: either the canonical file moved again between when 192 was last counted and
> this pin, or a different counting method was used. Whichever it is, 205 is what a
> structural parse of *this* pinned copy returns.

**Credential scan at pin time (2026-08-24) — clean**

> - Every one of the 20 collection-level variables (`member_token`,
>   `member_refresh_token`, `member_reset_token`, and assorted `*_id` variables) has an
>   **empty** `value`. No collection-level `auth` block. No literal `base_url` anywhere —
>   every reference is the placeholder `{{base_url}}`.
> - 21 requests carry a per-request `auth: {type: "bearer", ...}` block; every one
>   resolves to the placeholder `{{member_token}}`, never a literal value.
> - 5 requests carry a literal `Authorization` header string; every one is exactly
>   `Bearer {{member_token}}` — placeholder, not a populated token.
> - Zero `Cookie` headers anywhere in the file.
> - A broad scan for AWS-style keys, PEM private keys, Stripe-style `sk_`/`pk_` secrets,
>   JWT-shaped strings, and long hex/base64 blobs found zero matches.
>
> Per Invariant 6, this record names variables, never values — there is nothing here to
> redact because nothing here is populated.

Read that last line with the 2026-08-25 methodology correction above: "nothing here is
populated" was true of the collection *variables*, which is what the scan covered. It
was not a statement about literal values inside request bodies, because those were never
examined.

**Encoding finding at pin time (2026-08-24) — not fixed, source is authoritative**

> The file's raw bytes decode as **strict, valid UTF-8** — no invalid byte sequences. But
> some description fields carry real mojibake baked into those valid bytes: the sequence
> `â€”` (a double-encoded em dash — UTF-8 bytes for three separate characters, itself
> valid UTF-8, but not the character it was supposed to be) appears **66 times**,
> alongside a correctly-encoded literal em dash (`—`) appearing **17 times** in the same
> file. The corruption is inconsistent within one document, which points at mixed
> authoring sources upstream (e.g. some descriptions pasted through a tool that
> mis-decoded UTF-8 as Latin-1/CP1252 before re-saving, others typed directly). This is
> present in the canonical source itself, not introduced by pinning it here, and it is
> **not corrected** in this snapshot — an edited contract is no longer the contract.
> Worth raising with the backend team separately; not actioned here.
