---
paths:
  - "src/assets/scss/fonts.scss"
  - "src/add-os/theme/**/*.ts"
  - "src/**/*.vue"
  - "index.html"
---

# Typography

- **Poppins must lead the font stack.** Noto Sans Arabic ships its own Latin glyphs, so
  putting Arabic first silently loses the mandated Latin face. Import **only** Noto's
  `arabic` subset; its `latin` subset would never be reached.
- One family stack serves both languages; the **size scale is per-language** via `:lang()`.
  Arabic needs slightly larger sizes and looser leading at the same nominal px.
  `<html lang>` and the direction binding are already maintained correctly, so `:lang()`
  selectors are reliable — no new plumbing needed.
- **Poppins' OFL release has no `tnum`.** Numeric table columns need
  `font-variant-numeric: tabular-nums`; verify it takes effect, and fall back to JetBrains
  Mono for numeric cells if it doesn't. Without it, `1,111` and `9,999` render at different
  widths and DataTable columns won't align.
- Guideline p.19 mandates **Noto IKEA Arabic**, which is IKEA proprietary and not
  licensable for embedding. We ship **Noto Sans Arabic** (SIL OFL 1.1) as a *documented
  deviation* — chosen on minimum-distance grounds, since Noto IKEA is itself a Noto
  derivative. **Do not "fix" this by inference.** See `docs/GUIDELINE-FEEDBACK.md` §1.
- Cairo is removed as the Arabic face. Swis721 / Rocatone / Circle are brand-extension
  faces, explicitly out of scope for a dashboard.
- JetBrains Mono is a non-brand utility face, for numerics only.
