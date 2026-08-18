<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.accountSecurity") }}</h1>
			<p>{{ t("account.description") }}</p>
		</div>

		<n-card :title="t('account.profile.title')">
			<n-form ref="profileFormRef" :model="profileForm" :rules="profileRules" label-placement="top">
				<n-form-item path="name" :label="t('account.profile.nameLabel')">
					<n-input v-model:value="profileForm.name" />
				</n-form-item>
				<n-form-item path="email" :label="t('account.profile.emailLabel')">
					<n-input v-model:value="profileForm.email" />
				</n-form-item>
			</n-form>
			<div class="flex justify-end">
				<n-button type="primary" :loading="profileSubmitting" @click="submitProfile">
					{{ t("account.profile.submit") }}
				</n-button>
			</div>
		</n-card>

		<n-card :title="t('account.password.title')">
			<n-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-placement="top">
				<n-form-item path="current_password" :label="t('account.password.currentLabel')">
					<n-input v-model:value="passwordForm.current_password" type="password" show-password-on="click" />
				</n-form-item>
				<n-form-item path="password" :label="t('account.password.newLabel')">
					<n-input v-model:value="passwordForm.password" type="password" show-password-on="click" />
				</n-form-item>
				<n-form-item path="password_confirmation" :label="t('account.password.confirmLabel')">
					<n-input v-model:value="passwordForm.password_confirmation" type="password" show-password-on="click" />
				</n-form-item>
			</n-form>
			<div class="flex justify-end">
				<n-button type="primary" :loading="passwordSubmitting" @click="submitPassword">
					{{ t("account.password.submit") }}
				</n-button>
			</div>
		</n-card>

		<n-card :title="t('account.twoFactor.title')">
			<p class="text-secondary mb-4">{{ t("account.twoFactor.description") }}</p>

			<n-spin :show="twoFactorLoading">
				<template v-if="twoFactorPhase === 'disabled'">
					<n-button type="primary" :loading="twoFactorBusy" @click="enableTwoFactor">
						{{ t("account.twoFactor.enableButton") }}
					</n-button>
				</template>

				<template v-else>
					<n-alert type="success" :title="t('account.twoFactor.activeBadge')" class="mb-4" />

					<div v-if="qrSvg" class="mb-4 max-w-48" v-html="qrSvg" />

					<n-form-item
						:label="t('account.twoFactor.codeLabel')"
						:feedback="confirmCodeError ?? undefined"
						:validation-status="confirmCodeError ? 'error' : undefined"
					>
						<div class="flex w-full gap-2">
							<n-input v-model:value="twoFactorCode" :placeholder="t('account.twoFactor.codePlaceholder')" />
							<n-button :loading="twoFactorBusy" @click="submitTwoFactorCode">
								{{ t("account.twoFactor.confirmButton") }}
							</n-button>
						</div>
					</n-form-item>

					<div v-if="recoveryCodes.length" class="mb-4">
						<p class="mb-2 font-medium">{{ t("account.twoFactor.recoveryCodesTitle") }}</p>
						<ul class="grid grid-cols-2 gap-1 font-mono text-sm">
							<li v-for="recoveryCode in recoveryCodes" :key="recoveryCode">{{ recoveryCode }}</li>
						</ul>
					</div>

					<div class="flex gap-2">
						<n-button :loading="twoFactorBusy" @click="regenerateRecoveryCodes">
							{{ t("account.twoFactor.regenerateButton") }}
						</n-button>
						<n-button type="error" :loading="twoFactorBusy" @click="disableTwoFactor">
							{{ t("account.twoFactor.disableButton") }}
						</n-button>
					</div>
				</template>
			</n-spin>
		</n-card>

		<ConfirmPasswordModal
			v-model:password="confirmationPassword"
			:visible="modalVisible"
			:confirming
			:error="confirmError"
			@submit="submit"
			@cancel="cancel"
		/>
	</div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules } from "naive-ui"
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NSpin, useMessage } from "naive-ui"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import ConfirmPasswordModal from "@/add-os/components/ConfirmPasswordModal.vue"
import { usePasswordConfirmation } from "@/add-os/composables/usePasswordConfirmation"
import { isValidPassword } from "@/add-os/modules/system/utils/validation"
import { changePassword, updateProfileInformation } from "@/add-os/services/account"
import { ApiError } from "@/add-os/services/api"
import { useAuthStore } from "@/stores/auth"
import { useTwoFactorAuth } from "../composables/useTwoFactorAuth"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const authStore = useAuthStore()

const { modalVisible, password: confirmationPassword, confirming, confirmError, withConfirmation, submit, cancel } = usePasswordConfirmation()

const {
	phase: twoFactorPhase,
	loading: twoFactorLoading,
	qrSvg,
	recoveryCodes,
	busy: twoFactorBusy,
	confirmCodeError,
	loadStatus: loadTwoFactorStatus,
	enable: enableTwoFactor,
	confirm: confirmTwoFactorCode,
	regenerateRecoveryCodes,
	disable: disableTwoFactor
} = useTwoFactorAuth(withConfirmation)

onMounted(loadTwoFactorStatus)

const profileFormRef = ref<FormInst | null>(null)
const profileSubmitting = ref(false)
const profileForm = ref({
	name: authStore.user.name ?? "",
	email: authStore.user.email ?? ""
})

const profileRules: FormRules = {
	name: [{ required: true, message: t("account.profile.nameRequired"), trigger: ["blur", "input"] }],
	email: [
		{ required: true, message: t("account.profile.emailRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(value),
			message: t("account.profile.emailInvalid"),
			trigger: ["blur", "input"]
		}
	]
}

async function submitProfile() {
	try {
		await profileFormRef.value?.validate()
	} catch {
		return
	}

	profileSubmitting.value = true
	try {
		await updateProfileInformation(profileForm.value)
		message.success(t("account.profile.success"))
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("account.genericError"))
	} finally {
		profileSubmitting.value = false
	}
}

const passwordFormRef = ref<FormInst | null>(null)
const passwordSubmitting = ref(false)
const passwordForm = ref({ current_password: "", password: "", password_confirmation: "" })

const passwordRules: FormRules = {
	current_password: [{ required: true, message: t("account.password.currentRequired"), trigger: ["blur", "input"] }],
	password: [
		{ required: true, message: t("account.password.newRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => isValidPassword(value),
			message: t("account.password.newTooShort"),
			trigger: ["blur", "input"]
		}
	],
	password_confirmation: [
		{ required: true, message: t("account.password.confirmRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => value === passwordForm.value.password,
			message: t("account.password.confirmMismatch"),
			trigger: ["blur", "input"]
		}
	]
}

async function submitPassword() {
	try {
		await passwordFormRef.value?.validate()
	} catch {
		return
	}

	passwordSubmitting.value = true
	try {
		await withConfirmation(() => changePassword(passwordForm.value))
		message.success(t("account.password.success"))
		passwordForm.value = { current_password: "", password: "", password_confirmation: "" }
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.errors?.current_password?.[0] ?? error.data?.message ?? t("account.genericError"))
	} finally {
		passwordSubmitting.value = false
	}
}

const twoFactorCode = ref("")

async function submitTwoFactorCode() {
	const confirmed = await confirmTwoFactorCode(twoFactorCode.value)
	if (confirmed) {
		message.success(t("account.twoFactor.confirmSuccess"))
		twoFactorCode.value = ""
	}
}
</script>
