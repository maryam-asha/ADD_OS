# Kiosk module — Announcements + Arrival Requests — design

**Status:** approved 2026-08-25.
**Sources:** ADDCore controllers, Form Requests, models and `config/app.php`, read directly
at design time — not inferred, and not taken from the pinned snapshot (see
[§1](#1-prerequisite--the-api-pin-is-stale) for why that distinction matters here).

## Goal

Two admin screens for the reception-kiosk feature area:

1. **Announcements** — CRUD over the banner content the physical kiosk display shows.
2. **Arrival Requests** — the reception queue of members who have signalled they've arrived.

Both back onto endpoints that already exist in ADDCore.

## Scope

Out of scope, deliberately:

- `GET /api/v1/public/kiosk`. That endpoint is consumed by the kiosk display device, not by
  ADD OS. **Nothing in this design calls it.**
- Anything in Bookings, Payments, or the work committed earlier this week.
- Any backend change.

---

## 1 · Prerequisite — the API pin is stale

`pnpm api:collection:check` reports `MISMATCH` as of 2026-08-25.

The delta was measured, not assumed: a line-level comparison of the canonical file against
`docs/api/ADD-OS.postman_collection.json` returns **exactly two diff entries, which are the
two halves of one changed string** — the `description` on `Public (Site) / Get Kiosk Data`.
Line counts are identical (7,663 both sides). No endpoint was added or removed; no method
or URL changed. The `Announcements` and `Arrival Requests` folders are byte-identical
across both files.

So the staleness does not touch anything this feature cites. It is still a failing guard
per `CLAUDE.md`, and per that file's own rule it is treated as one rather than as
background noise.

**Batch 1 is the re-pin**, following `docs/api/README.md` step for step: read the canonical
file fresh, repeat *both* halves of the credential scan — the structural checks and the
password-field check the 2026-08-24 pass did not perform — copy byte-for-byte, verify with
`sha256` **and** `cmp`, then append the new pin record and move the 2026-08-25 record into
"Superseded pins" verbatim. Its own commit, so the feature branch starts on a green guard.

If the fresh scan finds any credential-shaped field holding a populated value that is not a
`{{placeholder}}`, the procedure stops and reports — naming the field and the request,
never a value or any fragment of one (Invariant 6).

---

## 2 · Navigation

The prompt specified a new top-level "Kiosk" section. `navigation/sections.ts:100-114`
records a decision against exactly that, on two grounds: reception pages belong to the
operator's mental model rather than to the backend URL prefix that owns them
(`payments.walletTopUps` posts to `reception/wallet-top-ups` and lives under Payments), and
a 14th top-level section carries a cost the horizontal-nav note in
`.claude/rules/shell-and-controls.md` calls an unsolved design problem in Arabic.

Raised with the owner on 2026-08-25 and **resolved as a split**, keeping the count at 13:

| Page | Section | Page key | Route | Section status |
|---|---|---|---|---|
| Announcements | `cms` (exists, `coming-soon`) | `announcements` (**new**) | `/cms/announcements` | flips to `active` |
| Arrival Requests | `bookings` (exists, `active`) | `arrivalRequests` (**new**) | `/bookings/arrival-requests` | unchanged |

`announcements` is ordered **first** among the `cms` pages, because a section redirects to
its first page and the existing `content`/`partners` pages are still `ComingSoon` — same
consideration the `bookings` ordering comment already documents.

`arrivalRequests` goes after `activeSessions` and before the two placeholder pages, so the
three real reception screens sit together.

### The nav split does not split the module

Both pages live in one new `src/add-os/modules/kiosk/`, as originally asked. Module
directories are not 1:1 with nav sections in this codebase — `address.privateOfficeRequests`
is served by `modules/members/` today. The backend groups these two the same way (both
folder descriptions cite `docs/decisions/kiosk-display.md`), so feature cohesion is kept in
the filesystem while the nav follows the operator.

---

## 3 · Data contracts

Read from ADDCore source on 2026-08-25, not from the snapshot.

### Announcement

`AnnouncementResource` returns exactly:

```ts
export interface Announcement {
  id: number
  type: string                 // open string, deliberately not an enum
  image_url: string
  link_url: string | null
  sort_order: number
  starts_at: string | null     // UTC ISO — see §5 on the timezone
  ends_at: string | null
  is_active: boolean
  created_at: string
}
```

`Announcement::casts()` casts `starts_at`/`ends_at` to `datetime` and `is_active` to
`boolean`. The model's own doc comment states `type` is deliberately uncast — "a new
announcement kind is a row, never a migration or an enum change" — which is the authority
for the plain text input rather than a three-option select.

Validation, verbatim from `StoreAnnouncementRequest::rules()` (`UpdateAnnouncementRequest`
extends it unchanged, so create and update validate identically):

| Field | Rules |
|---|---|
| `type` | `required`, `string`, `max:50` |
| `image_url` | `required`, `string`, `max:2048`, `url` |
| `link_url` | `nullable`, `string`, `max:2048`, `url` |
| `sort_order` | `nullable`, `integer`, `min:0` |
| `starts_at` | `nullable`, `date` |
| `ends_at` | `nullable`, `date`, `after_or_equal:starts_at` |
| `is_active` | `nullable`, `boolean` |

`AnnouncementController::store` merges `['sort_order' => 0, 'is_active' => true]` under the
validated input, so both are genuinely optional on create.

### ArrivalRequest

```ts
export interface ArrivalRequestUser {
  id: number
  name: string
  phone: string
}

export interface ArrivalRequestBooking {
  id: number
  space_id: number
  space_type: SpaceType
  start_at: string
  end_at: string
}

export interface ArrivalRequest {
  id: number
  status: "pending"            // the list is server-side pending-only
  requested_at: string
  matched_booking_id: number | null
  user: ArrivalRequestUser
  matched_booking: ArrivalRequestBooking | null
}
```

`ArrivalRequestResource` wraps `user` and `matched_booking` in `whenLoaded`, and
`ArrivalRequestController::index` always eager-loads `['user', 'matchedBooking.space']`, so
both keys are always present on this endpoint. `matched_booking` is `null` for the ordinary
walk-in case — **not an error state.**

`space_type` reuses the existing `SpaceType` from
`modules/spatial/types/space.ts` (`co_space | room | business | event_hall`), including its
`SPACE_TYPES` runtime list, so an unrecognised value renders as itself instead of a missing
translation key — the same reason that constant was moved next to its type for the reception
columns.

---

## 4 · Endpoints

### Announcements — `/api/v1/admin/announcements`

Standard `apiResource`, served by `AdminResourceController`. Two behaviours that decide the
frontend shape:

**The list is not paginated.** `AdminResourceController::index` paginates *only* when the
request fills `per_page`; otherwise it returns `$query->get()`. So `createResourceApi.list()`
returning `T[]` is correct here, `warnIfTruncated` never fires, and `ResourceTable`'s
built-in `pagination = { pageSize: 10 }` does the display paging — exactly like `PlansPage`.

**Ordering is `sort_order`, and there is no reorder endpoint.**
`AnnouncementController::hasOrderColumn()` returns `false`, which switches *off* the base
class's `orderBy('order')`, and `applyIndexFilters()` substitutes `orderBy('sort_order')`.
No reorder endpoint exists in the collection for this resource — and ADD OS has no
drag-reorder composable at all, so there is nothing here that could have assumed the wrong
column name. `sort_order` is edited as a plain number field on the form. Nothing more.

**Update is `PUT`.** The pinned collection's `Update Announcement` is `PUT`; the prompt said
`PATCH`. Laravel's `apiResource` registers both verbs onto `update`, so both work, and
`createResourceApi` already uses `PUT` — matching the collection. No change, recorded so the
discrepancy isn't rediscovered as a bug. The collection also notes the update body must
resend every required field rather than only changed ones; the form submits the whole
payload regardless, so this needs no special handling.

### Arrival requests — `/api/v1/admin/reception/arrival-requests`

| Call | Body | Returns |
|---|---|---|
| `GET .../arrival-requests` | — | paginated, 25/page, `status = pending`, `orderBy('requested_at')` ascending |
| `POST .../{id}/confirm` (matched) | none | `{message}` |
| `POST .../{id}/confirm` (unmatched) | `{ space_id: number }` | `{message}` |
| `POST .../{id}/reject` | none | `{message}` |

`ArrivalRequestController::confirm` guards `status !== Pending` with **409** before doing
anything else, and returns **422** when an unmatched request arrives with no `space_id`.
A matched confirm delegates to `BookingReceptionController::checkIn` and **propagates that
response verbatim on failure**, so a confirm can also surface check-in errors
(already-checked-in, outside business hours) that this screen does not itself model — one
more reason the error path shows the server's own message rather than a generic one.

These live in the existing `services/reception.ts`, which already owns
`const BASE = "/api/v1/admin/reception"` and documents why that prefix belongs in one
module. No second file re-declares it.

---

## 5 · The datetime round-trip

ADDCore's `config/app.php` sets `'timezone' => 'UTC'`.

That is the whole reason this section exists. `starts_at`/`ends_at` are cast to `datetime`,
so they serialize as UTC ISO — and a bare wall-clock string like `2026-08-25 09:00:00` sent
back would be *interpreted* as 09:00 UTC, i.e. 12:00 in Damascus. An operator setting a
banner to go live at 9am would silently get noon. **The payload must carry an explicit UTC
offset.**

`toOffsetIso` already exists for exactly this problem, written for `checked_out_at` in
`services/reception.ts`. Reusing it here is a correctness requirement, not a style
preference.

It **moves** to `utils/format/dates.ts`, where date formatting lives, and its test moves
with it. The trigger is the one this codebase already documents for such a move — a second
consumer arriving (see the `SPACE_TYPES` comment in `modules/spatial/types/space.ts`:
"Lives here rather than in `spaces.config.ts`, where it started, because a second consumer
arrived"). `services/reception.ts` updates its import; no re-export shim is left behind,
since a name with two homes is a name that can drift.

Direction by direction:

- **Read** — Laravel's UTC ISO → `new Date(iso).getTime()` → a ms timestamp, which is what
  `n-date-picker` natively speaks. The picker then displays local wall clock.
- **Write** — ms timestamp → `toOffsetIso(new Date(ts))` → `2026-08-25T09:00:00+03:00`.

The conversion lives in `services/announcements.ts`, which wraps `createResourceApi`'s
`create`/`update`. This follows `checkOutSession`'s documented stance — "the wire format is
this module's business, and a caller that formats its own timestamp is a caller that can get
the offset wrong." One conversion point; the UTC trap cannot be reintroduced by a caller.

Consequently `AnnouncementPayload.starts_at` / `.ends_at` are `number | null` (form-side ms
timestamps), while `Announcement.starts_at` / `.ends_at` are `string | null` (wire-side ISO).
The two are deliberately different types.

---

## 6 · Shared additions

Three additions to shared code, each additive — no existing caller changes behaviour.

### `datetime` field type

`FieldType` gains `"datetime"`; `ResourceFormDrawer` renders
`<n-date-picker type="datetime" v-model:value>` bound to `number | null`.

It binds the picker's **native value**, not the `formatted-value` / `value-format` string
round-trip the existing `date` and `time` types use. Those types round-trip through a
display string because their model values *are* display strings; a `value-format` cannot
express a UTC offset, so reusing that mechanism here would reintroduce §5's ambiguity at the
component layer. Binding the timestamp keeps the drawer ignorant of wire format entirely and
leaves the conversion in the one place that owns it.

The `toPickerTimeValue`/`toPickerDateValue` shape guards stay untouched and continue to
serve only `date` and `time` — a numeric timestamp cannot produce the Invalid Date crash
those exist to prevent.

### `formatRelativeTime`

New in `utils/format/dates.ts`. `requested_at` is what tells staff how long someone has been
standing at the desk, and an absolute timestamp makes them do the subtraction.

Hand-rolled in that file's established style. `dates.ts` already refuses
`Intl.DateTimeFormat`, date-fns locale data and dayjs locale data, because those layers
disagreed with each other on Arabic month names (see `calendar.ts`); relative time gets the
same treatment for consistency, and because Arabic needs plural categories that a naive
implementation gets wrong. The table covers **one / dual / few (3-10) / many (11+)** —
`منذ دقيقة` · `منذ دقيقتين` · `منذ ٣ دقائق` · `منذ ١١ دقيقة` — for minutes, hours and days,
with a "just now" floor.

### `useNow`

New `composables/useNow.ts`: a `Ref<number>` ticking on an interval, cleaned up via
`onScopeDispose`. The arrival queue drives it at 30s.

Without it a row renders "just now" at fetch time and stays frozen there while the member
actually waits twenty minutes — which inverts the exact signal the column exists to give.
The interval is owned by the composable, not the page, so unmount cleanup cannot be
forgotten by the next screen that wants it.

---

## 7 · Announcements page

A `PlansPage` clone, using the same generic CRUD architecture: `useResourceList` +
`useResourceMutations` + `ResourceTable` + `ResourceFormDrawer`.

**No stat cards.** `PlansPage` has them; this doesn't. A "live now" tile would have to
re-derive `is_active && now ∈ [starts_at, ends_at]` on the client — logic the backend owns
for the public kiosk read — and a second implementation of a liveness rule is a second
answer to the same question. Omitted rather than approximated.

Fields, mirroring §3's rules one for one:

| Key | Type | Client rule |
|---|---|---|
| `type` | `text` | required, max 50 |
| `image_url` | `text` | required, URL, max 2048 |
| `link_url` | `text` | URL if non-empty, max 2048 |
| `sort_order` | `number` | — |
| `starts_at` | `datetime` | — |
| `ends_at` | `datetime` | `>= starts_at` when both set |
| `is_active` | `switch` | — |

No `bilingual-text` field anywhere on this form. `type` is a plain string, not an
`{ar, en}` object, so the bilingual label/validation path is not involved.

**The cross-field rule.** `FieldDescriptor.rule` is static, and a `FormItemRule.validator`
receives only `(rule, value)` — it cannot see the rest of the model. So
`buildAnnouncementFields(t, form)` takes the form `Ref` and closes over it; the `ends_at`
validator reads `form.value.starts_at`. This needs no new mechanism: config builders taking
arguments and being called inside a `computed` is the existing pattern
(`buildResourceFields(t, branches, locale)`).

Known limit, accepted: if the operator sets `ends_at`, then moves `starts_at` past it,
`ends_at` does not re-validate until submit, because n-form fires a field's rules on that
field's own triggers. `formRef.validate()` on submit runs every rule, so an invalid pair
cannot be sent — which is what "blocked client-side" requires. Live cross-field revalidation
would mean a watcher per dependent field in the shared drawer; not built for one form.

---

## 8 · Arrival requests page

Structurally an `ApprovalQueuePage`: `useResourceList(list, undefined, page)` for the 25/page
backend pagination, `useReceptionAction(refetch)` for the commands, per-row buttons, and
**refetch rather than local row-splicing** — the queue is defined server-side as
`status = pending`, so an actioned row leaves because the next response no longer contains
it.

### Confirm has two shapes

```
row.matched_booking !== null  →  confirmArrivalRequest(row.id)          // no body
row.matched_booking === null  →  open space picker → confirmArrivalRequest(row.id, spaceId)
```

The picker is `ResourceFormDrawer` carrying **one required `space_id` select**. Its required
rule is what makes submit unreachable without a selection, satisfying "don't let the button
be clickable without a selection when there's no matched booking" — the guarantee comes from
the drawer's own validation rather than a hand-rolled disabled state.

Options come from the existing `listSpaces()` called with no filter, loaded once by the page
and passed as static `options`, labelled the way `resources.config.ts` already labels a
space: `` `${t(`spaces.spaceType.${space.space_type}`)} #${space.id}` ``.

**Why one flat select, not the branch→building→zone→space cascade.** No standalone
space-picker component exists in ADD OS, and no `WalkInSessionController`-backed screen
exists to copy one from — space selection lives only as a `FieldDescriptor` cascade inside
`ResourceFormDrawer` (`resources.config.ts`, `seats-desks.config.ts`). Both shapes were put
to the owner on 2026-08-25; the flat select was chosen. It reuses the drawer's validation,
required-rule and 422 field-mapping wholesale, adds no new space-search infrastructure, and
costs the operator one interaction instead of four while a member stands at the desk. It
also matches what the backend actually requires — `StoreWalkInSessionRequest` validates
`space_id` as `required|integer|exists:spaces,id`, with no branch or building constraint;
the cascade would enforce a narrowing the API does not ask for.

Accepted cost: the list is unfiltered and unpaginated, so a large enough estate means
scrolling. Adding `filterable` to the drawer's `n-select` would fix that, and was
deliberately declined as out of scope — it is a shared-component change touching every
select on every CRUD screen.

Note `optionsFrom` is **not** usable here: `ResourceFormDrawer` only registers an
`optionsFrom` watcher for fields that also declare `dependsOn`
(`if (keys.length === 0 || !field.optionsFrom) continue`). A dependency-free dynamic field
would silently render an empty dropdown. Loading in the page and passing static `options` is
the supported path, not a workaround.

### Reject

Direct call, **no confirmation dialog**. Rejecting an arrival signal is not destructive —
`ArrivalRequestController::reject` flips a status and logs; nothing was charged, and no
booking or session was ever created by the request itself.

### 409 on an already-actioned row

`useReceptionAction` already surfaces the server's own `message` for any non-403, non-422
failure — deliberately, because reception 409s are routine and the server's wording is the
whole explanation. What it does not do is refetch on failure.

So the page adds:

```ts
const ok = await action.run(...)
if (!ok) await refetch()
```

Rationale to carry in the code comment: a failed action leaves the page's belief about that
row unverified, and a 409 means it is provably stale — someone else acted on it first. This
refetches on 5xx and network failures too, which is harmless and arguably correct for the
same reason.

`useReceptionAction` is **not** modified. Threading a status code out to the caller would
change a composable two other screens depend on, to serve a decision one screen can make
from a boolean.

### Columns

`user.name` · `user.phone` · `requested_at` as ticking relative time · and, when
`matched_booking` is present, its `space_type` and `start_at`–`end_at` as a hint; when it is
`null`, an explicit walk-in tag rather than an empty cell.

**No overdue flag.** `ArrivalRequestResource` exposes none, and unlike Active Sessions —
where `is_overdue` comes from the backend's own branch-closing-time check — there is no
server-side notion of an overdue arrival request to mirror. Not invented here.

---

## 9 · i18n

New key groups `announcements` and `arrivalRequests` in both `lang/ar/ar.json` and
`lang/en/en.json`, plus `nav.pages.announcements` and `nav.pages.arrivalRequests`.

`lang/__tests__/messages.spec.ts` enforces four things that shape the work: exact key parity
between bundles, no blank values, no Arabic script leaking into `en`, and — the one that
bites — **every `ar` value must contain Arabic script**, so a placeholder copied from English
fails the guard. Every string is genuinely translated.

The relative-time strings are part of this: unit words and plural categories live in the
formatter's own table rather than the message catalogues, because vue-i18n's default
pluralization does not implement Arabic's six categories without a custom `pluralRules`
registration, and registering one to serve a single formatter is more machinery than a
lookup table.

`nav.sections.cms` already exists and is unchanged.

---

## 10 · One guard note

`no-external-urls.spec.ts` walks every text file under the ADD OS source surface, `__tests__`
included, and fails on any `http(s)://` host not on its allowlist. Announcement fixtures
need `image_url`/`link_url` values.

Fixtures use the already-allowlisted `api.test` rather than adding a host. Its justification
currently reads "Mocked API base URL in Vitest service-layer tests where fetch itself is
stubbed" — accurate for what existed when it was written, and narrower than the use here.
The `why` is widened to also cover mock resource URLs in view tests.

This changes wording, not enforcement: the allowlisted host set is identical, no assertion is
weakened, and the `why.length > 30` and no-duplicates checks still hold. Recorded here
because editing a guard's allowlist — even its prose — should never happen silently.

---

## 11 · Testing

Required by the prompt:

**`AnnouncementsPage.spec.ts`**
- create / edit / delete round-trip
- `ends_at` before `starts_at` blocked client-side, and nothing sent
- `type` accepts arbitrary text — asserted with a value outside `news`/`event`/`offer`, which
  is what would fail if a select ever replaced the text input

**`ArrivalRequestsPage.spec.ts`**
- a matched-booking row confirms with **no** body
- an unmatched row cannot confirm until a `space_id` is chosen, then sends `{ space_id }`
- reject fires directly, with no confirmation dialog
- a 409 surfaces the server's own message **and** triggers a refetch

Alongside those:

- `services/__tests__/announcements.spec.ts` — the §5 round-trip in both directions,
  including that a timestamp is sent with an explicit offset and never as a bare wall clock
- `utils/format/__tests__/format.spec.ts` — `formatRelativeTime` across all four Arabic
  plural categories in both locales; `toOffsetIso`'s existing cases move here intact
- `components/resource/__tests__/ResourceFormDrawer.spec.ts` — the `datetime` field renders
  and round-trips a timestamp

Full `pnpm test:unit` (architecture guards included), `pnpm type-check` and `pnpm lint:check`
before the work is called done. `pnpm lint` is not used as a verification step — it writes.

---

## 12 · Batches

Each committed before the next begins, one working tree, per `CLAUDE.md`.

1. **Re-pin `docs/api/`** — §1. Own commit; nothing else in it.
2. **Shared primitives** — `datetime` field type, `formatRelativeTime`, `useNow`,
   `toOffsetIso` moved, plus specs. No feature code.
3. **Announcements** — types, service, config, page, spec.
4. **Arrival requests** — types, reception service additions, config, page, spec.
5. **Nav + i18n + verification** — `sections.ts`, `routes.ts`, both catalogues, the
   allowlist `why` edit, and the full suite.

## 13 · Open

Nothing blocking. Two items handed off rather than actioned:

| Item | Owner |
|---|---|
| `filterable` on `ResourceFormDrawer`'s `n-select`. Would remove §8's scrolling cost, but is a shared-component change across every CRUD screen — declined here as out of scope, worth its own decision. | Design |
| The `Public (Site) / Get Kiosk Data` description change that made the pin stale mentions `app_download.app_store` / `app_download.google_play` replacing `app_download.url`, and Settings-editable Setting rows. Out of scope here; relevant to whoever builds the Settings screen. | Backend / whoever takes Settings |
