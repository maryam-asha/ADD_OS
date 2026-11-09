<!-- src/add-os/modules/hr/views/core/RecordEventPage.vue -->
<template>
	<HrFormPage
		:title="t('hr.events.title')"
		:description="employee ? `${translated(employee.name)} · ${employee.employee_number}` : undefined"
		:eyebrow="t('nav.pages.employees')"
		:back-to
		:back-label="t('hr.editEmployee.backToProfile')"
		:loading
		:error="loadError ? t('hr.common.loadError') : null"
	>
		<n-form v-if="employee" ref="formRef" :model="form" :rules label-placement="top" class="flex flex-col gap-5">
			<HrPanel :title="t('hr.events.eventPanel')" icon="carbon:event-schedule">
				<n-form-item path="type" :label="t('hr.events.type')">
					<n-select v-model:value="form.type" :options="typeOptions" :placeholder="t('hr.events.typePlaceholder')" />
				</n-form-item>

				<template v-if="form.type">
					<n-alert v-if="form.type === 'termination'" type="warning" class="mb-4" :title="t('hr.events.terminationTitle')">
						{{ t("hr.events.terminationNote") }}
					</n-alert>

					<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
						<n-form-item path="effectiveOn" :label="effectiveLabel">
							<n-date-picker v-model:formatted-value="form.effectiveOn" value-format="yyyy-MM-dd" type="date" class="w-full" />
						</n-form-item>
						<n-form-item v-if="form.type === 'suspension'" path="effectiveTo" :label="t('hr.events.suspendedUntil')">
							<n-date-picker v-model:formatted-value="form.effectiveTo" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
						</n-form-item>
						<n-form-item v-if="form.type === 'termination'" path="terminationReason" :label="t('hr.events.reason')">
							<n-select v-model:value="form.terminationReason" :options="terminationOptions" />
						</n-form-item>
						<n-form-item v-else path="reason" :label="t('hr.events.reason')">
							<n-input v-model:value="form.reason" :maxlength="32" show-count />
						</n-form-item>
					</div>
				</template>
			</HrPanel>

			<HrPanel v-if="needsContract" :title="t('hr.events.newContract')" icon="carbon:document-signed">
				<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
					<n-form-item path="contractType" :label="t('hr.hire.contractType')">
						<n-select v-model:value="form.contractType" :options="contractTypeOptions" />
					</n-form-item>
					<n-form-item v-if="form.contractType === 'fixed_term'" path="contractEndsOn" :label="t('hr.hire.contractEndsOn')">
						<n-date-picker v-model:formatted-value="form.contractEndsOn" value-format="yyyy-MM-dd" type="date" class="w-full" />
					</n-form-item>
					<n-form-item v-if="form.type === 'rehire'" path="probationEndsOn" :label="t('hr.hire.probationEndsOn')">
						<n-date-picker v-model:formatted-value="form.probationEndsOn" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
					</n-form-item>
					<n-form-item path="noticeDays" :label="t('hr.events.noticeDays')">
						<n-input-number v-model:value="form.noticeDays" :min="0" :max="365" :precision="0" clearable class="w-full" />
					</n-form-item>
					<n-form-item path="contractReference" :label="t('hr.events.contractReference')">
						<n-input v-model:value="form.contractReference" dir="ltr" :maxlength="100" />
					</n-form-item>
				</div>
			</HrPanel>

			<HrPanel
				v-if="needsAssignment"
				:title="form.type === 'rehire' ? t('hr.events.newAssignment') : t('hr.events.assignmentChange')"
				:subtitle="form.type === 'rehire' ? undefined : assignmentHint"
				icon="carbon:enterprise"
			>
				<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
					<n-form-item path="orgUnitId" :label="t('hr.hire.orgUnit')">
						<n-select v-model:value="form.orgUnitId" :options="unitOptions" filterable />
					</n-form-item>
					<n-form-item path="positionId" :label="t('hr.hire.position')">
						<n-select v-model:value="form.positionId" :options="positionOptions" :disabled="!form.orgUnitId" clearable />
					</n-form-item>
					<n-form-item path="jobGradeId" :label="t('hr.hire.jobGrade')">
						<n-select v-model:value="form.jobGradeId" :options="gradeOptions" clearable />
					</n-form-item>
					<n-form-item path="managerId" :label="t('hr.hire.manager')">
						<EmployeeSelect v-model:value="form.managerId" :options="managerOptions" :exclude="[employee.id]" />
					</n-form-item>
					<n-form-item path="workLocationId" :label="t('hr.profile.fields.workLocation')">
						<n-select v-model:value="form.workLocationId" :options="locationOptions" clearable />
					</n-form-item>
					<n-form-item path="employmentType" :label="t('hr.hire.employmentType')">
						<n-select v-model:value="form.employmentType" :options="employmentTypeOptions" />
					</n-form-item>
					<n-form-item path="workMode" :label="t('hr.hire.workMode')">
						<n-select v-model:value="form.workMode" :options="workModeOptions" />
					</n-form-item>
				</div>
			</HrPanel>

			<HrPanel v-if="form.type" :title="t('hr.events.notes')" icon="carbon:notebook">
				<n-form-item path="notes" :show-label="false">
					<n-input v-model:value="form.notes" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" :maxlength="2000" />
				</n-form-item>
			</HrPanel>
		</n-form>

		<template #aside>
			<HrPanel v-if="employee" :title="t('hr.events.currentJob')" icon="carbon:user-avatar">
				<n-descriptions :column="1" size="small" label-placement="top">
					<n-descriptions-item :label="t('hr.hire.orgUnit')">{{ translated(employee.current_assignment?.org_unit?.name) || EMPTY }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.hire.position')">{{ translated(employee.current_assignment?.position?.title) || EMPTY }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.hire.jobGrade')">{{ employee.current_assignment?.job_grade?.code ?? EMPTY }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.hire.manager')">{{ translated(employee.current_assignment?.manager?.name) || EMPTY }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.hire.contractType')">{{ employee.current_contract ? t(`hr.contractType.${employee.current_contract.type}`) : EMPTY }}</n-descriptions-item>
				</n-descriptions>
			</HrPanel>
		</template>

		<template #actions>
			<n-button @click="leave">{{ t("hr.common.cancel") }}</n-button>
			<n-button :type="form.type === 'termination' ? 'error' : 'primary'" :loading="submitting" :disabled="!form.type" @click="submit">
				<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
				{{ t("hr.events.submit") }}
			</n-button>
		</template>
	</HrFormPage>
</template>

<script setup lang="ts">
import type { FormInst, FormItemRule, FormRules, SelectOption } from "naive-ui"
import type {
	ContractType,
	Employee,
	EmploymentType,
	EventAssignmentPayload,
	JobGrade,
	OrgUnit,
	Position,
	RecordableEventType,
	RecordEventPayload,
	TerminationReason,
	WorkLocation,
	WorkMode
} from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NDatePicker, NDescriptions, NDescriptionsItem, NForm, NFormItem, NInput, NInputNumber, NSelect, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormPage from "@/add-os/modules/hr/components/ui/HrFormPage.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { CONTRACT_TYPES, EMPLOYMENT_TYPES, RECORDABLE_EVENT_TYPES, TERMINATION_REASONS, WORK_MODES } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { getEmployee, listJobGrades, listOrgUnits, listPositions, listWorkLocations, recordEmploymentEvent } from "@/add-os/services/hr/core"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Records one change to an employment (RecordEmploymentEventRequest): the
 * fields follow the type. A promotion, transfer or assignment change sends
 * only what differs from the current assignment — the server needs a
 * promotion to change grade or position and a transfer to change unit; a
 * renewal and a rehire open a new contract; a rehire a whole new
 * assignment. A termination is confirmed first, saying what it withdraws.
 *
 * A page of its own under the employee's file (hr.lifecycle.manage), with
 * their job and contract today beside the form. `?type=` opens it on a type,
 * e.g. the promotion a review recommended. Recorded or cancelled, it returns
 * to the file on its career tab. Until 2026-11-09 this was RecordEventModal:
 * see docs/hr/FORMS-AS-PAGES.md.
 */
const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const route = useRoute()
const router = useRouter()

const id = Number(route.params.id)
const backTo = { name: "hr.employeeProfile", params: { id }, query: { tab: "career" } }
const askedType = typeof route.query.type === "string" ? route.query.type : null

const employee = ref<Employee | null>(null)
const loading = ref(true)
const loadError = ref(false)

const ASSIGNMENT_TYPES: readonly RecordableEventType[] = ["promotion", "transfer", "assignment_change"]

interface EventForm {
	type: RecordableEventType | null
	effectiveOn: string | null
	effectiveTo: string | null
	reason: string
	terminationReason: TerminationReason | null
	notes: string
	contractType: ContractType
	contractEndsOn: string | null
	probationEndsOn: string | null
	noticeDays: number | null
	contractReference: string
	orgUnitId: number | null
	positionId: number | null
	jobGradeId: number | null
	managerId: number | null
	workLocationId: number | null
	employmentType: EmploymentType
	workMode: WorkMode
}

function blankForm(): EventForm {
	const e = employee.value
	const a = e?.current_assignment
	return {
		type: null,
		effectiveOn: null,
		effectiveTo: null,
		reason: "",
		terminationReason: null,
		notes: "",
		contractType: e?.current_contract?.type ?? "open_ended",
		contractEndsOn: null,
		probationEndsOn: null,
		noticeDays: e?.current_contract?.notice_period_days ?? null,
		contractReference: "",
		orgUnitId: a?.org_unit?.id ?? null,
		positionId: a?.position?.id ?? null,
		jobGradeId: a?.job_grade?.id ?? null,
		managerId: a?.manager?.id ?? null,
		workLocationId: a?.work_location?.id ?? null,
		employmentType: a?.employment_type ?? "full_time",
		workMode: a?.work_mode ?? "on_site"
	}
}

const formRef = ref<FormInst | null>(null)
const form = ref<EventForm>(blankForm())
const submitting = ref(false)

const needsContract = computed(() => form.value.type === "contract_renewal" || form.value.type === "rehire")
const needsAssignment = computed(() => form.value.type === "rehire" || (form.value.type !== null && ASSIGNMENT_TYPES.includes(form.value.type)))

/**
 * Only the types that can apply to this employee now; the server checks the
 * date as well. A termination recorded for a later day leaves the employee
 * employed until then — their notice period — so everything but a second
 * termination still applies; a rehire waits until that day has passed.
 */
const availableTypes = computed<RecordableEventType[]>(() => {
	const e = employee.value
	if (!e) return []
	if (e.terminated_on && e.terminated_on < todayIso()) return ["rehire"]
	return RECORDABLE_EVENT_TYPES.filter(type => {
		if (type === "rehire") return false
		if (type === "termination") return !e.terminated_on
		if (type === "confirmation") return e.confirmed_on === null && e.probation_ends_on !== null
		if (type === "reinstatement") return e.status === "suspended"
		if (type === "suspension") return e.status !== "suspended"
		return true
	})
})

const typeOptions = computed<SelectOption[]>(() => availableTypes.value.map(type => ({ label: t(`hr.eventType.${type}`), value: type })))
const terminationOptions = computed<SelectOption[]>(() => TERMINATION_REASONS.map(r => ({ label: t(`hr.terminationReason.${r}`), value: r })))
const contractTypeOptions = computed<SelectOption[]>(() => CONTRACT_TYPES.map(v => ({ label: t(`hr.contractType.${v}`), value: v })))
const employmentTypeOptions = computed<SelectOption[]>(() => EMPLOYMENT_TYPES.map(v => ({ label: t(`hr.employmentType.${v}`), value: v })))
const workModeOptions = computed<SelectOption[]>(() => WORK_MODES.map(v => ({ label: t(`hr.workMode.${v}`), value: v })))

const effectiveLabel = computed(() => {
	if (form.value.type === "termination") return t("hr.events.lastWorkingDay")
	if (form.value.type === "suspension") return t("hr.events.suspendedFrom")
	return t("hr.events.effectiveOn")
})

const assignmentHint = computed(() => {
	if (form.value.type === "promotion") return t("hr.events.promotionHint")
	if (form.value.type === "transfer") return t("hr.events.transferHint")
	return t("hr.events.assignmentHint")
})

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "change"] }
const rules = computed<FormRules>(() => {
	const result: Record<string, FormItemRule | FormItemRule[]> = { type: required, effectiveOn: required }
	if (form.value.type === "termination") result.terminationReason = required
	if (form.value.type === "rehire") result.orgUnitId = { ...required, type: "number" }
	if (needsContract.value && form.value.contractType === "fixed_term") result.contractEndsOn = required
	return result
})

// ── Options ─────────────────────────────────────────────────────────────────
const units = ref<OrgUnit[]>([])
const positions = ref<Position[]>([])
const grades = ref<JobGrade[]>([])
const locations = ref<WorkLocation[]>([])
const managerOptions = ref<SelectOption[]>([])

const unitOptions = computed<SelectOption[]>(() => units.value.filter(u => u.is_active || u.id === form.value.orgUnitId).map(u => ({ label: translated(u.name), value: u.id })))
const positionOptions = computed<SelectOption[]>(() =>
	positions.value
		.filter(p => p.is_active || p.id === form.value.positionId)
		.map(p => ({ label: `${translated(p.title)} (${p.occupied}/${p.headcount})`, value: p.id, disabled: p.occupied >= p.headcount && p.id !== form.value.positionId }))
)
const gradeOptions = computed<SelectOption[]>(() => grades.value.map(g => ({ label: `${g.code} · ${translated(g.name)}`, value: g.id })))
const locationOptions = computed<SelectOption[]>(() => locations.value.map(l => ({ label: translated(l.name), value: l.id })))

onMounted(async () => {
	try {
		employee.value = await getEmployee(id)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		loadError.value = true
		return
	} finally {
		loading.value = false
	}
	form.value = blankForm()
	if (availableTypes.value.includes(askedType as RecordableEventType)) form.value.type = askedType as RecordableEventType
	const manager = employee.value.current_assignment?.manager
	managerOptions.value = manager ? [{ label: `${translated(manager.name)} · ${manager.employee_number}`, value: manager.id }] : []
	void quietly(listOrgUnits, v => (units.value = v))
	void quietly(listJobGrades, v => (grades.value = v))
	void quietly(listWorkLocations, v => (locations.value = v))
	void loadPositions(form.value.orgUnitId)
})

function leave() {
	void router.push(backTo)
}

/**
 * A position belongs to one unit, so once the unit's positions are in, a
 * chosen position from another unit is dropped. Reopening the form on the
 * current unit therefore keeps the current position — clearing it there
 * would send a promotion `position_id: null` nobody asked for.
 */
async function loadPositions(unitId: number | null) {
	positions.value = []
	if (!unitId) {
		form.value.positionId = null
		return
	}
	let loaded = false
	await quietly(
		() => listPositions(unitId),
		v => {
			positions.value = v
			loaded = true
		}
	)
	if (!loaded || form.value.orgUnitId !== unitId) return
	if (form.value.positionId !== null && !positions.value.some(p => p.id === form.value.positionId)) form.value.positionId = null
}

watch(
	() => form.value.orgUnitId,
	unitId => void loadPositions(unitId)
)

// ── Submit ──────────────────────────────────────────────────────────────────

/** For a change: the fields that differ from today's assignment. For a rehire: all of them. */
function assignmentPayload(f: EventForm): EventAssignmentPayload {
	const next: EventAssignmentPayload = {
		org_unit_id: f.orgUnitId,
		position_id: f.positionId,
		job_grade_id: f.jobGradeId,
		manager_id: f.managerId,
		work_location_id: f.workLocationId,
		employment_type: f.employmentType,
		work_mode: f.workMode
	}
	if (f.type === "rehire") return next
	const a = employee.value?.current_assignment
	const current: EventAssignmentPayload = {
		org_unit_id: a?.org_unit?.id ?? null,
		position_id: a?.position?.id ?? null,
		job_grade_id: a?.job_grade?.id ?? null,
		manager_id: a?.manager?.id ?? null,
		work_location_id: a?.work_location?.id ?? null,
		employment_type: a?.employment_type,
		work_mode: a?.work_mode
	}
	const changed: EventAssignmentPayload = {}
	for (const key of Object.keys(next) as (keyof EventAssignmentPayload)[]) {
		if (next[key] !== current[key]) Object.assign(changed, { [key]: next[key] })
	}
	return changed
}

function buildPayload(f: EventForm): RecordEventPayload {
	const type = f.type as RecordableEventType
	const payload: RecordEventPayload = {
		type,
		effective_on: f.effectiveOn as string,
		reason: type === "termination" ? f.terminationReason : nullable(f.reason),
		notes: nullable(f.notes)
	}
	if (type === "suspension") payload.effective_to = f.effectiveTo
	if (needsContract.value) {
		payload.contract = {
			type: f.contractType,
			ends_on: f.contractType === "fixed_term" ? f.contractEndsOn : null,
			notice_period_days: f.noticeDays,
			reference: nullable(f.contractReference)
		}
		if (type === "rehire") payload.contract.probation_ends_on = f.probationEndsOn
	}
	if (needsAssignment.value) payload.assignment = assignmentPayload(f)
	return payload
}

async function send(payload: RecordEventPayload) {
	submitting.value = true
	try {
		await recordEmploymentEvent(id, payload)
		message.success(t("hr.events.recorded", { type: t(`hr.eventType.${payload.type}`) }))
		leave()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		submitting.value = false
	}
}

async function submit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	const payload = buildPayload(form.value)
	if (needsAssignment.value && payload.type !== "rehire" && Object.keys(payload.assignment ?? {}).length === 0) {
		message.warning(t("hr.events.nothingChanged"))
		return
	}

	if (payload.type !== "termination") {
		await send(payload)
		return
	}

	dialog.warning({
		title: t("hr.events.terminationConfirmTitle", { name: translated(employee.value?.name) }),
		content: t("hr.events.terminationConfirm", { date: formatDate(payload.effective_on) }),
		positiveText: t("hr.events.terminationConfirmOk"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: () => send(payload)
	})
}
</script>
