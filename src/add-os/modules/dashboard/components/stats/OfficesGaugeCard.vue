<!-- src/add-os/modules/dashboard/components/stats/OfficesGaugeCard.vue -->
<!--
	Private offices a lease holds today, in the page's branch or across all of
	them, on a gauge. Apart from the Co-Space seats: an office is leased whole,
	never part of the seat pool.
-->
<template>
	<StatCard :title="t('dashboard.stats.officesNow')" :note :is-loading :error :ready @retry="emit('retry')">
		<GaugeChart v-if="offices > 0" :value="percent" tone="primary" :caption="t('dashboard.stats.officesCaption')" />
		<p v-else class="m-0 py-10 text-center text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.stats.noOffices") }}</p>
	</StatCard>
</template>

<script setup lang="ts">
import type { BranchSeats } from "@/add-os/services/dashboard"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import GaugeChart from "@/add-os/modules/dashboard/components/stats/GaugeChart.vue"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import { formatNumber } from "@/add-os/utils/format/numbers"

const props = defineProps<{
	/** Every branch's offices now, from the operations overview. */
	branches: BranchSeats[]
	/** The page's branch; none counts every branch's offices together. */
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
const offices = computed(() => picked.value.reduce((sum, b) => sum + b.offices, 0))
const leased = computed(() => picked.value.reduce((sum, b) => sum + b.offices_leased, 0))

const percent = computed(() => (offices.value === 0 ? null : (leased.value / offices.value) * 100))

const note = computed(() => (offices.value === 0 ? undefined : t("dashboard.stats.officesLeased", { leased: formatNumber(leased.value), offices: formatNumber(offices.value) })))
</script>
