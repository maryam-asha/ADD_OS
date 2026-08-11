<template>
	<n-card :bordered="false">
		<div class="flex h-full items-center">
			<div
				class="card-wrap flex gap-4"
				:class="{ 'items-center': centered, 'text-center': centered, 'flex-col': !horizontal }"
			>
				<div class="icon">
					<slot name="icon" />
				</div>
				<div class="info flex flex-col">
					<div class="value">{{ valueString }}</div>
					<div class="title">{{ title }}</div>
				</div>
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import { faker } from "@faker-js/faker"
import { NCard } from "naive-ui"
import { computed } from "vue"

const { title, val, currency, centered, horizontal } = defineProps<{
	title: string
	val?: number
	currency?: string
	centered?: boolean
	horizontal?: boolean
}>()

const valueString = computed(() => {
	const value = val || faker.number.int({ min: 1000, max: 5000 })

	if (!value) return ""

	if (currency) {
		return new Intl.NumberFormat("en-EN", { style: "currency", currency: "USD" }).format(value)
	} else {
		return new Intl.NumberFormat("en-EN").format(value)
	}
})
</script>

<style scoped lang="scss">
.n-card {
	.card-wrap {
		width: 100%;

		.title {
			font-size: 18px;
			word-break: initial;
		}
		.value {
			font-family: var(--font-family-display);
			font-size: 22px;
			font-weight: bold;
			margin-bottom: 6px;
		}
	}
}
</style>
