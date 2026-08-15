<!-- src/add-os/modules/spatial/views/FloorsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.floors") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('floors.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("floors.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isTableLoading" :on-edit="openEdit" :on-delete="async row => { await mutations.remove(row.id) }" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('floors.create.title') : t('floors.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { Floor, FloorPayload } from "@/add-os/modules/spatial/types/floor"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildFloorColumns, buildFloorFields, emptyFloorPayload } from "@/add-os/modules/spatial/config/floors.config"
import { listBranches } from "@/add-os/services/branches"
import { listBuildings } from "@/add-os/services/buildings"
import { createFloor, listFloors, removeFloor, updateFloor } from "@/add-os/services/floors"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data: branches, isLoading: isLoadingBranches } = useResourceList<Branch>(listBranches)
const { data: buildings, isLoading: isLoadingBuildings } = useResourceList<Building>(() => listBuildings())
const buildingsById = computed(() => Object.fromEntries(buildings.value.map(building => [building.id, building])))

const { data, isLoading, error, refetch } = useResourceList<Floor>(() => listFloors())
const isTableLoading = computed(() => isLoading.value || isLoadingBranches.value || isLoadingBuildings.value)
const columns = computed(() => buildFloorColumns(t, currentLocale.value, buildingsById.value))
const fields = computed(() => buildFloorFields(branches.value, currentLocale.value))

const mutations = useResourceMutations({ create: createFloor, update: updateFloor, remove: removeFloor }, refetch, {
	createSuccess: t("floors.create.success"),
	updateSuccess: t("floors.edit.success"),
	deleteSuccess: t("floors.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<FloorPayload & { branch_id: number | null }>(emptyFloorPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyFloorPayload()
	drawerVisible.value = true
}

function openEdit(row: Floor) {
	mode.value = "edit"
	editingId.value = row.id
	const branchId = buildingsById.value[row.building_id]?.branch_id ?? null
	form.value = { branch_id: branchId, building_id: row.building_id, label: row.label, sort_order: row.sort_order }
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as FloorPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as FloorPayload)
	}
}
</script>
