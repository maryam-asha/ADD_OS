import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { AmenityType } from "@/add-os/modules/spatial/types/amenity"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { Space, SpacePayload, SpaceType } from "@/add-os/modules/spatial/types/space"
import type { Zone } from "@/add-os/modules/spatial/types/zone"
import { NImage } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { buildOperationalStatusOptions, renderOperationalStatusTag } from "@/add-os/modules/spatial/types/operational-status"
import { SPACE_TYPES } from "@/add-os/modules/spatial/types/space"
import { listBuildings } from "@/add-os/services/buildings"
import { listFloors } from "@/add-os/services/floors"
import { listSpaceTypeAmenities } from "@/add-os/services/space-type-amenities"
import { listZones } from "@/add-os/services/zones"
import { formatCurrency, formatNumber, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

export function buildSpaceColumns(
	t: ComposerTranslation,
	locale: SupportedLocale,
	buildingsById: Record<number, Building>,
	zonesById: Record<number, Zone>
): DataTableColumns<Space> {
	return [
		{
			title: t("spaces.columns.image"),
			key: "image_url",
			width: 70,
			render: row => {
				const src = (row.images && row.images[0]) || row.main_image || row.image_url
				return src
					? h(NImage, {
							width: 44,
							height: 44,
							src,
							class: "rounded-lg overflow-hidden flex items-center justify-center",
							imgProps: {
								class: "rounded-lg object-cover w-11 h-11 border border-black/10 shadow-2xs"
							}
						})
					: h(
							"div",
							{
								class:
									"w-11 h-11 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 border border-black/5"
							},
							[h(Icon, { name: "carbon:image", size: 18 })]
						)
			}
		},
		{
			title: t("spaces.columns.name"),
			key: "name",
			render: row => (row.name ? pickLocalized(row.name, locale) : "—")
		},
		{
			title: t("spaces.columns.building"),
			key: "building_id",
			render: row => (buildingsById[row.building_id] ? pickLocalized(buildingsById[row.building_id].name, locale) : row.building_id)
		},
		{
			title: t("spaces.columns.zone"),
			key: "zone_id",
			render: row => (row.zone_id && zonesById[row.zone_id] ? zonesById[row.zone_id].label : "—")
		},
		{ title: t("spaces.columns.spaceType"), key: "space_type", render: row => t(`spaces.spaceType.${row.space_type}`) },
		{ title: t("spaces.columns.capacity"), key: "capacity", render: row => formatNumber(row.capacity) },
		{
			title: t("spaces.columns.hourlyRate"),
			key: "hourly_rate_points",
			// Points lead, the server's currency rendering follows. Both figures
			// come off the row as the API sent them; neither is derived here.
			render: row =>
				row.hourly_rate_points === null
					? "—"
					: h("div", [
							h("div", `${formatNumber(row.hourly_rate_points)} ${t("points.unit")}`),
							row.hourly_rate_display && isCurrencyCode(row.currency)
								? h(
										"div",
										{ class: "text-secondary text-xs" },
										`≈ ${formatCurrency(row.hourly_rate_display, { currency: row.currency })}`
									)
								: null
						])
		},
		{ title: t("spaces.columns.status"), key: "status", render: row => renderOperationalStatusTag(row.status, t) }
	]
}

/**
 * `branch_id` is `number | null`, not `number`: `null` is the "nothing
 * selected yet" sentinel for this virtual ancestor-narrowing select,
 * consistent with `SpacePayload.building_id` (see space.ts) and with
 * `ResourceFormDrawer`'s own cascade-clearing logic, which assigns `null`
 * (never `0`) when it invalidates a dependent field's value.
 *
 * `SpaceFormModel extends SpacePayload` here (interface inheritance, not an
 * intersection type) — since `SpacePayload` already `extends Record<string,
 * unknown>`, `SpaceFormModel` automatically satisfies that same generic
 * constraint too, with no explicit `extends Record<string, unknown>` clause
 * of its own needed (see the doc comment on `SpacePayload` in space.ts).
 */
interface SpaceFormModel extends SpacePayload {
	branch_id: number | null
	/**
	 * The server's own USD rendering of `hourly_rate_points` for the space
	 * being edited (`hourly_rate_usd`), quoted read-only beneath the point
	 * input.
	 *
	 * Carried on the form model but deliberately given no `FieldDescriptor` of
	 * its own: `buildPayload` copies only declared fields, so this never
	 * reaches the API — it is the server's answer, not the operator's input. It
	 * deliberately does not track edits to the point count: recomputing it
	 * would need the point rate, which lives on the server precisely so this
	 * client never holds a second copy of it. It refreshes on reload.
	 */
	hourly_rate_usd_hint: string | null
}

export function buildSpaceFields(t: ComposerTranslation, branches: Branch[], locale: SupportedLocale): FieldDescriptor<SpaceFormModel>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))
	const spaceTypeOptions: SelectOption[] = SPACE_TYPES.map(type => ({ label: t(`spaces.spaceType.${type}`), value: type }))

	return [
		/**
		 * No `required: true` here: `branch_id` is `virtual: true` and stripped
		 * before submit. `building_id`'s own `optionsFrom` (`if (!branch_id)
		 * return []`) already structurally forces the user through `branch_id`
		 * before `building_id` can have any options, so `building_id`'s own
		 * `required: true` is what actually guarantees data quality. Making
		 * `branch_id` itself required as well would block Edit whenever the
		 * ancestor is deliberately left unset (see `openEdit` below) — the same
		 * problem Task 11 (Zone) already fixed for its own virtual ancestor field.
		 */
		{ key: "name", labelKey: "spaces.form.name", type: "bilingual-text", required: true },
		{ key: "branch_id", labelKey: "spaces.form.branch", type: "select", options: branchOptions, virtual: true },
		{
			key: "building_id",
			labelKey: "spaces.form.building",
			type: "select",
			required: true,
			dependsOn: "branch_id",
			optionsFrom: async ({ branch_id }) => {
				if (!branch_id) return []
				const buildings = await listBuildings(branch_id as number)
				return buildings.map(building => ({ label: pickLocalized(building.name, locale), value: building.id }))
			}
		},
		{
			key: "zone_id",
			labelKey: "spaces.form.zone",
			type: "select",
			dependsOn: "building_id",
			optionsFrom: async ({ building_id }) => {
				if (!building_id) return []
				const floors = await listFloors(building_id as number)
				const zonesByFloor = await Promise.all(floors.map(floor => listZones(floor.id)))
				return zonesByFloor.flat().map(zone => ({ label: zone.label, value: zone.id }))
			}
		},
		{ key: "space_type", labelKey: "spaces.form.spaceType", type: "select", required: true, options: spaceTypeOptions },
		{ key: "allocation_model", labelKey: "spaces.form.allocationModel", type: "text" },
		{ key: "is_lockable", labelKey: "spaces.form.isLockable", type: "switch" },
		// A co_space's capacity is the number of its desks, kept by the server
		// and never sent (docs/decisions/coworking-seat-pool.md).
		{ key: "capacity", labelKey: "spaces.form.capacity", type: "number", required: true, hiddenWhen: model => model.space_type === "co_space" },
		{
			key: "hourly_rate_points",
			labelKey: "spaces.form.hourlyRatePoints",
			type: "number",
			step: 1,
			min: 0,
			integer: true,
			// The `$` sits here rather than in the locale bundle: a symbol-only
			// Arabic value fails the repo's ar/en script guard.
			hint: model => (model.hourly_rate_usd_hint ? `≈ $${model.hourly_rate_usd_hint}` : "")
		},
		{ key: "images", labelKey: "spaces.form.images", type: "multi-image", folder: "spaces" }
	]
}

export function emptySpacePayload(): SpaceFormModel {
	return {
		branch_id: null,
		building_id: null,
		zone_id: null,
		name: { ar: "", en: "" },
		space_type: "co_space",
		allocation_model: null,
		is_lockable: false,
		capacity: 1,
		hourly_rate_points: null,
		hourly_rate_usd_hint: null,
		images: []
	}
}

/**
 * Reuses the shared `buildOperationalStatusOptions` from `operational-status.ts`
 * rather than redeclaring the 3 status values here — Task 13's `SpaceResource`
 * status form reuses the exact same function.
 */
export function buildSpaceStatusFields(t: ComposerTranslation): FieldDescriptor<{ status: string; status_reason: string }>[] {
	return [
		{ key: "status", labelKey: "spaces.changeStatus.statusLabel", type: "select", required: true, options: buildOperationalStatusOptions(t) },
		{ key: "status_reason", labelKey: "spaces.changeStatus.reasonLabel", type: "text" }
	]
}

/**
 * The dedicated "manage amenities" action's own field list — a single
 * switch-group, same as `status` above is its own separate form rather than
 * a field on the general create/edit drawer. `space_type` isn't a field here
 * (it's fixed for whichever space this action is opened for) but still has
 * to be on the model `optionsFrom` reads via its `dependsOn`.
 */
export function buildSpaceAmenitiesFields(t: ComposerTranslation): FieldDescriptor<{ space_type: SpaceType; amenities: AmenityType[] }>[] {
	return [
		{
			key: "amenities",
			labelKey: "spaces.form.amenities",
			type: "switch-group",
			dependsOn: "space_type",
			optionsFrom: async ({ space_type }) => {
				const matrix = await listSpaceTypeAmenities()
				const forType = matrix.find(row => row.space_type === space_type)
				return (forType?.amenities ?? []).map(amenity => ({ label: t(`amenities.types.${amenity}`), value: amenity }))
			}
		}
	]
}
