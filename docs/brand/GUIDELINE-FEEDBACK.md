# Brand Guideline — feedback log

Findings from implementing ADD OS against **ADD Brand Guideline 2026** that need
a decision by whoever owns the brand, not by whoever owns the code.

Each item records what the Guideline says, what was found, and what ADD OS did in
the meantime. Nothing here has been "fixed" by inference — where ADD OS deviates,
it is recorded as a deviation.

---

## 1. 🔴 The mandated Arabic typeface is not licensable

**Guideline p.19** mandates **Noto IKEA Arabic** as the Arabic face.

Noto IKEA is **IKEA's proprietary corporate typeface** — a commissioned Noto
derivative licensed to IKEA. It is not on Google Fonts, not on npm/Fontsource,
and not offered for third-party web embedding. Shipping it would mean
redistributing a font the project has no licence for, inside a product carrying
a different organisation's brand.

**Severity: brand-level, not project-level.** This affects print, marketing,
signage and every other application of the identity — not only ADD OS. Any
supplier following the Guideline literally either cannot obtain the font or
obtains it improperly.

**What ADD OS did:** ships **Noto Sans Arabic** (SIL OFL 1.1), approved
2026-08-03 as a deliberate, documented deviation.

The substitute is chosen on **minimum-distance** grounds rather than convenience:
Noto IKEA is itself a Noto derivative — a commission on the Noto Arabic skeleton —
so Noto Sans Arabic is the closest legitimately licensable face to what the
Guideline actually names.

IBM Plex Sans Arabic was implemented first and then reversed. It had a real
argument — ADD OS's icon set is Carbon, IBM's design language, so type and
iconography would have come from one design system — but fidelity to the mandated
family was judged to outweigh that internal coherence. Recorded so the trade-off
is visible.

**Needed:** either a licence confirmation with the `woff2` files, or a Guideline
revision naming an embeddable Arabic face. Until then the Guideline and the
product disagree on paper.

### Reversed 2026-08-30 — the mandated face now ships, the licence question does not

The design owner placed **Noto IKEA Arabic** in the repo
(`src/add-os/assets/fonts/ar/`) and instructed that it be used. ADD OS now ships
it: Regular and Bold, self-hosted, declared in `src/assets/scss/fonts.scss`.
Latin is Poppins, likewise self-hosted from `src/add-os/assets/fonts/en/`.

**The Guideline and the product now agree.** What changed is availability, not
the licence: the substitute existed *because* the face could not be obtained, so
once files exist the minimum-distance argument has nothing left to stand on.

**What was given up, and it is the whole reason the deviation existed:**

- The files are a **third-party redistribution** (`ArbFONTS-…`), not an IKEA
  grant. Nothing accompanying them establishes a right to embed, and Noto IKEA
  remains IKEA's proprietary corporate typeface.
- Noto Sans Arabic came with SIL OFL 1.1 — embedding was unambiguous. That
  certainty is gone, and it was the point.
- The face arrived as **Regular and Bold only**. Weights 500 and 600 are mapped
  onto them by `@font-face` range descriptors, so no synthetic weight is drawn —
  but the UI has four weight steps and the face has two.
- **~1.26 MB of fonts** where the woff2 subsets were ~230 KB (TTF, unsubsetted).
  Judged affordable on an isolated office LAN; it would not be on a public site.

**Still needed, unchanged:** a licence confirmation from IKEA or ADD's own
counsel — ideally with `woff2` — or a Guideline revision naming an embeddable
Arabic face. **This is the brand owner's ruling, not the developer's.** A ruling
against embedding reverts `fonts.scss` to the `@fontsource/noto-sans-arabic`
imports; nothing else in the chain changes, because the face is named in exactly
one place.

**Note on distance:** Noto Sans Arabic remains installed and is *not* dead
weight — its Latin subset draws numeric columns, because Poppins has no tabular
figures. It sets no letter.

---

## 2. 🟡 "Aleppo Spice" is referenced but never defined

**Guideline p.15** carries a strict rule:

> Do not use both Antique Copper and Aleppo Spice as strong accents in the same
> layout. Choose one primary accent per application.

**No colour named "Aleppo Spice" appears anywhere in the Guideline.** It has no
HEX, no swatch, and no role description. The palette contains *Aleppo Economic
Orange* `#DC4128` and *Aleppo Stone* `#CDC2AF`.

The obvious reading is that it means Aleppo Economic Orange — "spice" fits the
Aleppo pepper reference, and it is the only strong warm accent in the palette.
**That reading has deliberately not been adopted.** A Guideline ambiguity should
be settled by the brand owner, not resolved by a developer's inference.

**What ADD OS did:** nothing to the Guideline reading. The rule is kept
**structurally disengaged** rather than merely unviolated: Antique Copper carries
no accent role anywhere in the dashboard, so no layout can pair the two. That is
now **enforced by test** (`theme/__tests__/tokens.spec.ts` → "guideline p.15
strict rule stays disengaged"), which asserts Copper appears in no semantic and
no component token, and reaches the runtime palette only as the `extra3`
categorical chart series — a data encoding, not an accent.

Orange likewise reaches the UI through `danger` alone, and as the
contrast-adjusted `#D93D23`, so verbatim `#DC4128` is not a semantic value
either.

If a future change wants Copper as an accent, that test fails first and this
question must be settled before it can proceed.

**Needed:** confirm the intended colour, or supply the missing swatch.

---

## 3. 🟡 The palette defines no state colours

The Guideline supplies no `success`, `warning`, `error` or `info` colour, and —
more consequentially — **no amber or yellow anywhere in the palette**.

For marketing this is unremarkable. For an operations dashboard containing
destructive and high-consequence actions it is a gap that has to be filled
somehow, and filling it required inventing a colour.

Measured findings behind that:

- **Antique Copper cannot serve `warning`.** Against the accessible `success`
  fill it measures **ΔE 1.0 under protanopia** and 8.1 under deuteranopia —
  indistinguishable to roughly 8% of men. A warning that reads as a success on
  an access-control or payments screen is not an acceptable residual risk.
- **Pale status tints fail regardless of hue.** Six brand-temperature ambers were
  tested at 82% white; every tint pair scored ΔE 3–14, *including for normal
  vision*.
- **`info` cannot be visually distinct from `primary`.** Signal Cyan darkened to
  meet AA lands ΔE 2.7 from Deep Teal. The "Intelligence & Interaction" pair is
  one hue at two lightnesses, and accessibility forces both to the dark end.

**What ADD OS did:** derived one new colour — `warning` `#E7B155`, holding Aleppo
Stone's exact hue (38°) with raised chroma, chosen for maximum lightness
separation because L\* survives all three dichromacies where hue does not. It is
registered as `derived`, not as a brand value. `info` shares primary's hue, and
colour is never the sole channel for state: every status carries an icon and a
text label.

**Needed:** if ADD wants a canonical state palette in the brand system, `#E7B155`
is a candidate worth adopting or replacing deliberately. Right now it is ADD OS's
value, not ADD's.

### Updated 2026-08-31 — the accent moved, and the collision moved with it

The design owner aligned the dashboard with the **ADD member app**, whose accent
is green throughout: tabs, filter chips, bottom navigation, and every primary
button. So `primary` is now the adjusted Smart Olive `#657C50` and Deep Teal
moved down to `info`.

Two consequences, in opposite directions.

**Resolved:** the third bullet above no longer describes the product. `info` and
`primary` were the same colour because both were Deep Teal; they are now
genuinely different, and the icon rule is no longer the only thing separating an
informational message from a primary action.

**Created, knowingly:** `primary` and `success` are now the same value. An action
a user can *take* and a state the system has *reached* no longer differ by hue —
a sign-in button is the same green as an "Approved" badge. The member app has
this collision and accepts it; the design owner accepted it here after it was put
to them explicitly. It makes the binding status rule (icon + text label + 1px
border, never colour alone) load-bearing for `primary` too.

This also moves the product **toward** the approved usage ratios rather than away:
`BRAND_RATIOS` puts growth (Smart Olive) at 25% and intelligence & interaction
(Deep Teal, Levant Deep Teal, Signal Cyan) at 10%, and the dashboard had been
spending the 10% colour as its accent on every screen.

Raw Smart Olive `#809C66` is still not used anywhere: it is the Ecosystem pillar
colour, and it carries white text at 3.05:1. Only the contrast-adjusted `#657C50`
ships, and it is defined once and referenced by both roles.

**Needed:** if `primary` and `success` should be visually distinct, that requires a
**second brand-sanctioned green** — a brand-owner decision. `tokens.spec.ts` pins
the collision as it stands, so minting one fails a test first rather than
happening quietly.

---

## 4. 🟡 White is used but never specified

**Guideline p.15** describes Aleppo Stone as an *"alternative background to
white"*, so white is clearly in the system — but it is not a named colour, has no
swatch, and carries no usage guidance.

This matters because the warm palette makes the choice non-obvious: Warm Mist
`#E2DDDB` is prescribed for *"primary backgrounds, UI surfaces and containers"*,
which in a dashboard has to split into a page background *and* a card surface.

**What ADD OS did:** Warm Mist as the page body, `#FFFFFF` as the card surface,
with `#FFFFFF` registered as `derived`.

**Needed:** confirmation that white-on-Warm-Mist is the intended surface
hierarchy, or a named neutral for card surfaces.

---

## 5. 🟢 No scale for space, radius, elevation, or type sizes

The Guideline covers colour, typography choice, logo construction and clear
space. It defines no spacing scale, corner radii, elevation/shadow language, or
type size ladder.

Not a defect for a brand book, but it means those decisions are made downstream
and will drift between the four ADD consumers unless they share a source.

**What ADD OS did:** kept Pinx's existing values, published them through
`src/add-os/theme/tokens.ts`, and emits them as neutral DTCG so the Flutter app,
Nuxt site and kiosk can consume the same scale.

**Needed:** nothing urgent. Worth folding the emitted DTCG back into the brand
system if ADD wants these governed centrally.

---

## 6. 🟢 Guideline artwork does not match the stated HEX values

Fills extracted from the placed artwork round to `#444850`, `#424850`, `#09BFDF`,
`#7F9C67` against stated values `#43474F`, `#00BFDF`, `#809C66`.

These are CMYK→RGB conversion artifacts of the placed art, not a second palette.
The stated HEX values on pp. 14–17 are authoritative and are what ADD OS uses.

**Needed:** nothing. Recorded so a future reader extracting colours from the PDF
artwork rather than the swatch tables does not "correct" the palette by mistake.

---

## 7. 🟢 Three referenced brand documents are missing

The brief names **Brand Strategy**, **ADD Persona**, and **ADD Philosophy &
Structure** alongside the Guideline. Only the Guideline and the logo artwork are
present in `info/ADD Brand/`.

They are not needed for tokens — Phases 1 and 2 carry no voice — but they are
required before Phase 3, which writes empty, loading and error states and sets
the UI's tone.

**What ADD OS did:** proceeded on the Guideline's stated character —
*minimal, system-driven, timeless* (p.5) — plus the brief's *confident,
pragmatic, no filler*.

**Needed:** the three documents, before Phase 3.

---

## 8. 🟢 Service pillars and their colours — confirmed from artwork

**Reported by the brand owner** (2026-08-03) as governed by *ADD Philosophy &
Structure*, which is not on disk here:

| Pillar | Services | Count |
|---|---|---|
| Core | Address, Business, Co-Space, Rooms, Accelerate (Lab), Incubate (Lab) | 6 |
| Experience | Business Café, Club, Event | 3 |
| Ecosystem | Partners, Community, Members, Place | 4 |

**Independently verified from `info/ADD Brand/ADD extension 3.pdf`**, which this
project does have. Per-page text and vector fills:

| Page | Lockups | Fills |
|---|---|---|
| p5 | `business · co-space · rooms · accelerate · incubate · address` | Charcoal + **Aleppo Economic Orange `#DC4128`** |
| p6 | `Business Café · Club · Events` | Charcoal |
| p7 | `partners · community · members · place` | Charcoal |
| p2 / p3 / p4 | pillar colour variants | orange / Signal Cyan `#09BFDF` / Smart Olive `#7F9C67` |

6 + 3 + 4 = **13 components**, matching the reported structure exactly. The Core
six — **including Accelerate and Incubate** — render in orange in the brand's own
artwork.

So the pillar colour system is real, and Accelerate/Incubate are Core. This is
**not an open conflict**: it is a *site backlog item*, since the live site renders
those two in Smart Olive. Two authoritative sources against one stale
implementation.

> Fills read `#444850` / `#09BFDF` / `#7F9C67` rather than the stated
> `#43474F` / `#00BFDF` / `#809C66` — CMYK→RGB conversion artifacts of the placed
> art, per §6. The swatch tables remain authoritative.

**Bearing on ADD OS:** none directly, and deliberately so. Pillar colours are
excluded from dashboard chrome so that orange stays reserved for `danger` (§3).
The pillar system governs service-facing surfaces, not operational UI.

---

## 9. 🔴 Live-site implementation drift — hand back to the site team

**Reported by the brand owner, not measured by this project.** Logged here so the
Guideline-vs-implementation gap is recorded in one place; ADD OS makes no change
for any of it.

The Brand Guideline 2026 is the **approved and newer** document. The live site
carries no authority, so everything below is implementation drift rather than a
competing source:

| # | Finding | Against |
|---|---|---|
| 1 | `#0E607C` top strip | In no palette in the Guideline |
| 2 | Accelerate / Incubate rendered in Smart Olive | Contradicts §8 — both are Core, therefore orange |
| 3 | Antique Copper eyebrow labels alongside orange CTAs in one layout | Violates the p.15 Strict Rule (§2) |

Item 3 is the one that matters beyond the site: it is a live instance of exactly
the pairing p.15 forbids, which is why ADD OS keeps Copper out of every accent
role and asserts it by test (§2).

**Needed:** site team action. Nothing for ADD OS.

---

## 10. 🟡 Service naming — which document governs, and Event vs Events

**Reported by the brand owner:** *ADD Philosophy & Structure* governs service
naming and supersedes *Company Profile*, a known-outdated document. Neither is on
disk here.

| Term | Philosophy (governs) | Company Profile (outdated) |
|---|---|---|
| Co-Space | `Co-Space` | "Space" |
| Business Café | `Business Café` | "Café" |

**Unresolved: `Event` or `Events`.** Philosophy reportedly says *Event*
(singular); the Guideline and the site say *Events*.

**Evidence from the artwork this project has:** `ADD extension 3.pdf` p6 renders
**`Events`** — plural — alongside `Business Café`, and p5 renders `co-space`.
So the artwork corroborates Philosophy on Co-Space and Business Café, and
corroborates the *plural* on Events.

**What ADD OS did:** nothing yet, deliberately. The singular/plural question is
raised rather than picked, because nav labels and service-catalog seed data will
both inherit it and a silent choice would propagate into `sections.ts`, the ar/en
message catalogues, and seed data at once.

**Needed:** a ruling on `Event` vs `Events`. Nav labels and seed data will be
taken from Philosophy; nothing will be seeded from Company Profile.

**New instance found (2026-08-15), deliberately not resolved by inference:** the
admin dashboard's Spaces/Seats & Desks CRUD screens (generic-resource-crud plan)
render `space_type: "co_space"` as the plain descriptive "Co-working space" /
"مساحة عمل مشتركة" rather than the brand term `Co-Space` — because this table's
Arabic rendering of `Co-Space` is itself unresolved (no Arabic form is registered
above), and picking one here would silently prejudge that open question for a
user-facing string. This is a staff-facing admin field, not the customer-facing
service catalog, but the same term is at stake. Flagging so the eventual ruling
on `Co-Space`/`Business Café` updates this screen's copy too, not just the
public-site copy.

---

## 11. 🔴 A supplied login design puts Aleppo Economic Orange on the primary CTA

**Raised 2026-09-22.** The brand/design owner supplied a login-screen reference
and asked for the dashboard's login to be rebuilt in its technique. Most of it
was built. One element was **deliberately not built**, because a developer may
not settle it: its primary "تسجيل الدخول" button is **Aleppo Economic Orange**.

### What the reference shows

An orange filled CTA, measured from the supplied image at approximately
`#D9411F` — within rounding of `brand.aleppoEconomicOrange` `#DC4128`, and of
`semantic.danger.base` `#D93D23`, which is that orange contrast-adjusted.

### Why it was not built

Two independent blocks, either of which is sufficient:

1. **Orange is `danger` in this dashboard, exclusively.** `tokens.ts`
   (SERVICE PILLARS) states the rule and its reason: *"In this dashboard orange
   means `danger`, and nothing else — that is what makes destructive actions
   unmistakable."* A sign-in button in `danger` orange would be the same colour
   as "Delete member". The cost is not aesthetic; it is that the destructive-
   action signal stops being reliable everywhere else in the product.
2. **It is a pillar colour, and pillar colour may not enter chrome.**
   `tokens.spec.ts` asserts that no semantic and no component token equals any
   pillar hex, per mode. Adopting it fails `pnpm test:unit` outright.

### What ships in the meantime

The CTA stays `primary`, which is the contrast-adjusted Smart Olive green
(`#657C50`, white text 4.61:1). Everything else from the reference was built:
the card-on-warm-ground composition, the enlarged top-corner pattern crop, the
eyebrow, the pillar row, the footer and the language switch.

The reference's **pillar dots** were built in a single `success` green rather
than in per-pillar colour, for the same reason — and that substitution follows
the remedy `tokens.ts` itself prescribes: *"Where a dashboard screen needs
service identity, it carries it with an icon or a label — never with colour."*
The three pillars are distinguished by their labels.

### Two other elements of the reference were not built, for a different reason

Neither is a brand question; both are recorded here so the owner is not
surprised by their absence from a screen they designed:

| Element in the reference | Why it is absent |
|---|---|
| "تذكرني" / Remember me | No such field exists. Searched the pinned collection (`docs/api/`, 2026-08-27, 211 leaf endpoints) for `remember`, case-insensitively: **zero matches**. It was already removed once on these grounds — see the auth design spec §2.2. Invariant 4 forbids shipping a control that does nothing. |
| "الدخول عبر SSO" | No SSO, SAML or OAuth endpoint exists in that collection. Same invariant. |

Adding either means adding the capability first, which is a backend question,
not a design one.

### What is needed

A ruling on **one** question:

> Should the ADD OS dashboard's primary call-to-action be Aleppo Economic
> Orange — accepting that orange would then mean both "proceed" and "this will
> delete something" — or does the dashboard keep orange reserved for
> destructive actions, with the supplied login reference read as
> member-app/marketing language rather than dashboard chrome?

If the ruling is **orange**, it is not a login-screen change: it moves the
`danger`/pillar relationship at the token layer and affects every destructive
control in the product. That should be its own change with its own review, not
folded into a login redesign.

**Owner: Brand.** Until then the login ships green, and this entry is the record
that the difference from the supplied reference is deliberate.
