import type { NDateLocale, NLocale } from "naive-ui"
import type { WritableComputedRef } from "vue"
import type { LocaleCodes } from "@/lang/config"
import { arDZ, dateEnUS, enUS } from "naive-ui"
import { acceptHMRUpdate, defineStore } from "pinia"
import { nextTick } from "vue"
import { useI18n } from "vue-i18n"
// ADD OS: ADD OS is bilingual — this guard keeps the switcher honest if a bundle
// is ever added to src/lang/locales/ without being declared supported.
import { isSupportedLocale } from "@/add-os/lang/locales"
// ADD OS: Levantine month names inside naive-ui's own date panel.
import { dateArLevantine } from "@/add-os/utils/format/naiveDateLocale"
import dayjs from "@/utils/dayjs"

export const useLocalesStore = defineStore("i18n", {
	state: () => {
		nextTick(() => {
			dayjs.locale(useLocalesStore().locale)
		})

		return {
			locale: useI18n().locale as WritableComputedRef<LocaleCodes, string>,
			availableLocales: (useI18n().availableLocales as LocaleCodes[]).filter(code => isSupportedLocale(code))
		}
	},
	actions: {
		setLocale(locale: LocaleCodes): LocaleCodes {
			dayjs.locale(locale)
			this.locale = locale
			return locale
		}
	},
	getters: {
		naiveuiLocales(): { code: LocaleCodes; ui: NLocale; date: NDateLocale }[] {
			return [
				// ADD OS: `arDZ` is naive-ui's only Arabic UI bundle (button labels etc.) and
				// is standard Arabic, so it is used as-is. Its DATE bundle is not: `dateArDZ`
				// is Algerian ("أوت"), so it is wrapped to read month names from
				// @/add-os/utils/format/calendar — the same table `formatDate` uses.
				{ code: "ar", ui: arDZ, date: dateArLevantine },
				{ code: "en", ui: enUS, date: dateEnUS }
			]
		},
		naiveuiLocale(state): NLocale | undefined {
			return this.naiveuiLocales.find(locale => locale.code === state.locale)?.ui
		},
		naiveuiDateLocale(state): NDateLocale | undefined {
			return this.naiveuiLocales.find(locale => locale.code === state.locale)?.date
		}
	},
	persist: {
		// @ts-expect-error "Type instantiation is excessively deep and possibly infinite" ts(2589)
		pick: ["locale"]
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useLocalesStore, import.meta.hot))
}
