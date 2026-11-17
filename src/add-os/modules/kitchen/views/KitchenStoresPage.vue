<!-- src/add-os/modules/kitchen/views/KitchenStoresPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t('nav.pages.stores')" :description="t('kitchen.stores.description')" />

		<n-alert v-if="loadError" type="error" :title="t('kitchen.stores.loadError')" />
		<n-alert v-if="warehousesUnavailable && mayUpdate" type="warning" :title="t('kitchen.stores.warehousesUnavailable')" />

		<n-card>
			<n-spin :show="isLoading">
				<div v-if="rows.length === 0 && !isLoading" class="py-10 text-center">{{ t("kitchen.stores.empty") }}</div>
				<div v-for="row in rows" :key="row.branch.id" class="flex flex-col gap-2 py-3" :data-branch="row.branch.id">
					<div class="flex flex-wrap items-center gap-3">
						<span class="min-w-40 font-bold">{{ row.branch.name }}</span>
						<template v-if="mayUpdate">
							<n-select
								v-model:value="drafts[row.branch.id]"
								:options="optionsFor(row.branch.id)"
								:placeholder="t('kitchen.stores.choose')"
								class="sm:w-72!"
								data-test="store-select"
							/>
							<n-button
								type="primary"
								:loading="savingId === row.branch.id"
								:disabled="!isChanged(row)"
								data-test="store-save"
								@click="save(row)"
							>
								{{ t("kitchen.stores.save") }}
							</n-button>
						</template>
						<span v-else data-test="store-name">{{ row.warehouse?.name ?? t("kitchen.stores.none") }}</span>
					</div>
					<p v-if="errors[row.branch.id]" class="text-sm" data-test="store-error">
						<n-text type="error">{{ errors[row.branch.id] }}</n-text>
					</p>
				</div>
			</n-spin>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Warehouse } from "@/add-os/modules/inventory/types/inventory"
import type { KitchenStoreRow } from "@/add-os/modules/kitchen/types/kitchen"
import { NAlert, NButton, NCard, NSelect, NSpin, NText, useMessage } from "naive-ui"
import { onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { canUpdateKitchenStores } from "@/add-os/config/permissions"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { ApiError } from "@/add-os/services/api"
import { listWarehouses } from "@/add-os/services/inventory"
import { listKitchenStores, setKitchenStore } from "@/add-os/services/kitchen"

/**
 * Which warehouse each branch's kitchen draws from — its menu is what that
 * warehouse holds. A branch with none takes no orders.
 *
 * The choices are the branch's own warehouses that allow sales and are not
 * its main store: the rule ADDCore's UpdateKitchenStoreRequest enforces,
 * filtered here so the select offers nothing the API would refuse. The API
 * still decides; a 422 shows under the branch it is about.
 */

const { t } = useI18n()
const message = useMessage()
const mayUpdate = canUpdateKitchenStores()

const rows = ref<KitchenStoreRow[]>([])
const isLoading = ref(true)
const loadError = ref(false)
const warehouses = ref<Warehouse[]>([])
const warehousesUnavailable = ref(false)
const drafts = reactive<Record<number, number | null>>({})
const errors = reactive<Record<number, string | null>>({})
const savingId = ref<number | null>(null)

async function loadRows() {
	isLoading.value = true
	try {
		rows.value = await listKitchenStores()
		for (const row of rows.value) drafts[row.branch.id] = row.warehouse?.id ?? null
		loadError.value = false
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadError.value = true
	} finally {
		isLoading.value = false
	}
}

/** Only the selling ones are asked for; the rest of the rule is applied per branch below. */
async function loadWarehouses() {
	if (!mayUpdate) return
	try {
		warehouses.value = (await listWarehouses({ allows_sales: true, per_page: 100 })).data
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		warehousesUnavailable.value = true
	}
}

function optionsFor(branchId: number): SelectOption[] {
	return warehouses.value
		.filter(warehouse => warehouse.place?.type === "branch" && warehouse.place.id === branchId && warehouse.allows_sales && !warehouse.is_primary)
		.map(warehouse => ({ label: localized(warehouse.name), value: warehouse.id }))
}

function isChanged(row: KitchenStoreRow): boolean {
	const draft = drafts[row.branch.id]
	return draft !== null && draft !== undefined && draft !== (row.warehouse?.id ?? null)
}

async function save(row: KitchenStoreRow) {
	const warehouseId = drafts[row.branch.id]
	if (warehouseId === null || warehouseId === undefined) return
	savingId.value = row.branch.id
	errors[row.branch.id] = null
	try {
		await setKitchenStore(row.branch.id, warehouseId)
		message.success(t("kitchen.stores.saved"))
		await loadRows()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
		else errors[row.branch.id] = caught.data?.errors?.warehouse_id?.[0] ?? caught.data?.message ?? t("resourceCrud.mutations.genericError")
	} finally {
		savingId.value = null
	}
}

onMounted(() => {
	void loadRows()
	void loadWarehouses()
})

defineExpose({ optionsFor, drafts, save, rows })
</script>
