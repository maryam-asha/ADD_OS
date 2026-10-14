<!-- src/add-os/modules/dashboard/components/stats/GaugeChart.vue -->
<!-- A share on a half-circle, its value in the middle and its meaning in words under it. -->
<template>
	<div class="flex flex-col items-center gap-1">
		<template v-if="value !== null">
			<apexchart type="radialBar" :height="180" :options :series="[Math.min(100, Math.max(0, value))]" />
			<span class="-mt-6 text-xs text-[var(--add-text-muted)]">{{ caption }}</span>
		</template>
		<span v-else class="py-10 text-sm text-[var(--add-text-muted)]">{{ t("dashboard.notAvailable") }}</span>
	</div>
</template>

<script setup lang="ts">
import type { Tone } from "@/add-os/modules/dashboard/config/tones"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { gaugeOptions } from "@/add-os/modules/dashboard/config/charts"
import { sharePercent } from "@/add-os/modules/dashboard/config/percent"

const props = defineProps<{
	/** A percentage, or null when there was nothing to measure. */
	value: number | null
	tone: Tone
	caption?: string
}>()

const { t } = useI18n()

const options = computed(() => gaugeOptions(props.tone, value => sharePercent(t, value)))
</script>
