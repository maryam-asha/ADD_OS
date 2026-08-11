---
paths:
  - "src/add-os/theme/**/*.{ts,scss}"
  - "src/add-os/theme-overrides/**/*.scss"
  - "src/design-tokens.json"
  - "figma-tokens.json"
  - "src/tailwind.css"
  - "src/theme/**/*.ts"
---

# Tokens and colour

## The pipeline — do not add a second one

```
src/add-os/theme/tokens.ts        ← the ONLY file a human edits
   │  generator
   ▼
figma-tokens.json                 ← emitted
   │  npm run design-tokens
   ▼
src/design-tokens.json            ← GENERATED, never hand-edited
   │
   ├──▶ src/theme/index.ts  →  naive-ui themeOverrides
   │                        →  CSS vars written inline on <html>
   └──▶ src/tailwind.css    →  @theme inline re-exports the same vars
```

Naive UI and Tailwind are both derived from one source, so "two parallel palettes" is
structurally impossible — as long as you keep feeding this chain. Change one hex and it
must propagate everywhere; if it doesn't, the chain was bypassed.

Tailwind is **v4**. `tailwind.config.js` is a legacy shim for `h1`–`h6` only; the real
theme is `@theme inline` in `src/tailwind.css`, reading the CSS vars the theme store writes.

## Hard colour rules

- **Orange `#D93D23` means `danger`, exclusively.** Banned as decoration anywhere in the
  dashboard. (Brand `#DC4128` darkened to clear 4.5:1 with white text.)
- **Antique Copper `#A97C57` carries no accent role.** It reaches the runtime palette only
  as the `extra3` chart series. Asserted by test — Guideline p.15's strict rule is kept
  *structurally disengaged*, not merely unviolated. If a change wants Copper as an accent,
  that test fails first and the p.15 ambiguity must be settled before proceeding.
- **Pillar colours (Core orange / Experience cyan / Ecosystem olive) are excluded from
  dashboard chrome** — they govern service-facing surfaces. That exclusion is what keeps
  orange reserved for `danger`.
- **Hover states must be set explicitly.** The vendor's `getThemeColors()` derives hover by
  *lightening* (`exposure(+0.08/+0.1)`), which drops every light-mode hover below AA —
  primary falls 4.72 → 3.02. Always supply `primaryColorHover` / `Pressed` / `Suppl` in
  `themeOverrides`. Never rely on the vendor derivation.
- **`textMuted` bottoms out at `#5A606B`** (4.69 on Warm Mist). A conventionally faint grey
  is impossible on a warm body. **De-emphasis comes from weight and size, not lightness.**
- Two border tokens, different obligations: `borderSubtle` (decorative, no ratio) vs.
  `borderStrong` (control outlines, **must clear 3:1**, WCAG 1.4.11). Aleppo Stone fails as
  a control border (1.76 on white) — still an open decision.
- Surfaces: Warm Mist `#E2DDDB` page body, `#FFFFFF` card surface (registered `derived`).
- Stated HEX values on Guideline pp. 14–17 are authoritative. Fills extracted from the
  placed PDF artwork (`#444850`, `#09BFDF`, `#7F9C67`) are CMYK→RGB conversion artifacts —
  **never "correct" the palette from them.**

## State colour is never the sole channel

`info` shares primary's hue, and `warning`/`danger` sit at ΔE 21 under deuteranopia.
Therefore, mandatory on **every** status:

1. a distinct Carbon icon (`checkmark-filled`, `warning-alt-filled`, `error-filled`,
   `information-filled`) — bundled locally;
2. a text label — **never a bare coloured dot**;
3. a 1px border on the surface (`warning` `#E7B155` is only 1.94:1 against white);
4. **no pale-tint-only status pills** — measured ΔE 3–14, indistinguishable even to
   normal vision.

Full measurements: `docs/brand/PHASE-0-AUDIT.md` §2–3.
