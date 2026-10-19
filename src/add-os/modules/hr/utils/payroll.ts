import type { ComposerTranslation } from "vue-i18n"
import type { PayComponentKind, PayrollRun, PayrollRunStatus, PayslipLine } from "@/add-os/modules/hr/types/payroll"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { KNOWN_CALCULATORS } from "@/add-os/modules/hr/types/payroll"
import { MONTHS } from "@/add-os/utils/format"

/** The steps a run passes through, in order (PayrollRunStatus), with posting as the last mark. */
export const RUN_STEPS = ["open", "calculated", "reviewed", "approved", "paid", "posted"] as const
export type RunStepName = (typeof RUN_STEPS)[number]

/** Where a run stands on RUN_STEPS: posting is a mark (`posted_at`) on an approved or paid run, not a status. */
export function runStepIndex(run: Pick<PayrollRun, "status" | "posted_at">): number {
	return run.posted_at ? RUN_STEPS.length - 1 : RUN_STEPS.indexOf(run.status)
}

/** Approved and paid runs never change; a correction is an off-cycle run. */
export function isLocked(status: PayrollRunStatus): boolean {
	return status === "approved" || status === "paid"
}

/** "October 2026" / "تشرين الأول 2026" for a run's month. */
export function runPeriod(run: Pick<PayrollRun, "year" | "month">): string {
	return `${MONTHS[currentLocale.value][run.month - 1]} ${run.year}`
}

/** A `yyyy-MM` period as the month and year in words. */
export function periodLabel(period: string | null | undefined): string {
	if (!period) return ""
	const [year, month] = period.split("-").map(Number)
	return Number.isFinite(year) && month >= 1 && month <= 12 ? runPeriod({ year, month }) : period
}

export function isKnownCalculator(key: string): boolean {
	return (KNOWN_CALCULATORS as readonly string[]).includes(key)
}

/** A calculator's name; one the server added on its own reads by its key. */
export function calculatorLabel(t: ComposerTranslation, key: string): string {
	return isKnownCalculator(key) ? t(`hrPayroll.calculators.${key}.name`) : key
}

/**
 * A payslip warning in words. The server writes them as `kind` or
 * `kind:detail` (`no_rate_in_force:SOCIAL`); one not known here is shown as
 * written rather than hidden.
 */
export function warningLabel(t: ComposerTranslation, warning: string): string {
	const [kind, detail] = warning.split(":", 2)
	if (kind === "negative_net") return t("hrPayroll.warnings.negativeNet")
	if (kind === "no_rate_in_force") return t("hrPayroll.warnings.noRate", { code: detail ?? "" })
	return warning
}

/** Slip lines by kind, in the order a slip reads: what is paid, what is withheld, then the employer's cost and benefits in kind. */
export function linesByKind(lines: PayslipLine[]): { kind: PayComponentKind; lines: PayslipLine[] }[] {
	const order: PayComponentKind[] = ["earning", "deduction", "employer_contribution", "in_kind"]
	return order.map(kind => ({ kind, lines: lines.filter(line => line.kind === kind) })).filter(group => group.lines.length)
}
