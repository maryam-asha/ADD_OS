<!-- src/add-os/modules/reception/views/ReceptionDeskPage.vue -->
<!--
	The reception desk in one place: the day's counts, what needs the desk
	next, and the desk's lists as tabs — arrivals, approvals, the live sessions
	and the end requests — with the sales the desk makes a click away.

	A tab's list is loaded only while its tab is open (`n-tab-pane`'s default
	`if`), so the desk keeps one list and the summary current, not five. The
	counts on the cards and the tabs come from the summary, and the approvals
	count from its own list, which the summary does not carry.
-->
<template>
	<div class="flex flex-col gap-4">
		<!-- The desk's title with today's date over it; the desk's sales and refresh at the far end -->
		<PageHeader
			:eyebrow="formatDate(new Date(), { style: 'long' })"
			:title="t('nav.pages.receptionDesk')"
			:description="t('pageDescriptions.receptionDesk')"
		>
			<template #actions>
				<n-button secondary :loading="summaryLoading" @click="refreshSummary">
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("closeSession.refresh") }}
				</n-button>
				<n-button v-for="action in quickActions" :key="action.key" secondary @click="action.open">
					<template #icon><Icon :name="action.icon" :size="16" /></template>
					{{ action.label }}
				</n-button>
			</template>
		</PageHeader>

		<n-alert v-if="summaryFailed" type="error" :bordered="false">{{ t("reception.loadFailed") }}</n-alert>

		<!-- KPI cards: every number is a count of real rows (GET reception/summary); each opens its tab -->
		<n-spin :show="summaryLoading && !summary">
			<div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
				<n-card
					v-for="stat in statCards"
					:key="stat.key"
					size="small"
					class="transition-shadow"
					:class="stat.tab ? 'cursor-pointer hover:shadow-md' : ''"
					@click="stat.tab && (activeTab = stat.tab)"
				>
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<div class="w-9 h-9 rounded-full flex items-center justify-center" :class="stat.iconBg">
								<Icon :name="stat.icon" :size="20" />
							</div>
							<span class="text-3xl font-extrabold text-[var(--add-text-primary)] tracking-tight">{{ formatNumber(stat.value) }}</span>
						</div>
						<h3 class="text-xs font-semibold text-[var(--add-text-secondary)] leading-tight">{{ stat.title }}</h3>
					</div>
				</n-card>
			</div>
		</n-spin>

		<n-tabs v-model:value="activeTab" type="line" animated>
			<n-tab-pane name="overview">
				<template #tab>
					<span class="flex items-center gap-1.5">
						<Icon name="carbon:dashboard" :size="16" />
						{{ t("reception.tabs.overview") }}
					</span>
				</template>

				<!-- Up next: end requests, arrivals and today's bookings, soonest first -->
				<n-card size="small" class="shadow-sm border border-[var(--add-border)] mt-4">
					<template #header>
						<span class="text-base font-bold text-[var(--add-text-primary)]">{{ t("reception.upNextTitle") }}</span>
					</template>

					<div v-if="summary && summary.upcoming.length === 0" class="py-6 text-center text-sm text-[var(--add-text-secondary)]">
						{{ t("reception.upNextEmpty") }}
					</div>

					<div class="divide-y divide-stone-100">
						<div
							v-for="item in summary?.upcoming ?? []"
							:key="`${item.kind}-${item.id}`"
							class="py-3 flex items-center justify-between hover:bg-[var(--add-surface-sunken)] px-2 rounded-lg transition-colors cursor-pointer"
							@click="open(item)"
						>
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-full flex items-center justify-center" :class="KIND_STYLE[item.kind].bg">
									<Icon :name="KIND_STYLE[item.kind].icon" :size="18" />
								</div>
								<div class="flex flex-col">
									<span class="font-bold text-[var(--add-text-primary)] text-sm">{{ item.member.name ?? "—" }}</span>
									<span class="text-xs text-[var(--add-text-secondary)]">
										{{ t(`reception.upNextKinds.${item.kind}`) }}<template v-if="item.space"> · {{ item.space }}</template>
										<template v-if="item.payment_method"> · {{ t(`closeSession.paymentMethods.${methodKey(item.payment_method)}`) }}</template>
									</span>
								</div>
							</div>

							<div class="flex items-center gap-2 text-[var(--add-text-secondary)] text-xs sm:text-sm">
								<!-- A booking waiting for its member starts here, as soon as its check-in window opens. -->
								<n-button
									v-if="item.kind === 'booking' && canCheckInAtReception()"
									size="small"
									type="primary"
									secondary
									:disabled="!checkInOpen(item)"
									:loading="checkingIn === item.id"
									@click.stop="checkIn(item)"
								>
									{{ t("arrivals.expected.checkIn") }}
								</n-button>
								<span class="font-medium">{{ formatTime(item.at) }}</span>
								<Icon name="carbon:chevron-right" :size="16" class="rtl:rotate-180" />
							</div>
						</div>
					</div>
				</n-card>
			</n-tab-pane>

			<n-tab-pane name="arrivals">
				<template #tab>
					<span class="flex items-center gap-1.5">
						<Icon name="carbon:user-avatar" :size="16" />
						{{ t("reception.tabs.arrivals") }}
						<n-badge v-if="pendingArrivals > 0" :value="pendingArrivals" :max="99" type="error" />
					</span>
				</template>
				<div class="mt-4">
					<ArrivalsPage embedded />
				</div>
			</n-tab-pane>

			<!-- Only for whoever may decide: the list is readable with reception.view, but nothing on it can be done without reception.approve. -->
			<n-tab-pane v-if="canApproveBookings()" name="approvals">
				<template #tab>
					<span class="flex items-center gap-1.5">
						<Icon name="carbon:task-approved" :size="16" />
						{{ t("reception.tabs.approvals") }}
						<n-badge v-if="pendingApprovals > 0" :value="pendingApprovals" :max="99" type="warning" />
					</span>
				</template>
				<div class="mt-4">
					<ApprovalQueuePage embedded />
				</div>
			</n-tab-pane>

			<n-tab-pane name="sessions">
				<template #tab>
					<span class="flex items-center gap-1.5">
						<Icon name="carbon:user-activity" :size="16" />
						{{ t("reception.tabs.sessions") }}
						<n-badge v-if="activeSessions > 0" :value="activeSessions" :max="99" type="info" />
					</span>
				</template>
				<div class="mt-4">
					<ActiveSessionsPage embedded />
				</div>
			</n-tab-pane>

			<!-- Members' coworking guests inside on a visit: free while their grace runs, then a walk-in on the sessions board. -->
			<n-tab-pane name="guests">
				<template #tab>
					<span class="flex items-center gap-1.5">
						<Icon name="carbon:user-follow" :size="16" />
						{{ t("reception.tabs.guests") }}
					</span>
				</template>
				<div class="mt-4">
					<GuestVisitsPanel @changed="refreshSummary" />
				</div>
			</n-tab-pane>

			<n-tab-pane name="end-requests">
				<template #tab>
					<span class="flex items-center gap-1.5">
						<Icon name="carbon:logout" :size="16" />
						{{ t("reception.tabs.endRequests") }}
						<n-badge v-if="pendingEndRequests > 0" :value="pendingEndRequests" :max="99" type="error" />
					</span>
				</template>
				<div class="mt-4">
					<CloseSessionPage embedded />
				</div>
			</n-tab-pane>

			<!-- Everything owed across every member: what the pending-payments card counts. -->
			<n-tab-pane name="payments">
				<template #tab>
					<span class="flex items-center gap-1.5">
						<Icon name="carbon:wallet" :size="16" />
						{{ t("reception.tabs.payments") }}
						<n-badge v-if="pendingPayments > 0" :value="pendingPayments" :max="99" type="warning" />
					</span>
				</template>
				<div class="mt-4">
					<PendingPaymentsPanel @settled="refreshSummary" />
				</div>
			</n-tab-pane>

			<!-- Orders members sent with no session: reception checks they are in the building, then confirms or turns them down. -->
			<n-tab-pane v-if="canReviewKitchenOrders()" name="kitchen">
				<template #tab>
					<span class="flex items-center gap-1.5">
						<Icon name="carbon:restaurant" :size="16" />
						{{ t("reception.tabs.kitchen") }}
						<n-badge v-if="pendingKitchenOrders > 0" :value="pendingKitchenOrders" :max="99" type="warning" />
					</span>
				</template>
				<div class="mt-4">
					<ReceptionKitchenQueue @changed="refreshSummary" />
					<KitchenCashReturns class="mt-8" @changed="refreshSummary" />
				</div>
			</n-tab-pane>
		</n-tabs>

		<QuickBookingModal v-model:show="bookingModalOpen" @success="refreshSummary" />
		<QuickTopUpModal v-model:show="topUpModalOpen" @success="refreshSummary" />
		<QuickPlanModal v-model:show="planModalOpen" @success="refreshSummary" />
	</div>
</template>

<script setup lang="ts">
import type { Ref } from "vue"
import type { ReceptionSummary } from "@/add-os/modules/booking/types/reception"
import { NAlert, NBadge, NButton, NCard, NSpin, NTabPane, NTabs, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { canApproveBookings, canBookAtReception, canCheckInAtReception, canReviewKitchenOrders, canSellPlans, canTopUpWallets } from "@/add-os/config/permissions"
import { useReceptionRealtime } from "@/add-os/modules/booking/composables/useReceptionRealtime"
import ActiveSessionsPage from "@/add-os/modules/booking/views/ActiveSessionsPage.vue"
import ApprovalQueuePage from "@/add-os/modules/booking/views/ApprovalQueuePage.vue"
import ArrivalsPage from "@/add-os/modules/booking/views/ArrivalsPage.vue"
import CloseSessionPage from "@/add-os/modules/booking/views/CloseSessionPage.vue"
import KitchenCashReturns from "@/add-os/modules/kitchen/components/KitchenCashReturns.vue"
import ReceptionKitchenQueue from "@/add-os/modules/kitchen/components/ReceptionKitchenQueue.vue"
import GuestVisitsPanel from "@/add-os/modules/reception/components/GuestVisitsPanel.vue"
import PendingPaymentsPanel from "@/add-os/modules/reception/components/PendingPaymentsPanel.vue"
import QuickBookingModal from "@/add-os/modules/reception/components/QuickBookingModal.vue"
import QuickPlanModal from "@/add-os/modules/reception/components/QuickPlanModal.vue"
import QuickTopUpModal from "@/add-os/modules/reception/components/QuickTopUpModal.vue"
import { OPEN_QUERY } from "@/add-os/notifications/useOpenRecord"
import { ApiError } from "@/add-os/services/api"
import { listOrdersToConfirm } from "@/add-os/services/kitchen"
import { checkInBooking, getReceptionSummary, listPendingApprovals } from "@/add-os/services/reception"
import { formatDate, formatNumber, formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

type UpcomingItem = ReceptionSummary["upcoming"][number]
type TabName = "overview" | "arrivals" | "approvals" | "sessions" | "guests" | "end-requests" | "payments" | "kitchen"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()

const activeTab = ref<TabName>("overview")

/**
 * `?open=<id>` on the desk is a guest visit — the one record a notice leads
 * here for (`guest_visit`, notificationTarget). It opens the guests tab; the
 * tab's own list picks out the row and drops the query (useOpenRecord). A
 * second notice type pointed at the desk would need its own query to tell
 * the two apart.
 */
watch(() => route.query[OPEN_QUERY], (value) => {
	if (value) activeTab.value = "guests"
}, { immediate: true })

/* ── The desk's sales, each shown only to whoever may make it ─────────────── */

const bookingModalOpen = ref(false)
const topUpModalOpen = ref(false)
const planModalOpen = ref(false)

interface QuickAction {
	key: string
	label: string
	icon: string
	open: () => void
}

/** Opens one of the sale dialogs above. */
function opener(dialog: Ref<boolean>): () => void {
	return () => {
		dialog.value = true
	}
}

const quickActions = computed<QuickAction[]>(() => {
	const actions: QuickAction[] = []
	if (canBookAtReception()) {
		actions.push({ key: "book", label: t("reception.actions.bookSpace"), icon: "carbon:calendar-add", open: opener(bookingModalOpen) })
	}
	if (canTopUpWallets()) {
		actions.push({ key: "topUp", label: t("reception.actions.topUpWallet"), icon: "carbon:wallet", open: opener(topUpModalOpen) })
	}
	if (canSellPlans()) {
		actions.push({ key: "plan", label: t("reception.actions.subscribePlan"), icon: "carbon:upgrade", open: opener(planModalOpen) })
	}
	return actions
})

/* ── Counts ────────────────────────────────────────────────────────────────── */

const summary = ref<ReceptionSummary | null>(null)
const summaryLoading = ref(false)
const summaryFailed = ref(false)
const pendingApprovals = ref(0)
const pendingKitchenOrders = ref(0)

/** The kitchen orders waiting to be confirmed: the summary has no count of its own for them. */
async function loadPendingKitchenOrders(): Promise<void> {
	if (!canReviewKitchenOrders()) return
	try {
		pendingKitchenOrders.value = (await listOrdersToConfirm()).meta.total
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
	}
}

/** The approval queue's total: the summary has no count of its own for it. */
async function loadPendingApprovals(): Promise<void> {
	if (!canApproveBookings()) return
	try {
		pendingApprovals.value = (await listPendingApprovals()).meta.total
	} catch (caught) {
		// The badge keeps its last count; the tab itself says when its list fails.
		if (!(caught instanceof ApiError)) throw caught
	}
}

async function refreshSummary(): Promise<void> {
	summaryLoading.value = true
	summaryFailed.value = false
	try {
		const [loaded] = await Promise.all([getReceptionSummary(), loadPendingApprovals(), loadPendingKitchenOrders()])
		summary.value = loaded
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		summaryFailed.value = true
	} finally {
		summaryLoading.value = false
	}
}

onMounted(refreshSummary)

// The counts follow the desk's events (a 30 s poll while the socket is down),
// and are re-read on every tab change, so what was just done in a tab shows on
// its badge — approvals send no event of their own.
useReceptionRealtime(refreshSummary)
watch(activeTab, () => void refreshSummary())

const pendingArrivals = computed(() => summary.value?.stats.pending_arrivals ?? 0)
const activeSessions = computed(() => summary.value?.stats.active_sessions ?? 0)
const pendingEndRequests = computed(() => summary.value?.stats.pending_end_requests ?? 0)
const pendingPayments = computed(() => summary.value?.stats.pending_payments ?? 0)

const statCards = computed(() => {
	const stats = summary.value?.stats
	return [
		{ key: "active", title: t("reception.stats.activeSessions"), value: stats?.active_sessions ?? 0, icon: "carbon:user-activity", iconBg: "bg-[color-mix(in_srgb,var(--add-info)_10%,transparent)] text-[var(--add-info-text)]", tab: "sessions" as TabName },
		{ key: "expected", title: t("reception.stats.expectedBookings"), value: stats?.expected_bookings ?? 0, icon: "carbon:calendar", iconBg: "bg-[color-mix(in_srgb,var(--add-warning)_10%,transparent)] text-[var(--add-warning-text)]", tab: "arrivals" as TabName },
		{ key: "arrivals", title: t("reception.stats.pendingGuests"), value: stats?.pending_arrivals ?? 0, icon: "carbon:group", iconBg: "bg-[color-mix(in_srgb,var(--add-success)_10%,transparent)] text-[var(--add-success-text)]", tab: "arrivals" as TabName },
		{ key: "endRequests", title: t("reception.stats.pendingEndRequests"), value: stats?.pending_end_requests ?? 0, icon: "carbon:logout", iconBg: "bg-[color-mix(in_srgb,var(--add-warning)_10%,transparent)] text-[var(--add-warning-text)]", tab: "end-requests" as TabName },
		{ key: "payments", title: t("reception.stats.pendingPayments"), value: stats?.pending_payments ?? 0, icon: "carbon:wallet", iconBg: "bg-[color-mix(in_srgb,var(--add-warning)_10%,transparent)] text-[var(--add-warning-text)]", tab: "payments" as TabName }
	]
})

/* ── Up next ──────────────────────────────────────────────────────────────── */

const KIND_STYLE: Record<UpcomingItem["kind"], { icon: string, bg: string }> = {
	end_request: { icon: "carbon:logout", bg: "bg-[color-mix(in_srgb,var(--add-warning)_10%,transparent)] text-[var(--add-warning-text)]" },
	arrival: { icon: "carbon:user-avatar", bg: "bg-[color-mix(in_srgb,var(--add-warning)_10%,transparent)] text-[var(--add-warning-text)]" },
	booking: { icon: "carbon:calendar", bg: "bg-[var(--add-surface-sunken)] text-[var(--add-text-primary)]" }
}

/** A payment method the labels know, or `none` for anything else. */
function methodKey(method: string | null): string {
	return method === "wallet" || method === "cash" || method === "paymera" ? method : "none"
}

/** An end request opens its session's page; an arrival or a booking, the arrivals tab that acts on it. */
function open(item: UpcomingItem): void {
	if (item.kind === "end_request" && item.session) {
		router.push({ name: "bookings.closeSessionDetail", params: { type: item.session.type, id: item.session.id } })
	} else {
		activeTab.value = "arrivals"
	}
}

/** BookingCheckInService::EARLY_CHECK_IN_MINUTES: no check-in sooner than this before the start. */
const EARLY_CHECK_IN_MINUTES = 15

function checkInOpen(item: UpcomingItem): boolean {
	return new Date(item.at).getTime() - EARLY_CHECK_IN_MINUTES * 60_000 <= Date.now()
}

const checkingIn = ref<number | null>(null)

async function checkIn(item: UpcomingItem): Promise<void> {
	checkingIn.value = item.id
	try {
		const result = await checkInBooking(item.id)
		message.success(result.message ?? t("arrivals.expected.checkedIn"))
		await refreshSummary()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		checkingIn.value = null
	}
}

defineExpose({ summary, activeTab, pendingApprovals, pendingKitchenOrders, quickActions, refreshSummary, bookingModalOpen, topUpModalOpen, planModalOpen })
</script>
