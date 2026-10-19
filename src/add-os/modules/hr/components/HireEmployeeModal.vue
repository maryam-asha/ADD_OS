<!-- src/add-os/modules/hr/components/HireEmployeeModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t('hr.hire.title')" icon="carbon:user-follow">
		<n-steps :current="step" size="small" class="mb-5">
			<n-step :title="t('hr.hire.person')" />
			<n-step :title="t('hr.hire.job')" />
		</n-steps>

		<!-- Step 1: who. An existing account brings its name, phone and email; a new person makes one. -->
		<n-form v-show="step === 1" ref="personRef" :model="form" :rules="personRules" label-placement="top">
			<n-radio-group v-model:value="form.mode" class="mb-4">
				<n-radio-button value="existing">{{ t("hr.hire.existingAccount") }}</n-radio-button>
				<n-radio-button value="new">{{ t("hr.hire.newPerson") }}</n-radio-button>
			</n-radio-group>

			<template v-if="form.mode === 'existing'">
				<n-form-item path="accountId" :label="t('hr.hire.searchAccount')" :feedback="t('hr.hire.searchAccountHint')">
					<n-select
						v-model:value="form.accountId"
						:options="accountOptions"
						:loading="searching"
						:placeholder="t('hr.hire.searchAccount')"
						filterable
						remote
						clearable
						:clear-filter-after-select="false"
						@search="onSearch"
					>
						<template #empty>
							<span class="text-secondary">{{ t("hr.hire.noAccounts") }}</span>
						</template>
					</n-select>
				</n-form-item>
				<div v-if="selectedAccount" class="mb-4 rounded-add-default border border-[var(--add-border)] bg-[var(--add-surface-sunken)] p-3">
					<n-alert v-if="selectedAccount.employee_id" type="warning" show-icon class="mb-2">
						{{ t("hr.hire.alreadyEmployee") }}
						<n-button text type="primary" class="ms-1" @click="openProfile(selectedAccount.employee_id)">{{ t("hr.hire.openProfile") }}</n-button>
					</n-alert>
					<n-descriptions :column="1" size="small" label-placement="left">
						<n-descriptions-item :label="t('hr.hire.name')">{{ selectedAccount.name || EMPTY }}</n-descriptions-item>
						<n-descriptions-item :label="t('hr.hire.phone')">
							<span dir="ltr">{{ selectedAccount.phone || EMPTY }}</span>
						</n-descriptions-item>
						<n-descriptions-item :label="t('hr.hire.workEmail')">
							<span dir="ltr">{{ selectedAccount.email || EMPTY }}</span>
						</n-descriptions-item>
					</n-descriptions>
					<p class="mt-2 text-sm text-secondary">{{ t("hr.hire.identityFromAccount") }}</p>
				</div>
			</template>

			<template v-else>
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
			</template>

			<n-collapse class="mt-1">
				<n-collapse-item :title="t('hr.hire.details')" name="details">
					<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
						<n-form-item path="gender" :label="t('hr.editEmployee.gender')">
							<n-select v-model:value="form.gender" :options="genderOptions" clearable />
						</n-form-item>
						<n-form-item path="dateOfBirth" :label="t('hr.editEmployee.dateOfBirth')">
							<n-date-picker
								v-model:formatted-value="form.dateOfBirth"
								value-format="yyyy-MM-dd"
								type="date"
								clearable
								class="w-full"
								:is-date-disabled="(ts: number) => ts >= startOfToday"
							/>
						</n-form-item>
						<n-form-item path="nationality" :label="t('hr.editEmployee.nationality')" :feedback="t('hr.editEmployee.nationalityHint')">
							<n-input :value="form.nationality" dir="ltr" :maxlength="2" @update:value="(v: string) => (form.nationality = v.toUpperCase())" />
						</n-form-item>
						<n-form-item path="maritalStatus" :label="t('hr.editEmployee.maritalStatus')">
							<n-select v-model:value="form.maritalStatus" :options="maritalOptions" clearable />
						</n-form-item>
					</div>
					<n-form-item path="personalEmail" :label="t('hr.hire.personalEmail')">
						<n-input v-model:value="form.personalEmail" dir="ltr" />
					</n-form-item>
					<n-form-item path="address" :label="t('hr.editEmployee.address')">
						<n-input v-model:value="form.address" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="500" />
					</n-form-item>
					<p class="mb-3 text-sm text-secondary">{{ t("hr.editEmployee.sensitiveHint") }}</p>
					<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
						<n-form-item path="nationalId" :label="t('hr.sensitive.nationalId')">
							<n-input v-model:value="form.nationalId" dir="ltr" :maxlength="64" autocomplete="off" />
						</n-form-item>
						<n-form-item path="bankAccount" :label="t('hr.sensitive.bankAccount')">
							<n-input v-model:value="form.bankAccount" dir="ltr" :maxlength="64" autocomplete="off" />
						</n-form-item>
					</div>
				</n-collapse-item>
			</n-collapse>
		</n-form>

		<!-- Step 2: the job and the first contract. -->
		<n-form v-show="step === 2" ref="jobRef" :model="form" :rules="jobRules" label-placement="top">
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
				<n-select v-model:value="form.workLocationId" :options="locationOptions" clearable filterable />
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
				<n-button v-if="step === 2" @click="step = 1">{{ t("hr.common.back") }}</n-button>
				<n-button v-if="step === 1" type="primary" :disabled="selectedAccount?.employee_id != null" @click="next">
					{{ t("hr.hire.next") }}
				</n-button>
				<n-button v-else type="primary" :loading="submitting" @click="submit">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("hr.hire.submit") }}
				</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type {
	AccountMatch,
	ContractType,
	EmploymentType,
	Gender,
	HireEmployeePayload,
	JobGrade,
	MaritalStatus,
	OrgUnit,
	Position,
	WorkLocation,
	WorkMode
} from "@/add-os/modules/hr/types/hr"
import {
	NAlert,
	NButton,
	NCollapse,
	NCollapseItem,
	NDatePicker,
	NDescriptions,
	NDescriptionsItem,
	NForm,
	NFormItem,
	NInput,
	NRadioButton,
	NRadioGroup,
	NSelect,
	NStep,
	NSteps,
	useMessage
} from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { CONTRACT_TYPES, EMPLOYMENT_TYPES, GENDERS, MARITAL_STATUSES, WORK_MODES } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { hireEmployee, listJobGrades, listPositions, listWorkLocations, searchAccounts } from "@/add-os/services/hr/core"
import Icon from "@/components/common/Icon.vue"

/**
 * Hiring in two steps. First the person: in ADD they are kept on their
 * account, so HR either picks an existing one (a member who joins the team
 * keeps theirs; its name, phone and email are shown, never re-entered) or
 * gives what a new one is made from. Then the job and the first contract.
 * `account` preselects an account (the Users page's "Hire").
 */
const props = defineProps<{ units: OrgUnit[]; account?: AccountMatch | null }>()
const emit = defineEmits<{ hired: [id: number] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const router = useRouter()

interface HireForm {
	mode: "existing" | "new"
	accountId: number | null
	nameAr: string
	nameEn: string
	phone: string
	workEmail: string
	gender: Gender | null
	dateOfBirth: string | null
	nationality: string
	maritalStatus: MaritalStatus | null
	personalEmail: string
	address: string
	nationalId: string
	bankAccount: string
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
		mode: "existing",
		accountId: props.account?.id ?? null,
		nameAr: "",
		nameEn: "",
		phone: "",
		workEmail: "",
		gender: null,
		dateOfBirth: null,
		nationality: "",
		maritalStatus: null,
		personalEmail: "",
		address: "",
		nationalId: "",
		bankAccount: "",
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

/** The server wants a birth date before today, not on it. */
const startOfToday = new Date().setHours(0, 0, 0, 0)

const personRef = ref<FormInst | null>(null)
const jobRef = ref<FormInst | null>(null)
const form = ref<HireForm>(blankForm())
const step = ref<1 | 2>(1)
const submitting = ref(false)

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "change"] }
const email = { type: "email" as const, message: () => t("hr.common.invalidEmail"), trigger: ["blur"] }
const personRules = computed<FormRules>(() => {
	const details: FormRules = {
		nationality: { pattern: /^[A-Z]{2}$/, message: () => t("hr.editEmployee.nationalityHint"), trigger: ["blur"] },
		personalEmail: email
	}
	if (form.value.mode === "existing") {
		return { ...details, accountId: { required: true, type: "number", message: () => t("hr.hire.accountRequired"), trigger: ["change", "blur"] } }
	}
	return { ...details, nameAr: required, phone: required, workEmail: [required, email] }
})
const jobRules = computed<FormRules>(() => ({
	hiredOn: required,
	orgUnitId: { ...required, type: "number" },
	contractEndsOn: form.value.contractType === "fixed_term" ? required : []
}))

// ── The account ─────────────────────────────────────────────────────────────
const accounts = ref<AccountMatch[]>([])
const searching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined

const selectedAccount = computed(() => accounts.value.find(a => a.id === form.value.accountId) ?? null)
const accountOptions = computed<SelectOption[]>(() =>
	accounts.value.map(a => ({ label: [a.name, a.phone].filter(Boolean).join(" · ") || `#${a.id}`, value: a.id }))
)

/** Debounced; the server needs three characters. */
function onSearch(query: string) {
	clearTimeout(searchTimer)
	const term = query.trim()
	if (term.length < 3) return
	searchTimer = setTimeout(async () => {
		searching.value = true
		try {
			const found = await searchAccounts(term)
			// Keep the chosen account listed even when the new search misses it.
			const chosen = selectedAccount.value
			accounts.value = chosen && !found.some(a => a.id === chosen.id) ? [chosen, ...found] : found
		} catch (e) {
			if (!(e instanceof ApiError)) throw e
		} finally {
			searching.value = false
		}
	}, 300)
}

function openProfile(id: number) {
	show.value = false
	void router.push({ name: "hr.employeeProfile", params: { id } })
}

// ── Options ─────────────────────────────────────────────────────────────────
const positions = ref<Position[]>([])
const grades = ref<JobGrade[]>([])
const locations = ref<WorkLocation[]>([])

const unitOptions = computed<SelectOption[]>(() => props.units.filter(u => u.is_active).map(u => ({ label: translated(u.name), value: u.id })))
const positionOptions = computed<SelectOption[]>(() =>
	positions.value.filter(p => p.is_active).map(p => ({ label: `${translated(p.title)} (${p.occupied}/${p.headcount})`, value: p.id, disabled: p.occupied >= p.headcount }))
)
const locationOptions = computed<SelectOption[]>(() => locations.value.map(l => ({ label: translated(l.name), value: l.id })))
const gradeOptions = computed<SelectOption[]>(() => grades.value.map(g => ({ label: `${g.code} · ${translated(g.name)}`, value: g.id })))
const genderOptions = computed<SelectOption[]>(() => GENDERS.map(g => ({ label: t(`hr.gender.${g}`), value: g })))
const maritalOptions = computed<SelectOption[]>(() => MARITAL_STATUSES.map(m => ({ label: t(`hr.maritalStatus.${m}`), value: m })))
const employmentTypeOptions = computed<SelectOption[]>(() => EMPLOYMENT_TYPES.map(v => ({ label: t(`hr.employmentType.${v}`), value: v })))
const workModeOptions = computed<SelectOption[]>(() => WORK_MODES.map(v => ({ label: t(`hr.workMode.${v}`), value: v })))
const contractTypeOptions = computed<SelectOption[]>(() => CONTRACT_TYPES.map(v => ({ label: t(`hr.contractType.${v}`), value: v })))

watch(show, async visible => {
	if (!visible) return
	form.value = blankForm()
	step.value = 1
	accounts.value = props.account ? [props.account] : []
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

// ── Steps and submit ────────────────────────────────────────────────────────
async function next() {
	try {
		await personRef.value?.validate()
	} catch {
		return
	}
	step.value = 2
}

function payload(): HireEmployeePayload {
	const f = form.value
	const person =
		f.mode === "existing"
			? { user_id: f.accountId as number }
			: { name: { ar: f.nameAr.trim(), en: nullable(f.nameEn) }, phone: f.phone.trim(), work_email: f.workEmail.trim() }

	return {
		...person,
		gender: f.gender,
		date_of_birth: f.dateOfBirth,
		nationality: nullable(f.nationality),
		marital_status: f.maritalStatus,
		personal_email: nullable(f.personalEmail),
		address: nullable(f.address),
		national_id: nullable(f.nationalId),
		bank_account: nullable(f.bankAccount),
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
	}
}

async function submit() {
	try {
		await jobRef.value?.validate()
	} catch {
		return
	}

	submitting.value = true
	try {
		const employee = await hireEmployee(payload())
		message.success(t("hr.hire.success"))
		show.value = false
		emit("hired", employee.id)
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.loadError")))
	} finally {
		submitting.value = false
	}
}
</script>
