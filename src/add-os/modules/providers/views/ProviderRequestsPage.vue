<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t("providerRequests.title") }}</h1>
		<n-card>
			<div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<n-select v-model:value="query.status" :options="statusOptions" :placeholder="t('providerRequests.status')" />
				<n-select v-model:value="query.type" :options="typeOptions" clearable :placeholder="t('providerRequests.filters.type')" />
				<n-select v-model:value="query.provider_id" :options="providerOptions" clearable filterable :placeholder="t('providerRequests.filters.provider')" />
			</div>
			<n-data-table
				remote
				:columns="columns"
				:data="data"
				:loading="isLoading"
				:row-key="(row: ProviderRequest) => row.id"
				:pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p: number) => (page = p) }"
			/>
		</n-card>

		<!-- Review: what was asked, the invoice it will issue, and the decision -->
		<n-modal v-model:show="reviewVisible" preset="card" :title="reviewTitle" style="width: min(44rem, 95vw)">
			<div v-if="isLoadingReview" class="flex justify-center py-12"><n-spin size="large" /></div>
			<n-alert v-else-if="reviewError" type="error" :title="reviewError" />
			<div v-else-if="review" class="flex flex-col gap-4">
				<div class="flex flex-wrap gap-2 text-sm text-neutral-500">
					<span>{{ review.provider?.name }}</span>
					<span v-if="review.submitted_by">· {{ review.submitted_by.name }}</span>
					<span>· {{ formatDateTime(review.created_at) }}</span>
				</div>

				<ProviderRequestSummary :request="review" :plan-names="planNames" />

				<n-alert v-if="review.rejection_reason" type="error" :title="t('providerRequests.rejectionReason')">{{ review.rejection_reason }}</n-alert>

				<!-- The invoice an assignment or a top-up issues: defaults shown, each one adjustable -->
				<div v-if="review.status === 'pending' && review.invoice_preview" class="flex flex-col gap-3 rounded-lg border border-black/5 p-3">
					<h3 class="font-bold">{{ t("providerRequests.invoice.title") }}</h3>
					<p class="text-sm text-neutral-500">
						{{ t("providerRequests.invoice.computed", { amount: formatMoney(review.invoice_preview.computed_amount, review.invoice_preview.currency) }) }}
					</p>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<n-form-item :label="t('providerRequests.invoice.amount')" :show-feedback="false">
							<n-input v-model:value="approveForm.invoice_amount" inputmode="decimal" />
						</n-form-item>
						<n-form-item :label="t('providerRequests.invoice.currency')" :show-feedback="false">
							<n-select v-model:value="approveForm.invoice_currency" :options="currencyOptions" />
						</n-form-item>
						<n-form-item :label="t('providerRequests.invoice.dueAt')" :show-feedback="false">
							<n-date-picker v-model:formatted-value="approveForm.invoice_due_at" value-format="yyyy-MM-dd" type="date" :is-date-disabled="isPastDate" class="w-full" />
						</n-form-item>
					</div>
				</div>
				<div v-else-if="review.invoice" class="text-sm">
					{{ t("providerRequests.invoice.issued", { reference: review.invoice.reference, amount: formatMoney(review.invoice.amount, review.invoice.currency) }) }}
				</div>

				<n-checkbox v-if="review.status === 'pending' && review.type === 'plan_assignment'" v-model:checked="approveForm.override_capacity">
					{{ t("providerRequests.overrideCapacity") }}
				</n-checkbox>

				<n-form-item v-if="review.status === 'pending' && canRejectProviderRequests()" :label="t('providerRequests.rejectReason')" :show-feedback="false">
					<n-input v-model:value="rejectReason" type="textarea" :autosize="{ minRows: 2 }" :placeholder="t('providerRequests.rejectReasonPlaceholder')" />
				</n-form-item>
			</div>

			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="reviewVisible = false">{{ t("common.close") }}</n-button>
					<template v-if="review?.status === 'pending'">
						<n-button v-if="canRejectProviderRequests()" type="error" secondary :loading="isDeciding" :disabled="!rejectReason.trim()" @click="reject">
							{{ t("providerRequests.reject") }}
						</n-button>
						<n-button v-if="canApproveProviderRequests()" type="success" :loading="isDeciding" @click="approve">
							{{ t("providerRequests.approve") }}
						</n-button>
					</template>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ApproveProviderRequestPayload, ProviderRequest, ProviderRequestStatus, ProviderRequestType } from "@/add-os/modules/providers/types"
import { NAlert, NButton, NCard, NCheckbox, NDataTable, NDatePicker, NFormItem, NInput, NModal, NSelect, NSpin, NTag, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canApproveProviderRequests, canRejectProviderRequests } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import ProviderRequestSummary from "@/add-os/modules/providers/components/ProviderRequestSummary.vue"
import { ApiError } from "@/add-os/services/api"
import { listCurrencies } from "@/add-os/services/currencies"
import { listPlans } from "@/add-os/services/plans"
import { approveProviderRequest, getProviderRequest, listProviderRequests, rejectProviderRequest } from "@/add-os/services/provider-requests"
import { listProviders } from "@/add-os/services/providers"
import { formatReportMoney as formatMoney } from "@/add-os/services/reports"
import { formatDateTime } from "@/add-os/utils/format"

const { t } = useI18n()
const message = useMessage()

const query = ref<Record<string, string | number | undefined>>({ status: "pending" })
const page = ref(1)
const { data, isLoading, meta, refetch } = useResourceList<ProviderRequest>(listProviderRequests, query, page)
const { data: providers } = useResourceList(listProviders)
const { data: currencies } = useResourceList(listCurrencies)
const { data: plans } = useResourceList(() => listPlans())

const STATUSES: ProviderRequestStatus[] = ["pending", "approved", "rejected", "cancelled"]
const TYPES: ProviderRequestType[] = ["plan_assignment", "plan_design", "wallet_top_up", "company_member", "company_admin"]
const STATUS_TAG: Record<ProviderRequestStatus, "warning" | "success" | "error" | "default"> = {
	pending: "warning",
	approved: "success",
	rejected: "error",
	cancelled: "default"
}

const statusOptions = computed<SelectOption[]>(() => STATUSES.map(s => ({ label: t(`providerRequests.statusOptions.${s}`), value: s })))
const typeOptions = computed<SelectOption[]>(() => TYPES.map(type => ({ label: t(`providerRequests.typeOptions.${type}`), value: type })))
const providerOptions = computed<SelectOption[]>(() => providers.value.map(p => ({ label: p.name, value: p.id })))
const currencyOptions = computed<SelectOption[]>(() => currencies.value.filter(c => c.is_active).map(c => ({ label: c.code, value: c.code })))
const planNames = computed<Record<number, string>>(() =>
	Object.fromEntries(plans.value.map(p => [p.id, pickLocalized(p.name, currentLocale.value) || `#${p.id}`]))
)

const columns = computed<DataTableColumns<ProviderRequest>>(() => [
	{ title: t("common.id"), key: "id", width: 70 },
	{ title: t("providerRequests.columns.type"), key: "type", render: row => t(`providerRequests.typeOptions.${row.type}`) },
	{ title: t("providerRequests.columns.provider"), key: "provider", render: row => row.provider?.name ?? "—" },
	{ title: t("providerRequests.columns.company"), key: "company", render: row => row.company?.legal_name ?? "—" },
	{ title: t("providerRequests.columns.submittedAt"), key: "created_at", render: row => formatDateTime(row.created_at) },
	{
		title: t("providerRequests.status"),
		key: "status",
		render: row => h(NTag, { size: "small", round: true, type: STATUS_TAG[row.status] }, { default: () => t(`providerRequests.statusOptions.${row.status}`) })
	},
	{
		title: t("common.actions"),
		key: "actions",
		render: row =>
			h(
				NButton,
				{ size: "small", type: row.status === "pending" ? "primary" : "default", secondary: true, onClick: () => openReview(row.id) },
				{ default: () => (row.status === "pending" ? t("providerRequests.review") : t("common.view")) }
			)
	}
])

function today(): string {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isPastDate(ts: number): boolean {
	return ts < new Date(`${today()}T00:00:00`).getTime()
}

function apiErrorMessage(caught: unknown): string {
	if (caught instanceof ApiError) {
		const errors = caught.data?.errors as Record<string, string[]> | undefined
		const first = errors ? Object.values(errors)[0]?.[0] : undefined
		return first ?? caught.data?.message ?? t("resourceCrud.mutations.genericError")
	}
	return t("resourceCrud.mutations.genericError")
}

// ── Review ────────────────────────────────────────────────────────────────────
const reviewVisible = ref(false)
const isLoadingReview = ref(false)
const reviewError = ref<string | null>(null)
const review = ref<ProviderRequest | null>(null)
const approveForm = ref<Required<ApproveProviderRequestPayload>>({ override_capacity: false, invoice_amount: "", invoice_currency: "", invoice_due_at: "" })
const rejectReason = ref("")
const isDeciding = ref(false)

const reviewTitle = computed(() =>
	review.value ? `${t(`providerRequests.typeOptions.${review.value.type}`)} #${review.value.id}` : t("providerRequests.title")
)

async function openReview(id: number) {
	reviewVisible.value = true
	isLoadingReview.value = true
	reviewError.value = null
	review.value = null
	rejectReason.value = ""
	try {
		const loaded = await getProviderRequest(id)
		review.value = loaded
		const preview = loaded.invoice_preview
		approveForm.value = {
			override_capacity: false,
			invoice_amount: preview?.amount ?? "",
			invoice_currency: preview?.currency ?? "",
			invoice_due_at: preview?.due_at ?? ""
		}
	} catch (caught) {
		reviewError.value = apiErrorMessage(caught)
	} finally {
		isLoadingReview.value = false
	}
}

/** Only what the reviewer changed is sent: an absent term keeps the default. */
function approvePayload(): ApproveProviderRequestPayload {
	const preview = review.value?.invoice_preview
	const payload: ApproveProviderRequestPayload = {}
	if (approveForm.value.override_capacity) payload.override_capacity = true
	if (preview) {
		if (approveForm.value.invoice_amount && approveForm.value.invoice_amount !== preview.amount) payload.invoice_amount = approveForm.value.invoice_amount
		if (approveForm.value.invoice_currency && approveForm.value.invoice_currency !== preview.currency) payload.invoice_currency = approveForm.value.invoice_currency
		if (approveForm.value.invoice_due_at && approveForm.value.invoice_due_at !== preview.due_at) payload.invoice_due_at = approveForm.value.invoice_due_at
	}
	return payload
}

async function approve() {
	if (!review.value) return
	isDeciding.value = true
	try {
		await approveProviderRequest(review.value.id, approvePayload())
		message.success(t("providerRequests.approveSuccess"))
		reviewVisible.value = false
		await refetch()
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isDeciding.value = false
	}
}

async function reject() {
	if (!review.value || !rejectReason.value.trim()) return
	isDeciding.value = true
	try {
		await rejectProviderRequest(review.value.id, rejectReason.value.trim())
		message.success(t("providerRequests.rejectSuccess"))
		reviewVisible.value = false
		await refetch()
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isDeciding.value = false
	}
}
</script>
