# Request Layer: lang/currency Headers + Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Adaptation note:** this plan was written and then executed inline, in the same
> session, by the same agent that wrote it — not handed to fresh subagents. The
> repo's global instructions forbid committing without an explicit user request, so
> the per-task "commit" steps below are written as the skill template requires but
> were **not** run automatically; commits happen only if/when the user asks.

**Goal:** Make `src/add-os/services/api.ts` send the backend's required `lang`/`currency`
headers on every request, and give list endpoints a non-breaking path to real pagination
metadata instead of silently truncating to page 1.

**Architecture:** One header-builder inside `api.ts`'s shared `request()` covers all five
verbs. Pagination gets a single shared type (`services/pagination.ts`) that tolerates a
response with or without Laravel's `meta`, an additive `listPage()` next to the existing
`list()` in `createResourceApi`, a same-shape console warning when `list()` silently
discards extra pages, and an optional `page` ref + `meta` output on `useResourceList`
that existing callers never opt into.

**Tech Stack:** Vue 3 + TypeScript (strict), Vitest, no new dependencies.

**Spec:** The task brief pasted into this conversation (Arabic; not a separate file on
disk). Key source of truth verified against the codebase and against
`C:\Users\User\Desktop\Aleppo Digital District\ADDCore\postman\ADD-OS.postman_collection.json`
(the only `ADD-OS.postman_collection.json` found under `Aleppo Digital District` — confirmed
there is no separate "smaller" collection to disambiguate against).

## Global Constraints

- Edit only `src/add-os/**` (category A). Never edit vendor `src/**` (category C) or
  `_pinx-vendor/**`. If a fix seems to need a template file, say so instead of doing it.
- Zero behavior change for the seven spatial screens (`BranchesPage`, `BuildingsPage`,
  `FloorsPage`, `ZonesPage`, `SpacesPage`, `SeatsDesksPage`, `ResourcesPage`) and for
  `UsersPage`/`RolesPage`. `list()`'s existing `T[]`-returning signature is untouched.
- No invented backend contract. `meta`'s shape is NOT confirmed by any example response in
  the Postman collection (verified: no `meta`/`current_page`/`last_page` keys anywhere in
  that file). Code must accept "no meta" and "meta present" and must say, in a comment,
  which case is observed vs. assumed.
- Every new rule ships with a test, in one of the three named spec files — no new spec
  files invented (`services/__tests__/api.spec.ts`, `services/__tests__/resource-factory.spec.ts`,
  `composables/__tests__/useResourceList.spec.ts`).
- Header keys are `lang` and `currency`, lower-case exactly — confirmed at
  `ADD-OS.postman_collection.json` (e.g. lines 125–133, and the "List Error Logs" /
  "Get Error Log" / "Delete Error Log" requests around line 6611 — every request in the
  collection carries `{"key": "lang", "value": "{{lang}}"}` / `{"key": "currency", ...}`).
- No new currency store. `DEFAULT_CURRENCY` (`SYP`) from `@/add-os/utils/format/currency`
  is the sole source for now; recommend a per-request/user currency store as a follow-up,
  don't build it.
- No pagination UI in any table this task — layer only.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/add-os/services/api.ts` | *Modify.* One `buildDefaultHeaders()` used by the shared `request()`, so `lang`/`currency` ride every verb. |
| `src/add-os/services/auth.ts` | *Modify.* Doc comment on `getCsrfCookie()` explaining why it deliberately bypasses `api.ts` (decision, not a gap). |
| `src/add-os/services/pagination.ts` | *Create.* `PaginationMeta`, `Paginated<T>`, `RawPaginatedResponse<T>`, and `toPaginated()` — the one place that knows how to turn a raw list response into a page, with or without server `meta`. |
| `src/add-os/services/resource-factory.ts` | *Modify.* Adds `listPage()` next to `list()`; `list()` gains a same-behavior truncation warning. |
| `src/add-os/composables/useResourceList.ts` | *Modify.* Optional third `page` param + returned `meta`, additive only. |
| `src/add-os/services/__tests__/api.spec.ts` | *Modify.* New `describe` block for headers. |
| `src/add-os/services/__tests__/resource-factory.spec.ts` | *Modify.* New `describe` blocks for `listPage()` and the truncation warning. |
| `src/add-os/composables/__tests__/useResourceList.spec.ts` | *Modify.* New `describe` block for optional pagination. |

No file split needed — every touched file is already small and single-purpose.

---

### Task 1: `lang`/`currency` headers on every verb

**Files:**
- Modify: `src/add-os/services/api.ts`
- Test: `src/add-os/services/__tests__/api.spec.ts`

**Interfaces:**
- Produces: `buildDefaultHeaders(): Record<string, string>` (module-local, not exported —
  nothing outside `api.ts` needs it; tests exercise it indirectly through `get/post/put/patch/del`).
- Consumes: `currentLocale` (`@/add-os/lang/currentLocale`, a `Ref<SupportedLocale>`),
  `DEFAULT_CURRENCY` (`@/add-os/utils/format/currency`, the string `"SYP"`).

- [ ] **Step 1: Write the failing tests**

Change the top import line of `src/add-os/services/__tests__/api.spec.ts` from:

```ts
import { get, patch } from "../api"
```

to:

```ts
import { del, get, patch, post, put } from "../api"
```

Add these imports alongside the existing ones at the top of the file:

```ts
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import { DEFAULT_LOCALE } from "@/add-os/lang/locales"
import { DEFAULT_CURRENCY } from "@/add-os/utils/format/currency"
```

Append this new `describe` block at the end of the file (after the `describe("401 handling", ...)` block):

```ts
describe("default headers (lang/currency)", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } })
		)
	})

	afterEach(() => {
		setCurrentLocale(DEFAULT_LOCALE)
	})

	it.each([
		["GET", () => get("/api/v1/admin/widgets")],
		["POST", () => post("/api/v1/admin/widgets", {})],
		["PUT", () => put("/api/v1/admin/widgets/1", {})],
		["PATCH", () => patch("/api/v1/admin/widgets/1", {})],
		["DELETE", () => del("/api/v1/admin/widgets/1")]
	] as const)("sends lang and currency on %s", async (_method: string, run: () => Promise<unknown>) => {
		await run()

		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({ lang: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY })
			})
		)
	})

	it("reads currentLocale at request time, so a language switch applies to the next request", async () => {
		await get("/api/v1/admin/widgets")
		expect(fetch).toHaveBeenLastCalledWith(
			expect.any(String),
			expect.objectContaining({ headers: expect.objectContaining({ lang: "ar" }) })
		)

		setCurrentLocale("en")
		await get("/api/v1/admin/widgets")
		expect(fetch).toHaveBeenLastCalledWith(
			expect.any(String),
			expect.objectContaining({ headers: expect.objectContaining({ lang: "en" }) })
		)
	})

	it("lets caller-supplied headers override the lang/currency default", async () => {
		await get("/api/v1/admin/widgets", undefined, { currency: "USD" })

		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({ currency: "USD", lang: DEFAULT_LOCALE })
			})
		)
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/add-os/services/__tests__/api.spec.ts`
Expected: FAIL — the new `describe("default headers...")` assertions fail because `fetch` is
not called with `lang`/`currency` headers yet.

- [ ] **Step 3: Implement**

In `src/add-os/services/api.ts`, add two imports after the existing `import { apiUrl } from "../config/env"` line:

```ts
import { currentLocale } from "@/add-os/lang/currentLocale"
import { DEFAULT_CURRENCY } from "@/add-os/utils/format/currency"
```

Add this function directly after `readXsrfToken` (before `buildUrl`):

```ts
/**
 * Headers every ADD OS request carries, on every verb, with no exceptions.
 * The backend expects `lang`/`currency` (lower-case, exactly — see
 * ADD-OS.postman_collection.json) on every endpoint, admin dashboard included.
 *
 * Read at request time, not import time: `currentLocale` is a ref so a
 * language switch takes effect on the very next request, without a reload.
 *
 * Currency has no per-user store yet (out of scope here) — every request
 * currently uses the single app-wide DEFAULT_CURRENCY. A caller can still
 * override it per-request via `options.headers`, which layers on top of
 * this and wins (see `request()` below).
 */
function buildDefaultHeaders(): Record<string, string> {
	return {
		"Accept": "application/json",
		"Content-Type": "application/json",
		"lang": currentLocale.value,
		"currency": DEFAULT_CURRENCY
	}
}
```

In `request()`, replace:

```ts
	const headers: Record<string, string> = {
		"Accept": "application/json",
		"Content-Type": "application/json",
		...(options?.headers || {})
	}
```

with:

```ts
	const headers: Record<string, string> = {
		...buildDefaultHeaders(),
		...(options?.headers || {})
	}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/add-os/services/__tests__/api.spec.ts`
Expected: PASS, including the pre-existing `patch` and `401 handling` blocks (unmodified).

- [ ] **Step 5: Commit** *(only if the user asks for a commit — see the adaptation note above)*

```bash
git add src/add-os/services/api.ts src/add-os/services/__tests__/api.spec.ts
git commit -m "feat(add-os): send lang/currency headers on every API request"
```

---

### Task 2: Exempt `getCsrfCookie()` explicitly

**Files:**
- Modify: `src/add-os/services/auth.ts`

**Interfaces:** none — comment-only change, no signature or behavior change, no test file
exists for `auth.ts` today and none is added (nothing testable changed).

- [ ] **Step 1: Add the decision as a comment**

In `src/add-os/services/auth.ts`, replace the existing doc comment on `getCsrfCookie`:

```ts
/**
 * Request the CSRF cookie from the API. Must be called first.
 * Sends credentials so the cookie is set across the API origin.
 */
export async function getCsrfCookie(): Promise<void> {
```

with:

```ts
/**
 * Request the CSRF cookie from the API. Must be called first.
 * Sends credentials so the cookie is set across the API origin.
 *
 * Deliberately bypasses api.ts's request() and so does NOT carry the
 * `lang`/`currency` headers every other endpoint gets: this hits Laravel
 * Sanctum's framework-level `/sanctum/csrf-cookie` route directly, which
 * returns no body and has no localized content to negotiate. Routing it
 * through request() would also risk firing request()'s 401 → logout +
 * redirect-to-/login side effect during the pre-login cookie-priming step,
 * before there is a session to log out of. Exempted on purpose, not an
 * oversight.
 */
export async function getCsrfCookie(): Promise<void> {
```

- [ ] **Step 2: Verify nothing else changed**

Run: `pnpm vitest run` (full suite) — no test targets `auth.ts` directly today, so this step
is a diff review, not a test run: confirm the diff touches only the comment.

- [ ] **Step 3: Commit** *(only on request)*

```bash
git add src/add-os/services/auth.ts
git commit -m "docs(add-os): explain why getCsrfCookie bypasses the shared request layer"
```

---

### Task 3: Shared pagination type + normalizer

**Files:**
- Create: `src/add-os/services/pagination.ts`
- Test: covered indirectly through Task 4's `resource-factory.spec.ts` additions (per the
  brief's own list of the three spec files to extend — no standalone `pagination.spec.ts`).

**Interfaces:**
- Produces:
  - `interface PaginationMeta { current_page: number; last_page: number; per_page: number; total: number }`
  - `interface Paginated<T> { data: T[]; meta: PaginationMeta; links?: unknown }`
  - `interface RawPaginatedResponse<T> { data: T[]; meta?: Partial<PaginationMeta>; links?: unknown }`
  - `function toPaginated<T>(raw: RawPaginatedResponse<T>): Paginated<T>`
- Consumes: nothing (leaf module, no imports needed).

- [ ] **Step 1: Create the file**

```ts
/**
 * ADD OS — pagination shape shared by every list endpoint that paginates.
 *
 * Laravel's paginator `meta` is NOT confirmed for every endpoint from the
 * backend — ADD-OS.postman_collection.json documents some endpoints as
 * "paginated (N per page)" in prose (e.g. Error Logs) but ships no example
 * response with a `meta` block anywhere in the collection. `toPaginated`
 * therefore accepts a response with or without `meta` and never invents a
 * field Laravel doesn't send; a response with no `meta` is treated as a
 * single complete page — synthesized, not observed (see the function doc
 * below for exactly what that means).
 */

export interface PaginationMeta {
	current_page: number
	last_page: number
	per_page: number
	total: number
}

export interface Paginated<T> {
	data: T[]
	meta: PaginationMeta
	/** Laravel's paginator also sends `links`; untyped and optional since no caller needs it yet. */
	links?: unknown
}

/** What a list endpoint actually sends today: `data` always, `meta`/`links` maybe. */
export interface RawPaginatedResponse<T> {
	data: T[]
	meta?: Partial<PaginationMeta>
	links?: unknown
}

/**
 * Normalizes a list response into `Paginated<T>`.
 *
 * When the backend sends `meta.current_page`, that meta is trusted as-is —
 * any missing sub-field falls back to a value derived from `data`, never
 * invented out of thin air. When there is no `meta` at all — true for every
 * spatial endpoint observed today — this SYNTHESIZES a single-page meta
 * from `data.length`. That synthesis is a guess that "no more pages exist,"
 * not a fact confirmed from the backend.
 */
export function toPaginated<T>(raw: RawPaginatedResponse<T>): Paginated<T> {
	const total = raw.data.length

	if (raw.meta && typeof raw.meta.current_page === "number") {
		return {
			data: raw.data,
			meta: {
				current_page: raw.meta.current_page,
				last_page: raw.meta.last_page ?? 1,
				per_page: raw.meta.per_page ?? total,
				total: raw.meta.total ?? total
			},
			links: raw.links
		}
	}

	return {
		data: raw.data,
		meta: { current_page: 1, last_page: 1, per_page: total, total }
	}
}
```

- [ ] **Step 2: Type-check it in isolation**

Run: `pnpm vue-tsc --noEmit -p tsconfig.app.json` (or the project's `type-check` script once
Task 4/5 also compile — this file has no dependents yet, so a full pass is deferred to the
final verification task). If a faster targeted check is wanted: `pnpm tsc --noEmit src/add-os/services/pagination.ts` is not reliable standalone (no project config) — skip ahead to Task 4 which exercises this file via real tests instead.

- [ ] **Step 3: Commit** *(only on request — bundle with Task 4, since this file has no test of its own)*

---

### Task 4: `listPage()` on `createResourceApi` + silent-truncation warning

**Files:**
- Modify: `src/add-os/services/resource-factory.ts`
- Test: `src/add-os/services/__tests__/resource-factory.spec.ts`

**Interfaces:**
- Consumes: `Paginated<T>`, `RawPaginatedResponse<T>`, `toPaginated` from `./pagination` (Task 3).
- Produces: `createResourceApi<T, ...>(...).listPage: (query?: Record<string, unknown>) => Promise<Paginated<T>>`,
  alongside the unchanged `list: (query?) => Promise<T[]>`.

- [ ] **Step 1: Write the failing tests**

Append to `src/add-os/services/__tests__/resource-factory.spec.ts`, inside the existing
`describe("createResourceApi", ...)` block (after the `remove()` test, before its closing `})`):

```ts
	describe("listPage()", () => {
		it("returns data and meta for a paginated response", async () => {
			vi.mocked(fetch).mockResolvedValue(
				jsonResponse({
					data: [{ id: 1, label: "A" }],
					meta: { current_page: 1, last_page: 3, per_page: 20, total: 45 }
				})
			)

			const page = await api.listPage()

			expect(fetch).toHaveBeenCalledWith(
				"http://api.test/api/v1/admin/widgets",
				expect.objectContaining({ method: "GET" })
			)
			expect(page.data).toEqual([{ id: 1, label: "A" }])
			expect(page.meta).toEqual({ current_page: 1, last_page: 3, per_page: 20, total: 45 })
		})

		it("synthesizes a single-page meta when the backend sends none", async () => {
			vi.mocked(fetch).mockResolvedValue(
				jsonResponse({ data: [{ id: 1, label: "A" }, { id: 2, label: "B" }] })
			)

			const page = await api.listPage()

			expect(page.data).toHaveLength(2)
			expect(page.meta).toEqual({ current_page: 1, last_page: 1, per_page: 2, total: 2 })
		})
	})

	describe("list() silent-truncation guard", () => {
		let warnSpy: ReturnType<typeof vi.spyOn>

		beforeEach(() => {
			warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
		})

		afterEach(() => {
			warnSpy.mockRestore()
		})

		it("warns and names the endpoint when the response has more pages than list() exposes", async () => {
			vi.mocked(fetch).mockResolvedValue(
				jsonResponse({
					data: [{ id: 1, label: "A" }],
					meta: { current_page: 1, last_page: 2, per_page: 1, total: 2 }
				})
			)

			const widgets = await api.list()

			expect(widgets).toEqual([{ id: 1, label: "A" }])
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("/api/v1/admin/widgets"))
		})

		it("does not warn when there is only one page", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [{ id: 1, label: "A" }] }))

			await api.list()

			expect(warnSpy).not.toHaveBeenCalled()
		})

		it("does not warn when meta is present but last_page is 1", async () => {
			vi.mocked(fetch).mockResolvedValue(
				jsonResponse({
					data: [{ id: 1, label: "A" }],
					meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 }
				})
			)

			await api.list()

			expect(warnSpy).not.toHaveBeenCalled()
		})
	})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/add-os/services/__tests__/resource-factory.spec.ts`
Expected: FAIL — `api.listPage` is not a function yet; the truncation-warning tests fail
because nothing warns yet.

- [ ] **Step 3: Implement**

Replace the full contents of `src/add-os/services/resource-factory.ts` with:

```ts
import type { Paginated, RawPaginatedResponse } from "./pagination"
import { del, get, post, put } from "./api"
import { toPaginated } from "./pagination"

/**
 * Exported (not just module-local): `vue-tsc --build --force` emits
 * declaration files (`composite: true`), and any consumer that re-exports
 * `api.update`/`api.remove` at module scope — e.g. `export const updateX =
 * api.update` — has this type in its own public signature. An unexported name
 * referenced from another module's declaration output is TS4023 ("cannot be
 * named"), so this must stay exported for every resource service to type-check.
 */
export interface MessageResponse {
	message?: string
}

/**
 * `list()` discards `meta` by contract (every existing caller wants `T[]`).
 * If the backend paginated the response and this is only page 1 of more,
 * that's a table quietly showing partial data — this warns loudly in that
 * case, naming the endpoint, so the fix (switch the caller to `listPage()`)
 * is obvious. Unconditional in every environment: a partially-shown table
 * is exactly as wrong in production as it is in development.
 */
function warnIfTruncated(baseEndpoint: string, raw: RawPaginatedResponse<unknown>): void {
	const lastPage = raw.meta?.last_page
	if (typeof lastPage === "number" && lastPage > 1) {
		console.warn(
			`[ADD OS] ${baseEndpoint} list() returned page ${raw.meta?.current_page ?? 1} of ${lastPage} and discarded the rest. ` +
				"Switch this caller to listPage() to see every row."
		)
	}
}

/**
 * One factory for the five verbs every admin resource in this codebase exposes
 * identically. `update()` returns the raw `{message}` body, never the entity —
 * every one of these 7 endpoints returns a message-only body on update, so a
 * caller that wants the new state must refetch (see useResourceMutations).
 *
 * `list()` keeps returning `T[]` — every existing caller depends on that. Use
 * `listPage()` for a caller that needs real pagination (`data` + `meta`); see
 * ./pagination.ts for what `meta` is and is not confirmed to contain.
 */
export function createResourceApi<T, CreatePayload = Partial<T>, UpdatePayload = Partial<T>>(baseEndpoint: string) {
	return {
		list: (query?: Record<string, unknown>) =>
			get<RawPaginatedResponse<T>>(baseEndpoint, query).then(r => {
				warnIfTruncated(baseEndpoint, r)
				return r.data
			}),
		listPage: (query?: Record<string, unknown>): Promise<Paginated<T>> =>
			get<RawPaginatedResponse<T>>(baseEndpoint, query).then(toPaginated),
		getById: (id: number) => get<{ data: T }>(`${baseEndpoint}/${id}`).then(r => r.data),
		create: (payload: CreatePayload) => post<{ data: T }>(baseEndpoint, payload).then(r => r.data),
		update: (id: number, payload: UpdatePayload) => put<MessageResponse>(`${baseEndpoint}/${id}`, payload),
		remove: (id: number) => del<MessageResponse>(`${baseEndpoint}/${id}`)
	}
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/add-os/services/__tests__/resource-factory.spec.ts`
Expected: PASS, including all six pre-existing tests (`list`, `list(query)`, `getById`,
`create`, `update`, `remove`) unmodified.

- [ ] **Step 5: Commit** *(only on request)*

```bash
git add src/add-os/services/pagination.ts src/add-os/services/resource-factory.ts src/add-os/services/__tests__/resource-factory.spec.ts
git commit -m "feat(add-os): add listPage() and warn on silently truncated list() pages"
```

---

### Task 5: Optional pagination on `useResourceList`

**Files:**
- Modify: `src/add-os/composables/useResourceList.ts`
- Test: `src/add-os/composables/__tests__/useResourceList.spec.ts`

**Interfaces:**
- Consumes: `Paginated<T>`, `PaginationMeta` from `@/add-os/services/pagination` (Task 3).
- Produces: `useResourceList<T>(list: (query?) => Promise<T[] | Paginated<T>>, query？: Ref<Record<string, unknown> | undefined>, page?: Ref<number>): { data: Ref<T[]>, isLoading: Ref<boolean>, error: Ref<ApiError|null>, refetch: () => Promise<void>, meta: Ref<PaginationMeta | undefined> }`.
  The first two params keep their exact prior types; `page` is new and optional; `meta` is a
  new field on the returned object, additive only.

- [ ] **Step 1: Write the failing tests**

Append to `src/add-os/composables/__tests__/useResourceList.spec.ts`, after the existing
four tests inside `describe("useResourceList", ...)` (before its closing `})`):

```ts
	describe("pagination (optional)", () => {
		it("exposes meta when list() resolves a Paginated<T>", async () => {
			const list = vi.fn().mockResolvedValue({
				data: [{ id: 1 }],
				meta: { current_page: 1, last_page: 4, per_page: 10, total: 40 }
			})

			const { data, meta } = useResourceList(list)
			await nextTick()
			await nextTick()

			expect(data.value).toEqual([{ id: 1 }])
			expect(meta.value).toEqual({ current_page: 1, last_page: 4, per_page: 10, total: 40 })
		})

		it("leaves meta undefined when list() resolves a plain array", async () => {
			const list = vi.fn().mockResolvedValue([{ id: 1 }])

			const { meta } = useResourceList(list)
			await nextTick()
			await nextTick()

			expect(meta.value).toBeUndefined()
		})

		it("merges a page ref into the query and refetches when it changes", async () => {
			const list = vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } })
			const page = ref(1)

			useResourceList(list, undefined, page)
			await nextTick()
			await nextTick()

			expect(list).toHaveBeenLastCalledWith({ page: 1 })

			page.value = 2
			await nextTick()
			await nextTick()

			expect(list).toHaveBeenLastCalledWith({ page: 2 })
		})

		it("combines an existing query with the page ref", async () => {
			const list = vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } })
			const query = ref<Record<string, unknown> | undefined>({ branch_id: 1 })
			const page = ref(1)

			useResourceList(list, query, page)
			await nextTick()
			await nextTick()

			expect(list).toHaveBeenLastCalledWith({ branch_id: 1, page: 1 })
		})
	})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/add-os/composables/__tests__/useResourceList.spec.ts`
Expected: FAIL — `meta` is `undefined` on the returned object (property doesn't exist) and
the composable doesn't accept a third `page` argument yet.

- [ ] **Step 3: Implement**

Replace the full contents of `src/add-os/composables/useResourceList.ts` with:

```ts
import type { Ref } from "vue"
import type { Paginated, PaginationMeta } from "@/add-os/services/pagination"
import { ref, watch } from "vue"
import { ApiError } from "@/add-os/services/api"

export function useResourceList<T>(
	list: (query?: Record<string, unknown>) => Promise<T[] | Paginated<T>>,
	query?: Ref<Record<string, unknown> | undefined>,
	page?: Ref<number>
) {
	const data = ref<T[]>([]) as Ref<T[]>
	const meta = ref<PaginationMeta | undefined>(undefined) as Ref<PaginationMeta | undefined>
	const isLoading = ref(true)
	const error = ref<ApiError | null>(null)

	async function refetch() {
		isLoading.value = true
		error.value = null
		try {
			const effectiveQuery = page ? { ...(query?.value ?? {}), page: page.value } : query?.value
			const result = await list(effectiveQuery)
			if (Array.isArray(result)) {
				data.value = result
				meta.value = undefined
			} else {
				data.value = result.data
				meta.value = result.meta
			}
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			error.value = caught
			data.value = []
			meta.value = undefined
		} finally {
			isLoading.value = false
		}
	}

	if (page) {
		watch([query ?? ref(undefined), page], refetch, { immediate: true })
	} else if (query) {
		watch(query, refetch, { immediate: true })
	} else {
		refetch()
	}

	return { data, isLoading, error, refetch, meta }
}
```

Note the `if (page) {...} else if (query) {...} else {...}` structure is deliberate: when
`page` is not passed (every existing call site today), the second and third branches are
byte-identical to the pre-change code, so existing behavior is provably unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/add-os/composables/__tests__/useResourceList.spec.ts`
Expected: PASS, including all four pre-existing tests unmodified.

- [ ] **Step 5: Commit** *(only on request)*

```bash
git add src/add-os/composables/useResourceList.ts src/add-os/composables/__tests__/useResourceList.spec.ts
git commit -m "feat(add-os): add optional page/meta support to useResourceList"
```

---

### Task 6: Full verification + written findings

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite, including architecture guards**

Run: `pnpm test:unit` (the project's actual script — `pnpm test` does not exist in
`package.json`; `CLAUDE.md`'s note to verify this against `package.json` is confirmed true).
Expected: PASS, all suites including `no-external-urls.spec.ts`, `no-secrets.spec.ts`,
`no-runtime-theming.spec.ts`.

- [ ] **Step 2: Type-check**

Run: `pnpm type-check` (this repo's actual script name; not `pnpm typecheck`).
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors (this also normalizes import ordering in the touched files).

- [ ] **Step 4: Confirm no file outside `src/add-os/**` changed**

Run: `git status --porcelain -- ':!src/add-os' ':(exclude)docs/superpowers/plans/**'` (or
review `git diff --stat` against the base) and confirm it only shows this plan file and
files already listed above.

- [ ] **Step 5: Write the closing report**

In the chat response (not a new file), state plainly:
- What was verified as real (the `lang`/`currency` header keys and their exact casing, from
  the Postman collection).
- What was assumed and is unconfirmed (the `meta` shape — no example response in the
  collection contains `current_page`/`last_page`/`per_page`/`total`; the "no-meta ⇒
  single page" synthesis is a guess, not a fact).
- What was deferred as a recommendation, not built: a per-user/request currency store, and
  pagination UI elements on any table.

---

## Self-Review (completed while writing this plan)

1. **Spec coverage:** headers (Task 1) — done; `getCsrfCookie` decision (Task 2) — done;
   shared pagination type (Task 3) — done; `listPage()` + truncation warning (Task 4) —
   done; `useResourceList` optional pagination (Task 5) — done; full verification + report
   (Task 6) — done. No spec section without a task.
2. **Placeholder scan:** none found — every step has real code, not a description of code.
3. **Type consistency:** `Paginated<T>` / `PaginationMeta` / `RawPaginatedResponse<T>` are
   defined once in Task 3 and imported with the same names in Tasks 4 and 5; `listPage`
   name matches between Task 4's implementation and Task 6's report language; `warnIfTruncated`
   is used only inside Task 4's own file, not referenced elsewhere.
