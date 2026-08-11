<template>
	<CardCodeExample title="Line">
		<Line :data :options />
	</CardCodeExample>
</template>

<script setup lang="ts">
import {
	CategoryScale,
	Chart as ChartJS,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	Title,
	Tooltip
} from "chart.js"
import { computed, ref, watch } from "vue"
import { Line } from "vue-chartjs"
import { useThemeStore } from "@/stores/theme"

const themeStore = useThemeStore()
const style = computed(() => themeStore.style)

const data = {
	labels: ["January", "February", "March", "April", "May", "June", "July"],
	datasets: [
		{
			label: "Data One",
			backgroundColor: style.value["primary-color"],
			borderColor: style.value["primary-color"],
			data: [40, 39, 10, 40, 39, 80, 40]
		}
	]
}

function getOptions() {
	return {
		responsive: true,
		maintainAspectRatio: false,
		color: style.value["fg-default-color"],
		scales: {
			y: {
				ticks: { color: style.value["fg-secondary-color"] },
				grid: { color: style.value["hover-color"] }
			},
			x: {
				ticks: { color: style.value["fg-secondary-color"] },
				grid: { color: style.value["hover-color"] }
			}
		}
	}
}

const options = ref(getOptions())

watch(style, () => {
	options.value = getOptions()
})

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)
</script>
