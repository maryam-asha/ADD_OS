// src/add-os/modules/booking/config/active-sessions.config.ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { ActiveSession } from "@/add-os/modules/booking/types/reception"
import { NButton, NTag } from "naive-ui"
import { h } from "vue"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"
import { spaceTypeLabel } from "./space-type-label"

interface SessionHandlers {
	onCheckOut: (row: ActiveSession) => void
	onExtend: (row: ActiveSession) => void
	onCancel: (row: ActiveSession) => void
}

/**
 * Extend and cancel are rendered for `booking` rows only, and that is a
 * capability boundary rather than a styling choice: the API snapshot pinned
 * 2026-08-25 has no walk-in `extend` and no walk-in `cancel` endpoint at all.
 * Showing them greyed out for a walk-in would imply a permission problem;
 * showing them enabled would offer a 404. They are absent because the action
 * does not exist for that row.
 *
 * Settle-payment is deliberately not a row action anywhere here — the API
 * refuses to settle a session that has not been checked out, and every row on
 * this board is by definition still checked in. It lives inside the check-out
 * dialog instead, which is the moment it becomes legal.
 */
export function buildSessionColumns(t: ComposerTranslation, handlers: SessionHandlers): DataTableColumns<ActiveSession> {
	return [
		{ title: t("activeSessions.columns.occupant"), key: "user_name" },
		{
			title: t("activeSessions.columns.space"),
			key: "space_type",
			render: row => spaceTypeLabel(t, row.space_type)
		},
		{
			title: t("activeSessions.columns.type"),
			key: "type",
			render: row => t(`activeSessions.type.${row.type}`)
		},
		{
			title: t("activeSessions.columns.checkedInAt"),
			key: "checked_in_at",
			render: row => formatDateTime(row.checked_in_at)
		},
		{
			/**
			 * `is_overdue` is the backend's verdict, read straight through. It is
			 * never recomputed here: the rule is "past the branch's closing time",
			 * and this payload carries no branch, let alone its hours. A tag type
			 * carries the colour so the palette stays in the theme layer — this
			 * file names no colour of its own.
			 */
			title: t("activeSessions.columns.status"),
			key: "is_overdue",
			render: row =>
				h(
					NTag,
					{ type: row.is_overdue ? "error" : "success", round: true, bordered: true },
					{ default: () => t(row.is_overdue ? "activeSessions.overdue" : "activeSessions.onTime") }
				)
		},
		{
			title: t("activeSessions.columns.actions"),
			key: "actions",
			render: row => {
				const checkOutLabel = t("activeSessions.checkOut.button")
				const buttons = [
					h(
						NButton,
						{ size: "small", type: "primary", "aria-label": checkOutLabel, onClick: () => handlers.onCheckOut(row) },
						{ icon: () => h(Icon, { name: "carbon:logout", size: 16 }), default: () => checkOutLabel }
					)
				]

				if (row.type === "booking") {
					const extendLabel = t("activeSessions.extend.button")
					buttons.push(
						h(
							NButton,
							{ size: "small", quaternary: true, "aria-label": extendLabel, title: extendLabel, onClick: () => handlers.onExtend(row) },
							{ icon: () => h(Icon, { name: "carbon:time", size: 16 }) }
						)
					)

					const cancelLabel = t("activeSessions.cancel.button")
					buttons.push(
						h(
							NButton,
							{ size: "small", quaternary: true, type: "error", "aria-label": cancelLabel, title: cancelLabel, onClick: () => handlers.onCancel(row) },
							{ icon: () => h(Icon, { name: "carbon:close-outline", size: 16 }) }
						)
					)
				}

				return h("div", { class: "flex gap-2" }, buttons)
			}
		}
	]
}
