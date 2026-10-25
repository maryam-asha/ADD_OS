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

		<HrToolbar>
			<!-- Width carries "!": Naive's runtime CSS outranks Tailwind's layer (see PlacePicker). -->
			<ItemSelect v-model:value="itemId" kind="stock" :placeholder="t('inventory.stock.allItems')" class="sm:w-64!" />
			<PlacePicker v-model:value="place" inline />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card size="small" class="add-ledger-table">
			<n-tabs v-model:value="tab" type="line" animated>
				<n-tab-pane name="balances" :tab="t('inventory.stock.balances')">
					<n-data-table :columns="balanceColumns" :data="balances" :loading :bordered="false" size="small" :scroll-x="tableWidth(balanceColumns)">
						<template #empty>
							<span class="text-secondary">{{ t("inventory.stock.emptyBalances") }}</span>
						</template>
					</n-data-table>
				</n-tab-pane>
				<n-tab-pane name="movements" :tab="t('inventory.stock.movements')">
					<n-select v-model:value="movementType" :options="typeOptions" :placeholder="t('inventory.stock.type')" clearable class="mb-3 max-w-xs" />
					<n-data-table :columns="movementColumns" :data="movements" :loading :bordered="false" size="small" :scroll-x="tableWidth(movementColumns)">
						<template #empty>
							<span class="text-secondary">{{ t("inventory.stock.emptyMovements") }}</span>
						</template>
					</n-data-table>
				</n-tab-pane>
			</n-tabs>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<StockActionModal v-model:show="actionVisible" :mode @done="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { PlaceRef, StockBalance, StockMode, StockMovement, StockMovementType } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NPagination, NSelect, NTabPane, NTabs } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canCountStock, canIssueStock, canReceiveStock, canTransferStock } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import ItemSelect from "@/add-os/modules/inventory/components/ItemSelect.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import StockActionModal from "@/add-os/modules/inventory/components/StockActionModal.vue"
import { STOCK_MOVEMENT_TYPES } from "@/add-os/modules/inventory/types/inventory"
import { COLUMN, EMPTY, localized, money, nameCell, placeLabel, quantity, tableWidth } from "@/add-os/modules/inventory/utils/display"
import { listBalances, listStockMovements } from "@/add-os/services/inventory"
import { formatDateTime } from "@/add-os/utils/format/dates"
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
const loading = ref(true)
const loadError = ref("")
const balances = ref<StockBalance[]>([])
const movements = ref<StockMovement[]>([])
const mode = ref<StockMode>("receive")
const actionVisible = ref(false)

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
		} else {
			const result = await listStockMovements({ ...filters, type: movementType.value })
			movements.value = result.data
			lastPage.value = result.meta.last_page
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

const balanceColumns = computed<DataTableColumns<StockBalance>>(() => [
	{ title: t("inventory.stock.item"), key: "item", ...COLUMN.name, render: row => itemCell(row.item) },
	{ title: t("inventory.stock.location"), key: "location", ...COLUMN.place, render: row => placeLabel(row.location) },
	{ title: t("inventory.stock.onHand"), key: "quantity", ...COLUMN.quantity, render: row => h("span", { class: "add-numeric font-semibold" }, `${quantity(row.quantity)} ${localized(row.item.unit.name)}`) },
	{ title: t("inventory.stock.averageCost"), key: "average_cost", ...COLUMN.money, render: row => h("span", { class: "add-numeric" }, money(row.average_cost, row.currency)) },
	{ title: t("inventory.stock.value"), key: "value", ...COLUMN.money, render: row => h("span", { class: "add-numeric" }, money(row.value, row.currency)) }
])

const movementColumns = computed<DataTableColumns<StockMovement>>(() => [
	{ title: t("inventory.history.when"), key: "created_at", ...COLUMN.dateTime, render: row => (row.created_at ? formatDateTime(row.created_at) : EMPTY) },
	{ title: t("inventory.stock.item"), key: "item", ...COLUMN.name, render: row => itemCell(row.item) },
	{ title: t("inventory.stock.location"), key: "location", ...COLUMN.place, render: row => placeLabel(row.location) },
	{
		title: t("inventory.stock.type"),
		key: "type",
		width: 170,
		render: row => [t(`inventory.movementType.${row.type}`), row.reason ? ` · ${t(`inventory.issueReason.${row.reason}`)}` : ""].join("")
	},
	{
		title: t("inventory.stock.quantity"),
		key: "quantity",
		...COLUMN.quantity,
		render: row => h("span", { class: `add-numeric font-semibold ${row.quantity.startsWith("-") ? "text-error" : "text-success"}`, dir: "ltr" }, quantity(row.quantity))
	},
	{ title: t("inventory.stock.after"), key: "quantity_after", ...COLUMN.quantity, render: row => h("span", { class: "add-numeric" }, quantity(row.quantity_after)) },
	{ title: t("inventory.stock.unitCost"), key: "unit_cost", ...COLUMN.money, render: row => h("span", { class: "add-numeric" }, quantity(row.unit_cost)) },
	{ title: t("inventory.common.note"), key: "note", ...COLUMN.text, render: row => row.note ?? EMPTY },
	{ title: t("inventory.history.by"), key: "actor", ...COLUMN.person, render: row => row.actor?.name ?? EMPTY }
])
</script>
