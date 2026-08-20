# Plans / Exchange Rates / Business Hours — live verification report

Live-backend verification pass for the task brief covering **Plans**, **Exchange Rates**,
and **Business Hours**, run against a locally-started `php artisan serve` (ADDCore) on
`127.0.0.1:8000`, before any frontend code was written. Raw request/response logs:
`tmp-verify-results.jsonl`, `tmp-verify-rates2.jsonl` (repo root, gitignored as `tmp-*`).

## Fixing the verification harness itself

The first attempt at this pass (started earlier the same session, before a context reset)
got a `401 غير مصادَق` on every endpoint after a successful `POST /login`. Root cause,
confirmed by reading config, not guessed: the harness sent no `Origin`/`Referer` header, so
Sanctum's `EnsureFrontendRequestsAreStateful` never recognized the request as coming from a
stateful frontend and fell back to token auth, which has no token. Confirmed via
`php artisan tinker --execute="config('sanctum.stateful')"` (not `.env` — reads resolved
config only) that `127.0.0.1:5173`/`localhost:5173` are explicitly configured as stateful
domains and CORS-allowed origins. Adding `Origin: http://127.0.0.1:5173` +
`Referer: http://127.0.0.1:5173/` to every request fixed it. **This was a test-harness bug,
not a backend bug** — no ADDCore code was touched.

## Results

| Endpoint | Method | Called from (file) | Status | Evidence |
|---|---|---|---|---|
| `/api/v1/admin/plans` | GET | *(to be built)* | ✅ tested-working | `200 {"data":[...]}`, flat array, no pagination `meta` observed |
| `/api/v1/admin/plans` | POST | *(to be built)* | ✅ tested-working | `201` with full created resource incl. `created_at` |
| `/api/v1/admin/plans/{id}` | GET | *(to be built)* | ✅ tested-working | `200 {"data": {...}}` |
| `/api/v1/admin/plans/{id}` | PUT | *(to be built)* | ✅ tested-working | `200 {"message": "تم تحديث الباقة."}` — message only, matches collection's documented shape |
| `/api/v1/admin/plans/{id}` | DELETE | *(to be built)* | ✅ tested-working | `204` empty body; re-DELETE on the same id → `404` |
| `PATCH /api/v1/admin/plans/{id}/status` | PATCH | — | ❌ broken (doesn't exist) | `404 {"message":"المورد المطلوب غير موجود."}` — not in the Postman collection either. See Backend Gaps. |
| `/api/v1/admin/exchange-rates` | GET | *(to be built)* | ✅ tested-working | `200 {"data":[...]}` |
| `/api/v1/admin/exchange-rates` | POST | *(to be built)* | ✅ tested-working (after correcting the body) | See Backend Gaps — collection's example body is wrong |
| `GET /api/v1/admin/exchange-rates/latest` | GET | — | ❌ broken (doesn't exist) | `404`, and absent from the Postman collection too |
| `/api/v1/admin/exchange-rates/{id}` (GET/PUT/DELETE) | — | — | ⚠️ confirmed intentionally absent | All three `404`. Matches the collection (list+create only) — this is an immutable rate ledger by design, not a gap. |
| `/api/v1/admin/business-hours` | GET | *(to be built)* | ✅ tested-working | Supports `?branch_id=` filter; `200 {"data":[...]}` both filtered and unfiltered |
| `/api/v1/admin/business-hours` | POST | *(to be built)* | ✅ tested-working | `201 {"data": {id, branch_id, day_of_week, open_time, close_time}}` — no `created_at` |
| `/api/v1/admin/business-hours/{id}` | GET | *(to be built)* | ✅ tested-working | `200 {"data": {...}}` |
| `/api/v1/admin/business-hours/{id}` | PUT | *(to be built)* | ✅ tested-working | `200 {"message": "تم تحديث ساعات العمل."}` — message only |
| `/api/v1/admin/business-hours/{id}` | DELETE | *(to be built)* | ✅ tested-working | `204`; collection says admin-only, matches `permissions.ts` precedent |
| `/api/v1/admin/business-hour-exceptions` (full CRUD) | — | *(to be built)* | ✅ tested-working | Not in the task brief at all — see Backend Gaps / scope note. Full List/Create/Get/Update(message-only)/Delete all verified. |

## Specific checkpoints from the brief

**1. 422 dotted-key validation for nested bilingual fields.** Confirmed: a Plan create
missing `name.ar` returns `"errors": {"name.ar": ["حقل name.ar مطلوب."], ...}` — dotted, not
`name`. This already matches `ResourceFormDrawer`'s existing dotted-key error mapping
(built for a different module, commit `48f236f`), so no drawer changes are needed for any
of these three modules.

**2. Currency header effect on Plans pricing.** The brief's premise was partially right but
the first test run drew the wrong conclusion (two USD-priced plans against a USD header —
no conversion is possible when the header matches the stored currency, so nothing seemed to
change). Re-tested with a plan priced in each currency against the *other* currency's
header:

- Header currency == plan's own `pricing_currency` → response is just the plan, unchanged.
- Header currency != plan's own `pricing_currency` → response gets two **extra** fields,
  `converted_amount` and `converted_currency` — `price`/`pricing_currency` themselves never
  change. Example: a plan stored as `price: "150000.00", pricing_currency: "SYP"`, fetched
  with `currency: USD`, returns
  `..., "converted_amount": "10.00", "converted_currency": "USD"`.
- This conversion is computed **server-side** using the latest applicable exchange rate as
  of now, even though there is no client-facing "latest rate" endpoint (see Gap below) —
  confirmed by seeding two `USD` exchange rates and observing the math matches the more
  recently created one at a tied `effective_from`.

**3. Deletion/dependency behavior.** Deleting a Plan with no dependents succeeds (`204`);
deleting the same id again is `404`, not a 409/422 — there's no "this Plan is in use"
guard observed (nothing else in this backend currently references a Plan, since
Memberships is a separate, unbuilt module). Exchange Rates have no delete endpoint at all,
so "delete while in use" doesn't apply. Business Hours delete likewise just `204`s; no
dependent-record guard was observed.

## BACKEND GAPS FOUND

1. **`PATCH /plans/{id}/status` does not exist** (`404`). The brief assumed this by analogy
   with the *Resources* module's real `PATCH /resources/{id}/status` endpoint — that
   endpoint belongs to a different resource. Toggling a Plan's `is_active` must go through
   the regular `PUT` with the full payload.
2. **`GET /exchange-rates/latest` does not exist** (`404`), and is absent from the Postman
   collection too — this was the brief's assumption, not something the collection ever
   documented. The frontend must compute "latest per currency" client-side from the list
   response (max `effective_from` per `currency_code`; ties broken by highest `id`, per the
   one tied-`effective_from` case observed in this pass — inferred from behavior, not from
   reading backend code).
3. **The Postman collection's Create Exchange Rate example body is stale.** It documents
   `{"rate_usd_to_syp": 14500, "effective_from": "..."}`. The live backend's actual required
   fields, discovered via the 422 validation errors those exact field names produced, are
   `currency_code`, `rate_to_base`, `effective_from`. Worth reporting back to whoever
   maintains the collection.
4. **`currency_code` only accepts `"USD"`** — `SYP`, `EUR`, `GBP`, `TRY`, `SAR` were all
   tried and all rejected with `422` ("the selected value is invalid"). SYP is the fixed
   base currency the rate converts *into*; there is nothing to dynamically fetch here since
   no currency-listing endpoint exists anywhere in the collection.
5. **Duplicate `(currency_code, effective_from)` rows are allowed** — no uniqueness
   constraint; two `USD` rates with the identical `effective_from` were both accepted.
6. **Custom Business Hours validation messages ignore the `lang` header.** The standard
   Laravel "required"/"invalid" messages localize correctly to Arabic, but the three custom
   rules — overlap, close-time-after-open-time, invalid `day_of_week` enum message — came
   back in English even when `lang: ar` was sent (e.g. `"This time period overlaps an
   existing period."`). Not blocking (the form will surface whatever text the backend
   sends either way), but worth knowing before assuming every 422 message is
   locale-correct.
7. **Business Hours has an undocumented-in-the-brief second sub-resource:**
   `/business-hour-exceptions` (per-branch, per-date overrides — holidays, shortened hours).
   Full CRUD, fully working, lives in the same Postman folder as Business Hours. Being
   treated as in-scope for this work rather than flagged as unbuilt, since it's clearly part
   of the same feature area.

## Known leftover local-DB state

Three `USD` exchange-rate test fixtures (ids from this pass) remain in the local dev DB —
there is no DELETE endpoint to remove them via the API, and direct DB deletion was
correctly blocked by this session's permission settings as an out-of-scope destructive
action. Harmless for a local dev database; noted here rather than silently left
undocumented.
