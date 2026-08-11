---
paths:
  - "src/app-layouts/**"
  - "src/components/common/**"
  - "src/stores/theme.ts"
  - "src/add-os/navigation/**"
---

# Shell, layout and user-facing controls

## No shipped control may be a no-op

A hidden dead control rots and invites re-enabling exactly the unthemed screen the guards
prevent. Removing a control means removing:

- the control itself **and the capability behind it** (store actions, composables);
- its i18n keys in **both** catalogues;
- its SCSS — ~50 lines of orphaned `.ls-color-selection` styling survived a previous
  removal and was found by the guard, not by reading the template;
- its entry in `persist.pick` — a persisted value nothing can set is how stale state hides.

**Sweep the code, not the rendered UI.** The last sweep found three dead theme controls
where one was known; the third was a command-palette action with no visual presence.

## Already removed — do not reintroduce

| Removed | Why |
|---|---|
| `ThemeSwitch.vue`, the palette's "Toggle dark mode" action, `useThemeSwitch.ts` | Live paths into a half-themed dark mode |
| `setTheme` · `setThemeLight` · `setThemeDark` · `toggleTheme` · `setColor` | The only write paths into theme and palette. `themeName` is now read-only; the getters (`isThemeDark`, `naiveTheme`) stay — reads were never the problem |
| Primary-colour picker + demo swatches | Made every WCAG assertion in `tokens.spec.ts` vacuous: green in CI, false in the product |
| Vertical/Horizontal nav toggle | A horizontal nav for 13 sections in Arabic is an **unsolved design problem**, not a layout option |
| Router-transition select | Unreviewed surface; motion needs a `prefers-reduced-motion` story nobody has specified |

`reset()` ("Restore default") carried two live defects — it repainted the app in the
template's green and could re-enable dark mode on a dark-set machine. It now restores only
what a user can still change: language, boxed, toolbar-boxed, footer.

**Surviving controls: `View boxed` · `Toolbar boxed` · `Footer visible` ·
`العربية / English`.** Four real controls, zero no-ops. Restoring dark mode means all four
removed pieces together **plus** a complete dark palette — not piecemeal.
