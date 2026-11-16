<!-- src/add-os/modules/inventory/components/PlacePicker.vue -->
<template>
	<div :class="inline ? 'flex flex-wrap sm:flex-nowrap items-center gap-2 w-full' : 'grid w-full grid-cols-1 gap-2 sm:grid-cols-2'">
		<n-select :value="branchId" :options="branchOptions" :placeholder="t('inventory.place.branch')" filterable clearable class="w-full flex-1 min-w-[130px]" :disabled @update:value="pickBranch" />
		<n-select v-if="!inline || branchId" :value="buildingId" :options="buildingOptions" :placeholder="t('inventory.place.building')" filterable clearable class="w-full flex-1 min-w-[130px]" :disabled="disabled || !branchId" @update:value="pickBuilding" />
		<n-select v-if="!inline || buildingId" :value="floorId" :options="floorOptions" :placeholder="t('inventory.place.floor')" filterable clearable class="w-full flex-1 min-w-[110px]" :disabled="disabled || !buildingId" @update:value="pickFloor" />
		<n-select v-if="!inline || floorId" :value="zoneId" :options="zoneOptions" :placeholder="t('inventory.place.zone')" filterable clearable class="w-full flex-1 min-w-[110px]" :disabled="disabled || !floorId" @update:value="pickZone" />
		<n-select v-if="!inline || buildingId" :value="spaceId" :options="spaceOptions" :placeholder="t('inventory.place.space')" filterable clearable class="w-full flex-1 min-w-[130px]" :disabled="disabled || !buildingId" @update:value="pickSpace" />
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PlaceChain, PlaceRef } from "@/add-os/modules/inventory/types/inventory"
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
 * Choosing a level clears every level below it.
 *
 * `chain` carries the levels themselves: read it to remember what was
 * chosen, pass one in to open on that place already chosen (the asset
 * form starts from the list's place filter that way).
 *
 * `inline` is for a list's filter bar: the selects become the bar's own
 * items, and a level shows only once the one above it is chosen — a bar of
 * four greyed-out selects said nothing and pushed the list off the screen.
 * A form keeps every level in view, so the path being built is visible.
 */
defineProps<{ disabled?: boolean; inline?: boolean }>()
const value = defineModel<PlaceRef | null>("value", { required: true })
const chain = defineModel<PlaceChain | null>("chain")

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

onMounted(() => {
	void quietly(listBranches, branches => (branchOptions.value = branches.map(b => ({ label: localized(b.name), value: b.id }))))
	if (chain.value && value.value) restore(chain.value)
})

function restore(levels: PlaceChain) {
	branchId.value = levels.branchId
	buildingId.value = levels.buildingId
	floorId.value = levels.floorId
	zoneId.value = levels.zoneId
	spaceId.value = levels.spaceId
	if (levels.branchId) loadBuildings(levels.branchId)
	if (levels.buildingId) loadFloors(levels.buildingId)
	if (levels.floorId) loadZones(levels.floorId)
	loadSpaces()
}

function pickBranch(id: number | null) {
	branchId.value = id
	buildingOptions.value = []
	if (id) loadBuildings(id)
	pickBuilding(null)
}

function pickBuilding(id: number | null) {
	buildingId.value = id
	floorOptions.value = []
	if (id) loadFloors(id)
	pickFloor(null)
}

function pickFloor(id: number | null) {
	floorId.value = id
	zoneOptions.value = []
	if (id) loadZones(id)
	pickZone(null)
}

function pickZone(id: number | null) {
	zoneId.value = id
	loadSpaces()
	pickSpace(null)
}

function pickSpace(id: number | null) {
	spaceId.value = id
	emit()
}

// A chain changed from outside — the back button, a cleared filter bar —
// is shown as given; the one this picker just emitted is already shown.
watch(chain, next => {
	if (next && !showing(next)) restore(next)
})

function showing(levels: PlaceChain): boolean {
	return (
		levels.branchId === branchId.value &&
		levels.buildingId === buildingId.value &&
		levels.floorId === floorId.value &&
		levels.zoneId === zoneId.value &&
		levels.spaceId === spaceId.value
	)
}

watch(value, next => {
	if (!next) {
		branchId.value = null
		buildingId.value = null
		floorId.value = null
		zoneId.value = null
		spaceId.value = null
		chain.value = null
	}
})

function loadBuildings(branch: number) {
	void quietly(() => listBuildings(branch), buildings => (buildingOptions.value = buildings.map(b => ({ label: localized(b.name), value: b.id }))))
}

function loadFloors(building: number) {
	void quietly(() => listFloors(building), floors => (floorOptions.value = floors.map(f => ({ label: f.label, value: f.id }))))
}

function loadZones(floor: number) {
	void quietly(() => listZones(floor), zones => (zoneOptions.value = zones.map(z => ({ label: z.label, value: z.id }))))
}

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
	chain.value = deepest ? { branchId: branchId.value, buildingId: buildingId.value, floorId: floorId.value, zoneId: zoneId.value, spaceId: spaceId.value } : null
	value.value = deepest
}
</script>
