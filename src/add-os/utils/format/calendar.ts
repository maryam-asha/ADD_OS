import type { SupportedLocale } from "@/add-os/lang/locales"

/**
 * ADD OS — THE single source of month and weekday names.
 *
 * ── Why this table exists ───────────────────────────────────────────────────
 * Neither library the project depends on gives the names Syria actually uses:
 *
 *   date-fns `arDZ` (all naive-ui exposes) …… "أوت"     ← Maghrebi
 *   dayjs `ar` ……………………………………………………………………… "أغسطس"   ← transliterated Latin
 *   ADD OS (this table) ……………………………………………… "آب"      ← Levantine / Syriac
 *
 * Two libraries disagreeing inside one app is a defect on its own; picking the
 * Levantine names fixes both the conflict and the audience mismatch.
 *
 * ── Reach ───────────────────────────────────────────────────────────────────
 * Everything ADD OS renders goes through `formatDate`, which reads this table.
 * `./dayjs-arabic.ts` also pushes it into dayjs, so even code that formats with
 * dayjs directly gets the same names.
 *
 * The one place it cannot reach is naive-ui's own date-picker panel, which
 * renders from `dateArDZ` internally — see RTL-REPORT.md and I18N-REPORT.md.
 */

export const MONTHS: Record<SupportedLocale, readonly string[]> = {
	ar: [
		"كانون الثاني",
		"شباط",
		"آذار",
		"نيسان",
		"أيّار",
		"حزيران",
		"تمّوز",
		"آب",
		"أيلول",
		"تشرين الأول",
		"تشرين الثاني",
		"كانون الأول"
	],
	en: [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	]
}

export const WEEKDAYS: Record<SupportedLocale, readonly string[]> = {
	ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
	en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
}

/**
 * Levantine month names have no conventional abbreviations — "تشرين الأول"
 * is simply written out. English keeps the usual three-letter forms.
 */
export const MONTHS_SHORT: Record<SupportedLocale, readonly string[]> = {
	ar: MONTHS.ar,
	en: MONTHS.en.map(month => month.slice(0, 3))
}

export const WEEKDAYS_SHORT: Record<SupportedLocale, readonly string[]> = {
	ar: WEEKDAYS.ar,
	en: WEEKDAYS.en.map(day => day.slice(0, 3))
}
