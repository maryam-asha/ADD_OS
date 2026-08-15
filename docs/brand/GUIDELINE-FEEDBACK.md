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
