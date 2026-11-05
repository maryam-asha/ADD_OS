<!-- src/add-os/modules/plans/views/ItemSalesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.itemSales") }}</h1>
			<p class="max-w-3xl text-sm text-secondary">{{ t("retail.sell.description") }}</p>
		</div>

		<n-card :title="t('retail.sell.title')" size="small">
			<div class="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
				<n-form-item :label="t('retail.sell.member')" required>
					<n-select v-model:value="memberId" :options="memberOptions" filterable clearable :placeholder="t('retail.sell.pickMember')" />
				</n-form-item>
				<n-form-item :label="t('retail.sell.paymentMethod')" required>
					<n-radio-group v-model:value="method">
						<n-radio-button value="cash">{{ t("retail.sell.cash") }}</n-radio-button>
						<n-radio-button value="wallet">{{ t("retail.sell.wallet") }}</n-radio-button>
					</n-radio-group>
				</n-form-item>
				<n-form-item v-if="method === 'cash'" :label="t('retail.sell.currency')">
					<CurrencySelect v-model:value="currency" clearable />
				</n-form-item>
			</div>

			<n-form-item :label="t('retail.sell.warehouse')" :feedback="t('retail.sell.warehouseHint')" class="max-w-md">
				<n-select v-model:value="warehouseId" :options="warehouseOptions" clearable />
			</n-form-item>

			<span class="mb-2 block text-sm font-semibold">{{ t("retail.sell.lines") }}</span>
			<n-input v-model:value="scanned" :placeholder="t('retail.sell.scan')" dir="ltr" clearable class="mb-2 max-w-md" @keydown.enter.prevent="scan">
				<template #prefix><Icon name="carbon:barcode" :size="16" /></template>
			</n-input>
			<p v-if="scanProblem" class="mb-2 text-xs text-error">{{ scanProblem }}</p>
			<div v-for="(line, index) in lines" :key="index" class="mb-2 flex flex-wrap items-center gap-2">
				<n-select v-model:value="line.saleItemId" :options="saleItemOptions" filterable :placeholder="t('retail.sell.pickItem')" class="min-w-[16rem] flex-1" />
				<n-input-number v-model:value="line.quantity" :min="1" :max="1000" :precision="0" class="w-28" />
				<span class="add-numeric w-28 text-sm text-secondary">{{ lineTotal(line) }}</span>
				<n-button text type="error" :aria-label="t('retail.sell.removeLine')" :title="t('retail.sell.removeLine')" :disabled="lines.length === 1" @click="lines.splice(index, 1)">
					<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
				</n-button>
			</div>
			<n-button size="small" dashed @click="lines.push({ saleItemId: null, quantity: 1 })">
				<template #icon><Icon name="carbon:add" :size="16" /></template>{{ t("retail.sell.addLine") }}
			</n-button>

			<div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--add-border)] pt-3">
				<span class="text-base font-bold">{{ t("retail.sell.total") }}: <span class="add-numeric">{{ t("retail.points", { n: formatNumber(total) }) }}</span></span>
				<n-button type="primary" :loading="selling" :disabled="!ready" @click="sell">
					<template #icon><Icon name="carbon:shopping-cart" :size="16" /></template>{{ t("retail.sell.confirm") }}
				</n-button>
			</div>
			<p v-if="problem" class="mt-2 text-sm text-error">{{ problem }}</p>
		</n-card>

		<n-card :title="t('retail.sales.title')" size="small" class="add-ledger-table">
			<n-alert v-if="loadError" type="error" :title="loadError" class="mb-3" />
			<n-data-table :columns :data="sales" :loading :bordered="false" size="small" :scroll-x="900">
				<template #empty>
					<span class="text-secondary">{{ t("retail.sales.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ItemSale, ItemSalePaymentMethod, ReceptionWarehouse, SaleItem } from "@/add-os/modules/plans/types/retail"
import type { SaleLine } from "@/add-os/modules/plans/utils/saleLines"
import { NAlert, NButton, NCard, NDataTable, NFormItem, NInput, NInputNumber, NPagination, NRadioButton, NRadioGroup, NSelect, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { COLUMN, localized, warehouseLabel } from "@/add-os/modules/inventory/utils/display"
import { salePayload, scanSaleItem } from "@/add-os/modules/plans/utils/saleLines"
import { listMembers } from "@/add-os/services/members"
import { listItemSales, listReceptionWarehouses, listSaleItems, sellItems } from "@/add-os/services/retail"
import { formatNumber } from "@/add-os/utils/format"
import { formatDateTime } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/**
 * Selling at the desk: a member, what they buy and how many, paid from
 * their points or with money handed over at today's price, added by
 * scanning a barcode or by picking. The stock leaves the primary warehouse
 * of the branch of the operator's open cash register unless another
 * selling warehouse of that branch is chosen. Points short or a shelf short refuse the whole sale —
 * nothing is charged and nothing leaves the shelf. Below, the sales made.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

type Line = SaleLine

const memberOptions = ref<SelectOption[]>([])
const saleItems = ref<SaleItem[]>([])
const memberId = ref<number | null>(null)
const method = ref<ItemSalePaymentMethod>("cash")
const currency = ref<string | null>(null)
const warehouses = ref<ReceptionWarehouse[]>([])
const warehouseId = ref<number | null>(null)
const scanned = ref("")
const scanProblem = ref("")
const lines = ref<Line[]>([{ saleItemId: null, quantity: 1 }])
const selling = ref(false)
const problem = ref("")

const sales = ref<ItemSale[]>([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(true)
const loadError = ref("")

onMounted(() => {
	void quietly(listMembers, members => (memberOptions.value = members.map(m => ({ label: `${m.name} · ${m.phone}`, value: m.id }))))
	void quietly(listSaleItems, rows => (saleItems.value = rows.filter(row => row.is_active)))
	void quietly(listReceptionWarehouses, rows => {
		warehouses.value = rows.filter(row => row.allows_sales)
		warehouseId.value = warehouses.value.find(row => row.is_primary)?.id ?? null
	})
	void load()
})
watch(page, () => void load())

const warehouseOptions = computed<SelectOption[]>(() => warehouses.value.map(row => ({ label: localized(row.name), value: row.id })))

function scan() {
	const result = scanSaleItem(lines.value, saleItems.value, scanned.value)
	scanProblem.value = result.found || !scanned.value.trim() ? "" : t("retail.sell.notForSale")
	lines.value = result.lines
	scanned.value = ""
}

const saleItemOptions = computed<SelectOption[]>(() =>
	saleItems.value.map(row => ({ label: `${localized(row.item.name)} · ${t("retail.points", { n: formatNumber(row.price_points) })}`, value: row.id }))
)

function priceOf(line: Line): number {
	return (saleItems.value.find(row => row.id === line.saleItemId)?.price_points ?? 0) * line.quantity
}

function lineTotal(line: Line): string {
	return line.saleItemId ? t("retail.points", { n: formatNumber(priceOf(line)) }) : ""
}

const total = computed(() => lines.value.reduce((sum, line) => sum + priceOf(line), 0))
const ready = computed(() => memberId.value !== null && lines.value.length > 0 && lines.value.every(line => line.saleItemId !== null && line.quantity >= 1))

async function sell() {
	selling.value = true
	problem.value = ""
	try {
		const sale = await sellItems(
			salePayload({
				memberId: memberId.value!,
				method: method.value,
				currency: method.value === "cash" ? currency.value : null,
				warehouseId: warehouseId.value,
				lines: lines.value
			})
		)
		message.success(t("retail.sell.done", { n: formatNumber(sale.total_points) }))
		lines.value = [{ saleItemId: null, quantity: 1 }]
		memberId.value = null
		page.value = 1
		await load()
	} catch (e) {
		problem.value = apiErrorMessage(e, t("retail.sell.error"))
	} finally {
		selling.value = false
	}
}

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listItemSales({ page: page.value })
		sales.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("retail.loadError"))
	} finally {
		loading.value = false
	}
}

const columns = computed<DataTableColumns<ItemSale>>(() => [
	{ title: t("retail.sales.when"), key: "paid_at", minWidth: 150, render: row => (row.paid_at ? formatDateTime(row.paid_at) : "") },
	{ title: t("retail.sell.member"), key: "member", minWidth: 160, render: row => row.member.name },
	{
		title: t("retail.sell.lines"),
		key: "lines",
		minWidth: 240,
		render: row => row.lines.map(line => `${localized(line.item.name)} × ${formatNumber(line.quantity)}`).join(" · ")
	},
	{ title: t("retail.sell.total"), key: "total_points", minWidth: 110, render: row => h("span", { class: "add-numeric font-semibold" }, t("retail.points", { n: formatNumber(row.total_points) })) },
	{ title: t("retail.sales.method"), key: "method", minWidth: 90, render: row => (row.payment ? t(row.payment.method === "wallet" ? "retail.sell.wallet" : "retail.sell.cash") : "") },
	{ title: t("retail.sell.warehouse"), key: "warehouse", ...COLUMN.place, render: row => warehouseLabel(row.warehouse) },
	{ title: t("retail.sales.soldBy"), key: "sold_by", minWidth: 130, render: row => row.sold_by?.name ?? "" }
])
</script>
