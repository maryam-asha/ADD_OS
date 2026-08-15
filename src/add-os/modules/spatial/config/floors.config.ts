import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building } from "@/add-os/modules/spatial/types/building"
import type { Floor, FloorPayload } from "@/add-os/modules/spatial/types/floor"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { listBuildings } from "@/add-os/services/buildings"
import { formatNumber } from "@/add-os/utils/format"

export function buildFloorColumns(
	t: ComposerTranslation,
	locale: SupportedLocale,
	buildingsById: Record<number, Building>
): DataTableColumns<Floor> {
	return [
		{
			title: t("floors.columns.building"),
			key: "building_id",
			render: row => (buildingsById[row.building_id] ? pickLocalized(buildingsById[row.building_id].name, locale) : row.building_id)
		},
		{ title: t("floors.columns.label"), key: "label" },
		{ title: t("floors.columns.sortOrder"), key: "sort_order", render: row => formatNumber(row.sort_order) }
	]
}

export function buildFloorFields(
	branches: Branch[],
	locale: SupportedLocale
): FieldDescriptor<FloorPayload & { branch_id: number | null }>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		{ key: "branch_id", labelKey: "floors.form.branch", type: "select", required: true, options: branchOptions, virtual: true },
		{
			key: "building_id",
			labelKey: "floors.form.building",
			type: "select",
			required: true,
			dependsOn: "branch_id",
			optionsFrom: async ({ branch_id }) => {
				if (!branch_id) return []
				const buildings = await listBuildings(branch_id as number)
				return buildings.map(building => ({ label: pickLocalized(building.name, locale), value: building.id }))
			}
		},
		{ key: "label", labelKey: "floors.form.label", type: "text", required: true },
		{ key: "sort_order", labelKey: "floors.form.sortOrder", type: "number", required: true }
	]
}

export function emptyFloorPayload(): FloorPayload & { branch_id: number | null } {
	return { branch_id: null, building_id: null, label: "", sort_order: 0 }
}
