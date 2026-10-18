<!-- src/add-os/modules/hr/components/leave/LeaveRequestDetailDrawer.vue -->
<template>
	<HrDrawer v-model:show="show" :title="t('hrLeave.detail.title')">
		<n-alert v-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="loading" text :repeat="5" />
		<div v-else-if="leave" class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-col gap-0.5">
					<span class="font-semibold">{{ translated(leave.employee.name) }}</span>
					<span class="font-mono text-xs text-secondary" dir="ltr">{{ leave.employee.employee_number }}</span>
				</div>
				<ApprovalStatusTag :status="leave.status" />
			</div>
			<n-descriptions :column="1" label-placement="left" size="small" bordered>
				<n-descriptions-item :label="t('hrLeave.request.type')">{{ translated(leave.leave_type.name) }}</n-descriptions-item>
				<n-descriptions-item :label="t('hrLeave.request.dates')">{{ leavePeriod(t, leave) }}</n-descriptions-item>
				<n-descriptions-item :label="t('hrLeave.detail.amount')">
					<span class="add-numeric">{{ leaveAmount(t, leave.amount, leave.leave_type.unit) }}</span>
				</n-descriptions-item>
				<n-descriptions-item :label="t('hrLeave.request.reason')">{{ leave.reason || none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hrLeave.request.attachment')">{{ leave.document_id ? t("hr.common.yes") : t("hr.common.no") }}</n-descriptions-item>
				<n-descriptions-item v-if="leave.approval" :label="t('hrLeave.detail.approval')">
					{{ t(`hrApprovals.status.${leave.approval.status}`) }} · {{ t("hrApprovals.step", { n: formatNumber(leave.approval.current_step) }) }}
				</n-descriptions-item>
				<n-descriptions-item v-if="leave.created_at" :label="t('hrLeave.detail.submittedAt')">{{ formatDateTime(leave.created_at) }}</n-descriptions-item>
				<n-descriptions-item v-if="leave.cancelled_at" :label="t('hrLeave.detail.cancelledAt')">{{ formatDateTime(leave.cancelled_at) }}</n-descriptions-item>
			</n-descriptions>
			<p v-if="leave.document_id" class="text-sm text-secondary">{{ t("hrLeave.detail.attachmentWhere") }}</p>
		</div>

		<template v-if="leave && canCancel" #footer>
			<div class="flex justify-end">
				<n-button type="error" secondary :loading="cancelling" @click="confirmCancel">
					<template #icon><Icon name="carbon:close" :size="16" /></template>
					{{ t("hrLeave.detail.cancel") }}
				</n-button>
			</div>
		</template>
	</HrDrawer>
</template>

<script setup lang="ts">
import type { LeaveRequest } from "@/add-os/modules/hr/types/leave"
import type { UpdateResult } from "@/add-os/services/hr/core"
import { NAlert, NButton, NDescriptions, NDescriptionsItem, NSkeleton, useDialog, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import ApprovalStatusTag from "@/add-os/modules/hr/components/approvals/ApprovalStatusTag.vue"
import HrDrawer from "@/add-os/modules/hr/components/HrDrawer.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { leaveAmount, leavePeriod } from "@/add-os/modules/hr/utils/leave"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One leave request, and — when `cancel` is given — cancelling a pending or
 * approved one. Cancelling a pending one withdraws its approval; an
 * approved one gives its days back to the balance, and only before its first
 * day — once started the server refuses, for HR too (a balance adjustment
 * is the way then).
 */
const props = defineProps<{
	requestId: number | null
	load: (id: number) => Promise<LeaveRequest>
	cancel?: (id: number) => Promise<UpdateResult>
}>()
const emit = defineEmits<{ changed: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const none = EMPTY

const leave = ref<LeaveRequest | null>(null)
const loading = ref(false)
const loadError = ref("")
const cancelling = ref(false)

watch(show, async visible => {
	if (!visible || props.requestId === null) return
	leave.value = null
	loading.value = true
	loadError.value = ""
	try {
		leave.value = await props.load(props.requestId)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
})

const canCancel = computed(() => Boolean(props.cancel) && (leave.value?.status === "pending" || leave.value?.status === "approved"))

function confirmCancel() {
	const current = leave.value
	if (!current || !props.cancel) return
	const cancel = props.cancel
	dialog.warning({
		title: t("hrLeave.detail.cancel"),
		content: t("hrLeave.detail.cancelConfirm", { name: translated(current.employee.name), dates: leavePeriod(t, current) }),
		positiveText: t("hrLeave.detail.cancel"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			cancelling.value = true
			try {
				message.success(serverMessage(await cancel(current.id), t("hrLeave.detail.cancelled")))
				show.value = false
				emit("changed")
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			} finally {
				cancelling.value = false
			}
		}
	})
}
</script>
