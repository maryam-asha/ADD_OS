// src/add-os/modules/booking/config/active-sessions.config.ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { RowAction } from "@/add-os/components/page/row-actions"
import type { ActiveSession } from "@/add-os/modules/booking/types/reception"
import { NTag } from "naive-ui"
import { h } from "vue"
import RowActions from "@/add-os/components/page/RowActions.vue"
import { formatDateTime } from "@/add-os/utils/format"
import { spaceTypeLabel } from "./space-type-label"

/**
 * A handler left out is an action this account may not take — its
 * `reception.*` permission is missing — and its button is not drawn.
 */
interface SessionHandlers {
	onCheckOut?: (row: ActiveSession) => void
	/** Opens the session's own page: its live timer, its bill so far. */
	onDetails: (row: ActiveSession) => void
	onExtend?: (row: ActiveSession) => void
	onCancel?: (row: ActiveSession) => void
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
		{ title: t("activeSessions.columns.occupant"), key: "user_name", minWidth: 150, align: "center" },
		{
			title: t("activeSessions.columns.space"),
			key: "space_type",
			minWidth: 140,
			align: "center",
			render: row => spaceTypeLabel(t, row.space_type)
		},
		{
			title: t("activeSessions.columns.type"),
			key: "type",
			minWidth: 160,
			align: "center",
			render: (row) => {
				const label = t(`activeSessions.type.${row.type}`)
				const tags = []
				// A walk-in says which seat it took: the one its subscription
				// holds, or a free one from the branch's co-working pool.
				if (row.type === "walkin" && row.seat_covered !== null) {
					const covered = row.seat_covered
					tags.push(h(
						NTag,
						{ size: "small", round: true, type: covered ? "info" : "default", title: t(covered ? "activeSessions.seat.coveredHint" : "activeSessions.seat.poolHint") },
						{ default: () => t(covered ? "activeSessions.seat.covered" : "activeSessions.seat.pool") }
					))
				}
				// How it began, when it was not the desk: the kiosk scan, or the
				// member opening the booked room's door.
				if (row.started_via && row.started_via !== "reception") {
					tags.push(h(
						NTag,
						{ size: "small", round: true, type: "default", title: t("activeSessions.startedVia.hint") },
						{ default: () => t(`activeSessions.startedVia.${row.started_via}`) }
					))
				}
				// A Dedicated Desk member's own desk, to send them to it.
				for (const code of row.desk_codes ?? []) {
					tags.push(h(
						NTag,
						{ size: "small", round: true, type: "success", title: t("activeSessions.seat.deskHint") },
						{ default: () => t("activeSessions.seat.desk", { code }) }
					))
				}
				if (tags.length === 0) return label

				return h("div", { class: "flex flex-wrap items-center justify-center gap-2" }, [h("span", label), ...tags])
			}
		},
		{
			title: t("activeSessions.columns.checkedInAt"),
			key: "checked_in_at",
			minWidth: 150,
			align: "center",
			render: row => h("span", { class: "font-mono text-xs" }, formatDateTime(row.checked_in_at))
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
			width: 120,
			align: "center",
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
			minWidth: 360,
			align: "center",
			render: row => {
				const { onCheckOut, onExtend, onCancel } = handlers
				const actions: RowAction[] = [{ key: "details", label: t("activeSessions.details"), icon: "carbon:view", onClick: () => handlers.onDetails(row) }]
				if (onCheckOut) actions.push({ key: "checkOut", label: t("activeSessions.checkOut.button"), icon: "carbon:logout", primary: true, onClick: () => onCheckOut(row) })
				if (row.type === "booking" && onExtend) actions.push({ key: "extend", label: t("activeSessions.extend.button"), icon: "carbon:time", onClick: () => onExtend(row) })
				if (row.type === "booking" && onCancel) actions.push({ key: "cancel", label: t("activeSessions.cancel.button"), icon: "carbon:close-outline", danger: true, onClick: () => onCancel(row) })
				return h(RowActions, { actions, labelled: true })
			}
		}
	]
}
