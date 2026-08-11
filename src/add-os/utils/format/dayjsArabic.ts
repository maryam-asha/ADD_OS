import type dayjs from "dayjs"
import updateLocale from "dayjs/plugin/updateLocale"
import { MONTHS, MONTHS_SHORT, WEEKDAYS, WEEKDAYS_SHORT } from "./calendar"

/**
 * ADD OS — pushes the Levantine month names into dayjs's `ar` locale.
 *
 * `formatDate` never touches dayjs, so this is purely defensive: it makes sure
 * that code formatting dates with dayjs directly still says "آب" and not
 * dayjs's own "أغسطس". One table, one answer, wherever a date is rendered.
 *
 * Takes the dayjs instance as an argument rather than importing
 * `@/utils/dayjs`, so `add-os` never depends back on the file that calls it.
 * Must run AFTER `dayjs/locale/ar` is loaded — `updateLocale` patches an
 * existing locale and does nothing if it is missing.
 */
export function applyArabicCalendar(instance: typeof dayjs): void {
	instance.extend(updateLocale)

	instance.updateLocale("ar", {
		months: [...MONTHS.ar],
		monthsShort: [...MONTHS_SHORT.ar],
		weekdays: [...WEEKDAYS.ar],
		weekdaysShort: [...WEEKDAYS_SHORT.ar]
	})
}
