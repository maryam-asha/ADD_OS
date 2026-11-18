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
	/** Records a guest of this row's member — a coworking session of their own only. */
	onAddGuest?: (row: ActiveSession) => void
}

/**
 * A guest may be recorded on a member's own coworking session: never a room's
 * or an office's (their guests are the booking's), and never a guest's
 * session billed to its host — the host has their own row for that.
 */
export function canHostGuests(row: ActiveSession): boolean {
	return row.space_type === "co_space" && !row.guest
}

/**
 * Extend is rendered for `booking` rows only, and that is a capability
 * boundary rather than a styling choice: the API snapshot pinned 2026-08-25
 * has no walk-in `extend` endpoint at all. Showing it greyed out for a
 * walk-in would imply a permission problem; showing it enabled would offer a
 * 404. It is absent because the action does not exist for that row.
 *
 * Cancel is not a row action here at all (removed 2026-11-18). It used to be
 * offered on every booking row, but every row on this board is checked in,
 * and the API refuses to cancel a checked-in booking (ADDCore
 * `BookingCancellationService::canCancel` → `already_checked_in`, 409). The
 * button could only ever fail. A booking that has not started yet is cancelled
 * from All Bookings, which shows the button only when the booking can be
 * cancelled. What was given up: nothing that worked — a checked-in booking is
 * ended by check-out.
 *
 * Settle-payment is deliberately not a row action anywhere here — the API
 * refuses to settle a session that has not been checked out, and every row on
 * this board is by definition still checked in. It lives inside the check-out
 * dialog instead, which is the moment it becomes legal.
 */
export function buildSessionColumns(t: ComposerTranslation, handlers: SessionHandlers): DataTableColumns<ActiveSession> {
	return [
		{
			title: t("activeSessions.columns.occupant"),
			key: "user_name",
			minWidth: 150,
			align: "center",
			// A guest's session billed to the host: the guest is in the seat,
			// the host (`user_name`) pays.
			render: row => row.guest
				? h("div", { class: "flex flex-col items-center gap-1" }, [
						h("span", row.guest.name),
						h(NTag, { size: "small", round: true, type: "warning", title: t("activeSessions.guest.hint") }, { default: () => t("activeSessions.guest.of", { host: row.user_name }) })
					])
				: row.user_name
		},
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
				const { onCheckOut, onExtend, onAddGuest } = handlers
				const actions: RowAction[] = [{ key: "details", label: t("activeSessions.details"), icon: "carbon:view", onClick: () => handlers.onDetails(row) }]
				if (onCheckOut) actions.push({ key: "checkOut", label: t("activeSessions.checkOut.button"), icon: "carbon:logout", primary: true, onClick: () => onCheckOut(row) })
				if (onAddGuest && canHostGuests(row)) actions.push({ key: "addGuest", label: t("activeSessions.guest.add"), icon: "carbon:user-follow", onClick: () => onAddGuest(row) })
				if (row.type === "booking" && onExtend) actions.push({ key: "extend", label: t("activeSessions.extend.button"), icon: "carbon:time", onClick: () => onExtend(row) })
				// One line, never a lone button wrapped under the rest: the
				// column's width fits every action a row can carry.
				return h(RowActions, { actions, labelled: true, class: "flex-nowrap!" })
			}
		}
	]
}
