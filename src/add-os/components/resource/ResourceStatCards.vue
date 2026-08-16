<template>
	<div class="flex flex-wrap gap-4">
		<n-card v-for="card in cards" :key="card.label" size="small" class="min-w-[10rem] flex-1">
			<n-statistic :label="card.label" :value="formattedValue(card.value)" />
		</n-card>
	</div>
</template>

<script setup lang="ts">
import { NCard, NStatistic } from "naive-ui"
import { formatNumber } from "@/add-os/utils/format"

export interface StatCard {
	label: string
	value: string | number
}

defineProps<{ cards: StatCard[] }>()

function formattedValue(value: string | number): string {
	return typeof value === "number" ? formatNumber(value) : value
}
</script>
