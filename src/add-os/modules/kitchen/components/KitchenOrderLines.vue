<!-- src/add-os/modules/kitchen/components/KitchenOrderLines.vue -->
<template>
	<ul class="flex flex-col gap-1" data-test="lines">
		<li v-for="(line, index) in lines" :key="index" class="flex flex-wrap items-center justify-between gap-2" :data-line="line.id">
			<span class="flex flex-wrap items-center gap-1">
				<span :class="{ 'line-through text-[var(--add-text-muted)]': line.quantity === 0 }">
					{{ t("kitchen.card.line", { name: line.name ?? t("kitchen.card.unnamedItem"), quantity: formatNumber(line.quantity) }) }}
				</span>
				<n-tag v-if="line.quantity === 0" size="tiny" type="warning" :bordered="false" data-test="line-removed">{{ t("kitchen.card.removed") }}</n-tag>
				<span v-else-if="changed(line)" class="text-xs text-[var(--add-text-muted)]" data-test="line-ordered">({{ t("kitchen.card.orderedQuantity", { quantity: formatNumber(line.ordered_quantity) }) }})</span>
			</span>
			<span v-if="showPoints">{{ t("kitchen.card.total", { points: formatNumber(line.line_points) }) }}</span>
		</li>
	</ul>
</template>

<script setup lang="ts">
import type { KitchenOrderLine } from "@/add-os/modules/kitchen/types/kitchen"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { formatNumber } from "@/add-os/utils/format"

/**
 * An order's items. A line the kitchen accepted with less of shows what the
 * member ordered beside it; a line it took off (0) is struck through.
 */
defineProps<{
	lines: KitchenOrderLine[]
	/** Each line's points at the end of its row — the history's full view. */
	showPoints?: boolean
}>()

const { t } = useI18n()

/** `ordered_quantity` is absent on an order read before the API sent it: nothing changed then. */
function changed(line: KitchenOrderLine): boolean {
	return line.ordered_quantity !== undefined && line.ordered_quantity !== line.quantity
}
</script>
