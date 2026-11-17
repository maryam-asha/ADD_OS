<!-- src/add-os/modules/inventory/views/InventoryReportsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryReports')" :description="t('inventory.reports.description')" />

		<!-- Where: both reports narrow to it (a branch takes everything in it). -->
		<div class="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--add-border)] bg-white p-4 shadow-xs">
			<div class="min-w-0 flex-1">
				<PlacePicker v-model:chain="placeChain" :value="place" inline />
			</div>
			<n-button v-if="hasActiveFilters" quaternary size="small" @click="resetFilters">
				<template #icon><Icon name="carbon:reset" :size="14" /></template>
				{{ t("inventory.common.resetFilters") }}
			</n-button>
		</div>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<!-- Stock Valuation Card -->
		<n-card size="small" class="add-ledger-table rounded-2xl border border-[var(--add-border)] shadow-xs" :bordered="false">
			<template #header>
				<div class="flex items-center gap-2">
					<Icon name="carbon:layers" :size="20" class="text-[var(--add-info-text)]" />
					<span class="font-bold">{{ t("inventory.reports.stockValuation") }}</span>
				</div>
			</template>
			<template #header-extra>
				<span v-if="valuation" class="add-numeric font-mono text-base font-bold text-[var(--add-success-text)]">
					{{ money(valuation.total, valuation.currency) }}
				</span>
			</template>

			<n-data-table :columns="valuationColumns" :data="valuation?.warehouses ?? []" :loading :bordered="false" size="small" :scroll-x="640">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-8 text-[var(--add-text-muted)]">
						<Icon name="carbon:layers" :size="32" class="mb-1 opacity-50" />
						<span class="text-sm">{{ t("inventory.stock.emptyBalances") }}</span>
					</div>
				</template>
			</n-data-table>
		</n-card>

		<!-- Asset Register Card -->
		<n-card size="small" class="add-ledger-table rounded-2xl border border-[var(--add-border)] shadow-xs" :bordered="false">
			<template #header>
				<div class="flex items-center gap-2">
					<Icon name="carbon:box" :size="20" class="text-[var(--add-info-text)]" />
					<span class="font-bold">{{ t("inventory.reports.assetRegister") }}</span>
				</div>
			</template>
			<template #header-extra>
				<div class="flex flex-wrap items-center justify-end gap-3">
					<!-- The category is the register's own: stock valuation has none. -->
					<n-select v-model:value="filters.category_id" :options="categoryOptions" :placeholder="t('inventory.common.category')" clearable filterable size="small" class="sm:w-56!" />
					<n-checkbox v-model:checked="includeDisposed">{{ t("inventory.reports.includeDisposed") }}</n-checkbox>
				</div>
			</template>

			<div v-if="register?.totals.length" class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div v-for="total in register.totals" :key="total.currency" class="flex flex-col gap-2 rounded-2xl border border-[var(--add-border)] bg-[var(--add-surface-sunken)] p-4 shadow-2xs">
					<div class="flex items-center justify-between border-b border-[var(--add-border)] pb-2">
						<span class="font-mono text-sm font-bold text-[var(--add-text-primary)]">{{ total.currency }}</span>
						<span class="text-xs text-secondary">{{ t("inventory.reports.assetRegister") }}</span>
					</div>
					<div class="flex items-center justify-between text-xs text-secondary">
						<span>{{ t("inventory.assets.cost") }}:</span>
						<span class="add-numeric font-medium text-[var(--add-text-primary)]">{{ money(total.cost, total.currency) }}</span>
					</div>
					<div class="flex items-center justify-between text-xs text-secondary">
						<span>{{ t("inventory.assets.accumulated") }}:</span>
						<span class="add-numeric text-[var(--add-warning-text)]">{{ money(total.accumulated, total.currency) }}</span>
					</div>
					<div class="flex items-center justify-between pt-1 text-sm font-bold text-[var(--add-text-primary)]">
						<span>{{ t("inventory.assets.bookValue") }}:</span>
						<span class="add-numeric font-mono text-[var(--add-success-text)]">{{ money(total.book_value, total.currency) }}</span>
					</div>
				</div>
			</div>

			<n-data-table :columns="registerColumns" :data="register?.assets ?? []" :loading :bordered="false" size="small" :scroll-x="1080" :pagination="{ pageSize: 25 }" />
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { AssetRegister, AssetRegisterRow, Category, StockValuation } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NCheckbox, NDataTable, NSelect } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import AssetStatusTag from "@/add-os/modules/inventory/components/AssetStatusTag.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import { ALIGN_END, categoryPaths, codeChip, EMPTY, localized, money, nameCell, PLACE_COLUMN, placeLabel, warehouseLabel } from "@/add-os/modules/inventory/utils/display"
import { chainOf, filtersOf, PLACE_FILTER_SCHEMA, placeOf, usePlaceFilter } from "@/add-os/modules/inventory/utils/placeFilter"
import { assetRegister, listCategories, stockValuation } from "@/add-os/services/inventory"
import { formatNumber } from "@/add-os/utils/format"
import { formatDate } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/**
 * What the inventory is worth: stock on hand at its average cost, per
 * place, and every asset still owned with what it cost and its book value
 * today — totalled per currency, never across them. A place narrows both;
 * a category the register. Both are kept in the URL.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const categories = ref<Category[]>([])

const { filters, applied } = useRouteFilters({ category_id: "number", disposed: "string", ...PLACE_FILTER_SCHEMA }, () => void load())
const { place, chain: placeChain } = usePlaceFilter(filters)
const includeDisposed = computed<boolean>({
	get: () => filters.value.disposed === "1",
	set: on => (filters.value.disposed = on ? "1" : null)
})
const categoryOptions = computed<SelectOption[]>(() => categoryPaths(categories.value).map(({ category, path }) => ({ label: path, value: category.id })))
const hasActiveFilters = computed(() => Boolean(place.value || filters.value.category_id || includeDisposed.value))

function resetFilters() {
	filters.value = { ...filters.value, ...filtersOf(null), category_id: null, disposed: null }
}

const valuation = ref<StockValuation | null>(null)
const register = ref<AssetRegister | null>(null)
const loading = ref(true)
const loadError = ref("")

onMounted(() => void quietly(() => listCategories("asset"), list => (categories.value = list)))

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const f = applied.value
		const where = placeOf(chainOf(f))
		;[valuation.value, register.value] = await Promise.all([stockValuation(where), assetRegister(f.disposed === "1", { place: where, category_id: f.category_id })])
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
		render: row => h("span", { class: "add-numeric font-semibold text-[var(--add-success-text)]" }, money(row.value, valuation.value?.currency))
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
		render: row => h("span", { class: "add-numeric text-[var(--add-warning-text)]" }, money(row.accumulated, row.currency))
	},
	{
		title: t("inventory.assets.bookValue"),
		key: "book_value",
		width: 140,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric font-semibold text-[var(--add-success-text)]" }, money(row.book_value, row.currency))
	}
])
</script>
