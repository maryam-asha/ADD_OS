<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t("providerPortal.invoices") }}</h1>
			<p class="text-sm text-neutral-500">{{ t("invoices.readOnlyDescription") }}</p>
		</div>

		<n-card class="add-ledger-table">
			<div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<n-select v-model:value="query.status" :options="statusOptions" clearable :placeholder="t('invoices.filters.status')" />
				<n-select v-model:value="query.billed_to" :options="payerOptions" clearable :placeholder="t('invoices.filters.billedTo')" />
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

		<n-modal v-model:show="detailVisible" preset="card" :title="invoiceDetail ? `#${invoiceDetail.reference}` : t('invoices.title')" style="width: min(42rem, 95vw)">
			<div v-if="isLoadingDetail" class="flex justify-center py-12">
				<n-spin size="large" />
			</div>
			<n-alert v-else-if="isNotFound" type="warning" :title="t('common.notFound')" />
			<n-alert v-else-if="detailError" type="error" :title="detailError" />

			<div v-else-if="invoiceDetail" class="flex flex-col gap-4 text-sm">
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<div>
						<div class="text-neutral-500">{{ t("invoices.columns.amount") }}</div>
						<div class="font-bold">{{ formatMoney(invoiceDetail.amount, invoiceDetail.currency) }}</div>
					</div>
					<div>
						<div class="text-neutral-500">{{ t("invoices.columns.paid") }}</div>
						<div class="font-bold">{{ formatMoney(invoiceDetail.paid_amount, invoiceDetail.currency) }}</div>
					</div>
					<div>
						<div class="text-neutral-500">{{ t("invoices.columns.remaining") }}</div>
						<div class="font-bold">{{ formatMoney(invoiceDetail.remaining, invoiceDetail.currency) }}</div>
					</div>
					<div>
						<div class="text-neutral-500">{{ t("invoices.columns.status") }}</div>
						<n-tag size="small" round :type="STATUS_TAG[invoiceDetail.status]">{{ t(`invoices.statusOptions.${invoiceDetail.status}`) }}</n-tag>
						<n-tag v-if="invoiceDetail.is_overdue" size="small" round type="error" class="ms-1">{{ t("invoices.overdue") }}</n-tag>
					</div>
					<div>
						<div class="text-neutral-500">{{ t("invoices.columns.issuedAt") }}</div>
						<div>{{ invoiceDetail.issued_at ?? "—" }}</div>
					</div>
					<div>
						<div class="text-neutral-500">{{ t("invoices.columns.dueAt") }}</div>
						<div>{{ invoiceDetail.due_at ?? "—" }}</div>
					</div>
					<div>
						<div class="text-neutral-500">{{ t("invoices.columns.company") }}</div>
						<div>{{ invoiceDetail.company?.legal_name ?? "—" }}</div>
					</div>
					<div>
						<div class="text-neutral-500">{{ t("invoices.columns.billedTo") }}</div>
						<div>{{ t(`invoices.payerOptions.${invoiceDetail.billed_to}`) }}</div>
					</div>
				</div>
				<p v-if="invoiceDetail.description">{{ invoiceDetail.description }}</p>

				<div v-if="invoiceDetail.payments?.length" class="flex flex-col gap-2">
					<h3 class="font-bold">{{ t("invoices.payments") }}</h3>
					<div v-for="payment in invoiceDetail.payments" :key="payment.id" class="flex justify-between gap-2 rounded border border-black/5 p-2">
						<span>{{ payment.paid_at ?? "—" }} · {{ t(`invoices.methods.${payment.method}`) }}</span>
						<span :class="{ 'line-through text-neutral-400': payment.voided }">{{ formatMoney(payment.amount, invoiceDetail.currency) }}</span>
					</div>
				</div>
			</div>

			<template #footer>
				<div class="flex justify-end">
					<n-button @click="detailVisible = false">{{ t("common.close") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Invoice, InvoiceStatus } from "@/add-os/modules/providers/types"
import { NAlert, NButton, NCard, NDataTable, NModal, NSelect, NSpin, NTag } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { ApiError } from "@/add-os/services/api"
import { getPortalInvoice, listPortalInvoices } from "@/add-os/services/provider-portal"
import { formatReportMoney as formatMoney } from "@/add-os/services/reports"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const query = ref<Record<string, string | number | undefined>>({})
const page = ref(1)
const { data, isLoading, meta } = useResourceList<Invoice>(listPortalInvoices, query, page)

const STATUSES: InvoiceStatus[] = ["unpaid", "partially_paid", "paid", "cancelled"]
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

const detailVisible = ref(false)
const isLoadingDetail = ref(false)
const invoiceDetail = ref<Invoice | null>(null)
const isNotFound = ref(false)
const detailError = ref<string | null>(null)

async function openDetail(id: number) {
	detailVisible.value = true
	isLoadingDetail.value = true
	isNotFound.value = false
	detailError.value = null
	invoiceDetail.value = null
	try {
		invoiceDetail.value = await getPortalInvoice(id)
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 404) isNotFound.value = true
		else detailError.value = caught instanceof ApiError ? (caught.data?.message ?? t("invoices.loadError")) : t("invoices.loadError")
	} finally {
		isLoadingDetail.value = false
	}
}

const columns = computed<DataTableColumns<Invoice>>(() => [
	{ title: t("invoices.columns.reference"), key: "reference" },
	{ title: t("invoices.columns.company"), key: "company", render: row => row.company?.legal_name ?? "—" },
	{ title: t("invoices.columns.billedTo"), key: "billed_to", render: row => t(`invoices.payerOptions.${row.billed_to}`) },
	{ title: t("invoices.columns.amount"), key: "amount", render: row => formatMoney(row.amount, row.currency) },
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
			h(
				NButton,
				{ size: "small", type: "primary", text: true, onClick: () => openDetail(row.id) },
				{ icon: () => h(Icon, { name: "carbon:view", size: 16 }), default: () => t("common.view") }
			)
	}
])
</script>
