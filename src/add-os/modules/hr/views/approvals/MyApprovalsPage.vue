<!-- src/add-os/modules/hr/views/approvals/MyApprovalsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrMyApprovals") }}</h1>
				<p>{{ t("hrApprovals.inbox.description") }}</p>
			</div>
			<n-button v-if="tab === 'delegations'" type="primary" @click="delegationVisible = true">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("hrApprovals.delegations.add") }}
			</n-button>
		</div>

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="inbox">
				<template #tab>
					<span class="inline-flex items-center gap-2">
						{{ t("hrApprovals.inbox.tab") }}
						<n-badge v-if="total > 0" :value="total" :max="99" type="warning" />
					</span>
				</template>

				<n-alert v-if="inboxError" type="error" :title="t('hr.common.loadError')" class="mb-4" />
				<n-card class="add-ledger-table">
					<n-data-table :columns :data="rows" :loading="inboxLoading" :bordered="false" :row-props size="small" :scroll-x="820">
						<template #empty>
							<span class="text-secondary">{{ t("hrApprovals.inbox.empty") }}</span>
						</template>
					</n-data-table>
					<div v-if="lastPage > 1" class="flex justify-center pt-4">
						<n-pagination v-model:page="page" :page-count="lastPage" :disabled="inboxLoading" />
					</div>
				</n-card>
			</n-tab-pane>

			<n-tab-pane name="delegations" :tab="t('hrApprovals.delegations.tab')" display-directive="show:lazy">
				<n-alert v-if="delegationsError" type="error" :title="t('hr.common.loadError')" class="mb-4" />
				<n-card class="add-ledger-table">
					<n-data-table :columns="delegationColumns" :data="delegations" :loading="delegationsLoading" :bordered="false" size="small" :scroll-x="640">
						<template #empty>
							<span class="text-secondary">{{ t("hrApprovals.delegations.empty") }}</span>
						</template>
					</n-data-table>
				</n-card>
			</n-tab-pane>
		</n-tabs>

		<ApprovalDetailDrawer
			v-model:show="detailVisible"
			:request-id="openId"
			:load="getMyApproval"
			:approve="approveMyApproval"
			:reject="rejectMyApproval"
			@decided="loadInbox"
		/>
		<DelegationModal v-model:show="delegationVisible" @saved="loadDelegations" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { ApprovalRequest, Delegation } from "@/add-os/modules/hr/types/approvals"
import { NAlert, NBadge, NButton, NCard, NDataTable, NPagination, NTabPane, NTabs, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import ApprovalDetailDrawer from "@/add-os/modules/hr/components/approvals/ApprovalDetailDrawer.vue"
import DelegationModal from "@/add-os/modules/hr/components/approvals/DelegationModal.vue"
import { requestTypeLabel, summaryHeadline } from "@/add-os/modules/hr/utils/approvalSummary"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { approveMyApproval, deleteDelegation, getMyApproval, listMyApprovals, listMyDelegations, rejectMyApproval } from "@/add-os/services/hr/approvals"
import { formatDate, formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * What waits for the signed-in employee — as the approver, as someone's
 * delegate, or as the holder of an ability a step asks for — oldest first;
 * and the approvals they have handed to a colleague. Who sees what is the
 * server's call, per request: this page shows what it returns.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const tab = ref<"inbox" | "delegations">("inbox")

// ── Inbox ───────────────────────────────────────────────────────────────────
const rows = ref<ApprovalRequest[]>([])
const inboxLoading = ref(true)
const inboxError = ref(false)
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)

async function loadInbox() {
	inboxLoading.value = true
	inboxError.value = false
	try {
		const result = await listMyApprovals(page.value)
		rows.value = result.data
		lastPage.value = result.meta.last_page
		total.value = result.meta.total
		// The last item of the last page decided: step back a page.
		if (!result.data.length && page.value > 1) page.value = Math.max(1, result.meta.last_page)
	} catch (e) {
		inboxError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		inboxLoading.value = false
	}
}

onMounted(loadInbox)
watch(page, loadInbox)

const detailVisible = ref(false)
const openId = ref<number | null>(null)

function open(row: ApprovalRequest) {
	openId.value = row.id
	detailVisible.value = true
}

function rowProps(row: ApprovalRequest) {
	return { class: "cursor-pointer", onClick: () => open(row) }
}

function pendingDue(row: ApprovalRequest): string {
	const step = row.steps.find(s => s.status === "pending")
	return step?.due_at ? formatDateTime(step.due_at) : EMPTY
}

const columns = computed<DataTableColumns<ApprovalRequest>>(() => [
	{ title: t("hrApprovals.columns.type"), key: "request_type", minWidth: 130, render: row => requestTypeLabel(t, row.request_type) },
	{
		title: t("hr.employees.columns.employee"),
		key: "employee",
		minWidth: 200,
		render: row => employeeCell(row.employee)
	},
	{ title: t("hrApprovals.columns.summary"), key: "subject", minWidth: 220, ellipsis: { tooltip: true }, render: row => summaryHeadline(t, row.request_type, row.subject) },
	{ title: t("hrApprovals.columns.submitted"), key: "created_at", minWidth: 150, render: row => (row.created_at ? formatDateTime(row.created_at) : EMPTY) },
	{ title: t("hrApprovals.columns.due"), key: "due", minWidth: 150, render: pendingDue }
])

// ── Delegations ─────────────────────────────────────────────────────────────
const delegations = ref<Delegation[]>([])
const delegationsLoading = ref(false)
const delegationsError = ref(false)
const delegationVisible = ref(false)
let delegationsLoaded = false

async function loadDelegations() {
	delegationsLoading.value = true
	delegationsError.value = false
	try {
		delegations.value = await listMyDelegations()
		delegationsLoaded = true
	} catch (e) {
		delegationsError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		delegationsLoading.value = false
	}
}

watch(tab, current => {
	if (current === "delegations" && !delegationsLoaded) void loadDelegations()
})

function confirmRemove(row: Delegation) {
	dialog.warning({
		title: t("hrApprovals.delegations.remove"),
		content: t("hrApprovals.delegations.removeConfirm", { name: translated(row.delegate.name) }),
		positiveText: t("hrApprovals.delegations.remove"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteDelegation(row.id)
				message.success(t("hrApprovals.delegations.removed"))
				await loadDelegations()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

const delegationColumns = computed<DataTableColumns<Delegation>>(() => [
	{ title: t("hrApprovals.delegations.delegate"), key: "delegate", minWidth: 180, render: row => translated(row.delegate.name) },
	{ title: t("hrApprovals.delegations.period"), key: "starts_on", minWidth: 200, render: row => `${formatDate(row.starts_on)} – ${formatDate(row.ends_on)}` },
	{
		title: t("hrApprovals.delegations.requestType"),
		key: "request_type",
		minWidth: 140,
		render: row => (row.request_type ? requestTypeLabel(t, row.request_type) : t("hrApprovals.delegations.allTypes"))
	},
	{
		title: t("hr.employees.columns.actions"),
		key: "actions",
		width: 80,
		align: "center",
		render: row =>
			h(
				NButton,
				{ text: true, type: "error", "aria-label": t("hrApprovals.delegations.remove"), title: t("hrApprovals.delegations.remove"), onClick: () => confirmRemove(row) },
				{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
			)
	}
])
</script>
