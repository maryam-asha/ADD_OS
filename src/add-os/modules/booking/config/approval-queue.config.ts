// src/add-os/modules/booking/config/approval-queue.config.ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { PendingApprovalBooking } from "@/add-os/modules/booking/types/reception"
import { h } from "vue"
import RowActions from "@/add-os/components/page/RowActions.vue"
import { formatDateTime, formatTime } from "@/add-os/utils/format"
import { spaceTypeLabel } from "./space-type-label"

/**
 * Both actions are labelled buttons rather than icon-only ones, unlike the
 * private-office table. Approve and reject are irreversible from this screen
 * and sit next to each other on every row; a pair of unlabelled glyphs is how
 * an operator working quickly rejects the booking they meant to approve.
 */
export function buildApprovalColumns(
	t: ComposerTranslation,
	onApprove: (row: PendingApprovalBooking) => void,
	onReject: (row: PendingApprovalBooking) => void
): DataTableColumns<PendingApprovalBooking> {
	return [
		{ title: t("approvalQueue.columns.requester"), key: "user_name", minWidth: 150, align: "center" },
		{
			title: t("approvalQueue.columns.space"),
			key: "space_type",
			minWidth: 140,
			align: "center",
			render: row => spaceTypeLabel(t, row.space_type)
		},
		{
			// Same-day bookings are the norm, so the end repeats only the clock.
			title: t("approvalQueue.columns.when"),
			key: "start_at",
			minWidth: 160,
			align: "center",
			render: row => h("span", { class: "font-mono text-xs" }, `${formatDateTime(row.start_at)} – ${formatTime(row.end_at)}`)
		},
		{
			title: t("approvalQueue.columns.requested"),
			key: "created_at",
			minWidth: 140,
			align: "center",
			render: row => h("span", { class: "font-mono text-xs" }, formatDateTime(row.created_at))
		},
		{
			title: t("approvalQueue.columns.actions"),
			key: "actions",
			width: 200,
			align: "center",
			render: row =>
				h(RowActions, {
					labelled: true,
					actions: [
						{ key: "approve", label: t("approvalQueue.approve.button"), icon: "carbon:checkmark", primary: true, onClick: () => onApprove(row) },
						{ key: "reject", label: t("approvalQueue.reject.button"), icon: "carbon:close", danger: true, onClick: () => onReject(row) }
					]
				})
		}
	]
}
