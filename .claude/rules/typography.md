---
paths:
  - "src/assets/scss/fonts.scss"
  - "src/add-os/theme/**/*.ts"
  - "src/**/*.vue"
  - "index.html"
---

# Typography

- **Poppins must lead the font stack.** The Arabic face is a Noto derivative and ships its
  own Latin glyphs, so putting Arabic first silently loses the mandated Latin face.
- **Both faces are self-hosted from `src/add-os/assets/fonts/`** (`ar/` and `en/`),
  declared as `@font-face` in `src/assets/scss/fonts.scss` — the single swap point. They
  are TTF, not woff2: ~1.26 MB against the ~230 KB the `@fontsource` woff2 subsets cost.
  Accepted on an isolated office LAN; revisit if the app is ever served more widely.
- One family stack serves both languages; the **size scale is per-language** via `:lang()`.
  Arabic needs slightly larger sizes and looser leading at the same nominal px.
  `<html lang>` and the direction binding are already maintained correctly, so `:lang()`
  selectors are reliable — no new plumbing needed.
- **Poppins' OFL release has no `tnum`.** Numeric table columns need
  `font-variant-numeric: tabular-nums`; verify it takes effect, and fall back to JetBrains
  Mono for numeric cells if it doesn't. Without it, `1,111` and `9,999` render at different
  widths and DataTable columns won't align.
- Guideline p.19 mandates **Noto IKEA Arabic**, and since **2026-08-30 that is what ships** —
  the design owner supplied the files and instructed their use. This REVERSES the documented
  deviation that shipped Noto Sans Arabic on minimum-distance grounds while the mandated face
  was unobtainable.
  **The licence question the deviation existed to avoid is still open.** The supplied files
  are a third-party redistribution, not an IKEA grant, and Noto IKEA is IKEA's proprietary
  corporate typeface. That is the brand owner's ruling to make, not a developer's — see
  `docs/brand/GUIDELINE-FEEDBACK.md` §1. **Do not "fix" this by inference in either
  direction.**
- **Noto Sans Arabic is still installed, for digits only.** Its `latin` subset draws numeric
  columns (`fontFamily.numeric`); it sets no letter. Removing the package un-aligns every
  money column — see the next point.
- Cairo is removed as the Arabic face. Swis721 / Rocatone / Circle are brand-extension
  faces, explicitly out of scope for a dashboard.
- JetBrains Mono is a non-brand utility face, for numerics only.
