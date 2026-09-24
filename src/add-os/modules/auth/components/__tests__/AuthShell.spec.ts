import { mount } from "@vue/test-utils"
import { colord, extend } from "colord"
import a11yPlugin from "colord/plugins/a11y"
import { NConfigProvider } from "naive-ui"
import { createPinia } from "pinia"
import { createPersistedState } from "pinia-plugin-persistedstate"
import { beforeEach, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import { brand, component, DEFAULT_MODE, PILLAR_COLORS, semantic } from "@/add-os/theme/tokens"
import { useThemeStore } from "@/stores/theme"
import AuthShell from "../AuthShell.vue"

extend([a11yPlugin])

const ratio = (fg: string, bg: string) => colord(fg).contrast(bg)
/** WCAG 1.4.11 — non-text UI: control boundaries and focus indicators. */
const AA_NON_TEXT = 3

const messages = {
	en: {
		auth: {
			common: { back: "Back" },
			help: "Need help? Contact your IT administrator.",
			// One key, deliberately. The eyebrow, body paragraph, pillar row and
			// footer were built on 2026-09-22 and removed the same day — see the
			// panel comment in AuthShell.vue. Their keys are gone from both
			// catalogues, so a fixture carrying them would let a reintroduced
			// element pass tests that the real catalogues would fail.
			panel: { headline: "The unified operations workspace" }
		}
	}
}

/**
 * Icon does a local Iconify lookup, which is not what these tests are about and
 * would make a failure here ambiguous. Stubbed so the assertions are about the
 * shell. The logo is a plain <img> with an imported asset URL — nothing to stub.
 */
const stubs = {
	Icon: { props: ["name", "size"], template: `<i class="icon-stub" :data-name="name" />` },
	// Renders an n-popselect against the locales store, which is a different
	// component's contract. Stubbed so a failure here is about the shell — its
	// presence is still asserted, because a language switch that silently stops
	// rendering strands an English-reading admin on an Arabic-first login.
	LocaleSwitch: { template: `<div class="locale-switch-stub" />` }
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

	/**
	 * The 3/1 split, pinned — changed from the 2-up the 2026-08-30 design approved,
	 * at the owner's request on 2026-09-22.
	 *
	 * Asserted because the proportion is the whole point of that change and nothing
	 * else would notice it going back: the grid is Tailwind utility classes, so a
	 * stray edit to `lg:grid-cols-*` or either span would restore a 50/50 screen
	 * silently, and every other test here would still pass.
	 *
	 * The panel's `hidden lg:flex` is asserted alongside, because the split only
	 * exists from `lg` up — below it the form is the entire screen, and a change
	 * that dropped `hidden` would put a three-quarter charcoal panel on a phone.
	 */
	describe("the desktop split is 60% panel, 40% form", () => {
		const shellOf = () => mountShell().find(".auth-shell")

		it("lays out five columns at lg", () => {
			expect(shellOf().classes()).toContain("lg:grid-cols-5")
		})

		it("gives the panel three of them", () => {
			expect(mountShell().find("section").classes()).toContain("lg:col-span-3")
		})

		it("leaves the form the remaining two", () => {
			expect(mountShell().find("main").classes()).toContain("lg:col-span-2")
		})

		// The split moved four times in one session — 50/50 → 75/25 → 70/30 →
		// 60/40 — every time toward room for the form (§7b). Asserted so none of
		// the abandoned proportions returns via a partial edit: someone changing
		// only the panel's span would otherwise leave the columns disagreeing.
		it("is none of the proportions it passed through", () => {
			const shell = shellOf().classes()

			expect(shell).not.toContain("lg:grid-cols-2")
			expect(shell).not.toContain("lg:grid-cols-4")
			expect(shell).not.toContain("lg:grid-cols-10")
		})

		it("keeps the form at its designed width, not the narrowed one", () => {
			// `max-w-sm` was a compensation for the 25% column and was reverted with
			// it. Its return would mean the column narrowed again without the spans
			// saying so.
			const card = mountShell().find("main > div:last-child").classes()

			expect(card).toContain("max-w-md")
			expect(card).not.toContain("max-w-sm")
		})

		it("keeps the panel off small screens entirely", () => {
			const section = mountShell().find("section").classes()
			expect(section).toContain("hidden")
			expect(section).toContain("lg:flex")
		})
	})

	/**
	 * The 2026-09-22 reference redesign — see spec §7c.
	 *
	 * What is asserted here is the part that is load-bearing rather than
	 * decorative: the form sits in a raised card, the language switch is present,
	 * and — the one that matters most — NO PILLAR COLOUR reached the panel.
	 */
	describe("the reference redesign", () => {
		it("puts the form in a card that lifts off a warm ground", () => {
			// The card/ground relationship is the reference's main structural move.
			// Both are shipping tokens, so this also fails if someone swaps either
			// for a literal.
			const wrapper = mountShell()

			expect(wrapper.find("main").classes()).toContain("bg-surface-sunken")

			const card = wrapper.find("main > div:last-child")
			expect(card.classes()).toContain("bg-surface-raised")
			expect(card.classes()).toContain("shadow-add-raised")
		})

		it("carries a real language switch, not a decorative one", () => {
			// Invariant 4: a shipped control may not be a no-op. `LocaleSwitch`
			// writes through the locales store, which derives direction.
			expect(mountShell().find(".locale-switch-stub").exists()).toBe(true)
		})

		/**
		 * The panel carries ONE piece of copy. Asserted as a ceiling, not a
		 * presence check.
		 *
		 * The first build of this redesign put an eyebrow, a body paragraph, a
		 * three-item pillar row and a footer in here alongside the headline. The
		 * owner rejected it as unreadable, and the pillar row separately violated
		 * `.claude/rules/tokens-and-color.md` — "never a bare coloured dot".
		 *
		 * A test that only checked the headline renders would not have caught any
		 * of that, so this counts what is there instead.
		 */
		it("keeps the panel to one piece of copy", () => {
			const panel = mountShell().find("section")

			expect(panel.text()).toContain("The unified operations workspace")
			expect(panel.findAll("p")).toHaveLength(0)
			expect(panel.findAll("ul")).toHaveLength(0)
		})

		/**
		 * THE assertion of this redesign.
		 *
		 * The reference renders each pillar dot in its own pillar colour and sets
		 * the submit button in Aleppo Economic Orange. Neither is built: in this
		 * dashboard orange means `danger` and nothing else, and that exclusivity
		 * is what makes a destructive action unmistakable (tokens.ts, SERVICE
		 * PILLARS). `tokens.spec.ts` guards the token tree; this guards the one
		 * screen that was asked to look like the thing the guard forbids.
		 *
		 * Written against rendered HTML rather than against the token objects,
		 * because that is where an inline style or arbitrary Tailwind value would
		 * appear — and those are precisely what would bypass the token guard.
		 */
		it("lets no pillar colour reach the markup", () => {
			const html = mountShell().html().toUpperCase()

			for (const hex of PILLAR_COLORS) {
				expect(html, `${hex} is a pillar colour and may not enter chrome`).not.toContain(
					hex.toUpperCase()
				)
			}
		})

		/**
		 * The watermark stays a watermark.
		 *
		 * Built first at 52rem wide and 25% opacity, which rendered as solid
		 * green shapes with the body copy breaking up on top of them — the owner's
		 * "الباترن والنصوص الكثيرة غير المفهومة". The fix was not one number but
		 * three: smaller, far fainter, and moved off the text.
		 *
		 * Opacity is the one worth pinning, because it is the one a future tweak
		 * would raise "just a little" without re-rendering the screen. Weight is
		 * area × strength, so a large shape at 25% is far heavier than the same
		 * number on a small one suggests.
		 */
		it("keeps the pattern faint enough to sit behind type", () => {
			const layer = mountShell().find("section > div[aria-hidden='true']")
			const classes = layer.classes().join(" ")

			expect(classes).toContain("opacity-8")
			expect(classes).not.toContain("opacity-25")
			// Bottom-anchored, away from the headline at the block start.
			expect(classes).toContain("bottom-0")
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
