/**
 * ADD OS — THE design token source of truth.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  This file is hand-authored. Everything downstream is GENERATED from it. ║
 * ║  Run `npm run tokens` after any change here.                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 *   src/add-os/theme/tokens.ts            ← you are here. The only file a human edits.
 *      │  npm run tokens  →  scripts/build-tokens.js
 *      ├──▶ src/add-os/theme/tokens.json          W3C DTCG — neutral, canonical
 *      ├──▶ src/add-os/theme/tokens.generated.css CSS custom properties + Tailwind @theme
 *      ├──▶ src/add-os/theme/tokens.dart          Flutter / Dart consumer
 *      └──▶ figma-tokens.json                     Figma Tokens plugin consumer
 *              │  npm run design-tokens (pre-existing Pinx chain)
 *              ▼
 *           src/design-tokens.json  →  src/theme/index.ts  →  naive-ui + CSS vars
 *                                                                  └──▶ Tailwind
 *
 * ADD OS is not the only consumer. A Flutter member app, a Nuxt public site and a
 * reception kiosk read the same tokens, which is why the canonical artifact is
 * neutral DTCG rather than any one tool's format.
 *
 * ── THE THREE TIERS ARE STRICTLY SEPARATE ───────────────────────────────────
 *   Tier 1  `brand`      Literal Guideline values. Guideline names. NO semantics.
 *   Tier 2  `semantic`   Roles (primary, danger, …), keyed by MODE.
 *   Tier 3  `component`  Only what Tier 2 genuinely cannot express.
 *
 * A component must never reach past Tier 2. If a component needs a Tier 1 value
 * directly, the missing thing is a Tier 2 token.
 *
 * ── PROVENANCE IS TRACKED, NOT ASSUMED ──────────────────────────────────────
 * Every value that is not a verbatim Guideline colour is registered in
 * `DERIVATIONS` with its classification and the reason it exists:
 *
 *   "brand"     verbatim from the Brand Guideline
 *   "adjusted"  a brand colour, hue preserved, lightness moved for WCAG only
 *   "derived"   NOT a brand colour. Invented under an approved decision.
 *
 * Anyone can therefore answer "is this ADD's colour or ours?" without guessing.
 * See docs/brand/PHASE-0-AUDIT.md for the measurements behind every value.
 *
 * ── WHY THE HEX VALUES ARE LITERAL AND THE VARIANTS EXPLICIT ────────────────
 * naive-ui runs internal colour math (via `seemly`) to derive hover/pressed/
 * suppl from a base colour. Two consequences, both load-bearing:
 *
 *  1. Passing `var(--x)` into `themeOverrides` breaks that math SILENTLY — the
 *     string is not a colour it can parse. So tokens resolve to literal hex at
 *     build time, never to a CSS variable.
 *  2. Its derivation LIGHTENS on hover. On a light theme with white button text
 *     that drops every solid button below WCAG AA (primary 4.72 → 3.02). So every
 *     variant is declared EXPLICITLY here and nothing is left to derivation.
 *
 * The rule that makes the variants correct: **hover and pressed always move AWAY
 * from the text colour they carry.** Fills with white text darken; `warning`,
 * which carries dark text, lightens. Verified in `__tests__/tokens.spec.ts`.
 */

// ════════════════════════════════════════════════════════════════════════════
// TIER 1 — BRAND PRIMITIVES
// Verbatim from ADD Brand Guideline 2026, pp. 14–17. Guideline names.
// No semantic meaning at this tier. Never reference these from a component.
// ════════════════════════════════════════════════════════════════════════════

export const brand = {
	/** p.14 · Institutional strength, trust, structural backbone. Headlines + body text. */
	charcoalBackbone: "#43474F",
	/** p.14 · Clarity, accessibility. Primary backgrounds, UI surfaces and containers. */
	warmMist: "#E2DDDB",
	/** p.14 · Intelligent expansion, maturity. Secondary buttons, tags, chips. */
	smartOlive: "#809C66",
	/** p.14 · Calm growth, scalability. Supporting cards, infographics, charts. */
	softGrowthGreen: "#B8D098",
	/** p.15 · Decisiveness, measurable value. Call-to-action, key emphasis, signals. */
	aleppoEconomicOrange: "#DC4128",
	/** p.15 · Aleppo stone architecture — roots, resilience. Alternative backgrounds to white. */
	aleppoStone: "#CDC2AF",
	/** p.15 · Craftsmanship, trade. Luxury accents, fine detail, seals. */
	antiqueCopper: "#A97C57",
	/** p.15 · Depth, confidence. Dark backgrounds and sections; refined alternative to black. */
	levantDeepTeal: "#314550",
	/** p.16 · Movement, connectivity, active engagement. Hover/active states, activity indicators. */
	signalCyan: "#00BFDF",
	/** p.16 · Systemic intelligence, data flow — the Digital Ecosystem layer. Digital interfaces. */
	deepTeal: "#007F91"
} as const

export type BrandColor = keyof typeof brand

/**
 * Guideline-approved usage ratios (p.17). Not enforceable in code — recorded so
 * design review has a number to argue with instead of an impression.
 */
export const BRAND_RATIOS = {
	"structure (warmMist + charcoalBackbone)": 0.45,
	"growth (softGrowthGreen + smartOlive)": 0.25,
	"heritage & value (aleppoStone + aleppoEconomicOrange)": 0.2,
	"intelligence & interaction (antiqueCopper + levantDeepTeal + signalCyan + deepTeal)": 0.1
} as const

// ════════════════════════════════════════════════════════════════════════════
// PROVENANCE REGISTRY
// Every non-verbatim value, with its classification and justification.
// ════════════════════════════════════════════════════════════════════════════

export type Provenance = "brand" | "adjusted" | "derived"

export interface Derivation {
	value: string
	from: BrandColor | null
	provenance: Provenance
	/** How it was produced, and why it had to be. */
	note: string
}

export const DERIVATIONS: Record<string, Derivation> = {
	// ── adjusted: brand hue kept, lightness moved for contrast only ──────────
	successFill: {
		value: "#657C50",
		from: "smartOlive",
		provenance: "adjusted",
		note: "darken 0.105. Smart Olive carries white text at only 3.05:1; this reaches 4.61."
	},
	dangerFill: {
		value: "#D93D23",
		from: "aleppoEconomicOrange",
		provenance: "adjusted",
		note: "darken 0.015. Aleppo Economic Orange is 4.34:1 with white text — just under AA; this reaches 4.52."
	},

	// ── derived: NOT brand colours ───────────────────────────────────────────
	warningAmber: {
		value: "#E7B155",
		from: "aleppoStone",
		provenance: "derived",
		note:
			"DERIVED, approved 2026-08-03. Holds Aleppo Stone's exact hue (38°), saturate → 75%, lighten → 62%. " +
			"No brand colour can serve `warning`: Antique Copper collapses to ΔE 1.0 against `success` under " +
			"protanopia. Chosen for maximum L* separation (26.3 from success) because lightness survives all " +
			"three dichromacies where hue does not. Carries CHARCOAL text at 4.80:1."
	},
	warningText: {
		value: "#845A13",
		from: "aleppoStone",
		provenance: "derived",
		note: "warningAmber darkened 0.305 so warning text/icons clear AA on both white (6.08) and Warm Mist (4.51)."
	},
	surfaceWhite: {
		value: "#FFFFFF",
		from: null,
		provenance: "derived",
		note: 'Not in the palette, but the Guideline presumes it — Aleppo Stone is described as an "alternative background to white" (p.15). Cards sit on the Warm Mist body.'
	},
	textSecondary: {
		value: "#565B65",
		from: "charcoalBackbone",
		provenance: "derived",
		note: "Charcoal lighten 0.08. Clears AA on BOTH white (6.81) and Warm Mist (5.06) — cards sit on a Mist body, so both must pass."
	},
	textMuted: {
		value: "#5A606B",
		from: "charcoalBackbone",
		provenance: "derived",
		note:
			"Charcoal lighten 0.10 — the LAST step that still clears AA on Warm Mist (4.69). A conventionally faint " +
			"muted grey is impossible on this body colour. De-emphasis below this must come from weight and size, " +
			"never from further lightening."
	},
	borderStrong: {
		value: "#7F7B76",
		from: "charcoalBackbone",
		provenance: "derived",
		note:
			"DERIVED, approved 2026-08-03. Charcoal rotated onto the brand's warm axis (hue 34°), desaturated to 4%, " +
			"lightness set for WCAG 1.4.11: 4.20 on white, 3.12 on Warm Mist, 3.57 on the input fill. Warm-leaning " +
			"(r exceeds b by 9). Blending Aleppo Stone into Charcoal was rejected — they are near-complementary, so " +
			"the blend greys out rather than warming. Darkened Aleppo Stone (#8F7B59) was rejected by decision: a " +
			"saturated brown outline on every form field contradicts the brand's quiet-confidence voice."
	},
	inputFill: {
		value: "#EFECEB",
		from: "warmMist",
		provenance: "derived",
		note:
			"Warm Mist mixed 45% into white. Gives the field a fill of its own (1.17 vs a white card, 1.14 vs the " +
			"Mist body) so the border stops being the sole carrier of the affordance and can stay visually light."
	},
	surfaceSunken: {
		value: "#EDEAE8",
		from: "warmMist",
		provenance: "derived",
		note: "Warm Mist mixed 25% into white. Table headers and zebra striping — a step below the card, above the body."
	},
	deferredIcon: {
		value: "#727986",
		from: "charcoalBackbone",
		provenance: "derived",
		note:
			"Charcoal lighten 0.20. The icon on a 'Soon' nav row — the ONE element allowed to recede, and it recedes by " +
			"colour rather than opacity so a ratio can actually be asserted. Clears the 1.4.11 non-text minimum on every " +
			"surface it can appear on: 4.37 surface, 3.25 body, 3.65 sunken. Lighter steps were rejected — 0.22 leaves " +
			"only 3.03 on Warm Mist and 0.25 fails outright."
	}
} as const

// ════════════════════════════════════════════════════════════════════════════
// MODE DIMENSION
//
// Dark mode is OUT OF SCOPE for v1 (decision Q7, 2026-08-03). The QA matrix is
// already ar/en × RTL/LTR and Pinx's RTL support is documented beta, so the QA
// budget goes to bidirectional correctness rather than a second colour mode.
//
// The dimension exists anyway. Adding dark later means adding ONE key to
// `semantic` and `component` — data, not a refactor. Nothing downstream assumes
// a single mode: the generator iterates `THEME_MODES`.
//
// Until then: `naive-ui`'s `darkTheme` is deliberately NOT wired, and the theme
// switch is not shipped. A half-themed dark mode is worse than none.
// ════════════════════════════════════════════════════════════════════════════

export const THEME_MODES = ["light"] as const
export type ThemeMode = (typeof THEME_MODES)[number]

/** Reserved. Flip to `true` only when a full dark palette lands here. */
export const DARK_MODE_SUPPORTED = false

// ════════════════════════════════════════════════════════════════════════════
// TIER 2 — SEMANTIC TOKENS
// Named by ROLE. Mapped from Tier 1 / DERIVATIONS. This is what components use.
// ════════════════════════════════════════════════════════════════════════════

/** A fill plus every interaction state, and the text colour it is guaranteed to carry. */
export interface InteractiveColor {
	base: string
	hover: string
	pressed: string
	/** naive-ui's supplementary slot. */
	suppl: string
	/** The ONLY text colour approved on this fill. Never pick one at a call site. */
	on: string
	/** Same hue, dark enough to be text on white AND on Warm Mist. For text/icons, not fills. */
	text: string
}

export interface SemanticTokens {
	// ── interaction ────────────────────────────────────────────────────────
	primary: InteractiveColor
	success: InteractiveColor
	warning: InteractiveColor
	danger: InteractiveColor
	/**
	 * Shares primary's hue by decision Q3. Signal Cyan darkened to meet AA lands
	 * ΔE 2.7 from primary — the same colour to everyone, in every vision type.
	 * `info` is therefore distinguished by ICON AND LABEL, never by colour.
	 */
	info: InteractiveColor

	// ── surfaces, lightest-sitting-on-darkest last ─────────────────────────
	/** Page background. */
	body: string
	/** Cards, panels, table bodies — sits on `body`. */
	surface: string
	/** Popovers, modals, dropdowns — sits on `surface`. Same colour; elevation does the work. */
	surfaceRaised: string
	/** Table headers, zebra striping — a step DOWN from `surface`. */
	surfaceSunken: string
	/** Form field fill. Offset from both `surface` and `body`. */
	inputFill: string

	// ── borders ────────────────────────────────────────────────────────────
	/** Decorative only: dividers, card edges. No 1.4.11 obligation. */
	border: string
	/** Functional boundaries: input outlines, anything where the border is the sole affordance. 3:1 binding. */
	borderStrong: string

	// ── text ───────────────────────────────────────────────────────────────
	textPrimary: string
	textSecondary: string
	/** Floor for de-emphasis. Below this, use weight and size — not lightness. */
	textMuted: string
	/** Text on a dark brand surface (Levant Deep Teal sections, headers). */
	textOnDark: string

	// ── focus ──────────────────────────────────────────────────────────────
	/**
	 * Two-layer ring. `focusRingInner` sits against the component, `focusRingOuter`
	 * against the page. At least one band always clears 3:1 on every surface in
	 * the system — including the primary button, where a primary-derived ring
	 * would have vanished (inner 2.11, outer 4.72).
	 */
	focusRingInner: string
	focusRingOuter: string
}

const light: SemanticTokens = {
	primary: {
		base: brand.deepTeal, //           #007F91 · white text 4.72
		hover: "#006977", //               darken 0.05 · 6.38
		pressed: "#00525E", //             darken 0.10 · 8.86
		suppl: "#006977",
		on: DERIVATIONS.surfaceWhite.value,
		text: "#006B7A" //                 6.20 on white · 4.60 on Warm Mist
	},
	success: {
		base: DERIVATIONS.successFill.value, // #657C50 · white text 4.61
		hover: "#586C46", //               5.75
		pressed: "#4C5D3C", //             7.14
		suppl: "#586C46",
		on: DERIVATIONS.surfaceWhite.value,
		text: "#556843" //                 6.09 on white · 4.52 on Warm Mist
	},
	warning: {
		// The ONLY fill that carries dark text, so hover/pressed LIGHTEN.
		base: DERIVATIONS.warningAmber.value, // #E7B155 · charcoal text 4.80
		hover: "#EABB6B", //               lighten 0.05 · 5.24
		pressed: "#EDC682", //             lighten 0.10 · 5.77
		suppl: "#EABB6B",
		on: brand.charcoalBackbone,
		text: DERIVATIONS.warningText.value // #845A13 · 6.08 white · 4.51 Mist
	},
	danger: {
		base: DERIVATIONS.dangerFill.value, // #D93D23 · white text 4.52
		hover: "#C3371F", //               5.40
		pressed: "#AD311C", //             6.49
		suppl: "#C3371F",
		on: DERIVATIONS.surfaceWhite.value,
		text: "#B4321D" //                 6.14 on white · 4.56 on Warm Mist
	},
	info: {
		base: brand.deepTeal, //           = primary, by decision Q3
		hover: "#006977",
		pressed: "#00525E",
		suppl: "#006977",
		on: DERIVATIONS.surfaceWhite.value,
		text: "#006B7A"
	},

	body: brand.warmMist,
	surface: DERIVATIONS.surfaceWhite.value,
	surfaceRaised: DERIVATIONS.surfaceWhite.value,
	surfaceSunken: DERIVATIONS.surfaceSunken.value,
	inputFill: DERIVATIONS.inputFill.value,

	border: brand.aleppoStone,
	borderStrong: DERIVATIONS.borderStrong.value,

	textPrimary: brand.charcoalBackbone, // 9.32 on white · 6.92 on Warm Mist
	textSecondary: DERIVATIONS.textSecondary.value,
	textMuted: DERIVATIONS.textMuted.value,
	textOnDark: brand.warmMist, //          7.43 on Levant Deep Teal

	// Levant Deep Teal is independent of primary — deliberately, so the ring
	// never disappears into the component it is marking.
	focusRingInner: brand.levantDeepTeal,
	focusRingOuter: DERIVATIONS.surfaceWhite.value
}

export const semantic: Record<ThemeMode, SemanticTokens> = { light }

// ════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
//
// Two mandated faces (Guideline p.19): Poppins for Latin, and — by approved
// deviation — Noto Sans Arabic for Arabic. The Guideline names "Noto IKEA
// Arabic", IKEA's proprietary corporate typeface, which is not licensable for
// third-party embedding.
//
// Noto Sans Arabic is the MINIMUM-DISTANCE substitute: Noto IKEA is itself a Noto
// derivative, so this is the closest legitimately licensable face to what the
// Guideline actually names. IBM Plex Sans Arabic was implemented first and then
// reversed — it would have paired type with the Carbon icon set inside a single
// design system, but fidelity to the mandated family outweighed that coherence.
// See docs/brand/PHASE-0-AUDIT.md §9 and docs/brand/GUIDELINE-FEEDBACK.md §1.
//
// ── Why ONE stack serves both languages ─────────────────────────────────────
// Poppins carries no Arabic glyphs, so an Arabic character falls through to
// Noto Sans Arabic automatically, per glyph. Latin therefore always renders in
// Poppins and Arabic always in Noto Sans Arabic — including mixed strings
// ("قاعة Business Café") — with no `:lang()` rule and no runtime switch.
//
// ⚠️ Poppins must LEAD the stack. Unlike Poppins, Noto Sans Arabic ships its own
// Latin glyphs, so reversing the order would silently cost us the mandated Latin
// face. Only Noto's `arabic` subset is imported, for the same reason.
//
// SIZE is the part that must be per-language: Arabic needs slightly more size
// and noticeably looser leading than Latin at the same nominal step.
// ════════════════════════════════════════════════════════════════════════════

export const SUPPORTED_LANGS = ["ar", "en"] as const
export type Lang = (typeof SUPPORTED_LANGS)[number]

export const fontFamily = {
	/**
	 * Both faces are named through CSS variables so `--font-family-arabic` stays
	 * the single swap point for the Arabic face, per the architecture in
	 * `src/assets/scss/fonts.scss`.
	 */
	ui: "var(--font-family-latin), var(--font-family-arabic), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
	display:
		"var(--font-family-latin), var(--font-family-arabic), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
	/**
	 * NUMERALS AND DATA ONLY — money and quantity columns. Never the body face.
	 *
	 * ── Why this token has to exist ─────────────────────────────────────────
	 * Poppins has NO tabular figures. Measured from the shipped woff2 with
	 * fontTools on 2026-08-03: no `tnum` feature — in fact zero GSUB/GPOS
	 * features in the Fontsource latin subset — and digit advance widths
	 * spanning 320–635 units on a 1000 unit em. That is a 31.5%-of-em spread,
	 * with "1" at 320 and "6" at 635.
	 *
	 * Two consequences, both load-bearing:
	 *   · `font-variant-numeric: tabular-nums` is a SILENT NO-OP on Poppins —
	 *     there is no `tnum` feature for it to activate.
	 *   · A money column in Poppins is visibly ragged, and the raggedness
	 *     depends on which digits the amounts happen to contain.
	 *
	 * Ragged decimal columns in a financial table are a defect, so digits are
	 * routed to a face whose figures are tabular BY DEFAULT.
	 *
	 * ── Why Noto Sans Arabic's Latin subset ────────────────────────────────
	 * All ten of its Latin digits measure exactly 572 units — one distinct
	 * width, so no `tnum` is needed. It is already an installed dependency
	 * (it is the Arabic face), so the numerals face costs no new package.
	 * Bonus: digits inside Arabic text are then optically matched to the
	 * Arabic face rather than running large in geometric Poppins.
	 *
	 * Poppins keeps its mandated Latin display role untouched.
	 */
	numeric: "'Noto Sans Arabic', 'JetBrains Mono', SFMono-Regular, Consolas, monospace",
	/**
	 * Non-brand utility face for code. The Guideline specifies no monospace.
	 * Also uniform at 600 units, hence its place in the numeric fallback chain.
	 */
	mono: "'JetBrains Mono', SFMono-Regular, Menlo, Consolas, Courier, monospace"
} as const

/**
 * Faces whose Latin digits are TABULAR BY DEFAULT — every digit the same
 * advance width, so columns align with no `tnum` feature required.
 *
 * Measured directly from the shipped `woff2` files, not assumed. Reproduce with:
 *
 *   pip install "fonttools[woff]"
 *   python - <<'EOF'
 *   from fontTools.ttLib import TTFont
 *   f = TTFont("node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-latin-400-normal.woff2")
 *   cmap, hmtx = f.getBestCmap(), f["hmtx"]
 *   print({d: hmtx[cmap[ord(d)]][0] for d in "0123456789"})
 *   EOF
 *
 * `fontFamily.numeric` MUST lead with one of these. Guarded by test — pointing
 * numerals at the body face is the realistic regression, and it is invisible
 * until someone reads a column of money.
 */
export const VERIFIED_TABULAR_FACES: Record<string, { digitWidth: number; unitsPerEm: number; measured: string }> = {
	"Noto Sans Arabic": { digitWidth: 572, unitsPerEm: 1000, measured: "2026-08-03" },
	"JetBrains Mono": { digitWidth: 600, unitsPerEm: 1000, measured: "2026-08-03" }
}

/**
 * Faces measured and found PROPORTIONAL. Recorded so the finding is not re-litigated.
 * These must never appear in `fontFamily.numeric`.
 */
export const PROPORTIONAL_FIGURE_FACES: Record<string, { spreadUnits: number; unitsPerEm: number; hasTnum: boolean }> = {
	Poppins: { spreadUnits: 315, unitsPerEm: 1000, hasTnum: false }
}

/**
 * Class applied to any cell rendering a formatted number, amount, or quantity.
 * Defined in `theme-overrides/_numeric.scss`; it sets `fontFamily.numeric`.
 *
 * Every numeric string in ADD OS comes from `add-os/utils/format/`. This is the
 * presentation half of that contract: the formatter decides the digits, this
 * decides the face that draws them.
 *
 * Direction is deliberately NOT set here. `formatCurrency` relies on the bidi
 * algorithm to place "1,234 ل.س." correctly, and forcing `direction: ltr` would
 * move the symbol. Flagged for visual confirmation in Phase 5.
 */
export const NUMERIC_CELL_CLASS = "add-numeric"

/**
 * The Guideline specifies Regular and Bold only (p.19). 500 and 600 are
 * intermediate weights of the SAME mandated family, not a new typeface — the UI
 * needs them for `fontWeightStrong` and card titles.
 */
export const fontWeight = {
	regular: "400",
	medium: "500",
	strong: "600",
	bold: "700"
} as const

export interface TypeStep {
	fontSize: string
	lineHeight: string
}

/**
 * Per-language type scale. Arabic runs one step larger and materially looser:
 * the script's ascenders, descenders and diacritics need vertical room that
 * Latin does not, and 1.25 leading — the Pinx default — is genuinely too tight
 * for it.
 *
 * Latin sizes are held at the values the app already shipped, so Phase 1 does
 * not reflow every screen. Density is tuned in Phase 3 with visual QA, where
 * Poppins' larger apparent size at a given px can be judged in a browser.
 */
export const typeScale: Record<Lang, Record<string, TypeStep>> = {
	en: {
		caption: { fontSize: "12px", lineHeight: "1.4" },
		bodySm: { fontSize: "14px", lineHeight: "1.45" },
		body: { fontSize: "16px", lineHeight: "1.5" },
		lead: { fontSize: "18px", lineHeight: "1.5" },
		h6: { fontSize: "12px", lineHeight: "1.3" },
		h5: { fontSize: "14px", lineHeight: "1.3" },
		h4: { fontSize: "18px", lineHeight: "1.3" },
		h3: { fontSize: "22px", lineHeight: "1.28" },
		h2: { fontSize: "26px", lineHeight: "1.26" },
		h1: { fontSize: "30px", lineHeight: "1.25" }
	},
	ar: {
		caption: { fontSize: "13px", lineHeight: "1.6" },
		bodySm: { fontSize: "15px", lineHeight: "1.65" },
		body: { fontSize: "17px", lineHeight: "1.7" },
		lead: { fontSize: "19px", lineHeight: "1.65" },
		h6: { fontSize: "13px", lineHeight: "1.5" },
		h5: { fontSize: "15px", lineHeight: "1.5" },
		h4: { fontSize: "19px", lineHeight: "1.45" },
		h3: { fontSize: "23px", lineHeight: "1.4" },
		h2: { fontSize: "27px", lineHeight: "1.38" },
		h1: { fontSize: "31px", lineHeight: "1.35" }
	}
}

// ════════════════════════════════════════════════════════════════════════════
// SPACE, RADIUS, BORDER, ELEVATION
// The Guideline defines no scale for any of these. Pinx's values are kept where
// they are sound, so Phase 1 changes identity rather than layout.
// ════════════════════════════════════════════════════════════════════════════

export const space = {
	"0": "0px",
	"1": "2px",
	"2": "4px",
	"3": "6px",
	"4": "8px",
	"5": "12px",
	"6": "16px",
	"7": "20px",
	"8": "24px",
	"9": "32px",
	"10": "40px"
} as const

export const radius = {
	small: "4px",
	default: "8px",
	large: "12px",
	pill: "999px"
} as const

export const borderWidth = {
	hairline: "1px",
	/** Status surfaces and focus bands. */
	emphasis: "2px"
} as const

/**
 * `surfaceRaised` is the same colour as `surface`, so elevation — not tint —
 * separates a popover from the card beneath it. Warm-tinted shadow: a neutral
 * black shadow reads grey and cold against Warm Mist.
 */
export const elevation = {
	none: "none",
	raised: "0 1px 2px rgba(67, 71, 79, 0.06), 0 2px 8px rgba(67, 71, 79, 0.08)",
	overlay: "0 4px 12px rgba(67, 71, 79, 0.10), 0 12px 32px rgba(67, 71, 79, 0.12)"
} as const

// ════════════════════════════════════════════════════════════════════════════
// TIER 3 — COMPONENT TOKENS
// Only what Tier 2 genuinely cannot express.
// ════════════════════════════════════════════════════════════════════════════

/**
 * `disabled` — a genuinely inoperable control. Not clickable, cursor
 * `not-allowed`, no hover response.
 *
 * WCAG's contrast exemption covers disabled components, so this one is tuned for
 * intent rather than to a ratio. At 0.45 the text lands near 2.4:1 on white,
 * clearly separated from `textMuted` at 6.32 — that separation is what makes
 * disabled legible AS disabled rather than as low-emphasis text.
 *
 * The "Soon" nav treatment is NOT here. See `ComponentTokens.deferred` — it is a
 * colour token, because those rows are enabled.
 */
export const state = {
	disabled: {
		opacity: "0.45",
		cursor: "not-allowed"
	}
} as const

export interface ComponentTokens {
	/** Sidebar. `background` differs from `surface`: the rail should read as chrome, not content. */
	sidebar: {
		background: string
		itemActiveBackground: string
		itemActiveText: string
		itemHoverBackground: string
	}
	/**
	 * The "Soon" treatment for routed-but-unbuilt sections. **Not `disabled`.**
	 *
	 * ── Why this is a COLOUR token and not an opacity ──────────────────────
	 * These rows are ENABLED: they are clickable and route to the ComingSoon
	 * page, and they answer hover. WCAG's contrast exemption covers *disabled*
	 * components only, so an enabled row's label is bound by 4.5:1 and its
	 * non-text indicator by 3:1. The earlier 0.55 opacity landed the label near
	 * 3.0:1 — it applied disabled treatment to something that is not disabled.
	 *
	 * Second, independent reason: opacity multiplies against whatever is behind
	 * it, so one token drifts per surface and NO ratio can be asserted. A colour
	 * can be measured on every surface it may appear on. That is why every value
	 * below is a colour.
	 *
	 * The badge carries the deferral by itself. It was always the explanation for
	 * the dimming, so it is now the whole signal — the label stays fully legible.
	 * The icon is the only element allowed to recede, and it does so by colour,
	 * holding ≥3:1 as a non-text indicator.
	 */
	deferred: {
		/** Full `textMuted`. No opacity. 6.32 surface · 4.69 body · 5.28 sunken. */
		label: string
		/** Recedes by colour, not opacity. 4.37 · 3.25 · 3.65 — clears 3:1 everywhere. */
		icon: string
		/** Confirms the row is alive. Absence of hover is what reads as broken. */
		hoverBackground: string
		badgeSurface: string
		badgeText: string
		/** 1px, per the binding status-surface rule. `borderStrong`, not `border` — Aleppo Stone is only 1.46:1 on the badge fill. */
		badgeBorder: string
	}
	/** Status surfaces. Every one carries a 1px border — see the binding rules. */
	status: {
		borderWidth: string
	}
	table: {
		headerBackground: string
		rowStripeBackground: string
		borderColor: string
		/** Money and quantity columns. Poppins has no tabular figures — see `fontFamily.numeric`. */
		numericFontFamily: string
	}
}

const componentLight: ComponentTokens = {
	sidebar: {
		background: light.surface,
		itemActiveBackground: "rgba(0, 127, 145, 0.10)",
		itemActiveText: light.primary.text,
		itemHoverBackground: "rgba(67, 71, 79, 0.05)"
	},
	deferred: {
		label: light.textMuted,
		icon: DERIVATIONS.deferredIcon.value,
		hoverBackground: "rgba(67, 71, 79, 0.05)",
		badgeSurface: light.surfaceSunken,
		badgeText: light.textSecondary,
		badgeBorder: light.borderStrong
	},
	status: {
		borderWidth: borderWidth.hairline
	},
	table: {
		headerBackground: light.surfaceSunken,
		rowStripeBackground: light.surfaceSunken,
		borderColor: light.border,
		numericFontFamily: fontFamily.numeric
	}
}

export const component: Record<ThemeMode, ComponentTokens> = { light: componentLight }

// ════════════════════════════════════════════════════════════════════════════
// CONVENIENCE
// ════════════════════════════════════════════════════════════════════════════

export const DEFAULT_MODE: ThemeMode = "light"

export function tokensFor(mode: ThemeMode = DEFAULT_MODE) {
	return { semantic: semantic[mode], component: component[mode] }
}

/**
 * Every status role, with the icon it MUST ship alongside.
 *
 * Not decoration. `info` shares primary's hue, and `warning` sits at ΔE 21 from
 * `danger` under deuteranopia — the tightest pair in the system. Colour is
 * therefore never the sole channel: icon and text label carry the meaning and
 * colour reinforces it. All four names are bundled locally by `npm run icons`.
 */
export const STATUS_ICONS = {
	success: "carbon:checkmark-filled",
	warning: "carbon:warning-alt-filled",
	danger: "carbon:error-filled",
	info: "carbon:information-filled"
} as const

export type StatusRole = keyof typeof STATUS_ICONS

// ════════════════════════════════════════════════════════════════════════════
// SERVICE PILLARS — ASSETS, NEVER TOKENS
//
// The 13 service lockups carry pillar colour baked in as literal hex. They are
// ARTWORK. This block exists so tests can assert what must never happen, not so
// components can consume it.
//
// ── The constraint, and why it is absolute ──────────────────────────────────
// Core is Aleppo Economic Orange. In this dashboard orange means `danger`, and
// nothing else — that is what makes destructive actions unmistakable (see the
// audit §3.3). If pillar colour entered dashboard chrome, orange would mean both
// "Core service" and "this will delete something", and the guarantee collapses.
//
// So: pillar colour reaches a screen ONLY as unmodified lockup artwork. Where a
// dashboard screen needs service identity, it carries it with an icon or a
// label — never with colour.
//
// ── And the lockups are never recoloured ────────────────────────────────────
// Flattening them to `currentColor` would destroy pillar identity AND constitute
// altering the logo, which Guideline p.23 explicitly forbids: "Do not alter the
// icon portion of the logo."
//
// Pillar membership is confirmed by the brand's own artwork — `ADD extension
// 3.pdf` p5 renders the Core six in orange. See docs/brand/GUIDELINE-FEEDBACK.md §8.
// ════════════════════════════════════════════════════════════════════════════

export const PILLARS = {
	core: {
		color: brand.aleppoEconomicOrange,
		services: ["address", "business", "co-space", "rooms", "accelerate", "incubate"]
	},
	experience: {
		color: brand.signalCyan,
		services: ["business-cafe", "club", "events"]
	},
	ecosystem: {
		color: brand.smartOlive,
		services: ["partners", "community", "members", "place"]
	}
} as const

export type Pillar = keyof typeof PILLARS

/** Every pillar hex. No semantic or component token may equal any of these. */
export const PILLAR_COLORS: readonly string[] = Object.values(PILLARS).map(p => p.color)
