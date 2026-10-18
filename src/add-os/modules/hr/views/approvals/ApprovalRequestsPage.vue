<!-- src/add-os/modules/hr/views/approvals/ApprovalRequestsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrApprovalRequests')" :description="t('hrApprovals.requests.description')" />

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<HrToolbar>
			<n-select v-model:value="filters.status" :options="statusOptions" class="max-w-xs" :aria-label="t('hr.common.status')" />
			<n-select v-model:value="filters.request_type" :options="typeOptions" :placeholder="t('hrApprovals.columns.type')" clearable class="max-w-xs" />
			<EmployeeSelect v-if="mayFindEmployees" v-model:value="filters.employee_id" include-former :placeholder="t('hrApprovals.requests.employeeFilter')" class="max-w-xs" />
		</HrToolbar>

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="900">
				<template #empty>
					<span class="text-secondary">{{ t("hrApprovals.requests.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<ApprovalDetailDrawer
			v-model:show="detailVisible"
			:request-id="openId"
			:load="getApprovalRequest"
			:approve="overrideApprove"
			:reject="overrideReject"
			override
			@decided="load"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ApprovalRequest, ApprovalStatus } from "@/add-os/modules/hr/types/approvals"
import { NAlert, NCard, NDataTable, NPagination, NSelect } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canViewEmployees } from "@/add-os/config/permissions"
import ApprovalDetailDrawer from "@/add-os/modules/hr/components/approvals/ApprovalDetailDrawer.vue"
import ApprovalStatusTag from "@/add-os/modules/hr/components/approvals/ApprovalStatusTag.vue"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { APPROVAL_STATUSES, KNOWN_REQUEST_TYPES } from "@/add-os/modules/hr/types/approvals"
import { requestTypeLabel, summaryHeadline } from "@/add-os/modules/hr/utils/approvalSummary"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { getApprovalRequest, listApprovalRequests, overrideApprove, overrideReject } from "@/add-os/services/hr/approvals"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"

/**
 * Every approval request, whoever it waits for — opening on the pending
 * ones — and deciding one for an approver who is away. Such a decision is
 * recorded as an override; the server refuses it on a request of one's own.
 */
defineProps<{ titleKey?: string }>()

/** "all" sends no status filter: the queue opens on pending, and every status is one choice away. */
const ALL = "all"

const { t } = useI18n()
const mayFindEmployees = canViewEmployees()

const rows = ref<ApprovalRequest[]>([])
const loading = ref(true)
const loadError = ref(false)
const lastPage = ref(1)

const { filters, applied, page } = useRouteFilters({ status: "string", request_type: "string", employee_id: "number" }, () => void load(), {
	defaults: { status: "pending" }
})

async function load() {
	loading.value = true
	loadError.value = false
	try {
		const status = applied.value.status === ALL ? null : (applied.value.status as ApprovalStatus | null)
		const result = await listApprovalRequests({ page: page.value, status, request_type: applied.value.request_type, employee_id: applied.value.employee_id })
		rows.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

const statusOptions = computed<SelectOption[]>(() => [
	...APPROVAL_STATUSES.map(status => ({ label: t(`hrApprovals.status.${status}`), value: status })),
	{ label: t("hrApprovals.requests.allStatuses"), value: ALL }
])
const typeOptions = computed<SelectOption[]>(() => KNOWN_REQUEST_TYPES.map(type => ({ label: requestTypeLabel(t, type), value: type })))

const detailVisible = ref(false)
const openId = ref<number | null>(null)

function rowProps(row: ApprovalRequest) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			openId.value = row.id
			detailVisible.value = true
		}
	}
}

/** Who the request waits for now. */
function waitingFor(row: ApprovalRequest): string {
	const step = row.steps.find(s => s.status === "pending")
	if (!step) return EMPTY
	const who = step.approver_employee ? translated(step.approver_employee.name) : t(`hrApprovals.approverType.${step.approver_type}`)
	return `${t("hrApprovals.step", { n: formatNumber(step.sort) })} · ${who}`
}

const columns = computed<DataTableColumns<ApprovalRequest>>(() => [
	{ title: t("hrApprovals.columns.type"), key: "request_type", minWidth: 130, render: row => requestTypeLabel(t, row.request_type) },
	{
		title: t("hr.employees.columns.employee"),
		key: "employee",
		minWidth: 200,
		render: row => employeeCell(row.employee)
	},
	{ title: t("hrApprovals.columns.summary"), key: "subject", minWidth: 200, ellipsis: { tooltip: true }, render: row => summaryHeadline(t, row.request_type, row.subject) },
	{ title: t("hrApprovals.columns.waitingFor"), key: "waiting", minWidth: 180, render: waitingFor },
	{ title: t("hrApprovals.columns.submitted"), key: "created_at", minWidth: 150, render: row => (row.created_at ? formatDateTime(row.created_at) : EMPTY) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(ApprovalStatusTag, { status: row.status }) }
])
</script>
