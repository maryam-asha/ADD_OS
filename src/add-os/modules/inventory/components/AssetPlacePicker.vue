<!-- src/add-os/modules/inventory/components/AssetPlacePicker.vue -->
<template>
	<div class="flex w-full flex-col gap-2">
		<n-radio-group v-if="warehousesAllowed" v-model:value="where" size="small">
			<n-radio-button value="place">{{ t("inventory.place.inPlace") }}</n-radio-button>
			<n-radio-button value="warehouse">{{ t("inventory.place.inWarehouse") }}</n-radio-button>
		</n-radio-group>
		<n-select v-if="where === 'warehouse'" :value="warehouseId" :options="warehouseOptions" :placeholder="t('inventory.place.pickWarehouse')" filterable clearable @update:value="pickWarehouse" />
		<PlacePicker v-else v-model:value="place" />
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PlaceRef, Warehouse } from "@/add-os/modules/inventory/types/inventory"
import { NRadioButton, NRadioGroup, NSelect } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { inventorySettings, listWarehouses } from "@/add-os/services/inventory"

/**
 * Where an asset goes: one of ADD's places — or, when the package lets
 * assets be stored before they are handed out, an active warehouse. With
 * the option off it is the plain place picker.
 */
const value = defineModel<PlaceRef | null>("value", { required: true })
const { t } = useI18n()

const warehousesAllowed = ref(false)
const warehouses = ref<Warehouse[]>([])
const where = ref<"place" | "warehouse">(value.value?.type === "warehouse" ? "warehouse" : "place")
/** The place picker's own value, kept apart so switching back restores it. */
const place = ref<PlaceRef | null>(value.value?.type === "warehouse" ? null : value.value)

const warehouseId = computed(() => (value.value?.type === "warehouse" ? value.value.id : null))
const warehouseOptions = computed<SelectOption[]>(() => warehouses.value.map(w => ({ label: localized(w.name), value: w.id })))

onMounted(async () => {
	await quietly(inventorySettings, settings => (warehousesAllowed.value = settings.assets_in_warehouses))
	if (warehousesAllowed.value) await quietly(() => listWarehouses({ active: true, per_page: 100 }), result => (warehouses.value = result.data))
})

function pickWarehouse(id: number | null) {
	value.value = id === null ? null : { type: "warehouse", id }
}

watch(place, next => {
	if (where.value === "place") value.value = next
})

watch(where, next => {
	value.value = next === "place" ? place.value : null
})
</script>
