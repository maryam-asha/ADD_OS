<!-- src/add-os/modules/inventory/views/StockPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryStock')" :description="t('inventory.stock.description')">
			<template v-if="mayRecord" #actions>
				<n-button type="primary" @click="pickerVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>{{ t("inventory.operations.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<!-- Stat Cards -->
		<div v-if="!loadError && (balances.length || movements.length)" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.stock.balances") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
						<Icon name="carbon:layers" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{{ tab === "balances" ? totalCount : balances.length }}</span>
					<span class="text-xs font-medium text-slate-400">{{ t("inventory.stock.balances") }}</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.stock.value") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
						<Icon name="carbon:currency" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
						{{ totalValue ? money(totalValue, primaryCurrency) : EMPTY }}
					</span>
					<span class="text-xs font-medium text-slate-400">{{ primaryCurrency }}</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.stock.movements") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
						<Icon name="carbon:arrows-vertical" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{{ tab === "movements" ? totalCount : movements.length }}</span>
					<span class="text-xs font-medium text-slate-400">{{ t("inventory.history.movements") }}</span>
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
			<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
				<n-select v-model:value="warehouseId" :options="warehouseOptions" :placeholder="t('inventory.operations.allWarehouses')" clearable filterable class="w-full" />
				<ItemSelect v-model:value="itemId" kind="stock" :placeholder="t('inventory.stock.allItems')" class="w-full" />
				<template v-if="tab === 'movements'">
					<n-select v-model:value="movementType" :options="typeOptions" :placeholder="t('inventory.operations.allTypes')" clearable class="w-full" />
					<StaffSelect v-model:value="actorId" :placeholder="t('inventory.operations.allUsers')" class="w-full" />
					<n-date-picker v-model:formatted-value="period" type="daterange" value-format="yyyy-MM-dd" clearable class="w-full" />
				</template>
			</div>

			<div v-if="hasActiveFilters" class="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/80">
				<n-tag v-if="operationId" closable round @close="operationId = null">{{ t("inventory.operations.operation") }} · {{ operationId.slice(0, 8) }}</n-tag>
				<n-button quaternary size="small" @click="resetFilters">
					<template #icon><Icon name="carbon:reset" :size="14" /></template>
					{{ t("inventory.common.resetFilters") }}
				</n-button>
			</div>
		</div>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card size="small" class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
			<n-tabs v-model:value="tab" type="line" animated>
				<n-tab-pane name="balances" :tab="t('inventory.stock.balances')">
					<n-data-table :columns="balanceColumns" :data="balances" :loading :bordered="false" size="small" :scroll-x="tableWidth(balanceColumns)">
						<template #empty>
							<div class="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
								<Icon name="carbon:layers" :size="40" class="mb-2 opacity-50" />
								<span>{{ t("inventory.stock.emptyBalances") }}</span>
							</div>
						</template>
					</n-data-table>
				</n-tab-pane>
				<n-tab-pane name="movements" :tab="t('inventory.stock.movements')">
					<n-data-table :columns="movementColumns" :data="movements" :loading :bordered="false" size="small" :scroll-x="tableWidth(movementColumns)" :row-props="movementRowProps">
						<template #empty>
							<div class="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
								<Icon name="carbon:arrows-vertical" :size="40" class="mb-2 opacity-50" />
								<span>{{ t("inventory.stock.emptyMovements") }}</span>
							</div>
						</template>
					</n-data-table>
				</n-tab-pane>
			</n-tabs>

			<div v-if="lastPage > 1" class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 p-4 sm:flex-row dark:border-slate-800/80">
				<span class="text-xs text-slate-400">{{ t("inventory.common.all") }}: {{ totalCount }}</span>
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<StockOperationPicker v-model:show="pickerVisible" @picked="open" />
		<StockOperationModal v-model:show="operationVisible" :kind="operationKind" :warehouses @done="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { StockBalance, StockMovement, StockMovementType, StockOperationKind, Warehouse } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NPagination, NSelect, NTabPane, NTabs, NTag } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canCountStock, canIssueStock, canReceiveStock, canTransferStock } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import ItemSelect from "@/add-os/modules/inventory/components/ItemSelect.vue"
import StaffSelect from "@/add-os/modules/inventory/components/StaffSelect.vue"
import StockOperationModal from "@/add-os/modules/inventory/components/StockOperationModal.vue"
import StockOperationPicker from "@/add-os/modules/inventory/components/StockOperationPicker.vue"
import { STOCK_MOVEMENT_TYPES } from "@/add-os/modules/inventory/types/inventory"
import { COLUMN, EMPTY, localized, money, nameCell, quantity, tableWidth, warehouseLabel } from "@/add-os/modules/inventory/utils/display"
import { listBalances, listStockMovements, listWarehouses } from "@/add-os/services/inventory"
import { formatDateTime } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/**
 * Stock by warehouse: what each one holds and its value at average cost,
 * and the ledger every quantity is counted from — receipts, issues (by
 * hand, by a sale at reception, by recorded consumption), transfers and
 * counts. A movement is recorded as one operation of several lines;
 * clicking a movement shows the rest of its operation.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const mayRecord = canReceiveStock() || canIssueStock() || canTransferStock() || canCountStock()

const tab = ref<"balances" | "movements">("balances")
const warehouses = ref<Warehouse[]>([])
const warehouseId = ref<number | null>(null)
const itemId = ref<number | null>(null)
const movementType = ref<StockMovementType | null>(null)
const actorId = ref<number | null>(null)
const period = ref<[string, string] | null>(null)
const operationId = ref<string | null>(null)
const page = ref(1)
const lastPage = ref(1)
const totalCount = ref(0)
const loading = ref(true)
const loadError = ref("")
const balances = ref<StockBalance[]>([])
const movements = ref<StockMovement[]>([])
const pickerVisible = ref(false)
const operationVisible = ref(false)
const operationKind = ref<StockOperationKind>("receive")

const warehouseOptions = computed<SelectOption[]>(() => warehouses.value.map(w => ({ label: localized(w.name), value: w.id })))
const typeOptions = computed<SelectOption[]>(() => STOCK_MOVEMENT_TYPES.map(type => ({ label: t(`inventory.movementType.${type}`), value: type })))

const hasActiveFilters = computed(() => Boolean(warehouseId.value || itemId.value || (tab.value === "movements" && (movementType.value || actorId.value || period.value || operationId.value))))

function resetFilters() {
	warehouseId.value = null
	itemId.value = null
	movementType.value = null
	actorId.value = null
	period.value = null
	operationId.value = null
}

const totalValue = computed(() => balances.value.reduce((sum, b) => sum + (Number.parseFloat(b.value) || 0), 0))
const primaryCurrency = computed(() => balances.value[0]?.currency || "USD")

onMounted(() => {
	listWarehouses({ per_page: 100 })
		.then(result => (warehouses.value = result.data))
		.catch(e => (loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))))
	void load()
})

// A changed filter starts again from page one; the page watcher loads it then.
watch([tab, warehouseId, itemId, movementType, actorId, period, operationId], () => {
	if (page.value !== 1) page.value = 1
	else void load()
})
watch(page, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const filters = { page: page.value, item_id: itemId.value, warehouse_id: warehouseId.value }
		const result =
			tab.value === "balances"
				? await listBalances(filters)
				: await listStockMovements({ ...filters, type: movementType.value, actor_id: actorId.value, operation_id: operationId.value, from: period.value?.[0], to: period.value?.[1] })
		if (tab.value === "balances") balances.value = result.data as StockBalance[]
		else movements.value = result.data as StockMovement[]
		lastPage.value = result.meta.last_page
		totalCount.value = result.meta.total ?? result.data.length
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

function open(kind: StockOperationKind) {
	operationKind.value = kind
	operationVisible.value = true
}

function movementRowProps(row: StockMovement) {
	return row.operation_id ? { style: "cursor: pointer", title: t("inventory.operations.showOperation"), onClick: () => (operationId.value = row.operation_id) } : {}
}

function itemCell(item: { name: { ar: string; en?: string | null }; sku: string }) {
	return nameCell(localized(item.name), item.sku, { code: true })
}

const TYPE_TAG_TYPES: Record<StockMovementType, "success" | "warning" | "info" | "default"> = {
	receipt: "success",
	issue: "warning",
	transfer_in: "info",
	transfer_out: "info",
	adjustment: "default"
}

const balanceColumns = computed<DataTableColumns<StockBalance>>(() => [
	{ title: t("inventory.stock.item"), key: "item", ...COLUMN.name, render: row => itemCell(row.item) },
	{ title: t("inventory.operations.warehouse"), key: "warehouse", ...COLUMN.place, render: row => warehouseLabel(row.warehouse) },
	{ title: t("inventory.stock.onHand"), key: "quantity", ...COLUMN.quantity, render: row => h("span", { class: "add-numeric font-semibold" }, `${quantity(row.quantity)} ${localized(row.item.unit.name)}`) },
	{ title: t("inventory.stock.averageCost"), key: "average_cost", ...COLUMN.money, render: row => h("span", { class: "add-numeric" }, money(row.average_cost, row.currency)) },
	{ title: t("inventory.stock.value"), key: "value", ...COLUMN.money, render: row => h("span", { class: "add-numeric font-semibold" }, money(row.value, row.currency)) }
])

/** "2 box · 12" when a pack was typed; the main-unit quantity alone otherwise. */
function quantityCell(row: StockMovement) {
	const signed = (row.quantity.startsWith("-") ? "" : "+") + quantity(row.quantity)
	const text = row.entered ? `${quantity(row.entered.quantity)} ${localized(row.entered.unit.name)} · ${signed}` : signed
	return h("span", { class: `add-numeric font-semibold ${row.quantity.startsWith("-") ? "text-error" : "text-success"}`, dir: "ltr" }, text)
}

const movementColumns = computed<DataTableColumns<StockMovement>>(() => [
	{ title: t("inventory.history.when"), key: "created_at", ...COLUMN.dateTime, render: row => (row.created_at ? formatDateTime(row.created_at) : EMPTY) },
	{ title: t("inventory.stock.item"), key: "item", ...COLUMN.name, render: row => itemCell(row.item) },
	{ title: t("inventory.operations.warehouse"), key: "warehouse", ...COLUMN.place, render: row => warehouseLabel(row.warehouse) },
	{
		title: t("inventory.stock.type"),
		key: "type",
		width: 190,
		render: row =>
			h("div", { class: "inline-flex items-center gap-1.5 whitespace-nowrap" }, [
				h(NTag, { size: "small", round: true, type: TYPE_TAG_TYPES[row.type] }, () => t(`inventory.movementType.${row.type}`)),
				row.reason ? h("span", { class: "text-xs text-secondary" }, `(${t(`inventory.issueReason.${row.reason}`)})`) : null
			])
	},
	{ title: t("inventory.stock.quantity"), key: "quantity", ...COLUMN.quantity, width: 170, render: quantityCell },
	{ title: t("inventory.stock.after"), key: "quantity_after", ...COLUMN.quantity, render: row => h("span", { class: "add-numeric" }, quantity(row.quantity_after)) },
	{ title: t("inventory.stock.unitCost"), key: "unit_cost", ...COLUMN.money, render: row => h("span", { class: "add-numeric" }, row.unit_cost ? quantity(row.unit_cost) : EMPTY) },
	{ title: t("inventory.common.note"), key: "note", ...COLUMN.text, render: row => row.note ?? EMPTY },
	{ title: t("inventory.history.by"), key: "actor", ...COLUMN.person, render: row => row.actor?.name ?? EMPTY }
])
</script>
