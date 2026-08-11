<template>
	<CardCodeExample title="Pie" class="card grid!">
		<Apex type="pie" width="70%" :options="chartOptions" :series />
	</CardCodeExample>
</template>

<script setup lang="ts">
import type { ApexFormatterOpts, ApexOptions } from "apexcharts"
import { ref } from "vue"
import Apex from "@/components/charts/Apex.vue"

const series = ref([25, 15, 44, 55, 41, 17])

function getOptions(): ApexOptions {
	return {
		chart: {
			type: "pie"
		},
		labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
		theme: {
			monochrome: {
				enabled: true
			}
		},
		plotOptions: {
			pie: {
				dataLabels: {
					offset: -5
				}
			}
		},
		dataLabels: {
			formatter(val: string | number | number[], opts: ApexFormatterOpts) {
				const name = opts.w.globals.labels[opts.seriesIndex] || ""
				return [name, `${Number.parseInt(`${val}`).toFixed(1)}%`]
			}
		},
		legend: {
			show: false
		}
	}
}

const chartOptions = ref(getOptions())
</script>

<style scoped lang="scss">
.card {
	height: 100%;
	:deep(.n-card-header) {
		height: 68px;
	}
	:deep() {
		.apexcharts-canvas {
			margin: 0 auto;
		}
		path {
			stroke: var(--bg-default-color);
		}
	}
}
</style>
