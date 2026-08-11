# `theme/` — ADD OS design tokens

**One hand-authored file. Everything else here is generated.**

```
tokens.ts                    ← the ONLY file you edit
   │  npm run tokens
   ├──▶ tokens.json                W3C DTCG — neutral, canonical
   ├──▶ tokens.generated.css       CSS custom properties + Tailwind @theme
   ├──▶ tokens.dart                Flutter / Dart
   ├──▶ ../../../figma-tokens.json Figma Tokens plugin
   └──▶ ../../design-tokens.json   the Pinx runtime chain
                │
                └──▶ src/theme/index.ts ──▶ naive-ui themeOverrides
                                       └──▶ CSS vars inline on <html> ──▶ Tailwind
```

Never edit a generated file. Every one carries a `DO NOT EDIT` banner, and
`__tests__/tokens.spec.ts` fails if the generated runtime tokens drift from the
source.

## Why DTCG is the canonical artifact

ADD OS is not the only consumer. A Flutter member app, a Nuxt public site and a
reception kiosk read the same tokens. So the canonical output is neutral
[W3C DTCG](https://tr.designtokens.org/format/) and every tool-specific file is
a *transformer* over it. Add a consumer by adding a transformer — never by
hand-maintaining a second palette.

The DTCG file emits real aliases (`{brand.deep-teal}`) rather than flattened
hex, so a consumer can resolve any semantic token back to its brand primitive
and know whether a value is ADD's or ours.

## The three tiers

| Tier | What | Rule |
|---|---|---|
| 1 `brand` | Literal Guideline values, Guideline names | No semantics. Never referenced by a component. |
| 2 `semantic` | Roles — `primary`, `danger`, `textMuted`, … Keyed by **mode**. | What components use. |
| 3 `component` | Only what Tier 2 genuinely cannot express | Last resort. |

If a component needs a Tier 1 value directly, the missing thing is a Tier 2
token. Add it there.

## Provenance

Every value that is not verbatim from the Guideline is registered in
`DERIVATIONS` with a classification:

- **`brand`** — verbatim from the Brand Guideline.
- **`adjusted`** — a brand colour, hue preserved, lightness moved for WCAG only.
- **`derived`** — *not* a brand colour. Invented under an approved decision.

Exactly one semantic colour is `derived`: **`warning` `#E7B155`**. No brand
colour can serve it — Antique Copper collapses to ΔE 1.0 against `success` under
protanopia. See `docs/brand/PHASE-0-AUDIT.md` §9.

## Two things that will bite you

**1. Tokens resolve to literal hex, never to `var(--x)`.**
naive-ui runs internal colour maths (via `seemly`) on the values in
`themeOverrides`. A CSS variable is not a colour it can parse, so passing one
breaks that maths *silently*. Resolve tokens at build time.

**2. Every interaction variant is declared explicitly.**
naive-ui's own derivation *lightens* on hover, which drops white-on-fill below
WCAG AA (primary 4.72 → 3.02). So `hover`/`pressed`/`suppl` are all stated here.

The rule that keeps them correct: **hover and pressed move AWAY from the text
colour the fill carries.** Fills with white text darken. `warning` — the only
fill carrying dark text — lightens. Enforced by test.

## Binding usage rules

These are not style preferences. They are the reason the palette passes
accessibility at all, and they are enforced or documented as noted:

1. **Colour is never the sole channel for state.** `info` shares primary's hue,
   and `warning`/`danger` sit at ΔE 21 under deuteranopia — the tightest pair in
   the system. Every status ships its `STATUS_ICONS` glyph **and** a text label.
   No bare coloured dot ever encodes state.
2. **Every status surface carries a 1px border.** `warning`'s fill is only
   1.94:1 against white; the border is what delimits it.
3. **`borderStrong` for anything where the border is the sole affordance**
   (input outlines). `border` is decorative only — dividers, card edges.
4. **Never de-emphasise below `textMuted` by lightening.** It is the last step
   that still clears AA on the Warm Mist body. Use weight and size instead.
5. **`on<Role>` is the only approved text colour on that fill.** Never pick one
   at a call site.

## Modes

`THEME_MODES` is `["light"]`. **Dark mode is out of scope for v1** (decision Q7):
the QA matrix is already ar/en × RTL/LTR and Pinx's RTL support is beta, so the
QA budget goes to bidirectional correctness instead.

The dimension exists anyway — adding dark means adding one key to `semantic` and
`component`. Data, not a refactor. The generator iterates `THEME_MODES`.

Dark is also made structurally **unreachable**, not merely hidden, because a
half-themed dark mode is worse than none:

- `src/theme/index.ts` pins `themeName` to `Light` (it previously followed the OS).
- `src/stores/theme.ts` no longer persists `themeName`.
- `colors.dark` in the generated runtime tokens **mirrors** `colors.light`, so no
  configuration can produce an unthemed screen.

To enable dark later: add the `dark` key here, flip `DARK_MODE_SUPPORTED`,
restore the OS check, re-add `themeName` to `persist.pick`, and ship the theme
switch. Until then the switch stays unshipped — a dead toggle is a defect.

## Typography

Two faces (Guideline p.19): **Poppins** for Latin, **Noto Sans Arabic** for
Arabic — the latter an approved deviation, since the mandated *Noto IKEA Arabic*
is IKEA proprietary and not licensable for embedding. Noto Sans Arabic is the
**minimum-distance** substitute: Noto IKEA is itself a Noto derivative, so this
is the closest licensable face to what the Guideline names.

**One stack serves both languages.** Poppins carries no Arabic glyphs, so Arabic
falls through to Noto Sans Arabic per glyph — including inside mixed strings like
`قاعة Business Café` — with no `:lang()` rule.

**Poppins must lead the stack.** Noto Sans Arabic ships its own Latin glyphs, so
if it came first, English would silently stop being Poppins and the mandated Latin
face would be lost. Only Noto's `arabic` subset is imported for the same reason.

**Size is per-language.** Arabic runs one step larger and materially looser.
That is `typeScale`, emitted as `:root:lang(ar)` / `:root:lang(en)` rules.
Enforced by test: Arabic must exceed Latin at every step.

Faces are named only in `src/assets/scss/fonts.scss`, via
`--font-family-latin` and `--font-family-arabic`. Swapping either is a two-line
change there and nothing else.

## Adding a token

1. Add it to `tokens.ts` — the right tier, and `DERIVATIONS` if it is not a
   verbatim brand value.
2. If it needs a CSS variable, add it to the CSS transformer in
   `scripts/build-tokens.js` (`--add-` prefix; the unprefixed names are Pinx's
   and are written inline on `<html>`, where they would beat any `:root` rule).
3. `npm run tokens`
4. `npx vitest run src/add-os/theme` — add an invariant if the token carries a
   contrast obligation.
