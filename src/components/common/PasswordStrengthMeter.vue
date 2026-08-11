<template>
	<div class="flex flex-col gap-4">
		<div v-if="showMeter" class="flex h-2 w-full items-center gap-2">
			<div v-for="index of maxScore" :key="index" class="h-full grow rounded-sm" :class="getStatus(index)"></div>
		</div>
		<div v-if="showList" class="flex flex-col gap-3">
			<div v-if="minLength" class="flex items-center gap-2">
				<Icon
					:size="18"
					:name="hasLength ? 'solar:check-square-bold-duotone' : 'solar:close-square-bold-duotone'"
					:class="[hasLength ? 'text-success/50' : 'text-tertiary/50']"
				/>
				<span class="text-sm">At least 8 characters</span>
			</div>
			<div v-if="lowercase" class="flex items-center gap-2">
				<Icon
					:size="18"
					:name="hasLower ? 'solar:check-square-bold-duotone' : 'solar:close-square-bold-duotone'"
					:class="[hasLower ? 'text-success/50' : 'text-tertiary/50']"
				/>
				<span class="text-sm">At least 1 lowercase character</span>
			</div>
			<div v-if="uppercase" class="flex items-center gap-2">
				<Icon
					:size="18"
					:name="hasUpper ? 'solar:check-square-bold-duotone' : 'solar:close-square-bold-duotone'"
					:class="[hasUpper ? 'text-success/50' : 'text-tertiary/50']"
				/>
				<span class="text-sm">At least 1 Uppercase character</span>
			</div>
			<div v-if="number" class="flex items-center gap-2">
				<Icon
					:size="18"
					:name="hasNumber ? 'solar:check-square-bold-duotone' : 'solar:close-square-bold-duotone'"
					:class="[hasNumber ? 'text-success/50' : 'text-tertiary/50']"
				/>
				<span class="text-sm">At least 1 number</span>
			</div>
			<div v-if="special" class="flex items-center gap-2">
				<Icon
					:size="18"
					:name="hasSpecial ? 'solar:check-square-bold-duotone' : 'solar:close-square-bold-duotone'"
					:class="[hasSpecial ? 'text-success/50' : 'text-tertiary/50']"
				/>
				<span class="text-sm">
					At least 1 special character
					<code>{{ specialString }}</code>
				</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue"
import Icon from "@/components/common/Icon.vue"

const {
	password,
	minLength = 8,
	lowercase = true,
	uppercase = true,
	number = true,
	special = true,
	showMeter = true,
	showList = true
} = defineProps<{
	password: string
	minLength?: number
	lowercase?: boolean
	uppercase?: boolean
	number?: boolean
	special?: string | boolean
	showMeter?: boolean
	showList?: boolean
}>()

const emit = defineEmits<{
	/** 0 | 1 | 2 | 3 | 4 | 5 */
	(e: "score", value: number): void
	/** 0% - 100% */
	(e: "strength", value: number): void
}>()

const LOWERCASE_REGEX = /[a-z]/
const UPPERCASE_REGEX = /[A-Z]/
const NUMBER_REGEX = /\d/

const specialString = computed<string>(() => (typeof special === "string" ? special : "!@#$%^&*"))
const hasLength = computed<boolean>(() => password.length >= minLength)
const hasLower = computed<boolean>(() => LOWERCASE_REGEX.test(password))
const hasUpper = computed<boolean>(() => UPPERCASE_REGEX.test(password))
const hasNumber = computed<boolean>(() => NUMBER_REGEX.test(password))
const hasSpecial = computed<boolean>(() => new RegExp(`[${specialString.value}]`).test(password))

const maxScore = computed<number>(() => {
	let score = 0

	if (minLength) score++
	if (lowercase) score++
	if (uppercase) score++
	if (number) score++
	if (special) score++

	return score
})

const score = computed<number>(() => {
	let score = 0

	if (minLength && hasLength.value) score++
	if (lowercase && hasLower.value) score++
	if (uppercase && hasUpper.value) score++
	if (number && hasNumber.value) score++
	if (special && hasSpecial.value) score++

	return score
})

const strength = computed(() => (score.value / maxScore.value) * 100)

function getStatus(index: number): string {
	const indexStrength = (index / maxScore.value) * 100

	if (indexStrength <= strength.value) {
		if (strength.value === 100) return "bg-success"
		if (strength.value > 50) return "bg-warning"
		if (strength.value) return "bg-error"
	}
	return "bg-border"
}

watch(
	[score, strength],
	([valScore, valStrength]) => {
		emit("score", valScore)
		emit("strength", valStrength)
	},
	{ immediate: true }
)
</script>
