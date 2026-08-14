import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Building, BuildingPayload } from "@/add-os/modules/spatial/types/building"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { formatNumber } from "@/add-os/utils/format"

export function buildBuildingColumns(
	t: ComposerTranslation,
	locale: SupportedLocale,
	branchesById: Record<number, Branch>
): DataTableColumns<Building> {
	return [
		{
			title: t("buildings.columns.branch"),
			key: "branch_id",
			render: row => (branchesById[row.branch_id] ? pickLocalized(branchesById[row.branch_id].name, locale) : row.branch_id)
		},
		{ title: t("buildings.columns.name"), key: "name", render: row => pickLocalized(row.name, locale) },
		{ title: t("buildings.columns.floorCount"), key: "floor_count", render: row => formatNumber(row.floor_count) }
	]
}

export function buildBuildingFields(branches: Branch[], locale: SupportedLocale): FieldDescriptor<BuildingPayload>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		{ key: "branch_id", labelKey: "buildings.form.branch", type: "select", required: true, options: branchOptions },
		{ key: "name", labelKey: "buildings.form.name", type: "bilingual-text", required: true },
		{ key: "floor_count", labelKey: "buildings.form.floorCount", type: "number", required: true }
	]
}

export function emptyBuildingPayload(): BuildingPayload {
	return { branch_id: 0, name: { ar: "", en: "" }, floor_count: 1 }
}
