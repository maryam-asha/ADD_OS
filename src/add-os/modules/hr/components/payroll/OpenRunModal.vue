<template>
	<HrFormModal v-model:show="show" :title="t('hrPayroll.runs.open')" icon="carbon:play-outline">
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrPayroll.runs.month')">
				<n-select v-model:value="form.month" :options="monthOptions" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.runs.year')">
				<n-input-number v-model:value="form.year" :min="2000" :max="2100" :precision="0" class="w-full" :format="(v: number | null) => (v === null ? '' : String(v))" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.runs.kind')">
				<n-select v-model:value="form.kind" :options="kindOptions" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.currency')">
				<CurrencySelect v-model:value="form.currency" clearable />
			</n-form-item>
		</div>
		<p class="-mt-2 mb-3 text-sm text-secondary">{{ t(`hrPayroll.runs.kindHint.${form.kind}`) }}</p>

		<n-form-item v-if="form.kind === 'off_cycle'" :label="t('hrPayroll.runs.employees')">
			<EmployeeMultiSelect v-model:value="form.employeeIds" include-former />
		</n-form-item>

		<n-checkbox v-model:checked="form.parallel" class="mb-1">{{ t("hrPayroll.runs.parallel") }}</n-checkbox>
		<p class="mb-3 text-xs text-secondary">{{ t("hrPayroll.runs.parallelHint") }}</p>

		<n-form-item :label="t('hrPayroll.runs.notes')">
			<n-input v-model:value="form.notes" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="1000" />
		</n-form-item>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("hrPayroll.runs.open") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PayrollRun, PayrollRunKind } from "@/add-os/modules/hr/types/payroll"
import { NButton, NCheckbox, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import EmployeeMultiSelect from "@/add-os/modules/hr/components/EmployeeMultiSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { openPayrollRun } from "@/add-os/services/hr/payroll"
import { MONTHS } from "@/add-os/utils/format"

/**
 * Opens a payroll run. A regular run is the month's payroll, one per month,
 * calculated once that month's attendance is locked; an off-cycle run is a
 * correction or a one-off (a bonus, a final settlement) for the employees
 * it names, made of adjustments. A parallel run is checked against the
 * payroll it runs beside before it may be approved. No currency takes the
 * server's default.
 */
const emit = defineEmits<{ opened: [run: PayrollRun] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

function emptyForm() {
	const [year, month] = todayIso().split("-").map(Number)
	return {
		year: year as number | null,
		month,
		kind: "regular" as PayrollRunKind,
		currency: null as string | null,
		parallel: false,
		employeeIds: [] as number[],
		notes: ""
	}
}
const form = ref(emptyForm())

watch(show, open => {
	if (open) form.value = emptyForm()
})

const monthOptions = computed<SelectOption[]>(() => MONTHS[currentLocale.value].map((name, i) => ({ label: name, value: i + 1 })))
const kindOptions = computed<SelectOption[]>(() => (["regular", "off_cycle"] as const).map(k => ({ label: t(`hrPayroll.runKind.${k}`), value: k })))

const ready = computed(() => !!form.value.year && (form.value.kind === "regular" || form.value.employeeIds.length > 0))

async function save() {
	const f = form.value
	saving.value = true
	try {
		const run = await openPayrollRun({
			year: f.year as number,
			month: f.month,
			kind: f.kind,
			currency: f.currency,
			parallel_run: f.parallel,
			employee_ids: f.kind === "off_cycle" ? f.employeeIds : null,
			notes: nullable(f.notes)
		})
		message.success(t("hrPayroll.runs.opened"))
		show.value = false
		emit("opened", run)
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
