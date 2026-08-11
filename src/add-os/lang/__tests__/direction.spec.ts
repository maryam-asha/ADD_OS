import { mount } from "@vue/test-utils"
import { createPinia } from "pinia"
import { createPersistedState } from "pinia-plugin-persistedstate"
import { beforeEach, describe, expect, it } from "vitest"
import { defineComponent, h, nextTick } from "vue"
import { createI18n } from "vue-i18n"
import { useLocalesStore } from "@/stores/i18n"
import { bindDirectionToLocale } from "../bindDirectionToLocale"
import { DEFAULT_LOCALE, directionForLocale, isRtlLocale, isSupportedLocale, resolveLocale, SUPPORTED_LOCALES } from "../locales"

function mountWithStores(initialLocale = DEFAULT_LOCALE) {
	const pinia = createPinia()
	pinia.use(createPersistedState({ key: id => `__persisted__${id}` }))

	const i18n = createI18n({
		legacy: false,
		locale: initialLocale,
		fallbackLocale: "en",
		messages: { ar: {}, en: {}, de: {}, es: {}, fr: {}, it: {}, jp: {} }
	})

	const rtlCalls: boolean[] = []
	let store!: ReturnType<typeof useLocalesStore>

	const Harness = defineComponent({
		setup() {
			store = useLocalesStore()
			bindDirectionToLocale({ setRTL: value => rtlCalls.push(value) })
			return () => h("div")
		}
	})

	mount(Harness, { global: { plugins: [pinia, i18n] } })

	return { store, rtlCalls }
}

describe("locale metadata", () => {
	it("treats Arabic as RTL and English as LTR", () => {
		expect(isRtlLocale("ar")).toBe(true)
		expect(isRtlLocale("en")).toBe(false)
		expect(directionForLocale("ar")).toBe("rtl")
		expect(directionForLocale("en")).toBe("ltr")
	})

	it("exposes exactly the two maintained locales", () => {
		expect([...SUPPORTED_LOCALES]).toEqual(["ar", "en"])
		expect(isSupportedLocale("ar")).toBe(true)
		expect(isSupportedLocale("en")).toBe(true)
		expect(isSupportedLocale("de")).toBe(false)
	})

	it("falls back to Arabic for missing or unsupported values", () => {
		expect(resolveLocale(null)).toBe("ar")
		expect(resolveLocale("")).toBe("ar")
		expect(resolveLocale("jp")).toBe("ar")
		expect(resolveLocale("en")).toBe("en")
	})
})

describe("locale → direction binding", () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.dir = ""
		document.documentElement.lang = ""
	})

	it("applies the direction immediately, without waiting for a change", () => {
		const { rtlCalls } = mountWithStores("ar")

		expect(rtlCalls).toEqual([true])
		expect(document.documentElement.dir).toBe("rtl")
		expect(document.documentElement.lang).toBe("ar")
	})

	it("flips direction live when the language changes", async () => {
		const { store, rtlCalls } = mountWithStores("ar")

		store.setLocale("en")
		await nextTick()

		expect(rtlCalls).toEqual([true, false])
		expect(document.documentElement.dir).toBe("ltr")
		expect(document.documentElement.lang).toBe("en")

		store.setLocale("ar")
		await nextTick()

		expect(rtlCalls).toEqual([true, false, true])
		expect(document.documentElement.dir).toBe("rtl")
		expect(document.documentElement.lang).toBe("ar")
	})

	it("starts in LTR when the app boots in English", () => {
		const { rtlCalls } = mountWithStores("en")

		expect(rtlCalls).toEqual([false])
		expect(document.documentElement.dir).toBe("ltr")
	})

	it("offers only the maintained locales in the language switcher", () => {
		const { store } = mountWithStores()

		expect(store.availableLocales).toEqual(["ar", "en"])
	})
})

describe("locale persistence", () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it("writes the chosen language to the key the pre-paint script reads", async () => {
		const { store } = mountWithStores("ar")

		store.setLocale("en")
		await nextTick()

		// index.html reads exactly this key/shape before the first paint.
		const raw = localStorage.getItem("__persisted__i18n")
		expect(raw).not.toBeNull()
		expect(JSON.parse(raw as string).locale).toBe("en")
	})

	it("restores a persisted language on the next boot", async () => {
		const first = mountWithStores("ar")
		first.store.setLocale("en")
		await nextTick()

		// A fresh pinia reading the same localStorage, as a reload would.
		const second = mountWithStores("ar")
		await nextTick()

		expect(second.store.locale).toBe("en")
		expect(document.documentElement.dir).toBe("ltr")
	})
})
