<template>
	<HrFormModal v-model:show="show" :title="t('hrBenefits.assignments.add')" icon="carbon:user-follow">
		<p class="mb-3 text-sm text-secondary">{{ t("hrBenefits.assignments.hint") }}</p>

		<n-form-item v-if="!benefit" :label="t('hrBenefits.benefit')">
			<n-select v-model:value="form.benefitId" :options="benefitOptions" filterable />
		</n-form-item>

		<template v-if="employeeId === undefined">
			<n-form-item :label="t('hrBenefits.assignments.to')">
				<n-radio-group v-model:value="form.target">
					<n-radio-button v-for="target in TARGETS" :key="target" :value="target">{{ t(`hrBenefits.target.${target}`) }}</n-radio-button>
				</n-radio-group>
			</n-form-item>
			<n-form-item v-if="form.target === 'employee'" :label="t('hr.employees.columns.employee')">
				<EmployeeSelect v-model:value="form.employeeId" class="w-full" />
			</n-form-item>
			<n-form-item v-else-if="form.target === 'grade'" :label="t('hrBenefits.target.grade')">
				<n-select v-model:value="form.gradeId" :options="gradeOptions" filterable />
			</n-form-item>
			<n-form-item v-else :label="t('hrBenefits.target.org_unit')">
				<n-select v-model:value="form.unitId" :options="unitOptions" filterable />
			</n-form-item>
		</template>

		<n-checkbox v-if="form.target === 'employee'" v-model:checked="form.excluded" class="mb-1">{{ t("hrBenefits.assignments.excluded") }}</n-checkbox>
		<p v-if="form.target === 'employee'" class="mb-3 text-xs text-secondary">{{ t("hrBenefits.assignments.excludedHint") }}</p>

		<div v-if="!form.excluded" class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrBenefits.assignments.amount')">
				<n-input-number
					v-model:value="form.amount"
					:min="inKind ? 1 : 0.01"
					:max="9999999999"
					:precision="inKind ? 0 : undefined"
					:show-button="false"
					:placeholder="chosen ? benefitValue(t, chosen.amount, chosen.currency, chosen.unit) : ''"
					clearable
					class="w-full"
				/>
			</n-form-item>
			<n-form-item v-if="chosen && chosen.kind !== 'cash_allowance'" :label="t('hrBenefits.employerCost')">
				<n-input-number v-model:value="form.employerCost" :min="0" :max="9999999999" :show-button="false" clearable class="w-full" />
			</n-form-item>
		</div>
		<p v-if="!form.excluded" class="-mt-2 mb-3 text-xs text-secondary">{{ t("hrBenefits.assignments.amountHint") }}</p>

		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrPayroll.rateTables.from')">
				<n-date-picker v-model:formatted-value="form.from" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.rateTables.to')">
				<n-date-picker v-model:formatted-value="form.to" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
		</div>

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
import type { AssignmentPayload, AssignmentTarget, Benefit } from "@/add-os/modules/hr/types/benefits"
import type { JobGrade, OrgUnit } from "@/add-os/modules/hr/types/hr"
import { NButton, NCheckbox, NDatePicker, NFormItem, NInputNumber, NRadioButton, NRadioGroup, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { benefitValue } from "@/add-os/modules/hr/utils/benefits"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { centerName } from "@/add-os/modules/hr/utils/timesheets"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { assignBenefit } from "@/add-os/services/hr/benefits"
import { listJobGrades, listOrgUnits } from "@/add-os/services/hr/core"

/**
 * Gives a benefit to one employee, a grade or a unit (and the units under
 * it) from a date. Where several reach an employee the most specific
 * decides — their own, then their grade's, then the nearest unit's — so an
 * employee's own assignment can change the amount, or (`excluded`) take the
 * benefit away. Two assignments to the same target may not overlap.
 *
 * Opened from a benefit (`benefit`, any target) or from an employee's file
 * (`employeeId`, a benefit to choose from `benefits`).
 */
const props = defineProps<{ benefit?: Benefit | null; benefits?: Benefit[]; employeeId?: number }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const TARGETS: readonly AssignmentTarget[] = ["employee", "grade", "org_unit"]

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)
const grades = ref<JobGrade[]>([])
const units = ref<OrgUnit[]>([])

function emptyForm() {
	return {
		benefitId: null as number | null,
		target: "employee" as AssignmentTarget,
		employeeId: null as number | null,
		gradeId: null as number | null,
		unitId: null as number | null,
		excluded: false,
		amount: null as number | null,
		employerCost: null as number | null,
		from: todayIso() as string | null,
		to: null as string | null
	}
}
const form = ref(emptyForm())

watch(show, open => {
	if (!open) return
	form.value = emptyForm()
	if (props.employeeId !== undefined) form.value.employeeId = props.employeeId
	if (props.employeeId === undefined && !grades.value.length) {
		void quietly(listJobGrades, list => (grades.value = list))
		void quietly(listOrgUnits, list => (units.value = list))
	}
})

const chosen = computed(() => props.benefit ?? props.benefits?.find(b => b.id === form.value.benefitId) ?? null)
const inKind = computed(() => chosen.value?.kind === "in_kind_credit")

const benefitOptions = computed<SelectOption[]>(() => (props.benefits ?? []).filter(b => b.is_active).map(b => ({ label: centerName(b), value: b.id })))
const gradeOptions = computed<SelectOption[]>(() => grades.value.map(g => ({ label: translated(g.name), value: g.id })))
const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))

const targetId = computed(() => ({ employee: form.value.employeeId, grade: form.value.gradeId, org_unit: form.value.unitId })[form.value.target])
const ready = computed(() => !!chosen.value && targetId.value !== null && !!form.value.from && (!form.value.to || form.value.to >= (form.value.from ?? "")))

async function save() {
	const f = form.value
	const target = { employee: { employee_id: f.employeeId as number }, grade: { job_grade_id: f.gradeId as number }, org_unit: { org_unit_id: f.unitId as number } }[f.target]
	const payload: AssignmentPayload = {
		...target,
		amount: f.excluded ? null : f.amount,
		...(chosen.value?.kind !== "cash_allowance" ? { employer_cost: f.excluded ? null : f.employerCost } : {}),
		...(f.target === "employee" ? { excluded: f.excluded } : {}),
		effective_from: f.from as string,
		effective_to: f.to
	}
	saving.value = true
	try {
		await assignBenefit((chosen.value as Benefit).id, payload)
		message.success(t("hrBenefits.assignments.added"))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
