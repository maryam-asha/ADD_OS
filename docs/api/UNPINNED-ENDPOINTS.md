# Endpoints this dashboard calls that the pinned collection does not describe

**Opened 2026-08-26.** Companion to [`README.md`](README.md), which explains why every
"per the collection" claim cites the dated snapshot rather than the live canonical file.

This file covers the opposite case: a route that **exists in the backend and is called
from `src/add-os/`, but appears nowhere in the snapshot** — so there is no collection
entry to cite, and a comment claiming one would be citing a document that does not
mention the endpoint.

## Why this is not the same as a stale pin

`pnpm api:collection:check` reported **MATCH** on 2026-08-26 (`sha256 86d330d9…`), so
the snapshot is byte-identical to the canonical collection right now. The gap is not
drift between this repo and the backend project — **the canonical collection itself has
no record of these routes.** Re-pinning would change nothing. The fix is on the backend
side: these endpoints need adding to `ADD-OS.postman_collection.json` and the snapshot
re-pinned afterwards.

Until then, code that calls them cites **ADDCore source files by path**, and says so at
the point of use. That is a weaker citation than a dated snapshot — a source file moves
without a version to name — which is exactly why it is recorded here rather than left
implicit in a comment.

## The routes

All registered in `ADDCore/routes/api/v1/admin.php`.

| Method | Path | Controller | Called from |
|---|---|---|---|
| `GET` | `/api/v1/admin/currencies` | `CurrencyController::index` | `services/currencies.ts` |
| `POST` | `/api/v1/admin/currencies` | `CurrencyController::store` | `services/currencies.ts` |
| `GET` | `/api/v1/admin/currencies/{currency}` | `CurrencyController::show` | *not called — the list returns every field* |
| `PATCH` | `/api/v1/admin/currencies/{currency}` | `CurrencyController::update` | `services/currencies.ts` |
| `PATCH` | `/api/v1/admin/currencies/{currency}/status` | `CurrencyController::updateStatus` | `services/currencies.ts` |
| `GET` | `/api/v1/admin/exchange-rates/suggestion` | `ExchangeRateSuggestionController::show` | `services/exchange-rates.ts` |
| `POST` | `/api/v1/admin/exchange-rates/suggestion/{id}/dismiss` | `ExchangeRateSuggestionController::dismiss` | `services/exchange-rates.ts` |

`GET /api/v1/public/currencies` (`Public\CurrencyController::index`) is unpinned too. No
ADD OS dashboard code calls it; listed only so the inventory is complete.

## Sources read instead, per feature

**Currencies** — `CurrencyController`, `CurrencyResource`, `StoreCurrencyRequest`,
`UpdateCurrencyRequest`, `UpdateCurrencyStatusRequest`, the `Currency` model,
`2026_08_20_100000_create_currencies_table`, and
`ADDCore/docs/decisions/multi-currency-support.md`.

**Rate suggestions** — `ExchangeRateSuggestionController`, `StoreExchangeRateRequest`,
the `ExchangeRateSuggestion` model and its three enums, and
`ADDCore/docs/decisions/exchange-rate-external-suggestion.md`.

## What to do when the collection catches up

1. Re-read the canonical collection and re-pin per `README.md`.
2. Confirm each row above appears, and that its request/response shape matches what
   `types/currency.ts` and `types/exchange-rate.ts` describe.
3. Move the citation in those two type files from "ADDCore source" to the new pin date,
   and delete the row here.

Nothing in this file is a reason to defer work. It is a reason to be precise about what
a claim rests on.
