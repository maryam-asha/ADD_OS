<template>
	<apexchart
		ref="chart"
		width="100%"
		height="100%"
		:type
		:options
		:series
		:class="{ 'time-buttons': timeButtons }"
		:style="legendOffset && `--legend-offset:${legendOffset}px`"
	></apexchart>
</template>

<script lang="ts" setup>
import type { ApexOptions } from "apexcharts"
import { computed, ref, watch, watchEffect } from "vue"
import { useThemeStore } from "@/stores/theme"
import { getAreaOpts, getBarOpts, getMonthsSeries, getWeekSeries, getYearsSeries } from "./data"
import { getChartColors, getHighlightMap } from "./utils"
import "@/assets/scss/overrides/apexchart-override.scss"

export interface VueApexChartsComponent {
	toggleSeries: (seriesName: string) => void
	options: {
		colors?: string[]
	}
	series?: ApexOptions["series"]
}

export type DataType = "years" | `years-${number}` | "months" | "week"
export type ChartsType = "area" | "bar"

export type ChartCTX = VueApexChartsComponent

const {
	type,
	dark = undefined,
	color,
	fontColor,
	strokeWidth,
	legendOffset,
	dataType = "years",
	highlight = false,
	colorsRandom = false,
	usePalette = false,
	timeButtons = false,
	hideLegend = false,
	hideXaxisLabels = false,
	seriesList = ["Trend"]
} = defineProps<{
	type: ChartsType
	dataType?: DataType
	dark?: boolean
	highlight?: boolean
	colorsRandom?: boolean
	usePalette?: boolean
	color?: string
	fontColor?: string
	strokeWidth?: number
	legendOffset?: number
	seriesList?: string[]
	timeButtons?: boolean
	hideLegend?: boolean
	hideXaxisLabels?: boolean
}>()

const emit = defineEmits<{
	(e: "mounted", value: VueApexChartsComponent): void
}>()

const chart = ref<VueApexChartsComponent | null>()
const themeStore = useThemeStore()
const isThemeDark = computed(() => themeStore.isThemeDark)
const style = computed(() => themeStore.style)
const customButtons = [
	{
		icon: "years",
		title: "years view",
		class: "custom-icon",
		click() {
			setData("years")
		}
	},
	{
		icon: "months",
		title: "months view",
		class: "custom-icon",
		click() {
			setData("months")
		}
	},
	{
		icon: "week",
		title: "week view",
		class: "custom-icon",
		click() {
			setData("week")
		}
	}
]

const series = ref<ApexOptions["series"]>([])
const categories = ref<string[]>([])

function setData(type: DataType) {
	series.value = []
	categories.value = []

	if (type === "years") {
		for (const name of seriesList) {
			const data = getYearsSeries({ name })
			// @ts-expect-error series will be always object
			series.value.push(data.series)
			if (!categories.value.length) {
				categories.value = data.categories
			}
		}
	}
	if (type.startsWith("years-")) {
		const years = type.split("-")?.[1] || 0
		for (const name of seriesList) {
			const data = getYearsSeries({ yearsCount: +years, name })
			// @ts-expect-error series will be always object
			series.value.push(data.series)
			if (!categories.value.length) {
				categories.value = data.categories
			}
		}
	}
	if (type === "months") {
		for (const name of seriesList) {
			const data = getMonthsSeries({ name })
			// @ts-expect-error series will be always object
			series.value.push(data.series)
			if (!categories.value.length) {
				categories.value = data.categories
			}
		}
	}
	if (type === "week") {
		for (const name of seriesList) {
			const data = getWeekSeries({ name })
			// @ts-expect-error series will be always object
			series.value.push(data.series)
			if (!categories.value.length) {
				categories.value = data.categories
			}
		}
	}
}

setData(dataType)

// @ts-expect-error series will be always object
const highlightMap = getHighlightMap(series.value?.[0].data)

const palette = computed(() =>
	[
		themeStore.style["extra1-color"] || "",
		themeStore.style["extra2-color"] || "",
		themeStore.style["extra3-color"] || "",
		themeStore.style["extra4-color"] || ""
	].filter(o => !!o)
)

const optsFunction = type === "area" ? getAreaOpts : getBarOpts
function getArgs() {
	return {
		dark: dark === undefined ? isThemeDark.value : dark,
		colors: usePalette
			? palette.value
			: getChartColors({
					type: colorsRandom ? "random" : undefined,
					color: color ?? style.value["primary-color"],
					highlight: highlight ? highlightMap : undefined
				}) /* eslint no-mixed-spaces-and-tabs: "off" */,
		fontColor:
			fontColor || colorsRandom || color ? style.value["fg-secondary-color"] : style.value["primary-color"],
		fontFamily: style.value["font-family-mono"],
		categories: categories.value,
		strokeWidth,
		hideLegend,
		hideXaxisLabels,
		customButtons: timeButtons ? customButtons : []
	}
}

const options = ref(optsFunction(getArgs()))

watch(
	() => dataType,
	val => {
		setData(val)
	}
)

watchEffect(async () => {
	options.value = optsFunction(getArgs())
})

watch(
	chart,
	newVal => {
		if (newVal) {
			emit("mounted", newVal)
		}
	},
	{ immediate: true, deep: true }
)
</script>

<style scoped lang="scss">
.vue-apexcharts {
	height: 100%;

	:deep() {
		.apexcharts-canvas {
			height: 100% !important;

			.apexcharts-legend {
				top: 28px !important;
				right: var(--legend-offset, 0) !important;
				padding: 0;

				.apexcharts-legend-series {
					display: inline-block;

					.apexcharts-legend-marker {
						z-index: 1;
						margin-right: -6px;
						margin-left: 4px;
					}

					.apexcharts-legend-text {
						background-color: var(--bg-secondary-color);
						padding: 0px 12px;
						padding-left: 24px;
						border-radius: var(--border-radius);
						border: 1px solid var(--border-color);
						box-sizing: border-box;
						height: 34px;
						font-size: 14px !important;
						font-family: var(--font-family) !important;
						display: inline-block;
						color: var(--fg-default-color) !important;
						line-height: 34px;
					}
				}
			}
		}
	}
	&.time-buttons {
		:deep() {
			.apexcharts-legend {
				right: 239px !important;
			}
			.apexcharts-toolbar {
				max-width: 100%;
				z-index: 0;
				top: 30px !important;
				right: 25px !important;
				display: flex;
				gap: 4px;

				.apexcharts-toolbar-custom-icon {
					background-color: var(--bg-secondary-color);
					padding: 0px 8px;
					border-radius: var(--border-radius);
					border: 1px solid var(--border-color);
					box-sizing: border-box;
					height: 34px;
					font-size: 14px !important;
					font-family: var(--font-family) !important;
					display: inline-block;
					line-height: 34px;
					width: 70px;
					text-transform: capitalize;
					color: var(--fg-default-color);
				}
			}
		}
	}
}
</style>
