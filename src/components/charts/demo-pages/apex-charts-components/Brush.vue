<template>
	<CardCodeExample title="Brush">
		<div id="chart-line2" />
		<div id="chart-line" />
	</CardCodeExample>
</template>

<script setup lang="ts">
import type { ApexOptions } from "apexcharts"
import ApexCharts from "apexcharts"
import { computed, onMounted, watch } from "vue"
import { useThemeStore } from "@/stores/theme"
import dayjs from "@/utils/dayjs"
import { generateDayWiseTimeSeries } from "./utils"

// BRUSH MODE ONLY WORKS IN VANILLA-JS

const startDate = dayjs().subtract(185, "d").valueOf()
const rangeStart = dayjs().subtract(60, "d").valueOf()
const rangeEnd = dayjs().subtract(10, "d").valueOf()

const data = generateDayWiseTimeSeries(startDate, 185, {
	min: 30,
	max: 90
})

const themeStore = useThemeStore()

const isThemeDark = computed(() => themeStore.isThemeDark)
const style = computed(() => themeStore.style)

onMounted(() => {
	window.ApexCharts = ApexCharts

	const getOptions = () =>
		({
			series: [
				{
					data
				}
			],
			chart: {
				id: "chart2",
				type: "line",
				height: 230,
				toolbar: {
					autoSelected: "pan",
					show: false
				}
			},
			grid: {
				borderColor: isThemeDark.value ? "#ffffff11" : "#00000011"
			},
			colors: [style.value["primary-color"]],
			tooltip: {
				theme: isThemeDark.value ? "dark" : "light"
			},
			stroke: {
				width: 3
			},
			dataLabels: {
				enabled: false
			},
			fill: {
				opacity: 1
			},
			markers: {
				size: 0
			},
			yaxis: {
				labels: {
					style: {
						colors: style.value["fg-default-color"],
						fontSize: "10px",
						fontFamily: style.value["font-family-mono"]
					}
				}
			},
			xaxis: {
				type: "datetime",
				labels: {
					style: {
						colors: style.value["fg-default-color"],
						fontSize: "10px",
						fontFamily: style.value["font-family-mono"]
					}
				}
			}
		}) as ApexOptions

	const $chartLine2 = document.querySelector("#chart-line2") as HTMLElement | null
	if ($chartLine2) {
		const chart = new ApexCharts($chartLine2, getOptions())
		chart.render()

		watch(isThemeDark, () => chart.updateOptions(getOptions()))
	}

	const getOptionsLine = () =>
		({
			series: [
				{
					data
				}
			],
			chart: {
				id: "chart1",
				height: 130,
				type: "area",
				brush: {
					target: "chart2",
					enabled: true
				},
				selection: {
					enabled: true,
					xaxis: {
						min: rangeStart,
						max: rangeEnd
					},
					fill: {
						color: style.value["fg-default-color"],
						opacity: 0.1
					},
					stroke: {
						width: 1,
						dashArray: 3,
						color: style.value["fg-default-color"],
						opacity: 0.4
					}
				}
			},
			colors: [style.value["extra1-color"]],
			grid: {
				borderColor: isThemeDark.value ? "#ffffff11" : "#00000011"
			},
			tooltip: {
				theme: isThemeDark.value ? "dark" : "light"
			},
			fill: {
				type: "gradient",
				gradient: {
					opacityFrom: 0.91,
					opacityTo: 0.1
				}
			},
			xaxis: {
				type: "datetime",
				tooltip: {
					enabled: false
				},
				labels: {
					style: {
						colors: style.value["fg-default-color"],
						fontSize: "10px",
						fontFamily: style.value["font-family-mono"]
					}
				}
			},
			yaxis: {
				tickAmount: 2,
				labels: {
					style: {
						colors: style.value["fg-default-color"],
						fontSize: "10px",
						fontFamily: style.value["font-family-mono"]
					}
				}
			}
		}) as ApexOptions

	const $chartLine = document.querySelector("#chart-line") as HTMLElement | null
	if ($chartLine) {
		const chartLine = new ApexCharts($chartLine, getOptionsLine())
		chartLine.render()
		watch(isThemeDark, () => {
			chartLine.updateOptions(getOptionsLine())
		})
	}
})
</script>
