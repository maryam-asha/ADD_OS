import type { Translatable } from "@/add-os/modules/hr/types/hr"
import { currentLocale } from "@/add-os/lang/currentLocale"

/** Shown where a value is missing: a mark, not a word, so it needs no translation. */
export const EMPTY = "—"

/**
 * A bilingual HR value in the current language, falling back to the other
 * one (English is optional on the backend, Arabic is not). Reads the locale
 * ref, so a render that calls it follows a language switch.
 */
export function translated(value: Translatable | null | undefined): string {
	if (!value) return ""
	const primary = currentLocale.value === "en" ? value.en : value.ar
	return primary || value.ar || value.en || ""
}
