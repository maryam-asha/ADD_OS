<!-- src/add-os/modules/inventory/views/AssetsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<!-- Page Header -->
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryAssets')" :description="t('inventory.assets.description')">
			<template #actions>
				<n-button v-if="mayManage" type="primary" @click="registerVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("inventory.assets.register") }}
				</n-button>
			</template>
		</HrPageHeader>

		<!-- Stat Cards -->
		<div v-if="!loadError && assets.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)] bg-white p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-secondary)]">{{ t("inventory.reports.assetRegister") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--add-surface-sunken)] text-[var(--add-text-secondary)]">
						<Icon name="carbon:box" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-text-primary)]">{{ totalCount }}</span>
					<span class="text-xs font-medium text-[var(--add-text-muted)]">{{ t("inventory.kind.asset") }}</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)] bg-white p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-secondary)]">{{ t("inventory.assetStatus.in_service") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--add-success)_10%,transparent)] text-[var(--add-success-text)]">
						<Icon name="carbon:checkmark-outline" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-success-text)]">{{ inServiceCount }}</span>
					<span class="text-xs font-medium text-[var(--add-text-muted)]">{{ assets.length ? Math.round((inServiceCount / assets.length) * 100) : 0 }}%</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)] bg-white p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-secondary)]">{{ t("inventory.assetStatus.in_maintenance") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--add-warning)_10%,transparent)] text-[var(--add-warning-text)]">
						<Icon name="carbon:tool-kit" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-warning-text)]">{{ inMaintenanceCount }}</span>
					<span class="text-xs font-medium text-[var(--add-text-muted)]">{{ t("inventory.history.maintenance") }}</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)] bg-white p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-secondary)]">{{ t("inventory.history.custody") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--add-info)_10%,transparent)] text-[var(--add-info-text)]">
						<Icon name="carbon:user-follow" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-info-text)]">{{ inCustodyCount }}</span>
					<span class="text-xs font-medium text-[var(--add-text-muted)]">{{ t("inventory.assets.custodian") }}</span>
				</div>
			</div>
		</div>

		<!-- Filters Section: Two rows side by side (2x2 grid) -->
		<div class="rounded-2xl border border-[var(--add-border)] bg-white p-4 shadow-xs">
			<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
				<!-- Row 1: Search + Status -->
				<div>
					<n-input v-model:value="filters.search" :placeholder="t('inventory.assets.search')" clearable class="w-full">
						<template #prefix>
							<Icon name="carbon:search" :size="16" class="text-[var(--add-text-muted)]" />
						</template>
					</n-input>
				</div>
				<div>
					<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('inventory.common.status')" clearable class="w-full" />
				</div>

				<!-- Row 2: Category + Location -->
				<div>
					<n-select v-model:value="filters.category_id" :options="categoryOptions" :placeholder="t('inventory.common.category')" clearable filterable class="w-full" />
				</div>
				<div>
					<PlacePicker v-model:chain="placeChain" :value="place" inline />
				</div>

				<!-- Row 3: Item + Custodian -->
				<div>
					<ItemSelect v-model:value="filters.item_id" kind="asset" :placeholder="t('inventory.stock.allItems')" />
				</div>
				<div>
					<CustodianPicker v-model:value="custodian" inline />
				</div>
			</div>

			<div v-if="hasActiveFilters" class="mt-3 flex items-center justify-end border-t border-[var(--add-border)] pt-3">
				<n-button quaternary size="small" @click="resetFilters">
					<template #icon><Icon name="carbon:reset" :size="14" /></template>
					{{ t("inventory.common.resetFilters") }}
				</n-button>
			</div>
		</div>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<!-- Assets Table Card -->
		<n-card class="add-ledger-table rounded-2xl border border-[var(--add-border)] shadow-xs" :bordered="false" size="small">
			<n-data-table :columns :data="assets" :loading :bordered="false" :row-props size="small" :scroll-x="960">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 text-[var(--add-text-muted)]">
						<Icon name="carbon:box" :size="40" class="mb-2 opacity-50" />
						<span>{{ t("inventory.assets.empty") }}</span>
					</div>
				</template>
			</n-data-table>

			<div v-if="lastPage > 1" class="flex flex-col items-center justify-between gap-3 border-t border-[var(--add-border)] p-4 sm:flex-row">
				<span class="text-xs text-[var(--add-text-muted)]">
					{{ t("inventory.assets.registered.other", { n: totalCount }) }}
				</span>
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<RegisterAssetModal v-if="mayManage" v-model:show="registerVisible" :place :place-chain @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Asset, AssetStatus, Category, CustodianRef } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NInput, NPagination, NSelect } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canManageAssets } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import AssetStatusTag from "@/add-os/modules/inventory/components/AssetStatusTag.vue"
import CustodianPicker from "@/add-os/modules/inventory/components/CustodianPicker.vue"
import ItemSelect from "@/add-os/modules/inventory/components/ItemSelect.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import RegisterAssetModal from "@/add-os/modules/inventory/components/RegisterAssetModal.vue"
import { ASSET_STATUSES } from "@/add-os/modules/inventory/types/inventory"
import { custodianOf } from "@/add-os/modules/inventory/utils/custodianFilter"
import { categoryPaths, codeChip, custodianLabel, localized, nameCell, PLACE_COLUMN, placeLabel, viewActionColumn } from "@/add-os/modules/inventory/utils/display"
import { chainOf, PLACE_FILTER_SCHEMA, placeOf, usePlaceFilter } from "@/add-os/modules/inventory/utils/placeFilter"
import { listAssets, listCategories } from "@/add-os/services/inventory"
import Icon from "@/components/common/Icon.vue"

/**
 * Every asset — one physical thing each — by code or serial, status,
 * category, place (a place includes everything inside it), item and who
 * holds it, all kept in the URL. A row opens the asset: its history,
 * custody, maintenance, and the actions on it.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const mayManage = canManageAssets()

const assets = ref<Asset[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const totalCount = ref(0)
const registerVisible = ref(false)
const categories = ref<Category[]>([])

const { filters, applied, page } = useRouteFilters(
	{ search: "string", status: "string", category_id: "number", item_id: "number", custodian_type: "string", custodian_id: "number", ...PLACE_FILTER_SCHEMA },
	() => void load(),
	{ debounced: ["search"] }
)
/** The filter's levels too, so registering starts on the place the list is filtered to. */
const { place, chain: placeChain } = usePlaceFilter(filters)

const custodian = computed<CustodianRef | null>({
	get: () => custodianOf(filters.value.custodian_type, filters.value.custodian_id),
	set: next => {
		filters.value = { ...filters.value, custodian_type: next?.type ?? null, custodian_id: next?.id ?? null }
	}
})

const hasActiveFilters = computed(() => Boolean(filters.value.search || filters.value.status || filters.value.category_id || filters.value.item_id || custodian.value || place.value))

function resetFilters() {
	filters.value = { ...filters.value, search: "", status: null, category_id: null, item_id: null, custodian_type: null, custodian_id: null }
	placeChain.value = null
}

const inServiceCount = computed(() => assets.value.filter(a => a.status === "in_service").length)
const inMaintenanceCount = computed(() => assets.value.filter(a => a.status === "in_maintenance").length)
const inCustodyCount = computed(() => assets.value.filter(a => a.custodian !== null).length)

onMounted(() => void quietly(() => listCategories("asset"), rows => (categories.value = rows)))

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listAssets({
			page: page.value,
			search: applied.value.search,
			status: applied.value.status as AssetStatus | null,
			category_id: applied.value.category_id,
			item_id: applied.value.item_id,
			custodian: custodianOf(applied.value.custodian_type, applied.value.custodian_id),
			location: placeOf(chainOf(applied.value))
		})
		assets.value = result.data
		lastPage.value = result.meta.last_page
		totalCount.value = result.meta.total ?? result.data.length
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

const statusOptions = computed<SelectOption[]>(() => ASSET_STATUSES.map(s => ({ label: t(`inventory.assetStatus.${s}`), value: s })))
const categoryOptions = computed<SelectOption[]>(() => categoryPaths(categories.value).map(({ category, path }) => ({ label: path, value: category.id })))

function openAsset(assetId: number) {
	void router.push({ name: "inventory.inventoryAsset", params: { id: assetId } })
}

function rowProps(row: Asset) {
	return {
		class: "cursor-pointer transition-colors hover:bg-[var(--add-surface-sunken)]",
		onClick: () => openAsset(row.id)
	}
}

const columns = computed<DataTableColumns<Asset>>(() => [
	{
		title: t("inventory.assets.code"),
		key: "code",
		width: 130,
		render: row => codeChip(row.code)
	},
	{
		title: t("inventory.assets.item"),
		key: "item",
		minWidth: 220,
		ellipsis: { tooltip: true },
		render: row => nameCell(localized(row.item.name), localized(row.item.category.name))
	},
	{
		title: t("inventory.assets.location"),
		key: "location",
		...PLACE_COLUMN,
		render: row => placeLabel(row.location)
	},
	{
		title: t("inventory.assets.custodian"),
		key: "custodian",
		minWidth: 160,
		ellipsis: { tooltip: true },
		render: row => custodianLabel(row.custodian)
	},
	{
		title: t("inventory.common.status"),
		key: "status",
		width: 130,
		align: "center",
		render: row => h(AssetStatusTag, { status: row.status })
	},
	viewActionColumn<Asset>(row => openAsset(row.id), t("inventory.common.view"))
])
</script>
