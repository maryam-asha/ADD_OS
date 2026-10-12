<!-- src/add-os/modules/provider-portal/components/ProviderOfficeLeaseDetailModal.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="lease?.reference ? `${t('officeLeases.detail.title')} · ${lease.reference}` : t('officeLeases.detail.title')"
		closable
		style="width: min(48rem, 95vw)"
		content-style="max-height: 84vh; overflow-y: auto"
	>
		<div v-if="isLoading" class="py-16 flex items-center justify-center">
			<n-spin size="large" />
		</div>

		<n-alert v-else-if="isNotFound" type="warning" :title="t('common.notFound', 'غير موجود')" />
		<n-alert v-else-if="error" type="error" :title="t('officeLeases.detail.loadError')" />

		<div v-else-if="lease" class="flex flex-col gap-5">
			<!-- Header summary cards -->
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-lg border border-black/5 dark:border-white/5 text-xs">
				<div class="flex flex-col gap-0.5">
					<span class="text-neutral-500">{{ t('officeLeases.detail.space') }}</span>
					<span class="font-semibold text-sm">{{ lease.space?.name || `#${lease.space?.id}` }}</span>
				</div>
				<div class="flex flex-col gap-0.5">
					<span class="text-neutral-500">{{ t('officeLeases.detail.company') }}</span>
					<span class="font-semibold text-sm">{{ lease.company?.legal_name || '—' }}</span>
				</div>
				<div class="flex flex-col gap-0.5">
					<span class="text-neutral-500">{{ t('officeLeases.detail.monthlyAmount') }}</span>
					<span class="font-semibold text-sm text-primary">{{ lease.monthly_amount }} {{ lease.currency }}</span>
				</div>
				<div class="flex flex-col gap-0.5">
					<span class="text-neutral-500">{{ t('officeLeases.columns.status') }}</span>
					<div>
						<n-tag :type="statusTagType(lease.status)" size="small" round :bordered="true">
							{{ t(`officeLeases.status.${lease.status}`) }}
						</n-tag>
					</div>
				</div>
			</div>

			<!-- Dates and Terms -->
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-neutral-50/50 dark:bg-neutral-800/20 p-3 rounded-lg border border-black/5 dark:border-white/5">
				<div>
					<span class="text-neutral-500">{{ t('officeLeases.detail.durationMonths') }}:</span>
					<div class="font-medium mt-0.5">{{ t('officeLeases.detail.durationValue', { months: lease.duration_months }) }}</div>
				</div>
				<div>
					<span class="text-neutral-500">{{ t('officeLeases.detail.startsOn') }}:</span>
					<div class="font-medium mt-0.5">{{ lease.starts_on }}</div>
				</div>
				<div>
					<span class="text-neutral-500">{{ t('officeLeases.detail.endsOn') }}:</span>
					<div class="font-medium mt-0.5">{{ lease.ends_on }}</div>
				</div>
			</div>

			<!-- Auto-Renew Section -->
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-800/20">
				<div class="flex flex-col gap-0.5">
					<div class="flex items-center gap-2">
						<span class="font-bold text-sm">{{ t('officeLeases.detail.autoRenew') }}</span>
						<n-tag :type="lease.auto_renew ? 'success' : 'default'" size="small" round>
							{{ lease.auto_renew ? t('officeLeases.autoRenew.enabled') : t('officeLeases.autoRenew.disabled') }}
						</n-tag>
					</div>
					<div v-if="lease.renewal_stop_reason" class="text-xs text-error font-medium mt-1">
						{{ t('providerPortal.stopReasonPrefix') }}{{ lease.renewal_stop_reason_label || lease.renewal_stop_reason }}
					</div>
				</div>

				<div class="flex items-center gap-2">
					<n-switch
						:value="lease.auto_renew"
						:loading="isTogglingAutoRenew"
						@update:value="toggleAutoRenew"
					>
						<template #checked>{{ t('officeLeases.autoRenew.enabled') }}</template>
						<template #unchecked>{{ t('officeLeases.autoRenew.disabled') }}</template>
					</n-switch>
				</div>
			</div>

			<!-- Billing Periods and Invoices -->
			<div class="flex flex-col gap-3">
				<h3 class="text-sm font-bold">{{ t('officeLeases.detail.periodsTitle') }}</h3>

				<div v-if="!lease.periods || lease.periods.length === 0" class="text-xs text-neutral-400 py-3">
					{{ t('resourceCrud.table.empty') }}
				</div>

				<div v-else class="flex flex-col gap-2.5">
					<div
						v-for="period in lease.periods"
						:key="period.sequence"
						class="flex flex-col gap-2 p-3 rounded-lg border border-black/5 dark:border-white/5 bg-neutral-50/40 dark:bg-neutral-800/10 text-xs"
					>
						<div class="flex items-center justify-between">
							<span class="font-bold text-neutral-700 dark:text-neutral-300">
								{{ t('officeLeases.detail.periodSequence', { num: period.sequence }) }}
							</span>
							<n-tag :type="periodTagType(period.status)" size="small" round>
								{{ t(`officeLeases.detail.periodStatus.${period.status}`) }}
							</n-tag>
						</div>

						<div class="flex flex-wrap items-center justify-between gap-2 text-neutral-500">
							<span>{{ t('officeLeases.detail.periodDates', { starts: period.starts_on, ends: period.ends_on }) }}</span>
							<span class="font-semibold text-neutral-900 dark:text-neutral-100">
								{{ period.amount }} {{ lease.currency }}
							</span>
						</div>

						<!-- Invoice summary (if available for provider) -->
						<div
							v-if="period.invoice"
							class="mt-1 pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2"
						>
							<div class="flex items-center gap-2">
								<span class="font-medium text-primary">#{{ period.invoice.reference || period.invoice.id }}</span>
								<n-tag size="small" :type="period.invoice.is_overdue ? 'error' : 'default'">
									{{ period.invoice.status }}
								</n-tag>
								<n-tag v-if="period.invoice.is_overdue" size="small" type="error">
									{{ t('officeLeases.detail.invoiceOverdue') }}
								</n-tag>
							</div>

							<div class="flex items-center gap-3">
								<span class="text-neutral-500">{{ t('officeLeases.detail.invoicePaid') }}: {{ period.invoice.paid_amount }} {{ lease.currency }}</span>
								<span class="font-semibold text-neutral-800 dark:text-neutral-200">
									{{ t('officeLeases.detail.invoiceRemaining') }}: {{ period.invoice.remaining }} {{ lease.currency }}
								</span>
							</div>
						</div>
						<div v-else class="text-neutral-400 italic text-[11px]">
							{{ t('officeLeases.detail.noInvoiceYet') }}
						</div>
					</div>
				</div>
			</div>
		</div>

		<template #footer>
			<div class="flex justify-end">
				<n-button @click="show = false">{{ t('resourceCrud.form.cancel') }}</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { OfficeLease, LeasePeriodStatus, OfficeLeaseStatus } from "@/add-os/modules/members/types/office-lease"
import { NAlert, NButton, NModal, NSpin, NSwitch, NTag, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { getProviderOfficeLease, setProviderOfficeLeaseAutoRenew } from "@/add-os/services/provider-portal"

const props = defineProps<{
	show: boolean
	leaseId: number | null
}>()

const emit = defineEmits<{
	(e: "update:show", value: boolean): void
	(e: "updated"): void
}>()

const { t } = useI18n()
const message = useMessage()

const show = computed({
	get: () => props.show,
	set: val => emit("update:show", val)
})

const lease = ref<OfficeLease | null>(null)
const isLoading = ref(false)
const error = ref(false)
const isNotFound = ref(false)
const isTogglingAutoRenew = ref(false)

function statusTagType(status: OfficeLeaseStatus): "success" | "default" | "error" {
	switch (status) {
		case "active":
			return "success"
		case "ended":
			return "default"
		case "terminated":
			return "error"
	}
}

function periodTagType(status: LeasePeriodStatus): "info" | "success" | "default" {
	switch (status) {
		case "upcoming":
			return "info"
		case "invoiced":
			return "success"
		case "cancelled":
		default:
			return "default"
	}
}

async function loadLease() {
	if (!props.leaseId) return
	isLoading.value = true
	error.value = false
	isNotFound.value = false
	try {
		lease.value = await getProviderOfficeLease(props.leaseId)
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 404) {
			isNotFound.value = true
		} else {
			error.value = true
			if (caught instanceof ApiError) {
				message.error(caught.data?.message ?? t("officeLeases.detail.loadError"))
			}
		}
	} finally {
		isLoading.value = false
	}
}

watch([() => props.leaseId, show], ([newId, visible]) => {
	if (visible && newId) {
		loadLease()
	}
})

async function toggleAutoRenew() {
	if (!lease.value) return
	isTogglingAutoRenew.value = true
	try {
		await setProviderOfficeLeaseAutoRenew(lease.value.id, !lease.value.auto_renew)
		message.success(t("officeLeases.detail.autoRenewUpdated"))
		await loadLease()
		emit("updated")
	} catch (caught) {
		if (caught instanceof ApiError) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	} finally {
		isTogglingAutoRenew.value = false
	}
}
</script>
