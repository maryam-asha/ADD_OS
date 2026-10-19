<template>
	<HrFormModal v-model:show="show" :title="t('hrPayroll.adjustments.add')" icon="carbon:add-alt">
		<p class="mb-3 text-sm text-secondary">{{ t("hrPayroll.adjustments.hint") }}</p>
		<n-form-item :label="t('hr.employees.columns.employee')">
			<EmployeeSelect v-model:value="form.employeeId" include-former :options="employeeOptions" class="w-full" />
		</n-form-item>
		<n-form-item :label="t('hrPayroll.pay.component')">
			<n-select v-model:value="form.componentId" :options="componentOptions" filterable />
		</n-form-item>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrPayroll.pay.amount')">
				<n-input-number v-model:value="form.amount" :min="-9999999999" :max="9999999999" :show-button="false" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.currency')">
				<CurrencySelect v-model:value="form.currency" />
			</n-form-item>
		</div>
		<p class="-mt-2 mb-3 text-xs text-secondary">{{ t("hrPayroll.adjustments.amountHint") }}</p>
		<n-form-item :label="t('hrPayroll.adjustments.note')">
			<n-input v-model:value="form.note" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="500" />
		</n-form-item>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PayComponent, PayrollRun } from "@/add-os/modules/hr/types/payroll"
import { NButton, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { centerName } from "@/add-os/modules/hr/utils/timesheets"
import { addAdjustment } from "@/add-os/services/hr/payroll"

/**
 * A one-off line on one employee's slip in this run — a bonus, a
 * correction, a final settlement's items — with the reason written down.
 * Adding one sends a calculated run back to open, to be calculated again;
 * in an off-cycle run, only its own employees can be adjusted.
 */
const props = defineProps<{ run: PayrollRun; components: PayComponent[]; employeeOptions: SelectOption[] }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

function emptyForm() {
	return { employeeId: null as number | null, componentId: null as number | null, amount: null as number | null, currency: props.run.currency as string | null, note: "" }
}
const form = ref(emptyForm())

watch(show, open => {
	if (open) form.value = emptyForm()
})

const componentOptions = computed<SelectOption[]>(() =>
	props.components.filter(c => c.is_active).map(c => ({ label: `${centerName(c)} · ${t(`hrPayroll.kind.${c.kind}`)}`, value: c.id }))
)
const ready = computed(() => {
	const f = form.value
	return f.employeeId !== null && f.componentId !== null && !!f.amount && !!f.currency && !!f.note.trim()
})

async function save() {
	const f = form.value
	saving.value = true
	try {
		await addAdjustment(props.run.id, {
			employee_id: f.employeeId as number,
			pay_component_id: f.componentId as number,
			amount: f.amount as number,
			currency: f.currency as string,
			note: f.note.trim()
		})
		message.success(t("hrPayroll.adjustments.added"))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
