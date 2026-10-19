import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { Bilingual, FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { CostCenter } from "@/add-os/modules/hr/types/timesheets"
import { h } from "vue"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import { arabicRequiredRule } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"

/**
 * Cost centers, edited through ResourceTable + ResourceFormDrawer. Rules
 * mirror StoreCostCenterRequest: a unique `alpha_dash` code of 32 at most
 * and a name. The optional link to a host record (`costable_type` /
 * `costable_id`) has no screen in ADD OS yet and is left as the server
 * keeps it.
 */

/** Laravel's `alpha_dash`, 32 at most: letters, digits, dashes and underscores. */
const CODE_PATTERN = /^[\p{L}\p{N}_-]{1,32}$/u

export interface CostCenterForm extends Record<string, unknown> {
	code: string
	name: Bilingual
	is_active: boolean
}

export function emptyCostCenterForm(): CostCenterForm {
	return { code: "", name: { ar: "", en: "" }, is_active: true }
}

export function buildCostCenterColumns(t: ComposerTranslation): DataTableColumns<CostCenter> {
	return [
		{ title: t("hr.org.code"), key: "code", minWidth: 110, render: row => h("span", { class: "font-mono", dir: "ltr" }, row.code) },
		{ title: t("hrTimesheets.centers.name"), key: "name", minWidth: 200, render: row => translated(row.name) },
		{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => h(ActiveTag, { active: row.is_active }) }
	]
}

export function buildCostCenterFields(t: ComposerTranslation): FieldDescriptor<CostCenterForm>[] {
	return [
		{ key: "name", labelKey: "hrTimesheets.centers.name", type: "bilingual-text", rule: arabicRequiredRule(t, "hrTimesheets.centers.name") },
		{
			key: "code",
			labelKey: "hr.org.code",
			type: "text",
			required: true,
			rule: {
				required: true,
				trigger: ["blur", "input"],
				validator: (_rule: unknown, value: string) => CODE_PATTERN.test((value ?? "").trim()),
				message: t("hrTimesheets.centers.codeRule")
			}
		},
		{ key: "is_active", labelKey: "hr.common.active", type: "switch" }
	]
}
