<!-- src/add-os/modules/inventory/views/InventoryReportsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryReports')" :description="t('inventory.reports.description')" />

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card :title="t('inventory.reports.stockValuation')" size="small" class="add-ledger-table">
			<template #header-extra>
				<span v-if="valuation" class="add-numeric text-base font-bold">{{ money(valuation.total, valuation.currency) }}</span>
			</template>
			<div class="mb-3 flex flex-wrap items-center gap-3">
				<PlacePicker v-model:value="place" inline />
			</div>
			<n-data-table :columns="valuationColumns" :data="valuation?.locations ?? []" :loading :bordered="false" size="small" :scroll-x="600">
				<template #empty>
					<span class="text-secondary">{{ t("inventory.stock.emptyBalances") }}</span>
				</template>
			</n-data-table>
		</n-card>

		<n-card :title="t('inventory.reports.assetRegister')" size="small" class="add-ledger-table">
			<template #header-extra>
				<n-checkbox v-model:checked="includeDisposed">{{ t("inventory.reports.includeDisposed") }}</n-checkbox>
			</template>
			<div v-if="register?.totals.length" class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div v-for="total in register.totals" :key="total.currency" class="rounded-add-default bg-[var(--add-surface-sunken)] p-3 text-sm">
					<div class="font-semibold">{{ total.currency }}</div>
					<div>{{ t("inventory.assets.cost") }}: <span class="add-numeric">{{ money(total.cost, total.currency) }}</span></div>
					<div>{{ t("inventory.assets.accumulated") }}: <span class="add-numeric">{{ money(total.accumulated, total.currency) }}</span></div>
					<div class="font-semibold">{{ t("inventory.assets.bookValue") }}: <span class="add-numeric">{{ money(total.book_value, total.currency) }}</span></div>
				</div>
			</div>
			<n-data-table :columns="registerColumns" :data="register?.assets ?? []" :loading :bordered="false" size="small" :scroll-x="1000" :pagination="{ pageSize: 25 }" />
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { AssetRegister, AssetRegisterRow, PlaceRef, StockValuation } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NCard, NCheckbox, NDataTable } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import AssetStatusTag from "@/add-os/modules/inventory/components/AssetStatusTag.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import { EMPTY, localized, money, nameCell, PLACE_COLUMN, placeLabel } from "@/add-os/modules/inventory/utils/display"
import { assetRegister, stockValuation } from "@/add-os/services/inventory"
import { formatNumber } from "@/add-os/utils/format"
import { formatDate } from "@/add-os/utils/format/dates"

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

type ValuationRow = StockValuation["locations"][number]

const valuationColumns = computed<DataTableColumns<ValuationRow>>(() => [
	{ title: t("inventory.stock.location"), key: "location", ...PLACE_COLUMN, render: row => placeLabel(row.location) },
	{ title: t("inventory.reports.items"), key: "items", minWidth: 90, render: row => formatNumber(row.items) },
	{ title: t("inventory.stock.value"), key: "value", minWidth: 120, render: row => h("span", { class: "add-numeric font-semibold" }, money(row.value, valuation.value?.currency)) }
])

const registerColumns = computed<DataTableColumns<AssetRegisterRow>>(() => [
	{
		title: t("inventory.assets.item"),
		key: "item",
		minWidth: 200,
		render: row =>
			nameCell(localized(row.item.name), row.code, { code: true })
	},
	{ title: t("inventory.assets.location"), key: "location", ...PLACE_COLUMN, render: row => placeLabel(row.location) },
	{ title: t("inventory.common.status"), key: "status", minWidth: 110, render: row => h(AssetStatusTag, { status: row.status }) },
	{ title: t("inventory.assets.purchasedOn"), key: "purchased_on", minWidth: 110, render: row => (row.purchased_on ? formatDate(row.purchased_on) : EMPTY) },
	{ title: t("inventory.assets.cost"), key: "purchase_cost", minWidth: 110, render: row => h("span", { class: "add-numeric" }, money(row.purchase_cost, row.currency)) },
	{ title: t("inventory.assets.accumulated"), key: "accumulated", minWidth: 110, render: row => h("span", { class: "add-numeric" }, money(row.accumulated, row.currency)) },
	{ title: t("inventory.assets.bookValue"), key: "book_value", minWidth: 110, render: row => h("span", { class: "add-numeric font-semibold" }, money(row.book_value, row.currency)) }
])
</script>
