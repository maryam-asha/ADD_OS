/**
 * A setting's translated name and hint, from `systemSettings.fields`.
 *
 * The backend keys are dotted (`booking.min_notice_minutes`), and vue-i18n
 * reads dots as nesting, so each key is stored under its dots-to-underscores
 * id instead. A key with no entry yet — one added on the backend first —
 * falls back to its raw key and no hint, so it still shows and edits.
 */
type Translate = (key: string) => string
type Exists = (key: string) => boolean

export function settingTextId(key: string): string {
	return key.replaceAll(".", "_")
}

export function settingLabel(key: string, t: Translate, te: Exists): string {
	const path = `systemSettings.fields.${settingTextId(key)}.label`
	return te(path) ? t(path) : key
}

export function settingHint(key: string, t: Translate, te: Exists): string | null {
	const path = `systemSettings.fields.${settingTextId(key)}.hint`
	return te(path) ? t(path) : null
}
