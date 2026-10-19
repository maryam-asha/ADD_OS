<template>
	<HrDrawer v-model:show="show" :title="t('hrTimesheets.detail.title')" size="lg">
		<n-alert v-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="loading" text :repeat="6" />
		<div v-else-if="timesheet" class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div v-if="timesheet.employee" class="flex items-center gap-3">
					<EmployeeAvatar :name="timesheet.employee.name" />
					<div class="flex flex-col gap-0.5">
						<span class="font-semibold">{{ translated(timesheet.employee.name) }}</span>
						<span class="font-mono text-xs text-secondary" dir="ltr">{{ timesheet.employee.employee_number }}</span>
					</div>
				</div>
				<TimesheetStatusTag :status="timesheet.status" />
			</div>
			<n-descriptions :column="1" label-placement="left" size="small" bordered>
				<n-descriptions-item :label="t('hrTimesheets.week')">{{ weekLabel(timesheet) }}</n-descriptions-item>
				<n-descriptions-item :label="t('hrTimesheets.totalHours')">
					<span class="add-numeric">{{ hoursLabel(t, timesheet.total_hours, true) }}</span>
				</n-descriptions-item>
				<n-descriptions-item v-if="timesheet.submitted_at" :label="t('hrTimesheets.detail.submittedAt')">{{ formatDateTime(timesheet.submitted_at) }}</n-descriptions-item>
			</n-descriptions>

			<HrPanel :title="t('hrTimesheets.detail.entries')" icon="carbon:task" flush class="add-ledger-table">
				<n-data-table :columns :data="timesheet.entries ?? []" :bordered="false" size="small" :scroll-x="520">
					<template #empty>
						<span class="text-secondary">{{ t("hrTimesheets.detail.noEntries") }}</span>
					</template>
				</n-data-table>
			</HrPanel>

			<HrPanel v-if="reconciliation" :title="t('hrTimesheets.reconciliation.title')" icon="carbon:compare">
				<ReconciliationTable :reconciliation />
			</HrPanel>
			<p v-if="timesheet.approval_request_id" class="text-sm text-secondary">{{ t("hrTimesheets.detail.decidedWhere") }}</p>
		</div>
	</HrDrawer>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { CostCenter, Reconciliation, Timesheet, TimesheetEntry } from "@/add-os/modules/hr/types/timesheets"
import { NAlert, NDataTable, NDescriptions, NDescriptionsItem, NSkeleton } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrDrawer from "@/add-os/modules/hr/components/HrDrawer.vue"
import ReconciliationTable from "@/add-os/modules/hr/components/timesheets/ReconciliationTable.vue"
import TimesheetStatusTag from "@/add-os/modules/hr/components/timesheets/TimesheetStatusTag.vue"
import EmployeeAvatar from "@/add-os/modules/hr/components/ui/EmployeeAvatar.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { costCenterLabel, hoursLabel } from "@/add-os/modules/hr/utils/timesheets"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { getTimesheet } from "@/add-os/services/hr/timesheets"
import { formatDate, formatDateTime } from "@/add-os/utils/format"

/**
 * One timesheet as HR reads it: its lines and how they compare with
 * attendance. It is decided in the approval inbox, not here.
 */
const props = defineProps<{ timesheetId: number | null; costCenters: CostCenter[] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()

const timesheet = ref<Timesheet | null>(null)
const reconciliation = ref<Reconciliation | null>(null)
const loading = ref(false)
const loadError = ref("")

watch(
	() => [show.value, props.timesheetId] as const,
	async ([open, id]) => {
		if (!open || id === null) return
		loading.value = true
		loadError.value = ""
		timesheet.value = null
		try {
			const result = await getTimesheet(id)
			timesheet.value = result.timesheet
			reconciliation.value = result.reconciliation
		} catch (e) {
			loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
		} finally {
			loading.value = false
		}
	},
	{ immediate: true }
)

function weekLabel(row: Timesheet): string {
	return `${formatDate(row.week_start)} – ${formatDate(row.week_end)}`
}

const columns = computed<DataTableColumns<TimesheetEntry>>(() => [
	{ title: t("hrAttendance.days.date"), key: "work_date", minWidth: 110, render: row => formatDate(row.work_date) },
	{ title: t("hrTimesheets.costCenter"), key: "cost_center_id", minWidth: 180, render: row => costCenterLabel(props.costCenters, row.cost_center_id) },
	{ title: t("hrTimesheets.hoursColumn"), key: "hours", minWidth: 80, render: row => h("span", { class: "add-numeric" }, hoursLabel(t, row.hours)) },
	{ title: t("hrAttendance.exceptions.note"), key: "note", minWidth: 160, ellipsis: { tooltip: true }, render: row => row.note || EMPTY }
])
</script>
