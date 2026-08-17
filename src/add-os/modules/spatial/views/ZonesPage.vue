<!-- src/add-os/modules/spatial/views/ZonesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.zones") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('zones.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("zones.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isTableLoading"
			:on-edit="openEdit"
			:on-delete="canDelete ? (async row => { await mutations.remove(row.id) }) : undefined"
			:delete-warning="t('zones.delete.cascadeWarning')"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('zones.create.title') : t('zones.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Floor } from "@/add-os/modules/spatial/types/floor"
import type { Zone, ZonePayload } from "@/add-os/modules/spatial/types/zone"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { canDeleteSpatialResource } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildZoneColumns, buildZoneFields, emptyZonePayload } from "@/add-os/modules/spatial/config/zones.config"
import { listBranches } from "@/add-os/services/branches"
import { listFloors } from "@/add-os/services/floors"
import { createZone, listZones, removeZone, updateZone } from "@/add-os/services/zones"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data: branches, isLoading: isLoadingBranches } = useResourceList<Branch>(listBranches)
const { data: floors, isLoading: isLoadingFloors } = useResourceList<Floor>(() => listFloors())
const floorsById = computed(() => Object.fromEntries(floors.value.map(floor => [floor.id, floor])))

const { data, isLoading, error, refetch } = useResourceList<Zone>(() => listZones())
const isTableLoading = computed(() => isLoading.value || isLoadingBranches.value || isLoadingFloors.value)
const columns = computed(() => buildZoneColumns(t, currentLocale.value, floorsById.value))
const fields = computed(() => buildZoneFields(branches.value, currentLocale.value))
const canDelete = computed(() => canDeleteSpatialResource("zones"))

const mutations = useResourceMutations({ create: createZone, update: updateZone, remove: removeZone }, refetch, {
	createSuccess: t("zones.create.success"),
	updateSuccess: t("zones.edit.success"),
	deleteSuccess: t("zones.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref(emptyZonePayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyZonePayload()
	drawerVisible.value = true
}

function openEdit(row: Zone) {
	mode.value = "edit"
	editingId.value = row.id
	const floor = floorsById.value[row.floor_id]
	form.value = {
		branch_id: null, // the floor's building/branch aren't loaded here; the cascade re-derives valid options once building_id is set below
		building_id: floor?.building_id ?? null,
		floor_id: row.floor_id,
		label: row.label,
		sort_order: row.sort_order
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as ZonePayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as ZonePayload)
	}
}
</script>
