<!-- src/add-os/modules/plans/views/SaleItemsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.saleItems") }}</h1>
				<p class="max-w-3xl text-sm text-secondary">{{ t("retail.saleItems.description") }}</p>
			</div>
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("retail.saleItems.add") }}
			</n-button>
		</div>

		<n-alert v-if="error" type="error" :title="t('retail.loadError')" />

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="remove" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('retail.saleItems.add') : t('retail.saleItems.edit')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SaleItem, SaleItemPayload } from "@/add-os/modules/plans/types/retail"
import { NAlert, NButton, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { listItems } from "@/add-os/services/inventory"
import { createSaleItem, listSaleItems, removeSaleItem, updateSaleItem } from "@/add-os/services/retail"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * What reception may sell (a drink, a notebook): a stock item of the
 * inventory and its price in points. Selling issues it from the shelf, so
 * only stock items are offered; the stock itself is received and counted
 * on the Inventory section's Stock page.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<SaleItem>(listSaleItems)
const stockItems = ref<SelectOption[]>([])

onMounted(() => void quietly(() => listItems({ kind: "stock", active: true, per_page: 100 }), result => (stockItems.value = result.data.map(item => ({ label: `${localized(item.name)} · ${item.sku}`, value: item.id })))))

const mutations = useResourceMutations({ create: createSaleItem, update: updateSaleItem, remove: removeSaleItem }, refetch, {
	createSuccess: t("retail.saleItems.created"),
	updateSuccess: t("retail.saleItems.updated"),
	deleteSuccess: t("retail.saleItems.deleted")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<SaleItemPayload>({ inventory_item_id: null, price_points: 0, is_active: true })

const fields = computed<FieldDescriptor<SaleItemPayload>[]>(() => [
	{ key: "inventory_item_id", labelKey: "retail.saleItems.item", type: "select", required: true, options: stockItems.value },
	{ key: "price_points", labelKey: "retail.saleItems.price", type: "number", integer: true, min: 1, required: true },
	{ key: "is_active", labelKey: "retail.saleItems.active", type: "switch" }
])

const columns = computed<DataTableColumns<SaleItem>>(() => [
	{
		title: t("retail.saleItems.item"),
		key: "item",
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "font-semibold" }, localized(row.item.name)),
				h("span", { class: "font-mono text-xs text-secondary", dir: "ltr" }, row.item.sku)
			])
	},
	{ title: t("retail.saleItems.price"), key: "price_points", render: row => h("span", { class: "add-numeric" }, t("retail.points", { n: formatNumber(row.price_points) })) },
	{
		title: t("retail.saleItems.active"),
		key: "is_active",
		render: row => h(NTag, { size: "small", round: true, type: row.is_active ? "success" : "default" }, () => t(row.is_active ? "retail.saleItems.onSale" : "retail.saleItems.offSale"))
	}
])

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = { inventory_item_id: null, price_points: 0, is_active: true }
	drawerVisible.value = true
}

function openEdit(row: SaleItem) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = { inventory_item_id: row.item.id, price_points: row.price_points, is_active: row.is_active }
	if (!stockItems.value.some(option => option.value === row.item.id)) stockItems.value = [...stockItems.value, { label: `${localized(row.item.name)} · ${row.item.sku}`, value: row.item.id }]
	drawerVisible.value = true
}

async function remove(row: SaleItem) {
	await mutations.remove(row.id)
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") await mutations.create(payload as SaleItemPayload)
	else if (editingId.value !== null) await mutations.update(editingId.value, payload as SaleItemPayload)
}
</script>
