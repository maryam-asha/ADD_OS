<template>
	<n-card :bordered="isBordered" :content-class :class="contentClass">
		<div class="card-wrap flex justify-between">
			<div class="item-box item-left">
				<div class="header flex items-center gap-3">
					<div v-if="$slots.iconLeft" class="icon-box">
						<div class="icon">
							<slot name="iconLeft" />
						</div>
					</div>
					<div class="title grow truncate">
						{{ titleLeft || randomTitleLeft }}
					</div>
				</div>
				<div class="info flex flex-col gap-2">
					<div class="value">{{ valueLeft || randomValueLeft }}</div>
					<Percentage :value="percentageLeft" use-color :direction="percentageDirectionLeft" />
				</div>
			</div>
			<div class="divider">
				<div v-if="showDividerLines" class="line" />
				<div v-if="!hideVersusIcon" class="text">vs</div>
				<div v-if="showDividerLines" class="line" />
			</div>
			<div class="item-box item-right">
				<div class="header flex flex-row-reverse items-center gap-3">
					<div v-if="$slots.iconRight" class="icon-box">
						<div class="icon">
							<slot name="iconRight" />
						</div>
					</div>
					<div class="title grow">
						{{ titleRight || randomTitleRight }}
					</div>
				</div>
				<div class="info flex flex-col items-end gap-2">
					<div class="value">{{ valueRight || randomValueRight }}</div>
					<Percentage :value="percentageRight" use-color :direction="percentageDirectionRight" />
				</div>
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

const { titleLeft, titleRight, valueLeft, valueRight, cardWrap, showDividerLines, hideVersusIcon } = defineProps<{
	titleLeft?: string
	titleRight?: string
	valueLeft?: string
	valueRight?: string
	cardWrap?: boolean
	showDividerLines?: boolean
	hideVersusIcon?: boolean
}>()

const randomTitleLeft = ref(faker.commerce.department())
const randomTitleRight = ref(faker.commerce.department())

const percentageLeft = ref(faker.number.int({ min: 10, max: 90 }))
const percentageRight = ref(faker.number.int({ min: 10, max: 90 }))

const percentageDirectionLeft = ref<PercentageProps["direction"]>(faker.datatype.boolean() ? "up" : "down")
const percentageDirectionRight = ref<PercentageProps["direction"]>(faker.datatype.boolean() ? "up" : "down")

const randomValueLeft = ref(new Intl.NumberFormat("en-EN", {}).format(faker.number.int({ min: 1000, max: 9000 })))
const randomValueRight = ref(new Intl.NumberFormat("en-EN", {}).format(faker.number.int({ min: 1000, max: 9000 })))

const isBordered = computed(() => cardWrap)
const contentClass = computed(() => (cardWrap ? "" : "p-0! !bg-transparent"))
</script>

<style scoped lang="scss">
.card-wrap {
	height: 100%;
	width: 100%;
	overflow: hidden;

	.item-box {
		width: calc(50% - 11px);
		.header {
			margin-bottom: 14px;
		}

		.info {
			.value {
				font-family: var(--font-family-display);
				font-size: 26px;
				font-weight: 700;
			}
		}
		&.item-right {
			text-align: right;
		}
	}
	.divider {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 22px;

		.line {
			width: 1px;
			background-color: var(--border-color);
			flex-grow: 1;
		}

		.text {
			color: white;
			background-color: var(--extra2-color);
			width: 22px;
			height: 22px;
			border-radius: 22px;
			line-height: 23px;
			text-align: center;

			font-size: 10px;
			font-weight: 700;
			letter-spacing: 0.4px;
			text-transform: uppercase;
		}
	}
}

.direction-rtl {
	.card-wrap {
		.item-right {
			.title {
				text-align: left;
			}
		}
	}
}
</style>
