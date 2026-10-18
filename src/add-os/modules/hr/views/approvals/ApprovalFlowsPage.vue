<!-- src/add-os/modules/hr/views/approvals/ApprovalFlowsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrApprovalFlows')" :description="t('hrApprovals.flows.description')">
			<template #actions>
				<n-button type="primary" :disabled="freeTypes.length === 0" @click="openFlow(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrApprovals.flows.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="flows" :loading :bordered="false" size="small" :scroll-x="760">
				<template #empty>
					<span class="text-secondary">{{ t("hrApprovals.flows.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>

		<ApprovalFlowModal v-model:show="flowVisible" :flow="editing" :types :taken-types="flows.map(f => f.request_type)" @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { ApprovalFlow, FlowStep } from "@/add-os/modules/hr/types/approvals"
import { NAlert, NButton, NCard, NDataTable, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import ApprovalFlowModal from "@/add-os/modules/hr/components/approvals/ApprovalFlowModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { abilityLabel } from "@/add-os/modules/hr/utils/approvalLabels"
import { requestTypeLabel } from "@/add-os/modules/hr/utils/approvalSummary"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { deleteApprovalFlow, listApprovalFlows, listApprovalTypes } from "@/add-os/services/hr/approvals"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One approval flow per request type. A type without a flow goes to the
 * requester's direct manager alone. Gated by hr.approvals.manage, which every
 * route here needs.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const flows = ref<ApprovalFlow[]>([])
const types = ref<string[]>([])
const loading = ref(true)
const loadError = ref(false)

async function load() {
	loading.value = true
	loadError.value = false
	try {
		;[flows.value, types.value] = await Promise.all([listApprovalFlows(), listApprovalTypes()])
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(load)

const freeTypes = computed(() => types.value.filter(type => !flows.value.some(f => f.request_type === type)))

const flowVisible = ref(false)
const editing = ref<ApprovalFlow | null>(null)

function openFlow(flow: ApprovalFlow | null) {
	editing.value = flow
	flowVisible.value = true
}

function confirmDelete(flow: ApprovalFlow) {
	dialog.warning({
		title: t("hrApprovals.flows.delete"),
		content: t("hrApprovals.flows.deleteConfirm", { type: requestTypeLabel(t, flow.request_type) }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteApprovalFlow(flow.id)
				message.success(t("hrApprovals.flows.deleted"))
				await load()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

function stepLabel(step: FlowStep): string {
	if (step.approver === "ability" && step.ability) return abilityLabel(t, step.ability)
	return t(`hrApprovals.approverType.${step.approver}`)
}

function iconButton(label: string, icon: string, type: "primary" | "error", onClick: () => void) {
	return h(NButton, { text: true, type, "aria-label": label, title: label, onClick }, { icon: () => h(Icon, { name: icon, size: 18 }) })
}

const columns = computed<DataTableColumns<ApprovalFlow>>(() => [
	{ title: t("hrApprovals.flows.requestType"), key: "request_type", minWidth: 140, render: row => requestTypeLabel(t, row.request_type) },
	{ title: t("hrApprovals.flows.name"), key: "name", minWidth: 160, render: row => translated(row.name) || requestTypeLabel(t, row.request_type) },
	{
		title: t("hrApprovals.steps"),
		key: "steps",
		minWidth: 280,
		render: row => row.steps.map((step, index) => `${formatNumber(index + 1)}. ${stepLabel(step)}`).join(" · ")
	},
	{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => h(ActiveTag, { active: row.is_active }) },
	{
		title: t("hr.employees.columns.actions"),
		key: "actions",
		width: 100,
		align: "center",
		render: row =>
			h("div", { class: "flex justify-center gap-3" }, [
				iconButton(t("hr.common.edit"), "carbon:edit", "primary", () => openFlow(row)),
				iconButton(t("hr.common.delete"), "carbon:trash-can", "error", () => confirmDelete(row))
			])
	}
])
</script>
