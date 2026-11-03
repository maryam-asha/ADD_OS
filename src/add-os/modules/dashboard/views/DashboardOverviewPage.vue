<!-- src/add-os/modules/dashboard/views/DashboardOverviewPage.vue -->
<!--
	The dashboard's home page: statistics at a glance. One period and one branch
	for the whole page (finance ignores the branch — money belongs to none); a
	card narrows further only where it has a filter of its own — a space type, a
	currency, a tab — and loads on its own. A card shows only to an account holding its section's permission
	(config/permissions.ts). One tab at a time: the overview first — the
	headline numbers and what is waiting on staff — then a tab per section; a
	tab's cards load the first time it opens and stay loaded after. The figures
	in full — every space, every currency, every invoice — are the reports'.
-->
<template>
	<div class="flex flex-col gap-6 text-[var(--add-text-primary)]">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold tracking-tight">{{ t("nav.sections.dashboard") }}</h1>
			<p class="text-sm text-[var(--add-text-muted)]">{{ t("dashboard.description") }}</p>
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
			<DashboardTabBar
				v-model:tab="tab"
				v-model:period="period"
				v-model:branch-id="branchId"
				:tabs
				:branch-options="tab === 'finance' ? null : branchOptions"
				@refresh="refresh"
			/>

			<div v-if="opened.has('overview')" v-show="tab === 'overview'" v-bind="panel('overview')" class="flex flex-col gap-6">
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
			</div>

			<div v-if="opened.has('operations')" v-show="tab === 'operations'" v-bind="panel('operations')" class="grid grid-cols-1 gap-5 xl:grid-cols-3">
				<BookingsByStatusCard class="xl:col-span-2" :scope />
				<div class="flex flex-col gap-5">
					<SeatsGaugeCard
						:branches="operations.data.value?.now.branches ?? []"
						:branch-id
						:is-loading="operations.isLoading.value"
						:error="operations.error.value"
						:ready="operations.data.value !== null"
						@retry="operations.reload"
					/>
					<OfficesGaugeCard
						:branches="operations.data.value?.now.branches ?? []"
						:branch-id
						:is-loading="operations.isLoading.value"
						:error="operations.error.value"
						:ready="operations.data.value !== null"
						@retry="operations.reload"
					/>
				</div>
				<ServiceRequestsCard class="xl:col-span-3" :scope />
				<DailyTrendCard class="xl:col-span-3" :scope :metrics="dailyMetrics" />
			</div>

			<div v-if="opened.has('spaces')" v-show="tab === 'spaces'" v-bind="panel('spaces')">
				<SpaceBookingsCard :scope />
			</div>

			<div v-if="opened.has('finance')" v-show="tab === 'finance'" v-bind="panel('finance')" class="grid grid-cols-1 gap-5 xl:grid-cols-3">
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

			<div v-if="opened.has('members')" v-show="tab === 'members'" v-bind="panel('members')" class="grid grid-cols-1 gap-5 xl:grid-cols-3">
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
		</template>
	</div>
</template>

<script setup lang="ts">
import type { Ref } from "vue"
import type { DashboardPeriod } from "@/add-os/modules/dashboard/config/period"
import type { AttentionItem } from "@/add-os/modules/dashboard/types"
import type { DashboardParams } from "@/add-os/services/dashboard"
import { useLocalStorage } from "@vueuse/core"
import { computed, reactive, ref, useTemplateRef, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canViewDashboardSection, DASHBOARD_SECTIONS } from "@/add-os/config/permissions"
import AttentionList from "@/add-os/modules/dashboard/components/AttentionList.vue"
import DashboardTabBar from "@/add-os/modules/dashboard/components/DashboardTabBar.vue"
import AppUsersCard from "@/add-os/modules/dashboard/components/stats/AppUsersCard.vue"
import BookingsByStatusCard from "@/add-os/modules/dashboard/components/stats/BookingsByStatusCard.vue"
import CollectedSummaryCard from "@/add-os/modules/dashboard/components/stats/CollectedSummaryCard.vue"
import CollectionGaugeCard from "@/add-os/modules/dashboard/components/stats/CollectionGaugeCard.vue"
import DailyTrendCard from "@/add-os/modules/dashboard/components/stats/DailyTrendCard.vue"
import OfficesGaugeCard from "@/add-os/modules/dashboard/components/stats/OfficesGaugeCard.vue"
import PlansCard from "@/add-os/modules/dashboard/components/stats/PlansCard.vue"
import SeatsGaugeCard from "@/add-os/modules/dashboard/components/stats/SeatsGaugeCard.vue"
import ServiceRequestsCard from "@/add-os/modules/dashboard/components/stats/ServiceRequestsCard.vue"
import SpaceBookingsCard from "@/add-os/modules/dashboard/components/stats/SpaceBookingsCard.vue"
import StatTile from "@/add-os/modules/dashboard/components/StatTile.vue"
import { useBranchOptions } from "@/add-os/modules/dashboard/composables/useBranchOptions"
import { useOverview } from "@/add-os/modules/dashboard/composables/useOverview"
import { DASHBOARD_DEFAULT_PRESET, presetPeriod } from "@/add-os/modules/dashboard/config/period"
import { getFinanceOverview, getMembersOverview, getOperationsOverview } from "@/add-os/services/dashboard"
import Icon from "@/components/common/Icon.vue"

type Section = (typeof DASHBOARD_SECTIONS)[number]
type Tab = "overview" | Section

const { t } = useI18n()

const visible = DASHBOARD_SECTIONS.filter(canViewDashboardSection)
const can = Object.fromEntries(DASHBOARD_SECTIONS.map(section => [section, visible.includes(section)])) as Record<Section, boolean>

/**
 * The overview first, for an account with something to put on it — every
 * section but spaces feeds its numbers or what is waiting — then a tab per section.
 */
const tabs = computed(() => [
	...(visible.some(section => section !== "spaces") ? [{ key: "overview" as Tab, label: t("dashboard.tabs.overview") }] : []),
	...visible.map(section => ({ key: section as Tab, label: t(`dashboard.${section}.title`) }))
])

// A per-viewer convenience, so browser storage rather than the server; a
// blocked or empty store, or a tab this account no longer has, opens the first.
const storedTab = useLocalStorage<Tab>("add-os.dashboard.tab", "overview")
const tab = computed<Tab>({
	get: () => tabs.value.some(item => item.key === storedTab.value) ? storedTab.value : (tabs.value[0]?.key ?? "overview"),
	set: value => { storedTab.value = value }
})

/** The tabs opened so far: each mounts — and fetches — on first opening, then only hides. */
const opened = reactive(new Set<Tab>())
watch(tab, value => opened.add(value), { immediate: true })

function panel(key: Tab) {
	return { "id": `dashboard-tabpanel-${key}`, "role": "tabpanel", "aria-labelledby": `dashboard-tab-${key}` }
}

const period = ref<DashboardPeriod>(presetPeriod(DASHBOARD_DEFAULT_PRESET))
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
			{ key: "approval", label: t("dashboard.operations.awaitingApproval"), icon: "carbon:hourglass", count: ops.bookings_awaiting_approval, to: "/bookings/approval-queue" },
			{ key: "payment", label: t("dashboard.operations.awaitingPayment"), icon: "carbon:wallet", count: ops.bookings_awaiting_payment, to: "/bookings/all" },
			{ key: "services", label: t("dashboard.operations.openServiceRequests"), icon: "carbon:document-tasks", count: ops.open_service_requests, to: "/address/operations-requests" },
			{ key: "inquiries", label: t("dashboard.operations.newSiteInquiries"), icon: "carbon:chat", count: ops.new_site_inquiries },
			{ key: "offices", label: t("dashboard.operations.unquotedOfficeRequests"), icon: "carbon:building", count: ops.unquoted_office_requests, to: "/address/private-office-requests" }
		)
	}
	if (money) {
		items.push(
			{ key: "providers", label: t("dashboard.finance.pendingProviderRequests"), icon: "carbon:task-view", count: money.pending_provider_requests, to: "/providers/requests" },
			{ key: "renewals", label: t("dashboard.finance.stoppedRenewals"), icon: "carbon:renew", count: money.stopped_renewals, to: "/members/stopped-renewals" },
			{ key: "rates", label: t("dashboard.finance.pendingRateSuggestions"), icon: "carbon:currency", count: money.pending_exchange_rate_suggestions, to: "/payments/exchange-rates" },
			{ key: "cash", label: t("dashboard.finance.openCashSessions"), icon: "carbon:money", count: money.open_cash_sessions, to: "/payments/cash-register" }
		)
	}
	if (people) {
		items.push(
			{ key: "ending", label: t("dashboard.members.endingThisWeek"), icon: "carbon:time", count: people.memberships.ending_within_7_days, to: "/members/memberships" },
			{ key: "leases", label: t("dashboard.members.leasesEndingThisMonth"), icon: "carbon:document-signed", count: people.office_leases.ending_within_30_days, to: "/members/office-leases" }
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
