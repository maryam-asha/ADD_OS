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
