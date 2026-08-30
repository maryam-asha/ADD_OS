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
