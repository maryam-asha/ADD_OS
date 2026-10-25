<!-- src/add-os/modules/inventory/views/MaintenancePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryMaintenance')" :description="t('inventory.maintenance.pageDescription')" />

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card :title="t('inventory.maintenance.due')" size="small" class="add-ledger-table">
			<template #header-extra>
				<n-select v-model:value="days" :options="dayOptions" size="small" class="w-44" />
			</template>
			<n-data-table :columns="dueColumns" :data="due" :loading :bordered="false" :row-props="row => assetRow(row.asset_id)" size="small" :scroll-x="700">
				<template #empty>
					<span class="text-secondary">{{ t("inventory.maintenance.noneDue") }}</span>
				</template>
			</n-data-table>
		</n-card>

		<n-card size="small" class="add-ledger-table">
			<template #header>
				<n-radio-group v-model:value="scope" size="small">
					<n-radio-button value="open">{{ t("inventory.maintenance.openOnes") }}</n-radio-button>
					<n-radio-button value="all">{{ t("inventory.maintenance.all") }}</n-radio-button>
				</n-radio-group>
			</template>
			<n-data-table :columns="recordColumns" :data="records" :loading :bordered="false" :row-props="row => assetRow(row.asset_id)" size="small" :scroll-x="980">
				<template #empty>
					<span class="text-secondary">{{ t("inventory.maintenance.empty") }}</span>
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
import { EMPTY, localized, money } from "@/add-os/modules/inventory/utils/display"
import { listDueSchedules, listMaintenance } from "@/add-os/services/inventory"
import { formatNumber } from "@/add-os/utils/format"
import { formatDate, formatDateTime } from "@/add-os/utils/format/dates"

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

const dayOptions = computed<SelectOption[]>(() => [7, 30, 90].map(n => ({ label: t("inventory.maintenance.withinDays", { n: formatNumber(n) }), value: n })))

function assetRow(assetId: number) {
	return { class: "cursor-pointer", onClick: () => void router.push({ name: "inventory.inventoryAsset", params: { id: assetId } }) }
}

const dueColumns = computed<DataTableColumns<MaintenanceSchedule>>(() => [
	{ title: t("inventory.assets.code"), key: "asset", minWidth: 120, render: row => h("span", { class: "font-mono text-xs", dir: "ltr" }, row.asset?.code ?? `#${row.asset_id}`) },
	{ title: t("inventory.schedules.title"), key: "title", minWidth: 200 },
	{ title: t("inventory.schedules.interval"), key: "interval_months", minWidth: 110, render: row => t("inventory.assets.months", { n: row.interval_months }) },
	{
		title: t("inventory.schedules.nextDue"),
		key: "next_due_on",
		minWidth: 150,
		render: row => h("span", { class: "inline-flex items-center gap-2" }, [formatDate(row.next_due_on), row.overdue ? h(NTag, { size: "small", round: true, type: "error" }, () => t("inventory.schedules.overdue")) : null])
	}
])

const recordColumns = computed<DataTableColumns<MaintenanceRecord>>(() => [
	{
		title: t("inventory.assets.item"),
		key: "asset",
		minWidth: 220,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "font-semibold" }, row.asset ? localized(row.asset.item.name) : EMPTY),
				h("span", { class: "font-mono text-xs text-secondary", dir: "ltr" }, row.asset?.code ?? `#${row.asset_id}`)
			])
	},
	{ title: t("inventory.maintenance.type"), key: "type", minWidth: 110, render: row => t(`inventory.maintenanceType.${row.type}`) },
	{ title: t("inventory.maintenance.description"), key: "description", minWidth: 220 },
	{ title: t("inventory.maintenance.vendor"), key: "vendor", minWidth: 140, render: row => row.vendor ?? EMPTY },
	{ title: t("inventory.history.opened"), key: "opened_at", minWidth: 150, render: row => formatDateTime(row.opened_at) },
	{
		title: t("inventory.history.closed"),
		key: "closed_at",
		minWidth: 150,
		render: row => (row.closed_at ? formatDateTime(row.closed_at) : h(NTag, { size: "small", round: true, type: "warning" }, () => t("inventory.maintenance.open")))
	},
	{ title: t("inventory.maintenance.cost"), key: "cost", minWidth: 110, render: row => h("span", { class: "add-numeric" }, money(row.cost, row.currency)) }
])
</script>
