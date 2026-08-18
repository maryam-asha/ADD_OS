import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Company, CompanyPayload } from "@/add-os/modules/members/types/company"
import type { PrivateOfficeRequest } from "@/add-os/modules/members/types/private-office-request"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"

export function quotedRequestOptions(requests: PrivateOfficeRequest[]): SelectOption[] {
	return requests
		.filter(request => request.status === "quoted")
		.map(request => ({ label: `${request.prospect_name} (${request.quote_ref ?? ""})`, value: request.id }))
}

export function buildCompanyColumns(t: ComposerTranslation, branches: Branch[], locale: SupportedLocale): DataTableColumns<Company> {
	const branchName = (branchId: number) => {
		const branch = branches.find(b => b.id === branchId)
		return branch ? pickLocalized(branch.name, locale) : String(branchId)
	}

	return [
		{ title: t("companies.columns.legalName"), key: "legal_name" },
		{ title: t("companies.columns.contractRef"), key: "contract_ref" },
		{ title: t("companies.columns.branch"), key: "branch_id", render: row => branchName(row.branch_id) },
		{
			title: t("companies.columns.status"),
			key: "status",
			render: row => h(NTag, { type: row.status === "active" ? "success" : "error", round: true, bordered: true }, { default: () => t(`companies.status.${row.status}`) })
		}
	]
}

export function buildCompanyFields(
	t: ComposerTranslation,
	quotedRequests: PrivateOfficeRequest[],
	branches: Branch[],
	locale: SupportedLocale
): FieldDescriptor<CompanyPayload>[] {
	const branchOptions: SelectOption[] = branches.map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))

	return [
		{ key: "private_office_request_id", labelKey: "companies.form.privateOfficeRequest", type: "select", required: true, options: quotedRequestOptions(quotedRequests) },
		{ key: "branch_id", labelKey: "companies.form.branch", type: "select", required: true, options: branchOptions },
		{ key: "legal_name", labelKey: "companies.form.legalName", type: "text", required: true },
		{ key: "contract_ref", labelKey: "companies.form.contractRef", type: "text", required: true }
	]
}

export function emptyCompanyPayload(): CompanyPayload {
	return { private_office_request_id: null, branch_id: null, legal_name: "", contract_ref: "" }
}
