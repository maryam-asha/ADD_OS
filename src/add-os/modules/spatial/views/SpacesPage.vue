<!-- src/add-os/modules/spatial/views/SpacesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t(titleKey || 'nav.pages.spaces')" :description="t('spaces.description')">
			<template #actions>
				<n-button type="primary" @click="openCreate">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("spaces.create.button") }}
				</n-button>
			</template>
		</PageHeader>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('spaces.loadError')" />

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="canDelete ? (async row => { await mutations.remove(row.id) }) : undefined"
			:delete-warning="t('spaces.delete.cascadeWarning')"
			:row-actions="spaceActions"
		/>

		<QrPointStickerModal v-model:show="stickerOpen" :point="stickerPoint" :label="stickerLabel" branch-name="" />

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

		<ResourceFormDrawer
			v-model:show="amenitiesDrawerVisible"
			v-model:model="amenitiesForm"
			:fields="amenitiesFields"
			:title="t('spaces.manageAmenities.title')"
			:submitting="amenitiesSubmitting"
			:on-submit="submitAmenitiesChange"
		/>
	</div>
</template>

<script setup lang="ts">
import type { RowAction } from "@/add-os/components/page/row-actions"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { QrPoint } from "@/add-os/modules/kitchen/types/kitchen"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { OperationalStatus } from "@/add-os/modules/spatial/types/operational-status"
import type { Space, SpaceAmenitiesPayload, SpacePayload, SpaceStatusPayload, SpaceType } from "@/add-os/modules/spatial/types/space"
import type { Zone } from "@/add-os/modules/spatial/types/zone"
import { NAlert, NButton, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { can, canDeleteSpatialResource } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import QrPointStickerModal from "@/add-os/modules/kitchen/components/QrPointStickerModal.vue"
import {
	buildSpaceAmenitiesFields,
	buildSpaceColumns,
	buildSpaceFields,
	buildSpaceStatusFields,
	emptySpacePayload
} from "@/add-os/modules/spatial/config/spaces.config"
import { ApiError } from "@/add-os/services/api"
import { listBranches } from "@/add-os/services/branches"
import { listBuildings } from "@/add-os/services/buildings"
import { createQrPoint, listQrPoints } from "@/add-os/services/kitchen"
import { createSpace, listSpaces, removeSpace, updateSpace, updateSpaceAmenities, updateSpaceStatus } from "@/add-os/services/spaces"
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

/** Spaces carry no code in their own answer, so every space code is read once and matched by space id. */
const spacePoints = ref<QrPoint[]>([])
const pointBySpaceId = computed(() => new Map(spacePoints.value.map(point => [point.place_id, point])))
const scanValueById = computed(() => Object.fromEntries([...pointBySpaceId.value].map(([id, point]) => [id, point.scan_value])))

async function loadSpacePoints() {
	if (!can("qr-points.view")) return
	try {
		// No per_page: the API answers every code unpaginated.
		spacePoints.value = (await listQrPoints({ place_type: "space" })).data
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		spacePoints.value = []
	}
}
void loadSpacePoints()

const busySpaceId = ref<number | null>(null)
const stickerOpen = ref(false)
const stickerPoint = ref<QrPoint | null>(null)
const stickerLabel = ref("")

function printCode(row: Space) {
	const point = pointBySpaceId.value.get(row.id)
	if (!point) return
	stickerPoint.value = point
	stickerLabel.value = row.name ? pickLocalized(row.name, currentLocale.value) : `#${row.id}`
	stickerOpen.value = true
}

async function createCode(row: Space) {
	busySpaceId.value = row.id
	try {
		await createQrPoint({ place_type: "space", place_id: row.id })
		message.success(t("kitchen.qr.created"))
		await loadSpacePoints()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		busySpaceId.value = null
	}
}

const columns = computed(() =>
	buildSpaceColumns(t, currentLocale.value, buildingsById.value, zonesById.value, {
		canPrint: can("qr-points.view"),
		canCreate: can("qr-points.create"),
		scanValueById: scanValueById.value,
		busyId: busySpaceId.value,
		onPrint: printCode,
		onCreate: createCode
	})
)
const fields = computed(() => buildSpaceFields(t, branches.value, currentLocale.value))
const canDelete = computed(() => canDeleteSpatialResource("spaces"))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const active = data.value.filter(space => space.status === "active").length
	const maintenance = data.value.filter(space => space.status === "maintenance").length
	const retired = data.value.filter(space => space.status === "retired").length
	return [
		{ label: t("spaces.stats.total"), value: total },
		{ label: t("operationalStatus.active"), value: active },
		{ label: t("operationalStatus.maintenance"), value: maintenance },
		{ label: t("operationalStatus.retired"), value: retired }
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
	const resolvedImages = Array.isArray(row.images) && row.images.length > 0
		? [...row.images]
		: (row.main_image || row.image_url ? [row.main_image || row.image_url!] : [])

	form.value = {
		branch_id: buildingsById.value[row.building_id]?.branch_id ?? null,
		building_id: row.building_id,
		zone_id: row.zone_id,
		// A pre-existing space can still have a `null` name (never backfilled);
		// the form field always needs a `{ar, en}` shape to edit into.
		name: row.name ?? { ar: "", en: "" },
		space_type: row.space_type,
		allocation_model: row.allocation_model,
		is_lockable: row.is_lockable,
		capacity: row.capacity,
		hourly_rate_points: row.hourly_rate_points,
		// Read-only: the server's own USD rendering, quoted under the input.
		// Never recomputed here — the point rate is server state.
		hourly_rate_usd_hint: row.hourly_rate_usd,
		allows_extension: row.allows_extension,
		cancellation_window_minutes: row.cancellation_window_minutes,
		images: resolvedImages
	}
	drawerVisible.value = true
}

async function submit(formPayload: Record<string, unknown>) {
	const payload = { ...formPayload }
	// The server refuses a co_space capacity: it counts the space's desks.
	if (payload.space_type === "co_space") delete payload.capacity
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

const amenitiesDrawerVisible = ref(false)
const amenitiesSubmitting = ref(false)
const amenitiesTargetId = ref<number | null>(null)
const amenitiesForm = ref<{ space_type: SpaceType; amenities: string[] }>({ space_type: "co_space", amenities: [] })
const amenitiesFields = computed(() => buildSpaceAmenitiesFields(currentLocale.value))

function openAmenitiesDrawer(row: Space) {
	amenitiesTargetId.value = row.id
	amenitiesForm.value = { space_type: row.space_type, amenities: [...row.amenities] }
	amenitiesDrawerVisible.value = true
}

async function submitAmenitiesChange(payload: Record<string, unknown>) {
	if (amenitiesTargetId.value === null) return
	amenitiesSubmitting.value = true
	try {
		await updateSpaceAmenities(amenitiesTargetId.value, payload as unknown as SpaceAmenitiesPayload)
		message.success(t("spaces.manageAmenities.success"))
		await refetch()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		// Same reasoning as submitStatusChange: a 422's field errors are handled
		// inline by ResourceFormDrawer, not toasted here too.
		if (caught.status === 422) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		throw caught
	} finally {
		amenitiesSubmitting.value = false
	}
}

function spaceActions(row: Space): RowAction[] {
	return [
		{ key: "status", label: t("spaces.changeStatus.button"), icon: "carbon:status-change", onClick: () => openStatusDrawer(row) },
		{ key: "amenities", label: t("spaces.manageAmenities.button"), icon: "fluent:task-list-ltr-24-regular", onClick: () => openAmenitiesDrawer(row) }
	]
}
</script>
