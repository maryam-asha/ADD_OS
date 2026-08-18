# Company Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Private Office Request → Company → Company Member pipeline in the
ADD OS dashboard: three admin screens, three explicit services, one shared detail
composable, a quick-add-member action available from both the Companies table and the
company detail panel, and a fifth architecture guard preventing any screen from bypassing
the service layer.

**Architecture:** New domain module `src/add-os/modules/members/` (types, config, views,
components, composables) sits on top of three new explicit services
(`services/private-office-requests.ts`, `services/companies.ts`,
`services/company-members.ts` — the last a factory returning a service bound to one
`companyId`, never a hand-concatenated path). `PrivateOfficeRequestsPage.vue` reuses
`useResourceMutations` (its three verbs — create, mark-as-quoted, delete — match that
composable's create/update/remove shape exactly). `CompaniesPage.vue` cannot reuse it
(no PUT, no DELETE on Companies), so two small dedicated composables
(`useCompanyMutations.ts`) cover create and status-change independently, mirroring
`useResourceMutations`'s own toast/rethrow shape without touching the shared file. One
new composable, `useCompanyDetail(companyId)`, is the single fetch/mutate surface for a
company's own data and its members list — consumed by the detail panel, by the shared
`AddCompanyMemberDialog.vue` (used from both the detail panel and a Companies-table row
action), and by nothing else.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Naive UI, Tailwind v4 utilities,
vue-i18n (ar/en), Vitest + `@vue/test-utils`, the existing `fetch`-based
`services/api.ts` client.

**Spec:** The task brief given directly in this conversation ("ADD OS — Company
Pipeline: Postman-verified services, guard test, quick-add member"), cross-checked
line-by-line against `C:\Users\User\Desktop\Aleppo Digital District\ADDCore\postman\ADD-OS.postman_collection.json`
(the "Private Office Requests", "Companies", and "Company Members" folders).

## Global Constraints

- **Scope:** `src/add-os/**` only, except the one explicitly-permitted route
  registration in `src/add-os/navigation/routes.ts`. No template file (Category C), no
  `_pinx-vendor/**`.
- **No `createResourceApi`** for Companies or Private Office Requests — Companies has no
  PUT/DELETE, Company Members is a nested resource. Three explicit service files, per
  the brief.
- **Every list goes through the existing `services/pagination.ts` shape**, but per the
  brief's own explicit out-of-scope note ("عناصر ترقيم بصرية" / visual pagination is out
  of scope) and the fact the Postman collection ships **zero example responses for any
  endpoint** (confirmed: 0 occurrences of a `"response"` key across the whole 714KB
  file, so `meta`'s real shape for these three lists is unconfirmed), every new list call
  uses the existing `.list()`-style flat-array convention (matching every current
  service — none of them call `listPage()` today). No pagination UI is built.
- **Icons:** every new Carbon icon name used below already exists in
  `icons.generated.json` (all are already used elsewhere in this codebase: `carbon:add`,
  `carbon:edit` [not reused here, no edit concept applies], `carbon:trash-can`,
  `carbon:view`, `carbon:user-follow`, `carbon:status-change`, `carbon:currency`,
  `carbon:locked`). If `npm run icons`'s generated file is regenerated for any reason
  during this work, the regenerated `icons.generated.json` must be committed alongside
  it (this is exactly how `main` broke in commit `032e3c7` — do not repeat it).
- **i18n:** every user-visible string ships in **both** `ar.json` and `en.json`, Arabic
  first as the source of meaning. `lang/__tests__/messages.spec.ts` must stay green (key
  parity, no blanks, no Arabic leaking into English, Arabic must contain Arabic script).
- **No inline role checks:** nothing under `modules/members/**` may call
  `isRoleGranted` or compare a role literal directly — `no-inline-role-checks.spec.ts`
  enforces this. (This plan adds no role-gating at all for the Company Pipeline — the
  brief specifies none, unlike the seven spatial tables' delete-gate — so this constraint
  is satisfied by omission, not by a new permissions entry.)
- **No direct HTTP outside the service layer** — enforced by the new 5th guard,
  `src/add-os/__tests__/no-direct-company-http.spec.ts` (Task 7).
- **`vitest run`, `vue-tsc --build --force`, `eslint --fix`** must all be clean before
  this is done. Never modify an existing test to make it pass.

## What the Postman collection actually says (read directly, not from memory)

All three resources live under `/api/v1/admin/...`, every request carries `lang` and
`currency` headers (already handled unconditionally by `services/api.ts`, added in
`3314ba6`). Extracted directly from
`ADD-OS.postman_collection.json` lines 2044–2624:

- **Private Office Requests** (`/private-office-requests`): `GET` (list) · `POST
  {prospect_name, contact}` (starts at `"requested"`) · `GET /{id}` · `PUT /{id}
  {status, quote_ref}` (status only accepts `"requested"|"quoted"`; `"contracted"` 422s;
  returns `{message}`, never the entity) · **`DELETE /{id}` exists** — named "Delete
  Private Office Request" in the collection. Not silent.
- **Companies** (`/companies`): `GET` (list) · `POST {private_office_request_id,
  legal_name, contract_ref, branch_id}` (422 if the request isn't `"quoted"`; `branch_id`
  must reference an existing branch; auto-provisions a wallet, out of scope) · `GET
  /{id}` · `PATCH /{id}/status {status}` (`"active"|"inactive"` only, 422 otherwise,
  returns `{message}`) · **no PUT, no DELETE** — confirmed by the collection's own
  description text ("لا PUT ولا DELETE" holds).
- **Company Members** (`/companies/{id}/members`): `GET` · `POST {user_id,
  door_access_enabled, is_admin}` (422 if already a member; `is_admin` here is the only
  way to bootstrap a company's first admin) · `PATCH /{user_id} {door_access_enabled}` ·
  `PATCH /{user_id}/admin {is_admin}` · **`DELETE /{user_id}` exists** — named "Remove
  Company Member". Not silent.

**Silence left un-guessed:** the collection has no example response for any of these
nine endpoints, so the exact JSON shape of a returned entity (e.g. whether "List Company
Members" nests a `user` object with `name`/`phone`, or just returns
`{user_id, door_access_enabled, is_admin}`) is not confirmed. The types below use
**only** field names that appear literally in a request body — nothing is invented for
display convenience. This is called out again at the relevant task.

## Nav placement decision (asked and answered, not inferred)

"Private Office Requests" doesn't exist anywhere in the codebase (no nav entry, no i18n
key). Asked directly: the `address` section's sole existing coming-soon page
(`formationRequests`, icon `carbon:enterprise`) is repurposed for it — renamed to
`privateOfficeRequests` — rather than adding a third page to the `members` section.
"Companies" maps unambiguously to the existing `members.companies` coming-soon page.
Company Members has no page/route of its own: it is a drawer (`CompanyDetailPanel.vue`)
opened from a Companies-table row action, per the brief's own "صفحة/لوح" (page-**or**-
panel) wording — this avoids inventing a new nested-route pattern with zero existing
precedent in this codebase.

---

### Task 1: Private Office Request types

**Files:**
- Create: `src/add-os/modules/members/types/private-office-request.ts`

**Interfaces:**
- Produces: `PrivateOfficeRequestStatus`, `PrivateOfficeRequest`,
  `PrivateOfficeRequestPayload`, `MarkAsQuotedPayload` — consumed by Tasks 4, 11, 12.

- [ ] **Step 1: Write the file**

```ts
// src/add-os/modules/members/types/private-office-request.ts

/**
 * Field names are literal from the Postman collection's Create/Mark-as-Quoted
 * request bodies. The collection ships zero example responses for any endpoint
 * (verified: 0 occurrences of a "response" key across the whole file), so this
 * entity shape is an aggregation of every field named across those bodies, not
 * a real response read off the wire. If the live API returns more fields, this
 * type is the first place to update once a real response is seen.
 */
export type PrivateOfficeRequestStatus = "requested" | "quoted" | "contracted"

export interface PrivateOfficeRequest {
	id: number
	prospect_name: string
	contact: string
	status: PrivateOfficeRequestStatus
	quote_ref: string | null
}

export interface PrivateOfficeRequestPayload extends Record<string, unknown> {
	prospect_name: string
	contact: string
}

/**
 * The collection's PUT accepts `status: "requested" | "quoted"` generically, but
 * "requested" is never a useful transition from this UI (nothing reverts a quote)
 * and "contracted" always 422s here — only reachable via Companies/createCompany.
 * This payload only carries what the UI's one real action needs; the service
 * function (Task 4) supplies the fixed `status: "quoted"` itself.
 */
export interface MarkAsQuotedPayload extends Record<string, unknown> {
	quote_ref: string
}
```

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: no errors referencing this file (it has no consumers yet, so this only
checks the file parses and its own types are internally consistent).

- [ ] **Step 3: Commit**

```bash
git add src/add-os/modules/members/types/private-office-request.ts
git commit -m "feat(add-os): add Private Office Request types"
```

---

### Task 2: Company types

**Files:**
- Create: `src/add-os/modules/members/types/company.ts`

**Interfaces:**
- Produces: `CompanyStatus`, `Company`, `CompanyPayload`, `CompanyStatusPayload` —
  consumed by Tasks 5, 9, 10, 13, 16.

- [ ] **Step 1: Write the file**

```ts
// src/add-os/modules/members/types/company.ts

export type CompanyStatus = "active" | "inactive"

/**
 * Field names are literal from the Postman collection's Create Company body plus
 * Update Company Status's body — no example response exists for this resource
 * either (see private-office-request.ts's identical caveat).
 */
export interface Company {
	id: number
	private_office_request_id: number
	legal_name: string
	contract_ref: string
	branch_id: number
	status: CompanyStatus
}

/**
 * `private_office_request_id`/`branch_id`: `number | null`, not `number` — `null`
 * is the "nothing selected yet" sentinel for these two required selects.
 * async-validator's `isEmptyValue` treats `null` as empty unconditionally but
 * never treats a numeric `0` as empty, so `0` would silently pass a
 * `required: true` rule with nothing actually selected. By the time
 * ResourceFormDrawer's validation passes and onSubmit fires, both are
 * guaranteed real ids — the widening only affects transient form-editing state.
 * (Same precedent as `modules/spatial/types/zone.ts`'s `ZonePayload.floor_id` and
 * `modules/spatial/types/space.ts`'s `SpacePayload.building_id`.)
 */
export interface CompanyPayload extends Record<string, unknown> {
	private_office_request_id: number | null
	branch_id: number | null
	legal_name: string
	contract_ref: string
}

export interface CompanyStatusPayload extends Record<string, unknown> {
	status: CompanyStatus
}
```

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/add-os/modules/members/types/company.ts
git commit -m "feat(add-os): add Company types"
```

---

### Task 3: Company Member types

**Files:**
- Create: `src/add-os/modules/members/types/company-member.ts`

**Interfaces:**
- Produces: `CompanyMember`, `AddCompanyMemberPayload`, `UpdateDoorAccessPayload`,
  `UpdateAdminFlagPayload` — consumed by Tasks 6, 9, 14, 15.

- [ ] **Step 1: Write the file**

```ts
// src/add-os/modules/members/types/company-member.ts

/**
 * Only `user_id`, `door_access_enabled`, `is_admin` are confirmed — they are the
 * exact fields in Add Company Member's POST body, and the collection has no
 * GET/List response example to confirm anything else (e.g. a nested user name
 * or phone). Do NOT add a `name`/`user` field here without verifying a real
 * response first — the members table (Task 15) renders `user_id` directly for
 * this reason, and that limitation is called out again there.
 */
export interface CompanyMember {
	user_id: number
	door_access_enabled: boolean
	is_admin: boolean
}

export interface AddCompanyMemberPayload extends Record<string, unknown> {
	user_id: number
	door_access_enabled: boolean
	is_admin: boolean
}

export interface UpdateDoorAccessPayload extends Record<string, unknown> {
	door_access_enabled: boolean
}

export interface UpdateAdminFlagPayload extends Record<string, unknown> {
	is_admin: boolean
}
```

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/add-os/modules/members/types/company-member.ts
git commit -m "feat(add-os): add Company Member types"
```

---

### Task 4: Private Office Requests service

**Files:**
- Create: `src/add-os/services/private-office-requests.ts`
- Test: `src/add-os/services/__tests__/private-office-requests.spec.ts`

**Interfaces:**
- Consumes: `get/post/put/del` from `./api` (existing); `MessageResponse` from
  `./resource-factory` (existing); types from Task 1.
- Produces: `listPrivateOfficeRequests(): Promise<PrivateOfficeRequest[]>`,
  `getPrivateOfficeRequest(id: number): Promise<PrivateOfficeRequest>`,
  `createPrivateOfficeRequest(payload: PrivateOfficeRequestPayload):
  Promise<PrivateOfficeRequest>`, `markPrivateOfficeRequestAsQuoted(id: number, payload:
  MarkAsQuotedPayload): Promise<MessageResponse>`,
  `removePrivateOfficeRequest(id: number): Promise<MessageResponse>` — consumed by
  Task 12.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/services/__tests__/private-office-requests.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	createPrivateOfficeRequest,
	getPrivateOfficeRequest,
	listPrivateOfficeRequests,
	markPrivateOfficeRequestAsQuoted,
	removePrivateOfficeRequest
} from "../private-office-requests"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleRequest = {
	id: 1,
	prospect_name: "Levant Textiles LLC",
	contact: "+963 999 111 222",
	status: "requested",
	quote_ref: null
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("private office requests service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listPrivateOfficeRequests GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleRequest] }))

		const requests = await listPrivateOfficeRequests()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/private-office-requests",
			expect.objectContaining({ method: "GET" })
		)
		expect(requests).toEqual([sampleRequest])
	})

	it("createPrivateOfficeRequest POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleRequest }, 201))

		const payload = { prospect_name: sampleRequest.prospect_name, contact: sampleRequest.contact }
		const request = await createPrivateOfficeRequest(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/private-office-requests",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(request).toEqual(sampleRequest)
	})

	it("getPrivateOfficeRequest GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleRequest }))

		const request = await getPrivateOfficeRequest(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/private-office-requests/1",
			expect.objectContaining({ method: "GET" })
		)
		expect(request).toEqual(sampleRequest)
	})

	it("markPrivateOfficeRequestAsQuoted PUTs a fixed status:quoted alongside the quote_ref, and returns only the message", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const result = await markPrivateOfficeRequestAsQuoted(1, { quote_ref: "Q-2026-0001" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/private-office-requests/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify({ status: "quoted", quote_ref: "Q-2026-0001" }) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removePrivateOfficeRequest DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removePrivateOfficeRequest(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/private-office-requests/1",
			expect.objectContaining({ method: "DELETE" })
		)
		expect(result).toEqual({ message: "Deleted." })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/services/__tests__/private-office-requests.spec.ts`
Expected: FAIL — `Cannot find module '../private-office-requests'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/add-os/services/private-office-requests.ts
import type {
	MarkAsQuotedPayload,
	PrivateOfficeRequest,
	PrivateOfficeRequestPayload
} from "@/add-os/modules/members/types/private-office-request"
import type { MessageResponse } from "./resource-factory"
import { del, get, post, put } from "./api"

const BASE = "/api/v1/admin/private-office-requests"

export async function listPrivateOfficeRequests(): Promise<PrivateOfficeRequest[]> {
	const res = await get<{ data: PrivateOfficeRequest[] }>(BASE)
	return res.data
}

export async function getPrivateOfficeRequest(id: number): Promise<PrivateOfficeRequest> {
	const res = await get<{ data: PrivateOfficeRequest }>(`${BASE}/${id}`)
	return res.data
}

export async function createPrivateOfficeRequest(payload: PrivateOfficeRequestPayload): Promise<PrivateOfficeRequest> {
	const res = await post<{ data: PrivateOfficeRequest }>(BASE, payload)
	return res.data
}

/**
 * Bakes in the one real status transition this UI performs — see the
 * MarkAsQuotedPayload doc comment in types/private-office-request.ts.
 */
export async function markPrivateOfficeRequestAsQuoted(id: number, payload: MarkAsQuotedPayload): Promise<MessageResponse> {
	return put<MessageResponse>(`${BASE}/${id}`, { status: "quoted", quote_ref: payload.quote_ref })
}

export async function removePrivateOfficeRequest(id: number): Promise<MessageResponse> {
	return del<MessageResponse>(`${BASE}/${id}`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/add-os/services/__tests__/private-office-requests.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/services/private-office-requests.ts src/add-os/services/__tests__/private-office-requests.spec.ts
git commit -m "feat(add-os): add Private Office Requests service"
```

---

### Task 5: Companies service

**Files:**
- Create: `src/add-os/services/companies.ts`
- Test: `src/add-os/services/__tests__/companies.spec.ts`

**Interfaces:**
- Consumes: `get/post/patch` from `./api`; `MessageResponse` from `./resource-factory`;
  types from Task 2.
- Produces: `listCompanies(): Promise<Company[]>`, `getCompany(id: number):
  Promise<Company>`, `createCompany(payload: CompanyPayload): Promise<Company>`,
  `updateCompanyStatus(id: number, payload: CompanyStatusPayload):
  Promise<MessageResponse>` — consumed by Tasks 9, 10, 16. **No update, no remove** —
  the collection confirms Companies has neither PUT nor DELETE.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/services/__tests__/companies.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createCompany, getCompany, listCompanies, updateCompanyStatus } from "../companies"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleCompany = {
	id: 1,
	private_office_request_id: 1,
	legal_name: "Levant Textiles LLC",
	contract_ref: "C-2026-0001",
	branch_id: 1,
	status: "active"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("companies service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listCompanies GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleCompany] }))

		const companies = await listCompanies()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/companies", expect.objectContaining({ method: "GET" }))
		expect(companies).toEqual([sampleCompany])
	})

	it("createCompany POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleCompany }, 201))

		const payload = {
			private_office_request_id: 1,
			legal_name: sampleCompany.legal_name,
			contract_ref: sampleCompany.contract_ref,
			branch_id: 1
		}
		const company = await createCompany(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(company).toEqual(sampleCompany)
	})

	it("getCompany GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleCompany }))

		const company = await getCompany(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/companies/1", expect.objectContaining({ method: "GET" }))
		expect(company).toEqual(sampleCompany)
	})

	it("updateCompanyStatus PATCHes /status and returns only the message", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const result = await updateCompanyStatus(1, { status: "inactive" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/1/status",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "inactive" }) })
		)
		expect(result).toEqual({ message: "Updated." })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/services/__tests__/companies.spec.ts`
Expected: FAIL — `Cannot find module '../companies'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/add-os/services/companies.ts
import type { Company, CompanyPayload, CompanyStatusPayload } from "@/add-os/modules/members/types/company"
import type { MessageResponse } from "./resource-factory"
import { get, patch, post } from "./api"

const BASE = "/api/v1/admin/companies"

export async function listCompanies(): Promise<Company[]> {
	const res = await get<{ data: Company[] }>(BASE)
	return res.data
}

export async function getCompany(id: number): Promise<Company> {
	const res = await get<{ data: Company }>(`${BASE}/${id}`)
	return res.data
}

export async function createCompany(payload: CompanyPayload): Promise<Company> {
	const res = await post<{ data: Company }>(BASE, payload)
	return res.data
}

export async function updateCompanyStatus(id: number, payload: CompanyStatusPayload): Promise<MessageResponse> {
	return patch<MessageResponse>(`${BASE}/${id}/status`, payload)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/add-os/services/__tests__/companies.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/services/companies.ts src/add-os/services/__tests__/companies.spec.ts
git commit -m "feat(add-os): add Companies service"
```

---

### Task 6: Company Members nested service

**Files:**
- Create: `src/add-os/services/company-members.ts`
- Test: `src/add-os/services/__tests__/company-members.spec.ts`

**Interfaces:**
- Consumes: `get/post/patch/del` from `./api`; `MessageResponse` from
  `./resource-factory`; types from Task 3.
- Produces: `createCompanyMembersApi(companyId: number): { list, add, updateDoorAccess,
  updateAdminFlag, remove }` — a factory, not standalone functions, per the brief's
  explicit "no string-concatenated path in every caller" requirement. Consumed by
  Task 9.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/services/__tests__/company-members.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createCompanyMembersApi } from "../company-members"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleMember = { user_id: 5, door_access_enabled: true, is_admin: false }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("company members nested service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("list() GETs /companies/{id}/members and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleMember] }))

		const members = await createCompanyMembersApi(3).list()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/3/members",
			expect.objectContaining({ method: "GET" })
		)
		expect(members).toEqual([sampleMember])
	})

	it("add() POSTs the payload and unwraps the created member", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleMember }, 201))

		const payload = { user_id: 5, door_access_enabled: true, is_admin: false }
		const member = await createCompanyMembersApi(3).add(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/3/members",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(member).toEqual(sampleMember)
	})

	it("updateDoorAccess() PATCHes /members/{userId} and returns only the message", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const result = await createCompanyMembersApi(3).updateDoorAccess(5, { door_access_enabled: false })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/3/members/5",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify({ door_access_enabled: false }) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("updateAdminFlag() PATCHes /members/{userId}/admin and returns only the message", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const result = await createCompanyMembersApi(3).updateAdminFlag(5, { is_admin: true })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/3/members/5/admin",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify({ is_admin: true }) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("remove() DELETEs /members/{userId}", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await createCompanyMembersApi(3).remove(5)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/3/members/5",
			expect.objectContaining({ method: "DELETE" })
		)
		expect(result).toEqual({ message: "Deleted." })
	})

	it("binds a different companyId per call — no shared base path", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [] }))

		await createCompanyMembersApi(7).list()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/7/members",
			expect.objectContaining({ method: "GET" })
		)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/services/__tests__/company-members.spec.ts`
Expected: FAIL — `Cannot find module '../company-members'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/add-os/services/company-members.ts
import type {
	AddCompanyMemberPayload,
	CompanyMember,
	UpdateAdminFlagPayload,
	UpdateDoorAccessPayload
} from "@/add-os/modules/members/types/company-member"
import type { MessageResponse } from "./resource-factory"
import { del, get, patch, post } from "./api"

/**
 * Built as a factory bound to one companyId — no caller string-concatenates
 * `/companies/${id}/members` by hand; every path is assembled once, here.
 */
export function createCompanyMembersApi(companyId: number) {
	const BASE = `/api/v1/admin/companies/${companyId}/members`

	return {
		list: async (): Promise<CompanyMember[]> => {
			const res = await get<{ data: CompanyMember[] }>(BASE)
			return res.data
		},
		add: async (payload: AddCompanyMemberPayload): Promise<CompanyMember> => {
			const res = await post<{ data: CompanyMember }>(BASE, payload)
			return res.data
		},
		updateDoorAccess: (userId: number, payload: UpdateDoorAccessPayload): Promise<MessageResponse> =>
			patch<MessageResponse>(`${BASE}/${userId}`, payload),
		updateAdminFlag: (userId: number, payload: UpdateAdminFlagPayload): Promise<MessageResponse> =>
			patch<MessageResponse>(`${BASE}/${userId}/admin`, payload),
		remove: (userId: number): Promise<MessageResponse> => del<MessageResponse>(`${BASE}/${userId}`)
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/add-os/services/__tests__/company-members.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/services/company-members.ts src/add-os/services/__tests__/company-members.spec.ts
git commit -m "feat(add-os): add Company Members nested service"
```

---

### Task 7: 5th architecture guard — no-direct-company-http.spec.ts

**Files:**
- Create: `src/add-os/__tests__/no-direct-company-http.spec.ts`

**Interfaces:**
- Consumes: nothing from application code — pure filesystem scan, following
  `no-external-urls.spec.ts`'s two-pass (source, then `dist/` if present) structure and
  `no-inline-role-checks.spec.ts`'s "only these files may reference X" allowlist idea.

- [ ] **Step 1: Write the guard**

```ts
// src/add-os/__tests__/no-direct-company-http.spec.ts
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = path.resolve(__dirname, "..", "..", "..")
const ADD_OS_DIR = path.join(ROOT, "src", "add-os")
const TEXT_EXT = /\.(?:ts|tsx|vue)$/i

/** Only these files may reference a Company Pipeline HTTP path — everything else must go through them. */
const ALLOWED_RELATIVE_FILES = new Set([
	"services/companies.ts",
	"services/private-office-requests.ts",
	"services/company-members.ts"
])

/** Leading-slash path fragments, not bare words — this avoids matching i18n keys
 * like "companies.columns.legalName" or nav path segments like `path: "companies"`. */
const PATH_MARKERS = ["/companies", "/private-office-requests"]

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (entry.name === "node_modules") continue
			walk(full, out)
		} else if (TEXT_EXT.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

function isAllowedSourceFile(file: string): boolean {
	const rel = path.relative(ADD_OS_DIR, file).replace(/\\/g, "/")
	if (ALLOWED_RELATIVE_FILES.has(rel)) return true
	// Each service's own spec exercises the literal path in test fixtures, by design.
	if (rel === "services/__tests__/companies.spec.ts") return true
	if (rel === "services/__tests__/private-office-requests.spec.ts") return true
	if (rel === "services/__tests__/company-members.spec.ts") return true
	if (rel === "__tests__/no-direct-company-http.spec.ts") return true
	return false
}

function findOffenders(files: string[]): string[] {
	return files
		.filter(f => !isAllowedSourceFile(f))
		.filter(f => {
			const text = readFileSync(f, "utf8")
			return PATH_MARKERS.some(marker => text.includes(marker))
		})
		.map(f => path.relative(ROOT, f).replace(/\\/g, "/"))
}

describe("company pipeline — no direct HTTP calls outside the service layer", () => {
	const sourceFiles = walk(ADD_OS_DIR)

	it("scans a non-empty surface", () => {
		expect(sourceFiles.length).toBeGreaterThan(10)
	})

	it("references /companies or /private-office-requests only from the dedicated service files", () => {
		const offenders = findOffenders(sourceFiles)
		expect(
			offenders,
			offenders.length ? `\nDirect Company Pipeline HTTP reference(s) outside the service layer:\n  ${offenders.join("\n  ")}\n` : ""
		).toEqual([])
	})

	const dist = path.join(ROOT, "dist")
	const built = existsSync(dist)

	it("has a build to check", () => {
		if (!built) {
			console.warn(
				"\n  [no-direct-company-http] dist/ absent — emitted-artifact pass SKIPPED." +
					"\n  Run `npm run build` before `npm run test:unit` for full coverage.\n"
			)
		}
		expect(true).toBe(true)
	})

	// Once bundled, an offending call site can no longer be attributed to a
	// source file — minification and chunking erase that. This pass is
	// intentionally a weaker smoke check (the endpoints still exist in the
	// build at all, proving the service layer wasn't tree-shaken away), not a
	// location check like the source pass above.
	it.runIf(built)("ships the Company Pipeline endpoints in the build", () => {
		const distFiles = walk(dist).filter(f => /\.(?:js|mjs)$/i.test(f))
		const text = distFiles.map(f => readFileSync(f, "utf8")).join("\n")
		for (const marker of PATH_MARKERS) {
			expect(text.includes(marker), `${marker} missing from the build`).toBe(true)
		}
	})
})
```

- [ ] **Step 2: Verify the guard passes on a clean tree**

Run: `npx vitest run src/add-os/__tests__/no-direct-company-http.spec.ts`
Expected: PASS — no Company Pipeline files exist yet outside this guard itself, so
there is nothing to find.

- [ ] **Step 3: Prove the guard actually catches an offender (temporary, reverted before finishing)**

Temporarily add one line to `src/add-os/views/ComingSoon.vue` (or any file outside the
allowlist):

```ts
// TEMPORARY — proves the guard fires, will be removed in the next step
const offendingPath = "/api/v1/admin/companies"
```

Run: `npx vitest run src/add-os/__tests__/no-direct-company-http.spec.ts`
Expected: **FAIL**, naming `src/add-os/views/ComingSoon.vue` as an offender.

- [ ] **Step 4: Revert the temporary offender**

Remove the line added in Step 3. Confirm `git diff -- src/add-os/views/ComingSoon.vue`
is empty.

Run: `npx vitest run src/add-os/__tests__/no-direct-company-http.spec.ts`
Expected: PASS again.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/__tests__/no-direct-company-http.spec.ts
git commit -m "test(add-os): add 5th architecture guard — no direct Company Pipeline HTTP calls"
```

---

### Task 8: i18n — nav rename + new resource namespaces

**Files:**
- Modify: `src/add-os/lang/en/en.json:339` (rename `formationRequests` →
  `privateOfficeRequests`), and append three new top-level namespaces after
  `resourceCrud` (currently ends at line 369).
- Modify: `src/add-os/lang/ar/ar.json:343` (same rename), same three new namespaces.

**Interfaces:**
- Produces: `nav.pages.privateOfficeRequests`, `privateOfficeRequests.*`,
  `companies.*`, `companyMembers.*` — consumed by Tasks 12, 14, 15, 16, 17.

- [ ] **Step 1: Rename the nav page key in English**

In `src/add-os/lang/en/en.json`, change line 339:

```json
			"formationRequests": "Formation requests",
```
to
```json
			"privateOfficeRequests": "Private office requests",
```

- [ ] **Step 2: Rename the nav page key in Arabic**

In `src/add-os/lang/ar/ar.json`, change line 343:

```json
			"formationRequests": "طلبات التأسيس",
```
to
```json
			"privateOfficeRequests": "طلبات المكاتب الخاصة",
```

- [ ] **Step 3: Append the three new namespaces to en.json**

Change the file's ending (currently lines 366–370):

```json
		"validation": {
			"required": "{field} is required."
		}
	}
}
```
to
```json
		"validation": {
			"required": "{field} is required."
		}
	},
	"privateOfficeRequests": {
		"description": "Prospects requesting a private office, moving from requested to quoted to contracted.",
		"columns": { "prospectName": "Prospect", "contact": "Contact", "status": "Status", "quoteRef": "Quote ref", "actions": "Actions" },
		"status": { "requested": "Requested", "quoted": "Quoted", "contracted": "Contracted" },
		"create": { "button": "New request", "title": "New private office request", "success": "Request created." },
		"markAsQuoted": {
			"button": "Convert to quote",
			"title": "Convert to quote",
			"quoteRefLabel": "Quote reference",
			"quoteRefPlaceholder": "Q-2026-0001",
			"success": "Request marked as quoted."
		},
		"contractedLocked": "This request became a company and can no longer change status here.",
		"delete": { "success": "Request deleted." },
		"form": { "prospectName": "Prospect name", "contact": "Contact" },
		"validation": {
			"prospectNameRequired": "Prospect name is required.",
			"contactRequired": "Contact is required.",
			"quoteRefRequired": "Quote reference is required."
		},
		"loadError": "Couldn't load private office requests. You may not have permission to view this page.",
		"empty": "No private office requests found.",
		"stats": { "total": "Total requests", "requested": "Requested", "quoted": "Quoted", "contracted": "Contracted" }
	},
	"companies": {
		"description": "Companies created from a quoted private office request. Created here only — never self-service.",
		"columns": { "legalName": "Legal name", "contractRef": "Contract ref", "branch": "Branch", "status": "Status", "actions": "Actions" },
		"status": { "active": "Active", "inactive": "Inactive" },
		"create": {
			"button": "New company",
			"title": "New company",
			"success": "Company created.",
			"noQuotedRequestsTitle": "No quoted requests yet",
			"noQuotedRequestsBody": "A company can only be created from a quoted private office request. Go to Private Office Requests and convert one to a quote first.",
			"goToRequests": "Go to Private Office Requests"
		},
		"changeStatus": { "button": "Change status", "title": "Change status", "success": "Status updated." },
		"viewMembers": { "button": "View members" },
		"form": { "privateOfficeRequest": "Private office request", "branch": "Branch", "legalName": "Legal name", "contractRef": "Contract ref" },
		"validation": {
			"privateOfficeRequestRequired": "A quoted request is required.",
			"branchRequired": "Branch is required.",
			"legalNameRequired": "Legal name is required.",
			"contractRefRequired": "Contract ref is required."
		},
		"loadError": "Couldn't load companies. You may not have permission to view this page.",
		"empty": "No companies found.",
		"stats": { "total": "Total companies", "active": "Active", "inactive": "Inactive" },
		"detail": { "title": "Company", "loadError": "Couldn't load this company." }
	},
	"companyMembers": {
		"columns": { "userId": "User ID", "doorAccess": "Door access", "isAdmin": "Admin", "actions": "Actions" },
		"add": {
			"button": "Add member",
			"title": "Add company member",
			"userLabel": "User",
			"userRequired": "Select a user.",
			"doorAccessLabel": "Door access enabled",
			"adminLabel": "Company admin",
			"adminHint": "The first admin for a company can only be set here — an existing company admin can only promote another member, not appoint the first one.",
			"success": "Member added.",
			"alreadyMemberError": "This user is already a member of this company."
		},
		"remove": {
			"confirmTitle": "Remove this member?",
			"confirmOk": "Remove",
			"confirmCancel": "Cancel",
			"success": "Member removed."
		}
	}
}
```

- [ ] **Step 4: Append the matching three namespaces to ar.json**

Change ar.json's identical ending block (same line numbers, same nesting) to:

```json
		"validation": {
			"required": "{field} مطلوب."
		}
	},
	"privateOfficeRequests": {
		"description": "طلبات العملاء المحتملين لمكتب خاص، من مُقدَّم إلى مُسعَّر إلى متعاقَد.",
		"columns": { "prospectName": "العميل المحتمل", "contact": "التواصل", "status": "الحالة", "quoteRef": "مرجع العرض", "actions": "إجراءات" },
		"status": { "requested": "مُقدَّم", "quoted": "مُسعَّر", "contracted": "متعاقَد" },
		"create": { "button": "طلب جديد", "title": "طلب مكتب خاص جديد", "success": "تم إنشاء الطلب." },
		"markAsQuoted": {
			"button": "تحويل إلى عرض سعر",
			"title": "تحويل إلى عرض سعر",
			"quoteRefLabel": "مرجع عرض السعر",
			"quoteRefPlaceholder": "Q-2026-0001",
			"success": "تم تحويل الطلب إلى مُسعَّر."
		},
		"contractedLocked": "أصبح هذا الطلب شركة ولا يمكن تغيير حالته من هنا بعد الآن.",
		"delete": { "success": "تم حذف الطلب." },
		"form": { "prospectName": "اسم العميل المحتمل", "contact": "التواصل" },
		"validation": {
			"prospectNameRequired": "اسم العميل المحتمل مطلوب.",
			"contactRequired": "معلومات التواصل مطلوبة.",
			"quoteRefRequired": "مرجع عرض السعر مطلوب."
		},
		"loadError": "تعذّر تحميل طلبات المكاتب الخاصة. قد لا تملك صلاحية عرض هذه الصفحة.",
		"empty": "لا توجد طلبات مكاتب خاصة.",
		"stats": { "total": "إجمالي الطلبات", "requested": "مُقدَّمة", "quoted": "مُسعَّرة", "contracted": "متعاقَدة" }
	},
	"companies": {
		"description": "الشركات المُنشأة من طلب مكتب خاص مُسعَّر. تُنشأ من هنا فقط — لا خدمة ذاتية أبداً.",
		"columns": { "legalName": "الاسم القانوني", "contractRef": "مرجع العقد", "branch": "الفرع", "status": "الحالة", "actions": "إجراءات" },
		"status": { "active": "نشطة", "inactive": "غير نشطة" },
		"create": {
			"button": "شركة جديدة",
			"title": "شركة جديدة",
			"success": "تم إنشاء الشركة.",
			"noQuotedRequestsTitle": "لا توجد طلبات مُسعَّرة بعد",
			"noQuotedRequestsBody": "لا يمكن إنشاء شركة إلا من طلب مكتب خاص مُسعَّر. توجّه إلى طلبات المكاتب الخاصة وحوّل طلباً إلى عرض سعر أولاً.",
			"goToRequests": "الذهاب إلى طلبات المكاتب الخاصة"
		},
		"changeStatus": { "button": "تغيير الحالة", "title": "تغيير الحالة", "success": "تم تحديث الحالة." },
		"viewMembers": { "button": "عرض الأعضاء" },
		"form": { "privateOfficeRequest": "طلب المكتب الخاص", "branch": "الفرع", "legalName": "الاسم القانوني", "contractRef": "مرجع العقد" },
		"validation": {
			"privateOfficeRequestRequired": "طلب مُسعَّر مطلوب.",
			"branchRequired": "الفرع مطلوب.",
			"legalNameRequired": "الاسم القانوني مطلوب.",
			"contractRefRequired": "مرجع العقد مطلوب."
		},
		"loadError": "تعذّر تحميل الشركات. قد لا تملك صلاحية عرض هذه الصفحة.",
		"empty": "لا توجد شركات.",
		"stats": { "total": "إجمالي الشركات", "active": "نشطة", "inactive": "غير نشطة" },
		"detail": { "title": "الشركة", "loadError": "تعذّر تحميل بيانات هذه الشركة." }
	},
	"companyMembers": {
		"columns": { "userId": "معرّف المستخدم", "doorAccess": "الوصول للأبواب", "isAdmin": "أدمن", "actions": "إجراءات" },
		"add": {
			"button": "إضافة عضو",
			"title": "إضافة عضو للشركة",
			"userLabel": "المستخدم",
			"userRequired": "اختر مستخدماً.",
			"doorAccessLabel": "تفعيل الوصول للأبواب",
			"adminLabel": "أدمن الشركة",
			"adminHint": "أول أدمن للشركة لا يُعيَّن إلا من هنا — أدمن الشركة القائم لا يستطيع إلا ترقية عضو موجود، لا تعيين الأول.",
			"success": "تمت إضافة العضو.",
			"alreadyMemberError": "هذا المستخدم عضو بالفعل في هذه الشركة."
		},
		"remove": {
			"confirmTitle": "إزالة هذا العضو؟",
			"confirmOk": "إزالة",
			"confirmCancel": "إلغاء",
			"success": "تمت إزالة العضو."
		}
	}
}
```

(Do not change ar.json's existing `"required": "{field} مطلوب."` line if it already
reads that way — copy the file's actual current text for that one line verbatim; only
the content **after** it, from `},` onward, is new.)

- [ ] **Step 2: Run the bilingual invariant test**

Run: `npx vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS — key parity, no blanks, no Arabic-in-English, Arabic bundle actually
translated.

- [ ] **Step 3: Commit**

```bash
git add src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add Company Pipeline i18n strings; rename formationRequests to privateOfficeRequests"
```

---

### Task 9: `useCompanyDetail` composable

**Files:**
- Create: `src/add-os/modules/members/composables/useCompanyDetail.ts`
- Test: `src/add-os/modules/members/composables/__tests__/useCompanyDetail.spec.ts`

**Interfaces:**
- Consumes: `getCompany` (Task 5), `createCompanyMembersApi` (Task 6), `listUsers`
  (existing `services/users.ts`), `useResourceList` (existing), `ApiError` (existing).
- Produces: `useCompanyDetail(companyId: number): { company: Ref<Company|null>,
  isLoadingCompany: Ref<boolean>, companyError: Ref<ApiError|null>, refetchCompany:
  () => Promise<void>, members: Ref<CompanyMember[]>, isLoadingMembers: Ref<boolean>,
  membersError: Ref<ApiError|null>, refetchMembers: () => Promise<void>, users:
  Ref<User[]>, isLoadingUsers: Ref<boolean>, addMember: (payload:
  AddCompanyMemberPayload) => Promise<CompanyMember>, setDoorAccess: (userId: number,
  payload: UpdateDoorAccessPayload) => Promise<void>, setAdminFlag: (userId: number,
  payload: UpdateAdminFlagPayload) => Promise<void>, removeMember: (userId: number) =>
  Promise<void> }` — consumed by Tasks 14, 15.

This is the first single-entity detail composable in this codebase (confirmed: no
`use*Detail` precedent exists). It does not toast or navigate — it is pure data/actions,
matching how `useResourceList` stays presentation-free; toasting for these actions is
each caller's own responsibility (Tasks 14, 15), exactly as `useResourceList` leaves
toasting to its callers today.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/modules/members/composables/__tests__/useCompanyDetail.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/add-os/services/api"
import { useCompanyDetail } from "../useCompanyDetail"

const getCompanyMock = vi.fn()
const listUsersMock = vi.fn()
const membersListMock = vi.fn()
const membersAddMock = vi.fn()
const membersUpdateDoorAccessMock = vi.fn()
const membersUpdateAdminFlagMock = vi.fn()
const membersRemoveMock = vi.fn()

vi.mock("@/add-os/services/companies", () => ({
	getCompany: (id: number) => getCompanyMock(id)
}))

vi.mock("@/add-os/services/users", () => ({
	listUsers: () => listUsersMock()
}))

vi.mock("@/add-os/services/company-members", () => ({
	createCompanyMembersApi: (companyId: number) => ({
		list: () => membersListMock(companyId),
		add: (payload: unknown) => membersAddMock(companyId, payload),
		updateDoorAccess: (userId: number, payload: unknown) => membersUpdateDoorAccessMock(companyId, userId, payload),
		updateAdminFlag: (userId: number, payload: unknown) => membersUpdateAdminFlagMock(companyId, userId, payload),
		remove: (userId: number) => membersRemoveMock(companyId, userId)
	})
}))

const sampleCompany = { id: 3, private_office_request_id: 1, legal_name: "Acme", contract_ref: "C-1", branch_id: 1, status: "active" }
const sampleMember = { user_id: 5, door_access_enabled: true, is_admin: false }
const sampleUser = { id: 5, name: "Sara", phone: "0999", email: "sara@add.sy", preferred_language: "ar", preferred_currency: "SYP", status: "active", roles: [] }

async function flush() {
	await Promise.resolve()
	await Promise.resolve()
}

describe("useCompanyDetail", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		getCompanyMock.mockResolvedValue(sampleCompany)
		listUsersMock.mockResolvedValue([sampleUser])
		membersListMock.mockResolvedValue([sampleMember])
		membersAddMock.mockResolvedValue(sampleMember)
		membersUpdateDoorAccessMock.mockResolvedValue({ message: "ok" })
		membersUpdateAdminFlagMock.mockResolvedValue({ message: "ok" })
		membersRemoveMock.mockResolvedValue({ message: "ok" })
	})

	it("eagerly fetches the company, its members, and the user list, scoped to companyId", async () => {
		const detail = useCompanyDetail(3)
		await flush()

		expect(getCompanyMock).toHaveBeenCalledWith(3)
		expect(membersListMock).toHaveBeenCalledWith(3)
		expect(listUsersMock).toHaveBeenCalled()
		expect(detail.company.value).toEqual(sampleCompany)
		expect(detail.members.value).toEqual([sampleMember])
		expect(detail.users.value).toEqual([sampleUser])
		expect(detail.isLoadingCompany.value).toBe(false)
		expect(detail.isLoadingMembers.value).toBe(false)
	})

	it("addMember() adds via the company-scoped members api and refetches members", async () => {
		const detail = useCompanyDetail(3)
		await flush()
		membersListMock.mockResolvedValueOnce([sampleMember, { user_id: 9, door_access_enabled: false, is_admin: false }])

		await detail.addMember({ user_id: 9, door_access_enabled: false, is_admin: false })

		expect(membersAddMock).toHaveBeenCalledWith(3, { user_id: 9, door_access_enabled: false, is_admin: false })
		expect(membersListMock).toHaveBeenCalledTimes(2)
		expect(detail.members.value).toHaveLength(2)
	})

	it("setDoorAccess() updates via the members api and refetches members", async () => {
		const detail = useCompanyDetail(3)
		await flush()

		await detail.setDoorAccess(5, { door_access_enabled: false })

		expect(membersUpdateDoorAccessMock).toHaveBeenCalledWith(3, 5, { door_access_enabled: false })
		expect(membersListMock).toHaveBeenCalledTimes(2)
	})

	it("setAdminFlag() updates via the members api and refetches members", async () => {
		const detail = useCompanyDetail(3)
		await flush()

		await detail.setAdminFlag(5, { is_admin: true })

		expect(membersUpdateAdminFlagMock).toHaveBeenCalledWith(3, 5, { is_admin: true })
		expect(membersListMock).toHaveBeenCalledTimes(2)
	})

	it("removeMember() removes via the members api and refetches members", async () => {
		const detail = useCompanyDetail(3)
		await flush()

		await detail.removeMember(5)

		expect(membersRemoveMock).toHaveBeenCalledWith(3, 5)
		expect(membersListMock).toHaveBeenCalledTimes(2)
	})

	it("refetchCompany() re-fetches only the company by its own id", async () => {
		const detail = useCompanyDetail(3)
		await flush()
		getCompanyMock.mockResolvedValueOnce({ ...sampleCompany, status: "inactive" })

		await detail.refetchCompany()

		expect(getCompanyMock).toHaveBeenCalledTimes(2)
		expect(detail.company.value?.status).toBe("inactive")
	})

	it("sets companyError on a failed company fetch, without throwing", async () => {
		getCompanyMock.mockRejectedValueOnce(new ApiError(403, JSON.stringify({ message: "Forbidden" })))

		const detail = useCompanyDetail(3)
		await flush()

		expect(detail.company.value).toBeNull()
		expect(detail.companyError.value).toBeInstanceOf(ApiError)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/modules/members/composables/__tests__/useCompanyDetail.spec.ts`
Expected: FAIL — `Cannot find module '../useCompanyDetail'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/add-os/modules/members/composables/useCompanyDetail.ts
import { ref } from "vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import type {
	AddCompanyMemberPayload,
	CompanyMember,
	UpdateAdminFlagPayload,
	UpdateDoorAccessPayload
} from "@/add-os/modules/members/types/company-member"
import type { Company } from "@/add-os/modules/members/types/company"
import { ApiError } from "@/add-os/services/api"
import { getCompany } from "@/add-os/services/companies"
import { createCompanyMembersApi } from "@/add-os/services/company-members"
import { listUsers } from "@/add-os/services/users"

/**
 * The one shared fetch/mutate surface for a single company: its own record,
 * its members, and the user list needed to add one. Every consumer of company
 * data — the detail panel, the shared AddCompanyMemberDialog, anything future —
 * calls this instead of writing its own fetch logic.
 */
export function useCompanyDetail(companyId: number) {
	const company = ref<Company | null>(null)
	const isLoadingCompany = ref(true)
	const companyError = ref<ApiError | null>(null)

	async function refetchCompany() {
		isLoadingCompany.value = true
		companyError.value = null
		try {
			company.value = await getCompany(companyId)
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			companyError.value = caught
			company.value = null
		} finally {
			isLoadingCompany.value = false
		}
	}
	refetchCompany()

	const membersApi = createCompanyMembersApi(companyId)
	const {
		data: members,
		isLoading: isLoadingMembers,
		error: membersError,
		refetch: refetchMembers
	} = useResourceList<CompanyMember>(membersApi.list)

	const { data: users, isLoading: isLoadingUsers } = useResourceList(listUsers)

	async function addMember(payload: AddCompanyMemberPayload) {
		const member = await membersApi.add(payload)
		await refetchMembers()
		return member
	}

	async function setDoorAccess(userId: number, payload: UpdateDoorAccessPayload) {
		await membersApi.updateDoorAccess(userId, payload)
		await refetchMembers()
	}

	async function setAdminFlag(userId: number, payload: UpdateAdminFlagPayload) {
		await membersApi.updateAdminFlag(userId, payload)
		await refetchMembers()
	}

	async function removeMember(userId: number) {
		await membersApi.remove(userId)
		await refetchMembers()
	}

	return {
		company,
		isLoadingCompany,
		companyError,
		refetchCompany,
		members,
		isLoadingMembers,
		membersError,
		refetchMembers,
		users,
		isLoadingUsers,
		addMember,
		setDoorAccess,
		setAdminFlag,
		removeMember
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/add-os/modules/members/composables/__tests__/useCompanyDetail.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/members/composables/useCompanyDetail.ts src/add-os/modules/members/composables/__tests__/useCompanyDetail.spec.ts
git commit -m "feat(add-os): add useCompanyDetail composable"
```

---

### Task 10: `useCompanyMutations` composable (create + status change)

**Files:**
- Create: `src/add-os/modules/members/composables/useCompanyMutations.ts`
- Test: `src/add-os/modules/members/composables/__tests__/useCompanyMutations.spec.ts`

**Interfaces:**
- Consumes: `createCompany`, `updateCompanyStatus` (Task 5); `ApiError` (existing);
  `useMessage` (naive-ui), `useI18n` (vue-i18n).
- Produces: `useCompanyCreation(refetchRequests: () => Promise<void>, refetchCompanies:
  () => Promise<void>): { submit: (payload: CompanyPayload) => Promise<Company>,
  isSubmitting: Ref<boolean> }`, `useCompanyStatusChange(refetchCompanies: () =>
  Promise<void>): { submit: (id: number, payload: CompanyStatusPayload) =>
  Promise<void>, isSubmitting: Ref<boolean> }` — consumed by Task 16.

Companies has no PUT/DELETE, so it cannot use `useResourceMutations`'s
create+update+remove triplet without fabricating a `remove` that nothing calls. These
two small composables mirror `useResourceMutations`'s own `run()` toast/rethrow shape
(403 → fixed message, 422/other → server message or generic, always rethrow) for exactly
the two mutations Companies has, without touching the shared file.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/modules/members/composables/__tests__/useCompanyMutations.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/add-os/services/api"
import { useCompanyCreation, useCompanyStatusChange } from "../useCompanyMutations"

const { successMock, errorMock } = vi.hoisted(() => ({ successMock: vi.fn(), errorMock: vi.fn() }))

vi.mock("naive-ui", () => ({
	useMessage: () => ({ success: successMock, error: errorMock })
}))

vi.mock("vue-i18n", () => ({
	useI18n: () => ({
		t: (key: string) => {
			if (key === "resourceCrud.mutations.genericError") return "Something went wrong. Please try again."
			if (key === "resourceCrud.mutations.permissionError") return "You don't have permission for this action."
			if (key === "companies.create.success") return "Company created."
			if (key === "companies.changeStatus.success") return "Status updated."
			return key
		}
	})
}))

const createCompanyMock = vi.fn()
const updateCompanyStatusMock = vi.fn()

vi.mock("@/add-os/services/companies", () => ({
	createCompany: (payload: unknown) => createCompanyMock(payload),
	updateCompanyStatus: (id: number, payload: unknown) => updateCompanyStatusMock(id, payload)
}))

const samplePayload = { private_office_request_id: 1, legal_name: "Acme", contract_ref: "C-1", branch_id: 1 }
const sampleCompany = { id: 1, ...samplePayload, status: "active" }

describe("useCompanyCreation", () => {
	beforeEach(() => vi.clearAllMocks())

	it("creates, toasts success, and refetches both requests and companies", async () => {
		createCompanyMock.mockResolvedValue(sampleCompany)
		const refetchRequests = vi.fn().mockResolvedValue(undefined)
		const refetchCompanies = vi.fn().mockResolvedValue(undefined)
		const { submit } = useCompanyCreation(refetchRequests, refetchCompanies)

		const result = await submit(samplePayload)

		expect(createCompanyMock).toHaveBeenCalledWith(samplePayload)
		expect(successMock).toHaveBeenCalledWith("Company created.")
		expect(refetchRequests).toHaveBeenCalledOnce()
		expect(refetchCompanies).toHaveBeenCalledOnce()
		expect(result).toEqual(sampleCompany)
	})

	it("on a 422, rethrows without toasting (so the drawer maps field errors)", async () => {
		const failure = new ApiError(422, JSON.stringify({ message: "Invalid.", errors: { branch_id: ["Required."] } }))
		createCompanyMock.mockRejectedValue(failure)
		const refetchRequests = vi.fn()
		const refetchCompanies = vi.fn()
		const { submit } = useCompanyCreation(refetchRequests, refetchCompanies)

		await expect(submit(samplePayload)).rejects.toBe(failure)

		expect(errorMock).not.toHaveBeenCalled()
		expect(refetchRequests).not.toHaveBeenCalled()
	})

	it("on a 403, toasts the fixed permission message and rethrows", async () => {
		const failure = new ApiError(403, JSON.stringify({ message: "Unauthorized." }))
		createCompanyMock.mockRejectedValue(failure)
		const { submit } = useCompanyCreation(vi.fn(), vi.fn())

		await expect(submit(samplePayload)).rejects.toBe(failure)

		expect(errorMock).toHaveBeenCalledWith("You don't have permission for this action.")
	})

	it("on a non-422/403 ApiError, toasts the server message and rethrows", async () => {
		const failure = new ApiError(409, JSON.stringify({ message: "That request is not quoted." }))
		createCompanyMock.mockRejectedValue(failure)
		const { submit } = useCompanyCreation(vi.fn(), vi.fn())

		await expect(submit(samplePayload)).rejects.toBe(failure)

		expect(errorMock).toHaveBeenCalledWith("That request is not quoted.")
	})
})

describe("useCompanyStatusChange", () => {
	beforeEach(() => vi.clearAllMocks())

	it("updates status, toasts success, and refetches companies", async () => {
		updateCompanyStatusMock.mockResolvedValue({ message: "ok" })
		const refetchCompanies = vi.fn().mockResolvedValue(undefined)
		const { submit } = useCompanyStatusChange(refetchCompanies)

		await submit(1, { status: "inactive" })

		expect(updateCompanyStatusMock).toHaveBeenCalledWith(1, { status: "inactive" })
		expect(successMock).toHaveBeenCalledWith("Status updated.")
		expect(refetchCompanies).toHaveBeenCalledOnce()
	})

	it("on failure, toasts and rethrows without refetching", async () => {
		const failure = new ApiError(422, JSON.stringify({ message: "Invalid status." }))
		updateCompanyStatusMock.mockRejectedValue(failure)
		const refetchCompanies = vi.fn()
		const { submit } = useCompanyStatusChange(refetchCompanies)

		await expect(submit(1, { status: "inactive" })).rejects.toBe(failure)

		expect(errorMock).toHaveBeenCalledWith("Invalid status.")
		expect(refetchCompanies).not.toHaveBeenCalled()
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/modules/members/composables/__tests__/useCompanyMutations.spec.ts`
Expected: FAIL — `Cannot find module '../useCompanyMutations'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/add-os/modules/members/composables/useCompanyMutations.ts
import { useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import type { Company, CompanyPayload, CompanyStatusPayload } from "@/add-os/modules/members/types/company"
import { ApiError } from "@/add-os/services/api"
import { createCompany, updateCompanyStatus } from "@/add-os/services/companies"

/**
 * Companies has no PUT/DELETE (confirmed in the Postman collection's own
 * description), so it doesn't fit useResourceMutations's create+update+remove
 * triplet. These two composables cover exactly the two mutations that exist,
 * mirroring useResourceMutations's own toast/rethrow shape without touching
 * that shared file or its existing consumers.
 */
export function useCompanyCreation(refetchRequests: () => Promise<void>, refetchCompanies: () => Promise<void>) {
	const message = useMessage()
	const { t } = useI18n()
	const isSubmitting = ref(false)

	async function submit(payload: CompanyPayload): Promise<Company> {
		isSubmitting.value = true
		try {
			const company = await createCompany(payload)
			message.success(t("companies.create.success"))
			await Promise.all([refetchRequests(), refetchCompanies()])
			return company
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			if (caught.status === 422) throw caught
			if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
			else message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			throw caught
		} finally {
			isSubmitting.value = false
		}
	}

	return { submit, isSubmitting }
}

export function useCompanyStatusChange(refetchCompanies: () => Promise<void>) {
	const message = useMessage()
	const { t } = useI18n()
	const isSubmitting = ref(false)

	async function submit(id: number, payload: CompanyStatusPayload): Promise<void> {
		isSubmitting.value = true
		try {
			await updateCompanyStatus(id, payload)
			message.success(t("companies.changeStatus.success"))
			await refetchCompanies()
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
			else message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			throw caught
		} finally {
			isSubmitting.value = false
		}
	}

	return { submit, isSubmitting }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/add-os/modules/members/composables/__tests__/useCompanyMutations.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/members/composables/useCompanyMutations.ts src/add-os/modules/members/composables/__tests__/useCompanyMutations.spec.ts
git commit -m "feat(add-os): add useCompanyCreation and useCompanyStatusChange composables"
```

---

### Task 11: Private Office Requests config (columns + create fields)

**Files:**
- Create: `src/add-os/modules/members/config/private-office-requests.config.ts`

**Interfaces:**
- Consumes: `FieldDescriptor` (existing `components/resource/field-types.ts`), types
  from Task 1.
- Produces: `buildRequestColumns(t, onQuote, onDelete): DataTableColumns<PrivateOfficeRequest>`,
  `requestFields: FieldDescriptor<PrivateOfficeRequestPayload>[]`,
  `emptyRequestPayload(): PrivateOfficeRequestPayload` — consumed by Task 12.

- [ ] **Step 1: Write the file**

```ts
// src/add-os/modules/members/config/private-office-requests.config.ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { PrivateOfficeRequest, PrivateOfficeRequestPayload } from "@/add-os/modules/members/types/private-office-request"
import { NButton, NTag, NTooltip } from "naive-ui"
import { h } from "vue"
import Icon from "@/components/common/Icon.vue"

const STATUS_TAG_TYPE: Record<PrivateOfficeRequest["status"], "info" | "warning" | "success"> = {
	requested: "info",
	quoted: "warning",
	contracted: "success"
}

export function buildRequestColumns(
	t: ComposerTranslation,
	onQuote: (row: PrivateOfficeRequest) => void,
	onDelete: (row: PrivateOfficeRequest) => void
): DataTableColumns<PrivateOfficeRequest> {
	return [
		{ title: t("privateOfficeRequests.columns.prospectName"), key: "prospect_name" },
		{ title: t("privateOfficeRequests.columns.contact"), key: "contact" },
		{
			title: t("privateOfficeRequests.columns.status"),
			key: "status",
			render: row =>
				h(NTag, { type: STATUS_TAG_TYPE[row.status], round: true, bordered: true }, { default: () => t(`privateOfficeRequests.status.${row.status}`) })
		},
		{ title: t("privateOfficeRequests.columns.quoteRef"), key: "quote_ref", render: row => row.quote_ref ?? "—" },
		{
			title: t("privateOfficeRequests.columns.actions"),
			key: "actions",
			render: row => {
				const buttons = []

				if (row.status === "requested") {
					const label = t("privateOfficeRequests.markAsQuoted.button")
					buttons.push(
						h(
							NButton,
							{ text: true, type: "primary", "aria-label": label, title: label, onClick: () => onQuote(row) },
							{ icon: () => h(Icon, { name: "carbon:currency", size: 18 }) }
						)
					)
				}

				if (row.status === "contracted") {
					// Prevented in the UI with an explanation, not silently omitted.
					buttons.push(
						h(
							NTooltip,
							{},
							{
								trigger: () => h(NButton, { text: true, disabled: true }, { icon: () => h(Icon, { name: "carbon:locked", size: 18 }) }),
								default: () => t("privateOfficeRequests.contractedLocked")
							}
						)
					)
				}

				const deleteLabel = t("resourceCrud.table.deleteAction")
				buttons.push(
					h(
						NButton,
						{ text: true, type: "error", "aria-label": deleteLabel, title: deleteLabel, onClick: () => onDelete(row) },
						{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
					)
				)

				return h("div", { class: "flex gap-2" }, buttons)
			}
		}
	]
}

export const requestFields: FieldDescriptor<PrivateOfficeRequestPayload>[] = [
	{ key: "prospect_name", labelKey: "privateOfficeRequests.form.prospectName", type: "text", required: true },
	{ key: "contact", labelKey: "privateOfficeRequests.form.contact", type: "text", required: true }
]

export function emptyRequestPayload(): PrivateOfficeRequestPayload {
	return { prospect_name: "", contact: "" }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/add-os/modules/members/config/private-office-requests.config.ts
git commit -m "feat(add-os): add Private Office Requests table/form config"
```

---

### Task 12: `PrivateOfficeRequestsPage.vue`

**Files:**
- Create: `src/add-os/modules/members/views/PrivateOfficeRequestsPage.vue`
- Test: `src/add-os/modules/members/views/__tests__/PrivateOfficeRequestsPage.spec.ts`
  (source-scan guard, following `UsersPage.spec.ts`'s precedent that a full page mount
  isn't worth a new harness — the real behavior is already covered by Tasks 4 and 11's
  unit tests).

**Interfaces:**
- Consumes: `useResourceList`, `useResourceMutations` (existing);
  `listPrivateOfficeRequests`, `createPrivateOfficeRequest`,
  `markPrivateOfficeRequestAsQuoted`, `removePrivateOfficeRequest` (Task 4);
  `buildRequestColumns`, `requestFields`, `emptyRequestPayload` (Task 11);
  `ResourceFormDrawer`, `ResourceStatCards` (existing).
- Produces: the page component, registered in Task 17.

- [ ] **Step 1: Write the page**

```vue
<!-- src/add-os/modules/members/views/PrivateOfficeRequestsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.privateOfficeRequests") }}</h1>
			<p>{{ t("privateOfficeRequests.description") }}</p>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />
		<n-alert v-if="error" type="error" :title="t('privateOfficeRequests.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("privateOfficeRequests.create.button") }}
			</n-button>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table v-if="data.length > 0 || isLoading" :columns :data :loading="isLoading" :bordered="false" :row-key />
			<div v-else class="py-10 text-center">{{ t("privateOfficeRequests.empty") }}</div>
		</n-card>

		<ResourceFormDrawer
			v-model:show="createDrawerVisible"
			v-model:model="createForm"
			:fields="requestFields"
			:title="t('privateOfficeRequests.create.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submitCreate"
		/>

		<n-modal v-model:show="quoteModalVisible" preset="card" :title="t('privateOfficeRequests.markAsQuoted.title')" class="max-w-md">
			<n-form>
				<n-form-item :label="t('privateOfficeRequests.markAsQuoted.quoteRefLabel')">
					<n-input v-model:value="quoteForm.quote_ref" :placeholder="t('privateOfficeRequests.markAsQuoted.quoteRefPlaceholder')" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="quoteModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="mutations.isSubmitting.value" @click="submitQuote">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { MarkAsQuotedPayload, PrivateOfficeRequest, PrivateOfficeRequestPayload } from "@/add-os/modules/members/types/private-office-request"
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, useDialog } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { buildRequestColumns, emptyRequestPayload, requestFields } from "@/add-os/modules/members/config/private-office-requests.config"
import {
	createPrivateOfficeRequest,
	listPrivateOfficeRequests,
	markPrivateOfficeRequestAsQuoted,
	removePrivateOfficeRequest
} from "@/add-os/services/private-office-requests"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()
const { t } = useI18n()
const dialog = useDialog()

const { data, isLoading, error, refetch } = useResourceList<PrivateOfficeRequest>(listPrivateOfficeRequests)

const mutations = useResourceMutations(
	{ create: createPrivateOfficeRequest, update: markPrivateOfficeRequestAsQuoted, remove: removePrivateOfficeRequest },
	refetch,
	{
		createSuccess: t("privateOfficeRequests.create.success"),
		updateSuccess: t("privateOfficeRequests.markAsQuoted.success"),
		deleteSuccess: t("privateOfficeRequests.delete.success")
	}
)

const statCards = computed<StatCard[]>(() => [
	{ label: t("privateOfficeRequests.stats.total"), value: data.value.length },
	{ label: t("privateOfficeRequests.stats.requested"), value: data.value.filter(r => r.status === "requested").length },
	{ label: t("privateOfficeRequests.stats.quoted"), value: data.value.filter(r => r.status === "quoted").length },
	{ label: t("privateOfficeRequests.stats.contracted"), value: data.value.filter(r => r.status === "contracted").length }
])

function rowKey(row: PrivateOfficeRequest) {
	return row.id
}

function confirmDelete(row: PrivateOfficeRequest) {
	dialog.warning({
		title: t("resourceCrud.table.deleteConfirmTitle"),
		positiveText: t("resourceCrud.table.deleteConfirmOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => mutations.remove(row.id)
	})
}

const columns = computed<DataTableColumns<PrivateOfficeRequest>>(() => buildRequestColumns(t, openQuote, confirmDelete))

const createDrawerVisible = ref(false)
const createForm = ref<PrivateOfficeRequestPayload>(emptyRequestPayload())

function openCreate() {
	createForm.value = emptyRequestPayload()
	createDrawerVisible.value = true
}

async function submitCreate(payload: Record<string, unknown>) {
	await mutations.create(payload as unknown as PrivateOfficeRequestPayload)
}

const quoteModalVisible = ref(false)
const quoteTargetId = ref<number | null>(null)
const quoteForm = ref<MarkAsQuotedPayload>({ quote_ref: "" })

function openQuote(row: PrivateOfficeRequest) {
	quoteTargetId.value = row.id
	quoteForm.value = { quote_ref: "" }
	quoteModalVisible.value = true
}

async function submitQuote() {
	if (quoteTargetId.value === null) return
	try {
		await mutations.update(quoteTargetId.value, quoteForm.value)
	} catch {
		return
	}
	quoteModalVisible.value = false
}
</script>
```

- [ ] **Step 2: Write the guard test**

```ts
// src/add-os/modules/members/views/__tests__/PrivateOfficeRequestsPage.spec.ts
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Following UsersPage.spec.ts's precedent: a full mount pulls in services,
 * i18n and the message/dialog providers for no extra assertion value here —
 * the real behavior (service calls, mutation toasts, quoted-only filtering)
 * is already covered by Task 4's and Task 11's unit tests. This is a
 * lightweight source guard for wiring invariants a unit test can't see.
 */
const FILE = path.resolve(__dirname, "..", "PrivateOfficeRequestsPage.vue")

describe("privateOfficeRequestsPage wiring", () => {
	it("uses the shared useResourceMutations composable, not a bespoke mutation handler", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain("useResourceMutations")
	})

	it("never sends a hardcoded 'contracted' status through the mutations layer", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).not.toMatch(/status:\s*["']contracted["']/)
	})

	it("only offers the quote action through markPrivateOfficeRequestAsQuoted, never a raw PUT body", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain("markPrivateOfficeRequestAsQuoted")
	})
})
```

- [ ] **Step 3: Run the guard test**

Run: `npx vitest run src/add-os/modules/members/views/__tests__/PrivateOfficeRequestsPage.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/members/views/PrivateOfficeRequestsPage.vue src/add-os/modules/members/views/__tests__/PrivateOfficeRequestsPage.spec.ts
git commit -m "feat(add-os): add Private Office Requests page"
```

---

### Task 13: Companies config (columns + create fields + quoted-only filter)

**Files:**
- Create: `src/add-os/modules/members/config/companies.config.ts`
- Test: `src/add-os/modules/members/config/__tests__/companies.config.spec.ts`

**Interfaces:**
- Consumes: `FieldDescriptor`, `pickLocalized` (existing `field-types.ts`); `Branch`
  (existing `modules/spatial/types/branch.ts`); types from Tasks 1, 2.
- Produces: `quotedRequestOptions(requests): SelectOption[]`, `buildCompanyColumns(t,
  branches, locale): DataTableColumns<Company>`, `buildCompanyFields(t, quotedRequests,
  branches, locale): FieldDescriptor<CompanyPayload>[]`, `emptyCompanyPayload():
  CompanyPayload` — consumed by Task 16. `quotedRequestOptions` is the one piece of real
  filtering logic here, so it gets a real unit test (test requirement #3 from the
  brief), unlike Task 11's config, which is pure declarative data.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/modules/members/config/__tests__/companies.config.spec.ts
import { describe, expect, it } from "vitest"

import { quotedRequestOptions } from "../companies.config"

const requests = [
	{ id: 1, prospect_name: "Requested Co", contact: "a", status: "requested" as const, quote_ref: null },
	{ id: 2, prospect_name: "Quoted Co", contact: "b", status: "quoted" as const, quote_ref: "Q-1" },
	{ id: 3, prospect_name: "Contracted Co", contact: "c", status: "contracted" as const, quote_ref: "Q-2" }
]

describe("quotedRequestOptions", () => {
	it("includes only requests whose status is 'quoted'", () => {
		const options = quotedRequestOptions(requests)

		expect(options).toHaveLength(1)
		expect(options[0].value).toBe(2)
	})

	it("returns an empty array when nothing is quoted", () => {
		const options = quotedRequestOptions(requests.filter(r => r.status !== "quoted"))

		expect(options).toEqual([])
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/modules/members/config/__tests__/companies.config.spec.ts`
Expected: FAIL — `Cannot find module '../companies.config'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/add-os/modules/members/config/companies.config.ts
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Company, CompanyPayload } from "@/add-os/modules/members/types/company"
import type { PrivateOfficeRequest } from "@/add-os/modules/members/types/private-office-request"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"

export function quotedRequestOptions(requests: PrivateOfficeRequest[]): SelectOption[] {
	return requests
		.filter(request => request.status === "quoted")
		.map(request => ({ label: `${request.prospect_name} (${request.quote_ref ?? ""})`, value: request.id }))
}

export function buildCompanyColumns(t: ComposerTranslation, branches: Branch[], locale: SupportedLocale): DataTableColumns<Company> {
	const branchName = (branchId: number) => {
		const branch = branches.find(b => b.id === branchId)
		return branch ? pickLocalized(branch.name, locale) : String(branchId)
	}

	return [
		{ title: t("companies.columns.legalName"), key: "legal_name" },
		{ title: t("companies.columns.contractRef"), key: "contract_ref" },
		{ title: t("companies.columns.branch"), key: "branch_id", render: row => branchName(row.branch_id) },
		{
			title: t("companies.columns.status"),
			key: "status",
			render: row => h(NTag, { type: row.status === "active" ? "success" : "error", round: true, bordered: true }, { default: () => t(`companies.status.${row.status}`) })
		}
	]
}

export function buildCompanyFields(
	t: ComposerTranslation,
	quotedRequests: PrivateOfficeRequest[],
	branches: Branch[],
	locale: SupportedLocale
): FieldDescriptor<CompanyPayload>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		{ key: "private_office_request_id", labelKey: "companies.form.privateOfficeRequest", type: "select", required: true, options: quotedRequestOptions(quotedRequests) },
		{ key: "branch_id", labelKey: "companies.form.branch", type: "select", required: true, options: branchOptions },
		{ key: "legal_name", labelKey: "companies.form.legalName", type: "text", required: true },
		{ key: "contract_ref", labelKey: "companies.form.contractRef", type: "text", required: true }
	]
}

export function emptyCompanyPayload(): CompanyPayload {
	return { private_office_request_id: null, branch_id: null, legal_name: "", contract_ref: "" }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/add-os/modules/members/config/__tests__/companies.config.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/members/config/companies.config.ts src/add-os/modules/members/config/__tests__/companies.config.spec.ts
git commit -m "feat(add-os): add Companies table/form config with quoted-only request filtering"
```

---

### Task 13b: Prove the "contracted" row hides the status action (test requirement #6)

**Files:**
- Modify: `src/add-os/modules/members/config/__tests__/private-office-requests.config.spec.ts`
  (new file — Task 11 shipped no test of its own; this closes that gap before moving on,
  since the brief's own test requirement #6 — "contracted ⇒ no status-edit action
  shown" — needs a real assertion, not just the page-level source scan from Task 12).

**Interfaces:**
- Consumes: `buildRequestColumns` (Task 11).

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/modules/members/config/__tests__/private-office-requests.config.spec.ts
import type { ComposerTranslation } from "vue-i18n"
import { describe, expect, it, vi } from "vitest"

import { buildRequestColumns } from "../private-office-requests.config"

const t = ((key: string) => key) as ComposerTranslation

function actionChildren(status: "requested" | "quoted" | "contracted") {
	const onQuote = vi.fn()
	const onDelete = vi.fn()
	const columns = buildRequestColumns(t, onQuote, onDelete)
	const actionsColumn = columns.find(c => c.key === "actions")!
	const row = { id: 1, prospect_name: "A", contact: "a", status, quote_ref: status === "requested" ? null : "Q-1" }
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- NaiveUI's own DataTableColumn.render type
	const vnode = (actionsColumn as any).render(row, 0)
	return vnode.children as unknown[]
}

describe("buildRequestColumns actions", () => {
	it("shows a quote action plus delete for a requested row (2 controls)", () => {
		expect(actionChildren("requested")).toHaveLength(2)
	})

	it("shows only delete for a quoted row — quoting again isn't a modeled action (1 control)", () => {
		expect(actionChildren("quoted")).toHaveLength(1)
	})

	it("shows a disabled locked tooltip plus delete for a contracted row — not silence, an explained block (2 controls)", () => {
		const children = actionChildren("contracted")
		expect(children).toHaveLength(2)
	})

	it("never shows the quote action for a contracted row", () => {
		const onQuote = vi.fn()
		const onDelete = vi.fn()
		const columns = buildRequestColumns(t, onQuote, onDelete)
		const actionsColumn = columns.find(c => c.key === "actions")!
		const row = { id: 1, prospect_name: "A", contact: "a", status: "contracted" as const, quote_ref: "Q-1" }
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(actionsColumn as any).render(row, 0)
		expect(onQuote).not.toHaveBeenCalled()
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/modules/members/config/__tests__/private-office-requests.config.spec.ts`
Expected: FAIL if `buildRequestColumns`'s action-count-per-status doesn't yet match (it
already should from Task 11's implementation — this step exists to catch a mismatch
before committing test coverage that quietly passes for the wrong reason).

- [ ] **Step 3: Fix Task 11's implementation if the test reveals a mismatch, otherwise confirm it already passes**

Run: `npx vitest run src/add-os/modules/members/config/__tests__/private-office-requests.config.spec.ts`
Expected: PASS (4 tests) once `buildRequestColumns` (Task 11) matches: 2 controls for
`requested`, 1 for `quoted`, 2 for `contracted`, and `onQuote` never invoked by rendering
a contracted row.

- [ ] **Step 4: Commit**

```bash
git add src/add-os/modules/members/config/__tests__/private-office-requests.config.spec.ts
git commit -m "test(add-os): cover contracted-status action blocking in request columns"
```

---

### Task 14: `AddCompanyMemberDialog.vue`

**Files:**
- Create: `src/add-os/modules/members/components/AddCompanyMemberDialog.vue`
- Test: `src/add-os/modules/members/components/__tests__/AddCompanyMemberDialog.spec.ts`

**Interfaces:**
- Consumes: `useCompanyDetail` (Task 9); `ApiError` (existing).
- Props: `companyId: number`. Model: `show: boolean`. Emits: `added: []`.
- Produces: the shared dialog component, consumed by Tasks 15 and 16 from two different
  call sites (the brief's test requirement #7).

- [ ] **Step 1: Write the failing test**

Following `ResourceFormDrawer.spec.ts`'s own established pattern (Task 14's sibling
component): drive the test by mutating the component's exposed `form` ref directly and
calling its exposed `submit()`, rather than simulating raw naive-ui DOM events — that
file's own comments explain why (`n-select`/`n-form` internals aren't worth a second,
more fragile harness when the component can expose its real logic instead).

```ts
// src/add-os/modules/members/components/__tests__/AddCompanyMemberDialog.spec.ts
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import AddCompanyMemberDialog from "../AddCompanyMemberDialog.vue"

const { useCompanyDetailMock, addMemberMock } = vi.hoisted(() => ({
	useCompanyDetailMock: vi.fn(),
	addMemberMock: vi.fn()
}))

vi.mock("@/add-os/modules/members/composables/useCompanyDetail", () => ({
	useCompanyDetail: useCompanyDetailMock
}))

// The component calls useMessage() directly. Mounting it for real without a
// message provider is exactly the pitfall UsersPage.spec.ts's own comment
// avoids by not mounting at all — mock only useMessage, keep every other
// naive-ui export (NModal, NForm, NSelect, ...) real via importActual.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const sampleUser = { id: 5, name: "Sara", phone: "0999111222", email: "s@add.sy", preferred_language: "ar", preferred_currency: "SYP", status: "active", roles: [] }

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			companyMembers: {
				add: {
					title: "Add company member",
					userLabel: "User",
					userRequired: "Select a user.",
					doorAccessLabel: "Door access enabled",
					adminLabel: "Company admin",
					adminHint: "First admin note.",
					success: "Member added.",
					alreadyMemberError: "Already a member."
				}
			},
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel" },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountDialog(companyId = 3) {
	return mount(AddCompanyMemberDialog, {
		props: { companyId, show: true, "onUpdate:show": () => {} },
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

describe("addCompanyMemberDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		useCompanyDetailMock.mockImplementation((companyId: number) => ({
			company: { value: null },
			isLoadingCompany: { value: false },
			companyError: { value: null },
			refetchCompany: vi.fn(),
			members: { value: [] },
			isLoadingMembers: { value: false },
			membersError: { value: null },
			refetchMembers: vi.fn(),
			users: { value: [sampleUser] },
			isLoadingUsers: { value: false },
			addMember: (payload: unknown) => addMemberMock(companyId, payload),
			setDoorAccess: vi.fn(),
			setAdminFlag: vi.fn(),
			removeMember: vi.fn()
		}))
	})

	it("calls useCompanyDetail scoped to the companyId prop it was given", () => {
		mountDialog(7)
		expect(useCompanyDetailMock).toHaveBeenCalledWith(7)
	})

	it("submits the selected user, door access and admin flag, then emits added", async () => {
		addMemberMock.mockResolvedValue({ user_id: 5, door_access_enabled: true, is_admin: false })
		const wrapper = mountDialog(3)
		await flushPromises()

		wrapper.vm.form.user_id = 5
		wrapper.vm.form.door_access_enabled = true
		await wrapper.vm.submit()
		await flushPromises()

		expect(addMemberMock).toHaveBeenCalledWith(3, { user_id: 5, door_access_enabled: true, is_admin: false })
		expect(wrapper.emitted("added")).toBeTruthy()
		wrapper.unmount()
	})

	it("on a 422 'already a member' error, does not emit added and leaves the dialog open", async () => {
		addMemberMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "Already a member." })))
		const wrapper = mountDialog(3)
		await flushPromises()

		wrapper.vm.form.user_id = 5
		await wrapper.vm.submit()
		await flushPromises()

		expect(wrapper.emitted("added")).toBeFalsy()
		wrapper.unmount()
	})

	it("does not call addMember when no user is selected (required-field validation blocks submit)", async () => {
		const wrapper = mountDialog(3)
		await flushPromises()

		await wrapper.vm.submit()
		await flushPromises()

		expect(addMemberMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/modules/members/components/__tests__/AddCompanyMemberDialog.spec.ts`
Expected: FAIL — `Cannot find module '../AddCompanyMemberDialog.vue'`.

- [ ] **Step 3: Write the implementation**

```vue
<!-- src/add-os/modules/members/components/AddCompanyMemberDialog.vue -->
<template>
	<n-modal v-model:show="show" preset="card" :title="t('companyMembers.add.title')" style="max-width: 28rem" content-style="max-height: 60vh; overflow-y: auto">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<n-form-item path="user_id" :label="t('companyMembers.add.userLabel')">
				<n-select v-model:value="form.user_id" :options="userOptions" :loading="isLoadingUsers" filterable />
			</n-form-item>
			<n-form-item path="door_access_enabled" :label="t('companyMembers.add.doorAccessLabel')">
				<n-switch v-model:value="form.door_access_enabled" />
			</n-form-item>
			<n-form-item path="is_admin" :label="t('companyMembers.add.adminLabel')">
				<n-switch v-model:value="form.is_admin" />
				<p class="mt-1 text-xs text-gray-500">{{ t("companyMembers.add.adminHint") }}</p>
			</n-form-item>
		</n-form>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("resourceCrud.form.cancel") }}</n-button>
				<n-button type="primary" :loading="isSubmitting" @click="submit">{{ t("resourceCrud.form.submit") }}</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import { NButton, NForm, NFormItem, NModal, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useCompanyDetail } from "@/add-os/modules/members/composables/useCompanyDetail"
import { ApiError } from "@/add-os/services/api"

const props = defineProps<{ companyId: number }>()
const show = defineModel<boolean>("show", { required: true })
const emit = defineEmits<{ added: [] }>()

const { t } = useI18n()
const message = useMessage()
const { users, isLoadingUsers, addMember } = useCompanyDetail(props.companyId)

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)

function emptyForm() {
	return { user_id: null as number | null, door_access_enabled: false, is_admin: false }
}

const form = ref(emptyForm())

watch(show, visible => {
	if (visible) {
		form.value = emptyForm()
		formRef.value?.restoreValidation()
	}
})

const userOptions = computed<SelectOption[]>(() => users.value.map(user => ({ label: `${user.name} — ${user.phone}`, value: user.id })))

const rules: FormRules = {
	user_id: { required: true, type: "number", message: t("companyMembers.add.userRequired"), trigger: ["change"] }
}

async function submit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	if (form.value.user_id === null) return

	isSubmitting.value = true
	try {
		await addMember({ user_id: form.value.user_id, door_access_enabled: form.value.door_access_enabled, is_admin: form.value.is_admin })
		message.success(t("companyMembers.add.success"))
		show.value = false
		emit("added")
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status === 422) message.error(caught.data?.message ?? t("companyMembers.add.alreadyMemberError"))
		else if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
		else message.error(t("resourceCrud.mutations.genericError"))
	} finally {
		isSubmitting.value = false
	}
}

defineExpose({ submit, form })
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/add-os/modules/members/components/__tests__/AddCompanyMemberDialog.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/modules/members/components/AddCompanyMemberDialog.vue src/add-os/modules/members/components/__tests__/AddCompanyMemberDialog.spec.ts
git commit -m "feat(add-os): add shared AddCompanyMemberDialog component"
```

---

### Task 15: `CompanyDetailPanel.vue`

**Files:**
- Create: `src/add-os/modules/members/components/CompanyDetailPanel.vue`
- Test: `src/add-os/modules/members/components/__tests__/CompanyDetailPanel.spec.ts`

**Interfaces:**
- Consumes: `useCompanyDetail` (Task 9); `AddCompanyMemberDialog` (Task 14); `ApiError`
  (existing).
- Props: `companyId: number`. Model: `show: boolean`. Exposes: `refetchCompany` (so
  `CompaniesPage.vue`, Task 16, can refresh an open panel after a status change on the
  same company).

**Known, explicitly-flagged limitation:** the members table renders the numeric
`user_id` directly — `CompanyMember` (Task 3) carries no name/phone field because the
collection's "List Company Members" response is unconfirmed (no example exists). This
is not silently worked around; it is exactly what the brief asked to be surfaced rather
than guessed.

- [ ] **Step 1: Write the failing test**

Same exposed-handler pattern as Task 14: the optimistic-toggle-then-revert-on-failure
logic (refetch matrix row 5) lives in this component's own script, not in
`useCompanyDetail`, so it needs its own real coverage — not just a rendered-text check.
`defineExpose` makes `onToggleDoorAccess`/`onToggleAdmin`/`performRemove`/`members`
callable directly, avoiding a second, more fragile harness for driving naive-ui
`NSwitch`/`NDataTable` DOM internals (the same reasoning `ResourceFormDrawer.spec.ts`
and `UsersPage.spec.ts` already apply to this exact problem in this codebase).

```ts
// src/add-os/modules/members/components/__tests__/CompanyDetailPanel.spec.ts
import { readFileSync } from "node:fs"
import path from "node:path"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import CompanyDetailPanel from "../CompanyDetailPanel.vue"

const COMPONENT_FILE = path.resolve(__dirname, "..", "CompanyDetailPanel.vue")

const sampleCompany = { id: 3, private_office_request_id: 1, legal_name: "Acme LLC", contract_ref: "C-1", branch_id: 1, status: "active" }

const setDoorAccessMock = vi.fn()
const setAdminFlagMock = vi.fn()
const removeMemberMock = vi.fn()
const refetchMembersMock = vi.fn()
// A real ref, not a plain {value: ...} stand-in: this component `defineExpose`s
// `members` directly (Step 3 below), and Vue's expose/auto-unwrap machinery only
// behaves correctly against a genuine ref — matching what the real
// useCompanyDetail (Task 9) actually returns.
let membersFixture: ReturnType<typeof ref<{ user_id: number; door_access_enabled: boolean; is_admin: boolean }[]>>

vi.mock("@/add-os/modules/members/composables/useCompanyDetail", () => ({
	useCompanyDetail: () => ({
		company: ref(sampleCompany),
		isLoadingCompany: ref(false),
		companyError: ref(null),
		refetchCompany: vi.fn(),
		members: membersFixture,
		isLoadingMembers: ref(false),
		membersError: ref(null),
		refetchMembers: refetchMembersMock,
		users: ref([]),
		isLoadingUsers: ref(false),
		addMember: vi.fn(),
		setDoorAccess: setDoorAccessMock,
		setAdminFlag: setAdminFlagMock,
		removeMember: removeMemberMock
	})
}))

// naive-ui's real useDialog opens a teleported modal and waits for a click —
// this test drives the confirmation directly by invoking onPositiveClick,
// the same way a user clicking "Remove" in the real dialog would.
const dialogWarningMock = vi.fn((options: { onPositiveClick: () => void }) => options.onPositiveClick())
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useDialog: () => ({ warning: dialogWarningMock }), useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			companies: { detail: { title: "Company", loadError: "Load error." }, columns: { contractRef: "Contract ref", status: "Status" }, status: { active: "Active", inactive: "Inactive" } },
			companyMembers: {
				add: { button: "Add member" },
				columns: { userId: "User ID", doorAccess: "Door access", isAdmin: "Admin" },
				remove: { confirmTitle: "Remove?", confirmOk: "Remove", confirmCancel: "Cancel", success: "Removed." }
			},
			resourceCrud: { table: { actionsColumn: "Actions", deleteAction: "Delete" }, mutations: { genericError: "Error.", permissionError: "No permission." } }
		}
	}
})

function mountPanel(companyId = 3) {
	return mount(CompanyDetailPanel, {
		props: { companyId, show: true, "onUpdate:show": () => {} },
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

describe("companyDetailPanel", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		membersFixture = ref([{ user_id: 5, door_access_enabled: true, is_admin: false }])
	})

	it("renders the company's legal name and shows its members", async () => {
		const wrapper = mountPanel()
		await flushPromises()

		expect(document.body.textContent).toContain("Acme LLC")
		wrapper.unmount()
	})

	it("imports AddCompanyMemberDialog from the shared component path, not a local copy", () => {
		const source = readFileSync(COMPONENT_FILE, "utf8")
		expect(source).toContain('from "./AddCompanyMemberDialog.vue"')
	})

	it("exposes refetchCompany for a parent to call after an external status change", async () => {
		const wrapper = mountPanel()
		await flushPromises()

		expect(typeof wrapper.vm.refetchCompany).toBe("function")
		wrapper.unmount()
	})

	it("toggling door access updates optimistically, then persists via setDoorAccess", async () => {
		setDoorAccessMock.mockResolvedValue(undefined)
		const wrapper = mountPanel()
		await flushPromises()

		const member = wrapper.vm.members[0]
		await wrapper.vm.onToggleDoorAccess(member, false)

		expect(setDoorAccessMock).toHaveBeenCalledWith(5, { door_access_enabled: false })
		expect(member.door_access_enabled).toBe(false)
		wrapper.unmount()
	})

	it("reverts the optimistic toggle and refetches members on failure", async () => {
		setDoorAccessMock.mockRejectedValue(new ApiError(500, ""))
		const wrapper = mountPanel()
		await flushPromises()

		const member = wrapper.vm.members[0]
		await wrapper.vm.onToggleDoorAccess(member, false)

		expect(member.door_access_enabled).toBe(true) // reverted to its original value
		expect(refetchMembersMock).toHaveBeenCalled()
		wrapper.unmount()
	})

	it("toggling the admin flag persists via setAdminFlag", async () => {
		setAdminFlagMock.mockResolvedValue(undefined)
		const wrapper = mountPanel()
		await flushPromises()

		const member = wrapper.vm.members[0]
		await wrapper.vm.onToggleAdmin(member, true)

		expect(setAdminFlagMock).toHaveBeenCalledWith(5, { is_admin: true })
		expect(member.is_admin).toBe(true)
		wrapper.unmount()
	})

	it("removes a member through a confirmation dialog, then calls removeMember", async () => {
		removeMemberMock.mockResolvedValue(undefined)
		const wrapper = mountPanel()
		await flushPromises()

		wrapper.vm.confirmRemove(wrapper.vm.members[0])
		await flushPromises()

		expect(dialogWarningMock).toHaveBeenCalledOnce()
		expect(removeMemberMock).toHaveBeenCalledWith(5)
		wrapper.unmount()
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/add-os/modules/members/components/__tests__/CompanyDetailPanel.spec.ts`
Expected: FAIL — `Cannot find module '../CompanyDetailPanel.vue'`.

- [ ] **Step 3: Write the implementation**

```vue
<!-- src/add-os/modules/members/components/CompanyDetailPanel.vue -->
<template>
	<n-drawer v-model:show="show" :width="480">
		<n-drawer-content :title="company?.legal_name ?? t('companies.detail.title')" closable>
			<n-spin v-if="isLoadingCompany" size="small" />
			<n-alert v-else-if="companyError" type="error" :title="t('companies.detail.loadError')" />
			<div v-else-if="company" class="flex flex-col gap-4">
				<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<dt class="text-gray-500">{{ t("companies.columns.contractRef") }}</dt>
					<dd>{{ company.contract_ref }}</dd>
					<dt class="text-gray-500">{{ t("companies.columns.status") }}</dt>
					<dd>{{ t(`companies.status.${company.status}`) }}</dd>
				</dl>

				<div class="flex justify-end">
					<n-button size="small" type="primary" @click="addDialogShow = true">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("companyMembers.add.button") }}
					</n-button>
				</div>

				<n-data-table :columns="memberColumns" :data="members" :loading="isLoadingMembers" :bordered="false" :row-key="memberRowKey" />
			</div>
		</n-drawer-content>
	</n-drawer>

	<AddCompanyMemberDialog v-model:show="addDialogShow" :company-id="companyId" @added="refetchMembers" />
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { CompanyMember } from "@/add-os/modules/members/types/company-member"
import { NAlert, NButton, NDataTable, NDrawer, NDrawerContent, NSpin, NSwitch, useDialog, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import AddCompanyMemberDialog from "./AddCompanyMemberDialog.vue"
import { useCompanyDetail } from "@/add-os/modules/members/composables/useCompanyDetail"
import { ApiError } from "@/add-os/services/api"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ companyId: number }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const { company, isLoadingCompany, companyError, members, isLoadingMembers, refetchMembers, setDoorAccess, setAdminFlag, removeMember, refetchCompany } =
	useCompanyDetail(props.companyId)

const addDialogShow = ref(false)

function memberRowKey(row: CompanyMember) {
	return row.user_id
}

function toastFailure(caught: unknown) {
	if (!(caught instanceof ApiError)) throw caught
	message.error(caught.status === 403 ? t("resourceCrud.mutations.permissionError") : t("resourceCrud.mutations.genericError"))
}

async function onToggleDoorAccess(row: CompanyMember, value: boolean) {
	const previous = row.door_access_enabled
	row.door_access_enabled = value
	try {
		await setDoorAccess(row.user_id, { door_access_enabled: value })
	} catch (caught) {
		row.door_access_enabled = previous
		toastFailure(caught)
		await refetchMembers()
	}
}

async function onToggleAdmin(row: CompanyMember, value: boolean) {
	const previous = row.is_admin
	row.is_admin = value
	try {
		await setAdminFlag(row.user_id, { is_admin: value })
	} catch (caught) {
		row.is_admin = previous
		toastFailure(caught)
		await refetchMembers()
	}
}

async function performRemove(row: CompanyMember) {
	try {
		await removeMember(row.user_id)
		message.success(t("companyMembers.remove.success"))
	} catch (caught) {
		toastFailure(caught)
	}
}

function confirmRemove(row: CompanyMember) {
	dialog.warning({
		title: t("companyMembers.remove.confirmTitle"),
		positiveText: t("companyMembers.remove.confirmOk"),
		negativeText: t("companyMembers.remove.confirmCancel"),
		onPositiveClick: () => performRemove(row)
	})
}

const memberColumns = computed<DataTableColumns<CompanyMember>>(() => [
	{ title: t("companyMembers.columns.userId"), key: "user_id" },
	{
		title: t("companyMembers.columns.doorAccess"),
		key: "door_access_enabled",
		render: row => h(NSwitch, { value: row.door_access_enabled, "onUpdate:value": (value: boolean) => onToggleDoorAccess(row, value) })
	},
	{
		title: t("companyMembers.columns.isAdmin"),
		key: "is_admin",
		render: row => h(NSwitch, { value: row.is_admin, "onUpdate:value": (value: boolean) => onToggleAdmin(row, value) })
	},
	{
		title: t("resourceCrud.table.actionsColumn"),
		key: "actions",
		render: row =>
			h(
				NButton,
				{ text: true, type: "error", "aria-label": t("resourceCrud.table.deleteAction"), onClick: () => confirmRemove(row) },
				{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
			)
	}
])

defineExpose({ refetchCompany, onToggleDoorAccess, onToggleAdmin, confirmRemove, members })
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/add-os/modules/members/components/__tests__/CompanyDetailPanel.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/modules/members/components/CompanyDetailPanel.vue src/add-os/modules/members/components/__tests__/CompanyDetailPanel.spec.ts
git commit -m "feat(add-os): add CompanyDetailPanel with member management"
```

---

### Task 16: `CompaniesPage.vue`

**Files:**
- Create: `src/add-os/modules/members/views/CompaniesPage.vue`
- Test: `src/add-os/modules/members/views/__tests__/CompaniesPage.spec.ts` (source-scan
  guard, same rationale as Task 12 — real behavior already covered by Tasks 5, 10, 13's
  unit tests, plus this task's own guard for the wiring a unit test can't see: the
  shared-dialog-import requirement).

**Interfaces:**
- Consumes: `useResourceList` (existing); `listCompanies` (Task 5);
  `listPrivateOfficeRequests` (Task 4); `listBranches` (existing `services/branches.ts`);
  `useCompanyCreation`, `useCompanyStatusChange` (Task 10); `buildCompanyColumns`,
  `buildCompanyFields`, `quotedRequestOptions`, `emptyCompanyPayload` (Task 13);
  `AddCompanyMemberDialog` (Task 14); `CompanyDetailPanel` (Task 15).
- Produces: the page component, registered in Task 17.

**Refetch matrix implemented here:**
| Action | What refetches |
|---|---|
| Create company | requests list + companies list (`useCompanyCreation`) |
| Change company status | companies list (`useCompanyStatusChange`); the open detail panel too, if it's showing this same company (via the panel's exposed `refetchCompany`) |
| Add member from the table quick-action | that dialog instance's own members fetch only — no detail page is open, so nothing else needs refreshing. Company list shows no member count column (the collection has no such field on Company — not invented), so there is nothing on the row to update either. |
| Add member from the detail panel | the panel's members table, via `@added="refetchMembers"` (Task 15) |
| Toggle door access / admin | optimistic row mutation + refetch-on-failure (Task 15) |
| Remove member | that company's members table (Task 15) |

- [ ] **Step 1: Write the page**

```vue
<!-- src/add-os/modules/members/views/CompaniesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.companies") }}</h1>
			<p>{{ t("companies.description") }}</p>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />
		<n-alert v-if="error" type="error" :title="t('companies.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("companies.create.button") }}
			</n-button>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table v-if="data.length > 0 || isLoading" :columns :data :loading="isLoading" :bordered="false" :row-key />
			<div v-else class="py-10 text-center">{{ t("companies.empty") }}</div>
		</n-card>

		<ResourceFormDrawer
			v-model:show="createDrawerVisible"
			v-model:model="createForm"
			:fields="companyFields"
			:title="t('companies.create.title')"
			:submitting="creation.isSubmitting.value"
			:on-submit="submitCreate"
		/>

		<n-modal v-model:show="statusModalVisible" preset="card" :title="t('companies.changeStatus.title')" class="max-w-md">
			<n-form>
				<n-form-item :label="t('companies.columns.status')">
					<n-select v-model:value="statusForm.status" :options="statusOptions" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="statusModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="statusChange.isSubmitting.value" @click="submitStatusChange">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>

		<CompanyDetailPanel v-if="activeDetailCompanyId !== null" ref="detailPanelRef" v-model:show="detailPanelVisible" :company-id="activeDetailCompanyId" />

		<AddCompanyMemberDialog v-if="quickAddCompanyId !== null" v-model:show="quickAddDialogVisible" :company-id="quickAddCompanyId" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Company, CompanyStatus, CompanyStatusPayload } from "@/add-os/modules/members/types/company"
import type { PrivateOfficeRequest } from "@/add-os/modules/members/types/private-office-request"
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NModal, NSelect, useDialog } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import AddCompanyMemberDialog from "@/add-os/modules/members/components/AddCompanyMemberDialog.vue"
import CompanyDetailPanel from "@/add-os/modules/members/components/CompanyDetailPanel.vue"
import { buildCompanyColumns, buildCompanyFields, emptyCompanyPayload, quotedRequestOptions } from "@/add-os/modules/members/config/companies.config"
import { useCompanyCreation, useCompanyStatusChange } from "@/add-os/modules/members/composables/useCompanyMutations"
import { listBranches } from "@/add-os/services/branches"
import { listCompanies } from "@/add-os/services/companies"
import { listPrivateOfficeRequests } from "@/add-os/services/private-office-requests"
import { currentLocale } from "@/add-os/lang/currentLocale"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()
const { t } = useI18n()
const dialog = useDialog()
const router = useRouter()

const { data, isLoading, error, refetch: refetchCompanies } = useResourceList<Company>(listCompanies)
const { data: requests, refetch: refetchRequests } = useResourceList<PrivateOfficeRequest>(listPrivateOfficeRequests)
const { data: branches } = useResourceList(listBranches)

const quotedRequests = computed(() => requests.value.filter(r => r.status === "quoted"))

const statCards = computed<StatCard[]>(() => [
	{ label: t("companies.stats.total"), value: data.value.length },
	{ label: t("companies.stats.active"), value: data.value.filter(c => c.status === "active").length },
	{ label: t("companies.stats.inactive"), value: data.value.filter(c => c.status === "inactive").length }
])

function rowKey(row: Company) {
	return row.id
}

const activeDetailCompanyId = ref<number | null>(null)
const detailPanelVisible = ref(false)
const detailPanelRef = ref<InstanceType<typeof CompanyDetailPanel> | null>(null)

function openDetail(row: Company) {
	activeDetailCompanyId.value = row.id
	detailPanelVisible.value = true
}

watch(detailPanelVisible, visible => {
	if (!visible) activeDetailCompanyId.value = null
})

const quickAddCompanyId = ref<number | null>(null)
const quickAddDialogVisible = ref(false)

function openQuickAdd(row: Company) {
	quickAddCompanyId.value = row.id
	quickAddDialogVisible.value = true
}

watch(quickAddDialogVisible, visible => {
	if (!visible) quickAddCompanyId.value = null
})

function renderActions(row: Company) {
	return h("div", { class: "flex gap-2" }, [
		h(
			NButton,
			{ text: true, type: "primary", "aria-label": t("companies.viewMembers.button"), title: t("companies.viewMembers.button"), onClick: () => openDetail(row) },
			{ icon: () => h(Icon, { name: "carbon:view", size: 18 }) }
		),
		h(
			NButton,
			{ text: true, "aria-label": t("companyMembers.add.button"), title: t("companyMembers.add.button"), onClick: () => openQuickAdd(row) },
			{ icon: () => h(Icon, { name: "carbon:user-follow", size: 18 }) }
		),
		h(
			NButton,
			{ text: true, type: "warning", "aria-label": t("companies.changeStatus.button"), title: t("companies.changeStatus.button"), onClick: () => openStatusModal(row) },
			{ icon: () => h(Icon, { name: "carbon:status-change", size: 18 }) }
		)
	])
}

const columns = computed<DataTableColumns<Company>>(() => {
	const baseColumns = buildCompanyColumns(t, branches.value, currentLocale.value)
	return [...baseColumns, { title: t("resourceCrud.table.actionsColumn"), key: "actions", render: renderActions }]
})

const creation = useCompanyCreation(refetchRequests, refetchCompanies)
const companyFields = computed(() => buildCompanyFields(t, quotedRequests.value, branches.value, currentLocale.value))

const createDrawerVisible = ref(false)
const createForm = ref(emptyCompanyPayload())

function openCreate() {
	if (quotedRequestOptions(quotedRequests.value).length === 0) {
		dialog.info({
			title: t("companies.create.noQuotedRequestsTitle"),
			content: t("companies.create.noQuotedRequestsBody"),
			positiveText: t("companies.create.goToRequests"),
			negativeText: t("resourceCrud.form.cancel"),
			onPositiveClick: () => router.push({ name: "address.privateOfficeRequests" })
		})
		return
	}
	createForm.value = emptyCompanyPayload()
	createDrawerVisible.value = true
}

async function submitCreate(payload: Record<string, unknown>) {
	await creation.submit(payload as unknown as Parameters<typeof creation.submit>[0])
}

const statusChange = useCompanyStatusChange(refetchCompanies)
const statusModalVisible = ref(false)
const statusTargetId = ref<number | null>(null)
const statusForm = ref<CompanyStatusPayload>({ status: "active" })

const statusOptions = computed<SelectOption[]>(() =>
	(["active", "inactive"] as CompanyStatus[]).map(status => ({ label: t(`companies.status.${status}`), value: status }))
)

function openStatusModal(row: Company) {
	statusTargetId.value = row.id
	statusForm.value = { status: row.status }
	statusModalVisible.value = true
}

async function submitStatusChange() {
	if (statusTargetId.value === null) return
	try {
		await statusChange.submit(statusTargetId.value, statusForm.value)
	} catch {
		return
	}
	statusModalVisible.value = false
	if (activeDetailCompanyId.value === statusTargetId.value) {
		await detailPanelRef.value?.refetchCompany()
	}
}
</script>
```

- [ ] **Step 2: Write the guard test**

```ts
// src/add-os/modules/members/views/__tests__/CompaniesPage.spec.ts
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "CompaniesPage.vue")
const DETAIL_PANEL_FILE = path.resolve(__dirname, "..", "..", "components", "CompanyDetailPanel.vue")

describe("companiesPage wiring", () => {
	it("imports AddCompanyMemberDialog from the shared component path — the same one CompanyDetailPanel uses", () => {
		const pageSource = readFileSync(FILE, "utf8")
		const panelSource = readFileSync(DETAIL_PANEL_FILE, "utf8")

		expect(pageSource).toContain('from "@/add-os/modules/members/components/AddCompanyMemberDialog.vue"')
		expect(panelSource).toContain('from "./AddCompanyMemberDialog.vue"')
	})

	it("passes the row's own id as company-id to the quick-add dialog, not a hardcoded value", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain(":company-id=\"quickAddCompanyId\"")
		expect(source).toContain("quickAddCompanyId.value = row.id")
	})

	it("filters the create form's request dropdown to quoted requests only, via quotedRequestOptions/quotedRequests", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toMatch(/quotedRequests\.value|quotedRequestOptions\(/)
	})

	it("guides to Private Office Requests instead of opening an empty dropdown when nothing is quoted", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain("companies.create.noQuotedRequestsTitle")
		expect(source).not.toMatch(/createDrawerVisible\.value = true\s*$/m) // never unconditionally opens the drawer
	})

	it("never sends a raw HTTP call — only the composables/services layer", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).not.toMatch(/\bfetch\(/)
	})
})
```

- [ ] **Step 3: Run the guard test**

Run: `npx vitest run src/add-os/modules/members/views/__tests__/CompaniesPage.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 4: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: no errors. If `creation.submit`'s parameter-type indirection
(`Parameters<typeof creation.submit>[0]`) doesn't satisfy strict mode cleanly, replace it
with the plain `CompanyPayload` cast used elsewhere (`payload as unknown as
CompanyPayload`), importing `CompanyPayload` from `@/add-os/modules/members/types/company`
— functionally identical, just written out.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/members/views/CompaniesPage.vue src/add-os/modules/members/views/__tests__/CompaniesPage.spec.ts
git commit -m "feat(add-os): add Companies page with quick-add-member row action"
```

---

### Task 17: Navigation — register both real routes

**Files:**
- Modify: `src/add-os/navigation/sections.ts` (the `address` section's page and status;
  the `members` section's status)
- Modify: `src/add-os/navigation/routes.ts` (`PAGE_COMPONENTS`)

**Interfaces:**
- Consumes: `PrivateOfficeRequestsPage.vue` (Task 12), `CompaniesPage.vue` (Task 16).

- [ ] **Step 1: Flip the `address` section's status to `active` in sections.ts**

**Note (controller ruling, made during Task 9's review cycle):** the page-key rename
this step originally specified (`formationRequests`/`formation-requests` ->
`privateOfficeRequests`/`private-office-requests`) was already applied early, as an
out-of-sequence fix, immediately after Task 8 landed — Task 8's i18n rename
(`nav.pages.formationRequests` -> `nav.pages.privateOfficeRequests`) left `sections.ts`
and the i18n catalogs briefly inconsistent, which the existing
`navigation/__tests__/navigation.spec.ts`'s "translates every page title" test
correctly caught. Fixing the key in `sections.ts` immediately (rather than waiting for
this task) kept the suite green for every task in between. `sections.ts`'s `address`
section, as of that fix, already reads:

```ts
	{
		key: "address",
		path: "/address",
		icon: "carbon:enterprise",
		status: "coming-soon",
		pages: [{ key: "privateOfficeRequests", path: "private-office-requests" }]
	},
```

Only `status` still needs to change here, to `"active"` — the key/path rename is
already done. Change it to:

```ts
	{
		key: "address",
		path: "/address",
		icon: "carbon:enterprise",
		status: "active",
		pages: [{ key: "privateOfficeRequests", path: "private-office-requests" }]
	},
```

(`status` flips to `"active"` because, after this task, 100% of this section's pages
have a real screen — matching the precedent set by the `spatial` and `system`
sections, both `"active"` only once every one of their pages shipped.)

**Also as part of this task:** update `navigation/__tests__/navigation.spec.ts`'s
"marks exactly the two built sections as active" test — it currently hardcodes `2`;
after this task's status flips (this section plus `members`, Step 2 below), the true
count becomes `4`. This is a legitimate update to an existing test's asserted count as
the codebase's own invariant changes (not a weakening of the test — the test still
asserts an exact count, just the correct one), not a case of "editing a test to make it
pass" in the sense the plan prohibits (that prohibition is about not gaming assertions
to dodge a real defect, which this is not).

- [ ] **Step 2: Update the `members` section's status in sections.ts**

Change (currently lines 83–93):

```ts
	{
		key: "members",
		path: "/members",
		icon: "carbon:user-multiple",
		status: "coming-soon",
		pages: [
			{ key: "individuals", path: "individuals" },
			{ key: "companies", path: "companies" },
			{ key: "memberships", path: "memberships" }
		]
	},
```
to
```ts
	{
		key: "members",
		path: "/members",
		icon: "carbon:user-multiple",
		status: "active",
		pages: [
			{ key: "individuals", path: "individuals" },
			{ key: "companies", path: "companies" },
			{ key: "memberships", path: "memberships" }
		]
	},
```

(`individuals` and `memberships` keep falling back to `ComingSoon` via `routes.ts`'s own
`?? ComingSoon` — exactly the documented, already-established behavior for an `"active"`
section with some pages still unshipped, per this file's own header comment: "Pages of
`active` sections point there too for now; they switch over one at a time.")

- [ ] **Step 3: Register both real components in routes.ts**

Change `PAGE_COMPONENTS` (currently lines 31–42) to add two entries:

```ts
const PAGE_COMPONENTS: Record<string, () => Promise<unknown>> = {
	"system.roles": () => import("@/add-os/modules/system/views/RolesPage.vue"),
	"system.users": () => import("@/add-os/modules/system/views/UsersPage.vue"),
	"settings.accountSecurity": () => import("@/add-os/modules/settings/views/AccountSecurityPage.vue"),
	"spatial.branches": () => import("@/add-os/modules/spatial/views/BranchesPage.vue"),
	"spatial.buildings": () => import("@/add-os/modules/spatial/views/BuildingsPage.vue"),
	"spatial.floors": () => import("@/add-os/modules/spatial/views/FloorsPage.vue"),
	"spatial.zones": () => import("@/add-os/modules/spatial/views/ZonesPage.vue"),
	"spatial.spaces": () => import("@/add-os/modules/spatial/views/SpacesPage.vue"),
	"spatial.resources": () => import("@/add-os/modules/spatial/views/ResourcesPage.vue"),
	"spatial.seatsDesks": () => import("@/add-os/modules/spatial/views/SeatsDesksPage.vue"),
	"address.privateOfficeRequests": () => import("@/add-os/modules/members/views/PrivateOfficeRequestsPage.vue"),
	"members.companies": () => import("@/add-os/modules/members/views/CompaniesPage.vue")
}
```

- [ ] **Step 4: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full guard suite**

Run: `npx vitest run src/add-os/__tests__ src/add-os/lang/__tests__`
Expected: all 5 guards + bilingual invariant PASS.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/navigation/sections.ts src/add-os/navigation/routes.ts
git commit -m "feat(add-os): register Private Office Requests and Companies routes"
```

---

### Task 18: Full verification pass

**Files:** none created — verification only.

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: every test green, including all 5 architecture guards, the bilingual
invariant, and every new file from Tasks 4–16.

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --build --force`
Expected: clean, no errors anywhere in the repo.

- [ ] **Step 3: Lint**

Run: `npx eslint --fix src/add-os`
Expected: no remaining errors after autofix. Review any autofix diff before committing
it.

- [ ] **Step 4: Confirm scope**

Run: `git diff --stat main` (or the base branch)
Expected: every changed path is under `src/add-os/**`, except
`src/add-os/navigation/routes.ts` and `sections.ts` (both inside `src/add-os/**`
anyway) — confirm nothing under vendor `src/**` or `_pinx-vendor/**` was touched.

- [ ] **Step 5: Manual walkthrough (documented in the final report, with screenshots if the dev server is run)**

1. Open Private Office Requests → create one (`prospect_name`, `contact`) → appears
   `requested`.
2. Convert it to quoted (`quote_ref`) → status badge updates to `quoted`.
3. Open Companies → New company → the private-office-request dropdown shows only the
   one just quoted → pick a branch → fill legal name/contract ref → submit.
4. Back on Private Office Requests, confirm the same request now shows `contracted`
   and its row action is a disabled, tooltipped lock icon, not silently absent.
5. On the new Companies row, click "Add member" (the quick-add action) → dialog opens
   scoped to that row's company id → pick a user → submit → success toast, no detail
   page ever opened.
6. Click "View members" on the same row → detail panel opens showing the member just
   added → toggle door access, toggle admin, remove the member with confirmation →
   table updates each time.
7. Re-open "Add member" from inside the detail panel this time → add a second member →
   confirm the panel's own members table updates without closing.

- [ ] **Step 6: Write the final report**

Cover explicitly, per the brief's own request:
- What was extracted literally from the Postman collection, and any difference from
  a prior description (none found — the brief's own contract table matched the
  collection exactly, including both "silent" deletes turning out to exist).
- What the collection was silent on and was *not* guessed: the exact JSON shape of
  every response (zero examples anywhere in the collection), specifically flagged for
  `CompanyMember` (no name/phone confirmed) and for whether Company carries a member
  count (it does not, per the only fields ever named in any request body).
- What was deferred: none of the nine endpoints were skipped; pagination UI was
  out of scope per the brief and is not built; no role-gating was added (none was
  specified for this pipeline, unlike the seven spatial tables).

No further commit — this task is verification and reporting only.
