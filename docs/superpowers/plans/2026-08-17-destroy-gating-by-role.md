# Destroy Gating by Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Adaptation note:** written and executed inline, in the same session, by the same
> agent — not handed to fresh subagents (as with the previous plan in this repo). Commits
> are not run automatically; the repo's global instructions forbid committing without an
> explicit user request.

**Goal:** Hide the delete control on the seven spatial resource tables from any session
that isn't `admin` — hidden, not disabled — because the backend already rejects those
requests with 403, and surface that rejection (and the cascading-delete consequence) in
copy a user can actually understand.

**Architecture:** One data file (`config/permissions.ts`) encodes, per spatial resource,
the delete-role and whether deleting it cascades — both read verbatim from
`ADD-OS.postman_collection.json`, not inferred. It is the only file that calls the
existing auth store's `isRoleGranted`. `ResourceTable.vue` splits its one "actions" column
into an always-present edit column and a separately-rendered delete column that simply
isn't added to the table's columns array when `onDelete` is absent. The seven views wire a
per-resource `canDelete` computed from `config/permissions.ts` into `:on-delete`, and the
five resources the collection marks as cascading also pass resource-specific confirm copy.
`useResourceMutations`'s existing single catch-block gets one more branch: a 403 shows a
fixed, translated "no permission" message instead of the raw backend text.

**Tech Stack:** Vue 3 + TypeScript (strict), Pinia (existing `useAuthStore`), vue-i18n,
Vitest, no new dependencies, no new store.

**Spec:** The task brief pasted into this conversation (Arabic). Verified against
`C:\Users\User\Desktop\Aleppo Digital District\ADDCore\postman\ADD-OS.postman_collection.json`
— every one of the seven spatial DELETE endpoints (lines 4134, 4341, 4549, 4757, 5017,
5272, 5480 — "Delete Branch/Building/Floor/Zone/Space/Resource/Seat-Desk") reads literally
`"Admin-only (not operations)."`; five of them (Branch/Building/Floor/Zone/Space) add
`"— cascades through every <children> under this <resource>."`; `Resource` and `Seat/Desk`
carry no cascade wording (they have no children). `users`/`roles` endpoints carry no such
annotation anywhere in the file.

## Global Constraints

- Edit only `src/add-os/**` (category A). `@/stores/auth` and `@/types/auth.d` are read
  (imported/called) but never edited — that's normal cross-layer use, not a boundary
  violation; the task itself directs using `isRoleGranted`/`role` from there.
- No invented permission. Gate delete ONLY where the collection says "Admin-only" —
  exactly the seven spatial resources. `users`/`roles` stay ungated; that silence is a
  logged open question in the closing report, not a decision made here.
- Hiding a button is UX, not enforcement — the backend is what actually blocks a 403. Say
  this in a comment on the gate itself so it doesn't get read later as a security boundary.
- `meta.roles: "all"` on the spatial routes is untouched. Operations keeps read + edit
  access to every spatial page; only the delete control is gated.
- `ResourceFormDrawer.vue`, `UsersPage.vue`, their spec files, and `icons.generated.json`
  were already modified before this task started (unrelated prior work) — this plan does
  not touch any of them, and a future commit for this task should not stage them.
  `ResourceTable.vue` and its spec ARE touched here (the task requires it) even though
  they too carried pre-existing uncommitted changes — those stay in scope.
- Every new rule ships with a test.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/add-os/config/permissions.ts` | *Create.* Per-resource delete role + cascade flag, sourced from the collection; the only call site for `isRoleGranted` in this feature. |
| `src/add-os/components/resource/ResourceTable.vue` | *Modify.* `onDelete` optional; edit and delete become two independently-rendered columns; new optional `deleteWarning` prop shown in the confirm dialog. |
| `src/add-os/composables/useResourceMutations.ts` | *Modify.* One more branch in the existing catch: 403 → fixed translated message, not the raw backend text. |
| `src/add-os/modules/spatial/views/BranchesPage.vue` | *Modify.* Gate `on-delete`; pass cascade warning (cascading). |
| `src/add-os/modules/spatial/views/BuildingsPage.vue` | *Modify.* Same (cascading). |
| `src/add-os/modules/spatial/views/FloorsPage.vue` | *Modify.* Same (cascading). |
| `src/add-os/modules/spatial/views/ZonesPage.vue` | *Modify.* Same (cascading). |
| `src/add-os/modules/spatial/views/SpacesPage.vue` | *Modify.* Same (cascading). |
| `src/add-os/modules/spatial/views/ResourcesPage.vue` | *Modify.* Gate `on-delete` only (no cascade). |
| `src/add-os/modules/spatial/views/SeatsDesksPage.vue` | *Modify.* Same (no cascade). |
| `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` | *Modify.* New `resourceCrud.mutations.permissionError` key; new `<resource>.delete.cascadeWarning` key on the five cascading resources. |
| `src/add-os/config/__tests__/permissions.spec.ts` | *Create.* Role-map/cascade-set correctness + gate behavior per role. |
| `src/add-os/components/resource/__tests__/ResourceTable.spec.ts` | *Modify.* Column split behavior, deleteWarning rendering. |
| `src/add-os/composables/__tests__/useResourceMutations.spec.ts` | *Modify.* 403 → permission message, not raw text; no refetch. |
| `src/add-os/__tests__/no-inline-role-checks.spec.ts` | *Create.* Architecture guard: no `isRoleGranted` call and no literal `role === "<role>"` comparison anywhere under `modules/**`. |

---

### Task 1: `config/permissions.ts` — single source of the delete-role map

**Files:**
- Create: `src/add-os/config/permissions.ts`
- Test: `src/add-os/config/__tests__/permissions.spec.ts`

**Interfaces:**
- Produces: `SPATIAL_RESOURCE_DELETE_ROLE: Record<SpatialResourceKey, Role>`,
  `type SpatialResourceKey = "branches"|"buildings"|"floors"|"zones"|"spaces"|"resources"|"seatsDesks"`,
  `CASCADING_SPATIAL_RESOURCES: ReadonlySet<SpatialResourceKey>`,
  `canDeleteSpatialResource(resource: SpatialResourceKey): boolean`.
- Consumes: `Role` (`@/types/auth.d`), `useAuthStore` (`@/stores/auth`).

- [ ] **Step 1: Write the failing tests**

Create `src/add-os/config/__tests__/permissions.spec.ts`:

```ts
import { describe, expect, it } from "vitest"

const state = { role: null as string | null }

vi.mock("@/stores/auth", () => ({
	useAuthStore: () => ({
		isRoleGranted: (roles?: string | string[]) => {
			if (!roles) return true
			const arr = Array.isArray(roles) ? roles : [roles]
			if (arr.includes("all")) return true
			return state.role !== null && arr.includes(state.role)
		}
	})
}))

const { canDeleteSpatialResource, CASCADING_SPATIAL_RESOURCES, SPATIAL_RESOURCE_DELETE_ROLE } = await import("../permissions")

describe("permissions", () => {
	it("maps every spatial resource to admin, per the collection's Admin-only annotation", () => {
		expect(Object.values(SPATIAL_RESOURCE_DELETE_ROLE).every(role => role === "admin")).toBe(true)
		expect(Object.keys(SPATIAL_RESOURCE_DELETE_ROLE).sort()).toEqual(
			["branches", "buildings", "floors", "resources", "seatsDesks", "spaces", "zones"]
		)
	})

	it("marks exactly branches/buildings/floors/zones/spaces as cascading, per the collection's cascade wording", () => {
		expect([...CASCADING_SPATIAL_RESOURCES].sort()).toEqual(["branches", "buildings", "floors", "spaces", "zones"])
		expect(CASCADING_SPATIAL_RESOURCES.has("resources")).toBe(false)
		expect(CASCADING_SPATIAL_RESOURCES.has("seatsDesks")).toBe(false)
	})

	it("grants delete to admin on every spatial resource", () => {
		state.role = "admin"
		for (const resource of Object.keys(SPATIAL_RESOURCE_DELETE_ROLE) as (keyof typeof SPATIAL_RESOURCE_DELETE_ROLE)[]) {
			expect(canDeleteSpatialResource(resource)).toBe(true)
		}
	})

	it("denies delete to operations on every spatial resource", () => {
		state.role = "operations"
		for (const resource of Object.keys(SPATIAL_RESOURCE_DELETE_ROLE) as (keyof typeof SPATIAL_RESOURCE_DELETE_ROLE)[]) {
			expect(canDeleteSpatialResource(resource)).toBe(false)
		}
	})

	it("denies delete when there is no role", () => {
		state.role = null
		expect(canDeleteSpatialResource("branches")).toBe(false)
	})
})
```

Note: `vi` needs importing too (`import { describe, expect, it, vi } from "vitest"`) — the
snippet above omits it from the destructure by mistake; include it in the real file.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/add-os/config/__tests__/permissions.spec.ts`
Expected: FAIL — `../permissions` does not exist yet.

- [ ] **Step 3: Implement**

Create `src/add-os/config/permissions.ts`:

```ts
import type { Role } from "@/types/auth.d"
import { useAuthStore } from "@/stores/auth"

/**
 * Single source for "which role may delete which spatial resource" — sourced
 * verbatim from each DELETE endpoint's description in
 * ADD-OS.postman_collection.json, not from inference. Every one of the seven
 * spatial resources reads literally "Admin-only (not operations)." there
 * (Delete Branch/Building/Floor/Zone/Space/Resource/Seat-Desk).
 *
 * `users` and `roles` carry NO such annotation anywhere in that collection —
 * deliberately left out of this map rather than guessed at. See the task
 * report for that silence: an open question for the backend/brand owner,
 * not resolved here.
 */
export const SPATIAL_RESOURCE_DELETE_ROLE = {
	branches: "admin",
	buildings: "admin",
	floors: "admin",
	zones: "admin",
	spaces: "admin",
	resources: "admin",
	seatsDesks: "admin"
} as const satisfies Record<string, Role>

export type SpatialResourceKey = keyof typeof SPATIAL_RESOURCE_DELETE_ROLE

/**
 * Resources whose DELETE endpoint description in the collection says the
 * deletion "cascades through" children — confirmed per-resource, not a
 * guess:
 *   branches  → Building/Floor/Zone/Space/Resource/SeatDesk/Device
 *   buildings → Floor/Zone/Space/Resource/SeatDesk
 *   floors    → Zone/Space
 *   zones     → Space
 *   spaces    → Resource/SeatDesk
 * `resources` and `seatsDesks` carry no cascade wording in the collection —
 * they have no children to cascade through.
 */
export const CASCADING_SPATIAL_RESOURCES: ReadonlySet<SpatialResourceKey> = new Set([
	"branches",
	"buildings",
	"floors",
	"zones",
	"spaces"
])

/**
 * The gate itself — routed through the EXISTING auth store's
 * `isRoleGranted`, never re-implemented. This is the only place in the
 * codebase that should call `isRoleGranted` for a delete decision; the
 * seven spatial views ask this function, not the store directly, so no
 * view carries its own role comparison (enforced by
 * no-inline-role-checks.spec.ts).
 *
 * IMPORTANT: this only decides whether to SHOW the delete control. It is
 * NOT an authorization boundary — the backend still rejects the request
 * with 403 regardless of what this returns. Do not read a `true` here as
 * "this request will succeed"; read it as "this request isn't expected to
 * be rejected," which is exactly the class of surprise this exists to
 * prevent.
 */
export function canDeleteSpatialResource(resource: SpatialResourceKey): boolean {
	return useAuthStore().isRoleGranted(SPATIAL_RESOURCE_DELETE_ROLE[resource])
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/add-os/config/__tests__/permissions.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit** *(only if the user asks — see adaptation note)*

```bash
git add src/add-os/config/permissions.ts src/add-os/config/__tests__/permissions.spec.ts
git commit -m "feat(add-os): add single-source delete-role map for spatial resources"
```

---

### Task 2: `ResourceTable.vue` — optional `onDelete`, split columns, cascade copy

**Files:**
- Modify: `src/add-os/components/resource/ResourceTable.vue`
- Test: `src/add-os/components/resource/__tests__/ResourceTable.spec.ts`

**Interfaces:**
- Produces: `defineProps<{ ...; onDelete?: (row: T) => void | Promise<void>; deleteWarning?: string }>()`
  (was `onDelete: (row: T) => void | Promise<void>`, required).
- Consumes: nothing new.

**Design note (why a column split, not a disabled button):** the brief's own test list
names "عمود الحذف" (**the delete column**) as its own thing in test #1, distinct from the
edit action — and requires that for `operations` it is "not rendered at all, not disabled."
A single combined actions column can't satisfy that AND keep edit available to
`operations` (required elsewhere in the brief — operations keeps read+edit on every
spatial page) at the same time: hiding one combined column would hide edit too. Splitting
into an always-present edit column and a separately-added delete column satisfies both:
`onDelete` absent ⇒ the array pushed to `n-data-table` simply never contains the delete
column, while the edit column is unaffected.

- [ ] **Step 1: Write the failing tests**

Append to `src/add-os/components/resource/__tests__/ResourceTable.spec.ts`, inside the
`describe("resourceTable", ...)` block (`mountTable`'s default `onDelete: vi.fn()` stays —
tests below override it to `undefined` where they need the ungated case):

```ts
	it("renders no delete button when onDelete is absent — hidden, not disabled", () => {
		const wrapper = mountTable({ onDelete: undefined })

		const deleteButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Delete")
		expect(deleteButton).toBeUndefined()

		wrapper.unmount()
	})

	it("still renders the edit button when onDelete is absent", () => {
		const wrapper = mountTable({ onDelete: undefined })

		const editButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Edit")
		expect(editButton).toBeTruthy()

		wrapper.unmount()
	})

	it("includes deleteWarning text in the confirm dialog when provided", async () => {
		const wrapper = mountTable({ deleteWarning: "This also deletes everything under it." })

		const deleteButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Delete")
		await deleteButton?.trigger("click")
		await nextTick()

		expect(document.body.textContent).toContain("This also deletes everything under it.")
		wrapper.unmount()
	})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/add-os/components/resource/__tests__/ResourceTable.spec.ts`
Expected: FAIL — `onDelete` is still required (TS) and the delete button always renders.

- [ ] **Step 3: Implement**

Replace the `<script setup>` block of `src/add-os/components/resource/ResourceTable.vue`:

```ts
import type { DataTableColumns } from "naive-ui"
import { NButton, NCard, NDataTable, useDialog } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	columns: DataTableColumns<T>
	data: T[]
	loading: boolean
	onEdit: (row: T) => void
	onDelete?: (row: T) => void | Promise<void>
	/**
	 * Extra confirm-dialog copy shown above the generic prompt — e.g. a
	 * cascading-delete warning. Resource-specific, translated by the caller;
	 * this component owns no per-resource text.
	 */
	deleteWarning?: string
	extraActions?: (row: T) => ReturnType<typeof h>[]
}>()

const { t } = useI18n()
const dialog = useDialog()

const pagination = { pageSize: 10 }

function rowKey(row: T) {
	return row.id
}

/**
 * A centered confirm dialog, not `n-popconfirm`: the popover's floating-ui
 * placement never got the RTL visual check RTL-REPORT.md §2 flagged as
 * outstanding, and it was rendering nowhere near its trigger. `useDialog()`
 * sidesteps anchored positioning entirely.
 */
function confirmDelete(row: T) {
	const onDelete = props.onDelete
	if (!onDelete) return

	dialog.warning({
		title: t("resourceCrud.table.deleteAction"),
		content: props.deleteWarning ? `${props.deleteWarning} ${t("resourceCrud.table.deleteConfirmTitle")}` : t("resourceCrud.table.deleteConfirmTitle"),
		positiveText: t("resourceCrud.table.deleteConfirmOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => onDelete(row)
	})
}

function renderEditActions(row: T) {
	const editLabel = t("resourceCrud.table.editAction")

	return h("div", { class: "flex gap-2" }, [
		h(
			NButton,
			{ text: true, type: "primary", "aria-label": editLabel, title: editLabel, onClick: () => props.onEdit(row) },
			{ icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }
		),
		...(props.extraActions?.(row) ?? [])
	])
}

function renderDeleteAction(row: T) {
	const deleteLabel = t("resourceCrud.table.deleteAction")

	return h(
		NButton,
		{ text: true, type: "error", "aria-label": deleteLabel, title: deleteLabel, onClick: () => confirmDelete(row) },
		{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
	)
}

/**
 * `onDelete` presence, not a disabled state, decides whether the delete
 * column exists at all — see the plan/task note on why a disabled button
 * is the wrong shape: it asks a question ("why can't I click this?") that
 * this layer has no answer for (the backend enforces the actual rule).
 */
const tableColumns = computed<DataTableColumns<T>>(() => {
	const columns: DataTableColumns<T> = [
		...props.columns,
		{ title: t("resourceCrud.table.actionsColumn"), key: "actions", render: renderEditActions }
	]
	if (props.onDelete) {
		columns.push({ title: "", key: "delete", render: renderDeleteAction })
	}
	return columns
})
```

(The `<template>` block is unchanged — it already just binds `:columns="tableColumns"`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/add-os/components/resource/__tests__/ResourceTable.spec.ts`
Expected: PASS, including all pre-existing tests (edit, delete-confirm flow, extraActions,
empty state, loading state, `add-ledger-table` class) unmodified.

- [ ] **Step 5: Commit** *(only on request)*

```bash
git add src/add-os/components/resource/ResourceTable.vue src/add-os/components/resource/__tests__/ResourceTable.spec.ts
git commit -m "feat(add-os): make ResourceTable's delete column optional and hide-not-disable it"
```

---

### Task 3: 403 → a permission message, from one place

**Files:**
- Modify: `src/add-os/composables/useResourceMutations.ts`
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (new
  `resourceCrud.mutations.permissionError` key)
- Test: `src/add-os/composables/__tests__/useResourceMutations.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/add-os/composables/__tests__/useResourceMutations.spec.ts`, inside
`describe("useResourceMutations", ...)`, and extend the `vue-i18n` mock at the top of the
file to also resolve the new key:

```ts
vi.mock("vue-i18n", () => ({
	useI18n: () => ({
		t: (key: string) => {
			if (key === "resourceCrud.mutations.genericError") return "Something went wrong. Please try again."
			if (key === "resourceCrud.mutations.permissionError") return "You don't have permission for this action."
			return key
		}
	})
}))
```

```ts
	it("on a 403 ApiError, toasts the fixed permission message — not the raw backend text — and does not refetch", async () => {
		const failure = new ApiError(403, JSON.stringify({ message: "This action is unauthorized." }))
		const api = { create: vi.fn(), update: vi.fn(), remove: vi.fn().mockRejectedValue(failure) }
		const refetch = vi.fn()
		const { remove } = useResourceMutations(api, refetch, MESSAGES)

		await expect(remove(1)).rejects.toBe(failure)

		expect(errorMock).toHaveBeenCalledWith("You don't have permission for this action.")
		expect(errorMock).not.toHaveBeenCalledWith("This action is unauthorized.")
		expect(refetch).not.toHaveBeenCalled()
	})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/add-os/composables/__tests__/useResourceMutations.spec.ts`
Expected: FAIL — today a 403 falls into the generic branch and toasts the raw
`caught.data?.message` ("This action is unauthorized."), not the fixed permission message.

- [ ] **Step 3: Implement**

In `src/add-os/composables/useResourceMutations.ts`, change the catch block:

```ts
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			if (caught.status === 422) throw caught
			if (caught.status === 403) {
				message.error(t("resourceCrud.mutations.permissionError"))
			} else {
				message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			}
			throw caught
		}
```

Update the doc comment above `run()` to mention the new branch:

```ts
	/**
	 * A 422 carries field-level `errors` the caller (ResourceFormDrawer) maps
	 * onto its own form — re-thrown, not toasted, so it isn't shown twice.
	 * A 403 always shows the fixed, translated permission message — never the
	 * raw backend text, which is Laravel's generic Gate-denial string, not
	 * something a user should have to parse. Everything else (5xx, network)
	 * falls back to the backend's own message or a generic one.
	 */
```

Add the key to `src/add-os/lang/en/en.json`, inside `resourceCrud.mutations`:

```json
		"mutations": {
			"genericError": "Something went wrong. Please try again.",
			"permissionError": "You don't have permission for this action."
		},
```

Add the matching key to `src/add-os/lang/ar/ar.json`, inside `resourceCrud.mutations`:

```json
		"mutations": {
			"genericError": "حدث خطأ ما. الرجاء المحاولة مجدداً.",
			"permissionError": "لا تملك صلاحية هذا الإجراء."
		},
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/add-os/composables/__tests__/useResourceMutations.spec.ts src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS — including `messages.spec.ts`'s ar/en key-parity check, which now also
covers the new key automatically.

- [ ] **Step 5: Commit** *(only on request)*

```bash
git add src/add-os/composables/useResourceMutations.ts src/add-os/composables/__tests__/useResourceMutations.spec.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): show a fixed permission message on 403, not raw backend text"
```

---

### Task 4: Cascade-delete warning copy for the five cascading resources

**Files:**
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json`
- Test: extend `src/add-os/config/__tests__/permissions.spec.ts` (created in Task 1)

**Interfaces:** none new — reuses `CASCADING_SPATIAL_RESOURCES` from Task 1 to drive the
test, and each view (Task 5) reads its own static i18n key.

- [ ] **Step 1: Write the failing test**

Append to `src/add-os/config/__tests__/permissions.spec.ts`:

```ts
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"

describe("cascade-delete warning copy", () => {
	it("every cascading resource has ar+en cascadeWarning text naming what it cascades through", () => {
		for (const resource of CASCADING_SPATIAL_RESOURCES) {
			const enBundle = en as Record<string, { delete?: { cascadeWarning?: string } }>
			const arBundle = ar as Record<string, { delete?: { cascadeWarning?: string } }>
			const enText = enBundle[resource]?.delete?.cascadeWarning
			const arText = arBundle[resource]?.delete?.cascadeWarning

			expect(enText, `${resource}.delete.cascadeWarning missing in en`).toBeTruthy()
			expect(arText, `${resource}.delete.cascadeWarning missing in ar`).toBeTruthy()
			expect(enText!.toLowerCase(), `${resource} en text should say it also deletes children`).toContain("also delete")
			expect(arText!, `${resource} ar text should say "أيضاً"`).toContain("أيضاً")
		}
	})

	it("does not add cascadeWarning to non-cascading resources", () => {
		const enBundle = en as Record<string, { delete?: { cascadeWarning?: string } }>
		expect(enBundle.resources?.delete?.cascadeWarning).toBeUndefined()
		expect(enBundle.seatsDesks?.delete?.cascadeWarning).toBeUndefined()
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/add-os/config/__tests__/permissions.spec.ts`
Expected: FAIL — none of the five `cascadeWarning` keys exist yet.

- [ ] **Step 3: Implement**

In `src/add-os/lang/en/en.json`, change each of these five `"delete"` entries:

```json
		"delete": { "success": "Branch deleted." },
```
```json
		"delete": {
			"success": "Branch deleted.",
			"cascadeWarning": "Deleting this branch also deletes every building, floor, zone, space, resource, and seat/desk under it."
		},
```

```json
		"delete": { "success": "Building deleted." },
```
```json
		"delete": {
			"success": "Building deleted.",
			"cascadeWarning": "Deleting this building also deletes every floor, zone, space, resource, and seat/desk under it."
		},
```

```json
		"delete": { "success": "Floor deleted." },
```
```json
		"delete": {
			"success": "Floor deleted.",
			"cascadeWarning": "Deleting this floor also deletes every zone and space under it."
		},
```

```json
		"delete": { "success": "Zone deleted." },
```
```json
		"delete": {
			"success": "Zone deleted.",
			"cascadeWarning": "Deleting this zone also deletes every space under it."
		},
```

```json
		"delete": { "success": "Space deleted." },
```
```json
		"delete": {
			"success": "Space deleted.",
			"cascadeWarning": "Deleting this space also deletes every resource and seat/desk under it."
		},
```

In `src/add-os/lang/ar/ar.json`, the matching five:

```json
		"delete": { "success": "تم حذف الفرع." },
```
```json
		"delete": {
			"success": "تم حذف الفرع.",
			"cascadeWarning": "حذف هذا الفرع يحذف أيضاً كل مبنى وطابق ومنطقة ومساحة ومورد ومقعد/طاولة تحته."
		},
```

```json
		"delete": { "success": "تم حذف المبنى." },
```
```json
		"delete": {
			"success": "تم حذف المبنى.",
			"cascadeWarning": "حذف هذا المبنى يحذف أيضاً كل طابق ومنطقة ومساحة ومورد ومقعد/طاولة تحته."
		},
```

```json
		"delete": { "success": "تم حذف الطابق." },
```
```json
		"delete": {
			"success": "تم حذف الطابق.",
			"cascadeWarning": "حذف هذا الطابق يحذف أيضاً كل منطقة ومساحة تحته."
		},
```

```json
		"delete": { "success": "تم حذف المنطقة." },
```
```json
		"delete": {
			"success": "تم حذف المنطقة.",
			"cascadeWarning": "حذف هذه المنطقة يحذف أيضاً كل مساحة تحتها."
		},
```

```json
		"delete": { "success": "تم حذف المساحة." },
```
```json
		"delete": {
			"success": "تم حذف المساحة.",
			"cascadeWarning": "حذف هذه المساحة يحذف أيضاً كل مورد ومقعد/طاولة تحتها."
		},
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/add-os/config/__tests__/permissions.spec.ts src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit** *(only on request)*

```bash
git add src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json src/add-os/config/__tests__/permissions.spec.ts
git commit -m "feat(add-os): add cascading-delete warning copy for branches/buildings/floors/zones/spaces"
```

---

### Task 5: Wire the gate + cascade copy into the seven spatial views

**Files:**
- Modify: `BranchesPage.vue`, `BuildingsPage.vue`, `FloorsPage.vue`, `ZonesPage.vue`,
  `SpacesPage.vue`, `ResourcesPage.vue`, `SeatsDesksPage.vue` (all under
  `src/add-os/modules/spatial/views/`)

**Interfaces:**
- Consumes: `canDeleteSpatialResource` from `@/add-os/config/permissions` (Task 1).

No new test file — this task's behavior is covered by Task 1 (the gate decision),
Task 2 (the column split), and Task 6's architecture guard (no view reimplements the
check). Task 6 below also re-runs every pre-existing test to prove nothing broke.

- [ ] **Step 1: BranchesPage.vue**

Add the import (alongside the existing ones, alphabetically among the `@/add-os/...`
group):

```ts
import { canDeleteSpatialResource } from "@/add-os/config/permissions"
```

Add after the `columns` line:

```ts
const canDelete = computed(() => canDeleteSpatialResource("branches"))
```

Change the `<ResourceTable>` line to:

```html
<ResourceTable
	:columns
	:data
	:loading="isLoading"
	:on-edit="openEdit"
	:on-delete="canDelete ? (async row => { await mutations.remove(row.id) }) : undefined"
	:delete-warning="t('branches.delete.cascadeWarning')"
/>
```

- [ ] **Step 2: BuildingsPage.vue** — same shape, resource key `"buildings"`,
  `t('buildings.delete.cascadeWarning')`.

- [ ] **Step 3: FloorsPage.vue** — same shape, resource key `"floors"`,
  `t('floors.delete.cascadeWarning')`.

- [ ] **Step 4: ZonesPage.vue** — same shape, resource key `"zones"`,
  `t('zones.delete.cascadeWarning')`.

- [ ] **Step 5: SpacesPage.vue** — same shape, resource key `"spaces"`,
  `t('spaces.delete.cascadeWarning')`. Keep the existing `:extra-actions="renderStatusAction"`
  attribute on the same element.

- [ ] **Step 6: ResourcesPage.vue** — resource key `"resources"`; **no** `delete-warning`
  prop (not a cascading resource). Keep `:extra-actions="renderStatusAction"`.

- [ ] **Step 7: SeatsDesksPage.vue** — resource key `"seatsDesks"`; **no** `delete-warning`
  prop.

- [ ] **Step 8: Run every existing test to verify nothing broke**

Run: `npx vitest run`
Expected: PASS, including `UsersPage.spec.ts` and every other pre-existing suite, unchanged.
(There are no pre-existing spec files for the seven spatial view components themselves —
confirmed by a repo search before writing this plan — so there is nothing page-level to
keep green beyond compiling and the composable/component tests above.)

- [ ] **Step 9: Commit** *(only on request)*

```bash
git add src/add-os/modules/spatial/views/BranchesPage.vue src/add-os/modules/spatial/views/BuildingsPage.vue src/add-os/modules/spatial/views/FloorsPage.vue src/add-os/modules/spatial/views/ZonesPage.vue src/add-os/modules/spatial/views/SpacesPage.vue src/add-os/modules/spatial/views/ResourcesPage.vue src/add-os/modules/spatial/views/SeatsDesksPage.vue
git commit -m "feat(add-os): gate delete on the seven spatial tables by role"
```

---

### Task 6: Architecture guard — no inline role checks in `modules/**`

**Files:**
- Create: `src/add-os/__tests__/no-inline-role-checks.spec.ts`

Modeled on the existing `no-runtime-theming.spec.ts` guard's `walk()`/style.

- [ ] **Step 1: Write the guard (it should pass immediately — Task 5's code already
  routes everything through `config/permissions.ts`; this locks that in)**

```ts
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * ADD OS — destroy-gating stays in one place.
 *
 * config/permissions.ts is the only file allowed to call `isRoleGranted` or
 * compare a role against a literal for a delete decision. If a future view
 * reimplements the check inline, this fails loudly instead of quietly
 * drifting from the collection-sourced role map.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..")
const MODULES_DIR = path.join(ROOT, "src", "add-os", "modules")

const TEXT_EXT = /\.(?:ts|tsx|vue)$/i

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			walk(full, out)
		} else if (TEXT_EXT.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

const files = walk(MODULES_DIR)

describe("destroy gating — no inline role checks under modules/**", () => {
	it("scans a non-empty surface", () => {
		expect(files.length).toBeGreaterThan(10)
	})

	it("never calls isRoleGranted directly — only config/permissions.ts may", () => {
		const offenders = files.filter(f => readFileSync(f, "utf8").includes("isRoleGranted"))
		expect(offenders.map(f => path.relative(ROOT, f))).toEqual([])
	})

	it("never compares a role against a role literal directly", () => {
		const pattern =
			/\b(?:role|userRole)\b(?:\.value)?\s*(?:===|!==)\s*["'`](?:admin|operations|moderator|all)["'`]|["'`](?:admin|operations|moderator|all)["'`]\s*(?:===|!==)\s*\b(?:role|userRole)\b(?:\.value)?/
		const offenders = files.filter(f => pattern.test(readFileSync(f, "utf8")))
		expect(offenders.map(f => path.relative(ROOT, f))).toEqual([])
	})
})
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/add-os/__tests__/no-inline-role-checks.spec.ts`
Expected: PASS immediately (it's a guard on already-correct code from Task 5, not new
behavior) — confirm this, since a guard that can't fail is worthless: temporarily add
`if (role === "admin")` to a scratch line in one spatial view, re-run to see it fail, then
remove the scratch line.

- [ ] **Step 3: Commit** *(only on request)*

```bash
git add src/add-os/__tests__/no-inline-role-checks.spec.ts
git commit -m "test(add-os): guard that destroy-gating stays in config/permissions.ts"
```

---

### Task 7: Full verification + closing report

- [ ] **Step 1:** `npx vitest run` (full suite, includes all guards) — PASS.
- [ ] **Step 2:** `npx vue-tsc --build --force` — clean.
- [ ] **Step 3:** `npx eslint src/add-os --fix` (touched files at minimum) — clean.
- [ ] **Step 4:** `git status --porcelain` — confirm every changed/new path is under
  `src/add-os/**`, and that `ResourceFormDrawer.vue`, `UsersPage.vue`, their spec files,
  and `icons.generated.json` are unchanged by this task (their pre-existing diffs, if any,
  are untouched, not added to).
- [ ] **Step 5:** Write the closing report: what the collection states verbatim (role +
  cascade wording, per resource), where it's silent (`users`, `roles` — logged as an open
  question, not resolved), and what was deferred (nothing new anticipated, but call out
  anything found while implementing).

## Self-Review (completed while writing this plan)

1. **Spec coverage:** single role-source (Task 1) — done; store-routed gate, no new store
   (Task 1) — done; `ResourceTable.vue` optional `onDelete` + hidden-not-disabled (Task 2)
   — done; seven views wired, no duplicated role logic (Task 5) — done; cascade warning
   copy ar+en (Task 4) — done; 403 handling in one place (Task 3) — done; router untouched
   (no task touches `navigation/routes.ts`) — confirmed by omission; architecture guard
   (Task 6) — done; existing-test survival (Task 5 Step 8, Task 7 Step 1) — done.
2. **Placeholder scan:** none — every step has real code.
3. **Type consistency:** `SpatialResourceKey` defined once in Task 1, used identically in
   Task 5's `canDeleteSpatialResource(resource)` calls; `deleteWarning` prop name matches
   between Task 2's component and Task 5's template bindings; `CASCADING_SPATIAL_RESOURCES`
   defined in Task 1, consumed in Task 4's test — no renaming drift.
