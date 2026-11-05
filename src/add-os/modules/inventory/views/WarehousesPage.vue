<!-- src/add-os/modules/inventory/views/WarehousesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryWarehouses')" :description="t('inventory.warehouses.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="edit(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>{{ t("inventory.warehouses.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<div class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
			<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
				<n-input v-model:value="filters.search" :placeholder="t('inventory.warehouses.search')" clearable class="w-full">
					<template #prefix><Icon name="carbon:search" :size="16" class="text-slate-400" /></template>
				</n-input>
				<n-select v-model:value="filters.active" :options="statusOptions" :placeholder="t('inventory.common.status')" clearable class="w-full" />
				<StaffSelect v-model:value="filters.manager_id" :placeholder="t('inventory.warehouses.allManagers')" class="w-full" />
			</div>
		</div>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false" size="small">
			<n-data-table :columns :data="warehouses" :loading :bordered="false" size="small" :scroll-x="tableWidth(columns)">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
						<Icon name="carbon:inventory-management" :size="40" class="mb-2 opacity-50" />
						<span>{{ t("inventory.warehouses.empty") }}</span>
					</div>
				</template>
			</n-data-table>

			<div v-if="lastPage > 1" class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 p-4 sm:flex-row dark:border-slate-800/80">
				<span class="text-xs text-slate-400">{{ t("inventory.warehouses.count", { n: totalCount }) }}</span>
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<WarehouseModal v-if="mayManage" v-model:show="editorVisible" :warehouse="editing" @saved="load" />
		<WarehouseDrawer v-model:show="detailsVisible" :warehouse="viewing" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Warehouse } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NInput, NPagination, NPopconfirm, NSelect, NTag, NTooltip, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageWarehouses } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import StaffSelect from "@/add-os/modules/inventory/components/StaffSelect.vue"
import WarehouseDrawer from "@/add-os/modules/inventory/components/WarehouseDrawer.vue"
import WarehouseModal from "@/add-os/modules/inventory/components/WarehouseModal.vue"
import { COLUMN, EMPTY, localized, tableWidth } from "@/add-os/modules/inventory/utils/display"
import { getWarehouse, listWarehouses, removeWarehouse, updateWarehouse } from "@/add-os/services/inventory"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The warehouses stock is kept in: who runs each, where it is, how many
 * items it holds, and whether it is active. The branch's primary one —
 * where reception takes stock by default — is marked. One holding stock
 * cannot be deactivated or deleted, and one with history only deactivated;
 * ADD Core says so and its message shows.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const mayManage = canManageWarehouses()

const warehouses = ref<Warehouse[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const totalCount = ref(0)
const editorVisible = ref(false)
const editing = ref<Warehouse | null>(null)
const detailsVisible = ref(false)
const viewing = ref<Warehouse | null>(null)

const { filters, applied, page } = useRouteFilters({ search: "string", active: "string", manager_id: "number" }, () => void load(), { debounced: ["search"] })

const statusOptions = computed<SelectOption[]>(() => [
	{ label: t("inventory.common.active"), value: "true" },
	{ label: t("inventory.common.inactive"), value: "false" }
])

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listWarehouses({
			page: page.value,
			search: applied.value.search,
			active: applied.value.active === "true" ? true : applied.value.active === "false" ? false : null,
			manager_id: applied.value.manager_id
		})
		warehouses.value = result.data
		lastPage.value = result.meta.last_page
		totalCount.value = result.meta.total ?? result.data.length
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

/** The list does not carry a selected scope's items; the dialog and drawer need them. */
async function withItems(row: Warehouse): Promise<Warehouse> {
	return row.item_scope === "selected" ? getWarehouse(row.id) : row
}

async function edit(row: Warehouse | null) {
	editing.value = row ? await withItems(row) : null
	editorVisible.value = true
}

async function view(row: Warehouse) {
	viewing.value = await withItems(row)
	detailsVisible.value = true
}

async function run(action: () => Promise<unknown>, done: string) {
	try {
		await action()
		message.success(done)
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("inventory.common.saveError")))
	}
}

/** Full class strings, so Tailwind sees each one. */
const TONES = { primary: "text-slate-500 hover:text-primary", warning: "text-slate-500 hover:text-warning" } as const

function iconButton(icon: string, label: string, onClick: () => void, tone: keyof typeof TONES = "primary") {
	return h(
		NTooltip,
		{ trigger: "hover" },
		{
			trigger: () => h(NButton, { size: "tiny", quaternary: true, circle: true, class: TONES[tone], "aria-label": label, onClick }, { icon: () => h(Icon, { name: icon, size: 16 }) }),
			default: () => label
		}
	)
}

const columns = computed<DataTableColumns<Warehouse>>(() => [
	{
		title: t("inventory.warehouses.name"),
		key: "name",
		...COLUMN.name,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("div", { class: "flex items-center gap-2" }, [
					h("span", { class: "font-medium text-primary" }, localized(row.name)),
					row.is_primary ? h(NTag, { size: "small", round: true, type: "success" }, () => t("inventory.warehouses.primary")) : null
				]),
				h("span", { class: "text-xs text-secondary" }, row.item_scope === "all" ? t("inventory.warehouses.scopeAll") : t("inventory.warehouses.scopeSelected"))
			])
	},
	{ title: t("inventory.warehouses.manager"), key: "manager", ...COLUMN.person, render: row => row.manager?.name ?? t("inventory.warehouses.noManager") },
	{ title: t("inventory.warehouses.location"), key: "location", ...COLUMN.place, render: row => [row.place?.label ?? t("inventory.warehouses.external"), row.address].filter(Boolean).join(" · ") || EMPTY },
	{ title: t("inventory.warehouses.itemsWithBalance"), key: "items_with_balance", ...COLUMN.count, render: row => h("span", { class: "add-numeric font-semibold" }, formatNumber(row.items_with_balance ?? 0)) },
	{
		title: t("inventory.common.status"),
		key: "is_active",
		...COLUMN.status,
		render: row => h(NTag, { size: "small", round: true, type: row.is_active ? "success" : "default" }, () => t(row.is_active ? "inventory.common.active" : "inventory.common.inactive"))
	},
	{
		title: "",
		key: "actions",
		width: 140,
		render: row =>
			h("div", { class: "flex items-center justify-end gap-1" }, [
				iconButton("carbon:view", t("inventory.common.view"), () => void view(row)),
				...(mayManage
					? [
							iconButton("carbon:edit", t("inventory.common.edit"), () => void edit(row)),
							iconButton(
								"carbon:power",
								t(row.is_active ? "inventory.warehouses.deactivate" : "inventory.warehouses.activate"),
								() => void run(() => updateWarehouse(row.id, { is_active: !row.is_active }), t("inventory.common.saved")),
								"warning"
							),
							h(
								NPopconfirm,
								{ onPositiveClick: () => void run(() => removeWarehouse(row.id), t("inventory.common.deleted")) },
								{
									trigger: () =>
										h(NButton, { size: "tiny", quaternary: true, circle: true, class: "text-slate-500 hover:text-error", "aria-label": t("inventory.common.delete") }, { icon: () => h(Icon, { name: "carbon:trash-can", size: 16 }) }),
									default: () => t("inventory.warehouses.confirmDelete")
								}
							)
						]
					: [])
			])
	}
])
</script>
