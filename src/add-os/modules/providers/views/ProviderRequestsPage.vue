<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t('providerRequests.title', 'Provider Requests') }}</h1>

		<n-card>
			<div class="mb-4 flex gap-4">
				<n-select v-model:value="query.status" :options="statusOptions" clearable :placeholder="t('providerRequests.status', 'Status')" class="w-48" />
			</div>
			<n-data-table remote :columns="columns" :data="data" :loading="isLoading" :pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p) => page = p }" />
		</n-card>
	</div>
</template>

<script setup lang="ts">
import { ref, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NDataTable, NSelect, NButton, useDialog, useMessage } from 'naive-ui'
import { useResourceList } from '@/add-os/composables/useResourceList'
import { listProviderRequests, approveProviderRequest, rejectProviderRequest } from '@/add-os/services/provider-requests'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()
const authStore = useAuthStore()

const query = ref<any>({ status: 'pending' })
const page = ref(1)

const { data, isLoading, meta, refetch } = useResourceList(listProviderRequests, query, page)

const statusOptions = computed(() => [
	{ label: t('providerRequests.statusOptions.pending', 'Pending'), value: 'pending' },
	{ label: t('providerRequests.statusOptions.approved', 'Approved'), value: 'approved' },
	{ label: t('providerRequests.statusOptions.rejected', 'Rejected'), value: 'rejected' }
])

const columns = computed(() => [
	{ title: t('common.id', 'ID'), key: 'id' },
	{ title: t('common.type', 'Type'), key: 'type', render: (row: any) => t(`providerRequests.typeOptions.${row.type}`, row.type) },
	{ title: t('providerRequests.status', 'Status'), key: 'status', render: (row: any) => t(`providerRequests.statusOptions.${row.status}`, row.status) },
	{
		title: t('common.actions', 'Actions'),
		key: 'actions',
		render: (row: any) => {
			if (row.status !== 'pending') return null
			return h('div', { class: 'flex gap-2' }, [
				authStore.hasPermission('provider-requests.approve') ? h(NButton, { type: 'success', size: 'small', onClick: () => handleApprove(row) }, { default: () => t('providerRequests.approve', 'Approve') }) : null,
				authStore.hasPermission('provider-requests.reject') ? h(NButton, { type: 'error', size: 'small', onClick: () => handleReject(row) }, { default: () => t('providerRequests.reject', 'Reject') }) : null
			])
		}
	}
])

function handleApprove(row: any) {
	dialog.success({
		title: 'Approve Request',
		content: 'Are you sure you want to approve this request?',
		positiveText: 'Approve',
		negativeText: 'Cancel',
		onPositiveClick: async () => {
			await approveProviderRequest(row.id)
			message.success('Approved')
			refetch()
		}
	})
}

function handleReject(row: any) {
	dialog.error({
		title: 'Reject Request',
		content: 'Are you sure you want to reject this request?',
		positiveText: 'Reject',
		negativeText: 'Cancel',
		onPositiveClick: async () => {
			await rejectProviderRequest(row.id, 'Rejected by admin') // Should prompt for reason in a real app
			message.success('Rejected')
			refetch()
		}
	})
}
</script>
