<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t('providerPortal.requests', 'Requests') }}</h1>
		<div class="flex justify-end">
			<n-button type="primary" @click="showCreate = true">New Request</n-button>
		</div>
		<n-card>
			<n-data-table remote :columns="columns" :data="data" :loading="isLoading" :pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p) => page = p }" />
		</n-card>

		<!-- Create Request Modal -->
		<n-modal v-model:show="showCreate" preset="card" title="New Request" class="max-w-lg">
			<n-form>
				<n-form-item label="Request Type">
					<n-select v-model:value="form.type" :options="typeOptions" />
				</n-form-item>
				<!-- Dynamic fields based on type -->
				<template v-if="form.type === 'plan_assignment'">
					<n-form-item label="Company ID"><n-input-number v-model:value="form.company_id" /></n-form-item>
					<n-form-item label="Plan ID"><n-input-number v-model:value="form.payload.plan_id" /></n-form-item>
					<n-form-item label="Seats"><n-input-number v-model:value="form.payload.seats" /></n-form-item>
					<n-form-item label="Payer"><n-select v-model:value="form.payload.payer" :options="payerOptions" /></n-form-item>
				</template>
				<template v-if="form.type === 'plan_design'">
					<n-form-item label="Name (EN)"><n-input v-model:value="form.payload.name_en" /></n-form-item>
					<n-form-item label="Name (AR)"><n-input v-model:value="form.payload.name_ar" /></n-form-item>
					<n-form-item label="Price (Points)"><n-input-number v-model:value="form.payload.price_points" /></n-form-item>
					<n-form-item label="Duration (Days)"><n-input-number v-model:value="form.payload.duration_days" /></n-form-item>
					<n-form-item label="Is Subscription"><n-switch v-model:value="form.payload.is_subscription" /></n-form-item>
				</template>
				<template v-if="form.type === 'wallet_top_up'">
					<n-form-item label="Company ID"><n-input-number v-model:value="form.company_id" /></n-form-item>
					<n-form-item label="Points"><n-input-number v-model:value="form.payload.points" /></n-form-item>
					<n-form-item label="Payer"><n-select v-model:value="form.payload.payer" :options="payerOptions" /></n-form-item>
				</template>
				<template v-if="form.type === 'company_member'">
					<n-form-item label="Company ID"><n-input-number v-model:value="form.company_id" /></n-form-item>
					<n-form-item label="Name"><n-input v-model:value="form.payload.name" /></n-form-item>
					<n-form-item label="Phone"><n-input v-model:value="form.payload.phone" /></n-form-item>
				</template>
				<template v-if="form.type === 'company_admin'">
					<n-form-item label="Company ID"><n-input-number v-model:value="form.company_id" /></n-form-item>
					<n-form-item label="User ID"><n-input-number v-model:value="form.payload.user_id" /></n-form-item>
				</template>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="showCreate = false">Cancel</n-button>
					<n-button type="primary" @click="submitCreate">Submit</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import { ref, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NDataTable, NButton, NModal, NForm, NFormItem, NSelect, NInput, NInputNumber, NSwitch, useMessage, useDialog } from 'naive-ui'
import { useResourceList } from '@/add-os/composables/useResourceList'
import { listPortalRequests, createPortalRequest, cancelPortalRequest } from '@/add-os/services/provider-portal'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const page = ref(1)
const { data, isLoading, meta, refetch } = useResourceList(listPortalRequests, ref({}), page)

const showCreate = ref(false)
const form = ref({
	type: 'plan_assignment',
	company_id: null,
	payload: {} as any
})

const typeOptions = computed(() => [
	{ label: t('providerRequests.typeOptions.plan_assignment', 'Plan Assignment'), value: 'plan_assignment' },
	{ label: t('providerRequests.typeOptions.plan_design', 'Plan Design'), value: 'plan_design' },
	{ label: t('providerRequests.typeOptions.wallet_top_up', 'Wallet Top Up'), value: 'wallet_top_up' },
	{ label: t('providerRequests.typeOptions.company_member', 'Company Member'), value: 'company_member' },
	{ label: t('providerRequests.typeOptions.company_admin', 'Company Admin'), value: 'company_admin' }
])

const payerOptions = [
	{ label: t('invoices.payerOptions.provider', 'Provider'), value: 'provider' },
	{ label: t('invoices.payerOptions.company', 'Company'), value: 'company' }
]

const columns = computed(() => [
	{ title: t('common.id', 'ID'), key: 'id' },
	{ title: t('common.type', 'Type'), key: 'type', render: (row: any) => t(`providerRequests.typeOptions.${row.type}`, row.type) },
	{ title: t('providerRequests.status', 'Status'), key: 'status', render: (row: any) => t(`providerRequests.statusOptions.${row.status}`, row.status) },
	{
		title: t('common.actions', 'Actions'),
		key: 'actions',
		render: (row: any) => {
			if (row.status !== 'pending') return null
			return h(NButton, { size: 'small', type: 'error', onClick: () => handleCancel(row) }, { default: () => t('common.cancel', 'Cancel') })
		}
	}
])

async function submitCreate() {
	try {
		await createPortalRequest(form.value)
		message.success('Request created')
		showCreate.value = false
		refetch()
	} catch (e: any) {
		message.error(e.message)
	}
}

function handleCancel(row: any) {
	dialog.warning({
		title: 'Cancel Request',
		content: 'Are you sure?',
		positiveText: 'Yes',
		onPositiveClick: async () => {
			await cancelPortalRequest(row.id)
			refetch()
		}
	})
}
</script>
