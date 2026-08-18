<template>
	<div>
		<n-form ref="formRef" :model :rules>
			<n-form-item path="email" :label="t('auth.forgotPassword.emailLabel')" first>
				<n-input
					v-model:value="model.email"
					:placeholder="t('auth.forgotPassword.emailPlaceholder')"
					size="large"
					@keydown.enter="forgotPassword"
				/>
			</n-form-item>
			<div class="flex flex-col items-end gap-6">
				<div class="w-full">
					<n-button
						type="primary"
						class="w-full!"
						size="large"
						:disabled="!isValid"
						:loading="submitting"
						@click="forgotPassword"
					>
						{{ t("auth.forgotPassword.submit") }}
					</n-button>
				</div>
			</div>
		</n-form>
	</div>
</template>

<script lang="ts" setup>
import type { FormInst, FormItemRule, FormRules, FormValidationError } from "naive-ui"
import { NButton, NForm, NFormItem, NInput, useMessage } from "naive-ui"
import isEmail from "validator/es/lib/isEmail"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { requestPasswordReset } from "@/add-os/services/auth"

interface ModelType {
	email: string | null
}

const { t } = useI18n()
const formRef = ref<FormInst | null>(null)
const message = useMessage()
const submitting = ref(false)
const model = ref<ModelType>({
	email: null
})

const rules: FormRules = {
	email: [
		{
			required: true,
			trigger: ["blur"],
			message: t("auth.forgotPassword.emailRequired")
		},
		{
			validator: (rule: FormItemRule, value: string): boolean => {
				return isEmail(value)
			},
			message: t("auth.forgotPassword.emailInvalid"),
			trigger: ["blur"]
		}
	]
}

const isValid = computed(() => {
	return isEmail(model.value.email || "")
})

function forgotPassword(e: Event) {
	e.preventDefault()
	formRef.value?.validate(async (errors: Array<FormValidationError> | undefined) => {
		if (errors) return

		submitting.value = true
		try {
			await requestPasswordReset(model.value.email || "")
			message.success(t("auth.forgotPassword.success"))
		} catch (err: unknown) {
			if (err instanceof ApiError && err.status === 409) {
				message.error(t("auth.forgotPassword.alreadySignedIn"))
			} else {
				const apiMessage = err instanceof ApiError ? err.data?.message : undefined
				message.error(apiMessage || t("auth.forgotPassword.genericError"))
			}
		} finally {
			submitting.value = false
		}
	})
}

watch(isValid, val => {
	if (val) {
		formRef.value?.validate()
	}
})
</script>
