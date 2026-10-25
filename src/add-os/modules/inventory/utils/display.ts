import type { VNode } from "vue"
import type { AttributeDefinition, Bilingual, Category, CustodianDescription, PlaceDescription, PropertyValue } from "@/add-os/modules/inventory/types/inventory"
import { h } from "vue"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { formatCurrency, formatDate, formatNumber, isCurrencyCode } from "@/add-os/utils/format"

/** Shown where a value is missing: a mark, not a word, so it needs no translation. */
export const EMPTY = "—"

/** A bilingual value in the current language, falling back to the other one (English is optional on the backend). */
export function localized(value: Bilingual | null | undefined): string {
	if (!value) return ""
	const primary = currentLocale.value === "en" ? value.en : value.ar
	return primary || value.ar || value.en || ""
}

/**
 * A value that keeps its own direction inside a sentence of the other one
 * (Unicode FSI…PDI). Without it, an English floor name in an Arabic path, or
 * an Arabic item name after a Latin code, joins its neighbours' run and the
 * parts come out in the wrong order.
 */
export function isolate(value: string): string {
	return `\u2068${value}\u2069`
}

/** "Room 3 · Aleppo › Tower A › Floor 2" — the place, then where it sits; each part isolated. */
export function placeLabel(place: PlaceDescription | null | undefined): string {
	if (!place) return EMPTY
	const name = isolate(place.label ?? `#${place.id}`)
	return place.path.length ? `${name} · ${place.path.map(isolate).join(" › ")}` : name
}

export function custodianLabel(custodian: CustodianDescription | null | undefined): string {
	if (!custodian) return EMPTY
	return custodian.label ?? `#${custodian.id}`
}

/** A quantity the server sent as a plain string ("12", "1.5"), as it is. */
export function quantity(value: string | number | null | undefined): string {
	return value === null || value === undefined || value === "" ? EMPTY : formatNumber(value, { trimZeros: true })
}

/** An amount in its own currency, never converted; a code the dashboard does not know is printed beside the number. */
export function money(amount: string | number | null | undefined, currency: string | null | undefined): string {
	if (amount === null || amount === undefined || amount === "") return EMPTY
	if (currency && isCurrencyCode(currency)) return formatCurrency(amount, { currency })
	return currency ? `${formatNumber(amount, { trimZeros: true })} ${currency}` : formatNumber(amount, { trimZeros: true })
}

/**
 * "RAM: 16 GB · Touch screen: Yes" — an item's answers under their fields'
 * labels, in the fields' order. An answer whose field has since been
 * removed keeps its key, as it is still stored; while the fields are
 * unknown every answer shows that way.
 */
export function propertySummary(properties: Record<string, PropertyValue>, fields: AttributeDefinition[] | undefined, words: { yes: string; no: string }): string {
	const byKey = new Map((fields ?? []).map(field => [field.key, field]))
	const keys = Object.keys(properties).sort((a, b) => (byKey.get(a)?.order ?? Infinity) - (byKey.get(b)?.order ?? Infinity))
	const parts = keys.flatMap(key => {
		const value = properties[key]
		if (value === null || value === "") return []
		const field = byKey.get(key)
		const shown =
			typeof value === "boolean"
				? value
					? words.yes
					: words.no
				: field?.type === "number"
					? formatNumber(value, { trimZeros: true })
					: field?.type === "date"
						? formatDate(String(value))
						: String(value)
		const withUnit = field?.unit ? `${shown} ${field.unit}` : shown
		return [`${field ? localized(field.label) : key}: ${isolate(withUnit)}`]
	})
	return parts.join(" · ") || EMPTY
}

/**
 * Categories as "Parent › Child" in tree order, so a branch shows under
 * its root rather than wherever it was created.
 */
export function categoryPaths(categories: Category[]): { category: Category; path: string }[] {
	const children = new Map<number | null, Category[]>()
	for (const category of categories) children.set(category.parent_id, [...(children.get(category.parent_id) ?? []), category])
	const known = new Set(categories.map(c => c.id))
	const out: { category: Category; path: string }[] = []
	const walk = (parent: number | null, prefix: string) => {
		for (const category of children.get(parent) ?? []) {
			const path = prefix ? `${prefix} › ${isolate(localized(category.name))}` : isolate(localized(category.name))
			out.push({ category, path })
			walk(category.id, path)
		}
	}
	walk(null, "")
	// A category whose parent this list does not hold (filtered by kind) still shows, at the root.
	for (const parent of new Set(categories.map(c => c.parent_id))) {
		if (parent !== null && !known.has(parent)) walk(parent, "")
	}
	return out
}

/**
 * What a column holds decides its width, so every inventory table spends its
 * room the same way (live QA at 1440px, 2026-10-25). Naive keeps a `width`
 * column at that width and shares whatever the table has left between the
 * `minWidth` ones — so a column of short, same-length values (a code, a
 * status tag, a date, an amount) is fixed, and the columns that can use
 * room (a name, a place path, a person, a note) grow into it. Before, every
 * column took `minWidth` and the spare room went to all of them alike: a
 * ten-character code got 252px while the place beside it was cut at 240.
 * Naive shares that room equally, not by need, so a person — a name and a
 * code at most, often "—" — is fixed too, and cut with a tooltip.
 *
 * A place or a free text never wraps in this dashboard, so it is cut at its
 * column with the whole of it in a tooltip; a deep path otherwise stretched
 * its table until status and value left the screen.
 *
 * `end` columns — amounts and quantities — line up at the cell's end (the
 * left in Arabic) so the digits of a column stand under each other; the
 * class is styled in theme-overrides/_table-columns.scss, since Naive's own
 * `align` writes a physical `text-align` that RTL does not flip.
 */
export const COLUMN = {
	code: { width: 140 },
	status: { width: 130 },
	date: { width: 130 },
	dateTime: { width: 170 },
	money: { width: 150, className: "add-col-end" },
	quantity: { width: 130, className: "add-col-end" },
	count: { width: 100, className: "add-col-end" },
	flag: { width: 110 },
	actions: { width: 100 },
	person: { width: 200, ellipsis: { tooltip: true } },
	name: { minWidth: 220 },
	place: { minWidth: 280, ellipsis: { tooltip: true } },
	text: { minWidth: 180, ellipsis: { tooltip: true } }
} as const

/**
 * The width a table scrolls at: the sum of its columns' least widths, so a
 * narrow screen scrolls exactly when the columns no longer fit, rather than
 * at a number guessed per page that drifted from its columns.
 */
export function tableWidth(columns: readonly { width?: number | string; minWidth?: number | string }[]): number {
	return columns.reduce((sum, column) => sum + (Number(column.width ?? column.minWidth) || 0), 0)
}

/**
 * A name over a smaller line — its code, SKU or category — for a table
 * cell. The name is cut to the column with the whole of it on hover: next
 * to a fixed-width column, a long English name ran on into its neighbour.
 */
export function nameCell(name: string, sub: string, options: { code?: boolean } = {}): VNode {
	return h("div", { class: "flex min-w-0 flex-col gap-0.5" }, [
		h("span", { class: "truncate font-semibold", title: name }, name),
		options.code ? h("span", { class: "font-mono text-xs text-secondary", dir: "ltr" }, sub) : h("span", { class: "truncate text-xs text-secondary", title: sub }, sub)
	])
}
