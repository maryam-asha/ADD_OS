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
| Pinned | 2026-10-04 (second pin that day) |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time, plus a `cmp` byte comparison |
| Size | 1,445,667 bytes / 22,532 lines |
| Leaf endpoints (parsed) | 356 — `GET` 154, `POST` 109, `DELETE` 35, `PATCH` 29, `PUT` 29 |
| Distinct `METHOD + URL` | 353 |

### What changed since the earlier 2026-10-04 pin

**One description, no endpoint.** `Member (App) / … / Get Booking Detail — With Status
Stepper` now describes the trimmed detail: the booking number `reference`
(`BK-2026-00041`), `date_label`/`time_label`, `total`, `checked_in_at`/`checked_out_at`,
`payment_state` with `payment_id`/`awaiting_payment`, and a `cancellation` block (deadline,
refund amount and wallet) — ADDCore `docs/decisions/booking-outcomes-and-extension.md`.
Member-app only; nothing in this dashboard cites it.

### Credential scan at this pin

Both halves repeated against the canonical file. **Nothing new:** the same 49
variables with the four credential-shaped ones empty, 74 `auth` blocks and five
`Authorization` headers all on placeholders, zero `Cookie` headers, no literal host,
zero pattern matches, and the same nine populated password/token body fields in the
same five requests. Named as fields and requests only, never values.

### Encoding at this pin

Strict, valid UTF-8. The double-encoded em dash (`â€”`) still appears **19** times;
the correct em dash (`—`) **316** times.

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

---

## Superseded pins

Kept verbatim. A claim written while one of these was current cites *that* pin, and a
future reader needs to see what it actually said.

### Pin of 2026-10-04 — superseded later on 2026-10-04

#### Record as it stood

| | |
|---|---|
| Pinned | 2026-10-04 |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time, plus a `cmp` byte comparison |
| Size | 1,445,020 bytes / 22,532 lines |
| Leaf endpoints (parsed) | 356 — `GET` 154, `POST` 109, `DELETE` 35, `PATCH` 29, `PUT` 29 |
| Distinct `METHOD + URL` | 353 |

### What changed since the third 2026-10-03 pin

**No endpoint added or removed**; two member-app requests reworded (ADDCore
`docs/decisions/booking-outcomes-and-extension.md`):

- `List My Bookings` filters on `status` instead of `filter`: the sample URL is now
  `…/member/bookings?status=pending,confirmed&per_page=15`, the `filter` query param
  became `status` (one key or several comma-separated), and the description adds
  `is_upcoming` on each card and the order (not yet started first).
- `Booking Statuses & Tabs` is renamed `Booking Statuses`: its response is
  `{statuses}` only, the `filters` tabs having gone with the `filter` key.

Neither is called from this dashboard. Anyone citing the old request name should cite
`GET /api/v1/member/bookings/statuses` instead, which did not change.

### Credential scan at this pin

Both halves repeated against the canonical file. **Nothing new:** the same 49
variables with the four credential-shaped ones empty, 74 `auth` blocks and five
`Authorization` headers all on placeholders, zero `Cookie` headers, no literal host,
zero pattern matches, and the same nine populated password/token body fields in the
same five requests. Named as fields and requests only, never values.

### Encoding at this pin

Strict, valid UTF-8. The double-encoded em dash (`â€”`) still appears **19** times;
the correct em dash (`—`) **316** times.

### Pin of 2026-10-03 (third that day) — superseded 2026-10-04

#### Record as it stood

| | |
|---|---|
| Pinned | 2026-10-03 (third pin that day) |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time, plus a `cmp` byte comparison |
| Size | 1,444,744 bytes / 22,532 lines |
| Leaf endpoints (parsed) | 356 — `GET` 154, `POST` 109, `DELETE` 35, `PATCH` 29, `PUT` 29 |
| Distinct `METHOD + URL` | 353 |

### What changed since the second 2026-10-03 pin

**One description again, no endpoint.** Zero added, zero removed. `List My Bookings`
now says the response is `{data, meta}` with no per-tab `counts`, and that the card's
`space` is `{title, main_image}` — `space_type` gone, `title` falling back to the space
browser's per-type title for an unnamed space (ADDCore
`docs/decisions/booking-outcomes-and-extension.md`). Member-app only; nothing in this
dashboard cites that request.

### Credential scan at this pin

Both halves repeated against the canonical file. **Nothing new:** the same 49
variables with the four credential-shaped ones empty, 74 `auth` blocks and five
`Authorization` headers all on placeholders, zero `Cookie` headers, no literal host,
zero pattern matches, and the same nine populated password/token body fields in the
same five requests. Named as fields and requests only, never values.

### Encoding at this pin

Strict, valid UTF-8. The double-encoded em dash (`â€”`) still appears **19** times;
the correct em dash (`—`) **315** times.

### Pin of 2026-10-03 — superseded again later on 2026-10-03

#### Record as it stood

| | |
|---|---|
| Pinned | 2026-10-03 (second pin that day) |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time, plus a `cmp` byte comparison |
| Size | 1,444,689 bytes / 22,532 lines |
| Leaf endpoints (parsed) | 356 — `GET` 154, `POST` 109, `DELETE` 35, `PATCH` 29, `PUT` 29 |
| Distinct `METHOD + URL` | 353 |

### What changed since the earlier 2026-10-03 pin

**One description, no endpoint.** Zero added, zero removed (same request-path sets),
+28 bytes. `Member (App) / … / List My Bookings` now describes the trimmed list card:
`id`, `space {title, space_type, main_image}`, `date_label`, `time_label`, `status`,
`status_label`, `payment_state` — with `status_note`, the payment block and the
`can_cancel`/`can_extend` actions on the booking detail only (ADDCore
`docs/decisions/booking-outcomes-and-extension.md`). The member app reads that list;
this dashboard does not, so no code here cites it.

### Credential scan at this pin

Both halves repeated against the canonical file. **Nothing new:** the same 49
variables with the four credential-shaped ones empty, 74 `auth` blocks and five
`Authorization` headers all on placeholders, zero `Cookie` headers, no literal host,
zero pattern matches, and the same nine populated password/token body fields in the
same five requests. Named as fields and requests only, never values.

### Encoding at this pin

Strict, valid UTF-8. The double-encoded em dash (`â€”`) still appears **19** times;
the correct em dash (`—`) **314** times — one fewer than the earlier pin, because the
rewritten description has one fewer.

### Pin of 2026-10-03 — superseded later on 2026-10-03

#### Record as it stood

| | |
|---|---|
| Pinned | 2026-10-03 |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time, plus a `cmp` byte comparison |
| Size | 1,444,661 bytes / 22,532 lines |
| Leaf endpoints (parsed) | 356 — `GET` 154, `POST` 109, `DELETE` 35, `PATCH` 29, `PUT` 29 |
| Distinct `METHOD + URL` | 353 |

### What changed since the 2026-09-21 pin

A **large** delta again: 336 → 356 leaf endpoints, 300 → 353 distinct `METHOD + URL`
pairs. Several backend phases landed between the two pins (the member wallet and
unified payments, the co-working seat pool and self-service sessions, kiosks, resource
types, memberships, event check-in) plus booking outcomes and extension. Measured by
parsing both files and diffing the request-path sets: **60 added, 7 removed.**

The part this dashboard consumes in this change (ADDCore
`docs/decisions/booking-outcomes-and-extension.md`):

- `GET /api/v1/admin/reception/bookings/{booking}/extension-options` — what the
  reception extend dialog now offers instead of a free number of minutes
  (`services/reception.ts` → `getExtensionOptions`).
- `POST /api/v1/admin/spaces` and `PUT /api/v1/admin/spaces/{space}` bodies gained
  `allows_extension` and `cancellation_window_minutes` (the space form).
- `GET /api/v1/admin/bookings`'s `status` filter gained `completed` and `no_show`, the
  backend's new outcome statuses (the bookings index and the calendar).

**7 removed:** `GET /member/wallet/options`, `GET /member/spaces/{space}/availability`,
`GET /member/spaces/{space}/availability/quote`,
`GET /admin/spaces/{space}/availability/quote`, `GET /admin/roles/{role}`, and the two
`/member/services/{{slug}}/…` requests (now keyed by `service_type_id`). None is called
from `src/add-os/` — verified by grep at pin time; the admin `availability/quote` had
already been dropped from `services/booking-calendar.ts`.

Line endings: the canonical file was read with CRLF line endings (22,532 of them), and
the byte count above includes them. Copied as read.

### Credential scan at this pin

Both halves of the scan were repeated against the canonical file. **Nothing new.**

Structural: 49 collection-level variables; every credential-shaped one
(`member_token`, `member_refresh_token`, `callback_token`, `kiosk_secret`) is
**empty**. No collection-level `auth` block. 74 per-request `auth` blocks, every value
a `{{placeholder}}`; the five `Authorization` headers each interpolate a placeholder;
zero `Cookie` headers; no literal host in any `url.raw` (all interpolate `base_url`).

Pattern: zero matches for AWS-style keys, PEM private keys, Stripe-style `sk_`/`pk_`
secrets, JWT-shaped strings, GitHub and Slack tokens, Google API keys, Sanctum-style
`id|hash` tokens and long hex blobs.

Password-field: the same nine credential-shaped body fields hold populated literals —
`token` in the two Notifications device-token requests, and `password` /
`password_confirmation` / `token` across `Password/Update Password`,
`Password/Reset Password` and `Users/Create User`. **Same set, same requests, as the
2026-09-21 pin.** None of the 60 added requests carries a populated credential-shaped
field. Named here as fields and requests only, never values.

### Encoding at this pin

The raw bytes decode as strict, valid UTF-8. The double-encoded em dash (`â€”`) still
appears **19** times, unchanged; the correct em dash (`—`) now appears **315** times,
up from 72, all of the growth in new `description` fields. Still present in the
canonical source and still not corrected here.

### Pin of 2026-09-21 — superseded 2026-10-03

#### Record as it stood

| | |
|---|---|
| Pinned | 2026-09-21 |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time, plus a `cmp` byte comparison |
| Size | 842,375 bytes / 14,734 lines |
| Leaf endpoints (parsed) | 336 — `GET` 129, `POST` 122, `DELETE` 30, `PATCH` 29, `PUT` 26 |
| Distinct `METHOD + URL` | 300 |

### What changed since the 2026-09-20 pin

A **small, purely additive** delta: 334 → 336 leaf endpoints, 298 → 300 distinct
`METHOD + URL` pairs, +100 lines and nothing removed (verified by parsing both and
diffing the request-path sets: two added, zero removed, zero renamed).

**2 endpoints added**, both in `Admin (Dashboard) / Calendar & Bookings`:

- `GET /api/v1/admin/spaces/{space}/availability/slots`
- `GET /api/v1/admin/spaces/{space}/availability/quote`

They expose the member-side availability reads to operations so the dashboard's
booking form can offer the windows the server will accept, instead of a free-form
clock that learns the rules from 422s. The backend serves them from the same
`AvailabilityBrowseService` as the member routes and asserts in
`SpaceAvailabilityControllerTest` that the two responses are identical for the same
space and date — so this is one contract exposed twice, not a second contract.

### Credential scan at this pin

Both halves of the scan were repeated against the canonical file. **Nothing new.**

Structural: every `auth` block value is a `{{placeholder}}`; the five `Authorization`
headers each interpolate a placeholder; no literal host appears in any `url.raw`
(all interpolate `base_url`).

Pattern/password-field: nine credential-shaped body fields hold populated literals —
`token` in the two Notifications device-token requests, and `password` /
`password_confirmation` / `token` across `Password/Update Password`,
`Password/Reset Password` and `Users/Create User`. **This is the same set, in the same
requests, as the 2026-09-20 pin** (verified by scanning the outgoing snapshot and
comparing the sets, not by assuming). They are sample values in the canonical source,
not introduced here, and correcting them would mean an edited contract is no longer the
contract. Named here as fields and requests only, never values — unchanged exposure,
and declining to re-pin would not have reduced it.

The two added requests introduce **no** credential-shaped populated field: their auth
is `{{admin_token}}` and they carry no body.

### Encoding at this pin

Unchanged from the 2026-09-20 pin and re-measured against this copy: the raw bytes
decode as strict, valid UTF-8; the double-encoded em dash (`â€”`) still appears 19
times and the correct em dash (`—`) 72 times, all in `description` fields, still
present in the canonical source and still not corrected here.

### Pin of 2026-09-20 — superseded 2026-09-21

#### Record as it stood

| | |
|---|---|
| Pinned | 2026-09-20 |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time, plus a `cmp` byte comparison |
| Size | 836,774 bytes / 14,634 lines |
| Leaf endpoints (parsed) | 334 — `GET` 127, `POST` 122, `DELETE` 30, `PATCH` 29, `PUT` 26 |
| Distinct `METHOD + URL` | 298 |

### What changed since the 2026-08-25 pin

This is a **large** delta — three backend phases landed between the two pins (events
registration/approval, the services catalogue, and the booking availability & calendar
work), so 207 leaf requests became 334. The whole-file reformat below means a line-level
diff is not readable; the endpoint-level delta is what matters, and it is:

**33 endpoints added.** The 15 that concern this dashboard:

- `GET /api/v1/admin/calendar` and `GET /api/v1/admin/calendar/occupancy`
  (folder `Admin (Dashboard) / Calendar & Bookings`) — the operations calendar this
  repo's booking calendar screen is built on.
- `GET /api/v1/admin/bookings` and `GET /api/v1/admin/bookings/{booking}` — the general
  bookings index, which until now existed only as the `pending-approval` special case.
- `POST /api/v1/admin/reception/bookings` — reception booking on a member's behalf.
- Member-side availability (`.../availability`, `.../availability/slots`,
  `.../availability/quote`) and the member booking lifecycle (`GET`/`POST` list, detail,
  `preview`, `cancel`, `batch`). Not consumed by this dashboard, but they share the
  response vocabulary (`state`, `occupancy`, `request_status`), so they are the
  reference for what those fields mean.

The remaining 18 are the events and services modules (registration fields, attendee
approval, service axes/slugs).

**3 endpoints "removed" — none actually removed.** `GET /member/services/general`,
`POST /member/services/general/requests` and `POST /member/services/technical/requests`
were hardcoded-slug requests replaced by the parameterised
`GET /member/services/{{slug}}` / `POST /member/services/{{slug}}/requests`. Same
capability, one variable instead of two literals.

### Whole-file reformat — why the byte count moved more than the content did

The canonical file was re-serialized upstream (4-space indent throughout, LF endings),
so essentially every line differs even where the request did not. Endpoint-level
comparison is therefore the only meaningful delta, and it is the one recorded above.

### Service names are now English-only — one less reason to mis-cite a request

The upstream file previously mixed Arabic into request and folder **names**
(`Get Space Details (…)`, `Month Calendar (…)`). Those names are now English only.
Descriptions, URLs, bodies and the Arabic `lang` values are untouched. Two consequences
for this repo:

1. Any code comment or doc citing a request **by its Arabic-bearing name** now cites a
   name that no longer exists. Cite `METHOD + URL` instead, which did not change.
2. 47 of the mojibake em-dashes counted at the last pin were inside those names and are
   gone as a side effect — see the encoding finding below.

## Credential scan at pin time (2026-09-20) — clean, with two new placeholder fields

Structural checks, all passing:

- 33 collection-level variables (up from 20). Every **credential-shaped** one
  (`member_token`, `member_refresh_token`) is **empty**. Seven now carry values, and all
  seven are benign sample identifiers — `lang` and six `*_id` / `*_slug` variables. No
  collection-level `auth` block. No literal `base_url` anywhere — every reference is the
  placeholder `{{base_url}}`.
- 59 requests carry a per-request `auth: {type: "bearer", ...}` block (up from 21); every
  one resolves to a `{{...}}` placeholder, never a literal value.
- 5 requests carry a literal `Authorization` header string; every one is exactly
  `Bearer {{member_token}}` — placeholder, not a populated token.
- Zero `Cookie` headers anywhere in the file.
- A broad scan for AWS-style keys, PEM private keys, Stripe-style `sk_`/`pk_` secrets,
  JWT-shaped strings, GitHub tokens, Slack tokens, Sanctum-style `id|hash` tokens, and
  long hex blobs found **zero** matches.

**Password/token body fields: 9, up from 7.** The seven recorded at the 2026-08-25 pin
are unchanged and their assessment stands. The two new ones are a `token` field in:

| Field | Requests |
|---|---|
| `token` | `Member (App) / Notifications / Register / Update Device Token`, `Member (App) / Notifications / Remove Device Token` |

Assessed as placeholders on structure alone: each is a short, single-run value in a field
that expects an FCM device token — orders of magnitude shorter than a real one, and
carrying no entropy. They arrived with the notifications module, not with this pin's
booking work. Per Invariant 6 and `.claude/rules/docs-discipline.md`, this record names
fields and requests and **never a value or any fragment of one**.

**Owner: Backend**, unchanged — the standing ask to replace these nine with `{{...}}`
variables, the way every other sensitive field in the collection already is, now covers
two more fields.

## Encoding finding at pin time (2026-09-20) — substantially improved upstream

The file's raw bytes decode as **strict, valid UTF-8**. The double-encoded em dash
(`â€”`) that appeared **66 times** at the last pin now appears **19 times**, and the
correctly-encoded em dash (`—`) has gone from 17 to **72**. The improvement is not
incidental: the upstream English-only rename pass repaired the mojibake inside request
names, which is where most of it lived. What remains is in `description` fields, is
still present in the canonical source rather than introduced here, and is still **not
corrected** in this snapshot — an edited contract is no longer the contract. Worth
raising with the backend team separately; not actioned here.

### Pin of 2026-08-25 — superseded 2026-09-20

#### Record as it stood

| | |
|---|---|
| Pinned | 2026-08-25 |
| Source | the canonical path above, read directly, copied byte-for-byte (`cp`, not a JSON re-serialize — key order and formatting are exactly the source's) |
| Verified identical | `sha256` match between source and this copy at pin time, plus a `cmp` byte comparison |
| Size | 788,628 bytes / 7,664 lines |
| Leaf endpoints (parsed) | 207 — `POST` 80, `GET` 66, `DELETE` 22, `PUT` 21, `PATCH` 18 |

#### What changed since the 2026-08-24 pin

The delta is **two additions and nothing else** — no endpoint was removed, and no
existing request's method or URL changed:

- `GET /api/v1/admin/reception/bookings/pending-approval`
  (folder `Admin (Dashboard) / Reception Operations / Booking Approvals`)
- `GET /api/v1/admin/reception/sessions/active`
  (folder `Admin (Dashboard) / Reception Operations / Active Sessions`)

That is the whole reason 205 became 207, and why `GET` went 64 → 66.

These two matter beyond the count. Until they appeared, `Booking Approvals` held only
action endpoints (`approve`, `reject`, `extend`) and `Active Sessions` did not exist, so
the event-hall approval queue and the walk-in session dashboard (S3-AD-01/02) were
blocked with nothing to fetch a list from. **That blocker is lifted as of this pin.**

Counting note, so two numbers in this file don't read as a contradiction: 207 counts
*leaf requests*, and the collection deliberately ships several same-URL variants under
different names (e.g. a success case and its `— Error:` sibling). Counting *distinct*
`METHOD + URL` pairs instead gives 186 → 188 across the same re-pin. Both are +2.

#### Credential scan at pin time (2026-08-25) — clean

Structural checks, all passing:

- Every one of the 20 collection-level variables (`member_token`,
  `member_refresh_token`, `member_reset_token`, and assorted `*_id` variables) has an
  **empty** `value`. No collection-level `auth` block. No literal `base_url` anywhere —
  every reference is the placeholder `{{base_url}}`.
- 21 requests carry a per-request `auth: {type: "bearer", ...}` block; every one
  resolves to a `{{...}}` placeholder, never a literal value.
- 5 requests carry a literal `Authorization` header string; every one is exactly
  `Bearer {{member_token}}` — placeholder, not a populated token.
- Zero `Cookie` headers anywhere in the file.
- A broad scan for AWS-style keys, PEM private keys, Stripe-style `sk_`/`pk_` secrets,
  JWT-shaped strings, Google API keys, GitHub tokens, Slack tokens, Sanctum-style
  `id|hash` tokens, and long hex blobs found **zero** matches.
- One long base64-alphabet match was flagged and manually cleared as a false positive:
  it is a slash-separated word list inside a `description` field, not encoded data.

#### Methodology correction — this scan checked something the last one did not

The 2026-08-24 record below declares its scan "clean", and it was, *for what it
scanned*: key-shaped and token-shaped patterns. **It never inspected literal values in
password-named body fields.** This pass added that check, and it fires.

Three distinct literal values appear across seven fields in three requests:

| Fields | Requests |
|---|---|
| `password`, `password_confirmation` | `Admin (Dashboard) / Password / Update Password` |
| `password`, `password_confirmation`, `token` | `Admin (Dashboard) / Password / Reset Password` |
| `password`, `password_confirmation` | `Admin (Dashboard) / Users / Create User` |

Assessed as documentation placeholders, not credentials, on structure alone: each is a
short run of complete English words joined by a single separator, carrying **no
entropy** — and the `token` one is all-caps with no digits, which reads as an
instruction to the person running the request rather than as a token. A real password
or reset token looks nothing like this.

Two facts that bound the exposure:

1. All seven were **already present, byte-identical, in the 2026-08-24 snapshot** — so
   they were already committed to this repo and its git history. Re-pinning does not
   increase exposure, and declining to re-pin would not have reduced it.
2. They originate in the canonical source. This snapshot is not edited to remove them,
   for the same reason the mojibake below is not corrected: an edited contract is no
   longer the contract.

Per Invariant 6 and `.claude/rules/docs-discipline.md`, this record names fields and
requests and **never a value or any fragment of one** — including lengths precise enough
to narrow a guess.

**Owner: Backend.** Worth asking the ADDCore team to replace these with `{{...}}`
variables, the way every other sensitive field in the collection already is. Not
actioned here; it is their file.

#### Encoding finding at pin time (2026-08-25) — not fixed, source is authoritative

Unchanged from the previous pin, and re-measured against this copy. The file's raw bytes
decode as **strict, valid UTF-8** — no invalid byte sequences. But some description
fields carry real mojibake baked into those valid bytes: the sequence `â€”` (a
double-encoded em dash — UTF-8 bytes for three separate characters, itself valid UTF-8,
but not the character it was supposed to be) appears **66 times**, alongside a
correctly-encoded literal em dash (`—`) appearing **17 times** in the same file. Both
counts are identical to 2026-08-24, so the two added endpoints introduced no new
corruption. The corruption is inconsistent within one document, which points at mixed
authoring sources upstream (e.g. some descriptions pasted through a tool that
mis-decoded UTF-8 as Latin-1/CP1252 before re-saving, others typed directly). This is
present in the canonical source itself, not introduced by pinning it here, and it is
**not corrected** in this snapshot. Worth raising with the backend team separately; not
actioned here.

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
