<template>
	<CardCodeExample title="Column">
		<Apex type="bar" height="350" :options="chartOptions" :series />
	</CardCodeExample>
</template>

<script setup lang="ts">
import type { ApexOptions } from "apexcharts"
import { computed, ref, watch } from "vue"
import Apex from "@/components/charts/Apex.vue"
import { useThemeStore } from "@/stores/theme"
import "@/assets/scss/overrides/apexchart-override.scss"

const themeStore = useThemeStore()

const isThemeDark = computed(() => themeStore.isThemeDark)
const style = computed(() => themeStore.style)

const series = ref([
	{
		name: "Q1 Budget",
		group: "budget",
		data: [44000, 55000, 41000, 67000, 22000, 43000]
	},
	{
		name: "Q1 Actual",
		group: "actual",
		data: [48000, 50000, 40000, 65000, 25000, 40000]
	},
	{
		name: "Q2 Budget",
		group: "budget",
		data: [13000, 36000, 20000, 8000, 13000, 27000]
	},
	{
		name: "Q2 Actual",
		group: "actual",
		data: [20000, 40000, 25000, 10000, 12000, 28000]
	}
])

const palette = computed(() => [
	themeStore.style["extra1-color"],
	themeStore.style["extra2-color"],
	themeStore.style["extra3-color"],
	themeStore.style["extra4-color"]
])

function getOptions(): ApexOptions {
	return {
		chart: {
			type: "bar",
			height: 350,
			stacked: true
		},
		stroke: {
			width: 1,
			colors: [isThemeDark.value ? "#ffffff11" : "#00000011"]
		},
		dataLabels: {
			formatter: (val: number) => {
				return `${val / 1000}K`
			}
		},
		plotOptions: {
			bar: {
				horizontal: false
			}
		},
		grid: {
			borderColor: isThemeDark.value ? "#ffffff11" : "#00000011"
		},
		xaxis: {
			categories: [
				"Online advertising",
				"Sales Training",
				"Print advertising",
				"Catalogs",
				"Meetings",
				"Public relations"
			],
			labels: {
				style: {
					colors: style.value["fg-default-color"],
					fontSize: "10px",
					fontFamily: style.value["font-family-mono"]
				}
			}
		},
		fill: {
			opacity: 1
		},
		tooltip: {
			theme: isThemeDark.value ? "dark" : "light"
		},
		colors: palette.value,
		yaxis: {
			labels: {
				formatter: (val: number) => {
					return `${val / 1000}K`
				},
				style: {
					colors: style.value["fg-default-color"],
					fontSize: "10px",
					fontFamily: style.value["font-family-mono"]
				}
			}
		},
		legend: {
			position: "top",
			horizontalAlign: "left",
			labels: {
				colors: style.value["fg-default-color"]
			}
		}
	}
}

const chartOptions = ref(getOptions())

watch(isThemeDark, () => {
	chartOptions.value = getOptions()
})
</script>
