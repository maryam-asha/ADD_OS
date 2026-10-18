import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { Bilingual, FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { ContractType, DocumentType, JobGrade, WorkLocation } from "@/add-os/modules/hr/types/hr"
import { h } from "vue"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import { CONTRACT_TYPES } from "@/add-os/modules/hr/types/hr"
import { arabicRequiredRule } from "@/add-os/modules/hr/utils/forms"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatNumber } from "@/add-os/utils/format"

/**
 * The HR core's small settings resources, edited through ResourceTable +
 * ResourceFormDrawer. Field rules mirror ADD Core's Store*Request classes.
 */

function activeTag(active: boolean) {
	return h(ActiveTag, { active })
}

function code(value: string | null) {
	return value ? h("span", { class: "font-mono", dir: "ltr" }, value) : EMPTY
}

// ── Job grades ──────────────────────────────────────────────────────────────

export interface JobGradeForm extends Record<string, unknown> {
	name: Bilingual
	code: string
	rank: number | null
}

export function emptyJobGradeForm(): JobGradeForm {
	return { name: { ar: "", en: "" }, code: "", rank: null }
}

export function buildJobGradeColumns(t: ComposerTranslation): DataTableColumns<JobGrade> {
	return [
		{ title: t("hr.org.code"), key: "code", minWidth: 100, render: row => code(row.code) },
		{ title: t("hr.grades.name"), key: "name", minWidth: 180, render: row => translated(row.name) },
		{ title: t("hr.grades.rank"), key: "rank", minWidth: 90, align: "center", render: row => formatNumber(row.rank) }
	]
}

export function buildJobGradeFields(t: ComposerTranslation): FieldDescriptor<JobGradeForm>[] {
	return [
		{ key: "name", labelKey: "hr.grades.name", type: "bilingual-text", rule: arabicRequiredRule(t, "hr.grades.name") },
		{ key: "code", labelKey: "hr.org.code", type: "text", required: true },
		{ key: "rank", labelKey: "hr.grades.rank", type: "number", required: true, integer: true, min: 0, hint: () => t("hr.grades.rankHint") }
	]
}

// ── Work locations ──────────────────────────────────────────────────────────

export interface WorkLocationForm extends Record<string, unknown> {
	name: Bilingual
	address: string
	is_active: boolean
}

export function emptyWorkLocationForm(): WorkLocationForm {
	return { name: { ar: "", en: "" }, address: "", is_active: true }
}

export function buildWorkLocationColumns(t: ComposerTranslation): DataTableColumns<WorkLocation> {
	return [
		{ title: t("hr.locations.name"), key: "name", minWidth: 180, render: row => translated(row.name) },
		{ title: t("hr.locations.address"), key: "address", minWidth: 220, render: row => row.address || EMPTY },
		{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => activeTag(row.is_active) }
	]
}

export function buildWorkLocationFields(t: ComposerTranslation): FieldDescriptor<WorkLocationForm>[] {
	return [
		{ key: "name", labelKey: "hr.locations.name", type: "bilingual-text", rule: arabicRequiredRule(t, "hr.locations.name") },
		{ key: "address", labelKey: "hr.locations.address", type: "text" },
		{ key: "is_active", labelKey: "hr.common.active", type: "switch" }
	]
}

// ── Document types ──────────────────────────────────────────────────────────

export interface DocumentTypeForm extends Record<string, unknown> {
	name: Bilingual
	code: string
	is_required: boolean
	contract_types: ContractType[]
	has_expiry: boolean
	is_active: boolean
}

export function emptyDocumentTypeForm(): DocumentTypeForm {
	return { name: { ar: "", en: "" }, code: "", is_required: false, contract_types: [], has_expiry: false, is_active: true }
}

export function buildDocumentTypeColumns(t: ComposerTranslation): DataTableColumns<DocumentType> {
	return [
		{ title: t("hr.org.code"), key: "code", minWidth: 120, render: row => code(row.code) },
		{ title: t("hr.documentTypes.name"), key: "name", minWidth: 180, render: row => translated(row.name) },
		{
			title: t("hr.documentTypes.required"),
			key: "is_required",
			minWidth: 200,
			render: row => {
				if (!row.is_required) return t("hr.documentTypes.optional")
				if (!row.contract_types) return t("hr.documentTypes.requiredAll")
				return row.contract_types.map(type => t(`hr.contractType.${type}`)).join("، ")
			}
		},
		{ title: t("hr.documentTypes.hasExpiry"), key: "has_expiry", minWidth: 110, render: row => (row.has_expiry ? t("hr.common.yes") : t("hr.common.no")) },
		{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => activeTag(row.is_active) }
	]
}

export function buildDocumentTypeFields(t: ComposerTranslation): FieldDescriptor<DocumentTypeForm>[] {
	return [
		{ key: "name", labelKey: "hr.documentTypes.name", type: "bilingual-text", rule: arabicRequiredRule(t, "hr.documentTypes.name") },
		{ key: "code", labelKey: "hr.org.code", type: "text", required: true },
		{ key: "is_required", labelKey: "hr.documentTypes.isRequired", type: "switch" },
		{
			key: "contract_types",
			labelKey: "hr.documentTypes.contractTypes",
			type: "switch-group",
			options: CONTRACT_TYPES.map(type => ({ label: t(`hr.contractType.${type}`), value: type })),
			hiddenWhen: model => !model.is_required
		},
		{ key: "has_expiry", labelKey: "hr.documentTypes.hasExpiry", type: "switch" },
		{ key: "is_active", labelKey: "hr.common.active", type: "switch" }
	]
}
