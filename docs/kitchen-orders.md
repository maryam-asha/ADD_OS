# Kitchen orders (dashboard)

Members order from the kitchen in the app; staff work those orders here. Design and
plan: `docs/superpowers/plans/2026-11-10-kitchen-orders-dashboard.md` (the backend spec
lives with ADD Core, branch `kitchen-orders`).

| Screen | Route | Permission |
|---|---|---|
| Live board (new / preparing / ready; accept, reject with a reason, ready, delivered) | `/kitchen/board` | `kitchen-orders.view` (+ `.manage` to act) |
| Order history | `/kitchen/orders` | `kitchen-orders.view` |
| Each branch's kitchen store | `/kitchen/stores` | `kitchen-stores.view` (+ `.update`) |
| Ordering codes, printable stickers: each desk in its own row on the desks page, each room / office / hall on the spaces page ("QR point" column) | `/spatial/seats-desks`, `/spatial/spaces` | `qr-points.view` to print (+ `.create` to make a code) |
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

- **The QR point column** on the desks and spaces pages loads the codes with `qr-points.view`;
  without it the column cannot tell which places already have one, so it only offers
  "Create code" (asking again returns the existing code, nothing is duplicated).
- **Kitchen stores page** also needs `inventory.warehouses.view` to offer the warehouses
  to choose from.
- **The live board's "no kitchen store" explanation** needs `kitchen-stores.view`; without
  it the board cannot tell the staff member why a branch takes no orders.
- **The history's member filter** needs `users.view`, `members.view` or `reception.view`
  (whichever the account holds); without one the filter is hidden.

Open (product owner): whether the kitchen role's minimum should include
`kitchen-stores.view`, or whether the backend should flag a branch that has no kitchen
store on the orders it returns.

## Changed 2026-11-12: no separate ordering-codes page

The first version had its own page, `/kitchen/qr-points` (Kitchen > Ordering codes): per
branch, every desk and room with its code, Print, Create and Delete. The product owner
asked for the code to live where the place is listed instead: the desks page and the
spaces page each carry a "QR point" column with Print / Create code, and the separate
page, its nav entry, route and page-only strings were removed.

Given up with it: one screen listing every place's code per branch (for printing a whole
floor in one go), the per-source error notices, and **deleting a code from the dashboard**
(revoking a leaked sticker). The API still has `DELETE admin/qr-points/{id}` and the
`qr-points.delete` permission; a delete action can be added to the column if needed.
