# Generic Resource CRUD Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable CRUD layer (API client factory, data composables, generic table, generic form drawer) under `src/add-os/`, then apply it to all 7 spatial-hierarchy resources (Branch → Building → Floor → Zone → Space → Resource → SeatDesk) as its proof-of-concept.

**Architecture:** A `resource-factory.ts` wraps the existing fetch-based `services/api.ts` to produce `list/getById/create/update/remove` for any resource from one base endpoint. Two composables (`useResourceList`, `useResourceMutations`) sit on top for state/loading/toasts. Two generic Vue components (`ResourceTable`, `ResourceFormDrawer`) render any resource from a declarative column/field config — including cascading parent-selects via a `dependsOn`/`optionsFrom`/`virtual` mechanism on `FieldDescriptor`. Each of the 7 resources then only needs a types file, a 5-line service file, a config file (columns + fields), a thin view, and i18n — no new page-specific logic.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript (strict), Naive UI, Tailwind v4, vue-i18n, Vitest + `@vue/test-utils`. No new dependencies (no axios, no vue-query, no zod/vee-validate).

**Spec:** `docs/superpowers/specs/2026-08-13-generic-resource-crud-design.md`

## Global Constraints

- **No new npm dependency.** Everything is built on `fetch` (`services/api.ts`), plain Vue `ref`s, and native Naive UI `FormRules` — all already in the project (spec §2).
- **Vendor `src/**` outside `src/add-os` is never edited.** Every file this plan touches or creates is under `src/add-os/**` (root `CLAUDE.md` file-ownership table).
- **Every user-visible string goes through vue-i18n, in both `ar` and `en`.** No literal strings in templates. `src/add-os/lang/__tests__/messages.spec.ts` fails the build if a key exists in one language and not the other, is blank, or leaks the wrong script — so every i18n step in this plan adds the *same* keys to both `src/add-os/lang/en/en.json` and `src/add-os/lang/ar/ar.json` in the same step, with real (non-placeholder) translations in both.
- **All numbers render through `src/add-os/utils/format/`** (`formatNumber`/`formatCurrency`) — never raw template interpolation of a numeric column.
- **TypeScript strict, no `any`.**
- **Naive UI components first; Tailwind utilities for layout.** No new custom CSS files.
- **State colour is never the sole channel** (`.claude/rules/tokens-and-color.md`): every status render is an icon + text label + bordered tag, never a bare colour or a plain string.
- **`update()` never returns the updated entity for these 7 resources** — every mutation refetches the list instead of merging a response body (spec §1, §7).
- Run `pnpm test:unit` (Vitest — **note:** root `CLAUDE.md` says `pnpm test`, but `package.json` has no such script; the real one is `test:unit`) after every task. Run `pnpm lint` and `pnpm type-check` before the final task's full-suite pass.

---

## File Structure

```
src/add-os/
├── services/
│   ├── api.ts                        MODIFY — 401 handling (Task 1)
│   ├── resource-factory.ts           NEW (Task 2)
│   ├── branches.ts                   NEW (Task 8)
│   ├── buildings.ts                  NEW (Task 9)
│   ├── floors.ts                     NEW (Task 10)
│   ├── zones.ts                      NEW (Task 11)
│   ├── spaces.ts                     NEW (Task 12)
│   ├── resources.ts                  NEW (Task 13)
│   ├── seats-desks.ts                NEW (Task 14)
│   └── __tests__/
│       ├── api.spec.ts               MODIFY (Task 1)
│       ├── resource-factory.spec.ts  NEW (Task 2)
│       ├── branches.spec.ts          NEW (Task 8)
│       ├── buildings.spec.ts         NEW (Task 9)
│       ├── floors.spec.ts            NEW (Task 10)
│       ├── zones.spec.ts             NEW (Task 11)
│       ├── spaces.spec.ts            NEW (Task 12)
│       ├── resources.spec.ts         NEW (Task 13)
│       └── seats-desks.spec.ts       NEW (Task 14)
├── composables/                      NEW folder
│   ├── useResourceList.ts            NEW (Task 4)
│   ├── useResourceMutations.ts       NEW (Task 5)
│   └── __tests__/
│       ├── useResourceList.spec.ts       NEW (Task 4)
│       └── useResourceMutations.spec.ts  NEW (Task 5)
├── components/resource/              NEW folder
│   ├── field-types.ts                NEW (Task 3)
│   ├── ResourceTable.vue             NEW (Task 6) — MODIFY (Task 12: `extraActions` prop)
│   ├── ResourceFormDrawer.vue        NEW (Task 7)
│   └── __tests__/
│       ├── field-types.spec.ts           NEW (Task 3)
│       ├── ResourceTable.spec.ts         NEW (Task 6) — MODIFY (Task 12: `extraActions` test)
│       └── ResourceFormDrawer.spec.ts    NEW (Task 7)
└── modules/spatial/                  NEW module
    ├── types/
    │   ├── operational-status.ts     NEW (Task 12)
    │   ├── branch.ts                 NEW (Task 8)
    │   ├── building.ts               NEW (Task 9)
    │   ├── floor.ts                  NEW (Task 10)
    │   ├── zone.ts                   NEW (Task 11)
    │   ├── space.ts                  NEW (Task 12)
    │   ├── resource.ts               NEW (Task 13)
    │   └── seat-desk.ts              NEW (Task 14)
    ├── config/
    │   ├── branches.config.ts        NEW (Task 8)
    │   ├── buildings.config.ts       NEW (Task 9)
    │   ├── floors.config.ts          NEW (Task 10)
    │   ├── zones.config.ts           NEW (Task 11)
    │   ├── spaces.config.ts          NEW (Task 12)
    │   ├── resources.config.ts       NEW (Task 13)
    │   └── seats-desks.config.ts     NEW (Task 14)
    └── views/
        ├── BranchesPage.vue          NEW (Task 8)
        ├── BuildingsPage.vue         NEW (Task 9)
        ├── FloorsPage.vue            NEW (Task 10)
        ├── ZonesPage.vue             NEW (Task 11)
        ├── SpacesPage.vue            NEW (Task 12)
        ├── ResourcesPage.vue         NEW (Task 13)
        └── SeatsDesksPage.vue        NEW (Task 14)

src/add-os/navigation/sections.ts     MODIFY — 4 new pages (Tasks 10, 11, 13, 14)
src/add-os/navigation/routes.ts       MODIFY — 7 PAGE_COMPONENTS entries (Tasks 8-14)
src/add-os/lang/en/en.json            MODIFY — every task with user-visible text
src/add-os/lang/ar/ar.json            MODIFY — every task with user-visible text
```

**Naming note carried from the spec:** the backend's `App\Domain\Foundation\Models\Resource` shares a name with the generic REST term this plan uses everywhere (`createResourceApi<T>`, `ResourceTable`, `FieldDescriptor<TModel>`). To avoid exactly that collision on the frontend, the Task 13 TypeScript **type** is named `SpaceResource`, not `Resource` — file/service/URL naming (`resources.ts`, `/api/v1/admin/resources`, `listResources`) stays as-is since that's unambiguous once scoped to its own file.

---

## Task 1: `api.ts` — centralize 401 handling

**Files:**
- Modify: `src/add-os/services/api.ts`
- Test: `src/add-os/services/__tests__/api.spec.ts` (existing file, add a new `describe` block)

**Interfaces:**
- Consumes: `useAuthStore` from `@/stores/auth` (existing `setLogout()` action), `router` default export from `@/router` (existing singleton).
- Produces: `request<T>()` now redirects to `/login` on any 401 — every later service call inherits this for free; no other task calls it directly.

- [ ] **Step 1: Write the failing test**

Add to `src/add-os/services/__tests__/api.spec.ts` (new imports go at the top alongside the existing ones):

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { get } from "../api"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const setLogoutMock = vi.fn()
const pushMock = vi.fn()

vi.mock("@/stores/auth", () => ({
	useAuthStore: () => ({ setLogout: setLogoutMock })
}))

vi.mock("@/router", () => ({
	default: { push: pushMock }
}))

describe("401 handling", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
		setLogoutMock.mockClear()
		pushMock.mockClear()
	})

	it("logs out and redirects to /login on a 401, before throwing", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ message: "Unauthenticated." }), {
				status: 401,
				headers: { "content-type": "application/json" }
			})
		)

		await expect(get("/api/v1/admin/branches")).rejects.toMatchObject({ status: 401 })

		expect(setLogoutMock).toHaveBeenCalledOnce()
		expect(pushMock).toHaveBeenCalledWith("/login")
	})

	it("does not log out on a non-401 error", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ message: "Forbidden." }), {
				status: 403,
				headers: { "content-type": "application/json" }
			})
		)

		await expect(get("/api/v1/admin/branches")).rejects.toMatchObject({ status: 403 })

		expect(setLogoutMock).not.toHaveBeenCalled()
		expect(pushMock).not.toHaveBeenCalled()
	})
})
```

This file already has a top-level `vi.mock("@/add-os/config/env", ...)` from the existing `patch` tests — when adding the block above, reuse that single mock declaration rather than duplicating it; only the two new mocks (`@/stores/auth`, `@/router`) and the new `describe` block are actually new.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/api.spec.ts`
Expected: FAIL — `setLogoutMock`/`pushMock` are never called, because `request<T>()` doesn't check for 401 yet.

- [ ] **Step 3: Write minimal implementation**

In `src/add-os/services/api.ts`, add two imports at the top and one branch inside `request<T>()`:

```ts
import router from "@/router"
import { useAuthStore } from "@/stores/auth"
```

Change the `if (!res.ok)` branch from:

```ts
	if (!res.ok) {
		throw new ApiError(res.status, text || res.statusText)
	}
```

to:

```ts
	if (!res.ok) {
		if (res.status === 401) {
			useAuthStore().setLogout()
			router.push("/login")
		}
		throw new ApiError(res.status, text || res.statusText)
	}
```

`useAuthStore()` is called fresh inside the branch (not hoisted to module scope) because Pinia's active instance isn't guaranteed to exist yet at module-eval time — this matches how every other consumer of the store (e.g. `initSession()` in `auth.ts`) calls it inside a function body, never at the top of a module.

**Note on the import cycle this introduces:** `api.ts` importing `@/stores/auth` closes a cycle (`api.ts` → `stores/auth.ts` → `services/auth.ts` → `api.ts`, since `stores/auth.ts` already imports `getMe` from `services/auth.ts`, which itself calls `get()` from `api.ts`). This is safe here because `router`/`useAuthStore` are only ever dereferenced *inside* `request()`'s function body — never read at module top level — so by the time either is actually called, every module in the cycle has long finished its initial evaluation. No `import/no-cycle` (or equivalent) lint rule is configured in this project's `eslint.config.mjs`, so this doesn't trip anything today; it's noted here in case a future lint rule or a stricter bundler setting ever flags it, so the reason isn't re-derived from scratch.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/api.spec.ts`
Expected: PASS, and every pre-existing test in this file still passes (they don't hit the new branch since none of them return a 401).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/services/api.ts src/add-os/services/__tests__/api.spec.ts
git commit -m "feat(add-os): log out and redirect to /login on any 401 API response"
```

---

## Task 2: `resource-factory.ts`

**Files:**
- Create: `src/add-os/services/resource-factory.ts`
- Test: `src/add-os/services/__tests__/resource-factory.spec.ts`

**Interfaces:**
- Consumes: `get`, `post`, `put`, `del` from `./api` (existing, unchanged signatures).
- Produces: `createResourceApi<T, CreatePayload = Partial<T>, UpdatePayload = Partial<T>>(baseEndpoint: string): { list, getById, create, update, remove }` — every resource service in Tasks 8-14 calls this and re-exports (some or all of) its return value.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/services/__tests__/resource-factory.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createResourceApi } from "../resource-factory"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

interface Widget {
	id: number
	label: string
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("createResourceApi", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	const api = createResourceApi<Widget>("/api/v1/admin/widgets")

	it("list() GETs the base endpoint and unwraps { data }", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [{ id: 1, label: "A" }] }))

		const widgets = await api.list()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/widgets", expect.objectContaining({ method: "GET" }))
		expect(widgets).toEqual([{ id: 1, label: "A" }])
	})

	it("list(query) appends the query string", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [] }))

		await api.list({ parent_id: 5 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/widgets?parent_id=5",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("getById() GETs the item endpoint and unwraps { data }", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { id: 1, label: "A" } }))

		const widget = await api.getById(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/widgets/1", expect.objectContaining({ method: "GET" }))
		expect(widget).toEqual({ id: 1, label: "A" })
	})

	it("create() POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { id: 2, label: "B" } }, 201))

		const widget = await api.create({ label: "B" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/widgets",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ label: "B" }) })
		)
		expect(widget).toEqual({ id: 2, label: "B" })
	})

	it("update() PUTs the payload and returns the message body as-is (no resource merge)", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const result = await api.update(1, { label: "B2" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/widgets/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify({ label: "B2" }) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("remove() DELETEs the item endpoint", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await api.remove(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/widgets/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/resource-factory.spec.ts`
Expected: FAIL with "Failed to resolve import ../resource-factory" (the module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/add-os/services/resource-factory.ts
import { del, get, post, put } from "./api"

interface MessageResponse {
	message?: string
}

/**
 * One factory for the five verbs every admin resource in this codebase exposes
 * identically. `update()` returns the raw `{message}` body, never the entity —
 * every one of these 7 endpoints returns a message-only body on update, so a
 * caller that wants the new state must refetch (see useResourceMutations).
 */
export function createResourceApi<T, CreatePayload = Partial<T>, UpdatePayload = Partial<T>>(baseEndpoint: string) {
	return {
		list: (query?: Record<string, unknown>) => get<{ data: T[] }>(baseEndpoint, query).then(r => r.data),
		getById: (id: number) => get<{ data: T }>(`${baseEndpoint}/${id}`).then(r => r.data),
		create: (payload: CreatePayload) => post<{ data: T }>(baseEndpoint, payload).then(r => r.data),
		update: (id: number, payload: UpdatePayload) => put<MessageResponse>(`${baseEndpoint}/${id}`, payload),
		remove: (id: number) => del<MessageResponse>(`${baseEndpoint}/${id}`)
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/resource-factory.spec.ts`
Expected: PASS, all 6 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/services/resource-factory.ts src/add-os/services/__tests__/resource-factory.spec.ts
git commit -m "feat(add-os): add createResourceApi factory for the generic CRUD layer"
```

---

## Task 3: `field-types.ts` — `FieldDescriptor`, `buildPayload`, `pickLocalized`

**Files:**
- Create: `src/add-os/components/resource/field-types.ts`
- Test: `src/add-os/components/resource/__tests__/field-types.spec.ts`

**Interfaces:**
- Consumes: `FormItemRule`, `SelectOption` types from `naive-ui`; `SupportedLocale` from `@/add-os/lang/locales`.
- Produces:
  - `interface FieldDescriptor<TModel = Record<string, unknown>>` — consumed by `ResourceFormDrawer` (Task 7) and every resource's `config/*.config.ts` (Tasks 8-14).
  - `buildPayload<TModel>(fields: FieldDescriptor<TModel>[], model: TModel): Record<string, unknown>` — strips `virtual` fields before a submit; consumed by `ResourceFormDrawer`.
  - `pickLocalized(value: { ar: string; en: string }, locale: SupportedLocale): string` — consumed by `ResourceTable` column renderers for every bilingual field (Branch/Building `name`, Branch `city`).

- [ ] **Step 1: Write the failing test**

```ts
import type { FieldDescriptor } from "../field-types"

// src/add-os/components/resource/__tests__/field-types.spec.ts
import { describe, expect, it } from "vitest"
import { buildPayload, pickLocalized } from "../field-types"

interface Widget {
	branch_id: number
	building_id: number
	label: string
}

describe("buildPayload", () => {
	const fields: FieldDescriptor<Widget>[] = [
		{ key: "branch_id", labelKey: "x.branch", type: "select", virtual: true },
		{ key: "building_id", labelKey: "x.building", type: "select" },
		{ key: "label", labelKey: "x.label", type: "text" }
	]

	it("drops virtual fields from the submitted payload", () => {
		const model: Widget = { branch_id: 1, building_id: 2, label: "A" }

		expect(buildPayload(fields, model)).toEqual({ building_id: 2, label: "A" })
	})

	it("includes every non-virtual field even when its value is falsy", () => {
		const fieldsWithSwitch: FieldDescriptor<{ is_active: boolean }>[] = [
			{ key: "is_active", labelKey: "x.active", type: "switch" }
		]

		expect(buildPayload(fieldsWithSwitch, { is_active: false })).toEqual({ is_active: false })
	})
})

describe("pickLocalized", () => {
	it("returns the Arabic half for the ar locale", () => {
		expect(pickLocalized({ ar: "الفرع الرئيسي", en: "Main Branch" }, "ar")).toBe("الفرع الرئيسي")
	})

	it("returns the English half for the en locale", () => {
		expect(pickLocalized({ ar: "الفرع الرئيسي", en: "Main Branch" }, "en")).toBe("Main Branch")
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/components/resource/__tests__/field-types.spec.ts`
Expected: FAIL with "Failed to resolve import ../field-types".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/add-os/components/resource/field-types.ts
import type { FormItemRule, SelectOption } from "naive-ui"
import type { SupportedLocale } from "@/add-os/lang/locales"

export type FieldType = "text" | "bilingual-text" | "number" | "select" | "switch"

export interface Bilingual {
	ar: string
	en: string
}

/**
 * Declares one field of a resource's create/edit form. `ResourceFormDrawer`
 * (components/resource/ResourceFormDrawer.vue) renders every field type and
 * drives the `dependsOn`/`optionsFrom` cascade generically — nothing
 * resource-specific lives in the drawer itself.
 */
export interface FieldDescriptor<TModel = Record<string, unknown>> {
	key: keyof TModel & string
	/** i18n key; the drawer calls t() itself, so config files hold keys, never resolved strings. */
	labelKey: string
	type: FieldType
	required?: boolean
	rule?: FormItemRule | FormItemRule[]
	/** select-only, static options. */
	options?: SelectOption[]
	/** One or more other fields' keys this one depends on — e.g. a Space's `space_id` narrows on both `building_id` and the optional `zone_id`. */
	dependsOn?: string | string[]
	/**
	 * select-only, dynamic options. Re-invoked whenever any `dependsOn` key's value
	 * changes. `parentValues` is keyed by each `dependsOn` key (single key ⇒ one
	 * entry); `model` is passed too so a field can read further context beyond its
	 * declared dependencies without widening `dependsOn` for every caller.
	 */
	optionsFrom?: (parentValues: Record<string, unknown>, model: TModel) => Promise<SelectOption[]> | SelectOption[]
	/**
	 * Participates in the form/dependency graph (can be a `dependsOn` target,
	 * can gate other fields via `optionsFrom`) but is excluded from the
	 * payload a submit sends — used for UI-only ancestor-narrowing steps that
	 * aren't themselves part of any resource's actual payload shape (e.g. a
	 * "branch" dropdown shown only to narrow a Floor form's "building" options;
	 * Floor's real payload never contains a branch_id).
	 */
	virtual?: boolean
	disabledWhen?: (model: TModel) => boolean
}

/** Strips every `virtual` field so a submit payload matches the resource's real API shape. */
export function buildPayload<TModel extends Record<string, unknown>>(
	fields: FieldDescriptor<TModel>[],
	model: TModel
): Record<string, unknown> {
	const payload: Record<string, unknown> = {}
	for (const field of fields) {
		if (field.virtual) continue
		payload[field.key] = model[field.key]
	}
	return payload
}

/** Reads the half of a `{ar, en}` field matching the active locale — used by table column renderers. */
export function pickLocalized(value: Bilingual, locale: SupportedLocale): string {
	return value[locale]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/components/resource/__tests__/field-types.spec.ts`
Expected: PASS, all 4 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/components/resource/field-types.ts src/add-os/components/resource/__tests__/field-types.spec.ts
git commit -m "feat(add-os): add FieldDescriptor contract for the generic resource form"
```

---

## Task 4: `useResourceList`

**Files:**
- Create: `src/add-os/composables/useResourceList.ts`
- Test: `src/add-os/composables/__tests__/useResourceList.spec.ts`

**Interfaces:**
- Consumes: `ApiError` from `@/add-os/services/api`.
- Produces: `useResourceList<T>(list: (query?: Record<string, unknown>) => Promise<T[]>, query?: Ref<Record<string, unknown> | undefined>): { data: Ref<T[]>, isLoading: Ref<boolean>, error: Ref<ApiError | null>, refetch: () => Promise<void> }` — consumed by every resource view (Tasks 8-14) and by `useResourceMutations` (Task 5, as the `refetch` it calls after a mutation).

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/composables/__tests__/useResourceList.spec.ts
import { describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"

import { ApiError } from "@/add-os/services/api"
import { useResourceList } from "../useResourceList"

describe("useResourceList", () => {
	it("fetches on creation and exposes the result", async () => {
		const list = vi.fn().mockResolvedValue([{ id: 1 }])

		const { data, isLoading, error } = useResourceList(list)

		expect(isLoading.value).toBe(true)
		await nextTick()
		await nextTick()

		expect(list).toHaveBeenCalledTimes(1)
		expect(data.value).toEqual([{ id: 1 }])
		expect(isLoading.value).toBe(false)
		expect(error.value).toBeNull()
	})

	it("re-runs list() when refetch() is called", async () => {
		const list = vi.fn().mockResolvedValue([{ id: 1 }])
		const { refetch } = useResourceList(list)
		await nextTick()

		await refetch()

		expect(list).toHaveBeenCalledTimes(2)
	})

	it("re-runs list() when the query ref changes", async () => {
		const list = vi.fn().mockResolvedValue([])
		const query = ref<Record<string, unknown> | undefined>({ branch_id: 1 })
		useResourceList(list, query)
		await nextTick()

		query.value = { branch_id: 2 }
		await nextTick()
		await nextTick()

		expect(list).toHaveBeenCalledTimes(2)
		expect(list).toHaveBeenLastCalledWith({ branch_id: 2 })
	})

	it("captures an ApiError instead of throwing, and leaves data empty", async () => {
		const failure = new ApiError(403, JSON.stringify({ message: "Forbidden." }))
		const list = vi.fn().mockRejectedValue(failure)

		const { data, error, isLoading } = useResourceList(list)
		await nextTick()
		await nextTick()

		expect(data.value).toEqual([])
		expect(error.value).toBe(failure)
		expect(isLoading.value).toBe(false)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/composables/__tests__/useResourceList.spec.ts`
Expected: FAIL with "Failed to resolve import ../useResourceList".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/add-os/composables/useResourceList.ts
import type { Ref } from "vue"
import { ref, watch } from "vue"
import { ApiError } from "@/add-os/services/api"

export function useResourceList<T>(
	list: (query?: Record<string, unknown>) => Promise<T[]>,
	query?: Ref<Record<string, unknown> | undefined>
) {
	const data = ref<T[]>([]) as Ref<T[]>
	const isLoading = ref(true)
	const error = ref<ApiError | null>(null)

	async function refetch() {
		isLoading.value = true
		error.value = null
		try {
			data.value = await list(query?.value)
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			error.value = caught
			data.value = []
		} finally {
			isLoading.value = false
		}
	}

	if (query) {
		watch(query, refetch, { immediate: true })
	} else {
		refetch()
	}

	return { data, isLoading, error, refetch }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/composables/__tests__/useResourceList.spec.ts`
Expected: PASS, all 4 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/composables/useResourceList.ts src/add-os/composables/__tests__/useResourceList.spec.ts
git commit -m "feat(add-os): add useResourceList composable"
```

---

## Task 5: `useResourceMutations`

**Files:**
- Create: `src/add-os/composables/useResourceMutations.ts`
- Test: `src/add-os/composables/__tests__/useResourceMutations.spec.ts`
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (new shared `resourceCrud.mutations.genericError` key — every other string in this composable is passed in by the caller, already resolved via `t()`, so this is the only literal this task's code owns)

**Interfaces:**
- Consumes: `ApiError` from `@/add-os/services/api`; `useMessage` from `naive-ui`; `refetch: () => Promise<void>` (the exact shape `useResourceList` produces, Task 4).
- Produces: `useResourceMutations<T, CreatePayload, UpdatePayload>(api: {create, update, remove}, refetch: () => Promise<void>, messages: {createSuccess: string, updateSuccess: string, deleteSuccess: string}): { create, update, remove, isSubmitting: Ref<boolean> }` — consumed by every resource view (Tasks 8-14) and by `ResourceFormDrawer` (Task 7, which reads the thrown `ApiError` for 422 field-mapping).

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/composables/__tests__/useResourceMutations.spec.ts
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/add-os/services/api"
import { useResourceMutations } from "../useResourceMutations"

const successMock = vi.fn()
const errorMock = vi.fn()

vi.mock("naive-ui", () => ({
	useMessage: () => ({ success: successMock, error: errorMock })
}))

vi.mock("vue-i18n", () => ({
	useI18n: () => ({ t: (key: string) => (key === "resourceCrud.mutations.genericError" ? "Something went wrong. Please try again." : key) })
}))

const MESSAGES = { createSuccess: "Created.", updateSuccess: "Updated.", deleteSuccess: "Deleted." }

describe("useResourceMutations", () => {
	it("create() calls the api, toasts success, and refetches", async () => {
		const api = { create: vi.fn().mockResolvedValue({ id: 1 }), update: vi.fn(), remove: vi.fn() }
		const refetch = vi.fn().mockResolvedValue(undefined)
		const { create, isSubmitting } = useResourceMutations(api, refetch, MESSAGES)

		const promise = create({ label: "A" })
		expect(isSubmitting.value).toBe(true)
		await promise

		expect(api.create).toHaveBeenCalledWith({ label: "A" })
		expect(refetch).toHaveBeenCalledOnce()
		expect(successMock).toHaveBeenCalledWith("Created.")
		expect(isSubmitting.value).toBe(false)
	})

	it("update() calls the api, toasts success, and refetches (never merges the response)", async () => {
		const api = { create: vi.fn(), update: vi.fn().mockResolvedValue({ message: "Updated." }), remove: vi.fn() }
		const refetch = vi.fn().mockResolvedValue(undefined)
		const { update } = useResourceMutations(api, refetch, MESSAGES)

		await update(1, { label: "B" })

		expect(api.update).toHaveBeenCalledWith(1, { label: "B" })
		expect(refetch).toHaveBeenCalledOnce()
		expect(successMock).toHaveBeenCalledWith("Updated.")
	})

	it("remove() calls the api, toasts success, and refetches", async () => {
		const api = { create: vi.fn(), update: vi.fn(), remove: vi.fn().mockResolvedValue({ message: "Deleted." }) }
		const refetch = vi.fn().mockResolvedValue(undefined)
		const { remove } = useResourceMutations(api, refetch, MESSAGES)

		await remove(1)

		expect(api.remove).toHaveBeenCalledWith(1)
		expect(refetch).toHaveBeenCalledOnce()
		expect(successMock).toHaveBeenCalledWith("Deleted.")
	})

	it("on a non-422 ApiError, toasts the server message and does not refetch", async () => {
		const failure = new ApiError(403, JSON.stringify({ message: "This action is unauthorized." }))
		const api = { create: vi.fn().mockRejectedValue(failure), update: vi.fn(), remove: vi.fn() }
		const refetch = vi.fn()
		const { create } = useResourceMutations(api, refetch, MESSAGES)

		await create({ label: "A" })

		expect(errorMock).toHaveBeenCalledWith("This action is unauthorized.")
		expect(refetch).not.toHaveBeenCalled()
	})

	it("on a non-422 ApiError with no server message, toasts the generic fallback", async () => {
		const failure = new ApiError(500, "")
		const api = { create: vi.fn().mockRejectedValue(failure), update: vi.fn(), remove: vi.fn() }
		const { create } = useResourceMutations(api, vi.fn(), MESSAGES)

		await create({ label: "A" })

		expect(errorMock).toHaveBeenCalledWith("Something went wrong. Please try again.")
	})

	it("on a 422 ApiError, re-throws it (for the drawer to map onto form fields) without toasting", async () => {
		const failure = new ApiError(
			422,
			JSON.stringify({ message: "The given data was invalid.", errors: { label: ["Required."] } })
		)
		const api = { create: vi.fn().mockRejectedValue(failure), update: vi.fn(), remove: vi.fn() }
		const { create } = useResourceMutations(api, vi.fn(), MESSAGES)

		await expect(create({ label: "" })).rejects.toBe(failure)
		expect(errorMock).not.toHaveBeenCalled()
	})

	it("resets isSubmitting after a failure", async () => {
		const failure = new ApiError(500, "")
		const api = { create: vi.fn().mockRejectedValue(failure), update: vi.fn(), remove: vi.fn() }
		const { create, isSubmitting } = useResourceMutations(api, vi.fn(), MESSAGES)

		await create({ label: "A" })

		expect(isSubmitting.value).toBe(false)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/composables/__tests__/useResourceMutations.spec.ts`
Expected: FAIL with "Failed to resolve import ../useResourceMutations".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/add-os/composables/useResourceMutations.ts
import { useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"

interface MutationMessages {
	createSuccess: string
	updateSuccess: string
	deleteSuccess: string
}

export function useResourceMutations<T, CreatePayload, UpdatePayload>(
	api: {
		create: (payload: CreatePayload) => Promise<T>
		update: (id: number, payload: UpdatePayload) => Promise<{ message?: string }>
		remove: (id: number) => Promise<{ message?: string }>
	},
	refetch: () => Promise<void>,
	messages: MutationMessages
) {
	const message = useMessage()
	const { t } = useI18n()
	const isSubmitting = ref(false)

	/**
	 * A 422 carries field-level `errors` the caller (ResourceFormDrawer) maps
	 * onto its own form — re-thrown, not toasted, so it isn't shown twice.
	 * Everything else (403, 5xx, network) is this composable's job to surface,
	 * since it's the layer that actually runs inside a component's Naive UI
	 * context (api.ts, one layer down, cannot call useMessage() at all).
	 */
	async function run<R>(action: () => Promise<R>, successMessage: string): Promise<R> {
		isSubmitting.value = true
		try {
			const result = await action()
			message.success(successMessage)
			await refetch()
			return result
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			if (caught.status === 422) throw caught
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			throw caught
		} finally {
			isSubmitting.value = false
		}
	}

	return {
		create: (payload: CreatePayload) => run(() => api.create(payload), messages.createSuccess),
		update: (id: number, payload: UpdatePayload) => run(() => api.update(id, payload), messages.updateSuccess),
		remove: (id: number) => run(() => api.remove(id), messages.deleteSuccess),
		isSubmitting
	}
}
```

Note the test for "does not refetch" on failure and "re-throws" both rely on `run()` re-throwing after handling — `ResourceFormDrawer` (Task 7) is expected to catch that re-thrown error itself (it already awaits `create()`/`update()` inside a try/catch to keep the drawer open on failure); a resource view's own call sites (Tasks 8-14) don't need their own try/catch around these calls for that reason.

Add to `src/add-os/lang/en/en.json` (a new top-level `resourceCrud` key — Task 6 also adds to this same key, under its own `table` sub-key; this task's `mutations` sub-key is a sibling of it):

```json
	"resourceCrud": {
		"mutations": {
			"genericError": "Something went wrong. Please try again."
		}
	},
```

Add to `src/add-os/lang/ar/ar.json` at the equivalent position:

```json
	"resourceCrud": {
		"mutations": {
			"genericError": "حدث خطأ ما. الرجاء المحاولة مجدداً."
		}
	},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/composables/__tests__/useResourceMutations.spec.ts`
Expected: PASS, all 7 assertions.

- [ ] **Step 5: Run the full i18n parity guard**

Run: `pnpm vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/composables/useResourceMutations.ts src/add-os/composables/__tests__/useResourceMutations.spec.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add useResourceMutations composable"
```

---

## Task 6: `ResourceTable.vue`

**Files:**
- Create: `src/add-os/components/resource/ResourceTable.vue`
- Test: `src/add-os/components/resource/__tests__/ResourceTable.spec.ts`
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (adds a `table` sub-key inside the `resourceCrud` object Task 5 created — a sibling of `resourceCrud.mutations`, not a new top-level key)

**Interfaces:**
- Consumes: nothing new beyond `naive-ui`/`vue-i18n`.
- Produces: `<ResourceTable :columns :data :loading :on-edit :on-delete />` — a generic component (`<script setup generic="T extends { id: number }">`) consumed by every resource view (Tasks 8-14). Also establishes the `resourceCrud.table.*` i18n namespace that those views rely on for column/empty/action text — they add no table-chrome keys of their own.

Naive UI's `n-data-table` (checked directly against the installed version, `node_modules/naive-ui/es/data-table`) has **no `#empty` slot and no exported `NEmpty` component** in this version — the empty state below is a plain conditional `<div>`, not a slot override.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/components/resource/__tests__/ResourceTable.spec.ts
import type { DataTableColumns } from "naive-ui"
import { mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import ResourceTable from "../ResourceTable.vue"

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			resourceCrud: {
				table: {
					actionsColumn: "Actions",
					empty: "No records found.",
					editAction: "Edit",
					deleteAction: "Delete",
					deleteConfirmTitle: "Delete this record?",
					deleteConfirmOk: "Delete",
					deleteConfirmCancel: "Cancel"
				}
			}
		}
	}
})

interface Row {
	id: number
	label: string
}

const columns: DataTableColumns<Row> = [{ title: "Label", key: "label" }]

function mountTable(overrides: Record<string, unknown> = {}) {
	return mount(ResourceTable, {
		props: {
			columns,
			data: [{ id: 1, label: "Row A" }],
			loading: false,
			onEdit: vi.fn(),
			onDelete: vi.fn(),
			...overrides
		},
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

describe("ResourceTable", () => {
	it("renders the provided columns and rows, plus a generic actions column", () => {
		const wrapper = mountTable()

		expect(wrapper.text()).toContain("Row A")
		expect(wrapper.text()).toContain("Actions")

		wrapper.unmount()
	})

	it("shows the localized empty state when there are no rows and it isn't loading", () => {
		const wrapper = mountTable({ data: [] })

		expect(wrapper.text()).toContain("No records found.")

		wrapper.unmount()
	})

	it("does not show the empty state while loading, even with no rows", () => {
		const wrapper = mountTable({ data: [], loading: true })

		expect(wrapper.text()).not.toContain("No records found.")

		wrapper.unmount()
	})

	it("calls onEdit with the row when the edit action is clicked", async () => {
		const onEdit = vi.fn()
		const wrapper = mountTable({ onEdit })

		const editButton = wrapper.findAll("button").find(button => button.text().includes("Edit"))
		await editButton?.trigger("click")

		expect(onEdit).toHaveBeenCalledWith({ id: 1, label: "Row A" })
		wrapper.unmount()
	})

	it("does not call onDelete directly — deletion requires confirmation first", async () => {
		const onDelete = vi.fn()
		const wrapper = mountTable({ onDelete })

		const deleteButton = wrapper.findAll("button").find(button => button.text().includes("Delete"))
		await deleteButton?.trigger("click")

		expect(onDelete).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/components/resource/__tests__/ResourceTable.spec.ts`
Expected: FAIL with "Failed to resolve import ../ResourceTable.vue".

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- src/add-os/components/resource/ResourceTable.vue -->
<template>
	<div class="flex flex-col gap-3">
		<n-data-table v-if="data.length > 0 || loading" :columns="tableColumns" :data :loading :pagination :bordered="false" :row-key />
		<div v-else class="py-10 text-center">{{ t("resourceCrud.table.empty") }}</div>
	</div>
</template>

<script setup lang="ts" generic="T extends { id: number }">
import type { DataTableColumns } from "naive-ui"
import { NButton, NDataTable, NPopconfirm } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"

const props = defineProps<{
	columns: DataTableColumns<T>
	data: T[]
	loading: boolean
	onEdit: (row: T) => void
	onDelete: (row: T) => void | Promise<void>
}>()

const { t } = useI18n()

const pagination = { pageSize: 10 }

function rowKey(row: T) {
	return row.id
}

function renderActions(row: T) {
	return h("div", { class: "flex gap-2" }, [
		h(NButton, { text: true, type: "primary", onClick: () => props.onEdit(row) }, { default: () => t("resourceCrud.table.editAction") }),
		h(
			NPopconfirm,
			{
				positiveText: t("resourceCrud.table.deleteConfirmOk"),
				negativeText: t("resourceCrud.table.deleteConfirmCancel"),
				onPositiveClick: () => props.onDelete(row)
			},
			{
				trigger: () => h(NButton, { text: true, type: "error" }, { default: () => t("resourceCrud.table.deleteAction") }),
				default: () => t("resourceCrud.table.deleteConfirmTitle")
			}
		)
	])
}

const tableColumns = computed<DataTableColumns<T>>(() => [...props.columns, { title: t("resourceCrud.table.actionsColumn"), key: "actions", render: renderActions }])
</script>
```

Add a `table` sub-key inside the existing `resourceCrud` object in `src/add-os/lang/en/en.json` (as a sibling of the `mutations` key Task 5 added):

```json
		"table": {
			"actionsColumn": "Actions",
			"empty": "No records found.",
			"editAction": "Edit",
			"deleteAction": "Delete",
			"deleteConfirmTitle": "Delete this record?",
			"deleteConfirmOk": "Delete",
			"deleteConfirmCancel": "Cancel"
		},
```

Add the equivalent `table` sub-key inside `resourceCrud` in `src/add-os/lang/ar/ar.json`:

```json
		"table": {
			"actionsColumn": "إجراءات",
			"empty": "لا توجد سجلات.",
			"editAction": "تعديل",
			"deleteAction": "حذف",
			"deleteConfirmTitle": "حذف هذا العنصر؟",
			"deleteConfirmOk": "حذف",
			"deleteConfirmCancel": "إلغاء"
		},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/components/resource/__tests__/ResourceTable.spec.ts`
Expected: PASS, all 5 assertions.

- [ ] **Step 5: Run the full i18n parity guard**

Run: `pnpm vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS — confirms the new `resourceCrud.*` keys were added identically (same key set, no blanks, correct script) to both files.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/components/resource/ResourceTable.vue src/add-os/components/resource/__tests__/ResourceTable.spec.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add generic ResourceTable component"
```

---

## Task 7: `ResourceFormDrawer.vue`

**Files:**
- Create: `src/add-os/components/resource/ResourceFormDrawer.vue`
- Test: `src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts`
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (adds `form` and `validation` sub-keys inside the existing `resourceCrud` object, siblings of `mutations` and `table`)

**Interfaces:**
- Consumes: `FieldDescriptor`, `buildPayload`, `Bilingual` from `./field-types` (Task 3); `ApiError` from `@/add-os/services/api`.
- Produces: `<ResourceFormDrawer v-model:show v-model:model :fields :mode :title :submitting :on-submit />` — consumed by every resource view (Tasks 8-14). `onSubmit: (payload: Record<string, unknown>) => Promise<void>` is what the view wires to `useResourceMutations().create`/`.update` (Task 5) — the drawer never imports a service directly.

- [ ] **Step 1: Write the failing test**

```ts
import type { FieldDescriptor } from "../field-types"
// src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts
import { mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import { createI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import ResourceFormDrawer from "../ResourceFormDrawer.vue"

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel", arabicPlaceholder: "Arabic", englishPlaceholder: "English" },
				validation: { required: "{field} is required." }
			},
			x: { region: "Region", city: "City", label: "Label" }
		}
	}
})

interface Model {
	region: string | null
	city: string | null
	label: string
}

function mountDrawer(fields: FieldDescriptor<Model>[], model: Model, onSubmit = vi.fn().mockResolvedValue(undefined)) {
	return mount(ResourceFormDrawer, {
		props: {
			fields,
			mode: "create",
			title: "New thing",
			submitting: false,
			onSubmit,
			show: true,
			"onUpdate:show": () => {},
			model,
			"onUpdate:model": () => {}
		},
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

describe("ResourceFormDrawer", () => {
	it("renders a label for every field", () => {
		const fields: FieldDescriptor<Model>[] = [
			{ key: "region", labelKey: "x.region", type: "text" },
			{ key: "label", labelKey: "x.label", type: "text" }
		]
		const wrapper = mountDrawer(fields, { region: null, city: null, label: "" })

		expect(wrapper.text()).toContain("Region")
		expect(wrapper.text()).toContain("Label")
		wrapper.unmount()
	})

	it("submits buildPayload(fields, model) — virtual fields excluded", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const fields: FieldDescriptor<Model>[] = [
			{ key: "region", labelKey: "x.region", type: "text", virtual: true },
			{ key: "label", labelKey: "x.label", type: "text", required: true }
		]
		const wrapper = mountDrawer(fields, { region: "north", city: null, label: "A" }, onSubmit)

		await wrapper.vm.handleSubmit()

		expect(onSubmit).toHaveBeenCalledWith({ label: "A" })
		wrapper.unmount()
	})

	it("re-invokes optionsFrom when a dependsOn field changes, and drops an invalid child value", async () => {
		const optionsFrom = vi.fn((parents: Record<string, unknown>) =>
			parents.region === "north" ? [{ label: "Aleppo", value: "aleppo" }] : [{ label: "Damascus", value: "damascus" }]
		)
		const fields: FieldDescriptor<Model>[] = [
			{ key: "region", labelKey: "x.region", type: "select", virtual: true, options: [{ label: "North", value: "north" }, { label: "South", value: "south" }] },
			{ key: "city", labelKey: "x.city", type: "select", dependsOn: "region", optionsFrom },
			{ key: "label", labelKey: "x.label", type: "text" }
		]
		const model: Model = { region: "north", city: "aleppo", label: "" }
		const wrapper = mountDrawer(fields, model)
		await nextTick()

		expect(optionsFrom).toHaveBeenCalledWith({ region: "north" }, model)
		expect(wrapper.vm.dynamicOptions.city).toEqual([{ label: "Aleppo", value: "aleppo" }])

		model.region = "south"
		await nextTick()

		expect(wrapper.vm.dynamicOptions.city).toEqual([{ label: "Damascus", value: "damascus" }])
		expect(model.city).toBeNull() // "aleppo" isn't a valid Damascus-region city, so it's cleared

		wrapper.unmount()
	})

	it("maps a 422 response's field errors, without closing the drawer", async () => {
		const failure = new ApiError(422, JSON.stringify({ message: "Invalid.", errors: { label: ["Required."] } }))
		const onSubmit = vi.fn().mockRejectedValue(failure)
		const updateShow = vi.fn()
		const fields: FieldDescriptor<Model>[] = [{ key: "label", labelKey: "x.label", type: "text", required: true }]
		const wrapper = mount(ResourceFormDrawer, {
			props: {
				fields,
				mode: "create",
				title: "New thing",
				submitting: false,
				onSubmit,
				show: true,
				"onUpdate:show": updateShow,
				model: { region: null, city: null, label: "" },
				"onUpdate:model": () => {}
			},
			global: { plugins: [i18n] },
			attachTo: document.body
		})

		await wrapper.vm.handleSubmit()

		expect(wrapper.vm.fieldErrors).toEqual({ label: ["Required."] })
		expect(updateShow).not.toHaveBeenCalledWith(false)
		wrapper.unmount()
	})
})
```

`wrapper.vm.handleSubmit`/`.dynamicOptions`/`.fieldErrors` rely on `defineExpose` in the component (Step 3) — the internal cascade/validation/error-mapping logic is exactly what this generic component exists to get right once, so it's tested directly rather than only through simulated clicks.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts`
Expected: FAIL with "Failed to resolve import ../ResourceFormDrawer.vue".

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- src/add-os/components/resource/ResourceFormDrawer.vue -->
<template>
	<n-drawer v-model:show="show" :width="420">
		<n-drawer-content :title closable>
			<n-form ref="formRef" :model :rules label-placement="top">
				<n-form-item
					v-for="field in fields"
					:key="field.key"
					:path="field.key"
					:label="t(field.labelKey)"
					:feedback="fieldErrors[field.key]?.[0]"
					:validation-status="fieldErrors[field.key] ? 'error' : undefined"
				>
					<n-input v-if="field.type === 'text'" v-model:value="(model as Record<string, unknown>)[field.key] as string" />
					<div v-else-if="field.type === 'bilingual-text'" class="flex w-full gap-2">
						<n-input
							v-model:value="((model as Record<string, unknown>)[field.key] as Bilingual).ar"
							:placeholder="t('resourceCrud.form.arabicPlaceholder')"
						/>
						<n-input
							v-model:value="((model as Record<string, unknown>)[field.key] as Bilingual).en"
							:placeholder="t('resourceCrud.form.englishPlaceholder')"
						/>
					</div>
					<n-input-number
						v-else-if="field.type === 'number'"
						v-model:value="(model as Record<string, unknown>)[field.key] as number | null"
						class="w-full"
					/>
					<n-select
						v-else-if="field.type === 'select'"
						v-model:value="(model as Record<string, unknown>)[field.key]"
						:options="field.options ?? dynamicOptions[field.key] ?? []"
						:disabled="field.disabledWhen?.(model) ?? false"
						clearable
					/>
					<n-switch v-else-if="field.type === 'switch'" v-model:value="(model as Record<string, unknown>)[field.key] as boolean" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="show = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="submitting" @click="handleSubmit">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-drawer-content>
	</n-drawer>
</template>

<script setup lang="ts" generic="TModel extends Record<string, unknown>">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { Bilingual, FieldDescriptor } from "./field-types"
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch } from "naive-ui"
import { computed, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { buildPayload } from "./field-types"

const props = defineProps<{
	fields: FieldDescriptor<TModel>[]
	mode: "create" | "edit"
	title: string
	submitting: boolean
	onSubmit: (payload: Record<string, unknown>) => Promise<void>
}>()

const show = defineModel<boolean>("show", { required: true })
const model = defineModel<TModel>("model", { required: true })

const { t } = useI18n()

const formRef = ref<FormInst | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})
const dynamicOptions = reactive<Record<string, SelectOption[]>>({})

function dependsOnKeys(field: FieldDescriptor<TModel>): string[] {
	if (!field.dependsOn) return []
	return Array.isArray(field.dependsOn) ? field.dependsOn : [field.dependsOn]
}

for (const field of props.fields) {
	const keys = dependsOnKeys(field)
	if (keys.length === 0 || !field.optionsFrom) continue

	watch(
		keys.map(key => () => (model.value as Record<string, unknown>)[key]),
		async values => {
			const parentValues = Object.fromEntries(keys.map((key, i) => [key, values[i]]))
			const options = await field.optionsFrom!(parentValues, model.value)
			dynamicOptions[field.key] = options

			const current = (model.value as Record<string, unknown>)[field.key]
			if (current !== null && current !== undefined && !options.some(option => option.value === current)) {
				;(model.value as Record<string, unknown>)[field.key] = null
			}
		},
		{ immediate: true }
	)
}

const rules = computed<FormRules>(() => {
	const result: FormRules = {}
	for (const field of props.fields) {
		if (field.rule) {
			result[field.key] = field.rule
		} else if (field.required) {
			result[field.key] = {
				required: true,
				message: t("resourceCrud.validation.required", { field: t(field.labelKey) }),
				trigger: ["blur", "change", "input"]
			}
		}
	}
	return result
})

async function handleSubmit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	fieldErrors.value = {}
	try {
		await props.onSubmit(buildPayload(props.fields, model.value))
		show.value = false
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 422 && caught.data?.errors) {
			fieldErrors.value = caught.data.errors
		}
	}
}

defineExpose({ handleSubmit, fieldErrors, dynamicOptions })
</script>
```

Add to `src/add-os/lang/en/en.json`, inside the existing `resourceCrud` key (siblings of `mutations` and `table`):

```json
		"form": {
			"submit": "Save",
			"cancel": "Cancel",
			"arabicPlaceholder": "Arabic",
			"englishPlaceholder": "English"
		},
		"validation": {
			"required": "{field} is required."
		},
```

Add to `src/add-os/lang/ar/ar.json`, at the equivalent position:

```json
		"form": {
			"submit": "حفظ",
			"cancel": "إلغاء",
			"arabicPlaceholder": "العربية",
			"englishPlaceholder": "الإنجليزية"
		},
		"validation": {
			"required": "{field} مطلوب."
		},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts`
Expected: PASS, all 4 assertions.

- [ ] **Step 5: Run the full i18n parity guard**

Run: `pnpm vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/components/resource/ResourceFormDrawer.vue src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add generic ResourceFormDrawer with cascading select support"
```

---

## Task 8: Branch (first resource — no parent)

**Files:**
- Create: `src/add-os/modules/spatial/types/branch.ts`
- Create: `src/add-os/services/branches.ts`
- Test: `src/add-os/services/__tests__/branches.spec.ts`
- Create: `src/add-os/modules/spatial/config/branches.config.ts`
- Create: `src/add-os/modules/spatial/views/BranchesPage.vue`
- Modify: `src/add-os/navigation/routes.ts` (`spatial.branches` → `BranchesPage`)
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (new `branches` namespace)

**Interfaces:**
- Consumes: `createResourceApi` (Task 2), `useResourceList`/`useResourceMutations` (Tasks 4-5), `ResourceTable`/`ResourceFormDrawer`/`FieldDescriptor`/`pickLocalized` (Tasks 3, 6-7).
- Produces: `Branch`, `BranchPayload` types — consumed by Task 9 (`Building.branch_id`'s options come from `listBranches()`).

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/services/__tests__/branches.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createBranch, getBranch, listBranches, removeBranch, updateBranch } from "../branches"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleBranch = {
	id: 1,
	name: { ar: "الفرع الرئيسي", en: "Main Branch" },
	city: { ar: "حلب", en: "Aleppo" },
	timezone: "Asia/Damascus",
	is_active: true
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("branches service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listBranches GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleBranch] }))

		const branches = await listBranches()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/branches", expect.objectContaining({ method: "GET" }))
		expect(branches).toEqual([sampleBranch])
	})

	it("createBranch POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleBranch }, 201))

		const payload = { name: sampleBranch.name, city: sampleBranch.city, timezone: sampleBranch.timezone, is_active: true }
		const branch = await createBranch(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/branches",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(branch).toEqual(sampleBranch)
	})

	it("getBranch GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleBranch }))

		const branch = await getBranch(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/branches/1", expect.objectContaining({ method: "GET" }))
		expect(branch).toEqual(sampleBranch)
	})

	it("updateBranch PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { name: sampleBranch.name, city: sampleBranch.city, timezone: "Asia/Riyadh", is_active: true }
		const result = await updateBranch(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/branches/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeBranch DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeBranch(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/branches/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/branches.spec.ts`
Expected: FAIL with "Failed to resolve import ../branches".

- [ ] **Step 3: Write the types and service**

```ts
// src/add-os/modules/spatial/types/branch.ts
export interface Branch {
	id: number
	name: { ar: string; en: string }
	city: { ar: string; en: string }
	timezone: string
	is_active: boolean
}

/** Create and update share this exact shape — confirmed identical in the Postman collection. */
export interface BranchPayload {
	name: { ar: string; en: string }
	city: { ar: string; en: string }
	timezone: string
	is_active: boolean
}
```

```ts
// src/add-os/services/branches.ts
import type { Branch, BranchPayload } from "@/add-os/modules/spatial/types/branch"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Branch, BranchPayload, BranchPayload>("/api/v1/admin/branches")

export const listBranches = () => api.list()
export const getBranch = api.getById
export const createBranch = api.create
export const updateBranch = api.update
export const removeBranch = api.remove
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/branches.spec.ts`
Expected: PASS, all 5 assertions.

- [ ] **Step 5: Write the config**

```ts
// src/add-os/modules/spatial/config/branches.config.ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch, BranchPayload } from "@/add-os/modules/spatial/types/branch"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

export function buildBranchColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<Branch> {
	return [
		{ title: t("branches.columns.name"), key: "name", render: row => pickLocalized(row.name, locale) },
		{ title: t("branches.columns.city"), key: "city", render: row => pickLocalized(row.city, locale) },
		{ title: t("branches.columns.timezone"), key: "timezone" },
		{
			title: t("branches.columns.isActive"),
			key: "is_active",
			render: row =>
				h(
					NTag,
					{ type: row.is_active ? "success" : "error", round: true, bordered: true },
					{
						default: () => [
							h(Icon, { name: row.is_active ? STATUS_ICONS.success : STATUS_ICONS.danger, size: 14 }),
							` ${t(row.is_active ? "branches.isActiveYes" : "branches.isActiveNo")}`
						]
					}
				)
		}
	]
}

export const branchFields: FieldDescriptor<BranchPayload>[] = [
	{ key: "name", labelKey: "branches.form.name", type: "bilingual-text", required: true },
	{ key: "city", labelKey: "branches.form.city", type: "bilingual-text", required: true },
	{ key: "timezone", labelKey: "branches.form.timezone", type: "text", required: true },
	{ key: "is_active", labelKey: "branches.form.isActive", type: "switch" }
]

export function emptyBranchPayload(): BranchPayload {
	return { name: { ar: "", en: "" }, city: { ar: "", en: "" }, timezone: "Asia/Damascus", is_active: true }
}
```

- [ ] **Step 6: Write the view**

```vue
<!-- src/add-os/modules/spatial/views/BranchesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.branches") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('branches.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("branches.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="row => mutations.remove(row.id)" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields="branchFields"
			:mode
			:title="mode === 'create' ? t('branches.create.title') : t('branches.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch, BranchPayload } from "@/add-os/modules/spatial/types/branch"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { branchFields, buildBranchColumns, emptyBranchPayload } from "@/add-os/modules/spatial/config/branches.config"
import { createBranch, listBranches, removeBranch, updateBranch } from "@/add-os/services/branches"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Branch>(listBranches)
const columns = computed(() => buildBranchColumns(t, currentLocale.value))

const mutations = useResourceMutations({ create: createBranch, update: updateBranch, remove: removeBranch }, refetch, {
	createSuccess: t("branches.create.success"),
	updateSuccess: t("branches.edit.success"),
	deleteSuccess: t("branches.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<BranchPayload>(emptyBranchPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyBranchPayload()
	drawerVisible.value = true
}

function openEdit(row: Branch) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = { name: { ...row.name }, city: { ...row.city }, timezone: row.timezone, is_active: row.is_active }
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as BranchPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as BranchPayload)
	}
}
</script>
```

- [ ] **Step 7: Wire into routing**

In `src/add-os/navigation/routes.ts`, add the import and the `PAGE_COMPONENTS` entry:

```ts
import BranchesPage from "@/add-os/modules/spatial/views/BranchesPage.vue"
```

```ts
const PAGE_COMPONENTS: Record<string, unknown> = {
	"system.roles": RolesPage,
	"system.users": UsersPage,
	"spatial.branches": BranchesPage
}
```

`sections.ts` already has `{ key: "branches", path: "branches" }` under the `spatial` section — no change needed there for this resource.

- [ ] **Step 8: Add i18n**

Add to `src/add-os/lang/en/en.json`, alongside the existing `users` key:

```json
	"branches": {
		"columns": { "name": "Name", "city": "City", "timezone": "Timezone", "isActive": "Active" },
		"isActiveYes": "Active",
		"isActiveNo": "Inactive",
		"create": { "button": "New branch", "title": "New branch", "success": "Branch created." },
		"edit": { "title": "Edit branch", "success": "Branch updated." },
		"delete": { "success": "Branch deleted." },
		"form": { "name": "Name", "city": "City", "timezone": "Timezone", "isActive": "Active" },
		"loadError": "Couldn't load branches. You may not have permission to view this page."
	},
```

Add to `src/add-os/lang/ar/ar.json` at the equivalent position:

```json
	"branches": {
		"columns": { "name": "الاسم", "city": "المدينة", "timezone": "المنطقة الزمنية", "isActive": "نشط" },
		"isActiveYes": "نشط",
		"isActiveNo": "غير نشط",
		"create": { "button": "فرع جديد", "title": "فرع جديد", "success": "تم إنشاء الفرع." },
		"edit": { "title": "تعديل الفرع", "success": "تم تحديث الفرع." },
		"delete": { "success": "تم حذف الفرع." },
		"form": { "name": "الاسم", "city": "المدينة", "timezone": "المنطقة الزمنية", "isActive": "نشط" },
		"loadError": "تعذّر تحميل الفروع. قد لا تملك صلاحية عرض هذه الصفحة."
	},
```

- [ ] **Step 9: Run the full i18n parity guard**

Run: `pnpm vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 10: Run the full test suite and type-check**

Run: `pnpm vitest run && pnpm type-check`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/add-os/modules/spatial/types/branch.ts src/add-os/services/branches.ts src/add-os/services/__tests__/branches.spec.ts src/add-os/modules/spatial/config/branches.config.ts src/add-os/modules/spatial/views/BranchesPage.vue src/add-os/navigation/routes.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add Branches CRUD screen"
```

---

## Task 9: Building (FK: `branch_id`)

**Files:**
- Create: `src/add-os/modules/spatial/types/building.ts`
- Create: `src/add-os/services/buildings.ts`
- Test: `src/add-os/services/__tests__/buildings.spec.ts`
- Create: `src/add-os/modules/spatial/config/buildings.config.ts`
- Create: `src/add-os/modules/spatial/views/BuildingsPage.vue`
- Modify: `src/add-os/navigation/routes.ts` (`spatial.buildings` → `BuildingsPage`)
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (new `buildings` namespace)

**Interfaces:**
- Consumes: `listBranches` (Task 8), `formatNumber` (`@/add-os/utils/format`, existing).
- Produces: `Building`, `BuildingPayload` — consumed by Task 10 (Floor's `building_id` options come from `listBuildings()`).

This is the first resource with an actual FK select — unlike Branch, its form needs `branch_id` populated from the already-loaded branches list, but doesn't need the `virtual`/`dependsOn` cascade machinery yet (that starts at Floor, Task 10, which needs an intermediate "branch" narrowing step). Building's field config is a **function of the loaded branches**, not a static array, so `buildBuildingFields` takes the branches list as a parameter and the view wraps the call in a `computed()`.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/services/__tests__/buildings.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createBuilding, getBuilding, listBuildings, removeBuilding, updateBuilding } from "../buildings"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleBuilding = { id: 1, branch_id: 1, name: { ar: "المبنى أ", en: "Building A" }, floor_count: 5 }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("buildings service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listBuildings GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleBuilding] }))

		const buildings = await listBuildings()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/buildings", expect.objectContaining({ method: "GET" }))
		expect(buildings).toEqual([sampleBuilding])
	})

	it("listBuildings(branchId) appends ?branch_id=", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleBuilding] }))

		await listBuildings(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/buildings?branch_id=1",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createBuilding POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleBuilding }, 201))

		const payload = { branch_id: 1, name: sampleBuilding.name, floor_count: 5 }
		const building = await createBuilding(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/buildings",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(building).toEqual(sampleBuilding)
	})

	it("getBuilding GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleBuilding }))

		const building = await getBuilding(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/buildings/1", expect.objectContaining({ method: "GET" }))
		expect(building).toEqual(sampleBuilding)
	})

	it("updateBuilding PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { branch_id: 1, name: sampleBuilding.name, floor_count: 6 }
		const result = await updateBuilding(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/buildings/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeBuilding DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeBuilding(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/buildings/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/buildings.spec.ts`
Expected: FAIL with "Failed to resolve import ../buildings".

- [ ] **Step 3: Write the types and service**

```ts
// src/add-os/modules/spatial/types/building.ts
export interface Building {
	id: number
	branch_id: number
	name: { ar: string; en: string }
	floor_count: number
}

export interface BuildingPayload {
	branch_id: number
	name: { ar: string; en: string }
	floor_count: number
}
```

```ts
// src/add-os/services/buildings.ts
import type { Building, BuildingPayload } from "@/add-os/modules/spatial/types/building"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Building, BuildingPayload, BuildingPayload>("/api/v1/admin/buildings")

export const listBuildings = (branchId?: number) => api.list(branchId ? { branch_id: branchId } : undefined)
export const getBuilding = api.getById
export const createBuilding = api.create
export const updateBuilding = api.update
export const removeBuilding = api.remove
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/buildings.spec.ts`
Expected: PASS, all 6 assertions.

- [ ] **Step 5: Write the config**

```ts
// src/add-os/modules/spatial/config/buildings.config.ts
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building, BuildingPayload } from "@/add-os/modules/spatial/types/building"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { formatNumber } from "@/add-os/utils/format"

export function buildBuildingColumns(
	t: ComposerTranslation,
	locale: SupportedLocale,
	branchesById: Record<number, Branch>
): DataTableColumns<Building> {
	return [
		{
			title: t("buildings.columns.branch"),
			key: "branch_id",
			render: row => (branchesById[row.branch_id] ? pickLocalized(branchesById[row.branch_id].name, locale) : row.branch_id)
		},
		{ title: t("buildings.columns.name"), key: "name", render: row => pickLocalized(row.name, locale) },
		{ title: t("buildings.columns.floorCount"), key: "floor_count", render: row => formatNumber(row.floor_count) }
	]
}

export function buildBuildingFields(branches: Branch[], locale: SupportedLocale): FieldDescriptor<BuildingPayload>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		{ key: "branch_id", labelKey: "buildings.form.branch", type: "select", required: true, options: branchOptions },
		{ key: "name", labelKey: "buildings.form.name", type: "bilingual-text", required: true },
		{ key: "floor_count", labelKey: "buildings.form.floorCount", type: "number", required: true }
	]
}

export function emptyBuildingPayload(): BuildingPayload {
	return { branch_id: 0, name: { ar: "", en: "" }, floor_count: 1 }
}
```

`branch_id: 0` is a deliberate "nothing selected yet" sentinel — `n-select` shows its placeholder for `0` just as it would for `null` here since `0` never appears in `branchOptions` (branch ids start at 1), and the `required` rule on the field still fails validation until a real branch is chosen.

- [ ] **Step 6: Write the view**

```vue
<!-- src/add-os/modules/spatial/views/BuildingsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.buildings") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('buildings.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("buildings.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="row => mutations.remove(row.id)" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:mode
			:title="mode === 'create' ? t('buildings.create.title') : t('buildings.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building, BuildingPayload } from "@/add-os/modules/spatial/types/building"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildBuildingColumns, buildBuildingFields, emptyBuildingPayload } from "@/add-os/modules/spatial/config/buildings.config"
import { listBranches } from "@/add-os/services/branches"
import { createBuilding, listBuildings, removeBuilding, updateBuilding } from "@/add-os/services/buildings"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data: branches } = useResourceList<Branch>(listBranches)
const branchesById = computed(() => Object.fromEntries(branches.value.map(branch => [branch.id, branch])))

const { data, isLoading, error, refetch } = useResourceList<Building>(() => listBuildings())
const columns = computed(() => buildBuildingColumns(t, currentLocale.value, branchesById.value))
const fields = computed(() => buildBuildingFields(branches.value, currentLocale.value))

const mutations = useResourceMutations({ create: createBuilding, update: updateBuilding, remove: removeBuilding }, refetch, {
	createSuccess: t("buildings.create.success"),
	updateSuccess: t("buildings.edit.success"),
	deleteSuccess: t("buildings.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<BuildingPayload>(emptyBuildingPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyBuildingPayload()
	drawerVisible.value = true
}

function openEdit(row: Building) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = { branch_id: row.branch_id, name: { ...row.name }, floor_count: row.floor_count }
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as BuildingPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as BuildingPayload)
	}
}
</script>
```

- [ ] **Step 7: Wire into routing**

In `src/add-os/navigation/routes.ts`:

```ts
import BuildingsPage from "@/add-os/modules/spatial/views/BuildingsPage.vue"
```

```ts
const PAGE_COMPONENTS: Record<string, unknown> = {
	"system.roles": RolesPage,
	"system.users": UsersPage,
	"spatial.branches": BranchesPage,
	"spatial.buildings": BuildingsPage
}
```

- [ ] **Step 8: Add i18n**

Add to `src/add-os/lang/en/en.json`:

```json
	"buildings": {
		"columns": { "branch": "Branch", "name": "Name", "floorCount": "Floors" },
		"create": { "button": "New building", "title": "New building", "success": "Building created." },
		"edit": { "title": "Edit building", "success": "Building updated." },
		"delete": { "success": "Building deleted." },
		"form": { "branch": "Branch", "name": "Name", "floorCount": "Number of floors" },
		"loadError": "Couldn't load buildings. You may not have permission to view this page."
	},
```

Add to `src/add-os/lang/ar/ar.json`:

```json
	"buildings": {
		"columns": { "branch": "الفرع", "name": "الاسم", "floorCount": "عدد الطوابق" },
		"create": { "button": "مبنى جديد", "title": "مبنى جديد", "success": "تم إنشاء المبنى." },
		"edit": { "title": "تعديل المبنى", "success": "تم تحديث المبنى." },
		"delete": { "success": "تم حذف المبنى." },
		"form": { "branch": "الفرع", "name": "الاسم", "floorCount": "عدد الطوابق" },
		"loadError": "تعذّر تحميل المباني. قد لا تملك صلاحية عرض هذه الصفحة."
	},
```

- [ ] **Step 9: Run the full i18n parity guard**

Run: `pnpm vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 10: Run the full test suite and type-check**

Run: `pnpm vitest run && pnpm type-check`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/add-os/modules/spatial/types/building.ts src/add-os/services/buildings.ts src/add-os/services/__tests__/buildings.spec.ts src/add-os/modules/spatial/config/buildings.config.ts src/add-os/modules/spatial/views/BuildingsPage.vue src/add-os/navigation/routes.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add Buildings CRUD screen"
```

---

## Task 10: Floor (FK: `building_id`) — first cascading form

**Files:**
- Create: `src/add-os/modules/spatial/types/floor.ts`
- Create: `src/add-os/services/floors.ts`
- Test: `src/add-os/services/__tests__/floors.spec.ts`
- Create: `src/add-os/modules/spatial/config/floors.config.ts`
- Create: `src/add-os/modules/spatial/views/FloorsPage.vue`
- Modify: `src/add-os/navigation/sections.ts` (add the `floors` page — not yet reserved, unlike Branch/Building/Space)
- Modify: `src/add-os/navigation/routes.ts` (`spatial.floors` → `FloorsPage`)
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (new `floors` namespace, plus the `nav.pages.floors` key `sections.ts` needs)

**Interfaces:**
- Consumes: `listBranches` (Task 8), `listBuildings` (Task 9).
- Produces: `Floor`, `FloorPayload` — consumed by Task 11 (Zone's `floor_id` options come from `listFloors()`).

Floor's form is where the `virtual`/`dependsOn` cascade (spec §8-9) is actually exercised for the first time: creating a Floor only sends `building_id`, but picking the right building is easier from a Branch dropdown first — that Branch field is `virtual: true`.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/services/__tests__/floors.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFloor, getFloor, listFloors, removeFloor, updateFloor } from "../floors"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleFloor = { id: 1, building_id: 1, label: "1", sort_order: 0 }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("floors service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listFloors GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleFloor] }))

		const floors = await listFloors()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/floors", expect.objectContaining({ method: "GET" }))
		expect(floors).toEqual([sampleFloor])
	})

	it("listFloors(buildingId) appends ?building_id=", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleFloor] }))

		await listFloors(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/floors?building_id=1",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createFloor POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleFloor }, 201))

		const payload = { building_id: 1, label: "1", sort_order: 0 }
		const floor = await createFloor(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/floors",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(floor).toEqual(sampleFloor)
	})

	it("getFloor GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleFloor }))

		const floor = await getFloor(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/floors/1", expect.objectContaining({ method: "GET" }))
		expect(floor).toEqual(sampleFloor)
	})

	it("updateFloor PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { building_id: 1, label: "1", sort_order: 1 }
		const result = await updateFloor(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/floors/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeFloor DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeFloor(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/floors/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/floors.spec.ts`
Expected: FAIL with "Failed to resolve import ../floors".

- [ ] **Step 3: Write the types and service**

```ts
// src/add-os/modules/spatial/types/floor.ts
export interface Floor {
	id: number
	building_id: number
	label: string
	sort_order: number
}

export interface FloorPayload {
	building_id: number
	label: string
	sort_order: number
}
```

```ts
// src/add-os/services/floors.ts
import type { Floor, FloorPayload } from "@/add-os/modules/spatial/types/floor"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Floor, FloorPayload, FloorPayload>("/api/v1/admin/floors")

export const listFloors = (buildingId?: number) => api.list(buildingId ? { building_id: buildingId } : undefined)
export const getFloor = api.getById
export const createFloor = api.create
export const updateFloor = api.update
export const removeFloor = api.remove
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/floors.spec.ts`
Expected: PASS, all 6 assertions.

- [ ] **Step 5: Write the config**

```ts
// src/add-os/modules/spatial/config/floors.config.ts
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { Floor, FloorPayload } from "@/add-os/modules/spatial/types/floor"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { listBuildings } from "@/add-os/services/buildings"
import { formatNumber } from "@/add-os/utils/format"

export function buildFloorColumns(
	t: ComposerTranslation,
	locale: SupportedLocale,
	buildingsById: Record<number, Building>
): DataTableColumns<Floor> {
	return [
		{
			title: t("floors.columns.building"),
			key: "building_id",
			render: row => (buildingsById[row.building_id] ? pickLocalized(buildingsById[row.building_id].name, locale) : row.building_id)
		},
		{ title: t("floors.columns.label"), key: "label" },
		{ title: t("floors.columns.sortOrder"), key: "sort_order", render: row => formatNumber(row.sort_order) }
	]
}

export function buildFloorFields(branches: Branch[], locale: SupportedLocale): FieldDescriptor<FloorPayload & { branch_id: number }>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		{ key: "branch_id", labelKey: "floors.form.branch", type: "select", required: true, options: branchOptions, virtual: true },
		{
			key: "building_id",
			labelKey: "floors.form.building",
			type: "select",
			required: true,
			dependsOn: "branch_id",
			optionsFrom: async ({ branch_id }) => {
				if (!branch_id) return []
				const buildings = await listBuildings(branch_id as number)
				return buildings.map(building => ({ label: pickLocalized(building.name, locale), value: building.id }))
			}
		},
		{ key: "label", labelKey: "floors.form.label", type: "text", required: true },
		{ key: "sort_order", labelKey: "floors.form.sortOrder", type: "number", required: true }
	]
}

export function emptyFloorPayload(): FloorPayload & { branch_id: number } {
	return { branch_id: 0, building_id: 0, label: "", sort_order: 0 }
}
```

`FieldDescriptor<FloorPayload & { branch_id: number }>` widens the model type to include the UI-only `branch_id` — `buildPayload` (Task 3) still strips it before submit since it's marked `virtual`, so the object `ResourceFormDrawer.onSubmit` actually receives matches `FloorPayload` exactly (`building_id`, `label`, `sort_order`).

- [ ] **Step 6: Write the view**

```vue
<!-- src/add-os/modules/spatial/views/FloorsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.floors") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('floors.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("floors.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="row => mutations.remove(row.id)" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:mode
			:title="mode === 'create' ? t('floors.create.title') : t('floors.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { Floor, FloorPayload } from "@/add-os/modules/spatial/types/floor"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildFloorColumns, buildFloorFields, emptyFloorPayload } from "@/add-os/modules/spatial/config/floors.config"
import { listBranches } from "@/add-os/services/branches"
import { listBuildings } from "@/add-os/services/buildings"
import { createFloor, listFloors, removeFloor, updateFloor } from "@/add-os/services/floors"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data: branches } = useResourceList<Branch>(listBranches)
const { data: buildings } = useResourceList<Building>(() => listBuildings())
const buildingsById = computed(() => Object.fromEntries(buildings.value.map(building => [building.id, building])))

const { data, isLoading, error, refetch } = useResourceList<Floor>(() => listFloors())
const columns = computed(() => buildFloorColumns(t, currentLocale.value, buildingsById.value))
const fields = computed(() => buildFloorFields(branches.value, currentLocale.value))

const mutations = useResourceMutations({ create: createFloor, update: updateFloor, remove: removeFloor }, refetch, {
	createSuccess: t("floors.create.success"),
	updateSuccess: t("floors.edit.success"),
	deleteSuccess: t("floors.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<FloorPayload & { branch_id: number }>(emptyFloorPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyFloorPayload()
	drawerVisible.value = true
}

function openEdit(row: Floor) {
	mode.value = "edit"
	editingId.value = row.id
	const branchId = buildingsById.value[row.building_id]?.branch_id ?? 0
	form.value = { branch_id: branchId, building_id: row.building_id, label: row.label, sort_order: row.sort_order }
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as FloorPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as FloorPayload)
	}
}
</script>
```

- [ ] **Step 7: Wire into navigation**

In `src/add-os/navigation/sections.ts`, add `floors` to the `spatial` section's `pages` array, right after `buildings`:

```ts
		pages: [
			{ key: "branches", path: "branches" },
			{ key: "buildings", path: "buildings" },
			{ key: "floors", path: "floors" },
			{ key: "spaces", path: "spaces" }
		]
```

In `src/add-os/navigation/routes.ts`:

```ts
import FloorsPage from "@/add-os/modules/spatial/views/FloorsPage.vue"
```

```ts
const PAGE_COMPONENTS: Record<string, unknown> = {
	"system.roles": RolesPage,
	"system.users": UsersPage,
	"spatial.branches": BranchesPage,
	"spatial.buildings": BuildingsPage,
	"spatial.floors": FloorsPage
}
```

- [ ] **Step 8: Add i18n**

Add to `src/add-os/lang/en/en.json` (the `floors` namespace, plus `nav.pages.floors` inside the existing `nav.pages` object):

```json
	"floors": {
		"columns": { "building": "Building", "label": "Label", "sortOrder": "Order" },
		"create": { "button": "New floor", "title": "New floor", "success": "Floor created." },
		"edit": { "title": "Edit floor", "success": "Floor updated." },
		"delete": { "success": "Floor deleted." },
		"form": { "branch": "Branch", "building": "Building", "label": "Label", "sortOrder": "Sort order" },
		"loadError": "Couldn't load floors. You may not have permission to view this page."
	},
```

```json
			"floors": "Floors",
```

Add to `src/add-os/lang/ar/ar.json`:

```json
	"floors": {
		"columns": { "building": "المبنى", "label": "التسمية", "sortOrder": "الترتيب" },
		"create": { "button": "طابق جديد", "title": "طابق جديد", "success": "تم إنشاء الطابق." },
		"edit": { "title": "تعديل الطابق", "success": "تم تحديث الطابق." },
		"delete": { "success": "تم حذف الطابق." },
		"form": { "branch": "الفرع", "building": "المبنى", "label": "التسمية", "sortOrder": "ترتيب الفرز" },
		"loadError": "تعذّر تحميل الطوابق. قد لا تملك صلاحية عرض هذه الصفحة."
	},
```

```json
			"floors": "الطوابق",
```

- [ ] **Step 9: Run the full i18n parity guard, navigation guard, and offline-icon guard**

Run: `pnpm vitest run src/add-os/lang/__tests__/messages.spec.ts src/add-os/navigation/__tests__/navigation.spec.ts src/add-os/assets/__tests__/icons.spec.ts`
Expected: PASS — `navigation.spec.ts` is the guard that fails if a `sections.ts` page has no matching `nav.pages.<key>` i18n key in both languages, which is exactly what Step 8 adds.

- [ ] **Step 10: Run the full test suite and type-check**

Run: `pnpm vitest run && pnpm type-check`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/add-os/modules/spatial/types/floor.ts src/add-os/services/floors.ts src/add-os/services/__tests__/floors.spec.ts src/add-os/modules/spatial/config/floors.config.ts src/add-os/modules/spatial/views/FloorsPage.vue src/add-os/navigation/sections.ts src/add-os/navigation/routes.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add Floors CRUD screen with branch→building cascade"
```

---

## Task 11: Zone (FK: `floor_id`)

**Files:**
- Create: `src/add-os/modules/spatial/types/zone.ts`
- Create: `src/add-os/services/zones.ts`
- Test: `src/add-os/services/__tests__/zones.spec.ts`
- Create: `src/add-os/modules/spatial/config/zones.config.ts`
- Create: `src/add-os/modules/spatial/views/ZonesPage.vue`
- Modify: `src/add-os/navigation/sections.ts` (add the `zones` page)
- Modify: `src/add-os/navigation/routes.ts` (`spatial.zones` → `ZonesPage`)
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (new `zones` namespace + `nav.pages.zones`)

**Interfaces:**
- Consumes: `listBranches` (Task 8), `listBuildings` (Task 9), `listFloors` (Task 10).
- Produces: `Zone`, `ZonePayload` — consumed by Task 12 (Space's `zone_id`, nullable, options come from `listZones()`).

Same three-level cascade shape as Floor (Task 10), one level deeper: `branch_id`(virtual) → `building_id`(virtual, `dependsOn branch_id`) → `floor_id`(`dependsOn building_id`) → `label`, `sort_order`.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/services/__tests__/zones.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createZone, getZone, listZones, removeZone, updateZone } from "../zones"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleZone = { id: 1, floor_id: 1, label: "Zone A", sort_order: 0 }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("zones service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listZones GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleZone] }))

		const zones = await listZones()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/zones", expect.objectContaining({ method: "GET" }))
		expect(zones).toEqual([sampleZone])
	})

	it("listZones(floorId) appends ?floor_id=", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleZone] }))

		await listZones(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/zones?floor_id=1", expect.objectContaining({ method: "GET" }))
	})

	it("createZone POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleZone }, 201))

		const payload = { floor_id: 1, label: "Zone A", sort_order: 0 }
		const zone = await createZone(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/zones",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(zone).toEqual(sampleZone)
	})

	it("getZone GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleZone }))

		const zone = await getZone(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/zones/1", expect.objectContaining({ method: "GET" }))
		expect(zone).toEqual(sampleZone)
	})

	it("updateZone PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { floor_id: 1, label: "Zone A2", sort_order: 1 }
		const result = await updateZone(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/zones/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeZone DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeZone(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/zones/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/zones.spec.ts`
Expected: FAIL with "Failed to resolve import ../zones".

- [ ] **Step 3: Write the types and service**

```ts
// src/add-os/modules/spatial/types/zone.ts
export interface Zone {
	id: number
	floor_id: number
	label: string
	sort_order: number
}

export interface ZonePayload {
	floor_id: number
	label: string
	sort_order: number
}
```

```ts
// src/add-os/services/zones.ts
import type { Zone, ZonePayload } from "@/add-os/modules/spatial/types/zone"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Zone, ZonePayload, ZonePayload>("/api/v1/admin/zones")

export const listZones = (floorId?: number) => api.list(floorId ? { floor_id: floorId } : undefined)
export const getZone = api.getById
export const createZone = api.create
export const updateZone = api.update
export const removeZone = api.remove
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/zones.spec.ts`
Expected: PASS, all 6 assertions.

- [ ] **Step 5: Write the config**

```ts
// src/add-os/modules/spatial/config/zones.config.ts
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { Floor } from "@/add-os/modules/spatial/types/floor"
import type { Zone, ZonePayload } from "@/add-os/modules/spatial/types/zone"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { listBuildings } from "@/add-os/services/buildings"
import { listFloors } from "@/add-os/services/floors"
import { formatNumber } from "@/add-os/utils/format"

export function buildZoneColumns(t: ComposerTranslation, locale: SupportedLocale, floorsById: Record<number, Floor>): DataTableColumns<Zone> {
	return [
		{
			title: t("zones.columns.floor"),
			key: "floor_id",
			render: row => (floorsById[row.floor_id] ? floorsById[row.floor_id].label : row.floor_id)
		},
		{ title: t("zones.columns.label"), key: "label" },
		{ title: t("zones.columns.sortOrder"), key: "sort_order", render: row => formatNumber(row.sort_order) }
	]
}

interface ZoneFormModel extends ZonePayload {
	branch_id: number
	building_id: number
}

export function buildZoneFields(branches: Branch[], locale: SupportedLocale): FieldDescriptor<ZoneFormModel>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		{ key: "branch_id", labelKey: "zones.form.branch", type: "select", required: true, options: branchOptions, virtual: true },
		{
			key: "building_id",
			labelKey: "zones.form.building",
			type: "select",
			required: true,
			dependsOn: "branch_id",
			virtual: true,
			optionsFrom: async ({ branch_id }) => {
				if (!branch_id) return []
				const buildings = await listBuildings(branch_id as number)
				return buildings.map(building => ({ label: pickLocalized(building.name, locale), value: building.id }))
			}
		},
		{
			key: "floor_id",
			labelKey: "zones.form.floor",
			type: "select",
			required: true,
			dependsOn: "building_id",
			optionsFrom: async ({ building_id }) => {
				if (!building_id) return []
				const floors = await listFloors(building_id as number)
				return floors.map(floor => ({ label: floor.label, value: floor.id }))
			}
		},
		{ key: "label", labelKey: "zones.form.label", type: "text", required: true },
		{ key: "sort_order", labelKey: "zones.form.sortOrder", type: "number", required: true }
	]
}

export function emptyZonePayload(): ZoneFormModel {
	return { branch_id: 0, building_id: 0, floor_id: 0, label: "", sort_order: 0 }
}
```

- [ ] **Step 6: Write the view**

```vue
<!-- src/add-os/modules/spatial/views/ZonesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.zones") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('zones.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("zones.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="row => mutations.remove(row.id)" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:mode
			:title="mode === 'create' ? t('zones.create.title') : t('zones.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Floor } from "@/add-os/modules/spatial/types/floor"
import type { Zone, ZonePayload } from "@/add-os/modules/spatial/types/zone"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildZoneColumns, buildZoneFields, emptyZonePayload } from "@/add-os/modules/spatial/config/zones.config"
import { listBranches } from "@/add-os/services/branches"
import { listFloors } from "@/add-os/services/floors"
import { createZone, listZones, removeZone, updateZone } from "@/add-os/services/zones"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data: branches } = useResourceList<Branch>(listBranches)
const { data: floors } = useResourceList<Floor>(() => listFloors())
const floorsById = computed(() => Object.fromEntries(floors.value.map(floor => [floor.id, floor])))

const { data, isLoading, error, refetch } = useResourceList<Zone>(() => listZones())
const columns = computed(() => buildZoneColumns(t, currentLocale.value, floorsById.value))
const fields = computed(() => buildZoneFields(branches.value, currentLocale.value))

const mutations = useResourceMutations({ create: createZone, update: updateZone, remove: removeZone }, refetch, {
	createSuccess: t("zones.create.success"),
	updateSuccess: t("zones.edit.success"),
	deleteSuccess: t("zones.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref(emptyZonePayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyZonePayload()
	drawerVisible.value = true
}

function openEdit(row: Zone) {
	mode.value = "edit"
	editingId.value = row.id
	const floor = floorsById.value[row.floor_id]
	form.value = {
		branch_id: 0, // the floor's building/branch aren't loaded here; the cascade re-derives valid options once building_id is set below
		building_id: floor?.building_id ?? 0,
		floor_id: row.floor_id,
		label: row.label,
		sort_order: row.sort_order
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as ZonePayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as ZonePayload)
	}
}
</script>
```

**Known, deliberately-accepted edit-mode limitation:** opening "Edit" pre-fills `floor_id` and `building_id` correctly (both are on the row/looked-up-floor already in memory), but leaves the virtual `branch_id` unset — Buildings aren't looked up with their branch in this view, so there's no branch to pre-select. This doesn't block editing (the real payload is `floor_id`/`label`/`sort_order`, none of which need `branch_id`), it just means the Branch dropdown starts blank on edit even though Building/Floor are already correctly filled in. Acceptable for this PoC; a future pass could add a `buildingsById` lookup here too (mirroring what Task 10's `FloorsPage.vue` already does) if that rough edge needs polishing.

- [ ] **Step 7: Wire into navigation**

In `src/add-os/navigation/sections.ts`, add `zones` right after `floors`:

```ts
		pages: [
			{ key: "branches", path: "branches" },
			{ key: "buildings", path: "buildings" },
			{ key: "floors", path: "floors" },
			{ key: "zones", path: "zones" },
			{ key: "spaces", path: "spaces" }
		]
```

In `src/add-os/navigation/routes.ts`:

```ts
import ZonesPage from "@/add-os/modules/spatial/views/ZonesPage.vue"
```

```ts
const PAGE_COMPONENTS: Record<string, unknown> = {
	"system.roles": RolesPage,
	"system.users": UsersPage,
	"spatial.branches": BranchesPage,
	"spatial.buildings": BuildingsPage,
	"spatial.floors": FloorsPage,
	"spatial.zones": ZonesPage
}
```

- [ ] **Step 8: Add i18n**

Add to `src/add-os/lang/en/en.json`:

```json
	"zones": {
		"columns": { "floor": "Floor", "label": "Label", "sortOrder": "Order" },
		"create": { "button": "New zone", "title": "New zone", "success": "Zone created." },
		"edit": { "title": "Edit zone", "success": "Zone updated." },
		"delete": { "success": "Zone deleted." },
		"form": { "branch": "Branch", "building": "Building", "floor": "Floor", "label": "Label", "sortOrder": "Sort order" },
		"loadError": "Couldn't load zones. You may not have permission to view this page."
	},
```

```json
			"zones": "Zones",
```

Add to `src/add-os/lang/ar/ar.json`:

```json
	"zones": {
		"columns": { "floor": "الطابق", "label": "التسمية", "sortOrder": "الترتيب" },
		"create": { "button": "منطقة جديدة", "title": "منطقة جديدة", "success": "تم إنشاء المنطقة." },
		"edit": { "title": "تعديل المنطقة", "success": "تم تحديث المنطقة." },
		"delete": { "success": "تم حذف المنطقة." },
		"form": { "branch": "الفرع", "building": "المبنى", "floor": "الطابق", "label": "التسمية", "sortOrder": "ترتيب الفرز" },
		"loadError": "تعذّر تحميل المناطق. قد لا تملك صلاحية عرض هذه الصفحة."
	},
```

```json
			"zones": "المناطق",
```

- [ ] **Step 9: Run the full i18n parity guard, navigation guard, and offline-icon guard**

Run: `pnpm vitest run src/add-os/lang/__tests__/messages.spec.ts src/add-os/navigation/__tests__/navigation.spec.ts src/add-os/assets/__tests__/icons.spec.ts`
Expected: PASS.

- [ ] **Step 10: Run the full test suite and type-check**

Run: `pnpm vitest run && pnpm type-check`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/add-os/modules/spatial/types/zone.ts src/add-os/services/zones.ts src/add-os/services/__tests__/zones.spec.ts src/add-os/modules/spatial/config/zones.config.ts src/add-os/modules/spatial/views/ZonesPage.vue src/add-os/navigation/sections.ts src/add-os/navigation/routes.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add Zones CRUD screen"
```

---

## Task 12: Space (FK: `building_id`, `zone_id` nullable) — plus status transitions

**Files:**
- Create: `src/add-os/modules/spatial/types/operational-status.ts` (shared with Task 13)
- Create: `src/add-os/modules/spatial/types/space.ts`
- Create: `src/add-os/services/spaces.ts`
- Test: `src/add-os/services/__tests__/spaces.spec.ts`
- Create: `src/add-os/modules/spatial/config/spaces.config.ts`
- Create: `src/add-os/modules/spatial/views/SpacesPage.vue`
- Modify: `src/add-os/components/resource/ResourceTable.vue` (adds an optional `extraActions` prop — Space is the first resource needing a third row action)
- Modify: `src/add-os/components/resource/__tests__/ResourceTable.spec.ts` (one new test for `extraActions`)
- Modify: `src/add-os/navigation/routes.ts` (`spatial.spaces` → `SpacesPage`)
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (new `spaces` namespace + shared `operationalStatus.*`)

**Interfaces:**
- Consumes: `listBranches` (Task 8), `listBuildings` (Task 9), `listFloors`/`listZones` (Tasks 10-11), `CurrencyCode` (`@/add-os/utils/format/currency`, existing).
- Produces: `OperationalStatus`, `buildOperationalStatusOptions`, `renderOperationalStatusTag` — consumed by Task 13 (Resource shares the exact same status enum, per `App\Domain\Foundation\Enums\OperationalStatus` in `ADDCore`). `Space` — consumed by Task 13/14 (`SpaceResource.space_id` and `SeatDesk.space_id` options come from `listSpaces()`).

**Deliberate scope note on `space_type` labels:** `co_space`/`room`/`business`/`event_hall` are rendered as plain descriptive UI text ("Co-working space", "Room", "Business space", "Event hall" / equivalents in Arabic) rather than the stylized brand service names ("Co-Space", "Business", "Event"/"Events"). `docs/brand/GUIDELINE-FEEDBACK.md` items 2 and 10 already register open, brand-owner-only naming questions around exactly these terms (no registered Arabic rendering for "Co-Space"; "Event" vs "Events" unresolved) — per root `CLAUDE.md`'s rule that a Guideline ambiguity is settled by the brand owner, not inferred, this internal admin field stays descriptive/technical rather than taking a side on either open question. This is not the same field as any customer-facing service name.

**Deliberate scope note on `status_from`/`status_until`:** both are optional per the backend design doc; this PoC's "change status" form covers `status` + `status_reason` only (the two fields every one of these status endpoints actually shares, and the two Users' own change-status precedent already covers) and omits them from the payload entirely rather than guessing at a datetime-picker UX not otherwise specified anywhere in this plan.

- [ ] **Step 1: Extend `ResourceTable.vue` with an optional `extraActions` prop**

Space is the first resource needing a third row action (beyond generic edit/delete) — "change status". Add to the existing test file:

```ts
// src/add-os/components/resource/__tests__/ResourceTable.spec.ts — new test, added to the existing describe block
it("renders extraActions buttons alongside edit/delete when provided", async () => {
	const onExtra = vi.fn()
	const wrapper = mountTable({
		extraActions: (row: Row) => [h("button", { onClick: () => onExtra(row) }, "Extra")]
	})

	const extraButton = wrapper.findAll("button").find(button => button.text() === "Extra")
	expect(extraButton?.exists()).toBe(true)
	await extraButton?.trigger("click")

	expect(onExtra).toHaveBeenCalledWith({ id: 1, label: "Row A" })
	wrapper.unmount()
})
```

Add `import { h } from "vue"` to this test file's existing `vue`-related imports (this test file doesn't import from `"vue"` yet — add `import { h } from "vue"` as a new top-level import).

Run: `pnpm vitest run src/add-os/components/resource/__tests__/ResourceTable.spec.ts`
Expected: FAIL — `extraActions` isn't a recognized prop yet, so nothing renders an "Extra" button.

In `src/add-os/components/resource/ResourceTable.vue`, add the prop and splice it into `renderActions`:

```ts
const props = defineProps<{
	columns: DataTableColumns<T>
	data: T[]
	loading: boolean
	onEdit: (row: T) => void
	onDelete: (row: T) => void | Promise<void>
	extraActions?: (row: T) => ReturnType<typeof h>[]
}>()
```

```ts
function renderActions(row: T) {
	return h("div", { class: "flex gap-2" }, [
		h(NButton, { text: true, type: "primary", onClick: () => props.onEdit(row) }, { default: () => t("resourceCrud.table.editAction") }),
		...(props.extraActions?.(row) ?? []),
		h(
			NPopconfirm,
			{
				positiveText: t("resourceCrud.table.deleteConfirmOk"),
				negativeText: t("resourceCrud.table.deleteConfirmCancel"),
				onPositiveClick: () => props.onDelete(row)
			},
			{
				trigger: () => h(NButton, { text: true, type: "error" }, { default: () => t("resourceCrud.table.deleteAction") }),
				default: () => t("resourceCrud.table.deleteConfirmTitle")
			}
		)
	])
}
```

Run: `pnpm vitest run src/add-os/components/resource/__tests__/ResourceTable.spec.ts`
Expected: PASS, all 6 assertions (5 existing + 1 new). Commit this step on its own:

```bash
git add src/add-os/components/resource/ResourceTable.vue src/add-os/components/resource/__tests__/ResourceTable.spec.ts
git commit -m "feat(add-os): let ResourceTable render extra per-row actions"
```

- [ ] **Step 2: Write the failing service test**

```ts
// src/add-os/services/__tests__/spaces.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createSpace, getSpace, listSpaces, removeSpace, updateSpace, updateSpaceStatus } from "../spaces"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleSpace = {
	id: 1,
	building_id: 1,
	zone_id: 1,
	space_type: "co_space" as const,
	allocation_model: "open",
	is_lockable: false,
	capacity: 20,
	hourly_rate: null,
	pricing_currency: null,
	status: "active" as const,
	status_reason: null
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("spaces service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listSpaces GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleSpace] }))

		const spaces = await listSpaces()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/spaces", expect.objectContaining({ method: "GET" }))
		expect(spaces).toEqual([sampleSpace])
	})

	it("listSpaces(filter) appends building_id and/or zone_id independently", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleSpace] }))

		await listSpaces({ building_id: 1 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/spaces?building_id=1",
			expect.objectContaining({ method: "GET" })
		)

		await listSpaces({ building_id: 1, zone_id: 2 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/spaces?building_id=1&zone_id=2",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createSpace POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleSpace }, 201))

		const payload = {
			building_id: 1,
			zone_id: 1,
			space_type: "co_space" as const,
			allocation_model: "open",
			is_lockable: false,
			capacity: 20,
			hourly_rate: null,
			pricing_currency: null
		}
		const space = await createSpace(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/spaces",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(space).toEqual(sampleSpace)
	})

	it("getSpace GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleSpace }))

		const space = await getSpace(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/spaces/1", expect.objectContaining({ method: "GET" }))
		expect(space).toEqual(sampleSpace)
	})

	it("updateSpace PUTs the payload (never status fields) and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = {
			building_id: 1,
			zone_id: null,
			space_type: "room" as const,
			allocation_model: null,
			is_lockable: true,
			capacity: 4,
			hourly_rate: 5,
			pricing_currency: "USD" as const
		}
		const result = await updateSpace(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/spaces/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeSpace DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeSpace(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/spaces/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})

	it("updateSpaceStatus PATCHes the status endpoint with status + status_reason", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Status updated." }))

		const payload = { status: "maintenance" as const, status_reason: "Carpet replacement" }
		const result = await updateSpaceStatus(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/spaces/1/status",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Status updated." })
	})
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/spaces.spec.ts`
Expected: FAIL with "Failed to resolve import ../spaces".

- [ ] **Step 4: Write the shared status type, the Space types, and the service**

```ts
import type { SelectOption } from "naive-ui"
// src/add-os/modules/spatial/types/operational-status.ts
import type { ComposerTranslation } from "vue-i18n"
import { NTag } from "naive-ui"
import { h } from "vue"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/** Shared by Space and Resource — `App\Domain\Foundation\Enums\OperationalStatus` in ADDCore. */
export type OperationalStatus = "active" | "maintenance" | "retired"

const STATUS_VALUES = ["active", "maintenance", "retired"] as const

const STATUS_TAG_TYPE: Record<OperationalStatus, "success" | "warning" | "error"> = {
	active: "success",
	maintenance: "warning",
	retired: "error"
}

const STATUS_ICON: Record<OperationalStatus, string> = {
	active: STATUS_ICONS.success,
	maintenance: STATUS_ICONS.warning,
	retired: STATUS_ICONS.danger
}

export function buildOperationalStatusOptions(t: ComposerTranslation): SelectOption[] {
	return STATUS_VALUES.map(status => ({ label: t(`operationalStatus.${status}`), value: status }))
}

export function renderOperationalStatusTag(status: OperationalStatus, t: ComposerTranslation) {
	return h(
		NTag,
		{ type: STATUS_TAG_TYPE[status], round: true, bordered: true },
		{ default: () => [h(Icon, { name: STATUS_ICON[status], size: 14 }), ` ${t(`operationalStatus.${status}`)}`] }
	)
}
```

```ts
import type { OperationalStatus } from "./operational-status"
// src/add-os/modules/spatial/types/space.ts
import type { CurrencyCode } from "@/add-os/utils/format/currency"

export type SpaceType = "co_space" | "room" | "business" | "event_hall"

export interface Space {
	id: number
	building_id: number
	zone_id: number | null
	space_type: SpaceType
	allocation_model: string | null
	is_lockable: boolean
	capacity: number
	hourly_rate: number | null
	pricing_currency: CurrencyCode | null
	status: OperationalStatus
	status_reason: string | null
}

/** create/update — status fields are excluded entirely; they move only through SpaceStatusPayload. */
export interface SpacePayload {
	building_id: number
	zone_id: number | null
	space_type: SpaceType
	allocation_model: string | null
	is_lockable: boolean
	capacity: number
	hourly_rate: number | null
	pricing_currency: CurrencyCode | null
}

export interface SpaceStatusPayload {
	status: OperationalStatus
	status_reason?: string
}
```

```ts
// src/add-os/services/spaces.ts
import type { Space, SpacePayload, SpaceStatusPayload } from "@/add-os/modules/spatial/types/space"
import { patch } from "./api"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Space, SpacePayload, SpacePayload>("/api/v1/admin/spaces")

export const listSpaces = (filter?: { building_id?: number; zone_id?: number }) => api.list(filter)
export const getSpace = api.getById
export const createSpace = api.create
export const updateSpace = api.update
export const removeSpace = api.remove

export function updateSpaceStatus(id: number, payload: SpaceStatusPayload) {
  return patch<{ message?: string }>(`/api/v1/admin/spaces/${id}/status`, payload)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/spaces.spec.ts`
Expected: PASS, all 7 assertions.

- [ ] **Step 6: Write the config**

```ts
// src/add-os/modules/spatial/config/spaces.config.ts
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { Space, SpacePayload, SpaceType } from "@/add-os/modules/spatial/types/space"
import type { Zone } from "@/add-os/modules/spatial/types/zone"
import type { CurrencyCode } from "@/add-os/utils/format/currency"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { buildOperationalStatusOptions, renderOperationalStatusTag } from "@/add-os/modules/spatial/types/operational-status"
import { listBuildings } from "@/add-os/services/buildings"
import { listFloors } from "@/add-os/services/floors"
import { listZones } from "@/add-os/services/zones"
import { formatNumber } from "@/add-os/utils/format"

const SPACE_TYPES: SpaceType[] = ["co_space", "room", "business", "event_hall"]
const CURRENCIES: CurrencyCode[] = ["SYP", "USD", "EUR"]

export function buildSpaceColumns(
	t: ComposerTranslation,
	locale: SupportedLocale,
	buildingsById: Record<number, Building>,
	zonesById: Record<number, Zone>
): DataTableColumns<Space> {
	return [
		{
			title: t("spaces.columns.building"),
			key: "building_id",
			render: row => (buildingsById[row.building_id] ? pickLocalized(buildingsById[row.building_id].name, locale) : row.building_id)
		},
		{
			title: t("spaces.columns.zone"),
			key: "zone_id",
			render: row => (row.zone_id && zonesById[row.zone_id] ? zonesById[row.zone_id].label : "—")
		},
		{ title: t("spaces.columns.spaceType"), key: "space_type", render: row => t(`spaces.spaceType.${row.space_type}`) },
		{ title: t("spaces.columns.capacity"), key: "capacity", render: row => formatNumber(row.capacity) },
		{ title: t("spaces.columns.status"), key: "status", render: row => renderOperationalStatusTag(row.status, t) }
	]
}

interface SpaceFormModel extends SpacePayload {
	branch_id: number
}

export function buildSpaceFields(t: ComposerTranslation, branches: Branch[], locale: SupportedLocale): FieldDescriptor<SpaceFormModel>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))
	const spaceTypeOptions: SelectOption[] = SPACE_TYPES.map(type => ({ label: t(`spaces.spaceType.${type}`), value: type }))
	const currencyOptions: SelectOption[] = CURRENCIES.map(code => ({ label: code, value: code }))

	return [
		{ key: "branch_id", labelKey: "spaces.form.branch", type: "select", required: true, options: branchOptions, virtual: true },
		{
			key: "building_id",
			labelKey: "spaces.form.building",
			type: "select",
			required: true,
			dependsOn: "branch_id",
			optionsFrom: async ({ branch_id }) => {
				if (!branch_id) return []
				const buildings = await listBuildings(branch_id as number)
				return buildings.map(building => ({ label: pickLocalized(building.name, locale), value: building.id }))
			}
		},
		{
			key: "zone_id",
			labelKey: "spaces.form.zone",
			type: "select",
			dependsOn: "building_id",
			optionsFrom: async ({ building_id }) => {
				if (!building_id) return []
				const floors = await listFloors(building_id as number)
				const zonesByFloor = await Promise.all(floors.map(floor => listZones(floor.id)))
				return zonesByFloor.flat().map(zone => ({ label: zone.label, value: zone.id }))
			}
		},
		{ key: "space_type", labelKey: "spaces.form.spaceType", type: "select", required: true, options: spaceTypeOptions },
		{ key: "allocation_model", labelKey: "spaces.form.allocationModel", type: "text" },
		{ key: "is_lockable", labelKey: "spaces.form.isLockable", type: "switch" },
		{ key: "capacity", labelKey: "spaces.form.capacity", type: "number", required: true },
		{ key: "hourly_rate", labelKey: "spaces.form.hourlyRate", type: "number" },
		{ key: "pricing_currency", labelKey: "spaces.form.pricingCurrency", type: "select", options: currencyOptions }
	]
}

export function emptySpacePayload(): SpaceFormModel {
	return {
		branch_id: 0,
		building_id: 0,
		zone_id: null,
		space_type: "co_space",
		allocation_model: null,
		is_lockable: false,
		capacity: 1,
		hourly_rate: null,
		pricing_currency: null
	}
}

export function buildSpaceStatusFields(t: ComposerTranslation): FieldDescriptor<{ status: string; status_reason: string }>[] {
	return [
		{ key: "status", labelKey: "spaces.changeStatus.statusLabel", type: "select", required: true, options: buildOperationalStatusOptions(t) },
		{ key: "status_reason", labelKey: "spaces.changeStatus.reasonLabel", type: "text" }
	]
}
```

`buildSpaceStatusFields` reuses the shared `buildOperationalStatusOptions` from `operational-status.ts` (Step 4) rather than redeclaring the 3 status values here — Task 13's `SpaceResource` status form reuses the exact same function.

- [ ] **Step 7: Write the view**

```vue
<!-- src/add-os/modules/spatial/views/SpacesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.spaces") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('spaces.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("spaces.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="row => mutations.remove(row.id)"
			:extra-actions="renderStatusAction"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:mode
			:title="mode === 'create' ? t('spaces.create.title') : t('spaces.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>

		<ResourceFormDrawer
			v-model:show="statusDrawerVisible"
			v-model:model="statusForm"
			:fields="statusFields"
			mode="edit"
			:title="t('spaces.changeStatus.title')"
			:submitting="statusSubmitting"
			:on-submit="submitStatusChange"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { OperationalStatus } from "@/add-os/modules/spatial/types/operational-status"
import type { Space, SpacePayload, SpaceStatusPayload } from "@/add-os/modules/spatial/types/space"
import type { Zone } from "@/add-os/modules/spatial/types/zone"
import { NButton, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	buildSpaceColumns,
	buildSpaceFields,
	buildSpaceStatusFields,
	emptySpacePayload
} from "@/add-os/modules/spatial/config/spaces.config"
import { ApiError } from "@/add-os/services/api"
import { listBranches } from "@/add-os/services/branches"
import { listBuildings } from "@/add-os/services/buildings"
import { createSpace, listSpaces, removeSpace, updateSpace, updateSpaceStatus } from "@/add-os/services/spaces"
import { listZones } from "@/add-os/services/zones"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

const { data: branches } = useResourceList<Branch>(listBranches)
const { data: buildings } = useResourceList<Building>(() => listBuildings())
const buildingsById = computed(() => Object.fromEntries(buildings.value.map(building => [building.id, building])))
const { data: zones } = useResourceList<Zone>(() => listZones())
const zonesById = computed(() => Object.fromEntries(zones.value.map(zone => [zone.id, zone])))

const { data, isLoading, error, refetch } = useResourceList<Space>(() => listSpaces())
const columns = computed(() => buildSpaceColumns(t, currentLocale.value, buildingsById.value, zonesById.value))
const fields = computed(() => buildSpaceFields(t, branches.value, currentLocale.value))

const mutations = useResourceMutations({ create: createSpace, update: updateSpace, remove: removeSpace }, refetch, {
	createSuccess: t("spaces.create.success"),
	updateSuccess: t("spaces.edit.success"),
	deleteSuccess: t("spaces.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref(emptySpacePayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptySpacePayload()
	drawerVisible.value = true
}

function openEdit(row: Space) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		branch_id: 0, // same known limitation as Zone/Task 11 — branch isn't looked up from a space's building here
		building_id: row.building_id,
		zone_id: row.zone_id,
		space_type: row.space_type,
		allocation_model: row.allocation_model,
		is_lockable: row.is_lockable,
		capacity: row.capacity,
		hourly_rate: row.hourly_rate,
		pricing_currency: row.pricing_currency
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as SpacePayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as SpacePayload)
	}
}

const statusDrawerVisible = ref(false)
const statusSubmitting = ref(false)
const statusTargetId = ref<number | null>(null)
const statusForm = ref<{ status: OperationalStatus; status_reason: string }>({ status: "active", status_reason: "" })
const statusFields = computed(() => buildSpaceStatusFields(t))

function openStatusDrawer(row: Space) {
	statusTargetId.value = row.id
	statusForm.value = { status: row.status, status_reason: row.status_reason ?? "" }
	statusDrawerVisible.value = true
}

async function submitStatusChange(payload: Record<string, unknown>) {
	if (statusTargetId.value === null) return
	statusSubmitting.value = true
	try {
		await updateSpaceStatus(statusTargetId.value, payload as SpaceStatusPayload)
		message.success(t("spaces.changeStatus.success"))
		await refetch()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		throw caught
	} finally {
		statusSubmitting.value = false
	}
}

function renderStatusAction(row: Space) {
	return [h(NButton, { text: true, onClick: () => openStatusDrawer(row) }, { default: () => t("spaces.changeStatus.button") })]
}
</script>
```

- [ ] **Step 8: Wire into routing**

In `src/add-os/navigation/routes.ts`:

```ts
import SpacesPage from "@/add-os/modules/spatial/views/SpacesPage.vue"
```

```ts
const PAGE_COMPONENTS: Record<string, unknown> = {
	"system.roles": RolesPage,
	"system.users": UsersPage,
	"spatial.branches": BranchesPage,
	"spatial.buildings": BuildingsPage,
	"spatial.floors": FloorsPage,
	"spatial.zones": ZonesPage,
	"spatial.spaces": SpacesPage
}
```

`sections.ts` already has `{ key: "spaces", path: "spaces" }` — no change needed there.

- [ ] **Step 9: Add i18n**

Add to `src/add-os/lang/en/en.json` (a new shared top-level `operationalStatus` key, plus the `spaces` namespace):

```json
	"operationalStatus": { "active": "Active", "maintenance": "Under maintenance", "retired": "Retired" },
	"spaces": {
		"columns": { "building": "Building", "zone": "Zone", "spaceType": "Type", "capacity": "Capacity", "status": "Status" },
		"spaceType": {
			"co_space": "Co-working space",
			"room": "Room",
			"business": "Business space",
			"event_hall": "Event hall"
		},
		"create": { "button": "New space", "title": "New space", "success": "Space created." },
		"edit": { "title": "Edit space", "success": "Space updated." },
		"delete": { "success": "Space deleted." },
		"changeStatus": {
			"button": "Change status",
			"title": "Change status",
			"statusLabel": "Status",
			"reasonLabel": "Reason (optional)",
			"success": "Status updated."
		},
		"form": {
			"branch": "Branch",
			"building": "Building",
			"zone": "Zone (optional)",
			"spaceType": "Type",
			"allocationModel": "Allocation model (optional)",
			"isLockable": "Lockable",
			"capacity": "Capacity",
			"hourlyRate": "Hourly rate (optional)",
			"pricingCurrency": "Currency (optional)"
		},
		"loadError": "Couldn't load spaces. You may not have permission to view this page."
	},
```

```json
			"spaces": "Spaces",
```

Add to `src/add-os/lang/ar/ar.json`:

```json
	"operationalStatus": { "active": "نشط", "maintenance": "قيد الصيانة", "retired": "خارج الخدمة" },
	"spaces": {
		"columns": { "building": "المبنى", "zone": "المنطقة", "spaceType": "النوع", "capacity": "السعة", "status": "الحالة" },
		"spaceType": {
			"co_space": "مساحة عمل مشتركة",
			"room": "غرفة",
			"business": "مساحة أعمال",
			"event_hall": "قاعة فعاليات"
		},
		"create": { "button": "مساحة جديدة", "title": "مساحة جديدة", "success": "تم إنشاء المساحة." },
		"edit": { "title": "تعديل المساحة", "success": "تم تحديث المساحة." },
		"delete": { "success": "تم حذف المساحة." },
		"changeStatus": {
			"button": "تغيير الحالة",
			"title": "تغيير الحالة",
			"statusLabel": "الحالة",
			"reasonLabel": "السبب (اختياري)",
			"success": "تم تحديث الحالة."
		},
		"form": {
			"branch": "الفرع",
			"building": "المبنى",
			"zone": "المنطقة (اختياري)",
			"spaceType": "النوع",
			"allocationModel": "نموذج التخصيص (اختياري)",
			"isLockable": "قابلة للإغلاق",
			"capacity": "السعة",
			"hourlyRate": "السعر بالساعة (اختياري)",
			"pricingCurrency": "العملة (اختياري)"
		},
		"loadError": "تعذّر تحميل المساحات. قد لا تملك صلاحية عرض هذه الصفحة."
	},
```

```json
			"spaces": "المساحات",
```

- [ ] **Step 10: Run the full i18n parity guard**

Run: `pnpm vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 11: Run the full test suite and type-check**

Run: `pnpm vitest run && pnpm type-check`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/add-os/modules/spatial/types/operational-status.ts src/add-os/modules/spatial/types/space.ts src/add-os/services/spaces.ts src/add-os/services/__tests__/spaces.spec.ts src/add-os/modules/spatial/config/spaces.config.ts src/add-os/modules/spatial/views/SpacesPage.vue src/add-os/navigation/routes.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add Spaces CRUD screen with status transitions"
```

---

## Task 13: SpaceResource (FK: `space_id`) — plus status transitions

**Files:**
- Create: `src/add-os/modules/spatial/types/resource.ts`
- Create: `src/add-os/services/resources.ts`
- Test: `src/add-os/services/__tests__/resources.spec.ts`
- Create: `src/add-os/modules/spatial/config/resources.config.ts`
- Create: `src/add-os/modules/spatial/views/ResourcesPage.vue`
- Modify: `src/add-os/navigation/sections.ts` (add the `resources` page)
- Modify: `src/add-os/navigation/routes.ts` (`spatial.resources` → `ResourcesPage`)
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (new `resources` namespace + `nav.pages.resources`)

**Interfaces:**
- Consumes: `listSpaces` (Task 12), `buildOperationalStatusOptions`/`renderOperationalStatusTag`/`OperationalStatus` (Task 12).
- Produces: `SpaceResource`, `SpaceResourcePayload` — nothing later in this plan consumes them (this is the second-to-last resource).

**Naming, carried from the spec:** the exported TypeScript **type** is `SpaceResource`, not `Resource` — avoiding a collision with the generic REST term this whole layer is built around (`createResourceApi<T>`, `ResourceTable`, `FieldDescriptor<TModel>`). File/service/URL naming (`resources.ts`, `/api/v1/admin/resources`, `listResources`) is unambiguous once scoped to its own file, so those stay as-is.

Four-level virtual cascade — the deepest one in this plan: `branch_id`(virtual) → `building_id`(virtual) → `zone_id`(virtual, optional) → `space_id` (the real FK, depending on **both** `building_id` and `zone_id` at once — the first field in this plan that needs `dependsOn` as an array rather than a single key).

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/services/__tests__/resources.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createResource, getResource, listResources, removeResource, updateResource, updateResourceStatus } from "../resources"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleResource = {
	id: 1,
	space_id: 1,
	name: "Projector",
	category: "projector",
	quantity: 1,
	status: "active" as const,
	status_reason: null
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("resources service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listResources GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleResource] }))

		const resources = await listResources()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/resources", expect.objectContaining({ method: "GET" }))
		expect(resources).toEqual([sampleResource])
	})

	it("listResources(spaceId) appends ?space_id=", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleResource] }))

		await listResources(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/resources?space_id=1",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createResource POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleResource }, 201))

		const payload = { space_id: 1, name: "Projector", category: "projector", quantity: 1 }
		const resource = await createResource(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/resources",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(resource).toEqual(sampleResource)
	})

	it("getResource GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleResource }))

		const resource = await getResource(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/resources/1", expect.objectContaining({ method: "GET" }))
		expect(resource).toEqual(sampleResource)
	})

	it("updateResource PUTs the payload (never status fields) and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { space_id: 1, name: "Projector HD", category: "projector", quantity: 2 }
		const result = await updateResource(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/resources/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeResource DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeResource(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/resources/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})

	it("updateResourceStatus PATCHes the status endpoint with status + status_reason only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Status updated." }))

		const payload = { status: "retired" as const, status_reason: "Broken bulb" }
		const result = await updateResourceStatus(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/resources/1/status",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Status updated." })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/resources.spec.ts`
Expected: FAIL with "Failed to resolve import ../resources".

- [ ] **Step 3: Write the types and service**

```ts
// src/add-os/modules/spatial/types/resource.ts
import type { OperationalStatus } from "./operational-status"

export interface SpaceResource {
	id: number
	space_id: number
	name: string
	category: string
	quantity: number
	status: OperationalStatus
	status_reason: string | null
}

/** create/update — status fields are excluded entirely; they move only through SpaceResourceStatusPayload. */
export interface SpaceResourcePayload {
	space_id: number
	name: string
	category: string
	quantity: number
}

export interface SpaceResourceStatusPayload {
	status: OperationalStatus
	status_reason?: string
}
```

```ts
// src/add-os/services/resources.ts
import type { SpaceResource, SpaceResourcePayload, SpaceResourceStatusPayload } from "@/add-os/modules/spatial/types/resource"
import { patch } from "./api"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<SpaceResource, SpaceResourcePayload, SpaceResourcePayload>("/api/v1/admin/resources")

export const listResources = (spaceId?: number) => api.list(spaceId ? { space_id: spaceId } : undefined)
export const getResource = api.getById
export const createResource = api.create
export const updateResource = api.update
export const removeResource = api.remove

export function updateResourceStatus(id: number, payload: SpaceResourceStatusPayload) {
  return patch<{ message?: string }>(`/api/v1/admin/resources/${id}/status`, payload)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/resources.spec.ts`
Expected: PASS, all 6 assertions.

- [ ] **Step 5: Write the config**

```ts
// src/add-os/modules/spatial/config/resources.config.ts
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { SpaceResource, SpaceResourcePayload } from "@/add-os/modules/spatial/types/resource"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { buildOperationalStatusOptions, renderOperationalStatusTag } from "@/add-os/modules/spatial/types/operational-status"
import { listBuildings } from "@/add-os/services/buildings"
import { listFloors } from "@/add-os/services/floors"
import { listSpaces } from "@/add-os/services/spaces"
import { listZones } from "@/add-os/services/zones"
import { formatNumber } from "@/add-os/utils/format"

export function buildResourceColumns(t: ComposerTranslation): DataTableColumns<SpaceResource> {
	return [
		{ title: t("resources.columns.space"), key: "space_id", render: row => `#${row.space_id}` },
		{ title: t("resources.columns.name"), key: "name" },
		{ title: t("resources.columns.category"), key: "category" },
		{ title: t("resources.columns.quantity"), key: "quantity", render: row => formatNumber(row.quantity) },
		{ title: t("resources.columns.status"), key: "status", render: row => renderOperationalStatusTag(row.status, t) }
	]
}

interface ResourceFormModel extends SpaceResourcePayload {
	branch_id: number
	building_id: number
	zone_id: number | null
}

export function buildResourceFields(t: ComposerTranslation, branches: Branch[], locale: SupportedLocale): FieldDescriptor<ResourceFormModel>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		{ key: "branch_id", labelKey: "resources.form.branch", type: "select", required: true, options: branchOptions, virtual: true },
		{
			key: "building_id",
			labelKey: "resources.form.building",
			type: "select",
			required: true,
			dependsOn: "branch_id",
			virtual: true,
			optionsFrom: async ({ branch_id }) => {
				if (!branch_id) return []
				const buildings = await listBuildings(branch_id as number)
				return buildings.map(building => ({ label: pickLocalized(building.name, locale), value: building.id }))
			}
		},
		{
			key: "zone_id",
			labelKey: "resources.form.zone",
			type: "select",
			dependsOn: "building_id",
			virtual: true,
			optionsFrom: async ({ building_id }) => {
				if (!building_id) return []
				const floors = await listFloors(building_id as number)
				const zonesByFloor = await Promise.all(floors.map(floor => listZones(floor.id)))
				return zonesByFloor.flat().map(zone => ({ label: zone.label, value: zone.id }))
			}
		},
		{
			key: "space_id",
			labelKey: "resources.form.space",
			type: "select",
			required: true,
			dependsOn: ["building_id", "zone_id"],
			optionsFrom: async ({ building_id, zone_id }) => {
				if (!building_id) return []
				const spaces = await listSpaces({ building_id: building_id as number, zone_id: (zone_id as number) || undefined })
				return spaces.map(space => ({ label: `${t(`spaces.spaceType.${space.space_type}`)} #${space.id}`, value: space.id }))
			}
		},
		{ key: "name", labelKey: "resources.form.name", type: "text", required: true },
		{ key: "category", labelKey: "resources.form.category", type: "text", required: true },
		{ key: "quantity", labelKey: "resources.form.quantity", type: "number", required: true }
	]
}

export function emptyResourcePayload(): ResourceFormModel {
	return { branch_id: 0, building_id: 0, zone_id: null, space_id: 0, name: "", category: "", quantity: 1 }
}

export function buildResourceStatusFields(t: ComposerTranslation): FieldDescriptor<{ status: string; status_reason: string }>[] {
	return [
		{ key: "status", labelKey: "resources.changeStatus.statusLabel", type: "select", required: true, options: buildOperationalStatusOptions(t) },
		{ key: "status_reason", labelKey: "resources.changeStatus.reasonLabel", type: "text" }
	]
}
```

`space_id`'s label has no dedicated "name" field on `Space` to show (unlike Building/Floor/Zone, which have `name`/`label`), so it's built from the space's type plus its id (`"Co-working space #12"`) — contextually clear enough once a building (and optionally zone) has already narrowed the list.

- [ ] **Step 6: Write the view**

```vue
<!-- src/add-os/modules/spatial/views/ResourcesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.resources") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('resources.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("resources.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="row => mutations.remove(row.id)"
			:extra-actions="renderStatusAction"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:mode
			:title="mode === 'create' ? t('resources.create.title') : t('resources.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>

		<ResourceFormDrawer
			v-model:show="statusDrawerVisible"
			v-model:model="statusForm"
			:fields="statusFields"
			mode="edit"
			:title="t('resources.changeStatus.title')"
			:submitting="statusSubmitting"
			:on-submit="submitStatusChange"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { OperationalStatus } from "@/add-os/modules/spatial/types/operational-status"
import type { SpaceResource, SpaceResourcePayload, SpaceResourceStatusPayload } from "@/add-os/modules/spatial/types/resource"
import { NButton, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	buildResourceColumns,
	buildResourceFields,
	buildResourceStatusFields,
	emptyResourcePayload
} from "@/add-os/modules/spatial/config/resources.config"
import { ApiError } from "@/add-os/services/api"
import { listBranches } from "@/add-os/services/branches"
import { createResource, listResources, removeResource, updateResource, updateResourceStatus } from "@/add-os/services/resources"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

const { data: branches } = useResourceList<Branch>(listBranches)

const { data, isLoading, error, refetch } = useResourceList<SpaceResource>(() => listResources())
const columns = computed(() => buildResourceColumns(t))
const fields = computed(() => buildResourceFields(t, branches.value, currentLocale.value))

const mutations = useResourceMutations({ create: createResource, update: updateResource, remove: removeResource }, refetch, {
	createSuccess: t("resources.create.success"),
	updateSuccess: t("resources.edit.success"),
	deleteSuccess: t("resources.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref(emptyResourcePayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyResourcePayload()
	drawerVisible.value = true
}

function openEdit(row: SpaceResource) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		branch_id: 0,
		building_id: 0,
		zone_id: null,
		space_id: row.space_id,
		name: row.name,
		category: row.category,
		quantity: row.quantity
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as SpaceResourcePayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as SpaceResourcePayload)
	}
}

const statusDrawerVisible = ref(false)
const statusSubmitting = ref(false)
const statusTargetId = ref<number | null>(null)
const statusForm = ref<{ status: OperationalStatus; status_reason: string }>({ status: "active", status_reason: "" })
const statusFields = computed(() => buildResourceStatusFields(t))

function openStatusDrawer(row: SpaceResource) {
	statusTargetId.value = row.id
	statusForm.value = { status: row.status, status_reason: row.status_reason ?? "" }
	statusDrawerVisible.value = true
}

async function submitStatusChange(payload: Record<string, unknown>) {
	if (statusTargetId.value === null) return
	statusSubmitting.value = true
	try {
		await updateResourceStatus(statusTargetId.value, payload as SpaceResourceStatusPayload)
		message.success(t("resources.changeStatus.success"))
		await refetch()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		throw caught
	} finally {
		statusSubmitting.value = false
	}
}

function renderStatusAction(row: SpaceResource) {
	return [h(NButton, { text: true, onClick: () => openStatusDrawer(row) }, { default: () => t("resources.changeStatus.button") })]
}
</script>
```

**Same known edit-mode limitation as Zone/Space** (Tasks 11-12): opening "Edit" leaves the virtual `branch_id`/`building_id`/`zone_id` unset even though `space_id` (the real FK) is correctly pre-filled — the ancestor chain isn't looked up backwards from a space in this view. Editing still works correctly since the real payload only needs `space_id`.

- [ ] **Step 7: Wire into navigation**

In `src/add-os/navigation/sections.ts`, add `resources` right after `spaces`:

```ts
		pages: [
			{ key: "branches", path: "branches" },
			{ key: "buildings", path: "buildings" },
			{ key: "floors", path: "floors" },
			{ key: "zones", path: "zones" },
			{ key: "spaces", path: "spaces" },
			{ key: "resources", path: "resources" }
		]
```

In `src/add-os/navigation/routes.ts`:

```ts
import ResourcesPage from "@/add-os/modules/spatial/views/ResourcesPage.vue"
```

```ts
const PAGE_COMPONENTS: Record<string, unknown> = {
	"system.roles": RolesPage,
	"system.users": UsersPage,
	"spatial.branches": BranchesPage,
	"spatial.buildings": BuildingsPage,
	"spatial.floors": FloorsPage,
	"spatial.zones": ZonesPage,
	"spatial.spaces": SpacesPage,
	"spatial.resources": ResourcesPage
}
```

- [ ] **Step 8: Add i18n**

Add to `src/add-os/lang/en/en.json`:

```json
	"resources": {
		"columns": { "space": "Space", "name": "Name", "category": "Category", "quantity": "Quantity", "status": "Status" },
		"create": { "button": "New resource", "title": "New resource", "success": "Resource created." },
		"edit": { "title": "Edit resource", "success": "Resource updated." },
		"delete": { "success": "Resource deleted." },
		"changeStatus": {
			"button": "Change status",
			"title": "Change status",
			"statusLabel": "Status",
			"reasonLabel": "Reason (optional)",
			"success": "Status updated."
		},
		"form": {
			"branch": "Branch",
			"building": "Building",
			"zone": "Zone (optional)",
			"space": "Space",
			"name": "Name",
			"category": "Category",
			"quantity": "Quantity"
		},
		"loadError": "Couldn't load resources. You may not have permission to view this page."
	},
```

```json
			"resources": "Resources",
```

Add to `src/add-os/lang/ar/ar.json`:

```json
	"resources": {
		"columns": { "space": "المساحة", "name": "الاسم", "category": "الفئة", "quantity": "الكمية", "status": "الحالة" },
		"create": { "button": "مورد جديد", "title": "مورد جديد", "success": "تم إنشاء المورد." },
		"edit": { "title": "تعديل المورد", "success": "تم تحديث المورد." },
		"delete": { "success": "تم حذف المورد." },
		"changeStatus": {
			"button": "تغيير الحالة",
			"title": "تغيير الحالة",
			"statusLabel": "الحالة",
			"reasonLabel": "السبب (اختياري)",
			"success": "تم تحديث الحالة."
		},
		"form": {
			"branch": "الفرع",
			"building": "المبنى",
			"zone": "المنطقة (اختياري)",
			"space": "المساحة",
			"name": "الاسم",
			"category": "الفئة",
			"quantity": "الكمية"
		},
		"loadError": "تعذّر تحميل الموارد. قد لا تملك صلاحية عرض هذه الصفحة."
	},
```

```json
			"resources": "الموارد",
```

- [ ] **Step 9: Run the full i18n parity guard, navigation guard, and offline-icon guard**

Run: `pnpm vitest run src/add-os/lang/__tests__/messages.spec.ts src/add-os/navigation/__tests__/navigation.spec.ts src/add-os/assets/__tests__/icons.spec.ts`
Expected: PASS.

- [ ] **Step 10: Run the full test suite and type-check**

Run: `pnpm vitest run && pnpm type-check`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/add-os/modules/spatial/types/resource.ts src/add-os/services/resources.ts src/add-os/services/__tests__/resources.spec.ts src/add-os/modules/spatial/config/resources.config.ts src/add-os/modules/spatial/views/ResourcesPage.vue src/add-os/navigation/sections.ts src/add-os/navigation/routes.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add Resources CRUD screen with status transitions"
```

---

## Task 14: SeatDesk (FK: `space_id`, restricted to `co_space`-type spaces)

**Files:**
- Create: `src/add-os/modules/spatial/types/seat-desk.ts`
- Create: `src/add-os/services/seats-desks.ts`
- Test: `src/add-os/services/__tests__/seats-desks.spec.ts`
- Create: `src/add-os/modules/spatial/config/seats-desks.config.ts`
- Create: `src/add-os/modules/spatial/views/SeatsDesksPage.vue`
- Modify: `src/add-os/navigation/sections.ts` (add the `seatsDesks` page)
- Modify: `src/add-os/navigation/routes.ts` (`spatial.seatsDesks` → `SeatsDesksPage`)
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (new `seatsDesks` namespace + `nav.pages.seatsDesks`)

**Interfaces:**
- Consumes: `listSpaces` (Task 12). This is the last resource in the plan — nothing downstream consumes its exports.

**`qr_point_id`**, per the plan's earlier finding (this file's Global Constraints trace back to spec §1): the approved backend design validates it as a nullable integer (`qr_points` doesn't exist until Phase 7), even though the Postman collection's example body omits it. It's included here as an optional number field. **Space filtering**: the Postman collection's own description states `space_id` must reference a `co_space`-type Space, enforced server-side — mirrored here client-side by filtering `space_id`'s options to `space_type === "co_space"` so an invalid choice is never offered in the first place, not merely rejected after the fact.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/services/__tests__/seats-desks.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createSeatDesk, getSeatDesk, listSeatsDesks, removeSeatDesk, updateSeatDesk } from "../seats-desks"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleSeatDesk = { id: 1, space_id: 1, label: "D-12", qr_point_id: null }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("seats-desks service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listSeatsDesks GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleSeatDesk] }))

		const seatsDesks = await listSeatsDesks()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/seats-desks", expect.objectContaining({ method: "GET" }))
		expect(seatsDesks).toEqual([sampleSeatDesk])
	})

	it("listSeatsDesks(spaceId) appends ?space_id=", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleSeatDesk] }))

		await listSeatsDesks(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/seats-desks?space_id=1",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createSeatDesk POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleSeatDesk }, 201))

		const payload = { space_id: 1, label: "D-12", qr_point_id: null }
		const seatDesk = await createSeatDesk(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/seats-desks",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(seatDesk).toEqual(sampleSeatDesk)
	})

	it("getSeatDesk GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleSeatDesk }))

		const seatDesk = await getSeatDesk(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/seats-desks/1", expect.objectContaining({ method: "GET" }))
		expect(seatDesk).toEqual(sampleSeatDesk)
	})

	it("updateSeatDesk PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { space_id: 1, label: "D-99", qr_point_id: 4 }
		const result = await updateSeatDesk(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/seats-desks/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeSeatDesk DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeSeatDesk(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/seats-desks/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/seats-desks.spec.ts`
Expected: FAIL with "Failed to resolve import ../seats-desks".

- [ ] **Step 3: Write the types and service**

```ts
// src/add-os/modules/spatial/types/seat-desk.ts
export interface SeatDesk {
	id: number
	space_id: number
	label: string
	qr_point_id: number | null
}

export interface SeatDeskPayload {
	space_id: number
	label: string
	qr_point_id: number | null
}
```

```ts
// src/add-os/services/seats-desks.ts
import type { SeatDesk, SeatDeskPayload } from "@/add-os/modules/spatial/types/seat-desk"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<SeatDesk, SeatDeskPayload, SeatDeskPayload>("/api/v1/admin/seats-desks")

export const listSeatsDesks = (spaceId?: number) => api.list(spaceId ? { space_id: spaceId } : undefined)
export const getSeatDesk = api.getById
export const createSeatDesk = api.create
export const updateSeatDesk = api.update
export const removeSeatDesk = api.remove
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/seats-desks.spec.ts`
Expected: PASS, all 6 assertions.

- [ ] **Step 5: Write the config**

```ts
// src/add-os/modules/spatial/config/seats-desks.config.ts
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { SeatDesk, SeatDeskPayload } from "@/add-os/modules/spatial/types/seat-desk"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { listBuildings } from "@/add-os/services/buildings"
import { listFloors } from "@/add-os/services/floors"
import { listSpaces } from "@/add-os/services/spaces"
import { listZones } from "@/add-os/services/zones"
import { formatNumber } from "@/add-os/utils/format"

export function buildSeatDeskColumns(t: ComposerTranslation): DataTableColumns<SeatDesk> {
	return [
		{ title: t("seatsDesks.columns.space"), key: "space_id", render: row => `#${row.space_id}` },
		{ title: t("seatsDesks.columns.label"), key: "label" },
		{
			title: t("seatsDesks.columns.qrPointId"),
			key: "qr_point_id",
			render: row => (row.qr_point_id !== null ? formatNumber(row.qr_point_id) : "—")
		}
	]
}

interface SeatDeskFormModel extends SeatDeskPayload {
	branch_id: number
	building_id: number
	zone_id: number | null
}

export function buildSeatDeskFields(branches: Branch[], locale: SupportedLocale): FieldDescriptor<SeatDeskFormModel>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		{ key: "branch_id", labelKey: "seatsDesks.form.branch", type: "select", required: true, options: branchOptions, virtual: true },
		{
			key: "building_id",
			labelKey: "seatsDesks.form.building",
			type: "select",
			required: true,
			dependsOn: "branch_id",
			virtual: true,
			optionsFrom: async ({ branch_id }) => {
				if (!branch_id) return []
				const buildings = await listBuildings(branch_id as number)
				return buildings.map(building => ({ label: pickLocalized(building.name, locale), value: building.id }))
			}
		},
		{
			key: "zone_id",
			labelKey: "seatsDesks.form.zone",
			type: "select",
			dependsOn: "building_id",
			virtual: true,
			optionsFrom: async ({ building_id }) => {
				if (!building_id) return []
				const floors = await listFloors(building_id as number)
				const zonesByFloor = await Promise.all(floors.map(floor => listZones(floor.id)))
				return zonesByFloor.flat().map(zone => ({ label: zone.label, value: zone.id }))
			}
		},
		{
			key: "space_id",
			labelKey: "seatsDesks.form.space",
			type: "select",
			required: true,
			dependsOn: ["building_id", "zone_id"],
			optionsFrom: async ({ building_id, zone_id }) => {
				if (!building_id) return []
				const spaces = await listSpaces({ building_id: building_id as number, zone_id: (zone_id as number) || undefined })
				return spaces.filter(space => space.space_type === "co_space").map(space => ({ label: `Co-working space #${space.id}`, value: space.id }))
			}
		},
		{ key: "label", labelKey: "seatsDesks.form.label", type: "text", required: true },
		{ key: "qr_point_id", labelKey: "seatsDesks.form.qrPointId", type: "number" }
	]
}

export function emptySeatDeskPayload(): SeatDeskFormModel {
	return { branch_id: 0, building_id: 0, zone_id: null, space_id: 0, label: "", qr_point_id: null }
}
```

The `space_id` option label is a plain literal `"Co-working space #<id>"` here rather than `t("spaces.spaceType.co_space")` — since every option in this particular list is a co_space by construction (the filter above), interpolating the same translated word into every single option would be redundant; a future pass could still route it through `t()` if the fixed English phrasing is ever a concern, but as-is it costs nothing to fix since the filter already guarantees the value.

- [ ] **Step 6: Write the view**

```vue
<!-- src/add-os/modules/spatial/views/SeatsDesksPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.seatsDesks") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('seatsDesks.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("seatsDesks.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="row => mutations.remove(row.id)" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:mode
			:title="mode === 'create' ? t('seatsDesks.create.title') : t('seatsDesks.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { SeatDesk, SeatDeskPayload } from "@/add-os/modules/spatial/types/seat-desk"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildSeatDeskColumns, buildSeatDeskFields, emptySeatDeskPayload } from "@/add-os/modules/spatial/config/seats-desks.config"
import { listBranches } from "@/add-os/services/branches"
import { createSeatDesk, listSeatsDesks, removeSeatDesk, updateSeatDesk } from "@/add-os/services/seats-desks"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data: branches } = useResourceList<Branch>(listBranches)

const { data, isLoading, error, refetch } = useResourceList<SeatDesk>(() => listSeatsDesks())
const columns = computed(() => buildSeatDeskColumns(t))
const fields = computed(() => buildSeatDeskFields(branches.value, currentLocale.value))

const mutations = useResourceMutations({ create: createSeatDesk, update: updateSeatDesk, remove: removeSeatDesk }, refetch, {
	createSuccess: t("seatsDesks.create.success"),
	updateSuccess: t("seatsDesks.edit.success"),
	deleteSuccess: t("seatsDesks.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref(emptySeatDeskPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptySeatDeskPayload()
	drawerVisible.value = true
}

function openEdit(row: SeatDesk) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		branch_id: 0,
		building_id: 0,
		zone_id: null,
		space_id: row.space_id,
		label: row.label,
		qr_point_id: row.qr_point_id
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as SeatDeskPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as SeatDeskPayload)
	}
}
</script>
```

- [ ] **Step 7: Wire into navigation**

In `src/add-os/navigation/sections.ts`, add `seatsDesks` right after `resources` — this completes the `spatial` section's 7 pages:

```ts
		pages: [
			{ key: "branches", path: "branches" },
			{ key: "buildings", path: "buildings" },
			{ key: "floors", path: "floors" },
			{ key: "zones", path: "zones" },
			{ key: "spaces", path: "spaces" },
			{ key: "resources", path: "resources" },
			{ key: "seatsDesks", path: "seats-desks" }
		]
```

In `src/add-os/navigation/routes.ts`:

```ts
import SeatsDesksPage from "@/add-os/modules/spatial/views/SeatsDesksPage.vue"
```

```ts
const PAGE_COMPONENTS: Record<string, unknown> = {
	"system.roles": RolesPage,
	"system.users": UsersPage,
	"spatial.branches": BranchesPage,
	"spatial.buildings": BuildingsPage,
	"spatial.floors": FloorsPage,
	"spatial.zones": ZonesPage,
	"spatial.spaces": SpacesPage,
	"spatial.resources": ResourcesPage,
	"spatial.seatsDesks": SeatsDesksPage
}
```

- [ ] **Step 8: Add i18n**

Add to `src/add-os/lang/en/en.json`:

```json
	"seatsDesks": {
		"columns": { "space": "Space", "label": "Label", "qrPointId": "QR point" },
		"create": { "button": "New seat/desk", "title": "New seat/desk", "success": "Seat/desk created." },
		"edit": { "title": "Edit seat/desk", "success": "Seat/desk updated." },
		"delete": { "success": "Seat/desk deleted." },
		"form": {
			"branch": "Branch",
			"building": "Building",
			"zone": "Zone (optional)",
			"space": "Space",
			"label": "Label",
			"qrPointId": "QR point ID (optional)"
		},
		"loadError": "Couldn't load seats & desks. You may not have permission to view this page."
	},
```

```json
			"seatsDesks": "Seats & Desks",
```

Add to `src/add-os/lang/ar/ar.json`:

```json
	"seatsDesks": {
		"columns": { "space": "المساحة", "label": "التسمية", "qrPointId": "نقطة QR" },
		"create": { "button": "مقعد/طاولة جديدة", "title": "مقعد/طاولة جديدة", "success": "تم إنشاء المقعد/الطاولة." },
		"edit": { "title": "تعديل المقعد/الطاولة", "success": "تم تحديث المقعد/الطاولة." },
		"delete": { "success": "تم حذف المقعد/الطاولة." },
		"form": {
			"branch": "الفرع",
			"building": "المبنى",
			"zone": "المنطقة (اختياري)",
			"space": "المساحة",
			"label": "التسمية",
			"qrPointId": "معرّف نقطة QR (اختياري)"
		},
		"loadError": "تعذّر تحميل المقاعد والطاولات. قد لا تملك صلاحية عرض هذه الصفحة."
	},
```

```json
			"seatsDesks": "المقاعد والطاولات",
```

- [ ] **Step 9: Run the full i18n parity guard, navigation guard, and offline-icon guard**

Run: `pnpm vitest run src/add-os/lang/__tests__/messages.spec.ts src/add-os/navigation/__tests__/navigation.spec.ts src/add-os/assets/__tests__/icons.spec.ts`
Expected: PASS.

- [ ] **Step 10: Run the full test suite and type-check**

Run: `pnpm vitest run && pnpm type-check`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/add-os/modules/spatial/types/seat-desk.ts src/add-os/services/seats-desks.ts src/add-os/services/__tests__/seats-desks.spec.ts src/add-os/modules/spatial/config/seats-desks.config.ts src/add-os/modules/spatial/views/SeatsDesksPage.vue src/add-os/navigation/sections.ts src/add-os/navigation/routes.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add Seats & Desks CRUD screen, completing the spatial hierarchy PoC"
```

---

## Task 15: Full-suite verification and the one-time RTL smoke check

**Files:** none created — this task verifies everything Tasks 1-14 built, together.

**Interfaces:** none — this is a verification task, not a code-producing one.

- [ ] **Step 1: Run the complete automated suite**

```bash
pnpm vitest run
pnpm lint
pnpm type-check
```

Expected: all three PASS. `pnpm vitest run` covers every guard test that ran piecemeal in Tasks 1-14 (`messages.spec.ts`, `navigation.spec.ts`, `icons.spec.ts`, `no-secrets.spec.ts`, `no-runtime-theming.spec.ts`, `no-external-urls.spec.ts`, `tokens.spec.ts`) plus every new test this plan added, all together for the first time — a guard that only ever ran alongside a subset of the new files could still be masking an interaction the full run catches.

If `pnpm lint` reports issues, run `pnpm lint` again (its script is `eslint . --fix`, so it self-corrects most style issues) and re-review any it couldn't auto-fix.

- [ ] **Step 2: Manual ar/en × RTL/LTR smoke check on the two generic components**

Per spec §12: Naive UI's `n-data-table` is flagged RTL-beta by the vendor, and this PoC is its first production use anywhere in ADD OS. Run the dev server and, on any one of the 7 new pages (Branches is simplest — no cascading selects to also exercise):

```bash
pnpm dev
```

Check, in both `العربية` and `English` (the toggle already in the shell), on `/spatial/branches`:
1. Column headers and row content align correctly (no overlapping/clipped text at either direction).
2. The "New branch" button, its icon, and the table's action buttons mirror correctly (icon/text order flips in RTL, not just alignment).
3. Open the create drawer: it slides from the correct edge for the direction (right edge in LTR, left edge in RTL is `n-drawer`'s default `placement="right"` — confirm it visually reads correctly in RTL, i.e. the drawer still opens from the trailing edge of reading direction, not a hardcoded physical side).
4. The bilingual `name`/`city` fields: two side-by-side inputs — confirm their visual order (Arabic-first vs English-first) reads sensibly in both directions, not just always left-to-right regardless of language.
5. Repeat steps 1-4 once on `/spatial/spaces`, specifically to exercise a cascading select (`building_id` populating after `branch_id`) and the status tag rendering (icon + border + text, not a bare colour) under both directions.

This is a manual pass, not an automated test — record any defect found as a follow-up note (not silently fixed mid-verification) so the fix gets its own reviewed change, per this project's `.claude/rules/i18n-rtl.md` ("stress-test complex components... before building deeply on them").

- [ ] **Step 3: Confirm no vendor file was touched**

```bash
git diff --stat main -- src/theme src/utils src/app-layouts src/components src/composables src/stores src/assets/scss _pinx-vendor
```

Expected: empty output. Every file this plan touches is under `src/add-os/**`, `src/router/index.ts` (read-only import, no edit), or `src/stores/auth.ts` (read-only import via `useAuthStore()`, no edit) — this step is the final, mechanical confirmation of the vendor boundary this plan committed to in its Global Constraints.

- [ ] **Step 4: Final summary commit (if anything from Step 1's `pnpm lint --fix` pass is unstaged)**

```bash
git status --short
```

If clean, there is nothing to commit — every substantive change was already committed at the end of its own task (Tasks 1-14). If `pnpm lint` auto-fixed anything not yet committed:

```bash
git add -A
git commit -m "chore(add-os): apply lint auto-fixes surfaced by the full-suite verification pass"
```

---

## Summary

14 resource/component tasks plus one verification task. The generic layer (Tasks 1-7) is genuinely resource-agnostic — every one of its tests uses a synthetic `Widget`/`Row`/`Model` type, never one of the 7 real resources — and Tasks 8-14 are the proof: each one adds a types file, a ~10-line service, a config file (columns + fields), and a thin view, with no new logic in the generic layer itself except the one deliberate, well-motivated extension in Task 12 (`ResourceTable`'s `extraActions` prop, needed the first time a resource wants a third row action). Device/DeviceCapability (spec §2) are explicitly out of scope but would follow the exact same recipe as Tasks 8-14 if taken up later.
