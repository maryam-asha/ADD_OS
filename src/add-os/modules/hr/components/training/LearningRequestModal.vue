<template>
	<HrFormModal v-model:show="show" :title="t('hrTraining.requests.add')" size="md" icon="carbon:money">
		<p class="mb-3 text-sm text-secondary">{{ t("hrTraining.requests.addHint") }}</p>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrTraining.requests.what')" class="sm:col-span-2">
				<n-input v-model:value="form.title" :maxlength="255" :placeholder="t('hrTraining.requests.whatPlaceholder')" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.courses.provider')">
				<n-input v-model:value="form.provider" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.requests.startsOn')" :feedback="t('hrTraining.requests.yearHint')">
				<n-date-picker v-model:formatted-value="form.startsOn" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.budgets.amount')" :feedback="available ? t('hrTraining.requests.availableNow', { amount: available }) : undefined">
				<n-input-number v-model:value="form.amount" :min="0" :max="1000000" :precision="2" class="w-full" dir="ltr">
					<template v-if="currency" #suffix>{{ currency }}</template>
				</n-input-number>
			</n-form-item>
			<n-form-item :label="t('hrApprovals.summary.justification')" class="sm:col-span-2">
				<n-input v-model:value="form.justification" type="textarea" :maxlength="2000" :autosize="{ minRows: 2, maxRows: 5 }" />
			</n-form-item>
		</div>
		<p v-if="problem" class="text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!!problem" @click="save">{{ t("hrTraining.requests.send") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import { NButton, NDatePicker, NFormItem, NInput, NInputNumber, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { requestLearning } from "@/add-os/services/hr/training"

/**
 * Asking to spend my learning budget on outside learning, in the budget's
 * currency. It draws on the year it starts in (this year if no date), must
 * fit what is available now, and goes for approval; the final approval
 * checks the balance again. Rules mirror LearningRequestRequest.
 */
defineProps<{ currency: string | null; available: string | null }>()
const emit = defineEmits<{ sent: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

function blank() {
	return { title: "", provider: "", startsOn: null as string | null, amount: null as number | null, justification: "" }
}

const form = ref(blank())

watch(show, open => {
	if (open) form.value = blank()
})

const problem = computed(() => {
	if (!form.value.title.trim()) return t("hrTraining.requests.problems.title")
	if (!form.value.amount || form.value.amount <= 0) return t("hrTraining.budgets.problems.amount")
	return ""
})

async function save() {
	const f = form.value
	saving.value = true
	try {
		await requestLearning({ title: f.title.trim(), provider: nullable(f.provider), starts_on: f.startsOn, amount: f.amount as number, justification: nullable(f.justification) })
		message.success(t("hrTraining.requests.sent"))
		show.value = false
		emit("sent")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
