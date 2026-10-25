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

		<HrToolbar>
			<n-input v-model:value="filters.search" :placeholder="t('inventory.items.search')" clearable class="max-w-xs" />
			<n-select v-model:value="filters.kind" :options="kindOptions" :placeholder="t('inventory.catalog.kind')" clearable class="max-w-[10rem]" />
			<n-select v-model:value="filters.category_id" :options="categoryOptions" :placeholder="t('inventory.common.category')" clearable filterable class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="items" :loading :bordered="false" size="small" :scroll-x="980">
				<template #empty>
					<span class="text-secondary">{{ t("inventory.items.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<ItemModal v-if="mayManage" v-model:show="editorVisible" :item="editing" :categories :units @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { AttributeDefinition, Category, Item, ItemKind, Unit } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NInput, NPagination, NPopconfirm, NSelect, NTag, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageInventoryCatalog } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import ItemModal from "@/add-os/modules/inventory/components/ItemModal.vue"
import { categoryPaths, localized, nameCell, propertySummary, quantity } from "@/add-os/modules/inventory/utils/display"
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
const editorVisible = ref(false)
const editing = ref<Item | null>(null)
/** Each category's fields, read once, so a property shows under its label rather than its key. */
const fieldsByCategory = ref(new Map<number, AttributeDefinition[]>())

const { filters, applied, page } = useRouteFilters({ search: "string", kind: "string", category_id: "number" }, () => void load(), { debounced: ["search"] })

onMounted(() => {
	void quietly(() => listCategories(), rows => (categories.value = rows))
	void quietly(listUnits, rows => (units.value = rows))
})

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listItems({ page: page.value, search: applied.value.search, kind: applied.value.kind as ItemKind | null, category_id: applied.value.category_id })
		items.value = result.data
		lastPage.value = result.meta.last_page
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
		render: row =>
			nameCell(localized(row.name), row.sku, { code: true })
	},
	{ title: t("inventory.common.category"), key: "category", minWidth: 140, render: row => localized(row.category.name) },
	{ title: t("inventory.catalog.kind"), key: "kind", minWidth: 90, render: row => h(NTag, { size: "small", round: true, type: row.kind === "asset" ? "info" : "default" }, () => t(`inventory.kind.${row.kind}`)) },
	{
		title: t("inventory.items.held"),
		key: "held",
		minWidth: 110,
		render: row =>
			h(
				"span",
				{ class: "add-numeric" },
				row.kind === "asset" ? t(countKey("inventory.items.assetsCount", row.assets_count ?? 0), { n: formatNumber(row.assets_count ?? 0) }) : `${quantity(row.on_hand ?? "0")} ${localized(row.unit.name)}`
			)
	},
	{
		title: t("inventory.items.properties"),
		key: "properties",
		width: 220,
		ellipsis: { tooltip: true },
		render: row => propertySummary(row.properties, fieldsByCategory.value.get(row.category.id), { yes: t("inventory.common.yes"), no: t("inventory.common.no") })
	},
	{ title: t("inventory.common.status"), key: "is_active", minWidth: 90, render: row => t(row.is_active ? "inventory.common.active" : "inventory.common.inactive") },
	{
		title: "",
		key: "actions",
		width: 100,
		render: row =>
			mayManage
				? h("div", { class: "flex items-center justify-end gap-3" }, [
						h(NButton, { text: true, type: "primary", "aria-label": t("inventory.common.edit"), title: t("inventory.common.edit"), onClick: () => edit(row) }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }),
						h(
							NPopconfirm,
							{ onPositiveClick: () => void remove(row) },
							{
								trigger: () => h(NButton, { text: true, type: "error", "aria-label": t("inventory.common.delete"), title: t("inventory.common.delete") }, { icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }),
								default: () => t("inventory.items.confirmDelete")
							}
						)
					])
				: null
	}
])
</script>
