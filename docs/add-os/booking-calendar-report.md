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

- **`getBooking` still has no screen.** Clicking an event now opens a detail
  built from the calendar payload it already has — member, space, window,
  status, payment, check-in — so no extra request is made. The richer detail
  that endpoint returns (price breakdown, approval stepper) has no consumer
  yet; wiring it would mean a fetch per click for fields the calendar does not
  carry, which is worth doing only once a screen needs them.
- **`calendar/occupancy` unused.** Right endpoint for a dashboard tile; wrong
  one for either of these screens.
- **The space rule columns still have no admin API surface.**
  `slot_granularity_minutes`, `buffer_minutes`, `cancellation_window_minutes`
  and `requires_approval` are not editable from the dashboard (the backend's
  own deferred phase). This no longer blocks booking — the availability
  endpoints report their *effect* — but the values themselves cannot be seen
  or changed here.
- **`branch_id` filter not surfaced.** The calendar defaults to the default
  branch and the service accepts `branch_id`, but no control sets it. Correct
  for a single-branch district; a second branch makes it a real gap.
- **Space filter options come from the current response.** They list the spaces
  in the fetched range, so a space with no bookings in the current month still
  appears (the endpoint returns every active space), but changing the range
  re-derives the list. A dedicated spaces fetch would be steadier; it would also
  be a second source able to disagree with the calendar.

## Added after first review — detail and create

The first pass shipped the calendar as a pure read surface with unlabelled
filters. Three corrections:

**Clicking a booking opens its details.** Read-only, built from the payload the
calendar already holds rather than a fetch per click. A click on a
closed-day background event opens nothing, since it carries no booking.

**A header button books a member in.** It posts to
`/api/v1/admin/reception/bookings`, which reuses the backend's own
`BookingCreationService` — so reception cannot double-book a room the member
endpoint would refuse, and cannot back-date one either.

Times are sent as district wall-clock (`YYYY-MM-DD HH:mm`), matching the
request body in the pinned collection. That endpoint reads a bare value as
local by design; sending an ISO offset would be re-interpreted rather than
honoured, so a test pins the exact string that reaches the service.

The only rule validated client-side is that an end must follow its start,
because it needs no knowledge the client lacks. Granularity, minimum duration,
overlap, buffer and back-dating are all the server's, and its 422 is shown in
its own words — it already names the rule that was broken, in the requested
language.

**The filter selects were unlabelled.** They shipped with a placeholder only,
which disappears the moment a value is chosen; in RTL they read as two blank
pills. Both now carry a visible label, at the default size the other filter
screens use.

## Added after second review — the filter bar

The all-bookings filters had the same defect the calendar's did, and the same
cause: four controls in a row, each with a placeholder and no label. A
placeholder is gone exactly when a filter is active, so a filtered list said
nothing about what was filtering it; in RTL the row read as blank pills.

**Status became a chip row, not a fourth dropdown.** It is the filter an
operator reaches for most, it has four values plus "all", and chips show every
option and the current one without being opened. The precedent is
`OperationsRequestsPage`, which already filters this way. The other three stay
as fields because their value sets are open (search, dates) or rarely touched
(payment state) — the point is not that chips are better, it is that a small
closed set is what chips suit.

"All" clears the filter rather than sending a value: `status: null` would ask
the server to match a status no booking holds. Pinned by a test, because the
query object is where that mistake would be invisible.

**The count beside the title is `meta.total` — the total for the current
filter.** Per-status tallies on each chip were considered and dropped: this
endpoint returns one total, so four counts would cost four extra requests per
keystroke, and deriving them from the loaded page would count 25 rows and call
it the district. One honest number beats five guessed ones.

**The empty state offers the way out.** "No bookings match these filters" is
accurate but unhelpful when the operator has filtered themselves into a corner;
the clear button now appears there — and only when a filter is actually set,
since with none there is nothing to clear and the control would be a no-op.

Styling is tokens only: `--add-primary` for the active chip, `--add-surface`
and `--add-border` for the panel, `--add-space-*` and `--add-radius-*` for
metrics. The active chip carries weight as well as fill, since at this palette's
contrast colour alone is what a deuteranopic viewer loses.

## Added after third review — booking a real time

The form shipped with a date picker and two free-form clocks. That was wrong in
two ways an operator feels immediately:

**It let them enter times the space cannot take.** A clock accepts 14:07 on a
space with 30-minute slots, and it cannot know 14:00 is already booked. The
rules that decide — granularity, minimum duration, buffer, overlap, capacity,
no back-dating — all live on the server, so the form could only discover them
by being refused, one 422 at a time.

**It ignored where the operator clicked.** The modal always opened on today at
09:00, so clicking Thursday on the grid and then re-typing Thursday in the form
was the actual workflow. That is what made the form feel unattached to the
calendar it sits on.

### The fix, and why it needed a backend change

The server already computes exactly this: `GET .../availability/slots` returns
the day's slots each carrying `is_available` and a translated `reason`, and
`.../availability/quote` returns the duration ladder priced with each rung
flagged bookable or not. Both existed — but only under `role:member`, so the
dashboard got a 403.

So the two reads are now exposed under `admin/` as well, delegating to the same
`AvailabilityBrowseService`. **Not reimplemented — delegated**, and a backend
test asserts the admin and member responses are byte-identical for the same
space and date. If that ever stops being true, that test fails rather than the
two surfaces quietly disagreeing about what is bookable.

The form now offers chips, not a clock. A taken slot stays on screen, struck
through and disabled, carrying the server's reason in its tooltip: "2pm is
booked" and "2pm is not a slot here" are different facts, and an operator
explaining a refusal needs the first. Durations behave the same way — an option
that cannot be booked is shown disabled with its reason rather than hidden, so
"why is 1.5h missing" is never a question.

Clicking any day on the grid now opens the form on that date. The grid stays
read-only otherwise: no drag, no resize, no inline edit, each pinned by a test,
because moving a booking re-runs approval and payment and that lives on the
reception screens.

**The client no longer validates availability at all.** The old
`endBeforeStart` check is gone with its i18n keys, because the form can now
only submit a start the server listed and a duration it approved. What remains
the server's alone is unchanged: the slot list can go stale between load and
submit, so the POST still re-checks under a row lock, and its 422 is still
shown verbatim.

The end time sent is the chosen duration's `end_time` from the quote, never
start-plus-minutes computed here — a duration crossing a midday closure ends
somewhere only the server knows.

## Changed 2026-09-27 — duration first, then the time

**Reversal of the order above.** The form asked for a start, then quoted the
durations for it. That let an operator pick a time no length could fill: with
30-minute cells and a 60-minute minimum, 10:30 before an 11:00 booking — or
19:30 before a 20:00 close — showed free, and every duration on the quote then
came back disabled. The chip said "available" and nothing could be booked from
it.

ADD Core's booking-availability Phase 6
(`ADDCore/docs/decisions/booking-availability-and-calendar.md`) added an
optional `duration` to `GET .../availability/slots`. With it, each slot is the
whole booking window for that length, priced, and only starts that can hold the
full length before closing are listed. So the form now runs:

1. **Duration** — chips from the response's `rules.duration_options_minutes`,
   the lengths this space accepts, as the server resolved them. The shortest is
   preselected. None are invented here.
2. **Start** — the slots for that length. Each chip shows its start and the end
   the server computed; a taken, buffered or too-soon one stays visible,
   disabled, with the server's reason — the same rule as before.
3. **Submit** — `end_at` is the chosen slot's own `end_time`, not minutes added
   here.

A length the space refuses (below the minimum, above
`booking.max_duration_minutes`, off-granularity) is a 422 carrying the POST's
own sentence, shown where the chips would be — not an empty grid, which would
read as "fully booked".

**What was given up:** the per-duration "why is 1.5h disabled" answer. The
quote marked each rung available or not *for one start*; the duration chips now
carry only the lengths the space accepts at all, and whether a length fits a
given time shows up as that time being absent or disabled instead. For
"which times hold 2 hours?" — the question an operator is usually asked — that
is the better trade. The `availability/quote` call and its `QuoteResponse` /
`DurationOption` types were removed from the dashboard, since nothing used them;
the endpoint still exists on the server for the member app's start-first flow.

Changing the space, date or duration clears the chosen time. The chosen
duration survives a date change — it is not about any one date — and is
replaced only when a newly chosen space does not accept it.

The server's new slot states `too_soon` / `too_far_ahead` (minimum notice and
booking horizon, both off by default) need no client handling: they arrive as
disabled chips with their reason, like every other refusal.

## Changed 2026-09-28 — past days and upcoming closures are refused up front

The picker only greyed out days the calendar response showed as closed for
every space — which covers only the range on screen, while the picker
navigates freely. So a past day could be chosen (the server then refuses it as
`start_in_the_past`, and every slot on it is `past`), and so could a holiday in
next month. And on the grid, a holiday looked like any other day until it was
clicked: the form then opened on a date the picker had already struck through.

Now, driven by the new `branch_hours.upcoming_closures` (ADD Core, same
decision doc — each all-day `business_hour_exception` from today on, not
bounded by the range shown; a shortened day is not listed, it is open):

- **The picker refuses** every day before the district's today and every
  upcoming closure. The in-view closed-day check stays and still covers a
  weekday with no schedule at all.
- **The grid marks each closure**: shaded, its day number struck through, and
  the exception's own reason written in the cell ("Labour Day"; "Closed" when
  it was given none). Clicking it opens nothing — nor does clicking a past day.
- **"Add booking" opens on the next bookable day**, not on today when today is
  a holiday.
- "Today" is the district's, from the response's `range.timezone` via `Intl`,
  not the browser clock — a desk machine on UTC at 01:30 Damascus time must
  not still offer yesterday.

## Verification run

```
pnpm lint:check         # clean for these files
pnpm type-check         # only the 2 pre-existing operations/* errors remain
pnpm test:unit          # 95 files / 889 tests, all passing, guards included
pnpm api:collection:check  # MATCH (re-pinned 2026-09-21, +2 endpoints)
```

38 new tests across the two pages. Three of them found real defects while being
written, which is the reason they are worth reading:

- the cell branch that printed "Free" over a fully-booked day (grid version),
- the blank first paint before any navigation,
- a test double that snapshotted a `computed` once and never saw the data.
