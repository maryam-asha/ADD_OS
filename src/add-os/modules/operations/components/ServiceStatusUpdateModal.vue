<template>
	<FormModal :show :title="t('operationsRequests.actions.updateStatus')" size="md" @update:show="emit('update:show', $event)">
		<div v-if="request" class="flex flex-col gap-4">
			<div class="flex items-center justify-between p-3 bg-[var(--add-surface-sunken)] rounded-xl border border-[var(--add-border)]">
				<span class="text-xs text-[var(--add-text-secondary)] font-mono">REQ-{{ request.id }}</span>
				<span class="text-sm font-bold text-[var(--add-text-primary)]">{{ request.service_type?.name }}</span>
			</div>

			<n-form-item :label="t('operationsRequests.details.status')">
				<n-select
					v-model:value="selectedStatus"
					:options="statusOptions"
					class="w-full"
				/>
			</n-form-item>

			<div v-if="selectedStatus === 'resolved' || selectedStatus === 'rejected'" class="flex flex-col gap-3">
				<n-form-item :label="t('operationsRequests.details.noteEn')">
					<n-input
						v-model:value="noteEn"
						type="textarea"
						:rows="2"
						placeholder="E.g. Issue fixed / Request handled successfully"
					/>
				</n-form-item>

				<n-form-item :label="t('operationsRequests.details.noteAr')">
					<n-input
						v-model:value="noteAr"
						type="textarea"
						:rows="2"
						placeholder="مثال: تم حل المشكلة ومعالجة الطلب بنجاح"
					/>
				</n-form-item>
			</div>

			<div class="flex items-center justify-end gap-3 pt-4 border-t border-[var(--add-border)]">
				<n-button secondary @click="emit('update:show', false)">
					{{ t('operationsRequests.actions.close') }}
				</n-button>
				<n-button
					type="primary"
					:loading="isSubmitting"
					@click="handleSubmit"
				>
					{{ t('operationsRequests.actions.updateStatus') }}
				</n-button>
			</div>
		</div>
	</FormModal>
</template>

<script setup lang="ts">
import type { ServiceRequest, ServiceRequestStatus } from "../types/service"
import { NButton, NFormItem, NInput, NSelect } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import FormModal from "@/add-os/components/page/FormModal.vue"

const props = defineProps<{
	show: boolean
	request: ServiceRequest | null
	isSubmitting: boolean
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
	submit: [payload: { status: ServiceRequestStatus; resolution_note?: { en?: string; ar?: string } }]
}>()

const { t } = useI18n()

const selectedStatus = ref<ServiceRequestStatus>("in_progress")
const noteEn = ref("")
const noteAr = ref("")

const statusOptions = [
	{ value: "in_progress", label: t("operationsRequests.status.in_progress") },
	{ value: "resolved", label: t("operationsRequests.status.resolved") },
	{ value: "rejected", label: t("operationsRequests.status.rejected") }
]

watch(
	() => props.request,
	newReq => {
		if (newReq) {
			selectedStatus.value = newReq.status === "pending" ? "in_progress" : newReq.status
			noteEn.value = ""
			noteAr.value = ""
		}
	},
	{ immediate: true }
)

function handleSubmit() {
	const payload: { status: ServiceRequestStatus; resolution_note?: { en?: string; ar?: string } } = {
		status: selectedStatus.value
	}

	if (selectedStatus.value === "resolved" || selectedStatus.value === "rejected") {
		if (noteEn.value.trim() || noteAr.value.trim()) {
			payload.resolution_note = {
				en: noteEn.value.trim() || undefined,
				ar: noteAr.value.trim() || undefined
			}
		}
	}

	emit("submit", payload)
}
</script>
