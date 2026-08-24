# Project: ADD OS — Operations Dashboard

The admin/operations web app for **ADD OS** (Aleppo Digital District Operating System) —
the internal dashboard staff use to run memberships, bookings, wallet/payments, smart-door
access and incubation programs. **Vue 3 + TypeScript · Naive UI · Tailwind v4 · Pinia ·
vue-i18n (ar/en, RTL-first) · Vitest**, built on the purchased **Pinx** template.

One of four ADD OS consumers (this dashboard, Flutter member app, Nuxt public site,
reception kiosk). **Network-isolated**: VPN/office only. An external URL is a broken
feature, not a slow one.

<!-- Maintainer note: this file is stripped of HTML comments before it reaches context,
     so notes here cost nothing. Keep this file under 200 lines. Detail belongs in
     .claude/rules/ (path-scoped, loads only when relevant) or docs/. -->

Two things define how work happens here:

1. **This is a vendor template being re-skinned, not a greenfield app.** Which category a
   file falls in decides whether you edit it or override it.
2. **Every rule below is enforced by a guard test, not by good intentions.** Deleting a
   control does not remove a capability. Run the guards.

---

## File ownership — decides edit vs. override

| Category | Rule |
|---|---|
| **A — `src/add-os/**`** | Ours. Edit freely. |
| **B — template files we've adopted** (`index.html`, `Logo.vue`, brand assets, `.env*`, `.gitignore`) | Ours now. Edit directly; strip Pinx / SOCFortress / D\*VERSE residue when you touch them. |
| **C — vendor `src/**` outside `add-os`** | **Override, never edit.** Values go through `themeOverrides` from our layer, or SCSS in `src/add-os/theme-overrides/`. |
| **D — `_pinx-vendor/**`** | Read-only reference. Never modify, never import from. |

If a fix appears to require editing a Category C file, that means the override layer is
missing a hook. **Say so instead of reaching into vendor code.**

---

## Commands

- `pnpm dev` — dev server (`pnpm dev:host` binds `--host`)
- `pnpm build` — production build; runs `type-check` and `build:only` (`vite build`) together
- `pnpm test:unit` — Vitest, **includes the architecture guards. Never skip.**
- `pnpm lint` — ESLint, and **it applies fixes** (`eslint . --fix`), not just a check
- `pnpm type-check` — `vue-tsc --build --force`
- `pnpm tokens` — regenerate every token artifact (DTCG `tokens.json`, `tokens.generated.css`,
  `tokens.dart`, `figma-tokens.json`, `src/design-tokens.json`) from the one hand-authored
  source, `src/add-os/theme/tokens.ts`
- `pnpm design-tokens` — interactive Figma Tokens export/import tool (`tokens-tool.js`).
  Export re-derives `figma-tokens.json` from `src/design-tokens.json` (redundant with
  `tokens`, harmless). **Import is disabled** — it hard-stops rather than silently
  discarding hand-authored `tokens.ts` values on the next `pnpm tokens` run.

**Run the full suite after any change to theme, tokens, env, or a user-facing control.**
Or run `/guards`.

---

## Invariants — never violate, from any file

These live here rather than in `.claude/rules/` because they can be broken from anywhere,
and because a root `CLAUDE.md` is re-read from disk after `/compact` while path-scoped
rules only reload when Claude next touches a matching file.

1. **`src/add-os/theme/tokens.ts` is the single hand-authored source of design truth.**
   `src/design-tokens.json` is **generated** — editing it is erased on the next
   `design-tokens` run. Never add a second palette source; Naive UI and Tailwind both
   derive from this one chain.
2. **Zero hardcoded design values in `src/add-os/`** — no hex, no `rgb()`, no raw px for
   spacing/radius/font-size. Currently true and verified by grep. Keep it true.
3. **No runtime theming, ever.** Brand colour is not a user preference. Dark mode is out
   of scope for v1; `themeName` is read-only and its store writers are deleted. Do not
   reintroduce a write path.
4. **No shipped control may be a no-op.** Removing a dead control means removing the
   capability behind it, plus its i18n keys and its orphaned SCSS.
5. **A Guideline ambiguity is settled by the brand owner, never by a developer's
   inference.** Log it in `docs/GUIDELINE-FEEDBACK.md` and keep the affected rule
   structurally disengaged until it's ruled on.
6. **Never commit a `.env` file, and never quote a credential fragment anywhere** —
   including in documentation. Half a key is the same mistake one step smaller.
7. **New dependencies need approval before installation.** State what it is, what it
   replaces, its licence, and whether it makes any network call.

---

## Code Style & Conventions

- TypeScript strict. No `any`.
- Vue 3 SFCs, `<script setup lang="ts">`, Composition API.
- Naive UI components first; Tailwind utilities for layout. No new custom CSS files —
  extend `src/add-os/theme-overrides/`.
- All numbers rendered through `src/add-os/utils/format/`.
- All user-visible strings through vue-i18n, in **both** `ar` and `en`. No literal
  strings in templates.
- Icons: Carbon (`carbon:*`), bundled locally. No icon CDN.
- Token provenance is part of the type: **`B`** brand verbatim · **`B*`** brand,
  contrast-adjusted (hue preserved) · **`D`** derived. New values register as `derived`,
  never quietly promoted to a brand colour.

---

## Workflow

- **Phase discipline.** An approval gate sits between phases: 0 audit (no code) →
  1 tokens → 2 components → 3 states & copy → 4 brand assets → 5 RTL. Don't pull the
  next phase's work into this one.
- **Audit before you write.** Read the vendor file and the relevant guard test first.
  Grep, don't assume — the last sweep found three dead theme controls where one was
  known, and one had no visual presence at all. **A checklist over the rendered UI misses
  store actions, command-palette entries, and orphaned SCSS.**
- **Never overwrite reasoning when a decision changes.** Append the reversal with what
  was given up. A future reader must see the trade-off, not assume the first answer was
  simply wrong.
- **Surface gaps unprompted.** One focused question at a time; wait for the decision.
- Update the relevant `docs/` record in the same change that alters behaviour.

---

## Required reading

- `@docs/brand/PHASE-0-AUDIT.md` — brand extraction, every contrast/ΔE measurement, token
  tiers, locked decisions, migration inventory of hardcoded values.
- `@docs/PHASE-3-DEAD-CONTROLS.md` — what was removed from the shell and why.
- `@docs/SECRETS-RESOLUTION.md` — env/secrets posture; what each guard enforces.
- `@docs/GUIDELINE-FEEDBACK.md` — the deviation register and the open questions for the
  brand owner. **Read before touching colour, type, or service naming.**

Detailed rules load automatically from `.claude/rules/` when you open matching files.

---

## Open — do not resolve unilaterally

| Item | Owner |
|---|---|
| `Event` vs `Events`. Philosophy says *Event*; Guideline, site and brand artwork say *Events*. Blocks nav labels + ar/en catalogues + seed data at once. | Brand |
| "Aleppo Spice" — named in the p.15 strict rule, defined nowhere. Probably Aleppo Economic Orange; **deliberately not assumed**. | Brand |
| White-on-Warm-Mist as the intended surface hierarchy, or a named neutral for cards. | Brand |
| Noto IKEA Arabic licence + `woff2`, or a Guideline revision naming an embeddable face. | Brand |
| Adopt or deliberately replace `warning` `#E7B155` as a canonical brand state colour. | Brand |
| `borderStrong` light-mode value (Aleppo Stone fails 3:1). | Design |
| **Set the real internal `VITE_API_URL`.** Empty today; production refuses to start. | Infra |
| List-endpoint pagination shape. `pagination.ts`/`listPage()` assume Laravel's default paginator (`data` + `meta: {current_page, last_page, per_page, total}` + `links`), but it's never been observed: zero example responses anywhere in `ADD-OS.postman_collection.json`, and the one admin list endpoint live-tested so far (`GET /api/v1/admin/plans`) returned a flat array with no `meta` at all. Need one real response body from a documented-paginated endpoint (e.g. `GET /api/v1/admin/error-logs?page=2`, the one endpoint the collection describes in prose as "Paginated (25 per page)") before any pagination UI work starts. | Backend |
| Courtesy: tell the Pinx vendor their MapTiler keys shipped in a publicly sold template. Not ADD's to revoke. | Infra |
