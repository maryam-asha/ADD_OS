import type { FormItemRule, SelectOption } from "naive-ui"
import type { SupportedLocale } from "@/add-os/lang/locales"

export type FieldType = "text" | "bilingual-text" | "number" | "select" | "switch" | "time" | "date"

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
	required?: boolean
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
