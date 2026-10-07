<!-- src/add-os/modules/payments/views/PaymentTransactionsPage.vue -->
<!--
	Every payment, by any method and for any purpose: the totals over what is
	filtered, then the list itself, paged by the server. A row opens its
	details; an accepted card payment can be reversed from there.
-->
<template>
	<div class="flex flex-col gap-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.transactions") }}</h1>
				<p class="text-secondary">{{ t("payments.transactions.description") }}</p>
			</div>
			<n-button secondary size="small" :loading="isLoading || summaryLoading" @click="reload">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("payments.refresh") }}
			</n-button>
		</div>

		<!-- Totals over the filtered payments -->
		<div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4" data-test="payments-summary">
			<n-card v-for="card in cards" :key="card.key" size="small" class="border border-stone-200" :class="card.onClick ? 'cursor-pointer hover:border-emerald-600' : ''" @click="card.onClick?.()">
				<div class="flex flex-col gap-1">
					<span class="flex items-center gap-2 text-xs text-stone-500">
						<Icon :name="card.icon" :size="16" class="text-emerald-700" />{{ card.label }}
					</span>
					<template v-if="card.lines">
						<span v-if="!card.lines.length" class="text-2xl font-extrabold text-stone-900">—</span>
						<bdi v-for="line in card.lines" :key="line" dir="ltr" class="text-lg font-extrabold text-stone-900 leading-tight">{{ line }}</bdi>
					</template>
					<span v-else class="text-2xl font-extrabold" :class="card.tone ?? 'text-stone-900'">{{ card.value }}</span>
					<span v-if="card.hint" class="text-xs text-stone-500">{{ card.hint }}</span>
				</div>
			</n-card>
		</div>

		<n-card size="small" class="shadow-sm border border-stone-200">
			<div class="flex flex-col gap-4">
				<!-- Filters -->
				<div class="flex flex-wrap items-center gap-3">
					<div class="w-64 shrink-0">
						<n-input v-model:value="search" clearable size="small" :placeholder="t('payments.transactions.searchPlaceholder')" data-test="payments-search">
							<template #prefix><Icon name="carbon:search" :size="16" /></template>
						</n-input>
					</div>
					<div v-for="filter in selectFilters" :key="filter.key" class="w-44 shrink-0">
						<n-select v-model:value="filters[filter.key]" :options="filter.options" :placeholder="filter.placeholder" clearable size="small" class="w-full" />
					</div>
					<n-date-picker v-model:formatted-value="range" type="daterange" value-format="yyyy-MM-dd" clearable size="small" class="w-64 shrink-0" />
					<span class="text-xs text-stone-500 ms-auto">{{ t("payments.resultCount", { count: formatNumber(total) }) }}</span>
				</div>

				<n-alert v-if="failed" type="error" :bordered="false">{{ t("payments.loadError") }}</n-alert>

				<n-data-table
					remote
					:columns
					:data="rows"
					:loading="isLoading"
					:bordered="false"
					:row-key="(row: AdminPayment) => row.id"
					:pagination
					:row-props
					size="small"
					@update:page="onPage"
				/>
			</div>
		</n-card>

		<!-- One payment, in full -->
		<n-drawer v-model:show="detailVisible" :width="440" :placement="isRtl ? 'left' : 'right'">
			<n-drawer-content :title="selected ? t('payments.transactions.detailTitle', { id: selected.id }) : ''" closable>
				<div v-if="selected" class="flex flex-col gap-4 text-sm" data-test="payment-detail">
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-2 font-semibold text-stone-900">
							<Icon :name="methodIcon(selected.method)" :size="18" class="text-emerald-700" />{{ selected.method_label }}
						</span>
						<n-tag :type="statusType(selected.status)" size="small" round>{{ statusLabel(selected.status) }}</n-tag>
					</div>

					<dl class="flex flex-col divide-y divide-stone-100">
						<div v-for="field in detailFields" :key="field.label" class="flex justify-between gap-4 py-2">
							<dt class="text-stone-500">{{ field.label }}</dt>
							<dd class="font-medium text-stone-900 text-end break-all">
								<bdi v-if="field.ltr" dir="ltr">{{ field.value }}</bdi>
								<template v-else>{{ field.value }}</template>
							</dd>
						</div>
					</dl>

					<div v-if="selected.discounts?.length" class="flex flex-col gap-2" data-test="payment-discounts">
						<span class="text-stone-500">{{ t("payments.transactions.discounts") }}</span>
						<AppliedDiscountList :discounts="selected.discounts" />
					</div>

					<n-alert v-if="selected.review_reason" type="warning" :bordered="false" :title="t('payments.transactions.reviewReason')">
						{{ selected.review_reason }}
					</n-alert>

					<div class="flex flex-wrap gap-2">
						<n-button v-if="selected.user" secondary size="small" @click="openMember(selected.user.id)">
							<template #icon><Icon name="carbon:user" :size="16" /></template>
							{{ t("payments.transactions.openMember") }}
						</n-button>
						<n-button v-if="canReverse(selected)" type="error" secondary size="small" :loading="reversing" data-test="payment-reverse" @click="confirmReverse(selected)">
							<template #icon><Icon name="carbon:undo" :size="16" /></template>
							{{ t("payments.transactions.reverse") }}
						</n-button>
					</div>
				</div>
			</n-drawer-content>
		</n-drawer>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { AdminPayment, PaymentMethodInfo, PaymentsSummary, PaymentStatus } from "@/add-os/modules/payments/types/payment"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NDrawer, NDrawerContent, NInput, NSelect, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { PAYMENT_PURPOSES, PAYMENT_STATUSES } from "@/add-os/modules/payments/types/payment"
import AppliedDiscountList from "@/add-os/modules/pricing/components/AppliedDiscountList.vue"
import { ApiError } from "@/add-os/services/api"
import { getPaymentsSummary, listPaymentMethods, listPayments, reversePayment } from "@/add-os/services/payments"
import { formatCurrency, formatDateTime, formatNumber, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()

const PAGE_SIZE = 20

const isRtl = computed(() => currentLocale.value === "ar")

/** A link may arrive already filtered, e.g. from a method's card: `?method=cash`. */
function fromRoute(key: string): string | null {
	const value = route.query[key]
	return typeof value === "string" && value ? value : null
}

const filters = reactive<Record<string, string | null>>({ status: fromRoute("status"), method: fromRoute("method"), purpose: fromRoute("purpose") })
const search = ref("")
/** What is actually sent: `search` once typing has paused. */
const searchTerm = ref("")
const range = ref<[string, string] | null>(null)

const rows = ref<AdminPayment[]>([])
const total = ref(0)
const page = ref(1)
const isLoading = ref(false)
const failed = ref(false)
const summary = ref<PaymentsSummary | null>(null)
const summaryLoading = ref(false)
const methods = ref<PaymentMethodInfo[]>([])

const selected = ref<AdminPayment | null>(null)
const detailVisible = ref(false)
const reversing = ref(false)

/** Only the newest request may land: an older answer is for filters no longer chosen. */
let request = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

/* ── Labels ───────────────────────────────────────────────────────────────── */

function statusLabel(status: string): string {
	return t(`payments.status.${status}`)
}

function statusType(status: string): "success" | "warning" | "error" | "default" {
	if (status === "accepted") return "success"
	if (status === "pending" || status === "needs_review") return "warning"
	if (status === "failed") return "error"
	return "default"
}

function methodIcon(method: string): string {
	return method === "wallet" ? "carbon:wallet" : method === "cash" ? "carbon:money" : "carbon:currency"
}

function money(value: string, currency: string | null): string {
	const fractionDigits = value.split(".")[1]?.length ?? 0
	return formatCurrency(value, isCurrencyCode(currency) ? { currency, fractionDigits } : { fractionDigits }) + (currency && !isCurrencyCode(currency) ? ` ${currency}` : "")
}

function cardAmount(payment: AdminPayment): string | null {
	if (payment.amount_minor === null) return null
	const exponent = payment.currency_exponent ?? 2
	const value = (payment.amount_minor / 10 ** exponent).toFixed(exponent)
	return money(value, payment.currency)
}

/** The money behind a payment: cash handed over, or what a card was charged. */
function moneyOf(payment: AdminPayment): string | null {
	if (payment.received_amount !== null) return money(payment.received_amount, payment.received_currency)
	return cardAmount(payment)
}

function pointsOf(payment: AdminPayment): number | null {
	return payment.amount_points ?? payment.points_to_credit
}

/* ── Filters ──────────────────────────────────────────────────────────────── */

const methodOptions = computed<SelectOption[]>(() => methods.value.map(method => ({ label: method.label, value: method.key })))

const selectFilters = computed<{ key: string, placeholder: string, options: SelectOption[] }[]>(() => [
	{ key: "status", placeholder: t("payments.filters.status"), options: PAYMENT_STATUSES.map(value => ({ label: statusLabel(value), value })) },
	{ key: "method", placeholder: t("payments.filters.method"), options: methodOptions.value },
	{ key: "purpose", placeholder: t("payments.filters.purpose"), options: PAYMENT_PURPOSES.map(value => ({ label: t(`payments.purpose.${value}`), value })) }
])

function query(): Record<string, unknown> {
	const q: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(filters)) {
		if (value) q[key] = value
	}
	if (searchTerm.value.trim()) q.search = searchTerm.value.trim()
	if (range.value) {
		q.from = range.value[0]
		q.to = range.value[1]
	}
	return q
}

/* ── Totals ───────────────────────────────────────────────────────────────── */

function showStatus(status: PaymentStatus): void {
	filters.status = status
}

const cards = computed(() => {
	const s = summary.value
	const count = (status: PaymentStatus) => s?.by_status[status] ?? 0
	return [
		{ key: "total", icon: "carbon:receipt", label: t("payments.transactions.cards.total"), value: formatNumber(s?.total ?? 0), hint: t("payments.transactions.cards.acceptedHint", { count: formatNumber(s?.accepted.count ?? 0) }) },
		{ key: "points", icon: "carbon:star", label: t("payments.transactions.cards.points"), value: formatNumber(s?.accepted.points ?? 0), tone: "text-emerald-700" },
		{ key: "cash", icon: "carbon:money", label: t("payments.transactions.cards.cash"), lines: (s?.cash ?? []).map(line => money(line.amount, line.currency)) },
		{ key: "card", icon: "carbon:currency", label: t("payments.transactions.cards.card"), lines: (s?.card ?? []).map(line => money(line.amount, line.currency)) },
		{
			key: "open",
			icon: "carbon:warning-alt",
			label: t("payments.transactions.cards.open"),
			value: formatNumber(count("pending") + count("needs_review")),
			tone: count("needs_review") ? "text-amber-600" : "text-stone-900",
			hint: t("payments.transactions.cards.openHint", { review: formatNumber(count("needs_review")) }),
			onClick: () => showStatus(count("needs_review") ? "needs_review" : "pending")
		}
	] as { key: string, icon: string, label: string, value?: string, lines?: string[], tone?: string, hint?: string, onClick?: () => void }[]
})

/* ── Table ────────────────────────────────────────────────────────────────── */

const pagination = computed(() => ({ page: page.value, pageSize: PAGE_SIZE, itemCount: total.value }))

function tag(label: string, type: "success" | "warning" | "error" | "default" = "default") {
	return h(NTag, { size: "small", round: true, bordered: false, type }, { default: () => label })
}

const columns = computed<DataTableColumns<AdminPayment>>(() => [
	{ title: "#", key: "id", width: 70 },
	{ title: t("payments.columns.date"), key: "created_at", render: row => (row.created_at ? formatDateTime(row.created_at) : "—") },
	{
		title: t("payments.columns.member"),
		key: "user",
		render: row => (row.user
			? h("div", { class: "flex flex-col" }, [
					h("span", { class: "font-medium text-stone-900" }, row.user.name),
					h("bdi", { dir: "ltr", class: "text-xs text-stone-500" }, row.user.phone)
				])
			: "—")
	},
	{ title: t("payments.columns.purpose"), key: "purpose", render: row => t(`payments.purpose.${row.purpose}`) },
	{ title: t("payments.columns.method"), key: "method", render: row => h("span", { class: "flex items-center gap-1.5" }, [h(Icon, { name: methodIcon(row.method), size: 14, class: "text-emerald-700" }), row.method_label]) },
	{ title: t("payments.columns.points"), key: "amount_points", render: row => (pointsOf(row) ? h("span", { class: "font-semibold" }, formatNumber(pointsOf(row) as number)) : "—") },
	{ title: t("payments.columns.amount"), key: "amount", render: row => (moneyOf(row) ? h("bdi", { dir: "ltr" }, moneyOf(row) as string) : "—") },
	{ title: t("payments.columns.status"), key: "status", render: row => tag(statusLabel(row.status), statusType(row.status)) },
	{ title: t("payments.columns.discounts"), key: "discounts", render: row => h(AppliedDiscountList, { discounts: row.discounts }) }
])

function rowProps(row: AdminPayment) {
	return { class: "cursor-pointer", onClick: () => openDetail(row) }
}

async function fetchPage(): Promise<void> {
	const current = ++request
	isLoading.value = true
	failed.value = false
	try {
		const result = await listPayments({ ...query(), page: page.value, per_page: PAGE_SIZE })
		if (current !== request) return
		rows.value = result.data
		total.value = result.meta.total
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (current === request) failed.value = true
	} finally {
		if (current === request) isLoading.value = false
	}
}

let summaryRequest = 0

async function fetchSummary(): Promise<void> {
	const current = ++summaryRequest
	summaryLoading.value = true
	try {
		const result = await getPaymentsSummary(query())
		if (current === summaryRequest) summary.value = result
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
	} finally {
		if (current === summaryRequest) summaryLoading.value = false
	}
}

function reload(): void {
	void fetchPage()
	void fetchSummary()
}

function onPage(next: number): void {
	page.value = next
	void fetchPage()
}

// A new filter starts again from the first page, and re-totals.
watch([filters, range, searchTerm], () => {
	page.value = 1
	reload()
}, { deep: true })

watch(search, value => {
	clearTimeout(searchTimer)
	searchTimer = setTimeout(() => (searchTerm.value = value ?? ""), 350)
})

/* ── Details ──────────────────────────────────────────────────────────────── */

function openDetail(payment: AdminPayment): void {
	selected.value = payment
	detailVisible.value = true
}

const detailFields = computed(() => {
	const p = selected.value
	if (!p) return []
	const fields: { label: string, value: string, ltr?: boolean }[] = [
		{ label: t("payments.columns.member"), value: p.user ? `${p.user.name} · ${p.user.phone}` : "—" },
		{ label: t("payments.columns.purpose"), value: t(`payments.purpose.${p.purpose}`) },
		{ label: t("payments.columns.date"), value: p.created_at ? formatDateTime(p.created_at) : "—" }
	]
	const points = pointsOf(p)
	if (points) fields.push({ label: t("payments.columns.points"), value: t("payments.pointsValue", { points: formatNumber(points) }) })
	if (p.received_amount !== null) {
		fields.push({ label: t("payments.transactions.cashReceived"), value: money(p.received_amount, p.received_currency), ltr: true })
		if (p.received_by_name) fields.push({ label: t("payments.transactions.receivedBy"), value: p.received_by_name })
		if (p.received_at) fields.push({ label: t("payments.transactions.receivedAt"), value: formatDateTime(p.received_at) })
	}
	const card = cardAmount(p)
	if (card) fields.push({ label: t("payments.transactions.cardCharged"), value: card, ltr: true })
	if (p.rrn) fields.push({ label: t("payments.transactions.reference"), value: p.rrn, ltr: true })
	if (p.gateway_payment_id) fields.push({ label: t("payments.transactions.gatewayId"), value: p.gateway_payment_id, ltr: true })
	if (p.payable) fields.push({ label: t("payments.transactions.paysFor"), value: `${p.payable.type} #${p.payable.id}`, ltr: true })
	if (p.expires_at && p.status === "pending") fields.push({ label: t("payments.transactions.expiresAt"), value: formatDateTime(p.expires_at) })
	if (p.reversed_at) fields.push({ label: t("payments.transactions.reversedAt"), value: formatDateTime(p.reversed_at) })
	if (p.refunded_at) fields.push({ label: t("payments.transactions.refundedAt"), value: formatDateTime(p.refunded_at) })
	return fields
})

function openMember(id: number): void {
	router.push({ name: "members.memberProfile", params: { id } })
}

/** Only an accepted payment through a card gateway has money at the bank to send back. */
function canReverse(payment: AdminPayment): boolean {
	return payment.status === "accepted" && methods.value.some(method => method.key === payment.method && method.gateway)
}

function confirmReverse(payment: AdminPayment): void {
	dialog.warning({
		title: t("payments.transactions.reverseTitle"),
		content: t("payments.transactions.reverseConfirm", { id: payment.id, amount: cardAmount(payment) ?? "" }),
		positiveText: t("payments.transactions.reverse"),
		negativeText: t("payments.cancel"),
		onPositiveClick: async () => {
			reversing.value = true
			try {
				message.success(await reversePayment(payment.id))
				detailVisible.value = false
				reload()
			} catch (caught) {
				if (!(caught instanceof ApiError)) throw caught
				message.error(caught.status === 403 ? t("payments.transactions.reverseForbidden") : caught.data?.message || t("payments.transactions.reverseFailed"))
			} finally {
				reversing.value = false
			}
		}
	})
}

/* ── Load ─────────────────────────────────────────────────────────────────── */

onMounted(async () => {
	reload()
	try {
		methods.value = await listPaymentMethods()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
	}
})

onBeforeUnmount(() => clearTimeout(searchTimer))
</script>
