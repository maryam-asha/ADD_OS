<!-- src/add-os/modules/dashboard/components/stats/SpaceBookingsCard.vue -->
<!--
	Bookings per space over the period, one kind of space at a time — rooms,
	halls, Co-Space — as columns, busiest first, under the page's branch.
	Every figure per space is the spaces report's.
-->
<template>
	<StatCard :title="t('dashboard.stats.spaceBookings')" :is-loading :error :ready="data !== null" @retry="reload">
		<template #filters>
			<RouterLink to="/reports/spaces" class="no-underline">
				<n-button size="small" secondary>
					{{ t("dashboard.stats.spacesReport") }}
					<template #icon><Icon name="carbon:arrow-left" :size="14" class="ltr:rotate-180" /></template>
				</n-button>
			</RouterLink>
		</template>

		<div class="flex flex-col gap-4">
			<ChartTabs v-model="spaceType" :tabs />
			<p v-if="data && rows.length === 0" class="m-0 py-10 text-center text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.stats.noSpaces") }}</p>
			<apexchart v-else-if="data" type="bar" :height="280" :options :series />
		</div>
	</StatCard>
</template>

<script setup lang="ts">
import type { ApexOptions } from "apexcharts"
import type { DashboardParams, DashboardSpaceType, SpacesParams } from "@/add-os/services/dashboard"
import { NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import ChartTabs from "@/add-os/modules/dashboard/components/stats/ChartTabs.vue"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import { useOverview } from "@/add-os/modules/dashboard/composables/useOverview"
import { baseChartOptions, CHART_COLOR } from "@/add-os/modules/dashboard/config/charts"
import { DASHBOARD_SPACE_TYPES, getSpacesOverview } from "@/add-os/services/dashboard"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	/** The page's period and branch; the card adds its own filters to them. */
	scope: DashboardParams
}>()

/** The most columns drawn; the spaces report lists every space. */
const MAX_COLUMNS = 15

const ICONS: Record<DashboardSpaceType, string> = {
	room: "carbon:building",
	event_hall: "carbon:events",
	co_space: "carbon:workspace"
}

const { t } = useI18n()

const spaceType = ref<DashboardSpaceType>("room")

const tabs = computed(() => DASHBOARD_SPACE_TYPES.map(type => ({ key: type, label: spaceTypeLabel(t, type), icon: ICONS[type] })))

const params = computed<SpacesParams>(() => ({ ...props.scope, space_type: spaceType.value }))

const { data, isLoading, error, reload } = useOverview(getSpacesOverview, params)

defineExpose({ reload })

const rtl = computed(() => currentLocale.value === "ar")

const rows = computed(() => {
	const top = (data.value?.spaces ?? []).slice(0, MAX_COLUMNS)
	return rtl.value ? [...top].reverse() : top
})

const series = computed(() => [{ name: t("dashboard.spaces.bookings"), data: rows.value.map(row => row.bookings) }])

const options = computed<ApexOptions>(() => {
	const base = baseChartOptions(rtl.value)
	return {
		...base,
		colors: [CHART_COLOR.info],
		plotOptions: { bar: { columnWidth: "38%", borderRadius: 4, borderRadiusApplication: "end" } },
		xaxis: {
			...base.xaxis,
			categories: rows.value.map(row => row.space.name ?? `#${row.space.id}`),
			labels: { ...base.xaxis?.labels, trim: true, maxHeight: 60 }
		}
	}
})
</script>
