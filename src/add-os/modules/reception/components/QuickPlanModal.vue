<!-- src/add-os/modules/reception/components/QuickPlanModal.vue -->
<!--
	Selling a plan from the reception desk: the Plan Purchases page itself,
	inside a dialog, so the desk sells with the same form, pricing and receipt
	— there is one plan sale, not two.
-->
<template>
	<n-modal
		:show
		preset="card"
		:title="t('nav.pages.planPurchases')"
		class="max-w-4xl rounded-2xl shadow-xl"
		closable
		content-style="max-height: 80vh; overflow-y: auto; padding-block: 0.5rem;"
		@update:show="emit('update:show', $event)"
	>
		<PlanPurchasesPage in-modal :preselected-user-id @success="emit('success')" />
	</n-modal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui"
import { useI18n } from "vue-i18n"
import PlanPurchasesPage from "@/add-os/modules/plans/views/PlanPurchasesPage.vue"

defineProps<{
	show: boolean
	preselectedUserId?: number | null
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
	"success": []
}>()

const { t } = useI18n()
</script>
