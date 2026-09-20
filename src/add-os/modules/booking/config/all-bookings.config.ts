// src/add-os/modules/booking/config/all-bookings.config.ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { AdminBooking, BookingStatus } from "@/add-os/modules/booking/types/calendar"
import { NTag } from "naive-ui"
import { h } from "vue"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { formatDate, formatTime } from "@/add-os/utils/format"

/**
 * Columns for the general bookings index.
 *
 * Built as a factory taking `t`, matching `approval-queue.config.ts`: columns
 * are created once per render with the live translator, so a language switch
 * re-renders headers without a reload.
 */

/**
 * Which Naive tag colour each status wears.
 *
 * `cancelled` and `rejected` are deliberately different: cancelled is the
 * member's own decision and unremarkable, while rejected is an operations
 * decision that someone may need to explain. Painting both grey would hide the
 * one worth noticing.
 */
const STATUS_TAG_TYPE: Readonly<Record<BookingStatus, "success" | "warning" | "default" | "error">> = {
	confirmed: "success",
	pending: "warning",
	cancelled: "default",
	rejected: "error"
}

/**
 * Renders a booking's window.
 *
 * The date and the times are separated because a table scanned vertically is
 * scanned by date first. `start_at`/`end_at` are ISO instants and go through
 * the shared formatters, which is also what keeps them in the viewer's locale
 * and calendar rather than the server's.
 */
function renderWhen(row: AdminBooking) {
	return h("div", { class: "flex flex-col" }, [
		h("span", formatDate(row.start_at)),
		h("span", { class: "text-xs" }, `${formatTime(row.start_at)} – ${formatTime(row.end_at)}`)
	])
}

export function buildAllBookingsColumns(t: ComposerTranslation): DataTableColumns<AdminBooking> {
	return [
		{
			title: t("allBookings.columns.member"),
			key: "member",
			render: row =>
				h("div", { class: "flex flex-col" }, [
					h("span", row.member.name ?? "—"),
					row.member.phone ? h("span", { class: "text-xs" }, row.member.phone) : null
				])
		},
		{
			title: t("allBookings.columns.space"),
			key: "space",
			render: (row) => {
				// A space can be named or unnamed; when unnamed, its type is the
				// established stand-in (see `space-type-label.ts`). Branch sits
				// underneath because one district can hold several.
				const title = row.space.title ?? (row.space.space_type ? spaceTypeLabel(t, row.space.space_type) : "—")
				return h("div", { class: "flex flex-col" }, [
					h("span", title),
					row.space.branch ? h("span", { class: "text-xs" }, row.space.branch) : null
				])
			}
		},
		{
			title: t("allBookings.columns.when"),
			key: "when",
			render: renderWhen
		},
		{
			title: t("allBookings.columns.status"),
			key: "status",
			// `status_label` is already translated by the server against the
			// request's `lang` header, so it is rendered rather than re-derived
			// from the enum — two translations of one value is one too many.
			render: row => h(NTag, { type: STATUS_TAG_TYPE[row.status] ?? "default", size: "small", bordered: false }, { default: () => row.status_label })
		},
		{
			title: t("allBookings.columns.payment"),
			key: "payment",
			render: (row) => {
				const state = t(`allBookings.paymentState.${row.payment_state}`)
				const source = row.payment_source ? t(`allBookings.paymentSource.${row.payment_source}`) : null
				return h("div", { class: "flex flex-col" }, [
					h("span", state),
					source ? h("span", { class: "text-xs" }, source) : null
				])
			}
		},
		{
			title: t("allBookings.columns.amount"),
			key: "amount",
			render: (row) => {
				// `amount_owed` is null until checkout — the server writes it at
				// settlement, not at creation. Saying so is more useful than a
				// dash, which reads as missing data on an upcoming booking.
				if (row.amount_owed === null) {
					return h("span", { class: "text-xs" }, t("allBookings.notSettled"))
				}
				return h("span", `${row.amount_owed} ${row.currency ?? ""}`.trim())
			}
		}
	]
}
