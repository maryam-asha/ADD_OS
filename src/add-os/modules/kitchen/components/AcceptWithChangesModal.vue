<!-- src/add-os/modules/kitchen/components/AcceptWithChangesModal.vue -->
<template>
	<FormModal v-model:show="show" :title="t('kitchen.adjust.title', { id: orderLabel })" size="sm">
		<div v-if="order" class="flex flex-col gap-4">
			<p class="text-sm text-[var(--add-text-secondary)]">{{ t("kitchen.adjust.hint") }}</p>

			<ul class="flex flex-col gap-3">
				<li v-for="line in order.lines" :key="line.id" class="flex items-center justify-between gap-3" :data-line="line.id">
					<div class="flex min-w-0 flex-col">
						<span dir="auto" class="font-medium" :class="{ 'line-through text-[var(--add-text-muted)]': quantities[line.id] === 0 }">
							{{ line.name ?? t("kitchen.card.unnamedItem") }}
						</span>
						<span class="text-xs text-[var(--add-text-muted)]">
							{{ t("kitchen.adjust.ordered", { quantity: formatNumber(line.ordered_quantity) }) }}
							· {{ t("kitchen.card.total", { points: formatNumber(line.unit_price_points) }) }}
						</span>
					</div>
					<n-input-number
						:value="quantities[line.id]"
						:min="0"
						:max="line.ordered_quantity"
						:precision="0"
						size="small"
						class="w-28 shrink-0"
						data-test="line-quantity"
						@update:value="value => set(line.id, value)"
					/>
				</li>
			</ul>

			<div class="flex flex-col gap-1 border-t border-[var(--add-border)] pt-3 text-sm">
				<div class="flex justify-between">
					<span>{{ t("kitchen.adjust.originalTotal") }}</span>
					<span>{{ t("kitchen.card.total", { points: formatNumber(originalTotal) }) }}</span>
				</div>
				<div class="flex justify-between font-bold">
					<span>{{ t("kitchen.adjust.newTotal") }}</span>
					<span data-test="new-total">{{ t("kitchen.card.total", { points: formatNumber(newTotal) }) }}</span>
				</div>
			</div>

			<n-alert v-if="error" type="error" show-icon data-test="adjust-error">{{ error }}</n-alert>
			<n-alert v-else-if="noneLeft" type="warning" show-icon data-test="none-left">{{ t("kitchen.adjust.noneLeft") }}</n-alert>
			<n-alert v-else-if="changes.length === 0" type="info" show-icon data-test="unchanged">{{ t("kitchen.adjust.unchanged") }}</n-alert>
			<n-alert v-else type="info" show-icon data-test="outcome">
				{{ order.payment.paid ? t("kitchen.adjust.refund", { points: formatNumber(originalTotal - newTotal) }) : t("kitchen.adjust.onBill") }}
			</n-alert>
		</div>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("resourceCrud.form.cancel") }}</n-button>
				<n-button type="primary" :loading :disabled="noneLeft" data-test="adjust-submit" @click="submit">{{ t("kitchen.adjust.submit") }}</n-button>
			</div>
		</template>
	</FormModal>
</template>

<script setup lang="ts">
import type { KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import type { AcceptLine } from "@/add-os/services/kitchen"
import { NAlert, NButton, NInputNumber } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import FormModal from "@/add-os/components/page/FormModal.vue"
import { formatNumber } from "@/add-os/utils/format"

/**
 * Accepts a pending order with less of some items, or without them
 * (ADDCore `AcceptKitchenOrderLinesRequest`): each line from 0 to what the
 * member ordered. Only the lines changed are sent; the rest are made as
 * ordered. Every line at 0 is refused here as by the server — that is a
 * rejection. A server 422 lands in `serverError`.
 */
const props = defineProps<{
	order: KitchenOrder | null
	loading?: boolean
	serverError?: string | null
}>()
const emit = defineEmits<{ submit: [lines: AcceptLine[]] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()

/** Line id → quantity to make. */
const quantities = ref<Record<number, number>>({})

const orderLabel = computed(() => (props.order === null ? "" : formatNumber(props.order.id, { grouping: false })))
const error = computed(() => props.serverError ?? null)

watch(show, open => {
	if (open && props.order) quantities.value = Object.fromEntries(props.order.lines.map(line => [line.id, line.ordered_quantity]))
})

function set(lineId: number, value: number | null) {
	quantities.value = { ...quantities.value, [lineId]: Math.max(0, Math.floor(value ?? 0)) }
}

const originalTotal = computed(() => (props.order?.lines ?? []).reduce((sum, line) => sum + line.ordered_quantity * line.unit_price_points, 0))
const newTotal = computed(() => (props.order?.lines ?? []).reduce((sum, line) => sum + (quantities.value[line.id] ?? line.ordered_quantity) * line.unit_price_points, 0))

const changes = computed<AcceptLine[]>(() =>
	(props.order?.lines ?? [])
		.filter(line => (quantities.value[line.id] ?? line.ordered_quantity) !== line.ordered_quantity)
		.map(line => ({ id: line.id, quantity: quantities.value[line.id] ?? line.ordered_quantity }))
)

const noneLeft = computed(() => (props.order?.lines ?? []).every(line => (quantities.value[line.id] ?? line.ordered_quantity) === 0))

function submit() {
	if (noneLeft.value) return
	emit("submit", changes.value)
}
</script>
