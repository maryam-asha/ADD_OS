# Users & Roles Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `ComingSoon` placeholder on the `system/users` and `system/roles`
routes with working screens backed by the real ADDCore API — the first real module
in ADD OS.

**Architecture:** A flat service layer (`services/users.ts`, `services/roles.ts`)
wraps `services/api.ts` (which gains a `patch()` export) and returns typed,
envelope-unwrapped data. Two page components in `add-os/modules/system/views/`
consume those services directly — no Pinia store, no per-module `routes.ts` (see
design doc §3 for why). `routes.ts` swaps `component: ComingSoon` for the two real
components; nothing else in the 26-page route table moves.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Naive UI (`NDataTable`, `NDrawer`,
`NModal`, `NForm`), Tailwind v4 utilities for layout, vue-i18n, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-11-users-roles-management-design.md`

## Global Constraints

- Zero hardcoded design values in `src/add-os/` — no hex, no `rgb()`, no raw px.
  Use Tailwind utility classes for layout/spacing/typography and existing CSS
  vars (e.g. the global `p { color: var(--fg-secondary-color) }` rule already
  covers subtitle text) — never a new `<style>` block with a literal px/hex.
- Every user-visible string goes through vue-i18n in **both** `ar` and `en`. No
  literal strings in templates. `pnpm test` runs `messages.spec.ts`, which fails
  the build on any key present in one language and not the other.
- New icons must be real Carbon icon names — `npm run icons` fails the build on a
  name that doesn't exist in `@iconify-json/carbon`. This plan uses exactly five
  new literals, all pre-verified to exist: `carbon:checkmark-filled`,
  `carbon:warning-alt-filled`, `carbon:error-filled`, `carbon:add`, `carbon:edit`.
- Response envelope is `{ data: T }` for one resource and `{ data: T[] }` for a
  collection (confirmed against ADDCore's controllers, not assumed) — every
  service function unwraps `.data` before returning.
- `UserRole = "member" | "operations" | "admin"`, `UserStatus = "active" |
  "deactivated" | "blocked"` — distinct from `types/auth.d.ts`'s route-guard
  `Role` type. Never conflate the two.
- Backend validation is the source of truth; client-side validation in this plan
  mirrors it exactly (phone `^09\d{8}$`, password ≥ 8 chars, create-role limited
  to `operations`/`admin`, assign-role allows all three) but the server's 422
  response is still what actually gets surfaced on a mismatch.
- Per the design doc §11, section-level admin-only gating (hiding "System" from
  the sidebar for `operations` accounts) is explicitly **out of scope** for this
  plan. Both pages must instead show a clear, translated error state when a
  request 403s, rather than a blank or broken screen.

---

### Task 1: `api.ts` gains `patch()`

**Files:**
- Modify: `src/add-os/services/api.ts`
- Test: `src/add-os/services/__tests__/api.spec.ts` (new)

**Interfaces:**
- Produces: `patch<T>(path: string, body?: unknown, query?: Record<string, unknown>, headers?: Record<string, string>, credentials?: RequestCredentials): Promise<T>` — consumed by `services/users.ts` in Task 4.

- [ ] **Step 1: Write the failing test**

Create `src/add-os/services/__tests__/api.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

import { patch } from "../api"

describe("patch", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("sends a PATCH request with a JSON body and returns the parsed response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ data: { id: 1, status: "blocked" } }), {
				status: 200,
				headers: { "content-type": "application/json" }
			})
		)

		const result = await patch<{ data: { id: number; status: string } }>(
			"/api/v1/admin/users/1/status",
			{ status: "blocked" }
		)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users/1/status",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify({ status: "blocked" })
			})
		)
		expect(result).toEqual({ data: { id: 1, status: "blocked" } })
	})

	it("throws ApiError with the parsed body when the response is not ok", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ message: "This action is unauthorized." }), {
				status: 403,
				headers: { "content-type": "application/json" }
			})
		)

		await expect(patch("/api/v1/admin/users/1/status", { status: "blocked" })).rejects.toMatchObject({
			status: 403,
			data: { message: "This action is unauthorized." }
		})
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/services/__tests__/api.spec.ts`
Expected: FAIL — `patch is not a function` (no such export in `api.ts` yet).

- [ ] **Step 3: Add `patch()` to `api.ts`**

In `src/add-os/services/api.ts`, insert immediately after the existing `put`
export (before `export async function del`):

```ts
export async function patch<T>(path: string, body?: unknown, query?: Record<string, unknown>, headers?: Record<string, string>, credentials?: RequestCredentials): Promise<T> {
	return request<T>("PATCH", path, { body, query, headers, credentials })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/add-os/services/__tests__/api.spec.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/services/api.ts src/add-os/services/__tests__/api.spec.ts
git commit -m "feat(add-os): add patch() to the API client"
```

---

### Task 2: System module types and validation helpers

**Files:**
- Create: `src/add-os/modules/system/types/user.ts`
- Create: `src/add-os/modules/system/utils/validation.ts`
- Test: `src/add-os/modules/system/utils/__tests__/validation.spec.ts`

**Interfaces:**
- Produces: `User`, `UserRole`, `UserStatus`, `CreateUserPayload`,
  `UpdateUserProfilePayload`, `UpdateUserStatusPayload` types; `isValidSyrianPhone(phone: string): boolean`, `isValidPassword(password: string): boolean` — consumed by `services/users.ts` (Task 4) and `UsersPage.vue` (Tasks 6–10).

- [ ] **Step 1: Create the types file (no test — exercised by every later task, verified by `type-check` in Task 11)**

Create `src/add-os/modules/system/types/user.ts`:

```ts
/**
 * Backend user-role domain (`Admin\StoreUserRequest` / `AssignRoleRequest`),
 * distinct from `types/auth.d.ts`'s route-guard `Role` — that one gates which
 * pages a session can reach; this one is a column on the `users` table.
 */
export type UserRole = "member" | "operations" | "admin"

export type UserStatus = "active" | "deactivated" | "blocked"

/** Shape of `UserResource` — every field ADDCore's API actually returns. */
export interface User {
	id: number
	name: string
	phone: string
	email: string
	preferred_language: string
	preferred_currency: string
	status: UserStatus
	roles: UserRole[]
}

/** `StoreUserRequest` — member is never offered: only ops/admin accounts are created here. */
export interface CreateUserPayload {
	name: string
	phone: string
	email: string
	password: string
	password_confirmation: string
	role: "operations" | "admin"
}

/** `UpdateUserRequest` — profile fields only, no password/role/status. */
export interface UpdateUserProfilePayload {
	name: string
	phone: string
	email: string
}

/** `UpdateUserStatusRequest` — `reason` is write-only, never echoed back by `UserResource`. */
export interface UpdateUserStatusPayload {
	status: UserStatus
	reason?: string
}
```

- [ ] **Step 2: Write the failing validation tests**

Create `src/add-os/modules/system/utils/__tests__/validation.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { isValidPassword, isValidSyrianPhone } from "../validation"

describe("isValidSyrianPhone", () => {
	it.each([
		["0988877766", true],
		["0912345678", true],
		["09123456", false], // too short
		["091234567890", false], // too long
		["+963988877766", false], // international prefix not accepted, matches backend
		["0888877766", false], // must start with 09
		["", false]
	])("treats %s as valid=%s", (phone, expected) => {
		expect(isValidSyrianPhone(phone)).toBe(expected)
	})
})

describe("isValidPassword", () => {
	it.each([
		["short7x", false], // 7 chars
		["exactly8", true], // 8 chars
		["a-longer-password", true],
		["", false]
	])("treats %s as valid=%s", (password, expected) => {
		expect(isValidPassword(password)).toBe(expected)
	})
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/add-os/modules/system/utils/__tests__/validation.spec.ts`
Expected: FAIL — cannot find module `../validation`.

- [ ] **Step 4: Implement `validation.ts`**

Create `src/add-os/modules/system/utils/validation.ts`:

```ts
/** Mirrors ADDCore's `App\Rules\SyrianPhoneNumber`: exactly `09` + 8 digits. */
const SYRIAN_PHONE_PATTERN = /^09\d{8}$/

export function isValidSyrianPhone(phone: string): boolean {
	return SYRIAN_PHONE_PATTERN.test(phone)
}

/** Mirrors `Password::defaults()` with no custom policy configured in ADDCore: min 8, nothing else. */
export function isValidPassword(password: string): boolean {
	return password.length >= 8
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/add-os/modules/system/utils/__tests__/validation.spec.ts`
Expected: PASS (11/11).

- [ ] **Step 6: Commit**

```bash
git add src/add-os/modules/system/types/user.ts src/add-os/modules/system/utils/validation.ts src/add-os/modules/system/utils/__tests__/validation.spec.ts
git commit -m "feat(add-os): add system module user types and validation helpers"
```

---

### Task 3: `services/roles.ts`

**Files:**
- Create: `src/add-os/services/roles.ts`
- Test: `src/add-os/services/__tests__/roles.spec.ts`

**Interfaces:**
- Consumes: `UserRole` (Task 2), `get` (existing, `services/api.ts`).
- Produces: `listRoles(): Promise<UserRole[]>` — consumed by `RolesPage.vue` (Task 5).

- [ ] **Step 1: Write the failing test**

Create `src/add-os/services/__tests__/roles.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

import { listRoles } from "../roles"

describe("listRoles", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("GETs the roles endpoint and unwraps the data envelope", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ data: ["member", "operations", "admin"] }), {
				status: 200,
				headers: { "content-type": "application/json" }
			})
		)

		const roles = await listRoles()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/roles", expect.objectContaining({ method: "GET" }))
		expect(roles).toEqual(["member", "operations", "admin"])
	})

	it("propagates ApiError on a 403", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ message: "This action is unauthorized." }), {
				status: 403,
				headers: { "content-type": "application/json" }
			})
		)

		await expect(listRoles()).rejects.toMatchObject({ status: 403 })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/services/__tests__/roles.spec.ts`
Expected: FAIL — cannot find module `../roles`.

- [ ] **Step 3: Implement `roles.ts`**

Create `src/add-os/services/roles.ts`:

```ts
import type { UserRole } from "@/add-os/modules/system/types/user"
import { get } from "./api"

/** The assignable role names, per `RoleController::index()` — no per-role permissions to fetch yet. */
export async function listRoles(): Promise<UserRole[]> {
	const res = await get<{ data: UserRole[] }>("/api/v1/admin/roles")
	return res.data
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/add-os/services/__tests__/roles.spec.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/services/roles.ts src/add-os/services/__tests__/roles.spec.ts
git commit -m "feat(add-os): add roles service"
```

---

### Task 4: `services/users.ts`

**Files:**
- Create: `src/add-os/services/users.ts`
- Test: `src/add-os/services/__tests__/users.spec.ts`

**Interfaces:**
- Consumes: `User`, `UserRole`, `CreateUserPayload`, `UpdateUserProfilePayload`, `UpdateUserStatusPayload` (Task 2); `get`, `post`, `put`, `patch` (Task 1 + existing `api.ts`).
- Produces: `listUsers`, `createUser`, `getUser`, `updateUserProfile`, `updateUserStatus`, `assignRole` — all consumed by `UsersPage.vue` (Tasks 6–10).

- [ ] **Step 1: Write the failing tests**

Create `src/add-os/services/__tests__/users.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

import { assignRole, createUser, getUser, listUsers, updateUserProfile, updateUserStatus } from "../users"

const sampleUser = {
	id: 1,
	name: "Rana Khoury",
	phone: "0988877766",
	email: "rana.khoury@add.local",
	preferred_language: "ar",
	preferred_currency: "SYP",
	status: "active",
	roles: ["operations"]
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("users service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listUsers GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleUser] }))

		const users = await listUsers()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/users", expect.objectContaining({ method: "GET" }))
		expect(users).toEqual([sampleUser])
	})

	it("listUsers appends ?role= when a filter is passed", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleUser] }))

		await listUsers({ role: "operations" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users?role=operations",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createUser POSTs the payload and unwraps the single resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleUser }, 201))

		const payload = {
			name: "Rana Khoury",
			phone: "0988877766",
			email: "rana.khoury@add.local",
			password: "a-strong-password",
			password_confirmation: "a-strong-password",
			role: "operations" as const
		}
		const user = await createUser(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(user).toEqual(sampleUser)
	})

	it("getUser GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleUser }))

		const user = await getUser(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/users/1", expect.objectContaining({ method: "GET" }))
		expect(user).toEqual(sampleUser)
	})

	it("updateUserProfile PUTs the profile fields", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleUser }))

		const payload = { name: "Rana Khoury-Haddad", phone: "0988877766", email: "rana.khoury@add.local" }
		await updateUserProfile(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
	})

	it("updateUserStatus PATCHes the status endpoint", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { ...sampleUser, status: "deactivated" } }))

		const payload = { status: "deactivated" as const, reason: "left the company" }
		const user = await updateUserStatus(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users/1/status",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify(payload) })
		)
		expect(user.status).toBe("deactivated")
	})

	it("assignRole PATCHes the role endpoint with { role }", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { ...sampleUser, roles: ["admin"] } }))

		const user = await assignRole(1, "admin")

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users/1/role",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify({ role: "admin" }) })
		)
		expect(user.roles).toEqual(["admin"])
	})

	it("propagates ApiError with validation errors on a 422", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "The given data was invalid.", errors: { phone: ["The phone has already been taken."] } }, 422)
		)

		await expect(
			createUser({
				name: "Rana Khoury",
				phone: "0988877766",
				email: "rana.khoury@add.local",
				password: "a-strong-password",
				password_confirmation: "a-strong-password",
				role: "operations"
			})
		).rejects.toMatchObject({ status: 422, data: { errors: { phone: ["The phone has already been taken."] } } })
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/add-os/services/__tests__/users.spec.ts`
Expected: FAIL — cannot find module `../users`.

- [ ] **Step 3: Implement `users.ts`**

Create `src/add-os/services/users.ts`:

```ts
import type {
	CreateUserPayload,
	UpdateUserProfilePayload,
	UpdateUserStatusPayload,
	User,
	UserRole
} from "@/add-os/modules/system/types/user"
import { get, patch, post, put } from "./api"

const BASE = "/api/v1/admin/users"

export async function listUsers(filter?: { role?: UserRole }): Promise<User[]> {
	const res = await get<{ data: User[] }>(BASE, filter?.role ? { role: filter.role } : undefined)
	return res.data
}

/** Admin-only: creates an operations or admin account. Members self-register from the app. */
export async function createUser(payload: CreateUserPayload): Promise<User> {
	const res = await post<{ data: User }>(BASE, payload)
	return res.data
}

export async function getUser(id: number): Promise<User> {
	const res = await get<{ data: User }>(`${BASE}/${id}`)
	return res.data
}

/** Profile fields only — status and role are separate actions, matching `UpdateUserRequest`. */
export async function updateUserProfile(id: number, payload: UpdateUserProfilePayload): Promise<User> {
	const res = await put<{ data: User }>(`${BASE}/${id}`, payload)
	return res.data
}

/** Setting `deactivated`/`blocked` revokes every session this user holds, immediately. */
export async function updateUserStatus(id: number, payload: UpdateUserStatusPayload): Promise<User> {
	const res = await patch<{ data: User }>(`${BASE}/${id}/status`, payload)
	return res.data
}

export async function assignRole(id: number, role: UserRole): Promise<User> {
	const res = await patch<{ data: User }>(`${BASE}/${id}/role`, { role })
	return res.data
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/add-os/services/__tests__/users.spec.ts`
Expected: PASS (8/8).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/services/users.ts src/add-os/services/__tests__/users.spec.ts
git commit -m "feat(add-os): add users service"
```

---

### Task 5: i18n content + `RolesPage.vue` + wire the `system.roles` route

**Files:**
- Modify: `src/add-os/lang/ar/ar.json`
- Modify: `src/add-os/lang/en/en.json`
- Create: `src/add-os/modules/system/views/RolesPage.vue`
- Modify: `src/add-os/navigation/routes.ts`

**Interfaces:**
- Consumes: `listRoles` (Task 3), `ApiError` (existing, `services/api.ts`).
- Produces: `roles.*` i18n namespace (reused by `UsersPage.vue`'s role tags in Task 6).

This is the smaller of the two pages — a good first vertical slice: real i18n
content, a real API call, a real route, before tackling the larger `UsersPage.vue`.

- [ ] **Step 1: Add the `roles` namespace to both language files**

In `src/add-os/lang/en/en.json`, add a new top-level key after `"notifications"`
(anywhere at the top level is fine — keep it alongside `"nav"` for locality):

```json
	"roles": {
		"description": "Assignable roles across the dashboard. There are no per-role permissions yet — just the names.",
		"loadError": "Couldn't load roles. You may not have permission to view this page.",
		"empty": "No roles found.",
		"names": {
			"member": "Member",
			"operations": "Operations",
			"admin": "Admin"
		}
	},
```

In `src/add-os/lang/ar/ar.json`, add the matching key at the same nesting level:

```json
	"roles": {
		"description": "الأدوار القابلة للتعيين في لوحة التحكم. لا صلاحيات تفصيلية لكل دور بعد — فقط الأسماء.",
		"loadError": "تعذّر تحميل الأدوار. قد لا تملك صلاحية الوصول لهذه الصفحة.",
		"empty": "لا توجد أدوار.",
		"names": {
			"member": "عضو",
			"operations": "التشغيل",
			"admin": "المدير"
		}
	},
```

(Exact placement inside the JSON object doesn't matter for the parity check —
just keep both files valid JSON with matching key structure.)

- [ ] **Step 2: Run the i18n parity test to verify it still passes**

Run: `npx vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS — both files gained the identical `roles.*` key tree, no blanks, Arabic file has Arabic script, English file doesn't.

- [ ] **Step 3: Create `RolesPage.vue`**

Create `src/add-os/modules/system/views/RolesPage.vue`:

```vue
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.roles") }}</h1>
			<p>{{ t("roles.description") }}</p>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('roles.loadError')" />

		<n-spin :show="loading">
			<div class="flex min-h-24 flex-wrap gap-3">
				<n-tag v-for="role in roles" :key="role" size="large" round>
					{{ t(`roles.names.${role}`) }}
				</n-tag>
				<n-empty v-if="!loading && !loadError && roles.length === 0" :description="t('roles.empty')" />
			</div>
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import type { UserRole } from "@/add-os/modules/system/types/user"
import { NAlert, NEmpty, NSpin, NTag } from "naive-ui"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { listRoles } from "@/add-os/services/roles"

/**
 * ADD OS — read-only: `RoleController::index()`'s own comment is "no granular
 * permissions yet", so there is nothing here to create, edit or delete.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const roles = ref<UserRole[]>([])
const loading = ref(true)
const loadError = ref(false)

onMounted(async () => {
	try {
		roles.value = await listRoles()
	} catch (error) {
		loadError.value = true
		if (!(error instanceof ApiError)) throw error
	} finally {
		loading.value = false
	}
})
</script>
```

- [ ] **Step 4: Wire the `system.roles` route to the real component**

In `src/add-os/navigation/routes.ts`, add the import and swap the component for
that one page. The file currently maps every page to `ComingSoon` unconditionally;
change the `component` line to pick the real component when one exists:

```ts
import type { RouteRecordRaw } from "vue-router"
import ComingSoon from "@/add-os/views/ComingSoon.vue"
import RolesPage from "@/add-os/modules/system/views/RolesPage.vue"
import { NAV_SECTIONS, navPageTitleKey, navRouteName, navRoutePath, navSectionTitleKey } from "./sections"

/**
 * ADD OS — routes generated from `./sections.ts`.
 * ...(existing doc comment stays as-is)...
 */

/** Pages with a real screen. Everything else still falls back to ComingSoon. */
const PAGE_COMPONENTS: Record<string, unknown> = {
	"system.roles": RolesPage
}

export function createAddOsRoutes(): RouteRecordRaw[] {
	return NAV_SECTIONS.map(section => {
		const [firstPage] = section.pages

		return {
			path: section.path,
			redirect: navRoutePath(section, firstPage),
			meta: {
				auth: true,
				roles: "all",
				titleKey: navSectionTitleKey(section)
			},
			children: section.pages.map(page => ({
				path: page.path,
				name: navRouteName(section, page),
				component: PAGE_COMPONENTS[navRouteName(section, page)] ?? ComingSoon,
				props: { titleKey: navPageTitleKey(page) },
				meta: { title: navPageTitleKey(page) }
			}))
		}
	})
}
```

- [ ] **Step 5: Run the navigation guard test to verify routing is still consistent**

Run: `npx vitest run src/add-os/navigation/__tests__/navigation.spec.ts`
Expected: PASS — the test asserts route/page/translation shape, not which
component is mounted, so this stays green.

- [ ] **Step 6: Manual check**

Set `VITE_API_URL` in `.env` (copy from `.env.example` if you haven't) to a
running ADDCore instance (`php artisan serve --port=8000`), run `pnpm dev`, sign
in as an admin, and open **System → Roles & permissions**. Confirm the three role
tags render, then switch the language switcher to English and back to confirm
the tags relabel.

- [ ] **Step 7: Commit**

```bash
git add src/add-os/lang/ar/ar.json src/add-os/lang/en/en.json src/add-os/modules/system/views/RolesPage.vue src/add-os/navigation/routes.ts
git commit -m "feat(add-os): build the Roles page"
```

---

### Task 6: `UsersPage.vue` — read-only list, search and role filter

**Files:**
- Modify: `src/add-os/lang/ar/ar.json`
- Modify: `src/add-os/lang/en/en.json`
- Create: `src/add-os/modules/system/views/UsersPage.vue`
- Modify: `src/add-os/navigation/routes.ts`

**Interfaces:**
- Consumes: `listUsers` (Task 4), `User`/`UserRole`/`UserStatus` (Task 2), `roles.names.*` i18n keys (Task 5).
- Produces: `users` ref, `loadUsers()` function, `STATUS_ICON`/`STATUS_TYPE`/`ROLES` constants — all extended in Tasks 7–10, which modify this same file.

No pagination exists on `GET /api/v1/admin/users` (`index()` uses `->get()`), so
search and the role filter are both client-side against the one fetched list —
filtering server-side would be a second round trip for data already in memory.

- [ ] **Step 1: Add the `users` namespace to both language files**

In `src/add-os/lang/en/en.json`, add (this task's subset — more keys are added in
later tasks as each feature lands):

```json
	"users": {
		"description": "Operations and admin accounts on the dashboard. Members register from the app and never appear here.",
		"searchPlaceholder": "Search by name, phone or email",
		"roleFilterPlaceholder": "Filter by role",
		"columns": {
			"name": "Name",
			"phone": "Phone",
			"email": "Email",
			"role": "Role",
			"status": "Status"
		},
		"status": {
			"active": "Active",
			"deactivated": "Deactivated",
			"blocked": "Blocked"
		},
		"loadError": "Couldn't load users. You may not have permission to view this page.",
		"empty": "No users found."
	},
```

In `src/add-os/lang/ar/ar.json`, add the matching structure:

```json
	"users": {
		"description": "حسابات التشغيل والإدارة في اللوحة. الأعضاء يسجّلون من التطبيق ولا يظهرون هنا.",
		"searchPlaceholder": "البحث بالاسم أو الهاتف أو البريد الإلكتروني",
		"roleFilterPlaceholder": "تصفية حسب الدور",
		"columns": {
			"name": "الاسم",
			"phone": "الهاتف",
			"email": "البريد الإلكتروني",
			"role": "الدور",
			"status": "الحالة"
		},
		"status": {
			"active": "نشط",
			"deactivated": "معطّل",
			"blocked": "محظور"
		},
		"loadError": "تعذّر تحميل المستخدمين. قد لا تملك صلاحية الوصول لهذه الصفحة.",
		"empty": "لا يوجد مستخدمون."
	},
```

- [ ] **Step 2: Run the i18n parity test**

Run: `npx vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 3: Create `UsersPage.vue`**

Create `src/add-os/modules/system/views/UsersPage.vue`:

```vue
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.users") }}</h1>
			<p>{{ t("users.description") }}</p>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('users.loadError')" />

		<div class="flex flex-wrap items-center gap-3">
			<n-input v-model:value="search" :placeholder="t('users.searchPlaceholder')" clearable class="max-w-xs" />
			<n-select
				v-model:value="roleFilter"
				:placeholder="t('users.roleFilterPlaceholder')"
				:options="roleFilterOptions"
				clearable
				class="max-w-xs"
			/>
		</div>

		<n-data-table :columns="columns" :data="filteredUsers" :loading="loading" :bordered="false" :row-key="rowKey" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { User, UserRole, UserStatus } from "@/add-os/modules/system/types/user"
import { NAlert, NDataTable, NInput, NSelect, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"
import { ApiError } from "@/add-os/services/api"
import { listUsers } from "@/add-os/services/users"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

/**
 * Fixed by the backend's own validation (`AssignRoleRequest`/`StoreUserRequest`
 * both hardcode this exact list), not fetched from `listRoles()` — a role the
 * assign-role endpoint would reject is not a useful filter/select option here,
 * even if the roles table ever grew a fourth row. `RolesPage.vue` is the one
 * screen that legitimately reflects whatever the roles table contains.
 */
const ROLES: UserRole[] = ["member", "operations", "admin"]

const STATUS_ICON: Record<UserStatus, string> = {
	active: "carbon:checkmark-filled",
	deactivated: "carbon:warning-alt-filled",
	blocked: "carbon:error-filled"
}

const STATUS_TYPE: Record<UserStatus, "success" | "warning" | "error"> = {
	active: "success",
	deactivated: "warning",
	blocked: "error"
}

const users = ref<User[]>([])
const loading = ref(true)
const loadError = ref(false)
const search = ref("")
const roleFilter = ref<UserRole | null>(null)

const roleFilterOptions = computed<SelectOption[]>(() => ROLES.map(role => ({ label: t(`roles.names.${role}`), value: role })))

const filteredUsers = computed(() => {
	const term = search.value.trim().toLowerCase()

	return users.value.filter(user => {
		if (roleFilter.value && !user.roles.includes(roleFilter.value)) return false
		if (!term) return true
		return (
			user.name.toLowerCase().includes(term) ||
			user.phone.toLowerCase().includes(term) ||
			user.email.toLowerCase().includes(term)
		)
	})
})

function rowKey(row: User): number {
	return row.id
}

function renderRoleTag(row: User) {
	return h(
		NTag,
		{ round: true, bordered: true },
		{ default: () => row.roles.map(role => t(`roles.names.${role}`)).join(", ") }
	)
}

function renderStatusTag(row: User) {
	return h(
		NTag,
		{ type: STATUS_TYPE[row.status], round: true, bordered: true },
		{
			default: () => [
				h(Icon, { name: STATUS_ICON[row.status], size: 14 }),
				` ${t(`users.status.${row.status}`)}`
			]
		}
	)
}

const columns = computed<DataTableColumns<User>>(() => [
	{ title: t("users.columns.name"), key: "name" },
	{ title: t("users.columns.phone"), key: "phone" },
	{ title: t("users.columns.email"), key: "email" },
	{ title: t("users.columns.role"), key: "roles", render: renderRoleTag },
	{ title: t("users.columns.status"), key: "status", render: renderStatusTag }
])

async function loadUsers() {
	loading.value = true
	loadError.value = false
	try {
		users.value = await listUsers()
	} catch (error) {
		loadError.value = true
		if (!(error instanceof ApiError)) throw error
	} finally {
		loading.value = false
	}
}

onMounted(loadUsers)
</script>
```

- [ ] **Step 4: Wire the `system.users` route**

In `src/add-os/navigation/routes.ts`, add the import and the map entry:

```ts
import UsersPage from "@/add-os/modules/system/views/UsersPage.vue"
```

```ts
const PAGE_COMPONENTS: Record<string, unknown> = {
	"system.roles": RolesPage,
	"system.users": UsersPage
}
```

- [ ] **Step 5: Run the navigation guard test**

Run: `npx vitest run src/add-os/navigation/__tests__/navigation.spec.ts`
Expected: PASS.

- [ ] **Step 6: Regenerate the icon bundle**

Run: `npm run icons`
Expected: succeeds, reports the three new `checkmark-filled`/`warning-alt-filled`/`error-filled` icons now bundled under `carbon`. If it instead reports a missing icon name, the name was typed wrong — fix it in `UsersPage.vue`, not in the generated file.

- [ ] **Step 7: Manual check**

`pnpm dev`, sign in as admin, open **System → Users**. Confirm: the table lists
seeded users, typing in the search box filters by name/phone/email, the role
filter narrows the list, status tags show the right icon+colour+label combination
for each of the three states, and everything relabels correctly after switching
to English/RTL→LTR and back.

- [ ] **Step 8: Commit**

```bash
git add src/add-os/lang/ar/ar.json src/add-os/lang/en/en.json src/add-os/modules/system/views/UsersPage.vue src/add-os/navigation/routes.ts
git commit -m "feat(add-os): build the Users list page"
```

---

### Task 7: Create User drawer

**Files:**
- Modify: `src/add-os/lang/ar/ar.json`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/modules/system/views/UsersPage.vue`

**Interfaces:**
- Consumes: `createUser` (Task 4), `isValidSyrianPhone`/`isValidPassword` (Task 2), `CreateUserPayload` (Task 2).
- Produces: extends `UsersPage.vue` with a working "New user" flow, refetching the list on success.

- [ ] **Step 1: Add the create-flow and validation keys**

Add to `src/add-os/lang/en/en.json`'s existing `"users"` object (alongside the
keys from Task 6 — this is additive, not a new top-level key):

```json
		"create": {
			"button": "New user",
			"title": "New user",
			"success": "User created."
		},
		"form": {
			"name": "Full name",
			"phone": "Phone",
			"phonePlaceholder": "09XXXXXXXX",
			"email": "Email",
			"password": "Password",
			"passwordConfirmation": "Confirm password",
			"role": "Role",
			"rolePlaceholder": "Select a role",
			"submit": "Save",
			"cancel": "Cancel"
		},
		"validation": {
			"nameRequired": "Name is required.",
			"phoneRequired": "Phone is required.",
			"phoneInvalid": "Enter a valid Syrian mobile number (09XXXXXXXX).",
			"emailRequired": "Email is required.",
			"emailInvalid": "Enter a valid email address.",
			"passwordRequired": "Password is required.",
			"passwordTooShort": "Password must be at least 8 characters.",
			"passwordConfirmationMismatch": "Passwords do not match.",
			"roleRequired": "Role is required."
		},
```

Add the matching structure to `src/add-os/lang/ar/ar.json`'s `"users"` object:

```json
		"create": {
			"button": "مستخدم جديد",
			"title": "مستخدم جديد",
			"success": "تم إنشاء المستخدم."
		},
		"form": {
			"name": "الاسم الكامل",
			"phone": "رقم الهاتف",
			"phonePlaceholder": "09XXXXXXXX",
			"email": "البريد الإلكتروني",
			"password": "كلمة المرور",
			"passwordConfirmation": "تأكيد كلمة المرور",
			"role": "الدور",
			"rolePlaceholder": "اختر دوراً",
			"submit": "حفظ",
			"cancel": "إلغاء"
		},
		"validation": {
			"nameRequired": "الاسم مطلوب.",
			"phoneRequired": "رقم الهاتف مطلوب.",
			"phoneInvalid": "أدخل رقم هاتف سوري صحيح (09XXXXXXXX).",
			"emailRequired": "البريد الإلكتروني مطلوب.",
			"emailInvalid": "أدخل بريداً إلكترونياً صحيحاً.",
			"passwordRequired": "كلمة المرور مطلوبة.",
			"passwordTooShort": "يجب أن تتكوّن كلمة المرور من 8 أحرف على الأقل.",
			"passwordConfirmationMismatch": "كلمتا المرور غير متطابقتين.",
			"roleRequired": "الدور مطلوب."
		},
```

- [ ] **Step 2: Run the i18n parity test**

Run: `npx vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 3: Add the create drawer to `UsersPage.vue`**

Add a toolbar button above the table (inside the existing search/filter `<div>`,
as a sibling after the `n-select`):

```vue
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("users.create.button") }}
			</n-button>
```

Add the drawer markup after the closing `</n-data-table>` tag:

```vue
		<n-drawer v-model:show="drawerVisible" :width="420">
			<n-drawer-content :title="t('users.create.title')" closable>
				<n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
					<n-form-item path="name" :label="t('users.form.name')">
						<n-input v-model:value="form.name" />
					</n-form-item>
					<n-form-item path="phone" :label="t('users.form.phone')">
						<n-input v-model:value="form.phone" :placeholder="t('users.form.phonePlaceholder')" />
					</n-form-item>
					<n-form-item path="email" :label="t('users.form.email')">
						<n-input v-model:value="form.email" />
					</n-form-item>
					<n-form-item path="password" :label="t('users.form.password')">
						<n-input v-model:value="form.password" type="password" show-password-on="click" />
					</n-form-item>
					<n-form-item path="password_confirmation" :label="t('users.form.passwordConfirmation')">
						<n-input v-model:value="form.password_confirmation" type="password" show-password-on="click" />
					</n-form-item>
					<n-form-item path="role" :label="t('users.form.role')">
						<n-select v-model:value="form.role" :placeholder="t('users.form.rolePlaceholder')" :options="createRoleOptions" />
					</n-form-item>
				</n-form>
				<template #footer>
					<div class="flex justify-end gap-2">
						<n-button @click="drawerVisible = false">{{ t("users.form.cancel") }}</n-button>
						<n-button type="primary" :loading="submitting" @click="submitCreate">{{ t("users.form.submit") }}</n-button>
					</div>
				</template>
			</n-drawer-content>
		</n-drawer>
```

Update the `<script setup>` block — new imports:

```ts
import type { FormInst, FormRules } from "naive-ui"
import type { CreateUserPayload } from "@/add-os/modules/system/types/user"
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, useMessage } from "naive-ui"
import { isValidPassword, isValidSyrianPhone } from "@/add-os/modules/system/utils/validation"
import { createUser } from "@/add-os/services/users"
```

(add these to the existing `naive-ui` import line and the existing `type`
import line from Task 6 rather than duplicating the statements — the final file
has one `import type { ... } from "naive-ui"` line and one `import { ... } from
"naive-ui"` line.)

New script content, added after the existing `loadUsers`/`onMounted` block:

```ts
const message = useMessage()

const drawerVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInst | null>(null)

function emptyForm(): CreateUserPayload {
	return { name: "", phone: "", email: "", password: "", password_confirmation: "", role: "operations" }
}

const form = ref<CreateUserPayload>(emptyForm())

/** StoreUserRequest allows only these two — member accounts self-register from the app. */
const createRoleOptions = computed<SelectOption[]>(() => [
	{ label: t("roles.names.operations"), value: "operations" },
	{ label: t("roles.names.admin"), value: "admin" }
])

const rules = computed<FormRules>(() => ({
	name: [{ required: true, message: t("users.validation.nameRequired"), trigger: ["blur", "input"] }],
	phone: [
		{ required: true, message: t("users.validation.phoneRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => isValidSyrianPhone(value),
			message: t("users.validation.phoneInvalid"),
			trigger: ["blur", "input"]
		}
	],
	email: [
		{ required: true, message: t("users.validation.emailRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
			message: t("users.validation.emailInvalid"),
			trigger: ["blur", "input"]
		}
	],
	password: [
		{ required: true, message: t("users.validation.passwordRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => isValidPassword(value),
			message: t("users.validation.passwordTooShort"),
			trigger: ["blur", "input"]
		}
	],
	password_confirmation: [
		{ required: true, message: t("users.validation.passwordRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => value === form.value.password,
			message: t("users.validation.passwordConfirmationMismatch"),
			trigger: ["blur", "input"]
		}
	],
	role: [{ required: true, message: t("users.validation.roleRequired"), trigger: ["change", "blur"] }]
}))

function openCreate() {
	form.value = emptyForm()
	drawerVisible.value = true
}

async function submitCreate() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	submitting.value = true
	try {
		await createUser(form.value)
		message.success(t("users.create.success"))
		drawerVisible.value = false
		await loadUsers()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("users.loadError"))
	} finally {
		submitting.value = false
	}
}
```

- [ ] **Step 4: Run the full guard suite**

Run: `pnpm test`
Expected: PASS — i18n parity, navigation, icons, no-secrets/no-external-urls/no-runtime-theming, RTL nav-indent, tokens, format, plus the new service tests from Tasks 1–4.

- [ ] **Step 5: Run type-check**

Run: `pnpm run type-check`
Expected: PASS. If `FormRules`' validator signature complains about the unused
`_rule` parameter's type, that's naive-ui's own `FormItemRule` type — match its
exact parameter type rather than widening to `any`.

- [ ] **Step 6: Manual check**

`pnpm dev` → **System → Users** → "New user". Verify: submitting empty shows all
required-field messages; an invalid phone (`08...`) shows the phone-format
message; mismatched passwords show the mismatch message; a valid submission
closes the drawer, shows a success toast, and the new user appears in the table
without a manual refresh. Repeat with the language switched to English, and with
the drawer open in RTL to confirm the footer buttons and form labels mirror
correctly.

- [ ] **Step 7: Commit**

```bash
git add src/add-os/lang/ar/ar.json src/add-os/lang/en/en.json src/add-os/modules/system/views/UsersPage.vue
git commit -m "feat(add-os): add the create-user drawer"
```

---

### Task 8: Actions column + Edit User drawer

**Files:**
- Modify: `src/add-os/lang/ar/ar.json`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/modules/system/views/UsersPage.vue`

**Interfaces:**
- Consumes: `updateUserProfile` (Task 4), `UpdateUserProfilePayload` (Task 2).
- Produces: extends `UsersPage.vue` with the first `Actions` column entry and a shared drawer that now serves both create and edit.

The drawer built in Task 7 is reused here rather than duplicated: a `mode` ref
picks which fields show and which service call runs on submit.

- [ ] **Step 1: Add the edit-flow keys**

Add to `src/add-os/lang/en/en.json`'s `"users"` object:

```json
		"columns": {
			"name": "Name",
			"phone": "Phone",
			"email": "Email",
			"role": "Role",
			"status": "Status",
			"actions": "Actions"
		},
```

(This **replaces** the `columns` object added in Task 6 — same key, one more
entry: `"actions": "Actions"`.)

```json
		"edit": {
			"title": "Edit user",
			"button": "Edit",
			"success": "Profile updated."
		},
```

Add to `src/add-os/lang/ar/ar.json`'s `"users"` object — replace `columns` with:

```json
		"columns": {
			"name": "الاسم",
			"phone": "الهاتف",
			"email": "البريد الإلكتروني",
			"role": "الدور",
			"status": "الحالة",
			"actions": "إجراءات"
		},
```

```json
		"edit": {
			"title": "تعديل المستخدم",
			"button": "تعديل",
			"success": "تم تحديث البيانات."
		},
```

- [ ] **Step 2: Run the i18n parity test**

Run: `npx vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 3: Add the Actions column**

In `UsersPage.vue`'s `columns` computed, add one more entry after `status`:

```ts
	{ title: t("users.columns.actions"), key: "actions", render: renderActions }
```

Add `renderActions` next to the other `render*` functions:

```ts
function renderActions(row: User) {
	return h(NButton, { text: true, type: "primary", onClick: () => openEdit(row) }, { default: () => t("users.edit.button") })
}
```

- [ ] **Step 4: Generalize the drawer for create and edit**

Change the drawer's `<n-drawer-content>` title to switch on mode:

```vue
			<n-drawer-content :title="mode === 'create' ? t('users.create.title') : t('users.edit.title')" closable>
```

Wrap the password fields so they only show in create mode:

```vue
					<template v-if="mode === 'create'">
						<n-form-item path="password" :label="t('users.form.password')">
							<n-input v-model:value="form.password" type="password" show-password-on="click" />
						</n-form-item>
						<n-form-item path="password_confirmation" :label="t('users.form.passwordConfirmation')">
							<n-input v-model:value="form.password_confirmation" type="password" show-password-on="click" />
						</n-form-item>
					</template>
```

Wrap the role field the same way (role changes are a separate action — Task 10 —
not part of the profile-edit form, matching `UpdateUserRequest`):

```vue
					<n-form-item v-if="mode === 'create'" path="role" :label="t('users.form.role')">
						<n-select v-model:value="form.role" :placeholder="t('users.form.rolePlaceholder')" :options="createRoleOptions" />
					</n-form-item>
```

Change the footer's submit handler to dispatch by mode:

```vue
						<n-button type="primary" :loading="submitting" @click="mode === 'create' ? submitCreate() : submitEdit()">{{ t("users.form.submit") }}</n-button>
```

In `<script setup>`:

- Import `updateUserProfile` alongside `createUser`.
- Import `UpdateUserProfilePayload` alongside `CreateUserPayload`.
- Add:

```ts
const mode = ref<"create" | "edit">("create")
const editingUserId = ref<number | null>(null)

function openEdit(user: User) {
	mode.value = "edit"
	editingUserId.value = user.id
	form.value = { ...emptyForm(), name: user.name, phone: user.phone, email: user.email }
	drawerVisible.value = true
}
```

Update `openCreate` to also set the mode:

```ts
function openCreate() {
	mode.value = "create"
	editingUserId.value = null
	form.value = emptyForm()
	drawerVisible.value = true
}
```

Update `rules` so `password`/`password_confirmation`/`role` are only required in
create mode — wrap those three entries' arrays with a mode check:

```ts
const rules = computed<FormRules>(() => ({
	name: [{ required: true, message: t("users.validation.nameRequired"), trigger: ["blur", "input"] }],
	phone: [
		{ required: true, message: t("users.validation.phoneRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => isValidSyrianPhone(value),
			message: t("users.validation.phoneInvalid"),
			trigger: ["blur", "input"]
		}
	],
	email: [
		{ required: true, message: t("users.validation.emailRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
			message: t("users.validation.emailInvalid"),
			trigger: ["blur", "input"]
		}
	],
	...(mode.value === "create"
		? {
				password: [
					{ required: true, message: t("users.validation.passwordRequired"), trigger: ["blur", "input"] },
					{
						validator: (_rule, value: string) => isValidPassword(value),
						message: t("users.validation.passwordTooShort"),
						trigger: ["blur", "input"]
					}
				],
				password_confirmation: [
					{ required: true, message: t("users.validation.passwordRequired"), trigger: ["blur", "input"] },
					{
						validator: (_rule, value: string) => value === form.value.password,
						message: t("users.validation.passwordConfirmationMismatch"),
						trigger: ["blur", "input"]
					}
				],
				role: [{ required: true, message: t("users.validation.roleRequired"), trigger: ["change", "blur"] }]
			}
		: {})
}))

async function submitEdit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	if (editingUserId.value === null) return

	const payload: UpdateUserProfilePayload = { name: form.value.name, phone: form.value.phone, email: form.value.email }

	submitting.value = true
	try {
		await updateUserProfile(editingUserId.value, payload)
		message.success(t("users.edit.success"))
		drawerVisible.value = false
		await loadUsers()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("users.loadError"))
	} finally {
		submitting.value = false
	}
}
```

- [ ] **Step 5: Run the full guard suite and type-check**

Run: `pnpm test && pnpm run type-check`
Expected: PASS.

- [ ] **Step 6: Manual check**

Click "Edit" on a row: confirm the drawer opens titled "Edit user" with name/
phone/email pre-filled and no password/role fields, that saving updates the row
in place, and that "New user" still opens a clean drawer in create mode with all
five fields.

- [ ] **Step 7: Commit**

```bash
git add src/add-os/lang/ar/ar.json src/add-os/lang/en/en.json src/add-os/modules/system/views/UsersPage.vue
git commit -m "feat(add-os): add the actions column and edit-user flow"
```

---

### Task 9: Change status modal

**Files:**
- Modify: `src/add-os/lang/ar/ar.json`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/modules/system/views/UsersPage.vue`

**Interfaces:**
- Consumes: `updateUserStatus` (Task 4), `UpdateUserStatusPayload` (Task 2).
- Produces: extends `UsersPage.vue`'s Actions column with a second entry and a status-change modal.

- [ ] **Step 1: Add the change-status keys**

Add to `src/add-os/lang/en/en.json`'s `"users"` object:

```json
		"changeStatus": {
			"button": "Change status",
			"title": "Change status",
			"warning": "Deactivating or blocking signs this user out of every device immediately.",
			"reasonLabel": "Reason (optional)",
			"reasonPlaceholder": "Why is the status changing?",
			"success": "Status updated."
		},
```

Add to `src/add-os/lang/ar/ar.json`'s `"users"` object:

```json
		"changeStatus": {
			"button": "تغيير الحالة",
			"title": "تغيير الحالة",
			"warning": "تعطيل الحساب أو حظره يسجّل خروج المستخدم من كل الأجهزة فوراً.",
			"reasonLabel": "السبب (اختياري)",
			"reasonPlaceholder": "سبب تغيير الحالة",
			"success": "تم تحديث الحالة."
		},
```

- [ ] **Step 2: Run the i18n parity test**

Run: `npx vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 3: Add the second action button**

`renderActions` becomes a two-button `NSpace` (or a flex `div` via `h`):

```ts
function renderActions(row: User) {
	return h("div", { class: "flex gap-2" }, [
		h(NButton, { text: true, type: "primary", onClick: () => openEdit(row) }, { default: () => t("users.edit.button") }),
		h(NButton, { text: true, type: "warning", onClick: () => openStatusModal(row) }, { default: () => t("users.changeStatus.button") })
	])
}
```

- [ ] **Step 4: Add the status modal**

Add after the `</n-drawer>` closing tag:

```vue
		<n-modal v-model:show="statusModalVisible" preset="card" :title="t('users.changeStatus.title')" class="max-w-md">
			<n-alert type="warning" :title="t('users.changeStatus.warning')" class="mb-4" />
			<n-form>
				<n-form-item :label="t('users.columns.status')">
					<n-select v-model:value="statusForm.status" :options="statusOptions" />
				</n-form-item>
				<n-form-item :label="t('users.changeStatus.reasonLabel')">
					<n-input
						v-model:value="statusForm.reason"
						type="textarea"
						:placeholder="t('users.changeStatus.reasonPlaceholder')"
						maxlength="500"
					/>
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="statusModalVisible = false">{{ t("users.form.cancel") }}</n-button>
					<n-button type="primary" :loading="submittingStatus" @click="submitStatusChange">{{ t("users.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>
```

In `<script setup>`, import `NModal` alongside the other naive-ui imports, and
`UpdateUserStatusPayload`/`updateUserStatus`. Add:

```ts
const statusModalVisible = ref(false)
const submittingStatus = ref(false)
const statusTargetId = ref<number | null>(null)
const statusForm = ref<UpdateUserStatusPayload>({ status: "active", reason: "" })

const statusOptions = computed<SelectOption[]>(() =>
	(["active", "deactivated", "blocked"] as const).map(status => ({ label: t(`users.status.${status}`), value: status }))
)

function openStatusModal(user: User) {
	statusTargetId.value = user.id
	statusForm.value = { status: user.status, reason: "" }
	statusModalVisible.value = true
}

async function submitStatusChange() {
	if (statusTargetId.value === null) return

	submittingStatus.value = true
	try {
		await updateUserStatus(statusTargetId.value, statusForm.value)
		message.success(t("users.changeStatus.success"))
		statusModalVisible.value = false
		await loadUsers()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("users.loadError"))
	} finally {
		submittingStatus.value = false
	}
}
```

- [ ] **Step 5: Run the full guard suite and type-check**

Run: `pnpm test && pnpm run type-check`
Expected: PASS.

- [ ] **Step 6: Manual check**

Click "Change status" on an active user, switch to "Deactivated", add a reason,
save: confirm the row's status tag updates to the warning-styled tag with the
correct icon, and that the warning banner is visible in the modal before saving.
Check RTL: the warning icon/banner and the two footer buttons mirror correctly.

- [ ] **Step 7: Commit**

```bash
git add src/add-os/lang/ar/ar.json src/add-os/lang/en/en.json src/add-os/modules/system/views/UsersPage.vue
git commit -m "feat(add-os): add the change-status modal"
```

---

### Task 10: Change role modal

**Files:**
- Modify: `src/add-os/lang/ar/ar.json`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/modules/system/views/UsersPage.vue`

**Interfaces:**
- Consumes: `assignRole` (Task 4).
- Produces: extends `UsersPage.vue`'s Actions column with a third entry and a role-change modal. Completes the Users page.

- [ ] **Step 1: Add the change-role keys**

Add to `src/add-os/lang/en/en.json`'s `"users"` object:

```json
		"changeRole": {
			"button": "Change role",
			"title": "Change role",
			"success": "Role updated."
		}
```

(This is the last key in the `"users"` object — no trailing comma.)

Add to `src/add-os/lang/ar/ar.json`'s `"users"` object:

```json
		"changeRole": {
			"button": "تغيير الدور",
			"title": "تغيير الدور",
			"success": "تم تحديث الدور."
		}
```

- [ ] **Step 2: Run the i18n parity test**

Run: `npx vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 3: Add the third action button**

`renderActions` gains a third entry:

```ts
function renderActions(row: User) {
	return h("div", { class: "flex gap-2" }, [
		h(NButton, { text: true, type: "primary", onClick: () => openEdit(row) }, { default: () => t("users.edit.button") }),
		h(NButton, { text: true, type: "warning", onClick: () => openStatusModal(row) }, { default: () => t("users.changeStatus.button") }),
		h(NButton, { text: true, onClick: () => openRoleModal(row) }, { default: () => t("users.changeRole.button") })
	])
}
```

- [ ] **Step 4: Add the role modal**

Add after the status `</n-modal>`:

```vue
		<n-modal v-model:show="roleModalVisible" preset="card" :title="t('users.changeRole.title')" class="max-w-md">
			<n-form>
				<n-form-item :label="t('users.columns.role')">
					<n-select v-model:value="roleForm" :options="roleFilterOptions" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="roleModalVisible = false">{{ t("users.form.cancel") }}</n-button>
					<n-button type="primary" :loading="submittingRole" @click="submitRoleChange">{{ t("users.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>
```

(`roleFilterOptions` — defined back in Task 6 for the list's role filter — already
lists all three roles with `roles.names.*` labels, so it's reused here rather than
duplicated: same three options, same labels, same source of truth.)

In `<script setup>`, import `assignRole` alongside `updateUserStatus`. Add:

```ts
const roleModalVisible = ref(false)
const submittingRole = ref(false)
const roleTargetId = ref<number | null>(null)
const roleForm = ref<UserRole>("member")

function openRoleModal(user: User) {
	roleTargetId.value = user.id
	roleForm.value = user.roles[0] ?? "member"
	roleModalVisible.value = true
}

async function submitRoleChange() {
	if (roleTargetId.value === null) return

	submittingRole.value = true
	try {
		await assignRole(roleTargetId.value, roleForm.value)
		message.success(t("users.changeRole.success"))
		roleModalVisible.value = false
		await loadUsers()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("users.loadError"))
	} finally {
		submittingRole.value = false
	}
}
```

- [ ] **Step 5: Run the full guard suite and type-check**

Run: `pnpm test && pnpm run type-check`
Expected: PASS.

- [ ] **Step 6: Manual check**

Click "Change role" on a user, pick a different role, save: confirm the row's
role tag updates. Try assigning `member` to an operations account and confirm it
succeeds (per `AssignRoleRequest`, unlike creation, all three roles are valid
here). Check RTL alignment of the modal.

- [ ] **Step 7: Commit**

```bash
git add src/add-os/lang/ar/ar.json src/add-os/lang/en/en.json src/add-os/modules/system/views/UsersPage.vue
git commit -m "feat(add-os): add the change-role modal"
```

---

### Task 11: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: every guard spec plus all new service/validation specs pass. This is
the same command `CLAUDE.md` names as mandatory after any change to a
user-facing control.

- [ ] **Step 2: Run type-check and lint**

Run: `pnpm run type-check && pnpm lint`
Expected: no new errors. (Two pre-existing lint errors and eighteen pre-existing
Kanban type errors predate this work per `REFACTOR-SUMMARY.md` §4 — do not fix
them as part of this plan, and confirm the error count/location is unchanged
from before Task 1.)

- [ ] **Step 3: Confirm the icon bundle is in sync**

Run: `npm run icons`
Expected: no diff in `src/add-os/assets/icons.generated.json` (already
regenerated in Task 6) — if it does produce a diff, stage it.

- [ ] **Step 4: Full manual QA matrix**

With `VITE_API_URL` pointing at a running ADDCore instance and signed in as an
admin, walk both pages in all four states — `ar`/`en` × the RTL/LTR that each
language drives:

- **Users**: list renders, search filters, role filter narrows, create succeeds
  and fails correctly (duplicate phone/email → 422 surfaced), edit succeeds,
  status change updates the tag and (separately, via re-login) actually signs a
  deactivated/blocked user out, role change updates the tag.
- **Roles**: the three role tags render and relabel with the language switch.
- Confirm `n-data-table`, `n-drawer`, `n-modal`, and `n-select` all mirror
  correctly in Arabic/RTL — per `i18n-rtl.md`, Pinx's RTL support is beta, so
  this is a real look, not an assumption carried over from the design doc.

- [ ] **Step 5: Update `docs/PHASE-3-DEAD-CONTROLS.md`-style bookkeeping if applicable**

Not applicable here — this plan adds controls, it doesn't remove any. No doc
update needed beyond what Tasks 1–10 already touched.

- [ ] **Step 6: Final commit (if anything from Steps 1–3 produced a diff)**

```bash
git add -A src/add-os
git commit -m "chore(add-os): sync icon bundle after Users/Roles module"
```

Skip this step entirely if Steps 1–3 produced no diff.
