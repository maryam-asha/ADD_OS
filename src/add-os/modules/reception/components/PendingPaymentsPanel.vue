<!-- src/add-os/modules/reception/components/PendingPaymentsPanel.vue -->
<!--
	Everything owed across every member, for the desk to collect
	(GET reception/pending-payments): sessions and bookings already used and
	unpaid, bookings a member chose to pay for at the desk, event
	registrations and plans held for cash — the rows the desk's "pending
	payments" card counts. "Collect" opens the collect dialog on that one item.
-->
<template>
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between gap-3 flex-wrap">
			<p class="text-sm text-stone-600">{{ t("reception.pendingPayments.description") }}</p>
			<n-input v-model:value="search" clearable size="small" style="width: 18rem; max-width: 100%" :placeholder="t('reception.pendingPayments.searchPlaceholder')">
				<template #prefix><Icon name="carbon:search" :size="16" /></template>
			</n-input>
		</div>

		<n-alert v-if="error" type="error" :bordered="false" :title="t('reception.pendingPayments.loadError')" />

		<n-card class="add-ledger-table">
			<n-data-table v-if="rows.length > 0 || isLoading" :columns :data="rows" :loading="isLoading" :bordered="false" :row-key size="small" :scroll-x="820" />
			<div v-else-if="!error" class="py-10 text-center text-sm text-stone-500">{{ t("reception.pendingPayments.empty") }}</div>

			<div v-if="meta && meta.last_page > 1" class="mt-4 flex justify-end">
				<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
			</div>
		</n-card>

		<CollectPaymentModal v-model:show="collectVisible" :user-id="collecting?.member?.id ?? null" :focus="collectFocus" @settled="onSettled" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { OutstandingItem } from "@/add-os/modules/booking/types/reception"
import { NAlert, NButton, NCard, NDataTable, NInput, NPagination, NTag } from "naive-ui"
import { computed, h, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canSettleAtReception } from "@/add-os/config/permissions"
import { useReceptionRealtime } from "@/add-os/modules/booking/composables/useReceptionRealtime"
import CollectPaymentModal from "@/add-os/modules/payments/components/CollectPaymentModal.vue"
import { listPendingPayments } from "@/add-os/services/reception"
import { formatCurrency, formatDateTime, formatNumber, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const emit = defineEmits<{ settled: [] }>()

const { t } = useI18n()

/* ── The list, searched by name or phone ────────────────────────────────── */

const search = ref("")
const query = ref<Record<string, unknown>>({})
const page = ref(1)

// One request per pause in typing, not per key.
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
	clearTimeout(searchTimer)
	searchTimer = setTimeout(() => {
		query.value = value.trim() ? { search: value.trim() } : {}
	}, 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

const { data: rows, isLoading, error, refetch, meta } = useResourceList<OutstandingItem>(listPendingPayments, query, page)

// Something settled, booked or closed elsewhere at the desk changes what is owed.
useReceptionRealtime(refetch)

function keyOf(item: OutstandingItem): string {
	return `${item.purpose}-${item.payable_id ?? item.payment_id}`
}

function rowKey(row: OutstandingItem): string {
	return keyOf(row)
}

/* ── Collecting one item ────────────────────────────────────────────────── */

const collecting = ref<OutstandingItem | null>(null)
const collectVisible = ref(false)

const collectFocus = computed(() => {
	const item = collecting.value
	if (!item) return null
	const id = item.purpose === "plan_purchase" ? item.payment_id : item.payable_id
	return id === undefined ? null : { purpose: item.purpose, id }
})

function collect(row: OutstandingItem): void {
	collecting.value = row
	collectVisible.value = true
}

async function onSettled(): Promise<void> {
	await refetch()
	emit("settled")
}

/* ── Columns ────────────────────────────────────────────────────────────── */

function formatAmount(value: { value: string, currency: string }): string {
	const fractionDigits = value.value.split(".")[1]?.length ?? 0
	return formatCurrency(value.value, isCurrencyCode(value.currency) ? { currency: value.currency, fractionDigits } : { fractionDigits })
}

/** Used already (or nothing to happen, a held plan) vs. still to come: the one thing the desk sorts by at a glance. */
function isUpcoming(item: OutstandingItem): boolean {
	return item.starts_at !== null && new Date(item.starts_at).getTime() > Date.now()
}

const columns = computed<DataTableColumns<OutstandingItem>>(() => {
	const all: DataTableColumns<OutstandingItem> = [
		{
			title: t("reception.pendingPayments.columns.member"),
			key: "member",
			minWidth: 170,
			render: row => row.member
				? h("div", { class: "flex flex-col" }, [
						h(RouterLink, { to: { name: "members.memberProfile", params: { id: row.member.id } }, class: "font-semibold text-stone-900 hover:underline" }, () => row.member?.name ?? "—"),
						row.member.phone ? h("bdi", { dir: "ltr", class: "text-xs text-stone-500 add-numeric" }, row.member.phone) : null
					])
				: "—"
		},
		{
			title: t("reception.pendingPayments.columns.item"),
			key: "purpose",
			minWidth: 190,
			render: row => h("div", { class: "flex flex-col gap-1" }, [
				h("span", { class: "font-medium" }, row.title ? `${t(`collectPayment.purpose.${row.purpose}`)} — ${row.title}` : t(`collectPayment.purpose.${row.purpose}`)),
				h(NTag, { size: "small", bordered: false, type: isUpcoming(row) ? "info" : "warning", class: "self-start" }, () =>
					t(isUpcoming(row) ? "reception.pendingPayments.upcoming" : "reception.pendingPayments.used"))
			])
		},
		{
			title: t("reception.pendingPayments.columns.when"),
			key: "starts_at",
			minWidth: 150,
			render: row => h("span", { class: "font-mono text-xs" }, row.starts_at ? formatDateTime(row.starts_at) : "—")
		},
		{
			title: t("reception.pendingPayments.columns.amount"),
			key: "amount",
			minWidth: 140,
			render: row => h("div", { class: "flex flex-col" }, [
				h("bdi", { dir: "ltr", class: "font-bold add-numeric" }, formatAmount(row.amount)),
				h("span", { class: "text-xs text-stone-500" }, t("collectPayment.duePoints", { points: formatNumber(row.amount_points) }))
			])
		},
		{
			title: "",
			key: "actions",
			width: 120,
			align: "center",
			render: row => h(
				NButton,
				{ size: "small", type: "primary", disabled: !row.member, onClick: () => collect(row) },
				{ icon: () => h(Icon, { name: "carbon:money", size: 16 }), default: () => t("reception.pendingPayments.collect") }
			)
		}
	]
	// Taking money is `reception.settle_payment`; without it the list is read-only.
	return canSettleAtReception() ? all : all.filter(column => !("key" in column) || column.key !== "actions")
})

defineExpose({ rows, meta, page, search, query, collect, collecting, collectVisible, refetch })
</script>
