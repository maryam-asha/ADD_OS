<template>
	<AuthShell
		:title="t('auth.forgotPassword.title')"
		:subtitle="t('auth.forgotPassword.subtitle')"
		show-back
		@back="backToSignIn"
	>
		<n-alert v-if="sent" type="success" :title="t('auth.forgotPassword.success')" class="mb-6" />

		<n-form v-if="!sent" ref="formRef" :model :rules label-placement="top">
			<n-form-item path="email" :label="t('auth.forgotPassword.emailLabel')" first>
				<n-input
					v-model:value="model.email"
					:placeholder="t('auth.forgotPassword.emailPlaceholder')"
					size="large"
					autocomplete="username"
					@keydown.enter="submit"
				/>
			</n-form-item>

			<n-alert v-if="pageError" type="error" :title="pageError" class="mb-6" />

			<n-button type="primary" class="w-full!" size="large" :loading="submitting" @click="submit">
				{{ t("auth.forgotPassword.submit") }}
			</n-button>
		</n-form>

		<div class="mt-6 flex justify-center">
			<router-link v-slot="{ navigate }" :to="{ name: 'Login' }" custom>
				<n-button text type="primary" @click="navigate">
					{{ t("auth.forgotPassword.backToSignIn") }}
				</n-button>
			</router-link>
		</div>
	</AuthShell>
</template>

<script lang="ts" setup>
import type { FormInst, FormItemRule, FormRules } from "naive-ui"
import { NAlert, NButton, NForm, NFormItem, NInput } from "naive-ui"
import isEmail from "validator/es/lib/isEmail"
import { onBeforeMount, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import AuthShell from "@/add-os/modules/auth/components/AuthShell.vue"
import { ApiError } from "@/add-os/services/api"
import { getCsrfCookie, requestPasswordReset } from "@/add-os/services/auth"

const { t } = useI18n()
const router = useRouter()

const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const pageError = ref<string | null>(null)
const sent = ref(false)
const model = ref({ email: "" })

const rules: FormRules = {
	email: [
		{ required: true, message: t("auth.forgotPassword.emailRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule: FormItemRule, value: string) => isEmail(value || ""),
			message: t("auth.forgotPassword.emailInvalid"),
			trigger: ["blur"]
		}
	]
}

function backToSignIn() {
	router.push({ name: "Login" })
}

async function submit() {
	pageError.value = null
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	submitting.value = true
	try {
		await requestPasswordReset(model.value.email)
		// Replaces the form rather than toasting over it. Fortify answers the same
		// way for an unknown address, so this says "if that email has an account"
		// and never confirms whether one exists.
		sent.value = true
	} catch (err: unknown) {
		if (err instanceof ApiError && err.status === 409) {
			// Live-confirmed, and NOT documented in the collection: a 409 means the
			// caller already holds a session, which is a different problem from a
			// failed send and needs its own message.
			pageError.value = t("auth.forgotPassword.alreadySignedIn")
		} else {
			const apiMessage = err instanceof ApiError ? err.data?.message : undefined
			pageError.value = apiMessage || t("auth.forgotPassword.genericError")
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
