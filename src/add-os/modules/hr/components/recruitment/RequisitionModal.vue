<template>
	<HrFormModal v-model:show="show" :title="t('hrRecruitment.requisitions.add')" size="lg" icon="carbon:request-quote">
		<p class="mb-3 text-sm text-secondary">{{ t("hrRecruitment.requisitions.hint") }}</p>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrPayroll.components.nameAr')">
				<n-input v-model:value="form.titleAr" dir="rtl" :maxlength="255" :placeholder="t('hrRecruitment.requisitions.titlePlaceholder')" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.components.nameEn')">
				<n-input v-model:value="form.titleEn" dir="ltr" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hr.employees.unitFilter')">
				<n-select v-model:value="form.unitId" :options="unitOptions" filterable @update:value="onUnit" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.requisitions.position')">
				<n-select v-model:value="form.positionId" :options="positionOptions" :disabled="!form.unitId" clearable filterable />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.requisitions.grade')">
				<n-select v-model:value="form.gradeId" :options="gradeOptions" clearable filterable />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.requisitions.headcount')">
				<n-input-number v-model:value="form.headcount" :min="1" :max="100" :precision="0" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.employmentType')">
				<n-select v-model:value="form.employmentType" :options="employmentOptions" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.requisitions.reason')">
				<n-select v-model:value="form.reason" :options="reasonOptions" />
			</n-form-item>
			<n-form-item v-if="form.reason === 'replacement'" :label="t('hrRecruitment.requisitions.replaces')" class="sm:col-span-2">
				<EmployeeSelect v-model:value="form.replacesId" include-former class="w-full" />
			</n-form-item>
			<n-form-item v-if="!mine" :label="t('hrRecruitment.requisitions.hiringManager')" class="sm:col-span-2">
				<EmployeeSelect v-model:value="form.managerId" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.requisitions.budgetMin')">
				<n-input-number v-model:value="form.budgetMin" :min="0" :max="9999999999" :show-button="false" clearable class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.requisitions.budgetMax')">
				<n-input-number v-model:value="form.budgetMax" :min="0" :max="9999999999" :show-button="false" clearable class="w-full" />
			</n-form-item>
			<n-form-item v-if="form.budgetMin !== null || form.budgetMax !== null" :label="t('hrPayroll.currency')">
				<CurrencySelect v-model:value="form.budgetCurrency" />
			</n-form-item>
		</div>
		<n-form-item :label="t('hrApprovals.summary.justification')">
			<n-input v-model:value="form.justification" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" :maxlength="2000" />
		</n-form-item>
		<p v-if="problem" class="text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!!problem" @click="save">{{ t("hrLeave.request.submit") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { EmploymentType, JobGrade, OrgUnit, Position } from "@/add-os/modules/hr/types/hr"
import type { RequisitionPayload, RequisitionReason } from "@/add-os/modules/hr/types/recruitment"
import { NButton, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { EMPLOYMENT_TYPES } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { listJobGrades, listOrgUnits, listPositions } from "@/add-os/services/hr/core"
import { createRequisition, fileMyRequisition } from "@/add-os/services/hr/recruitment"

/**
 * A request to hire: for which unit (and position or grade), how many, why
 * (a new position, or replacing someone), the pay budget and the case for
 * it. It goes for approval; once approved it can carry openings. HR names
 * the hiring manager; a manager filing their own (`mine`) is it.
 */
const props = defineProps<{ mine?: boolean }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)
const units = ref<OrgUnit[]>([])
const grades = ref<JobGrade[]>([])
const positions = ref<Position[]>([])

function emptyForm() {
	return {
		titleAr: "",
		titleEn: "",
		unitId: null as number | null,
		positionId: null as number | null,
		gradeId: null as number | null,
		headcount: 1 as number | null,
		employmentType: "full_time" as EmploymentType,
		reason: "new_position" as RequisitionReason,
		replacesId: null as number | null,
		managerId: null as number | null,
		budgetMin: null as number | null,
		budgetMax: null as number | null,
		budgetCurrency: null as string | null,
		justification: ""
	}
}
const form = ref(emptyForm())

watch(show, open => {
	if (!open) return
	form.value = emptyForm()
	positions.value = []
	if (!units.value.length) {
		void quietly(listOrgUnits, list => (units.value = list))
		void quietly(listJobGrades, list => (grades.value = list))
	}
})

function onUnit(unitId: number | null) {
	form.value.positionId = null
	positions.value = []
	if (unitId) void quietly(() => listPositions(unitId), list => (positions.value = list))
}

const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))
const gradeOptions = computed<SelectOption[]>(() => grades.value.map(g => ({ label: translated(g.name), value: g.id })))
const positionOptions = computed<SelectOption[]>(() => positions.value.filter(p => p.is_active).map(p => ({ label: translated(p.title), value: p.id })))
const employmentOptions = computed<SelectOption[]>(() => EMPLOYMENT_TYPES.map(e => ({ label: t(`hr.employmentType.${e}`), value: e })))
const reasonOptions = computed<SelectOption[]>(() => (["new_position", "replacement"] as const).map(r => ({ label: t(`hrRecruitment.reason.${r}`), value: r })))

/** What the server would refuse, said before sending (FileRequisitionRequest). */
const problem = computed(() => {
	const f = form.value
	if (!f.titleAr.trim()) return t("hr.common.arabicRequired", { field: t("hrRecruitment.requisitions.title") })
	if (!f.unitId) return t("hrRecruitment.requisitions.problems.unit")
	if (f.reason === "replacement" && !f.replacesId) return t("hrRecruitment.requisitions.problems.replaces")
	if (!props.mine && !f.managerId) return t("hrRecruitment.requisitions.problems.manager")
	if (f.budgetMin !== null && f.budgetMax !== null && f.budgetMax < f.budgetMin) return t("hrRecruitment.requisitions.problems.budget")
	if ((f.budgetMin !== null || f.budgetMax !== null) && !f.budgetCurrency) return t("hrBenefits.benefits.costCurrencyNeeded")
	return ""
})

async function save() {
	const f = form.value
	const payload: RequisitionPayload = {
		org_unit_id: f.unitId as number,
		position_id: f.positionId,
		job_grade_id: f.gradeId,
		title: { ar: f.titleAr.trim(), en: f.titleEn.trim() || null },
		headcount: f.headcount ?? 1,
		employment_type: f.employmentType,
		reason: f.reason,
		replaces_employee_id: f.reason === "replacement" ? f.replacesId : null,
		budget_min: f.budgetMin,
		budget_max: f.budgetMax,
		budget_currency: f.budgetMin !== null || f.budgetMax !== null ? f.budgetCurrency : null,
		justification: nullable(f.justification)
	}
	saving.value = true
	try {
		if (props.mine) await fileMyRequisition(payload)
		else await createRequisition({ ...payload, hiring_manager_id: f.managerId as number })
		message.success(t("hrRecruitment.requisitions.sent"))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
