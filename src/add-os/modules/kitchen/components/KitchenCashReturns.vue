<!-- src/add-os/modules/kitchen/components/KitchenCashReturns.vue -->
<template>
	<section v-if="rows.length > 0" class="flex flex-col gap-3" data-test="cash-returns">
		<div class="flex flex-col gap-1">
			<h3 class="text-base font-bold">{{ t("kitchen.cashReturns.title") }}</h3>
			<p class="text-sm text-stone-600">{{ t("kitchen.cashReturns.description") }}</p>
		</div>

		<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
			<n-card v-for="row in rows" :key="row.order.id" size="small" :data-return="row.order.id">
				<div class="flex flex-col gap-2">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<span class="font-bold">{{ t("kitchen.card.order", { id: formatNumber(row.order.id, { grouping: false }) }) }}</span>
						<n-tag type="warning" size="small" :bordered="false">{{ t("kitchen.cashReturns.owed") }}</n-tag>
					</div>

					<div class="flex flex-col">
						<span class="font-semibold" dir="auto">{{ row.order.member?.name ?? t("kitchen.card.unknownMember") }}</span>
						<bdi v-if="row.order.member?.phone" dir="ltr" class="text-xs text-[var(--add-text-secondary)] add-numeric">{{ row.order.member.phone }}</bdi>
					</div>

					<div class="flex flex-col gap-1">
						<span v-if="receivedText(row)" class="font-bold" data-test="received">{{ t("kitchen.cashReturns.received", { amount: receivedText(row) }) }}</span>
						<span class="text-sm text-[var(--add-text-secondary)]" data-test="points">{{ t("kitchen.cashReturns.points", { points: formatNumber(row.points) }) }}</span>
					</div>

					<p class="text-sm" dir="auto" data-test="why">{{ whyText(row.order) }}</p>

					<div class="flex flex-wrap gap-2">
						<n-popconfirm :positive-text="t('kitchen.cashReturns.returned.confirm')" :negative-text="t('kitchen.cashReturns.cancel')" @positive-click="act(row, 'returned')">
							<template #trigger>
								<n-button size="small" type="primary" :disabled="busyId === row.order.id" :loading="busyId === row.order.id" data-action="returned">
									{{ t("kitchen.cashReturns.returned.label") }}
								</n-button>
							</template>
							{{ t("kitchen.cashReturns.returned.prompt", { amount: receivedText(row) ?? t("kitchen.cashReturns.points", { points: formatNumber(row.points) }) }) }}
						</n-popconfirm>
						<n-popconfirm :positive-text="t('kitchen.cashReturns.credit.confirm')" :negative-text="t('kitchen.cashReturns.cancel')" @positive-click="act(row, 'credit')">
							<template #trigger>
								<n-button size="small" secondary :disabled="busyId === row.order.id" data-action="credit">
									{{ t("kitchen.cashReturns.credit.label") }}
								</n-button>
							</template>
							{{ t("kitchen.cashReturns.credit.prompt", { points: formatNumber(row.points) }) }}
						</n-popconfirm>
					</div>
				</div>
			</n-card>
		</div>

		<div v-if="meta && meta.last_page > 1" class="flex justify-end">
			<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
		</div>
	</section>
</template>

<script setup lang="ts">
import type { CashReturnRow, KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import type { PaginationMeta } from "@/add-os/services/pagination"
import { NButton, NCard, NPagination, NPopconfirm, NTag, useMessage } from "naive-ui"
import { onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { creditCashAsPoints, listCashReturns, markCashReturned } from "@/add-os/services/kitchen"
import { formatCurrency, formatNumber, isCurrencyCode } from "@/add-os/utils/format"

/**
 * Cash taken for kitchen orders that were then not made: the member is owed it
 * back. Reception hands it back, or credits it as points when the member asks.
 *
 * Shown only while something is owed. Like the confirm queue, nothing is spliced
 * in place: every action, worked or not, reads the list again, since a colleague
 * may have settled the row first (409) and the server's list is the truth.
 */
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const message = useMessage()

const rows = ref<CashReturnRow[]>([])
const meta = ref<PaginationMeta | null>(null)
const page = ref(1)
const isLoading = ref(false)
const busyId = ref<number | null>(null)

async function load(): Promise<void> {
	isLoading.value = true
	try {
		const result = await listCashReturns({ page: page.value })
		rows.value = result.data
		meta.value = result.meta
	} catch (caught) {
		// A list that cannot load is the same as nothing owed here: the section hides.
		if (!(caught instanceof ApiError)) throw caught
		rows.value = []
		meta.value = null
	} finally {
		isLoading.value = false
	}
}

onMounted(load)
watch(page, () => void load())

/** What was taken, as the member handed it over; null when only points are known. */
function receivedText(row: CashReturnRow): string | null {
	if (row.received_amount === null) return null
	return formatCurrency(row.received_amount, isCurrencyCode(row.received_currency) ? { currency: row.received_currency } : {})
}

/** Why the order was not made: the reason reception gave, or who cancelled it. */
function whyText(order: KitchenOrder): string {
	if (order.status === "rejected") return order.rejection_reason ? t("kitchen.cashReturns.why.rejected", { reason: order.rejection_reason }) : t("kitchen.cashReturns.why.rejectedNoReason")
	if (order.cancelled_by === "member") return t("kitchen.cashReturns.why.cancelledByMember")
	return t("kitchen.cashReturns.why.expired")
}

async function act(row: CashReturnRow, kind: "returned" | "credit"): Promise<void> {
	busyId.value = row.order.id
	let worked = false
	try {
		await (kind === "returned" ? markCashReturned(row.order.id) : creditCashAsPoints(row.order.id))
		message.success(t(kind === "returned" ? "kitchen.cashReturns.returned.done" : "kitchen.cashReturns.credit.done"))
		worked = true
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
		else message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		try {
			await load()
			if (worked) emit("changed")
		} finally {
			busyId.value = null
		}
	}
}
</script>
