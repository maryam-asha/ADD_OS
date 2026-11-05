<!-- src/add-os/modules/inventory/components/StockLinesEditor.vue -->
<template>
	<div class="flex flex-col gap-3">
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			<n-input v-model:value="scanned" :placeholder="t('inventory.operations.scan')" dir="ltr" clearable @keydown.enter.prevent="scan">
				<template #prefix><Icon name="carbon:barcode" :size="16" /></template>
			</n-input>
			<ItemSelect v-model:value="picking" kind="stock" :placeholder="t('inventory.operations.addLine')" @picked="add" />
		</div>
		<p v-if="scanProblem" class="text-xs text-error">{{ scanProblem }}</p>

		<div v-if="lines.length" class="overflow-x-auto rounded-xl border border-border-subtle">
			<table class="w-full text-sm">
				<thead class="bg-surface-sunken text-xs text-secondary">
					<tr>
						<th class="p-2 text-start">{{ t("inventory.stock.item") }}</th>
						<th class="p-2 text-start">{{ t("inventory.operations.unit") }}</th>
						<th v-if="kind === 'adjust'" class="p-2 text-end">{{ t("inventory.operations.book") }}</th>
						<th class="p-2 text-start">{{ kind === "adjust" ? t("inventory.operations.counted") : t("inventory.operations.quantity") }}</th>
						<th v-if="kind === 'adjust'" class="p-2 text-end">{{ t("inventory.operations.difference") }}</th>
						<th v-if="costed" class="p-2 text-start">{{ t("inventory.operations.unitCost") }}</th>
						<th class="p-2" />
					</tr>
				</thead>
				<tbody>
					<tr v-for="(line, index) in lines" :key="line.itemId" class="border-t border-border-subtle">
						<td class="p-2">
							<span class="font-medium">{{ localized(line.item.name) }}</span>
							<span class="ms-2 font-mono text-xs text-secondary" dir="ltr">{{ line.item.sku }}</span>
						</td>
						<td class="min-w-32 p-2">
							<n-select :value="line.unitId" :options="unitOptions(line.item)" size="small" @update:value="(v: number) => patchLine(index, { unitId: v })" />
						</td>
						<td v-if="kind === 'adjust'" class="add-numeric p-2 text-end">{{ quantity(book[line.itemId] ?? "0") }}</td>
						<td class="min-w-28 p-2">
							<n-input-number :value="line.amount" :min="0" size="small" dir="ltr" @update:value="(v: number | null) => patchLine(index, { amount: v })" />
						</td>
						<td v-if="kind === 'adjust'" class="add-numeric p-2 text-end" dir="ltr">{{ difference(line) }}</td>
						<td v-if="costed" class="min-w-28 p-2">
							<n-input-number :value="line.unitCost" :min="0" size="small" dir="ltr" clearable @update:value="(v: number | null) => patchLine(index, { unitCost: v })" />
						</td>
						<td class="p-2 text-end">
							<n-button size="tiny" quaternary circle :aria-label="t('inventory.operations.removeLine')" @click="lines = lines.filter((_, i) => i !== index)">
								<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
							</n-button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Item, StockOperationKind } from "@/add-os/modules/inventory/types/inventory"
import type { LineDraft } from "@/add-os/modules/inventory/utils/stockLines"
import { NButton, NInput, NInputNumber, NSelect } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import ItemSelect from "@/add-os/modules/inventory/components/ItemSelect.vue"
import { localized, quantity } from "@/add-os/modules/inventory/utils/display"
import { addItemLine, unitChoices } from "@/add-os/modules/inventory/utils/stockLines"
import { findItemByBarcode, listBalances } from "@/add-os/services/inventory"
import Icon from "@/components/common/Icon.vue"

/**
 * The lines of a stock operation: an item added by scanning its barcode
 * (Enter) or by search, in its main unit or one of its packs. A count
 * shows what the book holds in the warehouse — in the main unit — and the
 * difference the count makes.
 */
const props = defineProps<{ kind: StockOperationKind; warehouseId: number | null }>()
const lines = defineModel<LineDraft[]>("lines", { required: true })
const { t } = useI18n()

const scanned = ref("")
const scanProblem = ref("")
const picking = ref<number | null>(null)
/** On hand per item in the chosen warehouse, for a count. */
const book = ref<Record<number, string>>({})

const costed = computed(() => props.kind === "receive" || props.kind === "adjust")

function unitOptions(item: Item): SelectOption[] {
	return unitChoices(item).map(choice => ({ label: choice.label, value: choice.value }))
}

function add(item: Item | null) {
	if (!item) return
	lines.value = addItemLine(lines.value, item)
	picking.value = null
}

async function scan() {
	const code = scanned.value.trim()
	scanProblem.value = ""
	if (!code) return
	const item = await findItemByBarcode(code)
	if (!item) scanProblem.value = t("inventory.operations.notFound")
	else if (item.kind !== "stock") scanProblem.value = t("inventory.operations.notStock")
	else add(item)
	scanned.value = ""
}

function patchLine(index: number, patch: Partial<LineDraft>) {
	lines.value = lines.value.map((line, i) => (i === index ? { ...line, ...patch } : line))
}

function difference(line: LineDraft): string {
	if (line.amount === null) return "—"
	const factor = Number(unitChoices(line.item).find(choice => choice.value === line.unitId)?.factor ?? 1)
	const diff = line.amount * factor - Number(book.value[line.itemId] ?? 0)
	return `${diff > 0 ? "+" : ""}${quantity(String(diff))}`
}

// A count reads what the warehouse holds for each item on its lines.
watch(
	() => [props.kind, props.warehouseId, lines.value.map(line => line.itemId).join()] as const,
	async ([kind, warehouseId]) => {
		if (kind !== "adjust" || !warehouseId) return
		const missing = lines.value.filter(line => !(line.itemId in book.value))
		await Promise.all(
			missing.map(line =>
				quietly(
					() => listBalances({ warehouse_id: warehouseId, item_id: line.itemId, include_empty: true }),
					result => (book.value = { ...book.value, [line.itemId]: result.data[0]?.quantity ?? "0" })
				)
			)
		)
	},
	{ immediate: true }
)

watch(
	() => props.warehouseId,
	() => (book.value = {})
)
</script>
