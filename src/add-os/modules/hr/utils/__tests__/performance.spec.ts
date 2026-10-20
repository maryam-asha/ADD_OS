import { afterAll, beforeAll, describe, expect, it } from "vitest"
import ar from "@/add-os/lang/ar"
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { goalsOpen, itemName, nextPhase, phaseIndex, scoreLabel } from "../performance"

describe("performance helpers", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("walks the phases in order and stops after closing", () => {
		expect(phaseIndex("draft")).toBe(0)
		expect(nextPhase("self_review")).toBe("manager_review")
		expect(nextPhase("calibration")).toBe("closed")
		expect(nextPhase("closed")).toBeNull()
	})

	it("keeps goals open only in draft and goal setting", () => {
		expect(["draft", "goal_setting", "self_review", "closed"].map(s => goalsOpen(s as "draft"))).toEqual([true, true, false, false])
		expect(goalsOpen(null)).toBe(false)
	})

	it("shows a score on its scale, a dash when there is none", () => {
		expect(scoreLabel("3.75", 5)).toBe("3.75 / 5")
		expect(scoreLabel("4.00", 5)).toBe("4 / 5")
		expect(scoreLabel(null, 5)).toBe(EMPTY)
	})

	it("names a competency in the reader's language and a goal by its title", () => {
		expect(itemName({ name: { ar: "العمل الجماعي", en: "Teamwork" } })).toBe("Teamwork")
		expect(itemName({ name: "Raise occupancy" })).toBe("Raise occupancy")
	})

	it("is merged into both languages' bundles", () => {
		expect((ar as { hrPerformance?: { profile?: { tab?: string } } }).hrPerformance?.profile?.tab).toBe("الأداء")
		expect((en as { hrPerformance?: { profile?: { tab?: string } } }).hrPerformance?.profile?.tab).toBe("Performance")
	})
})
