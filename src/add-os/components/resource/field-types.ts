import type { FormItemRule, SelectOption } from "naive-ui"
import type { SupportedLocale } from "@/add-os/lang/locales"

export type FieldType = "text" | "bilingual-text" | "textarea" | "bilingual-textarea" | "number" | "select" | "switch" | "time" | "date" | "datetime" | "image" | "multi-image" | "color"

export interface Bilingual {
	ar: string
	en: string
}

/**
 * Declares one field of a resource's create/edit form. `ResourceFormDrawer`
 * (components/resource/ResourceFormDrawer.vue) renders every field type and
 * drives the `dependsOn`/`optionsFrom` cascade generically — nothing
 * resource-specific lives in the drawer itself.
 */
export interface FieldDescriptor<TModel = Record<string, unknown>> {
	key: keyof TModel & string
	/** i18n key; the drawer calls t() itself, so config files hold keys, never resolved strings. */
	labelKey: string
	type: FieldType
	/** Optional destination folder/category for image uploads (e.g. 'founders', 'events'). */
	folder?: string
	/** Whether the field accepts multiple files/images (e.g. image gallery). */
	multiple?: boolean
	required?: boolean
	/** number-only: smallest step the spinners move by. */
	step?: number
	/** number-only: lowest accepted value. */
	min?: number
	/**
	 * number-only: restrict the input to whole numbers.
	 *
	 * Point fields need this — the backend validates `integer` on them and
	 * returns a 422 for a fractional value, so the input must not be able to
	 * produce one in the first place.
	 */
	integer?: boolean
	/**
	 * Optional read-only note rendered under the input, resolved against the
	 * live model. Used to quote a server-derived figure next to the value it
	 * belongs to — e.g. a space's `hourly_rate_usd` under its point rate —
	 * without the form pretending to compute it. Return `""` for no hint.
	 */
	hint?: (model: TModel) => string
	rule?: FormItemRule | FormItemRule[]
	/** select-only, static options. */
	options?: SelectOption[]
	/** One or more other fields' keys this one depends on — e.g. a Space's `space_id` narrows on both `building_id` and the optional `zone_id`. */
	dependsOn?: string | string[]
	/**
	 * select-only, dynamic options. Re-invoked whenever any `dependsOn` key's value
	 * changes. `parentValues` is keyed by each `dependsOn` key (single key ⇒ one
	 * entry); `model` is passed too so a field can read further context beyond its
	 * declared dependencies without widening `dependsOn` for every caller.
	 */
	optionsFrom?: (parentValues: Record<string, unknown>, model: TModel) => Promise<SelectOption[]> | SelectOption[]
	/**
	 * Participates in the form/dependency graph (can be a `dependsOn` target,
	 * can gate other fields via `optionsFrom`) but is excluded from the
	 * payload a submit sends — used for UI-only ancestor-narrowing steps that
	 * aren't themselves part of any resource's actual payload shape (e.g. a
	 * "branch" dropdown shown only to narrow a Floor form's "building" options;
	 * Floor's real payload never contains a branch_id).
	 */
	virtual?: boolean
	disabledWhen?: (model: TModel) => boolean
	hiddenWhen?: (model: TModel) => boolean
}

/** Strips every `virtual` field so a submit payload matches the resource's real API shape. */
export function buildPayload<TModel extends Record<string, unknown>>(
	fields: FieldDescriptor<TModel>[],
	model: TModel
): Record<string, unknown> {
	const payload: Record<string, unknown> = {}
	for (const field of fields) {
		if (field.virtual) continue
		payload[field.key] = model[field.key]
	}
	return payload
}

/** Reads the half of a `{ar, en}` field matching the active locale — used by table column renderers. */
export function pickLocalized(value: Bilingual, locale: SupportedLocale): string {
	return value[locale]
}
