<!-- src/add-os/modules/reports/views/SpacesReportPage.vue -->
<!--
	How each bookable space did over a period — bookings, averages, occupancy,
	no-shows, members — sortable, with the weekday × hour pattern of booked
	time. The figures the dashboard draws as columns, in full.
-->
<template>
	<div class="flex flex-col gap-6 text-[var(--add-text-primary)]">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold tracking-tight">{{ t("nav.pages.spacesReport") }}</h1>
				<p class="text-sm text-[var(--add-text-muted)]">{{ t("dashboard.reports.spacesDescription") }}</p>
			</div>
			<n-button size="small" secondary class="rounded-lg" @click="panel?.reload()">
				<template #icon><Icon name="carbon:renew" :size="15" /></template>
				{{ t("dashboard.refresh") }}
			</n-button>
		</div>

		<DashboardFilterBar
			v-model:period="period"
			v-model:branch-id="branchId"
			v-model:space-type="spaceType"
			:branch-options
			with-space-type
		/>

		<SpacesPanel ref="panel" :params :space-type />
	</div>
</template>

<script setup lang="ts">
import type { DashboardParams, DashboardSpaceType } from "@/add-os/services/dashboard"
import { NButton } from "naive-ui"
import { computed, ref, useTemplateRef } from "vue"
import { useI18n } from "vue-i18n"
import DashboardFilterBar from "@/add-os/modules/dashboard/components/DashboardFilterBar.vue"
import SpacesPanel from "@/add-os/modules/dashboard/components/SpacesPanel.vue"
import { useBranchOptions } from "@/add-os/modules/dashboard/composables/useBranchOptions"
import { presetPeriod } from "@/add-os/modules/dashboard/config/period"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()

const period = ref(presetPeriod("thisMonth"))
const branchId = ref<number | null>(null)
const spaceType = ref<DashboardSpaceType | null>(null)

const { branchOptions } = useBranchOptions()

const params = computed<DashboardParams>(() => ({ ...period.value, branch_id: branchId.value }))

const panel = useTemplateRef<InstanceType<typeof SpacesPanel>>("panel")
</script>
