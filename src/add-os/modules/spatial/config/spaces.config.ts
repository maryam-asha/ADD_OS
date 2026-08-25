import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { Space, SpacePayload } from "@/add-os/modules/spatial/types/space"
import type { Zone } from "@/add-os/modules/spatial/types/zone"
import type { CurrencyCode } from "@/add-os/utils/format/currency"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { buildOperationalStatusOptions, renderOperationalStatusTag } from "@/add-os/modules/spatial/types/operational-status"
import { SPACE_TYPES } from "@/add-os/modules/spatial/types/space"
import { listBuildings } from "@/add-os/services/buildings"
import { listFloors } from "@/add-os/services/floors"
import { listZones } from "@/add-os/services/zones"
import { formatNumber } from "@/add-os/utils/format"

const CURRENCIES: CurrencyCode[] = ["SYP", "USD", "EUR"]

export function buildSpaceColumns(
	t: ComposerTranslation,
	locale: SupportedLocale,
	buildingsById: Record<number, Building>,
	zonesById: Record<number, Zone>
): DataTableColumns<Space> {
	return [
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
}

export function buildSpaceFields(t: ComposerTranslation, branches: Branch[], locale: SupportedLocale): FieldDescriptor<SpaceFormModel>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))
	const spaceTypeOptions: SelectOption[] = SPACE_TYPES.map(type => ({ label: t(`spaces.spaceType.${type}`), value: type }))
	const currencyOptions: SelectOption[] = CURRENCIES.map(code => ({ label: code, value: code }))

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
		{ key: "capacity", labelKey: "spaces.form.capacity", type: "number", required: true },
		{ key: "hourly_rate", labelKey: "spaces.form.hourlyRate", type: "number" },
		{ key: "pricing_currency", labelKey: "spaces.form.pricingCurrency", type: "select", options: currencyOptions }
	]
}

export function emptySpacePayload(): SpaceFormModel {
	return {
		branch_id: null,
		building_id: null,
		zone_id: null,
		space_type: "co_space",
		allocation_model: null,
		is_lockable: false,
		capacity: 1,
		hourly_rate: null,
		pricing_currency: null
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
