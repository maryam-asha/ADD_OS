<template>
	<HrFormModal v-model:show="show" :title="t('hrTraining.budgets.allocate')" size="md" icon="carbon:wallet">
		<p class="mb-3 text-sm text-secondary">{{ t("hrTraining.budgets.allocateHint") }}</p>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrTraining.budgets.year')">
				<n-input-number v-model:value="form.year" :min="2000" :max="2100" :precision="0" :show-button="false" class="w-full" dir="ltr" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.budgets.amountEach')">
				<n-input-number v-model:value="form.amount" :min="0" :precision="2" class="w-full" dir="ltr">
					<template v-if="currency" #suffix>{{ currency }}</template>
				</n-input-number>
			</n-form-item>
		</div>
		<n-form-item :label="t('hrTraining.budgets.who')">
			<n-radio-group v-model:value="form.who">
				<div class="flex flex-col gap-2">
					<n-radio value="everyone">{{ t("hrTraining.budgets.everyone") }}</n-radio>
					<n-radio value="chosen">{{ t("hrTraining.budgets.chosen") }}</n-radio>
				</div>
			</n-radio-group>
		</n-form-item>
		<EmployeeMultiSelect v-if="form.who === 'chosen'" v-model:value="form.employees" class="mb-3 w-full" />
		<p class="text-xs text-secondary">{{ t("hrTraining.budgets.skipHint") }}</p>
		<p v-if="problem" class="mt-2 text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!!problem" @click="save">{{ t("hrTraining.budgets.allocateConfirm") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import { NButton, NFormItem, NInputNumber, NRadio, NRadioGroup, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeMultiSelect from "@/add-os/modules/hr/components/EmployeeMultiSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { allocateBudget } from "@/add-os/services/hr/training"

/**
 * The yearly allocation: one amount for the year, to everyone employed
 * today or to the employees chosen. Anyone already allocated that year is
 * skipped, so running it twice gives nobody twice; the server's message
 * says how many it reached.
 */
const props = defineProps<{ year: number; currency: string | null }>()
const emit = defineEmits<{ allocated: [year: number] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)
const form = ref({ year: props.year as number | null, amount: null as number | null, who: "everyone" as "everyone" | "chosen", employees: [] as number[] })

watch(show, open => {
	if (open) form.value = { year: props.year, amount: null, who: "everyone", employees: [] }
})

const problem = computed(() => {
	const f = form.value
	if (!f.year) return t("hrTraining.budgets.problems.year")
	if (!f.amount || f.amount <= 0) return t("hrTraining.budgets.problems.amount")
	if (f.who === "chosen" && !f.employees.length) return t("hrTraining.budgets.problems.employees")
	return ""
})

async function save() {
	const f = form.value
	saving.value = true
	try {
		message.success(serverMessage(await allocateBudget(f.year as number, f.amount as number, f.who === "chosen" ? f.employees : null), t("hrTraining.budgets.allocated")))
		show.value = false
		emit("allocated", f.year as number)
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
