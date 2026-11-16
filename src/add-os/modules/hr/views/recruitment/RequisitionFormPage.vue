<!-- src/add-os/modules/hr/views/recruitment/RequisitionFormPage.vue -->
<template>
	<HrFormPage
		:title="t('hrRecruitment.requisitions.add')"
		:description="t('hrRecruitment.requisitions.hint')"
		:eyebrow="mine ? t('nav.pages.hrMyRecruitment') : t('nav.pages.hrRequisitions')"
		:back-to
		:back-label="mine ? t('hrRecruitment.requisitions.backToMine') : t('hrRecruitment.requisitions.backToList')"
	>
		<HrPanel :title="t('hrRecruitment.requisitions.rolePanel')" icon="carbon:request-quote">
			<!-- `items-start`: the note under the Arabic title makes it taller, and a stretched neighbour would centre its field lower. -->
			<div class="grid grid-cols-1 items-start gap-x-4 @xl:grid-cols-2">
				<n-form-item :label="t('hrPayroll.components.nameAr')">
					<div class="flex w-full flex-col gap-1">
						<n-input v-model:value="form.titleAr" dir="rtl" :maxlength="255" :placeholder="t('hrRecruitment.requisitions.titlePlaceholder')" />
						<span v-if="titleFromPosition" class="inline-flex items-center gap-1 text-xs text-secondary" data-test="title-from-position">
							<Icon name="carbon:information" :size="14" />
							{{ t("hrRecruitment.requisitions.titleFromPosition") }}
						</span>
					</div>
				</n-form-item>
				<n-form-item :label="t('hrPayroll.components.nameEn')">
					<n-input v-model:value="form.titleEn" dir="ltr" :maxlength="255" />
				</n-form-item>
				<n-form-item :label="t('hr.employees.unitFilter')">
					<n-select v-model:value="form.unitId" :options="unitOptions" filterable @update:value="onUnit" />
				</n-form-item>
				<n-form-item :label="t('hrRecruitment.requisitions.position')">
					<n-select
						v-model:value="form.positionId"
						:options="positionOptions"
						:disabled="!form.unitId"
						clearable
						filterable
						@update:value="onPosition"
					/>
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
			</div>
		</HrPanel>

		<HrPanel :title="t('hrRecruitment.requisitions.reasonPanel')" icon="carbon:help">
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
				<n-form-item :label="t('hrRecruitment.requisitions.reason')">
					<n-select v-model:value="form.reason" :options="reasonOptions" />
				</n-form-item>
				<n-form-item v-if="form.reason === 'replacement'" :label="t('hrRecruitment.requisitions.replaces')">
					<EmployeeSelect v-model:value="form.replacesId" include-former class="w-full" />
				</n-form-item>
				<n-form-item v-if="!mine" :label="t('hrRecruitment.requisitions.hiringManager')" class="@xl:col-span-2">
					<EmployeeSelect v-model:value="form.managerId" class="w-full" />
				</n-form-item>
			</div>
		</HrPanel>

		<HrPanel :title="t('hrRecruitment.requisitions.budgetPanel')" icon="carbon:currency">
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
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
		</HrPanel>

		<template #actions>
			<p v-if="problem" class="me-auto text-sm text-error">{{ problem }}</p>
			<n-button @click="leave">{{ t("hr.common.cancel") }}</n-button>
			<n-button type="primary" :loading="saving" :disabled="!!problem" @click="save">
				<template #icon><Icon name="carbon:send" :size="16" /></template>
				{{ t("hrLeave.request.submit") }}
			</n-button>
		</template>
	</HrFormPage>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { EmploymentType, JobGrade, OrgUnit, Position } from "@/add-os/modules/hr/types/hr"
import type { RequisitionPayload, RequisitionReason } from "@/add-os/modules/hr/types/recruitment"
import { NButton, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import HrFormPage from "@/add-os/modules/hr/components/ui/HrFormPage.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { EMPLOYMENT_TYPES } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { listJobGrades, listOrgUnits, listPositions } from "@/add-os/services/hr/core"
import { createRequisition, fileMyRequisition } from "@/add-os/services/hr/recruitment"
import Icon from "@/components/common/Icon.vue"

/**
 * A request to hire: for which unit (and position or grade), how many, why
 * (a new position, or replacing someone), the pay budget and the case for
 * it. It goes for approval; once approved it can carry openings. HR names
 * the hiring manager; a manager filing their own (`mine`) is it.
 *
 * A page of its own, reached two ways: HR's (`hrTalent.hrRequisitionCreate`,
 * hr.recruitment.manage) and a manager's from My HR
 * (`myHr.hrMyRequisitionCreate`), which is `mine`. Sent, it returns to the
 * list it came from. Until 2026-11-09 this was RequisitionModal: see
 * docs/hr/FORMS-AS-PAGES.md.
 */
const { t } = useI18n()
const message = useMessage()
const route = useRoute()
const router = useRouter()

const mine = route.name === "myHr.hrMyRequisitionCreate"
const backTo = mine ? { name: "myHr.hrMyRecruitment", query: { tab: "requisitions" } } : { name: "hrTalent.hrRequisitions" }
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

onMounted(() => {
	void quietly(listOrgUnits, list => (units.value = list))
	void quietly(listJobGrades, list => (grades.value = list))
})

function leave() {
	void router.push(backTo)
}

function onUnit(unitId: number | null) {
	form.value.positionId = null
	onPosition(null)
	positions.value = []
	if (unitId) void quietly(() => listPositions(unitId), list => (positions.value = list))
}

/**
 * The title a chosen position filled in, so a later change of position can
 * tell its own words from the reader's. The position names the seat in the
 * structure; the title is what the opening and the approver read, so it is
 * kept, prefilled and editable, never replaced once typed. A new role has no
 * position yet, and the title is then the only name it has.
 */
const autoTitle = ref<{ ar: string; en: string } | null>(null)

function onPosition(positionId: number | null) {
	const f = form.value
	const previous = autoTitle.value
	const position = positions.value.find(p => p.id === positionId)
	const next = position ? { ar: position.title.ar ?? "", en: position.title.en ?? "" } : null
	// A field still blank, or still holding what the last position put there, follows the position.
	if (!f.titleAr.trim() || f.titleAr === previous?.ar) f.titleAr = next?.ar ?? ""
	if (!f.titleEn.trim() || f.titleEn === previous?.en) f.titleEn = next?.en ?? ""
	autoTitle.value = next
}

/** The Arabic title still reads as the chosen position gave it. */
const titleFromPosition = computed(() => Boolean(autoTitle.value?.ar) && form.value.titleAr === autoTitle.value?.ar)

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
	if (!mine && !f.managerId) return t("hrRecruitment.requisitions.problems.manager")
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
		if (mine) await fileMyRequisition(payload)
		else await createRequisition({ ...payload, hiring_manager_id: f.managerId as number })
		message.success(t("hrRecruitment.requisitions.sent"))
		leave()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
