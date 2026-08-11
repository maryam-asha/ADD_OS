import type { LocaleCodes } from "@/lang/config"

/**
 * ADD OS — the single source of truth for "which languages exist" and
 * "which way does each one read".
 *
 * ⚠️ Direction is DERIVED from the locale. It is not an independent setting.
 * Nothing in the app should call `themeStore.setRTL()` directly — change the
 * locale and the direction follows. See ./bindDirectionToLocale.ts.
 *
 * This makes contradictory states (Arabic + LTR, English + RTL) unreachable
 * by construction rather than by convention.
 */

/** Arabic is the primary language of the operations dashboard. */
export const DEFAULT_LOCALE = "ar" satisfies LocaleCodes

/**
 * ADD OS is bilingual. The Pinx template also ships de / es / fr / it / jp
 * bundles — those files are kept (nothing is deleted) but are NOT offered in
 * the UI, because only `ar` and `en` are maintained to completeness.
 *
 * To expose another language: add its code here AND commit to translating
 * every ADD OS key into it.
 */
export const SUPPORTED_LOCALES = ["ar", "en"] as const satisfies readonly LocaleCodes[]

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/** Right-to-left languages, by locale code. */
const RTL_LOCALES: ReadonlySet<string> = new Set(["ar"])

export function isRtlLocale(locale: string): boolean {
	return RTL_LOCALES.has(locale)
}

export function directionForLocale(locale: string): "rtl" | "ltr" {
	return isRtlLocale(locale) ? "rtl" : "ltr"
}

export function isSupportedLocale(locale: string): locale is SupportedLocale {
	return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

/** The locale to fall back to when a persisted value is missing or unsupported. */
export function resolveLocale(locale: string | null | undefined): SupportedLocale {
	return locale && isSupportedLocale(locale) ? locale : DEFAULT_LOCALE
}
