<template>
	<n-modal
		:show
		preset="card"
		class="max-w-2xl w-full rounded-2xl"
		:title="t('operationsRequests.details.title')"
		@update:show="emit('update:show', $event)"
	>
		<div v-if="request" class="flex flex-col gap-6">
			<!-- Header summary -->
			<div class="flex items-center justify-between bg-stone-50 p-4 rounded-xl border border-stone-200">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
						<Icon name="carbon:document" :size="22" />
					</div>
					<div class="flex flex-col">
						<span class="text-base font-bold text-stone-900">
							{{ request.service_type?.name || t('operationsRequests.details.service') }}
						</span>
						<span class="text-xs text-stone-500 font-mono">REQ-{{ request.id }}</span>
					</div>
				</div>
				<n-tag :type="statusTagType(request.status)" size="medium" round class="font-bold">
					{{ statusLabel(request.status) }}
				</n-tag>
			</div>

			<!-- Meta information grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
				<div class="flex flex-col gap-1 p-3 bg-stone-50/60 rounded-xl border border-stone-100">
					<span class="text-xs text-stone-400 font-medium">{{ t('operationsRequests.details.branch') }}</span>
					<span class="font-semibold text-stone-800">{{ request.branch?.name || '—' }}</span>
				</div>
				<div class="flex flex-col gap-1 p-3 bg-stone-50/60 rounded-xl border border-stone-100">
					<span class="text-xs text-stone-400 font-medium">{{ t('operationsRequests.details.space') }}</span>
					<span class="font-semibold text-stone-800">{{ request.space?.name || '—' }}</span>
				</div>
				<div class="flex flex-col gap-1 p-3 bg-stone-50/60 rounded-xl border border-stone-100">
					<span class="text-xs text-stone-400 font-medium">{{ t('operationsRequests.details.locationSource') }}</span>
					<span class="font-semibold text-stone-800 uppercase text-xs">{{ request.location_source || 'none' }}</span>
				</div>
				<div class="flex flex-col gap-1 p-3 bg-stone-50/60 rounded-xl border border-stone-100">
					<span class="text-xs text-stone-400 font-medium">{{ t('operationsRequests.details.submittedAt') }}</span>
					<span class="font-semibold text-stone-800">{{ formatDate(request.submitted_at) }}</span>
				</div>
			</div>

			<!-- Form Responses -->
			<div class="flex flex-col gap-3">
				<h4 class="text-sm font-bold text-stone-800 flex items-center gap-2">
					<Icon name="carbon:portfolio" :size="16" class="text-stone-500" />
					{{ t('operationsRequests.details.formResponses') }}
				</h4>

				<div v-if="request.values && request.values.length > 0" class="flex flex-col gap-2">
					<div
						v-for="(val, idx) in request.values"
						:key="idx"
						class="flex flex-col gap-1 p-3 bg-stone-50/80 rounded-xl border border-stone-200/80 text-sm"
					>
						<span class="text-xs text-stone-500 font-semibold uppercase tracking-wider">
							{{ val.field_key }}
						</span>
						<div class="text-stone-800 whitespace-pre-wrap font-medium">
							{{ formatValue(val.value) }}
						</div>
					</div>
				</div>
				<div v-else class="text-xs text-stone-400 italic p-3 bg-stone-50/50 rounded-xl border border-stone-100">
					{{ t('operationsRequests.details.noResponses') }}
				</div>
			</div>

			<!-- Resolution Note (if any) -->
			<div v-if="request.resolution_note" class="flex flex-col gap-2 p-4 bg-teal-50/70 border border-teal-200 rounded-xl">
				<span class="text-xs font-bold text-teal-800 uppercase flex items-center gap-1.5">
					<Icon name="carbon:checkmark-outline" :size="16" />
					{{ t('operationsRequests.details.resolutionNote') }}
				</span>
				<p class="text-sm text-stone-800">{{ request.resolution_note }}</p>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
				<n-button secondary @click="emit('update:show', false)">
					{{ t('operationsRequests.actions.close') }}
				</n-button>
				<n-button
					v-if="request.status !== 'resolved' && request.status !== 'rejected'"
					type="primary"
					@click="emit('openStatusModal', request)"
				>
					{{ t('operationsRequests.actions.updateStatus') }}
				</n-button>
			</div>
		</div>
	</n-modal>
</template>

<script setup lang="ts">
import type { ServiceRequest, ServiceRequestStatus } from "../types/service"
import { NButton, NModal, NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{
	show: boolean
	request: ServiceRequest | null
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
	openStatusModal: [request: ServiceRequest]
}>()

const { t } = useI18n()

function statusTagType(status: ServiceRequestStatus): "default" | "info" | "success" | "warning" | "error" {
	switch (status) {
		case "pending":
			return "warning"
		case "in_progress":
			return "info"
		case "resolved":
			return "success"
		case "rejected":
			return "error"
		default:
			return "default"
	}
}

function statusLabel(status: ServiceRequestStatus): string {
	return t(`operationsRequests.status.${status}`) || status
}

function formatDate(dateStr: string): string {
	if (!dateStr) return "—"
	try {
		return formatDateTime(dateStr)
	} catch {
		return dateStr
	}
}

function formatValue(value: unknown): string {
	if (value === null || value === undefined) return "—"
	if (typeof value === "object") {
		return JSON.stringify(value, null, 2)
	}
	return String(value)
}
</script>
