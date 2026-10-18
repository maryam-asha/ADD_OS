<!-- src/add-os/modules/hr/views/time/TimeRequestsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrTimeRequests')" :description="t('hrAttendance.requests.description')" />

		<HrToolbar>
			<n-date-picker :formatted-value="range" value-format="yyyy-MM-dd" type="daterange" :clearable="false" class="max-w-sm" @update:formatted-value="onRange" />
			<n-select v-if="unitOptions.length" v-model:value="filters.org_unit_id" :options="unitOptions" :placeholder="t('hr.employees.unitFilter')" clearable filterable class="max-w-xs" />
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
		</HrToolbar>

		<n-tabs :value="filters.view ?? 'entries'" type="line" @update:value="(v: string) => (filters.view = v)">
			<n-tab-pane name="entries" :tab="t('hrAttendance.requests.entries')" />
			<n-tab-pane name="overtime" :tab="t('hrAttendance.requests.overtime')" />
		</n-tabs>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table v-if="filters.view === 'overtime'" :columns="overtimeColumns" :data="overtime" :loading :bordered="false" size="small" :scroll-x="820">
				<template #empty>
					<span class="text-secondary">{{ t("hrAttendance.requests.emptyOvertime") }}</span>
				</template>
			</n-data-table>
			<n-data-table v-else :columns="entryColumns" :data="entries" :loading :bordered="false" size="small" :scroll-x="820">
				<template #empty>
					<span class="text-secondary">{{ t("hrAttendance.requests.emptyEntries") }}</span>
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
import type { OrgUnit } from "@/add-os/modules/hr/types/hr"
import type { AttendanceEntry, OvertimeRequest } from "@/add-os/modules/hr/types/time"
import { NAlert, NCard, NDataTable, NDatePicker, NPagination, NSelect, NTabPane, NTabs } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import ApprovalStatusTag from "@/add-os/modules/hr/components/approvals/ApprovalStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { minutesLabel, orgClock } from "@/add-os/modules/hr/utils/time"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listOrgUnits } from "@/add-os/services/hr/core"
import { listAttendanceEntries, listOvertimeRequests } from "@/add-os/services/hr/time"
import { formatDate } from "@/add-os/utils/format"

/**
 * Times employees entered by hand for a missed punch, and their overtime
 * requests. Both are decided through the approval flow (the inbox, or the
 * approval requests page); this page is where HR reads them.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const monthStart = `${todayIso().slice(0, 8)}01`

const entries = ref<AttendanceEntry[]>([])
const overtime = ref<OvertimeRequest[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const units = ref<OrgUnit[]>([])

const { filters, applied, page } = useRouteFilters({ view: "string", from: "string", to: "string", org_unit_id: "number", status: "string" }, () => void load(), {
	defaults: { view: "entries", from: monthStart, to: todayIso() }
})

async function load() {
	loading.value = true
	loadError.value = ""
	const a = applied.value
	const range = { from: a.from ?? monthStart, to: a.to ?? todayIso(), org_unit_id: a.org_unit_id, status: a.status, page: page.value }
	try {
		if (a.view === "overtime") {
			const result = await listOvertimeRequests(range)
			overtime.value = result.data
			lastPage.value = result.meta.last_page
		} else {
			const result = await listAttendanceEntries(range)
			entries.value = result.data
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
		units.value = await listOrgUnits()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

const range = computed<[string, string]>(() => [filters.value.from ?? monthStart, filters.value.to ?? todayIso()])
function onRange(value: [string, string] | null) {
	if (!value) return
	filters.value.from = value[0]
	filters.value.to = value[1]
}

const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))
const statusOptions = computed<SelectOption[]>(() => ["pending", "approved", "rejected", "cancelled"].map(s => ({ label: t(`hrApprovals.status.${s}`), value: s })))

/** A time entry also has "verified": card scans within the policy's tolerance confirm it, so it needs no approval. */
function entryStatus(row: AttendanceEntry) {
	if (row.status === "verified") return h("span", {}, t("hrAttendance.entryStatus.verified"))
	return h(ApprovalStatusTag, { status: row.status })
}

const entryColumns = computed<DataTableColumns<AttendanceEntry>>(() => [
	{ title: t("hrAttendance.days.date"), key: "work_date", minWidth: 110, render: row => formatDate(row.work_date) },
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 180, render: row => translated(row.employee?.name) || EMPTY },
	{ title: t("hrAttendance.days.firstIn"), key: "check_in_at", minWidth: 90, render: row => orgClock(row.check_in_at) },
	{ title: t("hrAttendance.days.lastOut"), key: "check_out_at", minWidth: 90, render: row => orgClock(row.check_out_at) },
	{ title: t("hrAttendance.exceptions.note"), key: "note", minWidth: 200, ellipsis: { tooltip: true }, render: row => row.note || EMPTY },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: entryStatus }
])

const overtimeColumns = computed<DataTableColumns<OvertimeRequest>>(() => [
	{ title: t("hrAttendance.days.date"), key: "work_date", minWidth: 110, render: row => formatDate(row.work_date) },
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 180, render: row => translated(row.employee?.name) || EMPTY },
	{ title: t("hrApprovals.summary.duration"), key: "minutes", minWidth: 100, render: row => minutesLabel(t, row.minutes) },
	{ title: t("hrApprovals.summary.overtimeKind"), key: "kind", minWidth: 120, render: row => t(`hrApprovals.overtimeKind.${row.kind}`) },
	{ title: t("hrApprovals.summary.reason"), key: "reason", minWidth: 200, ellipsis: { tooltip: true }, render: row => row.reason || EMPTY },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(ApprovalStatusTag, { status: row.status }) }
])
</script>
