<template>
	<div v-if="profile" class="provider-header hidden sm:flex items-center gap-3 bg-primary-100 dark:bg-primary-900 px-3 py-1 rounded-full">
		<Icon name="carbon:workspace" class="text-primary" />
		<div class="text-xs">
			<span class="font-bold">{{ profile.name }}</span>
			<span class="mx-2 opacity-50">|</span>
			<span class="opacity-75">{{ t('providers.status.' + profile.status, profile.status) }}</span>
			<span class="mx-2 opacity-50">|</span>
			<span class="opacity-75">{{ t('providers.paymentTerms', 'Payment: ' + profile.payment_terms_days + ' days') }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/common/Icon.vue'
import { getProviderProfile } from '@/add-os/services/provider-portal'

const { t } = useI18n()
const profile = ref<any>(null)

onMounted(async () => {
	try {
		profile.value = await getProviderProfile()
	} catch (e) {
		// Ignore error if profile can't be loaded (e.g., not a provider)
	}
})
</script>
