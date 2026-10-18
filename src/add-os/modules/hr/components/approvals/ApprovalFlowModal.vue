<!-- src/add-os/modules/hr/components/approvals/ApprovalFlowModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="flow ? t('hrApprovals.flows.edit') : t('hrApprovals.flows.add')" size="lg" icon="carbon:flow">
		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('hrApprovals.flows.requestType')" :feedback="typeError" :validation-status="typeError ? 'error' : undefined">
					<n-select v-model:value="requestType" :options="typeOptions" :disabled="flow !== null" />
				</n-form-item>
				<n-form-item :label="t('hr.common.active')">
					<n-switch v-model:value="isActive" />
				</n-form-item>
				<n-form-item :label="t('hrApprovals.flows.nameAr')">
					<n-input v-model:value="nameAr" />
				</n-form-item>
				<n-form-item :label="t('hrApprovals.flows.nameEn')">
					<n-input v-model:value="nameEn" />
				</n-form-item>
			</div>

			<div class="flex flex-col gap-1">
				<h3 class="font-semibold">{{ t("hrApprovals.steps") }}</h3>
				<p class="text-sm text-secondary">{{ t("hrApprovals.flows.stepsHint") }}</p>
			</div>

			<div v-for="(step, index) in steps" :key="step.key" class="flex flex-col gap-3 rounded-lg border border-[var(--add-border)] p-3">
				<div class="flex items-center justify-between gap-2">
					<span class="font-semibold">{{ t("hrApprovals.step", { n: formatNumber(index + 1) }) }}</span>
					<div class="flex gap-3">
						<n-button text :disabled="index === 0" :aria-label="t('hrApprovals.flows.moveUp')" :title="t('hrApprovals.flows.moveUp')" @click="move(index, -1)">
							<template #icon><Icon name="carbon:arrow-up" :size="18" /></template>
						</n-button>
						<n-button
							text
							:disabled="index === steps.length - 1"
							:aria-label="t('hrApprovals.flows.moveDown')"
							:title="t('hrApprovals.flows.moveDown')"
							@click="move(index, 1)"
						>
							<template #icon><Icon name="carbon:arrow-down" :size="18" /></template>
						</n-button>
						<n-button
							text
							type="error"
							:disabled="steps.length === 1"
							:aria-label="t('hrApprovals.flows.removeStep')"
							:title="t('hrApprovals.flows.removeStep')"
							@click="steps.splice(index, 1)"
						>
							<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
						</n-button>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<n-select v-model:value="step.approver" :options="approverOptions" :aria-label="t('hrApprovals.flows.approver')" />
					<n-select
						v-if="step.approver === 'ability'"
						v-model:value="step.ability"
						:options="abilityOptions"
						filterable
						:placeholder="t('hrApprovals.flows.ability')"
						:status="showErrors && !step.ability ? 'error' : undefined"
					/>
					<EmployeeSelect
						v-else-if="step.approver === 'employee'"
						v-model:value="step.employeeId"
						:options="step.employeeOptions"
						:placeholder="mayFindEmployees ? undefined : t('hrApprovals.flows.noEmployeeSearch')"
						:disabled="!mayFindEmployees"
						:status="showErrors && !step.employeeId ? 'error' : undefined"
					/>
				</div>
				<p class="text-sm text-secondary">{{ t(`hrApprovals.approverHint.${step.approver}`) }}</p>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<n-input-number
						v-model:value="step.timeoutHours"
						:min="1"
						:max="720"
						:precision="0"
						clearable
						:placeholder="t('hrApprovals.flows.timeoutHours')"
						:aria-label="t('hrApprovals.flows.timeoutHours')"
					/>
					<n-select
						v-if="step.timeoutHours"
						v-model:value="step.onTimeout"
						:options="timeoutOptions"
						:aria-label="t('hrApprovals.flows.onTimeout')"
					/>
				</div>
			</div>

			<p v-if="showErrors && stepsIncomplete" class="text-sm text-error">{{ t("hrApprovals.flows.stepIncomplete") }}</p>

			<div>
				<n-button size="small" :disabled="steps.length >= 10" @click="addStep">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrApprovals.flows.addStep") }}
				</n-button>
			</div>
		</div>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" @click="save">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("hr.common.save") }}
				</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { ApprovalFlow, ApproverType, FlowStep, TimeoutAction } from "@/add-os/modules/hr/types/approvals"
import { NButton, NFormItem, NInput, NInputNumber, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canViewEmployees } from "@/add-os/config/permissions"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { APPROVER_TYPES, HR_ABILITIES, TIMEOUT_ACTIONS } from "@/add-os/modules/hr/types/approvals"
import { abilityLabel } from "@/add-os/modules/hr/utils/approvalLabels"
import { requestTypeLabel } from "@/add-os/modules/hr/utils/approvalSummary"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { createApprovalFlow, updateApprovalFlow } from "@/add-os/services/hr/approvals"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * An approval flow: the ordered steps a request type goes through (at most
 * ten). A step waits for the requester's direct manager, their unit's head,
 * a named employee, or anyone holding an ability; with a timeout it
 * escalates, approves or rejects when the time runs out (escalate unless
 * said otherwise). Saved flows are copied into each request on submission,
 * so an edit changes only what is submitted afterwards.
 */
const props = defineProps<{
	flow: ApprovalFlow | null
	/** Every type the server knows (`GET approval-types`). */
	types: string[]
	/** Types that already have a flow: one flow per type. */
	takenTypes: string[]
}>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const mayFindEmployees = canViewEmployees()

interface StepRow {
	key: number
	approver: ApproverType
	ability: string | null
	employeeId: number | null
	/** Until EmployeeSelect names it, a saved step's employee shows by id: a flow stores no name. */
	employeeOptions: SelectOption[]
	timeoutHours: number | null
	onTimeout: TimeoutAction
}

let nextKey = 0
function row(step?: FlowStep): StepRow {
	return {
		key: nextKey++,
		approver: step?.approver ?? "direct_manager",
		ability: step?.ability ?? null,
		employeeId: step?.employee_id ?? null,
		// A saved employee step shows its id until searched: the flow stores no name.
		employeeOptions: step?.employee_id ? [{ label: t("hrApprovals.flows.employeeId", { id: step.employee_id }), value: step.employee_id }] : [],
		timeoutHours: step?.timeout_hours ?? null,
		onTimeout: step?.on_timeout ?? "escalate"
	}
}

const requestType = ref<string | null>(null)
const nameAr = ref("")
const nameEn = ref("")
const isActive = ref(true)
const steps = ref<StepRow[]>([row()])
const saving = ref(false)
const showErrors = ref(false)

watch(show, visible => {
	if (!visible) return
	showErrors.value = false
	const f = props.flow
	requestType.value = f?.request_type ?? null
	nameAr.value = f?.name?.ar ?? ""
	nameEn.value = f?.name?.en ?? ""
	isActive.value = f?.is_active ?? true
	steps.value = f?.steps.length ? f.steps.map(row) : [row()]
})

const typeOptions = computed<SelectOption[]>(() =>
	props.types.map(type => ({ label: requestTypeLabel(t, type), value: type, disabled: props.takenTypes.includes(type) && type !== props.flow?.request_type }))
)
const approverOptions = computed<SelectOption[]>(() => APPROVER_TYPES.map(type => ({ label: t(`hrApprovals.approverType.${type}`), value: type })))
const abilityOptions = computed<SelectOption[]>(() => HR_ABILITIES.map(ability => ({ label: abilityLabel(t, ability), value: ability })))
const timeoutOptions = computed<SelectOption[]>(() => TIMEOUT_ACTIONS.map(action => ({ label: t(`hrApprovals.onTimeout.${action}`), value: action })))

const typeError = computed(() => (showErrors.value && !requestType.value ? t("hr.common.required") : undefined))
const stepsIncomplete = computed(() => steps.value.some(s => (s.approver === "ability" && !s.ability) || (s.approver === "employee" && !s.employeeId)))

function move(index: number, by: -1 | 1) {
	const list = steps.value
	;[list[index], list[index + by]] = [list[index + by], list[index]]
}

function addStep() {
	steps.value.push(row())
}

/** Only the keys that apply, as StoreApprovalFlowRequest::steps() keeps them. */
function toStep(s: StepRow): FlowStep {
	const step: FlowStep = { approver: s.approver }
	if (s.approver === "ability" && s.ability) step.ability = s.ability
	if (s.approver === "employee" && s.employeeId) step.employee_id = s.employeeId
	if (s.timeoutHours) {
		step.timeout_hours = s.timeoutHours
		step.on_timeout = s.onTimeout
	}
	return step
}

async function save() {
	showErrors.value = true
	if (!requestType.value || stepsIncomplete.value) return

	const nameArText = nameAr.value.trim()
	const body = {
		name: nameArText ? { ar: nameArText, en: nullable(nameEn.value) } : null,
		steps: steps.value.map(toStep),
		is_active: isActive.value
	}
	saving.value = true
	try {
		if (props.flow) {
			message.success(serverMessage(await updateApprovalFlow(props.flow.id, body), t("hrApprovals.flows.saved")))
		} else {
			await createApprovalFlow({ request_type: requestType.value, ...body })
			message.success(t("hrApprovals.flows.saved"))
		}
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
