@cannot ('update', $post) 
  
@elsecannot ('create', $post) 

@endcannot# Resource list visual refresh (ledger style) — design

**Date:** 2026-08-16 · **Status:** design approved, not yet implemented
**Source:** Figma file "ADD — Mobile App UI/UX" — the originally-given
node (`210:2`, claimed "dashboard-home" under a canvas
 "ADD Admin Operation DashBoard") does not
exist anywhere in the file; the file's only canvas ("ADD Mobile App Screens") is entirely
390×844/402×874 mobile screens (wallet, onboarding, auth). The actual admin-dashboard reference
used for this design is four screenshots shared directly in chat (`wallet-transactions`,
`finance-invoices`, `plans-memberships`, `companies-private-offices`), because the Figma MCP
connection hit its call limit for this session's "View" seat (Professional plan) before a working
node could be located. Exact spacing/type/hex values were therefore **not** extracted via
`get_design_context` — see §8.

---

## 1. Why this scope, not the original ask

The original ask assumed a Next.js + tRPC + Drizzle + shadcn/ui stack and a generic tab set
(Users/Projects/Orders/Products/Inventory/Reports). Neither matches this repo: ADD OS is
Vue 3 + Naive UI + Pinia, and its real nav (`src/add-os/navigation/sections.ts`) is
`dashboard, spatial, system, members, bookings, plans, access, payments, community, incubation,
address, cms, settings`. The four screenshots map conceptually to still-`coming-soon` sections
(`plans → wallet`, `plans/members → memberships`, `members → companies`, `payments`), but none of
those domains have an approved backend design in `ADDCore` yet (confirmed: only
`2026-08-12-spatial-hierarchy-admin-crud-design.md` exists there). Building real screens for them
now would mean inventing fields, exactly what that spatial design explicitly avoided doing.

This design instead applies the *visual language* of those screenshots (stat-card summary row,
uppercase ledger-style table header, status badges) to the **8 pages that already ship with real
data**: Users, Branches, Buildings, Floors, Zones, Spaces, Resources, Seats/Desks. No new domain,
no new backend call, no new dependency.

## 2. In scope / out of scope

**In scope:**
- A new shared component, `ResourceStatCards.vue`, for a stat-card summary row.
- Per-page stat metrics for the 5 pages with a real multi-value breakdown to show (§4).
- A table visual treatment (header/row styling) applied once, at the shared-component/theme
  layer, so all 8 tables (and any future one) inherit it.

**Out of scope:**
- `RolesPage.vue` — read-only list of role tags, no `n-data-table`, no create/edit. Doesn't fit
  this pattern at all.
- Stat-card rows for Floors, Zones, Seats/Desks — none of the three has a status or other
  breakdown field (floors/zones deliberately have no status, by the same backend guard the
  generic-resource-crud design already documented). A single "total count" card would only
  restate the table's own pagination footer.
- Any new nav section, domain, endpoint, or dependency.
- The create/edit drawer (`ResourceFormDrawer.vue`) and the delete confirmation
  (`n-popconfirm` in `ResourceTable.vue`) — both already exist, already shipped on all 8 pages,
  and nothing in the screenshots contradicts them.

## 3. Component: `ResourceStatCards.vue`

`src/add-os/components/resource/ResourceStatCards.vue`. Wraps Naive UI's existing `NStatistic`
(already used in the shipped template, e.g. `src/views/Components/Statistic.vue` — no new
primitive) in a responsive row.

```ts
interface StatCard {
  label: string // pre-translated by the caller via t()
  value: string | number
}
defineProps<{ cards: StatCard[] }>()
```

Purely presentational: no fetching, no composable. Each consuming page computes its own
`StatCard[]` from the array it already holds after `listX()` — a `computed()`, same as
`UsersPage.vue`'s existing `filteredUsers`. Numeric values render through
`src/add-os/utils/format/` per the root `CLAUDE.md` numbers rule, not raw interpolation.

## 4. Per-page stat metrics — grounded in fields that already exist

| Page | Cards | Source |
|---|---|---|
| Users | Total / Active / Deactivated / Blocked | `User.status` |
| Branches | Total / Active / Inactive | `Branch.is_active` |
| Buildings | Total buildings / Total floors | count + `sum(Building.floor_count)` |
| Spaces | Total / Active / Maintenance / Retired | `Space.status` (`OperationalStatus`) |
| Resources | Total / Active / Maintenance / Retired | `SpaceResource.status` (`OperationalStatus`) |

All five are counts/sums over data the page has already fetched for its table — no new request.

## 5. Table visual treatment

Two additive changes, both at the shared layer — no per-page markup changes.

**a) Theme tokens.** `component.table` in `src/add-os/theme/tokens.ts` (`headerBackground`,
`rowStripeBackground`, `borderColor`) is already hand-authored but wired to nothing today —
confirmed absent from `figma-tokens.json` and from `src/theme/index.ts`. Wiring it requires,
at plan time: (i) confirming/extending `scripts/build-tokens.js` to actually emit the
`component` tier (today it's unconfirmed whether it emits anything past `brand`/`semantic`), and
(ii) adding a `DataTable` key to `getThemeOverrides()` in `src/theme/index.ts` — the same
injection point already used there for `Card`/`Tag`/`Typography`. That function is the
established seam for "our layer's overrides" into vendor Naive UI theming, per
`.claude/rules/vendor-boundary.md`; this is not a vendor edit.

**b) CSS-only treatment.** Uppercase header text isn't expressible via Naive UI theme vars — a
small new partial, `src/add-os/theme-overrides/_resource-table.scss`, scoped to a class added on
`ResourceTable.vue`'s root, registered in the `@import` list in
`src/add-os/theme-overrides/index.scss` (per that file's own "not listed here = dead code" rule).

## 6. i18n

New keys, both `ar` and `en`: `resourceCrud.statCards.*` (any generic strings the component
itself needs) plus per-module stat-card labels (e.g. `users.stats.total`, `users.stats.active`,
`buildings.stats.totalFloors`, …).

## 7. Test plan

- Vitest, `ResourceStatCards.vue`: renders N cards, values pass through `utils/format`.
- `pnpm test` (full guard suite) stays green: no hardcoded colors/px in the new SCSS/component,
  no literal user-facing strings outside `t()`.
- Manual ar/en × RTL/LTR pass (the project's standard 4-state matrix) on `ResourceStatCards` and
  the restyled table header specifically — `n-data-table` is vendor-flagged RTL-beta, and this is
  the first visual change to it since the Users/Roles and spatial-hierarchy designs both flagged
  the same risk for the same reason.

## 8. Items this design does not settle

| Item | Owner | Why not blocking |
|---|---|---|
| Exact Figma spacing/type/hex values for the stat cards and table header | — | Figma MCP call limit reached mid-session; revisit once access clears. Implementation proceeds against existing token values in the meantime, same as other visual-QA-deferred items in this project. |
| Whether `scripts/build-tokens.js` needs a code change to emit the `component` tier | — | Implementation-level detail; resolved during planning, not guessed here. |
| Backend design for wallet/finance/memberships/companies (the domains the 4 screenshots actually depict) | Product/Maryam (ADDCore) | Explicitly deferred — a separate sub-project once an ADDCore backend design exists, mirroring how spatial hierarchy was gated on `2026-08-12-spatial-hierarchy-admin-crud-design.md` before any frontend work started. |
