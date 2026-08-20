# Plans, Exchange Rates, Business Hours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Plans, Exchange Rates, and Business Hours (including the
`business-hour-exceptions` sub-resource discovered during verification) to their existing
ADDCore endpoints, using this codebase's generic CRUD architecture.

**Architecture:** Each module gets `types/` + `config/` (nested under
`src/add-os/modules/<module>/`) and a flat `src/add-os/services/<name>.ts`, wired into
`ResourceTable` / `ResourceFormDrawer` / `ResourceStatCards` / `useResourceList` /
`useResourceMutations`, exactly like `spatial`/`members` already do. `ResourceTable` gets
one small, isolated enhancement (optional `onEdit`) to support Exchange Rates, which has no
per-row edit action at all.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript strict, Naive UI, vue-i18n, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-plans-exchange-rates-business-hours-design.md`
— read it first. Every API shape, field, and validation rule below is sourced from the live
verification pass in `docs/add-os/plans-exchange-hours-verification-report.md`, not
inferred.

## Global Constraints

- Services are flat under `src/add-os/services/`, never nested under `modules/` (confirmed
  against every existing service).
- `types/`, `config/`, `views/` are nested under `src/add-os/modules/<module>/`.
- No hardcoded English strings — every user-facing string is a vue-i18n key present in
  both `src/add-os/lang/en/en.json` and `src/add-os/lang/ar/ar.json`.
- All numbers and dates render through `src/add-os/utils/format/` (`formatCurrency`,
  `formatNumber`, `formatDate`) — never `toLocaleString`/`Intl`/raw `dayjs().format()`.
- Tabs, no semicolons, double-quoted strings — match the surrounding file's style exactly.
- Do **not** touch `src/add-os/components/resource/ResourceFormDrawer.vue` or its spec —
  both are already mid-edit with an unrelated, uncommitted change (drawer→modal
  conversion) from outside this task. Every field this plan needs (time/date pattern
  validation, a disabled fixed-value select) is achievable through
  `FieldDescriptor`'s existing `rule`/`disabledWhen`/`required` extension points without
  changing that file. `ResourceTable.vue` and its spec are unrelated to that stray change
  and safe to edit (confirmed via `git status`).
- Do not touch `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml` — a `firebase`
  dependency is already sitting there uncommitted, unrelated to this task, already flagged
  to the user.
- Run `pnpm test` (or `npx vitest run`), `npx vue-tsc --build --force`, and
  `npx eslint --fix src/add-os` after the final task — not after every single one, to avoid
  churn — but each task's own new/changed test file(s) must pass in isolation before that
  task's commit.

---

## Task 1: ResourceTable — make `onEdit` optional

Exchange Rates (Task 6) has no per-row edit action at all — no such endpoint exists
(verification report). `ResourceTable`'s `onEdit` is currently a required prop, which would
force either a no-op edit button (forbidden by this codebase's "no shipped control may be a
no-op" rule) or reaching for a bespoke table. Making `onEdit` optional and hiding the whole
actions column when it's absent mirrors exactly how `onDelete` already works.

**Files:**
- Modify: `src/add-os/components/resource/ResourceTable.vue`
- Test: `src/add-os/components/resource/__tests__/ResourceTable.spec.ts`

**Interfaces:**
- Produces: `ResourceTable<T>`'s `onEdit` prop becomes `onEdit?: (row: T) => void`. When
  absent, no actions column (edit button, `extraActions`) renders at all — only the
  `onDelete`-gated delete column can appear on its own.

- [ ] **Step 1: Write the failing test**

Add to `src/add-os/components/resource/__tests__/ResourceTable.spec.ts`, inside the
`describe("resourceTable", ...)` block, after the existing `"still renders the edit button
when onDelete is absent"` test:

```ts
	it("renders no actions column at all when onEdit is absent", () => {
		const wrapper = mountTable({ onEdit: undefined, onDelete: undefined })

		expect(wrapper.text()).not.toContain("Actions")
		const editButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Edit")
		expect(editButton).toBeUndefined()

		wrapper.unmount()
	})

	it("still renders extraActions when onEdit is absent but extraActions is provided", () => {
		const onExtra = vi.fn()
		const wrapper = mountTable({
			onEdit: undefined,
			extraActions: (row: Row) => [h("button", { onClick: () => onExtra(row) }, "Extra")]
		})

		const extraButton = wrapper.findAll("button").find(button => button.text() === "Extra")
		expect(extraButton?.exists()).toBe(true)

		wrapper.unmount()
	})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/add-os/components/resource/__tests__/ResourceTable.spec.ts`
Expected: FAIL — `onEdit` is currently typed as required, and the actions column currently
renders unconditionally, so `"Actions"` still appears in the text.

- [ ] **Step 3: Implement**

In `src/add-os/components/resource/ResourceTable.vue`, change the prop type and gate the
actions column the same way the delete column is already gated:

```ts
const props = defineProps<{
	columns: DataTableColumns<T>
	data: T[]
	loading: boolean
	onEdit?: (row: T) => void
	onDelete?: (row: T) => void | Promise<void>
	deleteWarning?: string
	extraActions?: (row: T) => ReturnType<typeof h>[]
}>()
```

```ts
function renderEditActions(row: T) {
	const editLabel = t("resourceCrud.table.editAction")

	return h("div", { class: "flex gap-2" }, [
		...(props.onEdit
			? [
					h(
						NButton,
						{ text: true, type: "primary", "aria-label": editLabel, title: editLabel, onClick: () => props.onEdit!(row) },
						{ icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }
					)
				]
			: []),
		...(props.extraActions?.(row) ?? [])
	])
}
```

```ts
const tableColumns = computed<DataTableColumns<T>>(() => {
	const columns: DataTableColumns<T> = [...props.columns]
	if (props.onEdit || props.extraActions) {
		columns.push({ title: t("resourceCrud.table.actionsColumn"), key: "actions", render: renderEditActions })
	}
	if (props.onDelete) {
		columns.push({ title: "", key: "delete", render: renderDeleteAction })
	}
	return columns
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/add-os/components/resource/__tests__/ResourceTable.spec.ts`
Expected: PASS — all existing tests plus the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/components/resource/ResourceTable.vue src/add-os/components/resource/__tests__/ResourceTable.spec.ts
git commit -m "feat(add-os): make ResourceTable's onEdit optional for edit-less resources"
```

---

## Task 2: Plans — types, service, service spec

**Files:**
- Create: `src/add-os/modules/plans/types/plan.ts`
- Create: `src/add-os/services/plans.ts`
- Test: `src/add-os/services/__tests__/plans.spec.ts`

**Interfaces:**
- Produces: `Plan`, `PlanPayload` (from `types/plan.ts`); `listPlans()`, `getPlan(id)`,
  `createPlan(payload)`, `updatePlan(id, payload)`, `removePlan(id)` (from `services/plans.ts`).
  `Plan.price`/`included_hours`/`overage_rate` are decimal **strings** as returned by the
  API; `PlanPayload`'s versions are **numbers** — the API accepts numeric JSON for all three
  (confirmed live) and returns fixed-decimal strings.

- [ ] **Step 1: Write the failing test**

Create `src/add-os/services/__tests__/plans.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createPlan, getPlan, listPlans, removePlan, updatePlan } from "../plans"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const samplePlan = {
	id: 1,
	name: { ar: "خطة شهرية", en: "Monthly Plan" },
	is_subscription: true,
	price: "150.00",
	pricing_currency: "USD" as const,
	duration_days: 30,
	included_hours: "20.00",
	overage_rate: "5.00",
	is_active: true,
	order: 1,
	created_at: "2026-08-20T15:15:35.000000Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("plans service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listPlans GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [samplePlan] }))

		const plans = await listPlans()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plans", expect.objectContaining({ method: "GET" }))
		expect(plans).toEqual([samplePlan])
	})

	it("createPlan POSTs a numeric payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: samplePlan }, 201))

		const payload = {
			name: samplePlan.name,
			is_subscription: true,
			price: 150,
			pricing_currency: "USD" as const,
			duration_days: 30,
			included_hours: 20,
			overage_rate: 5,
			is_active: true,
			order: 1
		}
		const plan = await createPlan(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/plans",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(plan).toEqual(samplePlan)
	})

	it("getPlan GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: samplePlan }))

		const plan = await getPlan(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plans/1", expect.objectContaining({ method: "GET" }))
		expect(plan).toEqual(samplePlan)
	})

	it("updatePlan PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "تم تحديث الباقة." }))

		const result = await updatePlan(1, {
			name: samplePlan.name,
			is_subscription: true,
			price: 175,
			pricing_currency: "USD",
			duration_days: 30,
			included_hours: 25,
			overage_rate: 5,
			is_active: true,
			order: 1
		})

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plans/1", expect.objectContaining({ method: "PUT" }))
		expect(result).toEqual({ message: "تم تحديث الباقة." })
	})

	it("removePlan DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await removePlan(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plans/1", expect.objectContaining({ method: "DELETE" }))
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/add-os/services/__tests__/plans.spec.ts`
Expected: FAIL with "Cannot find module '../plans'".

- [ ] **Step 3: Write the implementation**

Create `src/add-os/modules/plans/types/plan.ts`:

```ts
export interface Plan {
	id: number
	name: { ar: string; en: string }
	is_subscription: boolean
	/** Decimal string as returned by the API, e.g. "150.00". */
	price: string
	pricing_currency: "USD" | "SYP"
	duration_days: number
	/** Decimal string, e.g. "20.00". */
	included_hours: string
	/** Decimal string, e.g. "5.00". */
	overage_rate: string
	is_active: boolean
	order: number
	created_at: string
	/**
	 * Present ONLY when the request's `currency` header differs from
	 * `pricing_currency` — confirmed live (verification report §"Currency header
	 * effect on Plans pricing"). `price`/`pricing_currency` never change; this is
	 * an additive server-side conversion using the latest applicable exchange
	 * rate as of now.
	 */
	converted_amount?: string
	converted_currency?: "USD" | "SYP"
}

/**
 * Extends `Record<string, unknown>` so this is structurally assignable to
 * `ResourceFormDrawer`'s `TModel extends Record<string, unknown>` generic (see
 * `BranchPayload`'s identical doc comment for why a plain interface needs this).
 *
 * `price`/`included_hours`/`overage_rate` are `number` here, not `string` like
 * `Plan` — the API accepts numeric JSON for all three (confirmed live) and this
 * is what `n-input-number` binds to.
 */
export interface PlanPayload extends Record<string, unknown> {
	name: { ar: string; en: string }
	is_subscription: boolean
	price: number
	pricing_currency: "USD" | "SYP"
	duration_days: number
	included_hours: number
	overage_rate: number
	is_active: boolean
	order: number
}
```

Create `src/add-os/services/plans.ts`:

```ts
import type { Plan, PlanPayload } from "@/add-os/modules/plans/types/plan"
import { createResourceApi } from "./resource-factory"

/** No `PATCH .../status` exists (confirmed 404 live) — toggling `is_active` goes through `update()`. */
const api = createResourceApi<Plan, PlanPayload, PlanPayload>("/api/v1/admin/plans")

export const listPlans = api.list
export const getPlan = api.getById
export const createPlan = api.create
export const updatePlan = api.update
export const removePlan = api.remove
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/add-os/services/__tests__/plans.spec.ts`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/plans/types/plan.ts src/add-os/services/plans.ts src/add-os/services/__tests__/plans.spec.ts
git commit -m "feat(add-os): add Plans types and service"
```

---

## Task 3: Plans — config, page, i18n, nav wiring

**Files:**
- Create: `src/add-os/modules/plans/config/plans.config.ts`
- Create: `src/add-os/modules/plans/views/PlansPage.vue`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/lang/ar/ar.json`
- Modify: `src/add-os/navigation/sections.ts`
- Modify: `src/add-os/navigation/routes.ts`
- Modify: `src/add-os/navigation/__tests__/navigation.spec.ts`

**Interfaces:**
- Consumes: `Plan`, `PlanPayload` (Task 2); `listPlans`/`createPlan`/`updatePlan`/`removePlan`
  (Task 2); `ResourceTable`/`ResourceFormDrawer`/`ResourceStatCards`; `formatCurrency`,
  `formatNumber` from `@/add-os/utils/format`.
- Produces: `buildPlanColumns(t)`, `planFields` (a plain array — no custom `rule` needed, so
  it does not need to be a function of `t`), `emptyPlanPayload()`.

- [ ] **Step 1: Add i18n keys**

In `src/add-os/lang/en/en.json`, add a new top-level `"packages"` key (matching the
existing `nav.pages.packages` route slot — the nav page is already named "packages", not
"plans"). Insert it right after the `"seatsDesks"` block (before `"shortcuts"`):

```json
	"packages": {
		"columns": { "name": "Name", "type": "Type", "price": "Price", "duration": "Duration (days)", "isActive": "Active" },
		"type": { "subscription": "Subscription", "oneTime": "One-time" },
		"create": { "button": "New plan", "title": "New plan", "success": "Plan created." },
		"edit": { "title": "Edit plan", "success": "Plan updated." },
		"delete": { "success": "Plan deleted." },
		"form": {
			"name": "Name",
			"isSubscription": "Subscription plan",
			"price": "Price",
			"pricingCurrency": "Currency",
			"durationDays": "Duration (days)",
			"includedHours": "Included hours",
			"overageRate": "Overage rate (per hour)",
			"isActive": "Active",
			"order": "Display order"
		},
		"loadError": "Couldn't load plans. You may not have permission to view this page.",
		"stats": { "total": "Total plans", "active": "Active", "subscriptions": "Subscriptions" }
	},
```

Also change `"packages": "Packages"` — it already exists under `nav.pages`, leave it as is.

In `src/add-os/lang/ar/ar.json`, add the matching block in the same position:

```json
	"packages": {
		"columns": { "name": "الاسم", "type": "النوع", "price": "السعر", "duration": "المدة (أيام)", "isActive": "نشط" },
		"type": { "subscription": "اشتراك", "oneTime": "دفعة واحدة" },
		"create": { "button": "باقة جديدة", "title": "باقة جديدة", "success": "تم إنشاء الباقة." },
		"edit": { "title": "تعديل الباقة", "success": "تم تحديث الباقة." },
		"delete": { "success": "تم حذف الباقة." },
		"form": {
			"name": "الاسم",
			"isSubscription": "باقة اشتراك",
			"price": "السعر",
			"pricingCurrency": "العملة",
			"durationDays": "المدة (أيام)",
			"includedHours": "الساعات المتضمنة",
			"overageRate": "سعر الساعة الإضافية",
			"isActive": "نشط",
			"order": "ترتيب العرض"
		},
		"loadError": "تعذّر تحميل الباقات. قد لا تملك صلاحية عرض هذه الصفحة.",
		"stats": { "total": "إجمالي الباقات", "active": "نشطة", "subscriptions": "اشتراكات" }
	},
```

- [ ] **Step 2: Run the i18n parity test to verify the new keys match**

Run: `npx vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS — both bundles define the same `packages.*` keys with non-blank,
correctly-scripted values.

- [ ] **Step 3: Write the config file**

Create `src/add-os/modules/plans/config/plans.config.ts`:

```ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Plan, PlanPayload } from "@/add-os/modules/plans/types/plan"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatCurrency, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

export function buildPlanColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<Plan> {
	return [
		{ title: t("packages.columns.name"), key: "name", render: row => pickLocalized(row.name, locale) },
		{
			title: t("packages.columns.type"),
			key: "is_subscription",
			render: row =>
				h(
					NTag,
					{ type: row.is_subscription ? "info" : "default", round: true, bordered: true },
					{ default: () => t(row.is_subscription ? "packages.type.subscription" : "packages.type.oneTime") }
				)
		},
		{
			title: t("packages.columns.price"),
			key: "price",
			render: row =>
				h("div", [
					h("div", formatCurrency(row.price, { currency: row.pricing_currency })),
					row.converted_amount && row.converted_currency
						? h("div", { class: "text-gray-400 text-xs" }, `≈ ${formatCurrency(row.converted_amount, { currency: row.converted_currency })}`)
						: null
				])
		},
		{ title: t("packages.columns.duration"), key: "duration_days", render: row => formatNumber(row.duration_days) },
		{
			title: t("packages.columns.isActive"),
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

/**
 * `pricing_currency` accepts "USD" and "SYP" only (confirmed live — "EUR" was rejected
 * as 422 invalid). Plain codes, not translated labels: a currency code isn't a phrase.
 */
export const planFields: FieldDescriptor<PlanPayload>[] = [
	{ key: "name", labelKey: "packages.form.name", type: "bilingual-text", required: true },
	{ key: "is_subscription", labelKey: "packages.form.isSubscription", type: "switch" },
	{ key: "price", labelKey: "packages.form.price", type: "number", required: true },
	{
		key: "pricing_currency",
		labelKey: "packages.form.pricingCurrency",
		type: "select",
		required: true,
		options: [
			{ label: "USD", value: "USD" },
			{ label: "SYP", value: "SYP" }
		]
	},
	{ key: "duration_days", labelKey: "packages.form.durationDays", type: "number", required: true },
	{ key: "included_hours", labelKey: "packages.form.includedHours", type: "number", required: true },
	{ key: "overage_rate", labelKey: "packages.form.overageRate", type: "number" },
	{ key: "is_active", labelKey: "packages.form.isActive", type: "switch" },
	{ key: "order", labelKey: "packages.form.order", type: "number" }
]

export function emptyPlanPayload(): PlanPayload {
	return {
		name: { ar: "", en: "" },
		is_subscription: false,
		price: 0,
		pricing_currency: "USD",
		duration_days: 30,
		included_hours: 0,
		overage_rate: 0,
		is_active: true,
		order: 1
	}
}
```

- [ ] **Step 4: Write the page**

Create `src/add-os/modules/plans/views/PlansPage.vue`:

```vue
<!-- src/add-os/modules/plans/views/PlansPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.packages") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('packages.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("packages.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="async row => { await mutations.remove(row.id) }" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields="planFields"
			:title="mode === 'create' ? t('packages.create.title') : t('packages.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Plan, PlanPayload } from "@/add-os/modules/plans/types/plan"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildPlanColumns, emptyPlanPayload, planFields } from "@/add-os/modules/plans/config/plans.config"
import { createPlan, listPlans, removePlan, updatePlan } from "@/add-os/services/plans"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Plan>(listPlans)
const columns = computed(() => buildPlanColumns(t, currentLocale.value))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const active = data.value.filter(plan => plan.is_active).length
	const subscriptions = data.value.filter(plan => plan.is_subscription).length
	return [
		{ label: t("packages.stats.total"), value: total },
		{ label: t("packages.stats.active"), value: active },
		{ label: t("packages.stats.subscriptions"), value: subscriptions }
	]
})

const mutations = useResourceMutations({ create: createPlan, update: updatePlan, remove: removePlan }, refetch, {
	createSuccess: t("packages.create.success"),
	updateSuccess: t("packages.edit.success"),
	deleteSuccess: t("packages.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<PlanPayload>(emptyPlanPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyPlanPayload()
	drawerVisible.value = true
}

function openEdit(row: Plan) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		name: { ...row.name },
		is_subscription: row.is_subscription,
		price: Number(row.price),
		pricing_currency: row.pricing_currency,
		duration_days: row.duration_days,
		included_hours: Number(row.included_hours),
		overage_rate: Number(row.overage_rate),
		is_active: row.is_active,
		order: row.order
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as PlanPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as PlanPayload)
	}
}
</script>
```

Note: Plans delete gets no role gate (per the design spec — the collection's Delete Plan
entry carries no restriction, same as Users/Roles), so `onDelete` is unconditional here,
unlike `BranchesPage.vue`'s `canDelete ? ... : undefined`.

- [ ] **Step 5: Wire the route and flip the section active**

In `src/add-os/navigation/sections.ts`, change the `plans` section's `status`:

```ts
	{
		key: "plans",
		path: "/plans",
		icon: "carbon:license",
		status: "active",
		pages: [
			{ key: "packages", path: "packages" },
			{ key: "wallet", path: "wallet" }
		]
	},
```

In `src/add-os/navigation/routes.ts`, add to `PAGE_COMPONENTS` (alphabetical-ish grouping
matching the existing list's style — insert after the `members.companies` line):

```ts
	"members.companies": () => import("@/add-os/modules/members/views/CompaniesPage.vue"),
	"plans.packages": () => import("@/add-os/modules/plans/views/PlansPage.vue")
```

In `src/add-os/navigation/__tests__/navigation.spec.ts`, update the active-sections
assertion to include `"plans"` in its actual array position (section order in
`NAV_SECTIONS` is `dashboard, spatial, system, members, bookings, plans, access, payments,
community, incubation, address, cms, settings` — filtering to active-only preserves that
order):

```ts
	it("marks exactly the five built sections as active", () => {
		const active = NAV_SECTIONS.filter(section => section.status === "active").map(section => section.key)

		expect(active).toEqual(["spatial", "system", "members", "plans", "address"])
	})
```

- [ ] **Step 6: Run the full relevant test suite**

Run: `npx vitest run src/add-os/navigation src/add-os/lang src/add-os/modules/plans src/add-os/services/__tests__/plans.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/add-os/modules/plans/config/plans.config.ts src/add-os/modules/plans/views/PlansPage.vue src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json src/add-os/navigation/sections.ts src/add-os/navigation/routes.ts src/add-os/navigation/__tests__/navigation.spec.ts
git commit -m "feat(add-os): add Plans management page"
```

---

## Task 4: Exchange Rates — types, service, service spec

**Files:**
- Create: `src/add-os/modules/payments/types/exchange-rate.ts`
- Create: `src/add-os/services/exchange-rates.ts`
- Test: `src/add-os/services/__tests__/exchange-rates.spec.ts`

**Interfaces:**
- Produces: `ExchangeRate`, `ExchangeRatePayload`; `listExchangeRates()`,
  `createExchangeRate(payload)`. **No** `getExchangeRate`/`updateExchangeRate`/
  `removeExchangeRate` — none of those endpoints exist (all confirmed `404` live); this
  service is deliberately 2 functions, not built on `createResourceApi` (whose 5-verb shape
  doesn't fit).

- [ ] **Step 1: Write the failing test**

Create `src/add-os/services/__tests__/exchange-rates.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createExchangeRate, listExchangeRates } from "../exchange-rates"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleRate = {
	id: 2,
	currency_code: "USD" as const,
	rate_to_base: "14800.0000",
	effective_from: "2026-08-19T00:00:00.000000Z",
	set_by: 1,
	created_at: "2026-08-20T15:18:28.000000Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("exchange-rates service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listExchangeRates GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleRate] }))

		const rates = await listExchangeRates()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/exchange-rates", expect.objectContaining({ method: "GET" }))
		expect(rates).toEqual([sampleRate])
	})

	it("createExchangeRate POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleRate }, 201))

		const payload = { currency_code: "USD" as const, rate_to_base: 14800, effective_from: "2026-08-19T00:00:00Z" }
		const rate = await createExchangeRate(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/exchange-rates",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(rate).toEqual(sampleRate)
	})

	it("propagates ApiError on a 422", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "البيانات المُرسلة غير صالحة.", errors: { currency_code: ["invalid"] } }, 422)
		)

		await expect(createExchangeRate({ currency_code: "USD", rate_to_base: 1, effective_from: "2026-01-01T00:00:00Z" })).rejects.toMatchObject({
			status: 422
		})
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/add-os/services/__tests__/exchange-rates.spec.ts`
Expected: FAIL with "Cannot find module '../exchange-rates'".

- [ ] **Step 3: Write the implementation**

Create `src/add-os/modules/payments/types/exchange-rate.ts`:

```ts
export interface ExchangeRate {
	id: number
	currency_code: "USD"
	/** Decimal string — SYP per 1 USD. */
	rate_to_base: string
	effective_from: string
	set_by: number
	created_at: string
}

/**
 * List + Create only — GET/PUT/DELETE on a single id all 404 live (confirmed:
 * an immutable rate ledger by design, not a missing feature). `currency_code`
 * only ever accepts "USD" (SYP/EUR/GBP/TRY/SAR all rejected as 422 invalid) —
 * SYP is the fixed base currency the rate converts into.
 */
export interface ExchangeRatePayload extends Record<string, unknown> {
	currency_code: "USD"
	rate_to_base: number
	effective_from: string
}
```

Create `src/add-os/services/exchange-rates.ts`:

```ts
import type { ExchangeRate, ExchangeRatePayload } from "@/add-os/modules/payments/types/exchange-rate"
import { get, post } from "./api"

const BASE = "/api/v1/admin/exchange-rates"

export async function listExchangeRates(): Promise<ExchangeRate[]> {
	const res = await get<{ data: ExchangeRate[] }>(BASE)
	return res.data
}

export async function createExchangeRate(payload: ExchangeRatePayload): Promise<ExchangeRate> {
	const res = await post<{ data: ExchangeRate }>(BASE, payload)
	return res.data
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/add-os/services/__tests__/exchange-rates.spec.ts`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/payments/types/exchange-rate.ts src/add-os/services/exchange-rates.ts src/add-os/services/__tests__/exchange-rates.spec.ts
git commit -m "feat(add-os): add Exchange Rates types and service"
```

---

## Task 5: Exchange Rates — config, including `latestRatesByCurrency`

**Files:**
- Create: `src/add-os/modules/payments/config/exchange-rates.config.ts`
- Test: `src/add-os/modules/payments/config/__tests__/exchange-rates.config.spec.ts`

**Interfaces:**
- Consumes: `ExchangeRate`, `ExchangeRatePayload` (Task 4).
- Produces: `buildExchangeRateColumns(t, latestIds)`, `exchangeRateFields(t)`,
  `emptyExchangeRatePayload()`, `latestRatesByCurrency(rates)`.

- [ ] **Step 1: Write the failing test**

Create `src/add-os/modules/payments/config/__tests__/exchange-rates.config.spec.ts`:

```ts
import { describe, expect, it } from "vitest"

import { latestRatesByCurrency } from "../exchange-rates.config"

describe("latestRatesByCurrency", () => {
	it("picks the row with the latest effective_from per currency", () => {
		const rates = [
			{ id: 1, currency_code: "USD" as const, rate_to_base: "14500.0000", effective_from: "2026-08-17T00:00:00.000000Z", set_by: 1, created_at: "" },
			{ id: 2, currency_code: "USD" as const, rate_to_base: "14800.0000", effective_from: "2026-08-19T00:00:00.000000Z", set_by: 1, created_at: "" }
		]

		expect(latestRatesByCurrency(rates)).toEqual([rates[1]])
	})

	it("breaks a tied effective_from by the highest id — matches the one tied case observed live", () => {
		const rates = [
			{ id: 2, currency_code: "USD" as const, rate_to_base: "14800.0000", effective_from: "2026-08-19T00:00:00.000000Z", set_by: 1, created_at: "" },
			{ id: 3, currency_code: "USD" as const, rate_to_base: "15000.0000", effective_from: "2026-08-19T00:00:00.000000Z", set_by: 1, created_at: "" }
		]

		expect(latestRatesByCurrency(rates)).toEqual([rates[1]])
	})

	it("returns one entry per distinct currency_code", () => {
		const rates = [
			{ id: 1, currency_code: "USD" as const, rate_to_base: "14500.0000", effective_from: "2026-08-17T00:00:00.000000Z", set_by: 1, created_at: "" }
		]

		expect(latestRatesByCurrency(rates)).toHaveLength(1)
	})

	it("returns an empty array for an empty input", () => {
		expect(latestRatesByCurrency([])).toEqual([])
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/add-os/modules/payments/config/__tests__/exchange-rates.config.spec.ts`
Expected: FAIL with "Cannot find module '../exchange-rates.config'".

- [ ] **Step 3: Write the implementation**

Create `src/add-os/modules/payments/config/exchange-rates.config.ts`:

```ts
import type { DataTableColumns, FormItemRule } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { ExchangeRate, ExchangeRatePayload } from "@/add-os/modules/payments/types/exchange-rate"
import { NTag } from "naive-ui"
import { h } from "vue"
import { formatDate, formatNumber } from "@/add-os/utils/format"

export function buildExchangeRateColumns(t: ComposerTranslation, latestIds: Set<number>): DataTableColumns<ExchangeRate> {
	return [
		{ title: t("exchangeRates.columns.currencyCode"), key: "currency_code" },
		{
			title: t("exchangeRates.columns.rateToBase"),
			key: "rate_to_base",
			render: row => formatNumber(row.rate_to_base, { fractionDigits: 4 })
		},
		{
			title: t("exchangeRates.columns.effectiveFrom"),
			key: "effective_from",
			render: row => formatDate(row.effective_from, { style: "dateTime" })
		},
		{
			title: "",
			key: "latest",
			render: row =>
				latestIds.has(row.id)
					? h(NTag, { type: "success", round: true, size: "small" }, { default: () => t("exchangeRates.latestBadge") })
					: null
		}
	]
}

export function exchangeRateFields(t: ComposerTranslation): FieldDescriptor<ExchangeRatePayload>[] {
	const dateRule: FormItemRule = {
		required: true,
		trigger: ["blur", "input"],
		validator: (_rule, value) =>
			(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) || new Error(t("exchangeRates.validation.effectiveFromFormat"))
	}

	return [
		{
			key: "currency_code",
			labelKey: "exchangeRates.form.currencyCode",
			type: "select",
			required: true,
			options: [{ label: "USD", value: "USD" }],
			/**
			 * Only "USD" has ever been accepted (SYP/EUR/GBP/TRY/SAR all rejected as
			 * 422 invalid — SYP is the fixed base currency the rate converts into).
			 * Fixed and disabled rather than a free choice: there is nothing else
			 * valid to pick, and no endpoint anywhere lists a currency set.
			 */
			disabledWhen: () => true
		},
		{ key: "rate_to_base", labelKey: "exchangeRates.form.rateToBase", type: "number", required: true },
		{ key: "effective_from", labelKey: "exchangeRates.form.effectiveFrom", type: "text", rule: dateRule }
	]
}

export function emptyExchangeRatePayload(): ExchangeRatePayload {
	return { currency_code: "USD", rate_to_base: 0, effective_from: "" }
}

/**
 * The backend has no `/latest` endpoint (confirmed 404, and absent from the
 * Postman collection too) — "latest per currency" is computed client-side.
 * Tie-break-by-highest-id is inferred from the one tied-effective_from case
 * observed live (the backend's own server-side conversion picked the higher-id
 * row), not from reading backend code.
 */
export function latestRatesByCurrency(rates: ExchangeRate[]): ExchangeRate[] {
	const latest = new Map<string, ExchangeRate>()
	for (const rate of rates) {
		const current = latest.get(rate.currency_code)
		if (!current) {
			latest.set(rate.currency_code, rate)
			continue
		}
		const currentTime = new Date(current.effective_from).getTime()
		const rateTime = new Date(rate.effective_from).getTime()
		if (rateTime > currentTime || (rateTime === currentTime && rate.id > current.id)) {
			latest.set(rate.currency_code, rate)
		}
	}
	return [...latest.values()]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/add-os/modules/payments/config/__tests__/exchange-rates.config.spec.ts`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/payments/config/exchange-rates.config.ts src/add-os/modules/payments/config/__tests__/exchange-rates.config.spec.ts
git commit -m "feat(add-os): add Exchange Rates config and latest-per-currency helper"
```

---

## Task 6: Exchange Rates — page, i18n, nav wiring

**Files:**
- Create: `src/add-os/modules/payments/views/ExchangeRatesPage.vue`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/lang/ar/ar.json`
- Modify: `src/add-os/navigation/sections.ts`
- Modify: `src/add-os/navigation/routes.ts`
- Modify: `src/add-os/navigation/__tests__/navigation.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 4–5, plus Task 1's now-optional `ResourceTable.onEdit`.

- [ ] **Step 1: Add i18n keys**

In `src/add-os/lang/en/en.json`, add after the `"packages"` block:

```json
	"exchangeRates": {
		"columns": { "currencyCode": "Currency", "rateToBase": "Rate (SYP per 1 USD)", "effectiveFrom": "Effective from" },
		"latestBadge": "Latest",
		"create": { "button": "New rate", "title": "New exchange rate", "success": "Exchange rate created." },
		"form": { "currencyCode": "Currency", "rateToBase": "Rate (SYP per 1 USD)", "effectiveFrom": "Effective from (YYYY-MM-DD)" },
		"validation": { "effectiveFromFormat": "Enter a date as YYYY-MM-DD." },
		"loadError": "Couldn't load exchange rates. You may not have permission to view this page.",
		"empty": "No exchange rates found.",
		"stats": { "latestUsd": "Latest USD → SYP rate" }
	},
```

In `src/add-os/lang/ar/ar.json`, add the matching block in the same position:

```json
	"exchangeRates": {
		"columns": { "currencyCode": "العملة", "rateToBase": "السعر (ليرة سورية لكل دولار)", "effectiveFrom": "ساري من" },
		"latestBadge": "الأحدث",
		"create": { "button": "سعر صرف جديد", "title": "سعر صرف جديد", "success": "تم إنشاء سعر الصرف." },
		"form": { "currencyCode": "العملة", "rateToBase": "السعر (ليرة سورية لكل دولار)", "effectiveFrom": "ساري من (YYYY-MM-DD)" },
		"validation": { "effectiveFromFormat": "أدخل تاريخاً بصيغة YYYY-MM-DD." },
		"loadError": "تعذّر تحميل أسعار الصرف. قد لا تملك صلاحية عرض هذه الصفحة.",
		"empty": "لا توجد أسعار صرف.",
		"stats": { "latestUsd": "أحدث سعر صرف دولار → ليرة" }
	},
```

- [ ] **Step 2: Run the i18n parity test**

Run: `npx vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 3: Write the page**

Create `src/add-os/modules/payments/views/ExchangeRatesPage.vue`:

```vue
<!-- src/add-os/modules/payments/views/ExchangeRatesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.exchangeRates") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading && latest.length > 0" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('exchangeRates.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("exchangeRates.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields="exchangeRateFields(t)"
			:title="t('exchangeRates.create.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { ExchangeRate, ExchangeRatePayload } from "@/add-os/modules/payments/types/exchange-rate"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import {
	buildExchangeRateColumns,
	emptyExchangeRatePayload,
	exchangeRateFields,
	latestRatesByCurrency
} from "@/add-os/modules/payments/config/exchange-rates.config"
import { createExchangeRate, listExchangeRates } from "@/add-os/services/exchange-rates"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<ExchangeRate>(listExchangeRates)
const latest = computed(() => latestRatesByCurrency(data.value))
const latestIds = computed(() => new Set(latest.value.map(rate => rate.id)))
const columns = computed(() => buildExchangeRateColumns(t, latestIds.value))

const statCards = computed<StatCard[]>(() => {
	const usd = latest.value.find(rate => rate.currency_code === "USD")
	return usd ? [{ label: t("exchangeRates.stats.latestUsd"), value: formatNumber(usd.rate_to_base, { fractionDigits: 4 }) }] : []
})

/**
 * Exchange Rates has no update/delete endpoint (verification report) — those two
 * are never invoked, only present to satisfy useResourceMutations' shared shape.
 */
const mutations = useResourceMutations(
	{
		create: createExchangeRate,
		update: () => Promise.reject(new Error("Exchange rates cannot be updated.")),
		remove: () => Promise.reject(new Error("Exchange rates cannot be deleted."))
	},
	refetch,
	{
		createSuccess: t("exchangeRates.create.success"),
		updateSuccess: t("exchangeRates.create.success"),
		deleteSuccess: t("exchangeRates.create.success")
	}
)

const drawerVisible = ref(false)
const form = ref<ExchangeRatePayload>(emptyExchangeRatePayload())

function openCreate() {
	form.value = emptyExchangeRatePayload()
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	const effectiveFrom = String(payload.effective_from)
	await mutations.create({ ...payload, effective_from: `${effectiveFrom}T00:00:00Z` } as unknown as ExchangeRatePayload)
}
</script>
```

- [ ] **Step 4: Wire the route and flip the section active**

In `src/add-os/navigation/sections.ts`, change the `payments` section's `status`:

```ts
	{
		key: "payments",
		path: "/payments",
		icon: "carbon:currency",
		status: "active",
		pages: [
			{ key: "transactions", path: "transactions" },
			{ key: "paymentMethods", path: "methods" },
			{ key: "exchangeRates", path: "exchange-rates" }
		]
	},
```

In `src/add-os/navigation/routes.ts`, add to `PAGE_COMPONENTS` (after the `plans.packages`
line added in Task 3):

```ts
	"plans.packages": () => import("@/add-os/modules/plans/views/PlansPage.vue"),
	"payments.exchangeRates": () => import("@/add-os/modules/payments/views/ExchangeRatesPage.vue")
```

In `src/add-os/navigation/__tests__/navigation.spec.ts`, extend the active list from Task 3
(`payments` sits after `plans` in `NAV_SECTIONS` order):

```ts
	it("marks exactly the six built sections as active", () => {
		const active = NAV_SECTIONS.filter(section => section.status === "active").map(section => section.key)

		expect(active).toEqual(["spatial", "system", "members", "plans", "payments", "address"])
	})
```

- [ ] **Step 5: Run the full relevant test suite**

Run: `npx vitest run src/add-os/navigation src/add-os/lang src/add-os/modules/payments src/add-os/services/__tests__/exchange-rates.spec.ts src/add-os/components/resource`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/modules/payments/views/ExchangeRatesPage.vue src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json src/add-os/navigation/sections.ts src/add-os/navigation/routes.ts src/add-os/navigation/__tests__/navigation.spec.ts
git commit -m "feat(add-os): add Exchange Rates page"
```

---

## Task 7: Business Hours — types, services, service specs

Covers both sub-resources: the weekly schedule (`business-hours`) and the per-date
exceptions (`business-hour-exceptions`) — found during verification, not in the original
brief, but the same feature area and fully working.

**Files:**
- Create: `src/add-os/modules/spatial/types/business-hour.ts`
- Create: `src/add-os/modules/spatial/types/business-hour-exception.ts`
- Create: `src/add-os/services/business-hours.ts`
- Create: `src/add-os/services/business-hour-exceptions.ts`
- Test: `src/add-os/services/__tests__/business-hours.spec.ts`
- Test: `src/add-os/services/__tests__/business-hour-exceptions.spec.ts`

**Interfaces:**
- Produces: `BusinessHour`, `BusinessHourPayload`, `BusinessHourException`,
  `BusinessHourExceptionPayload`; `listBusinessHours(query?)`, `getBusinessHour(id)`,
  `createBusinessHour(payload)`, `updateBusinessHour(id, payload)`,
  `removeBusinessHour(id)`; the same five for exceptions.

- [ ] **Step 1: Write the failing tests**

Create `src/add-os/services/__tests__/business-hours.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createBusinessHour, getBusinessHour, listBusinessHours, removeBusinessHour, updateBusinessHour } from "../business-hours"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleHour = { id: 1, branch_id: 1, day_of_week: "monday" as const, open_time: "08:00", close_time: "17:00" }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("business-hours service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listBusinessHours GETs the collection with a branch_id filter", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleHour] }))

		const hours = await listBusinessHours({ branch_id: 1 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hours?branch_id=1",
			expect.objectContaining({ method: "GET" })
		)
		expect(hours).toEqual([sampleHour])
	})

	it("createBusinessHour POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleHour }, 201))

		const payload = { branch_id: 1, day_of_week: "monday" as const, open_time: "08:00", close_time: "17:00" }
		const hour = await createBusinessHour(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hours",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(hour).toEqual(sampleHour)
	})

	it("getBusinessHour GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleHour }))

		const hour = await getBusinessHour(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/business-hours/1", expect.objectContaining({ method: "GET" }))
		expect(hour).toEqual(sampleHour)
	})

	it("updateBusinessHour PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "تم تحديث ساعات العمل." }))

		const result = await updateBusinessHour(1, { branch_id: 1, day_of_week: "monday", open_time: "09:00", close_time: "18:00" })

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/business-hours/1", expect.objectContaining({ method: "PUT" }))
		expect(result).toEqual({ message: "تم تحديث ساعات العمل." })
	})

	it("removeBusinessHour DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await removeBusinessHour(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/business-hours/1", expect.objectContaining({ method: "DELETE" }))
	})
})
```

Create `src/add-os/services/__tests__/business-hour-exceptions.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	createBusinessHourException,
	getBusinessHourException,
	listBusinessHourExceptions,
	removeBusinessHourException,
	updateBusinessHourException
} from "../business-hour-exceptions"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleException = {
	id: 1,
	branch_id: 1,
	date: "2026-12-25",
	is_closed: true,
	open_time: null,
	close_time: null,
	reason: "Holiday"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("business-hour-exceptions service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listBusinessHourExceptions GETs the collection with a branch_id filter", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleException] }))

		const exceptions = await listBusinessHourExceptions({ branch_id: 1 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hour-exceptions?branch_id=1",
			expect.objectContaining({ method: "GET" })
		)
		expect(exceptions).toEqual([sampleException])
	})

	it("createBusinessHourException POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleException }, 201))

		const payload = { branch_id: 1, date: "2026-12-25", is_closed: true, open_time: null, close_time: null, reason: "Holiday" }
		const exception = await createBusinessHourException(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hour-exceptions",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(exception).toEqual(sampleException)
	})

	it("getBusinessHourException GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleException }))

		const exception = await getBusinessHourException(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hour-exceptions/1",
			expect.objectContaining({ method: "GET" })
		)
		expect(exception).toEqual(sampleException)
	})

	it("updateBusinessHourException PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "تم تحديث استثناء ساعات العمل." }))

		const result = await updateBusinessHourException(1, {
			branch_id: 1,
			date: "2026-12-25",
			is_closed: true,
			open_time: null,
			close_time: null,
			reason: "Holiday (updated)"
		})

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hour-exceptions/1",
			expect.objectContaining({ method: "PUT" })
		)
		expect(result).toEqual({ message: "تم تحديث استثناء ساعات العمل." })
	})

	it("removeBusinessHourException DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await removeBusinessHourException(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hour-exceptions/1",
			expect.objectContaining({ method: "DELETE" })
		)
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/add-os/services/__tests__/business-hours.spec.ts src/add-os/services/__tests__/business-hour-exceptions.spec.ts`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/add-os/modules/spatial/types/business-hour.ts`:

```ts
export type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"

export interface BusinessHour {
	id: number
	branch_id: number
	day_of_week: DayOfWeek
	/** "HH:mm" — confirmed live the backend rejects "HH:mm:ss" (format must be exactly H:i). */
	open_time: string
	close_time: string
}

export interface BusinessHourPayload extends Record<string, unknown> {
	branch_id: number
	day_of_week: DayOfWeek
	open_time: string
	close_time: string
}
```

Create `src/add-os/modules/spatial/types/business-hour-exception.ts`:

```ts
export interface BusinessHourException {
	id: number
	branch_id: number
	/** "YYYY-MM-DD" */
	date: string
	is_closed: boolean
	/** null when is_closed is true — confirmed live: is_closed=true requires these omitted. */
	open_time: string | null
	close_time: string | null
	reason: string | null
}

export interface BusinessHourExceptionPayload extends Record<string, unknown> {
	branch_id: number
	date: string
	is_closed: boolean
	open_time: string | null
	close_time: string | null
	reason: string | null
}
```

Create `src/add-os/services/business-hours.ts`:

```ts
import type { BusinessHour, BusinessHourPayload } from "@/add-os/modules/spatial/types/business-hour"
import { createResourceApi } from "./resource-factory"

/** Delete is "Admin-only (not operations)." per the collection — gated in permissions.ts. */
const api = createResourceApi<BusinessHour, BusinessHourPayload, BusinessHourPayload>("/api/v1/admin/business-hours")

export const listBusinessHours = api.list
export const getBusinessHour = api.getById
export const createBusinessHour = api.create
export const updateBusinessHour = api.update
export const removeBusinessHour = api.remove
```

Create `src/add-os/services/business-hour-exceptions.ts`:

```ts
import type { BusinessHourException, BusinessHourExceptionPayload } from "@/add-os/modules/spatial/types/business-hour-exception"
import { createResourceApi } from "./resource-factory"

/** Delete is "Admin-only (not operations)." per the collection — gated in permissions.ts. */
const api = createResourceApi<BusinessHourException, BusinessHourExceptionPayload, BusinessHourExceptionPayload>(
	"/api/v1/admin/business-hour-exceptions"
)

export const listBusinessHourExceptions = api.list
export const getBusinessHourException = api.getById
export const createBusinessHourException = api.create
export const updateBusinessHourException = api.update
export const removeBusinessHourException = api.remove
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/add-os/services/__tests__/business-hours.spec.ts src/add-os/services/__tests__/business-hour-exceptions.spec.ts`
Expected: PASS, all 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/spatial/types/business-hour.ts src/add-os/modules/spatial/types/business-hour-exception.ts src/add-os/services/business-hours.ts src/add-os/services/business-hour-exceptions.ts src/add-os/services/__tests__/business-hours.spec.ts src/add-os/services/__tests__/business-hour-exceptions.spec.ts
git commit -m "feat(add-os): add Business Hours and exceptions types and services"
```

---

## Task 8: Business Hours — config (weekly schedule + exceptions)

**Files:**
- Create: `src/add-os/modules/spatial/config/business-hours.config.ts`
- Create: `src/add-os/modules/spatial/config/business-hour-exceptions.config.ts`
- Test: `src/add-os/modules/spatial/config/__tests__/business-hours.config.spec.ts`

**Interfaces:**
- Consumes: types/services from Task 7.
- Produces: `buildBusinessHourColumns(t)`, `businessHourFields(t)`,
  `emptyBusinessHourPayload(branchId)`; `buildBusinessHourExceptionColumns(t)`,
  `businessHourExceptionFields(t, isClosed)`, `emptyBusinessHourExceptionPayload(branchId)`.

Only `businessHourFields`/`businessHourExceptionFields` need a dedicated test — they carry
the actual HH:mm/YYYY-MM-DD pattern-validation logic. Columns and empty-payload factories
have no comparable logic (matching the `branches.config.ts` precedent, which has no spec
test at all).

- [ ] **Step 1: Write the failing test**

Create `src/add-os/modules/spatial/config/__tests__/business-hours.config.spec.ts`:

```ts
import { describe, expect, it } from "vitest"

import { businessHourExceptionFields, businessHourFields } from "../business-hours.config"

const t = ((key: string) => key) as (key: string, named?: Record<string, unknown>) => string

describe("businessHourFields", () => {
	it("open_time and close_time rules accept HH:mm", () => {
		const fields = businessHourFields(t)
		const openTimeRule = fields.find(field => field.key === "open_time")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(openTimeRule.validator(null, "08:00")).toBe(true)
	})

	it("open_time and close_time rules reject HH:mm:ss and other malformed input", () => {
		const fields = businessHourFields(t)
		const openTimeRule = fields.find(field => field.key === "open_time")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(openTimeRule.validator(null, "08:00:00")).toBeInstanceOf(Error)
		expect(openTimeRule.validator(null, "25:00")).toBeInstanceOf(Error)
		expect(openTimeRule.validator(null, "")).toBeInstanceOf(Error)
	})
})

describe("businessHourExceptionFields", () => {
	it("requires open_time/close_time to match HH:mm when not closed", () => {
		const fields = businessHourExceptionFields(t, false)
		const openTimeRule = fields.find(field => field.key === "open_time")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(openTimeRule.validator(null, "09:00")).toBe(true)
		expect(openTimeRule.validator(null, "")).toBeInstanceOf(Error)
	})

	it("skips the HH:mm requirement for open_time/close_time when closed", () => {
		const fields = businessHourExceptionFields(t, true)
		const openTimeRule = fields.find(field => field.key === "open_time")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(openTimeRule.validator(null, "")).toBe(true)
		expect(openTimeRule.validator(null, null)).toBe(true)
	})

	it("disables open_time/close_time when the model's is_closed is true", () => {
		const fields = businessHourExceptionFields(t, true)
		const openTimeField = fields.find(field => field.key === "open_time")!

		expect(openTimeField.disabledWhen?.({ is_closed: true } as never)).toBe(true)
		expect(openTimeField.disabledWhen?.({ is_closed: false } as never)).toBe(false)
	})

	it("date field requires YYYY-MM-DD", () => {
		const fields = businessHourExceptionFields(t, false)
		const dateRule = fields.find(field => field.key === "date")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(dateRule.validator(null, "2026-12-25")).toBe(true)
		expect(dateRule.validator(null, "25/12/2026")).toBeInstanceOf(Error)
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/add-os/modules/spatial/config/__tests__/business-hours.config.spec.ts`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/add-os/modules/spatial/config/business-hours.config.ts`:

```ts
import type { DataTableColumns, FormItemRule, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { BusinessHour, BusinessHourPayload, DayOfWeek } from "@/add-os/modules/spatial/types/business-hour"
import type { BusinessHourException, BusinessHourExceptionPayload } from "@/add-os/modules/spatial/types/business-hour-exception"

/** Confirmed live: lowercase full English names only — "Sunday" (capitalized) is rejected. */
const DAYS_OF_WEEK: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function dayOfWeekOptions(t: ComposerTranslation): SelectOption[] {
	return DAYS_OF_WEEK.map(day => ({ label: t(`businessHours.days.${day}`), value: day }))
}

function timeRule(t: ComposerTranslation, required = true): FormItemRule {
	return {
		required,
		trigger: ["blur", "input"],
		validator: (_rule, value) =>
			(typeof value === "string" && TIME_PATTERN.test(value)) || new Error(t("businessHours.validation.timeFormat"))
	}
}

export function buildBusinessHourColumns(t: ComposerTranslation): DataTableColumns<BusinessHour> {
	return [
		{ title: t("businessHours.columns.dayOfWeek"), key: "day_of_week", render: row => t(`businessHours.days.${row.day_of_week}`) },
		{ title: t("businessHours.columns.openTime"), key: "open_time" },
		{ title: t("businessHours.columns.closeTime"), key: "close_time" }
	]
}

export function businessHourFields(t: ComposerTranslation): FieldDescriptor<BusinessHourPayload>[] {
	return [
		{ key: "day_of_week", labelKey: "businessHours.form.dayOfWeek", type: "select", required: true, options: dayOfWeekOptions(t) },
		{ key: "open_time", labelKey: "businessHours.form.openTime", type: "text", rule: timeRule(t) },
		{ key: "close_time", labelKey: "businessHours.form.closeTime", type: "text", rule: timeRule(t) }
	]
}

export function emptyBusinessHourPayload(branchId: number): BusinessHourPayload {
	return { branch_id: branchId, day_of_week: "sunday", open_time: "", close_time: "" }
}

export function buildBusinessHourExceptionColumns(t: ComposerTranslation): DataTableColumns<BusinessHourException> {
	return [
		{ title: t("businessHours.exceptions.columns.date"), key: "date" },
		{
			title: t("businessHours.exceptions.columns.isClosed"),
			key: "is_closed",
			render: row => t(row.is_closed ? "businessHours.exceptions.isClosedYes" : "businessHours.exceptions.isClosedNo")
		},
		{
			title: t("businessHours.exceptions.columns.hours"),
			key: "hours",
			render: row => (row.is_closed ? "—" : `${row.open_time} – ${row.close_time}`)
		},
		{ title: t("businessHours.exceptions.columns.reason"), key: "reason", render: row => row.reason ?? "—" }
	]
}

/**
 * `isClosed` drives both whether open_time/close_time are required at all (an
 * exception marked closed omits them entirely — confirmed live) and their
 * disabled state. Callers rebuild this array from a `computed` keyed on the
 * current form model's `is_closed`, so toggling the switch produces fresh rule
 * objects with the correct required-ness — `ResourceFormDrawer`'s `rules`
 * computed already reacts to `props.fields` changing.
 */
export function businessHourExceptionFields(t: ComposerTranslation, isClosed: boolean): FieldDescriptor<BusinessHourExceptionPayload>[] {
	const dateRule: FormItemRule = {
		required: true,
		trigger: ["blur", "input"],
		validator: (_rule, value) => (typeof value === "string" && DATE_PATTERN.test(value)) || new Error(t("businessHours.exceptions.validation.dateFormat"))
	}

	return [
		{ key: "date", labelKey: "businessHours.exceptions.form.date", type: "text", rule: dateRule },
		{ key: "is_closed", labelKey: "businessHours.exceptions.form.isClosed", type: "switch" },
		{
			key: "open_time",
			labelKey: "businessHours.exceptions.form.openTime",
			type: "text",
			rule: timeRule(t, !isClosed),
			disabledWhen: model => Boolean(model.is_closed)
		},
		{
			key: "close_time",
			labelKey: "businessHours.exceptions.form.closeTime",
			type: "text",
			rule: timeRule(t, !isClosed),
			disabledWhen: model => Boolean(model.is_closed)
		},
		{ key: "reason", labelKey: "businessHours.exceptions.form.reason", type: "text" }
	]
}

export function emptyBusinessHourExceptionPayload(branchId: number): BusinessHourExceptionPayload {
	return { branch_id: branchId, date: "", is_closed: false, open_time: "", close_time: "", reason: "" }
}
```

Note: the `timeRule` validator returning `true`/`Error` (not a `Promise`) matches
async-validator's synchronous-validator contract, same pattern already used in
`ResourceFormDrawer.vue`'s own `isBilingualComplete` validator.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/add-os/modules/spatial/config/__tests__/business-hours.config.spec.ts`
Expected: PASS, all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/spatial/config/business-hours.config.ts src/add-os/modules/spatial/config/business-hour-exceptions.config.ts src/add-os/modules/spatial/config/__tests__/business-hours.config.spec.ts
git commit -m "feat(add-os): add Business Hours and exceptions config"
```

(A separate `business-hour-exceptions.config.ts` file was planned in the design doc, but
since both sub-resources' config is small and the exceptions helpers directly consume the
weekly-schedule file's `TIME_PATTERN`/`timeRule`, they're kept in the single
`business-hours.config.ts` file above — one file, one clear "Business Hours module config"
responsibility, matching how `branches.config.ts` alone covers Branches. Do not create the
separate `business-hour-exceptions.config.ts` file; the commit above intentionally excludes
it.)

---

## Task 9: Permissions — Business Hours delete gate

Placed before the Business Hours page task (not after, as originally drafted) because that
page imports `canDeleteBusinessHours` — building it first keeps every task's own new code
importable and its own tests passing in isolation, per this plan's global constraint.

**Files:**
- Modify: `src/add-os/config/permissions.ts`
- Modify: `src/add-os/config/__tests__/permissions.spec.ts`

**Interfaces:**
- Produces: `BUSINESS_HOURS_DELETE_ROLE`, `canDeleteBusinessHours()` — consumed by
  `BusinessHoursPage.vue` in Task 10.

- [ ] **Step 1: Write the failing test**

In `src/add-os/config/__tests__/permissions.spec.ts`, update the import line and add a new
`describe` block:

```ts
const { canDeleteSpatialResource, canDeleteBusinessHours, CASCADING_SPATIAL_RESOURCES, SPATIAL_RESOURCE_DELETE_ROLE, BUSINESS_HOURS_DELETE_ROLE } =
	await import("../permissions")
```

```ts
describe("business hours permissions", () => {
	it("is admin-only, per the collection's Admin-only annotation on both delete endpoints", () => {
		expect(BUSINESS_HOURS_DELETE_ROLE).toBe("admin")
	})

	it("grants delete to admin", () => {
		state.role = "admin"
		expect(canDeleteBusinessHours()).toBe(true)
	})

	it("denies delete to operations", () => {
		state.role = "operations"
		expect(canDeleteBusinessHours()).toBe(false)
	})

	it("denies delete when there is no role", () => {
		state.role = null
		expect(canDeleteBusinessHours()).toBe(false)
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/add-os/config/__tests__/permissions.spec.ts`
Expected: FAIL — `BUSINESS_HOURS_DELETE_ROLE`/`canDeleteBusinessHours` don't exist yet.

- [ ] **Step 3: Implement**

In `src/add-os/config/permissions.ts`, add after `canDeleteSpatialResource`:

```ts
/**
 * Business Hours delete + Business Hour Exception delete are both "Admin-only
 * (not operations)." per the collection — same rule, so one shared constant and
 * one function cover both endpoints rather than duplicating
 * `SPATIAL_RESOURCE_DELETE_ROLE`'s per-resource map for a single value. Kept
 * separate from that map: Business Hours isn't a spatial resource, it just
 * lives in that nav section.
 */
export const BUSINESS_HOURS_DELETE_ROLE: Role = "admin"

export function canDeleteBusinessHours(): boolean {
	return useAuthStore().isRoleGranted(BUSINESS_HOURS_DELETE_ROLE)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/add-os/config/__tests__/permissions.spec.ts`
Expected: PASS, all tests including the 4 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/config/permissions.ts src/add-os/config/__tests__/permissions.spec.ts
git commit -m "feat(add-os): gate Business Hours delete to admin"
```

---

## Task 10: Business Hours — page, nav wiring, i18n

**Files:**
- Create: `src/add-os/modules/spatial/views/BusinessHoursPage.vue`
- Test: `src/add-os/modules/spatial/views/__tests__/BusinessHoursPage.spec.ts`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/lang/ar/ar.json`
- Modify: `src/add-os/navigation/sections.ts`
- Modify: `src/add-os/navigation/routes.ts`

**Interfaces:**
- Consumes: everything from Tasks 7–9 (types/services/config from 7–8, `canDeleteBusinessHours`
  from 9), plus `listBranches` (existing `src/add-os/services/branches.ts`).

- [ ] **Step 1: Add i18n keys**

In `src/add-os/lang/en/en.json`, add after the `"seatsDesks"` block (Business Hours joins
the `spatial` module):

```json
	"businessHours": {
		"branchLabel": "Branch",
		"branchPlaceholder": "Select a branch",
		"tabs": { "weeklySchedule": "Weekly schedule", "exceptions": "Exceptions" },
		"days": {
			"sunday": "Sunday",
			"monday": "Monday",
			"tuesday": "Tuesday",
			"wednesday": "Wednesday",
			"thursday": "Thursday",
			"friday": "Friday",
			"saturday": "Saturday"
		},
		"columns": { "dayOfWeek": "Day", "openTime": "Opens", "closeTime": "Closes" },
		"create": { "button": "New hours", "title": "New business hours", "success": "Business hours created." },
		"edit": { "title": "Edit business hours", "success": "Business hours updated." },
		"delete": { "success": "Business hours deleted." },
		"form": { "dayOfWeek": "Day of week", "openTime": "Opens at", "closeTime": "Closes at" },
		"validation": { "timeFormat": "Enter a time as HH:mm, e.g. 08:00." },
		"loadError": "Couldn't load business hours. You may not have permission to view this page.",
		"empty": "No business hours found for this branch.",
		"exceptions": {
			"columns": { "date": "Date", "isClosed": "Closed", "hours": "Hours", "reason": "Reason" },
			"isClosedYes": "Closed",
			"isClosedNo": "Open",
			"create": { "button": "New exception", "title": "New exception", "success": "Exception created." },
			"edit": { "title": "Edit exception", "success": "Exception updated." },
			"delete": { "success": "Exception deleted." },
			"form": {
				"date": "Date (YYYY-MM-DD)",
				"isClosed": "Closed all day",
				"openTime": "Opens at",
				"closeTime": "Closes at",
				"reason": "Reason (optional)"
			},
			"validation": { "dateFormat": "Enter a date as YYYY-MM-DD." },
			"empty": "No exceptions found for this branch."
		}
	},
```

In `src/add-os/lang/ar/ar.json`, add the matching block in the same position:

```json
	"businessHours": {
		"branchLabel": "الفرع",
		"branchPlaceholder": "اختر فرعاً",
		"tabs": { "weeklySchedule": "الجدول الأسبوعي", "exceptions": "الاستثناءات" },
		"days": {
			"sunday": "الأحد",
			"monday": "الاثنين",
			"tuesday": "الثلاثاء",
			"wednesday": "الأربعاء",
			"thursday": "الخميس",
			"friday": "الجمعة",
			"saturday": "السبت"
		},
		"columns": { "dayOfWeek": "اليوم", "openTime": "يفتح", "closeTime": "يغلق" },
		"create": { "button": "ساعات جديدة", "title": "ساعات عمل جديدة", "success": "تم إنشاء ساعات العمل." },
		"edit": { "title": "تعديل ساعات العمل", "success": "تم تحديث ساعات العمل." },
		"delete": { "success": "تم حذف ساعات العمل." },
		"form": { "dayOfWeek": "يوم الأسبوع", "openTime": "يفتح الساعة", "closeTime": "يغلق الساعة" },
		"validation": { "timeFormat": "أدخل وقتاً بصيغة HH:mm، مثل 08:00." },
		"loadError": "تعذّر تحميل ساعات العمل. قد لا تملك صلاحية عرض هذه الصفحة.",
		"empty": "لا توجد ساعات عمل لهذا الفرع.",
		"exceptions": {
			"columns": { "date": "التاريخ", "isClosed": "مغلق", "hours": "الساعات", "reason": "السبب" },
			"isClosedYes": "مغلق",
			"isClosedNo": "مفتوح",
			"create": { "button": "استثناء جديد", "title": "استثناء جديد", "success": "تم إنشاء الاستثناء." },
			"edit": { "title": "تعديل الاستثناء", "success": "تم تحديث الاستثناء." },
			"delete": { "success": "تم حذف الاستثناء." },
			"form": {
				"date": "التاريخ (YYYY-MM-DD)",
				"isClosed": "مغلق طوال اليوم",
				"openTime": "يفتح الساعة",
				"closeTime": "يغلق الساعة",
				"reason": "السبب (اختياري)"
			},
			"validation": { "dateFormat": "أدخل تاريخاً بصيغة YYYY-MM-DD." },
			"empty": "لا توجد استثناءات لهذا الفرع."
		}
	},
```

Also add the new nav page title. In `src/add-os/lang/en/en.json`'s `nav.pages`, after
`"seatsDesks": "Seats & Desks",`:

```json
			"businessHours": "Business Hours",
```

In `src/add-os/lang/ar/ar.json`'s `nav.pages`, after `"seatsDesks": "المقاعد والطاولات",`:

```json
			"businessHours": "ساعات العمل",
```

- [ ] **Step 2: Run the i18n parity test**

Run: `npx vitest run src/add-os/lang/__tests__/messages.spec.ts`
Expected: PASS.

- [ ] **Step 3: Write the page**

Create `src/add-os/modules/spatial/views/BusinessHoursPage.vue`:

```vue
<!-- src/add-os/modules/spatial/views/BusinessHoursPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.businessHours") }}</h1>
		</div>

		<n-select
			v-model:value="selectedBranchId"
			class="max-w-sm"
			:placeholder="t('businessHours.branchPlaceholder')"
			:options="branchOptions"
		/>

		<n-tabs v-if="selectedBranchId !== null" type="line">
			<n-tab-pane name="weekly" :tab="t('businessHours.tabs.weeklySchedule')">
				<div class="flex flex-col gap-5">
					<n-alert v-if="hoursError" type="error" :title="t('businessHours.loadError')" />

					<div class="flex justify-end">
						<n-button type="primary" @click="openCreateHour">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("businessHours.create.button") }}
						</n-button>
					</div>

					<ResourceTable
						:columns="hourColumns"
						:data="hours"
						:loading="hoursLoading"
						:on-edit="openEditHour"
						:on-delete="canDeleteHours ? (async row => { await hourMutations.remove(row.id) }) : undefined"
					/>
				</div>

				<ResourceFormDrawer
					v-model:show="hourDrawerVisible"
					v-model:model="hourForm"
					:fields="businessHourFields(t)"
					:title="hourMode === 'create' ? t('businessHours.create.title') : t('businessHours.edit.title')"
					:submitting="hourMutations.isSubmitting.value"
					:on-submit="submitHour"
				/>
			</n-tab-pane>

			<n-tab-pane name="exceptions" :tab="t('businessHours.tabs.exceptions')">
				<div class="flex flex-col gap-5">
					<n-alert v-if="exceptionsError" type="error" :title="t('businessHours.loadError')" />

					<div class="flex justify-end">
						<n-button type="primary" @click="openCreateException">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("businessHours.exceptions.create.button") }}
						</n-button>
					</div>

					<ResourceTable
						:columns="exceptionColumns"
						:data="exceptions"
						:loading="exceptionsLoading"
						:on-edit="openEditException"
						:on-delete="canDeleteHours ? (async row => { await exceptionMutations.remove(row.id) }) : undefined"
					/>
				</div>

				<ResourceFormDrawer
					v-model:show="exceptionDrawerVisible"
					v-model:model="exceptionForm"
					:fields="exceptionFieldsComputed"
					:title="exceptionMode === 'create' ? t('businessHours.exceptions.create.title') : t('businessHours.exceptions.edit.title')"
					:submitting="exceptionMutations.isSubmitting.value"
					:on-submit="submitException"
				/>
			</n-tab-pane>
		</n-tabs>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { BusinessHour, BusinessHourPayload } from "@/add-os/modules/spatial/types/business-hour"
import type { BusinessHourException, BusinessHourExceptionPayload } from "@/add-os/modules/spatial/types/business-hour-exception"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { canDeleteBusinessHours } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	businessHourExceptionFields,
	businessHourFields,
	buildBusinessHourColumns,
	buildBusinessHourExceptionColumns,
	emptyBusinessHourExceptionPayload,
	emptyBusinessHourPayload
} from "@/add-os/modules/spatial/config/business-hours.config"
import {
	createBusinessHourException,
	listBusinessHourExceptions,
	removeBusinessHourException,
	updateBusinessHourException
} from "@/add-os/services/business-hour-exceptions"
import { createBusinessHour, listBusinessHours, removeBusinessHour, updateBusinessHour } from "@/add-os/services/business-hours"
import { listBranches } from "@/add-os/services/branches"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const canDeleteHours = computed(() => canDeleteBusinessHours())

const branches = ref<Branch[]>([])
const selectedBranchId = ref<number | null>(null)
const branchOptions = computed<SelectOption[]>(() =>
	branches.value.map(branch => ({ label: pickLocalized(branch.name, currentLocale.value), value: branch.id }))
)

listBranches().then(result => {
	branches.value = result
	selectedBranchId.value = result[0]?.id ?? null
})

const branchQuery = computed(() => (selectedBranchId.value === null ? undefined : { branch_id: selectedBranchId.value }))

// ── Weekly schedule ──────────────────────────────────────────────────────
const {
	data: hours,
	isLoading: hoursLoading,
	error: hoursError,
	refetch: refetchHours
} = useResourceList<BusinessHour>(listBusinessHours, branchQuery)
const hourColumns = computed(() => buildBusinessHourColumns(t))

const hourMutations = useResourceMutations(
	{ create: createBusinessHour, update: updateBusinessHour, remove: removeBusinessHour },
	refetchHours,
	{ createSuccess: t("businessHours.create.success"), updateSuccess: t("businessHours.edit.success"), deleteSuccess: t("businessHours.delete.success") }
)

const hourDrawerVisible = ref(false)
const hourMode = ref<"create" | "edit">("create")
const editingHourId = ref<number | null>(null)
const hourForm = ref<BusinessHourPayload>(emptyBusinessHourPayload(selectedBranchId.value ?? 0))

function openCreateHour() {
	hourMode.value = "create"
	editingHourId.value = null
	hourForm.value = emptyBusinessHourPayload(selectedBranchId.value ?? 0)
	hourDrawerVisible.value = true
}

function openEditHour(row: BusinessHour) {
	hourMode.value = "edit"
	editingHourId.value = row.id
	hourForm.value = { branch_id: row.branch_id, day_of_week: row.day_of_week, open_time: row.open_time, close_time: row.close_time }
	hourDrawerVisible.value = true
}

async function submitHour(payload: Record<string, unknown>) {
	const withBranch = { ...payload, branch_id: selectedBranchId.value ?? 0 }
	if (hourMode.value === "create") {
		await hourMutations.create(withBranch as unknown as BusinessHourPayload)
	} else if (editingHourId.value !== null) {
		await hourMutations.update(editingHourId.value, withBranch as unknown as BusinessHourPayload)
	}
}

// ── Exceptions ───────────────────────────────────────────────────────────
const {
	data: exceptions,
	isLoading: exceptionsLoading,
	error: exceptionsError,
	refetch: refetchExceptions
} = useResourceList<BusinessHourException>(listBusinessHourExceptions, branchQuery)
const exceptionColumns = computed(() => buildBusinessHourExceptionColumns(t))

const exceptionMutations = useResourceMutations(
	{ create: createBusinessHourException, update: updateBusinessHourException, remove: removeBusinessHourException },
	refetchExceptions,
	{
		createSuccess: t("businessHours.exceptions.create.success"),
		updateSuccess: t("businessHours.exceptions.edit.success"),
		deleteSuccess: t("businessHours.exceptions.delete.success")
	}
)

const exceptionDrawerVisible = ref(false)
const exceptionMode = ref<"create" | "edit">("create")
const editingExceptionId = ref<number | null>(null)
const exceptionForm = ref<BusinessHourExceptionPayload>(emptyBusinessHourExceptionPayload(selectedBranchId.value ?? 0))
const exceptionFieldsComputed = computed(() => businessHourExceptionFields(t, Boolean(exceptionForm.value.is_closed)))

function openCreateException() {
	exceptionMode.value = "create"
	editingExceptionId.value = null
	exceptionForm.value = emptyBusinessHourExceptionPayload(selectedBranchId.value ?? 0)
	exceptionDrawerVisible.value = true
}

function openEditException(row: BusinessHourException) {
	exceptionMode.value = "edit"
	editingExceptionId.value = row.id
	exceptionForm.value = {
		branch_id: row.branch_id,
		date: row.date,
		is_closed: row.is_closed,
		open_time: row.open_time,
		close_time: row.close_time,
		reason: row.reason
	}
	exceptionDrawerVisible.value = true
}

async function submitException(payload: Record<string, unknown>) {
	const withBranch: Record<string, unknown> = { ...payload, branch_id: selectedBranchId.value ?? 0 }
	// is_closed=true requires open_time/close_time omitted (confirmed live) — disabledWhen
	// only disables the control, so stale input must be cleared here regardless.
	if (withBranch.is_closed) {
		withBranch.open_time = null
		withBranch.close_time = null
	}
	if (exceptionMode.value === "create") {
		await exceptionMutations.create(withBranch as unknown as BusinessHourExceptionPayload)
	} else if (editingExceptionId.value !== null) {
		await exceptionMutations.update(editingExceptionId.value, withBranch as unknown as BusinessHourExceptionPayload)
	}
}

// Both tabs' branch-scoped lists refetch when the branch changes — refetch() (not the
// composable's own query watcher) is called explicitly because both hourForm/exceptionForm
// also need their branch_id reset for the next "New" click.
watch(selectedBranchId, () => {
	hourForm.value = emptyBusinessHourPayload(selectedBranchId.value ?? 0)
	exceptionForm.value = emptyBusinessHourExceptionPayload(selectedBranchId.value ?? 0)
})
</script>
```

Note: `useResourceList`'s own `watch(query, refetch, {immediate:true})` already refetches
both lists when `branchQuery` changes (it's a `computed` derived from `selectedBranchId`) —
the extra `watch(selectedBranchId, ...)` above only resets the two create-form drafts, it
does not duplicate the refetch.

- [ ] **Step 4: Wire the route and add the new nav page**

In `src/add-os/navigation/sections.ts`, add `businessHours` to the `spatial` section's
`pages` array (at the end):

```ts
	{
		key: "spatial",
		path: "/spatial",
		icon: "carbon:building",
		status: "active",
		pages: [
			{ key: "branches", path: "branches" },
			{ key: "buildings", path: "buildings" },
			{ key: "floors", path: "floors" },
			{ key: "zones", path: "zones" },
			{ key: "spaces", path: "spaces" },
			{ key: "resources", path: "resources" },
			{ key: "seatsDesks", path: "seats-desks" },
			{ key: "businessHours", path: "business-hours" }
		]
	},
```

In `src/add-os/navigation/routes.ts`, add to `PAGE_COMPONENTS` (after `spatial.seatsDesks`):

```ts
	"spatial.seatsDesks": () => import("@/add-os/modules/spatial/views/SeatsDesksPage.vue"),
	"spatial.businessHours": () => import("@/add-os/modules/spatial/views/BusinessHoursPage.vue"),
```

- [ ] **Step 5: Write a page-wiring test**

Unlike `PlansPage.vue`/`ExchangeRatesPage.vue` (plain `ResourceTable`/`ResourceFormDrawer`
wiring with no custom logic, matching `BranchesPage.vue`'s untested precedent),
`BusinessHoursPage.vue` has real logic worth asserting via source-string checks — matching
`CompaniesPage.spec.ts`'s style (this codebase does not mount full pages with Vue Test
Utils). Create `src/add-os/modules/spatial/views/__tests__/BusinessHoursPage.spec.ts`:

```ts
// src/add-os/modules/spatial/views/__tests__/BusinessHoursPage.spec.ts
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "BusinessHoursPage.vue")
const source = readFileSync(FILE, "utf8")

describe("businessHoursPage wiring", () => {
	it("gates both tabs' delete actions behind canDeleteBusinessHours, not an inline role check", () => {
		expect(source).toContain('from "@/add-os/config/permissions"')
		expect(source).toContain("canDeleteHours ? (async row => { await hourMutations.remove(row.id) }) : undefined")
		expect(source).toContain("canDeleteHours ? (async row => { await exceptionMutations.remove(row.id) }) : undefined")
	})

	it("clears open_time/close_time when an exception is submitted as closed, per the backend's is_closed=true contract", () => {
		expect(source).toMatch(/if \(withBranch\.is_closed\) \{\s*withBranch\.open_time = null\s*withBranch\.close_time = null/)
	})

	it("scopes both lists to the selected branch via branch_id, not an unfiltered list", () => {
		expect(source).toContain("useResourceList<BusinessHour>(listBusinessHours, branchQuery)")
		expect(source).toContain("useResourceList<BusinessHourException>(listBusinessHourExceptions, branchQuery)")
	})

	it("never sends a raw HTTP call — only the composables/services layer", () => {
		expect(source).not.toMatch(/\bfetch\(/)
	})
})
```

Run: `npx vitest run src/add-os/modules/spatial/views/__tests__/BusinessHoursPage.spec.ts`
Expected: PASS, all 4 tests — this is a same-task regression check (asserting on the code
just written in Step 3 above), not a TDD red/green cycle.

- [ ] **Step 6: Run the full relevant test suite**

Run: `npx vitest run src/add-os/navigation src/add-os/lang src/add-os/modules/spatial src/add-os/services/__tests__/business-hours.spec.ts src/add-os/services/__tests__/business-hour-exceptions.spec.ts`
Expected: PASS. (`navigation.spec.ts`'s "gives every section at least one page" and "unique
route names" assertions pass unchanged; no section-count or active-list assertion needs
updating here since `spatial` was already active and this only adds a page to it.)

- [ ] **Step 7: Commit**

```bash
git add src/add-os/modules/spatial/views/BusinessHoursPage.vue src/add-os/modules/spatial/views/__tests__/BusinessHoursPage.spec.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json src/add-os/navigation/sections.ts src/add-os/navigation/routes.ts
git commit -m "feat(add-os): add Business Hours page with weekly schedule and exceptions tabs"
```

---

## Task 11: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, 0 failed. Note the total file/test count for the closing summary.

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --build --force`
Expected: clean, no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint --fix src/add-os`
Expected: clean; autofix produces no diff (or only trivial formatting — review before
committing if it does).

- [ ] **Step 4: Confirm scope**

Run: `git diff main --stat`
Expected: every changed path is under `src/add-os/**` or `docs/**` — no vendor `src/**`, no
`_pinx-vendor/**`, and critically **no** `package.json`/`pnpm-lock.yaml`/
`pnpm-workspace.yaml`/`ResourceFormDrawer.vue` changes (those are the pre-existing stray
diff, not this task's).

- [ ] **Step 5: Manual smoke check against the live backend**

The verification report already covers every endpoint directly; this step just confirms
the UI itself renders against them. The dev server started for Part A
(`php artisan serve` on `127.0.0.1:8000`) may still be running — check with
`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/sanctum/csrf-cookie`
(expect `204`) and restart it if not (`cd ADDCore && php artisan serve`). Then:

```bash
pnpm dev
```

Open `/plans/packages`, `/payments/exchange-rates`, `/spatial/business-hours`, sign in as
`admin@add.local` / `password`, and confirm: Plans list/create/edit/delete round-trip;
Exchange Rates list/create round-trip and the "Latest" badge lands on the newest row;
Business Hours' branch picker populates, both tabs list/create/edit/delete round-trip, and
the exceptions tab's is_closed toggle disables the time fields.

- [ ] **Step 6: Update the design spec's status line if anything changed during implementation**

If any implementation detail deviated from
`docs/superpowers/specs/2026-08-20-plans-exchange-rates-business-hours-design.md` (per this
codebase's "append the reversal, don't overwrite reasoning" convention), append a short note
to that file's end explaining what changed and why, rather than editing the original
decision in place.

- [ ] **Step 7: Final commit**

```bash
git add -A -- src/add-os docs
git status
git commit -m "chore(add-os): final verification pass for Plans/Exchange Rates/Business Hours"
```

(Skip this commit if Steps 1–4 found nothing to fix — the preceding 10 tasks' commits are
already the complete, tested change.)
