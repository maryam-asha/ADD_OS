# Kitchen orders (dashboard)

Members order from the kitchen in the app; staff work those orders here. Design and
plan: `docs/superpowers/plans/2026-11-10-kitchen-orders-dashboard.md` (the backend spec
lives with ADD Core, branch `kitchen-orders`).

| Screen | Route | Permission |
|---|---|---|
| Live board (new / preparing / ready; accept, reject with a reason, ready, delivered) | `/kitchen/board` | `kitchen-orders.view` (+ `.manage` to act) |
| Order history | `/kitchen/orders` | `kitchen-orders.view` |
| Each branch's kitchen store | `/kitchen/stores` | `kitchen-stores.view` (+ `.update`) |
| Ordering codes for desks and rooms, printable stickers | `/kitchen/qr-points` | `qr-points.view` (+ `.create`, `.delete`) |
| Minimum quantities per item | Inventory > warehouse drawer | `inventory.warehouses.view` (+ `.manage`) |

Code: `src/add-os/modules/kitchen/`, `src/add-os/services/kitchen.ts`,
`WarehouseMinimumsEditor.vue` in `modules/inventory/components/`. Sticker printing is
shared with the door stickers through `src/add-os/utils/printSticker.ts`.

Open: the API pin (`docs/api/`) has no kitchen endpoints yet. `services/kitchen.ts` was
read from ADD Core's source on 2026-11-11; re-pin once the backend collection lands and
run `pnpm api:collection:check`.

## Permissions each screen also needs

A screen's own permission is not the whole story; it reads other lists too, and an account
without them gets a partial screen, not an error everywhere.

- **QR codes page** also reads buildings, rooms and desks: `buildings.view`,
  `spaces.view`, `seats-desks.view`. Each list is read on its own; a 403 on one shows that
  list's own notice (and the rest still shows), but without the codes themselves
  (`qr-points.view`) no rows are shown at all, since every place would wrongly read
  "No code".
- **Kitchen stores page** also needs `inventory.warehouses.view` to offer the warehouses
  to choose from.
- **The live board's "no kitchen store" explanation** needs `kitchen-stores.view`; without
  it the board cannot tell the staff member why a branch takes no orders.
- **The history's member filter** needs `users.view`, `members.view` or `reception.view`
  (whichever the account holds); without one the filter is hidden.

Open (product owner): whether the kitchen role's minimum should include
`kitchen-stores.view`, or whether the backend should flag a branch that has no kitchen
store on the orders it returns.
