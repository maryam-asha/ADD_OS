<!-- src/add-os/modules/kitchen/components/KitchenOrderCard.vue -->
<template>
	<n-card size="small" :data-order="order.id" class="kitchen-order-card">
		<div class="flex flex-col gap-2">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<span class="font-bold">{{ t("kitchen.card.order", { id: formatNumber(order.id, { grouping: false }) }) }}</span>
				<span class="text-secondary text-sm" data-test="waited">
					<Icon name="carbon:time" :size="14" class="align-middle" />
					{{ t(countKey("kitchen.card.waited", waitedMinutes), { n: formatNumber(waitedMinutes) }) }}
				</span>
			</div>

			<div class="flex items-start gap-2" data-test="place">
				<Icon :name="DELIVERY_ICON[order.delivery.type]" :size="16" class="mt-1 shrink-0" />
				<!-- A note is the member's own words, often long and often Arabic: shown in full, wrapped, in its own direction. -->
				<p v-if="order.delivery.type === 'note'" dir="auto" class="whitespace-pre-wrap break-words" data-test="note">{{ order.delivery.note ?? order.delivery.label }}</p>
				<span v-else>{{ place }}</span>
			</div>

			<div class="flex items-center gap-2">
				<Icon name="carbon:user" :size="16" class="shrink-0" />
				<span dir="auto">{{ order.member?.name ?? t("kitchen.card.unknownMember") }}</span>
			</div>

			<n-tag v-if="paymentKey" size="small" :type="order.payment.choice === 'bill' ? 'default' : 'success'" class="self-start" data-test="payment">{{ t(paymentKey) }}</n-tag>

			<n-tag v-if="order.adjusted" size="small" type="warning" :bordered="false" class="self-start" data-test="adjusted">
				<template #icon><Icon name="carbon:edit" :size="14" /></template>
				{{ t("kitchen.card.adjusted") }}
			</n-tag>

			<KitchenOrderLines :lines="order.lines" />

			<div class="flex flex-wrap items-center justify-between gap-2">
				<span class="flex flex-wrap items-baseline gap-2">
					<span class="font-bold" data-test="total">{{ t("kitchen.card.total", { points: formatNumber(order.total_points) }) }}</span>
					<span v-if="order.adjusted" class="text-xs text-[var(--add-text-muted)] line-through" data-test="ordered-total">{{ t("kitchen.card.orderedTotal", { points: formatNumber(order.ordered_total_points) }) }}</span>
				</span>
				<span v-if="order.timestamps.submitted_at" class="text-secondary text-sm" data-test="submitted">
					{{ t("kitchen.card.submitted", { time: formatTime(order.timestamps.submitted_at) }) }}
				</span>
			</div>

			<div v-if="canManage && actions.length > 0" class="flex flex-wrap gap-2" data-test="actions">
				<n-button v-for="action in actions" :key="action.key" size="small" :type="action.type" :disabled="busy" :data-action="action.key" @click="fire(action.key)">
					{{ t(`kitchen.actions.${action.key}`) }}
				</n-button>
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import type { DeliveryType, KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import { NButton, NCard, NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import KitchenOrderLines from "@/add-os/modules/kitchen/components/KitchenOrderLines.vue"
import { paymentLabelKey } from "@/add-os/modules/kitchen/utils/payment"
import { countKey, formatNumber, formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

type CardAction = "accept" | "adjust" | "reject" | "ready" | "deliver"

const props = defineProps<{
	order: KitchenOrder
	/** `kitchen-orders.manage`: without it the card has no buttons at all. */
	canManage: boolean
	/** The board's clock (ms), ticking once a minute. */
	now: number
	/** When the board last read its orders (ms); `waited_seconds` is as of then. */
	fetchedAt: number
	/** An action on this card is in flight. */
	busy?: boolean
}>()

const emit = defineEmits<{ accept: []; adjust: []; reject: []; ready: []; deliver: [] }>()

const { t } = useI18n()

function fire(action: CardAction) {
	if (action === "accept") emit("accept")
	else if (action === "adjust") emit("adjust")
	else if (action === "reject") emit("reject")
	else if (action === "ready") emit("ready")
	else emit("deliver")
}

const DELIVERY_ICON: Record<DeliveryType, string> = {
	desk: "carbon:workspace",
	space: "carbon:building",
	pickup: "carbon:shopping-bag",
	note: "carbon:location"
}

const paymentKey = computed(() => paymentLabelKey(props.order))

/** The desk's label or the room's title as the API names them; pickup is the counter, in our own words. */
const place = computed(() => {
	const { type, label } = props.order.delivery
	if (type === "pickup") return t("kitchen.delivery.pickup")
	return label ?? t(`kitchen.deliveryType.${type}`)
})

/** Whole minutes waited, counted on from the API's figure as the board's clock moves. */
const waitedMinutes = computed(() => Math.floor((props.order.waited_seconds + Math.max(0, props.now - props.fetchedAt) / 1000) / 60))

/**
 * What the kitchen can do next. Ready is a pickup step only — an order the
 * kitchen carries to a desk or room goes straight to delivered.
 */
const actions = computed<{ key: CardAction; type: "primary" | "error" | "default" }[]>(() => {
	switch (props.order.status) {
		case "pending":
			return [
				{ key: "accept", type: "primary" },
				{ key: "adjust", type: "default" },
				{ key: "reject", type: "error" }
			]
		case "preparing":
			return props.order.delivery.type === "pickup"
				? [
						{ key: "ready", type: "primary" },
						{ key: "deliver", type: "default" }
					]
				: [{ key: "deliver", type: "primary" }]
		case "ready":
			return [{ key: "deliver", type: "primary" }]
		default:
			return []
	}
})
</script>
