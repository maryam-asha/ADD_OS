<!-- src/add-os/modules/hr/views/payroll/OpenPayrollRunPage.vue -->
<template>
	<HrFormPage
		:title="t('nav.pages.hrPayrollRunCreate')"
		:description="t('hrPayroll.runs.openDescription')"
		:eyebrow="t('nav.pages.hrPayrollRuns')"
		:back-to="{ name: 'hrPay.hrPayrollRuns' }"
		:back-label="t('hrPayroll.runs.backToRuns')"
	>
		<HrPanel :title="t('hrPayroll.runs.settings')" icon="carbon:calendar-settings">
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
				<n-form-item :label="t('hrPayroll.runs.month')">
					<n-select v-model:value="form.month" :options="monthOptions" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.runs.year')">
					<n-input-number v-model:value="form.year" :min="2000" :max="2100" :precision="0" class="w-full" :format="(v: number | null) => (v === null ? '' : String(v))" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.runs.kind')" :feedback="t(`hrPayroll.runs.kindHint.${form.kind}`)">
					<n-select v-model:value="form.kind" :options="kindOptions" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.currency')">
					<CurrencySelect v-model:value="form.currency" clearable />
				</n-form-item>
			</div>
		</HrPanel>

		<HrPanel v-if="form.kind === 'off_cycle'" :title="t('hrPayroll.runs.employees')" icon="carbon:user-multiple">
			<n-form-item :show-label="false">
				<EmployeeMultiSelect v-model:value="form.employeeIds" include-former />
			</n-form-item>
		</HrPanel>

		<HrPanel :title="t('hrPayroll.runs.options')" icon="carbon:settings-adjust">
			<n-checkbox v-model:checked="form.parallel" class="mb-1">{{ t("hrPayroll.runs.parallel") }}</n-checkbox>
			<p class="mb-4 text-xs text-secondary">{{ t("hrPayroll.runs.parallelHint") }}</p>
			<n-form-item :label="t('hrPayroll.runs.notes')">
				<n-input v-model:value="form.notes" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="1000" />
			</n-form-item>
		</HrPanel>

		<template #actions>
			<n-button @click="leave">{{ t("hr.common.cancel") }}</n-button>
			<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">
				<template #icon><Icon name="carbon:play-outline" :size="16" /></template>
				{{ t("hrPayroll.runs.open") }}
			</n-button>
		</template>
	</HrFormPage>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PayrollRunKind } from "@/add-os/modules/hr/types/payroll"
import { NButton, NCheckbox, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { currentLocale } from "@/add-os/lang/currentLocale"
import EmployeeMultiSelect from "@/add-os/modules/hr/components/EmployeeMultiSelect.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import HrFormPage from "@/add-os/modules/hr/components/ui/HrFormPage.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { openPayrollRun } from "@/add-os/services/hr/payroll"
import { MONTHS } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Opens a payroll run, on a page of its own. A regular run is the month's
 * payroll, one per month, calculated once that month's attendance is
 * locked; an off-cycle run is a correction or a one-off (a bonus, a final
 * settlement) for the employees it names, made of adjustments. A parallel
 * run is checked against the payroll it runs beside before it may be
 * approved. No currency takes the server's default. Once opened, the run's
 * own page takes over.
 *
 * This was OpenRunModal until 2026-11-09: see docs/hr/FORMS-AS-PAGES.md.
 */
const { t } = useI18n()
const message = useMessage()
const router = useRouter()
const saving = ref(false)

const [thisYear, thisMonth] = todayIso().split("-").map(Number)
const form = ref({
	year: thisYear as number | null,
	month: thisMonth,
	kind: "regular" as PayrollRunKind,
	currency: null as string | null,
	parallel: false,
	employeeIds: [] as number[],
	notes: ""
})

const monthOptions = computed<SelectOption[]>(() => MONTHS[currentLocale.value].map((name, i) => ({ label: name, value: i + 1 })))
const kindOptions = computed<SelectOption[]>(() => (["regular", "off_cycle"] as const).map(k => ({ label: t(`hrPayroll.runKind.${k}`), value: k })))

const ready = computed(() => !!form.value.year && (form.value.kind === "regular" || form.value.employeeIds.length > 0))

function leave() {
	void router.push({ name: "hrPay.hrPayrollRuns" })
}

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
		void router.push({ name: "hrPay.hrPayrollRun", params: { id: run.id } })
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
