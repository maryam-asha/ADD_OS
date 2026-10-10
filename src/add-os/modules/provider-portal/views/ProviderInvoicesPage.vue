<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t('providerPortal.invoices', 'Invoices') }}</h1>
		<n-card>
			<n-data-table remote :columns="columns" :data="data" :loading="isLoading" :pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p) => page = p }" />
		</n-card>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NDataTable } from 'naive-ui'
import { useResourceList } from '@/add-os/composables/useResourceList'
import { listPortalInvoices } from '@/add-os/services/provider-portal'

const { t } = useI18n()
const page = ref(1)
const { data, isLoading, meta } = useResourceList(listPortalInvoices, ref({}), page)

const columns = computed(() => [
	{ title: t('common.id'), key: 'id' },
	{ title: t('common.amount'), key: 'amount' },
	{ title: t('common.currency'), key: 'currency' },
	{ title: t('invoices.status'), key: 'status', render: (row: any) => t(`invoices.statusOptions.${row.status}`) },
	{ title: t('common.dueDate'), key: 'due_date' },
	{ title: t('common.overdue'), key: 'overdue', render: (row: any) => row.overdue ? t('common.yes') : t('common.no') }
])
</script>
