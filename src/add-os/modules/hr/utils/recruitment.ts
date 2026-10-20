import type { PipelineStage, StageType } from "@/add-os/modules/hr/types/recruitment"
import { translated } from "@/add-os/modules/hr/utils/translated"

/** A stage's name by its code; a code no longer listed reads as written. */
export function stageName(stages: PipelineStage[], code: string | null | undefined): string {
	if (!code) return ""
	const stage = stages.find(s => s.code === code)
	return stage ? translated(stage.name) || code : code
}

/** What a stage code means; an unknown one is treated as open. */
export function stageType(stages: PipelineStage[], code: string): StageType {
	return stages.find(s => s.code === code)?.type ?? "open"
}

/** An application that rejection, withdrawal or hiring has ended. */
export function isEnded(stages: PipelineStage[], code: string): boolean {
	return ["hired", "rejected", "withdrawn"].includes(stageType(stages, code))
}

/** The stages an application may be moved to by hand: active open ones. */
export function movableStages(stages: PipelineStage[]): PipelineStage[] {
	return stages.filter(s => s.type === "open" && s.is_active)
}

/** The board's columns: every active open stage in order, then the fixed ones. */
export function boardColumns(stages: PipelineStage[]): PipelineStage[] {
	const fixedOrder: StageType[] = ["offer", "hired", "rejected", "withdrawn"]
	const open = stages.filter(s => s.type === "open" && s.is_active).sort((a, b) => a.sort - b.sort)
	const fixed = fixedOrder.flatMap(type => stages.filter(s => s.type === type))
	return [...open, ...fixed]
}

/**
 * `yyyy-MM-dd HH:mm` from a date and a time, as ScheduleInterviewRequest
 * takes it — the organisation's wall clock, never converted.
 */
export function interviewSlot(date: string, time: string): string {
	return `${date} ${time}`
}

/** The organisation-local date and time of an ISO instant, as written (LocalTime::iso). */
export function slotParts(iso: string): { date: string; time: string } {
	return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
}
