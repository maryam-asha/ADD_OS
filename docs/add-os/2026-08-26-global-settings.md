# Global settings management page

**Built 2026-08-26.** One page in the previously account-only
`src/add-os/modules/settings/`, plus its service, types, config and mutation
composable. No new module.

Endpoint shapes here are **confirmed from the API snapshot pinned 2026-08-25**
(`docs/api/ADD-OS.postman_collection.json`, `sha256 86d330d9…`);
`pnpm api:collection:check` reported `MATCH` at the time of writing. Where the
snapshot is silent — per-type validation rules, the seeded key set — the source
is named inline below and was read from ADDCore directly.

---

## Not a CRUD screen, and why that shapes every file

`SettingController` implements `index` and `update`, and nothing else. The key
set is fixed by `SettingSeeder`; an admin changes a **value**, never the key,
type or scope. So:

- no create button, no delete column, no form drawer;
- `services/settings.ts` wraps exactly two calls and deliberately does not use
  `createResourceApi()`, which would ship three callable functions
  (`create`/`remove`/`show`) for routes that do not exist;
- `useSettingMutations` covers one verb rather than filling
  `useResourceMutations`' `create`/`update`/`remove` triplet with stubs. The
  precedent for that choice is `useCurrencyMutations`, which documents what
  `ExchangeRatesPage` paid for doing the opposite.

`ResourceTable` is not used either, for the reason `CurrenciesPage` already
records: its generic is `T extends { id: number }` and a setting's primary key
is a dotted string.

## The list is the server's, not a hardcoded table

The prompt's 13-key table is treated as **data, not UI**. The page renders
whatever `GET /admin/settings` returns, in the order it returns it
(`orderBy('key')`, server-side, not re-sorted here).

`config/settings.config.ts` holds three per-key **override** maps, and every one
of them degrades rather than gates:

| Map | Absent key behaves as |
|---|---|
| `SETTING_LABEL_SLUGS` | `formatSettingKey()` — `lock.ttlock_client_id` → "Lock ttlock client id" |
| `SETTING_CONFIRM_KEYS` | no confirm |
| `DURATION_KEY_PATTERN` | no client-side floor |

That is the whole point. The S4 access-control work is expected to add
TTLock-related keys; a hardcoded render list would silently drop them, and this
one shows them with a readable label the day they land. Both the config spec and
the page spec assert the fallback path explicitly, using a TTLock-shaped key.

**Why a slug and not the key itself as the i18n path:** vue-i18n resolves a
dotted key segment by segment, so `t("settings.keys.module.cafe.is_enabled.label")`
would require the ar/en catalogues to mirror every key's dot structure three
levels deep. One flat camelCase leaf per key keeps them diffable.

## The value renderer — the reason this is a page

One control per `SettingValueType`, and the value that leaves each control is
already the JSON type the server's per-type rule expects.
`UpdateSettingRequest::rules()` switches on the row's own `type`, so a
stringified `"15"` or `"1"` is a hard 422:

| Type | Control | Mirrored server rule |
|---|---|---|
| `int` | `n-input-number`, `precision: 0`, `step: 1` | `required|integer` |
| `bool` | `n-switch` | `required|boolean` |
| `string` | `n-input`, single line | `required|string` |
| `time` | `n-time-picker`, `value-format="HH:mm"` | `required|date_format:H:i` |
| `json` | `n-input` textarea, mono | `required|array` |

`prepareSettingValue()` is the one place operator input becomes a wire value —
the same role `toWireSymbol` plays in `services/currencies.ts`. Nothing is
*loosened* to be helpful: a numeric string is refused rather than parsed,
because quietly repairing input teaches an operator a rule the API does not
have.

Four cases worth naming:

- **Empty string.** Laravel's `required` rejects `""`, so an emptied text field
  is refused client-side instead of being stored as a zero-length value.
- **`HH:mm:ss`.** `date_format:H:i` rejects seconds — the same contract
  `types/business-hour.ts` records. Also: `NTimePicker` parses
  `formatted-value` strictly and throws on an unparseable string, so a malformed
  draft reaches it as `null` (the crash-avoidance shape guard
  `ResourceFormDrawer` documents at length), while the draft itself is left
  untouched for the validator to reject.
- **JSON.** Parsed client-side, so a typo never costs a request. A valid-JSON
  *scalar* is also refused: `array` takes an object or an array (both decode to
  a PHP array) and 422s a bare `5` or `"text"`.
- **`app.timezone`.** The one server rule this deliberately does **not** mirror.
  Laravel's `timezone` validator accepts any tz identifier and the identifier
  list is the server's; a hardcoded whitelist here would reject input the
  backend accepts. Only the non-empty-string check runs, and a bad identifier
  comes back as a toasted 422. This is also why `useSettingMutations` **toasts**
  a 422 rather than re-throwing it the way every other resource does — there is
  no drawer to map field errors onto, so a re-thrown 422 would be swallowed in
  silence, and this is precisely the case an operator has to hear about.

### The integer floor, and why it is scoped

`min: 0` applies to keys matching `/_(minutes|seconds)$/` — the seven seeded
duration keys — not to every `int`. A future int key could legitimately be
negative (an offset, a delta), and a blanket floor would refuse a value the
server accepts while presenting itself as a convenience. Anchored at the end so
`booking.minutes_offset` is not caught by mentioning "minutes" mid-name.
`profile.completion_threshold` therefore has no floor, and that is the intended
reading of the rule rather than an oversight.

**No `max` anywhere.** The backend has no upper limit; inventing one would only
get in the way.

## Edit state — one row at a time

`editingKey` + `draft`, exactly as scoped. Two decisions inside that:

- **Cancel reverts by dropping the draft**, since nothing was written.
- **Clicking Edit on a second row is refused, and the other rows' buttons render
  disabled with an explaining `title`**, rather than switching rows and
  discarding the open draft in silence. A disabled control usually "asks a
  question this layer has no answer for" (`ResourceTable`'s note) — here the
  answer is on screen: another row is open with Save/Cancel.

Save **refetches**; it does not patch the row in place. The backend coerces
through `Setting::encodeValue()`/`resolvedValue()` authoritatively and
`updated_at` exists only server-side, so reading the round-tripped row back is
the honest representation of what is stored. That timestamp is rendered as its
own column — a value the prompt asked to see reflected has to be visible
somewhere to be reflected at all.

On failure the row stays open with the draft intact: the reason is already
toasted, and discarding what the operator typed on top of that turns a
recoverable 422 into retyped work.

## The two keys that ask first

`app.timezone` and `kiosk.arrival_qr_value`, via `useDialog().warning` — the
same centred confirm `ResourceTable` uses, for the reason it records (the
`n-popconfirm` placement never got the RTL check `RTL-REPORT.md` §2 flagged).

Both fail **silently**; nothing on screen reports the damage. The time zone
rebases how every stored `starts_at`/`ends_at` renders, across every screen. The
QR value is the payload behind every printed and displayed arrival sticker in
the venue, and the only symptom of a change is members whose scan stops working.
The copy is per-key rather than a shared "are you sure?", because the two risks
are nothing alike.

Deliberately **not** extended to `kiosk.app_store_url` /
`kiosk.google_play_url`: a wrong store link is visible the moment someone taps
it and is fixed by editing the same field again.

**Validation runs before the confirm.** Answering "yes" and then being told the
JSON was malformed is worse feedback than being told the JSON was malformed.

## Permissions — the control, not the page

New in `config/permissions.ts`: `SETTINGS_UPDATE_ROLE` / `canUpdateSettings()`.

The collection's `Admin (Dashboard) > Settings` folder description reads
verbatim: *"Global key/value config. List is available to admin and operations;
update is admin-only."* `ADDCore/routes/api/v1/admin.php` agrees —
`GET settings` sits in the outer `role:admin|operations` group,
`PATCH settings/{key}` inside the narrower `role:admin` one.

So an `operations` account gets the whole table and every value, an `n-alert`
saying the page is read-only for it, and **no edit control at all** — presence,
not a disabled state, per `ResourceTable`'s rule. `startEdit` refuses as well,
so the rule holds even if something reaches past the rendered control.

This is a narrow, resource-specific instance of the product decision
[`2026-08-24-usersrolespage-permission-gap.md`](2026-08-24-usersrolespage-permission-gap.md)
left open ("hide the nav section" vs "hide the page content" vs "hide each
control"). It is available here **only because this resource's read and write
differ in role** — Users/Roles gates the entire resource behind `role:admin`,
so "render the shell, hide the controls" is not an option there. That finding
noted the settings PATCH as gated "irrelevantly for now… no screen yet"; it has
one now, and nothing about the Users/Roles gap is changed by this.

## Navigation — a reversal, recorded

**Owner decision, 2026-08-26.** The page is `system.globalSettings` →
`/system/settings`, beside Users and Roles.

`sections.ts` already carried a ComingSoon placeholder named `systemSettings` →
`/settings/system` for exactly this screen. Shipping the real page elsewhere
would have left a second "System settings" entry in the sidebar promising a page
that already existed one section up — a nav entry that can only mislead. **It
was removed**, along with `nav.pages.systemSettings` from both catalogues.

The two sections divide on *whose* settings they are, not on the word:
`settings` is the signed-in operator's own account (Account & security), while
these keys are platform-wide plumbing an admin changes for everybody — the same
class of thing as promoting an account. The backend puts the boundary in the
same place: `PATCH /admin/settings/{key}` sits in the very same `role:admin`
group as every Users and Roles route.

**What that gave up:** the `/settings/system` URL, and the reading that a
section named "Settings" owns everything called a setting. Nothing links to that
path yet, so there was nothing to redirect; if that changes, add a redirect
rather than moving the page back and re-splitting the two ideas. The `settings`
section now holds one page, and `/settings` redirects to it.

Global settings is **last** in the `system` page list on purpose: a section
redirects to its first page, and `/system` should keep landing on Users.

## Tests

80 new tests across three new files, all written before the code and each
watched fail first.

| File | Covers |
|---|---|
| `services/__tests__/settings.spec.ts` (10) | GET unwraps `data` and keeps the server's order; every value crosses the wire in its own JSON type; the dotted key stays readable in the path; 422 propagates; update returns `{message}` |
| `modules/settings/config/__tests__/settings.config.spec.ts` (35) | all 13 slugs present and distinct; formatted-from-key fallback; every `prepareSettingValue` branch per type; the duration floor's scope; the confirm set; `draftForSetting` including the `null`-value case for each type |
| `modules/settings/views/__tests__/SettingsPage.spec.ts` (35) | the six checklist items, plus one-row-at-a-time, cancel-reverts, refetch-not-optimistic, row-stays-open-on-failure, confirm-only-PATCHes-after-`onPositiveClick`, validate-before-confirm, and all four operations-account behaviours |

The confirm branch and the JSON guard were additionally **mutation-tested**:
disabling each made exactly the four tests that cover them fail, and nothing
else.

`time` and `json` rows appear in the page fixtures although no seeded key uses
either type today — both are live cases of ADDCore's `SettingValueType` enum, so
a seeder can introduce one without a frontend deploy, and those branches would
otherwise ship unexercised.

### Two guards caught this change, and neither was weakened

- **`no-inline-role-checks.spec.ts`** flagged `SettingsPage.spec.ts`, because a
  wiring assertion contained the forbidden identifier as a string literal — the
  guard scans specs under `modules/**` too. The assertion was **removed**: that
  guard already enforces the same rule repo-wide, so it was redundant as well as
  self-defeating.
- **`messages.spec.ts`** flagged `settings.types.json`, whose Arabic value was
  the bare acronym `"JSON"` and so contained no Arabic script. Now `"صيغة JSON"`.

No new architecture guard was added, so `.claude/commands/guards.md` is
unchanged.

### Suite state

Measured after this change: **72 spec files, 768 passed / 6 skipped (774
total)**. 80 of those tests are new and nothing was removed, so the pre-change
baseline was 69 files / 694 — arithmetic on the measured figures, not a
separately measured run.

`pnpm type-check`, `eslint .` (the no-write form) and
`pnpm api:collection:check` (`MATCH`) are all clean. The `.claude/worktrees/`
double-count noted in past sessions did not apply: 72 spec files exist under
`src/`, and `vitest list` collected 72.

## Open

- **`ar.json` has a top-level `sun_description` key that `en.json` does not.**
  Pre-existing, found while appending the `settings` group; almost certainly
  vendor residue. `messages.spec.ts`'s parity checks compare flattened keys and
  pass, so whatever it is, it is not currently breaking anything. Not touched —
  recorded so it is not lost.
- **`Café` vs `Business Café`.** `.claude/rules/i18n-rtl.md` says service naming
  is governed by *ADD Philosophy & Structure* and reads `Business Café`, not
  "Café". The shipped catalogues already say `Café` / `الكافيه` for
  `nav.pages.cafe`, so `module.cafe.is_enabled`'s label matches **that** rather
  than introducing a third spelling — one naming in the UI, and no new
  inference. The naming question itself is unchanged and still the brand
  owner's, exactly where it already was.
- **No live-backend QA.** Every claim here is sourced from the pinned snapshot
  or from ADDCore source read directly, and verified by unit tests against
  mocked services. The `app.timezone` 422 path in particular — the one rule
  deliberately not mirrored client-side — has not been exercised against a
  running API.
