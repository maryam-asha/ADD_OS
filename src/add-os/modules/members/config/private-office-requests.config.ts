// src/add-os/modules/members/config/private-office-requests.config.ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { RowAction } from "@/add-os/components/page/row-actions"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { PrivateOfficeRequest, PrivateOfficeRequestPayload } from "@/add-os/modules/members/types/private-office-request"
import { NTag, NTooltip } from "naive-ui"
import { h } from "vue"
import RowActions from "@/add-os/components/page/RowActions.vue"

const STATUS_TAG_TYPE: Record<PrivateOfficeRequest["status"], "info" | "warning" | "success"> = {
	requested: "info",
	quoted: "warning",
	contracted: "success"
}

export function buildRequestColumns(
	t: ComposerTranslation,
	onQuote: (row: PrivateOfficeRequest) => void,
	onDelete: (row: PrivateOfficeRequest) => void,
	onCreateLease?: (row: PrivateOfficeRequest) => void,
	canCreateLease?: () => boolean
): DataTableColumns<PrivateOfficeRequest> {
	return [
		{ title: t("privateOfficeRequests.columns.prospectName"), key: "prospect_name", minWidth: 150, align: "center" },
		{ title: t("privateOfficeRequests.columns.company", "Company"), key: "company", minWidth: 150, align: "center", render: row => row.company?.legal_name || "—" },
		{ title: t("privateOfficeRequests.columns.contact"), key: "contact", minWidth: 140, align: "center" },
		{ title: t("privateOfficeRequests.columns.provider", "Provider"), key: "provider", minWidth: 150, align: "center", render: row => row.provider?.name || "—" },
		{
			title: t("privateOfficeRequests.columns.status"),
			key: "status",
			width: 120,
			align: "center",
			render: row =>
				h(NTag, { type: STATUS_TAG_TYPE[row.status], round: true, bordered: true }, { default: () => t(`privateOfficeRequests.status.${row.status}`) })
		},
		{ title: t("privateOfficeRequests.columns.quoteRef"), key: "quote_ref", minWidth: 130, align: "center", render: row => (row.quote_ref ? h("span", { class: "font-mono text-xs" }, row.quote_ref) : "—") },
		{
			title: t("privateOfficeRequests.columns.actions"),
			key: "actions",
			width: 150,
			align: "center",
			render: row => {
				const actions: RowAction[] = []
				if (row.status === "requested") actions.push({ key: "quote", label: t("privateOfficeRequests.markAsQuoted.button"), icon: "carbon:currency", onClick: () => onQuote(row) })
				if (row.status === "quoted" && (row.company_id || row.company) && onCreateLease && (!canCreateLease || canCreateLease())) {
					actions.push({ key: "lease", label: t("privateOfficeRequests.createLease.button"), icon: "carbon:document-add", onClick: () => onCreateLease(row) })
				}
				// Prevented in the UI with an explanation, not silently omitted.
				if (row.status === "contracted") actions.push({ key: "locked", label: t("privateOfficeRequests.contractedLocked"), icon: "carbon:locked", disabled: true, onClick: () => {} })
				actions.push({ key: "delete", label: t("resourceCrud.table.deleteAction"), icon: "carbon:trash-can", danger: true, onClick: () => onDelete(row) })

				const row_ = h(RowActions, { actions })
				// A quoted request for a new company becomes a company (and its lease) from the Companies page.
				if (row.status === "quoted" && !row.company_id && !row.company) {
					return h("div", { class: "inline-flex items-center justify-center gap-2" }, [
						h(NTooltip, {}, { trigger: () => h(NTag, { size: "small", round: true, type: "info" }, { default: () => t("privateOfficeRequests.nextStepNewCompany") }), default: () => t("privateOfficeRequests.nextStepNewCompanyHint") }),
						row_
					])
				}
				return row_
			}
		}
	]
}

export const requestFields: FieldDescriptor<PrivateOfficeRequestPayload>[] = [
	{ key: "prospect_name", labelKey: "privateOfficeRequests.form.prospectName", type: "text", required: true },
	{ key: "contact", labelKey: "privateOfficeRequests.form.contact", type: "text", required: true }
]

export function emptyRequestPayload(): PrivateOfficeRequestPayload {
	return { prospect_name: "", contact: "" }
}
