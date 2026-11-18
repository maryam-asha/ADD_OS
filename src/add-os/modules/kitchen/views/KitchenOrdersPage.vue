<!-- src/add-os/modules/kitchen/views/KitchenOrdersPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t('nav.pages.orders')" :description="t('kitchen.history.description')" />

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<n-select v-model:value="statuses" :options="statusOptions" multiple clearable :placeholder="t('kitchen.history.filters.status')" />
			<n-date-picker v-model:formatted-value="range" type="daterange" value-format="yyyy-MM-dd" clearable />
			<n-select
				v-if="mayPickMember"
				v-model:value="memberId"
				:options="memberOptions"
				filterable
				clearable
				:placeholder="t('kitchen.history.filters.member')"
			/>
		</div>

		<n-alert v-if="error" type="error" :title="t('kitchen.history.loadError')" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading="isLoading" :bordered="false" :row-key="(row: KitchenOrder) => row.id" :row-props size="small" :scroll-x="900" />
			<div v-if="meta && meta.last_page > 1" class="mt-4 flex justify-end">
				<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
			</div>
		</n-card>

		<DetailDrawer v-model:show="drawerOpen" :title="selected ? t('kitchen.card.order', { id: formatNumber(selected.id, { grouping: false }) }) : ''">
			<template v-if="selected">
				<div class="flex flex-col gap-4" data-test="order-detail">
					<div class="flex flex-wrap gap-2">
						<n-tag :type="STATUS_TAG[selected.status]" size="small">{{ t(`kitchen.status.${selected.status}`) }}</n-tag>
						<n-tag :type="selected.paid ? 'success' : 'warning'" size="small">{{ t(selected.paid ? "kitchen.history.paid" : "kitchen.history.unpaid") }}</n-tag>
					</div>

					<dl class="grid grid-cols-2 gap-x-4 gap-y-2">
						<template v-for="field in fields" :key="field.label">
							<dt class="text-secondary">{{ field.label }}</dt>
							<dd dir="auto" class="whitespace-pre-wrap break-words">{{ field.value }}</dd>
						</template>
					</dl>

					<div v-if="selected.rejection_reason" data-test="rejection-reason">
						<h3 class="font-bold">{{ t("kitchen.history.rejectionReason") }}</h3>
						<p dir="auto" class="whitespace-pre-wrap break-words">{{ selected.rejection_reason }}</p>
					</div>

					<div>
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="font-bold">{{ t("kitchen.history.lines") }}</h3>
							<n-tag v-if="selected.adjusted" size="small" type="warning" :bordered="false" data-test="adjusted">{{ t("kitchen.card.adjusted") }}</n-tag>
						</div>
						<KitchenOrderLines :lines="selected.lines" show-points />
						<p class="mt-2 flex flex-wrap items-baseline gap-2">
							<span class="font-bold">{{ t("kitchen.card.total", { points: formatNumber(selected.total_points) }) }}</span>
							<span v-if="selected.adjusted" class="text-xs text-[var(--add-text-muted)] line-through" data-test="ordered-total">{{ t("kitchen.card.orderedTotal", { points: formatNumber(selected.ordered_total_points) }) }}</span>
						</p>
					</div>
				</div>
			</template>
		</DetailDrawer>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { KitchenOrder, KitchenOrderStatus } from "@/add-os/modules/kitchen/types/kitchen"
import type { KitchenOrderQuery } from "@/add-os/services/kitchen"
import { NAlert, NCard, NDataTable, NDatePicker, NPagination, NSelect, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import DetailDrawer from "@/add-os/components/page/DetailDrawer.vue"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canListMembers } from "@/add-os/config/permissions"
import KitchenOrderLines from "@/add-os/modules/kitchen/components/KitchenOrderLines.vue"
import { KITCHEN_ORDER_STATUSES } from "@/add-os/modules/kitchen/types/kitchen"
import { paymentLabelKey } from "@/add-os/modules/kitchen/utils/payment"
import { ApiError } from "@/add-os/services/api"
import { listKitchenOrders } from "@/add-os/services/kitchen"
import { listMembers } from "@/add-os/services/members"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"

/**
 * Every kitchen order, filtered and paged by the API. A row opens the whole
 * order: its lines, when each step happened, why it was refused or who
 * cancelled it, and whether it is paid.
 *
 * With no status chosen every status is sent: the API's own default is only
 * the open ones, which is the board's view, not a history.
 */

const { t } = useI18n()

const STATUS_TAG: Record<KitchenOrderStatus, "default" | "info" | "success" | "warning" | "error"> = {
	awaiting_payment: "default",
	awaiting_reception: "warning",
	pending: "info",
	preparing: "warning",
	ready: "success",
	delivered: "default",
	rejected: "error",
	cancelled: "default"
}

// ── Filters ─────────────────────────────────────────────────────────────────
const statuses = ref<KitchenOrderStatus[]>([])
const range = ref<[string, string] | null>(null)
const memberId = ref<number | null>(null)

const statusOptions = computed<SelectOption[]>(() => KITCHEN_ORDER_STATUSES.map(status => ({ label: t(`kitchen.status.${status}`), value: status })))

/** Members are searchable only for an account that may read users; the API filter itself needs only the id. */
const mayPickMember = canListMembers()
const memberOptions = ref<SelectOption[]>([])
onMounted(async () => {
	if (!mayPickMember) return
	try {
		memberOptions.value = (await listMembers()).map(member => ({ label: member.phone ? `${member.name} · ${member.phone}` : member.name, value: member.id }))
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
	}
})

const query = computed<Record<string, unknown>>(() => {
	// History reads newest first; the board (no `sort`) keeps the queue oldest first.
	const q: KitchenOrderQuery = { sort: "newest", status: statuses.value.length > 0 ? [...statuses.value] : [...KITCHEN_ORDER_STATUSES] }
	if (range.value) {
		q.from = range.value[0]
		q.to = range.value[1]
	}
	if (memberId.value !== null) q.user_id = memberId.value
	return { ...q }
})

const page = ref(1)
const { data: rows, isLoading, error, meta } = useResourceList<KitchenOrder>(q => listKitchenOrders(q as KitchenOrderQuery), query, page)

// ── Table ───────────────────────────────────────────────────────────────────
function placeOf(order: KitchenOrder): string {
	if (order.delivery.type === "pickup") return t("kitchen.delivery.pickup")
	return order.delivery.label ?? order.delivery.note ?? t(`kitchen.deliveryType.${order.delivery.type}`)
}

/** The member's name, or "unknown member" once their account has been deleted. */
function memberName(order: KitchenOrder): string {
	return order.member?.name ?? t("kitchen.card.unknownMember")
}

const columns = computed<DataTableColumns<KitchenOrder>>(() => [
	{ key: "id", title: t("kitchen.history.columns.order"), width: 90, render: row => formatNumber(row.id, { grouping: false }) },
	{ key: "submitted", title: t("kitchen.history.columns.submitted"), render: row => (row.timestamps.submitted_at ? formatDateTime(row.timestamps.submitted_at) : "—") },
	{ key: "member", title: t("kitchen.history.columns.member"), render: row => memberName(row) },
	{ key: "place", title: t("kitchen.history.columns.place"), ellipsis: { tooltip: true }, render: row => placeOf(row) },
	{ key: "total", title: t("kitchen.history.columns.total"), render: row => formatNumber(row.total_points) },
	{ key: "status", title: t("kitchen.history.columns.status"), render: row => h(NTag, { type: STATUS_TAG[row.status], size: "small" }, () => t(`kitchen.status.${row.status}`)) }
])

// ── Drawer ──────────────────────────────────────────────────────────────────
const drawerOpen = ref(false)
const selected = ref<KitchenOrder | null>(null)

function open(order: KitchenOrder) {
	selected.value = order
	drawerOpen.value = true
}

function rowProps(row: KitchenOrder) {
	return { class: "cursor-pointer", onClick: () => open(row) }
}

function at(value: string | null): string {
	return value ? formatDateTime(value) : "—"
}

const fields = computed(() => {
	const order = selected.value
	if (order === null) return []
	const payKey = paymentLabelKey(order)
	const list = [
		{ label: t("kitchen.history.columns.member"), value: order.member?.phone ? `${memberName(order)} · ${order.member.phone}` : memberName(order) },
		{ label: t("kitchen.history.columns.place"), value: placeOf(order) },
		{ label: t("kitchen.history.bill"), value: order.bill ? t(`kitchen.history.billType.${order.bill.type}`, { id: formatNumber(order.bill.id, { grouping: false }) }) : t("kitchen.history.noBill") },
		{ label: t("kitchen.history.payment"), value: payKey ? t(payKey) : t("kitchen.history.notPaid") },
		{ label: t("kitchen.history.source"), value: t(`kitchen.history.sourceType.${order.source}`) },
		{ label: t("kitchen.history.submittedAt"), value: at(order.timestamps.submitted_at) },
		{ label: t("kitchen.history.acceptedAt"), value: at(order.timestamps.accepted_at) },
		{ label: t("kitchen.history.readyAt"), value: at(order.timestamps.ready_at) },
		{ label: t("kitchen.history.deliveredAt"), value: at(order.timestamps.delivered_at) }
	]
	if (order.cancelled_by) list.push({ label: t("kitchen.history.cancelledBy"), value: t(`kitchen.history.cancelledByType.${order.cancelled_by}`) })
	if (order.cash_return) list.push({ label: t("kitchen.history.cashReturn"), value: t(`kitchen.history.cashReturnState.${order.cash_return}`) })
	return list
})

defineExpose({ statuses, range, memberId, page, open })
</script>
