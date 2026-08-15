# Generic resource CRUD layer (admin dashboard) — design

**Date:** 2026-08-13 · **Status:** design approved, not yet implemented
**Source:** `ADDCore/postman/ADD-OS.postman_collection.json` → `Admin/Spatial Hierarchy`
(Branches/Buildings/Floors/Zones/Spaces/Resources/Seats & Desks), cross-checked against
`ADDCore/docs/superpowers/specs/2026-08-12-spatial-hierarchy-admin-crud-design.md` — the
approved *backend* design for this same surface — because the two disagree on a few
fields (§1) and the backend doc is the more authoritative of the two.

This introduces a reusable CRUD layer — API client factory, data composables, a generic
table, a generic form drawer — so that adding a new admin resource means writing config
(types, field/column descriptors, a thin service) rather than a new hand-rolled page. The
7-resource spatial hierarchy (Branch → Building → Floor → Zone → Space → Resource →
SeatDesk) is both the proof-of-concept and the first real consumer.

---

## 1. Backend contract — reconciling Postman against the approved backend design

Postman's example request bodies are minimal/happy-path — every field they omit turns
out to be exactly the field the backend design doc marks `nullable`:

| Field | In Postman example? | Backend design doc | Resolution |
|---|---|---|---|
| `SeatDesk.qr_point_id` | No — `{space_id, label}` only | "plain nullable integer" (`qr_points` table doesn't exist until Phase 7) | **Included**, optional number field |
| `Space.hourly_rate` | No | listed in `store`/`update` fields, no explicit nullable note but not required per Validation §, priced-per-hour is not universal across space types | **Included**, optional number field |
| `Space.pricing_currency` | No | "validated via the existing `Currency` enum (`Rule::enum`), nullable" | **Included**, optional select (Currency enum) |
| `Device.metadata` | No | "nullable array" | N/A — Device is deferred, §2 |

`Device`/`DeviceCapability` are scoped into the identical generic admin-CRUD shape by the
same backend design doc (and do have live Postman folders), but were not part of the
original 7-resource ask — deferred, see §2.

**Response envelope**, confirmed identically by both sources for every one of the 7
resources:
- `index`/`show` → `{ data: T }` / `{ data: T[] }`, no pagination metadata. `index()` is
  `->get()`, not `->paginate()` — confirmed by the backend design doc's Routes section
  (flat `apiResource`, no page/per_page anywhere) and independently by the absence of any
  `page`/`per_page`/`cursor` query key anywhere in the Postman collection.
- `store()` → returns the created resource (`{data: T}`) — used to capture the new id.
- `update()` and `updateStatus()` → `{"message": "..."}` **only**, never the updated
  entity (explicit in both the backend design doc's Response Conventions section and
  every "Update X" request's Postman description). The frontend must never assume the
  mutation response carries the new state — see §7's refetch-always rule.
- `destroy()` → hard delete, cascading via DB foreign keys (`cascadeOnDelete`) — no
  "has children" guard client-side either; the backend doesn't have one.

**Auth**: Sanctum SPA session/cookie auth for `Admin/*` (`GET /sanctum/csrf-cookie` →
`POST /login` [+ optional 2FA] → session cookie; `X-XSRF-TOKEN` echoed from the
`XSRF-TOKEN` cookie on every non-GET request). **Not** Bearer — Bearer (`member_token`)
belongs to the separate Member/mobile flow. `src/add-os/services/api.ts` already
implements this correctly (`credentials: "include"`, `readXsrfToken()` → header) for
`GET/POST/PUT/PATCH/DELETE`; nothing about auth transport changes here.

**Foreign-key filters** on `index()`, layered onto the plain listing (backend design
doc's own framing): `buildings?branch_id=`, `floors?building_id=`, `zones?floor_id=`,
`spaces?building_id=&zone_id=` (independent or combined), `resources?space_id=`,
`seats-desks?space_id=`. `branches` has no parent, no filter.

---

## 2. Scope

**In scope:** a generic, resource-agnostic CRUD layer under `src/add-os/`, applied to all
7 spatial-hierarchy resources in dependency order: Branch → Building → Floor → Zone →
Space → Resource → SeatDesk. Each gets a working list+create+edit+delete screen wired
into the existing `spatial` nav section.

**Out of scope:**
- `Device` / `DeviceCapability` — same backend design doc scopes them into this exact
  generic-CRUD shape, and Postman already has live folders for both, but the original ask
  was the 7 physical-hierarchy resources only. Deferred; adding them later is exactly the
  "add config, not a new page" exercise this design exists to enable — no changes to the
  factory/composables/generic components are anticipated.
- `axios`, `@tanstack/vue-query`, `zod`/`vee-validate` — none are installed
  (`package.json` has none of the three), and a new dependency needs approval per root
  `CLAUDE.md` rule 7. `src/add-os/services/api.ts` (fetch-based) already does everything
  an axios instance would be asked to do here (base URL via `apiUrl()`, CSRF/credentials
  for Sanctum), so introducing axios would duplicate working code for no behavioral gain.
  Composables use plain `ref`s, matching `UsersPage.vue`'s existing pattern exactly (no
  Pinia store for server data either — confirmed zero `defineStore` calls under
  `src/add-os` today).
- Server-side pagination — no `page`/`per_page`/`cursor` contract exists on any of these
  7 endpoints (§1); not invented. `ResourceTable` uses `n-data-table`'s built-in
  client-side pager over the fully-fetched array.
- Cross-hierarchy referential validation (e.g., confirming a chosen `zone_id` actually
  belongs to the chosen `building_id`) — the backend design doc explicitly doesn't do
  this server-side either ("nothing else in the codebase does this kind of cross-field FK
  validation today"). The UI narrows dropdown *options* via cascading selects (§8) but
  isn't a substitute for a server check that doesn't exist.
- Section-level role gating for `spatial` — unrelated to this design, not touched.

---

## 3. File layout

```
src/add-os/
├── services/
│   ├── api.ts                 existing — gains centralized 401/403/422 handling (§6)
│   ├── resource-factory.ts    🆕  createResourceApi<T>(baseEndpoint)
│   ├── branches.ts            🆕
│   ├── buildings.ts           🆕
│   ├── floors.ts               🆕
│   ├── zones.ts                🆕
│   ├── spaces.ts               🆕
│   ├── resources.ts            🆕
│   └── seats-desks.ts          🆕
├── composables/                🆕 folder — none existed before this design
│   ├── useResourceList.ts      🆕
│   └── useResourceMutations.ts 🆕
├── components/resource/        🆕 folder — the generic layer itself
│   ├── ResourceTable.vue       🆕
│   ├── ResourceFormDrawer.vue  🆕
│   └── field-types.ts          🆕  FieldDescriptor contract
├── modules/spatial/            🆕 module, sibling to modules/system/
│   ├── types/
│   │   ├── branch.ts  building.ts  floor.ts  zone.ts  space.ts  resource.ts  seat-desk.ts
│   ├── config/                 columns + field descriptors, one file per resource
│   │   ├── branches.config.ts  buildings.config.ts  ...
│   └── views/
│       ├── BranchesPage.vue  BuildingsPage.vue  FloorsPage.vue  ZonesPage.vue
│       ├── SpacesPage.vue  ResourcesPage.vue  SeatsDesksPage.vue
```

Every new path is under `src/add-os/**` (owned, per root `CLAUDE.md`'s file-ownership
table) — nothing in vendor `src/**` is touched. Following §3 of the Users/Roles design:
services stay flat in `add-os/services/`, not nested per-module.

---

## 4. `resource-factory.ts`

```ts
function createResourceApi<T, CreatePayload = Partial<T>, UpdatePayload = Partial<T>>(
  baseEndpoint: string
) {
  return {
    list: (query?: Record<string, unknown>) =>
      get<{ data: T[] }>(baseEndpoint, query).then(r => r.data),
    getById: (id: number) =>
      get<{ data: T }>(`${baseEndpoint}/${id}`).then(r => r.data),
    create: (payload: CreatePayload) =>
      post<{ data: T }>(baseEndpoint, payload).then(r => r.data),
    update: (id: number, payload: UpdatePayload) =>
      put<{ message?: string }>(`${baseEndpoint}/${id}`, payload),
    remove: (id: number) =>
      del<{ message?: string }>(`${baseEndpoint}/${id}`)
  }
}
```

`update`'s return type is deliberately just the message (§1) — callers must not expect
the updated entity back. Each resource service calls the factory for the four/five
generic verbs and adds only what it needs on top, per the original ask:

```ts
// services/buildings.ts
const api = createResourceApi<Building, CreateBuildingPayload, UpdateBuildingPayload>(
  "/api/v1/admin/buildings"
)
export const listBuildings = (branchId?: number) => api.list(branchId ? { branch_id: branchId } : undefined)
export const { getById: getBuilding, create: createBuilding, update: updateBuilding, remove: removeBuilding } = api

// services/spaces.ts — extra endpoint, not from the factory
export function updateSpaceStatus(id: number, payload: UpdateSpaceStatusPayload) {
  return patch<{ message?: string }>(`/api/v1/admin/spaces/${id}/status`, payload)
}
```

`spaces.ts` and `resources.ts` each add an `updateStatus()` this way — the only two
resources with a status sub-endpoint (§5).

---

## 5. Resource field map

| Resource | Parent FK(s) | Own fields | Status endpoint |
|---|---|---|---|
| Branch | — | `name` {ar,en}, `city` {ar,en}, `timezone`, `is_active` | no |
| Building | `branch_id` | `name` {ar,en}, `floor_count` | no |
| Floor | `building_id` | `label`, `sort_order` | no — deliberately no status, ever (backend design doc + `SpatialHierarchyGuardTest`) |
| Zone | `floor_id` | `label`, `sort_order` | no — same guard as Floor |
| Space | `building_id`, `zone_id` (nullable) | `space_type` (enum: `co_space`\|`room`\|`business`\|`event_hall`), `allocation_model` (nullable), `is_lockable`, `capacity`, `hourly_rate` (nullable), `pricing_currency` (nullable, Currency enum) | yes — `PATCH .../status` with `status`, `status_reason` (nullable), `status_from` (nullable), `status_until` (nullable). Status enum: `active`\|`maintenance`\|`retired` (`App\Domain\Foundation\Enums\OperationalStatus`, read directly from `ADDCore` source — shared with Resource, below). |
| Resource | `space_id` | `name`, `category`, `quantity` (defaults 1) | yes — `PATCH .../status` with `status`, `status_reason` (nullable) only — no `status_from`/`status_until` for this one. Same `OperationalStatus` enum as Space. |
| SeatDesk | `space_id` (must be a `co_space`-type Space, enforced server-side) | `label`, `qr_point_id` (nullable) | no |

`name`/`city` are `{ar, en}` objects on the wire (confirmed in the Postman create
bodies), not plain strings — this is why `field-types.ts` (§8) needs a `bilingual-text`
field type distinct from `text`.

`store()`/`update()` for Space and Resource never touch `status`/`status_reason`/
`status_from`/`status_until` (backend design doc, explicit) — those four fields exist
only on the two `FieldDescriptor` sets used by a separate, smaller "change status" drawer
per resource, not the create/edit drawer. This mirrors the existing Users precedent
exactly (`updateUserProfile` vs. `updateUserStatus` are separate calls, separate forms).

---

## 6. Centralized error handling — split between `api.ts` and the composables

`api.ts` is a plain module, not a component — it has no Naive UI provider context, so
it cannot call `useMessage()` directly (and standing up `createDiscreteApi` just for
this would mean wiring a second theme-aware provider, which is more machinery than one
redirect needs). The handling in §1 of the original ask splits along that real
boundary instead of pretending it doesn't exist:

- **401**, in `request<T>()` itself → call the existing `useAuthStore().setLogout()`
  action and `router.push("/login")` (`router` is `src/router`'s default-exported
  singleton — a plain object, importable outside component context, same as any other
  module). No toast: landing on the login screen already is the signal, matching
  `initSession()`'s existing silent `setLogout()` on a failed `getMe()` — no toast
  there either.
- **403 / 422 / anything else**, in `useResourceMutations` (§7) — one place, reused by
  all 7 resource pages, which is what "unified handling" actually means here (a toast
  needs a component's Naive UI context, which the composable has and `api.ts` doesn't):
  - **422** → `ApiError.data.errors` (Laravel's `{field: [msgs]}` shape, already parsed)
    is mapped onto `ResourceFormDrawer`'s field-level feedback — no toast.
  - **403** and anything else (5xx, network) → `useMessage().error(error.data?.message
    ?? <generic fallback>)`.
- List-load failures (`useResourceList`, §7) don't toast either — they set an `error`
  ref the page renders as an inline `n-alert`, mirroring `UsersPage.vue`'s existing
  `loadError` pattern exactly (a toast on every page mount that happens to 403 would be
  noisier than a page that just says so).

`ApiError` itself is unchanged — this is additive behavior around existing calls, not a
reshaping of the class.

---

## 7. Composables

```ts
useResourceList<T>(
  api: { list: (q?: Record<string, unknown>) => Promise<T[]> },
  filters?: Ref<Record<string, unknown>>
): { data: Ref<T[]>, isLoading: Ref<boolean>, error: Ref<ApiError | null>, refetch: () => Promise<void> }

useResourceMutations<T>(
  api: { create; update; remove },
  refetch: () => Promise<void>
): { create, update, remove, isSubmitting: Ref<boolean> }
```

`useResourceMutations` always calls `refetch()` after a successful create/update/remove —
never merges the mutation's response into local state — because `update()` doesn't return
the updated entity (§1, §4) and relying on two different strategies (merge on create,
refetch on update) would be needless inconsistency. Each mutation shows a `useMessage()`
toast (success from a per-action i18n key; failure from `ApiError.data?.message` or a
translated fallback) and sets `isSubmitting` around the call so `ResourceFormDrawer`'s
submit button disables mid-flight.

No Pinia store — matches `UsersPage.vue`'s existing local-`ref` pattern; the two are never
justified together since a resource page is the only place its own list is read.

---

## 8. Generic components

### `ResourceTable.vue`

Thin wrapper over `n-data-table`. Props: `columns`, `data`, `loading`, `onEdit`,
`onDelete`. Behavior owned once, here, instead of per-page:
- a fixed `actions` column (edit + delete icon buttons) appended internally;
- delete opens an `n-popconfirm` before calling `onDelete` — no resource page
  reimplements a confirmation;
- `n-data-table`'s built-in pagination over the full array (§2 — no server contract);
- empty-state and loading-skeleton rendering.

### `field-types.ts` — `FieldDescriptor`

```ts
interface FieldDescriptor<TModel = any> {
  key: keyof TModel & string
  labelKey: string // i18n key; the component calls t()
  type: "text" | "bilingual-text" | "number" | "select" | "switch"
  required?: boolean
  rule?: FormItemRule | FormItemRule[] // native Naive UI rule, per-field override
  options?: SelectOption[] | (() => SelectOption[]) // select-only, static
  dependsOn?: string // another field's key
  optionsFrom?: (parentValue: unknown) => Promise<SelectOption[]> | SelectOption[]
  virtual?: boolean // participates in the form/dependency graph
                                                      // but is excluded from the submitted payload
  disabledWhen?: (model: TModel) => boolean
}
```

`virtual` exists because the multi-level ancestor chains here need UI-only narrowing
steps that aren't themselves part of the payload — e.g. creating a Floor only sends
`building_id`, but picking the right building is easier from a Branch dropdown first.
That Branch field is `virtual: true`: it narrows `building_id`'s `optionsFrom`, then is
dropped when the form assembles its submit payload. Without `virtual`, every resource
past the second level would need its intermediate ancestors bolted onto its actual
payload type, which they aren't (confirmed against every create body in §1/§5).

### `ResourceFormDrawer.vue`

`n-drawer`, not `n-modal` — matches `UsersPage.vue`'s existing create/edit precedent
(the original ask specified a modal; the existing precedent and the small field counts
here — 5-8 fields per resource — favor consistency with what's already shipped). Props:
`fields: FieldDescriptor[]`, `model`, `mode: "create" | "edit"`, `onSubmit`. Validation
stays native Naive UI `FormRules` — no schema library (§2). On a 422 response, the
drawer maps `error.data.errors[field.key]` onto that field's Naive UI feedback rather
than a generic toast (§6).

Dependent-field mechanics: the drawer watches every field with a `dependsOn`; on the
parent's change it (a) clears the child's current value if no longer present in the new
options, (b) disables the child while the parent is unset, (c) re-invokes
`optionsFrom(parentValue)`. This is the one mechanism that drives every cascading chain
in §9 — nothing resource-specific is hardcoded into the drawer itself.

---

## 9. Cascading chains per resource (using `virtual` + `dependsOn`)

| Resource form | Field chain |
|---|---|
| Building | `branch_id` |
| Floor | `branch_id` (virtual) → `building_id` |
| Zone | `branch_id` (virtual) → `building_id` (virtual) → `floor_id` |
| Space | `branch_id` (virtual) → `building_id` → `zone_id` (dependsOn building_id, nullable/clearable) |
| Resource | `branch_id` (virtual) → `building_id` (virtual) → `zone_id` (virtual, optional) → `space_id` |
| SeatDesk | same chain as Resource → `space_id`, `optionsFrom` filtered to `space_type === "co_space"` only (server-enforced constraint, mirrored client-side so an invalid choice isn't offered in the first place) |

Branch's own form has no parent chain (top of the hierarchy).

---

## 10. Navigation

`src/add-os/navigation/sections.ts`'s `spatial` section currently reserves 3 pages
(`branches`, `buildings`, `spaces`, all still `ComingSoon`). This design adds the 4
missing ones so all 7 resources have a route:

```ts
pages: [
  { key: "branches", path: "branches" },
  { key: "buildings", path: "buildings" },
  { key: "floors", path: "floors" }, // new
  { key: "zones", path: "zones" }, // new
  { key: "spaces", path: "spaces" },
  { key: "resources", path: "resources" }, // new
  { key: "seatsDesks", path: "seats-desks" } // new
]
```

`routes.ts`'s `PAGE_COMPONENTS` gains 7 entries (`spatial.branches` → `BranchesPage`,
etc.) — the same one-line-per-page swap the Users/Roles design used, nothing else in
that file changes.

---

## 11. i18n

New keys under `branches` / `buildings` / `floors` / `zones` / `spaces` / `resources` /
`seatsDesks` namespaces in both `add-os/lang/ar/ar.json` and `.../en/en.json`: `columns.*`,
`form.*` (field labels — including both halves of every `bilingual-text` field),
`validation.*`, `create.*`/`edit.*`/`delete.*` (and `changeStatus.*` for Space/Resource
only). `FieldDescriptor.labelKey` values point here; `ResourceFormDrawer`/`ResourceTable`
call `t()` themselves rather than each resource module doing it, so a label is always a
key string in config, never inline-translated before it reaches the generic component.
`nav.pages.floors`/`zones`/`resources`/`seatsDesks` are new (§10); the other three already
exist.

---

## 12. Test plan

- **Vitest, `resource-factory.ts`**: `list`/`getById`/`create`/`update`/`remove` call the
  right HTTP method + URL + envelope-unwrap, in isolation, without a live backend.
- **Vitest, `ResourceFormDrawer`'s dependent-field logic**: parent change → child cleared
  / disabled / `optionsFrom` re-invoked — the one mechanism every cascading chain in §9
  relies on, so it's worth testing once, generically, rather than per-resource.
- **Vitest, `api.ts`**: 401/403/422 branches added in §6 (mocked `fetch`).
- **`pnpm test`** (full guard suite) stays green: no hardcoded colours/px in the new
  files, no literal user-facing strings outside `t()`, icons registered before use.
- **Manual, ar/en × RTL/LTR** (4-state matrix per `i18n-rtl.md`): once, on
  `ResourceTable`/`ResourceFormDrawer` specifically, before they're reused across all 7
  pages — `n-data-table` is flagged RTL-beta by the vendor, and this is that component's
  first production use anywhere in ADD OS (the Users/Roles design flagged the same risk
  for the same reason). Catching an RTL defect once in the generic component beats
  catching it 7 times in each resource page.

---

## 13. Items this design does not settle

| Item | Owner | Why it is not blocking |
|---|---|---|
| ~~Full `status` enum values for Space/Resource~~ — **resolved during plan-writing**: `App\Domain\Foundation\Enums\OperationalStatus` (`ADDCore/app/Domain/Foundation/Enums/OperationalStatus.php`) is `active`\|`maintenance`\|`retired`, shared by both Space and Resource. §5 updated in place. | — | Closed — read directly from the Laravel source rather than left as a guess. |
| `Device`/`DeviceCapability` admin CRUD | Product/Maryam | Explicitly deferred, §2 — the generic layer is designed so adding them later is config-only. |
| `VITE_API_URL` still unset | Infra | Pre-existing, tracked in root `CLAUDE.md`'s open-items table; unrelated to this design beyond being a precondition for any of it to run against a real backend. |
| Section-level role gating for `spatial` | Product | Same deferral as the Users/Roles design (§11 there) — not reopened here. |
