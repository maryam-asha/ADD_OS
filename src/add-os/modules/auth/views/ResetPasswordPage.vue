<template>
	<div class="flex min-h-screen items-center justify-center p-6">
		<div class="w-full max-w-96">
			<div class="font-display mb-8 text-3xl font-bold">{{ t("auth.resetPassword.title") }}</div>

			<n-alert v-if="pageError" type="error" :title="pageError" class="mb-6" />

			<n-form ref="formRef" :model :rules label-placement="top">
				<n-form-item path="password" :label="t('auth.resetPassword.passwordLabel')">
					<n-input v-model:value="model.password" type="password" show-password-on="click" size="large" />
				</n-form-item>
				<n-form-item path="password_confirmation" :label="t('auth.resetPassword.passwordConfirmationLabel')">
					<n-input v-model:value="model.password_confirmation" type="password" show-password-on="click" size="large" />
				</n-form-item>
				<n-button type="primary" class="w-full!" size="large" :loading="submitting" @click="submit">
					{{ t("auth.resetPassword.submit") }}
				</n-button>
			</n-form>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { FormInst, FormRules } from "naive-ui"
import { NAlert, NButton, NForm, NFormItem, NInput, useMessage } from "naive-ui"
import { onBeforeMount, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { isValidPassword } from "@/add-os/modules/system/utils/validation"
import { getCsrfCookie, resetPassword } from "@/add-os/services/auth"
import { ApiError } from "@/add-os/services/api"

interface ModelType {
	password: string
	password_confirmation: string
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const pageError = ref<string | null>(null)
const model = ref<ModelType>({ password: "", password_confirmation: "" })

const rules: FormRules = {
	password: [
		{ required: true, message: t("auth.resetPassword.passwordRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => isValidPassword(value),
			message: t("auth.resetPassword.passwordTooShort"),
			trigger: ["blur", "input"]
		}
	],
	password_confirmation: [
		{ required: true, message: t("auth.resetPassword.passwordConfirmationRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => value === model.value.password,
			message: t("auth.resetPassword.passwordConfirmationMismatch"),
			trigger: ["blur", "input"]
		}
	]
}

async function submit() {
	pageError.value = null
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	const token = String(route.query.token || "")
	const email = String(route.query.email || "")

	submitting.value = true
	try {
		await resetPassword({ token, email, ...model.value })
		message.success(t("auth.resetPassword.success"))
		router.push({ name: "Login" })
	} catch (err: unknown) {
		if (err instanceof ApiError && err.status === 422 && err.data?.errors?.email) {
			// The token/email error comes back keyed on `email`, not `token` (live-confirmed
			// against the real backend) — shown as a page-level alert since neither field
			// on this form is the one the backend is actually complaining about.
			pageError.value = err.data.errors.email[0]
		} else {
			const apiMessage = err instanceof ApiError ? err.data?.message : undefined
			pageError.value = apiMessage || t("auth.resetPassword.genericError")
		}
	} finally {
		submitting.value = false
	}
}

onBeforeMount(async () => {
	try {
		await getCsrfCookie()
	} catch {
		/* ignore; submit will surface errors */
	}
})
</script>
