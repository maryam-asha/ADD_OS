<!-- src/add-os/modules/members/components/AddCompanyMemberDialog.vue -->
<template>
	<n-modal v-model:show="show" preset="card" :title="t('companyMembers.add.title')" style="max-width: 28rem" content-style="max-height: 60vh; overflow-y: auto">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<n-form-item path="user_id" :label="t('companyMembers.add.userLabel')">
				<n-select v-model:value="form.user_id" :options="userOptions" :loading="isLoadingUsers" filterable />
			</n-form-item>
			<n-form-item path="door_access_enabled" :label="t('companyMembers.add.doorAccessLabel')">
				<n-switch v-model:value="form.door_access_enabled" />
			</n-form-item>
			<n-form-item path="is_admin" :label="t('companyMembers.add.adminLabel')">
				<n-switch v-model:value="form.is_admin" />
				<p class="mt-1 text-secondary">{{ t("companyMembers.add.adminHint") }}</p>
			</n-form-item>
		</n-form>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("resourceCrud.form.cancel") }}</n-button>
				<n-button type="primary" :loading="isSubmitting" @click="submit">{{ t("resourceCrud.form.submit") }}</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import { NButton, NForm, NFormItem, NModal, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useCompanyDetail } from "@/add-os/modules/members/composables/useCompanyDetail"
import { ApiError } from "@/add-os/services/api"

const props = defineProps<{ companyId: number }>()
const show = defineModel<boolean>("show", { required: true })
const emit = defineEmits<{ added: [] }>()

const { t } = useI18n()
const message = useMessage()
const { users, isLoadingUsers, addMember } = useCompanyDetail(props.companyId)

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)

function emptyForm() {
	return { user_id: null as number | null, door_access_enabled: false, is_admin: false }
}

const form = ref(emptyForm())

watch(show, visible => {
	if (visible) {
		form.value = emptyForm()
		formRef.value?.restoreValidation()
	}
})

const userOptions = computed<SelectOption[]>(() => users.value.map(user => ({ label: `${user.name} — ${user.phone}`, value: user.id })))

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
		await addMember({ user_id: form.value.user_id, door_access_enabled: form.value.door_access_enabled, is_admin: form.value.is_admin })
		message.success(t("companyMembers.add.success"))
		show.value = false
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
