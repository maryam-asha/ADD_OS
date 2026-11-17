<!-- src/add-os/modules/inventory/views/CatalogPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryCatalog')" :description="t('inventory.catalog.description')">
			<template v-if="mayManage" #actions>
				<n-button v-if="tab === 'units'" type="primary" @click="editUnit(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>{{ t("inventory.units.add") }}
				</n-button>
				<n-button v-else type="primary" @click="editCategory(null, null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>{{ t("inventory.catalog.addRoot") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="categories" :tab="t('inventory.catalog.categories')">
				<!-- One search for both views, and the choice of view: the tree, or a table of every category with its path. -->
				<div class="mb-4 flex flex-wrap items-center gap-3">
					<n-input v-model:value="treeSearch" :placeholder="t('inventory.catalog.searchTree')" clearable size="small" class="max-w-sm flex-1">
						<template #prefix><Icon name="carbon:search" :size="14" class="text-[var(--add-text-muted)]" /></template>
					</n-input>
					<n-radio-group v-model:value="categoryView" size="small" class="ms-auto">
						<n-radio-button value="tree">
							<span class="inline-flex items-center gap-1.5"><Icon name="carbon:tree-view" :size="14" />{{ t("inventory.catalog.viewTree") }}</span>
						</n-radio-button>
						<n-radio-button value="table">
							<span class="inline-flex items-center gap-1.5"><Icon name="carbon:table" :size="14" />{{ t("inventory.catalog.viewTable") }}</span>
						</n-radio-button>
					</n-radio-group>
				</div>

				<div :class="categoryView === 'tree' ? 'grid grid-cols-1 gap-4 lg:grid-cols-5' : 'flex flex-col gap-4'">
					<!-- Categories Tree Card -->
					<n-card v-if="categoryView === 'tree'" size="small" class="rounded-2xl border border-[var(--add-border)] shadow-xs lg:col-span-2" :bordered="false">
						<n-spin :show="loading">
							<n-tree v-if="filteredTree.length" :data="filteredTree" block-line selectable :selected-keys="selected ? [selected.id] : []" default-expand-all @update:selected-keys="select" />
							<div v-else class="flex flex-col items-center justify-center py-8 text-[var(--add-text-muted)]">
								<Icon name="carbon:catalog" :size="32" class="mb-1 opacity-50" />
								<p class="text-sm">{{ t("inventory.catalog.empty") }}</p>
							</div>
						</n-spin>
					</n-card>

					<!-- Categories Table Card: a row opens the category below. -->
					<n-card v-else size="small" class="add-ledger-table rounded-2xl border border-[var(--add-border)] shadow-xs" :bordered="false">
						<n-data-table :columns="categoryColumns" :data="tableRows" :loading :bordered="false" size="small" :scroll-x="tableWidth(categoryColumns)" :row-props="categoryRowProps" :row-class-name="row => (selected?.id === row.category.id ? 'bg-primary/5' : '')">
							<template #empty>
								<div class="flex flex-col items-center justify-center py-8 text-[var(--add-text-muted)]">
									<Icon name="carbon:catalog" :size="32" class="mb-1 opacity-50" />
									<p class="text-sm">{{ t("inventory.catalog.empty") }}</p>
								</div>
							</template>
						</n-data-table>
					</n-card>

					<!-- Selected Category Detail Card -->
					<n-card v-if="selected" size="small" class="rounded-2xl border border-[var(--add-border)] shadow-xs lg:col-span-3" :bordered="false" :title="localized(selected.name)">
						<template #header-extra>
							<div class="flex items-center gap-2">
								<n-tag size="small" round :type="selected.kind === 'asset' ? 'info' : 'default'">{{ t(`inventory.kind.${selected.kind}`) }}</n-tag>
								<n-tag v-if="selected.show_to_members" size="small" round type="info">{{ t("inventory.catalog.shownToMembers") }}</n-tag>
							</div>
						</template>
						<div v-if="mayManage" class="mb-4 flex flex-wrap gap-2">
							<n-button size="small" secondary @click="editCategory(selected, null)">
								<template #icon><Icon name="carbon:edit" :size="15" /></template>{{ t("inventory.catalog.editCategory") }}
							</n-button>
							<n-button size="small" secondary @click="editCategory(null, selected.id)">
								<template #icon><Icon name="carbon:add" :size="15" /></template>{{ t("inventory.catalog.addChild") }}
							</n-button>
							<n-button size="small" type="primary" secondary @click="editField(null)">
								<template #icon><Icon name="carbon:list-boxes" :size="15" /></template>{{ t("inventory.fields.add") }}
							</n-button>
							<n-button size="small" type="error" secondary @click="confirm({ title: t('inventory.common.delete'), content: t('inventory.catalog.confirmDelete'), onConfirm: () => selected && deleteCategory(selected) })">
								<template #icon><Icon name="carbon:trash-can" :size="15" /></template>{{ t("inventory.common.delete") }}
							</n-button>
						</div>
						<p class="mb-2 text-sm text-secondary">{{ t("inventory.fields.description") }}</p>
						<n-data-table :columns="fieldColumns" :data="selected.fields ?? []" :bordered="false" size="small" :scroll-x="680">
							<template #empty>
								<div class="flex flex-col items-center justify-center py-8 text-[var(--add-text-muted)]">
									<Icon name="carbon:list-boxes" :size="32" class="mb-1 opacity-50" />
									<span class="text-sm">{{ t("inventory.fields.empty") }}</span>
								</div>
							</template>
						</n-data-table>
					</n-card>
					<n-card v-else-if="categoryView === 'tree'" size="small" class="flex flex-col items-center justify-center rounded-2xl border border-[var(--add-border)] py-16 text-center shadow-xs lg:col-span-3" :bordered="false">
						<Icon name="carbon:catalog" :size="48" class="mb-2 text-[var(--add-text-muted)]" />
						<p class="text-sm text-secondary">{{ t("inventory.catalog.pick") }}</p>
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="units" :tab="t('inventory.units.title')">
				<n-card size="small" class="add-ledger-table rounded-2xl border border-[var(--add-border)] shadow-xs" :bordered="false">
					<n-data-table :columns="unitColumns" :data="units" :loading :bordered="false" size="small" :scroll-x="600" />
				</n-card>
			</n-tab-pane>
		</n-tabs>

		<template v-if="mayManage">
			<CategoryModal v-model:show="categoryVisible" :category="editingCategory" :categories :parent-id="newParentId" @saved="load" />
			<FieldModal v-if="selected" v-model:show="fieldVisible" :category-id="selected.id" :field="editingField" @saved="reloadSelected" />
			<UnitModal v-model:show="unitVisible" :unit="editingUnit" @saved="load" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, TreeOption } from "naive-ui"
import type { AttributeDefinition, Category, Unit } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NInput, NRadioButton, NRadioGroup, NSpin, NTabPane, NTabs, NTag, NTree, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import RowActions from "@/add-os/components/page/RowActions.vue"
import { useConfirm } from "@/add-os/components/page/useConfirm"
import { canManageInventoryCatalog } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import CategoryModal from "@/add-os/modules/inventory/components/CategoryModal.vue"
import FieldModal from "@/add-os/modules/inventory/components/FieldModal.vue"
import UnitModal from "@/add-os/modules/inventory/components/UnitModal.vue"
import { categoryPaths, codeChip, COLUMN, EMPTY, localized, tableWidth } from "@/add-os/modules/inventory/utils/display"
import { getCategory, listCategories, listUnits, removeCategory, removeField, removeUnit } from "@/add-os/services/inventory"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * How things are defined: a tree of categories — a branch is either assets
 * or stock — each with the fields its items answer (inherited down the
 * branch), and the units items are counted in. Items themselves are on the
 * Items page.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const confirm = useConfirm()
const message = useMessage()
const mayManage = canManageInventoryCatalog()

const tab = ref<"categories" | "units">("categories")
const categories = ref<Category[]>([])
const units = ref<Unit[]>([])
const selected = ref<Category | null>(null)
const loading = ref(true)
const loadError = ref("")
const treeSearch = ref("")

/** The categories' view, remembered on this browser: the tree (default) or a table. */
const VIEW_KEY = "inventory.catalog.view"
function storedView(): "tree" | "table" {
	try {
		return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "tree"
	} catch {
		return "tree"
	}
}
const categoryView = ref<"tree" | "table">(storedView())
watch(categoryView, view => {
	try {
		localStorage.setItem(VIEW_KEY, view)
	} catch {}
})

/** Every category with its full path, in tree order; the search matches anywhere in the path. */
const tableRows = computed(() => {
	const query = treeSearch.value.trim().toLowerCase()
	return categoryPaths(categories.value).filter(row => !query || row.path.toLowerCase().includes(query))
})

interface CategoryRow { category: Category; path: string }

const categoryColumns = computed<DataTableColumns<CategoryRow>>(() => [
	{
		title: t("inventory.common.category"),
		key: "path",
		minWidth: 280,
		render: row => {
			const parts = row.path.split(" › ")
			const own = parts.pop()
			return h("span", {}, [parts.length ? h("span", { class: "text-secondary" }, `${parts.join(" › ")} › `) : null, h("span", { class: "font-medium" }, own)])
		}
	},
	{
		title: t("inventory.catalog.kind"),
		key: "kind",
		...COLUMN.status,
		render: row => h(NTag, { size: "small", round: true, bordered: false, type: row.category.kind === "asset" ? "info" : "default" }, () => t(`inventory.kind.${row.category.kind}`))
	},
	{ title: t("inventory.catalog.itemsCount"), key: "items_count", ...COLUMN.count, render: row => formatNumber(row.category.items_count ?? 0) },
	{
		title: t("inventory.catalog.traits"),
		key: "traits",
		width: 200,
		render: row =>
			h("span", { class: "inline-flex flex-wrap gap-1" }, [
				row.category.intangible ? h(NTag, { size: "tiny", bordered: false }, () => t("inventory.catalog.intangible")) : null,
				row.category.show_to_members ? h(NTag, { size: "tiny", bordered: false, type: "info" }, () => t("inventory.catalog.shownToMembers")) : null
			])
	},
	{ title: t("inventory.catalog.order"), key: "order", ...COLUMN.count, render: row => formatNumber(row.category.order) }
])

function categoryRowProps(row: CategoryRow) {
	return { class: "cursor-pointer", onClick: () => select([row.category.id]) }
}

const categoryVisible = ref(false)
const editingCategory = ref<Category | null>(null)
const newParentId = ref<number | null>(null)
const fieldVisible = ref(false)
const editingField = ref<AttributeDefinition | null>(null)
const unitVisible = ref(false)
const editingUnit = ref<Unit | null>(null)

onMounted(load)

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		;[categories.value, units.value] = await Promise.all([listCategories(), listUnits()])
		if (selected.value && categories.value.some(c => c.id === selected.value!.id)) await reloadSelected()
		else selected.value = null
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

async function reloadSelected() {
	if (selected.value) selected.value = await getCategory(selected.value.id)
}

const tree = computed<TreeOption[]>(() => {
	const node = (category: Category): TreeOption => {
		const children = categories.value.filter(c => c.parent_id === category.id).map(node)
		const count = category.items_count ? ` (${formatNumber(category.items_count)})` : ""
		return { key: category.id, label: `${localized(category.name)}${count}`, children: children.length ? children : undefined }
	}
	return categories.value.filter(c => c.parent_id === null).map(node)
})

const filteredTree = computed<TreeOption[]>(() => {
	const query = treeSearch.value.trim().toLowerCase()
	if (!query) return tree.value

	const filterNode = (node: TreeOption): TreeOption | null => {
		const labelStr = String(node.label || "").toLowerCase()
		const matchesSelf = labelStr.includes(query)
		const filteredChildren = (node.children ?? [])
			.map(filterNode)
			.filter((c): c is TreeOption => c !== null)

		if (matchesSelf || filteredChildren.length) {
			return {
				...node,
				children: filteredChildren.length ? filteredChildren : undefined
			}
		}
		return null
	}

	return tree.value.map(filterNode).filter((n): n is TreeOption => n !== null)
})

/** Clicking the open category again keeps it open: an empty selection would hide its panel for nothing. */
async function select(keys: Array<string | number>) {
	const id = keys[0]
	if (id === undefined) return
	selected.value = await getCategory(Number(id))
}

function editCategory(category: Category | null, parentId: number | null) {
	editingCategory.value = category
	newParentId.value = parentId
	categoryVisible.value = true
}

function editField(field: AttributeDefinition | null) {
	editingField.value = field
	fieldVisible.value = true
}

function editUnit(unit: Unit | null) {
	editingUnit.value = unit
	unitVisible.value = true
}

async function attempt(work: () => Promise<void>, done: string) {
	try {
		await work()
		message.success(done)
	} catch (e) {
		message.error(apiErrorMessage(e, t("inventory.common.saveError")))
	}
}

async function deleteCategory(category: Category) {
	await attempt(async () => {
		await removeCategory(category.id)
		selected.value = null
		await load()
	}, t("inventory.common.deleted"))
}

function actionCell(onEdit: () => void, onDelete: () => void, confirmText: string) {
	return mayManage
		? h(RowActions, { actions: [{ key: "edit", label: t("inventory.common.edit"), icon: "carbon:edit", onClick: onEdit }, { key: "delete", label: t("inventory.common.delete"), icon: "carbon:trash-can", danger: true, confirm: confirmText, onClick: onDelete }] })
		: null
}

const fieldColumns = computed<DataTableColumns<AttributeDefinition>>(() => [
	{
		title: t("inventory.fields.label"),
		key: "label",
		minWidth: 180,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "font-semibold" }, localized(row.label)),
				h("span", { class: "font-mono text-xs text-secondary", dir: "ltr" }, row.key)
			])
	},
	{
		title: t("inventory.fields.type"),
		key: "type",
		minWidth: 120,
		render: row =>
			h("div", { class: "inline-flex items-center gap-1.5" }, [
				h(NTag, { size: "small", round: true }, () => t(`inventory.fieldType.${row.type}`)),
				row.unit ? h("span", { class: "font-mono text-xs text-secondary" }, `(${row.unit})`) : null
			])
	},
	{
		title: t("inventory.fields.options"),
		key: "options",
		minWidth: 150,
		render: row => row.options?.join(" · ") || EMPTY
	},
	{
		title: t("inventory.fields.required"),
		key: "is_required",
		width: 100,
		align: "center",
		render: row =>
			h(
				NTag,
				{ size: "small", round: true, type: row.is_required ? "warning" : "default" },
				() => t(row.is_required ? "inventory.common.yes" : "inventory.common.no")
			)
	},
	{
		title: "",
		key: "actions",
		width: 120,
		align: "center",
		render: row =>
			row.inherited
				? h(NTag, { size: "small", round: true }, () => t("inventory.fields.inherited"))
				: actionCell(
						() => editField(row),
						() =>
							void attempt(async () => {
								await removeField(row.id)
								await reloadSelected()
							}, t("inventory.common.deleted")),
						t("inventory.fields.confirmDelete")
					)
	}
])

const unitColumns = computed<DataTableColumns<Unit>>(() => [
	{
		title: t("inventory.units.code"),
		key: "code",
		width: 120,
		render: row => codeChip(row.code)
	},
	{ title: t("inventory.common.name"), key: "name", minWidth: 180, render: row => localized(row.name) },
	{
		title: t("inventory.units.fractions"),
		key: "allows_fractions",
		width: 140,
		align: "center",
		render: row =>
			h(
				NTag,
				{ size: "small", round: true, type: row.allows_fractions ? "info" : "default" },
				() => t(row.allows_fractions ? "inventory.common.yes" : "inventory.common.no")
			)
	},
	{
		title: "",
		key: "actions",
		width: 100,
		align: "center",
		render: row =>
			actionCell(
				() => editUnit(row),
				() =>
					void attempt(async () => {
						await removeUnit(row.id)
						await load()
					}, t("inventory.common.deleted")),
				t("inventory.units.confirmDelete")
			)
	}
])
</script>
