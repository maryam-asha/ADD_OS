<template>
	<HrFormModal v-model:show="show" :title="forEmployee ? t('hrPayroll.loans.add') : t('hrPayroll.loans.request')" icon="carbon:wallet">
		<p class="mb-3 text-sm text-secondary">{{ t("hrPayroll.loans.hint") }}</p>
		<n-form-item v-if="forEmployee && !employeeId" :label="t('hr.employees.columns.employee')">
			<EmployeeSelect v-model:value="chosenEmployee" class="w-full" />
		</n-form-item>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrPayroll.loans.amount')">
				<n-input-number v-model:value="form.amount" :min="0.01" :max="9999999999" :show-button="false" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.currency')">
				<CurrencySelect v-model:value="form.currency" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.loans.installments')">
				<n-input-number v-model:value="form.installments" :min="1" :max="120" :precision="0" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.loans.firstMonth')">
				<n-date-picker v-model:formatted-value="form.firstMonth" value-format="yyyy-MM" type="month" clearable :placeholder="t('hrPayroll.loans.nextMonth')" class="w-full" />
			</n-form-item>
		</div>
		<n-form-item :label="t('hrApprovals.summary.reason')">
			<n-input v-model:value="form.reason" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="1000" />
		</n-form-item>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("hrLeave.request.submit") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import { NButton, NDatePicker, NFormItem, NInput, NInputNumber, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { createLoan, requestMyLoan } from "@/add-os/services/hr/payroll"

/**
 * A loan request — the employee's own, or one HR files for an employee
 * (`forEmployee`, with hr.loans.manage). Either way it goes through the
 * approval flow, and the server holds the limits: one open loan at a time,
 * a cap of a multiple of monthly pay, so many installments at most, a first month
 * whose payroll is still open. Its refusals say which.
 */
const props = defineProps<{ forEmployee?: boolean; employeeId?: number | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)
const chosenEmployee = ref<number | null>(null)

function emptyForm() {
	return { amount: null as number | null, currency: null as string | null, installments: 6 as number | null, firstMonth: null as string | null, reason: "" }
}
const form = ref(emptyForm())

watch(show, open => {
	if (!open) return
	form.value = emptyForm()
	chosenEmployee.value = null
})

const employee = computed(() => props.employeeId ?? chosenEmployee.value)
const ready = computed(() => {
	const f = form.value
	return !!f.amount && !!f.currency && !!f.installments && (!props.forEmployee || employee.value !== null)
})

async function save() {
	const f = form.value
	const payload = { amount: f.amount as number, currency: f.currency as string, installments: f.installments as number, first_month: f.firstMonth, reason: nullable(f.reason) }
	saving.value = true
	try {
		if (props.forEmployee) await createLoan(employee.value as number, payload)
		else await requestMyLoan(payload)
		message.success(t("hrPayroll.loans.sent"))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
