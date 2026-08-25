<!-- src/add-os/modules/booking/views/ApprovalQueuePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.approvalQueue") }}</h1>
			<p>{{ t("approvalQueue.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('approvalQueue.loadError')" />

		<n-card class="add-ledger-table">
			<n-data-table v-if="rows.length > 0 || isLoading" :columns :data="rows" :loading="isLoading" :bordered="false" :row-key />
			<div v-else-if="!error" class="py-10 text-center">{{ t("approvalQueue.empty") }}</div>

			<div v-if="meta && meta.last_page > 1" class="mt-4 flex justify-end">
				<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
			</div>
		</n-card>

		<n-modal v-model:show="rejectModalVisible" preset="card" :title="t('approvalQueue.reject.title')" class="max-w-md">
			<n-form :model="rejectForm">
				<n-form-item
					path="rejection_reason"
					:label="t('approvalQueue.reject.reasonLabel')"
					:feedback="rejectFieldErrors.rejection_reason?.[0]"
					:validation-status="rejectFieldErrors.rejection_reason ? 'error' : undefined"
				>
					<n-input
						v-model:value="rejectForm.rejection_reason"
						type="textarea"
						:rows="3"
						:placeholder="t('approvalQueue.reject.reasonPlaceholder')"
					/>
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="rejectModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="error" :loading="action.isSubmitting.value" @click="submitReject">
						{{ t("approvalQueue.reject.button") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { FieldErrors } from "@/add-os/modules/booking/composables/useReceptionAction"
import type { PendingApprovalBooking } from "@/add-os/modules/booking/types/reception"
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, NPagination } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useReceptionAction } from "@/add-os/modules/booking/composables/useReceptionAction"
import { buildApprovalColumns } from "@/add-os/modules/booking/config/approval-queue.config"
import { approveBooking, listPendingApprovals, rejectBooking } from "@/add-os/services/reception"

/**
 * Bookings awaiting a reception decision.
 *
 * The first screen in this app that pages. `listPendingApprovals` returns
 * `Paginated`, and the pager is driven by the backend's own `meta.last_page` —
 * not by a count derived from the rows on screen, which would always say "1".
 * The pager is hidden entirely at one page rather than rendered inert: a
 * single-page pager is a control that does nothing.
 *
 * Approve and reject both end with a refetch and no local mutation of `rows`.
 * The queue is defined server-side as `status = pending`, so a decided booking
 * leaves it because the next response no longer contains it. Splicing the row
 * out here would draw the same picture while making the screen disagree with
 * the server the moment anything else changed.
 */

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const page = ref(1)
const { data: rows, isLoading, error, refetch, meta } = useResourceList<PendingApprovalBooking>(listPendingApprovals, undefined, page)

const action = useReceptionAction(refetch)

function rowKey(row: PendingApprovalBooking) {
	return row.id
}

async function approve(row: PendingApprovalBooking) {
	await action.run(() => approveBooking(row.id), t("approvalQueue.approve.success"))
}

const rejectModalVisible = ref(false)
const rejectTargetId = ref<number | null>(null)
const rejectForm = ref({ rejection_reason: "" })
const rejectFieldErrors = ref<FieldErrors>({})

function openReject(row: PendingApprovalBooking) {
	rejectTargetId.value = row.id
	rejectForm.value = { rejection_reason: "" }
	rejectFieldErrors.value = {}
	rejectModalVisible.value = true
}

/**
 * The required-reason rule is checked here rather than through `n-form` rules
 * on purpose. The modal's body mounts lazily, so `formRef.value?.validate()`
 * resolves to `undefined` — silently passing — if it is called before the form
 * has rendered. A plain check cannot be skipped that way, and it puts the
 * client's own complaint in the same place a server 422 lands, so the field
 * shows one error at a time from one source.
 */
async function submitReject() {
	const id = rejectTargetId.value
	if (id === null) return

	const reason = rejectForm.value.rejection_reason.trim()
	if (!reason) {
		rejectFieldErrors.value = { rejection_reason: [t("approvalQueue.reject.reasonRequired")] }
		return
	}

	rejectFieldErrors.value = {}
	const succeeded = await action.run(() => rejectBooking(id, reason), t("approvalQueue.reject.success"), errors => {
		rejectFieldErrors.value = errors
	})

	if (succeeded) rejectModalVisible.value = false
}

const columns = computed<DataTableColumns<PendingApprovalBooking>>(() => buildApprovalColumns(t, approve, openReject))

defineExpose({ approve, openReject, submitReject, rejectForm, rejectFieldErrors, rejectModalVisible, page, rows, meta })
</script>
