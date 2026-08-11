# ADD Loader (Convergence 1.2) — integration design

**Date:** 2026-08-04 · **Status:** design approved, not yet implemented
**Source artefact:** `C:\Users\User\Downloads\AddLoader.vue` — an approved Vue 3 SFC
that draws the ADD `a`/`d` mark as a Smart Olive ray that solidifies into white
letters, pulses on the mark's edge while waiting, then fades on delivery.

Two products consume it: the **public site** and this **operations dashboard**.
The Flutter member app, the reception kiosk and ADDCore (Laravel API, serves no
UI) are out of scope.

---

## 1. What the brief assumed, and what is actually on disk

The task brief described the public site as **Nuxt (Vue SSR)**. It is not.

| Brief | Reality |
|---|---|
| Public site: Nuxt (Vue SSR) | `C:\Users\User\Desktop\ADD` — **Next.js 15.3.2 + React 19**, App Router, tRPC 11, React Query 5, Drizzle. Package name `add-website`. **No `nuxt.config.*` exists anywhere on this machine.** |
| Dashboard: Vue 3 SPA on Pinx | Confirmed. `AddDashboard`, Pinx v1.23.0, vue-router 5, Pinia, Naive UI, Tailwind 4, TS strict, Vitest + Cypress. |
| Possibly a monorepo | No. Three separate projects, two different parent folders. `AddDashboard/pnpm-workspace.yaml` declares `packages: ["."]` — itself only. |

A Vue SFC cannot run in React. The brief's "same file, byte-identical, in both
places" therefore cannot be satisfied by `AddLoader.vue` itself — but it **can**
be satisfied by the part that matters, because `createAddMark()` never touches
Vue. It takes a DOM element and manipulates `document`. That is the whole engine:
the drawing maths, the keyframe table `K`, the easings, the SVG construction.

So the shared unit is the engine, not the wrapper.

---

## 2. Locked decisions

Four decisions were put to the brand/product owner during design. All four are
settled; the reasoning is recorded so a later reader sees the trade-off rather
than assuming the first answer was simply obvious.

### D1 — Architecture: shared engine, two thin wrappers

Chosen over (a) dashboard-only, and (b) waiting for a Vue/Nuxt public site.

```
add-loader-engine.js    createAddMark + ensureGrainTexture + VB/PD/K/E
add-loader.css          the SFC's styles, de-scoped
   ├── AddLoader.vue    ~70-line wrapper   (AddDashboard)
   └── AddLoader.tsx    ~70-line wrapper   (ADD / Next.js)
```

The first two files are **byte-identical copies** in both projects — separate
repos, as the brief specified for the non-monorepo case.

Moving the CSS out of `<style scoped>` is required for React parity. The move is
literal: same selectors, `:deep()` unwrapped, nothing re-authored. Colour
declarations are the one change — see D4.

### D2 — Splash duration: floor at 4.6 s, total ≈ 6.4 s

`speed="slow"` (rate 1.35) is the official splash rhythm per the brief. The
engine's own numbers then decide the rest:

| Moment | Wall clock at rate 1.35 |
|---|---|
| Mark fully solidified (`K.bloom` ends, 2.86 normalized) | 3.86 s |
| One edge-pulse beat complete (3.4 normalized — the value the approved demo passes to `setReady`) | **4.59 s** |
| `done` fires (`+1.35` normalized of exit) | **≈ 6.4 s** |
| Engine's unconditional floor if `ready` arrives instantly | 4.87 s |

The last row is the trap. `deliver()` computes
`readyAt = max(elapsedRaw, K.minReady)` where `K.minReady = 3.05` — in **raw**
seconds, while `apply()` compares against **normalized** time. At rate 1.35 that
puts the exit start at 3.46 s, while the bloom does not finish until 3.86 s: the
letters begin fading at roughly 60 % of the way through solidifying, and the edge
pulse (`K.pulse` = 2.38–3.00 normalized) never appears at all. A splash on the
engine's bare minimum shows a compromised version of the approved choreography.

**Decision: hold `ready` until 4.59 s** so the sequence renders as approved.
Cost: a ~6.4 s splash. Mitigated by showing it **once per session**, so it is not
paid on every reload. Rejected alternatives: accept the 4.9 s clipped version
(visual compromise), or use `speed="fast"` for the splash (4.75 s, faithful, but
contradicts the brief's "slow is the official splash rhythm" and makes the splash
indistinguishable in rhythm from an inline indicator).

### D3 — The dashboard's existing full-screen splash is replaced

`src/app-layouts/common/SplashScreen.vue` currently renders a generic Naive UI
`n-spin` over a white blur, driven by a 500 ms artificial timer in `App.vue`. It
is rebuilt around `AddLoader`. Naive UI's spinner leaves this file.

### D4 — Colours enter through the token chain, never as literals

Both loader colours are already canonical brand primitives:

| Loader constant | Token | Guideline |
|---|---|---|
| `OL = '#809C66'` (ray, pulse, halo, beads) | `brand.smartOlive` | p.14 |
| `#43474F` (veil background) | `brand.charcoalBackbone` | p.14 |

Hex literals inside `src/add-os/` exist **only** in the token chain today
(`tokens.ts`, `tokens.json`, `tokens.generated.css`, `tokens.dart`, plus their
tests). Dropping the loader in with raw hex would be the first breach of
invariant 2. And `tokens.ts:29` forbids the shortcut: *"A component must never
reach past Tier 2. If a component needs a Tier 1 value directly, the missing
thing is a Tier 2 token."*

Resolution — three **Tier 3 component tokens** in `tokens.ts`, alongside the
existing `sidebar` and `deferred` groups:

```ts
/**
 * The ADD mark animation. Brand artwork, not UI chrome — Tier 2 has no role
 *  for "the colour the logotype is drawn in", which is why this is Tier 3.
 */
addLoader: {
  /** B · Smart Olive verbatim. The ray, the edge pulse, the halo, the beads. */
  ray: string
  /** B · Charcoal Backbone verbatim. The full-bleed veil behind a hero splash. */
  veil: string
  /** The solidified letterforms, on the charcoal veil. */
  mark: string
}
```

`mark` maps to the existing Tier 2 `textOnDark`. `ray` and `veil` are provenance
**`B`** — brand verbatim, no contrast adjustment, because this is the logotype
rather than text or a functional boundary, so neither 4.5:1 nor 3:1 binds.

This extends the wrapper's public props beyond the seven the brief lists as the
approved, ready API (`speed`/`ready`/`loop`/`size`/`background`/`markColor`/
`label`). `markColor` already existed, optional, default white — it becomes
required, no default. `rayColor` and `veilColor` are new: today the ray colour
is the hardcoded module constant `OL` and the veil colour is a hardcoded value
in the scoped CSS class (`.add-loader--bg`); neither was a prop at all. Both
become required props with no default, for the same reason `markColor` loses
its default — see `env.ts` in §5.3 for the codebase's standing convention that
a silent fallback is the failure mode to design out, not around.

Consequences, all intended:
- `add-loader-engine.js` carries **no colour literal at all**. `rayColor`,
  `markColor` and `veilColor` are required options with no defaults. This is
  additive parameterisation of `OL` — the maths is untouched.
- `add-loader.css` carries **no colour** either. The wrapper sets the veil
  background from `veilColor`.
- Every colour enters at exactly one place per product: the wrapper.
- `npm run design-tokens` must be re-run; `tokens.generated.css`, `tokens.json`,
  `tokens.dart` and `src/design-tokens.json` are regenerated. `tokens.spec.ts`
  gains assertions for the three new tokens.

**Finding, deliberately not acted on.** The public site's `app/globals.css`
carries the brand palette as oklch approximations that have drifted from the
Guideline values — `--color-smart-olive: oklch(0.65 0.10 140)` against `#809C66`
(≈ oklch 0.635 0.075 131): noticeably more chroma, hue off by ~9°. Charcoal is
close. This predates the loader and is not the loader's to fix. The loader uses
the exact Guideline hexes in both products; the site's palette drift is logged
for the brand owner in `docs/GUIDELINE-FEEDBACK.md` and left alone.

### D5 — Scope: splash everywhere, transition indicator only where it can fire

A route inventory changed this decision, so the survey is kept.

**Dashboard.** All 28 operational pages render `ComingSoon` through a **static**
import — [`add-os/navigation/routes.ts`](../../../src/add-os/navigation/routes.ts)
documents why (28 pages share one component; lazy loading would emit the same
chunk 28 times). There is no asynchronous chunk to wait for, so a router-driven
indicator has **zero surface** on every operational route. The only lazily loaded
routes are `NotFound` and the auth screens — and the unauthenticated path in
`utils/auth.ts` uses `window.location.replace()`, a hard load, not a client-side
navigation.

Shipping a router-wired indicator that cannot fire runs straight into
invariant 4, *no shipped control may be a no-op*, and makes the brief's fourth
test ("verify visually") impossible to perform.

**Public site.** The landing page has no routing at all: `Navbar.tsx` uses plain
`<a href>` with `scrollIntoView` for `#home` / `#about` / `#contact`, and the
logo does `window.location.href = '/'` — a hard load. All eight pages are
`"use client"`. The real client-side navigations are:

```
/events        →  /events/[id]        <Link>
/events/[id]   →  /events             router.push
/admin         ↔  /admin/dashboard    DashboardLayout sidebar
/apply         →  /                   router.push
/not-found     →  /                   router.push
```

**Decision: build the indicator for the four public-site segments that receive
real client-side navigation, and drop the dashboard's router indicator** — drop,
not defer behind dead code. The wrapper ships with `loop`, `inline` and
`background` fully supported, so wiring the dashboard later is one small file
once a module with an async route or a real table exists. The recipe is
documented rather than pre-built.

---

## 3. Deliberate deviations from the brief

The brief says not to modify the drawing/timing logic inside `<script setup>` —
it is tuned and approved. Two changes here touch behaviour anyway, both forced
by the engine's own numbers (V1, V2). A third touches the engine *file* (D4's
colour parameterisation) but not the animation: with the same colours supplied,
every frame renders identically to today. It is listed again here only so all
three edits to the shipped-as-is source are in one place, not because it carries
the same weight as V1/V2.

### V1 — The transition indicator uses `loop`, not `ready`

The brief specifies
`<AddLoader speed="fast" size="inline" :background="false" :ready="navReady" />`.

`deliver()`'s floor is unconditional, so **any** instance that becomes visible
lives at least 4.4 s (fast) / 4.9 s (slow) regardless of how fast `ready`
arrives. A 300 ms navigation would show a 4.4-second indicator — strictly worse
than showing nothing. Debouncing the *appearance* by 150 ms does not help; the
floor is on the exit.

`loop` is documented in the source for exactly this case — *"an unending
decorative cycle, no dependence on `ready`, for a persistent loading indicator
somewhere in the UI"*. So the indicator runs looping and is **unmounted** when
navigation completes, with a 180 ms CSS fade. `ready` / `@done` stay with the
splash, which is what they were designed for.

### V2 — A `minVisibleMs` prop on the wrapper

D2 cannot be implemented without it, and pushing a floor computation into every
host would duplicate the constant.

- **Engine:** maths untouched. One additive export,
  `FAITHFUL_READY_MS = { slow: 4590, fast: 3400 }`, derived from `K` and kept
  beside it.
- **Wrapper:** new prop `minVisibleMs`, default `null` — **default behaviour is
  byte-for-byte today's behaviour**. When set and `ready` arrives earlier,
  `deliver()` is scheduled at the floor instead of called immediately.
- **Ignored entirely under `prefers-reduced-motion`.** Without that exception a
  reduced-motion user stares at a static frame for 4.6 s.

This does modify timing *orchestration* inside `<script setup>`. It does not
modify the drawing engine. Flagged rather than hidden.

### D4, restated — the colour parameterisation is structural, not behavioural

See §2 D4 for the full reasoning. Recorded here for completeness: `OL` stops
being a hardcoded module constant and becomes a required option
(`rayColor`/`markColor`/`veilColor`) on `createAddMark()`. No default is
supplied — a caller that omits a colour gets an error, not a silent fallback,
matching this codebase's `env.ts` convention (§5.3). Given the same three
colours, the rendered animation is pixel-identical to the source file. This is
why it is not counted alongside V1/V2 as a behavioural deviation, even though it
is, mechanically, an edit below the line the original file marks as
"no need to modify for normal usage."

---

## 4. File layout

### AddDashboard (Vue) — new

```
src/add-os/components/loader/
├── add-loader-engine.js      canonical engine · byte-identical across products
├── add-loader.css            geometry only, no colour
├── AddLoader.vue             wrapper: props/emits + minVisibleMs
├── README.md                 usage + the inline recipe for the first table module
└── __tests__/
    ├── add-loader.spec.ts        reduced motion · unique SVG ids · rAF cleanup
    ├── engine-integrity.spec.ts  sha256 vs the header digest
    └── splash-contract.spec.ts   the splash passes speed="slow"
```

`src/add-os/` is the folder ADD OS owns (file-ownership category A). The
component does not go in `src/components/`, which is vendor territory.

### AddDashboard — modified

| File | Change |
|---|---|
| `src/app-layouts/common/SplashScreen.vue` | Rebuilt around `AddLoader`. `n-spin` removed. `v-if`, sessionStorage gate. |
| `src/App.vue` | The single `loading` ref serves two jobs today (`opacity-0` on the layout at L10, `:show` on the splash at L26). Split into `appReady` and `splashVisible`. |
| `src/add-os/theme/tokens.ts` | Tier 3 `addLoader` group (D4). |
| `src/add-os/theme/__tests__/tokens.spec.ts` | Assertions for the three new tokens. |
| `src/add-os/theme/tokens.{generated.css,json,dart}`, `src/design-tokens.json` | Regenerated via `npm run design-tokens`. |
| `src/add-os/modules/README.md` | Cross-reference to the loader recipe. |
| `docs/GUIDELINE-FEEDBACK.md` | Log the public site's oklch palette drift (D4). |

### ADD (Next.js) — new

```
lib/add-loader/
├── add-loader-engine.js      byte-identical copy
├── add-loader.css            byte-identical copy
└── brand.ts                  the two exact hexes, naming AddDashboard's
                              tokens.ts as source of truth (this project has
                              no token pipeline)
components/
├── AddLoader.tsx             wrapper: same prop names, `onDone` for `done`
├── AddSplash.tsx             client overlay: sessionStorage + readiness
└── RouteLoading.tsx          150 ms-deferred looping inline indicator
app/events/loading.tsx
app/events/[id]/loading.tsx
app/admin/loading.tsx
app/admin/dashboard/loading.tsx
scripts/check-add-loader-sync.mjs   sha256 check, wired into `npm run check`
```

### ADD — modified

| File | Change |
|---|---|
| `components/Providers.tsx` | Mount `<AddSplash>` inside `QueryClientProvider`. |
| `package.json` | `check` also runs the sync script. |

### Drift protection across the two repos

The projects share no parent repository, so no script can reach both. Instead
each copy records the canonical `@sha256` in its own header and verifies itself:
Vitest in the dashboard, a plain Node script (no new dependency) in the site. An
accidental edit to either copy fails that copy's own check. An intentional update
means updating the digest in both — which is the point.

---

## 5. Integration specs

### 5.1 Public site splash

`<AddSplash>` is a client component inside `Providers.tsx`, within
`QueryClientProvider`.

```
speed="slow"  size="hero"  minVisibleMs={4590}  ready={appReady}  onDone={unmount}
```

**`appReady` = the two tRPC queries `ComingSoonGuard` already depends on have
settled** — `admin.comingSoon.isEnabled` and `admin.me`. Same query keys, so
React Query dedupes; no extra request. This is the answer to the brief's open
question for this product, and it is not arbitrary: until those settle the page
can flip from content to `ComingSoonContent`, and the splash hides that flash.

- **An error counts as ready.** Otherwise a failed API pins a visitor behind the
  splash forever.
- **10 s hard ceiling** regardless of query state. A splash must never trap
  anyone.
- **Once per session.** SSR always renders the overlay markup; `useLayoutEffect`
  removes it before first paint when `sessionStorage` says it has been seen. The
  initial client render matches SSR, so no hydration mismatch, and because the
  effect runs pre-paint there is no flash on repeat loads.
- Removed from the DOM on `onDone` — conditional render, not `visibility`.

### 5.2 Public site transition indicator

`RouteLoading.tsx` defers 150 ms, then renders
`<AddLoader loop speed="fast" size="inline" background={false} />`. The four
`loading.tsx` files each render it. Suspense unmounts the boundary when the
navigation resolves, so no `ready` and no `done` — see V1.

150 ms is a starting value, to be tuned against a real network once the internal
host is configured.

### 5.3 Dashboard splash

`SplashScreen.vue` renders `AddLoader` at `hero` / `slow` / `minVisibleMs=4590`,
gated once per session, removed via `v-if` on `@done`.

`App.vue` splits its state:

- `appReady` — reveals the layout underneath the overlay (replaces `opacity-0`
  keyed on `loading`).
- `splashVisible` — the `v-if`, cleared by `@done`.

The result reads better than today: the veil fades to reveal the real
application, instead of fading to reveal a blank frame.

**`appReady` = `onMounted`.** This is the answer to the brief's open question for
this product, and the code settles it rather than inference:
`add-os/config/env.ts` states plainly that no screen makes a request yet, and
`VITE_API_URL` is unset. The existing 500 ms timer is pure theatre. A code
comment records the reason and points at `env.ts`, so that whoever lands the API
layer knows this is the line to extend.

### 5.4 Dashboard inline loader

Not wired — there is no heavy table yet (D5). `loader/README.md` carries the
ready-to-use recipe (`loop`, `inline`, `background={false}`, bounded-width
container, unmount on data arrival), referenced from `modules/README.md` so the
first table module picks it up.

### 5.5 RTL

The mark is text-free SVG and `dir` does not mirror SVG geometry, so no visual
change is expected. What is actually checked: our own styles use `inset` and
logical properties only — no physical `left` / `right` — and a manual pass over
`dir="rtl"` and `dir="ltr"` confirms centring in both. Pinx's RTL support is beta,
so this is verified rather than assumed.

---

## 6. Test plan

The brief's five required checks, plus the drift guard:

| Check | How |
|---|---|
| `slow` is used in the splash, never `fast` | Unit assertion on the props `SplashScreen.vue` and `AddSplash.tsx` pass |
| Reduced motion | `matchMedia` faked → no `requestAnimationFrame` at all, one static frame; with `ready=true` at mount, `done` fires immediately with no exit animation and `minVisibleMs` ignored |
| Two concurrent instances | Mount two, assert the generated `filter` ids differ (`uid` stays module-scoped, so one engine module per bundle keeps them unique) |
| No `requestAnimationFrame` leak | Unmount mid-load → `cancelAnimationFrame` called, no further tick |
| Engine integrity | sha256 against the header digest, in both projects |
| Token chain | `tokens.spec.ts` covers the three Tier 3 values; `npm test` runs the full guard suite |

End-to-end (Cypress, dashboard only): splash appears on hard load, leaves the DOM
after `done`, and does not reappear on client-side navigation.

**Stated honestly:** the ADD site has no test runner — its `check` script is
`tsc --noEmit` and nothing else. Adding Vitest to it is outside this task. So
unit tests live in the dashboard, and the site gets the sha256 check in
`npm run check` plus documented manual verification steps. The React wrapper is
therefore covered by type-checking and manual verification, not by unit tests.

---

## 7. Out of scope

- Flutter member app, reception kiosk, ADDCore.
- The dashboard's router-driven transition indicator (D5) — dropped, with the
  recipe documented.
- Fixing the public site's oklch palette drift (D4) — logged for the brand owner.
- Making the 28 `ComingSoon` routes lazy so an indicator would have something to
  wait for. That inverts the reasoning: the static import is a documented
  bundle-size decision, and manufacturing latency to justify a loader is
  backwards.
- Adding a test runner to the ADD site.

## 8. Items this design does not settle

| Item | Owner | Why it is not blocking |
|---|---|---|
| Public site palette drifts from Guideline hexes | Brand | The loader uses exact Guideline values in both products; the site's other components are untouched. |
| 150 ms debounce before the transition indicator | Product | Starting value from the brief; tune against a real network once `VITE_API_URL` is set. |
| Whether ~6.4 s once per session is right in practice | Product | D2 is decided and implementable; revisit after it has been seen on a real connection. |
