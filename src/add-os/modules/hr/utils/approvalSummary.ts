import type { ComposerTranslation } from "vue-i18n"
import type { Translatable } from "@/add-os/modules/hr/types/hr"
import { KNOWN_REQUEST_TYPES } from "@/add-os/modules/hr/types/approvals"
import { money } from "@/add-os/modules/hr/utils/money"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/**
 * What an approver reads about a request: each type's handler in ADD Core
 * builds its own `subject` summary (LeaveApprovalHandler::summary() and the
 * seven others), so each type gets its own rows here. A type this file does
 * not know still shows, key by key, rather than nothing.
 */

export interface SummaryRow {
	label: string
	value: string
	/** Codes and numbers that read left to right in Arabic too. */
	ltr?: boolean
}

type Subject = Record<string, unknown>

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null)
const isTranslatable = (v: unknown): v is Translatable => typeof v === "object" && v !== null && "ar" in v
const text = (v: unknown): string => (isTranslatable(v) ? translated(v) : str(v)) || EMPTY
const date = (v: unknown): string => (str(v) ? formatDate(str(v) as string) : EMPTY)
const num = (v: unknown): string => (str(v) ? formatNumber(str(v) as string) : EMPTY)
const amount = (value: unknown, currency: unknown): string => (str(value) && str(currency) ? money(str(value) as string, str(currency) as string) : EMPTY)

export function requestTypeLabel(t: ComposerTranslation, type: string): string {
	return (KNOWN_REQUEST_TYPES as readonly string[]).includes(type) ? t(`hrApprovals.types.${type}`) : type
}

function period(from: unknown, to: unknown): string {
	if (!str(from)) return EMPTY
	return str(to) && to !== from ? `${date(from)} – ${date(to)}` : date(from)
}

function minutes(t: ComposerTranslation, v: unknown): string {
	const total = Number(v)
	if (!Number.isFinite(total)) return EMPTY
	return t("hrApprovals.summary.hoursMinutes", { h: formatNumber(Math.floor(total / 60)), m: formatNumber(total % 60) })
}

export function summaryRows(t: ComposerTranslation, type: string, subject: Subject | null): SummaryRow[] {
	if (!subject) return []
	const s = subject
	const L = (key: string) => t(`hrApprovals.summary.${key}`)

	switch (type) {
		case "leave": {
			const leaveType = s.leave_type as { name?: Translatable; unit?: string } | undefined
			const unit = leaveType?.unit === "hour" ? t("hrApprovals.summary.hours") : t("hrApprovals.summary.days")
			return [
				{ label: L("leaveType"), value: text(leaveType?.name) },
				{ label: L("period"), value: period(s.starts_on, s.ends_on) },
				...(str(s.half_day) ? [{ label: L("halfDay"), value: t(`hrApprovals.halfDay.${s.half_day}`) }] : []),
				{ label: L("amount"), value: `${num(s.amount)} ${unit}` },
				{ label: L("reason"), value: text(s.reason) },
				{ label: L("attachment"), value: s.has_attachment ? t("hr.common.yes") : t("hr.common.no") }
			]
		}
		case "loan":
			return [
				{ label: L("amount"), value: amount(s.amount, s.currency) },
				{ label: L("installments"), value: t("hrApprovals.summary.installmentsOf", { n: num(s.installments), amount: amount(s.installment_amount, s.currency) }) },
				{ label: L("firstMonth"), value: text(s.first_month), ltr: true },
				{ label: L("reason"), value: text(s.reason) }
			]
		case "offer": {
			const lines = Array.isArray(s.compensation) ? (s.compensation as { amount?: unknown; currency?: unknown }[]) : []
			return [
				{ label: L("candidate"), value: text(s.candidate) },
				{ label: L("opening"), value: text(s.opening) },
				{ label: L("startOn"), value: date(s.start_on) },
				{ label: L("expiresOn"), value: date(s.expires_on) },
				{ label: L("compensation"), value: lines.length ? lines.map(line => amount(line.amount, line.currency)).join("، ") : EMPTY },
				{ label: L("terms"), value: text(s.terms) }
			]
		}
		case "requisition":
			return [
				{ label: L("title"), value: text(s.title) },
				{ label: L("headcount"), value: num(s.headcount) },
				{ label: L("orgUnit"), value: text(s.org_unit) },
				{ label: L("reason"), value: str(s.reason) ? t(`hrApprovals.requisitionReason.${s.reason}`) : EMPTY },
				{
					label: L("budget"),
					value: str(s.budget_min) || str(s.budget_max) ? `${amount(s.budget_min, s.budget_currency)} – ${amount(s.budget_max, s.budget_currency)}` : EMPTY
				},
				{ label: L("justification"), value: text(s.justification) }
			]
		case "attendance_entry":
			return [
				{ label: L("workDate"), value: date(s.work_date) },
				{ label: L("checkIn"), value: text(s.check_in), ltr: true },
				{ label: L("checkOut"), value: text(s.check_out), ltr: true },
				{ label: L("note"), value: text(s.note) }
			]
		case "overtime":
			return [
				{ label: L("workDate"), value: date(s.work_date) },
				{ label: L("duration"), value: minutes(t, s.minutes) },
				{ label: L("overtimeKind"), value: str(s.kind) ? t(`hrApprovals.overtimeKind.${s.kind}`) : EMPTY },
				{ label: L("reason"), value: text(s.reason) }
			]
		case "timesheet":
			return [
				{ label: L("weekStart"), value: date(s.week_start) },
				{ label: L("totalHours"), value: num(s.total_hours) },
				{ label: L("attendanceHours"), value: num(s.attendance_hours) },
				{ label: L("differenceHours"), value: num(s.difference_hours) }
			]
		case "learning":
			return [
				{ label: L("title"), value: text(s.title) },
				{ label: L("provider"), value: text(s.provider) },
				{ label: L("startOn"), value: date(s.starts_on) },
				{ label: L("amount"), value: amount(s.amount, s.currency) },
				{ label: L("available"), value: amount(s.available, s.currency) },
				{ label: L("year"), value: text(s.year), ltr: true },
				{ label: L("justification"), value: text(s.justification) }
			]
		default:
			return Object.entries(s)
				.filter(([, v]) => v === null || typeof v !== "object" || isTranslatable(v))
				.map(([key, v]) => ({ label: key, value: text(v), ltr: true }))
	}
}

/** One line for a list: the summary's most telling row. */
export function summaryHeadline(t: ComposerTranslation, type: string, subject: Subject | null): string {
	const rows = summaryRows(t, type, subject)
	if (!rows.length) return EMPTY
	if (type === "leave") return `${rows[0].value} · ${rows[1].value}`
	return rows[0].value
}
