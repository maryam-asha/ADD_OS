import type { SupportedLocale } from "@/add-os/lang/locales"
import { currentLocale } from "@/add-os/lang/currentLocale"

/**
 * ADD OS — the plural form a count takes, by CLDR's rules for the language.
 *
 * vue-i18n's built-in `a | b | c` choice only knows English's one/other, and
 * Arabic has six forms: «أصل واحد»، «أصلان»، «3 أصول»، «11 أصلاً»، «100 أصل».
 * A counted message is therefore an object keyed by those six categories —
 * `zero`, `one`, `two`, `few`, `many`, `other` — in BOTH bundles (the parity
 * guard wants the same keys; English simply repeats its plural), and this
 * picks the key:
 *
 *   t(countKey("inventory.items.assetsCount", n), { n: formatNumber(n) })
 *
 * The count is formatted separately, through `formatNumber`, like any number.
 */
export const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"] as const
export type PluralCategory = (typeof PLURAL_CATEGORIES)[number]

const rules = new Map<SupportedLocale, Intl.PluralRules>()

export function pluralCategory(count: number, locale: SupportedLocale = currentLocale.value): PluralCategory {
	let rule = rules.get(locale)
	if (!rule) {
		rule = new Intl.PluralRules(locale)
		rules.set(locale, rule)
	}
	return rule.select(count) as PluralCategory
}

/** The message key for `count` under a counted message `base`. */
export function countKey(base: string, count: number, locale?: SupportedLocale): string {
	return `${base}.${pluralCategory(count, locale)}`
}
