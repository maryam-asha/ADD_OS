<template>
	<div>
		<n-form ref="formRef" :model :rules>
			<n-form-item path="email" label="Email" first>
				<n-input v-model:value="model.email" size="large" placeholder="Insert the email" />
			</n-form-item>
			<n-form-item path="password" label="Password">
				<div class="flex w-full flex-col gap-3">
					<n-input
						v-model:value="model.password"
						type="password"
						size="large"
						show-password-on="click"
						placeholder="Insert the password"
					/>
					<PasswordStrengthMeter
						v-if="model.password"
						:password="model.password"
						@strength="passwordStrength = $event"
					/>
				</div>
			</n-form-item>
			<n-form-item path="confirmPassword" label="Confirm Password" first>
				<n-input
					v-model:value="model.confirmPassword"
					type="password"
					:disabled="!model.password"
					size="large"
					show-password-on="click"
					placeholder="Confirm the password"
				/>
			</n-form-item>
			<div class="flex flex-col items-end">
				<div class="w-full">
					<n-button type="primary" class="w-full!" size="large" :disabled="!isValid">
						Create an account
					</n-button>
				</div>
			</div>
		</n-form>

		<slot name="bottom-area" />
	</div>
</template>

<script lang="ts" setup>
import type { FormInst, FormItemRule, FormRules } from "naive-ui"
import { NButton, NForm, NFormItem, NInput } from "naive-ui"
import isEmail from "validator/es/lib/isEmail"
import { computed, ref, watch } from "vue"
import PasswordStrengthMeter from "@/components/common/PasswordStrengthMeter.vue"

interface ModelType {
	email: string | null
	password: string | null
	confirmPassword: string | null
}

const formRef = ref<FormInst | null>(null)
const passwordStrength = ref<number>(0)
const model = ref<ModelType>({
	email: null,
	password: null,
	confirmPassword: null
})

const rules: FormRules = {
	email: [
		{
			required: true,
			trigger: ["blur"],
			message: "Email is required"
		},
		{
			validator: (rule: FormItemRule, value: string): boolean => {
				return isEmail(value || "")
			},
			message: "The email is not formatted correctly",
			trigger: ["blur"]
		}
	],
	password: [
		{
			required: true,
			trigger: ["blur"],
			message: "Password is required"
		}
	],
	confirmPassword: [
		{
			required: true,
			trigger: ["blur"],
			message: "confirmPassword is required"
		},
		{
			validator: (rule: FormItemRule, value: string): boolean => {
				return value === model.value.password
			},
			message: "Password is not same as re-entered password!",
			trigger: ["blur", "password-input"]
		}
	]
}

const isValid = computed(() => {
	return (
		isEmail(model.value.email || "") &&
		model.value.password &&
		model.value.confirmPassword &&
		model.value.password === model.value.confirmPassword &&
		passwordStrength.value === 100
	)
})

watch(isValid, val => {
	if (val) {
		formRef.value?.validate()
	}
})
</script>
