<!-- src/add-os/modules/dashboard/components/stats/SeatsGaugeCard.vue -->
<!--
	Co-Space seats reserved right now, in the page's branch or across all of
	them, on a gauge. Reserved, not occupied: a subscription holds its seats
	whether or not anyone sits in them, and staff may sell past capacity — the
	gauge then stops at full and a line says by how much.
-->
<template>
	<StatCard :title="t('dashboard.stats.seatsNow')" :note :is-loading :error :ready @retry="emit('retry')">
		<div class="flex flex-col items-center gap-1">
			<GaugeChart :value="percent" :tone :caption="t('dashboard.stats.seatsCaption')" />
			<span v-if="over > 0" class="flex items-center gap-1 text-xs font-semibold text-[var(--add-danger-text)]">
				<Icon name="carbon:warning-alt" :size="14" />
				{{ t("dashboard.stats.overCapacity", { count: formatNumber(over) }) }}
			</span>
		</div>
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
import Icon from "@/components/common/Icon.vue"

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
/** Seats sold past capacity. */
const over = computed(() => (seats.value === 0 ? 0 : Math.max(0, taken.value - seats.value)))

const percent = computed(() => (seats.value === 0 ? null : (taken.value / seats.value) * 100))

/** Room to spare, filling up, or full. */
const tone = computed<Tone>(() => {
	if (percent.value === null) return "neutral"
	if (percent.value >= 100) return "danger"
	return percent.value >= 80 ? "warning" : "primary"
})

const note = computed(() => (seats.value === 0 ? undefined : t("dashboard.stats.seatsReserved", { taken: formatNumber(taken.value), seats: formatNumber(seats.value) })))
</script>
