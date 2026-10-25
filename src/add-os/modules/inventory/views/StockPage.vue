<!-- src/add-os/modules/inventory/views/StockPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryStock')" :description="t('inventory.stock.description')">
			<template #actions>
				<n-button v-if="may.count" @click="act('count')">
					<template #icon><Icon name="carbon:list-checked" :size="16" /></template>{{ t("inventory.stockAction.count.title") }}
				</n-button>
				<n-button v-if="may.transfer" @click="act('transfer')">
					<template #icon><Icon name="carbon:arrows-horizontal" :size="16" /></template>{{ t("inventory.stockAction.transfer.title") }}
				</n-button>
				<n-button v-if="may.issue" @click="act('issue')">
					<template #icon><Icon name="carbon:upload" :size="16" /></template>{{ t("inventory.stockAction.issue.title") }}
				</n-button>
				<n-button v-if="may.receive" type="primary" @click="act('receive')">
					<template #icon><Icon name="carbon:download" :size="16" /></template>{{ t("inventory.stockAction.receive.title") }}
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
					<span class="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{{ totalCount }}</span>
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
						{{ computedTotalValue ? money(computedTotalValue, primaryCurrency) : EMPTY }}
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
					<span class="font-mono text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{{ tab === 'movements' ? totalCount : movements.length }}</span>
					<span class="text-xs font-medium text-slate-400">{{ t("inventory.history.movements") }}</span>
				</div>
			</div>
		</div>

		<!-- Filters Section: Two rows side by side -->
		<div class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
			<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
				<!-- Row 1: Item + Location -->
				<div>
					<ItemSelect v-model:value="itemId" kind="stock" :placeholder="t('inventory.stock.allItems')" class="w-full" />
				</div>
				<div>
					<PlacePicker v-model:value="place" inline />
				</div>

				<!-- Row 2: Movement Type (for movements tab) -->
				<div v-if="tab === 'movements'">
					<n-select v-model:value="movementType" :options="typeOptions" :placeholder="t('inventory.stock.type')" clearable class="w-full" />
				</div>
			</div>

			<div v-if="hasActiveFilters" class="mt-3 flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-800/80">
				<n-button quaternary size="small" @click="resetFilters">
					<template #icon><Icon name="carbon:reset" :size="14" /></template>
					{{ t("inventory.common.resetFilters") }}
				</n-button>
			</div>
		</div>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<!-- Tabs Card -->
		<n-card size="small" class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
			<n-tabs v-model:value="tab" type="line" animated>
				<n-tab-pane name="balances" :tab="t('inventory.stock.balances')">
					<n-data-table :columns="balanceColumns" :data="balances" :loading="loading" :bordered="false" size="small" :scroll-x="960">
						<template #empty>
							<div class="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
								<Icon name="carbon:layers" :size="40" class="mb-2 opacity-50" />
								<span>{{ t("inventory.stock.emptyBalances") }}</span>
							</div>
						</template>
					</n-data-table>
				</n-tab-pane>
				<n-tab-pane name="movements" :tab="t('inventory.stock.movements')">
					<n-data-table :columns="movementColumns" :data="movements" :loading="loading" :bordered="false" size="small" :scroll-x="1340">
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
				<span class="text-xs text-slate-400">
					{{ t("inventory.common.all") }}: {{ totalCount }}
				</span>
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<StockActionModal v-model:show="actionVisible" :mode="mode" @done="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { PlaceRef, StockBalance, StockMode, StockMovement, StockMovementType } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NPagination, NSelect, NTabPane, NTabs, NTag } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canCountStock, canIssueStock, canReceiveStock, canTransferStock } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import ItemSelect from "@/add-os/modules/inventory/components/ItemSelect.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import StockActionModal from "@/add-os/modules/inventory/components/StockActionModal.vue"
import { STOCK_MOVEMENT_TYPES } from "@/add-os/modules/inventory/types/inventory"
import { ALIGN_END, EMPTY, localized, money, nameCell, PLACE_COLUMN, placeLabel, quantity } from "@/add-os/modules/inventory/utils/display"
import { listBalances, listStockMovements } from "@/add-os/services/inventory"
import { formatDate, formatTime } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/**
 * Consumable stock: what is on hand where (a place includes everything
 * inside it), what it is worth at its average cost, and the ledger every
 * quantity is counted from — receipts, issues (by hand, by a sale at
 * reception, by recorded consumption), transfers and counts.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const may = { receive: canReceiveStock(), issue: canIssueStock(), transfer: canTransferStock(), count: canCountStock() }

const tab = ref<"balances" | "movements">("balances")
const itemId = ref<number | null>(null)
const place = ref<PlaceRef | null>(null)
const movementType = ref<StockMovementType | null>(null)
const page = ref(1)
const lastPage = ref(1)
const totalCount = ref(0)
const loading = ref(true)
const loadError = ref("")
const balances = ref<StockBalance[]>([])
const movements = ref<StockMovement[]>([])
const mode = ref<StockMode>("receive")
const actionVisible = ref(false)

const hasActiveFilters = computed(() => Boolean(itemId.value || place.value || (tab.value === "movements" && movementType.value)))

function resetFilters() {
	itemId.value = null
	place.value = null
	movementType.value = null
}

const computedTotalValue = computed(() => {
	if (!balances.value.length) return 0
	return balances.value.reduce((sum, b) => sum + (parseFloat(b.value) || 0), 0)
})

const primaryCurrency = computed(() => balances.value[0]?.currency || "SYP")

onMounted(load)

// A changed filter starts again from page one; the page watcher loads it then.
watch([tab, itemId, place, movementType], () => {
	if (page.value !== 1) page.value = 1
	else void load()
})
watch(page, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const filters = { page: page.value, item_id: itemId.value, location: place.value }
		if (tab.value === "balances") {
			const result = await listBalances(filters)
			balances.value = result.data
			lastPage.value = result.meta.last_page
			totalCount.value = result.meta.total ?? result.data.length
		} else {
			const result = await listStockMovements({ ...filters, type: movementType.value })
			movements.value = result.data
			lastPage.value = result.meta.last_page
			totalCount.value = result.meta.total ?? result.data.length
		}
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

function act(next: StockMode) {
	mode.value = next
	actionVisible.value = true
}

const typeOptions = computed<SelectOption[]>(() => STOCK_MOVEMENT_TYPES.map(type => ({ label: t(`inventory.movementType.${type}`), value: type })))

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
	{ title: t("inventory.stock.item"), key: "item", minWidth: 220, ellipsis: { tooltip: true }, render: row => itemCell(row.item) },
	{ title: t("inventory.stock.location"), key: "location", ...PLACE_COLUMN, render: row => placeLabel(row.location) },
	{
		title: t("inventory.stock.onHand"),
		key: "quantity",
		width: 130,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric font-semibold" }, `${quantity(row.quantity)} ${localized(row.item.unit.name)}`)
	},
	{
		title: t("inventory.stock.averageCost"),
		key: "average_cost",
		width: 130,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric" }, money(row.average_cost, row.currency))
	},
	{
		title: t("inventory.stock.value"),
		key: "value",
		width: 130,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric font-semibold text-emerald-600 dark:text-emerald-400" }, money(row.value, row.currency))
	}
])

const movementColumns = computed<DataTableColumns<StockMovement>>(() => [
	{
		title: t("inventory.history.when"),
		key: "created_at",
		width: 170,
		render: row => {
			if (!row.created_at) return EMPTY
			return h("div", { class: "flex flex-col gap-0.5 leading-tight" }, [
				h("span", { class: "font-medium text-xs whitespace-nowrap" }, formatDate(row.created_at)),
				h("span", { class: "text-[11px] text-slate-400 font-mono whitespace-nowrap" }, formatTime(row.created_at))
			])
		}
	},
	{
		title: t("inventory.stock.item"),
		key: "item",
		minWidth: 200,
		width: 210,
		ellipsis: { tooltip: true },
		render: row => itemCell(row.item)
	},
	{
		title: t("inventory.stock.location"),
		key: "location",
		minWidth: 220,
		width: 230,
		ellipsis: { tooltip: true },
		render: row => placeLabel(row.location)
	},
	{
		title: t("inventory.stock.type"),
		key: "type",
		minWidth: 180,
		width: 190,
		render: row =>
			h("div", { class: "inline-flex items-center gap-1.5 whitespace-nowrap" }, [
				h(NTag, { size: "small", round: true, type: TYPE_TAG_TYPES[row.type] }, () => t(`inventory.movementType.${row.type}`)),
				row.reason ? h("span", { class: "text-xs text-secondary whitespace-nowrap" }, `(${t(`inventory.issueReason.${row.reason}`)})`) : null
			])
	},
	{
		title: t("inventory.stock.quantity"),
		key: "quantity",
		width: 100,
		align: ALIGN_END,
		render: row => {
			const isNegative = String(row.quantity).startsWith("-")
			const displayQty = (isNegative ? "" : "+") + quantity(row.quantity)
			return h(
				"span",
				{
					class: `font-mono text-xs font-semibold ${isNegative ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`,
					dir: "ltr"
				},
				displayQty
			)
		}
	},
	{
		title: t("inventory.stock.after"),
		key: "quantity_after",
		width: 90,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric font-medium" }, quantity(row.quantity_after))
	},
	{
		title: t("inventory.stock.unitCost"),
		key: "unit_cost",
		width: 110,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric text-xs text-slate-500" }, row.unit_cost ? quantity(row.unit_cost) : EMPTY)
	},
	{
		title: t("inventory.common.note"),
		key: "note",
		width: 150,
		ellipsis: { tooltip: true },
		render: row => row.note ?? EMPTY
	},
	{
		title: t("inventory.history.by"),
		key: "actor",
		width: 120,
		ellipsis: { tooltip: true },
		render: row => row.actor?.name ?? EMPTY
	}
])
</script>
