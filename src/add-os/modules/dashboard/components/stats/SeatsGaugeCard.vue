<!-- src/add-os/modules/dashboard/components/stats/SeatsGaugeCard.vue -->
<!-- Co-Space seats taken right now, in the page's branch or across all of them, on a gauge. -->
<template>
	<StatCard :title="t('dashboard.stats.seatsNow')" :note :is-loading :error :ready @retry="emit('retry')">
		<GaugeChart :value="percent" :tone :caption="t('dashboard.stats.seatsCaption')" />
	</StatCard>
</template>

<script setup lang="ts">
import type { Tone } from "@/add-os/modules/dashboard/config/tones"
import type { BranchSeats } from "@/add-os/services/dashboard"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import GaugeChart from "@/add-os/modules/dashboard/components/stats/GaugeChart.vue"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import { formatNumber } from "@/add-os/utils/format/numbers"

const props = defineProps<{
	/** Every branch's seats now, from the operations overview. */
	branches: BranchSeats[]
	/** The page's branch; none counts every branch's seats together. */
	branchId: number | null
	isLoading: boolean
	error: unknown
	ready: boolean
}>()

const emit = defineEmits<{
	(e: "retry"): void
}>()

const { t } = useI18n()

const picked = computed(() => props.branches.filter(b => props.branchId === null || b.id === props.branchId))
const seats = computed(() => picked.value.reduce((sum, b) => sum + b.seats, 0))
const taken = computed(() => picked.value.reduce((sum, b) => sum + b.taken, 0))

const percent = computed(() => (seats.value === 0 ? null : (taken.value / seats.value) * 100))

/** Room to spare, filling up, or full. */
const tone = computed<Tone>(() => {
	if (percent.value === null) return "neutral"
	if (percent.value >= 100) return "danger"
	return percent.value >= 80 ? "warning" : "primary"
})

const note = computed(() => (seats.value === 0 ? undefined : t("dashboard.operations.seatsTaken", { taken: formatNumber(taken.value), seats: formatNumber(seats.value) })))
</script>
