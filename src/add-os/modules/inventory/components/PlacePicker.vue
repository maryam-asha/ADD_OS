<!-- src/add-os/modules/inventory/components/PlacePicker.vue -->
<template>
	<div :class="inline ? 'contents' : 'grid w-full grid-cols-1 gap-2 sm:grid-cols-2'">
		<n-select v-model:value="branchId" :options="branchOptions" :placeholder="t('inventory.place.branch')" filterable clearable :class="inlineField" :disabled />
		<n-select v-if="!inline || branchId" v-model:value="buildingId" :options="buildingOptions" :placeholder="t('inventory.place.building')" filterable clearable :class="inlineField" :disabled="disabled || !branchId" />
		<n-select v-if="!inline || buildingId" v-model:value="floorId" :options="floorOptions" :placeholder="t('inventory.place.floor')" filterable clearable :class="inlineField" :disabled="disabled || !buildingId" />
		<n-select v-if="!inline || floorId" v-model:value="zoneId" :options="zoneOptions" :placeholder="t('inventory.place.zone')" filterable clearable :class="inlineField" :disabled="disabled || !floorId" />
		<n-select v-if="!inline || buildingId" v-model:value="spaceId" :options="spaceOptions" :placeholder="t('inventory.place.space')" filterable clearable :class="inline ? inlineField : 'sm:col-span-2'" :disabled="disabled || !buildingId" />
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PlaceRef } from "@/add-os/modules/inventory/types/inventory"
import { NSelect } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
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
 *
 * `inline` is for a list's filter bar: the selects become the bar's own
 * items, and a level shows only once the one above it is chosen — a bar of
 * four greyed-out selects said nothing and pushed the list off the screen.
 * A form keeps every level in view, so the path being built is visible.
 *
 * The inline widths carry Tailwind's `!`, as do the other filters beside
 * them: Naive injects its component CSS at runtime, unlayered, and an
 * unlayered rule outranks anything in Tailwind v4's `@layer utilities`
 * whatever its specificity — `.n-select { width: 100% }` silently beat
 * `sm:w-44`, and `.n-input { max-width: 100% }` beat `max-w-xs`, so each
 * filter took a whole row of a wide screen (live QA, 2026-10-25). An
 * `!important` layered declaration is the one that outranks it.
 *
 * In a form the grid is `w-full`: it sits in the form item's flex row,
 * where it shrank to its selects (440px of a 673px field).
 */
const props = defineProps<{ disabled?: boolean; inline?: boolean }>()
const value = defineModel<PlaceRef | null>("value", { required: true })

const { t } = useI18n()
const inlineField = computed(() => (props.inline ? "sm:w-44!" : undefined))

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
