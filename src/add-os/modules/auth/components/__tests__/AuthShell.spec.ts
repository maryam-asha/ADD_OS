import { mount } from "@vue/test-utils"
import { NConfigProvider } from "naive-ui"
import { createPinia } from "pinia"
import { createPersistedState } from "pinia-plugin-persistedstate"
import { beforeEach, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import { component, DEFAULT_MODE, semantic } from "@/add-os/theme/tokens"
import { useThemeStore } from "@/stores/theme"
import AuthShell from "../AuthShell.vue"

const messages = {
	en: {
		auth: {
			common: { back: "Back" },
			shell: { tagline: "The operations dashboard." }
		}
	}
}

/**
 * Icon does a local Iconify lookup, which is not what these tests are about and
 * would make a failure here ambiguous. Stubbed so the assertions are about the
 * shell. The logo is a plain <img> with an imported asset URL — nothing to stub.
 */
const stubs = {
	Icon: { props: ["name", "size"], template: `<i class="icon-stub" :data-name="name" />` }
}

function mountShell(props: Record<string, unknown> = {}) {
	const pinia = createPinia()
	pinia.use(createPersistedState({ key: id => `__persisted__${id}` }))

	const i18n = createI18n({ legacy: false, locale: "en", fallbackLocale: "en", messages })

	return mount(AuthShell, {
		props: { title: "Welcome back", ...props },
		global: { plugins: [pinia, i18n], stubs }
	})
}

describe("authShell", () => {
	beforeEach(() => {
		document.body.innerHTML = ""
	})

	it("renders the title, and the subtitle only when one is given", () => {
		expect(mountShell().text()).toContain("Welcome back")

		const withSubtitle = mountShell({ subtitle: "Sign in to continue." })
		expect(withSubtitle.text()).toContain("Sign in to continue.")
	})

	it("shows the back control only when asked, and emits on click", async () => {
		const plain = mountShell()
		expect(plain.text()).not.toContain("Back")

		const withBack = mountShell({ showBack: true })
		expect(withBack.text()).toContain("Back")

		await withBack.find("button").trigger("click")
		expect(withBack.emitted("back")).toHaveLength(1)
	})

	describe("the back arrow follows document direction", () => {
		// The vendor's AuthForm hardcoded `carbon:arrow-left`, which points the
		// wrong way in Arabic — the dashboard's primary language.
		//
		// Direction is set explicitly in BOTH tests rather than leaning on the
		// default. `theme/index.ts` ships `rtl: true` as the base state ("Arabic
		// RTL is the base mode, not an option"), so a test that assumed LTR by
		// default would be asserting the opposite of what it claimed.
		it("points right in RTL — the base mode", async () => {
			const wrapper = mountShell({ showBack: true })
			useThemeStore().setRTL(true)
			await wrapper.vm.$nextTick()

			expect(wrapper.find(".icon-stub").attributes("data-name")).toBe("carbon:arrow-right")
		})

		it("points left in LTR", async () => {
			const wrapper = mountShell({ showBack: true })
			useThemeStore().setRTL(false)
			await wrapper.vm.$nextTick()

			expect(wrapper.find(".icon-stub").attributes("data-name")).toBe("carbon:arrow-left")
		})
	})

	describe("the green call to action", () => {
		const auth = component[DEFAULT_MODE].auth
		const overridesOf = () => mountShell().findComponent(NConfigProvider).props("themeOverrides") as {
			common: Record<string, string>
		}

		it("remaps naive's primary to the auth ramp for these screens only", () => {
			const { common } = overridesOf()

			expect(common.primaryColor).toBe(auth.actionBase)
			expect(common.primaryColorHover).toBe(auth.actionHover)
			expect(common.primaryColorPressed).toBe(auth.actionPressed)
		})

		it("does not leave the dashboard's teal primary in place", () => {
			// Without this the screens would silently render teal and still pass
			// every other assertion here.
			expect(overridesOf().common.primaryColor).not.toBe(semantic[DEFAULT_MODE].primary.base)
		})

		it("supplies hover and pressed explicitly, never by naive's derivation", () => {
			// getThemeColors() derives hover by LIGHTENING, which drops light-mode
			// hover below AA. All three must be present.
			const { common } = overridesOf()
			for (const key of ["primaryColor", "primaryColorHover", "primaryColorPressed", "primaryColorSuppl"]) {
				expect(common[key], `${key} must be set explicitly`).toBeTruthy()
			}
		})
	})
})
