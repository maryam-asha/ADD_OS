<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t('providerPortal.officeRequests', 'Office Requests') }}</h1>
		<div class="flex justify-end">
			<n-button type="primary" @click="showCreate = true">New Office Request</n-button>
		</div>
		<n-card>
			<n-data-table remote :columns="columns" :data="data" :loading="isLoading" :pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p) => page = p }" />
		</n-card>

		<!-- Create Modal -->
		<n-modal v-model:show="showCreate" preset="card" title="New Office Request" class="max-w-lg">
			<n-form>
				<n-form-item label="Prospect Name">
					<n-input v-model:value="form.prospect_name" />
				</n-form-item>
				<n-form-item label="Contact Info">
					<n-input v-model:value="form.contact" />
				</n-form-item>
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
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NDataTable, NButton, NModal, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { useResourceList } from '@/add-os/composables/useResourceList'
import { listPortalOfficeRequests, createPortalOfficeRequest } from '@/add-os/services/provider-portal'

const { t } = useI18n()
const message = useMessage()
const page = ref(1)
const { data, isLoading, meta, refetch } = useResourceList(listPortalOfficeRequests, ref({}), page)

const showCreate = ref(false)
const form = ref({
	prospect_name: '',
	contact: ''
})

const columns = computed(() => [
	{ title: t('common.id', 'ID'), key: 'id' },
	{ title: t('privateOfficeRequests.columns.prospectName', 'Prospect Name'), key: 'prospect_name' },
	{ title: t('privateOfficeRequests.columns.contact', 'Contact'), key: 'contact' },
	{ title: t('privateOfficeRequests.columns.status', 'Status'), key: 'status', render: (row: any) => t(`privateOfficeRequests.status.${row.status}`) }
])

async function submitCreate() {
	try {
		await createPortalOfficeRequest(form.value)
		message.success('Request created')
		showCreate.value = false
		refetch()
	} catch (e: any) {
		message.error(e.message)
	}
}
</script>
