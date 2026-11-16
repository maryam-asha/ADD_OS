<!-- src/add-os/modules/inventory/views/MaintenancePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryMaintenance')" :description="t('inventory.maintenance.pageDescription')" />

		<!-- Stat Cards -->
		<div v-if="!loadError" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.schedules.overdue") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
						<Icon name="carbon:warning-alt" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{{ overdueCount }}</span>
					<span class="text-xs font-medium text-slate-400">{{ t("inventory.schedules.nextDue") }}</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.maintenance.due") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
						<Icon name="carbon:calendar" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{{ due.length }}</span>
					<span class="text-xs font-medium text-slate-400">{{ t("inventory.maintenance.withinDays.other", { n: days }) }}</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.maintenance.openOnes") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400">
						<Icon name="carbon:tool-kit" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-amber-500 dark:text-amber-400">{{ openRecordsCount }}</span>
					<span class="text-xs font-medium text-slate-400">{{ t("inventory.maintenance.open") }}</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.maintenance.cost") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
						<Icon name="carbon:currency" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{{ totalMaintenanceCost ? money(totalMaintenanceCost, records[0]?.currency) : EMPTY }}</span>
					<span class="text-xs font-medium text-slate-400">{{ records[0]?.currency || "" }}</span>
				</div>
			</div>
		</div>

		<!-- Filters: place and category narrow both lists; the rest the records. -->
		<div class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
			<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
				<n-input v-model:value="filters.search" :placeholder="t('inventory.maintenance.search')" clearable class="w-full">
					<template #prefix><Icon name="carbon:search" :size="16" class="text-slate-400" /></template>
				</n-input>
				<n-select v-model:value="filters.category_id" :options="categoryOptions" :placeholder="t('inventory.common.category')" clearable filterable class="w-full" />
				<n-select v-model:value="filters.type" :options="typeOptions" :placeholder="t('inventory.maintenance.allTypes')" clearable class="w-full" />
				<n-date-picker v-model:formatted-value="period" type="daterange" value-format="yyyy-MM-dd" clearable class="w-full" />
				<div class="sm:col-span-2 lg:col-span-4">
					<PlacePicker v-model:chain="placeChain" :value="place" inline />
				</div>
			</div>
			<div v-if="hasActiveFilters" class="mt-3 flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-800/80">
				<n-button quaternary size="small" @click="resetFilters">
					<template #icon><Icon name="carbon:reset" :size="14" /></template>
					{{ t("inventory.common.resetFilters") }}
				</n-button>
			</div>
		</div>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<!-- Due Schedules Card -->
		<n-card size="small" class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
			<template #header>
				<div class="flex items-center gap-2">
					<span class="font-bold">{{ t("inventory.maintenance.due") }}</span>
					<span v-if="due.length" class="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
						{{ due.length }}
					</span>
				</div>
			</template>
			<template #header-extra>
				<n-select v-model:value="days" :options="dayOptions" size="small" class="w-44" />
			</template>
			<n-data-table :columns="dueColumns" :data="due" :loading="loading" :bordered="false" :row-props="row => assetRowProps(row.asset_id)" size="small" :scroll-x="740">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
						<Icon name="carbon:checkmark-outline" :size="32" class="mb-1 text-emerald-500 opacity-60" />
						<span>{{ t("inventory.maintenance.noneDue") }}</span>
					</div>
				</template>
			</n-data-table>
		</n-card>

		<!-- Maintenance Records Card -->
		<n-card size="small" class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
			<template #header>
				<div class="flex items-center gap-3">
					<span class="font-bold">{{ t("inventory.history.maintenance") }}</span>
					<n-radio-group v-model:value="scope" size="small">
						<n-radio-button value="open">{{ t("inventory.maintenance.openOnes") }}</n-radio-button>
						<n-radio-button value="all">{{ t("inventory.maintenance.all") }}</n-radio-button>
					</n-radio-group>
				</div>
			</template>
			<n-data-table :columns="recordColumns" :data="records" :loading="loading" :bordered="false" :row-props="row => assetRowProps(row.asset_id)" size="small" :scroll-x="1180">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
						<Icon name="carbon:tool-kit" :size="40" class="mb-2 opacity-50" />
						<span>{{ t("inventory.maintenance.empty") }}</span>
					</div>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Category, MaintenanceRecord, MaintenanceSchedule, MaintenanceType } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NInput, NPagination, NRadioButton, NRadioGroup, NSelect, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import { ALIGN_END, categoryPaths, codeChip, EMPTY, localized, money, nameCell, viewActionColumn } from "@/add-os/modules/inventory/utils/display"
import { chainOf, filtersOf, PLACE_FILTER_SCHEMA, placeOf, usePlaceFilter } from "@/add-os/modules/inventory/utils/placeFilter"
import { listCategories, listDueSchedules, listMaintenance } from "@/add-os/services/inventory"
import { countKey, formatNumber } from "@/add-os/utils/format"
import { formatDate, formatTime } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/**
 * What needs looking after: routine servicing coming due (or overdue),
 * and the repairs and servicing on record — open ones first by default.
 * A row opens its asset, where a repair is closed and a schedule edited.
 * Where the asset sits (a branch takes everything in it) and its category
 * narrow both lists; type, the days opened and a search the records. Every
 * filter is kept in the URL.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

const due = ref<MaintenanceSchedule[]>([])
const records = ref<MaintenanceRecord[]>([])
const categories = ref<Category[]>([])
const MAINTENANCE_TYPES: MaintenanceType[] = ["corrective", "preventive"]

const { filters, applied, page } = useRouteFilters(
	{ search: "string", category_id: "number", type: "string", from: "string", to: "string", scope: "string", days: "number", ...PLACE_FILTER_SCHEMA },
	() => void load(),
	{ debounced: ["search"], defaults: { scope: "open", days: 7 } }
)
const { place, chain: placeChain } = usePlaceFilter(filters)

const days = computed<number>({
	get: () => filters.value.days ?? 7,
	set: n => (filters.value.days = n)
})
const scope = computed<"open" | "all">({
	get: () => (filters.value.scope === "all" ? "all" : "open"),
	set: next => (filters.value.scope = next)
})
const period = computed<[string, string] | null>({
	get: (): [string, string] | null => {
		const { from, to } = filters.value
		return from && to ? [from, to] : null
	},
	set: (next: [string, string] | null) => {
		filters.value = { ...filters.value, from: next?.[0] ?? null, to: next?.[1] ?? null }
	}
})
const typeOptions = computed<SelectOption[]>(() => MAINTENANCE_TYPES.map(type => ({ label: t(`inventory.maintenanceType.${type}`), value: type })))
const categoryOptions = computed<SelectOption[]>(() => categoryPaths(categories.value).map(({ category, path }) => ({ label: path, value: category.id })))

const hasActiveFilters = computed(() => Boolean(filters.value.search || filters.value.category_id || filters.value.type || filters.value.from || place.value))

function resetFilters() {
	filters.value = { ...filters.value, ...filtersOf(null), search: "", category_id: null, type: null, from: null, to: null }
}

const lastPage = ref(1)
const loading = ref(true)
const loadError = ref("")

const overdueCount = computed(() => due.value.filter(s => s.overdue).length)
const openRecordsCount = computed(() => records.value.filter(r => !r.closed_at).length)
const totalMaintenanceCost = computed(() => records.value.reduce((sum, r) => sum + (parseFloat(r.cost ?? "") || 0), 0))

onMounted(() => void quietly(() => listCategories("asset"), list => (categories.value = list)))

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const f = applied.value
		const where = { place: placeOf(chainOf(f)), category_id: f.category_id }
		const [schedules, result] = await Promise.all([
			listDueSchedules(f.days ?? 7, where),
			listMaintenance({ page: page.value, open: f.scope !== "all", ...where, type: f.type as MaintenanceType | null, from: f.from, to: f.to, search: f.search })
		])
		due.value = schedules
		records.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

const dayOptions = computed<SelectOption[]>(() => [7, 30, 90].map(n => ({ label: t(countKey("inventory.maintenance.withinDays", n), { n: formatNumber(n) }), value: n })))

function openAsset(assetId: number) {
	void router.push({ name: "inventory.inventoryAsset", params: { id: assetId } })
}

function assetRowProps(assetId: number) {
	return {
		class: "cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
		onClick: () => openAsset(assetId)
	}
}

const dueColumns = computed<DataTableColumns<MaintenanceSchedule>>(() => [
	{
		title: t("inventory.assets.code"),
		key: "asset",
		width: 130,
		render: row => codeChip(row.asset?.code ?? `#${row.asset_id}`)
	},
	{ title: t("inventory.schedules.title"), key: "title", minWidth: 200, ellipsis: { tooltip: true } },
	{
		title: t("inventory.schedules.frequency"),
		key: "interval_months",
		minWidth: 120,
		render: row => t(countKey("inventory.schedules.every", row.interval_months), { n: formatNumber(row.interval_months) })
	},
	{
		title: t("inventory.schedules.nextDue"),
		key: "next_due_on",
		minWidth: 160,
		render: row =>
			h("div", { class: "inline-flex items-center gap-2" }, [
				formatDate(row.next_due_on),
				row.overdue ? h(NTag, { size: "small", round: true, type: "error" }, () => t("inventory.schedules.overdue")) : null
			])
	},
	viewActionColumn<MaintenanceSchedule>(row => openAsset(row.asset_id), t("inventory.common.view"))
])

const recordColumns = computed<DataTableColumns<MaintenanceRecord>>(() => [
	{
		title: t("inventory.assets.item"),
		key: "asset",
		minWidth: 200,
		width: 220,
		ellipsis: { tooltip: true },
		render: row =>
			nameCell(row.asset ? localized(row.asset.item.name) : EMPTY, row.asset?.code ?? `#${row.asset_id}`, { code: true })
	},
	{
		title: t("inventory.maintenance.type"),
		key: "type",
		width: 120,
		align: "center",
		render: row =>
			h(
				NTag,
				{ size: "small", round: true, type: row.type === "corrective" ? "error" : "info" },
				() => t(`inventory.maintenanceType.${row.type}`)
			)
	},
	{ title: t("inventory.maintenance.description"), key: "description", minWidth: 200, ellipsis: { tooltip: true } },
	{ title: t("inventory.maintenance.vendor"), key: "vendor", width: 140, ellipsis: { tooltip: true }, render: row => row.vendor ?? EMPTY },
	{
		title: t("inventory.history.opened"),
		key: "opened_at",
		width: 160,
		render: row => {
			if (!row.opened_at) return EMPTY
			return h("div", { class: "flex flex-col gap-0.5 leading-tight" }, [
				h("span", { class: "font-medium text-xs whitespace-nowrap text-slate-800 dark:text-slate-200" }, formatDate(row.opened_at)),
				h("span", { class: "text-[11px] text-slate-400 font-mono whitespace-nowrap mt-0.5" }, formatTime(row.opened_at))
			])
		}
	},
	{
		title: t("inventory.history.closed"),
		key: "closed_at",
		width: 140,
		align: "center",
		render: row =>
			row.closed_at
				? h("div", { class: "flex flex-col gap-0.5 leading-tight items-center" }, [
						h("span", { class: "font-medium text-xs whitespace-nowrap text-slate-600 dark:text-slate-400" }, formatDate(row.closed_at)),
						h("span", { class: "text-[11px] text-slate-400 font-mono whitespace-nowrap mt-0.5" }, formatTime(row.closed_at))
				  ])
				: h(NTag, { size: "small", round: true, type: "warning" }, () => t("inventory.maintenance.open"))
	},
	{
		title: t("inventory.maintenance.cost"),
		key: "cost",
		width: 120,
		minWidth: 110,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric font-semibold" }, money(row.cost, row.currency))
	},
	viewActionColumn<MaintenanceRecord>(row => openAsset(row.asset_id), t("inventory.common.view"))
])
</script>
