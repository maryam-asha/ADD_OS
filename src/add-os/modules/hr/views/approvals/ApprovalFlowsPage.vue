<!-- src/add-os/modules/hr/views/approvals/ApprovalFlowsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrApprovalFlows')" :description="t('hrApprovals.flows.description')" />

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<div v-if="loading" class="flex justify-center py-16">
			<n-spin />
		</div>

		<template v-else-if="types.length">
			<HrPanel :title="t('hrApprovals.flows.requestType')" :subtitle="t('hrApprovals.flows.chooseType')" icon="carbon:flow">
				<div class="flex flex-wrap gap-2">
					<n-button
						v-for="type in types"
						:key="type"
						round
						:type="selected === type ? 'primary' : 'default'"
						:secondary="selected !== type"
						@click="selected = type"
					>
						{{ requestTypeLabel(t, type) }}
						<n-badge v-if="flowFor(type)" dot :type="flowFor(type)!.is_active ? 'success' : 'default'" class="ms-2" />
					</n-button>
				</div>
			</HrPanel>

			<HrPanel v-if="current" :title="requestTypeLabel(t, selected)" :subtitle="t('hrApprovals.flows.stepsHint')" icon="carbon:document">
				<template #extra>
					<n-tag :bordered="false" round>{{ t("hrApprovals.flows.stepTotal", { n: formatNumber(current.steps.length) }) }}</n-tag>
					<n-switch v-model:value="current.isActive" :aria-label="t('hr.common.active')" />
					<span class="text-sm text-secondary">{{ t("hr.common.active") }}</span>
				</template>

				<n-alert v-if="!current.flow" type="info" class="mb-4">{{ t("hrApprovals.flows.noFlow") }}</n-alert>

				<div class="flex flex-col items-center">
					<div v-for="(step, index) in current.steps" :key="step.key" class="flex w-full max-w-2xl flex-col items-center">
						<section class="w-full rounded-add-large border border-[var(--add-border)] bg-[var(--add-surface-raised)] p-4">
							<header class="mb-3 flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class="flex h-7 w-7 items-center justify-center rounded-add-default bg-[var(--add-surface-sunken)] text-sm font-semibold text-primary">
										{{ formatNumber(index + 1) }}
									</span>
									<span class="font-semibold">{{ t("hrApprovals.step", { n: formatNumber(index + 1) }) }}</span>
								</div>
								<div class="flex gap-3">
									<n-button text :disabled="index === 0" :aria-label="t('hrApprovals.flows.moveUp')" :title="t('hrApprovals.flows.moveUp')" @click="move(index, -1)">
										<template #icon><Icon name="carbon:arrow-up" :size="18" /></template>
									</n-button>
									<n-button text :disabled="index === current.steps.length - 1" :aria-label="t('hrApprovals.flows.moveDown')" :title="t('hrApprovals.flows.moveDown')" @click="move(index, 1)">
										<template #icon><Icon name="carbon:arrow-down" :size="18" /></template>
									</n-button>
									<n-button text type="error" :disabled="current.steps.length === 1" :aria-label="t('hrApprovals.flows.removeStep')" :title="t('hrApprovals.flows.removeStep')" @click="current.steps.splice(index, 1)">
										<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
									</n-button>
								</div>
							</header>

							<n-radio-group :value="step.approver === 'direct_manager' ? 'manager' : 'other'" class="mb-3 flex" @update:value="(v: string) => setCategory(step, v)">
								<n-radio-button value="manager" class="flex-1 text-center">{{ t("hrApprovals.approverType.direct_manager") }}</n-radio-button>
								<n-radio-button value="other" class="flex-1 text-center">{{ t("hrApprovals.flows.otherApprover") }}</n-radio-button>
							</n-radio-group>

							<div v-if="step.approver !== 'direct_manager'" class="@container mb-3">
								<div class="grid grid-cols-1 gap-3 @md:grid-cols-2">
									<n-select v-model:value="step.approver" :options="otherApproverOptions" :aria-label="t('hrApprovals.flows.approver')" />
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
							</div>
							<p class="mb-3 text-sm text-secondary">{{ t(`hrApprovals.approverHint.${step.approver}`) }}</p>

							<div class="@container">
								<div class="grid grid-cols-1 gap-3 @md:grid-cols-2">
									<n-input-number
										v-model:value="step.timeoutHours"
										:min="1"
										:max="720"
										:precision="0"
										clearable
										:placeholder="t('hrApprovals.flows.timeoutHours')"
										:aria-label="t('hrApprovals.flows.timeoutHours')"
									/>
									<n-select v-if="step.timeoutHours" v-model:value="step.onTimeout" :options="timeoutOptions" :aria-label="t('hrApprovals.flows.onTimeout')" />
								</div>
							</div>
						</section>

						<div class="flex flex-col items-center py-1">
							<span class="h-4 w-px bg-[var(--add-border)]" />
							<n-button
								circle
								size="small"
								dashed
								:disabled="current.steps.length >= MAX_STEPS"
								:aria-label="t('hrApprovals.flows.insertStep')"
								:title="t('hrApprovals.flows.insertStep')"
								@click="insertStep(index + 1)"
							>
								<template #icon><Icon name="carbon:add" :size="14" /></template>
							</n-button>
							<span v-if="index < current.steps.length - 1" class="h-4 w-px bg-[var(--add-border)]" />
						</div>
					</div>
				</div>

				<p v-if="showErrors && stepsIncomplete" class="mt-2 text-sm text-error">{{ t("hrApprovals.flows.stepIncomplete") }}</p>

				<footer class="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--add-border)] pt-4">
					<n-button v-if="current.flow" type="error" secondary class="me-auto" @click="confirmDelete(current.flow)">
						<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
						{{ t("hrApprovals.flows.delete") }}
					</n-button>
					<n-button type="primary" :loading="saving" @click="save">
						<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
						{{ t("hr.common.save") }}
					</n-button>
				</footer>
			</HrPanel>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { ApprovalFlow, ApproverType, FlowStep, TimeoutAction } from "@/add-os/modules/hr/types/approvals"
import { NAlert, NBadge, NButton, NInputNumber, NRadioButton, NRadioGroup, NSelect, NSpin, NSwitch, NTag, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canViewEmployees } from "@/add-os/config/permissions"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { HR_ABILITIES, TIMEOUT_ACTIONS } from "@/add-os/modules/hr/types/approvals"
import { abilityLabel } from "@/add-os/modules/hr/utils/approvalLabels"
import { requestTypeLabel } from "@/add-os/modules/hr/utils/approvalSummary"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { ApiError } from "@/add-os/services/api"
import { createApprovalFlow, deleteApprovalFlow, listApprovalFlows, listApprovalTypes, updateApprovalFlow } from "@/add-os/services/hr/approvals"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Approval flows, one request type at a time, laid out after Bayraq's: the
 * types as chips, then the chosen type's steps one under the other, joined
 * by a "+" that inserts a step there. A step waits for the requester's
 * direct manager or for someone else: their unit's head, a named employee,
 * or anyone holding a permission. With a timeout it escalates, approves or
 * rejects when the time runs out. At most ten steps. A type without a flow
 * goes to the direct manager alone; deleting a flow returns it to that.
 * Saved flows are copied into each request on submission, so an edit
 * changes only what is submitted afterwards.
 *
 * Only the types the server knows (`GET approval-types`) are offered. The
 * f97384d version of this page sent `approver_type`/`required_ability`/
 * `approver_employee_id`, which StoreApprovalFlowRequest does not read, and
 * offered types the server has no request for; it also dropped the
 * timeouts, the step order and deleting a flow. Each step here is the
 * FlowStep the server stores (see ApprovalFlowModal before it, whose rules
 * this keeps).
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayFindEmployees = canViewEmployees()

const MAX_STEPS = 10

interface StepRow {
	key: number
	approver: ApproverType
	ability: string | null
	employeeId: number | null
	/** A flow stores an employee's id, not their name: shown by id until searched. */
	employeeOptions: SelectOption[]
	timeoutHours: number | null
	onTimeout: TimeoutAction
}

interface TypeState {
	flow: ApprovalFlow | null
	steps: StepRow[]
	isActive: boolean
}

let nextKey = 0
function row(step?: FlowStep): StepRow {
	return {
		key: nextKey++,
		approver: step?.approver ?? "direct_manager",
		ability: step?.ability ?? null,
		employeeId: step?.employee_id ?? null,
		employeeOptions: step?.employee_id ? [{ label: t("hrApprovals.flows.employeeId", { id: step.employee_id }), value: step.employee_id }] : [],
		timeoutHours: step?.timeout_hours ?? null,
		onTimeout: step?.on_timeout ?? "escalate"
	}
}

const types = ref<string[]>([])
const flows = ref<ApprovalFlow[]>([])
const states = reactive<Record<string, TypeState>>({})
const selected = ref("")
const loading = ref(true)
const loadError = ref(false)
const saving = ref(false)
const showErrors = ref(false)

function flowFor(type: string): ApprovalFlow | null {
	return flows.value.find(flow => flow.request_type === type) ?? null
}

function stateFor(type: string): TypeState {
	const flow = flowFor(type)
	return { flow, steps: flow?.steps.length ? flow.steps.map(row) : [row()], isActive: flow?.is_active ?? true }
}

/** The chosen type's steps, kept while another type is looked at, until saved or reloaded. */
const current = computed<TypeState | null>(() => {
	if (!selected.value) return null
	if (!states[selected.value]) states[selected.value] = stateFor(selected.value)
	return states[selected.value]
})

async function load() {
	loading.value = true
	loadError.value = false
	try {
		;[types.value, flows.value] = await Promise.all([listApprovalTypes(), listApprovalFlows()])
		for (const key of Object.keys(states)) delete states[key]
		if (!types.value.includes(selected.value)) selected.value = types.value[0] ?? ""
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		loadError.value = true
	} finally {
		loading.value = false
	}
}

onMounted(load)

const otherApproverOptions = computed<SelectOption[]>(() =>
	(["unit_head", "employee", "ability"] as const).map(type => ({ label: t(`hrApprovals.approverType.${type}`), value: type }))
)
const abilityOptions = computed<SelectOption[]>(() => HR_ABILITIES.map(ability => ({ label: abilityLabel(t, ability), value: ability })))
const timeoutOptions = computed<SelectOption[]>(() => TIMEOUT_ACTIONS.map(action => ({ label: t(`hrApprovals.onTimeout.${action}`), value: action })))

const stepsIncomplete = computed(() => (current.value?.steps ?? []).some(s => (s.approver === "ability" && !s.ability) || (s.approver === "employee" && !s.employeeId)))

function setCategory(step: StepRow, category: string) {
	step.approver = category === "manager" ? "direct_manager" : "unit_head"
}

function move(index: number, by: -1 | 1) {
	const list = current.value!.steps
	;[list[index], list[index + by]] = [list[index + by], list[index]]
}

function insertStep(at: number) {
	current.value!.steps.splice(at, 0, row())
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
	const state = current.value
	if (!state) return
	showErrors.value = true
	if (stepsIncomplete.value) return
	const body = { name: state.flow?.name ?? null, steps: state.steps.map(toStep), is_active: state.isActive }
	saving.value = true
	try {
		if (state.flow) message.success(serverMessage(await updateApprovalFlow(state.flow.id, body), t("hrApprovals.flows.saved")))
		else {
			await createApprovalFlow({ request_type: selected.value, ...body })
			message.success(t("hrApprovals.flows.saved"))
		}
		showErrors.value = false
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

function confirmDelete(flow: ApprovalFlow) {
	dialog.warning({
		title: t("hrApprovals.flows.delete"),
		content: t("hrApprovals.flows.deleteConfirm", { type: requestTypeLabel(t, flow.request_type) }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteApprovalFlow(flow.id)
				message.success(t("hrApprovals.flows.deleted"))
				await load()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}
</script>
