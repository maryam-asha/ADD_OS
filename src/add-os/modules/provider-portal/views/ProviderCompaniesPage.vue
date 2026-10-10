<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t('providerPortal.companies', 'Companies') }}</h1>
		<n-card>
			<n-data-table remote :columns="columns" :data="data" :loading="isLoading" :pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p) => page = p }" />
		</n-card>
	</div>
</template>

<script setup lang="ts">
import { ref, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NDataTable, NButton } from 'naive-ui'
import { useResourceList } from '@/add-os/composables/useResourceList'
import { listProviderCompanies } from '@/add-os/services/provider-portal'

const { t } = useI18n()
const page = ref(1)
const { data, isLoading, meta } = useResourceList(listProviderCompanies, ref({}), page)

const columns = computed(() => [
	{ title: t('common.id', 'ID'), key: 'id' },
	{ title: t('companies.columns.legalName', 'Legal Name'), key: 'legal_name' },
	{ title: t('companies.columns.status', 'Status'), key: 'status', render: (row: any) => t(`companies.status.${row.status}`, row.status) },
	{
		title: t('common.actions', 'Actions'),
		key: 'actions',
		render: (row: any) => h(NButton, { size: 'small', type: 'primary' }, { default: () => t('common.view', 'View') })
	}
])
</script>
