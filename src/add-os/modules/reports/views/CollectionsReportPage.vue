<!-- src/add-os/modules/reports/views/CollectionsReportPage.vue -->
<!--
	Money collected over a period, per currency — cash, cards, invoice
	payments, what was invoiced — against the period before, and the points
	each purpose took. Centre-wide: money belongs to no branch.
-->
<template>
	<div class="flex flex-col gap-6 text-[var(--add-text-primary)]">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold tracking-tight">{{ t("nav.pages.collectionsReport") }}</h1>
				<p class="text-sm text-[var(--add-text-muted)]">{{ t("dashboard.reports.collectionsDescription") }}</p>
			</div>
			<n-button size="small" secondary class="rounded-lg" :loading="isLoading" @click="reload">
				<template #icon><Icon name="carbon:renew" :size="15" /></template>
				{{ t("dashboard.refresh") }}
			</n-button>
		</div>

		<DashboardFilterBar v-model:period="period" />

		<n-alert v-if="error" type="error" show-icon>{{ t("dashboard.loadFailed") }}</n-alert>
		<div v-else-if="isLoading && !data" class="flex items-center justify-center py-16">
			<n-spin />
		</div>
		<n-spin v-else-if="data" :show="isLoading" class="flex flex-col gap-6">
			<div class="flex flex-col gap-6">
				<CollectedCards :current="data.collected.current" :previous="data.collected.previous" />
				<PointsByPurposeCard :current="data.collected.current" :previous="data.collected.previous" />
			</div>
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import { NAlert, NButton, NSpin } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import CollectedCards from "@/add-os/modules/dashboard/components/CollectedCards.vue"
import DashboardFilterBar from "@/add-os/modules/dashboard/components/DashboardFilterBar.vue"
import PointsByPurposeCard from "@/add-os/modules/dashboard/components/PointsByPurposeCard.vue"
import { useOverview } from "@/add-os/modules/dashboard/composables/useOverview"
import { presetPeriod } from "@/add-os/modules/dashboard/config/period"
import { getFinanceOverview } from "@/add-os/services/dashboard"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()

const period = ref(presetPeriod("thisMonth"))

const { data, isLoading, error, reload } = useOverview(getFinanceOverview, period)
</script>
