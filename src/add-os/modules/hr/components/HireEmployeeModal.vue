<!-- src/add-os/modules/hr/components/HireEmployeeModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t('hr.hire.title')" icon="carbon:user-follow">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<h3 class="mb-2 font-semibold">{{ t("hr.hire.person") }}</h3>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="nameAr" :label="t('hr.hire.nameAr')">
					<n-input v-model:value="form.nameAr" />
				</n-form-item>
				<n-form-item path="nameEn" :label="t('hr.hire.nameEn')">
					<n-input v-model:value="form.nameEn" />
				</n-form-item>
			</div>
			<n-form-item path="phone" :label="t('hr.hire.phone')" :feedback="t('hr.hire.phoneHint')">
				<n-input v-model:value="form.phone" dir="ltr" />
			</n-form-item>
			<n-form-item path="workEmail" :label="t('hr.hire.workEmail')" :feedback="t('hr.hire.workEmailHint')">
				<n-input v-model:value="form.workEmail" dir="ltr" />
			</n-form-item>
			<n-form-item path="personalEmail" :label="t('hr.hire.personalEmail')">
				<n-input v-model:value="form.personalEmail" dir="ltr" />
			</n-form-item>

			<h3 class="mb-2 mt-2 font-semibold">{{ t("hr.hire.job") }}</h3>
			<n-form-item path="hiredOn" :label="t('hr.hire.hiredOn')">
				<n-date-picker v-model:formatted-value="form.hiredOn" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item path="orgUnitId" :label="t('hr.hire.orgUnit')">
				<n-select v-model:value="form.orgUnitId" :options="unitOptions" filterable />
			</n-form-item>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="positionId" :label="t('hr.hire.position')">
					<n-select v-model:value="form.positionId" :options="positionOptions" :disabled="!form.orgUnitId" clearable />
				</n-form-item>
				<n-form-item path="jobGradeId" :label="t('hr.hire.jobGrade')">
					<n-select v-model:value="form.jobGradeId" :options="gradeOptions" clearable />
				</n-form-item>
			</div>
			<n-form-item path="managerId" :label="t('hr.hire.manager')">
				<EmployeeSelect v-model:value="form.managerId" />
			</n-form-item>
			<n-form-item path="workLocationId" :label="t('hr.profile.fields.workLocation')">
				<n-select v-model:value="form.workLocationId" :options="locationOptions" clearable />
			</n-form-item>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="employmentType" :label="t('hr.hire.employmentType')">
					<n-select v-model:value="form.employmentType" :options="employmentTypeOptions" />
				</n-form-item>
				<n-form-item path="workMode" :label="t('hr.hire.workMode')">
					<n-select v-model:value="form.workMode" :options="workModeOptions" />
				</n-form-item>
			</div>

			<h3 class="mb-2 mt-2 font-semibold">{{ t("hr.hire.contract") }}</h3>
			<n-form-item path="contractType" :label="t('hr.hire.contractType')">
				<n-select v-model:value="form.contractType" :options="contractTypeOptions" />
			</n-form-item>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item v-if="form.contractType === 'fixed_term'" path="contractEndsOn" :label="t('hr.hire.contractEndsOn')">
					<n-date-picker v-model:formatted-value="form.contractEndsOn" value-format="yyyy-MM-dd" type="date" class="w-full" />
				</n-form-item>
				<n-form-item path="probationEndsOn" :label="t('hr.hire.probationEndsOn')">
					<n-date-picker v-model:formatted-value="form.probationEndsOn" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
				</n-form-item>
			</div>
		</n-form>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="submitting" @click="submit">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("hr.hire.submit") }}
				</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { ContractType, EmploymentType, JobGrade, OrgUnit, Position, WorkLocation, WorkMode } from "@/add-os/modules/hr/types/hr"
import { NButton, NDatePicker, NForm, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { CONTRACT_TYPES, EMPLOYMENT_TYPES, WORK_MODES } from "@/add-os/modules/hr/types/hr"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { hireEmployee, listJobGrades, listPositions, listWorkLocations } from "@/add-os/services/hr/core"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ units: OrgUnit[] }>()
const emit = defineEmits<{ hired: [id: number] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()

interface HireForm {
	nameAr: string
	nameEn: string
	phone: string
	workEmail: string
	personalEmail: string
	hiredOn: string | null
	orgUnitId: number | null
	positionId: number | null
	jobGradeId: number | null
	managerId: number | null
	workLocationId: number | null
	employmentType: EmploymentType
	workMode: WorkMode
	contractType: ContractType
	contractEndsOn: string | null
	probationEndsOn: string | null
}

function blankForm(): HireForm {
	return {
		nameAr: "",
		nameEn: "",
		phone: "",
		workEmail: "",
		personalEmail: "",
		hiredOn: null,
		orgUnitId: null,
		positionId: null,
		jobGradeId: null,
		managerId: null,
		workLocationId: null,
		employmentType: "full_time",
		workMode: "on_site",
		contractType: "open_ended",
		contractEndsOn: null,
		probationEndsOn: null
	}
}

const formRef = ref<FormInst | null>(null)
const form = ref<HireForm>(blankForm())
const submitting = ref(false)

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "change"] }
const rules = computed<FormRules>(() => ({
	nameAr: required,
	phone: required,
	workEmail: required,
	hiredOn: required,
	orgUnitId: { ...required, type: "number" },
	contractEndsOn: form.value.contractType === "fixed_term" ? required : []
}))

// ── Options ─────────────────────────────────────────────────────────────────
const positions = ref<Position[]>([])
const grades = ref<JobGrade[]>([])
const locations = ref<WorkLocation[]>([])

const unitOptions = computed<SelectOption[]>(() => props.units.filter(u => u.is_active).map(u => ({ label: translated(u.name), value: u.id })))
const positionOptions = computed<SelectOption[]>(() =>
	positions.value.filter(p => p.is_active).map(p => ({ label: `${translated(p.title)} (${p.occupied}/${p.headcount})`, value: p.id, disabled: p.occupied >= p.headcount }))
)
const locationOptions = computed<SelectOption[]>(() => locations.value.filter(l => l.is_active).map(l => ({ label: translated(l.name), value: l.id })))
const gradeOptions = computed<SelectOption[]>(() => grades.value.map(g => ({ label: `${g.code} · ${translated(g.name)}`, value: g.id })))
const employmentTypeOptions = computed<SelectOption[]>(() => EMPLOYMENT_TYPES.map(v => ({ label: t(`hr.employmentType.${v}`), value: v })))
const workModeOptions = computed<SelectOption[]>(() => WORK_MODES.map(v => ({ label: t(`hr.workMode.${v}`), value: v })))
const contractTypeOptions = computed<SelectOption[]>(() => CONTRACT_TYPES.map(v => ({ label: t(`hr.contractType.${v}`), value: v })))

watch(show, async visible => {
	if (!visible) return
	form.value = blankForm()
	try {
		;[grades.value, locations.value] = await Promise.all([listJobGrades(), listWorkLocations()])
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

watch(
	() => form.value.orgUnitId,
	async unitId => {
		form.value.positionId = null
		positions.value = []
		if (!unitId) return
		try {
			positions.value = await listPositions(unitId)
		} catch (e) {
			if (!(e instanceof ApiError)) throw e
		}
	}
)

// ── Submit ──────────────────────────────────────────────────────────────────
async function submit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	const f = form.value
	submitting.value = true
	try {
		const employee = await hireEmployee({
			name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null },
			phone: f.phone.trim(),
			work_email: f.workEmail.trim(),
			personal_email: f.personalEmail.trim() || null,
			hired_on: f.hiredOn as string,
			contract: {
				type: f.contractType,
				ends_on: f.contractType === "fixed_term" ? f.contractEndsOn : null,
				probation_ends_on: f.probationEndsOn
			},
			assignment: {
				org_unit_id: f.orgUnitId as number,
				position_id: f.positionId,
				job_grade_id: f.jobGradeId,
				manager_id: f.managerId,
				work_location_id: f.workLocationId,
				employment_type: f.employmentType,
				work_mode: f.workMode
			}
		})
		message.success(t("hr.hire.success"))
		show.value = false
		emit("hired", employee.id)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		const firstError = e.data?.errors ? Object.values(e.data.errors)[0]?.[0] : undefined
		message.error(firstError ?? e.data?.message ?? t("hr.common.loadError"))
	} finally {
		submitting.value = false
	}
}
</script>
