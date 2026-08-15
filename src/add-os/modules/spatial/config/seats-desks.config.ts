import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { SeatDesk, SeatDeskPayload } from "@/add-os/modules/spatial/types/seat-desk"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { listBuildings } from "@/add-os/services/buildings"
import { listFloors } from "@/add-os/services/floors"
import { listSpaces } from "@/add-os/services/spaces"
import { listZones } from "@/add-os/services/zones"
import { formatNumber } from "@/add-os/utils/format"

export function buildSeatDeskColumns(t: ComposerTranslation): DataTableColumns<SeatDesk> {
	return [
		{ title: t("seatsDesks.columns.space"), key: "space_id", render: row => `#${row.space_id}` },
		{ title: t("seatsDesks.columns.label"), key: "label" },
		{
			title: t("seatsDesks.columns.qrPointId"),
			key: "qr_point_id",
			render: row => (row.qr_point_id !== null ? formatNumber(row.qr_point_id) : "—")
		}
	]
}

/**
 * `branch_id`/`building_id` are `number | null`, not `number`: `null` is the
 * "nothing selected yet" sentinel for these virtual ancestor-narrowing
 * selects, consistent with `SeatDeskPayload.space_id` (see seat-desk.ts) and
 * with `ResourceFormDrawer`'s own cascade-clearing logic, which assigns
 * `null` (never `0`) when it invalidates a dependent field's value. `zone_id`
 * is already `number | null` on `SeatDeskPayload`-adjacent form state — it's
 * a genuinely optional ancestor, not a sentinel-fix candidate.
 *
 * `SeatDeskFormModel extends SeatDeskPayload` here (interface inheritance,
 * not an intersection type) — since `SeatDeskPayload` already `extends
 * Record<string, unknown>`, `SeatDeskFormModel` automatically satisfies that
 * same generic constraint too, with no explicit `extends Record<string,
 * unknown>` clause of its own needed (see the doc comment on
 * `SeatDeskPayload` in seat-desk.ts).
 */
interface SeatDeskFormModel extends SeatDeskPayload {
	branch_id: number | null
	building_id: number | null
	zone_id: number | null
}

export function buildSeatDeskFields(t: ComposerTranslation, branches: Branch[], locale: SupportedLocale): FieldDescriptor<SeatDeskFormModel>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		/**
		 * No `required: true` on either virtual ancestor field: both
		 * `branch_id` and `building_id` are `virtual: true` and stripped before
		 * submit. `space_id`'s own `optionsFrom` (`if (!building_id) return []`)
		 * already structurally forces the user through `building_id` (which
		 * itself requires `branch_id` to have options) before `space_id` can
		 * have any valid options — so `space_id`'s own `required: true` is what
		 * actually guarantees data quality. Making the virtual ancestor fields
		 * required too would block Edit whenever an ancestor is deliberately
		 * left unset (see `openEdit` in SeatsDesksPage.vue) — the same problem
		 * Tasks 11-13 already fixed for their own virtual ancestor field(s).
		 */
		{ key: "branch_id", labelKey: "seatsDesks.form.branch", type: "select", options: branchOptions, virtual: true },
		{
			key: "building_id",
			labelKey: "seatsDesks.form.building",
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
			labelKey: "seatsDesks.form.zone",
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
			labelKey: "seatsDesks.form.space",
			type: "select",
			required: true,
			dependsOn: ["building_id", "zone_id"],
			optionsFrom: async ({ building_id, zone_id }) => {
				if (!building_id) return []
				const spaces = await listSpaces({ building_id: building_id as number, zone_id: (zone_id as number) || undefined })
				return spaces
					.filter(space => space.space_type === "co_space")
					.map(space => ({ label: `${t(`spaces.spaceType.${space.space_type}`)} #${space.id}`, value: space.id }))
			}
		},
		{ key: "label", labelKey: "seatsDesks.form.label", type: "text", required: true },
		{ key: "qr_point_id", labelKey: "seatsDesks.form.qrPointId", type: "number" }
	]
}

export function emptySeatDeskPayload(): SeatDeskFormModel {
	return { branch_id: null, building_id: null, zone_id: null, space_id: null, label: "", qr_point_id: null }
}
