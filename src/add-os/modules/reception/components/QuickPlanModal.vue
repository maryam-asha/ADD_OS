<!-- src/add-os/modules/reception/components/QuickPlanModal.vue -->
<!--
	Selling a plan from the reception desk: the Plan Purchases page itself,
	inside a dialog, so the desk sells with the same form, pricing and receipt
	— there is one plan sale, not two.
-->
<template>
	<FormModal :show :title="t('nav.pages.planPurchases')" size="lg" @update:show="emit('update:show', $event)">
		<PlanPurchasesPage in-modal :preselected-user-id @success="emit('success')" />
	</FormModal>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"
import FormModal from "@/add-os/components/page/FormModal.vue"
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
