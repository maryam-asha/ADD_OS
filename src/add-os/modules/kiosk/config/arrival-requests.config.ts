// src/add-os/modules/kiosk/config/arrival-requests.config.ts
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { ArrivalRequest } from "@/add-os/modules/kiosk/types/arrival-request"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NButton, NTag } from "naive-ui"
import { h } from "vue"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { formatRelativeTime, formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/** The model behind the unmatched-confirm picker. One field, and it is required. */
export interface ConfirmSpaceForm extends Record<string, unknown> {
	space_id: number | null
}

export function emptyConfirmSpaceForm(): ConfirmSpaceForm {
	return { space_id: null }
}

/**
 * Options for the walk-in space picker.
 *
 * Labelled exactly the way `resources.config.ts` labels a space — type plus id —
 * because this codebase has no translatable Space *name* field to use instead.
 * Capacity is appended: an operator choosing where to seat a walk-in is making a
 * capacity decision, and it is the one extra fact the `Space` payload already
 * carries that helps them make it.
 */
export function buildSpaceOptions(t: ComposerTranslation, spaces: Space[]): SelectOption[] {
	return spaces.map(space => ({
		label: t("arrivalRequests.confirm.spaceOption", {
			space: `${spaceTypeLabel(t, space.space_type)} #${space.id}`,
			capacity: space.capacity
		}),
		value: space.id
	}))
}

/**
 * One required select, not the four-step branch→building→zone→space cascade
 * `resources.config.ts` uses.
 *
 * The backend agrees: `StoreWalkInSessionRequest` validates `space_id` as
 * `required|integer|exists:spaces,id` with no branch or building constraint, so
 * the cascade would enforce a narrowing the API never asks for — at the cost of
 * three extra interactions with a member standing at the desk.
 *
 * `required: true` here is what makes the confirm unreachable without a
 * selection: `ResourceFormDrawer` builds a rule from it whose emptiness check
 * catches `null` unconditionally, and `handleSubmit` returns early when
 * validation throws. There is deliberately no separate disabled-button state
 * duplicating that rule.
 *
 * Options are passed in statically rather than fetched through `optionsFrom`:
 * the drawer only registers an `optionsFrom` watcher for fields that ALSO
 * declare `dependsOn` (`if (keys.length === 0 || !field.optionsFrom) continue`),
 * so a dependency-free dynamic field would silently render an empty dropdown.
 */
export function buildConfirmSpaceFields(t: ComposerTranslation, spaces: Space[]): FieldDescriptor<ConfirmSpaceForm>[] {
	return [
		{
			key: "space_id",
			labelKey: "arrivalRequests.confirm.spaceLabel",
			type: "select",
			required: true,
			options: buildSpaceOptions(t, spaces)
		}
	]
}

/**
 * Renders the matched booking as a hint, or says plainly that there is none.
 *
 * An unmatched row is the ORDINARY walk-in case, so it gets an explicit tag
 * rather than an empty cell — a blank there reads as missing data and invites
 * the operator to wait for it to load.
 */
function renderMatch(t: ComposerTranslation, row: ArrivalRequest) {
	if (row.matched_booking === null) {
		return h(
			NTag,
			{ type: "warning", size: "small", bordered: false },
			{ default: () => t("arrivalRequests.noBooking") }
		)
	}

	const booking = row.matched_booking
	// Same-day by construction — the matcher only ever pairs today's bookings —
	// so the window is clock-only on both ends.
	return `${spaceTypeLabel(t, booking.space_type)} · ${formatTime(booking.start_at)} – ${formatTime(booking.end_at)}`
}

/**
 * `now` is passed in from a ticking ref rather than read from the clock here, so
 * the waiting column re-renders as time passes. A cell that formatted against
 * `Date.now()` at render time would freeze at whatever it said when the list
 * loaded — precisely backwards for the one column an operator reads to decide
 * who has been waiting longest.
 *
 * Both actions are labelled buttons, not icon-only ones, for the reason
 * `approval-queue.config.ts` records for its own pair: confirm and reject sit
 * adjacent on every row, and a pair of unlabelled glyphs is how an operator
 * working quickly rejects the person they meant to admit.
 */
export function buildArrivalRequestColumns(
	t: ComposerTranslation,
	now: number,
	onConfirm: (row: ArrivalRequest) => void,
	onReject: (row: ArrivalRequest) => void
): DataTableColumns<ArrivalRequest> {
	return [
		{ title: t("arrivalRequests.columns.member"), key: "user.name", render: row => row.user.name },
		{ title: t("arrivalRequests.columns.phone"), key: "user.phone", render: row => row.user.phone },
		{
			title: t("arrivalRequests.columns.waiting"),
			key: "requested_at",
			render: row => formatRelativeTime(row.requested_at, { now })
		},
		{
			title: t("arrivalRequests.columns.booking"),
			key: "matched_booking_id",
			render: row => renderMatch(t, row)
		},
		{
			title: t("arrivalRequests.columns.actions"),
			key: "actions",
			render: row =>
				h("div", { class: "flex gap-2" }, [
					h(
						NButton,
						{ size: "small", type: "primary", "aria-label": t("arrivalRequests.confirm.button"), onClick: () => onConfirm(row) },
						{ icon: () => h(Icon, { name: "carbon:checkmark", size: 16 }), default: () => t("arrivalRequests.confirm.button") }
					),
					h(
						NButton,
						{ size: "small", type: "error", ghost: true, "aria-label": t("arrivalRequests.reject.button"), onClick: () => onReject(row) },
						{ icon: () => h(Icon, { name: "carbon:close", size: 16 }), default: () => t("arrivalRequests.reject.button") }
					)
				])
		}
	]
}
