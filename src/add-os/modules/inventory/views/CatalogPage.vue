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
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
					<!-- Categories Tree Card -->
					<n-card size="small" class="rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2 dark:border-slate-800 dark:bg-slate-900" :bordered="false">
						<div class="mb-3">
							<n-input v-model:value="treeSearch" :placeholder="t('inventory.catalog.searchTree')" clearable size="small" class="w-full">
								<template #prefix><Icon name="carbon:search" :size="14" class="text-slate-400" /></template>
							</n-input>
						</div>
						<n-spin :show="loading">
							<n-tree v-if="filteredTree.length" :data="filteredTree" block-line selectable :selected-keys="selected ? [selected.id] : []" default-expand-all @update:selected-keys="select" />
							<div v-else class="flex flex-col items-center justify-center py-8 text-slate-400">
								<Icon name="carbon:catalog" :size="32" class="mb-1 opacity-50" />
								<p class="text-sm">{{ t("inventory.catalog.empty") }}</p>
							</div>
						</n-spin>
					</n-card>

					<!-- Selected Category Detail Card -->
					<n-card v-if="selected" size="small" class="rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-3 dark:border-slate-800 dark:bg-slate-900" :bordered="false" :title="localized(selected.name)">
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
							<n-popconfirm @positive-click="deleteCategory(selected)">
								<template #trigger>
									<n-button size="small" type="error" secondary>
										<template #icon><Icon name="carbon:trash-can" :size="15" /></template>{{ t("inventory.common.delete") }}
									</n-button>
								</template>
								{{ t("inventory.catalog.confirmDelete") }}
							</n-popconfirm>
						</div>
						<p class="mb-2 text-sm text-secondary">{{ t("inventory.fields.description") }}</p>
						<n-data-table :columns="fieldColumns" :data="selected.fields ?? []" :bordered="false" size="small" :scroll-x="680">
							<template #empty>
								<div class="flex flex-col items-center justify-center py-8 text-slate-400">
									<Icon name="carbon:list-boxes" :size="32" class="mb-1 opacity-50" />
									<span class="text-sm">{{ t("inventory.fields.empty") }}</span>
								</div>
							</template>
						</n-data-table>
					</n-card>
					<n-card v-else size="small" class="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 py-16 text-center shadow-xs lg:col-span-3 dark:border-slate-800 dark:bg-slate-900" :bordered="false">
						<Icon name="carbon:catalog" :size="48" class="mb-2 text-slate-300 dark:text-slate-600" />
						<p class="text-sm text-secondary">{{ t("inventory.catalog.pick") }}</p>
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="units" :tab="t('inventory.units.title')">
				<n-card size="small" class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
					<n-data-table :columns="unitColumns" :data="units" :loading="loading" :bordered="false" size="small" :scroll-x="600" />
				</n-card>
			</n-tab-pane>
		</n-tabs>

		<template v-if="mayManage">
			<CategoryModal v-model:show="categoryVisible" :category="editingCategory" :categories="categories" :parent-id="newParentId" @saved="load" />
			<FieldModal v-if="selected" v-model:show="fieldVisible" :category-id="selected.id" :field="editingField" @saved="reloadSelected" />
			<UnitModal v-model:show="unitVisible" :unit="editingUnit" @saved="load" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, TreeOption } from "naive-ui"
import type { AttributeDefinition, Category, Unit } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NInput, NPopconfirm, NSpin, NTabPane, NTabs, NTag, NTooltip, NTree, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageInventoryCatalog } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import CategoryModal from "@/add-os/modules/inventory/components/CategoryModal.vue"
import FieldModal from "@/add-os/modules/inventory/components/FieldModal.vue"
import UnitModal from "@/add-os/modules/inventory/components/UnitModal.vue"
import { codeChip, EMPTY, localized } from "@/add-os/modules/inventory/utils/display"
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
const message = useMessage()
const mayManage = canManageInventoryCatalog()

const tab = ref<"categories" | "units">("categories")
const categories = ref<Category[]>([])
const units = ref<Unit[]>([])
const selected = ref<Category | null>(null)
const loading = ref(true)
const loadError = ref("")
const treeSearch = ref("")

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

function actionCell(onEdit: () => void, onDelete: () => void, confirm: string) {
	return mayManage
		? h("div", { class: "flex items-center justify-center gap-2" }, [
				h(
					NTooltip,
					{ trigger: "hover" },
					{
						trigger: () =>
							h(
								NButton,
								{ size: "tiny", quaternary: true, circle: true, class: "text-slate-500 hover:text-primary", "aria-label": t("inventory.common.edit"), onClick: onEdit },
								{ icon: () => h(Icon, { name: "carbon:edit", size: 16 }) }
							),
						default: () => t("inventory.common.edit")
					}
				),
				h(
					NPopconfirm,
					{ onPositiveClick: onDelete },
					{
						trigger: () =>
							h(
								NButton,
								{ size: "tiny", quaternary: true, circle: true, class: "text-slate-500 hover:text-error", "aria-label": t("inventory.common.delete") },
								{ icon: () => h(Icon, { name: "carbon:trash-can", size: 16 }) }
							),
						default: () => confirm
					}
				)
			])
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
