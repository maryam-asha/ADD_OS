<!-- src/add-os/modules/inventory/components/StockItemSelect.vue -->
<template>
	<n-select
		v-model:value="value"
		:options
		:loading="searching"
		:placeholder="warehouseId ? t('inventory.operations.pickStockItem') : t('inventory.operations.pickWarehouseFirst')"
		:disabled="!warehouseId"
		remote
		filterable
		clearable
		@search="search"
		@focus="search('')"
	/>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Item, StockBalance } from "@/add-os/modules/inventory/types/inventory"
import { NSelect } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { localized, quantity } from "@/add-os/modules/inventory/utils/display"
import { getItem, listBalances } from "@/add-os/services/inventory"

/**
 * Choosing an item that is on hand in a warehouse — what an issue, a
 * write-off or a transfer can take — searched by name, code or barcode,
 * each with its balance. Emits the whole item (its packs included), read
 * when it is picked.
 */
const props = defineProps<{ warehouseId: number | null }>()
const emit = defineEmits<{ picked: [item: Item] }>()
const value = defineModel<number | null>("value", { required: true })
const { t } = useI18n()
const found = ref<StockBalance[]>([])
const searching = ref(false)

const options = computed<SelectOption[]>(() =>
	found.value.map(balance => ({
		label: `${localized(balance.item.name)} · ${balance.item.sku} — ${t("inventory.operations.onHand", { n: `${quantity(balance.quantity)} ${localized(balance.item.unit.name)}` })}`,
		value: balance.item.id
	}))
)

async function search(term: string) {
	if (!props.warehouseId) return
	searching.value = true
	await quietly(
		() => listBalances({ warehouse_id: props.warehouseId, search: term.trim() || null, per_page: 25 }),
		result => (found.value = result.data)
	)
	searching.value = false
}

watch(
	() => props.warehouseId,
	() => (found.value = [])
)

watch(value, async id => {
	if (id === null) return
	await quietly(() => getItem(id), item => emit("picked", item))
})
</script>
