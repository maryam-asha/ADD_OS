import type { PipelineStage } from "@/add-os/modules/hr/types/recruitment"
import { describe, expect, it } from "vitest"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { boardColumns, interviewSlot, isEnded, movableStages, slotParts, stageName, stageType } from "../recruitment"

const stage = (id: number, code: string, type: PipelineStage["type"], sort: number, is_active = true): PipelineStage => ({ id, code, name: { ar: code, en: code }, type, sort, is_active })

const STAGES = [
	stage(1, "applied", "open", 10),
	stage(2, "interview", "open", 30),
	stage(3, "screening", "open", 20),
	stage(4, "old", "open", 25, false),
	stage(5, "offer", "offer", 80),
	stage(6, "hired", "hired", 90),
	stage(7, "rejected", "rejected", 95),
	stage(8, "withdrawn", "withdrawn", 99)
]

describe("recruitment helpers", () => {
	it("orders the board by the open stages' sort, then the fixed stages, leaving inactive ones out", () => {
		expect(boardColumns(STAGES).map(s => s.code)).toEqual(["applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn"])
	})

	it("moves by hand only to active open stages", () => {
		expect(movableStages(STAGES).map(s => s.code)).toEqual(["applied", "interview", "screening"])
	})

	it("reads a stage's kind and whether it ends the application", () => {
		expect(stageType(STAGES, "offer")).toBe("offer")
		expect(stageType(STAGES, "unknown")).toBe("open")
		expect(isEnded(STAGES, "hired")).toBe(true)
		expect(isEnded(STAGES, "offer")).toBe(false)
		expect(stageName(STAGES, "gone")).toBe("gone")
	})

	it("writes and reads interview slots on the organisation's clock, never converted", () => {
		expect(interviewSlot("2026-11-03", "10:30")).toBe("2026-11-03 10:30")
		expect(slotParts("2026-11-03T10:30:00+03:00")).toEqual({ date: "2026-11-03", time: "10:30" })
	})

	it("is merged into both languages' bundles", () => {
		expect((ar as { hrRecruitment?: { hire?: { title?: string } } }).hrRecruitment?.hire?.title).toBe("تعيين")
		expect((en as { hrRecruitment?: { hire?: { title?: string } } }).hrRecruitment?.hire?.title).toBe("Hire")
	})
})
