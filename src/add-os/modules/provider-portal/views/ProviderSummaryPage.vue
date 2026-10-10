<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t('providerPortal.summary', 'Summary') }}</h1>
		<div v-if="summary" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<n-card :title="t('providerPortal.companies', 'Companies')">
				<div class="text-2xl">{{ summary.companies.total }}</div>
				<div class="text-sm opacity-70">{{ summary.companies.active }} Active</div>
			</n-card>
			<n-card :title="t('providerPortal.members', 'Members')">
				<div class="text-2xl">{{ summary.members }}</div>
			</n-card>
			<n-card :title="t('providerPortal.requests', 'Requests')">
				<div class="text-2xl">{{ summary.requests.pending }} Pending</div>
				<div class="text-sm opacity-70">{{ summary.office_requests.open }} Open Office Requests</div>
			</n-card>
			<n-card :title="t('providerPortal.invoices', 'Invoices')">
				<div class="text-2xl">{{ summary.invoices.open }} Open</div>
				<div class="text-sm text-red-500">{{ summary.invoices.overdue }} Overdue</div>
			</n-card>
		</div>

		<div v-if="summary?.balances" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<n-card v-for="(bal, currency) in summary.balances" :key="currency" :title="`Balance (${currency})`">
				<div class="text-lg">Provider: {{ bal.provider }}</div>
				<div class="text-lg">Companies: {{ bal.companies }}</div>
				<div class="text-lg text-red-500">Overdue: {{ bal.overdue }}</div>
			</n-card>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard } from 'naive-ui'
import { getProviderSummary } from '@/add-os/services/provider-portal'

const { t } = useI18n()
const summary = ref<any>(null)

onMounted(async () => {
	try {
		summary.value = await getProviderSummary()
	} catch (e) {
		console.error(e)
	}
})
</script>
