<!-- src/add-os/modules/hr/views/core/EditEmployeePage.vue -->
<template>
	<HrFormPage
		:title="t('nav.pages.employeeEdit')"
		:description="t('hr.editEmployee.description')"
		:back-to="{ name: 'hr.employeeProfile', params: { id } }"
		:back-label="t('hr.editEmployee.backToProfile')"
		:loading
		:error="loadError ? t('hr.common.loadError') : null"
	>
		<n-form v-if="employee" ref="formRef" :model="form" :rules label-placement="top" class="flex flex-col gap-5">
			<HrPanel :title="t('hr.editEmployee.personal')" :subtitle="t('hr.editEmployee.personalHint')" icon="carbon:identification">
				<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
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
			</HrPanel>

			<HrPanel :title="t('hr.editEmployee.contact')" :subtitle="t('hr.editEmployee.contactHint')" icon="carbon:location">
				<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
					<n-form-item path="personalEmail" :label="t('hr.hire.personalEmail')">
						<n-input v-model:value="form.personalEmail" dir="ltr" />
					</n-form-item>
				</div>
				<n-form-item path="address" :label="t('hr.editEmployee.address')">
					<n-input v-model:value="form.address" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="500" />
				</n-form-item>
			</HrPanel>

			<HrPanel :title="t('hr.sensitive.title')" :subtitle="t('hr.editEmployee.sensitiveHint')" icon="carbon:locked">
				<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
					<n-form-item path="nationalId" :label="t('hr.sensitive.nationalId')">
						<n-input
							v-model:value="form.nationalId"
							dir="ltr"
							:maxlength="64"
							:placeholder="employee.has_national_id ? t('hr.editEmployee.keepCurrent') : undefined"
							autocomplete="off"
						/>
					</n-form-item>
					<n-form-item path="bankAccount" :label="t('hr.sensitive.bankAccount')">
						<n-input
							v-model:value="form.bankAccount"
							dir="ltr"
							:maxlength="64"
							:placeholder="employee.has_bank_account ? t('hr.editEmployee.keepCurrent') : undefined"
							autocomplete="off"
						/>
					</n-form-item>
				</div>
			</HrPanel>
		</n-form>

		<!-- Whose details these are, and what this page cannot change. -->
		<template #aside>
			<section v-if="employee" class="flex flex-col overflow-hidden rounded-add-large border border-[var(--add-border)] bg-[var(--add-surface-raised)]" data-test="employee-summary">
				<div class="flex flex-col items-center gap-2 px-4 pb-5 pt-6 text-center">
					<EmployeeAvatar :name="employee.name" size="xl" shape="disc" />
					<h2 class="text-lg font-bold">{{ translated(employee.name) || EMPTY }}</h2>
					<EmployeeStatusTag :status="employee.status" />
					<span v-if="role" class="text-sm text-secondary">{{ role }}</span>
					<span class="font-mono text-xs text-secondary" dir="ltr">{{ employee.employee_number }}</span>
				</div>

				<dl class="flex flex-col gap-3 border-t border-[var(--add-border)] px-4 py-4">
					<div v-for="row in accountRows" :key="row.label" class="flex items-center gap-3">
						<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-add-default bg-[var(--add-surface-sunken)] text-primary">
							<Icon :name="row.icon" :size="16" />
						</span>
						<div class="flex min-w-0 flex-col items-start">
							<dt class="text-xs font-normal text-secondary">{{ row.label }}</dt>
							<dd class="max-w-full truncate text-sm font-semibold" dir="ltr">{{ row.value }}</dd>
						</div>
					</div>
				</dl>

				<p class="flex items-start gap-2 border-t border-[var(--add-border)] bg-[var(--add-surface-sunken)] px-4 py-3 text-xs text-secondary">
					<Icon name="carbon:locked" :size="14" class="mt-0.5 shrink-0" />
					<span>{{ t("hr.editEmployee.identityHint") }}</span>
				</p>
			</section>
		</template>

		<template #status>
			<span v-if="dirty" class="inline-flex items-center gap-2 font-semibold text-[var(--add-warning-text)]" data-test="unsaved">
				<span class="h-2 w-2 rounded-full bg-[var(--add-warning)]" aria-hidden="true" />
				{{ t("hr.editEmployee.unsaved") }}
			</span>
			<span v-else>{{ t("hr.editEmployee.noChanges") }}</span>
		</template>

		<template #actions>
			<n-button @click="leave">{{ t("hr.common.cancel") }}</n-button>
			<n-button type="primary" :loading="saving" @click="save">
				<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
				{{ t("hr.common.save") }}
			</n-button>
		</template>
	</HrFormPage>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { Employee, Gender, MaritalStatus, UpdateEmployeePayload } from "@/add-os/modules/hr/types/hr"
import { NButton, NDatePicker, NForm, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import EmployeeAvatar from "@/add-os/modules/hr/components/ui/EmployeeAvatar.vue"
import HrFormPage from "@/add-os/modules/hr/components/ui/HrFormPage.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { GENDERS, MARITAL_STATUSES } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { getEmployee, updateEmployee } from "@/add-os/services/hr/core"
import Icon from "@/components/common/Icon.vue"

/**
 * The employee's personal details (UpdateEmployeeRequest), kept on their
 * account's profile, on a page of their own. The name, phone and work email
 * are the account's own: shown beside the form, changed on the Users page,
 * refused by the server from HR. The national ID and bank account are
 * write-only here: left blank they keep what is on file, since the profile
 * never carries the values themselves.
 *
 * The page reads as three sections (personal, contact, the encrypted pair)
 * beside a card naming whose details these are: the file's initials,
 * status, job and number, then the account's phone and email with why they
 * are not edited here. The bar at the bottom says whether anything has
 * changed. Redesigned 2026-11-12 on review; the side panel before listed the
 * account's three fields as bare label and value pairs, and the header
 * repeated the section the breadcrumb already names.
 *
 * This was EditEmployeeModal until 2026-11-09: see docs/hr/FORMS-AS-PAGES.md.
 */
const { t } = useI18n()
const message = useMessage()
const route = useRoute()
const router = useRouter()

const id = Number(route.params.id)

interface PersonalForm {
	gender: Gender | null
	dateOfBirth: string | null
	nationality: string
	maritalStatus: MaritalStatus | null
	personalEmail: string
	address: string
	nationalId: string
	bankAccount: string
}

/** The server wants a birth date before today, not on it. */
const startOfToday = new Date().setHours(0, 0, 0, 0)

const formRef = ref<FormInst | null>(null)
const employee = ref<Employee | null>(null)
const loading = ref(true)
const loadError = ref(false)
const saving = ref(false)
const form = ref<PersonalForm>({
	gender: null,
	dateOfBirth: null,
	nationality: "",
	maritalStatus: null,
	personalEmail: "",
	address: "",
	nationalId: "",
	bankAccount: ""
})
/** The form as loaded, to tell whether anything has changed since. */
const loaded = ref("")
const dirty = computed(() => loaded.value !== "" && JSON.stringify(form.value) !== loaded.value)

/** The job and the unit held now, under the name. */
const role = computed(() => {
	const job = employee.value?.current_assignment
	return [translated(job?.job_title), translated(job?.org_unit?.name)].filter(Boolean).join(" · ")
})

/** The account's own contact details, shown and never edited here. */
const accountRows = computed(() => [
	{ label: t("hr.hire.phone"), value: employee.value?.phone || EMPTY, icon: "carbon:phone" },
	{ label: t("hr.hire.workEmail"), value: employee.value?.work_email || EMPTY, icon: "carbon:email" }
])

function fromEmployee(e: Employee): PersonalForm {
	return {
		gender: e.gender,
		dateOfBirth: e.date_of_birth,
		nationality: e.nationality ?? "",
		maritalStatus: e.marital_status,
		personalEmail: e.personal_email ?? "",
		address: e.address ?? "",
		nationalId: "",
		bankAccount: ""
	}
}

onMounted(async () => {
	try {
		employee.value = await getEmployee(id)
		form.value = fromEmployee(employee.value)
		loaded.value = JSON.stringify(form.value)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		loadError.value = true
	} finally {
		loading.value = false
	}
})

const genderOptions = computed<SelectOption[]>(() => GENDERS.map(g => ({ label: t(`hr.gender.${g}`), value: g })))
const maritalOptions = computed<SelectOption[]>(() => MARITAL_STATUSES.map(m => ({ label: t(`hr.maritalStatus.${m}`), value: m })))

const rules: FormRules = {
	nationality: { pattern: /^[A-Z]{2}$/, message: () => t("hr.editEmployee.nationalityHint"), trigger: ["blur"] },
	personalEmail: { type: "email", message: () => t("hr.common.invalidEmail"), trigger: ["blur"] }
}

function leave() {
	void router.push({ name: "hr.employeeProfile", params: { id } })
}

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	const f = form.value
	const payload: UpdateEmployeePayload = {
		gender: f.gender,
		date_of_birth: f.dateOfBirth,
		nationality: nullable(f.nationality),
		marital_status: f.maritalStatus,
		personal_email: nullable(f.personalEmail),
		address: nullable(f.address)
	}
	if (f.nationalId.trim()) payload.national_id = f.nationalId.trim()
	if (f.bankAccount.trim()) payload.bank_account = f.bankAccount.trim()

	saving.value = true
	try {
		message.success(serverMessage(await updateEmployee(id, payload), t("hr.editEmployee.saved")))
		leave()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
