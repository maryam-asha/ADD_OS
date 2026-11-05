<!-- src/add-os/modules/inventory/components/WarehouseDrawer.vue -->
<template>
	<HrDrawer v-model:show="show" :title="warehouse ? localized(warehouse.name) : t('inventory.warehouses.details')" size="lg">
		<template v-if="warehouse">
			<dl class="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<div v-for="fact in facts" :key="fact.label">
					<dt class="text-xs text-secondary">{{ fact.label }}</dt>
					<dd class="mt-0.5 font-medium">
						<a v-if="fact.link" :href="fact.value" target="_blank" rel="noopener noreferrer" class="text-primary underline" dir="ltr">{{ fact.value }}</a>
						<template v-else>{{ fact.value }}</template>
					</dd>
				</div>
			</dl>

			<h3 class="mt-6 mb-2 text-sm font-semibold">{{ t("inventory.warehouses.balances") }}</h3>
			<n-data-table class="add-ledger-table" :columns="balanceColumns" :data="balances" :loading :bordered="false" size="small" :scroll-x="tableWidth(balanceColumns)" />

			<h3 class="mt-6 mb-2 text-sm font-semibold">{{ t("inventory.warehouses.recentMovements") }}</h3>
			<n-data-table class="add-ledger-table" :columns="movementColumns" :data="movements" :loading :bordered="false" size="small" :scroll-x="tableWidth(movementColumns)" />
		</template>
	</HrDrawer>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { StockBalance, StockMovement, Warehouse } from "@/add-os/modules/inventory/types/inventory"
import { NDataTable } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrDrawer from "@/add-os/modules/hr/components/HrDrawer.vue"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { COLUMN, EMPTY, localized, money, quantity, tableWidth } from "@/add-os/modules/inventory/utils/display"
import { listBalances, listStockMovements } from "@/add-os/services/inventory"
import { formatDateTime } from "@/add-os/utils/format/dates"

/** One warehouse: its details, what it holds and its latest movements. */
const props = defineProps<{ warehouse: Warehouse | null }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()

const balances = ref<StockBalance[]>([])
const movements = ref<StockMovement[]>([])
const loading = ref(false)

const facts = computed(() => {
	const w = props.warehouse
	if (!w) return []
	return [
		{ label: t("inventory.warehouses.code"), value: w.code ?? EMPTY },
		{ label: t("inventory.warehouses.manager"), value: w.manager?.name ?? t("inventory.warehouses.noManager") },
		{ label: t("inventory.warehouses.branch"), value: w.place?.label ?? t("inventory.warehouses.external") },
		{ label: t("inventory.warehouses.address"), value: w.address ?? EMPTY },
		{ label: t("inventory.warehouses.locationUrl"), value: w.location_url ?? EMPTY, link: Boolean(w.location_url?.startsWith("http")) },
		{ label: t("inventory.warehouses.scope"), value: w.item_scope === "all" ? t("inventory.warehouses.scopeAll") : t("inventory.warehouses.itemsCount", { n: w.items?.length ?? 0 }) },
		{ label: t("inventory.warehouses.notes"), value: w.notes ?? EMPTY }
	]
})

watch(
	() => [show.value, props.warehouse?.id] as const,
	async ([open, id]) => {
		if (!open || !id) return
		loading.value = true
		await Promise.all([
			quietly(() => listBalances({ warehouse_id: id, per_page: 100 }), result => (balances.value = result.data)),
			quietly(() => listStockMovements({ warehouse_id: id, per_page: 10 }), result => (movements.value = result.data))
		])
		loading.value = false
	}
)

const balanceColumns = computed<DataTableColumns<StockBalance>>(() => [
	{ title: t("inventory.stock.item"), key: "item", ...COLUMN.name, render: row => localized(row.item.name) },
	{ title: t("inventory.stock.onHand"), key: "quantity", ...COLUMN.quantity, render: row => h("span", { class: "add-numeric" }, `${quantity(row.quantity)} ${localized(row.item.unit.name)}`) },
	{ title: t("inventory.stock.averageCost"), key: "average_cost", ...COLUMN.money, render: row => h("span", { class: "add-numeric" }, money(row.average_cost, row.currency)) },
	{ title: t("inventory.stock.value"), key: "value", ...COLUMN.money, render: row => h("span", { class: "add-numeric" }, money(row.value, row.currency)) }
])

const movementColumns = computed<DataTableColumns<StockMovement>>(() => [
	{ title: t("inventory.history.when"), key: "created_at", ...COLUMN.dateTime, render: row => (row.created_at ? formatDateTime(row.created_at) : EMPTY) },
	{ title: t("inventory.stock.item"), key: "item", ...COLUMN.name, render: row => localized(row.item.name) },
	{ title: t("inventory.stock.type"), key: "type", width: 150, render: row => t(`inventory.movementType.${row.type}`) },
	{ title: t("inventory.stock.quantity"), key: "quantity", ...COLUMN.quantity, render: row => h("span", { class: "add-numeric", dir: "ltr" }, quantity(row.quantity)) }
])
</script>
