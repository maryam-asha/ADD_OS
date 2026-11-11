<!-- src/add-os/modules/kitchen/views/KitchenQrPointsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t("nav.pages.qrPoints") }}</h1>
			<p>{{ t("kitchen.qr.description") }}</p>
		</div>

		<n-select
			v-model:value="branchId"
			:options="branchOptions"
			:placeholder="t('kitchen.qr.branch')"
			class="sm:w-72!"
			data-test="branch-select"
		/>

		<n-alert v-if="loadError" type="error" :title="t('kitchen.qr.loadError')" />

		<n-card v-if="branchId !== null">
			<n-spin :show="isLoading">
				<div v-if="rows.length === 0 && !isLoading" class="py-10 text-center">{{ t("kitchen.qr.empty") }}</div>
				<div
					v-for="row in rows"
					:key="row.key"
					class="flex flex-wrap items-center gap-3 py-2"
					:data-row="row.key"
				>
					<div class="flex min-w-48 flex-1 flex-col">
						<span class="font-bold">{{ row.label }}</span>
						<span class="text-xs text-secondary">{{ t(`kitchen.qr.kind.${row.placeType}`) }}</span>
					</div>
					<n-tag :type="row.point ? 'success' : 'default'" size="small">
						{{ row.point ? t("kitchen.qr.hasCode") : t("kitchen.qr.noCode") }}
					</n-tag>
					<n-button
						v-if="!row.point && mayCreate"
						size="small"
						type="primary"
						:loading="busyKey === row.key"
						data-test="create-code"
						@click="create(row)"
					>
						{{ t("kitchen.qr.create") }}
					</n-button>
					<n-button v-if="row.point" size="small" secondary data-test="print-code" @click="openSticker(row)">
						<template #icon><Icon name="carbon:printer" :size="16" /></template>
						{{ t("kitchen.qr.print") }}
					</n-button>
					<n-button
						v-if="row.point && mayDelete"
						size="small"
						type="error"
						secondary
						data-test="delete-code"
						@click="confirmDelete(row)"
					>
						{{ t("kitchen.qr.delete") }}
					</n-button>
				</div>
			</n-spin>
		</n-card>
		<p v-else>{{ t("kitchen.qr.chooseBranch") }}</p>

		<QrPointStickerModal v-model:show="stickerOpen" :point="stickerRow?.point ?? null" :label="stickerRow?.label ?? ''" :branch-name="branchName" />
	</div>
</template>

<script setup lang="ts">
import type { QrPlaceType, QrPoint } from "@/add-os/modules/kitchen/types/kitchen"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NAlert, NButton, NCard, NSelect, NSpin, NTag, useDialog, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { can } from "@/add-os/config/permissions"
import { useBranchOptions } from "@/add-os/modules/dashboard/composables/useBranchOptions"
import { localized } from "@/add-os/modules/inventory/utils/display"
import QrPointStickerModal from "@/add-os/modules/kitchen/components/QrPointStickerModal.vue"
import { ApiError } from "@/add-os/services/api"
import { listBuildings } from "@/add-os/services/buildings"
import { createQrPoint, listQrPoints, removeQrPoint } from "@/add-os/services/kitchen"
import { listSeatsDesks } from "@/add-os/services/seats-desks"
import { listSpaces } from "@/add-os/services/spaces"
import Icon from "@/components/common/Icon.vue"

/**
 * The codes members scan to order from the kitchen: one per desk and one per
 * room. A place without a code can be given one (asking again for a place that
 * has one answers the existing code, so it is safe to click twice); a code can
 * be printed as a sticker, or deleted, which stops the printed stickers.
 */

interface PlaceRow {
	key: string
	placeType: QrPlaceType
	placeId: number
	label: string
	point: QrPoint | null
}

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const { branchOptions, branchNames } = useBranchOptions()

const mayCreate = computed(() => can("qr-points.create"))
const mayDelete = computed(() => can("qr-points.delete"))

const branchId = ref<number | null>(null)
const rows = ref<PlaceRow[]>([])
const isLoading = ref(false)
const loadError = ref(false)
const busyKey = ref<string | null>(null)
const stickerOpen = ref(false)
const stickerRow = ref<PlaceRow | null>(null)

const branchName = computed(() => (branchId.value === null ? "" : (branchNames.value[branchId.value] ?? "")))

function spaceName(space: Space): string {
	return localized(space.name) || `#${space.id}`
}

async function load() {
	if (branchId.value === null) return
	const branch = branchId.value
	isLoading.value = true
	loadError.value = false
	try {
		const buildings = await listBuildings(branch)
		const spaceLists = await Promise.all(buildings.map(building => listSpaces({ building_id: building.id })))
		const spaces = spaceLists.flat()
		const desks = await listSeatsDesks({ branch_id: branch })
		const points = (await listQrPoints({ branch_id: branch, per_page: 100 })).data
		if (branch !== branchId.value) return

		const pointOf = (type: QrPlaceType, id: number) => points.find(point => point.place_type === type && point.place_id === id) ?? null
		const spaceById = new Map(spaces.map(space => [space.id, space]))

		const deskRows: PlaceRow[] = desks.map((desk) => {
			const space = spaceById.get(desk.space_id)
			return {
				key: `seat_desk:${desk.id}`,
				placeType: "seat_desk",
				placeId: desk.id,
				label: space ? `${spaceName(space)} · ${desk.label}` : desk.label,
				point: pointOf("seat_desk", desk.id)
			}
		})
		const roomRows: PlaceRow[] = spaces
			.filter(space => space.space_type === "room")
			.map(space => ({
				key: `space:${space.id}`,
				placeType: "space",
				placeId: space.id,
				label: spaceName(space),
				point: pointOf("space", space.id)
			}))
		rows.value = [...deskRows, ...roomRows]
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadError.value = true
		rows.value = []
	} finally {
		isLoading.value = false
	}
}

async function create(row: PlaceRow) {
	busyKey.value = row.key
	try {
		await createQrPoint({ place_type: row.placeType, place_id: row.placeId })
		message.success(t("kitchen.qr.created"))
		await load()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		busyKey.value = null
	}
}

function openSticker(row: PlaceRow) {
	stickerRow.value = row
	stickerOpen.value = true
}

function confirmDelete(row: PlaceRow) {
	const point = row.point
	if (!point) return
	dialog.warning({
		title: t("kitchen.qr.delete"),
		content: t("kitchen.qr.deleteConfirm", { place: row.label }),
		positiveText: t("kitchen.qr.deleteOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: async () => {
			try {
				await removeQrPoint(point.id)
				message.success(t("kitchen.qr.deleted"))
				await load()
			} catch (caught) {
				if (!(caught instanceof ApiError)) throw caught
				message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			}
		}
	})
}

watch(branchId, () => {
	void load()
})

defineExpose({ rows, branchId, load })
</script>
