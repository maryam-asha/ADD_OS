<!-- src/add-os/modules/inventory/views/CustodyPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryCustody')" :description="t('inventory.custody.description')" />

		<!-- Stat Cards -->
		<div v-if="!loadError && rows.length" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)] bg-white p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-secondary)]">{{ t("inventory.history.custody") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--add-surface-sunken)] text-[var(--add-text-secondary)]">
						<Icon name="carbon:catalog" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-text-primary)]">{{ totalCount }}</span>
					<span class="text-xs font-medium text-[var(--add-text-muted)]">{{ t("inventory.common.all") }}</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)] bg-white p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-secondary)]">{{ t("inventory.history.stillHeld") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--add-warning)_10%,transparent)] text-[var(--add-warning-text)]">
						<Icon name="carbon:user-follow" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-warning-text)]">{{ activeHeldCount }}</span>
					<span class="text-xs font-medium text-[var(--add-text-muted)]">{{ rows.length ? Math.round((activeHeldCount / rows.length) * 100) : 0 }}%</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)] bg-white p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-secondary)]">{{ t("inventory.history.returned") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--add-success)_10%,transparent)] text-[var(--add-success-text)]">
						<Icon name="carbon:undo" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-success-text)]">{{ returnedCount }}</span>
					<span class="text-xs font-medium text-[var(--add-text-muted)]">{{ t("inventory.history.returned") }}</span>
				</div>
			</div>
		</div>

		<!-- Filters Section -->
		<div class="rounded-2xl border border-[var(--add-border)] bg-white p-4 shadow-xs">
			<div class="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
				<n-input v-model:value="filters.search" :placeholder="t('inventory.assets.search')" clearable class="w-full">
					<template #prefix><Icon name="carbon:search" :size="16" class="text-[var(--add-text-muted)]" /></template>
				</n-input>
				<n-select v-model:value="filters.category_id" :options="categoryOptions" :placeholder="t('inventory.common.category')" clearable filterable class="w-full" />
				<!-- Where the asset sits: a branch takes everything in it. -->
				<div class="sm:col-span-2">
					<PlacePicker v-model:chain="placeChain" :value="place" inline />
				</div>
			</div>
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
		<n-card class="add-ledger-table rounded-2xl border border-[var(--add-border)] shadow-xs" :bordered="false" size="small">
			<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="980">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 text-[var(--add-text-muted)]">
						<Icon name="carbon:user-follow" :size="40" class="mb-2 opacity-50" />
						<span>{{ t("inventory.custody.empty") }}</span>
					</div>
				</template>
			</n-data-table>

			<div v-if="lastPage > 1" class="flex flex-col items-center justify-between gap-3 border-t border-[var(--add-border)] p-4 sm:flex-row">
				<span class="text-xs text-[var(--add-text-muted)]">
					{{ t("inventory.common.all") }}: {{ totalCount }}
				</span>
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { AssetAssignment, Category, CustodianRef, CustodianType } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NCheckbox, NDataTable, NInput, NPagination, NSelect, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import CustodianPicker from "@/add-os/modules/inventory/components/CustodianPicker.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import { custodianOf } from "@/add-os/modules/inventory/utils/custodianFilter"
import { categoryPaths, custodianLabel, EMPTY, localized, nameCell, viewActionColumn } from "@/add-os/modules/inventory/utils/display"
import { chainOf, filtersOf, PLACE_FILTER_SCHEMA, placeOf, usePlaceFilter } from "@/add-os/modules/inventory/utils/placeFilter"
import { listCategories, listCustody } from "@/add-os/services/inventory"
import { formatDate, formatTime } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/**
 * Who holds what: every asset in someone's custody — or, for one employee,
 * member or company, everything they hold (what an employee leaving hands
 * back). Narrowed too by where the asset sits (a branch takes everything
 * in it), its category, or its code or serial — all kept in the URL. A row
 * opens the asset, where it is taken back.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

const rows = ref<AssetAssignment[]>([])
const categories = ref<Category[]>([])

const { filters, applied, page } = useRouteFilters(
	{ search: "string", category_id: "number", custodian_type: "string", custodian_id: "number", returned: "string", ...PLACE_FILTER_SCHEMA },
	() => void load(),
	{ debounced: ["search"] }
)
const { place, chain: placeChain } = usePlaceFilter(filters)

const custodian = computed<CustodianRef | null>({
	get: () => custodianOf(filters.value.custodian_type, filters.value.custodian_id),
	set: next => {
		filters.value = { ...filters.value, custodian_type: next?.type ?? null, custodian_id: next?.id ?? null }
	}
})
const includeReturned = computed<boolean>({
	get: () => filters.value.returned === "1",
	set: on => (filters.value.returned = on ? "1" : null)
})
const categoryOptions = computed<SelectOption[]>(() => categoryPaths(categories.value).map(({ category, path }) => ({ label: path, value: category.id })))
const lastPage = ref(1)
const totalCount = ref(0)
const loading = ref(true)
const loadError = ref("")

const hasActiveFilters = computed(() => Boolean(custodian.value || includeReturned.value || filters.value.search || filters.value.category_id || place.value))

function resetFilters() {
	filters.value = { ...filters.value, ...filtersOf(null), search: "", category_id: null, custodian_type: null, custodian_id: null, returned: null }
}

const activeHeldCount = computed(() => rows.value.filter(r => !r.returned_at).length)
const returnedCount = computed(() => rows.value.filter(r => Boolean(r.returned_at)).length)

onMounted(() => void quietly(() => listCategories("asset"), list => (categories.value = list)))

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const f = applied.value
		const result = await listCustody({
			page: page.value,
			custodian: custodianOf(f.custodian_type, f.custodian_id),
			open: f.returned !== "1",
			place: placeOf(chainOf(f)),
			category_id: f.category_id,
			search: f.search
		})
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
		class: "cursor-pointer transition-colors hover:bg-[var(--add-surface-sunken)]",
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
				h("span", { class: "text-[11px] text-[var(--add-text-muted)] font-mono whitespace-nowrap" }, formatTime(row.assigned_at))
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
						h("span", { class: "font-medium text-xs text-[var(--add-text-secondary)] whitespace-nowrap" }, formatDate(row.returned_at)),
						h("span", { class: "text-[11px] text-[var(--add-text-muted)] font-mono whitespace-nowrap" }, formatTime(row.returned_at))
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
