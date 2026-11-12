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

		<!-- One alert per source that failed: a 403 on one list names that list, it does not blank the page. -->
		<n-alert
			v-for="failure in failures"
			:key="failure.source"
			:type="failure.denied ? 'warning' : 'error'"
			:title="t(failure.denied ? 'kitchen.qr.sourceDenied' : 'kitchen.qr.sourceError', { source: t(`kitchen.qr.sources.${failure.source}`) })"
			data-test="source-failure"
		/>

		<n-card v-if="branchId !== null">
			<n-spin :show="isLoading">
				<div v-if="rows.length === 0 && !isLoading && failures.length === 0" class="py-10 text-center">{{ t("kitchen.qr.empty") }}</div>
				<div
					v-for="row in rows"
					:key="row.key"
					class="flex flex-wrap items-center gap-3 py-2"
					:data-row="row.key"
				>
					<div class="flex min-w-48 flex-1 flex-col">
						<span class="font-bold">{{ row.label }}</span>
						<span class="text-xs text-secondary">{{ row.spaceType ? t(`spaces.spaceType.${row.spaceType}`) : t(`kitchen.qr.kind.${row.placeType}`) }}</span>
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

		<QrPointStickerModal v-model:show="stickerOpen" :point="stickerRow?.point ?? null" :label="stickerRow?.label ?? ''" :branch-name />
	</div>
</template>

<script setup lang="ts">
import type { QrPlaceType, QrPoint } from "@/add-os/modules/kitchen/types/kitchen"
import type { Space, SpaceType } from "@/add-os/modules/spatial/types/space"
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
 * room, office and hall. A place without a code can be given one (asking again for a place that
 * has one answers the existing code, so it is safe to click twice); a code can
 * be printed as a sticker, or deleted, which stops the printed stickers.
 */

type QrSource = "buildings" | "spaces" | "desks" | "codes"

interface PlaceRow {
	key: string
	placeType: QrPlaceType
	placeId: number
	label: string
	/** Set for a space row, so the list can say whether it is a room, an office or a hall. */
	spaceType?: SpaceType
	point: QrPoint | null
}

/** A co-working space is coded desk by desk, so it never gets a code of its own. */
const CODED_SPACE_TYPES: SpaceType[] = ["room", "business", "event_hall"]

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const { branchOptions, branchNames } = useBranchOptions()

const mayCreate = computed(() => can("qr-points.create"))
const mayDelete = computed(() => can("qr-points.delete"))

const branchId = ref<number | null>(null)
const rows = ref<PlaceRow[]>([])
const isLoading = ref(false)
/** The lists that could not be read this time, and whether the reason is a missing permission. */
const failures = ref<{ source: QrSource; denied: boolean }[]>([])
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
	const failed: { source: QrSource; denied: boolean }[] = []

	/** One source's answer, or its fallback and a note of why it is missing. Anything but an API refusal is a bug and surfaces. */
	async function read<T>(source: QrSource, fallback: T, run: () => Promise<T>): Promise<T> {
		try {
			return await run()
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			failed.push({ source, denied: caught.status === 403 })
			return fallback
		}
	}

	try {
		const buildings = await read("buildings", [], () => listBuildings(branch))
		const spaceLists = await read("spaces", [], () => Promise.all(buildings.map(building => listSpaces({ building_id: building.id }))))
		const spaces = spaceLists.flat()
		const desks = await read("desks", [], () => listSeatsDesks({ branch_id: branch }))
		// Without the codes every place would read "No code", which would be a lie: show no rows rather than wrong ones.
		const points = await read<QrPoint[] | null>("codes", null, async () => (await listQrPoints({ branch_id: branch })).data)
		if (branch !== branchId.value) return
		failures.value = failed

		if (points === null) {
			rows.value = []
			return
		}

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
		const spaceRows: PlaceRow[] = spaces
			.filter(space => CODED_SPACE_TYPES.includes(space.space_type))
			.map(space => ({
				key: `space:${space.id}`,
				placeType: "space",
				placeId: space.id,
				label: spaceName(space),
				spaceType: space.space_type,
				point: pointOf("space", space.id)
			}))
		rows.value = [...deskRows, ...spaceRows]
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
