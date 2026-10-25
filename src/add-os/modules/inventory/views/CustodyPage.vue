<!-- src/add-os/modules/inventory/views/CustodyPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventoryCustody')" :description="t('inventory.custody.description')" />

		<div class="flex max-w-3xl flex-col gap-2">
			<CustodianPicker v-model:value="custodian" />
			<n-checkbox v-model:checked="includeReturned">{{ t("inventory.custody.includeReturned") }}</n-checkbox>
		</div>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="900">
				<template #empty>
					<span class="text-secondary">{{ t("inventory.custody.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { AssetAssignment, CustodianRef } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NCard, NCheckbox, NDataTable, NPagination, NTag } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import CustodianPicker from "@/add-os/modules/inventory/components/CustodianPicker.vue"
import { custodianLabel, EMPTY, localized } from "@/add-os/modules/inventory/utils/display"
import { listCustody } from "@/add-os/services/inventory"
import { formatDateTime } from "@/add-os/utils/format/dates"

/**
 * Who holds what: every asset in someone's custody — or, for one employee,
 * member or company, everything they hold (what an employee leaving hands
 * back). A row opens the asset, where it is taken back.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

const custodian = ref<CustodianRef | null>(null)
const includeReturned = ref(false)
const rows = ref<AssetAssignment[]>([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(true)
const loadError = ref("")

onMounted(load)
watch([custodian, includeReturned], () => {
	if (page.value !== 1) page.value = 1
	else void load()
})
watch(page, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listCustody({ page: page.value, custodian: custodian.value, open: !includeReturned.value })
		rows.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	} finally {
		loading.value = false
	}
}

function rowProps(row: AssetAssignment) {
	return { class: "cursor-pointer", onClick: () => void router.push({ name: "inventory.inventoryAsset", params: { id: row.asset_id } }) }
}

const columns = computed<DataTableColumns<AssetAssignment>>(() => [
	{
		title: t("inventory.assets.item"),
		key: "asset",
		minWidth: 220,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "font-semibold" }, row.asset ? localized(row.asset.item.name) : EMPTY),
				h("span", { class: "font-mono text-xs text-secondary", dir: "ltr" }, row.asset?.code ?? `#${row.asset_id}`)
			])
	},
	{ title: t("inventory.assets.custodian"), key: "custodian", minWidth: 180, render: row => [custodianLabel(row.custodian), " · ", t(`inventory.custodianType.${row.custodian.type}`)].join("") },
	{ title: t("inventory.history.handedOver"), key: "assigned_at", minWidth: 150, render: row => formatDateTime(row.assigned_at) },
	{
		title: t("inventory.history.returned"),
		key: "returned_at",
		minWidth: 150,
		render: row => (row.returned_at ? formatDateTime(row.returned_at) : h(NTag, { size: "small", round: true, type: "warning" }, () => t("inventory.history.stillHeld")))
	},
	{ title: t("inventory.common.note"), key: "note", minWidth: 160, render: row => row.note ?? EMPTY }
])
</script>
