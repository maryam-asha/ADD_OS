<!-- src/add-os/modules/dashboard/views/DashboardOverviewPage.vue -->
<!--
	The dashboard's home page: statistics at a glance. One period and one branch
	for the whole page (finance ignores the branch — money belongs to none); a
	card narrows further only where it has a filter of its own — a space type, a
	currency, a tab — and loads on its own. A card shows only to an account holding its section's permission
	(config/permissions.ts); the sections fold away. The figures in full —
	every space, every currency, every invoice — are the reports'.
-->
<template>
	<div class="flex flex-col gap-6 text-[var(--add-text-primary)]">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold tracking-tight">{{ t("nav.sections.dashboard") }}</h1>
				<p class="text-sm text-[var(--add-text-muted)]">{{ t("dashboard.description") }}</p>
			</div>
			<n-button v-if="visible.length" size="small" secondary class="rounded-lg" @click="refresh">
				<template #icon><Icon name="carbon:renew" :size="15" /></template>
				{{ t("dashboard.refresh") }}
			</n-button>
		</div>

		<div
			v-if="!visible.length"
			class="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--add-border)]/60 bg-[var(--add-surface-raised)] p-10 text-center"
		>
			<Icon name="carbon:locked" :size="28" class="text-[var(--add-text-muted)]" />
			<span class="font-semibold">{{ t("dashboard.noSections.title") }}</span>
			<span class="text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.noSections.body") }}</span>
		</div>

		<template v-else>
			<DashboardFilterBar v-model:period="period" v-model:branch-id="branchId" :branch-options />

			<div v-if="can.operations || can.members" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<template v-if="can.operations">
					<StatTile :label="t('dashboard.operations.activeSessions')" icon="carbon:user-multiple" :value="operations.data.value?.now.active_sessions ?? null" to="/bookings/active-sessions" />
					<StatTile :label="t('dashboard.operations.expectedToday')" icon="carbon:calendar" :value="operations.data.value?.now.expected_today ?? null" to="/bookings/reception-desk" />
				</template>
				<template v-if="can.members">
					<StatTile
						:label="t('dashboard.members.newMembers')"
						icon="carbon:user-follow"
						:value="members.data.value?.new_members.current ?? null"
						:previous="members.data.value?.new_members.previous ?? null"
						to="/members/individuals"
					/>
					<StatTile :label="t('dashboard.members.liveSubscriptions')" icon="carbon:license" :value="members.data.value?.memberships.live ?? null" to="/members/memberships" />
				</template>
			</div>

			<AttentionList v-if="attention.length" :items="attention" />

			<DashboardPanel v-if="can.operations" section="operations" :title="t('dashboard.operations.title')" icon="carbon:building">
				<div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
					<BookingsByStatusCard class="xl:col-span-2" :scope />
					<SeatsGaugeCard
						:branches="operations.data.value?.now.branches ?? []"
						:branch-id
						:is-loading="operations.isLoading.value"
						:error="operations.error.value"
						:ready="operations.data.value !== null"
						@retry="operations.reload"
					/>
					<ServiceRequestsCard class="xl:col-span-3" :scope />
					<DailyTrendCard class="xl:col-span-3" :scope :metrics="dailyMetrics" />
				</div>
			</DashboardPanel>

			<DashboardPanel v-if="can.spaces" section="spaces" :title="t('dashboard.spaces.title')" icon="carbon:workspace">
				<SpaceBookingsCard :scope />
			</DashboardPanel>

			<DashboardPanel v-if="can.finance" section="finance" :title="t('dashboard.finance.title')" icon="carbon:currency">
				<div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
					<CollectionGaugeCard
						:totals="finance.data.value?.invoices.totals ?? []"
						:is-loading="finance.isLoading.value"
						:error="finance.error.value"
						:ready="finance.data.value !== null"
						@retry="finance.reload"
					/>
					<CollectedSummaryCard
						class="xl:col-span-2"
						:current="finance.data.value?.collected.current ?? null"
						:previous="finance.data.value?.collected.previous ?? null"
						:is-loading="finance.isLoading.value"
						:error="finance.error.value"
						:ready="finance.data.value !== null"
						@retry="finance.reload"
					/>
				</div>
			</DashboardPanel>

			<DashboardPanel v-if="can.members" section="members" :title="t('dashboard.members.title')" icon="carbon:user-multiple">
				<div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
					<PlansCard
						class="xl:col-span-2"
						:memberships="members.data.value?.memberships ?? null"
						:is-loading="members.isLoading.value"
						:error="members.error.value"
						:ready="members.data.value !== null"
						@retry="members.reload"
					/>
					<AppUsersCard ref="appUsersCard" />
					<DailyTrendCard v-if="!can.operations" class="xl:col-span-3" :scope :metrics="['members']" />
				</div>
			</DashboardPanel>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { Ref } from "vue"
import type { DashboardPeriod } from "@/add-os/modules/dashboard/config/period"
import type { AttentionItem } from "@/add-os/modules/dashboard/types"
import type { DashboardParams } from "@/add-os/services/dashboard"
import { NButton } from "naive-ui"
import { computed, ref, useTemplateRef } from "vue"
import { useI18n } from "vue-i18n"
import { canViewDashboardSection, DASHBOARD_SECTIONS } from "@/add-os/config/permissions"
import AttentionList from "@/add-os/modules/dashboard/components/AttentionList.vue"
import DashboardFilterBar from "@/add-os/modules/dashboard/components/DashboardFilterBar.vue"
import DashboardPanel from "@/add-os/modules/dashboard/components/DashboardPanel.vue"
import AppUsersCard from "@/add-os/modules/dashboard/components/stats/AppUsersCard.vue"
import BookingsByStatusCard from "@/add-os/modules/dashboard/components/stats/BookingsByStatusCard.vue"
import CollectedSummaryCard from "@/add-os/modules/dashboard/components/stats/CollectedSummaryCard.vue"
import CollectionGaugeCard from "@/add-os/modules/dashboard/components/stats/CollectionGaugeCard.vue"
import DailyTrendCard from "@/add-os/modules/dashboard/components/stats/DailyTrendCard.vue"
import PlansCard from "@/add-os/modules/dashboard/components/stats/PlansCard.vue"
import SeatsGaugeCard from "@/add-os/modules/dashboard/components/stats/SeatsGaugeCard.vue"
import ServiceRequestsCard from "@/add-os/modules/dashboard/components/stats/ServiceRequestsCard.vue"
import SpaceBookingsCard from "@/add-os/modules/dashboard/components/stats/SpaceBookingsCard.vue"
import StatTile from "@/add-os/modules/dashboard/components/StatTile.vue"
import { useBranchOptions } from "@/add-os/modules/dashboard/composables/useBranchOptions"
import { useOverview } from "@/add-os/modules/dashboard/composables/useOverview"
import { presetPeriod } from "@/add-os/modules/dashboard/config/period"
import { getFinanceOverview, getMembersOverview, getOperationsOverview } from "@/add-os/services/dashboard"
import Icon from "@/components/common/Icon.vue"

type Section = (typeof DASHBOARD_SECTIONS)[number]

const { t } = useI18n()

const visible = DASHBOARD_SECTIONS.filter(canViewDashboardSection)
const can = Object.fromEntries(DASHBOARD_SECTIONS.map(section => [section, visible.includes(section)])) as Record<Section, boolean>

const period = ref<DashboardPeriod>(presetPeriod("thisMonth"))
/** The one branch filter for the whole page; finance ignores it — money belongs to no branch. */
const branchId = ref<number | null>(null)

/**
 * The period and branch as every card receives them, with a counter the
 * refresh button bumps: a card refetches whenever what it was given changes,
 * and the counter is never sent — the service passes on only the filters it knows.
 */
const refreshes = ref(0)
const scope = computed<DashboardParams>(() => ({ ...period.value, branch_id: branchId.value, refresh: refreshes.value }))

const { branchOptions } = useBranchOptions()

/** A section's overview, or nothing at all for an account that may not see it. */
function overviewIf<T>(allowed: boolean, fetch: (params: DashboardParams) => Promise<T>) {
	if (allowed) return useOverview(fetch, scope)
	return { data: ref(null) as Ref<T | null>, isLoading: ref(false), error: ref<unknown>(null), reload: async () => {} }
}

const operations = overviewIf(can.operations, getOperationsOverview)
const members = overviewIf(can.members, getMembersOverview)
const finance = overviewIf(can.finance, getFinanceOverview)

const dailyMetrics = computed<Array<"bookings" | "members">>(() => (can.members ? ["bookings", "members"] : ["bookings"]))

/** Everything waiting on staff this account may act on, as one line of badges. */
const attention = computed<AttentionItem[]>(() => {
	const items: AttentionItem[] = []
	const ops = operations.data.value?.attention
	const money = finance.data.value?.attention
	const people = members.data.value

	if (ops) {
		items.push(
			{ key: "approval", label: t("dashboard.operations.awaitingApproval"), count: ops.bookings_awaiting_approval, to: "/bookings/approval-queue" },
			{ key: "payment", label: t("dashboard.operations.awaitingPayment"), count: ops.bookings_awaiting_payment, to: "/bookings/all" },
			{ key: "services", label: t("dashboard.operations.openServiceRequests"), count: ops.open_service_requests, to: "/address/operations-requests" },
			{ key: "inquiries", label: t("dashboard.operations.newSiteInquiries"), count: ops.new_site_inquiries },
			{ key: "offices", label: t("dashboard.operations.unquotedOfficeRequests"), count: ops.unquoted_office_requests, to: "/address/private-office-requests" }
		)
	}
	if (money) {
		items.push(
			{ key: "providers", label: t("dashboard.finance.pendingProviderRequests"), count: money.pending_provider_requests, to: "/providers/requests" },
			{ key: "renewals", label: t("dashboard.finance.stoppedRenewals"), count: money.stopped_renewals, to: "/members/stopped-renewals" },
			{ key: "rates", label: t("dashboard.finance.pendingRateSuggestions"), count: money.pending_exchange_rate_suggestions, to: "/payments/exchange-rates" },
			{ key: "cash", label: t("dashboard.finance.openCashSessions"), count: money.open_cash_sessions, to: "/payments/cash-register" }
		)
	}
	if (people) {
		items.push(
			{ key: "ending", label: t("dashboard.members.endingThisWeek"), count: people.memberships.ending_within_7_days, to: "/members/memberships" },
			{ key: "leases", label: t("dashboard.members.leasesEndingThisMonth"), count: people.office_leases.ending_within_30_days, to: "/members/office-leases" }
		)
	}

	return items
})

const appUsersCard = useTemplateRef<{ reload: () => Promise<void> }>("appUsersCard")

/** Everything with a period refetches with the counter; the app-users card has none, so it is asked directly. */
function refresh() {
	refreshes.value++
	void appUsersCard.value?.reload()
}
</script>
