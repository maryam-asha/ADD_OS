<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t("invoices.title") }}</h1>

		<n-card>
			<div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
				<n-select v-model:value="query.status" :options="statusOptions" clearable :placeholder="t('invoices.filters.status')" />
				<n-select v-model:value="query.billed_to" :options="payerOptions" clearable :placeholder="t('invoices.filters.billedTo')" />
				<n-select v-model:value="query.provider_id" :options="providerOptions" clearable filterable :placeholder="t('invoices.filters.provider')" />
				<n-select v-model:value="query.overdue" :options="overdueOptions" clearable :placeholder="t('invoices.filters.overdue')" />
			</div>
			<n-data-table
				remote
				:columns="columns"
				:data="data"
				:loading="isLoading"
				:row-key="(row: Invoice) => row.id"
				:pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p: number) => (page = p) }"
			/>
		</n-card>

		<n-modal v-model:show="showPayment" preset="card" :title="t('invoices.payment.title')" class="max-w-lg">
			<p v-if="paymentTarget" class="mb-3 text-sm">
				{{ t("invoices.payment.remaining", { amount: formatMoney(paymentTarget.remaining, paymentTarget.currency) }) }}
			</p>
			<n-form ref="paymentFormRef" :model="paymentForm" :rules="paymentRules" label-placement="top">
				<div class="grid grid-cols-2 gap-3">
					<n-form-item path="amount" :label="t('invoices.payment.amount')">
						<n-input v-model:value="paymentForm.amount" inputmode="decimal" />
					</n-form-item>
					<n-form-item path="currency" :label="t('invoices.payment.currency')">
						<n-select v-model:value="paymentForm.currency" :options="currencyOptions" />
					</n-form-item>
				</div>
				<n-form-item path="method" :label="t('invoices.payment.method')">
					<n-select v-model:value="paymentForm.method" :options="methodOptions" />
				</n-form-item>
				<n-form-item path="receipt_number" :label="t('invoices.payment.receiptNumber')">
					<n-input v-model:value="paymentForm.receipt_number" />
				</n-form-item>
				<n-form-item path="paid_at" :label="t('invoices.payment.paidAt')">
					<n-date-picker v-model:formatted-value="paymentForm.paid_at" value-format="yyyy-MM-dd" type="date" :is-date-disabled="isFutureDate" class="w-full" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="showPayment = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="isSubmitting" @click="submitPayment">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>

		<n-modal v-model:show="showCancel" preset="card" :title="t('invoices.cancel.title')" class="max-w-md">
			<n-form ref="cancelFormRef" :model="cancelForm" :rules="cancelRules" label-placement="top">
				<n-form-item path="reason" :label="t('invoices.cancel.reason')">
					<n-input v-model:value="cancelForm.reason" type="textarea" :autosize="{ minRows: 2 }" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="showCancel = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="error" :loading="isSubmitting" @click="submitCancel">{{ t("invoices.cancel.confirm") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules, SelectOption } from "naive-ui"
import type { Invoice, InvoicePaymentMethod, InvoiceStatus, RecordInvoicePaymentPayload } from "@/add-os/modules/providers/types"
import { NButton, NCard, NDataTable, NDatePicker, NForm, NFormItem, NInput, NModal, NSelect, NTag, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canCancelInvoice, canRecordInvoicePayment } from "@/add-os/config/permissions"
import { ApiError } from "@/add-os/services/api"
import { listCurrencies } from "@/add-os/services/currencies"
import { cancelInvoice, listInvoices, recordInvoicePayment } from "@/add-os/services/invoices"
import { listProviders } from "@/add-os/services/providers"
import { formatReportMoney as formatMoney } from "@/add-os/services/reports"

const { t } = useI18n()
const message = useMessage()

const query = ref<Record<string, string | number | undefined>>({})
const page = ref(1)
const { data, isLoading, meta, refetch } = useResourceList<Invoice>(listInvoices, query, page)
const { data: providers } = useResourceList(listProviders)
const { data: currencies } = useResourceList(listCurrencies)

const STATUSES: InvoiceStatus[] = ["unpaid", "partially_paid", "paid", "cancelled"]
const METHODS: InvoicePaymentMethod[] = ["bank_transfer", "cash", "cheque", "other"]
const STATUS_TAG: Record<InvoiceStatus, "warning" | "info" | "success" | "default"> = {
	unpaid: "warning",
	partially_paid: "info",
	paid: "success",
	cancelled: "default"
}

const statusOptions = computed<SelectOption[]>(() => STATUSES.map(s => ({ label: t(`invoices.statusOptions.${s}`), value: s })))
const payerOptions = computed<SelectOption[]>(() => [
	{ label: t("invoices.payerOptions.provider"), value: "provider" },
	{ label: t("invoices.payerOptions.company"), value: "company" }
])
const overdueOptions = computed<SelectOption[]>(() => [
	{ label: t("invoices.filters.overdueOnly"), value: 1 },
	{ label: t("invoices.filters.notOverdue"), value: 0 }
])
const providerOptions = computed<SelectOption[]>(() => providers.value.map(p => ({ label: p.name, value: p.id })))
const currencyOptions = computed<SelectOption[]>(() => currencies.value.filter(c => c.is_active).map(c => ({ label: c.code, value: c.code })))
const methodOptions = computed<SelectOption[]>(() => METHODS.map(m => ({ label: t(`invoices.methods.${m}`), value: m })))

const isSubmitting = ref(false)

const columns = computed<DataTableColumns<Invoice>>(() => [
	{ title: t("invoices.columns.reference"), key: "reference" },
	{ title: t("invoices.columns.company"), key: "company", render: row => row.company?.legal_name ?? "—" },
	{ title: t("invoices.columns.provider"), key: "provider", render: row => row.provider?.name ?? t("invoices.direct") },
	{ title: t("invoices.columns.billedTo"), key: "billed_to", render: row => t(`invoices.payerOptions.${row.billed_to}`) },
	{ title: t("invoices.columns.amount"), key: "amount", render: row => formatMoney(row.amount, row.currency) },
	{ title: t("invoices.columns.paid"), key: "paid_amount", render: row => formatMoney(row.paid_amount, row.currency) },
	{ title: t("invoices.columns.remaining"), key: "remaining", render: row => formatMoney(row.remaining, row.currency) },
	{ title: t("invoices.columns.dueAt"), key: "due_at", render: row => row.due_at ?? "—" },
	{
		title: t("invoices.columns.status"),
		key: "status",
		render: row =>
			h("div", { class: "flex flex-wrap gap-1" }, [
				h(NTag, { size: "small", round: true, type: STATUS_TAG[row.status] }, { default: () => t(`invoices.statusOptions.${row.status}`) }),
				row.is_overdue ? h(NTag, { size: "small", round: true, type: "error" }, { default: () => t("invoices.overdue") }) : null
			])
	},
	{
		title: t("common.actions"),
		key: "actions",
		render: row =>
			h("div", { class: "flex gap-2" }, [
				canRecordInvoicePayment() && (row.status === "unpaid" || row.status === "partially_paid")
					? h(NButton, { size: "small", type: "success", onClick: () => openPayment(row) }, { default: () => t("invoices.payment.button") })
					: null,
				canCancelInvoice() && row.status === "unpaid"
					? h(NButton, { size: "small", type: "error", secondary: true, onClick: () => openCancel(row) }, { default: () => t("invoices.cancel.button") })
					: null
			])
	}
])

function today(): string {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isFutureDate(ts: number): boolean {
	return ts > Date.now()
}

function apiErrorMessage(caught: unknown): string {
	if (caught instanceof ApiError) {
		const errors = caught.data?.errors as Record<string, string[]> | undefined
		const first = errors ? Object.values(errors)[0]?.[0] : undefined
		return first ?? caught.data?.message ?? t("resourceCrud.mutations.genericError")
	}
	return t("resourceCrud.mutations.genericError")
}

// ── Record a payment ──────────────────────────────────────────────────────────
const showPayment = ref(false)
const paymentTarget = ref<Invoice | null>(null)
const paymentFormRef = ref<FormInst | null>(null)
const paymentForm = ref<RecordInvoicePaymentPayload>({ amount: "", currency: "", method: "bank_transfer", receipt_number: "", paid_at: today() })
const paymentRules: FormRules = {
	amount: { required: true, pattern: /^\d+(\.\d{1,2})?$/, message: t("invoices.payment.amountInvalid"), trigger: ["blur", "input"] },
	currency: { required: true, message: t("resourceCrud.form.required"), trigger: ["change"] },
	method: { required: true, message: t("resourceCrud.form.required"), trigger: ["change"] },
	paid_at: { required: true, message: t("resourceCrud.form.required"), trigger: ["change"] }
}

function openPayment(row: Invoice) {
	paymentTarget.value = row
	// What is left, not the full amount: a second payment of the full amount is refused.
	paymentForm.value = { amount: row.remaining, currency: row.currency, method: "bank_transfer", receipt_number: "", paid_at: today() }
	paymentFormRef.value?.restoreValidation()
	showPayment.value = true
}

async function submitPayment() {
	if (!paymentTarget.value) return
	try {
		await paymentFormRef.value?.validate()
	} catch {
		return
	}
	isSubmitting.value = true
	try {
		await recordInvoicePayment(paymentTarget.value.id, { ...paymentForm.value, receipt_number: paymentForm.value.receipt_number || null })
		message.success(t("invoices.payment.success"))
		showPayment.value = false
		await refetch()
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isSubmitting.value = false
	}
}

// ── Cancel ────────────────────────────────────────────────────────────────────
const showCancel = ref(false)
const cancelTarget = ref<Invoice | null>(null)
const cancelFormRef = ref<FormInst | null>(null)
const cancelForm = ref({ reason: "" })
const cancelRules: FormRules = {
	reason: { required: true, message: t("resourceCrud.form.required"), trigger: ["blur", "input"] }
}

function openCancel(row: Invoice) {
	cancelTarget.value = row
	cancelForm.value = { reason: "" }
	cancelFormRef.value?.restoreValidation()
	showCancel.value = true
}

async function submitCancel() {
	if (!cancelTarget.value) return
	try {
		await cancelFormRef.value?.validate()
	} catch {
		return
	}
	isSubmitting.value = true
	try {
		await cancelInvoice(cancelTarget.value.id, cancelForm.value.reason)
		message.success(t("invoices.cancel.success"))
		showCancel.value = false
		await refetch()
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isSubmitting.value = false
	}
}
</script>
