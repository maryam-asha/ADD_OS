<!-- src/add-os/modules/inventory/components/WarehouseMinimumsEditor.vue -->
<template>
	<section class="mt-6" data-test="minimums">
		<h3 class="mb-1 text-sm font-semibold">{{ t("inventory.warehouses.minimums.title") }}</h3>
		<p class="mb-3 text-xs text-secondary">{{ t("inventory.warehouses.minimums.description") }}</p>

		<n-alert v-if="loadError" type="error" :title="t('inventory.warehouses.minimums.loadError')" class="mb-3" />
		<p v-else-if="rows.length === 0 && !loading" class="mb-3 text-sm">{{ t("inventory.warehouses.minimums.empty") }}</p>

		<div v-for="(row, index) in rows" :key="row.itemId" class="mb-2 flex flex-wrap items-end gap-3 rounded-xl border border-border-subtle bg-surface-sunken p-3" :data-item="row.itemId">
			<div class="min-w-48 flex-1">
				<span class="block text-xs text-secondary">{{ t("inventory.warehouses.minimums.item") }}</span>
				<span class="mt-1 block font-medium">{{ row.item ? localized(row.item.name) : `#${row.itemId}` }}</span>
				<span v-if="row.item" class="font-mono text-xs text-secondary" dir="ltr">{{ row.item.sku }}</span>
			</div>
			<label class="w-36">
				<span class="mb-1 block text-xs text-secondary">{{ t("inventory.warehouses.minimums.minimum") }}</span>
				<n-input-number
					v-model:value="row.minimum"
					:min="0"
					:precision="precisionOf(row)"
					:disabled="!mayManage"
					size="small"
					dir="ltr"
					data-test="minimum-input"
				/>
			</label>
			<div v-if="row.onHand !== null" class="w-28">
				<span class="mb-1 block text-xs text-secondary">{{ t("inventory.warehouses.minimums.onHand") }}</span>
				<span class="add-numeric block py-1 text-sm" dir="ltr">{{ quantity(row.onHand) }}</span>
			</div>
			<n-tag v-if="row.below" type="warning" size="small">{{ t("inventory.warehouses.minimums.below") }}</n-tag>
			<n-button v-if="mayManage" size="small" quaternary type="error" data-test="minimum-remove" @click="drop(index)">
				{{ t("inventory.warehouses.minimums.remove") }}
			</n-button>
		</div>

		<div v-if="mayManage" class="mt-3 flex flex-wrap items-center gap-3">
			<ItemSelect v-model:value="picking" kind="stock" :placeholder="t('inventory.warehouses.minimums.add')" class="sm:w-72!" @picked="add" />
			<n-button type="primary" :loading="saving" :disabled="lines.length === 0" data-test="minimums-save" @click="save">
				{{ t("inventory.warehouses.minimums.save") }}
			</n-button>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { Item } from "@/add-os/modules/inventory/types/inventory"
import type { WarehouseMinimum } from "@/add-os/services/inventory"
import { NAlert, NButton, NInputNumber, NTag, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canManageWarehouses } from "@/add-os/config/permissions"
import ItemSelect from "@/add-os/modules/inventory/components/ItemSelect.vue"
import { localized, quantity } from "@/add-os/modules/inventory/utils/display"
import { ApiError } from "@/add-os/services/api"
import { getItem, getWarehouseMinimums, setWarehouseMinimums } from "@/add-os/services/inventory"

/**
 * The least a warehouse should hold of each item. Rows are item + minimum;
 * the quantity takes decimals only when the item's unit allows fractions. A
 * minimum of 0 (a cleared input counts as 0, or a removed row) removes the
 * item's row on the server, which the screen then reloads from the answer.
 * Saving is off when there is nothing to send. Read-only without
 * `inventory.warehouses.manage`.
 *
 * Items are picked from the whole stock catalogue, not from what the
 * warehouse holds: a minimum is most useful for an item it does not hold yet.
 */

interface Row {
	itemId: number
	item: Item | null
	minimum: number | null
	onHand: string | null
	below: boolean
}

const props = defineProps<{ warehouseId: number }>()
const { t } = useI18n()
const message = useMessage()
const mayManage = computed(() => canManageWarehouses())

const rows = ref<Row[]>([])
const removed = ref<number[]>([])
const loading = ref(false)
const saving = ref(false)
const loadError = ref(false)
const picking = ref<number | null>(null)

function precisionOf(row: Row): number {
	return row.item?.unit?.allows_fractions ? 3 : 0
}

async function toRows(minimums: WarehouseMinimum[]): Promise<Row[]> {
	return Promise.all(minimums.map(async (entry) => {
		let item: Item | null = null
		try {
			item = await getItem(entry.item_id)
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
		}
		return { itemId: entry.item_id, item, minimum: Number(entry.minimum), onHand: entry.on_hand, below: entry.below }
	}))
}

async function load() {
	loading.value = true
	loadError.value = false
	try {
		rows.value = await toRows(await getWarehouseMinimums(props.warehouseId))
		removed.value = []
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadError.value = true
	} finally {
		loading.value = false
	}
}

function add(item: Item | null) {
	picking.value = null
	if (!item || rows.value.some(row => row.itemId === item.id)) return
	// An item taken off and put back is no longer a removal: sending it twice would be a duplicate item_id (422).
	removed.value = removed.value.filter(id => id !== item.id)
	rows.value.push({ itemId: item.id, item, minimum: null, onHand: null, below: false })
}

function drop(index: number) {
	const [row] = rows.value.splice(index, 1)
	if (row && row.onHand !== null) removed.value.push(row.itemId)
}

/**
 * What a save sends. A cleared input is a 0, which removes the row; a row the
 * server never had that is still 0 or empty has nothing to say, so it is left out.
 */
const lines = computed(() => {
	const kept = rows.value.flatMap((row) => {
		const minimum = row.minimum ?? 0
		return row.onHand === null && minimum === 0 ? [] : [{ item_id: row.itemId, minimum: String(minimum) }]
	})
	return [...kept, ...removed.value.map(id => ({ item_id: id, minimum: "0" }))]
})

async function save() {
	if (lines.value.length === 0) return
	saving.value = true
	try {
		const saved = await setWarehouseMinimums(props.warehouseId, lines.value)
		rows.value = await toRows(saved)
		removed.value = []
		message.success(t("inventory.warehouses.minimums.saved"))
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("inventory.warehouses.minimums.saveError"))
	} finally {
		saving.value = false
	}
}

watch(() => props.warehouseId, () => void load(), { immediate: true })

defineExpose({ rows, removed, lines, add, drop, save, precisionOf })
</script>
