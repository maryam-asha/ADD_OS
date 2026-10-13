<template>
	<section class="request-detail" :aria-busy="isLoading">
		<div v-if="isLoading" class="flex flex-1 items-center justify-center py-16"><n-spin size="large" /></div>
		<n-alert v-else-if="loadError" type="error" :title="loadError" />

		<template v-else-if="request">
			<header class="request-detail__header">
				<span class="request-detail__icon" aria-hidden="true">
					<Icon :name="REQUEST_TYPE_ICON[request.type]" :size="22" />
				</span>
				<!-- Just what kind of request this is; who and what are in the sections below -->
				<div class="flex min-w-0 flex-1 flex-col gap-1">
					<h2 class="request-detail__headline">
						{{ t("providerRequests.detail.title", { type: t(`providerRequests.typeOptions.${request.type}`) }) }}
					</h2>
					<div class="flex items-center gap-2">
						<span class="request-detail__eyebrow">#{{ request.id }}</span>
						<n-tag size="small" round :bordered="false" :type="STATUS_TAG[request.status]">
							{{ t(`providerRequests.statusOptions.${request.status}`) }}
						</n-tag>
					</div>
				</div>
				<n-button v-if="closable" quaternary circle :aria-label="t('common.close')" @click="emit('close')">
					<template #icon><Icon name="carbon:close" :size="18" /></template>
				</n-button>
			</header>

			<div class="request-detail__scroll">
				<n-alert v-if="request.rejection_reason" type="error" :title="t('providerRequests.rejectionReason')">
					{{ request.rejection_reason }}
				</n-alert>

				<!-- Who: the provider asking, the company it is for, who sent it and when -->
				<section class="request-detail__section">
					<h3 class="request-detail__label">{{ t("providerRequests.detail.parties") }}</h3>
					<dl class="request-detail__parties">
						<div v-for="party in parties" :key="party.label" class="request-detail__party">
							<span class="request-detail__party-icon" aria-hidden="true"><Icon :name="party.icon" :size="16" /></span>
							<div class="flex min-w-0 flex-col">
								<dt class="request-detail__party-label">{{ party.label }}</dt>
								<dd class="request-detail__party-value">{{ party.value }}</dd>
							</div>
						</div>
					</dl>
				</section>

				<section class="request-detail__section">
					<h3 class="request-detail__label">{{ t("providerRequests.detail.asked") }}</h3>
					<ProviderRequestSummary :request :plan-names :show-company="false" />
				</section>

				<!-- The invoice an assignment or a top-up issues: defaults shown, each term adjustable before approving -->
				<section v-if="isPending && request.invoice_preview" class="request-detail__section">
					<h3 class="request-detail__label">{{ t("providerRequests.invoice.title") }}</h3>
					<div class="request-detail__card">
						<div class="request-detail__computed">
							<Icon name="carbon:calculator" :size="18" aria-hidden="true" />
							<div class="flex flex-col">
								<span class="request-detail__party-label">{{ t("providerRequests.invoice.computedLabel") }}</span>
								<strong class="request-detail__amount">
									{{ formatMoney(request.invoice_preview.computed_amount, request.invoice_preview.currency) }}
								</strong>
							</div>
						</div>
						<p class="request-detail__hint">{{ t("providerRequests.invoice.adjustHint") }}</p>
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<n-form-item :label="t('providerRequests.invoice.amount')" :show-feedback="false">
								<n-input v-model:value="terms.invoice_amount" inputmode="decimal" :disabled="!canApprove" />
							</n-form-item>
							<n-form-item :label="t('providerRequests.invoice.currency')" :show-feedback="false">
								<n-select v-model:value="terms.invoice_currency" :options="currencyOptions" :disabled="!canApprove" />
							</n-form-item>
							<n-form-item :label="t('providerRequests.invoice.dueAt')" :show-feedback="false">
								<n-date-picker
									v-model:formatted-value="terms.invoice_due_at"
									value-format="yyyy-MM-dd"
									type="date"
									:is-date-disabled="isPastDate"
									:disabled="!canApprove"
									class="w-full"
								/>
							</n-form-item>
						</div>
					</div>
				</section>
				<div v-else-if="request.invoice" class="request-detail__card request-detail__computed">
					<Icon name="carbon:receipt" :size="18" aria-hidden="true" />
					<span>{{ t("providerRequests.invoice.issued", { reference: request.invoice.reference, amount: formatMoney(request.invoice.amount, request.invoice.currency) }) }}</span>
				</div>

				<div v-if="isPending && canApprove && request.type === 'plan_assignment'" class="request-detail__override">
					<n-checkbox v-model:checked="terms.override_capacity">
						{{ t("providerRequests.overrideCapacity") }}
					</n-checkbox>
				</div>
			</div>

			<!-- The decision stays in reach at the bottom of the pane; rejecting asks for its reason in place -->
			<footer v-if="isPending && (canApprove || canReject)" class="request-detail__decision">
				<template v-if="isRejecting">
					<n-input
						ref="reasonInput"
						v-model:value="rejectReason"
						type="textarea"
						:autosize="{ minRows: 2, maxRows: 4 }"
						:placeholder="t('providerRequests.rejectReasonPlaceholder')"
						:aria-label="t('providerRequests.rejectReason')"
					/>
					<div class="flex justify-end gap-2">
						<n-button @click="isRejecting = false">{{ t("resourceCrud.form.cancel") }}</n-button>
						<n-button type="error" :loading="isDeciding" :disabled="!rejectReason.trim()" @click="reject">
							<template #icon><Icon name="carbon:close" :size="16" /></template>
							{{ t("providerRequests.decision.confirmReject") }}
						</n-button>
					</div>
				</template>
				<div v-else class="flex flex-wrap items-center justify-between gap-2">
					<span class="request-detail__hint">{{ t("providerRequests.decision.hint") }}</span>
					<div class="flex gap-2">
						<n-button v-if="canReject" secondary type="error" :disabled="isDeciding" @click="startReject">
							<template #icon><Icon name="carbon:close" :size="16" /></template>
							{{ t("providerRequests.reject") }}
						</n-button>
						<n-button v-if="canApprove" type="primary" :loading="isDeciding" @click="approve">
							<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
							{{ t("providerRequests.approve") }}
						</n-button>
					</div>
				</div>
			</footer>
		</template>

		<div v-else class="request-detail__empty">
			<Icon name="carbon:view" :size="28" />
			<p>{{ t("providerRequests.detail.pick") }}</p>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { ApproveProviderRequestPayload, ProviderRequest, ProviderRequestStatus } from "@/add-os/modules/providers/types"
import { NAlert, NButton, NCheckbox, NDatePicker, NFormItem, NInput, NSelect, NSpin, NTag, useMessage } from "naive-ui"
import { computed, nextTick, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canApproveProviderRequests, canRejectProviderRequests } from "@/add-os/config/permissions"
import ProviderRequestSummary from "@/add-os/modules/providers/components/ProviderRequestSummary.vue"
import { REQUEST_TYPE_ICON } from "@/add-os/modules/providers/utils/request-headline"
import { ApiError } from "@/add-os/services/api"
import { approveProviderRequest, getProviderRequest, rejectProviderRequest } from "@/add-os/services/provider-requests"
import { formatReportMoney as formatMoney } from "@/add-os/services/reports"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	requestId: number | null
	planNames: Record<number, string>
	currencyOptions: SelectOption[]
	/** Shows a close button in the header — for when the pane sits in a dialog. */
	closable?: boolean
}>()
const emit = defineEmits<{ (e: "decided", id: number): void; (e: "close"): void }>()

const { t } = useI18n()
const message = useMessage()

const STATUS_TAG: Record<ProviderRequestStatus, "warning" | "success" | "error" | "default"> = {
	pending: "warning",
	approved: "success",
	rejected: "error",
	cancelled: "default"
}

const canApprove = canApproveProviderRequests()
const canReject = canRejectProviderRequests()

const request = ref<ProviderRequest | null>(null)
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const terms = ref<Required<ApproveProviderRequestPayload>>({ override_capacity: false, invoice_amount: "", invoice_currency: "", invoice_due_at: "" })
const isRejecting = ref(false)
const rejectReason = ref("")
const isDeciding = ref(false)
const reasonInput = ref<InstanceType<typeof NInput> | null>(null)

const isPending = computed(() => request.value?.status === "pending")

/** The people around the request, each on its own line rather than packed into the header. */
const parties = computed(() => {
	const r = request.value
	if (!r) return []
	const out: { label: string; value: string; icon: string }[] = []
	if (r.provider) out.push({ label: t("providerRequests.fields.provider"), value: r.provider.name, icon: "carbon:partnership" })
	if (r.company) out.push({ label: t("providerRequests.fields.company"), value: r.company.legal_name ?? `#${r.company.id}`, icon: "carbon:enterprise" })
	if (r.submitted_by) out.push({ label: t("providerRequests.fields.submittedBy"), value: r.submitted_by.name, icon: "carbon:user" })
	out.push({ label: t("providerRequests.fields.submittedAt"), value: formatDateTime(r.created_at), icon: "carbon:time" })
	return out
})

function apiErrorMessage(caught: unknown): string {
	if (caught instanceof ApiError) {
		const errors = caught.data?.errors as Record<string, string[]> | undefined
		const first = errors ? Object.values(errors)[0]?.[0] : undefined
		return first ?? caught.data?.message ?? t("resourceCrud.mutations.genericError")
	}
	return t("resourceCrud.mutations.genericError")
}

function isPastDate(ts: number): boolean {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return ts < today.getTime()
}

// Each selection loads the full request: the list carries no invoice preview.
watch(
	() => props.requestId,
	async id => {
		isRejecting.value = false
		rejectReason.value = ""
		request.value = null
		loadError.value = null
		if (id === null) return
		isLoading.value = true
		try {
			const loaded = await getProviderRequest(id)
			if (props.requestId !== id) return
			request.value = loaded
			const preview = loaded.invoice_preview
			terms.value = {
				override_capacity: false,
				invoice_amount: preview?.amount ?? "",
				invoice_currency: preview?.currency ?? "",
				invoice_due_at: preview?.due_at ?? ""
			}
		} catch (caught) {
			loadError.value = apiErrorMessage(caught)
		} finally {
			isLoading.value = false
		}
	},
	{ immediate: true }
)

/** Only what the reviewer changed is sent: an absent term keeps the default. */
function approvePayload(): ApproveProviderRequestPayload {
	const preview = request.value?.invoice_preview
	const payload: ApproveProviderRequestPayload = {}
	if (terms.value.override_capacity) payload.override_capacity = true
	if (preview) {
		if (terms.value.invoice_amount && terms.value.invoice_amount !== preview.amount) payload.invoice_amount = terms.value.invoice_amount
		if (terms.value.invoice_currency && terms.value.invoice_currency !== preview.currency) payload.invoice_currency = terms.value.invoice_currency
		if (terms.value.invoice_due_at && terms.value.invoice_due_at !== preview.due_at) payload.invoice_due_at = terms.value.invoice_due_at
	}
	return payload
}

async function approve() {
	if (!request.value) return
	isDeciding.value = true
	try {
		await approveProviderRequest(request.value.id, approvePayload())
		message.success(t("providerRequests.approveSuccess"))
		emit("decided", request.value.id)
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isDeciding.value = false
	}
}

async function startReject() {
	isRejecting.value = true
	await nextTick()
	reasonInput.value?.focus()
}

async function reject() {
	if (!request.value || !rejectReason.value.trim()) return
	isDeciding.value = true
	try {
		await rejectProviderRequest(request.value.id, rejectReason.value.trim())
		message.success(t("providerRequests.rejectSuccess"))
		emit("decided", request.value.id)
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isDeciding.value = false
	}
}
</script>

<style scoped lang="scss">
.request-detail {
	display: flex;
	flex-direction: column;
	min-height: 100%;
	background: var(--add-surface);

	&__header {
		display: flex;
		gap: var(--add-space-4);
		align-items: flex-start;
		padding: var(--add-space-5) var(--add-space-6);
		border-bottom: var(--add-border-width-hairline) solid var(--add-border);
	}

	&__icon {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: var(--add-space-10);
		height: var(--add-space-10);
		color: var(--add-primary-on);
		background: var(--add-primary);
		border-radius: var(--add-radius-large);
	}

	&__eyebrow {
		font-size: var(--add-font-size-caption);
		color: var(--add-text-secondary);
		font-family: var(--add-font-family-numeric);
	}

	&__headline {
		margin: 0;
		font-size: var(--add-font-size-h4);
		font-weight: var(--add-font-weight-bold);
		line-height: var(--add-line-height-h4);
		color: var(--add-text-primary);
	}

	&__scroll {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: var(--add-space-6);
		padding: var(--add-space-5) var(--add-space-6);
		overflow-y: auto;
	}

	&__section {
		display: flex;
		flex-direction: column;
		gap: var(--add-space-3);
	}

	&__label {
		margin: 0;
		padding-bottom: var(--add-space-2);
		font-size: var(--add-font-size-body-sm);
		font-weight: var(--add-font-weight-strong);
		color: var(--add-text-primary);
		border-bottom: var(--add-border-width-hairline) solid var(--add-border);
	}

	&__parties {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: var(--add-space-4) var(--add-space-5);
		margin: 0;
	}

	&__party {
		display: flex;
		gap: var(--add-space-3);
		align-items: center;
		min-width: 0;
	}

	&__party-icon {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: var(--add-space-8);
		height: var(--add-space-8);
		color: var(--add-text-secondary);
		background: var(--add-surface-sunken);
		border-radius: var(--add-radius-pill);
	}

	&__party-label {
		font-size: var(--add-font-size-caption);
		color: var(--add-text-secondary);
	}

	&__party-value {
		margin: 0;
		font-size: var(--add-font-size-body-sm);
		font-weight: var(--add-font-weight-strong);
		color: var(--add-text-primary);
		overflow-wrap: anywhere;
	}

	&__card {
		display: flex;
		flex-direction: column;
		gap: var(--add-space-3);
		padding: var(--add-space-4);
		background: var(--add-surface-raised);
		border: var(--add-border-width-hairline) solid var(--add-border);
		border-radius: var(--add-radius-large);
	}

	&__computed {
		display: flex;
		flex-direction: row;
		gap: var(--add-space-3);
		align-items: center;
		color: var(--add-text-primary);
	}

	&__amount {
		font-size: var(--add-font-size-h5);
		font-family: var(--add-font-family-numeric);
		color: var(--add-text-primary);
	}

	&__override {
		padding: var(--add-space-3) var(--add-space-4);
		background: var(--add-surface-sunken);
		border: var(--add-border-width-hairline) solid var(--add-warning);
		border-radius: var(--add-radius-default);
	}

	&__hint {
		display: inline-flex;
		gap: var(--add-space-1);
		align-items: center;
		margin: 0;
		font-size: var(--add-font-size-body-sm);
		color: var(--add-text-secondary);
	}

	&__decision {
		position: sticky;
		bottom: 0;
		display: flex;
		flex-direction: column;
		gap: var(--add-space-3);
		padding: var(--add-space-4) var(--add-space-6);
		background: var(--add-surface-raised);
		border-top: var(--add-border-width-hairline) solid var(--add-border);
	}

	&__empty {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: var(--add-space-2);
		align-items: center;
		justify-content: center;
		padding: var(--add-space-10);
		color: var(--add-text-muted);
		text-align: center;
	}
}
</style>
