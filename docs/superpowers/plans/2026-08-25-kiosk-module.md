# Kiosk Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two admin screens — banner-content CRUD for the reception kiosk display, and the reception queue of arriving members — over endpoints ADDCore already serves.

**Architecture:** Announcements is a straight `PlansPage` clone on the generic CRUD stack (`useResourceList` + `useResourceMutations` + `ResourceTable` + `ResourceFormDrawer`). Arrival Requests is an `ApprovalQueuePage` clone (`useResourceList` with a page ref + `useReceptionAction`, refetch-never-splice). Three additive shared primitives land first because both screens depend on them: a `datetime` field type, a relative-time formatter, and a ticking clock.

**Tech Stack:** Vue 3 `<script setup lang="ts">` · Naive UI · Tailwind v4 · vue-i18n (ar/en, RTL-first) · Vitest + @vue/test-utils.

**Spec:** `docs/superpowers/specs/2026-08-25-kiosk-module-design.md` — read it first. Every "why" below is argued there.

**Branch:** `feat/kiosk-module`, already cut. Batch 1 (the API re-pin) is done and is NOT part of this plan.

## Global Constraints

Copied verbatim from `CLAUDE.md` and the spec. Every task's requirements implicitly include these.

- **TypeScript strict. No `any`.**
- **Zero hardcoded design values in `src/add-os/`** — no hex, no `rgb()`, no raw px for spacing/radius/font-size.
- **All numbers rendered through `src/add-os/utils/format/`.** No `toLocaleString`, no `Intl.NumberFormat`, no `Intl.DateTimeFormat`, no `dayjs().format()` for display.
- **All user-visible strings through vue-i18n, in both `ar` and `en`.** No literal strings in templates. `src/add-os/lang/__tests__/messages.spec.ts` enforces exact key parity, no blank values, no Arabic in the `en` bundle, and — the one that bites — **every `ar` value must contain Arabic script**, so an English placeholder fails.
- **Icons: Carbon (`carbon:*`), bundled locally.** Run `pnpm icons` after adding a new icon name or the icon guard fails.
- **Naive UI components first; Tailwind utilities for layout. No new custom CSS files.**
- **Vendor `src/**` outside `add-os` is override-only, never edited.** Everything this plan touches is `src/add-os/**` (Category A) or a root config file already owned by ADD OS.
- **URL fixtures in tests must use the host `api.test`** — it is the only allowlisted mock host. `src/add-os/__tests__/no-external-urls.spec.ts` scans `src/add-os/**` including `__tests__`, and fails the build on any off-allowlist `http(s)://` host. Never write a bare scheme-plus-host in an i18n string either.
- **Never quote a credential fragment anywhere**, including in docs.
- **Each task is committed before the next begins.** One working tree; do not run a second agent against this checkout.
- **`pnpm lint` writes — never use it as a verification step.** Use `pnpm lint:check`.
- **`.claude/worktrees/company-pipeline` exists and is stale.** Running vitest from the repo root double-counts files. Every test command below therefore passes `--exclude "**/.claude/worktrees/**"`. Do not drop that flag.
- **Do not stage `.claude/settings.json` or `pnpm-workspace.yaml`** — they carry unrelated uncommitted work. Always `git add` explicit paths, never `-a` or `.`.

## File Structure

**Batch 2 — shared primitives** (both screens depend on these)

| File | Responsibility |
|---|---|
| `src/add-os/utils/format/dates.ts` (modify) | gains `formatRelativeTime`; receives `toOffsetIso` moved in from `services/reception.ts` |
| `src/add-os/utils/format/index.ts` (modify) | re-exports both |
| `src/add-os/utils/format/__tests__/format.spec.ts` (modify) | gains the relative-time cases; receives `toOffsetIso`'s cases |
| `src/add-os/services/reception.ts` (modify) | `toOffsetIso` removed, imported instead |
| `src/add-os/services/__tests__/reception.spec.ts` (modify) | its `toOffsetIso` block moves out |
| `src/add-os/composables/useNow.ts` (create) | one ticking `Ref<number>`, self-cleaning |
| `src/add-os/composables/__tests__/useNow.spec.ts` (create) | its test |
| `src/add-os/components/resource/field-types.ts` (modify) | `FieldType` gains `"datetime"` |
| `src/add-os/components/resource/ResourceFormDrawer.vue` (modify) | renders it |
| `src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts` (modify) | covers it |

**Batch 3 — Announcements**

| File | Responsibility |
|---|---|
| `src/add-os/modules/kiosk/types/announcement.ts` (create) | wire shape, form shape, and the deliberate difference between them |
| `src/add-os/services/announcements.ts` (create) | the endpoint, and the one place timestamps become wire strings |
| `src/add-os/services/__tests__/announcements.spec.ts` (create) | the round-trip in both directions |
| `src/add-os/modules/kiosk/config/announcements.config.ts` (create) | columns + form fields + validation rules |
| `src/add-os/modules/kiosk/views/AnnouncementsPage.vue` (create) | the screen |
| `src/add-os/modules/kiosk/views/__tests__/AnnouncementsPage.spec.ts` (create) | its test |

**Batch 4 — Arrival Requests**

| File | Responsibility |
|---|---|
| `src/add-os/modules/kiosk/types/arrival-request.ts` (create) | row shape + confirm payload |
| `src/add-os/services/reception.ts` (modify) | three calls added; it already owns the `/reception` prefix |
| `src/add-os/services/__tests__/reception.spec.ts` (modify) | covers them |
| `src/add-os/modules/kiosk/config/arrival-requests.config.ts` (create) | columns + the one-field space picker |
| `src/add-os/modules/kiosk/views/ArrivalRequestsPage.vue` (create) | the screen |
| `src/add-os/modules/kiosk/views/__tests__/ArrivalRequestsPage.spec.ts` (create) | its test |

**Batch 5 — wiring + verification**

| File | Responsibility |
|---|---|
| `src/add-os/navigation/sections.ts` (modify) | two page entries; `cms` flips to `active` |
| `src/add-os/navigation/routes.ts` (modify) | two `PAGE_COMPONENTS` entries |
| `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (modify) | two key groups + two nav labels |
| `src/add-os/__tests__/no-external-urls.spec.ts` (modify) | widen the `api.test` justification |

---

# BATCH 2 — Shared primitives

### Task 1: `formatRelativeTime`

**Files:**
- Modify: `src/add-os/utils/format/dates.ts`
- Modify: `src/add-os/utils/format/index.ts:52-54`
- Test: `src/add-os/utils/format/__tests__/format.spec.ts`

**Interfaces:**
- Consumes: `toDate`, `pad`, `DateInput`, `SupportedLocale`, `currentLocale` — all already in `dates.ts`.
- Produces: `formatRelativeTime(value: DateInput, options?: { locale?: SupportedLocale; now?: DateInput }): string` and the exported type `RelativeTimeOptions`. Task 9 renders the "waiting" column with it.

Why hand-rolled rather than `Intl.RelativeTimeFormat`: `dates.ts` already refuses every locale-data library because they disagreed on Arabic month names (see `calendar.ts`), and Arabic counted nouns need four forms that a naive implementation flattens to two. Latin digits always — never Arabic-Indic.

- [ ] **Step 1: Write the failing tests**

Append to `src/add-os/utils/format/__tests__/format.spec.ts`. Add `formatRelativeTime` to the existing `import { formatDate, formatDateTime, formatTime } from "../dates"` line.

```ts
describe("formatRelativeTime", () => {
	const NOW = new Date(2026, 7, 25, 12, 0, 0)
	const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000)

	it("floors anything under a minute to a 'just now' phrase", () => {
		expect(formatRelativeTime(ago(0), { ...EN, now: NOW })).toBe("just now")
		expect(formatRelativeTime(ago(59), { ...EN, now: NOW })).toBe("just now")
		expect(formatRelativeTime(ago(59), { ...AR, now: NOW })).toBe("الآن")
	})

	it("treats a future timestamp as 'just now' rather than emitting a negative count", () => {
		expect(formatRelativeTime(new Date(NOW.getTime() + 5000), { ...EN, now: NOW })).toBe("just now")
	})

	it("counts minutes, hours and days in English with plain plurals", () => {
		expect(formatRelativeTime(ago(60), { ...EN, now: NOW })).toBe("1 minute ago")
		expect(formatRelativeTime(ago(300), { ...EN, now: NOW })).toBe("5 minutes ago")
		expect(formatRelativeTime(ago(3600), { ...EN, now: NOW })).toBe("1 hour ago")
		expect(formatRelativeTime(ago(7200), { ...EN, now: NOW })).toBe("2 hours ago")
		expect(formatRelativeTime(ago(86400), { ...EN, now: NOW })).toBe("1 day ago")
		expect(formatRelativeTime(ago(86400 * 3), { ...EN, now: NOW })).toBe("3 days ago")
	})

	/**
	 * The whole reason this formatter is hand-rolled. Arabic counted nouns take
	 * four distinct forms, and collapsing them to singular/plural is what every
	 * naive implementation does:
	 *   1  → the bare noun, no numeral
	 *   2  → the dual form, no numeral
	 *   3-10 → numeral + plural of paucity
	 *   11+  → numeral + singular
	 */
	it("uses all four Arabic plural categories for minutes", () => {
		expect(formatRelativeTime(ago(60), { ...AR, now: NOW })).toBe("منذ دقيقة")
		expect(formatRelativeTime(ago(120), { ...AR, now: NOW })).toBe("منذ دقيقتين")
		expect(formatRelativeTime(ago(300), { ...AR, now: NOW })).toBe("منذ 5 دقائق")
		expect(formatRelativeTime(ago(600), { ...AR, now: NOW })).toBe("منذ 10 دقائق")
		expect(formatRelativeTime(ago(660), { ...AR, now: NOW })).toBe("منذ 11 دقيقة")
		expect(formatRelativeTime(ago(1500), { ...AR, now: NOW })).toBe("منذ 25 دقيقة")
	})

	it("uses all four Arabic plural categories for hours", () => {
		expect(formatRelativeTime(ago(3600), { ...AR, now: NOW })).toBe("منذ ساعة")
		expect(formatRelativeTime(ago(7200), { ...AR, now: NOW })).toBe("منذ ساعتين")
		expect(formatRelativeTime(ago(3600 * 4), { ...AR, now: NOW })).toBe("منذ 4 ساعات")
		expect(formatRelativeTime(ago(3600 * 13), { ...AR, now: NOW })).toBe("منذ 13 ساعة")
	})

	it("uses all four Arabic plural categories for days", () => {
		expect(formatRelativeTime(ago(86400), { ...AR, now: NOW })).toBe("منذ يوم")
		expect(formatRelativeTime(ago(86400 * 2), { ...AR, now: NOW })).toBe("منذ يومين")
		expect(formatRelativeTime(ago(86400 * 6), { ...AR, now: NOW })).toBe("منذ 6 أيام")
		expect(formatRelativeTime(ago(86400 * 12), { ...AR, now: NOW })).toBe("منذ 12 يوم")
	})

	it("emits Latin digits, never Arabic-Indic ones", () => {
		expect(formatRelativeTime(ago(300), { ...AR, now: NOW })).toMatch(/5/)
		expect(formatRelativeTime(ago(300), { ...AR, now: NOW })).not.toMatch(/[٠-٩]/)
	})

	it("accepts an ISO string as readily as a Date", () => {
		expect(formatRelativeTime(ago(300).toISOString(), { ...EN, now: NOW })).toBe("5 minutes ago")
	})
})
```

**Note the `{ ...EN, now: NOW }` spread.** `AR` and `EN` in this spec are already-declared options OBJECTS — `const AR = { locale: "ar" } as const` at line 9 — not bare locale strings. Passing `{ locale: EN }` would nest an object where a string belongs and every assertion would fail confusingly. Spread them.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/add-os/utils/format --exclude "**/.claude/worktrees/**"`
Expected: FAIL — `formatRelativeTime is not a function` / not exported.

- [ ] **Step 3: Implement**

Append to `src/add-os/utils/format/dates.ts`:

```ts
/**
 * How long ago something happened, in words.
 *
 * Hand-rolled for the same reason the month table in `./calendar.ts` is:
 * `Intl.RelativeTimeFormat`, date-fns and dayjs each ship their own Arabic
 * data and they do not agree. Here the disagreement would be grammatical
 * rather than lexical — Arabic counted nouns take FOUR forms, and a library
 * configured for two produces "منذ 2 دقائق" where a speaker says "منذ دقيقتين".
 *
 * `now` is injectable so a caller can drive it from a ticking ref (see
 * `composables/useNow.ts`) and so tests are not clock-dependent.
 *
 * Anything under a minute — including a future timestamp from clock skew —
 * floors to "just now". A negative count is never emitted.
 */
export interface RelativeTimeOptions {
	locale?: SupportedLocale
	now?: DateInput
}

const RELATIVE_UNITS = [
	{ unit: "day", seconds: 86400 },
	{ unit: "hour", seconds: 3600 },
	{ unit: "minute", seconds: 60 }
] as const

type RelativeUnit = (typeof RELATIVE_UNITS)[number]["unit"]

/**
 * `one` and `two` are used WITHOUT a numeral — "منذ دقيقة", not "منذ 1 دقيقة".
 * `few` covers 3-10 (plural of paucity); `many` covers 11 and up, which takes
 * the singular back again. This is the table a two-form library cannot express.
 */
const AR_UNIT_FORMS: Record<RelativeUnit, { one: string; two: string; few: string; many: string }> = {
	minute: { one: "دقيقة", two: "دقيقتين", few: "دقائق", many: "دقيقة" },
	hour: { one: "ساعة", two: "ساعتين", few: "ساعات", many: "ساعة" },
	day: { one: "يوم", two: "يومين", few: "أيام", many: "يوم" }
}

const EN_UNIT_FORMS: Record<RelativeUnit, { one: string; other: string }> = {
	minute: { one: "minute", other: "minutes" },
	hour: { one: "hour", other: "hours" },
	day: { one: "day", other: "days" }
}

const JUST_NOW: Record<SupportedLocale, string> = { ar: "الآن", en: "just now" }

function relativeArabic(count: number, unit: RelativeUnit): string {
	const forms = AR_UNIT_FORMS[unit]
	if (count === 1) return `منذ ${forms.one}`
	if (count === 2) return `منذ ${forms.two}`
	if (count <= 10) return `منذ ${count} ${forms.few}`
	return `منذ ${count} ${forms.many}`
}

function relativeEnglish(count: number, unit: RelativeUnit): string {
	const forms = EN_UNIT_FORMS[unit]
	return `${count} ${count === 1 ? forms.one : forms.other} ago`
}

export function formatRelativeTime(value: DateInput, options: RelativeTimeOptions = {}): string {
	const { locale = currentLocale.value, now = Date.now() } = options
	const elapsedSeconds = Math.floor((toDate(now).getTime() - toDate(value).getTime()) / 1000)

	if (elapsedSeconds < 60) return JUST_NOW[locale]

	for (const { unit, seconds } of RELATIVE_UNITS) {
		if (elapsedSeconds >= seconds) {
			const count = Math.floor(elapsedSeconds / seconds)
			return locale === "ar" ? relativeArabic(count, unit) : relativeEnglish(count, unit)
		}
	}

	return JUST_NOW[locale]
}
```

Then in `src/add-os/utils/format/index.ts`, change the two `./dates` lines to:

```ts
export { formatDate, formatDateTime, formatRelativeTime, formatTime } from "./dates"

export type { DateFormatOptions, DateInput, DateStyle, RelativeTimeOptions } from "./dates"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/add-os/utils/format --exclude "**/.claude/worktrees/**"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/utils/format/dates.ts src/add-os/utils/format/index.ts src/add-os/utils/format/__tests__/format.spec.ts
git commit -m "feat(add-os): add formatRelativeTime with a real Arabic plural table"
```

---

### Task 2: Move `toOffsetIso` into the formatter

**Files:**
- Modify: `src/add-os/utils/format/dates.ts`
- Modify: `src/add-os/utils/format/index.ts`
- Modify: `src/add-os/services/reception.ts:39-67`
- Modify: `src/add-os/services/__tests__/reception.spec.ts:197-214`
- Test: `src/add-os/utils/format/__tests__/format.spec.ts`

**Interfaces:**
- Produces: `toOffsetIso(at: Date): string`, now exported from `@/add-os/utils/format`. Task 5's service uses it; `services/reception.ts` keeps using it via import.

It moves because a second consumer arrived — the same trigger `SPACE_TYPES` documents for its own move in `modules/spatial/types/space.ts`. **No re-export shim is left in `reception.ts`:** a name with two homes is a name that drifts. `dates.ts` already has a private `pad`, so the copy in `reception.ts` goes too.

- [ ] **Step 1: Move the tests first**

Cut the entire `describe("toOffsetIso", ...)` block — lines 197-214 of `src/add-os/services/__tests__/reception.spec.ts`, including its leading doc comment — and paste it into `src/add-os/utils/format/__tests__/format.spec.ts`. Remove `toOffsetIso` from that spec's `import { ... } from "../reception"` list. Add `toOffsetIso` to the format spec's `import { ... } from "../dates"` list.

The block moves **verbatim**, comment included:

```ts
/**
 * The collection's own example is `"2026-08-17T11:00:00+03:00"` — local wall
 * clock with an explicit offset, not a UTC `Z` string. Asserted structurally
 * rather than against a literal offset, because the suite runs in whatever
 * zone the machine is set to; a hardcoded `+03:00` would pass in Damascus and
 * fail elsewhere without either result meaning anything.
 */
describe("toOffsetIso", () => {
	it("emits local wall-clock time with an explicit UTC offset", () => {
		const at = new Date(2026, 7, 17, 11, 0, 0)

		expect(toOffsetIso(at)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
		expect(toOffsetIso(at).startsWith("2026-08-17T11:00:00")).toBe(true)
	})

	it("round-trips to the same instant it was given", () => {
		const at = new Date(2026, 0, 3, 7, 5, 9)

		expect(new Date(toOffsetIso(at)).getTime()).toBe(at.getTime())
	})

	it("zero-pads every component", () => {
		expect(toOffsetIso(new Date(2026, 0, 3, 7, 5, 9)).slice(0, 19)).toBe("2026-01-03T07:05:09")
	})
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/add-os/utils/format src/add-os/services/__tests__/reception.spec.ts --exclude "**/.claude/worktrees/**"`
Expected: FAIL — `toOffsetIso` is not exported from `../dates`.

- [ ] **Step 3: Move the implementation**

Append to `src/add-os/utils/format/dates.ts`, carrying its doc comment across intact and adding the new sentence about why it now lives here:

```ts
/**
 * Serializes a `Date` the way the API collection's own examples write it:
 * `2026-08-17T11:00:00+03:00` — local wall clock with an explicit UTC offset,
 * NOT `toISOString()`'s UTC `Z` form.
 *
 * This started life in `services/reception.ts` for `checked_out_at`. It moved
 * here when `services/announcements.ts` became a second consumer, and there it
 * is not a legibility preference but a correctness requirement: ADDCore runs on
 * `'timezone' => 'UTC'`, so a bare wall-clock string with no offset is READ as
 * UTC. An operator in Damascus scheduling a banner for 09:00 would get 12:00.
 *
 * For `checked_out_at` the original reason still holds too: both forms parse to
 * the same instant, but `checked_out_at` is read back by humans in Damascus, and
 * a value that says 08:00Z for an 11:00 check-out invites someone to "correct"
 * it. Matching the documented shape keeps the wire log readable as the wall
 * clock the operator actually saw.
 */
export function toOffsetIso(at: Date): string {
	const offsetMinutes = -at.getTimezoneOffset()
	const sign = offsetMinutes < 0 ? "-" : "+"
	const absolute = Math.abs(offsetMinutes)

	const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
	const time = `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
	const offset = `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`

	return `${date}T${time}${offset}`
}
```

Add to `src/add-os/utils/format/index.ts`:

```ts
export { formatDate, formatDateTime, formatRelativeTime, formatTime, toOffsetIso } from "./dates"
```

In `src/add-os/services/reception.ts`: delete the local `pad` function, delete the `toOffsetIso` function and its doc comment, and add the import:

```ts
import { toOffsetIso } from "@/add-os/utils/format"
```

Then update the module's own header comment — the sentence about `toOffsetIso` being "exported for its own test" is now false. Replace that paragraph with:

```
 * `toOffsetIso` used to live here and is now `utils/format/dates.ts`'s, because
 * `services/announcements.ts` became a second consumer and the wire format is
 * one decision, not one per service.
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/add-os/utils/format src/add-os/services/__tests__/reception.spec.ts --exclude "**/.claude/worktrees/**"`
Expected: PASS. Then `pnpm type-check` — expect clean; a dangling `toOffsetIso` import anywhere shows up here.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/utils/format/dates.ts src/add-os/utils/format/index.ts src/add-os/utils/format/__tests__/format.spec.ts src/add-os/services/reception.ts src/add-os/services/__tests__/reception.spec.ts
git commit -m "refactor(add-os): move toOffsetIso to the formatter, where its second consumer can reach it"
```

---

### Task 3: `useNow`

**Files:**
- Create: `src/add-os/composables/useNow.ts`
- Test: `src/add-os/composables/__tests__/useNow.spec.ts`

**Interfaces:**
- Produces: `useNow(intervalMs: number): Ref<number>`. Task 10's page calls `useNow(30_000)`.

Without this, a queue row renders "just now" at fetch time and stays frozen there while the member actually waits twenty minutes — inverting the exact signal the column exists to give. The interval is owned here, not by the page, so unmount cleanup cannot be forgotten by the next screen that wants it.

- [ ] **Step 1: Write the failing test**

Create `src/add-os/composables/__tests__/useNow.spec.ts`:

```ts
import { effectScope } from "vue"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useNow } from "../useNow"

describe("useNow", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("starts at the current time", () => {
		const scope = effectScope()
		const now = scope.run(() => useNow(30_000))!

		expect(now.value).toBe(Date.now())
		scope.stop()
	})

	it("advances once per interval", () => {
		const scope = effectScope()
		const now = scope.run(() => useNow(30_000))!
		const started = now.value

		vi.advanceTimersByTime(30_000)
		expect(now.value).toBe(started + 30_000)

		vi.advanceTimersByTime(60_000)
		expect(now.value).toBe(started + 90_000)

		scope.stop()
	})

	it("does not tick before the interval elapses", () => {
		const scope = effectScope()
		const now = scope.run(() => useNow(30_000))!
		const started = now.value

		vi.advanceTimersByTime(29_999)
		expect(now.value).toBe(started)

		scope.stop()
	})

	/**
	 * The reason this is a composable rather than three lines in the page. A
	 * leaked interval keeps a disposed component's reactive graph alive and
	 * fires forever; asserting the ref goes quiet after `scope.stop()` is what
	 * proves the cleanup is wired, not just written.
	 */
	it("stops ticking once its scope is disposed", () => {
		const scope = effectScope()
		const now = scope.run(() => useNow(30_000))!
		const started = now.value

		scope.stop()
		vi.advanceTimersByTime(300_000)

		expect(now.value).toBe(started)
	})
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/add-os/composables/__tests__/useNow.spec.ts --exclude "**/.claude/worktrees/**"`
Expected: FAIL — cannot resolve `../useNow`.

- [ ] **Step 3: Implement**

Create `src/add-os/composables/useNow.ts`:

```ts
import type { Ref } from "vue"
import { onScopeDispose, ref } from "vue"

/**
 * A clock as a ref: `now.value` is the current epoch-millis, refreshed every
 * `intervalMs`.
 *
 * Exists so a rendered relative time actually ages. A cell that formats
 * `requested_at` against a value captured at fetch time will read "just now"
 * for as long as the page stays open, which is precisely backwards for a queue
 * whose whole purpose is showing how long someone has been waiting. Passing
 * this ref into the formatter's `now` option makes the row re-render on each
 * tick.
 *
 * `onScopeDispose` rather than `onUnmounted`: this is then safe to call from
 * any effect scope, not only from a component's setup, and a leaked interval
 * that keeps a disposed reactive graph alive is the failure mode being
 * prevented.
 */
export function useNow(intervalMs: number): Ref<number> {
	const now = ref(Date.now())
	const timer = setInterval(() => {
		now.value = Date.now()
	}, intervalMs)

	onScopeDispose(() => clearInterval(timer))

	return now
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/add-os/composables/__tests__/useNow.spec.ts --exclude "**/.claude/worktrees/**"`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/add-os/composables/useNow.ts src/add-os/composables/__tests__/useNow.spec.ts
git commit -m "feat(add-os): add useNow so a rendered relative time actually ages"
```

---

### Task 4: `datetime` field type

**Files:**
- Modify: `src/add-os/components/resource/field-types.ts:4`
- Modify: `src/add-os/components/resource/ResourceFormDrawer.vue:66-73`
- Test: `src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts`

**Interfaces:**
- Produces: `FieldType` now includes `"datetime"`. A `datetime` field's model value is `number | null` — **epoch millis, not a string**. Tasks 6 and 7 rely on that.

Additive: no existing field descriptor changes, and `date`/`time` keep their string round-trip and their `toPickerDateValue`/`toPickerTimeValue` shape guards untouched.

- [ ] **Step 1: Write the failing test**

This file already has a `mountDrawer<T>(fields, model, onSubmit?)` helper at line 99 — **positional arguments, `fields` first**, with `show: true` already passed as a prop and `attachTo: document.body` already set. The model is a plain object, not a ref: the component mutates it in place, so assertions read the same object back.

First add a label to the spec's own local i18n `en.x` block (line 28), so these fields render a real label rather than a raw key path:

```ts
			x: { region: "Region", city: "City", label: "Label", name: "Name", price: "Price", branchId: "Branch", active: "Active", startsAt: "Starts at", day: "Day" },
```

Then add a model interface alongside the existing ones (near `DateModel`, line 75):

```ts
interface DateTimeModel extends Record<string, unknown> {
	starts_at: number | null
}

interface MixedDateModel extends Record<string, unknown> {
	starts_at: number | null
	date: string | null
}
```

Then append the tests:

```ts
describe("datetime field", () => {
	/**
	 * `datetime` binds the picker's NATIVE value — an epoch-millis number —
	 * rather than the `formatted-value` string round-trip `date` and `time` use.
	 * A `value-format` string cannot carry a UTC offset, and ADDCore runs on
	 * UTC, so a wall-clock string would be read three hours off in Damascus.
	 * Keeping the model numeric leaves offset handling to the one service that
	 * owns the wire format. See the spec, §5.
	 */
	it("renders a datetime picker and round-trips a timestamp unchanged", async () => {
		const at = new Date(2026, 7, 25, 9, 30, 0).getTime()
		const model: DateTimeModel = { starts_at: at }
		const fields: FieldDescriptor<DateTimeModel>[] = [{ key: "starts_at", labelKey: "x.startsAt", type: "datetime" }]
		const wrapper = mountDrawer(fields, model)
		await flushPromises()

		expect(wrapper.find(".n-date-picker").exists()).toBe(true)
		expect(model.starts_at).toBe(at)
		wrapper.unmount()
	})

	it("accepts null as the empty value without crashing the picker", async () => {
		const model: DateTimeModel = { starts_at: null }
		const fields: FieldDescriptor<DateTimeModel>[] = [{ key: "starts_at", labelKey: "x.startsAt", type: "datetime" }]
		const wrapper = mountDrawer(fields, model)
		await flushPromises()

		expect(wrapper.find(".n-date-picker").exists()).toBe(true)
		expect(model.starts_at).toBeNull()
		wrapper.unmount()
	})

	/**
	 * The `date` type's shape guards (`toPickerDateValue`) exist because
	 * NDatePicker parses `formatted-value` through date-fns and throws
	 * synchronously on an unparseable string. A number never reaches that code
	 * path, so `datetime` must not be routed through them — this asserts the two
	 * types stay independent and neither breaks the other.
	 */
	it("leaves the string-based date field working alongside it", async () => {
		const model: MixedDateModel = { starts_at: null, date: "2026-08-25" }
		const fields: FieldDescriptor<MixedDateModel>[] = [
			{ key: "starts_at", labelKey: "x.startsAt", type: "datetime" },
			{ key: "date", labelKey: "x.day", type: "date" }
		]
		const wrapper = mountDrawer(fields, model)
		await flushPromises()

		expect(wrapper.findAll(".n-date-picker").length).toBe(2)
		expect(model.date).toBe("2026-08-25")
		wrapper.unmount()
	})
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/add-os/components/resource --exclude "**/.claude/worktrees/**"`
Expected: FAIL — `"datetime"` is not assignable to `FieldType`, and no picker renders.

- [ ] **Step 3: Implement**

In `src/add-os/components/resource/field-types.ts`, line 4:

```ts
export type FieldType = "text" | "bilingual-text" | "number" | "select" | "switch" | "time" | "date" | "datetime"
```

In `src/add-os/components/resource/ResourceFormDrawer.vue`, immediately after the existing `n-date-picker` block for `field.type === 'date'` (which ends at line 73) and before the closing `</n-form-item>`:

```html
					<!--
						Binds the picker's native value (epoch millis), NOT the
						`formatted-value` string round-trip `date` and `time` use above.
						`value-format` cannot express a UTC offset, and ADDCore runs on UTC,
						so a wall-clock string would be stored three hours off in Damascus.
						Keeping the model numeric leaves offset handling to the service that
						owns the wire format — see docs/superpowers/specs/2026-08-25-kiosk-module-design.md §5.
						This is also why `toPickerDateValue` is not involved: a number cannot
						produce the Invalid Date crash that guard exists to prevent.
					-->
					<n-date-picker
						v-else-if="field.type === 'datetime'"
						v-model:value="(model as Record<string, unknown>)[field.key] as number | null"
						type="datetime"
						class="w-full"
						clearable
					/>
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/add-os/components/resource --exclude "**/.claude/worktrees/**"`
Expected: PASS, with every pre-existing test in that file still green.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/components/resource/field-types.ts src/add-os/components/resource/ResourceFormDrawer.vue src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts
git commit -m "feat(add-os): add a datetime field type bound to the picker's native timestamp"
```

---

# BATCH 3 — Announcements

### Task 5: Announcement types and service

**Files:**
- Create: `src/add-os/modules/kiosk/types/announcement.ts`
- Create: `src/add-os/services/announcements.ts`
- Test: `src/add-os/services/__tests__/announcements.spec.ts`

**Interfaces:**
- Consumes: `toOffsetIso` (Task 2); `createResourceApi` and `MessageResponse` from `services/resource-factory.ts`.
- Produces: `Announcement`, `AnnouncementPayload`, `AnnouncementWirePayload`, `toWirePayload(payload: AnnouncementPayload): AnnouncementWirePayload`, `listAnnouncements(): Promise<Announcement[]>`, `createAnnouncement(payload: AnnouncementPayload): Promise<Announcement>`, `updateAnnouncement(id: number, payload: AnnouncementPayload): Promise<MessageResponse>`, `removeAnnouncement(id: number): Promise<MessageResponse>`.

Contract, read from ADDCore on 2026-08-25 and matching the API snapshot pinned that date (`sha256 86d330d9…`): `GET/POST/PUT/DELETE /api/v1/admin/announcements`. **`list()` returning `T[]` is correct** — `AdminResourceController::index()` only paginates when the request fills `per_page`, and this caller never does. **Update is `PUT`**, which is what `createResourceApi` already uses.

- [ ] **Step 1: Write the failing tests**

Create `src/add-os/services/__tests__/announcements.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createAnnouncement, listAnnouncements, removeAnnouncement, toWirePayload, updateAnnouncement } from "../announcements"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const BASE = "http://api.test/api/v1/admin/announcements"

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

const row = {
	id: 1,
	type: "offer",
	image_url: "http://api.test/banners/offer.png",
	link_url: null,
	sort_order: 0,
	starts_at: null,
	ends_at: null,
	is_active: true,
	created_at: "2026-08-25T08:00:00.000000Z"
}

function formPayload(overrides: Partial<Parameters<typeof toWirePayload>[0]> = {}) {
	return {
		type: "offer",
		image_url: "http://api.test/banners/offer.png",
		link_url: "",
		sort_order: 0,
		starts_at: null,
		ends_at: null,
		is_active: true,
		...overrides
	}
}

describe("announcements service", () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it("lists from the admin endpoint and returns the rows, not a paginator", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ data: [row] }))

		await expect(listAnnouncements()).resolves.toEqual([row])
		expect(vi.mocked(globalThis.fetch).mock.calls[0][0]).toBe(BASE)
	})

	it("creates with POST and returns the resource directly", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ data: row }))

		await expect(createAnnouncement(formPayload())).resolves.toEqual(row)

		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
		expect(url).toBe(BASE)
		expect((init as RequestInit).method).toBe("POST")
	})

	it("updates with PUT and returns the message body", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "Announcement updated." }))

		await expect(updateAnnouncement(1, formPayload())).resolves.toEqual({ message: "Announcement updated." })

		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
		expect(url).toBe(`${BASE}/1`)
		expect((init as RequestInit).method).toBe("PUT")
	})

	it("deletes with DELETE", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 204 }))

		await removeAnnouncement(1)

		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
		expect(url).toBe(`${BASE}/1`)
		expect((init as RequestInit).method).toBe("DELETE")
	})

	describe("toWirePayload", () => {
		/**
		 * The reason this function exists at all. ADDCore runs on
		 * `'timezone' => 'UTC'`, so a bare `2026-08-26 09:00:00` is READ as 09:00
		 * UTC — noon in Damascus. Asserted structurally rather than against a
		 * literal `+03:00`, because the suite runs in whatever zone the machine is
		 * set to and a hardcoded offset would pass here and nowhere else.
		 */
		it("serializes timestamps as local wall clock with an explicit offset", () => {
			const startsAt = new Date(2026, 7, 26, 9, 0, 0).getTime()
			const wire = toWirePayload(formPayload({ starts_at: startsAt }))

			expect(wire.starts_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
			expect(wire.starts_at!.startsWith("2026-08-26T09:00:00")).toBe(true)
		})

		it("never sends a bare wall-clock string with no offset", () => {
			const wire = toWirePayload(formPayload({ starts_at: new Date(2026, 7, 26, 9, 0, 0).getTime() }))

			expect(wire.starts_at).not.toMatch(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/)
		})

		it("round-trips a timestamp back to the same instant", () => {
			const endsAt = new Date(2026, 7, 26, 17, 45, 0).getTime()
			const wire = toWirePayload(formPayload({ ends_at: endsAt }))

			expect(new Date(wire.ends_at!).getTime()).toBe(endsAt)
		})

		it("passes an unset timestamp through as null, not as an epoch date", () => {
			const wire = toWirePayload(formPayload({ starts_at: null, ends_at: null }))

			expect(wire.starts_at).toBeNull()
			expect(wire.ends_at).toBeNull()
		})

		/**
		 * An untouched text input holds "", and Laravel's `nullable|url` rejects
		 * an empty string outright — it is neither absent nor a URL. Mapping it to
		 * null is what makes "no link" expressible.
		 */
		it("maps an empty optional link to null rather than an empty string", () => {
			expect(toWirePayload(formPayload({ link_url: "" })).link_url).toBeNull()
			expect(toWirePayload(formPayload({ link_url: "   " })).link_url).toBeNull()
			expect(toWirePayload(formPayload({ link_url: "http://api.test/x" })).link_url).toBe("http://api.test/x")
		})

		it("sends every field the update endpoint requires, not just the changed ones", () => {
			expect(Object.keys(toWirePayload(formPayload())).sort()).toEqual(
				["ends_at", "image_url", "is_active", "link_url", "sort_order", "starts_at", "type"]
			)
		})
	})
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/announcements.spec.ts --exclude "**/.claude/worktrees/**"`
Expected: FAIL — cannot resolve `../announcements`.

- [ ] **Step 3: Implement the types**

Create `src/add-os/modules/kiosk/types/announcement.ts`:

```ts
// src/add-os/modules/kiosk/types/announcement.ts

/**
 * Banner content for the reception kiosk display.
 *
 * Shape from `AnnouncementResource` and `StoreAnnouncementRequest` in ADDCore,
 * matching `Admin (Dashboard) → Website Management → Announcements` in the API
 * snapshot pinned 2026-08-25 (`sha256 86d330d9…`).
 *
 * `type` is a plain open string, NOT an enum. The backend model says so
 * explicitly — "a new announcement kind is a row, never a migration or an enum
 * change" — and `news`/`event`/`offer` are the three values seeded today, not
 * the permitted set. Do not narrow this to a union, and do not render it as a
 * fixed select.
 *
 * There is no translatable field here. Unlike `Plan.name`, `type` is one
 * string, not an `{ar, en}` object, so nothing on this resource goes through
 * the bilingual-label path.
 */
export interface Announcement {
	id: number
	type: string
	image_url: string
	link_url: string | null
	/** The list is ordered by this column, not the `order` column other admin resources use. */
	sort_order: number
	/** UTC ISO from Laravel's `datetime` cast, e.g. "2026-08-26T06:00:00.000000Z". */
	starts_at: string | null
	ends_at: string | null
	is_active: boolean
	created_at: string
}

/**
 * The FORM's shape — deliberately not the wire's.
 *
 * `starts_at`/`ends_at` are epoch millis here because that is what
 * `n-date-picker` natively speaks and what the `datetime` field type binds.
 * `link_url` is a plain string because an untouched text input holds `""`, not
 * `null`. `services/announcements.ts` owns the single conversion to
 * `AnnouncementWirePayload`; nothing else should build one.
 *
 * Extends `Record<string, unknown>` explicitly so it satisfies
 * `ResourceFormDrawer`'s `TModel extends Record<string, unknown>` constraint —
 * a plain interface has no implicit index signature (same reasoning as
 * `SpacePayload` in modules/spatial/types/space.ts).
 */
export interface AnnouncementPayload extends Record<string, unknown> {
	type: string
	image_url: string
	link_url: string
	sort_order: number | null
	starts_at: number | null
	ends_at: number | null
	is_active: boolean
}

/** What actually goes on the wire. Timestamps carry an explicit UTC offset. */
export interface AnnouncementWirePayload {
	type: string
	image_url: string
	link_url: string | null
	sort_order: number | null
	starts_at: string | null
	ends_at: string | null
	is_active: boolean
}
```

- [ ] **Step 4: Implement the service**

Create `src/add-os/services/announcements.ts`:

```ts
import type { Announcement, AnnouncementPayload, AnnouncementWirePayload } from "@/add-os/modules/kiosk/types/announcement"
import type { MessageResponse } from "./resource-factory"
import { toOffsetIso } from "@/add-os/utils/format"
import { createResourceApi } from "./resource-factory"

/**
 * Kiosk banner content — a standard admin resource controller.
 *
 * `list()` returns `T[]` rather than a paginator, and that is correct rather
 * than a truncation: `AdminResourceController::index()` paginates ONLY when the
 * request fills `per_page`, and this caller never does. `warnIfTruncated` is
 * therefore never triggered, because the response carries no `meta` at all.
 *
 * The list arrives ordered by `sort_order` — `AnnouncementController` overrides
 * `hasOrderColumn()` to `false` (switching off the base class's `order` sort)
 * and applies `orderBy('sort_order')` instead. There is no reorder endpoint for
 * this resource, so `sort_order` moves only through the edit form.
 *
 * Endpoints verified against the API snapshot pinned 2026-08-25
 * (`docs/api/ADD-OS.postman_collection.json`, `sha256 86d330d9…`) →
 * Admin (Dashboard) → Website Management → Announcements, and cross-read
 * against the ADDCore controller and Form Requests.
 */
const api = createResourceApi<Announcement, AnnouncementWirePayload, AnnouncementWirePayload>("/api/v1/admin/announcements")

/**
 * The one place a form value becomes a wire value.
 *
 * Exported for its own test — the offset branch is the part that goes wrong,
 * and asserting it through a fetch body would be testing it by accident.
 *
 * Two conversions, each guarding a real failure:
 *
 *  - A timestamp becomes local wall clock WITH an explicit UTC offset. ADDCore
 *    runs on `'timezone' => 'UTC'`, so a bare `2026-08-26 09:00:00` is read as
 *    09:00 UTC — noon in Damascus. This is a correctness fix, not a formatting
 *    preference.
 *  - An empty optional link becomes `null`. Laravel's `nullable|url` rejects
 *    `""` outright: it is neither absent nor a URL, so "no link" would be
 *    unexpressible from a text input that was never touched.
 */
export function toWirePayload(payload: AnnouncementPayload): AnnouncementWirePayload {
	const link = payload.link_url.trim()

	return {
		type: payload.type,
		image_url: payload.image_url,
		link_url: link === "" ? null : link,
		sort_order: payload.sort_order,
		starts_at: payload.starts_at === null ? null : toOffsetIso(new Date(payload.starts_at)),
		ends_at: payload.ends_at === null ? null : toOffsetIso(new Date(payload.ends_at)),
		is_active: payload.is_active
	}
}

export const listAnnouncements = (): Promise<Announcement[]> => api.list()

export const createAnnouncement = (payload: AnnouncementPayload): Promise<Announcement> => api.create(toWirePayload(payload))

/** Returns `{message}`, never the updated resource — refetch for the new state. */
export const updateAnnouncement = (id: number, payload: AnnouncementPayload): Promise<MessageResponse> =>
	api.update(id, toWirePayload(payload))

export const removeAnnouncement = api.remove
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/announcements.spec.ts --exclude "**/.claude/worktrees/**"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/modules/kiosk/types/announcement.ts src/add-os/services/announcements.ts src/add-os/services/__tests__/announcements.spec.ts
git commit -m "feat(add-os): add the announcements service, with an offset-aware wire payload"
```

---

### Task 6: Announcements config — columns, fields, validation

**Files:**
- Create: `src/add-os/modules/kiosk/config/announcements.config.ts`

**Interfaces:**
- Consumes: `Announcement`, `AnnouncementPayload` (Task 5); `FieldDescriptor` from `components/resource/field-types`; `formatDateTime`, `formatNumber` from `utils/format`.
- Produces: `buildAnnouncementColumns(t: ComposerTranslation): DataTableColumns<Announcement>`, `buildAnnouncementFields(t: ComposerTranslation, form: Ref<AnnouncementPayload>): FieldDescriptor<AnnouncementPayload>[]`, `emptyAnnouncementPayload(): AnnouncementPayload`.

No test of its own — Task 7's page spec exercises every rule through the drawer, which is where they actually run.

- [ ] **Step 1: Write the config**

Create `src/add-os/modules/kiosk/config/announcements.config.ts`:

```ts
// src/add-os/modules/kiosk/config/announcements.config.ts
import type { DataTableColumns, FormItemRule } from "naive-ui"
import type { Ref } from "vue"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { Announcement, AnnouncementPayload } from "@/add-os/modules/kiosk/types/announcement"
import { NTag } from "naive-ui"
import { h } from "vue"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"

/** Mirrors StoreAnnouncementRequest exactly. Diverging from these is a guaranteed 422. */
const MAX_TYPE_LENGTH = 50
const MAX_URL_LENGTH = 2048

/**
 * Parses as an absolute URL, and nothing stricter.
 *
 * Deliberately NOT a scheme allowlist. Laravel validates with `url`, which is
 * `FILTER_VALIDATE_URL` and accepts more schemes than http/https; a stricter
 * client rule would reject values the server would have taken, which is the
 * worse failure of the two. The server stays authoritative — a 422 lands on the
 * field through ResourceFormDrawer's own handler. This check exists only to
 * give fast feedback on an obviously malformed entry.
 */
function isAbsoluteUrl(value: string): boolean {
	try {
		return Boolean(new URL(value))
	} catch {
		return false
	}
}

function renderWindow(t: ComposerTranslation, row: Announcement): string {
	if (row.starts_at === null && row.ends_at === null) return t("announcements.windowAlways")

	const from = row.starts_at === null ? t("announcements.windowOpenStart") : formatDateTime(row.starts_at)
	const to = row.ends_at === null ? t("announcements.windowOpenEnd") : formatDateTime(row.ends_at)

	return `${from} – ${to}`
}

export function buildAnnouncementColumns(t: ComposerTranslation): DataTableColumns<Announcement> {
	return [
		{
			// Leads the table because it is what the kiosk actually orders by.
			title: t("announcements.columns.sortOrder"),
			key: "sort_order",
			render: row => formatNumber(row.sort_order)
		},
		{ title: t("announcements.columns.type"), key: "type" },
		{ title: t("announcements.columns.imageUrl"), key: "image_url", ellipsis: { tooltip: true } },
		{
			title: t("announcements.columns.window"),
			key: "starts_at",
			render: row => renderWindow(t, row)
		},
		{
			title: t("announcements.columns.isActive"),
			key: "is_active",
			render: row =>
				h(
					NTag,
					{ type: row.is_active ? "success" : "default", size: "small", bordered: false },
					{ default: () => (row.is_active ? t("announcements.isActiveYes") : t("announcements.isActiveNo")) }
				)
		}
	]
}

/**
 * Takes the live form ref, not just `t`, because one rule is cross-field.
 *
 * `FieldDescriptor.rule` is static and a `FormItemRule.validator` receives only
 * `(rule, value)` — it cannot see the rest of the model. Closing over the ref is
 * how `ends_at` reads `starts_at`. This needs no new mechanism: a config builder
 * taking arguments and being called inside a `computed` is the existing pattern
 * (see `buildResourceFields(t, branches, locale)`).
 *
 * Known limit, accepted: n-form fires a field's rules on that field's OWN
 * triggers, so moving `starts_at` past an already-set `ends_at` does not
 * re-validate `ends_at` until submit. `formRef.validate()` runs every rule on
 * submit, so an invalid pair can never be sent — which is what matters. Live
 * cross-field revalidation would mean a watcher per dependent field in the
 * shared drawer, and that is not worth building for one form.
 *
 * Every field here carries an explicit `rule` rather than `required: true`,
 * because each needs a length or format check alongside emptiness.
 * ResourceFormDrawer skips its generic required-rule builder whenever `rule` is
 * present, so `required: true` is set INSIDE each rule object — naive-ui reads
 * it for the label asterisk.
 */
export function buildAnnouncementFields(t: ComposerTranslation, form: Ref<AnnouncementPayload>): FieldDescriptor<AnnouncementPayload>[] {
	const typeRule: FormItemRule = {
		required: true,
		trigger: ["blur", "change", "input"],
		validator: (_rule, value: unknown) => {
			const text = typeof value === "string" ? value.trim() : ""
			if (text === "") return new Error(t("resourceCrud.validation.required", { field: t("announcements.form.type") }))
			if (text.length > MAX_TYPE_LENGTH) return new Error(t("announcements.validation.typeTooLong", { max: MAX_TYPE_LENGTH }))
			return true
		}
	}

	const urlRule = (required: boolean, labelKey: string): FormItemRule => ({
		required,
		trigger: ["blur", "change", "input"],
		validator: (_rule, value: unknown) => {
			const text = typeof value === "string" ? value.trim() : ""
			if (text === "") {
				return required ? new Error(t("resourceCrud.validation.required", { field: t(labelKey) })) : true
			}
			if (text.length > MAX_URL_LENGTH) return new Error(t("announcements.validation.urlTooLong", { max: MAX_URL_LENGTH }))
			if (!isAbsoluteUrl(text)) return new Error(t("announcements.validation.urlInvalid"))
			return true
		}
	})

	/** Mirrors the backend's `after_or_equal:starts_at`. Equal ends are allowed. */
	const endsAtRule: FormItemRule = {
		trigger: ["blur", "change"],
		validator: (_rule, value: unknown) => {
			const startsAt = form.value.starts_at
			if (typeof value !== "number" || startsAt === null) return true
			return value >= startsAt ? true : new Error(t("announcements.validation.endsBeforeStarts"))
		}
	}

	return [
		/**
		 * A plain text input, NOT a select. `type` is an open string server-side —
		 * the ADDCore model says so in as many words — and news/event/offer are
		 * the three values seeded today, not the permitted set. A three-option
		 * dropdown would turn "add a new kind of banner" from typing a word into
		 * a frontend change.
		 */
		{ key: "type", labelKey: "announcements.form.type", type: "text", rule: typeRule },
		{ key: "image_url", labelKey: "announcements.form.imageUrl", type: "text", rule: urlRule(true, "announcements.form.imageUrl") },
		{ key: "link_url", labelKey: "announcements.form.linkUrl", type: "text", rule: urlRule(false, "announcements.form.linkUrl") },
		{ key: "sort_order", labelKey: "announcements.form.sortOrder", type: "number" },
		{ key: "starts_at", labelKey: "announcements.form.startsAt", type: "datetime" },
		{ key: "ends_at", labelKey: "announcements.form.endsAt", type: "datetime", rule: endsAtRule },
		{ key: "is_active", labelKey: "announcements.form.isActive", type: "switch" }
	]
}

/**
 * `sort_order: 0` and `is_active: true` match what
 * `AnnouncementController::store` merges under the validated input, so a
 * created row looks the same whether the operator touched those fields or not.
 */
export function emptyAnnouncementPayload(): AnnouncementPayload {
	return { type: "", image_url: "", link_url: "", sort_order: 0, starts_at: null, ends_at: null, is_active: true }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/add-os/modules/kiosk/config/announcements.config.ts
git commit -m "feat(add-os): add announcements columns, form fields and validation rules"
```

---

### Task 7: `AnnouncementsPage.vue`

**Files:**
- Create: `src/add-os/modules/kiosk/views/AnnouncementsPage.vue`
- Test: `src/add-os/modules/kiosk/views/__tests__/AnnouncementsPage.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 5 and 6.
- Produces: the default-exported SFC that `routes.ts` lazy-imports in Task 11 under the route name `cms.announcements`. Exposes `{ openCreate, openEdit, submit, form, mode, drawerVisible, data }` for tests.

- [ ] **Step 1: Write the failing test**

Create `src/add-os/modules/kiosk/views/__tests__/AnnouncementsPage.spec.ts`:

```ts
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import AnnouncementsPage from "../AnnouncementsPage.vue"

const { listAnnouncementsMock, createAnnouncementMock, updateAnnouncementMock, removeAnnouncementMock } = vi.hoisted(() => ({
	listAnnouncementsMock: vi.fn(),
	createAnnouncementMock: vi.fn(),
	updateAnnouncementMock: vi.fn(),
	removeAnnouncementMock: vi.fn()
}))

vi.mock("@/add-os/services/announcements", () => ({
	listAnnouncements: listAnnouncementsMock,
	createAnnouncement: createAnnouncementMock,
	updateAnnouncement: updateAnnouncementMock,
	removeAnnouncement: removeAnnouncementMock
}))

// Same pitfall ApprovalQueuePage.spec.ts documents: useResourceMutations calls
// useMessage() directly, which needs a provider this mount has no reason to add.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }), useDialog: () => ({ warning: vi.fn() }) }
})

const row = {
	id: 1,
	type: "offer",
	image_url: "http://api.test/banners/offer.png",
	link_url: null,
	sort_order: 2,
	starts_at: "2026-08-26T06:00:00.000000Z",
	ends_at: null,
	is_active: true,
	created_at: "2026-08-25T08:00:00.000000Z"
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { announcements: "Announcements" } },
			announcements: {
				description: "Banner content for the reception kiosk display.",
				loadError: "Couldn't load announcements.",
				columns: { sortOrder: "Order", type: "Type", imageUrl: "Image", window: "Shown", isActive: "Active" },
				isActiveYes: "Active",
				isActiveNo: "Inactive",
				windowAlways: "Always",
				windowOpenStart: "From launch",
				windowOpenEnd: "No end",
				create: { button: "New announcement", title: "New announcement", success: "Announcement created." },
				edit: { title: "Edit announcement", success: "Announcement updated." },
				delete: { success: "Announcement deleted." },
				form: {
					type: "Type",
					imageUrl: "Image URL",
					linkUrl: "Link URL (optional)",
					sortOrder: "Display order",
					startsAt: "Starts at (optional)",
					endsAt: "Ends at (optional)",
					isActive: "Active"
				},
				validation: {
					typeTooLong: "Type must be {max} characters or fewer.",
					urlInvalid: "Enter a complete web address, including the scheme.",
					urlTooLong: "URL must be {max} characters or fewer.",
					endsBeforeStarts: "The end must be at or after the start."
				}
			},
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel", arabicPlaceholder: "Arabic", englishPlaceholder: "English", bilingualLabel: "{field} ({language})" },
				table: {
					actionsColumn: "Actions",
					empty: "No records found.",
					editAction: "Edit",
					deleteAction: "Delete",
					deleteConfirmTitle: "Delete this record?",
					deleteConfirmOk: "Delete",
					deleteConfirmCancel: "Cancel"
				},
				validation: { required: "{field} is required." },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountPage() {
	return mount(AnnouncementsPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

/** Fills the form with a valid record, then applies the overrides under test. */
async function openFormWith(wrapper: ReturnType<typeof mountPage>, overrides: Record<string, unknown>) {
	wrapper.vm.openCreate()
	Object.assign(wrapper.vm.form, {
		type: "offer",
		image_url: "http://api.test/banners/offer.png",
		link_url: "",
		sort_order: 0,
		starts_at: null,
		ends_at: null,
		is_active: true,
		...overrides
	})
	await flushPromises()
	return wrapper.findComponent(ResourceFormDrawer)
}

describe("announcementsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listAnnouncementsMock.mockResolvedValue([row])
		createAnnouncementMock.mockResolvedValue(row)
		updateAnnouncementMock.mockResolvedValue({ message: "Announcement updated." })
		removeAnnouncementMock.mockResolvedValue({ message: "Announcement deleted." })
	})

	it("lists on mount and shows what comes back", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listAnnouncementsMock).toHaveBeenCalled()
		expect(wrapper.vm.data).toEqual([row])
		wrapper.unmount()
	})

	it("creates, then refetches rather than splicing the new row in locally", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const drawer = await openFormWith(wrapper, { type: "news", sort_order: 3 })
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(createAnnouncementMock).toHaveBeenCalledTimes(1)
		expect(createAnnouncementMock.mock.calls[0][0]).toMatchObject({ type: "news", sort_order: 3 })
		expect(listAnnouncementsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	/**
	 * openEdit has to turn the wire's UTC ISO back into the epoch millis the
	 * datetime picker binds. Asserting the instant rather than a formatted string
	 * keeps this independent of the machine's timezone.
	 */
	it("edits an existing row, converting its ISO timestamps back to picker values", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.openEdit(row)
		expect(wrapper.vm.form.starts_at).toBe(new Date(row.starts_at).getTime())
		expect(wrapper.vm.form.ends_at).toBeNull()
		expect(wrapper.vm.form.link_url).toBe("")

		wrapper.vm.form.type = "event"
		await flushPromises()
		const drawer = wrapper.findComponent(ResourceFormDrawer)
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(updateAnnouncementMock).toHaveBeenCalledTimes(1)
		expect(updateAnnouncementMock.mock.calls[0][0]).toBe(1)
		expect(updateAnnouncementMock.mock.calls[0][1]).toMatchObject({ type: "event" })
		wrapper.unmount()
	})

	it("deletes and refetches", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.remove(row)
		await flushPromises()

		expect(removeAnnouncementMock).toHaveBeenCalledWith(1)
		expect(listAnnouncementsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	/**
	 * The backend's own rule is `after_or_equal:starts_at`. Mirroring it here is
	 * not belt-and-braces: without it the operator fills a whole form, submits,
	 * and gets the answer from the server.
	 */
	it("blocks an ends_at earlier than starts_at without calling the API", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const drawer = await openFormWith(wrapper, {
			starts_at: new Date(2026, 7, 26, 12, 0).getTime(),
			ends_at: new Date(2026, 7, 26, 9, 0).getTime()
		})
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(createAnnouncementMock).not.toHaveBeenCalled()
		expect(wrapper.vm.drawerVisible).toBe(true)
		wrapper.unmount()
	})

	it("allows an ends_at exactly equal to starts_at", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const at = new Date(2026, 7, 26, 12, 0).getTime()
		const drawer = await openFormWith(wrapper, { starts_at: at, ends_at: at })
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(createAnnouncementMock).toHaveBeenCalledTimes(1)
		wrapper.unmount()
	})

	it("allows an ends_at with no starts_at set", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const drawer = await openFormWith(wrapper, { starts_at: null, ends_at: new Date(2026, 7, 26, 9, 0).getTime() })
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(createAnnouncementMock).toHaveBeenCalledTimes(1)
		wrapper.unmount()
	})

	/**
	 * `type` is an open string server-side. This asserts a value outside
	 * news/event/offer submits cleanly — which is exactly what would break if
	 * someone later "tidied" the text input into a three-option select.
	 */
	it("accepts an arbitrary type outside the three seeded values", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const drawer = await openFormWith(wrapper, { type: "ramadan-hours" })
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(createAnnouncementMock).toHaveBeenCalledTimes(1)
		expect(createAnnouncementMock.mock.calls[0][0]).toMatchObject({ type: "ramadan-hours" })
		wrapper.unmount()
	})

	it("rejects a type longer than the backend's 50-character limit", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const drawer = await openFormWith(wrapper, { type: "x".repeat(51) })
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(createAnnouncementMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("requires image_url and rejects one that is not a URL", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const blank = await openFormWith(wrapper, { image_url: "" })
		await blank.vm.handleSubmit()
		await flushPromises()
		expect(createAnnouncementMock).not.toHaveBeenCalled()

		const malformed = await openFormWith(wrapper, { image_url: "not a url" })
		await malformed.vm.handleSubmit()
		await flushPromises()
		expect(createAnnouncementMock).not.toHaveBeenCalled()

		wrapper.unmount()
	})

	it("treats link_url as genuinely optional", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const drawer = await openFormWith(wrapper, { link_url: "" })
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(createAnnouncementMock).toHaveBeenCalledTimes(1)
		wrapper.unmount()
	})

	it("shows a load error instead of an empty table when the list fails", async () => {
		const { ApiError } = await import("@/add-os/services/api")
		listAnnouncementsMock.mockRejectedValue(new ApiError(500, ""))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load announcements.")
		wrapper.unmount()
	})
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/add-os/modules/kiosk --exclude "**/.claude/worktrees/**"`
Expected: FAIL — cannot resolve `../AnnouncementsPage.vue`.

- [ ] **Step 3: Implement**

Create `src/add-os/modules/kiosk/views/AnnouncementsPage.vue`:

```vue
<!-- src/add-os/modules/kiosk/views/AnnouncementsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.announcements") }}</h1>
			<p>{{ t("announcements.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('announcements.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("announcements.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="remove" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('announcements.create.title') : t('announcements.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Announcement, AnnouncementPayload } from "@/add-os/modules/kiosk/types/announcement"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import {
	buildAnnouncementColumns,
	buildAnnouncementFields,
	emptyAnnouncementPayload
} from "@/add-os/modules/kiosk/config/announcements.config"
import { createAnnouncement, listAnnouncements, removeAnnouncement, updateAnnouncement } from "@/add-os/services/announcements"
import Icon from "@/components/common/Icon.vue"

/**
 * Banner content for the reception kiosk display.
 *
 * A standard generic-CRUD screen, deliberately identical in shape to
 * `PlansPage` — same list/mutations composables, same table, same drawer.
 *
 * Two things it does NOT have, both on purpose:
 *
 *  - No pager. `AdminResourceController::index()` paginates only when the
 *    request fills `per_page`, which this caller never does, so the response is
 *    the whole list and `ResourceTable`'s own `pageSize: 10` does the display
 *    paging. Adding a server pager here would page a list that is already
 *    complete.
 *  - No stat cards. A "live now" tile would have to re-derive
 *    `is_active && now ∈ [starts_at, ends_at]` on the client — the same
 *    liveness rule the backend owns for the public kiosk read — and a second
 *    implementation of one rule is a second answer to it.
 */

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Announcement>(listAnnouncements)

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<AnnouncementPayload>(emptyAnnouncementPayload())

const columns = computed(() => buildAnnouncementColumns(t))
const fields = computed(() => buildAnnouncementFields(t, form))

const mutations = useResourceMutations(
	{ create: createAnnouncement, update: updateAnnouncement, remove: removeAnnouncement },
	refetch,
	{
		createSuccess: t("announcements.create.success"),
		updateSuccess: t("announcements.edit.success"),
		deleteSuccess: t("announcements.delete.success")
	}
)

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyAnnouncementPayload()
	drawerVisible.value = true
}

/**
 * The wire sends UTC ISO; the `datetime` picker binds epoch millis. An
 * unparseable value degrades to "unset" rather than throwing — the picker would
 * otherwise be handed NaN, and a malformed stored timestamp should not take the
 * whole edit form down.
 */
function toPickerValue(value: string | null): number | null {
	if (value === null) return null
	const parsed = new Date(value).getTime()
	return Number.isNaN(parsed) ? null : parsed
}

function openEdit(row: Announcement) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		type: row.type,
		image_url: row.image_url,
		link_url: row.link_url ?? "",
		sort_order: row.sort_order,
		starts_at: toPickerValue(row.starts_at),
		ends_at: toPickerValue(row.ends_at),
		is_active: row.is_active
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as AnnouncementPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as AnnouncementPayload)
	}
}

async function remove(row: Announcement) {
	await mutations.remove(row.id)
}

defineExpose({ openCreate, openEdit, submit, remove, form, mode, drawerVisible, data })
</script>
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/add-os/modules/kiosk --exclude "**/.claude/worktrees/**"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/kiosk/views/AnnouncementsPage.vue src/add-os/modules/kiosk/views/__tests__/AnnouncementsPage.spec.ts
git commit -m "feat(add-os): add the announcements CRUD screen"
```

---

# BATCH 4 — Arrival Requests

### Task 8: Arrival-request types and reception service calls

**Files:**
- Create: `src/add-os/modules/kiosk/types/arrival-request.ts`
- Modify: `src/add-os/services/reception.ts`
- Test: `src/add-os/services/__tests__/reception.spec.ts`

**Interfaces:**
- Produces: `ArrivalRequest`, `ArrivalRequestUser`, `ArrivalRequestBooking`, `ConfirmArrivalRequestPayload`; and from `services/reception.ts` — `listArrivalRequests(query?: Record<string, unknown>): Promise<Paginated<ArrivalRequest>>`, `confirmArrivalRequest(id: number, spaceId?: number): Promise<MessageResponse>`, `rejectArrivalRequest(id: number): Promise<MessageResponse>`.

These go in `services/reception.ts` rather than a new file because it already owns `const BASE = "/api/v1/admin/reception"` and documents why that prefix lives in one module.

- [ ] **Step 1: Write the failing tests**

Append to `src/add-os/services/__tests__/reception.spec.ts`, adding the three new names to its `import { ... } from "../reception"` list:

```ts
describe("arrival requests", () => {
	const arrivalRow = {
		id: 7,
		status: "pending",
		requested_at: "2026-08-25T09:14:00+03:00",
		matched_booking_id: null,
		user: { id: 12, name: "Sara Haddad", phone: "0999123456" },
		matched_booking: null
	}

	it("lists them paginated, keeping the backend's own meta", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			jsonResponse({ data: [arrivalRow], meta: { current_page: 2, last_page: 4, per_page: 25, total: 87 } })
		)

		const result = await listArrivalRequests({ page: 2 })

		expect(result.data).toEqual([arrivalRow])
		expect(result.meta).toEqual({ current_page: 2, last_page: 4, per_page: 25, total: 87 })
		expect(String(vi.mocked(globalThis.fetch).mock.calls[0][0])).toBe(`${BASE}/arrival-requests?page=2`)
	})

	/**
	 * The distinction this whole screen turns on. A matched request confirms
	 * with NO body — the backend checks the member into the booking it already
	 * found. Sending `{space_id: null}` or an empty object here would be a
	 * different request.
	 */
	it("confirms a matched request with no body at all", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "Arrival confirmed." }))

		await confirmArrivalRequest(7)

		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
		expect(url).toBe(`${BASE}/arrival-requests/7/confirm`)
		expect((init as RequestInit).method).toBe("POST")
		expect((init as RequestInit).body).toBeUndefined()
	})

	it("confirms an unmatched request with the chosen space_id and nothing else", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "Arrival confirmed." }))

		await confirmArrivalRequest(7, 5)

		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
		expect(url).toBe(`${BASE}/arrival-requests/7/confirm`)
		expect(JSON.parse((init as RequestInit).body as string)).toEqual({ space_id: 5 })
	})

	it("rejects with no body", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "Arrival request rejected." }))

		await rejectArrivalRequest(7)

		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
		expect(url).toBe(`${BASE}/arrival-requests/7/reject`)
		expect((init as RequestInit).method).toBe("POST")
		expect((init as RequestInit).body).toBeUndefined()
	})

	it("surfaces a 409 as an ApiError carrying the server's own message", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "This arrival request is no longer pending." }, 409))

		await expect(confirmArrivalRequest(7)).rejects.toMatchObject({
			status: 409,
			data: { message: "This arrival request is no longer pending." }
		})
	})
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/reception.spec.ts --exclude "**/.claude/worktrees/**"`
Expected: FAIL — the three functions are not exported.

- [ ] **Step 3: Implement the types**

Create `src/add-os/modules/kiosk/types/arrival-request.ts`:

```ts
// src/add-os/modules/kiosk/types/arrival-request.ts
import type { SpaceType } from "@/add-os/modules/spatial/types/space"

/**
 * A member signalling they have arrived, waiting on a reception decision.
 *
 * Shape from `ArrivalRequestResource` in ADDCore, matching
 * `Admin (Dashboard) → Reception Operations → Arrival Requests` in the API
 * snapshot pinned 2026-08-25 (`sha256 86d330d9…`).
 *
 * `user` and `matched_booking` are `whenLoaded` on the resource, but
 * `ArrivalRequestController::index` always eager-loads
 * `['user', 'matchedBooking.space']`, so both keys are always present on this
 * endpoint — neither is optional here.
 */
export interface ArrivalRequestUser {
	id: number
	name: string
	phone: string
}

export interface ArrivalRequestBooking {
	id: number
	space_id: number
	space_type: SpaceType
	start_at: string
	end_at: string
}

export interface ArrivalRequest {
	id: number
	/**
	 * `string`, not the literal `"pending"`. The list is filtered to pending
	 * server-side, so every row here is pending in practice — but typing it as a
	 * literal would make a row that has moved on unrepresentable, and the 409
	 * path exists precisely because that happens.
	 */
	status: string
	requested_at: string
	matched_booking_id: number | null
	user: ArrivalRequestUser
	/**
	 * `null` when the member has no booking today. This is the ordinary walk-in
	 * case, NOT an error state — and it is what decides whether confirm needs a
	 * `space_id`.
	 */
	matched_booking: ArrivalRequestBooking | null
}

export interface ConfirmArrivalRequestPayload {
	space_id: number
}
```

- [ ] **Step 4: Implement the service calls**

Add to `src/add-os/services/reception.ts`. Extend the existing type imports with `ArrivalRequest` and `ConfirmArrivalRequestPayload` from `@/add-os/modules/kiosk/types/arrival-request`, then append:

```ts
/**
 * Paginated — 25 per page, `status = pending` only, ordered by `requested_at`
 * ASCENDING, so the longest wait leads. Same paginator shape as
 * `pending-approval`; see `services/pagination.ts` for why that shape is a
 * locked project-wide convention rather than a per-endpoint assumption.
 */
export async function listArrivalRequests(query?: Record<string, unknown>): Promise<Paginated<ArrivalRequest>> {
	const raw = await get<RawPaginatedResponse<ArrivalRequest>>(`${BASE}/arrival-requests`, query)
	return toPaginated(raw)
}

/**
 * Two bodies, one endpoint — the part of this feature that needs care.
 *
 *  - Matched (`matched_booking !== null`): NO body. The backend delegates to
 *    Check In Booking's own logic unchanged and propagates that response
 *    verbatim on failure, so this can also surface check-in errors this screen
 *    does not itself model (already checked in, outside business hours).
 *  - Unmatched: `space_id` is REQUIRED, and omitting it is a 422 carrying
 *    `message`. The backend delegates to Start Walk-in Session, including its
 *    capacity and business-hours guards.
 *
 * One function with an optional argument rather than two exported names: the
 * caller already knows which case it is from `matched_booking`, and a second
 * name would let it pick the wrong one for a row.
 *
 * 409 with `message` when the request has already been confirmed, rejected or
 * expired — routine at a reception desk when two operators work the queue.
 */
export async function confirmArrivalRequest(id: number, spaceId?: number): Promise<MessageResponse> {
	const payload: ConfirmArrivalRequestPayload | undefined = spaceId === undefined ? undefined : { space_id: spaceId }
	return post<MessageResponse>(`${BASE}/arrival-requests/${id}/confirm`, payload)
}

/**
 * No body, and no confirmation dialog on the calling screen either: rejecting
 * an arrival signal is not destructive. Nothing was charged and no booking or
 * session was ever created by the request itself. 409 if it is not pending.
 */
export async function rejectArrivalRequest(id: number): Promise<MessageResponse> {
	return post<MessageResponse>(`${BASE}/arrival-requests/${id}/reject`)
}
```

Also extend the module's header comment — its "approvals and live sessions" summary is now incomplete. Change that first line to:

```
 * Reception desk actions — approvals, live sessions, and the arrival queue.
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/reception.spec.ts --exclude "**/.claude/worktrees/**"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/modules/kiosk/types/arrival-request.ts src/add-os/services/reception.ts src/add-os/services/__tests__/reception.spec.ts
git commit -m "feat(add-os): add arrival-request list, confirm and reject calls"
```

---

### Task 9: Arrival-requests config — columns and the space picker

**Files:**
- Create: `src/add-os/modules/kiosk/config/arrival-requests.config.ts`

**Interfaces:**
- Consumes: `ArrivalRequest` (Task 8); `formatRelativeTime` (Task 1); `spaceTypeLabel` from `@/add-os/modules/booking/config/space-type-label`.
- Produces: `SpacePickerModel`, `buildArrivalRequestColumns(t, now: Ref<number>, onConfirm, onReject): DataTableColumns<ArrivalRequest>`, `buildSpacePickerFields(t, options: SelectOption[]): FieldDescriptor<SpacePickerModel>[]`.

- [ ] **Step 1: Write the config**

Create `src/add-os/modules/kiosk/config/arrival-requests.config.ts`:

```ts
// src/add-os/modules/kiosk/config/arrival-requests.config.ts
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Ref } from "vue"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { ArrivalRequest } from "@/add-os/modules/kiosk/types/arrival-request"
import { NButton, NTag } from "naive-ui"
import { h } from "vue"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { formatDateTime, formatRelativeTime, formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/** The unmatched-confirm picker's model. One field; `null` means nothing chosen. */
export interface SpacePickerModel extends Record<string, unknown> {
	space_id: number | null
}

/**
 * `now` is a ticking ref rather than a captured timestamp, so the waiting
 * column re-renders as time passes. Reading `now.value` inside `render` is what
 * registers the dependency — a plain `number` parameter would freeze every row
 * at mount time, which is precisely backwards for a queue measured in minutes.
 */
export function buildArrivalRequestColumns(
	t: ComposerTranslation,
	now: Ref<number>,
	onConfirm: (row: ArrivalRequest) => void,
	onReject: (row: ArrivalRequest) => void
): DataTableColumns<ArrivalRequest> {
	return [
		{ title: t("arrivalRequests.columns.member"), key: "user.name", render: row => row.user.name },
		{ title: t("arrivalRequests.columns.phone"), key: "user.phone", render: row => row.user.phone },
		{
			title: t("arrivalRequests.columns.waiting"),
			key: "requested_at",
			render: row => formatRelativeTime(row.requested_at, { now: now.value })
		},
		{
			/**
			 * A missing booking is the ordinary walk-in case, not an error and not
			 * a blank. Tagging it explicitly is also what tells the operator, before
			 * they click, that Confirm will ask them for a space.
			 */
			title: t("arrivalRequests.columns.booking"),
			key: "matched_booking",
			render: row =>
				row.matched_booking === null
					? h(NTag, { size: "small", type: "warning", bordered: false }, { default: () => t("arrivalRequests.walkIn") })
					: `${spaceTypeLabel(t, row.matched_booking.space_type)} · ${formatDateTime(row.matched_booking.start_at)} – ${formatTime(row.matched_booking.end_at)}`
		},
		{
			/**
			 * Labelled buttons, not icon-only ones — the same reasoning
			 * `approval-queue.config.ts` records: two opposite actions sit next to
			 * each other on every row, and a pair of unlabelled glyphs is how an
			 * operator working quickly rejects the member they meant to confirm.
			 */
			title: t("arrivalRequests.columns.actions"),
			key: "actions",
			render: row =>
				h("div", { class: "flex gap-2" }, [
					h(
						NButton,
						{ size: "small", type: "primary", "aria-label": t("arrivalRequests.confirm.button"), onClick: () => onConfirm(row) },
						{ icon: () => h(Icon, { name: "carbon:checkmark", size: 16 }), default: () => t("arrivalRequests.confirm.button") }
					),
					h(
						NButton,
						{ size: "small", type: "error", ghost: true, "aria-label": t("arrivalRequests.reject.button"), onClick: () => onReject(row) },
						{ icon: () => h(Icon, { name: "carbon:close", size: 16 }), default: () => t("arrivalRequests.reject.button") }
					)
				])
		}
	]
}

/**
 * One required select, and nothing else.
 *
 * `required: true` here is what makes submit unreachable without a selection —
 * the guarantee comes from ResourceFormDrawer's own validation rather than a
 * hand-rolled disabled state, and `isFieldValueEmpty` catches `null`
 * unconditionally.
 *
 * Static `options`, NOT `optionsFrom`: the drawer only registers an
 * `optionsFrom` watcher for fields that ALSO declare `dependsOn`
 * (`if (keys.length === 0 || !field.optionsFrom) continue`), so a
 * dependency-free dynamic field would silently render an empty dropdown. The
 * page loads spaces once and passes them in — that is the supported path, not a
 * workaround.
 *
 * A flat list rather than the branch → building → zone → space cascade
 * `resources.config.ts` uses: the backend validates `space_id` as
 * `required|integer|exists:spaces,id` with no branch or building constraint, so
 * the cascade would enforce a narrowing the API never asks for, at the cost of
 * four interactions with a member standing at the desk. Decided with the owner
 * on 2026-08-25; see the spec, §8.
 */
export function buildSpacePickerFields(t: ComposerTranslation, options: SelectOption[]): FieldDescriptor<SpacePickerModel>[] {
	return [{ key: "space_id", labelKey: "arrivalRequests.confirm.spaceLabel", type: "select", required: true, options }]
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/add-os/modules/kiosk/config/arrival-requests.config.ts
git commit -m "feat(add-os): add arrival-queue columns and the one-field space picker"
```

---

### Task 10: `ArrivalRequestsPage.vue`

**Files:**
- Create: `src/add-os/modules/kiosk/views/ArrivalRequestsPage.vue`
- Test: `src/add-os/modules/kiosk/views/__tests__/ArrivalRequestsPage.spec.ts`

**Interfaces:**
- Consumes: Tasks 1, 3, 8, 9; `useReceptionAction` from `@/add-os/modules/booking/composables/useReceptionAction`; `listSpaces` from `@/add-os/services/spaces`.
- Produces: the SFC `routes.ts` lazy-imports in Task 11 under `bookings.arrivalRequests`. Exposes `{ confirm, reject, submitSpacePicker, spacePickerVisible, spaceForm, page, rows, meta }`.

- [ ] **Step 1: Write the failing test**

Create `src/add-os/modules/kiosk/views/__tests__/ArrivalRequestsPage.spec.ts`:

```ts
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import { ApiError } from "@/add-os/services/api"
import ArrivalRequestsPage from "../ArrivalRequestsPage.vue"

const { listArrivalRequestsMock, confirmArrivalRequestMock, rejectArrivalRequestMock, listSpacesMock } = vi.hoisted(() => ({
	listArrivalRequestsMock: vi.fn(),
	confirmArrivalRequestMock: vi.fn(),
	rejectArrivalRequestMock: vi.fn(),
	listSpacesMock: vi.fn()
}))

vi.mock("@/add-os/services/reception", () => ({
	listArrivalRequests: listArrivalRequestsMock,
	confirmArrivalRequest: confirmArrivalRequestMock,
	rejectArrivalRequest: rejectArrivalRequestMock
}))

vi.mock("@/add-os/services/spaces", () => ({ listSpaces: listSpacesMock }))

const messageErrorMock = vi.fn()
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: messageErrorMock }) }
})

const matchedRow = {
	id: 7,
	status: "pending",
	requested_at: "2026-08-25T09:14:00+03:00",
	matched_booking_id: 42,
	user: { id: 12, name: "Sara Haddad", phone: "0999123456" },
	matched_booking: { id: 42, space_id: 5, space_type: "room" as const, start_at: "2026-08-25T09:00:00+03:00", end_at: "2026-08-25T11:00:00+03:00" }
}

const walkInRow = {
	id: 8,
	status: "pending",
	requested_at: "2026-08-25T09:20:00+03:00",
	matched_booking_id: null,
	user: { id: 13, name: "Omar Nasser", phone: "0988765432" },
	matched_booking: null
}

const spaces = [
	{ id: 5, building_id: 1, zone_id: null, space_type: "room", allocation_model: null, is_lockable: true, capacity: 8, hourly_rate: null, pricing_currency: null, status: "active", status_reason: null },
	{ id: 9, building_id: 1, zone_id: null, space_type: "co_space", allocation_model: null, is_lockable: false, capacity: 40, hourly_rate: null, pricing_currency: null, status: "active", status_reason: null }
]

function pageOf(rows: unknown[], meta: Partial<{ current_page: number; last_page: number; per_page: number; total: number }> = {}) {
	return { data: rows, meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length, ...meta } }
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { arrivalRequests: "Arrival requests" } },
			spaces: { spaceType: { co_space: "Co-working space", room: "Room", business: "Business space", event_hall: "Event hall" } },
			arrivalRequests: {
				description: "Members who have signalled they've arrived, oldest wait first.",
				loadError: "Couldn't load arrival requests.",
				empty: "Nobody is waiting at reception.",
				walkIn: "Walk-in",
				columns: { member: "Member", phone: "Phone", waiting: "Waiting", booking: "Booking", actions: "Actions" },
				confirm: {
					button: "Confirm",
					success: "Arrival confirmed.",
					title: "Choose a space",
					spaceLabel: "Space",
					description: "This member has no booking today, so pick the space they're starting in."
				},
				reject: { button: "Reject", success: "Arrival request rejected." }
			},
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel", arabicPlaceholder: "Arabic", englishPlaceholder: "English", bilingualLabel: "{field} ({language})" },
				validation: { required: "{field} is required." },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountPage() {
	return mount(ArrivalRequestsPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe("arrivalRequestsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listArrivalRequestsMock.mockResolvedValue(pageOf([matchedRow, walkInRow]))
		confirmArrivalRequestMock.mockResolvedValue({ message: "Arrival confirmed." })
		rejectArrivalRequestMock.mockResolvedValue({ message: "Arrival request rejected." })
		listSpacesMock.mockResolvedValue(spaces)
	})

	it("asks for the first page on mount and shows what comes back", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listArrivalRequestsMock).toHaveBeenCalledWith({ page: 1 })
		expect(wrapper.vm.rows).toEqual([matchedRow, walkInRow])
		wrapper.unmount()
	})

	/**
	 * The backend checks the member into the booking it already matched, so the
	 * request carries nothing. Asserting the exact argument list — not just that
	 * confirm was called — is what fails if someone later "helpfully" passes the
	 * matched booking's own space_id, which would route the call down the
	 * walk-in branch instead.
	 */
	it("confirms a matched row with no space_id and no picker", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.confirm(matchedRow)
		await flushPromises()

		expect(confirmArrivalRequestMock).toHaveBeenCalledTimes(1)
		expect(confirmArrivalRequestMock.mock.calls[0]).toEqual([7])
		expect(wrapper.vm.spacePickerVisible).toBe(false)
		expect(listArrivalRequestsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("opens the space picker for an unmatched row instead of confirming", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.confirm(walkInRow)
		await flushPromises()

		expect(confirmArrivalRequestMock).not.toHaveBeenCalled()
		expect(wrapper.vm.spacePickerVisible).toBe(true)
		expect(wrapper.vm.spaceForm.space_id).toBeNull()
		wrapper.unmount()
	})

	it("will not confirm an unmatched row until a space is chosen", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.confirm(walkInRow)
		await flushPromises()

		const drawer = wrapper.findComponent(ResourceFormDrawer)
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(confirmArrivalRequestMock).not.toHaveBeenCalled()
		expect(wrapper.vm.spacePickerVisible).toBe(true)
		wrapper.unmount()
	})

	it("confirms an unmatched row with the chosen space_id once one is picked", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.confirm(walkInRow)
		await flushPromises()

		wrapper.vm.spaceForm.space_id = 9
		await flushPromises()
		const drawer = wrapper.findComponent(ResourceFormDrawer)
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(confirmArrivalRequestMock).toHaveBeenCalledTimes(1)
		expect(confirmArrivalRequestMock.mock.calls[0]).toEqual([8, 9])
		expect(wrapper.vm.spacePickerVisible).toBe(false)
		wrapper.unmount()
	})

	it("loads the space options once, from the unfiltered list", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listSpacesMock).toHaveBeenCalledTimes(1)
		expect(listSpacesMock.mock.calls[0][0]).toBeUndefined()
		wrapper.unmount()
	})

	/**
	 * Rejecting a walk-in signal is not destructive — nothing was charged and no
	 * booking was ever made — so there is deliberately no confirmation dialog.
	 * Asserting the call lands on the first invocation is what fails if someone
	 * later wraps this in `useDialog().warning`.
	 */
	it("rejects immediately, with no confirmation dialog", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.reject(walkInRow)
		await flushPromises()

		expect(rejectArrivalRequestMock).toHaveBeenCalledWith(8)
		expect(listArrivalRequestsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	/**
	 * Someone else acted on the row first. The server's own wording is the whole
	 * explanation, so it is surfaced verbatim rather than replaced by a generic
	 * error — and the list is refetched, because the page's belief about that
	 * row is now provably stale.
	 */
	it("surfaces a 409's server message and refetches", async () => {
		confirmArrivalRequestMock.mockRejectedValue(
			new ApiError(409, JSON.stringify({ message: "This arrival request is no longer pending." }))
		)
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.confirm(matchedRow)
		await flushPromises()

		expect(messageErrorMock).toHaveBeenCalledWith("This arrival request is no longer pending.")
		expect(listArrivalRequestsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("refetches after a 409 on reject too", async () => {
		rejectArrivalRequestMock.mockRejectedValue(
			new ApiError(409, JSON.stringify({ message: "This arrival request is no longer pending." }))
		)
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.reject(matchedRow)
		await flushPromises()

		expect(messageErrorMock).toHaveBeenCalledWith("This arrival request is no longer pending.")
		expect(listArrivalRequestsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("keeps the space picker open and the selection intact when confirm fails", async () => {
		confirmArrivalRequestMock.mockRejectedValue(
			new ApiError(422, JSON.stringify({ message: "That space is at capacity." }))
		)
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.confirm(walkInRow)
		await flushPromises()
		wrapper.vm.spaceForm.space_id = 9
		await flushPromises()

		const drawer = wrapper.findComponent(ResourceFormDrawer)
		await drawer.vm.handleSubmit()
		await flushPromises()

		expect(wrapper.vm.spacePickerVisible).toBe(true)
		expect(wrapper.vm.spaceForm.space_id).toBe(9)
		wrapper.unmount()
	})

	it("refetches with the page the operator moved to", async () => {
		listArrivalRequestsMock.mockResolvedValue(pageOf([matchedRow], { last_page: 4, total: 87 }))
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.page = 3
		await flushPromises()

		expect(listArrivalRequestsMock).toHaveBeenLastCalledWith({ page: 3 })
		wrapper.unmount()
	})

	it("hides the pager when everything fits on one page", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.find(".n-pagination").exists()).toBe(false)
		wrapper.unmount()
	})

	it("says the queue is empty when it is, without calling that an error", async () => {
		listArrivalRequestsMock.mockResolvedValue(pageOf([]))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Nobody is waiting at reception.")
		expect(wrapper.text()).not.toContain("Couldn't load arrival requests.")
		wrapper.unmount()
	})

	it("shows a load error instead of an empty queue when the list fails", async () => {
		listArrivalRequestsMock.mockRejectedValue(new ApiError(500, ""))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load arrival requests.")
		expect(wrapper.text()).not.toContain("Nobody is waiting at reception.")
		wrapper.unmount()
	})
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/add-os/modules/kiosk --exclude "**/.claude/worktrees/**"`
Expected: FAIL — cannot resolve `../ArrivalRequestsPage.vue`.

- [ ] **Step 3: Implement**

Create `src/add-os/modules/kiosk/views/ArrivalRequestsPage.vue`:

```vue
<!-- src/add-os/modules/kiosk/views/ArrivalRequestsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.arrivalRequests") }}</h1>
			<p>{{ t("arrivalRequests.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('arrivalRequests.loadError')" />

		<n-card class="add-ledger-table">
			<n-data-table v-if="rows.length > 0 || isLoading" :columns :data="rows" :loading="isLoading" :bordered="false" :row-key />
			<div v-else-if="!error" class="py-10 text-center">{{ t("arrivalRequests.empty") }}</div>

			<div v-if="meta && meta.last_page > 1" class="mt-4 flex justify-end">
				<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
			</div>
		</n-card>

		<ResourceFormDrawer
			v-model:show="spacePickerVisible"
			v-model:model="spaceForm"
			:fields="spaceFields"
			:title="t('arrivalRequests.confirm.title')"
			:submitting="action.isSubmitting.value"
			:on-submit="submitSpacePicker"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { SpacePickerModel } from "@/add-os/modules/kiosk/config/arrival-requests.config"
import type { ArrivalRequest } from "@/add-os/modules/kiosk/types/arrival-request"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NAlert, NCard, NDataTable, NPagination } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import { useNow } from "@/add-os/composables/useNow"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { useReceptionAction } from "@/add-os/modules/booking/composables/useReceptionAction"
import { buildArrivalRequestColumns, buildSpacePickerFields } from "@/add-os/modules/kiosk/config/arrival-requests.config"
import { confirmArrivalRequest, listArrivalRequests, rejectArrivalRequest } from "@/add-os/services/reception"
import { listSpaces } from "@/add-os/services/spaces"

/**
 * The reception arrival queue.
 *
 * Structurally an `ApprovalQueuePage`: backend-driven pagination, per-row
 * commands through `useReceptionAction`, and a refetch after every action
 * rather than local row-splicing. The queue is defined server-side as
 * `status = pending`, so an actioned row leaves because the next response no
 * longer contains it; splicing would draw the same picture while making the
 * screen disagree with the server the moment anything else changed.
 *
 * The one thing this screen does that the approval queue does not: confirm has
 * two shapes. A row with a matched booking confirms with no body. A walk-in —
 * `matched_booking === null`, the ordinary case, not an error — requires the
 * operator to say which space the member is starting in.
 */

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const page = ref(1)
const { data: rows, isLoading, error, refetch, meta } = useResourceList<ArrivalRequest>(listArrivalRequests, undefined, page)

const action = useReceptionAction(refetch)

/**
 * Ticks so the "waiting" column ages while the page sits open. 30s is chosen
 * against what the column actually resolves to — whole minutes — so a row is
 * never more than half a minute stale, and the clock costs two renders a
 * minute rather than sixty.
 */
const now = useNow(30_000)

/**
 * Loaded once, unfiltered. The backend validates `space_id` as
 * `required|integer|exists:spaces,id` with no branch or building constraint, so
 * there is nothing to narrow by; see arrival-requests.config.ts for why this is
 * a flat list rather than the cascade the spatial forms use.
 */
const { data: spaces } = useResourceList<Space>(() => listSpaces())

const spaceOptions = computed<SelectOption[]>(() =>
	spaces.value.map(space => ({ label: `${spaceTypeLabel(t, space.space_type)} #${space.id}`, value: space.id }))
)

const spaceFields = computed(() => buildSpacePickerFields(t, spaceOptions.value))

function rowKey(row: ArrivalRequest) {
	return row.id
}

/**
 * `useReceptionAction` refetches on success and surfaces the server's own
 * message on failure, but does not refetch on failure. This adds that.
 *
 * The rationale is not "refetch everything, just in case": a failed action
 * leaves the page's belief about that row unverified, and a 409 — routine here,
 * because two operators work one queue — means it is provably stale, someone
 * else already decided it. Refetching on a 5xx or a network failure too is
 * harmless and correct for the same reason.
 */
async function runAndSettle(command: () => Promise<{ message?: string }>, successMessage: string): Promise<boolean> {
	const succeeded = await action.run(command, successMessage)
	if (!succeeded) await refetch()
	return succeeded
}

async function confirm(row: ArrivalRequest) {
	if (row.matched_booking === null) {
		openSpacePicker(row)
		return
	}

	await runAndSettle(() => confirmArrivalRequest(row.id), t("arrivalRequests.confirm.success"))
}

/**
 * No confirmation dialog, deliberately. Rejecting an arrival signal is not
 * destructive: nothing was charged, and no booking or session was ever created
 * by the request itself.
 */
async function reject(row: ArrivalRequest) {
	await runAndSettle(() => rejectArrivalRequest(row.id), t("arrivalRequests.reject.success"))
}

const spacePickerVisible = ref(false)
const spacePickerTargetId = ref<number | null>(null)
const spaceForm = ref<SpacePickerModel>({ space_id: null })

function openSpacePicker(row: ArrivalRequest) {
	spacePickerTargetId.value = row.id
	// A fresh object, not a mutation: ResourceFormDrawer keys a "drawer session"
	// off the model's identity to clear the last one's errors and options.
	spaceForm.value = { space_id: null }
	spacePickerVisible.value = true
}

/**
 * Throws on failure rather than returning quietly.
 *
 * `ResourceFormDrawer` closes itself the moment `onSubmit` resolves, and
 * `useReceptionAction` never throws for an ApiError — it returns false. A plain
 * return would therefore dismiss the picker on a 422 or 409 and lose the
 * operator's selection, with the toast the only trace. The drawer's own catch
 * swallows whatever is thrown, which is exactly the "stay open" signal wanted
 * here; the message has already been shown.
 */
async function submitSpacePicker(payload: Record<string, unknown>) {
	const id = spacePickerTargetId.value
	const spaceId = payload.space_id

	if (id === null || typeof spaceId !== "number") {
		throw new TypeError("space picker submitted with no target row or no space selected")
	}

	const succeeded = await runAndSettle(() => confirmArrivalRequest(id, spaceId), t("arrivalRequests.confirm.success"))
	if (!succeeded) throw new Error("arrival confirm rejected by the server; keeping the picker open")
}

const columns = computed<DataTableColumns<ArrivalRequest>>(() => buildArrivalRequestColumns(t, now, confirm, reject))

defineExpose({ confirm, reject, submitSpacePicker, spacePickerVisible, spaceForm, page, rows, meta })
</script>
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/add-os/modules/kiosk --exclude "**/.claude/worktrees/**"`
Expected: PASS, both page specs.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/kiosk/views/ArrivalRequestsPage.vue src/add-os/modules/kiosk/views/__tests__/ArrivalRequestsPage.spec.ts
git commit -m "feat(add-os): add the reception arrival queue with its two-shape confirm"
```

---

# BATCH 5 — Wiring and verification

### Task 11: Nav, routes, i18n, allowlist, full verification

**Files:**
- Modify: `src/add-os/navigation/sections.ts:115-121` and `:184-192`
- Modify: `src/add-os/navigation/routes.ts:31-50`
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json`
- Modify: `src/add-os/__tests__/no-external-urls.spec.ts:78-81`

**Interfaces:**
- Consumes: both SFCs (Tasks 7, 10).
- Produces: routes `cms.announcements` → `/cms/announcements` and `bookings.arrivalRequests` → `/bookings/arrival-requests`.

The brief asked for a new top-level "Kiosk" section. `sections.ts:100-114` argues against exactly that, and the owner resolved it as a split on 2026-08-25 — see the spec, §2. Section count stays 13.

- [ ] **Step 1: Add the nav entries**

In `src/add-os/navigation/sections.ts`, add `arrivalRequests` to the `bookings` pages array, after `activeSessions`:

```ts
			pages: [
				{ key: "approvalQueue", path: "approval-queue" },
				{ key: "activeSessions", path: "active-sessions" },
				{ key: "arrivalRequests", path: "arrival-requests" },
				{ key: "allBookings", path: "all" },
				{ key: "calendar", path: "calendar" }
			]
```

Then replace the whole `cms` section:

```ts
	{
		key: "cms",
		path: "/cms",
		icon: "carbon:document",
		status: "active",
		/**
		 * `announcements` leads, and that ordering is load-bearing rather than
		 * cosmetic: a section redirects to its FIRST page, so putting the one
		 * built screen ahead of the two placeholders is what makes `/cms` land
		 * somewhere useful.
		 *
		 * Kiosk banner content lives here, and the arrival queue lives under
		 * `bookings`, rather than both sitting in a new top-level "Kiosk"
		 * section. Same reasoning as the note on `bookings` above: the operator's
		 * mental model decides the section, not the feature's backend origin —
		 * banner content is website/content management, and an arrival queue is a
		 * reception desk queue beside the other two. A 14th section would also
		 * hit the horizontal-nav problem `.claude/rules/shell-and-controls.md`
		 * calls unsolved in Arabic. Decided with the brand/product owner
		 * 2026-08-25; recorded in docs/superpowers/specs/2026-08-25-kiosk-module-design.md §2.
		 */
		pages: [
			{ key: "announcements", path: "announcements" },
			{ key: "content", path: "content" },
			{ key: "partners", path: "partners" }
		]
	},
```

- [ ] **Step 2: Register the routes**

In `src/add-os/navigation/routes.ts`, add to `PAGE_COMPONENTS`:

```ts
	"cms.announcements": () => import("@/add-os/modules/kiosk/views/AnnouncementsPage.vue"),
	"bookings.arrivalRequests": () => import("@/add-os/modules/kiosk/views/ArrivalRequestsPage.vue"),
```

Both lazy, like every other real page — a static import here pulls the page's whole module graph into this file's evaluation and re-triggers the initialisation cycle the file header documents.

- [ ] **Step 3: Add the English strings**

In `src/add-os/lang/en/en.json`, add two entries to `nav.pages`:

```json
			"arrivalRequests": "Arrival requests",
			"announcements": "Announcements",
```

And add both key groups as siblings of `approvalQueue`:

```json
	"announcements": {
		"description": "Banner content for the reception kiosk display.",
		"loadError": "Couldn't load announcements. You may not have permission to view this page.",
		"columns": { "sortOrder": "Order", "type": "Type", "imageUrl": "Image", "window": "Shown", "isActive": "Active" },
		"isActiveYes": "Active",
		"isActiveNo": "Inactive",
		"windowAlways": "Always",
		"windowOpenStart": "From launch",
		"windowOpenEnd": "No end",
		"create": { "button": "New announcement", "title": "New announcement", "success": "Announcement created." },
		"edit": { "title": "Edit announcement", "success": "Announcement updated." },
		"delete": { "success": "Announcement deleted." },
		"form": {
			"type": "Type",
			"imageUrl": "Image URL",
			"linkUrl": "Link URL (optional)",
			"sortOrder": "Display order",
			"startsAt": "Starts at (optional)",
			"endsAt": "Ends at (optional)",
			"isActive": "Active"
		},
		"validation": {
			"typeTooLong": "Type must be {max} characters or fewer.",
			"urlInvalid": "Enter a complete web address, including the scheme.",
			"urlTooLong": "The address must be {max} characters or fewer.",
			"endsBeforeStarts": "The end must be at or after the start."
		}
	},
	"arrivalRequests": {
		"description": "Members who have signalled they've arrived. Longest wait first.",
		"loadError": "Couldn't load arrival requests. You may not have permission to view this page.",
		"empty": "Nobody is waiting at reception.",
		"walkIn": "Walk-in",
		"columns": { "member": "Member", "phone": "Phone", "waiting": "Waiting", "booking": "Booking", "actions": "Actions" },
		"confirm": {
			"button": "Confirm",
			"success": "Arrival confirmed.",
			"title": "Choose a space",
			"spaceLabel": "Space",
			"description": "This member has no booking today, so pick the space they're starting in."
		},
		"reject": { "button": "Reject", "success": "Arrival request rejected." }
	},
```

**Do not write a bare scheme-plus-host anywhere in these strings.** `urlInvalid` says "including the scheme" for exactly that reason — `no-external-urls.spec.ts` scans `src/add-os/**`, `en.json` included.

- [ ] **Step 4: Add the Arabic strings**

In `src/add-os/lang/ar/ar.json`, add to `nav.pages`:

```json
			"arrivalRequests": "طلبات الوصول",
			"announcements": "الإعلانات",
```

And both key groups:

```json
	"announcements": {
		"description": "محتوى اللافتات المعروضة على شاشة الاستقبال.",
		"loadError": "تعذّر تحميل الإعلانات. قد لا تملك صلاحية عرض هذه الصفحة.",
		"columns": { "sortOrder": "الترتيب", "type": "النوع", "imageUrl": "الصورة", "window": "فترة العرض", "isActive": "مفعّل" },
		"isActiveYes": "مفعّل",
		"isActiveNo": "متوقف",
		"windowAlways": "دائماً",
		"windowOpenStart": "من البداية",
		"windowOpenEnd": "بلا نهاية",
		"create": { "button": "إعلان جديد", "title": "إعلان جديد", "success": "تم إنشاء الإعلان." },
		"edit": { "title": "تعديل الإعلان", "success": "تم تحديث الإعلان." },
		"delete": { "success": "تم حذف الإعلان." },
		"form": {
			"type": "النوع",
			"imageUrl": "رابط الصورة",
			"linkUrl": "رابط الوجهة (اختياري)",
			"sortOrder": "ترتيب العرض",
			"startsAt": "يبدأ في (اختياري)",
			"endsAt": "ينتهي في (اختياري)",
			"isActive": "مفعّل"
		},
		"validation": {
			"typeTooLong": "يجب ألا يتجاوز النوع {max} حرفاً.",
			"urlInvalid": "أدخل عنوان ويب كاملاً مع البروتوكول.",
			"urlTooLong": "يجب ألا يتجاوز العنوان {max} حرفاً.",
			"endsBeforeStarts": "يجب أن يكون وقت الانتهاء بعد وقت البدء أو مساوياً له."
		}
	},
	"arrivalRequests": {
		"description": "الأعضاء الذين أعلنوا وصولهم. الأطول انتظاراً أولاً.",
		"loadError": "تعذّر تحميل طلبات الوصول. قد لا تملك صلاحية عرض هذه الصفحة.",
		"empty": "لا أحد ينتظر في الاستقبال.",
		"walkIn": "زيارة مباشرة",
		"columns": { "member": "العضو", "phone": "الهاتف", "waiting": "مدة الانتظار", "booking": "الحجز", "actions": "الإجراءات" },
		"confirm": {
			"button": "تأكيد",
			"success": "تم تأكيد الوصول.",
			"title": "اختر مساحة",
			"spaceLabel": "المساحة",
			"description": "لا يوجد حجز لهذا العضو اليوم، فاختر المساحة التي سيبدأ فيها."
		},
		"reject": { "button": "رفض", "success": "تم رفض طلب الوصول." }
	},
```

Every value carries Arabic script — `messages.spec.ts` fails any that does not, and `{max}` is an interpolation placeholder, not content.

- [ ] **Step 5: Widen the `api.test` justification**

In `src/add-os/__tests__/no-external-urls.spec.ts`, replace the `api.test` entry's `why`:

```ts
	{
		host: "api.test",
		why: "Mocked API base URL in Vitest service-layer tests where fetch itself is stubbed — no network request possible. Also stands in for resource URLs (image/link fields) in view-test fixtures, for the same reason: nothing ever fetches them."
	}
```

The allowlisted host set is unchanged and no assertion is weakened — this only widens the recorded reason to cover a second, equally inert use. The `why.length > 30` and no-duplicate checks still hold.

- [ ] **Step 6: Verify — the whole suite, not just the new files**

Run each and confirm before moving on:

```bash
pnpm vitest run --exclude "**/.claude/worktrees/**"
pnpm type-check
pnpm lint:check
pnpm api:collection:check
```

Expected: all green. Specifically confirm:
- `src/add-os/lang/__tests__/messages.spec.ts` — ar/en parity holds and no Arabic value is an English copy.
- `src/add-os/__tests__/no-external-urls.spec.ts` — still zero off-allowlist hosts.
- The other four architecture guards and `theme/__tests__/tokens.spec.ts` are untouched and green.
- `pnpm api:collection:check` reports **MATCH**.

Do not weaken an assertion to make it pass. If one fails, report which invariant broke and stop.

- [ ] **Step 7: Commit**

```bash
git add src/add-os/navigation/sections.ts src/add-os/navigation/routes.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json src/add-os/__tests__/no-external-urls.spec.ts
git commit -m "feat(add-os): route and translate the kiosk pages"
```

- [ ] **Step 8: Record the decisions**

Update `docs/superpowers/specs/2026-08-25-kiosk-module-design.md` — append a short "Implemented" note under Status with the commit range, and move anything §13 lists as Open that the build settled. Per `.claude/rules/docs-discipline.md`, append; never overwrite the reasoning that justified a choice.

```bash
git add docs/superpowers/specs/2026-08-25-kiosk-module-design.md docs/superpowers/plans/2026-08-25-kiosk-module.md
git commit -m "docs(add-os): record the kiosk module as built"
```

---

## Notes for the executor

- **The validation tests in Tasks 7 and 10 depend on the modal body actually being mounted.** `ResourceFormDrawer.handleSubmit` calls `formRef.value?.validate()`, and `n-modal` mounts its content lazily — so if the drawer is invoked before the form has rendered, `validate()` resolves to `undefined` and **silently passes**. This is the same trap `ApprovalQueuePage.vue` documents for its reject modal. Both specs therefore set `show` true, `await flushPromises()`, and mount with `attachTo: document.body` before calling `handleSubmit`. If that sequencing is wrong the failure mode is safe — the mocked service gets called and the `not.toHaveBeenCalled()` assertion fails loudly — but do not "fix" such a failure by relaxing the assertion. Add the missing `await`.
- **`pnpm icons`** — `carbon:checkmark`, `carbon:close` and `carbon:add` are all already bundled (the approval queue and every CRUD page use them). No new icon names are introduced, so this does not need running. If you add one, run it or the icon guard fails.
- **No new dependencies.** Everything here is Vue, Naive UI, vue-i18n and Vitest, all already installed. A new dependency needs approval before installation, stating what it is, what it replaces, its licence, and whether it makes any network call.
- **If a fix appears to require editing a Category C vendor file** (`src/**` outside `add-os`), stop and say so. That means the override layer is missing a hook; do not reach into vendor code.
- **The API pin is current** (`sha256 86d330d9…`, 2026-08-25 second pin). If `api:collection:check` starts reporting MISMATCH mid-build, treat it as a failing guard: every "per the collection" claim in the code comments above becomes unverified until someone re-reads the canonical file and re-pins.
