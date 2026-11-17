<!-- src/add-os/modules/spatial/views/SeatsDesksPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t(titleKey || 'nav.pages.seatsDesks')" :description="t('seatsDesks.description')">
			<template #actions>
				<n-button type="primary" @click="openCreate">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("seatsDesks.create.button") }}
				</n-button>
			</template>
		</PageHeader>

		<n-alert v-if="error" type="error" :title="t('seatsDesks.loadError')" />

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="canDelete ? (async row => { await mutations.remove(row.id) }) : undefined"
		/>

		<QrPointStickerModal v-model:show="stickerOpen" :point="stickerPoint" :label="stickerLabel" branch-name="" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('seatsDesks.create.title') : t('seatsDesks.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { QrPoint } from "@/add-os/modules/kitchen/types/kitchen"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { SeatDesk, SeatDeskPayload } from "@/add-os/modules/spatial/types/seat-desk"
import { NAlert, NButton, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { can, canDeleteSpatialResource } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import QrPointStickerModal from "@/add-os/modules/kitchen/components/QrPointStickerModal.vue"
import { buildSeatDeskColumns, buildSeatDeskFields, emptySeatDeskPayload } from "@/add-os/modules/spatial/config/seats-desks.config"
import { ApiError } from "@/add-os/services/api"
import { listBranches } from "@/add-os/services/branches"
import { createQrPoint } from "@/add-os/services/kitchen"
import { createSeatDesk, listSeatsDesks, removeSeatDesk, updateSeatDesk } from "@/add-os/services/seats-desks"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data: branches } = useResourceList<Branch>(listBranches)

const { data, isLoading, error, refetch } = useResourceList<SeatDesk>(() => listSeatsDesks())
const message = useMessage()

const busyDeskId = ref<number | null>(null)
const stickerOpen = ref(false)
const stickerPoint = ref<QrPoint | null>(null)
const stickerLabel = ref("")

function printCode(row: SeatDesk) {
	if (row.qr_scan_value === null) return
	// The sticker only needs what the QR encodes and the desk's name.
	stickerPoint.value = { id: row.qr_point_id ?? 0, branch_id: 0, place_type: "seat_desk", place_id: row.id, place_label: row.label, scan_value: row.qr_scan_value }
	stickerLabel.value = row.label
	stickerOpen.value = true
}

async function createCode(row: SeatDesk) {
	busyDeskId.value = row.id
	try {
		await createQrPoint({ place_type: "seat_desk", place_id: row.id })
		message.success(t("kitchen.qr.created"))
		await refetch()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		busyDeskId.value = null
	}
}

const columns = computed(() =>
	buildSeatDeskColumns(t, {
		canPrint: can("qr-points.view"),
		canCreate: can("qr-points.create"),
		busyId: busyDeskId.value,
		onPrint: printCode,
		onCreate: createCode
	})
)
const fields = computed(() => buildSeatDeskFields(t, branches.value, currentLocale.value))
const canDelete = computed(() => canDeleteSpatialResource("seatsDesks"))

const mutations = useResourceMutations({ create: createSeatDesk, update: updateSeatDesk, remove: removeSeatDesk }, refetch, {
	createSuccess: t("seatsDesks.create.success"),
	updateSuccess: t("seatsDesks.edit.success"),
	deleteSuccess: t("seatsDesks.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref(emptySeatDeskPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptySeatDeskPayload()
	drawerVisible.value = true
}

function openEdit(row: SeatDesk) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		branch_id: null, // same known limitation as Zone/Space/Resource — the ancestor chain isn't looked up backwards from a space here
		building_id: null,
		zone_id: null,
		space_id: row.space_id,
		code: row.code,
		label: row.label
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as SeatDeskPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as SeatDeskPayload)
	}
}
</script>
