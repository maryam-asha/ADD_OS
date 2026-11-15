<!-- src/add-os/modules/kitchen/components/ReceptionKitchenQueue.vue -->
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<p class="text-sm text-stone-600">{{ t("kitchen.reception.description") }}</p>
			<n-button size="small" secondary :loading="isLoading" @click="load">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("kitchen.board.refresh") }}
			</n-button>
		</div>

		<n-alert v-if="loadError" type="error" :bordered="false" :title="t('kitchen.reception.loadError')" />

		<div v-if="orders.length > 0" class="grid grid-cols-1 gap-3 lg:grid-cols-2">
			<n-card v-for="order in orders" :key="order.id" size="small" :data-order="order.id">
				<div class="flex flex-col gap-2">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<span class="font-bold">{{ t("kitchen.card.order", { id: formatNumber(order.id, { grouping: false }) }) }}</span>
						<span class="text-sm text-[var(--add-text-secondary)]" data-test="waited">
							<Icon name="carbon:time" :size="14" class="align-middle" />
							{{ t(countKey("kitchen.card.waited", waitedMinutes(order)), { n: formatNumber(waitedMinutes(order)) }) }}
						</span>
					</div>

					<div class="flex flex-col">
						<span class="font-semibold" dir="auto">{{ order.member?.name ?? t("kitchen.card.unknownMember") }}</span>
						<bdi v-if="order.member?.phone" dir="ltr" class="text-xs text-[var(--add-text-secondary)] add-numeric">{{ order.member.phone }}</bdi>
					</div>

					<div class="flex items-start gap-2" data-test="place">
						<Icon name="carbon:location" :size="16" class="mt-1 shrink-0" />
						<span dir="auto">{{ placeOf(order) }}</span>
					</div>

					<ul class="flex flex-col gap-1" data-test="lines">
						<li v-for="line in order.lines" :key="line.sale_item_id">
							{{ t("kitchen.card.line", { name: line.name ?? t("kitchen.card.unnamedItem"), quantity: formatNumber(line.quantity) }) }}
						</li>
					</ul>

					<div class="flex flex-wrap items-center justify-between gap-2">
						<span class="font-bold" data-test="total">{{ t("kitchen.card.total", { points: formatNumber(order.total_points) }) }}</span>
						<n-tag v-if="owesCash(order)" type="warning" size="small" :bordered="false" data-test="cash-tag">
							{{ t("kitchen.reception.payment.cashToCollect", { points: formatNumber(order.cash_due_points ?? 0) }) }}
						</n-tag>
						<n-tag v-else-if="paymentKey(order)" type="success" size="small" :bordered="false" data-test="payment">
							{{ t(`kitchen.reception.payment.${paymentKey(order)}`) }}
						</n-tag>
					</div>

					<div class="flex flex-wrap gap-2">
						<n-button size="small" type="primary" :disabled="busyId === order.id" :loading="busyId === order.id" data-action="confirm" @click="confirm(order)">
							{{ t("kitchen.reception.confirm") }}
						</n-button>
						<n-button size="small" type="error" secondary :disabled="busyId === order.id" data-action="turn-down" @click="openTurnDown(order)">
							{{ t("kitchen.reception.turnDown") }}
						</n-button>
					</div>
				</div>
			</n-card>
		</div>
		<div v-else-if="!loadError && !isLoading" class="py-10 text-center text-sm text-stone-500" data-test="empty">{{ t("kitchen.reception.empty") }}</div>

		<div v-if="meta && meta.last_page > 1" class="flex justify-end">
			<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
		</div>

		<ConfirmCashOrderModal v-model:show="cashVisible" :order="target" :loading="busyId !== null" :server-error="cashError" @submit="submitCash" />
		<RejectOrderModal v-model:show="turnDownVisible" :order-id="target?.id ?? null" :loading="busyId !== null" :server-error="turnDownError" @submit="submitTurnDown" />
	</div>
</template>

<script setup lang="ts">
import type { KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import type { PaginationMeta } from "@/add-os/services/pagination"
import { NAlert, NButton, NCard, NPagination, NTag, useMessage } from "naive-ui"
import { onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useReceptionRealtime } from "@/add-os/modules/booking/composables/useReceptionRealtime"
import ConfirmCashOrderModal from "@/add-os/modules/kitchen/components/ConfirmCashOrderModal.vue"
import RejectOrderModal from "@/add-os/modules/kitchen/components/RejectOrderModal.vue"
import { ApiError } from "@/add-os/services/api"
import { confirmKitchenOrder, listOrdersToConfirm, turnDownKitchenOrder } from "@/add-os/services/kitchen"
import { countKey, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The orders members sent without a bill, waiting at reception: the desk checks
 * the person is in the building, then lets the order through to the kitchen or
 * turns it down with a reason the member reads.
 *
 * Nothing is changed in place. Every action, worked or not, ends by reading the
 * list again — a colleague may have handled the order first (409), and the
 * server's list is the truth. The one exception is a refused cash confirm (422,
 * the currency has no rate): the dialog stays open with the server's sentence.
 */
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const message = useMessage()

const orders = ref<KitchenOrder[]>([])
const meta = ref<PaginationMeta | null>(null)
const page = ref(1)
const isLoading = ref(false)
const loadError = ref(false)

async function load(): Promise<void> {
	isLoading.value = true
	try {
		const result = await listOrdersToConfirm({ page: page.value })
		orders.value = result.data
		meta.value = result.meta
		loadError.value = false
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadError.value = true
	} finally {
		isLoading.value = false
	}
}

onMounted(load)
watch(page, () => void load())
useReceptionRealtime(load)

function waitedMinutes(order: KitchenOrder): number {
	return Math.floor(order.waited_seconds / 60)
}

function placeOf(order: KitchenOrder): string {
	const { type, label, note } = order.delivery
	if (type === "pickup") return t("kitchen.delivery.pickup")
	if (type === "note") return note ?? label ?? t("kitchen.deliveryType.note")
	return label ?? t(`kitchen.deliveryType.${type}`)
}

/** A cash order the desk has not yet been paid for. */
function owesCash(order: KitchenOrder): boolean {
	return order.payment.choice === "cash" && !order.payment.paid
}

function paymentKey(order: KitchenOrder): string | null {
	const { choice, wallet_owner_type: owner, paid } = order.payment
	if (!paid) return null
	if (choice === "wallet") return owner === "company" ? "companyWallet" : "wallet"
	if (choice === "card") return "card"
	if (choice === "cash") return "cash"
	return null
}

// ── Actions ─────────────────────────────────────────────────────────────────
const busyId = ref<number | null>(null)
const target = ref<KitchenOrder | null>(null)
const cashVisible = ref(false)
const cashError = ref<string | null>(null)
const turnDownVisible = ref(false)
const turnDownError = ref<string | null>(null)

/** Runs one action; true when it worked. A 409 and a success both read the list again. */
async function run(order: KitchenOrder, action: () => Promise<unknown>, success: string, onUnprocessable?: (error: ApiError) => void): Promise<boolean> {
	busyId.value = order.id
	let worked = false
	let reload = true
	try {
		await action()
		message.success(success)
		worked = true
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status === 422 && onUnprocessable) {
			onUnprocessable(caught)
			reload = false
		} else if (caught.status === 403) {
			message.error(t("resourceCrud.mutations.permissionError"))
		} else {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	} finally {
		try {
			if (reload) await load()
			if (worked) emit("changed")
		} finally {
			busyId.value = null
		}
	}
	return worked
}

function confirm(order: KitchenOrder): void {
	if (owesCash(order)) {
		target.value = order
		cashError.value = null
		cashVisible.value = true
		return
	}
	void run(order, () => confirmKitchenOrder(order.id), t("kitchen.reception.confirmed"))
}

async function submitCash(currency: string): Promise<void> {
	const order = target.value
	if (!order) return
	cashError.value = null
	const worked = await run(order, () => confirmKitchenOrder(order.id, currency), t("kitchen.reception.confirmed"), error => {
		cashError.value = error.data?.message ?? t("resourceCrud.mutations.genericError")
	})
	// A 409 means someone else handled it: the list is read again, so the dialog has nothing left to confirm.
	if (worked || !orders.value.some(row => row.id === order.id)) cashVisible.value = false
}

function openTurnDown(order: KitchenOrder): void {
	target.value = order
	turnDownError.value = null
	turnDownVisible.value = true
}

async function submitTurnDown(reason: string): Promise<void> {
	const order = target.value
	if (!order) return
	turnDownError.value = null
	const worked = await run(order, () => turnDownKitchenOrder(order.id, reason), t("kitchen.reception.turnedDown"), error => {
		turnDownError.value = error.data?.errors?.reason?.[0] ?? error.data?.message ?? t("resourceCrud.mutations.genericError")
	})
	if (worked || !orders.value.some(row => row.id === order.id)) turnDownVisible.value = false
}

defineExpose({ orders, meta, page, load })
</script>
