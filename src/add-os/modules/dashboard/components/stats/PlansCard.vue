<!-- src/add-os/modules/dashboard/components/stats/PlansCard.vue -->
<!--
	Live subscriptions by plan, as bars in one hue — the longest is the most
	held — read from the members overview the page already loads for its
	period and branch.
-->
<template>
	<StatCard
		:title="t('dashboard.members.byPlan')"
		:note="memberships ? t('dashboard.stats.total', { count: formatNumber(memberships.live) }) : undefined"
		:is-loading
		:error
		:ready
		@retry="emit('retry')"
	>
		<p v-if="memberships && memberships.by_plan.length === 0" class="m-0 text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.members.noSubscriptions") }}</p>
		<ul v-else-if="memberships" class="m-0 flex list-none flex-col gap-3.5 p-0">
			<li v-for="row in memberships.by_plan" :key="row.plan.id" class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between gap-2 text-sm">
					<span class="text-[var(--add-text-primary)]">{{ row.plan.name ?? t("dashboard.members.planFallback", { id: row.plan.id }) }}</span>
					<span class="font-bold text-[var(--add-text-primary)]" dir="ltr">{{ formatNumber(row.count) }}</span>
				</div>
				<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--add-surface-sunken)]">
					<div class="h-full rounded-full bg-[var(--add-primary)]" :style="{ width: `${share(row.count)}%` }" />
				</div>
			</li>
		</ul>
	</StatCard>
</template>

<script setup lang="ts">
import type { MembersOverview } from "@/add-os/services/dashboard"
import { useI18n } from "vue-i18n"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import { formatNumber } from "@/add-os/utils/format/numbers"

const props = defineProps<{
	memberships: MembersOverview["memberships"] | null
	isLoading: boolean
	error: unknown
	ready: boolean
}>()

const emit = defineEmits<{
	(e: "retry"): void
}>()

const { t } = useI18n()

/** Measured against the most-held plan, so the leader fills its track. */
function share(count: number): number {
	const top = Math.max(0, ...(props.memberships?.by_plan ?? []).map(row => row.count))
	return top === 0 ? 0 : Math.round((count / top) * 100)
}
</script>
