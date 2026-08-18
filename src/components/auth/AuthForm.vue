<template>
	<div class="w-full max-w-96 min-w-64">
		<n-collapse-transition :show="type === 'forgotpassword' || type === 'twofactor'">
			<n-button text @click="gotoSignIn">
				<Icon name="carbon:arrow-left" :size="30" />
			</n-button>
		</n-collapse-transition>

		<div class="my-10">
			<Logo type="small" class="mb-4" max-height="40px" />
			<div class="font-display mb-4 text-4xl font-bold">{{ title }}</div>
			<div class="text-secondary mb-12 text-lg">
				Today is a new day. It's your day. You shape it. Sign in to start managing your projects.
			</div>
		</div>

		<transition name="form-fade" mode="out-in" appear class="min-h-137">
			<SignIn v-if="type === 'signin'" key="signin" @two-factor-required="type = 'twofactor'">
				<template #extra-actions>
					<n-button text type="primary" @click="gotoForgotPassword()">Forgot Password?</n-button>
				</template>
			</SignIn>
			<ForgotPassword v-else-if="type === 'forgotpassword'" key="forgotpassword" />
			<TwoFactorChallenge v-else-if="type === 'twofactor'" key="twofactor" />
		</transition>
	</div>
</template>

<script lang="ts" setup>
import type { FormType } from "./types.d"
import { NButton, NCollapseTransition } from "naive-ui"
import { computed, onBeforeMount, ref } from "vue"
import { useRouter } from "vue-router"
import Logo from "@/app-layouts/common/Logo.vue"
import Icon from "@/components/common/Icon.vue"
import ForgotPassword from "./ForgotPassword.vue"
import SignIn from "./SignIn.vue"
import TwoFactorChallenge from "./TwoFactorChallenge.vue"

const props = defineProps<{
	type?: FormType
	useOnlyRouter?: boolean
}>()

const type = ref<FormType>("signin")
const router = useRouter()
const titles: Record<FormType, string> = {
	signin: "Welcome Back",
	forgotpassword: "Forgot Password",
	twofactor: "Two-Factor Authentication"
}
const title = computed<string>(() => titles[type.value])

function gotoSignIn() {
	if (!props.useOnlyRouter) {
		type.value = "signin"
	} else {
		router.replace({ name: "Login" })
	}
}

function gotoForgotPassword() {
	if (!props.useOnlyRouter) {
		type.value = "forgotpassword"
	} else {
		router.replace({ name: "ForgotPassword" })
	}
}

onBeforeMount(() => {
	if (props.type) {
		type.value = props.type
	}
})
</script>

<style lang="scss" scoped>
.form-fade-enter-active,
.form-fade-leave-active {
	transition:
		opacity 0.2s ease-in-out,
		transform 0.3s ease-in-out;
}
.form-fade-enter-from {
	opacity: 0;
	transform: translateX(10px);
}
.form-fade-leave-to {
	opacity: 0;
	transform: translateX(-10px);
}
</style>
