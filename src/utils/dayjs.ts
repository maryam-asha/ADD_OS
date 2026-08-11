import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import timezone from "dayjs/plugin/timezone"
import { applyArabicCalendar } from "@/add-os/utils/format/dayjsArabic"
// ADD OS: bilingual — the template's it/de/es/fr/ja locales were removed with their bundles.
import "dayjs/locale/ar"
import "dayjs/locale/en"

/*
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"
import utc from "dayjs/plugin/utc"
import duration from "dayjs/plugin/duration"
import relativeTime from "dayjs/plugin/relativeTime"
dayjs.extend(isSameOrAfter)
dayjs.extend(utc)
dayjs.extend(relativeTime)
dayjs.extend(duration)
*/
dayjs.extend(customParseFormat)
dayjs.extend(timezone)
dayjs.tz.setDefault(dayjs.tz.guess())

// ADD OS: replace dayjs's "أغسطس" with the Levantine "آب" so any code that formats
// with dayjs agrees with @/add-os/utils/format. Must run after the `ar` locale import.
applyArabicCalendar(dayjs)

export default dayjs
