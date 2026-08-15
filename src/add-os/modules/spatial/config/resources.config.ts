import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { SpaceResource, SpaceResourcePayload } from "@/add-os/modules/spatial/types/resource"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { buildOperationalStatusOptions, renderOperationalStatusTag } from "@/add-os/modules/spatial/types/operational-status"
import { listBuildings } from "@/add-os/services/buildings"
import { listFloors } from "@/add-os/services/floors"
import { listSpaces } from "@/add-os/services/spaces"
import { listZones } from "@/add-os/services/zones"
import { formatNumber } from "@/add-os/utils/format"

export function buildResourceColumns(t: ComposerTranslation): DataTableColumns<SpaceResource> {
	return [
		{ title: t("resources.columns.space"), key: "space_id", render: row => `#${row.space_id}` },
		{ title: t("resources.columns.name"), key: "name" },
		{ title: t("resources.columns.category"), key: "category" },
		{ title: t("resources.columns.quantity"), key: "quantity", render: row => formatNumber(row.quantity) },
		{ title: t("resources.columns.status"), key: "status", render: row => renderOperationalStatusTag(row.status, t) }
	]
}

/**
 * `branch_id`/`building_id` are `number | null`, not `number`: `null` is the
 * "nothing selected yet" sentinel for these virtual ancestor-narrowing
 * selects, consistent with `SpaceResourcePayload.space_id` (see resource.ts)
 * and with `ResourceFormDrawer`'s own cascade-clearing logic, which assigns
 * `null` (never `0`) when it invalidates a dependent field's value.
 * `zone_id` is already `number | null` on `SpaceResourcePayload` — it's a
 * genuinely optional ancestor, not a sentinel-fix candidate.
 *
 * `ResourceFormModel extends SpaceResourcePayload` here (interface
 * inheritance, not an intersection type) — since `SpaceResourcePayload`
 * already `extends Record<string, unknown>`, `ResourceFormModel`
 * automatically satisfies that same generic constraint too, with no explicit
 * `extends Record<string, unknown>` clause of its own needed (see the doc
 * comment on `SpaceResourcePayload` in resource.ts).
 */
interface ResourceFormModel extends SpaceResourcePayload {
	branch_id: number | null
	building_id: number | null
	zone_id: number | null
}

export function buildResourceFields(t: ComposerTranslation, branches: Branch[], locale: SupportedLocale): FieldDescriptor<ResourceFormModel>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		/**
		 * No `required: true` on either virtual ancestor field: both `branch_id`
		 * and `building_id` are `virtual: true` and stripped before submit.
		 * `space_id`'s own `optionsFrom` (`if (!building_id) return []`) already
		 * structurally forces the user through `building_id` (which itself
		 * requires `branch_id` to have options) before `space_id` can have any
		 * valid options — so `space_id`'s own `required: true` is what actually
		 * guarantees data quality. Making the virtual ancestor fields required
		 * too would block Edit whenever an ancestor is deliberately left unset
		 * (see `openEdit` below) — the same problem Tasks 11/12 already fixed
		 * for their own virtual ancestor field(s).
		 */
		{ key: "branch_id", labelKey: "resources.form.branch", type: "select", options: branchOptions, virtual: true },
		{
			key: "building_id",
			labelKey: "resources.form.building",
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
			key: "zone_id",
			labelKey: "resources.form.zone",
			type: "select",
			dependsOn: "building_id",
			virtual: true,
			optionsFrom: async ({ building_id }) => {
				if (!building_id) return []
				const floors = await listFloors(building_id as number)
				const zonesByFloor = await Promise.all(floors.map(floor => listZones(floor.id)))
				return zonesByFloor.flat().map(zone => ({ label: zone.label, value: zone.id }))
			}
		},
		{
			key: "space_id",
			labelKey: "resources.form.space",
			type: "select",
			required: true,
			dependsOn: ["building_id", "zone_id"],
			optionsFrom: async ({ building_id, zone_id }) => {
				if (!building_id) return []
				const spaces = await listSpaces({ building_id: building_id as number, zone_id: (zone_id as number) || undefined })
				return spaces.map(space => ({ label: `${t(`spaces.spaceType.${space.space_type}`)} #${space.id}`, value: space.id }))
			}
		},
		{ key: "name", labelKey: "resources.form.name", type: "text", required: true },
		{ key: "category", labelKey: "resources.form.category", type: "text", required: true },
		{ key: "quantity", labelKey: "resources.form.quantity", type: "number", required: true }
	]
}

export function emptyResourcePayload(): ResourceFormModel {
	return { branch_id: null, building_id: null, zone_id: null, space_id: null, name: "", category: "", quantity: 1 }
}

export function buildResourceStatusFields(t: ComposerTranslation): FieldDescriptor<{ status: string; status_reason: string }>[] {
	return [
		{ key: "status", labelKey: "resources.changeStatus.statusLabel", type: "select", required: true, options: buildOperationalStatusOptions(t) },
		{ key: "status_reason", labelKey: "resources.changeStatus.reasonLabel", type: "text" }
	]
}
