<template>
	<n-card :bordered="isBordered" :content-class :class="contentClass">
		<div class="card-wrap flex flex-col gap-6">
			<div v-if="!hideHeader" class="header flex items-center gap-3">
				<div v-if="$slots.icon" class="icon-box">
					<div class="icon">
						<slot name="icon" />
					</div>
				</div>
				<div class="title grow truncate">
					{{ title || randomTitle }}
				</div>
				<div v-if="showPercentage" class="per-box">
					<Percentage :value="percentage" use-color :direction="percentageDirection" />
				</div>
			</div>
			<div class="progress flex flex-col gap-2">
				<div class="component">
					<n-progress
						type="line"
						:status="percentageDirection === 'up' ? 'success' : 'error'"
						:percentage="progress"
						:show-indicator="false"
						:height="6"
						:border-radius="0"
					/>
				</div>
				<div v-if="!hideInfo" class="info flex justify-between">
					<div class="text">{{ value }} • {{ text }}</div>
					<div class="value">{{ progress }}%</div>
				</div>
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import type { PercentageProps } from "@/components/common/Percentage.vue"
import { faker } from "@faker-js/faker"
import { NCard, NProgress } from "naive-ui"
import { computed, ref } from "vue"
import Percentage from "@/components/common/Percentage.vue"

const { title, cardWrap, showPercentage, hideHeader, hideInfo } = defineProps<{
	title?: string
	cardWrap?: boolean
	showPercentage?: boolean
	hideHeader?: boolean
	hideInfo?: boolean
}>()

const randomTitle = ref(faker.company.name())
const text = ref(faker.commerce.product())

const percentageDirection = ref<PercentageProps["direction"]>(faker.datatype.boolean() ? "up" : "down")
const percentage = ref(faker.number.int({ min: 10, max: 90 }))
const progress = ref(faker.number.int({ min: 10, max: 90 }))

const value = ref(new Intl.NumberFormat("en-EN", {}).format(faker.number.int({ min: 1000, max: 9000 })))

const isBordered = computed(() => cardWrap)
const contentClass = computed(() => (cardWrap ? "" : "p-0! !bg-transparent"))
</script>

<style scoped lang="scss">
.card-wrap {
	height: 100%;
	width: 100%;

	.header {
		.title {
			font-family: var(--font-family-display);
			font-size: 18px;
			font-weight: 600;
			letter-spacing: -0.025em;
		}
	}

	.progress {
		.info {
			color: var(--fg-secondary-color);
			font-family: var(--font-family);
			font-size: 14px;
		}
	}
}
</style>
