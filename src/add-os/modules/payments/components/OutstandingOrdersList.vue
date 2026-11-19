<!-- src/add-os/modules/payments/components/OutstandingOrdersList.vue -->
<template>
	<ul class="flex flex-col gap-2" data-test="outstanding-orders">
		<li v-if="ownAmount" class="flex justify-between gap-3 text-sm" data-test="own-share">
			<span class="text-[var(--add-text-secondary)]">{{ t("collectPayment.ownShare") }}</span>
			<bdi dir="ltr" class="add-numeric">{{ formatAmount(ownAmount) }}</bdi>
		</li>
		<li
			v-for="order in orders"
			:key="order.id"
			class="flex flex-col gap-1.5 rounded-lg border border-[var(--add-border)] bg-[var(--add-surface)] p-2.5"
			:data-order="order.id"
		>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<span class="flex flex-wrap items-center gap-2">
					<span class="text-sm font-semibold">{{ order.title }}</span>
					<n-tag v-if="order.status" size="tiny" :bordered="false">{{ t(`kitchen.status.${order.status}`) }}</n-tag>
					<span v-if="order.ordered_at" class="font-mono text-xs text-[var(--add-text-muted)]">{{ formatDateTime(order.ordered_at) }}</span>
				</span>
				<span class="flex flex-col items-end">
					<bdi dir="ltr" class="text-sm font-bold add-numeric">{{ formatAmount(order.amount) }}</bdi>
					<span class="text-xs text-[var(--add-text-muted)]">{{ t("collectPayment.duePoints", { points: formatNumber(order.amount_points) }) }}</span>
				</span>
			</div>
			<KitchenOrderLines v-if="order.lines?.length" :lines="order.lines" show-points class="text-xs text-[var(--add-text-secondary)]" />
			<p v-if="order.note" class="text-xs text-[var(--add-text-secondary)]" data-test="order-note">
				<span class="font-medium">{{ t("kitchen.card.memberNote") }}:</span> {{ order.note }}
			</p>
		</li>
	</ul>
</template>

<script setup lang="ts">
import type { OutstandingKitchenOrder } from "@/add-os/modules/booking/types/reception"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import KitchenOrderLines from "@/add-os/modules/kitchen/components/KitchenOrderLines.vue"
import { formatCurrency, formatDateTime, formatNumber, isCurrencyCode } from "@/add-os/utils/format"

/**
 * The café orders inside a session's or booking's outstanding line, each with
 * its items, the member's note and what it costs — collected together with
 * the bill (ADDCore `OutstandingItems`). `ownAmount` is the bill's own share,
 * shown first when it owes one.
 */
defineProps<{
	orders: OutstandingKitchenOrder[]
	ownAmount?: { value: string, currency: string } | null
}>()

const { t } = useI18n()

function formatAmount(value: { value: string, currency: string }): string {
	const fractionDigits = value.value.split(".")[1]?.length ?? 0
	return formatCurrency(value.value, isCurrencyCode(value.currency) ? { currency: value.currency, fractionDigits } : { fractionDigits })
}
</script>
