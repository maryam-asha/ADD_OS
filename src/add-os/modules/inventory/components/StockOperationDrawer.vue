<!-- src/add-os/modules/inventory/components/StockOperationDrawer.vue -->
<template>
	<HrDrawer v-model:show="show" :title="t('inventory.operations.details')" size="lg">
		<template v-if="operation">
			<dl class="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<div v-for="fact in facts" :key="fact.label">
					<dt class="text-xs text-secondary">{{ fact.label }}</dt>
					<dd class="mt-0.5 font-medium whitespace-pre-line">{{ fact.value }}</dd>
				</div>
			</dl>
			<a v-if="operation.attachment_url" :href="operation.attachment_url" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center gap-1.5 text-sm text-primary underline">
				<Icon name="carbon:attachment" :size="16" />{{ t("inventory.operations.openAttachment") }}
			</a>

			<h3 class="mt-6 mb-2 text-sm font-semibold">{{ t("inventory.operations.linesTitle") }}</h3>
			<n-data-table class="add-ledger-table" :columns :data="lines" :loading :bordered="false" size="small" :scroll-x="tableWidth(columns)" />
		</template>
	</HrDrawer>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { StockMovement, StockOperation } from "@/add-os/modules/inventory/types/inventory"
import { NDataTable } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrDrawer from "@/add-os/modules/hr/components/HrDrawer.vue"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { COLUMN, EMPTY, localized, money, quantity, tableWidth, warehouseLabel } from "@/add-os/modules/inventory/utils/display"
import { getStockOperation } from "@/add-os/services/inventory"
import { formatDate } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/** One operation: its header — date, warehouses, reference, reason, by whom — its attachment, and its lines. */
const props = defineProps<{ operation: StockOperation | null }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()

const movements = ref<StockMovement[]>([])
const loading = ref(false)

/** A transfer's arriving half repeats its leaving one; each line shows once. */
const lines = computed(() => movements.value.filter(row => row.type !== "transfer_in"))

const facts = computed(() => {
	const op = props.operation
	if (!op) return []
	return [
		{ label: t("inventory.operations.kindCol"), value: t(`inventory.operations.stored.${op.kind}`) },
		{ label: t("inventory.operations.date"), value: formatDate(op.operation_date) },
		{ label: op.to_warehouse ? t("inventory.operations.from") : t("inventory.operations.warehouse"), value: warehouseLabel(op.warehouse) },
		...(op.to_warehouse ? [{ label: t("inventory.operations.to"), value: warehouseLabel(op.to_warehouse) }] : []),
		{ label: t("inventory.operations.reference"), value: op.reference ?? EMPTY },
		...(op.reason ? [{ label: t("inventory.operations.reason"), value: t(`inventory.issueReason.${op.reason}`) }] : []),
		...(op.cost_method ? [{ label: t("inventory.operations.costMethod"), value: t(op.cost_method === "average" ? "inventory.operations.costAverage" : "inventory.operations.costEntered") }] : []),
		{ label: t("inventory.history.by"), value: op.actor?.name ?? EMPTY },
		{ label: t("inventory.common.note"), value: op.note ?? EMPTY }
	]
})

watch(
	() => [show.value, props.operation?.id] as const,
	async ([open, id]) => {
		if (!open || !id) return
		loading.value = true
		await quietly(
			() => getStockOperation(id),
			operation => (movements.value = operation.movements ?? [])
		)
		loading.value = false
	},
	{ immediate: true }
)

const columns = computed<DataTableColumns<StockMovement>>(() => [
	{ title: t("inventory.stock.item"), key: "item", ...COLUMN.name, render: row => localized(row.item.name) },
	{
		title: t("inventory.stock.quantity"),
		key: "quantity",
		...COLUMN.quantity,
		width: 170,
		render: row =>
			h("span", { class: "add-numeric", dir: "ltr" }, row.entered ? `${quantity(row.entered.quantity)} ${localized(row.entered.unit.name)} · ${quantity(row.quantity)}` : quantity(row.quantity))
	},
	{ title: t("inventory.stock.unitCost"), key: "unit_cost", ...COLUMN.money, render: row => h("span", { class: "add-numeric" }, row.unit_cost ? money(row.unit_cost, null) : EMPTY) },
	{ title: t("inventory.operations.lineNote"), key: "line_note", ...COLUMN.text, render: row => row.line_note ?? EMPTY }
])
</script>
