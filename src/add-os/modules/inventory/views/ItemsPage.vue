<!-- src/add-os/modules/inventory/views/ItemsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryItems')" :description="t('inventory.items.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="edit(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>{{ t("inventory.items.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<!-- Stat Cards -->
		<div v-if="!loadError && items.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.reports.items") }}</span>
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
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.kind.asset") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
						<Icon name="carbon:box" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{{ assetItemsCount }}</span>
					<span class="text-xs font-medium text-slate-400">{{ items.length ? Math.round((assetItemsCount / items.length) * 100) : 0 }}%</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.kind.stock") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
						<Icon name="carbon:layers" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">{{ stockItemsCount }}</span>
					<span class="text-xs font-medium text-slate-400">{{ items.length ? Math.round((stockItemsCount / items.length) * 100) : 0 }}%</span>
				</div>
			</div>

			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("inventory.common.active") }}</span>
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
						<Icon name="carbon:checkmark-outline" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-1">
					<span class="font-mono text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{{ activeItemsCount }}</span>
					<span class="text-xs font-medium text-slate-400">{{ items.length ? Math.round((activeItemsCount / items.length) * 100) : 0 }}%</span>
				</div>
			</div>
		</div>

		<!-- Filters Section: Two rows side by side (2x2 grid) -->
		<div class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
			<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
				<!-- Row 1: Search + Kind -->
				<div>
					<n-input v-model:value="filters.search" :placeholder="t('inventory.itemExtras.searchHint')" clearable class="w-full">
						<template #prefix>
							<Icon name="carbon:search" :size="16" class="text-slate-400" />
						</template>
					</n-input>
				</div>
				<div>
					<n-select v-model:value="filters.kind" :options="kindOptions" :placeholder="t('inventory.catalog.kind')" clearable class="w-full" />
				</div>

				<!-- Row 2: Category + Status -->
				<div>
					<n-select v-model:value="filters.category_id" :options="categoryOptions" :placeholder="t('inventory.common.category')" clearable filterable class="w-full" />
				</div>
				<div>
					<n-select v-model:value="filters.active" :options="activeFilterOptions" :placeholder="t('inventory.common.status')" clearable class="w-full" />
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

		<!-- Table Card -->
		<n-card class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false" size="small">
			<n-data-table :columns :data="items" :loading :bordered="false" size="small" :scroll-x="1000">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
						<Icon name="carbon:catalog" :size="40" class="mb-2 opacity-50" />
						<span>{{ t("inventory.items.empty") }}</span>
					</div>
				</template>
			</n-data-table>

			<div v-if="lastPage > 1" class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 p-4 sm:flex-row dark:border-slate-800/80">
				<span class="text-xs text-slate-400">
					{{ t("inventory.items.count", { n: totalCount }) }}
				</span>
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<ItemModal v-if="mayManage" v-model:show="editorVisible" :item="editing" :categories :units @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { AttributeDefinition, Category, Item, ItemKind, Unit } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NInput, NPagination, NPopconfirm, NSelect, NTag, NTooltip, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageInventoryCatalog } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import ItemModal from "@/add-os/modules/inventory/components/ItemModal.vue"
import { categoryPaths, isolate, localized, nameCell, propertySummary, quantity } from "@/add-os/modules/inventory/utils/display"
import { getCategory, listCategories, listItems, listUnits, removeItem } from "@/add-os/services/inventory"
import { countKey, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The catalog's items, by name or SKU, kind and category (a category
 * includes the ones below it): how many assets each has, or how much is on
 * hand everywhere for stock. An item with history keeps its kind and is
 * deactivated rather than deleted.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const mayManage = canManageInventoryCatalog()

const items = ref<Item[]>([])
const categories = ref<Category[]>([])
const units = ref<Unit[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const totalCount = ref(0)
const editorVisible = ref(false)
const editing = ref<Item | null>(null)
/** Each category's fields, read once, so a property shows under its label rather than its key. */
const fieldsByCategory = ref(new Map<number, AttributeDefinition[]>())

const { filters, applied, page } = useRouteFilters({ search: "string", kind: "string", category_id: "number", active: "string" }, () => void load(), { debounced: ["search"] })

const hasActiveFilters = computed(() => Boolean(filters.value.search || filters.value.kind || filters.value.category_id || filters.value.active))

function resetFilters() {
	filters.value.search = ""
	filters.value.kind = null
	filters.value.category_id = null
	filters.value.active = null
}

const activeFilterOptions = computed<SelectOption[]>(() => [
	{ label: t("inventory.common.active"), value: "true" },
	{ label: t("inventory.common.inactive"), value: "false" }
])

const assetItemsCount = computed(() => items.value.filter(i => i.kind === "asset").length)
const stockItemsCount = computed(() => items.value.filter(i => i.kind === "stock").length)
const activeItemsCount = computed(() => items.value.filter(i => i.is_active).length)

onMounted(() => {
	void quietly(() => listCategories(), rows => (categories.value = rows))
	void quietly(listUnits, rows => (units.value = rows))
})

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const activeFilter = applied.value.active === "true" ? true : applied.value.active === "false" ? false : null
		const result = await listItems({
			page: page.value,
			search: applied.value.search,
			kind: applied.value.kind as ItemKind | null,
			category_id: applied.value.category_id,
			active: activeFilter
		})
		items.value = result.data
		lastPage.value = result.meta.last_page
		totalCount.value = result.meta.total ?? result.data.length
		void loadFields(result.data)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

async function loadFields(rows: Item[]) {
	const missing = [...new Set(rows.filter(row => Object.keys(row.properties).length).map(row => row.category.id))].filter(id => !fieldsByCategory.value.has(id))
	await Promise.all(missing.map(id => quietly(() => getCategory(id), category => fieldsByCategory.value.set(id, category.fields ?? []))))
}

function edit(item: Item | null) {
	editing.value = item
	editorVisible.value = true
}

async function remove(item: Item) {
	try {
		await removeItem(item.id)
		message.success(t("inventory.common.deleted"))
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("inventory.common.saveError")))
	}
}

const kindOptions = computed<SelectOption[]>(() => (["asset", "stock"] as const).map(kind => ({ label: t(`inventory.kind.${kind}`), value: kind })))
const categoryOptions = computed<SelectOption[]>(() => categoryPaths(categories.value).map(({ category, path }) => ({ label: path, value: category.id })))

const columns = computed<DataTableColumns<Item>>(() => [
	{
		title: t("inventory.common.name"),
		key: "name",
		minWidth: 220,
		ellipsis: { tooltip: true },
		render: row => nameCell(localized(row.name), row.barcode ? `${row.sku} · ${row.barcode}` : row.sku, { code: true })
	},
	{
		title: t("inventory.common.category"),
		key: "category",
		minWidth: 140,
		ellipsis: { tooltip: true },
		render: row => localized(row.category.name)
	},
	{
		title: t("inventory.catalog.kind"),
		key: "kind",
		width: 100,
		align: "center",
		render: row => h(NTag, { size: "small", round: true, type: row.kind === "asset" ? "info" : "default" }, () => t(`inventory.kind.${row.kind}`))
	},
	{
		title: t("inventory.items.held"),
		key: "held",
		width: 160,
		align: "center",
		render: row => {
			const label =
				row.kind === "asset"
					? t(countKey("inventory.items.assetsCount", row.assets_count ?? 0), { n: formatNumber(row.assets_count ?? 0) })
					: `${quantity(row.on_hand ?? "0")} ${isolate(localized(row.unit.name))}`
			return h(
				"span",
				{
					class:
						"inline-flex items-center justify-center font-medium text-xs px-3 py-1 rounded-full bg-slate-100/90 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs"
				},
				label
			)
		}
	},
	{
		title: t("inventory.items.properties"),
		key: "properties",
		width: 220,
		ellipsis: { tooltip: true },
		render: row => propertySummary(row.properties, fieldsByCategory.value.get(row.category.id), { yes: t("inventory.common.yes"), no: t("inventory.common.no") })
	},
	{
		title: t("inventory.common.status"),
		key: "is_active",
		width: 100,
		align: "center",
		render: row =>
			h(
				NTag,
				{ size: "small", round: true, type: row.is_active ? "success" : "default" },
				() => t(row.is_active ? "inventory.common.active" : "inventory.common.inactive")
			)
	},
	{
		title: "",
		key: "actions",
		width: 90,
		align: "center",
		render: row =>
			mayManage
				? h("div", { class: "flex items-center justify-center gap-1.5" }, [
						h(
							NTooltip,
							{ trigger: "hover" },
							{
								trigger: () =>
									h(
										NButton,
										{
											size: "tiny",
											quaternary: true,
											circle: true,
											class: "text-slate-500 hover:text-primary",
											"aria-label": t("inventory.common.edit"),
											onClick: () => edit(row)
										},
										{ icon: () => h(Icon, { name: "carbon:edit", size: 16 }) }
									),
								default: () => t("inventory.common.edit")
							}
						),
						h(
							NPopconfirm,
							{ onPositiveClick: () => void remove(row) },
							{
								trigger: () =>
									h(
										NButton,
										{
											size: "tiny",
											quaternary: true,
											circle: true,
											class: "text-slate-500 hover:text-error",
											"aria-label": t("inventory.common.delete")
										},
										{ icon: () => h(Icon, { name: "carbon:trash-can", size: 16 }) }
									),
								default: () => t("inventory.items.confirmDelete")
							}
						)
					])
				: null
	}
])
</script>
