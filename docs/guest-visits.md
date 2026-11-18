# Coworking guests at the reception desk

How the dashboard handles a member's guest in a coworking session. The backend
side is ADDCore commit `e3a6687c` (2026-11-18), `GuestVisitService`.

## The rule, as the backend enforces it

- A guest is recorded against a **host who is in a coworking session of their own**.
  Rooms and offices never get one: their guests belong to the booking and are not charged.
- The guest is free for `guest.grace_minutes` (15). If reception checks them out within
  that time, nothing is billed.
- If they are still inside when it ends, the minute job `guests:run` turns the visit into
  a walk-in **billed from the arrival**. It goes on the guest's own account when their
  phone has one. Otherwise it goes on the host's account, at list price, never on the
  host's plan, discounts or held seat.
- A phone gets `guest.free_visits_per_day` (1) free periods a day; after that the visit is
  billed from arrival straight away. A host may have at most `guest.max_active_per_host`
  (3) guests inside at once.
- While a guest is inside, the host's own session **will not check out at the desk**
  (409, `api.guest.host_has_guests`).
- The host can decline to pay for a guest who has no account (member app). Reception is
  told (`guest.host_declined`, sent to `reception.view` holders).

## What the dashboard does

| Where | What |
|---|---|
| Reception desk → **Guests** tab (`GuestVisitsPanel`) | `GET reception/guest-visits`: guest, phone, account or none, host, who is billed, arrival, minutes of free time left (counted down on this machine from `grace_seconds_left`), and *Host declined*. **Check out** asks for confirmation first, and the confirmation says whether anything will be billed. |
| **Record a guest** (`RecordGuestModal`) | `POST reception/guest-visits`. The host list is the members currently in their own coworking session (taken from `sessions/active`). The phone is converted to international format (`toInternationalPhone`). The name is optional, because the server only needs it when the phone has no account, and the server says so when it does. |
| Active sessions | **Add guest** appears on a member's own coworking row, with the host already filled in. A guest's session billed to the host shows the guest's name, tagged *Guest of {host}*. The 409 on checking out a host who still has a guest inside appears as the server's own message. |
| Notifications | `target_type: guest_visit` opens `/bookings/reception-desk?open=<id>`. The desk switches to the Guests tab, which highlights the row (`useOpenRecord`). |
| System settings | Labels and hints for the three `guest.*` keys, in both catalogues. |

Permissions follow the backend routes. Viewing the list needs `reception.view`. Recording
and checking out need `reception.check_in`, and both buttons are hidden without it.

**Refresh:** guest visits have no realtime event. The tab reloads on the desk's own events
and its 30-second fallback poll, after every action, and once just after the earliest
free period ends plus 65 seconds. By then `guests:run` has converted the visit, so it
leaves this list and appears on the sessions board.

## Open

- **API pin.** The guest requests are only in the canonical collection's *uncommitted*
  edits, so they are not in the 2026-10-18 snapshot. `services/reception.ts` cites the
  backend commit until the next re-pin.
- `guest.host_approval_timeout_seconds` still reads "not used by the system yet". That is
  still true: the new flow uses the free period, not host approval.

## Removed

- **`reception/components/QuickGuestModal.vue`, deleted 2026-11-18** at the owner's
  request. It was imported nowhere. Despite its name, it created a *member account*
  (`createUser`, role `member`, with a generated temporary password), so it had nothing
  to do with guest visits, and its name now clashed with them. It shipped no catalogue
  keys (only inline fallback strings) and no SCSS, so nothing else went with it.
  Given up: nothing reachable, since no screen opened it.
