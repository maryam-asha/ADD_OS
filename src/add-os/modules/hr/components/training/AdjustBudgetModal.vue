<template>
	<HrFormModal v-model:show="show" :title="t('hrTraining.budgets.adjust')" size="sm" icon="carbon:edit">
		<p class="mb-3 text-sm text-secondary">{{ t("hrTraining.budgets.adjustHint", { year }) }}</p>
		<n-form-item :label="t('hrTraining.budgets.adjustAmount')" :feedback="t('hrTraining.budgets.adjustSign')">
			<n-input-number v-model:value="form.amount" :precision="2" class="w-full" dir="ltr">
				<template v-if="currency" #suffix>{{ currency }}</template>
			</n-input-number>
		</n-form-item>
		<n-form-item :label="t('hrTraining.budgets.note')">
			<n-input v-model:value="form.note" type="textarea" :maxlength="500" :autosize="{ minRows: 2, maxRows: 4 }" />
		</n-form-item>
		<p v-if="problem" class="text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!!problem" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import { NButton, NFormItem, NInput, NInputNumber, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { adjustBudget } from "@/add-os/services/hr/training"

/**
 * Adding to or taking from one employee's budget for a year, with the
 * reason, which stays on the ledger. A cut below what a pending request
 * asks for is caught when that request is finally approved.
 */
const props = defineProps<{ employeeId: number; year: number; currency: string | null }>()
const emit = defineEmits<{ adjusted: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)
const form = ref({ amount: null as number | null, note: "" })

watch(show, open => {
	if (open) form.value = { amount: null, note: "" }
})

const problem = computed(() => {
	if (!form.value.amount) return t("hrTraining.budgets.problems.nonZero")
	if (!form.value.note.trim()) return t("hrTraining.budgets.problems.note")
	return ""
})

async function save() {
	saving.value = true
	try {
		message.success(serverMessage(await adjustBudget(props.employeeId, props.year, form.value.amount as number, form.value.note.trim()), t("hrTraining.budgets.adjusted")))
		show.value = false
		emit("adjusted")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
