import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { TIMESHEET_INCREMENT_HOURS, TIMESHEET_WEEK_STARTS_ON } from "@/add-os/modules/hr/types/timesheets"

/**
 * ADD OS — the timesheet week starts where ADD Core says it does.
 *
 * No endpoint exposes `hr.timesheets.week_starts_on` or `increment_hours`, so
 * `types/timesheets.ts` copies them. When the copy drifted (Monday here,
 * Sunday in ADD Core) every timesheet week was refused with "not the first day
 * of a timesheet week" — the employee's own page, the HR list, the not-handed-in
 * tab and the compliance report all at once — and every Vitest spec still
 * passed, because they mock the server. Found by the live HR run of 2026-10-21.
 *
 * Reads ADD Core's config the way `scripts/check-api-collection.js` reads its
 * Postman collection: from the checkout beside this one. The host app's
 * `config/hr.php` wins option by option over the package's
 * `packages/add/hr/config/hr.php` (ADD Core b4e29a87), so a value the app
 * leaves out comes from the package. Where that checkout is absent the
 * comparison is skipped, not passed — the parser's own checks still run.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..")
const CORE = path.resolve(ROOT, "..", "ADDCore")
const APP_CONFIG = path.join(CORE, "config", "hr.php")
const PACKAGE_CONFIG = path.join(CORE, "packages", "add", "hr", "config", "hr.php")

/** The `'timesheets' => [ ... ]` block of an hr.php, comments dropped. */
function timesheetsBlock(php: string): string | null {
	const start = php.search(/'timesheets'\s*=>\s*\[/)
	if (start < 0) return null
	let depth = 0
	for (let i = php.indexOf("[", start); i < php.length; i++) {
		if (php[i] === "[") depth++
		if (php[i] === "]" && --depth === 0) return php.slice(start, i + 1).replace(/\/\/[^\n]*/g, "")
	}
	return null
}

/** One numeric option of that block, or null when the file does not set it. */
function timesheetOption(php: string, key: string): number | null {
	const block = timesheetsBlock(php)
	const match = block?.match(new RegExp(`'${key}'\\s*=>\\s*([\\d.]+)`))
	return match ? Number(match[1]) : null
}

function coreValue(key: string): number | null {
	const app = timesheetOption(readFileSync(APP_CONFIG, "utf8"), key)
	return app ?? timesheetOption(readFileSync(PACKAGE_CONFIG, "utf8"), key)
}

describe("timesheet week — the parser", () => {
	const sample = `return [
		'leave' => ['week_starts_on' => 3],
		'timesheets' => [
			// ISO weekday ('week_starts_on' => 9 in a comment is not read)
			'week_starts_on' => 7,
			'nested' => ['x' => [1]],
			'increment_hours' => 0.25,
		],
	];`

	it("reads the timesheets block, not another block's key or a comment", () => {
		expect(timesheetOption(sample, "week_starts_on")).toBe(7)
		expect(timesheetOption(sample, "increment_hours")).toBe(0.25)
	})

	it("answers null for an option the file leaves to the package", () => {
		expect(timesheetOption(sample, "max_gap_hours")).toBeNull()
		expect(timesheetOption("return ['leave' => []];", "week_starts_on")).toBeNull()
	})
})

describe.skipIf(!existsSync(APP_CONFIG) || !existsSync(PACKAGE_CONFIG))("timesheet week — against the ADD Core checkout", () => {
	it("starts the week on ADD Core's weekday", () => {
		expect(TIMESHEET_WEEK_STARTS_ON).toBe(coreValue("week_starts_on"))
	})

	it("steps hours by ADD Core's increment", () => {
		expect(TIMESHEET_INCREMENT_HOURS).toBe(coreValue("increment_hours"))
	})
})
