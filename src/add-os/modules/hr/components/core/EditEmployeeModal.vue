<!-- src/add-os/modules/hr/components/core/EditEmployeeModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t('hr.editEmployee.title')" icon="carbon:user-profile">
		<div class="mb-4 rounded-add-default border border-[var(--add-border)] bg-[var(--add-surface-sunken)] p-3">
			<n-descriptions :column="1" size="small" label-placement="left">
				<n-descriptions-item :label="t('hr.hire.name')">{{ translated(employee.name) || EMPTY }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.hire.phone')">
					<span dir="ltr">{{ employee.phone || EMPTY }}</span>
				</n-descriptions-item>
				<n-descriptions-item :label="t('hr.hire.workEmail')">
					<span dir="ltr">{{ employee.work_email || EMPTY }}</span>
				</n-descriptions-item>
			</n-descriptions>
			<p class="mt-2 text-sm text-secondary">{{ t("hr.editEmployee.identityHint") }}</p>
		</div>

		<n-form ref="formRef" :model="form" :rules label-placement="top">
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

			<h3 class="mb-1 mt-2 font-semibold">{{ t("hr.sensitive.title") }}</h3>
			<p class="mb-3 text-sm text-secondary">{{ t("hr.editEmployee.sensitiveHint") }}</p>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
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
		</n-form>

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
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { Employee, Gender, MaritalStatus, UpdateEmployeePayload } from "@/add-os/modules/hr/types/hr"
import { NButton, NDatePicker, NDescriptions, NDescriptionsItem, NForm, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { GENDERS, MARITAL_STATUSES } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { updateEmployee } from "@/add-os/services/hr/core"
import Icon from "@/components/common/Icon.vue"

/**
 * The employee's personal details (UpdateEmployeeRequest), kept on their
 * account's profile. The name, phone and work email are the account's own:
 * shown here, changed on the Users page, refused by the server from HR. The
 * national ID and bank account are write-only here: left blank they keep
 * what is on file, since the profile never carries the values themselves.
 */
const props = defineProps<{ employee: Employee }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()

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
const saving = ref(false)
const form = ref<PersonalForm>(fromEmployee())

function fromEmployee(): PersonalForm {
	const e = props.employee
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

watch(show, visible => {
	if (visible) form.value = fromEmployee()
})

const genderOptions = computed<SelectOption[]>(() => GENDERS.map(g => ({ label: t(`hr.gender.${g}`), value: g })))
const maritalOptions = computed<SelectOption[]>(() => MARITAL_STATUSES.map(m => ({ label: t(`hr.maritalStatus.${m}`), value: m })))

const email = { type: "email" as const, message: () => t("hr.common.invalidEmail"), trigger: ["blur"] }
const rules: FormRules = {
	nationality: { pattern: /^[A-Z]{2}$/, message: () => t("hr.editEmployee.nationalityHint"), trigger: ["blur"] },
	personalEmail: email
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
		message.success(serverMessage(await updateEmployee(props.employee.id, payload), t("hr.editEmployee.saved")))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
