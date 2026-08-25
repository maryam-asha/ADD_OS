// src/add-os/modules/booking/config/approval-queue.config.ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { PendingApprovalBooking } from "@/add-os/modules/booking/types/reception"
import { NButton } from "naive-ui"
import { h } from "vue"
import { formatDateTime, formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"
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
		{ title: t("approvalQueue.columns.requester"), key: "user_name" },
		{
			title: t("approvalQueue.columns.space"),
			key: "space_type",
			render: row => spaceTypeLabel(t, row.space_type)
		},
		{
			// Same-day bookings are the norm, so the end repeats only the clock.
			title: t("approvalQueue.columns.when"),
			key: "start_at",
			render: row => `${formatDateTime(row.start_at)} – ${formatTime(row.end_at)}`
		},
		{
			title: t("approvalQueue.columns.requested"),
			key: "created_at",
			render: row => formatDateTime(row.created_at)
		},
		{
			title: t("approvalQueue.columns.actions"),
			key: "actions",
			render: row =>
				h("div", { class: "flex gap-2" }, [
					h(
						NButton,
						{ size: "small", type: "primary", "aria-label": t("approvalQueue.approve.button"), onClick: () => onApprove(row) },
						{ icon: () => h(Icon, { name: "carbon:checkmark", size: 16 }), default: () => t("approvalQueue.approve.button") }
					),
					h(
						NButton,
						{ size: "small", type: "error", ghost: true, "aria-label": t("approvalQueue.reject.button"), onClick: () => onReject(row) },
						{ icon: () => h(Icon, { name: "carbon:close", size: 16 }), default: () => t("approvalQueue.reject.button") }
					)
				])
		}
	]
}
