---
paths:
  - "src/theme/**"
  - "src/utils/**"
  - "src/app-layouts/**"
  - "src/components/**"
  - "src/composables/**"
  - "src/stores/**"
  - "src/assets/scss/**"
  - "_pinx-vendor/**"
---

# Vendor boundary — you are in Pinx code

**Override, never edit.** Values reach these files through `themeOverrides` from our layer,
or SCSS in `src/add-os/theme-overrides/`. If a fix seems to require editing here, the
override layer is missing a hook — **say so rather than editing.**

`_pinx-vendor/**` is a pristine reference. Read-only, always. Never import from it.

## Known vendor defects — override from our layer

| File | Defect | Approach |
|---|---|---|
| `src/utils/theme.ts` `getThemeColors()` | Derives hover/suppl by *lightening*; every light-mode hover falls below AA | Supply explicit `Hover`/`Pressed`/`Suppl` in `themeOverrides` |
| `src/theme/index.ts` | `Tag.colorBordered: "rgba(0,0,0,0.1)"` — a literal black | Override via `themeOverrides` |
| `src/tailwind.css` | `border-color: var(--color-gray-200)` — Tailwind default grey, not brand; stray `13px` / `1px 6px` literals | Re-point to `borderSubtle` / spacing tokens |
| `src/assets/scss/overrides/naive-override.scss` | ~215-line `.direction-rtl` block | **Read before any RTL work. Do not edit.** |

Breakpoints `460px` / `701px` in `tailwind.css` are layout, not brand — keep them.

## Unrouted demo surfaces

The router is built from `src/add-os/navigation/sections.ts`. Pinx demo views still exist
on disk and are unreachable by design (e.g. `views/Maps/MapLibre.vue`, the only file that
ever read the MapTiler key). **Do not link them into `sections.ts`** — they carry vendor
assumptions and external dependencies.

Template residue to strip whenever you touch an adopted file: `pinx.vercel.app` URLs,
`author` = D\*VERSE Studio, `twitter:creator`, and `Logo.vue`'s `aria-label` reading
**"SOCFortress logo"** — a wrong brand from an earlier template lineage.
