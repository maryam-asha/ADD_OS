<!-- src/add-os/modules/reception/views/ReceptionDeskPage.vue -->
<template>
	<div class="flex flex-col gap-6 max-w-5xl mx-auto p-4 sm:p-6">
		<!-- Date & refresh -->
		<n-card size="small" class="shadow-sm border border-stone-200">
			<div class="flex items-center justify-between flex-wrap gap-3">
				<div class="flex items-center gap-3">
					<Icon name="carbon:calendar" :size="22" class="text-stone-600" />
					<span class="text-base font-semibold text-stone-800">{{ formatDate(new Date(), { style: "long" }) }}</span>
				</div>
				<n-button secondary size="small" :loading="isLoading" @click="load">
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("closeSession.refresh") }}
				</n-button>
			</div>
		</n-card>

		<n-alert v-if="loadFailed" type="error" :bordered="false">{{ t("reception.loadFailed") }}</n-alert>

		<!-- KPI cards: every number is a count of real rows (GET reception/summary) -->
		<n-spin :show="isLoading && !summary">
			<div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
				<n-card
					v-for="stat in statCards"
					:key="stat.key"
					size="small"
					class="transition-shadow"
					:class="stat.route ? 'cursor-pointer hover:shadow-md' : ''"
					@click="stat.route && router.push(stat.route)"
				>
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<div class="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-700">
								<Icon :name="stat.icon" :size="22" />
							</div>
							<span class="text-3xl font-extrabold text-stone-900 tracking-tight">{{ formatNumber(stat.value) }}</span>
						</div>
						<h3 class="text-sm font-semibold text-stone-700">{{ stat.title }}</h3>
					</div>
				</n-card>
			</div>
		</n-spin>

		<!-- Quick actions -->
		<div class="flex flex-col gap-3">
			<h2 class="text-lg font-bold text-stone-800">{{ t("reception.quickActionsTitle") }}</h2>
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<n-button type="primary" size="large" class="h-24 flex-col gap-2 rounded-xl text-base font-bold shadow-sm" @click="router.push('/bookings/active-sessions')">
					<Icon name="carbon:play-filled-alt" :size="26" />
					<span>{{ t("reception.actions.startSession") }}</span>
				</n-button>
				<n-button secondary size="large" class="h-24 flex-col gap-2 rounded-xl text-base font-semibold border border-stone-200" @click="router.push('/members/individuals')">
					<Icon name="carbon:user-follow" :size="26" class="text-stone-700" />
					<span class="text-stone-800">{{ t("reception.actions.registerGuest") }}</span>
				</n-button>
				<n-button secondary size="large" class="h-24 flex-col gap-2 rounded-xl text-base font-semibold border border-stone-200" @click="router.push('/payments/wallet-top-ups')">
					<Icon name="carbon:wallet" :size="26" class="text-stone-700" />
					<span class="text-stone-800">{{ t("reception.actions.topUpWallet") }}</span>
				</n-button>
				<n-button secondary size="large" class="h-24 flex-col gap-2 rounded-xl text-base font-semibold border border-stone-200" @click="router.push('/bookings/close-session')">
					<Icon name="carbon:close-outline" :size="26" class="text-stone-700" />
					<span class="text-stone-800">{{ t("reception.actions.closeSession") }}</span>
				</n-button>
			</div>
		</div>

		<!-- Up next: end requests, arrivals and today's bookings, soonest first -->
		<n-card size="small" class="shadow-sm border border-stone-200">
			<template #header>
				<span class="text-lg font-bold text-stone-900">{{ t("reception.upNextTitle") }}</span>
			</template>

			<div v-if="summary && summary.upcoming.length === 0" class="py-6 text-center text-sm text-stone-500">
				{{ t("reception.upNextEmpty") }}
			</div>

			<div class="divide-y divide-stone-100">
				<div
					v-for="item in summary?.upcoming ?? []"
					:key="`${item.kind}-${item.id}`"
					class="py-3.5 flex items-center justify-between hover:bg-stone-50/80 px-2 rounded-lg transition-colors cursor-pointer"
					@click="open(item)"
				>
					<div class="flex items-center gap-3.5">
						<div class="w-10 h-10 rounded-full flex items-center justify-center" :class="KIND_STYLE[item.kind].bg">
							<Icon :name="KIND_STYLE[item.kind].icon" :size="20" />
						</div>
						<div class="flex flex-col">
							<span class="font-bold text-stone-900 text-sm sm:text-base">{{ item.member.name ?? "—" }}</span>
							<span class="text-xs text-stone-500">
								{{ t(`reception.upNextKinds.${item.kind}`) }}<template v-if="item.space"> · {{ item.space }}</template>
								<template v-if="item.payment_method"> · {{ t(`closeSession.paymentMethods.${methodKey(item.payment_method)}`) }}</template>
							</span>
						</div>
					</div>

					<div class="flex items-center gap-2 text-stone-500 font-medium text-xs sm:text-sm">
						<!-- A booking waiting for its member starts here, as soon as its check-in window opens. -->
						<n-button
							v-if="item.kind === 'booking'"
							size="small"
							type="primary"
							secondary
							:disabled="!checkInOpen(item)"
							:loading="checkingIn === item.id"
							@click.stop="checkIn(item)"
						>
							{{ t("arrivals.expected.checkIn") }}
						</n-button>
						<span>{{ formatTime(item.at) }}</span>
						<Icon name="carbon:chevron-right" :size="18" class="rtl:rotate-180" />
					</div>
				</div>
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { ReceptionSummary } from "@/add-os/modules/booking/types/reception"
import { NAlert, NButton, NCard, NSpin, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { ApiError } from "@/add-os/services/api"
import { checkInBooking, getReceptionSummary } from "@/add-os/services/reception"
import { formatDate, formatNumber, formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

type UpcomingItem = ReceptionSummary["upcoming"][number]

const { t } = useI18n()
const router = useRouter()
const message = useMessage()

const summary = ref<ReceptionSummary | null>(null)
const isLoading = ref(false)
const loadFailed = ref(false)

const KIND_STYLE: Record<UpcomingItem["kind"], { icon: string, bg: string }> = {
	end_request: { icon: "carbon:logout", bg: "bg-orange-50 text-orange-700" },
	arrival: { icon: "carbon:user-avatar", bg: "bg-amber-50 text-amber-700" },
	booking: { icon: "carbon:calendar", bg: "bg-stone-100 text-stone-700" }
}

/** A payment method the labels know, or `none` for anything else. */
function methodKey(method: string | null): string {
	return method === "wallet" || method === "cash" || method === "paymera" ? method : "none"
}

const statCards = computed(() => {
	const stats = summary.value?.stats
	return [
		{ key: "active", title: t("reception.stats.activeSessions"), value: stats?.active_sessions ?? 0, icon: "carbon:user", route: "/bookings/active-sessions" },
		{ key: "expected", title: t("reception.stats.expectedBookings"), value: stats?.expected_bookings ?? 0, icon: "carbon:calendar", route: "/bookings/arrivals" },
		{ key: "arrivals", title: t("reception.stats.pendingGuests"), value: stats?.pending_arrivals ?? 0, icon: "carbon:group", route: "/bookings/arrivals" },
		{ key: "endRequests", title: t("reception.stats.pendingEndRequests"), value: stats?.pending_end_requests ?? 0, icon: "carbon:logout", route: "/bookings/close-session" },
		{ key: "payments", title: t("reception.stats.pendingPayments"), value: stats?.pending_payments ?? 0, icon: "carbon:wallet", route: null }
	]
})

/** Each kind opens the screen that acts on it. */
function open(item: UpcomingItem): void {
	if (item.kind === "end_request" && item.session) {
		router.push({ name: "bookings.closeSessionDetail", params: { type: item.session.type, id: item.session.id } })
	} else {
		// A booking still to arrive, or a member saying they have: both are handled on the arrivals page.
		router.push("/bookings/arrivals")
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
		await load()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		checkingIn.value = null
	}
}

async function load(): Promise<void> {
	isLoading.value = true
	loadFailed.value = false
	try {
		summary.value = await getReceptionSummary()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadFailed.value = true
	} finally {
		isLoading.value = false
	}
}

onMounted(load)

defineExpose({ summary, load })
</script>
