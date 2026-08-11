<template>
	<apexchart ref="chart" :width :height :type :options :series />
</template>

<script lang="ts" setup>
import type { ApexOptions } from "apexcharts"
import { ref, watch } from "vue"

export interface VueApexChartsComponent {
	type?:
		| "line"
		| "area"
		| "bar"
		| "histogram"
		| "pie"
		| "donut"
		| "radialBar"
		| "rangeBar"
		| "scatter"
		| "bubble"
		| "heatmap"
		| "candlestick"
		| "radar"
		| "polarArea"
	options?: ApexOptions
	series?: ApexOptions["series"]
	updateSeries: (newSeries: ApexOptions["series"], animate?: boolean) => Promise<void>
	refresh: () => Promise<void>
}

const { width, height, type, options, series } = defineProps<{
	width?: string | number
	height?: string | number
	type?: VueApexChartsComponent["type"]
	options?: VueApexChartsComponent["options"]
	series?: VueApexChartsComponent["series"]
}>()
const emit = defineEmits<{
	(e: "mounted", value: VueApexChartsComponent): void
}>()

const chart = ref<VueApexChartsComponent | null>()

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
