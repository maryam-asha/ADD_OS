<!-- src/add-os/modules/inventory/views/AssetsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryAssets')" :description="t('inventory.assets.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="registerVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("inventory.assets.register") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-input v-model:value="filters.search" :placeholder="t('inventory.assets.search')" clearable class="max-w-xs" />
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('inventory.common.status')" clearable class="max-w-[12rem]" />
			<n-select v-model:value="filters.category_id" :options="categoryOptions" :placeholder="t('inventory.common.category')" clearable filterable class="max-w-xs" />
			<PlacePicker v-model:value="place" inline />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="assets" :loading :bordered="false" :row-props size="small" :scroll-x="980">
				<template #empty>
					<span class="text-secondary">{{ t("inventory.assets.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<RegisterAssetModal v-if="mayManage" v-model:show="registerVisible" @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Asset, AssetStatus, Category, PlaceRef } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NInput, NPagination, NSelect } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canManageAssets } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import AssetStatusTag from "@/add-os/modules/inventory/components/AssetStatusTag.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import RegisterAssetModal from "@/add-os/modules/inventory/components/RegisterAssetModal.vue"
import { ASSET_STATUSES } from "@/add-os/modules/inventory/types/inventory"
import { categoryPaths, custodianLabel, localized, nameCell, PLACE_COLUMN, placeLabel } from "@/add-os/modules/inventory/utils/display"
import { listAssets, listCategories } from "@/add-os/services/inventory"
import Icon from "@/components/common/Icon.vue"

/**
 * Every asset — one physical thing each — by code or serial, status,
 * category and place (a place includes everything inside it). A row opens
 * the asset: its history, custody, maintenance, and the actions on it.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const mayManage = canManageAssets()

const assets = ref<Asset[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const registerVisible = ref(false)
const categories = ref<Category[]>([])
const place = ref<PlaceRef | null>(null)

const { filters, applied, page } = useRouteFilters({ search: "string", status: "string", category_id: "number" }, () => void load(), { debounced: ["search"] })

// The place is not in the URL (a picker of five levels); a new one starts
// again from page one, which reloads through the route filters.
watch(place, () => {
	if (page.value !== 1) page.value = 1
	else void load()
})

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
			location: place.value
		})
		assets.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

const statusOptions = computed<SelectOption[]>(() => ASSET_STATUSES.map(s => ({ label: t(`inventory.assetStatus.${s}`), value: s })))
const categoryOptions = computed<SelectOption[]>(() => categoryPaths(categories.value).map(({ category, path }) => ({ label: path, value: category.id })))

function rowProps(row: Asset) {
	return { class: "cursor-pointer", onClick: () => void router.push({ name: "inventory.inventoryAsset", params: { id: row.id } }) }
}

const columns = computed<DataTableColumns<Asset>>(() => [
	{ title: t("inventory.assets.code"), key: "code", minWidth: 120, render: row => h("span", { class: "font-mono text-xs", dir: "ltr" }, row.code) },
	{
		title: t("inventory.assets.item"),
		key: "item",
		minWidth: 240,
		render: row =>
			nameCell(localized(row.item.name), localized(row.item.category.name))
	},
	{ title: t("inventory.assets.location"), key: "location", ...PLACE_COLUMN, render: row => placeLabel(row.location) },
	{ title: t("inventory.assets.custodian"), key: "custodian", minWidth: 160, render: row => custodianLabel(row.custodian) },
	{ title: t("inventory.common.status"), key: "status", minWidth: 120, render: row => h(AssetStatusTag, { status: row.status }) }
])
</script>
