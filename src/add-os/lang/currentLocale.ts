import type { SupportedLocale } from "./locales"
import { ref } from "vue"
import { DEFAULT_LOCALE } from "./locales"

/**
 * ADD OS — the active locale, readable outside a component.
 *
 * `vue-i18n`'s locale is only reachable through `useI18n()` / the Pinia store,
 * both of which need a component context. Plain helpers — the formatter above
 * all — need the locale too, so `bindDirectionToLocale` mirrors it here.
 *
 * It is a `ref`, so anything that reads it inside a render function re-renders
 * when the language changes. That is what makes `formatDate(x)` in a template
 * switch language live, with no extra wiring.
 *
 * Read it; never write it. The locale store is the only writer.
 */
export const currentLocale = ref<SupportedLocale>(DEFAULT_LOCALE)

/** Internal — called only by `bindDirectionToLocale`. */
export function setCurrentLocale(locale: SupportedLocale): void {
	currentLocale.value = locale
}
