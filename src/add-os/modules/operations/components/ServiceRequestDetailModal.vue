<template>
	<FormModal :show :title="t('operationsRequests.details.title')" size="lg" @update:show="emit('update:show', $event)">
		<div v-if="request" class="flex flex-col gap-6">
			<!-- Header summary -->
			<div class="flex items-center justify-between bg-[var(--add-surface-sunken)] p-4 rounded-xl border border-[var(--add-border)]">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-lg bg-[color-mix(in_srgb,var(--add-info)_10%,transparent)] text-[var(--add-info-text)] flex items-center justify-center font-bold">
						<Icon name="carbon:document" :size="22" />
					</div>
					<div class="flex flex-col">
						<span class="text-base font-bold text-[var(--add-text-primary)]">
							{{ request.service_type?.name || t('operationsRequests.details.service') }}
						</span>
						<span class="text-xs text-[var(--add-text-secondary)] font-mono">REQ-{{ request.id }}</span>
					</div>
				</div>
				<n-tag :type="statusTagType(request.status)" size="medium" round class="font-bold">
					{{ statusLabel(request.status) }}
				</n-tag>
			</div>

			<!-- Meta information grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
				<div class="flex flex-col gap-1 p-3 bg-[var(--add-surface-sunken)] rounded-xl border border-[var(--add-border)]">
					<span class="text-xs text-[var(--add-text-muted)] font-medium">{{ t('operationsRequests.details.branch') }}</span>
					<span class="font-semibold text-[var(--add-text-primary)]">{{ request.branch?.name || '—' }}</span>
				</div>
				<div class="flex flex-col gap-1 p-3 bg-[var(--add-surface-sunken)] rounded-xl border border-[var(--add-border)]">
					<span class="text-xs text-[var(--add-text-muted)] font-medium">{{ t('operationsRequests.details.space') }}</span>
					<span class="font-semibold text-[var(--add-text-primary)]">{{ request.space?.name || '—' }}</span>
				</div>
				<div class="flex flex-col gap-1 p-3 bg-[var(--add-surface-sunken)] rounded-xl border border-[var(--add-border)]">
					<span class="text-xs text-[var(--add-text-muted)] font-medium">{{ t('operationsRequests.details.locationSource') }}</span>
					<span class="font-semibold text-[var(--add-text-primary)] uppercase text-xs">{{ request.location_source || 'none' }}</span>
				</div>
				<div class="flex flex-col gap-1 p-3 bg-[var(--add-surface-sunken)] rounded-xl border border-[var(--add-border)]">
					<span class="text-xs text-[var(--add-text-muted)] font-medium">{{ t('operationsRequests.details.submittedAt') }}</span>
					<span class="font-semibold text-[var(--add-text-primary)]">{{ formatDate(request.submitted_at) }}</span>
				</div>
			</div>

			<!-- Form Responses -->
			<div class="flex flex-col gap-3">
				<h4 class="text-sm font-bold text-[var(--add-text-primary)] flex items-center gap-2">
					<Icon name="carbon:portfolio" :size="16" class="text-[var(--add-text-secondary)]" />
					{{ t('operationsRequests.details.formResponses') }}
				</h4>

				<div v-if="request.values && request.values.length > 0" class="flex flex-col gap-2">
					<div
						v-for="(val, idx) in request.values"
						:key="idx"
						class="flex flex-col gap-1 p-3 bg-[var(--add-surface-sunken)] rounded-xl border border-[var(--add-border)] text-sm"
					>
						<span class="text-xs text-[var(--add-text-secondary)] font-semibold uppercase tracking-wider">
							{{ val.field_key }}
						</span>
						<div class="text-[var(--add-text-primary)] whitespace-pre-wrap font-medium">
							{{ formatValue(val.value) }}
						</div>
					</div>
				</div>
				<div v-else class="text-xs text-[var(--add-text-muted)] italic p-3 bg-[var(--add-surface-sunken)] rounded-xl border border-[var(--add-border)]">
					{{ t('operationsRequests.details.noResponses') }}
				</div>
			</div>

			<!-- Resolution Note (if any) -->
			<div v-if="request.resolution_note" class="flex flex-col gap-2 p-4 bg-[color-mix(in_srgb,var(--add-info)_10%,transparent)] border border-[color-mix(in_srgb,var(--add-info)_35%,transparent)] rounded-xl">
				<span class="text-xs font-bold text-[var(--add-info-text)] uppercase flex items-center gap-1.5">
					<Icon name="carbon:checkmark-outline" :size="16" />
					{{ t('operationsRequests.details.resolutionNote') }}
				</span>
				<p class="text-sm text-[var(--add-text-primary)]">{{ request.resolution_note }}</p>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-4 border-t border-[var(--add-border)]">
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
	</FormModal>
</template>

<script setup lang="ts">
import type { ServiceRequest, ServiceRequestStatus } from "../types/service"
import { NButton, NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import FormModal from "@/add-os/components/page/FormModal.vue"
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
