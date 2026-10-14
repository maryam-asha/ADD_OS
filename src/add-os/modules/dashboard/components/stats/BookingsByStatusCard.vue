<!-- src/add-os/modules/dashboard/components/stats/BookingsByStatusCard.vue -->
<!-- Bookings starting in the period, one tile per status, narrowed by the page's branch and its own space type. -->
<template>
	<StatCard
		:title="t('dashboard.stats.bookingsByStatus')"
		:note="data ? t('dashboard.stats.total', { count: formatNumber(data.total) }) : undefined"
		:is-loading
		:error
		:ready="data !== null"
		@retry="reload"
	>
		<template #filters>
			<div class="w-36">
				<n-select v-model:value="spaceType" :options="typeOptions" :placeholder="t('dashboard.allSpaceTypes')" clearable size="small" />
			</div>
		</template>
		<StatusTiles v-if="data" :items="tiles" />
	</StatCard>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { StatusTile } from "@/add-os/modules/dashboard/types"
import type { BookingStatusKey, DashboardParams, StatsParams } from "@/add-os/services/dashboard"
import { NSelect } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import StatusTiles from "@/add-os/modules/dashboard/components/stats/StatusTiles.vue"
import { useOverview } from "@/add-os/modules/dashboard/composables/useOverview"
import { getBookingsByStatus } from "@/add-os/services/dashboard"
import { formatNumber } from "@/add-os/utils/format/numbers"

const props = defineProps<{
	/** The page's period and branch; the card adds its own filters to them. */
	scope: DashboardParams
}>()

const { t } = useI18n()

const spaceType = ref<string | null>(null)

const typeOptions = computed<SelectOption[]>(() => ["room", "event_hall", "co_space", "business"].map(type => ({ label: spaceTypeLabel(t, type), value: type })))

const params = computed<StatsParams>(() => ({ ...props.scope, space_type: spaceType.value }))

const { data, isLoading, error, reload } = useOverview(getBookingsByStatus, params)

defineExpose({ reload })

const LOOK: Record<BookingStatusKey, Pick<StatusTile, "icon" | "tone">> = {
	pending: { icon: "carbon:time", tone: "warning" },
	awaiting_payment: { icon: "carbon:wallet", tone: "warning" },
	confirmed: { icon: "carbon:checkmark", tone: "info" },
	completed: { icon: "carbon:checkmark-filled", tone: "success" },
	no_show: { icon: "carbon:view-off", tone: "danger" },
	cancelled: { icon: "carbon:close-outline", tone: "neutral" },
	rejected: { icon: "carbon:misuse-outline", tone: "danger" }
}

const ORDER: BookingStatusKey[] = ["pending", "awaiting_payment", "confirmed", "completed", "no_show", "cancelled", "rejected"]

const tiles = computed<StatusTile[]>(() => ORDER.map(status => ({
	key: status,
	label: t(`dashboard.stats.bookingStatus.${status}`),
	count: data.value?.by_status[status] ?? 0,
	...LOOK[status],
	to: status === "pending" ? "/bookings/approval-queue" : "/bookings/all"
})))
</script>
