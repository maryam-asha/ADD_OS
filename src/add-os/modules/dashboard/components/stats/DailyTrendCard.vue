<!-- src/add-os/modules/dashboard/components/stats/DailyTrendCard.vue -->
<!--
	A count per local day of the period — bookings or new members, one at a
	time on its own tab (one series, one hue), under the page's branch.
-->
<template>
	<StatCard :title="t('dashboard.stats.daily')" :is-loading :error :ready="data !== null" @retry="reload">
		<div class="flex flex-col gap-4">
			<ChartTabs v-if="tabs.length > 1" v-model="metric" :tabs />
			<apexchart v-if="data" type="area" :height="260" :options :series />
		</div>
	</StatCard>
</template>

<script setup lang="ts">
import type { ApexOptions } from "apexcharts"
import type { DashboardParams, StatsParams } from "@/add-os/services/dashboard"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import ChartTabs from "@/add-os/modules/dashboard/components/stats/ChartTabs.vue"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import { useOverview } from "@/add-os/modules/dashboard/composables/useOverview"
import { baseChartOptions, CHART_COLOR } from "@/add-os/modules/dashboard/config/charts"
import { localDay } from "@/add-os/modules/dashboard/config/period"
import { getDailyBookings, getDailyMembers } from "@/add-os/services/dashboard"
import { MONTHS } from "@/add-os/utils/format/calendar"

type Metric = "bookings" | "members"
type DailyParams = StatsParams & { metric: Metric }

const props = defineProps<{
	/** The page's period and branch; the card adds its own filters to them. */
	scope: DashboardParams
	/** The measures this account may see, first shown first. */
	metrics: Metric[]
}>()

const { t } = useI18n()

const metric = ref<Metric>(props.metrics[0] ?? "bookings")

const tabs = computed(() => props.metrics.map(key => ({
	key,
	label: t(`dashboard.stats.dailyMetric.${key}`),
	icon: key === "bookings" ? "carbon:calendar-add" : "carbon:user-follow"
})))

const params = computed<DailyParams>(() => ({ ...props.scope, metric: metric.value }))

const { data, isLoading, error, reload } = useOverview(
	(p: DailyParams) => (p.metric === "members" ? getDailyMembers(p) : getDailyBookings(p)),
	params
)

defineExpose({ reload })

const rtl = computed(() => currentLocale.value === "ar")

/** "1 تشرين الأول" — the day and the month; the period says the year. */
function dayLabel(iso: string): string {
	const day = localDay(iso)
	return `${day.getDate()} ${MONTHS[currentLocale.value][day.getMonth()]}`
}

const days = computed(() => {
	const list = data.value?.days ?? []
	return rtl.value ? [...list].reverse() : list
})

const series = computed(() => [{ name: t(`dashboard.stats.dailyMetric.${metric.value}`), data: days.value.map(d => d.count) }])

const options = computed<ApexOptions>(() => {
	const base = baseChartOptions(rtl.value)
	return {
		...base,
		colors: [CHART_COLOR.primary],
		stroke: { curve: "smooth", width: 2 },
		fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02 } },
		markers: { size: days.value.length <= 14 ? 4 : 0 },
		xaxis: {
			...base.xaxis,
			categories: days.value.map(d => dayLabel(d.date)),
			tickAmount: Math.min(days.value.length, 8),
			labels: { ...base.xaxis?.labels, rotate: 0, hideOverlappingLabels: true }
		}
	}
})
</script>
