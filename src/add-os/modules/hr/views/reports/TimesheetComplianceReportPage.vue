<!-- src/add-os/modules/hr/views/reports/TimesheetComplianceReportPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrTimesheetCompliance')" :description="t('hrReports.compliance.description')">
			<template #actions>
				<CsvButton :download />
			</template>
		</HrPageHeader>

		<HrToolbar>
			<WeekPicker v-model:week="week" />
			<n-select v-model:value="status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card size="small">
			<StatusTiles :items="tiles" :columns="4" />
		</n-card>

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" size="small" :scroll-x="560">
				<template #empty>
					<span class="text-secondary">{{ t("hrReports.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Tone } from "@/add-os/modules/dashboard/config/tones"
import type { StatusTile } from "@/add-os/modules/dashboard/types"
import type { ComplianceStatus, TimesheetComplianceReport } from "@/add-os/modules/hr/types/reports"
import { NAlert, NCard, NDataTable, NSelect, NTag } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import StatusTiles from "@/add-os/modules/dashboard/components/stats/StatusTiles.vue"
import CsvButton from "@/add-os/modules/hr/components/reports/CsvButton.vue"
import TimesheetStatusTag from "@/add-os/modules/hr/components/timesheets/TimesheetStatusTag.vue"
import WeekPicker from "@/add-os/modules/hr/components/timesheets/WeekPicker.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { hoursLabel, weekStartOf } from "@/add-os/modules/hr/utils/timesheets"
import { downloadTimesheetCompliance, getTimesheetCompliance } from "@/add-os/services/hr/reports"
import Icon from "@/components/common/Icon.vue"

/**
 * Timesheet compliance for a week: everyone employed during it with their
 * timesheet's status — or none at all — and its hours. This week to start
 * with; "missing" is who still owes one.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const thisWeek = weekStartOf(todayIso())
const STATUSES: ComplianceStatus[] = ["missing", "draft", "submitted", "rejected", "approved"]
const TONE: Record<ComplianceStatus, Tone> = { missing: "danger", draft: "neutral", submitted: "warning", rejected: "danger", approved: "success" }

const report = ref<TimesheetComplianceReport | null>(null)
const loading = ref(false)
const loadError = ref("")
const status = ref<ComplianceStatus | null>(null)

const { filters, applied } = useRouteFilters({ week: "string" }, () => void load())

/** Always one week: the one chosen, else this one. */
const week = computed({
	get: () => filters.value.week ?? thisWeek,
	set: (value: string | null) => (filters.value.week = value)
})

const weekStart = () => applied.value.week ?? thisWeek

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		report.value = await getTimesheetCompliance(weekStart())
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

const download = () => downloadTimesheetCompliance(weekStart())

const label = (s: ComplianceStatus) => (s === "missing" ? t("hrReports.compliance.missing") : t(`hrTimesheets.status.${s}`))
const statusOptions = computed<SelectOption[]>(() => STATUSES.map(s => ({ label: label(s), value: s })))

const tiles = computed<StatusTile[]>(() =>
	STATUSES.map(s => ({ key: s, label: label(s), count: report.value?.summary[s] ?? 0, icon: s === "missing" ? "carbon:warning-alt" : "carbon:time", tone: TONE[s] }))
)

const rows = computed(() => (report.value?.rows ?? []).filter(r => !status.value || r.status === status.value))

const columns = computed<DataTableColumns<TimesheetComplianceReport["rows"][number]>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row.employee) },
	{
		title: t("hr.common.status"),
		key: "status",
		minWidth: 140,
		render: row =>
			row.status === "missing"
				? h(NTag, { type: "error", size: "small", round: true, bordered: true }, { icon: () => h(Icon, { name: "carbon:warning-alt", size: 14 }), default: () => label("missing") })
				: h(TimesheetStatusTag, { status: row.status })
	},
	{ title: t("hrTimesheets.totalHours"), key: "total_hours", minWidth: 100, render: row => h("span", { class: "add-numeric", dir: "ltr" }, hoursLabel(t, row.total_hours)) }
])
</script>
