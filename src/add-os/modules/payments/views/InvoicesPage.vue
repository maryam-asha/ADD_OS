<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t('invoices.title', 'Invoices') }}</h1>

		<n-card>
			<div class="mb-4 flex gap-4">
				<n-select v-model:value="query.status" :options="statusOptions" clearable :placeholder="t('invoices.status', 'Status')" class="w-48" />
			</div>
			<n-data-table remote :columns="columns" :data="data" :loading="isLoading" :pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p) => page = p }" />
		</n-card>

		<!-- Record Payment Modal -->
		<n-modal v-model:show="showPayment" preset="card" title="Record Payment" class="max-w-lg">
			<n-form>
				<n-form-item label="Amount"><n-input-number v-model:value="paymentForm.amount" /></n-form-item>
				<n-form-item label="Currency"><n-input v-model:value="paymentForm.currency" /></n-form-item>
				<n-form-item label="Method"><n-input v-model:value="paymentForm.method" /></n-form-item>
				<n-form-item label="Receipt Number"><n-input v-model:value="paymentForm.receipt_number" /></n-form-item>
				<n-form-item label="Payment Date"><n-input v-model:value="paymentForm.payment_date" /></n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="showPayment = false">Cancel</n-button>
					<n-button type="primary" @click="submitPayment">Submit</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import { ref, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NDataTable, NSelect, NButton, NModal, NForm, NFormItem, NInput, NInputNumber, useMessage, useDialog, NTag } from 'naive-ui'
import { useResourceList } from '@/add-os/composables/useResourceList'
import { listInvoices, recordInvoicePayment, cancelInvoice } from '@/add-os/services/invoices'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()

const query = ref<any>({})
const page = ref(1)

const { data, isLoading, meta, refetch } = useResourceList(listInvoices, query, page)

const statusOptions = computed(() => [
	{ label: t('invoices.statusOptions.unpaid', 'Unpaid'), value: 'unpaid' },
	{ label: t('invoices.statusOptions.partial', 'Partial'), value: 'partial' },
	{ label: t('invoices.statusOptions.paid', 'Paid'), value: 'paid' },
	{ label: t('invoices.statusOptions.cancelled', 'Cancelled'), value: 'cancelled' }
])

const showPayment = ref(false)
const paymentInvoiceId = ref<number | null>(null)
const paymentForm = ref({
	amount: 0,
	currency: '',
	method: 'bank_transfer',
	receipt_number: '',
	payment_date: ''
})

const columns = computed(() => [
	{ title: t('common.id', 'ID'), key: 'id' },
	{ title: t('common.amount', 'Amount'), key: 'amount' },
	{ title: t('common.currency', 'Currency'), key: 'currency' },
	{ title: t('invoices.status', 'Status'), key: 'status', render: (row: any) => t(`invoices.statusOptions.${row.status}`, row.status) },
	{ title: t('common.overdue', 'Overdue'), key: 'overdue', render: (row: any) => row.overdue ? h(NTag, { type: 'error' }, { default: () => t('common.overdue', 'Overdue') }) : '' },
	{
		title: t('common.actions', 'Actions'),
		key: 'actions',
		render: (row: any) => h('div', { class: 'flex gap-2' }, [
			authStore.hasPermission('invoices.record_payment') && ['unpaid', 'partial'].includes(row.status) ? h(NButton, { size: 'small', type: 'success', onClick: () => handlePayment(row) }, { default: () => t('common.pay', 'Pay') }) : null,
			authStore.hasPermission('invoices.cancel') && ['unpaid'].includes(row.status) ? h(NButton, { size: 'small', type: 'error', onClick: () => handleCancel(row) }, { default: () => t('common.cancel', 'Cancel') }) : null
		])
	}
])

function handlePayment(row: any) {
	paymentInvoiceId.value = row.id
	paymentForm.value = {
		amount: row.amount,
		currency: row.currency,
		method: 'bank_transfer',
		receipt_number: '',
		payment_date: new Date().toISOString().split('T')[0]
	}
	showPayment.value = true
}

async function submitPayment() {
	if (!paymentInvoiceId.value) return
	try {
		await recordInvoicePayment(paymentInvoiceId.value, paymentForm.value)
		message.success('Payment recorded')
		showPayment.value = false
		refetch()
	} catch (e: any) {
		message.error(e.message)
	}
}

function handleCancel(row: any) {
	dialog.error({
		title: 'Cancel Invoice',
		content: 'Are you sure you want to cancel this invoice?',
		positiveText: 'Cancel Invoice',
		negativeText: 'Close',
		onPositiveClick: async () => {
			try {
				await cancelInvoice(row.id, 'Cancelled by admin') // Should prompt for reason
				message.success('Cancelled')
				refetch()
			} catch (e: any) {
				message.error(e.message)
			}
		}
	})
}
</script>
