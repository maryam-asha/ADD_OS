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
			<n-data-table :columns="recordColumns" :data="records" :loading="loading" :bordered="false" :row-props="row => assetRowProps(row.asset_id)" size="small" :scroll-x="1080">
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
import type { MaintenanceRecord, MaintenanceSchedule } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NCard, NDataTable, NPagination, NRadioButton, NRadioGroup, NSelect, NTag } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { codeChip, EMPTY, localized, money, nameCell, viewActionColumn } from "@/add-os/modules/inventory/utils/display"
import { listDueSchedules, listMaintenance } from "@/add-os/services/inventory"
import { countKey, formatNumber } from "@/add-os/utils/format"
import { formatDate, formatDateTime } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/**
 * What needs looking after: routine servicing coming due (or overdue),
 * and the repairs and servicing on record — open ones first by default.
 * A row opens its asset, where a repair is closed and a schedule edited.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

const due = ref<MaintenanceSchedule[]>([])
const records = ref<MaintenanceRecord[]>([])
const days = ref(7)
const scope = ref<"open" | "all">("open")
const page = ref(1)
const lastPage = ref(1)
const loading = ref(true)
const loadError = ref("")

const overdueCount = computed(() => due.value.filter(s => s.overdue).length)
const openRecordsCount = computed(() => records.value.filter(r => !r.closed_at).length)
const totalMaintenanceCost = computed(() => records.value.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0))

onMounted(load)
watch(days, () => void load())
watch(scope, () => {
	if (page.value !== 1) page.value = 1
	else void load()
})
watch(page, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const [schedules, result] = await Promise.all([listDueSchedules(days.value), listMaintenance({ page: page.value, open: scope.value === "open" })])
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
	{ title: t("inventory.schedules.title"), key: "title", minWidth: 200 },
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
	{ title: t("inventory.history.opened"), key: "opened_at", minWidth: 140, render: row => formatDateTime(row.opened_at) },
	{
		title: t("inventory.history.closed"),
		key: "closed_at",
		minWidth: 140,
		render: row =>
			row.closed_at
				? h("span", { class: "text-slate-600 dark:text-slate-400" }, formatDateTime(row.closed_at))
				: h(NTag, { size: "small", round: true, type: "warning" }, () => t("inventory.maintenance.open"))
	},
	{
		title: t("inventory.maintenance.cost"),
		key: "cost",
		minWidth: 110,
		align: "end",
		render: row => h("span", { class: "add-numeric font-semibold" }, money(row.cost, row.currency))
	},
	viewActionColumn<MaintenanceRecord>(row => openAsset(row.asset_id), t("inventory.common.view"))
])
</script>
