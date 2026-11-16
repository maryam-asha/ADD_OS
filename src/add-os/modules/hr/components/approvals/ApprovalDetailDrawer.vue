<!-- src/add-os/modules/hr/components/approvals/ApprovalDetailDrawer.vue -->
<template>
	<HrDrawer v-model:show="show" :title="request ? requestTypeLabel(t, request.request_type) : t('hrApprovals.detail')">
		<n-alert v-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="loading" text :repeat="6" />

		<div v-else-if="request" class="flex flex-col gap-5">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-col gap-0.5">
					<span class="font-semibold">{{ translated(request.employee.name) }}</span>
					<span class="font-mono text-xs text-secondary" dir="ltr">{{ request.employee.employee_number }}</span>
				</div>
				<ApprovalStatusTag :status="request.status" />
			</div>
			<p v-if="request.created_at" class="text-sm text-secondary">{{ t("hrApprovals.submittedAt", { date: formatDateTime(request.created_at) }) }}</p>

			<n-descriptions v-if="rows.length" :column="1" label-placement="left" size="small" bordered>
				<n-descriptions-item v-for="row in rows" :key="row.label" :label="row.label">
					<span :dir="row.ltr ? 'ltr' : undefined">{{ row.value }}</span>
				</n-descriptions-item>
			</n-descriptions>

			<section class="flex flex-col gap-2">
				<h3 class="font-semibold">{{ t("hrApprovals.steps") }}</h3>
				<ApprovalStepsList :steps="request.steps" />
			</section>

			<n-alert v-if="pending && ownRequest" type="info" :title="t('hrApprovals.ownRequestTitle')" data-test="own-request">
				{{ t("hrApprovals.ownRequestNote") }}
			</n-alert>

			<n-alert v-if="override && canDecide" type="warning" :title="t('hrApprovals.overrideTitle')">
				{{ t("hrApprovals.overrideNote") }}
			</n-alert>
		</div>

		<template v-if="request && canDecide" #footer>
			<div class="flex justify-end gap-2">
				<n-button type="error" secondary @click="openDecision('reject')">
					<template #icon><Icon name="carbon:close" :size="16" /></template>
					{{ t("hrApprovals.reject") }}
				</n-button>
				<n-button type="primary" @click="openDecision('approve')">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("hrApprovals.approve") }}
				</n-button>
			</div>
		</template>
	</HrDrawer>

	<HrFormModal v-model:show="decisionVisible" :title="decision === 'approve' ? t('hrApprovals.approveTitle') : t('hrApprovals.rejectTitle')" size="sm" icon="carbon:task-approved">
		<p v-if="override" class="mb-3 text-sm">{{ t("hrApprovals.overrideNote") }}</p>
		<n-input
			v-model:value="comment"
			type="textarea"
			:autosize="{ minRows: 3, maxRows: 6 }"
			:maxlength="1000"
			show-count
			:placeholder="decision === 'reject' ? t('hrApprovals.rejectPlaceholder') : t('hrApprovals.commentPlaceholder')"
		/>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="decisionVisible = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button :type="decision === 'reject' ? 'error' : 'primary'" :loading="deciding" @click="decide">
					{{ decision === "approve" ? t("hrApprovals.approve") : t("hrApprovals.reject") }}
				</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { ApprovalRequest } from "@/add-os/modules/hr/types/approvals"
import type { UpdateResult } from "@/add-os/services/hr/core"
import { NAlert, NButton, NDescriptions, NDescriptionsItem, NInput, NSkeleton, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import ApprovalStatusTag from "@/add-os/modules/hr/components/approvals/ApprovalStatusTag.vue"
import ApprovalStepsList from "@/add-os/modules/hr/components/approvals/ApprovalStepsList.vue"
import HrDrawer from "@/add-os/modules/hr/components/HrDrawer.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { requestTypeLabel, summaryRows } from "@/add-os/modules/hr/utils/approvalSummary"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"
import { useAuthStore } from "@/stores/auth"

/**
 * One approval request: what it asks for, its steps, and — while it is
 * pending — approve or reject with a comment. The inbox passes the hr/me
 * calls; the override queue passes the admin ones and `override`, and says
 * the decision is recorded as an override. The server still refuses a
 * request of one's own and one already decided, with its own message.
 *
 * A request of one's own offers no decision at all, and says why, before
 * anyone writes a comment for nothing: ADD Core refuses it to everyone, an
 * admin and the override included (ApprovalEngine::isOwnRequest — the
 * account filed it, or it is about the account's own employee record). The
 * same two tests run here on what the dashboard already holds:
 * `submitted_by`, and the signed-in account's employee. Found 2026-11-12: an
 * admin filed a hiring request (Talent), opened it here, wrote the override
 * reason, and only then met the refusal.
 */
const props = defineProps<{
	requestId: number | null
	load: (id: number) => Promise<ApprovalRequest>
	approve: (id: number, comment: string | null) => Promise<UpdateResult>
	reject: (id: number, comment: string | null) => Promise<UpdateResult>
	override?: boolean
}>()
const emit = defineEmits<{ decided: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const auth = useAuthStore()

const request = ref<ApprovalRequest | null>(null)
const loading = ref(false)
const loadError = ref("")

watch(show, async visible => {
	if (!visible || props.requestId === null) return
	request.value = null
	loading.value = true
	loadError.value = ""
	try {
		request.value = await props.load(props.requestId)
	} catch (e) {
		// Decided by someone else, or no longer this approver's: the inbox answers 404.
		loadError.value = e instanceof ApiError && e.status === 404 ? t("hrApprovals.gone") : apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
})

const rows = computed(() => (request.value ? summaryRows(t, request.value.request_type, request.value.subject) : []))
const pending = computed(() => request.value?.status === "pending")

/** Filed by the signed-in account, or about its own employee record: ADD Core lets nobody decide it. */
const ownRequest = computed(() => {
	const current = request.value
	if (!current) return false
	const me = auth.user
	const filedIt = current.submitted_by !== null && me.id !== undefined && String(current.submitted_by) === String(me.id)
	const aboutMe = Boolean(me.employee) && me.employee?.id === current.employee.id
	return filedIt || aboutMe
})

const canDecide = computed(() => pending.value && !ownRequest.value)

const decisionVisible = ref(false)
const decision = ref<"approve" | "reject">("approve")
const comment = ref("")
const deciding = ref(false)

function openDecision(kind: "approve" | "reject") {
	decision.value = kind
	comment.value = ""
	decisionVisible.value = true
}

async function decide() {
	const current = request.value
	if (!current) return
	deciding.value = true
	try {
		const call = decision.value === "approve" ? props.approve : props.reject
		const fallback = decision.value === "approve" ? t("hrApprovals.approved") : t("hrApprovals.rejected")
		message.success(serverMessage(await call(current.id, nullable(comment.value)), fallback))
		decisionVisible.value = false
		show.value = false
		emit("decided")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
		// Already decided elsewhere: the list should drop it.
		if (e instanceof ApiError && (e.status === 404 || e.status === 422)) emit("decided")
	} finally {
		deciding.value = false
	}
}
</script>
