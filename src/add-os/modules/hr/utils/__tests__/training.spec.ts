import type { ComposerTranslation } from "vue-i18n"
import type { Enrollment, TrainingSession } from "@/add-os/modules/hr/types/training"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import ar from "@/add-os/lang/ar"
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { canCancelEnrollment, canCancelMine, courseCost, courseLabel, durationLabel, hasEnded, isExpired, isFull, seatsLabel, sessionPeriod, signedMoney } from "../training"

function session(overrides: Partial<TrainingSession> = {}): TrainingSession {
	return {
		id: 4,
		course: { id: 1, code: "barista-101", title: { ar: "أساسيات الباريستا", en: "Barista basics" }, delivery: "in_person" },
		starts_on: "2026-03-10",
		ends_on: "2026-03-11",
		location: null,
		trainer: null,
		capacity: 2,
		seats_taken: 1,
		self_enrollment: true,
		status: "scheduled",
		...overrides
	}
}

describe("training helpers", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("names a course by title and code, and a session by its days", () => {
		expect(courseLabel(session().course)).toBe("Barista basics · barista-101")
		expect(courseLabel(undefined)).toBe(EMPTY)
		expect(sessionPeriod(session())).toContain("–")
		expect(sessionPeriod(session({ ends_on: "2026-03-10" }))).not.toContain("–")
	})

	it("counts seats against the capacity, or alone without one", () => {
		expect(seatsLabel(session())).toBe("1 / 2")
		expect(seatsLabel(session({ capacity: null, seats_taken: 7 }))).toBe("7")
		expect(isFull(session())).toBe(false)
		expect(isFull(session({ seats_taken: 2 }))).toBe(true)
		expect(isFull(session({ capacity: null, seats_taken: 500 }))).toBe(false)
	})

	it("completes only from the last day, and lets an employee cancel only before the first", () => {
		expect(hasEnded(session(), "2026-03-10")).toBe(false)
		expect(hasEnded(session(), "2026-03-11")).toBe(true)

		const mine: Enrollment = { id: 30, session: session(), status: "enrolled", completed_on: null, score: null }
		expect(canCancelMine(mine, "2026-03-09")).toBe(true)
		expect(canCancelMine(mine, "2026-03-10")).toBe(false)
		expect(canCancelMine({ ...mine, status: "cancelled" }, "2026-03-01")).toBe(false)
		expect(canCancelMine({ ...mine, session: session({ status: "cancelled" }) }, "2026-03-01")).toBe(false)

		expect(canCancelEnrollment(mine, session())).toBe(true)
		expect(canCancelEnrollment(mine, session({ status: "completed" }))).toBe(false)
	})

	it("calls a certification expired from the day after its expiry", () => {
		expect(isExpired({ expires_on: "2027-03-11" }, "2027-03-11")).toBe(false)
		expect(isExpired({ expires_on: "2027-03-11" }, "2027-03-12")).toBe(true)
		expect(isExpired({ expires_on: null }, "2099-01-01")).toBe(false)
	})

	it("signs ledger amounts and shows a course's cost and length", () => {
		expect(signedMoney("-100", "USD")).toMatch(/^−/)
		expect(signedMoney("300", "USD")).toMatch(/^\+/)
		expect(signedMoney("-100", "USD")).toContain("100")
		expect(courseCost({ cost: null, currency: null })).toBe(EMPTY)
		const t = ((key: string, values: { n: string }) => `${key}:${values.n}`) as unknown as ComposerTranslation
		expect(durationLabel(t, "12")).toBe("hrTraining.courses.hoursValue:12")
		expect(durationLabel(t, null)).toBe(EMPTY)
	})

	it("is merged into both languages' bundles", () => {
		expect((ar as { hrTraining?: { profile?: { tab?: string } } }).hrTraining?.profile?.tab).toBe("التدريب")
		expect((en as { hrTraining?: { profile?: { tab?: string } } }).hrTraining?.profile?.tab).toBe("Training")
	})
})
