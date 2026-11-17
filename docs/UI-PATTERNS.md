# UI patterns — one page, one table, one dialog

Decided 2026-11-17 with the product owner. Every dashboard page is built from
the same few pieces, so a page in Spatial and a page in Inventory look and
behave alike. The pieces live in `src/add-os/components/page/`; HR's own kit
(`HrPageHeader`, `HrToolbar`, `HrPanel`, `HrFormModal`, `HrDrawer`) now renders
them, so HR already follows this.

Enforced by `src/add-os/__tests__/ui-patterns.spec.ts` over every module. A file
that cannot follow it by what it is (a sign-in screen, an error page, a printable
document, a record profile with a hero) is named in its `EXEMPT` list with the
reason; a file waiting on a decision is named in `PENDING` with the rule it may
break and who decides.

## The page, top to bottom

1. **`PageHeader`** — title, one sentence on what the page is for, and the
   page's own actions at the far end, **the primary one last**. The "New …"
   button lives here and nowhere else (not on a row of its own, not in the
   filters). Every page has a description; a page without one gets one.
2. Stat cards, when the page has them (`ResourceStatCards`).
3. A load error, as an `n-alert` of type `error`.
4. **`FilterToolbar`** — the list's filters in one card: search first, then
   selects and dates. At the far end, the list's own tools (reset, refresh,
   export). Never the page's primary action.
5. The table (`ResourceTable`, or a `Panel` with `flush` around an
   `n-data-table` for a table `ResourceTable` cannot express).

## Row actions

Rows hand their actions to **`RowActions`** as data (`RowAction[]`), never as
hand-built buttons. `ResourceTable` takes them as `rowActions` and adds edit
first and delete last.

- Up to **two** ordinary actions show as icon buttons (28px high, tooltip and
  accessible name from the label).
- The rest go in a **"⋯"** menu.
- A destructive action (`danger: true`) is **always** in the menu, **last**, in
  the danger colour, and runs only after a centred confirm (`confirm` text, or
  the action's own dialog). Never `n-popconfirm` — its anchored placement was
  never verified in RTL (`theme-overrides/RTL-REPORT.md` §2).

`ResourceTable`'s `extraActions` (hand-built buttons) is legacy: a page still
passing it keeps the old row until it is migrated.

## Dialogs

- **Add and edit forms: a centred modal**, `FormModal` (or `ResourceFormDrawer`,
  which despite its name is the same centred modal for field-list forms).
  Widths are three only: `sm` 28rem (a field or two), `md` 36rem (a form),
  `lg` 46rem (a form with a list inside). Footer: Cancel, then the primary
  button, at the end. Chosen over a side drawer on 2026-11-17; 23 pages already
  used the centred `ResourceFormDrawer`, and the HR side drawers were only ever
  for reading.
- **Reading a record: a side drawer**, `DetailDrawer`. It opens from the side
  reading ends on (left in Arabic, right in English). Never a form.
- **A form too long for a dialog: a page of its own** (`HrFormPage`,
  `docs/hr/FORMS-AS-PAGES.md`) — employee, company, event, payroll run.
- **Confirming: `useDialog().warning`**, centred.

## Decided 2026-11-17, after the first pass

- **Queue decisions stay labelled** (approve, reject, check in, end a session,
  record a payment, review steps). `RowActions` with `labelled` lays them out:
  the main decision filled, a rejecting one outlined in the danger colour, the
  rest secondary, nothing folded away. Every other table action is an icon,
  with the rest under "⋯". All 52 hand-built action cells were moved over.
- **A form too wide for a dialog is a page.** The plan form (a 1040px wizard
  with a live preview) is now `plans/packages/create` and
  `plans/packages/:id/edit` (`PlanEditorPage`, rendering the form inline). The
  coupon form (680px) and the provider company card (44rem) were described as
  equally wide when the question was asked; they are not, and they fit the
  standard `lg` dialog, so they became `FormModal`s instead — reversible if the
  product owner still wants them as pages.
- Removed on the way, as no-op or misleading controls (CLAUDE.md invariant 4):
  Office Leases' row "Download" (it only toasted "download started") and its
  "Edit" (it opened the same detail as "View"); the provider company card's
  "verified via the unified digital registry" seal and its invented contract
  number for a company without one.

## Migration status

| Module | Status |
|---|---|
| HR | Follows the pattern through its own kit (now wrappers over the shared one). |
| Spatial | Migrated 2026-11-17 (pilot). |
| Every other module | Migrated 2026-11-17. Headers, descriptions, dialogs, drawers, confirms and colours; the guard covers all of them. |

**Colours, 2026-11-17.** 88 module files carried hex values, Tailwind palette
classes or `dark:` variants. Greys now map to the text, border and surface
tokens by shade; status hues (emerald/green, red/rose, amber, blue/sky/teal)
map to their semantic token, pale shades as a `color-mix` tint of it. Two
passes had to be repaired the same day — a `dark:` class holding a comma left
fragments behind, and `-500/10`-style opacity was dropped — and both are fixed.

## Open

- Filter dropdown and search placeholders are `#C2C2C2` (1.78:1 on white), and
  on many lists the placeholder is the filter's only label. Fixing it is a
  token change (Naive `placeholderColor` through `tokens.ts`), owned by Design —
  `tokens-and-color.md` says de-emphasis comes from weight and size, not
  lightness.
