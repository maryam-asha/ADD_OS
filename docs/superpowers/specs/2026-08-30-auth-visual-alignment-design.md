# Auth screens — visual alignment with the member app — design

**Status:** approved 2026-08-30 (sections 1–5, in chat).
**Owner decisions taken at design time:** design source = supplied screenshots only;
auth CTA = green; wide-screen layout = Deep Teal panel + white sheet.

**Sources.**

- **Member-app screens**, as supplied by the owner: six auth frames (`reset-password`,
  `create-new-password`, `01 — Explore (Visitor)`, `02 — Sign up`, `03 — Verify code`,
  `create-account-screen`), one brand colour-palette board, and two home-screen frames.
  From the Figma file *ADD OS — Design System & Screens (Copy)*, node `2390-3213`.
- **API claims** cite the pinned snapshot `docs/api/ADD-OS.postman_collection.json`,
  pin date **2026-08-27**, `sha256` `25ad21db…75f9932f`, 211 leaf endpoints.
  `pnpm api:collection:check` was run at design time and reported **MATCH**.

### A limit on this spec, stated up front

The Figma file itself **was not read**. The `claude.ai Figma` connector is unauthorized in
this environment, so `get_design_context` / `use_figma` were unavailable. The owner chose
to proceed from screenshots (2026-08-30).

The practical consequence: this design matches the member app's **structure, hierarchy and
colour distribution**, which are legible in the screenshots. It does **not** claim to match
its spacing scale, type ramp or exact hexes — those were never measured. Every value here
resolves through `src/add-os/theme/tokens.ts`, which is what Invariant 2 requires anyway.
Where a screenshot colour was measured, it was measured from the palette board's printed
hex labels, not sampled from a pixel.

---

## Goal

Bring the four ADD OS auth screens into the member app's visual language, and in doing so
move them out of vendor code into `src/add-os/`.

## Scope

In scope: `/login` (including the two-factor step), `/forgot-password`, `/reset-password`,
the shell they share, one new component-token group, and both message catalogues.

Out of scope, deliberately:

- **Any screen behind the login.** The owner's stated intent is that the whole dashboard
  eventually follows this colour distribution; this spec covers the auth batch only, and
  records the palette rulings the rest will inherit (§3).
- **Sign-up.** ADD OS has no self-registration; see §2.3.
- **Any backend change.** All four screens use endpoints that exist today.
- **Restoring dark mode.** Out of scope for v1 per `CLAUDE.md` Invariant 3.

---

## 1 · What is there today

All four screens are vendor code under `src/**` outside `add-os` — Category C, which
`CLAUDE.md` says to override and never edit. Re-skinning them in place is therefore not
available; the work is a move.

| File | Role today |
|---|---|
| `src/views/Auth/Login.vue` | The page. Routed from `/login` and `/forgot-password`. |
| `src/views/Auth/main.scss` | Split layout; the panel's `pattern-onboard.png` is Pinx artwork. |
| `src/components/auth/AuthForm.vue` | Title/subtitle + step switching. English string literals. |
| `src/components/auth/SignIn.vue` | Email + password. English string literals. |
| `src/components/auth/TwoFactorChallenge.vue` | 2FA step. English string literals. |
| `src/components/auth/ForgotPassword.vue` | Already fully translated — the one exception. |
| `src/components/auth/SignUp.vue` | Unrouted. Its submit button has no handler. |
| `src/components/auth/Settings.vue` | A floating runtime alignment + colour control. See §2.1. |
| `src/add-os/modules/auth/views/ResetPasswordPage.vue` | **Ours already.** Kept, re-skinned. |

`src/components/common/PasswordStrengthMeter.vue` is imported only by `SignUp.vue` and so
leaves the bundle with it.

---

## 2 · Three live defects this work removes

These were found by reading the code, not the rendered screen — the method
`CLAUDE.md` prescribes after the last sweep found three dead theme controls where one was
known.

### 2.1 A runtime palette control ships on `/login`

`Settings.vue` renders a fixed pill over the login page carrying three alignment buttons
and five colour swatches. Choosing a swatch repaints the panel immediately, through
`v-bind(activeColor)` in `Login.vue`'s scoped style. Its swatches come from
`themeStore.style["extra1-color"]` … `extra4-color` — the chart ramp.

**Why `no-runtime-theming.spec.ts` does not catch it, precisely.** That guard scans all of
`src` — vendor files included — but it looks for two things: definitions of and calls to
the five removed store actions, and direct assignment into `.colors[…]`. `Settings.vue`
does neither. It *reads* the store and writes a **local `ref`**, which a scoped `v-bind`
then paints. The capability guard cannot see a repaint that never goes through the store.

This is the same class of control `PHASE-3-DEAD-CONTROLS.md` removed from the shell, still
live on the one page every user must pass through. Deleting the vendor page removes it.

*(An earlier note in this design said the guard "does not scan vendor code". That was
wrong and is corrected here rather than overwritten: it scans everything under `src`; the
control evades it by construction, which is the more useful fact.)*

### 2.2 "Remember me" is a no-op

`SignIn.vue:26` renders `<n-checkbox size="large">Remember me</n-checkbox>` with no
`v-model` and no binding. `services/auth.ts:36` sends `{ email, password }` and nothing
else.

Searched the pinned 2026-08-27 collection for `remember`, case-insensitively: **no
matches** across 211 leaf endpoints. There is no field to send.

So it is a no-op with no backend behind it, and Invariant 4 decides it: **it does not move
to the new screen.** Adding it later means adding the capability first.

### 2.3 Sign-up is unreachable and inert

`SignUp.vue` is imported by nothing and routed from nowhere; `AuthForm.vue` can only switch
between `signin`, `forgotpassword` and `twofactor`. Its submit button has no `@click`.

ADD OS is a staff dashboard on an isolated network, and `services/auth.ts` exposes no
registration call. The screen has no counterpart in this product and is **not carried
over**. The member app's `02 — Sign up` / `03 — Verify code` / `create-account-screen`
frames are therefore reference for *visual language only* — never for flow.

### Disposal, not deletion

None of these vendor files are edited or deleted. They stop being imported, and so drop
out of the bundle exactly as the removed Pinx demo views did — the precedent is recorded at
`src/router/index.ts:13-16`. `_pinx-vendor/**` is untouched.

---

## 3 · Palette — what maps, what is blocked

### 3.1 The neutral foundation already matches

Measured against the supplied home-screen frames and palette board:

| Member app | ADD OS token | Status |
|---|---|---|
| Warm off-white page ground | `semantic.body` — Warm Mist `#E2DDDB` | already identical |
| White cards, hairline border, ~12px radius | `semantic.surface` + `borderWidth.hairline` + `radius.large` | already identical |
| Charcoal headings and body | `semantic.textPrimary` — `#43474F` | already identical |
| Dark hero panel ("Build. Connect. Grow.") | `brand.levantDeepTeal` — `#314550` | token exists, **unused in chrome today** |

The owner's request — that the design follow this arrangement of colours and their
distribution — is therefore mostly already satisfied by the existing token set. The only
genuinely new surface is the dark panel, and it uses a brand colour verbatim.

### 3.2 Two colours are blocked, and the block is a test

The member app's primary CTAs are Aleppo Economic Orange `#DC4128` ("Explore ADD →",
"Discover Opportunities →") and its secondary outlined buttons are Signal Cyan `#00BFDF`
("View Booking", "View Event").

Both are pillar colours — `PILLARS.core.color` and `PILLARS.experience.color`,
`tokens.ts:738-751`. `tokens.spec.ts` asserts, per mode, that **no semantic and no
component token equals any pillar hex**. Using either as dashboard chrome fails
`pnpm test:unit` outright.

The reason is recorded at `tokens.ts:719-727`: in this dashboard orange means `danger` and
nothing else, and that exclusivity is what makes a destructive action unmistakable. If
orange also meant "Core service", the guarantee collapses.

**Neither is adopted here.** Both go to the brand owner as open questions (§8). This is
Invariant 5: a developer does not settle it by inference.

### 3.3 The auth green already exists, and it is named `success`

The member app's auth CTAs are green. Two independent facts constrain which green ships:

1. **Smart Olive `#809C66` is a pillar colour** (Ecosystem), so it fails the same guard.
2. **It fails AA regardless.** With white text it measures **3.06:1**; AA needs 4.5.
   `DERIVATIONS.successFill`'s own note records this independently as 3.05:1.

So the green must be a contrast-adjusted Smart Olive — provenance `adjusted` (`B*`), hue
preserved. And that value **already exists in the system**:

```
DERIVATIONS.successFill = "#657C50"   from: smartOlive   provenance: adjusted
  "darken 0.105. Smart Olive carries white text at only 3.05:1; this reaches 4.61."
```

Verified independently at design time: `#809C66` is hue 91.1°, `#657C50` is hue 91.4° —
the same hue at lower lightness (HSL L 0.506 → 0.400), reaching 4.61:1 with white.

**Therefore the auth CTA references `DERIVATIONS.successFill`; it does not restate its
value.** Minting a second derivation with the same recipe would be a second source for one
colour, which Invariant 1 forbids in spirit even inside the one authored file.

The visible consequence, stated plainly because the owner should not discover it in
review: **the sign-in button will be the same green as a success message.** That is not a
mistake to be papered over with an invented offset — it is what "the contrast-adjusted
brand olive" resolves to, and there is only one of those. Whether auth's green should be
visibly distinct from the success green needs a brand-sanctioned second green, and is
logged as an open question (§8).

### 3.4 The new token group

Added to `ComponentTokens` (Tier 3), following the existing `sidebar` / `deferred` shape:

```ts
auth: {
  /** The brand panel. Levant Deep Teal, verbatim — the member app's hero surface. */
  panelBackground: string   // brand.levantDeepTeal
  panelText: string         // light.textOnDark — 7.43:1, already asserted
  /**
   * The CTA ramp. References the success ramp rather than restating it: both
   * are the one contrast-adjusted Smart Olive. See the design spec §3.3.
   */
  actionBase: string        // DERIVATIONS.successFill.value — 4.61 with white
  actionHover: string       // light.success.hover
  actionPressed: string     // light.success.pressed
  actionOn: string          // light.success.on — white
}
```

`pnpm tokens` regenerates all five artifacts from this. Nothing is hand-edited downstream.

### 3.5 How the green reaches the button

The auth views wrap their form in an `n-config-provider` carrying a **static,
token-derived** `themeOverrides` that remaps `primaryColor` / `Hover` / `Pressed` /
`Suppl` to the `auth.action*` ramp, so templates keep writing `type="primary"`.

This needs justifying against `no-runtime-theming.spec.ts`'s stated rationale — that an
override makes asserted ratios vacuous. It is legitimate here on two conditions, both of
which this design meets:

- the override is a build-time constant read from `tokens.ts`, with no write path and no
  user control; and
- **its ratios are asserted too.** §6 adds the auth ramp to `tokens.spec.ts`. An override
  whose values are unasserted is exactly the hole that guard exists to close.

Hover and pressed are supplied explicitly, never derived — `.claude/rules/tokens-and-color.md`
records that the vendor's `getThemeColors()` derives hover by lightening and drops every
light-mode hover below AA.

---

## 4 · Structure

```
src/add-os/modules/auth/
  components/AuthShell.vue          panel + sheet + logo; slots for title, subtitle, form
  views/LoginPage.vue               email + password; two-factor as an in-page step
  views/ForgotPasswordPage.vue      its own view
  views/ResetPasswordPage.vue       exists; re-skinned onto AuthShell
  __tests__/                        one spec per view, plus AuthShell
```

Routes in `src/router/index.ts:35-67` re-point to these. `/forgot-password` stops being
`Login.vue` with a `formType` prop and becomes its own view; `/reset-password` keeps its
path and query contract (`?token=&email=`) unchanged.

### Layout

> **Superseded in part, 2026-09-22 — see §7b.** "Beside" shipped as an even half-and-half
> and is now a 70/30 split in the panel's favour. The rest of this section still holds.

Wide: a `levantDeepTeal` panel beside a white sheet on the Warm Mist body. The panel
carries the light-ink logo (`brand-logo_*_dark.svg`, already in `src/assets/images/`) and
one line of copy. Below the existing 800px breakpoint the panel is dropped and the sheet
centres — matching what `main.scss` already does, and what the phone frames show.

`pattern-onboard.png` is Pinx artwork and is not carried over. The panel's watermark, if
any, comes from the ADD logo asset — the member app's hero uses the wordmark this way.

### Two-factor is a step, not a route

The backend flow is `POST /login` → `{ two_factor: true }` → `POST /two-factor-challenge`,
with the pending state held in the session. A step inside `LoginPage.vue` with a back
control mirrors that and matches today's behaviour. A separate route would advertise a URL
that means nothing without the session behind it.

### Logo.vue

`src/app-layouts/common/Logo.vue` is Category B — ours. It still carries
`alt="SOCFortress logo"` and a matching `aria-label`, a wrong brand from an earlier
template lineage that `.claude/rules/vendor-boundary.md` lists as residue to strip on
touch. This work renders it on the auth panel, so the string is corrected here, with the
alt text coming from i18n like every other user-visible string.

---

## 5 · Copy

`messages.spec.ts` enforces three things that shape this section: ar/en key parity, no
blank values, and — the one that bites — **every Arabic value must contain Arabic script**.
A value like `"ADD OS"` in `ar.json` fails the suite. The panel's wordmark is therefore an
SVG asset, never a translation key.

New keys, in both catalogues:

```
auth.signIn.{title, subtitle, emailLabel, emailPlaceholder, emailRequired,
             emailInvalid, passwordLabel, passwordPlaceholder, passwordRequired,
             forgotLink, submit, genericError}
auth.twoFactor.{title, subtitle, codeLabel, codePlaceholder, codeRequired,
                useRecoveryCode, useAuthCode, recoveryLabel, recoveryRequired,
                submit, genericError}
auth.shell.{logoAlt, tagline}
auth.common.back
```

`auth.forgotPassword.*` and `auth.resetPassword.*` exist and are reused, each gaining
`title` and `subtitle`. The vendor's English literals — including AuthForm.vue's "Today is
a new day. It's your day…" — leave with their files rather than being translated.

**`auth.shell.tagline` ships a neutral operational line, not the member app's hero copy.**
"Build. Connect. Grow." is brand marketing copy on a member-facing surface; whether it
belongs on an internal staff login is a brand-owner call, logged in §8. A placeholder is
not acceptable either — `messages.spec.ts` rejects blanks — so a real, defensible line
ships and is replaced if the owner rules otherwise.

---

## 6 · States, errors, RTL, testing

| State | Treatment |
|---|---|
| Submitting | `:loading` on the button, form disabled — the pattern `ResetPasswordPage.vue` already uses |
| Field error | Text below the input. `theme-overrides/_form-feedback.scss` already undoes the vendor's overlapping "flap" |
| Page error | `n-alert`, as at `ResetPasswordPage.vue:6` |
| Bad/expired reset token | 422 keyed on `email`, not `token` — live-confirmed; stays a page-level alert |
| Already signed in | 409 on `/forgot-password` — live-confirmed, absent from the collection; keeps its distinct message |
| Sign-in failure | `ApiError.data.message` when present, else `auth.signIn.genericError` |

**RTL.** Panel and sheet swap sides with document direction; no mirrored stylesheet is
added. One real bug moves with the code: `AuthForm.vue:5` hardcodes `carbon:arrow-left`
for the back control, which points the wrong way in Arabic. The new shell binds the icon
to direction. `.claude/rules/i18n-rtl.md` requires the full **ar/en × RTL/LTR** matrix, and
notes Pinx's RTL support is vendor-beta — the shell uses flex and logical properties only,
nothing that needs `naive-override.scss`'s `.direction-rtl` block.

**Testing.** Per view: renders, validates, submits, surfaces the documented error shape.
`AuthShell.vue`: renders both breakpoints, both directions, and the back control's icon
follows direction. Plus in `tokens.spec.ts`: the auth ramp's contrast (`actionBase` ≥ 4.5
with `actionOn`; `panelText` on `panelBackground`), and that no `auth.*` value equals a
pillar hex — the existing per-mode component-token sweep covers the last one once the
group is added.

**One new guard**, registered in `.claude/commands/guards.md` in the same change, as
`CLAUDE.md` requires: **no file outside** `src/components/auth/` and `src/views/Auth/`
imports from either directory. The exclusion matters — those files import each other, and a
guard phrased as "nothing under `src` imports them" would fail on the vendor code it is
meant to leave untouched. Cheap, and it is what keeps §2.1's repaint control from returning
when someone re-links the old page.

---

## 7 · Batches

Each is committed before the next starts, in one working tree.

1. **Tokens.** `auth` component-token group, `pnpm tokens`, contrast assertions in
   `tokens.spec.ts`. Green suite before any component exists.
2. **Shell + login.** `AuthShell.vue`, `LoginPage.vue` with the two-factor step, `/login`
   re-pointed, `Logo.vue` alt correction, new i18n keys. `/forgot-password` still resolves
   to the vendor page at the end of this batch — it is re-pointed in batch 3, and the file
   stays on disk until then, so no route is broken between commits.
3. **The other two.** `ForgotPasswordPage.vue` with `/forgot-password` re-pointed, and
   `ResetPasswordPage.vue` re-skinned onto the shell. At this batch's commit nothing
   imports the vendor auth files any more.
4. **Records + guard.** `GUIDELINE-FEEDBACK.md` entries, `PHASE-3-DEAD-CONTROLS.md` entry
   for the `Settings.vue` pill and the "Remember me" checkbox with the survey behind each,
   the import guard and its `guards.md` registration, then `/guards`.

Batch 4 is not optional tidying. `docs-discipline.md` requires the record to change in the
same work that changes behaviour, and requires keeping the survey a removal erases.

---

## 7a · As built — where batch 2 departed from §4–§5

Recorded rather than edited into the sections above, so the original intent stays
readable next to what shipping it actually required.

| Designed | Built | Why |
|---|---|---|
| Panel drops below 800px, matching `main.scss` | Drops below the project's `mobile` breakpoint | 800 was the vendor's magic number. `tailwind.css` already declares `--breakpoint-mobile`, so the project's own token is used instead of reintroducing a literal. |
| `auth.shell.logoAlt` | `common.logoAlt` | `Logo.vue` renders in the sidebar and toolbar too, not only on auth. A key under `auth.*` would have made every other screen's logo depend on the auth namespace. |
| `auth.twoFactor.*` as listed | Plus `recoveryPlaceholder` | The recovery-code field needs its own placeholder; the authenticator-code one describes a six-digit code and would be wrong on it. |
| `AuthShell` takes slots for title, subtitle and form | Props for `title`/`subtitle`, one default slot for the form | Title and subtitle are always plain strings. Props keep them in the parent's `computed`, which is what lets the two-factor step swap both by changing one ref. |
| `aria-label` on the logo translated | `aria-label` removed, `alt` translated | On an `<img>` the two are competing accessible names. Keeping both is how they drift apart; `alt` is the one that belongs there. |

Verified at build time, not assumed: naive-ui 2.44.1's `ConfigProvider` **merges**
`themeOverrides` with its ancestor's unless the prop is exactly `null`
(`config-provider/src/ConfigProvider.mjs`, "use inherited themeOverrides"). So the auth
screens remap `primary` only, and keep every other value the app-level provider sets.

## 7b · REVERSAL, 2026-09-22 — the split is 70/30, not 2-up

Appended rather than edited into §4, so the trade-off stays visible. The original
reasoning was not wrong; the owner weighed it differently.

**What changed.** §4's "panel beside a white sheet" shipped as `lg:grid-cols-2` — an even
half-and-half. At the owner's request the panel now takes **70%** and the form **30%**:
`lg:grid-cols-10`, `lg:col-span-7` on the panel, `lg:col-span-3` on the form.

**It was built at 3/1 first, and that is why it is not 3/1 now.** Recorded because the
retreat is the useful part: a 25% form column measured 360px at 1440px, and after the
`lg:px-16` padding that shipped with the 2-up it left **232px** for email, password and a
button. Reducing the padding to `lg:px-8` recovered it to 296px and dropping `max-w-md`
to `max-w-sm` kept it from overflowing — but that is two compensations to hold one
decision upright, and the form was still visibly cramped. The owner asked for more room
on seeing it. At 30% both compensations became unnecessary and were reverted.

| Viewport | Form column at 25% (abandoned) | Form column at 30% (as built) |
|---|---|---|
| 1024px | 256px | 307px |
| 1280px | 320px | 384px |
| 1440px | 360px | 432px |
| 1920px | 480px | 576px |

**What 30% costs, stated plainly.** The panel is narrower than the 3/1 the owner first
asked for, so the pattern and the headline have less room than that version gave them.
This is the exchange that was accepted: the widest panel the form survives at the size
batch 2 designed it.

**What is unchanged from batch 2 after the revert.** `max-w-md` (448px) — at 30% the
column only reaches it around 1500px viewport, so it clamps on large screens exactly as
it always did rather than becoming the binding constraint. Desktop padding is `lg:px-10
xl:px-12`, still below the pre-split `lg:px-16 xl:px-24` because 64px a side is most of a
1024px-viewport column.

Below `lg` **nothing moved**. The panel is still `hidden`, the form still has its full
`px-6 sm:px-12`, so every phone and tablet screen is byte-for-byte what batch 2 shipped.

**Unchanged by this.** No token moved, no colour changed, no new asset. The pattern keeps
its approved corner crop and `opacity-20`, scaled `30rem → 42rem` for the wider panel.
Panel type scales with the column (`text-4xl/5xl → text-5xl/6xl`). RTL mirroring is still
carried by grid source order and the pattern's `end-0` logical anchor — no RTL-only class
was added, and none was needed.

Pinned by `AuthShell.spec.ts` → "the desktop split is 70% panel, 30% form", which asserts
the column count, both spans, that the panel stays off small screens, and explicitly that
the 3/1 attempt has not returned. Without it a stray utility-class edit would restore a
50/50 screen with every other test still green.

## 7c · REDESIGN, 2026-09-22 — the owner's reference screen

Same day as §7b and after it. The owner supplied a rendered login design and
asked for a rebuild "in the same technique, not literally". Recorded here rather
than edited into §4 for the same reason §7b is.

### The split moved a fourth time, and this is the whole path

`50/50` (batch 2) → `75/25` → `70/30` → **`60/40`**. Every step went the same
direction: toward room for the form. The last one is the informative one — 70/30
was chosen and approved when the form was a bare stack of inputs on white. The
reference turns it into a **card**, and a card needs visible ground around it, so
a proportion that fit a bare form crowded a carded one. As built:
`lg:grid-cols-5`, panel `lg:col-span-3`, form `lg:col-span-2`.

`max-w-sm` and the reduced `lg:px-8` from the 25% experiment are both gone; the
form is back to `max-w-md` at `lg:px-10 xl:px-14`.

### What was taken from the reference

| Element | As built |
|---|---|
| Form in a raised card on a warm ground | `bg-surface-raised` + `shadow-add-raised` + `rounded-add-large`, on `bg-surface-sunken`. All four are shipping tokens; the card/ground relationship is one the palette already described and nothing new was minted. |
| Pattern very large, cropped at the panel's top corner | `top-0 end-0`, `size-[52rem]`, bleeding off both edges. Was a `30rem` bottom-corner mark at `opacity-20`; now `opacity-25` because it no longer sits behind the headline. Logical properties, so it still mirrors under RTL unaided. |
| Eyebrow label above the panel content | `auth.panel.eyebrow`. Uppercase + letterspacing are applied **only under `:lang(en)`** — see below. |
| Three pillar labels with dots | Built, but **not in pillar colour** — see below. |
| Footer line | `auth.panel.footer`, with the year interpolated. |
| Language switcher at the top corner | The existing `LocaleSwitch`, reused rather than rebuilt. It writes through the locales store, which derives direction; it is a real control, not decoration. |

The form-side logo is now `lg:hidden`: the panel's own light logo is on screen
beside it above `lg`, and the reference shows the mark once, not twice.

### The eyebrow's casing is language-scoped, and that is not a detail

`text-transform: uppercase` and `letter-spacing` are Latin devices. Arabic has no
case, so the first is merely inert — but the second is actively harmful: Arabic
letters join, and letterspacing pulls those joins apart. The same declaration
that flatters the English label damages the Arabic one.

So it lives in `src/add-os/theme-overrides/_auth.scss` under `:lang(en)`, which
is reliable because `<html lang>` is bound to the locale. `0.08em`, not a px
value, because the type scale is per-language and a fixed length would drift
against it.

### Three elements of the reference were deliberately not built

Recorded in full at `docs/brand/GUIDELINE-FEEDBACK.md` §11. In short:

| Not built | Why |
|---|---|
| **Orange CTA** | It is Aleppo Economic Orange ≈ `danger` `#D93D23`. Orange means "destructive" in this dashboard and nothing else; a sign-in button in it is the same colour as "Delete member". Also a pillar hex, so `tokens.spec.ts` fails outright. **Brand owner's call** — the CTA ships `primary` green meanwhile. |
| **Per-pillar dot colours** | Same rule. Built as three `success` dots distinguished by their **labels**, which is the remedy `tokens.ts` prescribes verbatim: "carries it with an icon or a label — never with colour." |
| **"Remember me" and "Sign in via SSO"** | Neither capability exists: zero matches for `remember`, and no SSO/SAML/OAuth endpoint, across the pinned collection's 211 leaf endpoints. Invariant 4 — "Remember me" was already removed once on these exact grounds (§2.2). |

The owner chose (2026-09-22) to ship green and log the orange question rather
than block the redesign on it. If the ruling later comes back "orange", that is a
token-layer change touching every destructive control in the product, and it
should be its own reviewed change — not a patch to this screen.

### Pinned by

`AuthShell.spec.ts` → "the desktop split is 60% panel, 40% form" and "the
reference redesign". The load-bearing assertion is **"lets no pillar colour reach
the markup"**, which greps the rendered HTML for every hex in `PILLAR_COLORS`. It
is written against rendered output rather than against the token objects on
purpose: an inline style or an arbitrary Tailwind value is exactly what would
slip past the token-level guard, and this screen is the one that was asked to
look like the thing that guard forbids.

## 7d · REVERSAL, 2026-09-22 — §7c's panel was rejected on sight

Same day, one build later. §7c stays as written: it records what was intended
and it was wrong in a way worth keeping legible.

**What the owner said, rendering it:** *"التصميم جدا سيئ الباترن والنصوص الكثيرة
الغير مفهومة"* — the design is very bad, the pattern and the excessive
unintelligible text.

**They were right on both counts, and the screenshot showed why.**

### The pattern was not a watermark

Built at `size-[52rem]` / `opacity-25`, anchored top-trailing, **behind the text
block**. At that scale 25% does not read as a tint — it reads as solid green
shapes, and the body paragraph sitting on top of them broke up mid-line.

Three faults compounded, and no one of them alone would have done this:

| | §7c as built | Corrected |
|---|---|---|
| Size | `52rem` | `36rem` |
| Opacity | `opacity-25` | `opacity-8` |
| Anchor | top-trailing, under the copy | bottom-trailing, clear of it |

The generalisable lesson: **visual weight is area × strength, so a watermark's
opacity has to fall as its size rises.** 25% was inherited from a `30rem` mark
where it had been fine, and carried onto something nearly three times the area
without rechecking. Pinned now by a test, because the next person to nudge it
will nudge it upward.

### Five pieces of copy, where a login needs one

§7c put an eyebrow, a headline, a body paragraph, a three-item pillar row and a
footer into one panel. All five came from the reference, and reproducing them
all is what "in the same technique, not literally" was asking me *not* to do. A
login panel is not a landing page; nobody reads it, they sign in.

**Now: the logo, the accent rule, and the headline.** Nothing else.

Removed with their i18n in the same change, per Invariant 4 — `auth.panel.eyebrow`,
`.body`, `.pillars.*` and `.footer` are gone from both catalogues, and the dead
`pillarLabels` / `year` constants are gone from the component.

### And one removal closed a rule violation that had gone unnoticed

The pillar row rendered each label beside a small coloured dot. §7c was careful
that the dots were not *pillar* colour — but `.claude/rules/tokens-and-color.md`
states plainly: **"never a bare coloured dot"**, for any status. Three identical
green dots distinguished only by adjacent text is exactly the pattern that rule
forbids, and §7c's own note about labels-not-colour talked past it.

It is gone as a side effect of the copy cut, not because the cut was aimed at
it. Recorded because the next person to want dots on a panel should find the
rule, not rediscover it.

`src/add-os/theme-overrides/_auth.scss` — added in §7c for the eyebrow's
`:lang(en)` casing — is **deleted**, and its `@import` with it. The eyebrow was
its only consumer; an override file with no consumer is the orphaned SCSS
Invariant 4 names.

### What §7c got right and is unchanged

The card on the warm ground, the 60/40 split, the language switch, the
`lg:hidden` form-side logo, and the three refusals (orange CTA, per-pillar
colour, Remember-me/SSO). None of that is touched.

## 8 · Open — brand owner

Logged to `docs/brand/GUIDELINE-FEEDBACK.md` in batch 4. None blocks batches 1–3.

| Question | Why it is not a developer's call |
|---|---|
| The member app's primary CTA is Aleppo Economic Orange. In the dashboard orange is `danger`, exclusively, and it is a pillar colour. Should the two products' CTA colours differ permanently? | Settling it either way changes what a destructive action looks like across the whole dashboard. |
| The member app's secondary buttons are Signal Cyan — also a pillar colour. | Same guard, same reasoning. |
| Should the auth green be visually distinct from the success green? Today they resolve to one value, `#657C50`, because there is only one contrast-adjusted brand olive. | A second green would be a new brand value, not a derivation. |
| Does the member app's hero line ("Build. Connect. Grow.") belong on an internal staff login, or should the panel carry operational copy? | Brand voice on a surface the brand owner has not seen. |

Unchanged and still open from `CLAUDE.md`: `borderStrong`'s light-mode value. The auth
inputs use it as a control outline, so whatever it becomes, these screens inherit it.
