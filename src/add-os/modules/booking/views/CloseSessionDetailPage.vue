<!-- src/add-os/modules/booking/views/CloseSessionDetailPage.vue -->
<!--
	One session's page, reached from the end-request list or the active
	sessions board: a live timer, and what it will charge — priced by the
	server, plan hours included. Once the member has asked to end, that price
	is fixed at the moment they pressed, and the desk ends it the way they
	chose to pay: points are spent, cash is recorded once the desk has it, a
	card is paid in the app afterwards.
-->
<template>
	<div class="flex flex-col gap-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
		<div class="flex items-center justify-between border-b border-stone-200/80 pb-4">
			<h1 class="text-2xl font-bold text-stone-900">{{ t(fromBoard ? "closeSession.detail.sessionTitle" : "closeSession.detail.title") }}</h1>
			<n-button secondary round @click="backToList">
				<template #icon><Icon name="carbon:arrow-left" :size="18" class="rtl:rotate-180" /></template>
				{{ t(fromBoard ? "closeSession.detail.backToSessions" : "closeSession.detail.back") }}
			</n-button>
		</div>

		<n-spin :show="isLoading && !report">
			<n-alert v-if="loadFailed" type="error" :bordered="false">{{ t("closeSession.detail.notFound") }}</n-alert>

			<div v-if="report" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
				<!-- The session -->
				<div class="lg:col-span-7 flex flex-col gap-6">
					<n-card size="small" class="shadow-sm border border-stone-200">
						<div class="flex items-start gap-4">
							<n-avatar round :size="56" class="bg-amber-700 text-white font-bold text-lg">{{ initials(report.member.name) }}</n-avatar>
							<div class="flex flex-col gap-1 flex-1">
								<span class="text-lg font-bold text-stone-900">{{ report.member.name }}</span>
								<bdi v-if="report.member.phone" dir="ltr" class="text-xs text-stone-500 font-medium">{{ report.member.phone }}</bdi>
								<div class="mt-3 pt-3 border-t border-stone-100 text-xs">
									<span class="text-stone-400 block">{{ t("closeSession.detail.space") }}</span>
									<span class="font-semibold text-stone-800">{{ report.session.space.name }}</span>
								</div>
							</div>
						</div>
					</n-card>

					<n-card size="small" class="shadow-sm border border-stone-200">
						<div class="grid grid-cols-3 gap-3 text-center text-xs">
							<div class="flex flex-col gap-1 items-center p-3 rounded-xl bg-stone-50">
								<span class="text-stone-400 font-medium">{{ t("closeSession.detail.checkIn") }}</span>
								<span class="font-bold text-stone-900 text-base">{{ formatTime(report.session.checked_in_at) }}</span>
								<span v-if="report.session.started_via" class="text-stone-500">{{ t(`activeSessions.startedVia.${report.session.started_via}`) }}</span>
							</div>
							<div class="flex flex-col gap-1 items-center p-3 rounded-xl bg-stone-50">
								<span class="text-stone-400 font-medium">{{ t("closeSession.detail.endAt") }}</span>
								<span class="font-bold text-stone-900 text-base">{{ endAt ? formatTime(endAt) : "—" }}</span>
							</div>
							<div class="flex flex-col gap-1 items-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
								<span class="text-emerald-700 font-medium">{{ t("closeSession.detail.duration") }}</span>
								<span class="font-extrabold text-emerald-800 text-base"><bdi dir="ltr">{{ durationLabel(durationSeconds) }}</bdi></span>
							</div>
						</div>
					</n-card>

					<n-card size="small" class="shadow-sm border border-stone-200">
						<template #header>
							<span class="text-base font-bold text-stone-900">{{ t("closeSession.detail.statement") }}</span>
						</template>
						<div class="flex flex-col gap-3 text-sm">
							<div v-for="(line, index) in report.lines" :key="index" class="flex justify-between items-center text-stone-700 p-2.5 rounded-lg hover:bg-stone-50">
								<span>{{ line.label }} <span class="text-stone-400">({{ formatNumber(line.quantity) }} {{ line.unit }})</span></span>
								<span v-if="line.points !== null" class="font-semibold text-stone-900">{{ t("closeSession.detail.points", { points: formatNumber(line.points) }) }}</span>
							</div>
							<div v-if="closing && closing.covered_seconds > 0" class="text-xs text-emerald-700 px-2.5">
								{{ t("closeSession.detail.planCovered", { duration: durationLabel(closing.covered_seconds) }) }}
							</div>
							<div v-if="closing" class="flex justify-between items-center text-lg font-extrabold text-stone-900 p-3 bg-stone-100/70 rounded-xl">
								<span>{{ t("closeSession.detail.total") }}</span>
								<span class="flex flex-col items-end">
									<span class="text-emerald-700">{{ t("closeSession.detail.points", { points: formatNumber(closing.points) }) }}</span>
									<span class="text-xs font-semibold text-stone-500 flex gap-2">
										<bdi v-for="amount in closing.amounts" :key="amount.currency" dir="ltr">{{ formatAmount(amount) }}</bdi>
									</span>
								</span>
							</div>
						</div>
					</n-card>
				</div>

				<!-- The clock, paying and ending -->
				<div class="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-6">
					<!-- Live while the session is open; the session's length once it is closed -->
					<n-card size="small" class="shadow-sm border" :class="isOpen ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200'">
						<div class="flex flex-col items-center gap-1 py-2">
							<span class="text-xs font-medium" :class="isOpen ? 'text-emerald-700' : 'text-stone-500'">
								<span v-if="isOpen" class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse me-1" />
								{{ t(isOpen ? "closeSession.detail.timer" : "closeSession.detail.closedTimer") }}
							</span>
							<bdi dir="ltr" class="text-4xl font-extrabold tabular-nums text-stone-900" data-test="session-timer">{{ clockLabel(liveSeconds) }}</bdi>
						</div>
					</n-card>

					<!-- How it was paid: the method, the points and their worth, the money and its currency -->
					<n-card v-if="report.payments.length || (!isOpen && report.totals)" size="small" class="shadow-sm border border-stone-200">
						<div class="flex flex-col gap-3 text-sm">
							<div class="flex items-center justify-between">
								<span class="font-bold text-stone-900">{{ t("closeSession.detail.payment.title") }}</span>
								<n-tag v-if="report.totals?.payment_state" :type="report.totals.payment_state === 'paid' ? 'success' : 'warning'" size="small" round>
									{{ t(`closeSession.detail.payment.state.${report.totals.payment_state}`) }}
								</n-tag>
							</div>

							<div v-for="payment in report.payments" :key="payment.id" class="flex flex-col gap-1.5 p-3 rounded-xl bg-stone-50 border border-stone-100" data-test="session-payment">
								<div class="flex items-center justify-between gap-2">
									<span class="flex items-center gap-2 font-semibold text-stone-900">
										<Icon :name="payment.method === 'wallet' ? 'carbon:wallet' : payment.method === 'cash' ? 'carbon:money' : 'carbon:currency'" :size="16" class="text-emerald-700" />
										{{ payment.method_label }}
									</span>
									<n-tag size="small" round :bordered="false" :type="payment.status === 'accepted' ? 'success' : 'warning'">
										{{ te(`memberProfile.paymentStatus.${payment.status}`) ? t(`memberProfile.paymentStatus.${payment.status}`) : payment.status }}
									</n-tag>
								</div>
								<div v-if="payment.points" class="flex justify-between text-stone-700">
									<span>{{ t("closeSession.detail.payment.points") }}</span>
									<span class="text-end">
										<span class="font-bold">{{ t("closeSession.detail.points", { points: formatNumber(payment.points) }) }}</span>
										<span v-if="payment.points_value.length" class="block text-xs text-stone-500">
											≈ <bdi v-for="(value, index) in payment.points_value" :key="value.currency" dir="ltr">{{ index ? " · " : "" }}{{ formatAmount(value) }}</bdi>
										</span>
									</span>
								</div>
								<div v-if="payment.cash" class="flex justify-between text-stone-700">
									<span>{{ t("closeSession.detail.payment.cashReceived") }}</span>
									<span class="text-end">
										<bdi dir="ltr" class="font-bold">{{ formatAmount({ value: payment.cash.amount, currency: payment.cash.currency ?? "" }) }}</bdi>
										<span v-if="payment.cash.received_by" class="block text-xs text-stone-500">{{ t("closeSession.detail.payment.receivedBy", { name: payment.cash.received_by }) }}</span>
									</span>
								</div>
								<div v-if="payment.card" class="flex justify-between text-stone-700">
									<span>{{ t("closeSession.detail.payment.cardCharged") }}</span>
									<span class="text-end">
										<bdi dir="ltr" class="font-bold">{{ formatAmount({ value: payment.card.amount, currency: payment.card.currency ?? "" }) }}</bdi>
										<span v-if="payment.card.reference" class="block text-xs text-stone-500">{{ t("closeSession.detail.payment.reference", { reference: payment.card.reference }) }}</span>
									</span>
								</div>
								<span v-if="payment.at" class="text-xs text-stone-400">{{ formatDateTime(payment.at) }}</span>
							</div>

							<span v-if="!report.payments.length" class="text-stone-500">
								{{ t(report.totals?.payment_state === "paid" ? "closeSession.detail.payment.coveredByPlan" : "closeSession.detail.payment.none") }}
							</span>
						</div>
					</n-card>

					<template v-if="!endRequest">
						<n-alert v-if="!isOpen" type="default" :bordered="false">{{ t("closeSession.detail.closedNote") }}</n-alert>
						<template v-else>
							<n-alert :type="fromBoard ? 'info' : 'warning'" :bordered="false">
								{{ t(fromBoard ? "closeSession.detail.noRequestActive" : "closeSession.detail.noRequest") }}
							</n-alert>
							<n-card v-if="closing" size="small" class="shadow-sm border border-stone-200">
								<div class="flex flex-col gap-2 text-sm">
									<div class="flex justify-between items-center">
										<span class="text-stone-500">{{ t("closeSession.detail.costSoFar") }}</span>
										<span class="text-lg font-extrabold text-emerald-700">{{ t("closeSession.detail.points", { points: formatNumber(closing.points) }) }}</span>
									</div>
									<span class="flex justify-end gap-2 text-xs font-semibold text-stone-500">
										<bdi v-for="amount in closing.amounts" :key="amount.currency" dir="ltr">{{ formatAmount(amount) }}</bdi>
									</span>
									<span class="text-xs text-stone-400">{{ t("closeSession.detail.costSoFarNote") }}</span>
								</div>
							</n-card>
						</template>
					</template>

					<n-card v-else size="small" class="shadow-sm border border-stone-200">
						<div class="flex flex-col gap-4 text-sm">
							<div class="flex justify-between items-center">
								<span class="text-stone-500">{{ t("closeSession.detail.chosenMethod") }}</span>
								<n-tag :type="method === 'none' ? 'default' : 'success'" round>{{ t(`closeSession.paymentMethods.${method}`) }}</n-tag>
							</div>

							<n-alert v-if="closing?.already_paid" type="success" :bordered="false">{{ t("closeSession.detail.alreadyPaid") }}</n-alert>

							<template v-else-if="method === 'wallet'">
								<div class="flex justify-between text-stone-700">
									<span>{{ t("closeSession.detail.walletBalance") }}</span>
									<span class="font-bold">{{ t("closeSession.detail.points", { points: formatNumber(report.wallet_points) }) }}</span>
								</div>
								<n-alert :type="walletCovers ? 'info' : 'warning'" :bordered="false">
									{{ walletCovers
										? t("closeSession.detail.walletCovers", { points: formatNumber(closing?.points ?? 0) })
										: t("closeSession.detail.walletShort", { points: formatNumber(report.wallet_points) }) }}
								</n-alert>
							</template>

							<template v-else-if="method === 'cash'">
								<div class="flex flex-col gap-1 bg-amber-50/40 border border-amber-100 rounded-xl p-3">
									<span class="text-stone-600">{{ t("closeSession.detail.cashCollect") }}</span>
									<bdi v-for="amount in closing?.amounts ?? []" :key="amount.currency" dir="ltr" class="text-lg font-extrabold text-stone-900">{{ formatAmount(amount) }}</bdi>
								</div>
							</template>

							<n-alert v-else-if="method === 'paymera'" type="info" :bordered="false">{{ t("closeSession.detail.cardNote") }}</n-alert>
							<n-alert v-else type="warning" :bordered="false">{{ t("closeSession.detail.noMethodNote") }}</n-alert>

							<template v-if="method === 'cash' && !closing?.already_paid">
								<n-button type="primary" size="large" block :loading="isConfirming" @click="askConfirm(true)">
									{{ t("closeSession.detail.cashCollected") }}
								</n-button>
								<n-button secondary block :disabled="isConfirming" @click="askConfirm(false)">
									{{ t("closeSession.detail.cashLater") }}
								</n-button>
							</template>
							<n-button v-else type="primary" size="large" block :loading="isConfirming" @click="askConfirm(false)">
								{{ t("closeSession.detail.confirm") }}
							</n-button>
						</div>
					</n-card>
				</div>
			</div>
		</n-spin>

		<CollectPaymentModal
			v-model:show="collectVisible"
			:user-id="report?.member.id ?? null"
			:focus="{ purpose: type === 'booking' ? 'booking' : 'coworking_session', id }"
			@update:show="open => { if (!open) backToList() }"
		/>
	</div>
</template>

<script setup lang="ts">
import type { ReceptionSessionReport, SessionType } from "@/add-os/modules/booking/types/reception"
import { NAlert, NAvatar, NButton, NCard, NSpin, NTag, useDialog, useMessage } from "naive-ui"
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import CollectPaymentModal from "@/add-os/modules/payments/components/CollectPaymentModal.vue"
import { ApiError } from "@/add-os/services/api"
import { confirmSessionEnd, getSessionReport } from "@/add-os/services/reception"
import { formatCurrency, formatDateTime, formatNumber, formatTime, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const type = String(route.params.type) as SessionType
const id = Number(route.params.id)
/** Opened from the active sessions board rather than the end-request list. */
const fromBoard = route.name === "bookings.activeSessionDetail"

const report = ref<ReceptionSessionReport | null>(null)
const isLoading = ref(false)
const loadFailed = ref(false)
const isConfirming = ref(false)

const closing = computed(() => report.value?.closing ?? null)
const endRequest = computed(() => closing.value?.end_request?.status === "pending" ? closing.value.end_request : null)

/** The payment method the member chose, as a label key. */
const method = computed(() => {
	const chosen = endRequest.value?.payment_method ?? null
	return chosen === "wallet" || chosen === "cash" || chosen === "paymera" ? chosen : "none"
})

const isOpen = computed(() => report.value !== null && report.value.session.checked_out_at === null)

/** Ticks every second, so the timer runs without asking the server. */
const now = ref(Date.now())

/** Since check-in: to now while open, to check-out once closed. */
const liveSeconds = computed(() => {
	if (!report.value) return 0
	const until = report.value.session.checked_out_at ? new Date(report.value.session.checked_out_at).getTime() : now.value
	return Math.max(0, Math.floor((until - new Date(report.value.session.checked_in_at).getTime()) / 1000))
})

/** `H:MM:SS`. */
function clockLabel(seconds: number): string {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

const walletCovers = computed(() => report.value !== null && closing.value !== null && report.value.wallet_points >= closing.value.points)

/** When the session ends: the moment the member pressed, for an open one. */
const endAt = computed(() => report.value?.session.checked_out_at ?? closing.value?.at ?? null)

const durationSeconds = computed(() => {
	if (!report.value) return 0
	if (!endAt.value) return report.value.session.duration_seconds
	return Math.max(0, Math.round((new Date(endAt.value).getTime() - new Date(report.value.session.checked_in_at).getTime()) / 1000))
})

/** `H:MM`, the same in both languages. */
function durationLabel(seconds: number): string {
	const minutes = Math.floor(seconds / 60)
	return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`
}

function initials(name: string | null | undefined): string {
	return (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase()
}

/** The server's decimal string, at the decimals it was sent with. */
function formatAmount(amount: { currency: string, value: string }): string {
	const fractionDigits = amount.value.split(".")[1]?.length ?? 0
	return formatCurrency(amount.value, isCurrencyCode(amount.currency) ? { currency: amount.currency, fractionDigits } : { fractionDigits })
}

function backToList(): void {
	router.push({ name: fromBoard ? "bookings.activeSessions" : "bookings.closeSession" })
}

function askConfirm(cashCollected: boolean): void {
	dialog.warning({
		title: t("closeSession.detail.confirmTitle"),
		content: t("closeSession.detail.confirmBody", { time: endAt.value ? formatTime(endAt.value) : "" }),
		positiveText: t("closeSession.detail.confirm"),
		negativeText: t("resourceCrud.form.cancel"),
		onPositiveClick: () => confirm(cashCollected)
	})
}

const collectVisible = ref(false)

/**
 * Collecting cash closes the session first, unpaid, and then opens the collect
 * dialog, where the desk enters the money as it was handed over — amount and
 * currency. `cash_collected: true` would record exactly what is due in the base
 * currency, whatever the member actually paid in. Leaving the dialog without
 * collecting keeps the session owed, collectable later from the member's profile.
 */
async function confirm(cashCollected: boolean): Promise<void> {
	const request = endRequest.value
	if (!request) return

	isConfirming.value = true
	try {
		const result = await confirmSessionEnd(request.id, false)
		const settled = result.data.payment_state === "paid" || result.data.price_points <= 0
		if (cashCollected && !settled) {
			collectVisible.value = true
			return
		}
		// The server says whether anything is still owed.
		if (settled) message.success(result.message)
		else message.warning(result.message)
		backToList()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.data?.message) message.error(caught.data.message)
		await load()
	} finally {
		isConfirming.value = false
	}
}

async function load(): Promise<void> {
	isLoading.value = true
	loadFailed.value = false
	try {
		report.value = await getSessionReport(type, id)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadFailed.value = true
	} finally {
		isLoading.value = false
	}
}

let ticker: ReturnType<typeof setInterval> | undefined
let repricer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
	void load()
	ticker = setInterval(() => {
		now.value = Date.now()
	}, 1000)
	// The cost so far is the server's arithmetic, so it is re-asked each
	// minute — but only while it can change: open, and nobody has pressed end.
	repricer = setInterval(() => {
		if (isOpen.value && !endRequest.value && !isLoading.value) void load()
	}, 60_000)
})

onBeforeUnmount(() => {
	clearInterval(ticker)
	clearInterval(repricer)
})

defineExpose({ report, method, walletCovers, liveSeconds, confirm, load })
</script>
