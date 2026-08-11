<template>
	<div>
		<n-form ref="formRef" :model :rules>
			<n-form-item v-if="!useRecoveryCode" path="code" label="Authentication Code" first>
				<n-input
					v-model:value="model.code"
					placeholder="123456"
					size="large"
					autocomplete="one-time-code"
					@keydown.enter="submit"
				/>
			</n-form-item>
			<n-form-item v-else path="recovery_code" label="Recovery Code" first>
				<n-input
					v-model:value="model.recovery_code"
					placeholder="Insert a recovery code"
					size="large"
					@keydown.enter="submit"
				/>
			</n-form-item>
			<div class="flex flex-col items-end gap-6">
				<div class="flex w-full justify-between">
					<n-button text type="primary" @click="toggleRecoveryCode">
						{{ useRecoveryCode ? "Use an authentication code" : "Use a recovery code" }}
					</n-button>
				</div>
				<div class="w-full">
					<n-button type="primary" class="w-full!" size="large" :disabled="!isValid" :loading="submitting" @click="submit">
						Verify
					</n-button>
				</div>
			</div>
		</n-form>
	</div>
</template>

<script lang="ts" setup>
import type { FormInst, FormRules, FormValidationError } from "naive-ui"
import { NButton, NForm, NFormItem, NInput, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import { ApiError } from "@/add-os/services/api"
import { getMe, twoFactorChallenge } from "@/add-os/services/auth"
import { useAuthStore } from "@/stores/auth"

interface ModelType {
	code: string | null
	recovery_code: string | null
}

const router = useRouter()
const formRef = ref<FormInst | null>(null)
const message = useMessage()
const authStore = useAuthStore()
const useRecoveryCode = ref(false)
const submitting = ref(false)
const model = ref<ModelType>({
	code: null,
	recovery_code: null
})

const rules: FormRules = {
	code: [
		{
			required: true,
			trigger: ["blur"],
			message: "Enter the code from your authenticator app"
		}
	],
	recovery_code: [
		{
			required: true,
			trigger: ["blur"],
			message: "Enter a recovery code"
		}
	]
}

const isValid = computed(() => {
	return useRecoveryCode.value ? !!model.value.recovery_code : !!model.value.code
})

function toggleRecoveryCode() {
	useRecoveryCode.value = !useRecoveryCode.value
	model.value.code = null
	model.value.recovery_code = null
}

async function submit(e: Event) {
	e.preventDefault()
	formRef.value?.validate(async (errors: Array<FormValidationError> | undefined) => {
		if (errors) {
			return
		}
		submitting.value = true
		try {
			await twoFactorChallenge(
				useRecoveryCode.value ? { recovery_code: model.value.recovery_code || "" } : { code: model.value.code || "" }
			)
			const user = await getMe()
			authStore.setLogged(user)
			router.push({ path: "/", replace: true })
		} catch (err: unknown) {
			const apiMessage = err instanceof ApiError ? err.data?.message : undefined
			message.error(apiMessage || "Verification failed")
		} finally {
			submitting.value = false
		}
	})
}
</script>
