<template>
	<n-card content-class="p-0!" hoverable bordered>
		<div class="card-wrap flex flex-col justify-between">
			<div class="header flex gap-4">
				<div class="icon">
					<slot name="icon" />
				</div>
				<div class="info grow">
					<div class="title flex justify-between">
						<span class="text truncate">
							{{ currentTitle ?? title }}
						</span>
						<span v-if="!isHovered" class="hint flex items-center gap-2">
							<Icon :size="12" :name="InfoIcon" />
							<span>hover to see details</span>
						</span>
					</div>
					<div class="value h-10">
						<template v-if="!currentValue">{{ valueString }}</template>
						<NumberFlow v-else :value="currentValue" continuous />
					</div>
				</div>
			</div>
			<div class="chart-box" :style="{ height: `${chartHeight}px` }" :class="`type-${type}`">
				<Apex ref="chart" :type height="100%" :options="chartOptions" :series />
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import type { ApexOptions, ApexTooltipCustomOpts } from "apexcharts"
import { faker } from "@faker-js/faker"
import NumberFlow from "@number-flow/vue"
import { onClickOutside, useElementHover } from "@vueuse/core"
import { NCard } from "naive-ui"
import { computed, ref, watch } from "vue"
import Apex from "@/components/charts/Apex.vue"
import Icon from "@/components/common/Icon.vue"
import { useThemeStore } from "@/stores/theme"
import dayjs from "@/utils/dayjs"

type ChartData = [number, number][]
type ChartType = "area" | "bar"

const {
	type = "area",
	title,
	currency,
	chartColor,
	chartHeight = 80,
	dataCount,
	chartPaddingTop = "0px",
	chartBarGradient = false
} = defineProps<{
	type?: ChartType
	title: string
	currency?: string
	chartColor?: string
	chartHeight?: number
	dataCount?: number
	chartPaddingTop?: string
	chartBarGradient?: boolean
}>()

const InfoIcon = "carbon:information"
const currentTitle = ref<string | null>(null)
const currentValue = ref<number | null>(null)
const chart = ref()
const isHovered = useElementHover(chart)
const hoveredTimer = ref<NodeJS.Timeout | null>(null)

const themeStore = useThemeStore()

const primaryColor = computed(() => themeStore.style["primary-color"])

const data = ref<ChartData>([])

let lastDate = dayjs().valueOf()
const counter = dataCount || (type === "bar" ? 25 : 30)
for (let i = 0; i < counter; i++) {
	lastDate = dayjs(lastDate).subtract(1, "day").valueOf()
	data.value.push([lastDate, faker.number.int({ min: 500, max: 800 })])
}

const totalValues = computed(() => data.value.map(i => i[1]).reduce((a, c) => a + c, 0))

const valueString = computed(() => {
	if (currency) {
		return new Intl.NumberFormat("en-EN", { style: "currency", currency: "USD" }).format(
			currentValue.value ?? totalValues.value
		)
	} else {
		return new Intl.NumberFormat("en-EN").format(currentValue.value ?? totalValues.value)
	}
})

const series = ref([
	{
		data: data.value.reverse()
	}
])

function getOption(): ApexOptions {
	const fillArea = {
		type: "gradient",
		gradient: {
			shadeIntensity: 0,
			opacityFrom: 0.4,
			opacityTo: 0,
			stops: [0, 100]
		}
	}

	/* eslint no-mixed-spaces-and-tabs: "off" */
	const fillBar = chartBarGradient
		? {
				type: "gradient",
				gradient: {
					type: "vertical",
					shadeIntensity: 0,
					opacityFrom: 0.8,
					opacityTo: 0.4,
					stops: [0, 100]
				}
			}
		: {
				opacity: 0.7
			}

	const fill = type === "bar" ? fillBar : fillArea

	return {
		chart: {
			type,
			sparkline: {
				enabled: true
			},
			offsetX: type === "bar" ? -3 : 0
		},
		grid: {
			padding: {
				top: 10,
				bottom: type === "bar" ? 8 : 0
			}
		},
		plotOptions: {
			bar: {
				horizontal: false,
				columnWidth: "75%",
				borderRadius: 0
			}
		},
		stroke: {
			width: type === "bar" ? 0 : 2,
			curve: "straight"
		},
		fill,
		colors: [chartColor || primaryColor.value],
		tooltip: {
			enabled: true,
			custom({ series, seriesIndex, dataPointIndex, w }: ApexTooltipCustomOpts) {
				const value = series[seriesIndex][dataPointIndex]
				const label = w.globals.seriesX[seriesIndex][dataPointIndex]
				currentValue.value = value || 0
				currentTitle.value = dayjs(label).format("DD MMMM")

				if (hoveredTimer.value) {
					clearTimeout(hoveredTimer.value)
				}

				hoveredTimer.value = setTimeout(() => {
					resetTooltip()
				}, 1000)

				return ""
			}
		},
		xaxis: {
			type: "datetime",
			crosshairs: {
				width: 1
			}
		},
		yaxis: {
			min: 0
		}
	}
}

const chartOptions = ref(getOption())

function resetTooltip() {
	currentValue.value = null
	currentTitle.value = null
}

watch([primaryColor, () => chartHeight, () => chartColor, () => chartPaddingTop], () => {
	chartOptions.value = getOption()
})

watch(isHovered, val => {
	if (!val) {
		resetTooltip()
	}
})

onClickOutside(chart, () => {
	resetTooltip()
})
</script>

<style scoped lang="scss">
.n-card {
	container-type: inline-size;

	.card-wrap {
		height: 100%;

		.header {
			width: 100%;
			padding: var(--n-padding-bottom) var(--n-padding-left) 16px var(--n-padding-left);

			.info {
				.title {
					margin-bottom: 6px;

					.hint {
						font-size: 12px;
						opacity: 0;
						letter-spacing: -0.3px;
						animation: hint-fade 1s forwards;

						@keyframes hint-fade {
							from {
								opacity: 0;
							}
							to {
								opacity: 0.5;
							}
						}

						@container (max-width:400px) {
							display: none;
						}
					}
				}
				.value {
					font-family: var(--font-family-display);
					font-size: 26px;
					font-weight: bold;
				}
			}
		}

		.chart-box {
			overflow: hidden;
			:deep() {
				.apexcharts-tooltip {
					display: none;
				}
				.apexcharts-yaxis,
				.apexcharts-yaxis-annotation-label {
					display: none;
				}
			}

			&.type-bar {
				padding: v-bind(chartPaddingTop) calc(var(--n-padding-left) - 6px) 14px
					calc(var(--n-padding-left) - 9px);
			}
		}
	}
}
</style>
