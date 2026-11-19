import type { SelectOption } from "naive-ui"

/**
 * A person as ADD Core's `UserResource` returns them: `name` is the name in the
 * request's language, `name_ar` / `name_en` are both languages of it (either
 * may be empty — sign-up stores one, the member adds the other). Search has to
 * look at all three, or a member shown as "مريم" is not found by "Maryam".
 */
export interface BilingualPerson {
	name?: string | null
	name_ar?: string | null
	name_en?: string | null
}

/** Whether the term is in the person's name, in either language. */
export function personNameMatches(person: BilingualPerson, term: string): boolean {
	const needle = term.trim().toLowerCase()
	if (!needle) return true
	return [person.name, person.name_ar, person.name_en].some(name => name?.toLowerCase().includes(needle))
}

/**
 * Both languages of the name, for a select option's `search` key, so
 * `filterPersonOption` finds the person by the one the label does not show.
 */
export function personSearchText(person: BilingualPerson): string {
	return [person.name_ar, person.name_en].filter(Boolean).join(" ")
}

/**
 * `n-select`'s `filter` for options of people: matches the label (name, phone,
 * whatever it shows) as Naive UI's default does, plus the option's `search`.
 */
export function filterPersonOption(pattern: string, option: SelectOption): boolean {
	const needle = pattern.trim().toLowerCase()
	if (!needle) return true
	return [option.label, option.search].some(text => typeof text === "string" && text.toLowerCase().includes(needle))
}
