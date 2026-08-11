# Phase 0 — ADD OS Brand Audit & Extraction Report

**Date:** 2026-08-03
**Status:** awaiting approval — no code written
**Authoritative source:** `info/ADD Brand/ADD 02- Brand Guideline 2026.pdf` (23 pp.)

---

## 0. Source inventory — what exists and what does not

| Document | Status |
|---|---|
| `ADD 02- Brand Guideline 2026.pdf` | ✅ Read in full. Text-extracted. **The only authoritative source.** |
| `LOGO TYPE.pdf` | ✅ Vector, 71 paths, 0 raster. Fill `#444850`. |
| `ADD .pdf` / `ADD 2.pdf` | ✅ Vector, 2 paths each. Logotype in `#E2DDDB` / `#424850`. |
| `ADD extension 3.pdf` | ✅ Vector, 7 pp. Service-extension lockups (address, business, co-space, rooms, accelerate, incubate, Business Café, Club, Events, partners, community, members, place). |
| `ADD-01.png` / `ADD2-01.png` | ✅ Raster 3508×1424, logotype only. Lower value than the PDFs. |
| `ADD - Brand Guideline 2026 (2).indd` | ⚠️ InDesign source — not machine-readable here. |
| **Brand Strategy** | ❌ **Not present.** Named in the brief; not in `info/ADD Brand/`. |
| **ADD Persona** | ❌ **Not present.** |
| **ADD Philosophy & Structure** | ❌ **Not present.** |
| `docs/brand/` | ❌ Did not exist. Created by this report. |

Three of the four brand documents named in the brief are missing. The Guideline
alone covers color, typography, logo and clear-space — enough for Phases 1–4.
The missing documents matter for *voice* (Phase 3 empty/error copy) and for the
persona behind density and tone decisions, not for tokens.

**Note on PDF-extracted fills.** Artwork fills round to `#444850`, `#424850`,
`#09BFDF`, `#7F9C67` — CMYK→RGB conversion artifacts of the placed art. The
stated HEX values on Guideline pp. 14–17 are authoritative and are what this
report uses.

---

## 1. Tier 1 — Brand primitives (verbatim from the Guideline)

Ten colors, in four Guideline groups. Names are the Guideline's own.

| # | Guideline name | Token name | HEX | Guideline role | p. |
|---|---|---|---|---|---|
| 1 | Charcoal Backbone | `brand.charcoalBackbone` | `#43474F` | Institutional strength, trust, structural backbone. Headlines + body text, core icons, separators. | 14, 17 |
| 2 | Warm Mist | `brand.warmMist` | `#E2DDDB` | Clarity, accessibility, removal of barriers. **Primary backgrounds, UI surfaces and containers.** | 14, 17 |
| 3 | Smart Olive | `brand.smartOlive` | `#809C66` | Intelligent expansion, maturity, sustainable decision-making. **Secondary buttons**, system indicators (tags, chips), UI accents. | 14, 17 |
| 4 | Soft Growth Green | `brand.softGrowthGreen` | `#B8D098` | Calm growth, scalability, early value transformation. Supporting cards, infographics. | 14, 17 |
| 5 | Aleppo Economic Orange | `brand.aleppoEconomicOrange` | `#DC4128` | Decisiveness, measurable value, economic outcome. **Call-to-action, key emphasis, important signals.** | 15, 17 |
| 6 | Aleppo Stone | `brand.aleppoStone` | `#CDC2AF` | Aleppo stone architecture — roots, resilience, continuity. Alternative backgrounds **to white**. | 15, 17 |
| 7 | Antique Copper | `brand.antiqueCopper` | `#A97C57` | Craftsmanship, trade, real economic value. Luxury accents, fine detail, seals. | 15, 17 |
| 8 | Levant Deep Teal | `brand.levantDeepTeal` | `#314550` | Depth, confidence, cultural sophistication. **Dark backgrounds and sections**; a refined alternative to pure black. | 15, 17 |
| 9 | Signal Cyan | `brand.signalCyan` | `#00BFDF` | Movement, connectivity, active engagement. **Hover and active states**, activity indicators. | 16, 17 |
| 10 | Deep Teal | `brand.deepTeal` | `#007F91` | Systemic intelligence, data flow, structured innovation — the **Digital Ecosystem layer**. **Digital interfaces, interactive elements**, data visualization. | 16, 17 |

**Approved usage ratios (p. 17):** 45 % Structure (`#E2DDDB` + `#43474F`) ·
25 % Growth (`#B8D098` + `#809C66`) · 20 % Heritage & Value (`#CDC2AF` +
`#DC4128`) · 10 % Intelligence & Interaction (`#A97C57` + `#314550` + `#00BFDF`
+ `#007F91`).

**Strict rule (p. 15):** *"Do not use both Antique Copper and Aleppo Spice as
strong accents in the same layout. Choose one primary accent per application."*
→ See Open Question **Q5**: "Aleppo Spice" is named nowhere else in the
Guideline and has no HEX.

### What the Guideline does NOT provide

| Missing | Consequence |
|---|---|
| `success` / `warning` / `error` / `info` state colors | Must be mapped from decorative colors, or derived. |
| Any amber/yellow | **No brand color can serve `warning`.** See §3.2. |
| Mid-tone neutrals (for `textSecondary`, `textMuted`) | Must be derived from Charcoal Backbone. |
| More than one dark background | Dark mode needs ~4 surface levels; brand gives one (`#314550`). |
| Spacing scale, radii, elevation/shadow, type sizes | Must be derived or kept from Pinx. |
| Monospace face | JetBrains Mono already installed; non-brand utility face. |

---

## 2. Contrast measurements

Computed with the project's own `colord` (already a dependency) — WCAG 2.1
relative-luminance ratios. Not estimates.

### 2.1 Primitives — luminance and contrast

| Token | HEX | L | vs `#FFF` | vs Warm Mist | vs Charcoal |
|---|---|---|---|---|---|
| charcoalBackbone | `#43474F` | 0.060 | **9.32** | **6.92** | 1.00 |
| warmMist | `#E2DDDB` | 0.730 | 1.34 | 1.00 | 6.92 |
| smartOlive | `#809C66` | 0.290 | 3.05 | 2.27 | 3.04 |
| softGrowthGreen | `#B8D098` | 0.580 | 1.67 | 1.24 | **5.55** |
| aleppoEconomicOrange | `#DC4128` | 0.190 | 4.34 | 3.22 | 2.14 |
| aleppoStone | `#CDC2AF` | 0.550 | 1.76 | 1.30 | **5.29** |
| antiqueCopper | `#A97C57` | 0.240 | 3.67 | 2.73 | 2.53 |
| levantDeepTeal | `#314550` | 0.050 | **10.01** | **7.43** | 1.07 |
| signalCyan | `#00BFDF` | 0.430 | 2.20 | 1.63 | 4.22 |
| deepTeal | `#007F91` | 0.170 | **4.72** | 3.50 | 1.97 |

### 2.2 The warm-light-palette problem, quantified

White text on the brand colors, as-is:

| Fill | White text ratio | AA (4.5) |
|---|---|---|
| Deep Teal `#007F91` | 4.72 | ✅ (thin margin) |
| Aleppo Economic Orange `#DC4128` | 4.34 | ❌ |
| Antique Copper `#A97C57` | 3.67 | ❌ |
| Smart Olive `#809C66` | 3.05 | ❌ |
| Signal Cyan `#00BFDF` | 2.20 | ❌❌ |

Minimum darkening to reach 4.5:1 with white text (HSL-lightness darken):

| Role | Brand base | darken | Accessible fill | ratio |
|---|---|---|---|---|
| primary | `#007F91` | 0 | `#007F91` | 4.72 |
| danger | `#DC4128` | 0.015 | `#D93D23` | 4.52 |
| warning | `#A97C57` | 0.055 | `#976E4D` | 4.51 |
| success | `#809C66` | 0.105 | `#657C50` | 4.61 |
| info | `#00BFDF` | 0.140 | `#008298` | 4.51 |

### 2.3 ⚠️ Vendor defect — `exposure()` lightens on hover

`src/utils/theme.ts:68` `getThemeColors()` derives Naive UI's Hover/Suppl by
**lightening** (`exposure(color, +0.08)` / `+0.1`). On a light theme with white
button text, every hover state falls below AA:

| Role | base → white | Hover → white | Suppl → white |
|---|---|---|---|
| primary | `#007F91` 4.72 | `#00A3BA` **3.02** ❌ | `#00ACC4` **2.72** ❌ |
| danger | `#DC4128` 4.34 | `#E2604B` **3.49** ❌ | `#E36854` **3.29** ❌ |
| warning | `#A97C57` 3.67 | `#B79172` **2.87** ❌ | `#BA9679` **2.71** ❌ |
| success | `#809C66` 3.05 | `#95AC7F` **2.47** ❌ | `#9AB085` **2.35** ❌ |
| info | `#00BFDF` 2.20 | `#09DCFF` **1.65** ❌ | `#13DDFF` **1.63** ❌ |

**This is pre-existing and palette-independent** — it also affects Pinx's own
green. Fix from our layer by supplying explicit `primaryColorHover` /
`Pressed` / `Suppl` values in `themeOverrides` (darker on hover in light mode)
instead of relying on `getThemeColors()`. No vendor edit required.

### 2.4 Derived neutrals — Charcoal Backbone ramp

Both `#FFF` and Warm Mist must pass, because cards sit on a Warm Mist body.

| lighten | HEX | on `#FFF` | on Mist | verdict |
|---|---|---|---|---|
| 0 | `#43474F` | 9.32 | 6.92 | ✅ `textPrimary` |
| 0.05 | `#4F535D` | 7.69 | 5.71 | ✅ |
| 0.08 | `#565B65` | 6.81 | 5.06 | ✅ **`textSecondary`** |
| 0.10 | `#5A606B` | 6.32 | 4.69 | ✅ **`textMuted`** (last passing step) |
| 0.12 | `#5F6570` | 5.86 | 4.35 | ❌ Mist fails |
| 0.20 | `#727986` | 4.37 | 3.25 | ❌ both fail |

**Consequence:** a conventionally faint "muted" grey is impossible on a Warm
Mist body. `textMuted` bottoms out at `#5A606B` (4.69 on Mist). De-emphasis
below that must come from **weight and size, not lightness.**

### 2.5 Borders — WCAG 1.4.11 (3:1 for controls)

| Candidate | on `#FFF` | on Mist | verdict |
|---|---|---|---|
| Aleppo Stone `#CDC2AF` | 1.76 | 1.30 | ❌ fails as a control border |
| Aleppo Stone darkened 0.29 → `#8F7B59` | 3.03 | 3.03 | ✅ but reads as a strong brown |
| Charcoal `#43474F` | 9.32 | 6.92 | ✅ (too heavy for every border) |

**Two border tokens are required:** `borderSubtle` (decorative dividers — no
ratio obligation, Aleppo Stone is fine) and `borderStrong` (input/select/
checkbox outlines — must clear 3:1). See **Q4**.

### 2.6 Focus ring

Deep Teal `#007F91`: 4.72 on `#FFF`, 3.50 on Warm Mist — ✅ clears 3:1
non-text on both surfaces.

### 2.7 Dark mode

Levant Deep Teal `#314550` is the brand's only dark background.

| Surface step | HEX | white text | Warm Mist text |
|---|---|---|---|
| body (derived, darken 0.06) | `#25353D` | 11.4 | 8.5 |
| surface / card (brand) | `#314550` | 10.01 | 7.43 |
| raised (derived, lighten 0.04) | `#39505D` | 8.46 | 6.29 |
| raised+ (derived, lighten 0.07) | `#3F5866` | 7.50 | 5.57 |

Semantic colors as text on those dark surfaces:

| Role | brand base | on `#314550` | on body | required lift |
|---|---|---|---|---|
| info | `#00BFDF` | 4.53 ✅ | 5.74 ✅ | none — **Signal Cyan works as-is** |
| success | `#809C66` | 3.27 ❌ | 4.14 ❌ | lighten 0.125 → `#A0B58D` |
| warning | `#A97C57` | 2.72 ❌ | 3.44 ❌ | lighten 0.17 → `#C6A990` |
| danger | `#DC4128` | 2.30 ❌ | 2.91 ❌ | lighten 0.23 → `#EC9A8D` |
| primary | `#007F91` | 2.11 ❌ | 2.68 ❌ | lighten 0.145 → `#00C0DB` |

**A genuinely elegant result:** the lift dark mode needs for `primary`
(`#00C0DB`) is within 1 ΔE of **Signal Cyan `#00BFDF`**. So dark-mode primary =
Signal Cyan, light-mode primary = Deep Teal — the Guideline's own
"Intelligence & Interaction" pair (p. 16), used exactly as described, with
**zero invented values.** Dark mode's other three states still need derived
lifts.

---

## 3. Semantic collision resolution

### 3.1 Green cannot be both `primary` and `success` — ✅ resolved from the Guideline

The Guideline resolves this itself; no judgement call needed:

- Smart Olive is prescribed for **"secondary buttons"** (p. 14) — explicitly *not* primary.
- Deep Teal is prescribed for **"digital interfaces / interactive elements"** and named the **"Digital Ecosystem layer"** (p. 16). ADD OS *is* the digital interface.
- Signal Cyan is prescribed for **"hover and active states"** (p. 16).

**Resolution:** `primary` = Deep Teal `#007F91`. `success` = Smart Olive
`#809C66` (darkened to `#657C50` for white text). The green family is freed
entirely for success; the teal family carries interaction. Both are brand
values used as the Guideline describes.

**Rejected alternative:** `primary` = Aleppo Economic Orange, reading
"call-to-action" (p. 15) as "primary button". In marketing a CTA is the hero
button; in an operations dashboard the primary button is *Save*. Painting Save
in a red-orange one step from the destructive palette is the exact confusion
the brief forbids. Orange is instead committed to `danger` — §3.3.

### 3.2 ❌ `warning` — no brand color works. Unresolved; needs your decision.

Antique Copper `#A97C57` is the only candidate. It fails on
colorblind grounds, measured by dichromacy simulation (Viénot/Brettel in linear
LMS) + CIE76 ΔE on the accessible solid fills:

| Pair | normal | protanopia | deuteranopia | tritanopia |
|---|---|---|---|---|
| success `#657C50` vs warning `#976E4D` | 29.2 | **1.0** ❌ | **8.1** ❌ | 24.9 |
| warning vs danger `#D93D23` | 53.4 | 19.9 ~ | 34.1 | 52.7 |

Olive-green and copper-brown sit at the same lightness and collapse to
**ΔE 1.0** under protanopia — indistinguishable. Roughly 8 % of men are
red-green colorblind. A warning that reads as a success in an access-control or
payments screen is not an acceptable residual risk.

I then tested six derived ambers within brand temperature (hue 35–45°) as pale
tints. **All failed** — and so did the whole pale-tint approach:

| Tint pair ΔE (base mixed 82 % into white) | normal | protanopia | deuteranopia |
|---|---|---|---|
| success vs warning | 9 ❌ | 6 ❌ | 8 ❌ |
| warning vs danger | 8 ❌ | 5 ❌ | 3 ❌ |
| success vs danger | 14 ❌ | 4 ❌ | 7 ❌ |

**Pale status tints are mutually indistinguishable even to normal vision.** Any
design that leans on tinted pills to carry state meaning fails regardless of
which hues are chosen.

**What this means:** color alone cannot encode four states in this palette.
The brief already anticipates it ("must not rely on hue alone — pair with icon,
weight, or border"). So the architecture must be:

- **Icon is the primary channel** — distinct Carbon glyph per state
  (`checkmark-filled`, `warning-alt-filled`, `error-filled`,
  `information-filled`), already bundled locally.
- **Text label** on every status, never a bare colored dot.
- **Luminance separation** as the secondary channel — L\* survives all three
  dichromacies, hue does not.
- Color is redundant reinforcement, never the signal.

Even so, `warning` still needs *a* value. See **Q2**.

### 3.3 ✅ `danger` must be unmistakable — resolved

**Resolution:** `danger` = Aleppo Economic Orange `#DC4128`, darkened to
`#D93D23` for white text (4.52) — and **orange is banned as decoration
anywhere in ADD OS.** In this dashboard, orange means "destructive or
high-consequence", exclusively.

Why this is right rather than a compromise:

- It is a **brand value, not a derived one** — zero invented hexes.
- It honours the Guideline's own instruction to "choose one primary accent per application" (p. 15) by committing that accent to one meaning.
- Only **two** solid saturated fills exist in the whole UI — `primary` teal and `danger` orange — and they are unmistakable in every vision type:

| Pair | normal | protanopia | deuteranopia | tritanopia |
|---|---|---|---|---|
| primary `#007F91` vs danger `#D93D23` | 106.3 | 60.2 | 86.8 | 101.5 |

No derived error color is needed. The brief's fallback ("propose a derived one
and flag it") does not have to be invoked.

### 3.4 ❌ `info` collides with `primary` — needs your decision

Signal Cyan `#00BFDF` carries white text at only 2.20. Darkening it to AA gives
`#008298` — which is **ΔE 2.7 from `primary` `#007F91`**, i.e. the same color to
everyone, in every vision type.

This is a structural property of the palette: the "Intelligence & Interaction"
pair is *one hue at two lightnesses*, and accessibility forces both to the dark
end. Signal Cyan survives only where it needs no white text — as **text/icon on
a dark surface** (4.53 on `#314550`, ✅) or as a hairline accent.

See **Q3**.

### 3.5 Proposed Tier 2 — semantic tokens

Legend: **B** = brand value verbatim · **B\*** = brand value darkened/lightened
for contrast only (hue preserved) · **D** = derived, not a brand value ·
**?** = blocked on a decision.

| Tier 2 token | Light | src | Dark | src |
|---|---|---|---|---|
| `primary` | `#007F91` Deep Teal | **B** | `#00BFDF` Signal Cyan | **B** |
| `primaryHover` | darker than base (§2.3) | **B\*** | lighter | **B\*** |
| `surface` (card) | `#FFFFFF` | **D** (Guideline implies white, p. 15) | `#314550` Levant Deep Teal | **B** |
| `surfaceRaised` | `#FFFFFF` + elevation | **D** | `#39505D` | **D** |
| `body` | `#E2DDDB` Warm Mist | **B** | `#25353D` | **D** |
| `borderSubtle` | `#CDC2AF` Aleppo Stone | **B** | derived | **D** |
| `borderStrong` | ≥3:1 — see **Q4** | **?** | derived | **D** |
| `textPrimary` | `#43474F` Charcoal | **B** | `#E2DDDB` Warm Mist | **B** |
| `textSecondary` | `#565B65` | **D** | derived | **D** |
| `textMuted` | `#5A606B` | **D** | derived | **D** |
| `success` | `#657C50` | **B\*** | `#A0B58D` | **B\*** |
| `warning` | — see **Q2** | **?** | — | **?** |
| `danger` | `#D93D23` | **B\*** | `#EC9A8D` | **B\*** |
| `info` | — see **Q3** | **?** | `#00BFDF` | **B** |
| `focusRing` | `#007F91` Deep Teal | **B** | `#00BFDF` | **B** |

Unassigned brand colors — **Soft Growth Green** `#B8D098` (charts, supporting
cards; 5.55 on Charcoal ✅), **Antique Copper** `#A97C57` (data-viz categorical),
**Levant Deep Teal** `#314550` (dark surfaces). Reserved for Tier 3 and charts,
not semantics.

---

## 4. Typography

### 4.1 What the Guideline mandates (pp. 19, 21)

| Role | Typeface | Guideline scope |
|---|---|---|
| English | **Poppins** — Bold + Regular | Primary Latin face |
| Arabic | **Noto IKEA Arabic** — Bold + Regular | Primary Arabic face |
| Logo extension | Swis721 LtEx BT Light | Logo lockups only — not UI |
| Experiential | Rocatone Regular | Events/activations — not UI |
| Ecosystem services | Circle | Service naming — not UI |

Only the first two are UI-relevant. The last three are brand-extension faces
and are explicitly out of scope for a dashboard.

### 4.2 🚨 Blocker — "Noto IKEA Arabic" is very likely not licensable

**Noto IKEA** is IKEA's proprietary corporate typeface — a commissioned
derivative of Google's Noto, licensed to IKEA. It is not on Google Fonts, not
on npm/Fontsource, and not offered for third-party web embedding.

Shipping it in ADD OS would mean redistributing a font file the project has no
licence for, in a product carrying a different organisation's brand. That is a
legal exposure, not a technical one — and the brief requires me to "flag any
font whose license or trademark status is unclear."

I have **not** substituted anything. See **Q1**.

The closest legitimately licensable Arabic faces, all SIL OFL and all already
listed as alternates in `src/assets/scss/fonts.scss:31-36`:

| Face | Character | Note |
|---|---|---|
| **IBM Plex Sans Arabic** | Neutral, systemic, humanist | Closest to a Noto-family voice; designed for interfaces; excellent at small sizes. My recommendation. |
| Noto Sans Arabic | Genuinely the Noto family | Nearest thing to the *stated intent* without the IKEA commission. |
| Cairo | Currently installed | Geometric, rounded — see §4.3. |
| Almarai / Tajawal | Geometric | Narrower operational range. |

### 4.3 The Cairo conflict

`src/assets/scss/fonts.scss:26-29` currently sets:

```scss
--font-family-arabic: "Cairo Variable", "Cairo", "Segoe UI", Tahoma, …
```

Cairo conflicts with the brand-mandated Arabic face. Per the brief I have **not
swapped it**. It resolves as a side effect of **Q1**.

Cairo is a defensible fallback if Q1 lands on "keep Cairo": it is OFL, variable
(200–1000), already installed with `unicode-range`-guarded subsets, and widely
deployed. Its geometric-rounded voice is a weaker match for
"minimal / system-driven / timeless" (p. 5) than IBM Plex Sans Arabic.

### 4.4 Poppins — two concrete concerns

Poppins is SIL OFL 1.1 and self-hostable. It is **not currently installed** —
adding `@fontsource/poppins` is a new dependency and needs approval under
constraint 4.

1. **Poppins has no Arabic coverage.** Latin only. That is fine — but it means
   the current architecture must change (§4.5).
2. **Poppins is a geometric display face, not a data face.** Single-storey `a`,
   near-circular bowls, wide advance widths, and — critically — the OFL release
   carries **no tabular-figure (`tnum`) feature**. Every number in ADD OS is
   emitted by `src/add-os/utils/format/` and much of it lands in DataTable
   columns; with proportional digits, `1,111` and `9,999` render at different
   widths and columns will not align vertically.
   Mitigations, in order of preference: (a) apply
   `font-variant-numeric: tabular-nums` and verify it takes effect once the
   font file is in place; (b) if it does not, set numeric table cells to
   JetBrains Mono, already installed. This is a Phase 2 verification item, not
   a Phase 0 blocker.

### 4.5 Architecture change required — per-language font stacks

Today **one** stack serves both languages, with the Arabic face first
(`src/design-tokens.json:19-20`):

```
var(--font-family-arabic), 'Public Sans', system-ui, …
```

So Cairo currently renders Latin text too. The brand mandates *two* faces, so
the stack must become language-aware — Poppins leading for `:lang(en)`, the
Arabic face leading for `:lang(ar)`. This also delivers the brief's
**per-language type scale**: Arabic faces need slightly larger size and looser
line-height than Latin at the same nominal px, so the scale must be
per-language, not shared. `<html lang>` is already maintained correctly by
`index.html:22` and the direction binding (§3.10 of the manifest), so
`:lang()` selectors are reliable — no new plumbing needed.

---

## 5. Token architecture — how this wires in

The existing pipeline already has the single-source-of-truth shape the brief
asks for. It does not need replacing, only re-pointing:

```
figma-tokens.json                      ← root, Figma Tokens format
   │  npm run design-tokens → scripts/tokens-tool.js
   ▼
src/design-tokens.json                 ← GENERATED. Never hand-edit.
   │
   ├──▶ src/theme/index.ts             getDefaultState / getThemeOverrides / getCssVars
   │       ├──▶ naive-ui themeOverrides
   │       └──▶ CSS vars written INLINE on <html>
   │                └──▶ src/tailwind.css re-exports them via @theme inline
   └──▶ var(--font-family-arabic) injected at the head of the font stacks
```

Two constraints this imposes:

1. **`src/design-tokens.json` is generated** from `figma-tokens.json`
   (`package.json:design-tokens`). Editing only the generated file is erased on
   the next run. Both must change together, exactly as was done for the Arabic
   font (manifest §3.6).
2. **Tailwind is v4** (`@tailwindcss/vite@4.3.0`). `tailwind.config.js` is a
   legacy plugin shim for `h1`–`h6` only; the real theme is `@theme inline` in
   `src/tailwind.css:6-49`, which reads the CSS variables the theme store
   writes. So Tailwind is *already* derived from the same source as Naive UI —
   the "two parallel palettes" failure mode is structurally prevented, provided
   we keep feeding this chain rather than adding a second one.

`src/add-os/design-tokens/README.md` already frames the choice as (a) update
`figma-tokens.json`, (b) a standalone merged file, (c) CSS-var overrides only.

**My recommendation — a fourth option that matches the brief better than any of
the three:** author `src/add-os/theme/tokens.ts` as the hand-written Tier 1/2/3
source of truth, and add a generator that *emits* `figma-tokens.json` from it.
The existing chain then keeps working untouched, Naive UI and Tailwind stay
derived, and the "change one hex, it propagates everywhere" test in the
Definition of Done is satisfied by construction — with `tokens.ts` as the only
file a human edits. Confirms as **Q6**.

---

## 6. Migration inventory — every hardcoded color, font, and radius

### 6.1 `src/add-os/` — our layer (clean)

| File:line | Value | Action |
|---|---|---|
| `src/add-os/views/ComingSoon.vue:56` | `font-size: 28px` | → type-scale token |
| `src/add-os/views/ComingSoon.vue:54` | `font-family: var(--font-family-display)` | OK — already a var; re-point in Phase 1 |
| `src/add-os/theme-overrides/_nav.scss:34` | `font-size: 10px` (Soon badge) | → type-scale token |
| `src/add-os/theme-overrides/_nav.scss:21` | `gap: 8px` | → spacing token |
| `src/add-os/theme-overrides/_nav.scss:77` | `$nav-indent-step: 18px` | → spacing token |
| `src/add-os/theme-overrides/_nav.scss:10,14,35` | `opacity: 0.55 / 0.8 / 0.9` | Phase 3 — the "deliberately disabled" read |

**Zero hardcoded hex or `rgb()` values in `src/add-os/`.** Verified by grep.

### 6.2 Files we already own (Category B of the manifest)

| File:line | Value | Phase |
|---|---|---|
| `index.html:33` | `apple-mobile-web-app-title` = "Pinx" | 4 |
| `index.html:37` | `<title>` = Pinx template title | 4 |
| `index.html:40-72` | 8 × `pinx.vercel.app` URLs, `author` = D\*VERSE Studio, `twitter:creator` = @DVERSEStudio, canonical/og/twitter images | 4 |
| `index.html:29` | `<link rel="icon" href="/favicon.ico">` → Pinx favicon | 4 |
| `src/app-layouts/common/Logo.vue:8-9` | `alt` / `aria-label` = **"SOCFortress logo"** — wrong brand entirely, an earlier template lineage | 4 |
| `src/app-layouts/common/Logo.vue:38` | resolves `brand-logo_{type}_{theme}.svg` | 4 — keep the logic, swap the 6 assets |

### 6.3 Vendor files — override, do not edit

| File:line | Value | Approach |
|---|---|---|
| `src/theme/index.ts:127` | `Tag.colorBordered: "rgba(0, 0, 0, 0.1)"` — a literal black | Override via `themeOverrides` from our layer (Phase 2) |
| `src/utils/theme.ts:68-74` | `getThemeColors()` lightens on hover — §2.3 | Supply explicit Hover/Pressed/Suppl in `themeOverrides` |
| `src/tailwind.css:65` | `border-color: var(--color-gray-200, currentColor)` — Tailwind default grey, not brand | Re-point to `borderSubtle` |
| `src/tailwind.css:144` | `font-size: 13px` on `code` | → type-scale token |
| `src/tailwind.css:141,150,207` | `padding: 1px 6px` / `12px` / `2px 0px` | → spacing tokens |
| `src/tailwind.css:37-38` | breakpoints `460px` / `701px` | Keep — layout, not brand |
| `src/assets/scss/overrides/naive-override.scss` | `.direction-rtl` block, ~215 lines | Read before Phase 5; do not edit |

### 6.4 Assets to replace (Phase 4)

`src/assets/images/brand-logo_{default,small,large}_{light,dark}.svg` (6 Pinx
files) · `public/favicon.ico`, `public/Fav_16x16.ico`, `public/Fav_32x32.ico`
(32/16/32 px, Pinx) · `public/logo.jpg` (300×300) · `public/og_preview.jpg` ·
`public/tw_preview.jpg`.

Source art is available as **vector** in `LOGO TYPE.pdf` (71 paths) and
`ADD .pdf` / `ADD 2.pdf` — so all variants can be produced as clean local SVG
with no raster tracing and no external requests.

---

## 7. Open questions — human decision required

Q1–Q3 block Phase 1. Q4–Q7 can be answered during Phase 1. They are mutually
independent.

**Q1 — Arabic typeface (blocks the type scale; has legal exposure).**
The Guideline mandates *Noto IKEA Arabic*, which appears to be IKEA proprietary
and not licensable for embedding (§4.2). Options: (a) **IBM Plex Sans Arabic**
— OFL, interface-grade, closest systemic voice *(my recommendation)*;
(b) **Noto Sans Arabic** — OFL, nearest to the stated intent;
(c) **keep Cairo** — already installed, zero change; (d) you confirm ADD holds
a licence for Noto IKEA Arabic and supplies the `woff2` files.

**Q2 — `warning` colour (blocks Tier 2).**
No brand colour survives (§3.2). Options: (a) **derived amber, flagged as
derived**, chosen for maximum L\* separation from success rather than hue —
plus mandatory icon + label; (b) Antique Copper `#A97C57` anyway, accepting
ΔE 1.0 vs success under protanopia, mitigated by icon and label only;
(c) collapse warning into danger and run a three-state system
(success/danger/info) — fewest states, least ambiguity, but loses a real
operational distinction. My recommendation: **(a)**.

**Q3 — `info` colour (blocks Tier 2).**
Signal Cyan darkened for AA is indistinguishable from primary (§3.4). Options:
(a) **accept `info` ≈ `primary` teal**, differentiated by icon and label —
honest about the palette, zero invented values *(my recommendation)*;
(b) use Signal Cyan only where it needs no white text (dark surfaces, hairline
accents, activity indicators) and give light-mode info no fill at all;
(c) approve a derived blue outside the brand palette.

**Q4 — `borderStrong`.**
Aleppo Stone fails 3:1 for control outlines (§2.5). Options: (a) derived warm
neutral from Charcoal at ~40 % — neutral, invisible, safe *(my
recommendation)*; (b) darkened Aleppo Stone `#8F7B59` — brand-warm but reads as
a strong brown on every input; (c) accept sub-3:1 borders and rely on the focus
ring — I do not recommend this; it fails WCAG 1.4.11.

**Q5 — "Aleppo Spice".**
The strict rule on p. 15 forbids pairing *Antique Copper* with *Aleppo Spice*,
but no colour of that name is defined anywhere in the Guideline. I read it as
**Aleppo Economic Orange `#DC4128`** (a naming slip — "spice" fits the Aleppo
pepper reference). Please confirm, or supply the missing colour.
*Related conflict:* if Q2 lands on Antique Copper for `warning`, a page showing
a warning and an error together would violate that rule. Under my
recommendations (`warning` = derived amber, `danger` = orange) the rule is not
engaged.

**Q6 — Token source of truth.**
Confirm the fourth option in §5 — `src/add-os/theme/tokens.ts` as the
hand-authored source, generating `figma-tokens.json`, leaving the existing
chain intact — versus options (a)/(b)/(c) already recorded in
`src/add-os/design-tokens/README.md`.

**Q7 — Dark mode scope.**
The brief requires dark mode be *fully supported or explicitly out of scope*.
The brand supplies exactly one dark background; a usable dark mode needs ~4
surface levels plus lifted variants for all four states — roughly 10 derived
values (§2.7). It is achievable and I have the numbers. Confirm **in scope** or
**out of scope for now** (Naive's `darkTheme` would then be left untouched and
the theme switch hidden rather than half-themed).

**Q8 — Missing brand documents.**
Brand Strategy, ADD Persona, and Philosophy & Structure are not on disk (§0).
Needed for Phase 3 voice/copy. Supply them, or Phase 3 proceeds on the
Guideline's stated character — *minimal, system-driven, timeless* (p. 5) — plus
the brief's "confident, pragmatic, no filler".

---

## 8. Files touched by Phase 0

| File | Change |
|---|---|
| `docs/brand/PHASE-0-AUDIT.md` | **Created** — this report |
| `docs/brand/` | **Created** — directory |

**Nothing outside `docs/` was created, modified, or deleted. No code was
written. Nothing under `_pinx-vendor/` or `src/` was touched.** All analysis was
read-only; contrast and dichromacy figures came from throwaway scripts run and
removed.

---

## 9. Decisions locked (2026-08-03)

The audit above records what was *found*. This section records what was
*decided*. Q1–Q3 are answered; Q4–Q8 remain open.

### Q1 — Arabic typeface: **Noto Sans Arabic** ✅

> **Revised 2026-08-03.** This decision first landed as IBM Plex Sans Arabic and
> was implemented as such. It was then reversed to Noto Sans Arabic on
> minimum-distance grounds. Both the original reasoning and the reversal are kept
> below, because the trade-off is real and a future reader should see what was
> given up rather than assume the first answer was simply wrong.

Noto IKEA Arabic is not shipped. `--font-family-arabic` in
`src/assets/scss/fonts.scss` becomes **Noto Sans Arabic** (SIL OFL 1.1,
`@fontsource/noto-sans-arabic`). This simultaneously resolves the Cairo conflict
(§4.3) — Cairo is removed as the primary Arabic face.

**Why Noto Sans Arabic — the minimum-distance argument.** Noto IKEA is itself a
**Noto derivative**: a commission built on the Noto Arabic skeleton. Noto Sans
Arabic is therefore the closest legitimately licensable face to what the
Guideline actually names. Where a substitution is forced, the one that stays
nearest the mandated family is the one that survives brand review.

**What was given up.** ADD OS's committed icon set is Carbon — IBM's design
language — so IBM Plex Sans Arabic would have put type and iconography inside a
single design system. That internal coherence was judged to lose to brand
fidelity: icons are not type, and the Guideline governs type. Recorded so the
choice is visibly a trade-off, not an oversight.

**Deviation from the Guideline, recorded deliberately:** the Guideline mandates
Noto IKEA Arabic; ADD OS ships Noto Sans Arabic instead, because the mandated
face appears not to be licensable for embedding. This is a documented deviation,
not an oversight, and should be reflected back into the Guideline.

**One implementation consequence.** Unlike Poppins, Noto Sans Arabic **does ship
its own Latin glyphs**. Poppins must therefore lead the font stack, or English
would silently stop being Poppins and the mandated Latin face would be lost. Only
Noto's `arabic` subset is imported; its `latin` subset would never be reached.

### Q2 — `warning`: **derived amber `#E7B155`** ✅ — DERIVED, not a brand value

Derived from Aleppo Stone by holding its exact hue and raising chroma:

```
warning = derive(brand.aleppoStone)   // #CDC2AF = hsl(38, 23%, 75%)
        → hold hue 38°, saturate → 75%, lighten → 62%
        = #E7B155                       hsl(38, 75%, 62%)   L* 75.5
```

Provenance is a brand colour's own hue, so it reads as "Aleppo Stone with
urgency" rather than as a foreign colour. ΔE 43.7 from Aleppo Stone — same
family, unmistakably distinct.

Measurements:

| Check | Value | Verdict |
|---|---|---|
| Charcoal text on it | 4.80 | ✅ AA, +0.30 margin |
| L\* separation vs success / danger / primary | 26.3 / 25.8 / 27.0 | ✅ lightness is the CVD-safe channel |
| As fill vs `#FFF` / Warm Mist | 1.94 / 1.44 | ❌ → **requires a 1px border** to delimit the surface |
| Dark mode on `#314550` / `#25353D` | 5.15 / 6.53 | ✅ no lift needed |
| `warningText` on light (darkened) | `#845A13` | 6.08 on `#FFF`, 4.51 on Mist ✅ |

Four-state pairwise ΔE — **all ≥ 20 in every vision type:**

| | prim/succ | prim/warn | prim/dang | succ/warn | succ/dang | warn/dang |
|---|---|---|---|---|---|---|
| normal | 40 | 83 | 106 | 50 | 81 | 56 |
| protanopia | 40 | 75 | 60 | 39 | 21 | 31 |
| deuteranopia | 45 | 89 | 87 | 48 | 42 | **21** |
| tritanopia | 25 | 63 | 102 | 41 | 77 | 53 |

`warn/dang` = 21 under deuteranopia is the tightest pair — at threshold, and
reinforced by mandatory icon + label.

### Q3 — `info`: **shares the primary teal** ✅

`info` = Deep Teal `#007F91` in light, Signal Cyan `#00BFDF` in dark. No
derived value. Signal Cyan additionally retains its Guideline role (p. 16) as
activity indicator and hairline accent where it needs no white text.

### Non-negotiable consequence of Q2/Q3 — the redundant-encoding rule

Because `info` shares primary's hue and `warn/dang` is at ΔE threshold under
deuteranopia, **colour is never the sole channel for state.** Binding for
Phases 2–3:

1. **Icon required** on every status — `carbon:checkmark-filled`,
   `carbon:warning-alt-filled`, `carbon:error-filled`,
   `carbon:information-filled`. All already bundled locally.
2. **Text label required.** No bare coloured dot ever encodes state.
3. **1px border on every status surface** — also mandatory for `warning`, whose
   fill is only 1.94:1 against white.
4. **No pale-tint-only status pills.** Measured at ΔE 3–14 — indistinguishable
   even to normal vision (§3.2).

### Locked Tier 2

**B** = brand verbatim · **B\*** = brand, contrast-adjusted (hue preserved) ·
**D** = derived · **?** = still open.

| Tier 2 token | Light | src | Dark | src |
|---|---|---|---|---|
| `primary` | `#007F91` Deep Teal | **B** | `#00BFDF` Signal Cyan | **B** |
| `primaryHover` | darker than base | **B\*** | lighter | **B\*** |
| `surface` | `#FFFFFF` | **D** | `#314550` Levant Deep Teal | **B** |
| `surfaceRaised` | `#FFFFFF` + elevation | **D** | `#39505D` | **D** |
| `body` | `#E2DDDB` Warm Mist | **B** | `#25353D` | **D** |
| `borderSubtle` | `#CDC2AF` Aleppo Stone | **B** | derived | **D** |
| `borderStrong` | — **Q4** | **?** | derived | **D** |
| `textPrimary` | `#43474F` Charcoal | **B** | `#E2DDDB` Warm Mist | **B** |
| `textSecondary` | `#565B65` | **D** | derived | **D** |
| `textMuted` | `#5A606B` | **D** | derived | **D** |
| `success` | `#657C50` | **B\*** | `#A0B58D` | **B\*** |
| `warning` | `#E7B155` | **D** | `#E7B155` | **D** |
| `danger` | `#D93D23` | **B\*** | `#EC9A8D` | **B\*** |
| `info` | `#007F91` (= primary) | **B** | `#00BFDF` | **B** |
| `focusRing` | `#007F91` Deep Teal | **B** | `#00BFDF` | **B** |

Derived-value count: 1 semantic colour (`warning`), 2 light neutrals, `#FFFFFF`,
and the dark-mode surface ramp. Every other value is a brand colour, used in the
role the Guideline assigns it.

Unassigned brand colours, reserved for Tier 3 / data-viz: Soft Growth Green
`#B8D098`, Antique Copper `#A97C57`, Levant Deep Teal `#314550` (light mode).

### Typography — locked stacks

Per-language, per §4.5. Arabic leads for `:lang(ar)`, Poppins for `:lang(en)`.

| | Arabic | Latin |
|---|---|---|
| Body / UI | Noto Sans Arabic | Poppins |
| Display | Noto Sans Arabic | Poppins |
| Mono / numeric | JetBrains Mono (already installed, non-brand utility) | same |

One stack serves both, Poppins leading — see the ordering consequence in Q1.
Only the **size** scale is per-language (`:lang()`), not the family.

Open items carried into Phase 1/2: `@fontsource/poppins` and
`@fontsource/noto-sans-arabic` are **new dependencies** needing approval under
constraint 4; Poppins' missing `tnum` feature must be verified against DataTable
numeric columns (§4.4).
