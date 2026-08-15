import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Floor } from "@/add-os/modules/spatial/types/floor"
import type { Zone, ZonePayload } from "@/add-os/modules/spatial/types/zone"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { listBuildings } from "@/add-os/services/buildings"
import { listFloors } from "@/add-os/services/floors"
import { formatNumber } from "@/add-os/utils/format"

export function buildZoneColumns(t: ComposerTranslation, locale: SupportedLocale, floorsById: Record<number, Floor>): DataTableColumns<Zone> {
	return [
		{
			title: t("zones.columns.floor"),
			key: "floor_id",
			render: row => (floorsById[row.floor_id] ? floorsById[row.floor_id].label : row.floor_id)
		},
		{ title: t("zones.columns.label"), key: "label" },
		{ title: t("zones.columns.sortOrder"), key: "sort_order", render: row => formatNumber(row.sort_order) }
	]
}

/**
 * `branch_id`/`building_id` are `number | null`, not `number`: `null` is the
 * "nothing selected yet" sentinel for these two virtual ancestor-narrowing
 * selects, consistent with `ZonePayload.floor_id` (see zone.ts) and with
 * `ResourceFormDrawer`'s own cascade-clearing logic, which assigns `null`
 * (never `0`) when it invalidates a dependent field's value.
 *
 * `ZoneFormModel extends ZonePayload` here (interface inheritance, not an
 * intersection type) — since `ZonePayload` already `extends Record<string,
 * unknown>`, `ZoneFormModel` automatically satisfies that same generic
 * constraint too, with no explicit `extends Record<string, unknown>` clause
 * of its own needed (see the doc comment on `ZonePayload` in zone.ts).
 */
interface ZoneFormModel extends ZonePayload {
	branch_id: number | null
	building_id: number | null
}

export function buildZoneFields(branches: Branch[], locale: SupportedLocale): FieldDescriptor<ZoneFormModel>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		{ key: "branch_id", labelKey: "zones.form.branch", type: "select", options: branchOptions, virtual: true },
		{
			key: "building_id",
			labelKey: "zones.form.building",
			type: "select",
			dependsOn: "branch_id",
			virtual: true,
			optionsFrom: async ({ branch_id }) => {
				if (!branch_id) return []
				const buildings = await listBuildings(branch_id as number)
				return buildings.map(building => ({ label: pickLocalized(building.name, locale), value: building.id }))
			}
		},
		{
			key: "floor_id",
			labelKey: "zones.form.floor",
			type: "select",
			required: true,
			dependsOn: "building_id",
			optionsFrom: async ({ building_id }) => {
				if (!building_id) return []
				const floors = await listFloors(building_id as number)
				return floors.map(floor => ({ label: floor.label, value: floor.id }))
			}
		},
		{ key: "label", labelKey: "zones.form.label", type: "text", required: true },
		{ key: "sort_order", labelKey: "zones.form.sortOrder", type: "number", required: true }
	]
}

export function emptyZonePayload(): ZoneFormModel {
	return { branch_id: null, building_id: null, floor_id: null, label: "", sort_order: 0 }
}
