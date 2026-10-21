<template>
	<HrFormModal v-model:show="show" :title="t('hrRecruitment.hire.title')" icon="carbon:user-admin">
		<p class="mb-3 text-sm text-secondary">{{ t("hrRecruitment.hire.hint") }}</p>
		<n-alert v-if="alreadyEmployee" type="error" :title="t('hrRecruitment.hire.alreadyEmployee')" class="mb-3" />
		<n-descriptions :column="1" label-placement="left" size="small" bordered class="mb-4">
			<n-descriptions-item :label="t('hrRecruitment.candidates.name')">{{ candidate?.name }}</n-descriptions-item>
			<n-descriptions-item v-if="requisition" :label="t('hr.employees.unitFilter')">{{ translated(requisition.org_unit?.name) || none }}</n-descriptions-item>
			<n-descriptions-item v-if="requisition?.hiring_manager" :label="t('hrRecruitment.requisitions.hiringManager')">{{ translated(requisition.hiring_manager.name) }}</n-descriptions-item>
			<n-descriptions-item v-if="requisition" :label="t('hrRecruitment.employmentType')">{{ t(`hr.employmentType.${requisition.employment_type}`) }}</n-descriptions-item>
		</n-descriptions>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hr.profile.fields.hiredOn')">
				<n-date-picker v-model:formatted-value="form.hiredOn" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hr.profile.fields.contractType')">
				<n-select v-model:value="form.contractType" :options="contractOptions" />
			</n-form-item>
			<n-form-item :label="t('hr.hire.workMode')">
				<n-select v-model:value="form.workMode" :options="workModeOptions" />
			</n-form-item>
		</div>
		<p class="text-xs text-secondary">{{ t("hrRecruitment.hire.afterwards") }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!form.hiredOn || alreadyEmployee" @click="save">{{ t("hrRecruitment.hire.confirm") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { ContractType, Employee, WorkMode } from "@/add-os/modules/hr/types/hr"
import type { Candidate, Offer, Requisition } from "@/add-os/modules/hr/types/recruitment"
import { NAlert, NButton, NDatePicker, NDescriptions, NDescriptionsItem, NFormItem, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { CONTRACT_TYPES, WORK_MODES } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { hireCandidate } from "@/add-os/services/hr/recruitment"

/**
 * Hires a candidate whose offer they accepted. The server makes them an
 * employee from what it already has — the candidate's name, phone and
 * email, the requisition's unit, position, grade, hiring manager and
 * employment type, the offer's start date and pay — so this asks only what
 * is still open: the start date as it stands now, the contract and how
 * they will work. Needs hr.employees.create as well. A candidate who is
 * already an employee is not hired again: ADD Core would open a second
 * file for the same person, so a move inside ADD is recorded on their file.
 */
const props = defineProps<{ applicationId: number; candidate: Candidate | null; requisition: Requisition | null; offer: Offer | null }>()
const emit = defineEmits<{ hired: [employee: Employee] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)
const none = EMPTY

/** Never hired twice; ADD Core does not refuse it yet, so the form does. */
const alreadyEmployee = computed(() => !!props.candidate?.employee_id)

const form = ref({ hiredOn: null as string | null, contractType: "open_ended" as ContractType, workMode: "on_site" as WorkMode })

watch(show, open => {
	if (open) form.value = { hiredOn: props.offer?.start_on ?? null, contractType: "open_ended", workMode: "on_site" }
})

const contractOptions = computed<SelectOption[]>(() => CONTRACT_TYPES.map(c => ({ label: t(`hr.contractType.${c}`), value: c })))
const workModeOptions = computed<SelectOption[]>(() => WORK_MODES.map(w => ({ label: t(`hr.workMode.${w}`), value: w })))

async function save() {
	if (alreadyEmployee.value) return
	const f = form.value
	saving.value = true
	try {
		const employee = await hireCandidate(props.applicationId, { hired_on: f.hiredOn as string, contract: { type: f.contractType }, assignment: { work_mode: f.workMode } })
		message.success(t("hrRecruitment.hire.done"))
		show.value = false
		emit("hired", employee)
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
