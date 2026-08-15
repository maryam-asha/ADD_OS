<!-- src/add-os/modules/spatial/views/BuildingsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.buildings") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('buildings.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("buildings.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="async row => { await mutations.remove(row.id) }" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('buildings.create.title') : t('buildings.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building, BuildingPayload } from "@/add-os/modules/spatial/types/building"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildBuildingColumns, buildBuildingFields, emptyBuildingPayload } from "@/add-os/modules/spatial/config/buildings.config"
import { listBranches } from "@/add-os/services/branches"
import { createBuilding, listBuildings, removeBuilding, updateBuilding } from "@/add-os/services/buildings"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data: branches } = useResourceList<Branch>(listBranches)
const branchesById = computed(() => Object.fromEntries(branches.value.map(branch => [branch.id, branch])))

const { data, isLoading, error, refetch } = useResourceList<Building>(() => listBuildings())
const columns = computed(() => buildBuildingColumns(t, currentLocale.value, branchesById.value))
const fields = computed(() => buildBuildingFields(branches.value, currentLocale.value))

const mutations = useResourceMutations({ create: createBuilding, update: updateBuilding, remove: removeBuilding }, refetch, {
	createSuccess: t("buildings.create.success"),
	updateSuccess: t("buildings.edit.success"),
	deleteSuccess: t("buildings.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<BuildingPayload>(emptyBuildingPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyBuildingPayload()
	drawerVisible.value = true
}

function openEdit(row: Building) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = { branch_id: row.branch_id, name: { ...row.name }, floor_count: row.floor_count }
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as BuildingPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as BuildingPayload)
	}
}
</script>
