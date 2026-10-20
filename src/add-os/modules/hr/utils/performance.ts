import type { CycleStatus, ReviewItem } from "@/add-os/modules/hr/types/performance"
import { CYCLE_STATUSES } from "@/add-os/modules/hr/types/performance"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatNumber } from "@/add-os/utils/format"

/** Where a cycle stands among its phases. */
export function phaseIndex(status: CycleStatus): number {
	return CYCLE_STATUSES.indexOf(status)
}

/** The phase a cycle moves to next; none once closed. */
export function nextPhase(status: CycleStatus): CycleStatus | null {
	return CYCLE_STATUSES[phaseIndex(status) + 1] ?? null
}

/** Goals' titles and weights may still change (CycleStatus::goalsOpen). */
export function goalsOpen(status: CycleStatus | null | undefined): boolean {
	return status === "draft" || status === "goal_setting"
}

/** A score on the cycle's scale, "3.75 / 5"; none reads as a dash. */
export function scoreLabel(score: string | number | null | undefined, scaleMax: number): string {
	if (score === null || score === undefined || score === "") return EMPTY
	return `${formatNumber(score, { fractionDigits: 2, trimZeros: true })} / ${formatNumber(scaleMax)}`
}

/** A competency's name is bilingual; a goal's is its title as written. */
export function itemName(item: Pick<ReviewItem, "name">): string {
	return typeof item.name === "string" ? item.name : translated(item.name)
}
