<!-- src/add-os/modules/hr/views/timesheets/TimeByCostCenterPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrTimeByCostCenter')" :description="t('hrTimesheets.report.description')">
			<template #actions>
				<n-button :loading="downloading" :disabled="!rangeValid" @click="download">
					<template #icon><Icon name="carbon:download" :size="16" /></template>
					{{ t("hrTimesheets.report.download") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-date-picker :formatted-value="range" value-format="yyyy-MM-dd" type="daterange" :clearable="false" class="max-w-sm" @update:formatted-value="onRange" />
			<n-select v-model:value="filters.cost_center_id" :options="centerOptions" :placeholder="t('hrTimesheets.costCenter')" clearable filterable class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="!rangeValid" type="warning" :title="t('hrTimesheets.report.rangeTooLong')" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<HrStatCard :label="t('hrTimesheets.report.totalHours')" :value="hoursLabel(t, totalHours, true)" icon="carbon:time" :loading />
			<HrStatCard :label="t('hrTimesheets.report.centers')" :value="formatNumber(totals.length)" icon="carbon:folders" :loading />
			<HrStatCard :label="t('hrTimesheets.report.employees')" :value="formatNumber(employeeCount)" icon="carbon:user-multiple" :loading />
		</div>

		<HrPanel :title="t('hrTimesheets.report.byCenter')" icon="carbon:chart-bar" flush class="add-ledger-table">
			<n-data-table :columns="totalColumns" :data="totals" :loading :bordered="false" size="small" :scroll-x="520">
				<template #empty>
					<span class="text-secondary">{{ t("hrTimesheets.report.empty") }}</span>
				</template>
			</n-data-table>
		</HrPanel>

		<HrPanel :title="t('hrTimesheets.report.byEmployee')" :subtitle="t('hrTimesheets.report.byEmployeeHint')" icon="carbon:user" flush class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" size="small" :scroll-x="640">
				<template #empty>
					<span class="text-secondary">{{ t("hrTimesheets.report.empty") }}</span>
				</template>
			</n-data-table>
		</HrPanel>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { CostCenter, TimeByCostCenterRow } from "@/add-os/modules/hr/types/timesheets"
import { NAlert, NButton, NDataTable, NDatePicker, NSelect, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { addDays } from "@/add-os/modules/hr/utils/time"
import { centerName, hoursLabel, hoursValue } from "@/add-os/modules/hr/utils/timesheets"
import { ApiError } from "@/add-os/services/api"
import { downloadTimeByCostCenter, listCostCenters, timeByCostCenter } from "@/add-os/services/hr/timesheets"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Staff time by cost center over a range of a year at most — approved
 * timesheets only, each employee's hours split by their cost allocation —
 * the donor and project time report. The CSV comes from the server, in the
 * reader's language, and every download is audited there.
 */
defineProps<{ titleKey?: string }>()

/** The server takes a range of 366 days at most. */
const MAX_RANGE_DAYS = 366

const { t } = useI18n()
const message = useMessage()
const monthStart = `${todayIso().slice(0, 8)}01`

const rows = ref<TimeByCostCenterRow[]>([])
const loading = ref(true)
const loadError = ref("")
const downloading = ref(false)
const centers = ref<CostCenter[]>([])

const { filters, applied } = useRouteFilters({ from: "string", to: "string", cost_center_id: "number" }, () => void load(), {
	defaults: { from: monthStart, to: todayIso() }
})

const range = computed<[string, string]>(() => [filters.value.from ?? monthStart, filters.value.to ?? todayIso()])
function onRange(value: [string, string] | null) {
	if (!value) return
	filters.value.from = value[0]
	filters.value.to = value[1]
}
const rangeValid = computed(() => range.value[1] <= addDays(range.value[0], MAX_RANGE_DAYS))

function query() {
	const a = applied.value
	return { from: a.from ?? monthStart, to: a.to ?? todayIso(), cost_center_id: a.cost_center_id }
}

async function load() {
	if (!rangeValid.value) {
		rows.value = []
		loading.value = false
		return
	}
	loading.value = true
	loadError.value = ""
	try {
		rows.value = await timeByCostCenter(query())
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	try {
		centers.value = await listCostCenters()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

async function download() {
	downloading.value = true
	try {
		await downloadTimeByCostCenter(query())
	} catch (e) {
		message.error(apiErrorMessage(e, t("hrTimesheets.report.downloadError")))
	} finally {
		downloading.value = false
	}
}

const centerOptions = computed<SelectOption[]>(() => centers.value.map(c => ({ label: centerName(c), value: c.id })))

/** One line per cost center, in the server's order (by code). */
const totals = computed(() => {
	const byCenter = new Map<number, { center: TimeByCostCenterRow["cost_center"]; hours: number; employees: number }>()
	for (const row of rows.value) {
		const entry = byCenter.get(row.cost_center.id) ?? { center: row.cost_center, hours: 0, employees: 0 }
		entry.hours += hoursValue(row.hours)
		entry.employees += 1
		byCenter.set(row.cost_center.id, entry)
	}
	return [...byCenter.values()]
})
const totalHours = computed(() => totals.value.reduce((sum, c) => sum + c.hours, 0))
const employeeCount = computed(() => new Set(rows.value.map(r => r.employee.id)).size)

function centerCell(center: TimeByCostCenterRow["cost_center"]) {
	return h("span", { class: "font-semibold text-sm" }, centerName(center))
}

const totalColumns = computed<DataTableColumns<(typeof totals.value)[number]>>(() => [
	{ title: t("hrTimesheets.costCenter"), key: "center", minWidth: 220, render: row => centerCell(row.center) },
	{ title: t("hrTimesheets.report.employees"), key: "employees", minWidth: 100, render: row => h("span", { class: "add-numeric" }, formatNumber(row.employees)) },
	{ title: t("hrTimesheets.hoursColumn"), key: "hours", minWidth: 100, render: row => h("span", { class: "add-numeric font-semibold" }, hoursLabel(t, row.hours, true)) }
])

const columns = computed<DataTableColumns<TimeByCostCenterRow>>(() => [
	{ title: t("hrTimesheets.costCenter"), key: "cost_center", minWidth: 200, render: row => centerCell(row.cost_center) },
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell({ name: row.employee.name ?? { ar: "" }, employee_number: row.employee.employee_number }) },
	{ title: t("hrTimesheets.hoursColumn"), key: "hours", minWidth: 100, render: row => h("span", { class: "add-numeric" }, hoursLabel(t, row.hours, true)) }
])
</script>
