<!-- src/add-os/modules/inventory/components/PlacePicker.vue -->
<template>
	<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
		<n-select v-model:value="branchId" :options="branchOptions" :placeholder="t('inventory.place.branch')" filterable clearable :disabled />
		<n-select v-model:value="buildingId" :options="buildingOptions" :placeholder="t('inventory.place.building')" filterable clearable :disabled="disabled || !branchId" />
		<n-select v-model:value="floorId" :options="floorOptions" :placeholder="t('inventory.place.floor')" filterable clearable :disabled="disabled || !buildingId" />
		<n-select v-model:value="zoneId" :options="zoneOptions" :placeholder="t('inventory.place.zone')" filterable clearable :disabled="disabled || !floorId" />
		<n-select v-model:value="spaceId" :options="spaceOptions" :placeholder="t('inventory.place.space')" filterable clearable class="sm:col-span-2" :disabled="disabled || !buildingId" />
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PlaceRef } from "@/add-os/modules/inventory/types/inventory"
import { NSelect } from "naive-ui"
import { onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { listBranches } from "@/add-os/services/branches"
import { listBuildings } from "@/add-os/services/buildings"
import { listFloors } from "@/add-os/services/floors"
import { listSpaces } from "@/add-os/services/spaces"
import { listZones } from "@/add-os/services/zones"

/**
 * Choosing an inventory place in ADD's own hierarchy: a branch, then as
 * deep as it needs to go — a building, a floor, a zone, a space. The value
 * is the deepest one chosen, as ADD Core's `{type, id}`; a space can be
 * picked straight from its building, since a space need not be zoned.
 * Clearing a level clears every level below it.
 */
defineProps<{ disabled?: boolean }>()
const value = defineModel<PlaceRef | null>("value", { required: true })

const { t } = useI18n()

const branchId = ref<number | null>(null)
const buildingId = ref<number | null>(null)
const floorId = ref<number | null>(null)
const zoneId = ref<number | null>(null)
const spaceId = ref<number | null>(null)

const branchOptions = ref<SelectOption[]>([])
const buildingOptions = ref<SelectOption[]>([])
const floorOptions = ref<SelectOption[]>([])
const zoneOptions = ref<SelectOption[]>([])
const spaceOptions = ref<SelectOption[]>([])

onMounted(() => void quietly(listBranches, branches => (branchOptions.value = branches.map(b => ({ label: localized(b.name), value: b.id })))))

watch(branchId, id => {
	buildingId.value = null
	buildingOptions.value = []
	if (id) void quietly(() => listBuildings(id), buildings => (buildingOptions.value = buildings.map(b => ({ label: localized(b.name), value: b.id }))))
	emit()
})

watch(buildingId, id => {
	floorId.value = null
	spaceId.value = null
	floorOptions.value = []
	if (id) void quietly(() => listFloors(id), floors => (floorOptions.value = floors.map(f => ({ label: f.label, value: f.id }))))
	loadSpaces()
	emit()
})

watch(floorId, id => {
	zoneId.value = null
	zoneOptions.value = []
	if (id) void quietly(() => listZones(id), zones => (zoneOptions.value = zones.map(z => ({ label: z.label, value: z.id }))))
	emit()
})

watch(zoneId, () => {
	spaceId.value = null
	loadSpaces()
	emit()
})

watch(spaceId, () => emit())

function loadSpaces() {
	spaceOptions.value = []
	if (!buildingId.value) return
	const filter = { building_id: buildingId.value, zone_id: zoneId.value ?? undefined }
	void quietly(
		() => listSpaces(filter),
		spaces => (spaceOptions.value = spaces.map(s => ({ label: s.name ? localized(s.name) : t(`spaces.spaceType.${s.space_type}`, { id: s.id }), value: s.id })))
	)
}

function emit() {
	const deepest: PlaceRef | null = spaceId.value
		? { type: "space", id: spaceId.value }
		: zoneId.value
			? { type: "zone", id: zoneId.value }
			: floorId.value
				? { type: "floor", id: floorId.value }
				: buildingId.value
					? { type: "building", id: buildingId.value }
					: branchId.value
						? { type: "branch", id: branchId.value }
						: null
	value.value = deepest
}
</script>
