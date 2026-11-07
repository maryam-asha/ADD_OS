<!-- src/add-os/modules/inventory/components/StockLinesEditor.vue -->
<template>
	<div class="flex flex-col gap-3">
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			<n-input v-model:value="scanned" :placeholder="t('inventory.operations.scan')" dir="ltr" clearable @keydown.enter.prevent="scan">
				<template #prefix><Icon name="carbon:barcode" :size="16" /></template>
			</n-input>
			<StockItemSelect v-if="fromStock" v-model:value="picking" :warehouse-id @picked="add" />
			<ItemSelect v-else v-model:value="picking" kind="stock" :placeholder="t('inventory.operations.addLine')" @picked="add" />
		</div>
		<p v-if="scanProblem" class="text-xs text-error">{{ scanProblem }}</p>

		<div v-for="(line, index) in lines" :key="line.itemId" class="rounded-xl border border-border-subtle bg-surface-sunken p-3">
			<div class="flex flex-wrap items-end gap-3">
				<div class="min-w-48 flex-1">
					<span class="block text-xs text-secondary">{{ t("inventory.stock.item") }}</span>
					<span class="mt-1 block font-medium">{{ localized(line.item.name) }}</span>
					<span class="font-mono text-xs text-secondary" dir="ltr">{{ line.item.sku }}</span>
				</div>
				<label class="w-32">
					<span class="mb-1 block text-xs text-secondary">{{ kind === "adjust" ? t("inventory.operations.counted") : t("inventory.operations.quantity") }} *</span>
					<n-input-number :value="line.amount" :min="0" size="small" dir="ltr" @update:value="(v: number | null) => patchLine(index, { amount: v })" />
				</label>
				<label class="w-36">
					<span class="mb-1 block text-xs text-secondary">{{ t("inventory.operations.unit") }}</span>
					<n-select :value="line.unitId" :options="unitOptions(line.item)" size="small" @update:value="(v: number) => patchLine(index, { unitId: v })" />
				</label>
				<div class="w-28">
					<span class="mb-1 block text-xs text-secondary">{{ t("inventory.operations.inMainUnit") }}</span>
					<span class="add-numeric block rounded-md border border-border-subtle bg-surface px-2 py-1 text-sm" dir="ltr">{{ mainQuantity(line) }}</span>
				</div>
				<template v-if="kind === 'adjust'">
					<div class="w-24">
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.operations.book") }}</span>
						<span class="add-numeric block py-1 text-sm">{{ quantity(bookOf(line.itemId)) }}</span>
					</div>
					<div class="w-24">
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.operations.difference") }}</span>
						<span class="add-numeric block py-1 text-sm" dir="ltr">{{ difference(line) }}</span>
					</div>
				</template>
				<template v-if="costed">
					<label class="w-32">
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.operations.unitCost") }}{{ kind === "receive" ? " *" : "" }}</span>
						<n-input-number :value="line.unitCost" :min="0" size="small" dir="ltr" clearable @update:value="(v: number | null) => patchLine(index, { unitCost: v })" />
					</label>
					<div v-if="kind === 'receive'" class="w-28">
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.operations.totalValue") }}</span>
						<span class="add-numeric block rounded-md border border-border-subtle bg-surface px-2 py-1 text-sm" dir="ltr">{{ lineValue(line) }}</span>
					</div>
				</template>
				<n-button size="small" quaternary circle class="ms-auto" :aria-label="t('inventory.operations.removeLine')" @click="lines = lines.filter((_, i) => i !== index)">
					<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
				</n-button>
			</div>
			<label class="mt-3 block">
				<span class="mb-1 block text-xs text-secondary">{{ t("inventory.operations.lineNote") }}</span>
				<n-input :value="line.note ?? ''" :placeholder="t('inventory.operations.optional')" size="small" :maxlength="500" @update:value="(v: string) => patchLine(index, { note: v })" />
			</label>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { CostMethod, Item, StockOperationKind } from "@/add-os/modules/inventory/types/inventory"
import type { LineDraft } from "@/add-os/modules/inventory/utils/stockLines"
import { NButton, NInput, NInputNumber, NSelect } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import ItemSelect from "@/add-os/modules/inventory/components/ItemSelect.vue"
import StockItemSelect from "@/add-os/modules/inventory/components/StockItemSelect.vue"
import { localized, quantity } from "@/add-os/modules/inventory/utils/display"
import { addItemLine, lineValue, mainAmount, mainQuantity, unitChoices } from "@/add-os/modules/inventory/utils/stockLines"
import { findItemByBarcode, listBalances } from "@/add-os/services/inventory"
import Icon from "@/components/common/Icon.vue"

/**
 * The lines of a stock operation, one card per item: added by scanning its
 * barcode (Enter) or by search — from what the warehouse holds when stock
 * leaves it — in its main unit or one of its packs, with what that comes
 * to in the main unit and a note. A receipt with entered costs shows each
 * line's value; a count shows the book quantity and the difference.
 */
const props = defineProps<{ kind: StockOperationKind; warehouseId: number | null; costMethod?: CostMethod }>()
const lines = defineModel<LineDraft[]>("lines", { required: true })
const { t } = useI18n()

const scanned = ref("")
const scanProblem = ref("")
const picking = ref<number | null>(null)
/** On hand per `warehouse:item`, for a count. */
const book = ref<Record<string, string>>({})

const fromStock = computed(() => props.kind === "issue" || props.kind === "writeOff" || props.kind === "transfer")
const costed = computed(() => (props.kind === "receive" && props.costMethod === "entered") || props.kind === "adjust")

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

function bookOf(itemId: number): string {
	return book.value[`${props.warehouseId}:${itemId}`] ?? "0"
}

function difference(line: LineDraft): string {
	if (line.amount === null) return "—"
	const diff = mainAmount(line) - Number(bookOf(line.itemId))
	return `${diff > 0 ? "+" : ""}${quantity(String(diff))}`
}

// A count reads what the warehouse holds for each item on its lines; keyed
// by warehouse, so switching warehouses never shows another one's book.
watch(
	() => [props.kind, props.warehouseId, lines.value.map(line => line.itemId).join()] as const,
	async ([kind, warehouseId]) => {
		if (kind !== "adjust" || !warehouseId) return
		const missing = lines.value.filter(line => !(`${warehouseId}:${line.itemId}` in book.value))
		await Promise.all(
			missing.map(line =>
				quietly(
					() => listBalances({ warehouse_id: warehouseId, item_id: line.itemId, include_empty: true }),
					result => (book.value = { ...book.value, [`${warehouseId}:${line.itemId}`]: result.data[0]?.quantity ?? "0" })
				)
			)
		)
	},
	{ immediate: true }
)
</script>
