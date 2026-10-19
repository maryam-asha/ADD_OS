<!-- src/add-os/modules/hr/views/timesheets/TimesheetsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrTimesheets')" :description="t('hrTimesheets.list.description')" />

		<n-tabs :value="view" type="line" @update:value="(v: string) => (filters.view = v)">
			<n-tab-pane name="list" :tab="t('hrTimesheets.list.tab')" />
			<n-tab-pane name="compliance" :tab="t('hrTimesheets.compliance.tab')" />
		</n-tabs>

		<template v-if="view === 'list'">
			<HrToolbar>
				<WeekPicker v-model:week="filters.week" clearable />
				<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
				<EmployeeSelect v-if="mayFindEmployees" v-model:value="filters.employee_id" include-former :placeholder="t('hrApprovals.requests.employeeFilter')" class="max-w-xs" />
			</HrToolbar>

			<n-alert v-if="loadError" type="error" :title="loadError" />

			<n-card class="add-ledger-table">
				<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="760">
					<template #empty>
						<span class="text-secondary">{{ t("hrTimesheets.list.empty") }}</span>
					</template>
				</n-data-table>
				<div v-if="lastPage > 1" class="flex justify-center pt-4">
					<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
				</div>
			</n-card>
		</template>

		<template v-else>
			<HrToolbar>
				<WeekPicker v-model:week="complianceWeek" />
				<n-select v-if="unitOptions.length" v-model:value="filters.org_unit_id" :options="unitOptions" :placeholder="t('hr.employees.unitFilter')" clearable filterable class="max-w-xs" />
			</HrToolbar>

			<n-alert v-if="loadError" type="error" :title="loadError" />

			<HrPanel :title="t('hrTimesheets.compliance.title')" :subtitle="t('hrTimesheets.compliance.subtitle')" icon="carbon:task-view" flush class="add-ledger-table">
				<template v-if="!loading" #extra>
					<n-tag :type="missing.length ? 'warning' : 'success'" size="small" round bordered>
						{{ t("hrTimesheets.compliance.missing", { n: formatNumber(missing.length) }, missing.length) }}
					</n-tag>
				</template>
				<n-data-table :columns="missingColumns" :data="missing" :loading :bordered="false" size="small" :scroll-x="520">
					<template #empty>
						<span class="text-secondary">{{ t("hrTimesheets.compliance.empty") }}</span>
					</template>
				</n-data-table>
			</HrPanel>
		</template>

		<TimesheetDetailDrawer v-model:show="detailVisible" :timesheet-id="openId" :cost-centers />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { OrgUnit } from "@/add-os/modules/hr/types/hr"
import type { CostCenter, Timesheet, TimesheetCompliance, TimesheetStatus } from "@/add-os/modules/hr/types/timesheets"
import { NAlert, NCard, NDataTable, NPagination, NSelect, NTabPane, NTabs, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canViewEmployees } from "@/add-os/config/permissions"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import TimesheetDetailDrawer from "@/add-os/modules/hr/components/timesheets/TimesheetDetailDrawer.vue"
import TimesheetStatusTag from "@/add-os/modules/hr/components/timesheets/TimesheetStatusTag.vue"
import WeekPicker from "@/add-os/modules/hr/components/timesheets/WeekPicker.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { TIMESHEET_STATUSES } from "@/add-os/modules/hr/types/timesheets"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { hoursLabel, weekStartOf } from "@/add-os/modules/hr/utils/timesheets"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listOrgUnits } from "@/add-os/services/hr/core"
import { listCostCenters, listTimesheets, timesheetCompliance } from "@/add-os/services/hr/timesheets"
import { formatDate, formatDateTime, formatNumber } from "@/add-os/utils/format"

/**
 * Every timesheet, newest week first, filtered on the server by week,
 * status and employee — and who has not handed in a week. Timesheets are
 * decided in the approval inbox; here HR reads them.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const mayFindEmployees = canViewEmployees()
const thisWeek = weekStartOf(todayIso())

const rows = ref<Timesheet[]>([])
const missing = ref<TimesheetCompliance["missing"]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const costCenters = ref<CostCenter[]>([])
const units = ref<OrgUnit[]>([])

const { filters, applied, page } = useRouteFilters(
	{ view: "string", week: "string", status: "string", employee_id: "number", org_unit_id: "number" },
	() => void load(),
	{ defaults: { view: "list" } }
)

const view = computed(() => (filters.value.view === "compliance" ? "compliance" : "list"))

/** Compliance always reads one week: the one chosen, else this one. */
const complianceWeek = computed({
	get: () => filters.value.week ?? thisWeek,
	set: (value: string | null) => (filters.value.week = value)
})

async function load() {
	loading.value = true
	loadError.value = ""
	const a = applied.value
	try {
		if (a.view === "compliance") {
			missing.value = (await timesheetCompliance(a.week ?? thisWeek, a.org_unit_id)).missing
		} else {
			const result = await listTimesheets({ page: page.value, week_start: a.week, status: a.status as TimesheetStatus | null, employee_id: a.employee_id })
			rows.value = result.data
			lastPage.value = result.meta.last_page
		}
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	try {
		;[costCenters.value, units.value] = await Promise.all([listCostCenters(), listOrgUnits()])
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

const statusOptions = computed<SelectOption[]>(() => TIMESHEET_STATUSES.map(s => ({ label: t(`hrTimesheets.status.${s}`), value: s })))
const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))

const detailVisible = ref(false)
const openId = ref<number | null>(null)

function rowProps(row: Timesheet) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			openId.value = row.id
			detailVisible.value = true
		}
	}
}

const columns = computed<DataTableColumns<Timesheet>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row.employee) },
	{ title: t("hrTimesheets.week"), key: "week_start", minWidth: 190, render: row => `${formatDate(row.week_start)} – ${formatDate(row.week_end)}` },
	{ title: t("hrTimesheets.totalHours"), key: "total_hours", minWidth: 100, render: row => h("span", { class: "add-numeric" }, hoursLabel(t, row.total_hours, true)) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(TimesheetStatusTag, { status: row.status }) },
	{ title: t("hrTimesheets.detail.submittedAt"), key: "submitted_at", minWidth: 150, render: row => (row.submitted_at ? formatDateTime(row.submitted_at) : EMPTY) }
])

const missingColumns = computed<DataTableColumns<TimesheetCompliance["missing"][number]>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row) },
	{
		title: t("hr.common.status"),
		key: "status",
		minWidth: 140,
		render: row => (row.status ? h(TimesheetStatusTag, { status: row.status }) : h("span", { class: "text-secondary" }, t("hrTimesheets.compliance.notStarted")))
	}
])
</script>
