import type { VNode } from "vue"
import type { DataTableColumn } from "naive-ui"
import type { AttributeDefinition, Bilingual, Category, CustodianDescription, PlaceDescription, PropertyValue } from "@/add-os/modules/inventory/types/inventory"
import { NButton, NTooltip } from "naive-ui"
import { h } from "vue"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { formatCurrency, formatDate, formatNumber, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

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
 * A table column showing a place. Cells never wrap in this dashboard, so a
 * deep path ("Room 1 · District › Building › Ground Floor › Zone A - …")
 * stretched its table until the columns after it — status, value — left the
 * screen. It is cut to one width instead, the whole path in a tooltip.
 */
export const PLACE_COLUMN = { width: 240, ellipsis: { tooltip: true } } as const

/**
 * A name over a smaller line — its code, SKU or category — for a table
 * cell. The name is cut to the column with the whole of it on hover: next
 * to a fixed-width column, a long English name ran on into its neighbour.
 */
export function nameCell(name: string, sub: string, options: { code?: boolean } = {}): VNode {
	return h("div", { class: "flex min-w-0 flex-col gap-0.5" }, [
		h("span", { class: "truncate font-semibold", title: name }, name),
		options.code
			? h(
					"span",
					{ class: "inline-block w-fit font-mono text-[11px] text-slate-500 dark:text-slate-400", dir: "ltr" },
					sub
				)
			: h("span", { class: "truncate text-xs text-secondary", title: sub }, sub)
	])
}

/** A styled monospace code chip for asset codes, SKUs, or serial numbers. */
export function codeChip(code: string | null | undefined): VNode {
	if (!code) return h("span", { class: "text-secondary" }, EMPTY)
	return h(
		"span",
		{
			class: "inline-flex items-center rounded-md border border-slate-200/80 bg-slate-100/80 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-300",
			dir: "ltr"
		},
		code
	)
}

/** Action column helper that renders a subtle, clean view chevron button */
export function viewActionColumn<T>(onView: (row: T) => void, tooltipText = "معاينة"): DataTableColumn<T> {
	return {
		title: "",
		key: "_actions",
		width: 52,
		align: "center",
		render: row =>
			h(
				NTooltip,
				{ trigger: "hover" },
				{
					trigger: () =>
						h(
							NButton,
							{
								size: "tiny",
								quaternary: true,
								circle: true,
								class: "text-slate-400 hover:text-primary transition-colors",
								onClick: (e: MouseEvent) => {
									e.stopPropagation()
									onView(row)
								}
							},
							{ icon: () => h(Icon, { name: "carbon:chevron-right", class: "rtl:rotate-180", size: 16 }) }
						),
					default: () => tooltipText
				}
			)
	}
}
