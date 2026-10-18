<!-- src/add-os/modules/hr/views/leave/LeaveRequestsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrLeaveRequests") }}</h1>
			<p class="max-w-3xl">{{ t("hrLeave.requests.description") }}</p>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<div class="flex flex-wrap items-center gap-3">
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
			<n-select v-model:value="filters.leave_type_id" :options="typeOptions" :placeholder="t('hrLeave.request.type')" clearable class="max-w-xs" />
			<n-select
				v-if="mayFindEmployees"
				v-model:value="filters.employee_id"
				:options="employeeOptions"
				:loading="searching"
				:placeholder="t('hrApprovals.requests.employeeFilter')"
				filterable
				remote
				clearable
				class="max-w-xs"
				@search="searchEmployees"
			/>
			<n-date-picker
				:formatted-value="range"
				value-format="yyyy-MM-dd"
				type="daterange"
				clearable
				class="max-w-sm"
				@update:formatted-value="onRange"
			/>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="900">
				<template #empty>
					<span class="text-secondary">{{ t("hrLeave.requests.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<LeaveRequestDetailDrawer v-model:show="detailVisible" :request-id="openId" :load="getLeaveRequest" :cancel="mayManage ? cancelLeaveRequest : undefined" @changed="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { LeaveRequest, LeaveRequestStatus, LeaveType } from "@/add-os/modules/hr/types/leave"
import { NAlert, NCard, NDataTable, NDatePicker, NPagination, NSelect } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageLeave, canViewEmployees } from "@/add-os/config/permissions"
import ApprovalStatusTag from "@/add-os/modules/hr/components/approvals/ApprovalStatusTag.vue"
import LeaveRequestDetailDrawer from "@/add-os/modules/hr/components/leave/LeaveRequestDetailDrawer.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { LEAVE_REQUEST_STATUSES } from "@/add-os/modules/hr/types/leave"
import { leaveAmount, leavePeriod } from "@/add-os/modules/hr/utils/leave"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listEmployees } from "@/add-os/services/hr/core"
import { cancelLeaveRequest, getLeaveRequest, listLeaveRequests, listLeaveTypes } from "@/add-os/services/hr/leave"

/**
 * Every leave request, newest first, filtered on the server by status,
 * type, employee and dates (any request overlapping the range). Approving
 * is the approval flow's work; here HR reads and, with hr.leave.manage,
 * cancels.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const mayManage = canManageLeave()
const mayFindEmployees = canViewEmployees()

const rows = ref<LeaveRequest[]>([])
const loading = ref(true)
const loadError = ref(false)
const lastPage = ref(1)
const types = ref<LeaveType[]>([])

const { filters, applied, page } = useRouteFilters(
	{ status: "string", leave_type_id: "number", employee_id: "number", from: "string", to: "string" },
	() => void load()
)

async function load() {
	loading.value = true
	loadError.value = false
	try {
		const a = applied.value
		const result = await listLeaveRequests({
			page: page.value,
			status: a.status as LeaveRequestStatus | null,
			leave_type_id: a.leave_type_id,
			employee_id: a.employee_id,
			from: a.from,
			to: a.to
		})
		rows.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	try {
		types.value = await listLeaveTypes()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

const range = computed<[string, string] | null>(() => (filters.value.from && filters.value.to ? [filters.value.from, filters.value.to] : null))
function onRange(value: [string, string] | null) {
	filters.value.from = value?.[0] ?? null
	filters.value.to = value?.[1] ?? null
}

const statusOptions = computed<SelectOption[]>(() => LEAVE_REQUEST_STATUSES.map(s => ({ label: t(`hrApprovals.status.${s}`), value: s })))
const typeOptions = computed<SelectOption[]>(() => types.value.map(type => ({ label: translated(type.name), value: type.id })))

const employeeOptions = ref<SelectOption[]>([])
const searching = ref(false)
async function searchEmployees(term: string) {
	if (!term.trim()) return
	searching.value = true
	try {
		const result = await listEmployees({ q: term.trim() })
		employeeOptions.value = result.data.map(e => ({ label: `${translated(e.name)} · ${e.employee_number}`, value: e.id }))
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		searching.value = false
	}
}

const detailVisible = ref(false)
const openId = ref<number | null>(null)
function rowProps(row: LeaveRequest) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			openId.value = row.id
			detailVisible.value = true
		}
	}
}

const columns = computed<DataTableColumns<LeaveRequest>>(() => [
	{
		title: t("hr.employees.columns.employee"),
		key: "employee",
		minWidth: 200,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5 py-1" }, [
				h("span", { class: "font-semibold text-sm" }, translated(row.employee.name)),
				h("span", { class: "text-xs text-secondary font-mono", dir: "ltr" }, row.employee.employee_number)
			])
	},
	{ title: t("hrLeave.request.type"), key: "leave_type", minWidth: 130, render: row => translated(row.leave_type.name) },
	{ title: t("hrLeave.request.dates"), key: "starts_on", minWidth: 200, render: row => leavePeriod(t, row) },
	{ title: t("hrLeave.detail.amount"), key: "amount", minWidth: 100, className: "add-numeric", render: row => leaveAmount(t, row.amount, row.leave_type.unit) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(ApprovalStatusTag, { status: row.status }) }
])
</script>
