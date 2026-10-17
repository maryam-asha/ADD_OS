<!-- src/add-os/modules/members/components/AddCompanyMemberForm.vue -->
<!--
	Adds a member to a company, inline on the company's own page rather than in
	a dialog. It takes the page's single useCompanyDetail state as props instead
	of calling the composable itself, so opening the page fetches the company,
	its members and the user list once — not once per consumer.
-->
<template>
	<n-form ref="formRef" :model="form" :rules label-placement="top" class="flex flex-col gap-1">
		<div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 items-end">
			<n-form-item path="user_id" :label="t('companyMembers.add.userLabel')">
				<n-select v-model:value="form.user_id" :options="userOptions" :loading="isLoadingUsers" filterable clearable />
			</n-form-item>
			<n-form-item path="door_access_enabled" :label="t('companyMembers.add.doorAccessLabel')">
				<n-switch v-model:value="form.door_access_enabled" />
			</n-form-item>
			<n-form-item path="is_admin" :label="t('companyMembers.add.adminLabel')">
				<n-switch v-model:value="form.is_admin" />
			</n-form-item>
		</div>
		<p class="text-xs text-[var(--add-text-secondary)]">{{ t("companyMembers.add.adminHint") }}</p>
		<div class="flex justify-end gap-2 pt-2">
			<n-button @click="emit('cancel')">{{ t("resourceCrud.form.cancel") }}</n-button>
			<n-button type="primary" :loading="isSubmitting" @click="submit">{{ t("companyMembers.add.button") }}</n-button>
		</div>
	</n-form>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { AddCompanyMemberPayload } from "@/add-os/modules/members/types/company-member"
import type { User } from "@/add-os/modules/system/types/user"
import { NButton, NForm, NFormItem, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"

const props = defineProps<{
	users: User[]
	isLoadingUsers: boolean
	addMember: (payload: AddCompanyMemberPayload) => Promise<unknown>
}>()
const emit = defineEmits<{ added: []; cancel: [] }>()
const { t } = useI18n()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)

function emptyForm() {
	return { user_id: null as number | null, door_access_enabled: false, is_admin: false }
}

const form = ref(emptyForm())

const userOptions = computed<SelectOption[]>(() => props.users.map(user => ({ label: `${user.name} — ${user.phone}`, value: user.id })))

const rules: FormRules = {
	user_id: { required: true, type: "number", message: t("companyMembers.add.userRequired"), trigger: ["change"] }
}

async function submit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	if (form.value.user_id === null) return

	isSubmitting.value = true
	try {
		await props.addMember({ user_id: form.value.user_id, door_access_enabled: form.value.door_access_enabled, is_admin: form.value.is_admin })
		message.success(t("companyMembers.add.success"))
		form.value = emptyForm()
		formRef.value?.restoreValidation()
		emit("added")
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status === 422) message.error(caught.data?.message ?? t("companyMembers.add.alreadyMemberError"))
		else if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
		else message.error(t("resourceCrud.mutations.genericError"))
	} finally {
		isSubmitting.value = false
	}
}

defineExpose({ submit, form })
</script>
