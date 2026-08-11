<template>
	<CardCodeExample title="Bar">
		<Bar :data :options />
	</CardCodeExample>
</template>

<script lang="ts" setup>
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from "chart.js"
import { computed, ref, watch } from "vue"
import { Bar } from "vue-chartjs"
import { useThemeStore } from "@/stores/theme"

const themeStore = useThemeStore()
const style = computed(() => themeStore.style)

const data = {
	labels: [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	],
	datasets: [
		{
			label: "Data One",
			backgroundColor: style.value["primary-color"],
			data: [40, 20, 12, 39, 10, 40, 39, 80, 40, 20, 12, 11]
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
</script>
