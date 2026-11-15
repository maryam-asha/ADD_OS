# Kitchen Orders Without a Bill — Dashboard (ADD OS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reception confirms or turns down kitchen orders from members without a bill, taking cash when that is how the order is paid, and hands back the cash of orders that were not made. The kitchen board and history show the new statuses and how each order is paid.

**Architecture:** A new "Kitchen" tab inside `ReceptionDeskPage.vue` (the desk's lists are tabs there, not sidebar pages) holds two components from the kitchen module: the queue to confirm and the cash to return. Both are fed by new functions in `services/kitchen.ts` and refreshed by the existing `private-reception` channel. The existing kitchen types widen to the new statuses and payment fields.

**Tech Stack:** Vue 3 + TS strict, Naive UI, Tailwind v4 (layout only), Pinia, vue-i18n (ar/en, RTL-first), Vitest.

**Spec:** `../ADDCore/docs/superpowers/specs/2026-11-14-kitchen-orders-without-a-bill-design.md` (approved 2026-11-14). **Depends on** `../ADDCore/docs/superpowers/plans/2026-11-14-kitchen-orders-without-a-bill-backend.md`: Task 1 here needs backend Tasks 5, 6 and 8. Paths, fields and permission names below are that plan's; if the backend changed one, the backend wins, so re-read its resources first.

## Before you start

- `feat/hr-module` has a large uncommitted HR change set. Work in a fresh worktree cut from `main` (`superpowers:using-git-worktrees`), never on top of it. Delete the worktree after merge (nested worktrees double-count Vitest files).
- Root `CLAUDE.md` governs: edit Category A (`src/add-os/**`) only.

## Global Constraints

- Every Global Constraint of `docs/superpowers/plans/2026-11-10-kitchen-orders-dashboard.md` still holds: i18n in both `ar` and `en`, tokens only (no hex, raw px or Tailwind palette colours), numbers through `utils/format`, bundled `carbon:*` icons (`pnpm icons` for a new one), no new dependency, no no-op control, and verification by `pnpm test:unit` → `pnpm type-check` → `pnpm lint:check`, one at a time, never `pnpm lint`.
- New permission `kitchen-orders.review` is registered in `src/add-os/modules/system/config/known-permissions.ts`. It is checked only through a helper in `src/add-os/config/permissions.ts` (`no-inline-role-checks.spec.ts`).
- Re-pin `docs/api/ADD-OS.postman_collection.json` from the canonical collection and update `docs/api/README.md` (pin date, endpoint count, the credential and encoding checks). `pnpm api:collection:check` must report a match. Cite the pin by date in `services/kitchen.ts`.

## Review Focus

1. **Cash short at accept (422 `amount_short`)** → the API message with the shortage shows in the accept dialog, which stays open; the order stays in the queue. (Task 2 `keeps_dialog_open_on_cash_short`.)
2. **Two receptionists act on the same order** → the second gets 409; its message shows and the list reloads. (Task 2 `reloads_after_conflict`.)
3. **An order expires while the receptionist is looking at it** → the realtime nudge removes the row; an accept on the stale row gets 409 and the list reloads. No stale row remains. (Task 2 `drops_row_on_realtime_update`.)
4. **A member deleted since ordering** (`member` null) → the row shows the localised "deleted member" label, and both actions still work. (Task 2 `renders_without_member`.)
5. **The tab, for a user with `reception.view` but not `kitchen-orders.review`** → no Kitchen tab at all, not an empty or forbidden one. (Task 2 `hides_tab_without_permission`.)

---

### Task 1: Types, service and permission

**Files:**
- Modify: `src/add-os/modules/kitchen/types/kitchen.ts`, `src/add-os/services/kitchen.ts`, `src/add-os/config/permissions.ts`, `src/add-os/modules/system/config/known-permissions.ts`, `src/add-os/services/realtime.ts` (reception events gain `kitchen_order.awaiting_reception`, as the backend names it), `docs/api/ADD-OS.postman_collection.json`, `docs/api/README.md`
- Test: `src/add-os/services/__tests__/kitchen.spec.ts`

**Interfaces:**
- `KitchenOrderStatus` adds `"awaiting_payment" | "awaiting_reception"`, and `KITCHEN_ORDER_STATUSES` lists them first.
- `KitchenOrder` gains `route: "kitchen" | "reception"`, `payment: { choice: "bill" | "wallet" | "card" | "cash"; wallet_owner_type: "user" | "company" | null; paid: boolean }`, `cash_due_points: number | null`, and `bill` becomes `{ type: "booking" | "walkin"; id: number } | null`.
- `interface CashReturnRow { order: KitchenOrder; points: number; received_amount: string; received_currency: string }` (field names as backend Task 6 returns them).
- `listOrdersToConfirm(q: { branch_id?: number; page?: number }): Promise<Paginated<KitchenOrder>>` → `GET admin/reception/kitchen-orders`
- `confirmKitchenOrder(id: number, cash?: { amount: string | null; currency: string | null }): Promise<KitchenOrder>` → `POST …/{id}/accept`
- `turnDownKitchenOrder(id: number, reason: string): Promise<KitchenOrder>` → `POST …/{id}/reject`
- `listCashReturns(q: { branch_id?: number; page?: number }): Promise<Paginated<CashReturnRow>>`, `markCashReturned(id: number)`, `creditCashAsPoints(id: number)` → `admin/reception/kitchen-cash-returns…`
- `canReviewKitchenOrders(): boolean` → `can("kitchen-orders.review")`

- [ ] **Step 1: Failing tests:** each function hits its path and method with its body (`confirm_sends_cash_only_when_given`, `turn_down_sends_reason`, `lists_pass_branch_and_page`).
- [ ] **Step 2:** `pnpm test:unit src/add-os/services/__tests__/kitchen.spec.ts` → FAIL.
- [ ] **Step 3:** Implement. Re-pin the collection.
- [ ] **Step 4:** `pnpm test:unit` (guards included) → PASS; `pnpm api:collection:check` → match.
- [ ] **Step 5: Commit** `feat(kitchen): the reception side of kitchen orders in the API service`.

### Task 2: Reception — "Kitchen orders to confirm"

**Files:**
- Create: `src/add-os/modules/kitchen/components/ReceptionKitchenQueue.vue`, `src/add-os/modules/kitchen/components/ConfirmCashOrderModal.vue`
- Modify: `src/add-os/modules/reception/views/ReceptionDeskPage.vue` (a `kitchen` tab, `v-if="canReviewKitchenOrders()"`, with a badge for the queue's `total`), `src/add-os/lang/{ar,en}/kitchen.json`, `src/add-os/lang/{ar,en}/reception.json` (or wherever `reception.tabs.*` lives; grep it)
- Test: `src/add-os/modules/kitchen/components/__tests__/ReceptionKitchenQueue.spec.ts`, `src/add-os/modules/reception/views/__tests__/ReceptionDeskPage.spec.ts` (extend)

**Interfaces:**
- Consumes Task 1.
- Each row shows: the member (name, phone, or the deleted label), the items and total (`formatNumber`), the place (`delivery.label`), the time waited, and the payment: *paid from wallet* or *paid from company wallet*, *paid by card*, or a warning tag **cash to collect: N**.
- **Confirm:** a paid order confirms at once. A cash order opens `ConfirmCashOrderModal`, which asks for the amount handed over (default: exactly what is due) and the currency, then calls `confirmKitchenOrder`.
- **Turn down:** reuses `RejectOrderModal.vue` (reason required).
- Refresh: the existing `useReceptionRealtime` events plus `kitchen_order.awaiting_reception`. Any 409 shows the message and reloads.

- [ ] **Step 1: Failing tests:** `lists_orders_with_payment_state`, `confirms_a_paid_order_directly`, `opens_cash_dialog_for_cash_order`, `keeps_dialog_open_on_cash_short` (RF1), `reloads_after_conflict` (RF2), `drops_row_on_realtime_update` (RF3), `renders_without_member` (RF4), `hides_tab_without_permission` (RF5, in the desk page spec).
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** `pnpm test:unit` → PASS, then `pnpm type-check`, then `pnpm lint:check`.
- [ ] **Step 5: Commit** `feat(kitchen): reception confirms kitchen orders from members without a bill`.

### Task 3: Reception — "Cash to return"

**Files:**
- Create: `src/add-os/modules/kitchen/components/KitchenCashReturns.vue`
- Modify: `ReceptionKitchenQueue`'s tab in `ReceptionDeskPage.vue` (a second section below the queue, shown only when it has rows), `src/add-os/lang/{ar,en}/kitchen.json`
- Test: `src/add-os/modules/kitchen/components/__tests__/KitchenCashReturns.spec.ts`

**Interfaces:** Consumes Task 1. Each row shows who is owed, the amount as received (`received_amount` + `received_currency`, through `utils/format`), the order number, and why it was not made (rejection reason or expiry). Two actions, each confirmed with an `n-popconfirm`: **Returned in cash** (`markCashReturned`) and **Credit as points** (`creditCashAsPoints`).

- [ ] **Step 1: Failing tests:** `lists_cash_owed`, `returned_removes_the_row`, `credit_as_points_removes_the_row`, `hidden_when_nothing_owed`, `shows_409_and_reloads`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** `pnpm test:unit` → `pnpm type-check` → `pnpm lint:check` → PASS.
- [ ] **Step 5: Commit** `feat(kitchen): reception hands back the cash of orders that were not made`.

### Task 4: The kitchen board and history show how an order is paid

**Files:**
- Modify: `src/add-os/modules/kitchen/components/KitchenOrderCard.vue` (payment tag: *on the bill*, *paid*, or *paid in cash*), `src/add-os/modules/kitchen/views/KitchenOrdersPage.vue` (status filter includes the two new statuses; a "no bill" label where `bill` is null; refund / cash-return state in the detail), `src/add-os/lang/{ar,en}/kitchen.json`
- Test: `src/add-os/modules/kitchen/components/__tests__/KitchenOrderCard.spec.ts`, `src/add-os/modules/kitchen/views/__tests__/KitchenOrdersPage.spec.ts`

**Interfaces:** Consumes Task 1. The board's own query is unchanged: it only ever shows `pending` onward.

- [ ] **Step 1: Failing tests:** `card_shows_paid_or_on_the_bill`, `history_filters_by_new_statuses`, `history_renders_an_order_without_a_bill`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** `pnpm test:unit` → `pnpm type-check` → `pnpm lint:check` → PASS.
- [ ] **Step 5: Commit** `feat(kitchen): the board and history show how each order is paid`.
