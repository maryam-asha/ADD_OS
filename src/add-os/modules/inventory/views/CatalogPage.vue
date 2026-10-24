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
					<n-card size="small" class="lg:col-span-2">
						<n-spin :show="loading">
							<n-tree v-if="tree.length" :data="tree" block-line selectable :selected-keys="selected ? [selected.id] : []" default-expand-all @update:selected-keys="select" />
							<p v-else class="text-sm text-secondary">{{ t("inventory.catalog.empty") }}</p>
						</n-spin>
					</n-card>

					<n-card v-if="selected" size="small" class="lg:col-span-3" :title="localized(selected.name)">
						<template #header-extra>
							<div class="flex items-center gap-2">
								<n-tag size="small" round>{{ t(`inventory.kind.${selected.kind}`) }}</n-tag>
								<n-tag v-if="selected.show_to_members" size="small" round type="info">{{ t("inventory.catalog.shownToMembers") }}</n-tag>
							</div>
						</template>
						<div v-if="mayManage" class="mb-4 flex flex-wrap gap-2">
							<n-button size="small" @click="editCategory(selected, null)">
								<template #icon><Icon name="carbon:edit" :size="16" /></template>{{ t("inventory.catalog.editCategory") }}
							</n-button>
							<n-button size="small" @click="editCategory(null, selected.id)">
								<template #icon><Icon name="carbon:add" :size="16" /></template>{{ t("inventory.catalog.addChild") }}
							</n-button>
							<n-button size="small" @click="editField(null)">
								<template #icon><Icon name="carbon:list-boxes" :size="16" /></template>{{ t("inventory.fields.add") }}
							</n-button>
							<n-popconfirm @positive-click="deleteCategory(selected)">
								<template #trigger>
									<n-button size="small" type="error" secondary>
										<template #icon><Icon name="carbon:trash-can" :size="16" /></template>{{ t("inventory.common.delete") }}
									</n-button>
								</template>
								{{ t("inventory.catalog.confirmDelete") }}
							</n-popconfirm>
						</div>
						<p class="mb-2 text-sm text-secondary">{{ t("inventory.fields.description") }}</p>
						<n-data-table :columns="fieldColumns" :data="selected.fields ?? []" :bordered="false" size="small" :scroll-x="640">
							<template #empty>
								<span class="text-secondary">{{ t("inventory.fields.empty") }}</span>
							</template>
						</n-data-table>
					</n-card>
					<n-card v-else size="small" class="lg:col-span-3">
						<p class="text-sm text-secondary">{{ t("inventory.catalog.pick") }}</p>
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="units" :tab="t('inventory.units.title')">
				<n-card size="small" class="add-ledger-table">
					<n-data-table :columns="unitColumns" :data="units" :loading :bordered="false" size="small" :scroll-x="560" />
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
import { NAlert, NButton, NCard, NDataTable, NPopconfirm, NSpin, NTabPane, NTabs, NTag, NTree, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageInventoryCatalog } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import CategoryModal from "@/add-os/modules/inventory/components/CategoryModal.vue"
import FieldModal from "@/add-os/modules/inventory/components/FieldModal.vue"
import UnitModal from "@/add-os/modules/inventory/components/UnitModal.vue"
import { EMPTY, localized } from "@/add-os/modules/inventory/utils/display"
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

async function select(keys: Array<string | number>) {
	const id = keys[0]
	selected.value = id === undefined ? null : await getCategory(Number(id))
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
		? h("div", { class: "flex items-center justify-end gap-3" }, [
				h(NButton, { text: true, type: "primary", "aria-label": t("inventory.common.edit"), title: t("inventory.common.edit"), onClick: onEdit }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }),
				h(
					NPopconfirm,
					{ onPositiveClick: onDelete },
					{
						trigger: () => h(NButton, { text: true, type: "error", "aria-label": t("inventory.common.delete"), title: t("inventory.common.delete") }, { icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }),
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
	{ title: t("inventory.fields.type"), key: "type", minWidth: 110, render: row => [t(`inventory.fieldType.${row.type}`), row.unit ? ` (${row.unit})` : ""].join("") },
	{ title: t("inventory.fields.options"), key: "options", minWidth: 150, render: row => row.options?.join(" · ") || EMPTY },
	{ title: t("inventory.fields.required"), key: "is_required", minWidth: 90, render: row => t(row.is_required ? "inventory.common.yes" : "inventory.common.no") },
	{
		title: "",
		key: "actions",
		width: 140,
		render: row =>
			row.inherited
				? h(NTag, { size: "small", round: true }, () => t("inventory.fields.inherited"))
				: actionCell(
						() => editField(row),
						() => void attempt(async () => {
							await removeField(row.id)
							await reloadSelected()
						}, t("inventory.common.deleted")),
						t("inventory.fields.confirmDelete")
					)
	}
])

const unitColumns = computed<DataTableColumns<Unit>>(() => [
	{ title: t("inventory.units.code"), key: "code", minWidth: 110, render: row => h("span", { class: "font-mono text-xs", dir: "ltr" }, row.code) },
	{ title: t("inventory.common.name"), key: "name", minWidth: 160, render: row => localized(row.name) },
	{ title: t("inventory.units.fractions"), key: "allows_fractions", minWidth: 140, render: row => t(row.allows_fractions ? "inventory.common.yes" : "inventory.common.no") },
	{
		title: "",
		key: "actions",
		width: 110,
		render: row =>
			actionCell(
				() => editUnit(row),
				() => void attempt(async () => {
					await removeUnit(row.id)
					await load()
				}, t("inventory.common.deleted")),
				t("inventory.units.confirmDelete")
			)
	}
])
</script>
