import type { ComposerTranslation } from "vue-i18n"
import type { BenefitGrant, BenefitGrantStatus, BenefitKind } from "@/add-os/modules/hr/types/benefits"
import { money } from "@/add-os/modules/hr/utils/money"
import { periodLabel } from "@/add-os/modules/hr/utils/payroll"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { formatNumber } from "@/add-os/utils/format"

/** A benefit's worth: money in its currency, or so many units ("500 points"). */
export function benefitValue(t: ComposerTranslation, amount: string | null | undefined, currency: string | null | undefined, unit: string | null | undefined): string {
	if (amount === null || amount === undefined) return EMPTY
	if (currency) return money(amount, currency)
	const n = formatNumber(amount, { fractionDigits: 2, trimZeros: true })
	return unit === "points" ? t("hrBenefits.points", { n }, Number(amount)) : `${n} ${unit ?? ""}`.trim()
}

/** The period a grant covers, as the server writes it: "2026-10", "2026-Q4", "2026" or "once". */
export function grantPeriodLabel(t: ComposerTranslation, period: string): string {
	if (period === "once") return t("hrBenefits.frequency.one_time")
	const quarter = /^(\d{4})-Q([1-4])$/.exec(period)
	if (quarter) return t("hrBenefits.quarter", { q: quarter[2], year: quarter[1] })
	if (/^\d{4}-\d{2}$/.test(period)) return periodLabel(period)
	return period
}

/**
 * A failed grant can be tried again, and so can an in-kind one a run left
 * undelivered; a pending cash allowance waits for its payroll instead.
 */
export function canRetryGrant(grant: Pick<BenefitGrant, "status"> & { benefit?: { kind: BenefitKind } }): boolean {
	return grant.status === "failed" || (grant.status === "pending" && grant.benefit?.kind === "in_kind_credit")
}

/** Only what has not been delivered — pending or failed — can be called off. */
export function canCancelGrant(status: BenefitGrantStatus): boolean {
	return status === "pending" || status === "failed"
}
