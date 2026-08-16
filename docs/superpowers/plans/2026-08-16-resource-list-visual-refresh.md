# Resource List Visual Refresh (Ledger Style) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 8 already-shipped resource-list pages (Users, Branches, Buildings, Floors, Zones, Spaces, Resources, Seats/Desks) the ledger-table visual language from the admin-dashboard Figma reference — a stat-card summary row and a de-emphasized uppercase table header — using only data and tokens that already exist.

**Architecture:** A new presentational component, `ResourceStatCards.vue`, wraps Naive UI's existing `NStatistic`/`NCard`. Five pages (Users, Branches, Buildings, Spaces, Resources) each compute their own `StatCard[]` from the array their existing `useResourceList`/local `ref` already holds — no new endpoint, no new composable. The table header treatment is wired once, at the shared layer: two `DataTable` theme-var overrides in `src/theme/index.ts` (reusing colors already flowing through the runtime token pipeline — no `tokens.ts` or `scripts/build-tokens.js` change needed, see the note in Task 2) plus a small SCSS partial for `text-transform: uppercase`, applied via one class on `ResourceTable.vue`'s root — so all 8 tables inherit it automatically.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript (strict), Naive UI, Tailwind v4, vue-i18n, Vitest + `@vue/test-utils`. No new dependency.

**Spec:** `docs/superpowers/specs/2026-08-16-resource-list-visual-refresh-design.md`

## Global Constraints

- **No new npm dependency.** `ResourceStatCards.vue` is built entirely on Naive UI components already in the project (`NCard`, `NStatistic` — already used in `src/views/Components/Statistic.vue`).
- **Vendor `src/**` outside `src/add-os` is never edited**, with one established exception: `src/theme/index.ts`'s `getThemeOverrides()` return object is the project's existing seam for "our layer's overrides" into vendor Naive UI theming (already extended there for `Card`/`Tag`/`Typography`/`LoadingBar`) — adding a `DataTable` key follows that same precedent, per `.claude/rules/vendor-boundary.md`.
- **Every user-visible string goes through vue-i18n, in both `ar` and `en`.** `src/add-os/lang/__tests__/messages.spec.ts` fails the build if a key exists in one language and not the other. Every i18n step in this plan adds the same keys to both `src/add-os/lang/en/en.json` and `src/add-os/lang/ar/ar.json` in the same step, with real (non-placeholder) translations in both — matching the phrasing already used for the same concepts elsewhere in those files (e.g. `users.status.*`, `operationalStatus.*`).
- **All numbers render through `src/add-os/utils/format/`** (`formatNumber`) — never raw template interpolation of a numeric value.
- **TypeScript strict, no `any`.**
- **Zero hardcoded design values.** No new hex, no new px/em spacing value. Every colour used is one already in `src/add-os/theme/tokens.ts`'s runtime chain; the one new visual property (`text-transform: uppercase`) is a CSS keyword, not a design value, and reuses the existing `--add-font-size-caption` / `--add-font-weight-medium` CSS custom properties.
- Run `pnpm test:unit` (Vitest) after every task. Run `pnpm lint` and `pnpm type-check` before the final task's full-suite pass. (`package.json` has no `pnpm test` or `pnpm typecheck` script — those are the real names.)
- **Out of scope, do not touch:** `RolesPage.vue` (no `n-data-table`, no create/edit — doesn't fit this pattern); stat-card rows on `FloorsPage.vue`/`ZonesPage.vue`/`SeatsDesksPage.vue` (no status/breakdown field exists on `Floor`/`Zone`/`SeatDesk`); `ResourceFormDrawer.vue`; the delete `n-popconfirm` in `ResourceTable.vue`; any new nav section or backend call.

---

## File Structure

```
src/add-os/
├── components/resource/
│   ├── ResourceStatCards.vue         NEW (Task 1)
│   ├── ResourceTable.vue             MODIFY — add `add-ledger-table` class (Task 2)
│   └── __tests__/
│       └── ResourceStatCards.spec.ts NEW (Task 1)
├── theme-overrides/
│   ├── _resource-table.scss          NEW (Task 2)
│   └── index.scss                    MODIFY — register the new partial (Task 2)
├── modules/system/views/
│   └── UsersPage.vue                 MODIFY — stat cards (Task 3)
├── modules/spatial/views/
│   ├── BranchesPage.vue              MODIFY — stat cards (Task 4)
│   ├── BuildingsPage.vue             MODIFY — stat cards (Task 5)
│   ├── SpacesPage.vue                MODIFY — stat cards (Task 6)
│   └── ResourcesPage.vue             MODIFY — stat cards (Task 7)
├── lang/en/en.json                   MODIFY — every task with user-visible text
└── lang/ar/ar.json                   MODIFY — every task with user-visible text

src/theme/index.ts                    MODIFY — `DataTable` theme override (Task 2)
```

---

## Task 1: `ResourceStatCards.vue`

**Files:**
- Create: `src/add-os/components/resource/ResourceStatCards.vue`
- Test: `src/add-os/components/resource/__tests__/ResourceStatCards.spec.ts`

**Interfaces:**
- Produces: `export interface StatCard { label: string; value: string | number }` and a component accepting `defineProps<{ cards: StatCard[] }>()`. Tasks 3–7 import both the type and the component from this file.

- [ ] **Step 1: Write the failing test**

```ts
// src/add-os/components/resource/__tests__/ResourceStatCards.spec.ts
import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import ResourceStatCards from "../ResourceStatCards.vue"

describe("resourceStatCards", () => {
	it("renders one card per entry, with its label and value", () => {
		const wrapper = mount(ResourceStatCards, {
			props: {
				cards: [
					{ label: "Total users", value: 1847 },
					{ label: "Active", value: "12" }
				]
			}
		})

		expect(wrapper.text()).toContain("Total users")
		expect(wrapper.text()).toContain("1,847")
		expect(wrapper.text()).toContain("Active")
		expect(wrapper.text()).toContain("12")

		wrapper.unmount()
	})

	it("renders no cards when given an empty array", () => {
		const wrapper = mount(ResourceStatCards, { props: { cards: [] } })

		expect(wrapper.findAll(".n-card").length).toBe(0)

		wrapper.unmount()
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit ResourceStatCards -- --run`
Expected: FAIL — `Failed to resolve import "../ResourceStatCards.vue"`

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- src/add-os/components/resource/ResourceStatCards.vue -->
<template>
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
		<n-card v-for="card in cards" :key="card.label" size="small">
			<n-statistic :label="card.label" :value="formattedValue(card.value)" />
		</n-card>
	</div>
</template>

<script setup lang="ts">
import { NCard, NStatistic } from "naive-ui"
import { formatNumber } from "@/add-os/utils/format"

export interface StatCard {
	label: string
	value: string | number
}

defineProps<{ cards: StatCard[] }>()

function formattedValue(value: string | number): string {
	return typeof value === "number" ? formatNumber(value) : value
}
</script>
```

Note: the first test asserts the exact text `"1,847"` — `formatNumber(1847)` groups thousands (see `src/add-os/utils/format/numbers.ts`'s `formatNumber`), so this is the real, already-verified output of that function, not a guess.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit ResourceStatCards -- --run`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/add-os/components/resource/ResourceStatCards.vue src/add-os/components/resource/__tests__/ResourceStatCards.spec.ts
git commit -m "feat(add-os): add ResourceStatCards summary-row component"
```

---

## Task 2: Ledger-style table header (shared, all 8 tables at once)

**Files:**
- Modify: `src/theme/index.ts`
- Create: `src/add-os/theme-overrides/_resource-table.scss`
- Modify: `src/add-os/theme-overrides/index.scss`
- Modify: `src/add-os/components/resource/ResourceTable.vue:3`

**Why no `tokens.ts` or `scripts/build-tokens.js` change is needed:** the spec (§5a) flagged `component.table` in `tokens.ts` (`headerBackground`, `rowStripeBackground`, `borderColor`) as unwired and left the exact fix to planning time. Tracing it: `component.table.headerBackground`/`borderColor` are **already the same values** as two colors that already reach `src/theme/index.ts` today — `component.light.table.headerBackground` is `light.surfaceSunken`, which is exactly `runtimeColors()`'s existing `backgroundSecondary` field (`scripts/build-tokens.js:416`); `component.light.table.borderColor` is `light.border`, exactly the existing `border` field (`scripts/build-tokens.js:420`). Checking Naive UI's actual `DataTable` default theme (`node_modules/naive-ui/lib/data-table/styles/light.js`) confirms `borderColor` there already composites from our existing `common.dividerColor`/`cardColor` overrides correctly — nothing to change. Only two `DataTable` theme vars default to something NOT yet brand-correct: `thColor` (composites an internal Naive UI grey tint, not our tokens) and `thTextColor` (currently inherits our full-strength `text`, not a de-emphasized tone). Both are fixable with colors `src/theme/index.ts` already has in scope — no pipeline change.

- [ ] **Step 1: Add the `DataTable` theme override**

In `src/theme/index.ts`, add a `DataTable` key to the object returned by `getThemeOverrides()` (after the existing `Tag` key, before `Typography`):

```ts
		Tag: {
			colorBordered: "rgba(0, 0, 0, 0.1)"
		},
		DataTable: {
			// Header background/text de-emphasized relative to the card body — the
			// ledger-table look from the admin-dashboard Figma reference. Both
			// colors already flow through this function; see Task 2's note in the
			// plan for why no token/pipeline change was needed.
			thColor: backgroundSecondary,
			thTextColor: textTertiary
		},
		Typography: {
```

No new destructured variables are needed — `backgroundSecondary` and `textTertiary` are already destructured at the top of `getThemeOverrides()` (`src/theme/index.ts:82` and `:85`).

- [ ] **Step 2: Add the class hook to `ResourceTable.vue`**

In `src/add-os/components/resource/ResourceTable.vue`, change line 3:

```diff
-	<div class="flex flex-col gap-3">
+	<div class="flex flex-col gap-3 add-ledger-table">
```

- [ ] **Step 3: Create the SCSS partial**

```scss
// src/add-os/theme-overrides/_resource-table.scss
//
// ── ADD OS — resource ledger table ──────────────────────────────────────────
// Uppercase, de-emphasized table header, matching the ledger-table visual
// language from the admin-dashboard Figma reference (see
// docs/superpowers/specs/2026-08-16-resource-list-visual-refresh-design.md).
// Colour/weight come from src/theme/index.ts's `DataTable` themeOverrides —
// this partial only adds what Naive UI's theme vars cannot express
// (text-transform), reusing existing generated CSS vars for size/weight so
// nothing here is a new hardcoded design value.

.add-ledger-table .n-data-table-th__title {
	text-transform: uppercase;
	font-size: var(--add-font-size-caption);
	font-weight: var(--add-font-weight-medium);
}
```

- [ ] **Step 4: Register the partial**

In `src/add-os/theme-overrides/index.scss`, add the import (after the existing `numeric` import, per the file's own "not listed here = dead code" rule):

```diff
 // Numerals and data — the tabular-figure face for money/quantity cells
 @import "./numeric";
+
+// Resource ledger tables — uppercase header treatment for ResourceTable.vue
+@import "./resource-table";
```

- [ ] **Step 5: Verify with the guard suite and a manual check**

Run: `pnpm test:unit -- --run`
Expected: PASS, no regressions (this task adds no new spec file — `ResourceTable.spec.ts`'s existing assertions on text content are unaffected by a class/color change).

Run: `pnpm dev`, open any of the 8 resource-list pages (e.g. `/system/users`), and confirm the table header now renders on the sunken/secondary background, in muted uppercase text.

- [ ] **Step 6: Commit**

```bash
git add src/theme/index.ts src/add-os/components/resource/ResourceTable.vue src/add-os/theme-overrides/_resource-table.scss src/add-os/theme-overrides/index.scss
git commit -m "feat(add-os): ledger-style uppercase header for ResourceTable"
```

---

## Task 3: Users stat cards

**Files:**
- Modify: `src/add-os/modules/system/views/UsersPage.vue`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/lang/ar/ar.json`

**Interfaces:**
- Consumes: `ResourceStatCards` component and `StatCard` type from Task 1 (`src/add-os/components/resource/ResourceStatCards.vue`).

- [ ] **Step 1: Add i18n keys**

In `src/add-os/lang/en/en.json`, inside the `"users"` object (after `"empty": "No users found."` on line 91), add:

```diff
 		"loadError": "Couldn't load users. You may not have permission to view this page.",
-		"empty": "No users found."
+		"empty": "No users found.",
+		"stats": {
+			"total": "Total users",
+			"active": "Active",
+			"deactivated": "Deactivated",
+			"blocked": "Blocked"
+		}
 	},
```

In `src/add-os/lang/ar/ar.json`, inside the `"users"` object (after `"empty": "لا يوجد مستخدمون."` on line 95):

```diff
 		"loadError": "تعذّر تحميل المستخدمين. قد لا تملك صلاحية الوصول لهذه الصفحة.",
-		"empty": "لا يوجد مستخدمون."
+		"empty": "لا يوجد مستخدمون.",
+		"stats": {
+			"total": "إجمالي المستخدمين",
+			"active": "نشط",
+			"deactivated": "معطّل",
+			"blocked": "محظور"
+		}
 	},
```

- [ ] **Step 2: Compute the stat cards**

In `src/add-os/modules/system/views/UsersPage.vue`, add the import and computed after `filteredUsers` (around line 163):

```ts
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
```

```ts
const statCards = computed(() => [
	{ label: t("users.stats.total"), value: users.value.length },
	{ label: t("users.stats.active"), value: users.value.filter(u => u.status === "active").length },
	{ label: t("users.stats.deactivated"), value: users.value.filter(u => u.status === "deactivated").length },
	{ label: t("users.stats.blocked"), value: users.value.filter(u => u.status === "blocked").length }
])
```

- [ ] **Step 3: Render it**

In the template, insert right after the title block and before the `n-alert` (around line 7):

```diff
 			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.users") }}</h1>
 			<p>{{ t("users.description") }}</p>
 		</div>
 
+		<ResourceStatCards :cards="statCards" />
+
 		<n-alert v-if="loadError" type="error" :title="t('users.loadError')" />
```

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run` and `pnpm type-check`
Expected: both PASS.

Run: `pnpm dev`, open `/system/users`, confirm 4 stat cards render above the table with correct counts matching the visible rows, in both `en` and `ar` (language switch in the toolbar).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/system/views/UsersPage.vue src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add stat-card summary row to Users"
```

---

## Task 4: Branches stat cards

**Files:**
- Modify: `src/add-os/modules/spatial/views/BranchesPage.vue`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/lang/ar/ar.json`

**Interfaces:**
- Consumes: `ResourceStatCards` (Task 1).

- [ ] **Step 1: Add i18n keys**

`en.json`, inside `"branches"` (after `"loadError"` on line 101):

```diff
-		"loadError": "Couldn't load branches. You may not have permission to view this page."
+		"loadError": "Couldn't load branches. You may not have permission to view this page.",
+		"stats": { "total": "Total branches", "active": "Active", "inactive": "Inactive" }
 	},
```

`ar.json`, inside `"branches"` (after `"loadError"` on line 105):

```diff
-		"loadError": "تعذّر تحميل الفروع. قد لا تملك صلاحية عرض هذه الصفحة."
+		"loadError": "تعذّر تحميل الفروع. قد لا تملك صلاحية عرض هذه الصفحة.",
+		"stats": { "total": "إجمالي الفروع", "active": "نشط", "inactive": "غير نشط" }
 	},
```

- [ ] **Step 2: Compute the stat cards**

In `src/add-os/modules/spatial/views/BranchesPage.vue`, add the import (with the other `@/add-os/components/resource/*` imports around line 34):

```ts
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
```

After `const columns = computed(...)` (around line 48):

```ts
const statCards = computed(() => {
	const total = data.value.length
	const active = data.value.filter(branch => branch.is_active).length
	return [
		{ label: t("branches.stats.total"), value: total },
		{ label: t("branches.stats.active"), value: active },
		{ label: t("branches.stats.inactive"), value: total - active }
	]
})
```

- [ ] **Step 3: Render it**

```diff
 		<div class="flex flex-col gap-1">
 			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.branches") }}</h1>
 		</div>
 
+		<ResourceStatCards :cards="statCards" />
+
 		<n-alert v-if="error" type="error" :title="t('branches.loadError')" />
```

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run` and `pnpm type-check` — both PASS.
Manual: `pnpm dev`, open `/spatial/branches`, confirm 3 cards with correct counts, `en`/`ar`.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/spatial/views/BranchesPage.vue src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add stat-card summary row to Branches"
```

---

## Task 5: Buildings stat cards

**Files:**
- Modify: `src/add-os/modules/spatial/views/BuildingsPage.vue`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/lang/ar/ar.json`

**Interfaces:**
- Consumes: `ResourceStatCards` (Task 1).

- [ ] **Step 1: Add i18n keys**

`en.json`, inside `"buildings"` (after `"loadError"` on line 109):

```diff
-		"loadError": "Couldn't load buildings. You may not have permission to view this page."
+		"loadError": "Couldn't load buildings. You may not have permission to view this page.",
+		"stats": { "total": "Total buildings", "totalFloors": "Total floors" }
 	},
```

`ar.json`, inside `"buildings"` (after `"loadError"` on line 113):

```diff
-		"loadError": "تعذّر تحميل المباني. قد لا تملك صلاحية عرض هذه الصفحة."
+		"loadError": "تعذّر تحميل المباني. قد لا تملك صلاحية عرض هذه الصفحة.",
+		"stats": { "total": "إجمالي المباني", "totalFloors": "إجمالي الطوابق" }
 	},
```

- [ ] **Step 2: Compute the stat cards**

Import (near line 35):

```ts
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
```

After `const fields = computed(...)` (around line 54):

```ts
const statCards = computed(() => [
	{ label: t("buildings.stats.total"), value: data.value.length },
	{ label: t("buildings.stats.totalFloors"), value: data.value.reduce((sum, building) => sum + building.floor_count, 0) }
])
```

- [ ] **Step 3: Render it**

```diff
 		<div class="flex flex-col gap-1">
 			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.buildings") }}</h1>
 		</div>
 
+		<ResourceStatCards :cards="statCards" />
+
 		<n-alert v-if="error" type="error" :title="t('buildings.loadError')" />
```

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run` and `pnpm type-check` — both PASS.
Manual: `pnpm dev`, open `/spatial/buildings`, confirm both cards, `en`/`ar`.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/spatial/views/BuildingsPage.vue src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add stat-card summary row to Buildings"
```

---

## Task 6: Spaces stat cards

**Files:**
- Modify: `src/add-os/modules/spatial/views/SpacesPage.vue`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/lang/ar/ar.json`

**Interfaces:**
- Consumes: `ResourceStatCards` (Task 1).

- [ ] **Step 1: Add i18n keys**

`en.json`, inside `"spaces"` (after the `"loadError"` line, ~line 161):

```diff
-		"loadError": "Couldn't load spaces. You may not have permission to view this page."
+		"loadError": "Couldn't load spaces. You may not have permission to view this page.",
+		"stats": { "total": "Total spaces", "active": "Active", "maintenance": "Under maintenance", "retired": "Retired" }
 	},
```

`ar.json`, inside `"spaces"` (after the `"loadError"` line, ~line 161):

```diff
-		"loadError": "تعذّر تحميل المساحات. قد لا تملك صلاحية عرض هذه الصفحة."
+		"loadError": "تعذّر تحميل المساحات. قد لا تملك صلاحية عرض هذه الصفحة.",
+		"stats": { "total": "إجمالي المساحات", "active": "نشط", "maintenance": "قيد الصيانة", "retired": "خارج الخدمة" }
 	},
```

(Labels intentionally match the wording already used for the same three states in the pre-existing `"operationalStatus"` key.)

- [ ] **Step 2: Compute the stat cards**

Import (near line 56):

```ts
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
```

After `const fields = computed(...)` (around line 86):

```ts
const statCards = computed(() => {
	const total = data.value.length
	const active = data.value.filter(space => space.status === "active").length
	const maintenance = data.value.filter(space => space.status === "maintenance").length
	const retired = data.value.filter(space => space.status === "retired").length
	return [
		{ label: t("spaces.stats.total"), value: total },
		{ label: t("spaces.stats.active"), value: active },
		{ label: t("spaces.stats.maintenance"), value: maintenance },
		{ label: t("spaces.stats.retired"), value: retired }
	]
})
```

- [ ] **Step 3: Render it**

```diff
 		<div class="flex flex-col gap-1">
 			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.spaces") }}</h1>
 		</div>
 
+		<ResourceStatCards :cards="statCards" />
+
 		<n-alert v-if="error" type="error" :title="t('spaces.loadError')" />
```

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run` and `pnpm type-check` — both PASS.
Manual: `pnpm dev`, open `/spatial/spaces`, confirm 4 cards, `en`/`ar`.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/spatial/views/SpacesPage.vue src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add stat-card summary row to Spaces"
```

---

## Task 7: Resources stat cards

**Files:**
- Modify: `src/add-os/modules/spatial/views/ResourcesPage.vue`
- Modify: `src/add-os/lang/en/en.json`
- Modify: `src/add-os/lang/ar/ar.json`

**Interfaces:**
- Consumes: `ResourceStatCards` (Task 1).

- [ ] **Step 1: Add i18n keys**

`en.json`, inside `"resources"` (after its `"loadError"` line):

```diff
-		"loadError": "Couldn't load resources. You may not have permission to view this page."
+		"loadError": "Couldn't load resources. You may not have permission to view this page.",
+		"stats": { "total": "Total resources", "active": "Active", "maintenance": "Under maintenance", "retired": "Retired" }
 	},
```

`ar.json`, inside `"resources"` (after its `"loadError"` line):

```diff
-		"loadError": "تعذّر تحميل الموارد. قد لا تملك صلاحية عرض هذه الصفحة."
+		"loadError": "تعذّر تحميل الموارد. قد لا تملك صلاحية عرض هذه الصفحة.",
+		"stats": { "total": "إجمالي الموارد", "active": "نشط", "maintenance": "قيد الصيانة", "retired": "خارج الخدمة" }
 	},
```

- [ ] **Step 2: Compute the stat cards**

Import (near line 53):

```ts
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
```

After `const fields = computed(...)` (around line 78):

```ts
const statCards = computed(() => {
	const total = data.value.length
	const active = data.value.filter(resource => resource.status === "active").length
	const maintenance = data.value.filter(resource => resource.status === "maintenance").length
	const retired = data.value.filter(resource => resource.status === "retired").length
	return [
		{ label: t("resources.stats.total"), value: total },
		{ label: t("resources.stats.active"), value: active },
		{ label: t("resources.stats.maintenance"), value: maintenance },
		{ label: t("resources.stats.retired"), value: retired }
	]
})
```

- [ ] **Step 3: Render it**

```diff
 		<div class="flex flex-col gap-1">
 			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.resources") }}</h1>
 		</div>
 
+		<ResourceStatCards :cards="statCards" />
+
 		<n-alert v-if="error" type="error" :title="t('resources.loadError')" />
```

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run` and `pnpm type-check` — both PASS.
Manual: `pnpm dev`, open `/spatial/resources`, confirm 4 cards, `en`/`ar`.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/spatial/views/ResourcesPage.vue src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(add-os): add stat-card summary row to Resources"
```

---

## Task 8: Full-suite pass and ar/en × RTL/LTR manual QA

**Files:** none (verification-only task).

- [ ] **Step 1: Run the full guard suite**

Run: `pnpm lint && pnpm type-check && pnpm test:unit -- --run`
Expected: all PASS, no new warnings.

- [ ] **Step 2: Manual 4-state visual QA**

`n-data-table` is vendor-flagged RTL-beta, and this is the first change to its header styling since it shipped — the Users/Roles and spatial-hierarchy designs both flagged the same risk before reuse, so it gets one dedicated pass here rather than being caught piecemeal across 8 pages later.

Run `pnpm dev`. For each of the two toggles (language `ar`/`en` × direction, which follows the language per the existing RTL binding), open `/system/users`, `/spatial/branches`, `/spatial/buildings`, `/spatial/spaces`, `/spatial/resources` and confirm:
- The stat-card row wraps cleanly at narrow widths (2 columns) and shows all cards in one row at desktop width (4, or 3 for Branches, or 2 for Buildings).
- The table header reads in uppercase, on the sunken/secondary background, in the muted (`textTertiary`) tone — in both LTR (`en`) and RTL (`ar`) header-cell alignment.
- No layout overflow or clipped text in either language.

- [ ] **Step 3: Record the outcome**

If everything passes, no doc update is needed (the spec's §8 open item is closed by this pass). If a defect is found, fix it within this task before closing it out — do not carry a known RTL/visual defect past this plan.
