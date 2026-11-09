<!-- src/add-os/modules/hr/views/core/EditEmployeePage.vue -->
<template>
	<HrFormPage
		:title="t('nav.pages.employeeEdit')"
		:description="employee ? translated(employee.name) : undefined"
		:eyebrow="t('nav.pages.employees')"
		:back-to="{ name: 'hr.employeeProfile', params: { id } }"
		:back-label="t('hr.editEmployee.backToProfile')"
		:loading
		:error="loadError ? t('hr.common.loadError') : null"
	>
		<n-form v-if="employee" ref="formRef" :model="form" :rules label-placement="top" class="flex flex-col gap-5">
			<HrPanel :title="t('hr.editEmployee.personal')" icon="carbon:identification">
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

		<template #aside>
			<HrPanel v-if="employee" :title="t('hr.hire.person')" icon="carbon:user-avatar">
				<n-descriptions :column="1" size="small" label-placement="top">
					<n-descriptions-item :label="t('hr.hire.name')">{{ translated(employee.name) || EMPTY }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.hire.phone')">
						<span dir="ltr">{{ employee.phone || EMPTY }}</span>
					</n-descriptions-item>
					<n-descriptions-item :label="t('hr.hire.workEmail')">
						<span dir="ltr">{{ employee.work_email || EMPTY }}</span>
					</n-descriptions-item>
				</n-descriptions>
				<p class="mt-3 text-sm text-secondary">{{ t("hr.editEmployee.identityHint") }}</p>
			</HrPanel>
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
import { NButton, NDatePicker, NDescriptions, NDescriptionsItem, NForm, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
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
