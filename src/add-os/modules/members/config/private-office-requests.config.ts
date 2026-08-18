// src/add-os/modules/members/config/private-office-requests.config.ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { PrivateOfficeRequest, PrivateOfficeRequestPayload } from "@/add-os/modules/members/types/private-office-request"
import { NButton, NTag, NTooltip } from "naive-ui"
import { h } from "vue"
import Icon from "@/components/common/Icon.vue"

const STATUS_TAG_TYPE: Record<PrivateOfficeRequest["status"], "info" | "warning" | "success"> = {
	requested: "info",
	quoted: "warning",
	contracted: "success"
}

export function buildRequestColumns(
	t: ComposerTranslation,
	onQuote: (row: PrivateOfficeRequest) => void,
	onDelete: (row: PrivateOfficeRequest) => void
): DataTableColumns<PrivateOfficeRequest> {
	return [
		{ title: t("privateOfficeRequests.columns.prospectName"), key: "prospect_name" },
		{ title: t("privateOfficeRequests.columns.contact"), key: "contact" },
		{
			title: t("privateOfficeRequests.columns.status"),
			key: "status",
			render: row =>
				h(NTag, { type: STATUS_TAG_TYPE[row.status], round: true, bordered: true }, { default: () => t(`privateOfficeRequests.status.${row.status}`) })
		},
		{ title: t("privateOfficeRequests.columns.quoteRef"), key: "quote_ref", render: row => row.quote_ref ?? "—" },
		{
			title: t("privateOfficeRequests.columns.actions"),
			key: "actions",
			render: row => {
				const buttons = []

				if (row.status === "requested") {
					const label = t("privateOfficeRequests.markAsQuoted.button")
					buttons.push(
						h(
							NButton,
							{ text: true, type: "primary", "aria-label": label, title: label, onClick: () => onQuote(row) },
							{ icon: () => h(Icon, { name: "carbon:currency", size: 18 }) }
						)
					)
				}

				if (row.status === "contracted") {
					// Prevented in the UI with an explanation, not silently omitted.
					buttons.push(
						h(
							NTooltip,
							{},
							{
								trigger: () => h(NButton, { text: true, disabled: true }, { icon: () => h(Icon, { name: "carbon:locked", size: 18 }) }),
								default: () => t("privateOfficeRequests.contractedLocked")
							}
						)
					)
				}

				const deleteLabel = t("resourceCrud.table.deleteAction")
				buttons.push(
					h(
						NButton,
						{ text: true, type: "error", "aria-label": deleteLabel, title: deleteLabel, onClick: () => onDelete(row) },
						{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
					)
				)

				return h("div", { class: "flex gap-2" }, buttons)
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
