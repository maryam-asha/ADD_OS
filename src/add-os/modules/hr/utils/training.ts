import type { ComposerTranslation } from "vue-i18n"
import type { Certification, Course, Enrollment, TrainingSession } from "@/add-os/modules/hr/types/training"
import { money } from "@/add-os/modules/hr/utils/money"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/**
 * What the training screens say about a session, a seat, an enrollment and
 * a certification. Each rule here only decides whether a control shows;
 * ADD Core decides (TrainingService) and its refusal is shown as written.
 * "Today" is the browser's, where the server's is the organisation's — at
 * worst a button shows a day early and the server says why it cannot.
 */

/** "10 Mar 2026 – 11 Mar 2026", or the one day. */
export function sessionPeriod(session: Pick<TrainingSession, "starts_on" | "ends_on">): string {
	return session.starts_on === session.ends_on ? formatDate(session.starts_on) : `${formatDate(session.starts_on)} – ${formatDate(session.ends_on)}`
}

/** A course as the lists name it: its title, its code after. */
export function courseLabel(course: Pick<Course, "code" | "title"> | null | undefined): string {
	return course ? `${translated(course.title)} · ${course.code}` : EMPTY
}

/** "3 / 10" taken of the capacity, or "3" where there is no limit. */
export function seatsLabel(session: Pick<TrainingSession, "capacity" | "seats_taken">): string {
	const taken = formatNumber(session.seats_taken ?? 0)
	return session.capacity === null ? taken : `${taken} / ${formatNumber(session.capacity)}`
}

export function isFull(session: Pick<TrainingSession, "capacity" | "seats_taken">): boolean {
	return session.capacity !== null && (session.seats_taken ?? 0) >= session.capacity
}

/** Completing waits for the last day; before, the server refuses. */
export function hasEnded(session: Pick<TrainingSession, "ends_on">, today: string): boolean {
	return session.ends_on <= today
}

/** An employee cancels their own while enrolled in a scheduled session that has not started. */
export function canCancelMine(enrollment: Enrollment, today: string): boolean {
	const session = enrollment.session
	return enrollment.status === "enrolled" && !!session && session.status === "scheduled" && session.starts_on > today
}

/** HR cancels any enrollment still enrolled while its session is scheduled. */
export function canCancelEnrollment(enrollment: Pick<Enrollment, "status">, session: Pick<TrainingSession, "status">): boolean {
	return enrollment.status === "enrolled" && session.status === "scheduled"
}

/** A certification is expired once the day after its expiry has come; none, it never expires. */
export function isExpired(certification: Pick<Certification, "expires_on">, today: string): boolean {
	return certification.expires_on !== null && certification.expires_on < today
}

/** A ledger amount with its sign: allocations and additions "+", spending and cuts "−". */
export function signedMoney(amount: string, currency: string): string {
	const negative = amount.trim().startsWith("-")
	const magnitude = negative ? amount.trim().slice(1) : amount.trim()
	return `${negative ? "−" : "+"}${money(magnitude, currency)}`
}

/** A course's cost in its currency, or a dash. */
export function courseCost(course: Pick<Course, "cost" | "currency">): string {
	return course.cost && course.currency ? money(course.cost, course.currency) : EMPTY
}

/** "12 h" of a course, or a dash. */
export function durationLabel(t: ComposerTranslation, hours: string | null): string {
	return hours ? t("hrTraining.courses.hoursValue", { n: formatNumber(hours) }) : EMPTY
}
