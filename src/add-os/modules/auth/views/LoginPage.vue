<template>
	<AuthShell :title :subtitle :show-back="step === 'twofactor'" @back="backToSignIn">
		<n-alert v-if="pageError" type="error" :title="pageError" class="mb-6" />

		<n-form v-if="step === 'signin'" ref="signInFormRef" :model="signIn" :rules="signInRules" label-placement="top">
			<n-form-item path="email" :label="t('auth.signIn.emailLabel')" first>
				<n-input
					v-model:value="signIn.email"
					:placeholder="t('auth.signIn.emailPlaceholder')"
					size="large"
					autocomplete="username"
					@keydown.enter="submitSignIn"
				/>
			</n-form-item>

			<n-form-item path="password" :label="t('auth.signIn.passwordLabel')">
				<n-input
					v-model:value="signIn.password"
					type="password"
					show-password-on="click"
					:placeholder="t('auth.signIn.passwordPlaceholder')"
					size="large"
					autocomplete="current-password"
					@keydown.enter="submitSignIn"
				/>
			</n-form-item>

			<!-- Where the reference puts "Remember me" beside it. That checkbox is not
			     here on purpose: no `remember` field exists in the API collection. -->
			<div class="mb-6 flex justify-end">
				<router-link v-slot="{ navigate }" :to="{ name: 'ForgotPassword' }" custom>
					<n-button text type="primary" @click="navigate">
						{{ t("auth.signIn.forgotLink") }}
					</n-button>
				</router-link>
			</div>

			<n-button type="primary" class="w-full!" size="large" :loading="submitting" @click="submitSignIn">
				{{ t("auth.signIn.submit") }}
			</n-button>
		</n-form>

		<n-form v-else ref="twoFactorFormRef" :model="twoFactor" :rules="twoFactorRules" label-placement="top">
			<n-form-item v-if="!useRecoveryCode" path="code" :label="t('auth.twoFactor.codeLabel')" first>
				<n-input
					v-model:value="twoFactor.code"
					:placeholder="t('auth.twoFactor.codePlaceholder')"
					size="large"
					autocomplete="one-time-code"
					@keydown.enter="submitTwoFactor"
				/>
			</n-form-item>

			<n-form-item v-else path="recovery_code" :label="t('auth.twoFactor.recoveryLabel')" first>
				<n-input
					v-model:value="twoFactor.recovery_code"
					:placeholder="t('auth.twoFactor.recoveryPlaceholder')"
					size="large"
					@keydown.enter="submitTwoFactor"
				/>
			</n-form-item>

			<n-button type="primary" class="w-full!" size="large" :loading="submitting" @click="submitTwoFactor">
				{{ t("auth.twoFactor.submit") }}
			</n-button>

			<div class="mt-6 flex justify-center">
				<n-button text type="primary" @click="toggleRecoveryCode">
					{{ useRecoveryCode ? t("auth.twoFactor.useAuthCode") : t("auth.twoFactor.useRecoveryCode") }}
				</n-button>
			</div>
		</n-form>
	</AuthShell>
</template>

<script lang="ts" setup>
import type { FormInst, FormItemRule, FormRules } from "naive-ui"
import { NAlert, NButton, NForm, NFormItem, NInput } from "naive-ui"
import isEmail from "validator/es/lib/isEmail"
import { computed, onBeforeMount, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import AuthShell from "@/add-os/modules/auth/components/AuthShell.vue"
import { REDIRECT_QUERY, safeRedirect } from "@/add-os/navigation/authGuard"
import { ApiError } from "@/add-os/services/api"
import { getCsrfCookie, getMe, login, twoFactorChallenge } from "@/add-os/services/auth"
import { useAuthStore } from "@/stores/auth"

type Step = "signin" | "twofactor"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const step = ref<Step>("signin")
const submitting = ref(false)
const pageError = ref<string | null>(null)
const useRecoveryCode = ref(false)

const signInFormRef = ref<FormInst | null>(null)
const twoFactorFormRef = ref<FormInst | null>(null)

const signIn = ref({ email: "", password: "" })
const twoFactor = ref({ code: "", recovery_code: "" })

const title = computed(() => (step.value === "signin" ? t("auth.signIn.title") : t("auth.twoFactor.title")))
const subtitle = computed(() => (step.value === "signin" ? t("auth.signIn.subtitle") : t("auth.twoFactor.subtitle")))

const signInRules: FormRules = {
	email: [
		{ required: true, message: t("auth.signIn.emailRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule: FormItemRule, value: string) => isEmail(value || ""),
			message: t("auth.signIn.emailInvalid"),
			trigger: ["blur"]
		}
	],
	// Length is deliberately NOT validated here. A minimum on the sign-in form
	// would lock out any existing account whose password predates the rule —
	// the server is the only thing that can judge an existing credential.
	password: [{ required: true, message: t("auth.signIn.passwordRequired"), trigger: ["blur", "input"] }]
}

const twoFactorRules: FormRules = {
	code: [{ required: true, message: t("auth.twoFactor.codeRequired"), trigger: ["blur", "input"] }],
	recovery_code: [{ required: true, message: t("auth.twoFactor.recoveryRequired"), trigger: ["blur", "input"] }]
}

function toggleRecoveryCode() {
	useRecoveryCode.value = !useRecoveryCode.value
	twoFactor.value = { code: "", recovery_code: "" }
	pageError.value = null
}

function backToSignIn() {
	step.value = "signin"
	useRecoveryCode.value = false
	twoFactor.value = { code: "", recovery_code: "" }
	pageError.value = null
}

/**
 * Both steps end the same way: the session exists, so read the user and land
 * on the page the caller was sent away from (`?redirect=`), or home.
 */
async function completeSession() {
	authStore.setLogged(await getMe())
	router.push({ path: safeRedirect(route.query[REDIRECT_QUERY]), replace: true })
}

/**
 * The server already holds a session this tab did not know about — signed in
 * from another tab, or the persisted store was cleared. Fortify answers 409
 * for that; an older ADDCore answers with a redirect the browser blocks as a
 * CORS error, which reaches us as a network failure rather than an ApiError.
 * Either way the caller is signed in, so there is nothing to tell them: probe
 * `/me`, and if it answers, finish exactly as a fresh sign-in would.
 */
function mayAlreadyBeSignedIn(err: unknown): boolean {
	return err instanceof ApiError ? err.status === 409 : err instanceof TypeError
}

function messageFrom(err: unknown, fallback: string): string {
	const apiMessage = err instanceof ApiError ? err.data?.message : undefined
	return apiMessage || fallback
}

async function submitSignIn() {
	pageError.value = null
	try {
		await signInFormRef.value?.validate()
	} catch {
		return
	}

	submitting.value = true
	try {
		const resp = await login(signIn.value.email, signIn.value.password)

		// Fortify never returns the user here — a `two_factor` login is not yet a
		// session, so nothing is stored until the challenge is answered.
		if (resp.two_factor) {
			step.value = "twofactor"
			return
		}

		await completeSession()
	} catch (err: unknown) {
		if (mayAlreadyBeSignedIn(err)) {
			try {
				await completeSession()
				return
			} catch {
				/* no usable session after all — fall through to the original error */
			}
		}
		pageError.value = messageFrom(err, t("auth.signIn.genericError"))
	} finally {
		submitting.value = false
	}
}

async function submitTwoFactor() {
	pageError.value = null
	try {
		await twoFactorFormRef.value?.validate()
	} catch {
		return
	}

	submitting.value = true
	try {
		await twoFactorChallenge(
			useRecoveryCode.value ? { recovery_code: twoFactor.value.recovery_code } : { code: twoFactor.value.code }
		)
		await completeSession()
	} catch (err: unknown) {
		pageError.value = messageFrom(err, t("auth.twoFactor.genericError"))
	} finally {
		submitting.value = false
	}
}

onBeforeMount(async () => {
	// Primes the XSRF-TOKEN cookie so the first submit can succeed. Failure is
	// not surfaced here — submitting is what produces an error a user can act on.
	try {
		await getCsrfCookie()
	} catch {
		/* ignore; submit will surface errors */
	}
})
</script>
