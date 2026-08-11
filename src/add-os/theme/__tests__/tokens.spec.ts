import { colord, extend } from "colord"
import a11yPlugin from "colord/plugins/a11y"
import { describe, expect, it } from "vitest"
import runtimeTokens from "@/design-tokens.json"
import {
	brand,
	component,
	DARK_MODE_SUPPORTED,
	DERIVATIONS,
	fontFamily,
	NUMERIC_CELL_CLASS,
	PILLAR_COLORS,
	PILLARS,
	PROPORTIONAL_FIGURE_FACES,
	semantic,
	state,
	STATUS_ICONS,
	SUPPORTED_LANGS,
	THEME_MODES,
	typeScale,
	VERIFIED_TABULAR_FACES
} from "../tokens"

extend([a11yPlugin])

/**
 * ADD OS — token invariants.
 *
 * Phase 0 computed every ratio by hand and the report records them. This file
 * makes those numbers ENFORCED rather than documented: change one hex in
 * tokens.ts and if it breaks WCAG AA, a test fails instead of a user squinting.
 *
 * The Definition of Done is that a single hex change propagates correctly
 * everywhere. These tests are the half of that promise which says "correctly".
 */

const ratio = (fg: string, bg: string) => colord(fg).contrast(bg)

/** WCAG 1.4.3 — body text. */
const AA_TEXT = 4.5
/** WCAG 1.4.11 — non-text UI: control boundaries, focus indicators, state graphics. */
const AA_NON_TEXT = 3

const ROLES = ["primary", "success", "warning", "danger", "info"] as const

describe("tier 1 — brand primitives are verbatim from the Guideline", () => {
	// Guideline pp. 14-17. If one of these ever changes, it is a BRAND decision,
	// never a code decision — which is exactly why they are pinned here.
	const GUIDELINE = {
		charcoalBackbone: "#43474F",
		warmMist: "#E2DDDB",
		smartOlive: "#809C66",
		softGrowthGreen: "#B8D098",
		aleppoEconomicOrange: "#DC4128",
		aleppoStone: "#CDC2AF",
		antiqueCopper: "#A97C57",
		levantDeepTeal: "#314550",
		signalCyan: "#00BFDF",
		deepTeal: "#007F91"
	}

	it("matches the Brand Guideline exactly", () => {
		expect(brand).toEqual(GUIDELINE)
	})

	it("names every primitive as the Guideline names it", () => {
		expect(Object.keys(brand).sort()).toEqual(Object.keys(GUIDELINE).sort())
	})
})

describe("tier 2 — every interaction state holds WCAG AA", () => {
	for (const mode of THEME_MODES) {
		for (const role of ROLES) {
			const c = semantic[mode][role]

			// The whole reason variants are declared explicitly instead of letting
			// naive-ui derive them: its derivation LIGHTENS on hover, which drops
			// white-on-fill below AA. Hover and pressed must move AWAY from the text.
			it(`${mode}/${role}: base, hover and pressed all carry \`on\` at ≥${AA_TEXT}:1`, () => {
				for (const stateName of ["base", "hover", "pressed", "suppl"] as const) {
					const r = ratio(c.on, c[stateName])
					expect(r, `${role}.${stateName} (${c[stateName]}) with text ${c.on} → ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(
						AA_TEXT
					)
				}
			})

			it(`${mode}/${role}: contrast never DROPS from base to hover`, () => {
				expect(ratio(c.on, c.hover)).toBeGreaterThanOrEqual(ratio(c.on, c.base))
			})

			it(`${mode}/${role}: \`text\` variant clears AA on both surface and body`, () => {
				const s = semantic[mode]
				expect(ratio(c.text, s.surface)).toBeGreaterThanOrEqual(AA_TEXT)
				expect(ratio(c.text, s.body)).toBeGreaterThanOrEqual(AA_TEXT)
			})
		}
	}
})

describe("tier 2 — text on surfaces", () => {
	for (const mode of THEME_MODES) {
		const s = semantic[mode]

		// Cards sit on the Warm Mist body, so BOTH backgrounds must pass. This is
		// the trap the warm light palette sets: a grey that passes on white can
		// still fail on Mist.
		for (const key of ["textPrimary", "textSecondary", "textMuted"] as const) {
			it(`${mode}/${key} clears AA on surface AND body`, () => {
				expect(ratio(s[key], s.surface), `${key} on surface`).toBeGreaterThanOrEqual(AA_TEXT)
				expect(ratio(s[key], s.body), `${key} on body`).toBeGreaterThanOrEqual(AA_TEXT)
			})
		}

		it(`${mode}/textPrimary also clears AA on the input fill`, () => {
			expect(ratio(s.textPrimary, s.inputFill)).toBeGreaterThanOrEqual(AA_TEXT)
		})

		it(`${mode}/textOnDark clears AA on Levant Deep Teal`, () => {
			expect(ratio(s.textOnDark, brand.levantDeepTeal)).toBeGreaterThanOrEqual(AA_TEXT)
		})

		it(`${mode}: text tiers are ordered primary → secondary → muted`, () => {
			const p = ratio(s.textPrimary, s.surface)
			const sec = ratio(s.textSecondary, s.surface)
			const m = ratio(s.textMuted, s.surface)
			expect(p).toBeGreaterThan(sec)
			expect(sec).toBeGreaterThan(m)
		})
	}
})

describe("tier 2 — borders: the split is load-bearing", () => {
	for (const mode of THEME_MODES) {
		const s = semantic[mode]

		// `borderStrong` is for input outlines and anything where the border is the
		// sole affordance, so 3:1 is binding against every surface a field sits on.
		it(`${mode}/borderStrong clears ${AA_NON_TEXT}:1 on surface, body and input fill`, () => {
			for (const bg of [s.surface, s.body, s.inputFill]) {
				expect(ratio(s.borderStrong, bg), `borderStrong on ${bg}`).toBeGreaterThanOrEqual(AA_NON_TEXT)
			}
		})

		// `border` is decorative — dividers and card edges. It has NO 1.4.11
		// obligation, and asserting one would be wrong. What matters is that the
		// two are genuinely different tokens, so a future edit cannot quietly
		// collapse the functional one into the decorative one.
		it(`${mode}/border and borderStrong are distinct`, () => {
			expect(s.border).not.toBe(s.borderStrong)
			expect(ratio(s.borderStrong, s.surface)).toBeGreaterThan(ratio(s.border, s.surface))
		})
	}
})

describe("tier 2 — the two-layer focus ring survives every surface", () => {
	for (const mode of THEME_MODES) {
		const s = semantic[mode]
		const surfaces: Record<string, string> = {
			surface: s.surface,
			body: s.body,
			surfaceSunken: s.surfaceSunken,
			inputFill: s.inputFill,
			aleppoStone: brand.aleppoStone,
			levantDeepTeal: brand.levantDeepTeal,
			softGrowthGreen: brand.softGrowthGreen,
			...Object.fromEntries(ROLES.map(r => [`${r}Fill`, s[r].base]))
		}

		// A single-colour ring cannot do this. A primary-derived ring in particular
		// would vanish on a primary button — which is why the ring is independent
		// of primary and has two bands.
		for (const [name, bg] of Object.entries(surfaces)) {
			it(`${mode}: ring is perceivable on ${name}`, () => {
				const best = Math.max(ratio(s.focusRingInner, bg), ratio(s.focusRingOuter, bg))
				expect(best, `best band on ${name} (${bg}) → ${best.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NON_TEXT)
			})
		}

		it(`${mode}: the two bands are distinguishable from each other`, () => {
			expect(ratio(s.focusRingInner, s.focusRingOuter)).toBeGreaterThanOrEqual(AA_NON_TEXT)
		})

		it(`${mode}: the ring is NOT derived from primary`, () => {
			expect(s.focusRingInner).not.toBe(s.primary.base)
			expect(s.focusRingOuter).not.toBe(s.primary.base)
		})
	}
})

describe("provenance is declared, never inferred", () => {
	it("every derivation records what it came from and why", () => {
		for (const [name, d] of Object.entries(DERIVATIONS)) {
			expect(d.value, `${name}.value`).toMatch(/^#[0-9A-F]{6}$/i)
			expect(["brand", "adjusted", "derived"], `${name}.provenance`).toContain(d.provenance)
			expect(d.note.length, `${name}.note should explain itself`).toBeGreaterThan(40)
		}
	})

	it("no derivation silently duplicates a brand primitive", () => {
		const brandHexes = new Set(Object.values(brand).map(h => h.toUpperCase()))
		for (const [name, d] of Object.entries(DERIVATIONS)) {
			expect(brandHexes.has(d.value.toUpperCase()), `${name} equals a brand colour — use the brand token`).toBe(false)
		}
	})

	it("`warning` is registered as DERIVED — it is not an ADD brand colour", () => {
		expect(DERIVATIONS.warningAmber.provenance).toBe("derived")
		expect(semantic.light.warning.base).toBe(DERIVATIONS.warningAmber.value)
	})

	it("`warning` is the only fill carrying dark text, so it lightens on hover", () => {
		const w = semantic.light.warning
		expect(w.on).toBe(brand.charcoalBackbone)
		expect(colord(w.hover).brightness()).toBeGreaterThan(colord(w.base).brightness())

		for (const role of ["primary", "success", "danger", "info"] as const) {
			const c = semantic.light[role]
			expect(c.on, `${role}.on`).toBe("#FFFFFF")
			expect(colord(c.hover).brightness(), `${role} should darken`).toBeLessThan(colord(c.base).brightness())
		}
	})
})

describe("colour is never the sole channel for state", () => {
	it("every status role ships a distinct icon", () => {
		const roles = ["success", "warning", "danger", "info"] as const
		for (const r of roles) expect(STATUS_ICONS[r], `${r} icon`).toMatch(/^carbon:/)
		expect(new Set(Object.values(STATUS_ICONS)).size).toBe(roles.length)
	})

	// This is the measured reason the icon rule is binding rather than advisory:
	// Signal Cyan darkened to meet AA lands ΔE 2.7 from primary, so `info` and
	// `primary` are the same colour to everyone. Decision Q3 accepted that.
	it("info shares primary's hue — documenting why the icon is mandatory", () => {
		expect(semantic.light.info.base).toBe(semantic.light.primary.base)
	})
})

describe("guideline p.15 strict rule stays disengaged", () => {
	// Guideline p.15: "Do not use both Antique Copper and Aleppo Spice as strong
	// accents in the same layout. Choose one primary accent per application."
	//
	// ADD OS keeps that rule STRUCTURALLY disengaged rather than merely unviolated:
	// Antique Copper carries no accent role at all, so no layout can ever pair the
	// two. That is what makes the p.15 ambiguity ("Aleppo Spice" is undefined —
	// see docs/brand/GUIDELINE-FEEDBACK.md §2) harmless to us instead of a
	// judgement call at every screen.
	//
	// Its ONLY permitted use is as a categorical data-visualisation series
	// (`extra3` in the runtime palette). A chart series encodes data; it is not an
	// accent. If a future change wants Copper as an accent, this test must fail
	// first and the p.15 question must be settled by the brand owner.
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

	for (const mode of THEME_MODES) {
		it(`${mode}: Antique Copper carries no semantic role`, () => {
			expect(collect(semantic[mode])).not.toContain(brand.antiqueCopper.toUpperCase())
		})

		it(`${mode}: Antique Copper carries no component role`, () => {
			expect(collect(component[mode])).not.toContain(brand.antiqueCopper.toUpperCase())
		})
	}

	it("appears in the runtime palette only as a chart series", () => {
		const copper = brand.antiqueCopper.toUpperCase()
		const slots = Object.entries(runtimeTokens.colors.light)
			.filter(([, v]) => String(v).toUpperCase() === copper)
			.map(([k]) => k)
		expect(slots).toEqual(["extra3"])
	})

	// The other half of the pair. `danger` uses the contrast-adjusted #D93D23, so
	// verbatim Aleppo Economic Orange is not a semantic value either — orange
	// reaches the UI through exactly one role.
	it("orange reaches the UI through `danger` alone", () => {
		for (const mode of THEME_MODES) {
			const s = semantic[mode]
			const oranges = collect(s).filter(v => v === brand.aleppoEconomicOrange.toUpperCase())
			expect(oranges).toHaveLength(0)
			expect(s.danger.base).toBe(DERIVATIONS.dangerFill.value)
		}
	})
})

describe("numerals — the face that draws digits is a declared decision", () => {
	// Poppins has NO tabular figures: no `tnum` feature (zero GSUB/GPOS features
	// at all in the Fontsource latin subset) and digit widths spanning 320–635 on
	// a 1000 unit em. `font-variant-numeric: tabular-nums` is a silent no-op on
	// it. Ragged decimal columns in a financial table are a defect, so digits are
	// routed elsewhere. Metrics measured with fontTools — see tokens.ts.
	it("the numeric stack leads with a face verified tabular-by-default", () => {
		const first = fontFamily.numeric.split(",")[0].trim().replace(/^['"]|['"]$/g, "")
		expect(Object.keys(VERIFIED_TABULAR_FACES)).toContain(first)
	})

	it("every verified face has one digit width recorded", () => {
		for (const [face, m] of Object.entries(VERIFIED_TABULAR_FACES)) {
			expect(m.digitWidth, `${face} digitWidth`).toBeGreaterThan(0)
			expect(m.unitsPerEm, `${face} unitsPerEm`).toBeGreaterThan(0)
			expect(m.measured, `${face} needs a measurement date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		}
	})

	// The realistic regression: someone "simplifies" by pointing numerals at the
	// body font. It is invisible until a human reads a column of money.
	it("no proportional-figure face appears in the numeric stack", () => {
		for (const face of Object.keys(PROPORTIONAL_FIGURE_FACES)) {
			expect(fontFamily.numeric, `${face} must never draw digits`).not.toContain(face)
		}
	})

	it("poppins is recorded as proportional so the finding is not re-litigated", () => {
		expect(PROPORTIONAL_FIGURE_FACES.Poppins.hasTnum).toBe(false)
		expect(PROPORTIONAL_FIGURE_FACES.Poppins.spreadUnits).toBeGreaterThan(0)
	})

	// Poppins must still own Latin body text — the mandated display role.
	it("the body stack is unchanged and still leads with the mandated Latin face", () => {
		expect(fontFamily.ui.indexOf("--font-family-latin")).toBeLessThan(fontFamily.ui.indexOf("--font-family-arabic"))
	})

	it("money columns resolve to the numeric face, not the body face", () => {
		for (const mode of THEME_MODES) {
			expect(component[mode].table.numericFontFamily).toBe(fontFamily.numeric)
			expect(component[mode].table.numericFontFamily).not.toBe(fontFamily.ui)
		}
	})

	it("exposes one class for numeric cells", () => {
		expect(NUMERIC_CELL_CLASS).toBe("add-numeric")
	})
})

describe("deferred — a colour token, because those rows are ENABLED", () => {
	// The "Soon" rows are clickable and route to ComingSoon. WCAG's contrast
	// exemption covers DISABLED components only, so the label is bound by 4.5:1
	// and the icon, as a non-text indicator, by 3:1. Opacity could not be
	// asserted at all — it multiplies against whatever is behind it, so one value
	// drifts per surface. Hence colours.
	for (const mode of THEME_MODES) {
		const s = semantic[mode]
		const d = component[mode].deferred
		const surfaces = { surface: s.surface, body: s.body, surfaceSunken: s.surfaceSunken }

		for (const [name, bg] of Object.entries(surfaces)) {
			it(`${mode}: deferred LABEL clears AA on ${name}`, () => {
				const r = ratio(d.label, bg)
				expect(r, `${d.label} on ${bg} → ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT)
			})

			it(`${mode}: deferred ICON clears the non-text minimum on ${name}`, () => {
				const r = ratio(d.icon, bg)
				expect(r, `${d.icon} on ${bg} → ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NON_TEXT)
			})
		}

		it(`${mode}: the badge is legible — it carries the deferral by itself`, () => {
			expect(ratio(d.badgeText, d.badgeSurface)).toBeGreaterThanOrEqual(AA_TEXT)
		})

		it(`${mode}: the badge border can actually delimit the badge`, () => {
			// Aleppo Stone is only 1.46:1 against the badge fill, so `border` would
			// be invisible here. This must be `borderStrong`.
			expect(d.badgeBorder).toBe(s.borderStrong)
			expect(ratio(d.badgeBorder, d.badgeSurface)).toBeGreaterThanOrEqual(AA_NON_TEXT)
		})

		it(`${mode}: the label is NOT dimmed below textMuted`, () => {
			expect(d.label).toBe(s.textMuted)
		})

		it(`${mode}: the icon recedes but stays above the label's floor`, () => {
			expect(ratio(d.icon, s.surface)).toBeLessThan(ratio(d.label, s.surface))
		})
	}

	// `disabled` genuinely is exempt, and it stays an opacity. The distinction is
	// the whole point — collapsing them is what caused the original defect.
	it("`disabled` remains an opacity token and `deferred` is not one", () => {
		expect(state.disabled.opacity).toBe("0.45")
		expect(state.disabled.cursor).toBe("not-allowed")
		expect(state).not.toHaveProperty("deferred")
		for (const mode of THEME_MODES) {
			for (const v of Object.values(component[mode].deferred)) {
				expect(v, "every deferred value must be a colour, never an opacity").toMatch(/^(?:#|rgba?\()/i)
			}
		}
	})
})

describe("service pillars are assets, never tokens", () => {
	// Core is Aleppo Economic Orange. In this dashboard orange means `danger` and
	// nothing else — that is what makes destructive actions unmistakable. If
	// pillar colour entered chrome, orange would mean both "Core service" and
	// "this will delete something", and the guarantee collapses.
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

	it("names all 13 services across three pillars", () => {
		const all = Object.values(PILLARS).flatMap(p => [...p.services])
		expect(all).toHaveLength(13)
		expect(new Set(all).size).toBe(13)
		expect(PILLARS.core.services).toHaveLength(6)
		expect(PILLARS.experience.services).toHaveLength(3)
		expect(PILLARS.ecosystem.services).toHaveLength(4)
	})

	// Confirmed from the brand's own artwork: ADD extension 3.pdf p5 renders the
	// Core six — including accelerate and incubate — in orange.
	it("puts accelerate and incubate in Core, therefore orange", () => {
		expect(PILLARS.core.services).toContain("accelerate")
		expect(PILLARS.core.services).toContain("incubate")
		expect(PILLARS.core.color).toBe(brand.aleppoEconomicOrange)
	})

	for (const mode of THEME_MODES) {
		it(`${mode}: no pillar colour is a semantic token value`, () => {
			const used = collect(semantic[mode])
			for (const c of PILLAR_COLORS) {
				expect(used, `${c} must not be a semantic token`).not.toContain(c.toUpperCase())
			}
		})

		it(`${mode}: no pillar colour is a component token value`, () => {
			const used = collect(component[mode])
			for (const c of PILLAR_COLORS) {
				expect(used, `${c} must not be a component token`).not.toContain(c.toUpperCase())
			}
		})
	}

	// Guideline p.23: "Do not alter the icon portion of the logo." Flattening the
	// lockups to currentColor would both destroy pillar identity and alter the
	// logo. Pillar colour reaches a screen only as unmodified artwork.
	it("declares pillar colours as artwork, distinct from the chart ramp", () => {
		expect(PILLAR_COLORS).toHaveLength(3)
		// Smart Olive is a pillar colour AND a chart series (extra2). That is fine:
		// the constraint is on SEMANTIC and COMPONENT tokens, which the tests above
		// cover. Recorded so the overlap is not mistaken for a violation.
		expect(PILLAR_COLORS).toContain(brand.smartOlive)
	})
})

describe("chart ramp keeps p.15 disengaged", () => {
	// Antique Copper as `extra3` is sound only while no series beside it is
	// orange-red. Copper + an orange-red in one chart is two strong warm accents
	// in one layout — the exact pairing p.15 forbids.
	const RAMP_KEYS = ["extra1", "extra2", "extra3", "extra4"] as const
	const isOrangeRed = (hex: string) => {
		const { h, s } = colord(hex).toHsl()
		return (h <= 20 || h >= 340) && s >= 40
	}

	it("contains Antique Copper only as a chart series", () => {
		expect(runtimeTokens.colors.light.extra3.toUpperCase()).toBe(brand.antiqueCopper.toUpperCase())
	})

	it("places no orange-red series alongside Antique Copper", () => {
		const ramp = RAMP_KEYS.map(k => runtimeTokens.colors.light[k])
		const hasCopper = ramp.some(c => c.toUpperCase() === brand.antiqueCopper.toUpperCase())
		if (!hasCopper) return

		const offenders = ramp.filter(c => isOrangeRed(c))
		expect(
			offenders,
			`orange-red series in the same set as Antique Copper — p.15 violation. Drop copper from the ramp or move the series.`
		).toEqual([])
	})

	it("keeps `danger` out of the chart ramp", () => {
		const ramp = RAMP_KEYS.map(k => runtimeTokens.colors.light[k].toUpperCase())
		expect(ramp).not.toContain(semantic.light.danger.base.toUpperCase())
		expect(ramp).not.toContain(brand.aleppoEconomicOrange.toUpperCase())
	})
})

describe("mode dimension", () => {
	it("dark mode is not claimed while it is out of scope", () => {
		expect(DARK_MODE_SUPPORTED).toBe(false)
		expect([...THEME_MODES]).toEqual(["light"])
		expect(Object.keys(semantic)).toEqual([...THEME_MODES])
		expect(Object.keys(component)).toEqual([...THEME_MODES])
	})

	// If the OS prefers dark, naive-ui would otherwise render its own darkTheme
	// defaults under our light-only overrides. Mirroring the palette means no
	// configuration can produce a half-themed screen.
	it("the runtime palette cannot render a half-themed dark mode", () => {
		expect(runtimeTokens.colors.dark).toEqual(runtimeTokens.colors.light)
	})
})

describe("generated runtime tokens track the source", () => {
	it("carries the ADD palette, not Pinx's", () => {
		expect(runtimeTokens.colors.light.primary).toBe(semantic.light.primary.base)
		expect(runtimeTokens.colors.light.error).toBe(semantic.light.danger.base)
		expect(runtimeTokens.colors.light.warning).toBe(semantic.light.warning.base)
		expect(runtimeTokens.colors.light.bodyBackground).toBe(semantic.light.body)
		expect(runtimeTokens.colors.light.text).toBe(semantic.light.textPrimary)
	})

	it("names both brand faces through the single swap points", () => {
		expect(runtimeTokens.fontFamily.default).toContain("var(--font-family-latin)")
		expect(runtimeTokens.fontFamily.default).toContain("var(--font-family-arabic)")
	})

	// A stale generated file is the one failure mode this whole architecture is
	// meant to prevent, so it fails a test rather than shipping.
	it("is not stale — run `npm run tokens` if this fails", () => {
		expect(runtimeTokens.borderRadius.default).toBe("8px")
		expect(runtimeTokens.colors.light.border).toBe(semantic.light.border)
	})
})

describe("typography — the scale is per-language, not shared", () => {
	it("defines every step for both languages", () => {
		const steps = Object.keys(typeScale.en)
		for (const lang of SUPPORTED_LANGS) {
			expect(Object.keys(typeScale[lang]).sort(), `${lang} steps`).toEqual(steps.sort())
		}
	})

	// Arabic needs vertical room Latin does not: ascenders, descenders and
	// diacritics. A shared scale is what makes Arabic look cramped.
	it("arabic runs larger and looser than Latin at every step", () => {
		for (const step of Object.keys(typeScale.en)) {
			const en = typeScale.en[step]
			const ar = typeScale.ar[step]
			expect(Number.parseFloat(ar.fontSize), `ar/${step} size`).toBeGreaterThan(Number.parseFloat(en.fontSize))
			expect(Number.parseFloat(ar.lineHeight), `ar/${step} leading`).toBeGreaterThan(Number.parseFloat(en.lineHeight))
		}
	})
})
