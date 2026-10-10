<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t('providers.title', 'Providers') }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('providers.error', 'Error loading providers')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="showCreate = true">
				{{ t('providers.create', 'Create Provider') }}
			</n-button>
		</div>

		<n-card>
			<n-data-table :columns="columns" :data="data" :loading="isLoading" />
		</n-card>

		<!-- Create/Edit Modal -->
		<n-modal v-model:show="showCreate" preset="card" :title="t('providers.create', 'Create Provider')" class="max-w-lg">
			<n-form>
				<n-form-item :label="t('providers.name', 'Name')">
					<n-input v-model:value="form.name" />
				</n-form-item>
				<n-form-item :label="t('providers.contract', 'Contract Number')">
					<n-input v-model:value="form.contract_ref" />
				</n-form-item>
				<n-form-item :label="t('providers.paymentTerms', 'Payment Terms (Days)')">
					<n-input-number v-model:value="form.payment_terms_days" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="showCreate = false">{{ t('common.cancel', 'Cancel') }}</n-button>
					<n-button type="primary" @click="submitCreate">{{ t('common.submit', 'Submit') }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import { ref, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NDataTable, NAlert, NCard, NModal, NForm, NFormItem, NInput, NInputNumber, useDialog, useMessage } from 'naive-ui'
import { useResourceList } from '@/add-os/composables/useResourceList'
import { listProviders, createProvider, updateProviderStatus } from '@/add-os/services/providers'

const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()
const { data, isLoading, error, refetch } = useResourceList(listProviders)

const showCreate = ref(false)
const form = ref({ name: '', contract_ref: '', payment_terms_days: 15 })

const columns = computed(() => [
	{ title: t('providers.name', 'Name'), key: 'name' },
	{ title: t('providers.contract', 'Contract Number'), key: 'contract_ref' },
	{ title: t('common.status', 'Status'), key: 'status', render: (row: any) => t(`providers.status.${row.status}`) },
	{ title: t('providers.paymentTerms', 'Payment Terms'), key: 'payment_terms_days' },
	{
		title: t('common.actions', 'Actions'),
		key: 'actions',
		render: (row: any) => h(NButton, {
			type: row.status === 'active' ? 'error' : 'success',
			onClick: () => toggleStatus(row)
		}, { default: () => row.status === 'active' ? t('providers.deactivate', 'Deactivate') : t('providers.activate', 'Activate') })
	}
])

async function submitCreate() {
	try {
		await createProvider(form.value)
		message.success(t('providers.created', 'Provider created successfully'))
		showCreate.value = false
		refetch()
	} catch (e: any) {
		message.error(e.message)
	}
}

function toggleStatus(row: any) {
	if (row.status === 'active') {
		dialog.warning({
			title: t('providers.deactivateConfirmTitle', 'Deactivate Provider'),
			content: t('providers.deactivateConfirmContent', 'Deactivating a provider will prevent their users from logging in, but their companies will remain active.'),
			positiveText: t('common.confirm', 'Confirm'),
			negativeText: t('common.cancel', 'Cancel'),
			onPositiveClick: async () => {
				await updateProviderStatus(row.id, 'inactive')
				refetch()
			}
		})
	} else {
		updateProviderStatus(row.id, 'active').then(() => refetch())
	}
}
</script>
