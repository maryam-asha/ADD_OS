---
paths:
  - "src/**/*.vue"
  - "src/**/locales/**"
  - "src/**/i18n/**"
  - "src/add-os/navigation/**"
---

# i18n and RTL

- QA matrix is **ar/en × RTL/LTR** — four states, all four tested. Shipping an unreviewed
  layout behind a toggle invites a bug report from a state nobody tested.
- **Pinx's RTL support is beta per the vendor.** Stress-test complex components — date
  pickers, DataTable, dropdowns — before building deeply on them.
- Every user-visible string goes through vue-i18n in **both** `ar` and `en`. No literal
  strings in templates. Removing a control removes its keys from both catalogues.
- The language switch is the template's RTL toggle, repurposed. `<html lang>` and the
  direction binding are already correct.
- **Service naming: `ADD Philosophy & Structure` governs** and supersedes Company Profile
  (known outdated). `Co-Space` not "Space"; `Business Café` not "Café". Nothing is seeded
  from Company Profile.
- **`Event` vs `Events` is unresolved and must not be picked silently.** Nav labels, both
  message catalogues, and service-catalog seed data all inherit it at once.
- Arabic type needs a larger size scale and looser leading — see `typography.md`.
