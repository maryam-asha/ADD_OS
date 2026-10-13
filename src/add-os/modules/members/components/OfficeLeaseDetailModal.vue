<!-- src/add-os/modules/members/components/OfficeLeaseDetailModal.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="lease?.reference ? `${t('officeLeases.detail.title')} · ${lease.reference}` : t('officeLeases.detail.title')"
		closable
		class="max-w-2xl w-full !rounded-2xl shadow-xl my-6"
		style="max-height: 86vh; display: flex; flex-direction: column;"
		content-style="max-height: calc(86vh - 140px); overflow-y: auto;"
		:segmented="{ content: 'soft', footer: 'soft' }"
	>
		<div v-if="isLoading" class="py-16 flex items-center justify-center">
			<n-spin size="large" />
		</div>

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
					<span class="text-neutral-500">{{ t('officeLeases.detail.provider') }}</span>
					<span class="font-semibold text-sm">{{ lease.provider?.name || t('companies.transferProvider.direct', 'Direct') }}</span>
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

			<!-- Financial and Dates Details -->
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-neutral-50/50 dark:bg-neutral-800/20 p-3 rounded-lg border border-black/5 dark:border-white/5">
				<div>
					<span class="text-neutral-500">{{ t('officeLeases.detail.monthlyAmount') }}:</span>
					<div class="font-bold text-sm mt-0.5 text-primary">{{ lease.monthly_amount }} {{ lease.currency }}</div>
				</div>
				<div>
					<span class="text-neutral-500">{{ t('officeLeases.detail.durationMonths') }}:</span>
					<div class="font-medium mt-0.5">{{ t('officeLeases.detail.durationValue', { months: lease.duration_months }) }}</div>
				</div>
				<div>
					<span class="text-neutral-500">{{ t('officeLeases.detail.billingCycleMonths') }}:</span>
					<div class="font-medium mt-0.5">
						{{ lease.billing_cycle_months === lease.duration_months ? t('officeLeases.detail.billingCycleSingle') : t('officeLeases.detail.billingCycleValue', { months: lease.billing_cycle_months }) }}
					</div>
				</div>
				<div>
					<span class="text-neutral-500">{{ t('officeLeases.detail.startsOn') }}:</span>
					<div class="font-medium mt-0.5">{{ lease.starts_on }}</div>
				</div>
				<div>
					<span class="text-neutral-500">{{ t('officeLeases.detail.endsOn') }}:</span>
					<div class="font-medium mt-0.5">{{ lease.ends_on }}</div>
				</div>
				<div>
					<span class="text-neutral-500">{{ t('officeLeases.detail.billedTo') }}:</span>
					<div class="font-medium mt-0.5">
						{{ lease.billed_to === 'provider' ? t('officeLeases.detail.billedToProvider') : t('officeLeases.detail.billedToCompany') }}
					</div>
				</div>
			</div>

			<!-- Door Access Card -->
			<div class="p-3.5 rounded-lg border border-black/5 dark:border-white/5 bg-neutral-50/70 dark:bg-neutral-800/30 flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Icon name="carbon:locked" :size="16" class="text-neutral-600" />
						<span class="font-bold text-sm">{{ t('officeLeases.detail.doorAccessTitle') }}</span>
					</div>
					<n-tag :type="lease.access?.status === 'active' ? 'success' : 'default'" size="small" round>
						{{ lease.access?.status === 'active' ? t('officeLeases.detail.doorStatusActive') : t('officeLeases.detail.doorStatusNone') }}
					</n-tag>
				</div>

				<div v-if="lease.access_ends_on" class="text-xs text-neutral-500">
					{{ t('officeLeases.detail.expiresAt') }}: <span class="font-semibold text-neutral-700 dark:text-neutral-300">{{ lease.access_ends_on }}</span>
				</div>

				<!-- Warning: Office has no lock -->
				<n-alert v-if="lease.access?.warning === 'no_lock'" type="warning" :title="t('officeLeases.detail.noLockWarning')" class="mt-1" />
			</div>

			<!-- Renewal Section -->
			<div class="p-3.5 rounded-lg border border-black/5 dark:border-white/5 bg-neutral-50/70 dark:bg-neutral-800/30 flex flex-col gap-2.5">
				<div class="flex items-center justify-between flex-wrap gap-2">
					<div class="flex items-center gap-2">
						<Icon name="carbon:renew" :size="16" class="text-neutral-600" />
						<span class="font-bold text-sm">{{ t('officeLeases.detail.autoRenew') }}</span>
						<n-tag :type="lease.auto_renew ? 'success' : 'default'" size="small" round>
							{{ lease.auto_renew ? t('officeLeases.detail.autoRenewYes') : t('officeLeases.detail.autoRenewNo') }}
						</n-tag>
					</div>

					<!-- Actions for renewals -->
					<div v-if="canManageRenewals()" class="flex items-center gap-2">
						<n-button
							size="small"
							:loading="isTogglingAutoRenew"
							@click="toggleAutoRenew"
						>
							{{ t('officeLeases.detail.toggleAutoRenew') }}
						</n-button>
						<n-button
							v-if="lease.status === 'active'"
							size="small"
							type="primary"
							:loading="isRenewing"
							@click="handleRenewNow"
						>
							{{ t('officeLeases.detail.renewNow') }}
						</n-button>
					</div>
				</div>

				<div class="flex items-center gap-4 text-xs text-neutral-500">
					<span>{{ t('officeLeases.detail.renewalsCount') }}: <strong class="text-neutral-700 dark:text-neutral-300">{{ lease.renewals_count }}</strong></span>
				</div>

				<n-alert v-if="lease.renewal_stop_reason_label" type="error" class="mt-1">
					<strong>{{ t('officeLeases.detail.stopReason') }}:</strong> {{ lease.renewal_stop_reason_label }}
				</n-alert>
			</div>

			<!-- Billing Periods & Invoices -->
			<div class="flex flex-col gap-2">
				<h4 class="font-bold text-sm">{{ t('officeLeases.detail.periodsTitle') }}</h4>

				<div class="flex flex-col gap-2">
					<div
						v-for="period in lease.periods"
						:key="period.sequence"
						class="p-3 rounded-lg border border-black/5 dark:border-white/5 bg-white dark:bg-neutral-800 flex flex-col gap-2 shadow-xs"
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="font-bold text-xs">{{ t('officeLeases.detail.periodSequence', { num: period.sequence }) }}</span>
								<span class="text-xs text-neutral-500">({{ period.starts_on }} – {{ period.ends_on }})</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="font-bold text-xs text-primary">{{ period.amount }} {{ lease.currency }}</span>
								<n-tag :type="periodTagType(period.status)" size="small" round>
									{{ t(`officeLeases.detail.periodStatus.${period.status}`) }}
								</n-tag>
							</div>
						</div>

						<!-- Invoice breakdown if exists -->
						<div v-if="period.invoice" class="bg-neutral-50 dark:bg-neutral-900/40 p-2.5 rounded text-xs grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
							<div>
								<span class="text-neutral-500 block">{{ t('officeLeases.detail.invoiceRef') }}</span>
								<span class="font-semibold">{{ period.invoice.reference }}</span>
							</div>
							<div>
								<span class="text-neutral-500 block">{{ t('officeLeases.detail.invoiceStatus') }}</span>
								<n-tag :type="period.invoice.status === 'paid' ? 'success' : 'warning'" size="tiny" round>
									{{ period.invoice.status }}
								</n-tag>
								<n-tag v-if="period.invoice.is_overdue" type="error" size="tiny" round class="ms-1">
									{{ t('officeLeases.detail.invoiceOverdue') }}
								</n-tag>
							</div>
							<div>
								<span class="text-neutral-500 block">{{ t('officeLeases.detail.invoicePaid') }}</span>
								<span class="font-medium text-emerald-600">{{ period.invoice.paid_amount }} {{ lease.currency }}</span>
							</div>
							<div>
								<span class="text-neutral-500 block">{{ t('officeLeases.detail.invoiceRemaining') }}</span>
								<span class="font-medium text-rose-600">{{ period.invoice.remaining }} {{ lease.currency }}</span>
							</div>
							<div>
								<span class="text-neutral-500 block">{{ t('officeLeases.detail.invoiceDueAt') }}</span>
								<span class="text-neutral-600">{{ period.invoice.due_at || '—' }}</span>
							</div>
						</div>
						<div v-else class="text-xs text-neutral-400 italic">
							{{ t('officeLeases.detail.noInvoiceYet') }}
						</div>
					</div>
				</div>
			</div>

			<!-- Exceptional Termination Section (if active and user has office-leases.terminate) -->
			<div v-if="lease.status === 'active' && canTerminateOfficeLeases()" class="border-t border-black/5 dark:border-white/5 pt-4">
				<div v-if="!showTerminateForm" class="flex justify-end">
					<n-button type="error" ghost size="small" @click="showTerminateForm = true">
						{{ t('officeLeases.terminate.button') }}
					</n-button>
				</div>

				<div v-else class="p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<span class="font-bold text-sm text-red-700 dark:text-red-400">{{ t('officeLeases.terminate.title') }}</span>
						<n-button size="tiny" quaternary @click="showTerminateForm = false">{{ t('officeLeases.terminate.cancel') }}</n-button>
					</div>

					<n-alert type="warning" :title="t('officeLeases.terminate.warning')" />

					<n-form ref="terminateFormRef" :model="terminateForm" :rules="terminateRules" label-placement="top">
						<n-form-item path="terminated_on" :label="t('officeLeases.terminate.dateLabel')">
							<n-date-picker
								v-model:formatted-value="terminateForm.terminated_on"
								value-format="yyyy-MM-dd"
								type="date"
								class="w-full"
								:is-date-disabled="isTerminationDateDisabled"
							/>
						</n-form-item>

						<n-form-item path="reason" :label="t('officeLeases.terminate.reasonLabel')">
							<n-input
								v-model:value="terminateForm.reason"
								type="textarea"
								:placeholder="t('officeLeases.terminate.reasonPlaceholder')"
							/>
						</n-form-item>

						<div class="flex justify-end gap-2 mt-2">
							<n-button @click="showTerminateForm = false">{{ t('officeLeases.terminate.cancel') }}</n-button>
							<n-button type="error" :loading="isTerminating" @click="handleTerminate">
								{{ t('officeLeases.terminate.confirm') }}
							</n-button>
						</div>
					</n-form>
				</div>
			</div>
		</div>

		<template #footer>
			<div class="flex justify-end">
				<n-button @click="show = false">{{ t('common.close', 'Close') }}</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules } from "naive-ui"
import type { OfficeLease, OfficeLeaseStatus, LeasePeriodStatus } from "../types/office-lease"
import { NAlert, NButton, NDatePicker, NForm, NFormItem, NInput, NModal, NSpin, NTag, useMessage } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canManageRenewals, canTerminateOfficeLeases } from "@/add-os/config/permissions"
import { getOfficeLease, renewOfficeLease, setOfficeLeaseAutoRenew, terminateOfficeLease } from "@/add-os/services/office-leases"
import { ApiError } from "@/add-os/services/api"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ leaseId: number | null }>()
const show = defineModel<boolean>("show", { required: true })
const emit = defineEmits<{ (e: "updated"): void }>()

const { t } = useI18n()
const message = useMessage()

const lease = ref<OfficeLease | null>(null)
const isLoading = ref(false)
const error = ref(false)

const isTogglingAutoRenew = ref(false)
const isRenewing = ref(false)
const isTerminating = ref(false)
const showTerminateForm = ref(false)

const terminateFormRef = ref<FormInst | null>(null)
const terminateForm = ref({
	terminated_on: "",
	reason: ""
})

const terminateRules: FormRules = {
	terminated_on: { required: true, message: t("officeLeases.terminate.dateLabel"), trigger: ["blur", "change"] },
	reason: { required: true, message: t("officeLeases.terminate.reasonRequired"), trigger: ["blur", "input"] }
}

function statusTagType(status: OfficeLeaseStatus) {
	if (status === "active") return "success"
	if (status === "ended") return "default"
	return "error"
}

function periodTagType(status: LeasePeriodStatus) {
	if (status === "invoiced") return "info"
	if (status === "cancelled") return "error"
	return "default"
}

function isTerminationDateDisabled(ts: number) {
	if (!lease.value) return false
	const dateStr = new Date(ts).toISOString().slice(0, 10)
	return dateStr < lease.value.starts_on || dateStr > lease.value.ends_on
}

async function loadLease() {
	if (!props.leaseId) return
	isLoading.value = true
	error.value = false
	showTerminateForm.value = false
	try {
		lease.value = await getOfficeLease(props.leaseId)
		const today = new Date().toISOString().slice(0, 10)
		terminateForm.value.terminated_on = today >= lease.value.starts_on && today <= lease.value.ends_on ? today : lease.value.starts_on
		terminateForm.value.reason = ""
	} catch (e) {
		error.value = true
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
		await setOfficeLeaseAutoRenew(lease.value.id, !lease.value.auto_renew)
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

async function handleRenewNow() {
	if (!lease.value) return
	isRenewing.value = true
	try {
		await renewOfficeLease(lease.value.id)
		message.success(t("officeLeases.detail.renewSuccess"))
		await loadLease()
		emit("updated")
	} catch (caught) {
		if (caught instanceof ApiError) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	} finally {
		isRenewing.value = false
	}
}

async function handleTerminate() {
	try {
		await terminateFormRef.value?.validate()
	} catch {
		return
	}

	if (!lease.value) return
	isTerminating.value = true
	try {
		await terminateOfficeLease(lease.value.id, {
			terminated_on: terminateForm.value.terminated_on,
			reason: terminateForm.value.reason
		})
		message.success(t("officeLeases.terminate.success"))
		showTerminateForm.value = false
		await loadLease()
		emit("updated")
	} catch (caught) {
		if (caught instanceof ApiError) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	} finally {
		isTerminating.value = false
	}
}
</script>
