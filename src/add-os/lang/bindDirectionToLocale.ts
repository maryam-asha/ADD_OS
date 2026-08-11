import { watch } from "vue"
import { useLocalesStore } from "@/stores/i18n"
import { setCurrentLocale } from "./currentLocale"
import { directionForLocale, isRtlLocale, resolveLocale } from "./locales"

/**
 * Minimal contract instead of importing `useThemeStore`.
 *
 * The theme store is what calls this function, so importing it back here would
 * create a module cycle. A structural type keeps the dependency one-way.
 */
interface DirectionTarget {
	setRTL: (rtl: boolean) => void
}

/**
 * ADD OS — makes page direction a pure function of the active locale.
 *
 * Installed once, from `themeStore.startWatchers()` (itself called by
 * `initTheme()` in `app-layouts/common/Provider.vue`). By then the locales
 * store is already alive, because `Provider.vue` instantiates it in setup.
 *
 * Runs immediately, so the direction is correct on the first tick and then on
 * every language change — live, with no reload.
 *
 * Three things move together, and only ever in this order:
 *   locale  →  themeStore.rtl  →  `.direction-rtl` body class (via setCssGlobalVars)
 *          →  <html lang> and <html dir>
 *
 * `<html dir>` is also written by `setCssGlobalVars()`. Writing it here too is
 * intentional and idempotent: it closes the gap between the locale changing and
 * the theme store's own watcher firing.
 */
export function bindDirectionToLocale(target: DirectionTarget): void {
	const localesStore = useLocalesStore()

	watch(
		() => localesStore.locale,
		locale => {
			target.setRTL(isRtlLocale(locale))
			// Mirror it where non-component code (the formatter) can read it.
			setCurrentLocale(resolveLocale(locale))

			if (typeof document !== "undefined") {
				const html = document.documentElement
				html.lang = locale
				html.dir = directionForLocale(locale)
			}
		},
		{ immediate: true }
	)
}
