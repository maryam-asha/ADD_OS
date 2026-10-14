<!-- src/add-os/modules/dashboard/components/stats/AppUsersCard.vue -->
<!--
	Members by the platform their app runs on, and those with none. A member on
	both platforms counts on both, so the platforms need not add up to the total.
-->
<template>
	<StatCard
		:title="t('dashboard.stats.appUsers')"
		:note="data ? t('dashboard.stats.membersTotal', { count: formatNumber(data.members) }) : undefined"
		:is-loading
		:error
		:ready="data !== null"
		@retry="reload"
	>
		<StatusTiles v-if="data" :items="tiles" :columns="2" />
	</StatCard>
</template>

<script setup lang="ts">
import type { StatusTile } from "@/add-os/modules/dashboard/types"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import StatusTiles from "@/add-os/modules/dashboard/components/stats/StatusTiles.vue"
import { useOverview } from "@/add-os/modules/dashboard/composables/useOverview"
import { getAppUsers } from "@/add-os/services/dashboard"
import { formatNumber } from "@/add-os/utils/format/numbers"

const { t } = useI18n()

// Nothing to filter: who has the app is the same whatever the period.
const { data, isLoading, error, reload } = useOverview(() => getAppUsers(), ref({}))

defineExpose({ reload })

const tiles = computed<StatusTile[]>(() => [
	{ key: "android", label: t("dashboard.stats.platform.android"), count: data.value?.android ?? 0, icon: "carbon:application-mobile", tone: "success" },
	{ key: "ios", label: t("dashboard.stats.platform.ios"), count: data.value?.ios ?? 0, icon: "carbon:mobile", tone: "info" },
	{ key: "none", label: t("dashboard.stats.platform.none"), count: data.value?.without_app ?? 0, icon: "carbon:phone-off", tone: "neutral" },
	{ key: "members", label: t("dashboard.stats.platform.members"), count: data.value?.members ?? 0, icon: "carbon:user-multiple", tone: "primary", to: "/members/individuals" }
])
</script>
