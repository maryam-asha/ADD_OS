import type { ComposerTranslation } from "vue-i18n"
import type { HeadcountMonth } from "@/add-os/modules/hr/types/reports"
import { NAV_SECTIONS, navRoutePath } from "@/add-os/navigation/sections"
import { formatNumber } from "@/add-os/utils/format"

/**
 * What the HR reports work out on the page: the month range the headcount
 * report takes (ADD Core refuses more than 36 months), the range's totals,
 * a turnover percentage, and the path a dashboard figure opens.
 */

/** ADD Core's ceiling: `to` no later than the end of the 36th month from `from`. */
export const MAX_HEADCOUNT_MONTHS = 36

/** `yyyy-MM` months to the first day of the first and the last day of the last. */
export function monthSpan(fromMonth: string, toMonth: string): { from: string; to: string } {
	const [ty, tm] = toMonth.split("-").map(Number)
	const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate()
	return { from: `${fromMonth}-01`, to: `${toMonth}-${String(lastDay).padStart(2, "0")}` }
}

/** Months from one `yyyy-MM` to another, both counted. */
export function monthsBetween(fromMonth: string, toMonth: string): number {
	const [fy, fm] = fromMonth.split("-").map(Number)
	const [ty, tm] = toMonth.split("-").map(Number)
	return (ty - fy) * 12 + (tm - fm) + 1
}

/** The `yyyy-MM` some months before a `yyyy-MM`. */
export function monthsBack(month: string, count: number): string {
	const [y, m] = month.split("-").map(Number)
	const moved = new Date(Date.UTC(y, m - 1 - count, 1))
	return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, "0")}`
}

/** Hires and leavers over the range, and its first and last headcount. */
export function headcountTotals(months: HeadcountMonth[]): { opening: number; closing: number; hires: number; leavers: number } {
	return {
		opening: months[0]?.opening ?? 0,
		closing: months.at(-1)?.closing ?? 0,
		hires: months.reduce((sum, m) => sum + m.hires, 0),
		leavers: months.reduce((sum, m) => sum + m.leavers, 0)
	}
}

/** "4.5%" from the server's decimal string. */
export function percentLabel(t: ComposerTranslation, value: string | number): string {
	return t("dashboard.percent", { value: formatNumber(Number(value), { fractionDigits: 1, trimZeros: true }) })
}

/** The path of a page by its section and page keys, `:id` filled — for a figure that opens a list. */
export function pagePath(sectionKey: string, pageKey: string, id?: number): string | undefined {
	const section = NAV_SECTIONS.find(s => s.key === sectionKey)
	const page = section?.pages.find(p => p.key === pageKey)
	if (!section || !page) return undefined
	const path = navRoutePath(section, page)
	return id === undefined ? path : path.replace(":id", String(id))
}
