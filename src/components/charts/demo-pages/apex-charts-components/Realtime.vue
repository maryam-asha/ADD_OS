<template>
	<CardCodeExample title="Realtime">
		<Apex type="line" height="350" :options="chartOptions" :series @mounted="chart = $event" />
	</CardCodeExample>
</template>

<script setup lang="ts">
import type { ApexOptions } from "apexcharts"
import type { VueApexChartsComponent } from "@/components/charts/Apex.vue"
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import Apex from "@/components/charts/Apex.vue"
import { useThemeStore } from "@/stores/theme"

const themeStore = useThemeStore()
const chart = ref<VueApexChartsComponent | null>(null)
const isThemeDark = computed(() => themeStore.isThemeDark)
const style = computed(() => themeStore.style)

let lastDate = 0
let data: { x: number; y: number }[] = []
const TICKINTERVAL = 86400000
const XAXISRANGE = 777600000

function getDayWiseTimeSeries(
	baseval: number,
	count: number,
	yrange: {
		min: number
		max: number
	}
) {
	let i = 0
	while (i < count) {
		const x = baseval
		const y = Math.floor(Math.random() * (yrange.max - yrange.min + 1)) + yrange.min

		data.push({
			x,
			y
		})
		lastDate = baseval
		baseval += TICKINTERVAL
		i++
	}
}

getDayWiseTimeSeries(new Date("11 Feb 2017 GMT").getTime(), 10, {
	min: 10,
	max: 90
})

function getNewSeries(
	baseval: number,
	yrange: {
		min: number
		max: number
	}
) {
	const newDate = baseval + TICKINTERVAL
	lastDate = newDate

	for (let i = 0; i < data.length - 10; i++) {
		// IMPORTANT
		// we reset the x and y of the data which is out of drawing area
		// to prevent memory leaks
		const currentData = data[i]
		if (currentData) {
			currentData.x = newDate - XAXISRANGE - TICKINTERVAL
			currentData.y = 0
		}
	}

	data.push({
		x: newDate,
		y: Math.floor(Math.random() * (yrange.max - yrange.min + 1)) + yrange.min
	})
}

function resetData() {
	// Alternatively, you can also reset the data at certain intervals to prevent creating a huge series
	data = data.slice(data.length - 10, data.length)
}

const series = ref([
	{
		data: data.slice()
	}
])
function getOptions(): ApexOptions {
	return {
		chart: {
			id: "realtime",
			height: 350,
			type: "line",
			animations: {
				enabled: true,
				animateGradually: {
					enabled: true,
					delay: 1000
				},
				dynamicAnimation: {
					enabled: true,
					speed: 1000
				}
			},
			toolbar: {
				show: false
			},
			zoom: {
				enabled: false
			}
		},
		dataLabels: {
			enabled: false
		},
		fill: {
			type: "gradient",
			gradient: {
				shade: "dark",
				gradientToColors: [style.value["fg-default-color"] || ""].filter(o => !!o),
				shadeIntensity: 1,
				type: "horizontal",
				opacityFrom: 1,
				opacityTo: 1,
				stops: [0, 100, 100, 100]
			}
		},
		stroke: {
			curve: "smooth"
		},
		grid: {
			borderColor: isThemeDark.value ? "#ffffff11" : "#00000011"
		},
		title: {
			text: "Dynamic Updating Chart",
			align: "left",
			style: {
				color: style.value["fg-default-color"],
				fontSize: "16px",
				fontFamily: style.value["font-family"]
			}
		},
		markers: {
			size: 0
		},
		tooltip: {
			theme: isThemeDark.value ? "dark" : "light"
		},
		xaxis: {
			type: "datetime",
			range: XAXISRANGE,
			labels: {
				style: {
					colors: style.value["fg-default-color"],
					fontSize: "10px",
					fontFamily: style.value["font-family-mono"]
				}
			}
		},
		yaxis: {
			max: 100,
			labels: {
				style: {
					colors: style.value["fg-default-color"],
					fontSize: "10px",
					fontFamily: style.value["font-family-mono"]
				}
			}
		},
		legend: {
			show: false
		}
	}
}

const chartOptions = ref(getOptions())
let updateTimer = null as NodeJS.Timeout | null
let resetTimer = null as NodeJS.Timeout | null

onMounted(() => {
	updateTimer = setInterval(() => {
		getNewSeries(lastDate, {
			min: 10,
			max: 90
		})

		chart.value?.updateSeries([
			{
				data
			}
		])
	}, 1000)

	// every 60 seconds, we reset the data to prevent memory leaks
	resetTimer = setInterval(() => {
		resetData()

		chart.value?.updateSeries(
			[
				{
					data
				}
			],
			true
		)
	}, 60000)
})

onBeforeUnmount(() => {
	if (updateTimer) clearInterval(updateTimer)
	if (resetTimer) clearInterval(resetTimer)
})

watch(isThemeDark, () => {
	chartOptions.value = getOptions()
})
</script>
