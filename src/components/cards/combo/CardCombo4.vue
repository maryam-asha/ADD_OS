<template>
	<n-card :bordered="isBordered" :content-class :class="contentClass">
		<div class="card-wrap flex gap-4" :class="{ 'flex-col': vertical }">
			<div v-if="$slots.icon" class="icon-box">
				<div class="icon">
					<slot name="icon" />
				</div>
			</div>
			<div class="info flex grow flex-col">
				<div class="header flex items-center justify-between gap-2">
					<div class="title grow">
						{{ title || randomTitle }}
					</div>
					<Percentage v-if="percentage && percentageProps" v-bind="percentageProps" />
				</div>
				<div class="value">{{ valueString }}</div>
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import type { PercentageProps } from "@/components/common/Percentage.vue"
import { faker } from "@faker-js/faker"
import { NCard } from "naive-ui"
import { computed, ref } from "vue"
import Percentage from "@/components/common/Percentage.vue"

const { title, val, valString, currency, percentage, percentageProps, cardWrap, vertical } = defineProps<{
	title: string
	val?: number
	valString?: string
	currency?: string
	cardWrap?: boolean
	vertical?: boolean
	percentage?: boolean
	percentageProps?: PercentageProps
}>()

const randomTitle = ref(faker.commerce.department())
const isBordered = computed(() => cardWrap)
const contentClass = computed(() => (cardWrap ? "" : "p-0! !bg-transparent"))
const valueString = computed(() => {
	if (valString) {
		return valString
	}

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
.card-wrap {
	height: 100%;
	width: 100%;
	overflow: hidden;

	.info {
		overflow: hidden;
		.header {
			overflow: hidden;
			margin-bottom: 6px;
			white-space: nowrap;

			.title {
				text-overflow: ellipsis;
				white-space: nowrap;
				overflow: hidden;
			}
		}
		.value {
			font-family: var(--font-family-display);
			font-size: 26px;
			font-weight: bold;
			text-overflow: ellipsis;
			white-space: nowrap;
			overflow: hidden;
		}
	}
}
</style>
