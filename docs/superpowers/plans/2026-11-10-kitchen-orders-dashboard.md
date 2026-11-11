# Kitchen Orders — Dashboard (ADD OS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The kitchen works its orders on a live board in the dashboard; staff see order history, set each branch's kitchen store and item minimums, and print desk/room ordering QR stickers.

**Architecture:** A new `src/add-os/modules/kitchen/` module and `src/add-os/services/kitchen.ts`, a new "kitchen" nav section, and a second private channel (`private-kitchen`) in `services/realtime.ts` built on the same subscribe/poll-fallback machinery reception uses. Stickers reuse the hidden-frame print of `DeviceQrModal.vue`.

**Tech Stack:** Vue 3 + TS strict, Naive UI, Tailwind v4 (layout only), Pinia, vue-i18n (ar/en, RTL-first), Vitest.

**Spec:** `../ADDCore/docs/superpowers/specs/2026-11-10-kitchen-orders-design.md` (in the ADD Core repo) (approved 2026-11-10). **Depends on** `../ADDCore/docs/superpowers/plans/2026-11-10-kitchen-orders-backend.md`: Tasks 1–4 here need backend Tasks 1–4 and 9; Task 5 needs backend Task 10. Route paths, fields and permission names below are that plan's; if the backend changed one, the backend wins — re-read its resources before starting.

## Before you start

- This repo's root `CLAUDE.md` governs: Category A (`src/add-os/**`) only; never edit vendor `src/**`.
- Re-pin `docs/api/ADD-OS.postman_collection.json` from the canonical collection once backend Task 11 lands (`pnpm api:collection:check` must report a match) and cite it by date in `services/kitchen.ts`.
- Work in a feature worktree (`superpowers:using-git-worktrees`); delete it after merge (nested worktrees double-count Vitest files).

## Global Constraints

- Every user-visible string through vue-i18n in **both** `ar` and `en`; no literal strings in templates.
- Zero hardcoded design values in `src/add-os/` — no hex/`rgb()`/raw px; no Tailwind palette colours (`teal-50`, `stone-500`…) — tokens and Naive `type`s only.
- Numbers through `src/add-os/utils/format/` (`formatNumber` for points and quantities, `formatDateTime`/`formatTime` for times).
- Icons `carbon:*`, bundled; run `pnpm icons` if a new one is used.
- No new dependency (QR is Naive's `NQrCode`, already used).
- No shipped control may be a no-op; a button shows only when its permission is held.
- Verification is `pnpm test:unit`, `pnpm type-check`, `pnpm lint:check` — never `pnpm lint` (it writes). Don't run them concurrently (forks-pool timeouts).
- Permissions (from backend routes): `kitchen-orders.view`, `kitchen-orders.manage`, `kitchen-stores.view`, `kitchen-stores.update`, `qr-points.view`, `qr-points.create`, `qr-points.delete`; minimums use `inventory.warehouses.view` / `inventory.warehouses.manage`.

## Review Focus

1. **Socket down or Pusher unconfigured** → the board still refreshes every 30 s (`useKitchenRealtime` falls back to polling, as reception does). (Task 1 `polls_while_disconnected`.)
2. **Two staff act on the same order** → the second click's 409 shows the API message and the board reloads, no stale card left. (Task 2 `reloads_after_conflict`.)
3. **Accept fails with out-of-stock (422)** → message names the item; the card stays in "new" with Reject available. (Task 2 `keeps_card_on_out_of_stock`.)
4. **A note-delivery order with a long Arabic note** → the card shows the note wrapped in full in RTL, never truncated to unreadable. (Task 2 `shows_full_note`.)
5. **Branch with no kitchen store** → the board says so and links to the settings page (for holders of `kitchen-stores.update`), instead of an empty board. (Task 2 `explains_missing_store`.)

---

### Task 1: Kitchen API service, types and the kitchen channel

**Files:**
- Create: `src/add-os/modules/kitchen/types/kitchen.ts`, `src/add-os/services/kitchen.ts`, `src/add-os/modules/kitchen/composables/useKitchenRealtime.ts`
- Modify: `src/add-os/services/realtime.ts` (add `KITCHEN_EVENTS = ["kitchen_order.created", "kitchen_order.updated"] as const`, `KitchenEvent`, `subscribeKitchen(handler, events = KITCHEN_EVENTS): () => void` on `private-kitchen` — factor the body of `subscribeReception` into a private `subscribeChannel(channel, counterKey, …)` so both share it; reception behaviour unchanged), `src/add-os/modules/booking/composables/useReceptionRealtime.ts` (extract the reload/poll core into `src/add-os/composables/useChannelRefetch.ts`; `useReceptionRealtime` becomes a thin wrapper)
- Test: `src/add-os/services/__tests__/kitchen.spec.ts`, `src/add-os/modules/kitchen/composables/__tests__/useKitchenRealtime.spec.ts`; existing `useReceptionRealtime.spec.ts` must still pass untouched.

**Interfaces:**
- Types: `KitchenOrderStatus = "pending"|"preparing"|"ready"|"delivered"|"rejected"|"cancelled"`; `DeliveryType = "desk"|"space"|"pickup"|"note"`; `KitchenOrder { id; status; source: "qr"|"app"; delivery: {type: DeliveryType; label: string|null; note: string|null}; bill: {type: "booking"|"walkin"; id: number}; lines: {sale_item_id; name; quantity; unit_price_points; line_points}[]; total_points; rejection_reason: string|null; cancelled_by: "member"|"system"|null; submitted_at; accepted_at; ready_at; delivered_at; paid: boolean; member: {id; name; phone}; waited_seconds: number }`; `KitchenStoreRow { branch: {id; name}; warehouse: {id; name}|null }`; `QrPoint { id; branch_id; place_type: "seat_desk"|"space"; place_id; place_label; scan_value }`.
- `services/kitchen.ts`: `listKitchenOrders(q: {branch_id?: number; status?: KitchenOrderStatus[]; from?: string; to?: string; user_id?: number; page?: number}): Promise<Paginated<KitchenOrder>>` (status joined by `,`), `getKitchenOrder(id)`, `acceptKitchenOrder(id)`, `rejectKitchenOrder(id, reason: string)`, `markKitchenOrderReady(id)`, `markKitchenOrderDelivered(id)` (each `POST /api/v1/admin/kitchen/orders/{id}/{accept|reject|ready|deliver}`, returning `KitchenOrder`), `listKitchenStores()`, `setKitchenStore(branchId, warehouseId)` (`PUT /api/v1/admin/kitchen/stores/{branch}`), `listQrPoints(q)`, `createQrPoint({place_type, place_id})`, `removeQrPoint(id)`.
- `useKitchenRealtime(refetch, { pollMs = 30_000 })` — same contract as `useReceptionRealtime`.

- [ ] **Step 1: Failing tests:** service URLs/bodies with `get`/`post`/`put` mocked (`lists_with_status_csv`, `reject_sends_reason`, `sets_store_by_branch`); composable `refetches_on_kitchen_event`, `polls_while_disconnected` (Review Focus 1), `stops_on_unmount`. Use block-bodied `beforeEach` (a returned mock becomes teardown).
- [ ] **Step 2:** `pnpm test:unit src/add-os/services/__tests__/kitchen.spec.ts src/add-os/modules/kitchen` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command + `src/add-os/modules/booking` → PASS.
- [ ] **Step 5: Commit** `feat(kitchen): the kitchen's API calls and its live channel`.

### Task 2: The kitchen board

**Files:**
- Create: `src/add-os/modules/kitchen/views/KitchenBoardPage.vue`, `src/add-os/modules/kitchen/components/KitchenOrderCard.vue`, `src/add-os/modules/kitchen/components/RejectOrderModal.vue`, `src/add-os/lang/{ar,en}/kitchen.json` (or the module-file pattern `hr.json` uses — follow it)
- Modify: `src/add-os/navigation/sections.ts` (new section `{ key: "kitchen", path: "/kitchen", icon: "carbon:cafe", status: "active", pages: [{ key: "board", path: "board", permission: "kitchen-orders.view" }, …Task 3/4 pages] }`), `src/add-os/navigation/routes.ts` (`"kitchen.board"`), `src/add-os/modules/system/config/known-permissions.ts` (all seven names above), the role editor's labels for them (ar/en), `src/add-os/__tests__/menu-matches-guard.spec.ts` and `navigation/__tests__/navigation.spec.ts` expectations
- Test: `src/add-os/modules/kitchen/views/__tests__/KitchenBoardPage.spec.ts`, `components/__tests__/KitchenOrderCard.spec.ts`

**Interfaces:** Consumes Task 1. Board: branch select (`useBranchOptions`, remembered per viewer in try/catch-wrapped `localStorage`), three columns — **New** (`pending`), **Preparing**, **Ready** — oldest first; each card: place (desk label / room name / "pickup" / the note), member name, lines × quantity, total in points, waited time (ticking per minute). Actions by status, only with `kitchen-orders.manage`: pending → Accept, Reject (modal, reason required, ≤300); preparing → Ready (pickup orders only) and Delivered; ready → Delivered. The existing "Café — coming soon" page under Community is the Business Café and stays untouched. Every action reloads the board; API errors show via `message.error` with the API's text. No store for the branch → empty state with the reason and, for `kitchen-stores.update`, a link to Task 3's page. Sound cue on a new pending order: *builder's call*; if added it needs an on/off toggle that works (no no-op control).

- [ ] **Step 1: Failing tests:** `groups_orders_by_status_oldest_first`, `hides_actions_without_manage`, `reject_requires_a_reason`, `reloads_after_conflict` (RF 2), `keeps_card_on_out_of_stock` (RF 3), `shows_full_note` (RF 4, Arabic locale), `explains_missing_store` (RF 5), `points_and_times_use_format_utils`.
- [ ] **Steps 2–4:** FAIL → implement → `pnpm test:unit` (full: nav guards) PASS; `pnpm type-check` PASS.
- [ ] **Step 5: Commit** `feat(kitchen): a live board the kitchen works its orders from`.

### Task 3: Orders history and the kitchen store settings

**Files:**
- Create: `src/add-os/modules/kitchen/views/KitchenOrdersPage.vue`, `src/add-os/modules/kitchen/views/KitchenStoresPage.vue`
- Modify: `sections.ts` (pages `{ key: "orders", path: "orders", permission: "kitchen-orders.view" }`, `{ key: "stores", path: "stores", permission: "kitchen-stores.view" }`), `routes.ts`, nav guard specs, `kitchen.json` ar/en
- Test: `views/__tests__/KitchenOrdersPage.spec.ts`, `views/__tests__/KitchenStoresPage.spec.ts`

**Interfaces:** History: table with filters (branch, status multi, date range, member), paginated via `listPage()`/`Paginated`, row opens a drawer with the full order (lines, timestamps, who acted, rejection reason, paid/unpaid). Stores: one row per branch with a warehouse select limited to that branch's warehouses that sell and are not primary (load via the inventory warehouses service; filter client-side, the API still validates); save needs `kitchen-stores.update`; API 422 keys shown as their message.

- [ ] **Step 1: Failing tests:** `filters_reach_the_query`, `drawer_shows_rejection_reason`, `store_select_offers_only_selling_non_primary_warehouses_of_the_branch`, `save_hidden_without_update`, `shows_api_validation_message`.
- [ ] **Steps 2–4:** FAIL → implement → PASS (full suite + type-check).
- [ ] **Step 5: Commit** `feat(kitchen): order history and each branch's kitchen store`.

### Task 4: Ordering QR stickers

**Files:**
- Create: `src/add-os/utils/printSticker.ts` (extracted from `DeviceQrModal.vue`'s hidden-frame `print()`), `src/add-os/modules/kitchen/views/KitchenQrPointsPage.vue`, `src/add-os/modules/kitchen/components/QrPointStickerModal.vue`
- Modify: `src/add-os/modules/access/components/DeviceQrModal.vue` (use `printSticker`; behaviour and its spec unchanged), `sections.ts` (`{ key: "qrPoints", path: "qr-points", permission: "qr-points.view" }`), `routes.ts`, nav guard specs, `kitchen.json` ar/en
- Test: `src/add-os/utils/__tests__/printSticker.spec.ts`, `views/__tests__/KitchenQrPointsPage.spec.ts`; `DeviceQrModal.spec.ts` must pass untouched.

**Interfaces:** `printSticker(opts: { qrCanvas: HTMLCanvasElement; title: string; subtitle: string; hint: string; dir: "rtl"|"ltr" }): void` — texts set as text, never HTML (as today). Page: branch filter; a list of the branch's desks (by space) and rooms, each showing whether it has a code; "Create code" (`qr-points.create`) calls `createQrPoint` (idempotent); "Print" opens the sticker (`NQrCode` of `scan_value`, place label, branch name, a "scan to order from the kitchen" hint); "Delete code" (`qr-points.delete`) with confirm, warning that printed stickers stop working.

- [ ] **Step 1: Failing tests:** `printSticker_sets_text_not_html`, `create_is_offered_only_without_a_code`, `print_uses_the_scan_value`, `delete_needs_permission_and_confirm`.
- [ ] **Steps 2–4:** FAIL → implement → PASS (full + type-check).
- [ ] **Step 5: Commit** `feat(kitchen): print the ordering code for a desk or a room`.

### Task 5: Minimum quantities in a warehouse

**Files:** Create `src/add-os/modules/inventory/components/WarehouseMinimumsEditor.vue`; modify `src/add-os/modules/inventory/components/WarehouseDrawer.vue` (a "Minimums" section), the inventory service file the drawer already uses (`getWarehouseMinimums(id)`, `setWarehouseMinimums(id, items: {item_id: number; minimum: string}[])` — exact path from backend Task 10), inventory i18n ar/en. Test: `components/__tests__/WarehouseMinimumsEditor.spec.ts`.

**Interfaces:** rows of item (`StockItemSelect`) + minimum (`n-input-number`, decimals per the item's unit `allows_fractions`), save with `inventory.warehouses.manage`; minimum 0 removes the row.

- [ ] **Step 1: Failing tests:** `saves_rows_as_item_and_minimum`, `zero_removes_a_row`, `read_only_without_manage`, `respects_unit_fractions`.
- [ ] **Steps 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(inventory): set the minimum a store should hold of each item`.

### Task 6: Docs, guards, final verification

- [ ] Update the relevant `docs/` record (the module list in `src/add-os/modules/README.md`, and a short `docs/kitchen-orders.md` pointing to the spec) in the same change.
- [ ] If any new architecture guard was added, register it in `.claude/commands/guards.md`.
- [ ] `pnpm api:collection:check` → match. `pnpm test:unit` → all green (including guards). `pnpm type-check` → clean. `pnpm lint:check` → clean. Then `pnpm build`.
- [ ] Live QA in the built-in browser against a local ADD Core with the demo seed: place an order via the member API (Postman), watch it appear on the board, accept → stock drops in the kitchen store, reject another with a reason, print a desk sticker.
- [ ] **Commit** `docs(kitchen): the kitchen module in the dashboard docs`.
