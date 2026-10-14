<!-- src/add-os/modules/dashboard/components/stats/ServiceRequestsCard.vue -->
<!--
	Service requests submitted in the period: by status, by service type, and
	the share resolved on a gauge — all under the page's branch.
-->
<template>
	<StatCard
		:title="t('dashboard.stats.serviceRequests')"
		:note="data ? t('dashboard.stats.total', { count: formatNumber(data.total) }) : undefined"
		:is-loading
		:error
		:ready="data !== null"
		@retry="reload"
	>
		<div v-if="data" class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_14rem]">
			<div class="flex flex-col gap-3">
				<span class="text-xs font-semibold text-[var(--add-text-muted)]">{{ t("dashboard.stats.byStatus") }}</span>
				<StatusTiles :items="statusTiles" :columns="2" />
			</div>
			<div class="flex flex-col gap-3">
				<span class="text-xs font-semibold text-[var(--add-text-muted)]">{{ t("dashboard.stats.byType") }}</span>
				<p v-if="data.by_type.length === 0" class="m-0 text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.stats.noRequests") }}</p>
				<StatusTiles v-else :items="typeTiles" :columns="2" />
			</div>
			<div class="flex flex-col items-center gap-2 border-t border-[var(--add-border)]/30 pt-4 lg:border-s lg:border-t-0 lg:ps-4 lg:pt-0">
				<span class="text-xs font-semibold text-[var(--add-text-muted)]">{{ t("dashboard.stats.resolutionRate") }}</span>
				<GaugeChart
					:value="rate"
					:tone="rateTone(rate)"
					:caption="t('dashboard.stats.resolutionCaption')"
				/>
			</div>
		</div>
	</StatCard>
</template>

<script setup lang="ts">
import type { StatusTile } from "@/add-os/modules/dashboard/types"
import type { DashboardParams, RequestStatusKey, StatsParams } from "@/add-os/services/dashboard"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import GaugeChart from "@/add-os/modules/dashboard/components/stats/GaugeChart.vue"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import StatusTiles from "@/add-os/modules/dashboard/components/stats/StatusTiles.vue"
import { useOverview } from "@/add-os/modules/dashboard/composables/useOverview"
import { rateTone } from "@/add-os/modules/dashboard/config/tones"
import { getServiceRequestStats } from "@/add-os/services/dashboard"
import { formatNumber } from "@/add-os/utils/format/numbers"

const props = defineProps<{
	/** The page's period and branch. */
	scope: DashboardParams
}>()

const { t } = useI18n()

const params = computed<StatsParams>(() => props.scope)

const { data, isLoading, error, reload } = useOverview(getServiceRequestStats, params)

defineExpose({ reload })

const LOOK: Record<RequestStatusKey, Pick<StatusTile, "icon" | "tone">> = {
	pending: { icon: "carbon:document", tone: "info" },
	in_progress: { icon: "carbon:renew", tone: "warning" },
	resolved: { icon: "carbon:checkmark-outline", tone: "success" },
	rejected: { icon: "carbon:misuse-outline", tone: "danger" },
	cancelled: { icon: "carbon:close-outline", tone: "neutral" }
}

const statusTiles = computed<StatusTile[]>(() => (Object.keys(LOOK) as RequestStatusKey[]).map(status => ({
	key: status,
	label: t(`dashboard.stats.requestStatus.${status}`),
	count: data.value?.by_status[status] ?? 0,
	...LOOK[status],
	to: "/address/operations-requests"
})))

const typeTiles = computed<StatusTile[]>(() => (data.value?.by_type ?? []).map(row => ({
	key: String(row.type.id),
	label: row.type.name ?? `#${row.type.id}`,
	count: row.count,
	icon: "carbon:tool-box",
	tone: "primary"
})))

const rate = computed(() => (data.value?.resolution_rate == null ? null : Number.parseFloat(data.value.resolution_rate)))
</script>
