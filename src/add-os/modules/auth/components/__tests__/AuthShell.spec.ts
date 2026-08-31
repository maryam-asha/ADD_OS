import { mount } from "@vue/test-utils"
import { colord, extend } from "colord"
import a11yPlugin from "colord/plugins/a11y"
import { NConfigProvider } from "naive-ui"
import { createPinia } from "pinia"
import { createPersistedState } from "pinia-plugin-persistedstate"
import { beforeEach, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import { brand, component, DEFAULT_MODE, semantic } from "@/add-os/theme/tokens"
import { useThemeStore } from "@/stores/theme"
import AuthShell from "../AuthShell.vue"

extend([a11yPlugin])

const ratio = (fg: string, bg: string) => colord(fg).contrast(bg)
/** WCAG 1.4.11 — non-text UI: control boundaries and focus indicators. */
const AA_NON_TEXT = 3

const messages = {
	en: {
		auth: {
			common: { back: "Back" }
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

	/**
	 * The CTA is still green — it just is not this component's doing any more.
	 *
	 * Until 2026-08-31 the shell carried a `Button` remap, because the design
	 * wanted a green submit button while the dashboard's `primary` was Deep Teal.
	 * `primary` is that same green now, so the remap set every value to what naive
	 * already resolved. It was deleted, and these tests changed from "the shell
	 * repaints the button" to "the shell adds NOTHING, and does not need to".
	 *
	 * The old suite's most valuable assertion survives inverted: it checked that
	 * the button was NOT `primary`. This checks that it IS, which is the property
	 * that would break if someone reintroduced a partial override.
	 */
	describe("the green call to action comes from primary, not from this shell", () => {
		const overridesOf = () =>
			mountShell().findComponent(NConfigProvider).props("themeOverrides") as {
				common?: Record<string, string>
				Button?: Record<string, string>
			}

		it("adds no Button override at all", () => {
			expect(overridesOf().Button).toBeUndefined()
		})

		it("leaves `primary` alone, so the shell cannot fork the palette", () => {
			expect(overridesOf().common?.primaryColor).toBeUndefined()
		})

		it("and `primary` is in fact the green the design asks for", () => {
			// If this fails, the button is no longer green and deleting the override
			// stopped being safe — which is the whole reason it is asserted here and
			// not left to tokens.spec.ts alone.
			expect(semantic[DEFAULT_MODE].primary.base).toBe(semantic[DEFAULT_MODE].success.base)
		})
	})

	// The design annotates the control border as #CDC2AF. That is already the
	// shipping value — `semantic.border` is Aleppo Stone, and theme/index.ts feeds
	// it to naive as `common.borderColor` — so the shell adds no override for it.
	// Asserted here so a future palette change cannot silently drift the auth
	// screens away from the design without a test saying so.
	describe("input focus is Smart Olive, by the design owner's decision", () => {
		const overridesOf = () =>
			mountShell().findComponent(NConfigProvider).props("themeOverrides") as {
				Input: Record<string, string>
			}

		it("focuses and hovers on Smart Olive", () => {
			const { Input } = overridesOf()

			expect(Input.borderFocus).toContain(brand.smartOlive)
			expect(Input.borderHover).toContain(brand.smartOlive)
			expect(Input.caretColor).toBe(brand.smartOlive)
		})

		it("references the brand primitive rather than restating its hex", () => {
			// A literal would put a second copy of the value outside tokens.ts.
			expect(brand.smartOlive).toBe("#809C66")
			expect(overridesOf().Input.caretColor).toBe(brand.smartOlive)
		})

		// Smart Olive is a PILLAR colour. Using it here is a scoped component
		// override, not a token — and that distinction is the whole reason the
		// pillar guard still holds. If anyone promotes it into the token tree,
		// tokens.spec.ts fails; this asserts the other half.
		it("does not smuggle a pillar colour into the token tree", () => {
			const collect = (o: unknown, out: string[] = []): string[] => {
				if (typeof o === "string") {
					out.push(o.toUpperCase())
				} else if (o && typeof o === "object") {
					for (const v of Object.values(o)) {
						collect(v, out)
					}
				}
				return out
			}
			expect(collect(component[DEFAULT_MODE])).not.toContain(brand.smartOlive.toUpperCase())
			expect(collect(semantic[DEFAULT_MODE])).not.toContain(brand.smartOlive.toUpperCase())
		})

		/**
		 * Records a KNOWN DEVIATION, and is written to fail the day it stops being
		 * one — not to bless it.
		 *
		 * A focus indicator is bound by WCAG 1.4.11's 3:1 against adjacent colours.
		 * Smart Olive cleared that on the card at 3.06:1 while `surface` was
		 * #FFFFFF. On 2026-08-30 `surface` became #F7F5F2 to match the member app,
		 * and the ring dropped to 2.81:1 — so it now clears 3:1 against NEITHER
		 * adjacent surface:
		 *   · card surface (#F7F5F2) — 2.81:1
		 *   · input fill   (#EFECEB) — 2.60:1
		 *
		 * Both numbers are pinned. If a future palette change lifts either above
		 * 3:1, this test fails and the deviation should be closed rather than
		 * re-pinned. Owner: Design — see docs/brand/GUIDELINE-FEEDBACK.md.
		 */
		it("is a recorded 1.4.11 deviation — below 3:1 on both adjacent surfaces", () => {
			const s = semantic[DEFAULT_MODE]
			const onCard = ratio(brand.smartOlive, s.surface)
			const onFill = ratio(brand.smartOlive, s.inputFill)

			expect(onCard, "card contrast moved — reassess the deviation").toBeCloseTo(2.81, 1)
			expect(onFill, "input-fill contrast moved — reassess the deviation").toBeCloseTo(2.6, 1)
			expect(onCard).toBeLessThan(AA_NON_TEXT)
			expect(onFill).toBeLessThan(AA_NON_TEXT)
		})
	})

	it("takes its control border from the shipping token, not a local override", () => {
		expect(semantic[DEFAULT_MODE].border).toBe("#CDC2AF")

		const overrides = mountShell().findComponent(NConfigProvider).props("themeOverrides") as {
			common?: Record<string, string>
		}
		expect(overrides.common?.borderColor).toBeUndefined()
	})
})
