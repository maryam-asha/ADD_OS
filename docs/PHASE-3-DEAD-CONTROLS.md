# Dead and hazardous controls — survey and resolution

**Surveyed, then resolved on 2026-08-03.** Sections A–C are **done**; the survey
that preceded each removal is kept so the reasoning survives the deletion.

The rule: no shipped control may be a no-op. A hidden dead control rots and
invites re-enabling exactly the unthemed screen the dark-mode guards now prevent.

**All of it is enforced by `src/add-os/__tests__/no-runtime-theming.spec.ts`** (18
assertions), because deleting a control does not remove a capability — the
capability comes back with the first settings screen anyone builds.

> **What the survey was actually for.** Three of these were not visible controls:
> a command-palette action with no UI, four store actions, and ~50 lines of
> orphaned SCSS. A checklist over the rendered UI would have missed all three.

---

## A. ✅ Dead theme controls — REMOVED

Dark mode is out of scope for v1 and structurally unreachable: `themeName` pinned
to `Light`, dropped from `persist.pick`, and `colors.dark` mirrors `colors.light`.
All three guards stay. These controls now toggle nothing.

**The sweep found three, not one.** The third was not previously known:

| # | File | Control | Status |
|---|---|---|---|
| 1 | `src/app-layouts/common/Toolbar/ThemeSwitch.vue` | Toolbar sun/moon button | Dead. Rendered at `Toolbar.vue:20`. |
| 2 | `src/components/common/LayoutSettings.vue` | "Theme" section — Light / Dark buttons | Dead. |
| 3 | **`src/components/common/SearchDialog.vue:213`** | **Command-palette action calling `useThemeSwitch().toggle()`** | **Dead — and invisible.** Not a visible button, so it survives any UI-level sweep. |
| 4 | `src/composables/useThemeSwitch.ts` | The composable itself | Becomes unused once 1–3 go. |

Item 3 is the reason a sweep was worth doing: a command palette entry is a
shipped control with no visual presence, and it would have been the one thing
still able to reach `setTheme(Dark)`.

### What was removed, and the escalation the survey forced

All four are gone. But the survey turned up something the framing had understated:
**these were not dead — they were live paths into the half-themed dark mode.**

Pinning `themeName` to `Light` and dropping it from `persist.pick` stopped dark
being reached *at boot*. It left it reachable *at runtime*, because
`themeStore.toggleTheme()` still existed and three surfaces still called it. Any
one click would have handed naive-ui's `darkTheme` to our light-only overrides.

So the capability went too, exactly as with `setColor()`:

| Removed | Where |
|---|---|
| `<ThemeSwitch />` + import | `Toolbar.vue` |
| `ThemeSwitch.vue` | **deleted** |
| "Toggle dark mode" palette action + `DarkModeIcon` const | `SearchDialog.vue` |
| `useThemeSwitch.ts` | **deleted** |
| `setTheme` · `setThemeLight` · `setThemeDark` · `toggleTheme` | `stores/theme.ts` |
| `layout`, `routerTransition` from `persist.pick` | `stores/theme.ts` |

`themeName` is now **read-only**. The getters (`isThemeDark`, `isThemeLight`,
`naiveTheme`) remain — plenty of code legitimately asks which mode is active; the
point was to remove *writes*. Restore all four together with a full dark palette.

---

## B. ✅ REMOVED — it was not dead, it actively defeated the token architecture

**`LayoutSettings.vue` — "Primary color" picker + palette swatches**
(`n-color-picker` ×2, and `setPrimary()` over a Pinx demo palette)

This control *works*. That is the problem. It lets any user overwrite the brand
primary at runtime, which contradicts the entire premise of
`src/add-os/theme/tokens.ts`: **brand colour is not a user preference.**

Concretely, it can:

- replace Deep Teal `#007F91` with an arbitrary hex, breaking the Guideline mapping;
- bypass every WCAG invariant the token tests enforce — a user-picked primary has
  no contrast guarantee against white, Warm Mist, or the focus ring;
- write to `colors.dark`, which is now a deliberate mirror of `colors.light`;
- collide with `danger`, making a destructive button indistinguishable from a
  primary one.

### Resolved — removed, capability included

The decisive argument: every ratio this project asserts is tested against
`tokens.ts`. A runtime override makes those assertions **vacuous** — green in CI,
false in the product. A test that cannot fail for the case it exists to catch is
worse than no test, because it manufactures confidence.

Removed: the two `n-color-picker`s, the five demo swatches, `setPrimary()`, the
`darkColor`/`lightColor` computeds, the `ColorPalette`/`Palette` types — **and
`setColor()` from the store**, which was the only write path into the palette.

**Two live defects surfaced in `reset()` while doing it:**

```diff
- setColor(Dark,  "primary", "#00E19B")   // Pinx GREEN, hardcoded in the component
- setColor(Light, "primary", "#00B27B")   // → "Restore default" UN-BRANDED the app
- setTheme(useOsTheme() === "dark" ? Dark : Light)
-                                          // → re-enabled dark on a dark-set machine,
-                                          //   defeating the pin in theme/index.ts
```

Neither was dead code. "Restore default" repainted the app in the template's green
and could switch it to an unthemed dark mode. `reset()` now restores only what a
user can still change: language, boxed, toolbar-boxed, footer.

**~50 lines of orphaned SCSS came out too** — `&.ls-color-selection` with its
`:deep()` overrides, plus the RTL counterpart, both styling a control that no
longer existed. Found by the guard, not by reading the template.

If runtime theming is ever genuinely wanted, it should be a curated set of
brand-legal options validated against the same invariants — never a free picker.

---

## C. ✅ RESOLVED — both toggles removed, not hidden

| Control | Outcome |
|---|---|
| Navbar **Vertical / Horizontal** | **Removed.** A horizontal nav for 13 sections in Arabic is an unsolved design problem, not a layout option — and the QA matrix is already ar/en × RTL/LTR. Shipping an unreviewed layout behind a toggle invites a bug report from a state nobody tested. `layout` also left `persist.pick`: a value persisted as `HorizontalNav` would have survived with no UI left to correct it. |
| **Router transition** select | **Removed.** Unreviewed surface, and motion needs a `prefers-reduced-motion` story nobody has specified. `routerTransition` left `persist.pick` for the same reason — persisting state nothing can set is how stale state hides. |
| **Restore default** | **Kept**, and now correct. See §B for the two defects it carried. |

Surviving controls in the panel: `View boxed`, `Toolbar boxed`, `Footer visible`,
`العربية / English`. Four real controls, zero no-ops.

---

## D. Confirmed real — keep

`View boxed` · `Toolbar boxed` · `Footer visible` · `العربية / English`
(the language switch, repurposed from the template's RTL toggle — manifest §3.10).

---

## E. Also noticed while surveying — not shell, but flagged

Both found by the external-URL guard (`add-os/__tests__/no-external-urls.spec.ts`)
and allowlisted with `removedBy` notes so they cannot be forgotten:

1. **`VITE_API_URL=https://api.org`** in `.env`, `.env.production` and
   `.env.sample` — a Pinx placeholder pointing at an external host. Inert today
   (nothing reads `API_URL` beyond exposing it on the main store), but it is the
   base URL the real API layer will use. Must point at the internal host before
   any request code lands.

2. ✅ **`VITE_MAPTILER_API_KEY` — RESOLVED 2026-08-03. Deleted, not rotated.**
   Two distinct live-looking keys were present, one in `.env` and another in
   `.env.production`. Both are gone from the working tree; the fragments
   originally quoted here have been scrubbed, because recording part of a
   credential in documentation is the same mistake one step smaller.

   The investigation is written up in `docs/SECRETS-RESOLUTION.md`. Short version:
   the keys arrived **with the Pinx template** (all three env files share the
   template import timestamp), so they are the template vendor's, not ADD's —
   ADD has no account to revoke them from. Nothing in ADD OS read them, and
   `api.maptiler.com` never reached a build.
