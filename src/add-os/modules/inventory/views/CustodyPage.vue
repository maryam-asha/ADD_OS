<!-- src/add-os/modules/inventory/views/CustodyPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryCustody')" :description="t('inventory.custody.description')" />

		<!-- Stat Cards -->
		<div v-if="!loadError && rows.length" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.history.custody") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
						<Icon name="carbon:catalog" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{{ totalCount }}</span>
					<span class="text-xs font-medium text-slate-400">{{ t("inventory.common.all") }}</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.history.stillHeld") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400">
						<Icon name="carbon:user-follow" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-amber-500 dark:text-amber-400">{{ activeHeldCount }}</span>
					<span class="text-xs font-medium text-slate-400">{{ rows.length ? Math.round((activeHeldCount / rows.length) * 100) : 0 }}%</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.history.returned") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
						<Icon name="carbon:undo" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{{ returnedCount }}</span>
					<span class="text-xs font-medium text-slate-400">{{ t("inventory.history.returned") }}</span>
				</div>
			</div>
		</div>

		<!-- Filters Section -->
		<div class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<CustodianPicker v-model:value="custodian" inline />
				<div class="flex items-center gap-3">
					<n-checkbox v-model:checked="includeReturned">{{ t("inventory.custody.includeReturned") }}</n-checkbox>
					<n-button v-if="hasActiveFilters" quaternary size="small" @click="resetFilters">
						<template #icon><Icon name="carbon:reset" :size="14" /></template>
						{{ t("inventory.common.resetFilters") }}
					</n-button>
				</div>
			</div>
		</div>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<!-- Table Card -->
		<n-card class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false" size="small">
			<n-data-table :columns="columns" :data="rows" :loading="loading" :bordered="false" :row-props="rowProps" size="small" :scroll-x="980">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
						<Icon name="carbon:user-follow" :size="40" class="mb-2 opacity-50" />
						<span>{{ t("inventory.custody.empty") }}</span>
					</div>
				</template>
			</n-data-table>

			<div v-if="lastPage > 1" class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 p-4 sm:flex-row dark:border-slate-800/80">
				<span class="text-xs text-slate-400">
					{{ t("inventory.common.all") }}: {{ totalCount }}
				</span>
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { AssetAssignment, CustodianRef, CustodianType } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NCheckbox, NDataTable, NPagination, NTag } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import CustodianPicker from "@/add-os/modules/inventory/components/CustodianPicker.vue"
import { custodianLabel, EMPTY, localized, nameCell, viewActionColumn } from "@/add-os/modules/inventory/utils/display"
import { listCustody } from "@/add-os/services/inventory"
import { formatDate, formatDateTime, formatTime } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/**
 * Who holds what: every asset in someone's custody — or, for one employee,
 * member or company, everything they hold (what an employee leaving hands
 * back). A row opens the asset, where it is taken back.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

const custodian = ref<CustodianRef | null>(null)
const includeReturned = ref(false)
const rows = ref<AssetAssignment[]>([])
const page = ref(1)
const lastPage = ref(1)
const totalCount = ref(0)
const loading = ref(true)
const loadError = ref("")

const hasActiveFilters = computed(() => Boolean(custodian.value || includeReturned.value))

function resetFilters() {
	custodian.value = null
	includeReturned.value = false
}

const activeHeldCount = computed(() => rows.value.filter(r => !r.returned_at).length)
const returnedCount = computed(() => rows.value.filter(r => Boolean(r.returned_at)).length)

onMounted(load)
watch([custodian, includeReturned], () => {
	if (page.value !== 1) page.value = 1
	else void load()
})
watch(page, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listCustody({ page: page.value, custodian: custodian.value, open: !includeReturned.value })
		rows.value = result.data
		lastPage.value = result.meta.last_page
		totalCount.value = result.meta.total ?? result.data.length
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

function openAsset(assetId: number) {
	void router.push({ name: "inventory.inventoryAsset", params: { id: assetId } })
}

function rowProps(row: AssetAssignment) {
	return {
		class: "cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
		onClick: () => openAsset(row.asset_id)
	}
}

const CUSTODIAN_TAG_TYPES: Record<CustodianType, "info" | "success" | "default"> = {
	hr_employee: "info",
	member: "success",
	company: "default"
}

const columns = computed<DataTableColumns<AssetAssignment>>(() => [
	{
		title: t("inventory.assets.item"),
		key: "asset",
		minWidth: 200,
		width: 220,
		ellipsis: { tooltip: true },
		render: row =>
			nameCell(row.asset ? localized(row.asset.item.name) : EMPTY, row.asset?.code ?? `#${row.asset_id}`, { code: true })
	},
	{
		title: t("inventory.assets.custodian"),
		key: "custodian",
		minWidth: 190,
		width: 210,
		ellipsis: { tooltip: true },
		render: row =>
			h("div", { class: "flex min-w-0 flex-col gap-1 leading-tight" }, [
				h("span", { class: "truncate font-semibold", title: custodianLabel(row.custodian) }, custodianLabel(row.custodian)),
				h("div", [
					h(
						NTag,
						{ size: "small", round: true, type: CUSTODIAN_TAG_TYPES[row.custodian.type] },
						() => t(`inventory.custodianType.${row.custodian.type}`)
					)
				])
			])
	},
	{
		title: t("inventory.history.handedOver"),
		key: "assigned_at",
		width: 160,
		render: row => {
			if (!row.assigned_at) return EMPTY
			return h("div", { class: "flex flex-col gap-0.5 leading-tight" }, [
				h("span", { class: "font-medium text-xs whitespace-nowrap" }, formatDate(row.assigned_at)),
				h("span", { class: "text-[11px] text-slate-400 font-mono whitespace-nowrap" }, formatTime(row.assigned_at))
			])
		}
	},
	{
		title: t("inventory.history.returned"),
		key: "returned_at",
		width: 140,
		align: "center",
		render: row =>
			row.returned_at
				? h("div", { class: "flex flex-col gap-0.5 leading-tight" }, [
						h("span", { class: "font-medium text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap" }, formatDate(row.returned_at)),
						h("span", { class: "text-[11px] text-slate-400 font-mono whitespace-nowrap" }, formatTime(row.returned_at))
					])
				: h(NTag, { size: "small", round: true, type: "warning" }, () => t("inventory.history.stillHeld"))
	},
	{
		title: t("inventory.common.note"),
		key: "note",
		width: 180,
		ellipsis: { tooltip: true },
		render: row => row.note ?? EMPTY
	},
	viewActionColumn<AssetAssignment>(row => openAsset(row.asset_id), t("inventory.common.view"))
])
</script>
