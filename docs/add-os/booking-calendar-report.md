# Booking Calendar / All Bookings — build report

The two `bookings` pages that were still ComingSoon: **Calendar**
(`/bookings/calendar`) and **All bookings** (`/bookings/all`). Both nav entries
and both ar/en labels already existed; only the screens were missing.

## Verification status — read this first

**Not live-verified.** Unlike
`plans-exchange-hours-verification-report.md`, this pass did **not** run against
a started backend. The response shapes below come from the API snapshot
re-pinned 2026-09-20 plus the backend's own endpoint reference
(`ADDCore/docs/api/booking-availability-endpoints.md`), whose payloads were
captured from real responses on that side and transcribed verbatim.

That is stronger than the usual "specified but never observed" footing this
codebase works from — every other endpoint family here has zero saved example
responses — but it is still second-hand. **The first live call is the real
test.** If a field disagrees, the two `__tests__` files are where to fix the
expectation, and the field notes in `modules/booking/types/calendar.ts` are
where to record what was actually seen.

## Endpoints consumed

| Endpoint | Method | Called from | Notes |
|---|---|---|---|
| `/api/v1/admin/calendar` | GET | `services/booking-calendar.ts` → `BookingCalendarPage.vue` | `view` = `day\|week\|month`, `date` = any date inside the period; server expands it to a range |
| `/api/v1/admin/bookings` | GET | `services/booking-calendar.ts` → `AllBookingsPage.vue` | Paginated 25; filters `status`, `payment_state`, `space_id`, `branch_id`, `user_id`, `from`, `to`, `q` |
| `/api/v1/admin/bookings/{booking}` | GET | `services/booking-calendar.ts` (`getBooking`) | Written but **not yet consumed by a screen** — see Known gaps |
| `/api/v1/admin/calendar/occupancy` | GET | — | Not consumed: it is the calendar response minus per-booking detail, and both screens need the detail |

## Decisions worth keeping

**FullCalendar, not a grid of cells.** The first attempt built the calendar as
a Naive table of shaded space × day cells. It was rejected, correctly: that
shape answers "how full is this space today" but not "what is on at 2pm", which
is the question an operator at the desk is usually asking. The template already
ships `@fullcalendar/*` as a dependency and already uses it in
`src/views/Apps/Calendars/FullCalendar.vue`, so month/week/day/list views,
navigation and the title bar come from the library rather than from hand-rolled
controls.

The vendor boundary is respected: `@fullcalendar/*` is imported from
`node_modules` — a declared dependency, not vendor source — and **nothing** is
imported from `src/views/Apps/**`, which stays Category C. The vendor screen
was read as a reference for wiring and styling, which is what Category C is for.

**Both screens are read-only.** Every write verb on a booking — approve, reject,
check in, check out, cancel, settle, extend — already lives on the reception
screens and in `services/reception.ts`. A calendar that could also approve and
cancel would be a second place those rules are expressed. So: no `editable`, no
`dateClick`, no `eventDrop`, and a test pins each of those as absent.

**The range follows the calendar, not the other way round.** `datesSet` reports
whichever period the user navigated to and the fetch follows it, so the visible
window and the data behind it cannot drift apart. The anchor sent to the server
is the **midpoint** of the visible range, not its start: a month grid's first
cell is often in the previous month, and sending that fetches the wrong month.

`activeDate` is seeded with today so the first paint has data. Waiting for
FullCalendar's first `datesSet` left the screen blank until the user navigated —
caught by a test, not by inspection.

**Occupancy percent is never recomputed.** The server divides booked minutes by
`open_minutes × concurrency_ceiling`, so a co-working space with twenty seats
stays on the same 0–100 scale as a meeting room. Deriving
`booked_minutes / open_minutes` client-side would report that space as 2000%
full. Recorded in `types/calendar.ts` next to the field, because the wrong
formula is the obvious one.

**A closed day and a full day are different facts.** The admin calendar's
`state` is `open | closed` only — a day with no free slots is still open, and
shading it "closed" would tell an operator the branch was shut. A day is shaded
closed only when **every** space in view is closed on it; one space under
maintenance does not shut the branch.

**Status colour is not the only signal.** Events carry a 3px start border as
well as a fill, and cancelled bookings are struck through. The token file calls
out `warning` against `danger` as the tightest pair in this palette under
deuteranopia.

**`allBookings.status.*` is a new vocabulary, not a reuse.** `events.status.*`
is `draft/published/cancelled` — a different set of values for a different
resource. Borrowing it would have rendered a wrong label for `confirmed` and
`pending` and nothing for `rejected`.

**`amount_owed` is null until checkout.** The server writes it at settlement,
not at creation, so the table says "Not settled yet" rather than printing a dash
that reads as missing data on an upcoming booking.

## What was removed

`modules/booking/config/booking-calendar.config.ts` — the occupancy-band
helper and its Tailwind classes — was deleted when the grid was replaced. Its
i18n keys (`bookingCalendar.views.*`, `.cell.*`, `.columns.*`,
`.filters.date`, `.filters.today`, `.legend.{free,light,busy,full}`) went with
it in the same change, per Invariant 4: a shipped key with no consumer is the
string half of a dead control.

## Known gaps

- **`getBooking` has no screen.** The service function exists and is typed, but
  neither page opens a booking detail yet. It is one `n-modal` away, and the
  backend already returns the same breakdown and approval stepper the member
  sees. Left out deliberately rather than half-built.
- **`calendar/occupancy` unused.** Right endpoint for a dashboard tile; wrong
  one for either of these screens.
- **`branch_id` filter not surfaced.** The calendar defaults to the default
  branch and the service accepts `branch_id`, but no control sets it. Correct
  for a single-branch district; a second branch makes it a real gap.
- **Space filter options come from the current response.** They list the spaces
  in the fetched range, so a space with no bookings in the current month still
  appears (the endpoint returns every active space), but changing the range
  re-derives the list. A dedicated spaces fetch would be steadier; it would also
  be a second source able to disagree with the calendar.

## Verification run

```
pnpm lint:check         # clean for these files
pnpm type-check         # only the 2 pre-existing operations/* errors remain
pnpm test:unit          # 95 files / 870 tests, all passing, guards included
pnpm api:collection:check  # MATCH (re-pinned 2026-09-20)
```

17 new tests across the two pages. Three of them found real defects while being
written, which is the reason they are worth reading:

- the cell branch that printed "Free" over a fully-booked day (grid version),
- the blank first paint before any navigation,
- a test double that snapshotted a `computed` once and never saw the data.
