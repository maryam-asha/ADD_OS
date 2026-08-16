<!-- src/add-os/modules/spatial/views/SpacesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.spaces") }}</h1>
		</div>

		<ResourceStatCards :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('spaces.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("spaces.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="async row => { await mutations.remove(row.id) }"
			:extra-actions="renderStatusAction"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('spaces.create.title') : t('spaces.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>

		<ResourceFormDrawer
			v-model:show="statusDrawerVisible"
			v-model:model="statusForm"
			:fields="statusFields"
			:title="t('spaces.changeStatus.title')"
			:submitting="statusSubmitting"
			:on-submit="submitStatusChange"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { OperationalStatus } from "@/add-os/modules/spatial/types/operational-status"
import type { Space, SpacePayload, SpaceStatusPayload } from "@/add-os/modules/spatial/types/space"
import type { Zone } from "@/add-os/modules/spatial/types/zone"
import { NButton, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	buildSpaceColumns,
	buildSpaceFields,
	buildSpaceStatusFields,
	emptySpacePayload
} from "@/add-os/modules/spatial/config/spaces.config"
import { ApiError } from "@/add-os/services/api"
import { listBranches } from "@/add-os/services/branches"
import { listBuildings } from "@/add-os/services/buildings"
import { createSpace, listSpaces, removeSpace, updateSpace, updateSpaceStatus } from "@/add-os/services/spaces"
import { listZones } from "@/add-os/services/zones"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

const { data: branches } = useResourceList<Branch>(listBranches)
const { data: buildings } = useResourceList<Building>(() => listBuildings())
const buildingsById = computed(() => Object.fromEntries(buildings.value.map(building => [building.id, building])))
const { data: zones } = useResourceList<Zone>(() => listZones())
const zonesById = computed(() => Object.fromEntries(zones.value.map(zone => [zone.id, zone])))

const { data, isLoading, error, refetch } = useResourceList<Space>(() => listSpaces())
const columns = computed(() => buildSpaceColumns(t, currentLocale.value, buildingsById.value, zonesById.value))
const fields = computed(() => buildSpaceFields(t, branches.value, currentLocale.value))

const statCards = computed(() => {
	const total = data.value.length
	const active = data.value.filter(space => space.status === "active").length
	const maintenance = data.value.filter(space => space.status === "maintenance").length
	const retired = data.value.filter(space => space.status === "retired").length
	return [
		{ label: t("spaces.stats.total"), value: total },
		{ label: t("spaces.stats.active"), value: active },
		{ label: t("spaces.stats.maintenance"), value: maintenance },
		{ label: t("spaces.stats.retired"), value: retired }
	]
})

const mutations = useResourceMutations({ create: createSpace, update: updateSpace, remove: removeSpace }, refetch, {
	createSuccess: t("spaces.create.success"),
	updateSuccess: t("spaces.edit.success"),
	deleteSuccess: t("spaces.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref(emptySpacePayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptySpacePayload()
	drawerVisible.value = true
}

function openEdit(row: Space) {
	mode.value = "edit"
	editingId.value = row.id
	// `branch_id` is virtual (it only narrows the building dropdown), but it still
	// has to be seeded or the drawer opens with an empty branch above a populated
	// building. buildingsById is already loaded here for the table's building
	// column, so derive it the same way FloorsPage.openEdit does.
	form.value = {
		branch_id: buildingsById.value[row.building_id]?.branch_id ?? null,
		building_id: row.building_id,
		zone_id: row.zone_id,
		space_type: row.space_type,
		allocation_model: row.allocation_model,
		is_lockable: row.is_lockable,
		capacity: row.capacity,
		hourly_rate: row.hourly_rate,
		pricing_currency: row.pricing_currency
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as SpacePayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as SpacePayload)
	}
}

const statusDrawerVisible = ref(false)
const statusSubmitting = ref(false)
const statusTargetId = ref<number | null>(null)
const statusForm = ref<{ status: OperationalStatus; status_reason: string }>({ status: "active", status_reason: "" })
const statusFields = computed(() => buildSpaceStatusFields(t))

function openStatusDrawer(row: Space) {
	statusTargetId.value = row.id
	statusForm.value = { status: row.status, status_reason: row.status_reason ?? "" }
	statusDrawerVisible.value = true
}

async function submitStatusChange(payload: Record<string, unknown>) {
	if (statusTargetId.value === null) return
	statusSubmitting.value = true
	try {
		await updateSpaceStatus(statusTargetId.value, payload as unknown as SpaceStatusPayload)
		message.success(t("spaces.changeStatus.success"))
		await refetch()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		// A 422 carries field-level `errors` that ResourceFormDrawer's own
		// handleSubmit catch maps onto the status drawer's fieldErrors (inline
		// per-field feedback) — rethrow without toasting, same as
		// useResourceMutations.ts, so it isn't shown twice.
		if (caught.status === 422) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		throw caught
	} finally {
		statusSubmitting.value = false
	}
}

function renderStatusAction(row: Space) {
	return [h(NButton, { text: true, onClick: () => openStatusDrawer(row) }, { default: () => t("spaces.changeStatus.button") })]
}
</script>
