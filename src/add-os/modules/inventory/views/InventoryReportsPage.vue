<!-- src/add-os/modules/inventory/views/InventoryReportsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryReports')" :description="t('inventory.reports.description')" />

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<!-- Stock Valuation Card -->
		<n-card size="small" class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
			<template #header>
				<div class="flex items-center gap-2">
					<Icon name="carbon:layers" :size="20" class="text-purple-500" />
					<span class="font-bold">{{ t("inventory.reports.stockValuation") }}</span>
				</div>
			</template>
			<template #header-extra>
				<span v-if="valuation" class="add-numeric font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
					{{ money(valuation.total, valuation.currency) }}
				</span>
			</template>

			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-wrap items-center gap-3">
					<PlacePicker v-model:value="place" inline />
					<n-button v-if="place" quaternary size="small" @click="place = null">
						<template #icon><Icon name="carbon:reset" :size="14" /></template>
						{{ t("inventory.common.resetFilters") }}
					</n-button>
				</div>
			</div>

			<n-data-table :columns="valuationColumns" :data="valuation?.warehouses ?? []" :loading :bordered="false" size="small" :scroll-x="640">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-8 text-slate-400">
						<Icon name="carbon:layers" :size="32" class="mb-1 opacity-50" />
						<span class="text-sm">{{ t("inventory.stock.emptyBalances") }}</span>
					</div>
				</template>
			</n-data-table>
		</n-card>

		<!-- Asset Register Card -->
		<n-card size="small" class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
			<template #header>
				<div class="flex items-center gap-2">
					<Icon name="carbon:box" :size="20" class="text-blue-500" />
					<span class="font-bold">{{ t("inventory.reports.assetRegister") }}</span>
				</div>
			</template>
			<template #header-extra>
				<n-checkbox v-model:checked="includeDisposed">{{ t("inventory.reports.includeDisposed") }}</n-checkbox>
			</template>

			<div v-if="register?.totals.length" class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div v-for="total in register.totals" :key="total.currency" class="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-800/40">
					<div class="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-700/60">
						<span class="font-mono text-sm font-bold text-slate-700 dark:text-slate-200">{{ total.currency }}</span>
						<span class="text-xs text-secondary">{{ t("inventory.reports.assetRegister") }}</span>
					</div>
					<div class="flex items-center justify-between text-xs text-secondary">
						<span>{{ t("inventory.assets.cost") }}:</span>
						<span class="add-numeric font-medium text-slate-800 dark:text-slate-200">{{ money(total.cost, total.currency) }}</span>
					</div>
					<div class="flex items-center justify-between text-xs text-secondary">
						<span>{{ t("inventory.assets.accumulated") }}:</span>
						<span class="add-numeric text-amber-600 dark:text-amber-400">{{ money(total.accumulated, total.currency) }}</span>
					</div>
					<div class="flex items-center justify-between pt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
						<span>{{ t("inventory.assets.bookValue") }}:</span>
						<span class="add-numeric font-mono text-emerald-600 dark:text-emerald-400">{{ money(total.book_value, total.currency) }}</span>
					</div>
				</div>
			</div>

			<n-data-table :columns="registerColumns" :data="register?.assets ?? []" :loading :bordered="false" size="small" :scroll-x="1080" :pagination="{ pageSize: 25 }" />
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { AssetRegister, AssetRegisterRow, PlaceRef, StockValuation } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NCheckbox, NDataTable } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import AssetStatusTag from "@/add-os/modules/inventory/components/AssetStatusTag.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import { ALIGN_END, codeChip, EMPTY, localized, money, nameCell, PLACE_COLUMN, placeLabel, warehouseLabel } from "@/add-os/modules/inventory/utils/display"
import { assetRegister, stockValuation } from "@/add-os/services/inventory"
import { formatNumber } from "@/add-os/utils/format"
import { formatDate } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/**
 * What the inventory is worth: stock on hand at its average cost, per
 * place, and every asset still owned with what it cost and its book value
 * today — totalled per currency, never across them.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const place = ref<PlaceRef | null>(null)
const includeDisposed = ref(false)
const valuation = ref<StockValuation | null>(null)
const register = ref<AssetRegister | null>(null)
const loading = ref(true)
const loadError = ref("")

onMounted(load)
watch([place, includeDisposed], () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		;[valuation.value, register.value] = await Promise.all([stockValuation(place.value), assetRegister(includeDisposed.value)])
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

type ValuationRow = StockValuation["warehouses"][number]

const valuationColumns = computed<DataTableColumns<ValuationRow>>(() => [
	{ title: t("inventory.operations.warehouse"), key: "warehouse", ...PLACE_COLUMN, render: row => warehouseLabel(row.warehouse) },
	{
		title: t("inventory.reports.items"),
		key: "items",
		width: 120,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric font-medium" }, formatNumber(row.items))
	},
	{
		title: t("inventory.stock.value"),
		key: "value",
		width: 160,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric font-semibold text-emerald-600 dark:text-emerald-400" }, money(row.value, valuation.value?.currency))
	}
])

const registerColumns = computed<DataTableColumns<AssetRegisterRow>>(() => [
	{
		title: t("inventory.assets.code"),
		key: "code",
		width: 120,
		render: row => codeChip(row.code)
	},
	{
		title: t("inventory.assets.item"),
		key: "item",
		minWidth: 200,
		render: row => nameCell(localized(row.item.name), row.code)
	},
	{ title: t("inventory.assets.location"), key: "location", ...PLACE_COLUMN, render: row => placeLabel(row.location) },
	{
		title: t("inventory.common.status"),
		key: "status",
		width: 120,
		align: "center",
		render: row => h(AssetStatusTag, { status: row.status })
	},
	{
		title: t("inventory.assets.purchasedOn"),
		key: "purchased_on",
		width: 120,
		render: row => (row.purchased_on ? formatDate(row.purchased_on) : EMPTY)
	},
	{
		title: t("inventory.assets.cost"),
		key: "purchase_cost",
		width: 130,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric font-medium" }, money(row.purchase_cost, row.currency))
	},
	{
		title: t("inventory.assets.accumulated"),
		key: "accumulated",
		width: 130,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric text-amber-600 dark:text-amber-400" }, money(row.accumulated, row.currency))
	},
	{
		title: t("inventory.assets.bookValue"),
		key: "book_value",
		width: 140,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric font-semibold text-emerald-600 dark:text-emerald-400" }, money(row.book_value, row.currency))
	}
])
</script>
