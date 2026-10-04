<!-- src/add-os/modules/members/views/MemberProfilePage.vue -->
<!--
	A member's whole file: who they are, what they hold and owe, whether they
	are inside now — then a tab for each part of their history, every one
	filtered and paged by the server. Reached from the members list.
-->
<template>
	<div class="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6">
		<div class="flex items-center justify-between">
			<n-button text @click="router.push({ name: 'members.individuals' })">
				<template #icon><Icon name="carbon:arrow-left" :size="18" class="rtl:rotate-180" /></template>
				{{ t("memberProfile.back") }}
			</n-button>
			<n-button secondary size="small" :loading="isLoading" @click="loadSummary">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("memberProfile.refresh") }}
			</n-button>
		</div>

		<n-alert v-if="loadFailed" type="error" :bordered="false">{{ t("memberProfile.loadError") }}</n-alert>

		<n-spin :show="isLoading && !summary">
			<template v-if="summary">
				<!-- Who they are -->
				<n-card size="small" class="shadow-sm border border-stone-200">
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="flex items-center gap-4">
							<n-avatar round :size="64" :src="member?.personal_profile?.avatar_url ?? undefined" class="bg-emerald-700 text-white text-xl font-bold">
								{{ initials(member?.name) }}
							</n-avatar>
							<div class="flex flex-col gap-1">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="text-xl font-bold text-stone-900">{{ member?.name }}</span>
									<n-tag :type="member?.status === 'active' ? 'success' : 'error'" size="small" round>
										{{ t(`members.status.${member?.status}`) }}
									</n-tag>
								</div>
								<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
									<bdi dir="ltr">{{ member?.phone }}</bdi>
									<span v-if="member?.email">{{ member.email }}</span>
									<span v-if="summary.joined_at">{{ t("memberProfile.joined", { date: formatDate(summary.joined_at) }) }}</span>
								</div>
								<div v-if="member?.companies?.length" class="flex flex-wrap gap-2 mt-1">
									<n-tag v-for="company in member.companies" :key="company.id" size="small" :bordered="false">
										{{ company.legal_name }}<template v-if="company.is_admin"> · {{ t("memberProfile.companyAdmin") }}</template>
									</n-tag>
								</div>
							</div>
						</div>
						<n-button type="primary" @click="topUpVisible = true">
							<template #icon><Icon name="carbon:wallet" :size="18" /></template>
							{{ t("memberProfile.topUp") }}
						</n-button>
					</div>
				</n-card>

				<!-- Inside right now -->
				<n-alert v-if="summary.open_session" type="success" :bordered="false" class="mt-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<span>{{ t("memberProfile.insideNow", { space: summary.open_session.space ?? "—", time: formatTime(summary.open_session.checked_in_at) }) }}</span>
						<n-button size="small" type="primary" secondary @click="openSession(summary.open_session.type, summary.open_session.id)">
							{{ t("memberProfile.viewSession") }}
						</n-button>
					</div>
				</n-alert>

				<!-- At a glance -->
				<div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-4">
					<n-card v-for="card in cards" :key="card.key" size="small" class="border border-stone-200">
						<div class="flex flex-col gap-1">
							<span class="flex items-center gap-2 text-xs text-stone-500">
								<Icon :name="card.icon" :size="16" class="text-emerald-700" />{{ card.label }}
							</span>
							<span class="text-2xl font-extrabold text-stone-900" :class="card.tone">{{ card.value }}</span>
							<span v-if="card.hint" class="text-xs text-stone-500">{{ card.hint }}</span>
						</div>
					</n-card>
				</div>
			</template>
		</n-spin>

		<!-- History, a tab for each part -->
		<n-card v-if="summary" size="small" class="shadow-sm border border-stone-200">
			<n-tabs v-model:value="tab" type="line" animated>
				<n-tab-pane name="overview" :tab="t('memberProfile.tabs.overview')">
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div class="flex flex-col gap-2">
							<h3 class="font-bold text-stone-800">{{ t("memberProfile.walletPools") }}</h3>
							<div v-for="pool in summary.wallet.categories" :key="pool.category" class="flex justify-between text-sm border-b border-stone-100 py-1.5">
								<span>{{ pool.label }}</span>
								<span class="font-semibold">{{ t("memberProfile.points", { points: formatNumber(pool.points) }) }}</span>
							</div>
						</div>
						<div class="flex flex-col gap-2">
							<h3 class="font-bold text-stone-800">{{ t("memberProfile.activity") }}</h3>
							<div v-for="line in activity" :key="line.label" class="flex justify-between text-sm border-b border-stone-100 py-1.5">
								<span>{{ line.label }}</span>
								<span class="font-semibold">{{ line.value }}</span>
							</div>
						</div>
						<div v-if="member?.personal_profile || member?.professional_profile" class="flex flex-col gap-2 lg:col-span-2">
							<h3 class="font-bold text-stone-800">{{ t("memberProfile.about") }}</h3>
							<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
								<div v-for="field in aboutFields" :key="field.label">
									<span class="block text-xs text-stone-400">{{ field.label }}</span>
									<span class="text-stone-800">{{ field.value }}</span>
								</div>
							</div>
						</div>
					</div>
				</n-tab-pane>

				<n-tab-pane name="bookings" :tab="t('memberProfile.tabs.bookings')" display-directive="show:lazy">
					<ProfileTable :load="loadBookings" :columns="bookingColumns" :row-key="byId" :filters="bookingFilters" date-range />
				</n-tab-pane>
				<n-tab-pane name="sessions" :tab="t('memberProfile.tabs.sessions')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberSessions(userId, query)" :columns="sessionColumns" :row-key="row => `${row.type}-${row.id}`" :filters="sessionFilters" date-range />
				</n-tab-pane>
				<n-tab-pane name="memberships" :tab="t('memberProfile.tabs.memberships')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberMemberships(userId, query)" :columns="membershipColumns" :row-key="byId" />
				</n-tab-pane>
				<n-tab-pane name="wallet" :tab="t('memberProfile.tabs.wallet')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberWalletTransactions(userId, query)" :columns="walletColumns" :row-key="byId" :filters="walletFilters" date-range />
				</n-tab-pane>
				<n-tab-pane name="payments" :tab="t('memberProfile.tabs.payments')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberPayments(userId, query)" :columns="paymentColumns" :row-key="byId" :filters="paymentFilters" />
				</n-tab-pane>
				<n-tab-pane name="serviceRequests" :tab="t('memberProfile.tabs.serviceRequests')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberServiceRequests(userId, query)" :columns="requestColumns" :row-key="byId" :filters="requestFilters" date-range />
				</n-tab-pane>
				<n-tab-pane name="events" :tab="t('memberProfile.tabs.events')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberEventRegistrations(userId, query)" :columns="eventColumns" :row-key="byId" :filters="eventFilters" />
				</n-tab-pane>
			</n-tabs>
		</n-card>

		<WalletTopUpDialog v-model:show="topUpVisible" :member @success="loadSummary" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { AdminBooking } from "@/add-os/modules/booking/types/calendar"
import type { SessionType } from "@/add-os/modules/booking/types/reception"
import type { ProfileFilter } from "@/add-os/modules/members/components/profile/ProfileTable.vue"
import type {
	MemberEventRegistration,
	MemberMembership,
	MemberPayment,
	MemberProfileSummary,
	MemberServiceRequest,
	MemberSession,
	MemberWalletTransaction
} from "@/add-os/modules/members/types/member-profile"
import { NAlert, NAvatar, NButton, NCard, NSpin, NTabPane, NTabs, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import ProfileTable from "@/add-os/modules/members/components/profile/ProfileTable.vue"
import WalletTopUpDialog from "@/add-os/modules/members/components/WalletTopUpDialog.vue"
import { ApiError } from "@/add-os/services/api"
import { listBookings } from "@/add-os/services/booking-calendar"
import {
	getMemberSummary,
	listMemberEventRegistrations,
	listMemberMemberships,
	listMemberPayments,
	listMemberServiceRequests,
	listMemberSessions,
	listMemberWalletTransactions
} from "@/add-os/services/member-profile"
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatTime, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()

const userId = Number(route.params.id)

const summary = ref<MemberProfileSummary | null>(null)
const isLoading = ref(false)
const loadFailed = ref(false)
const topUpVisible = ref(false)
const tab = ref("overview")

const member = computed(() => summary.value?.member ?? null)

function initials(name: string | null | undefined): string {
	return (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase()
}

/** `H:MM`, the same in both languages. */
function duration(seconds: number): string {
	const minutes = Math.floor(seconds / 60)
	return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`
}

function points(value: number | null | undefined): string {
	return value === null || value === undefined ? "—" : t("memberProfile.points", { points: formatNumber(value) })
}

function money(amount: { value: string, currency: string }): string {
	return formatCurrency(amount.value, isCurrencyCode(amount.currency) ? { currency: amount.currency } : {})
}

function tag(label: string, type: "success" | "warning" | "error" | "info" | "default" = "default") {
	return h(NTag, { size: "small", round: true, bordered: false, type }, { default: () => label })
}

const byId = (row: { id: number }) => row.id

function openSession(type: SessionType, id: number): void {
	router.push({ name: "bookings.activeSessionDetail", params: { type, id } })
}

/* ── Header cards ─────────────────────────────────────────────────────────── */

const cards = computed(() => {
	const s = summary.value
	if (!s) return []
	return [
		{ key: "wallet", icon: "carbon:wallet", label: t("memberProfile.cards.wallet"), value: points(s.wallet.points), hint: null, tone: "" },
		{
			key: "owed",
			icon: "carbon:warning",
			label: t("memberProfile.cards.owed"),
			value: points(s.outstanding.points),
			hint: s.outstanding.points > 0 ? `${money(s.outstanding.amount)} · ${t("memberProfile.cards.items", { count: s.outstanding.items })}` : null,
			tone: s.outstanding.points > 0 ? "text-rose-700" : ""
		},
		{
			key: "plan",
			icon: "carbon:badge",
			label: t("memberProfile.cards.plan"),
			value: s.membership?.plan ?? t("memberProfile.cards.noPlan"),
			hint: s.membership
				? [s.membership.hours_remaining !== null ? t("memberProfile.cards.hoursLeft", { hours: formatNumber(s.membership.hours_remaining) }) : null, s.membership.period_end ? t("memberProfile.cards.until", { date: formatDate(s.membership.period_end) }) : null].filter(Boolean).join(" · ")
				: null,
			tone: "text-base"
		},
		{ key: "bookings", icon: "carbon:calendar", label: t("memberProfile.cards.bookings"), value: formatNumber(s.counts.bookings), hint: t("memberProfile.cards.upcoming", { count: s.counts.upcoming_bookings }), tone: "" },
		{ key: "sessions", icon: "carbon:time", label: t("memberProfile.cards.sessions"), value: formatNumber(s.counts.sessions), hint: null, tone: "" },
		{ key: "lastVisit", icon: "carbon:login", label: t("memberProfile.cards.lastVisit"), value: s.last_visit_at ? formatDate(s.last_visit_at) : "—", hint: s.last_visit_at ? formatTime(s.last_visit_at) : null, tone: "text-base" }
	]
})

const activity = computed(() => {
	const s = summary.value
	if (!s) return []
	return [
		{ label: t("memberProfile.cards.pointsSpent"), value: points(s.counts.points_spent) },
		{ label: t("memberProfile.tabs.serviceRequests"), value: formatNumber(s.counts.service_requests) },
		{ label: t("memberProfile.tabs.events"), value: formatNumber(s.counts.event_registrations) }
	]
})

const aboutFields = computed(() => {
	const personal = member.value?.personal_profile
	const professional = member.value?.professional_profile
	return [
		{ label: t("memberProfile.about_.city"), value: personal?.city },
		{ label: t("memberProfile.about_.jobTitle"), value: professional?.job_title },
		{ label: t("memberProfile.about_.company"), value: professional?.company_name },
		{ label: t("memberProfile.about_.industry"), value: professional?.industry }
	].filter(field => field.value)
})

/* ── Filters ──────────────────────────────────────────────────────────────── */

function options(prefix: string, values: string[]): SelectOption[] {
	return values.map(value => ({ label: t(`${prefix}.${value}`), value }))
}

const paymentStateFilter = computed<ProfileFilter>(() => ({
	key: "payment_state",
	placeholder: t("memberProfile.filters.paymentState"),
	options: options("allBookings.paymentState", ["paid", "unpaid"])
}))

const bookingFilters = computed<ProfileFilter[]>(() => [
	{ key: "status", placeholder: t("memberProfile.filters.status"), options: options("allBookings.status", ["pending", "confirmed", "completed", "no_show", "cancelled", "rejected"]) },
	paymentStateFilter.value
])

const sessionFilters = computed<ProfileFilter[]>(() => [
	{ key: "type", placeholder: t("memberProfile.filters.type"), options: options("activeSessions.type", ["booking", "walkin"]) },
	paymentStateFilter.value,
	{ key: "open", placeholder: t("memberProfile.filters.state"), options: [{ label: t("memberProfile.sessionOpen"), value: 1 }, { label: t("memberProfile.sessionClosed"), value: 0 }] }
])

const walletFilters = computed<ProfileFilter[]>(() => [
	{ key: "type", placeholder: t("memberProfile.filters.direction"), options: options("memberProfile.direction", ["credit", "debit"]) },
	{ key: "category", placeholder: t("memberProfile.filters.category"), options: (summary.value?.wallet.categories ?? []).map(pool => ({ label: pool.label, value: pool.category })) }
])

const paymentFilters = computed<ProfileFilter[]>(() => [
	{ key: "status", placeholder: t("memberProfile.filters.status"), options: options("memberProfile.paymentStatus", ["pending", "accepted", "failed", "canceled", "reversed", "expired", "needs_review"]) },
	{ key: "purpose", placeholder: t("memberProfile.filters.purpose"), options: options("memberProfile.purpose", ["booking", "booking_extension", "coworking_session", "wallet_top_up", "plan_purchase", "event_registration"]) }
])

const requestFilters = computed<ProfileFilter[]>(() => [
	{ key: "status", placeholder: t("memberProfile.filters.status"), options: options("operationsRequests.status", ["pending", "in_progress", "resolved", "rejected", "cancelled"]) }
])

const eventFilters = computed<ProfileFilter[]>(() => [
	{ key: "status", placeholder: t("memberProfile.filters.status"), options: options("memberProfile.registrationStatus", ["pending", "approved", "rejected"]) }
])

/* ── Loaders and columns ──────────────────────────────────────────────────── */

function loadBookings(query: Record<string, unknown>) {
	return listBookings({ ...query, user_id: userId })
}

const bookingColumns = computed<DataTableColumns<AdminBooking>>(() => [
	{ title: "#", key: "id", width: 70 },
	{ title: t("memberProfile.columns.space"), key: "space", render: row => row.space.title ?? "—" },
	{ title: t("memberProfile.columns.when"), key: "start_at", render: row => `${formatDate(row.start_at)} · ${formatTime(row.start_at)} – ${formatTime(row.end_at)}` },
	{ title: t("memberProfile.columns.status"), key: "status", render: row => tag(row.status_label, row.status === "confirmed" || row.status === "completed" ? "success" : row.status === "pending" ? "warning" : "default") },
	{ title: t("memberProfile.columns.payment"), key: "payment_state", render: row => tag(t(`allBookings.paymentState.${row.payment_state}`), row.payment_state === "paid" ? "success" : "warning") },
	{ title: t("memberProfile.columns.checkedIn"), key: "checked_in_at", render: row => (row.checked_in_at ? formatTime(row.checked_in_at) : "—") },
	{ title: t("memberProfile.columns.checkedOut"), key: "checked_out_at", render: row => (row.checked_out_at ? formatTime(row.checked_out_at) : "—") }
])

const sessionColumns = computed<DataTableColumns<MemberSession>>(() => [
	{ title: t("memberProfile.columns.type"), key: "type", render: row => tag(t(`activeSessions.type.${row.type}`)) },
	{ title: t("memberProfile.columns.space"), key: "space", render: row => row.space.name ?? "—" },
	{ title: t("memberProfile.columns.checkedIn"), key: "checked_in_at", render: row => formatDateTime(row.checked_in_at) },
	{ title: t("memberProfile.columns.checkedOut"), key: "checked_out_at", render: row => (row.checked_out_at ? formatTime(row.checked_out_at) : tag(t("memberProfile.sessionOpen"), "success")) },
	{ title: t("memberProfile.columns.duration"), key: "duration_seconds", render: row => h("bdi", { dir: "ltr" }, duration(row.duration_seconds)) },
	{ title: t("memberProfile.columns.fromPlan"), key: "plan_covered_seconds", render: row => (row.plan_covered_seconds ? h("bdi", { dir: "ltr" }, duration(row.plan_covered_seconds)) : "—") },
	{ title: t("memberProfile.columns.price"), key: "price_points", render: row => points(row.price_points) },
	{ title: t("memberProfile.columns.payment"), key: "payment_state", render: row => (row.payment_state ? tag(t(`allBookings.paymentState.${row.payment_state}`), row.payment_state === "paid" ? "success" : "warning") : "—") },
	{
		title: "",
		key: "actions",
		render: row => h(NButton, { size: "tiny", secondary: true, onClick: () => openSession(row.type, row.id) }, { default: () => t("memberProfile.details") })
	}
])

const membershipColumns = computed<DataTableColumns<MemberMembership>>(() => [
	{ title: t("memberProfile.columns.plan"), key: "plan", render: row => row.plan.name ?? "—" },
	{ title: t("memberProfile.columns.via"), key: "via", render: row => (row.via === "company" ? `${t("memberProfile.viaCompany")} · ${row.company?.name ?? ""}` : t("memberProfile.viaPersonal")) },
	{ title: t("memberProfile.columns.period"), key: "period", render: row => `${row.current_period_start ? formatDate(row.current_period_start) : "—"} – ${row.current_period_end ? formatDate(row.current_period_end) : "—"}` },
	{
		title: t("memberProfile.columns.status"),
		key: "status",
		// Only `active` is ever stored; a period that has passed has ended.
		render: row => (row.current_period_end && new Date(row.current_period_end) < new Date() ? tag(t("memberProfile.membershipEnded")) : tag(t("memberProfile.membershipActive"), "success"))
	},
	{ title: t("memberProfile.columns.desks"), key: "desks", render: row => (row.desks.length ? row.desks.map(desk => desk.code).join(", ") : "—") }
])

const walletColumns = computed<DataTableColumns<MemberWalletTransaction>>(() => [
	{ title: t("memberProfile.columns.date"), key: "created_at", render: row => formatDateTime(row.created_at) },
	{ title: t("memberProfile.columns.description"), key: "title", render: row => h("div", { class: "flex flex-col" }, [h("span", row.title), h("span", { class: "text-xs text-stone-500" }, row.kind_label)]) },
	{ title: t("memberProfile.columns.category"), key: "category", render: row => row.category_label },
	{ title: t("memberProfile.columns.method"), key: "method", render: row => row.method_label ?? "—" },
	{
		title: t("memberProfile.columns.points"),
		key: "points",
		render: row => h("span", { class: row.points < 0 ? "font-semibold text-rose-700" : "font-semibold text-emerald-700" }, `${row.points > 0 ? "+" : ""}${formatNumber(row.points)}`)
	}
])

const paymentColumns = computed<DataTableColumns<MemberPayment>>(() => [
	{ title: "#", key: "id", width: 70 },
	{ title: t("memberProfile.columns.date"), key: "created_at", render: row => (row.created_at ? formatDateTime(row.created_at) : "—") },
	{ title: t("memberProfile.columns.purpose"), key: "purpose", render: row => t(`memberProfile.purpose.${row.purpose}`) },
	{ title: t("memberProfile.columns.method"), key: "method", render: row => (te(`memberProfile.method.${row.method}`) ? t(`memberProfile.method.${row.method}`) : row.method) },
	{ title: t("memberProfile.columns.points"), key: "amount_points", render: row => points(row.amount_points ?? row.points_to_credit) },
	{
		title: t("memberProfile.columns.status"),
		key: "status",
		render: row => tag(t(`memberProfile.paymentStatus.${row.status}`), row.status === "accepted" ? "success" : row.status === "pending" || row.status === "needs_review" ? "warning" : "default")
	}
])

const requestColumns = computed<DataTableColumns<MemberServiceRequest>>(() => [
	{ title: t("memberProfile.columns.reference"), key: "reference", render: row => row.reference ?? `#${row.id}` },
	{ title: t("memberProfile.columns.service"), key: "service_name", render: row => row.service_name ?? "—" },
	{ title: t("memberProfile.columns.date"), key: "submitted_at", render: row => (row.submitted_at ? formatDateTime(row.submitted_at) : "—") },
	{ title: t("memberProfile.columns.status"), key: "status", render: row => tag(t(`operationsRequests.status.${row.status}`), row.status === "resolved" ? "success" : row.status === "pending" || row.status === "in_progress" ? "warning" : "default") },
	{ title: t("memberProfile.columns.note"), key: "resolution_note", render: row => row.resolution_note ?? "—" }
])

const eventColumns = computed<DataTableColumns<MemberEventRegistration>>(() => [
	{ title: t("memberProfile.columns.event"), key: "event", render: row => row.event.title ?? "—" },
	{ title: t("memberProfile.columns.when"), key: "start_at", render: row => (row.event.start_at ? formatDateTime(row.event.start_at) : "—") },
	{ title: t("memberProfile.columns.status"), key: "status", render: row => tag(t(`memberProfile.registrationStatus.${row.status}`), row.status === "approved" ? "success" : row.status === "pending" ? "warning" : "default") },
	{ title: t("memberProfile.columns.attended"), key: "attended", render: row => (row.attended ? tag(t("memberProfile.yes"), "success") : t("memberProfile.no")) },
	{ title: t("memberProfile.columns.price"), key: "price_points", render: row => (row.price_points ? points(row.price_points) : t("memberProfile.free")) },
	{ title: t("memberProfile.columns.payment"), key: "payment_state", render: row => (row.payment_state && row.price_points ? tag(t(`allBookings.paymentState.${row.payment_state}`), row.payment_state === "paid" ? "success" : "warning") : "—") }
])

/* ── Load ─────────────────────────────────────────────────────────────────── */

async function loadSummary(): Promise<void> {
	isLoading.value = true
	loadFailed.value = false
	try {
		summary.value = await getMemberSummary(userId)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadFailed.value = true
	} finally {
		isLoading.value = false
	}
}

onMounted(loadSummary)

defineExpose({ summary, tab, loadSummary })
</script>
