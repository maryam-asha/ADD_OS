// src/add-os/components/resource/form-fields.ts
//
// The shape of an admin-defined form field, shared by every domain that lets
// an admin build a form. The backend runs one engine for all of them
// (App\Support\Forms), so the client describes them once too.

import type { Bilingual } from "@/add-os/components/resource/field-types"

/**
 * The eight types App\Support\Forms\FieldType offers. Order is the order the
 * admin sees in the type dropdown, so it runs simple-to-specialised rather
 * than alphabetically.
 */
export const FORM_FIELD_TYPES = [
	"text",
	"textarea",
	"select",
	"checkbox",
	"date",
	"number",
	"rating",
	"file"
] as const

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number]

export interface FormFieldOption {
	value: string
	label: Bilingual
}

/**
 * A field as the admin list endpoints return it: labels already resolved to
 * one locale, which is why editing one seeds both languages from it.
 */
/**
 * The text patterns an admin may pick, mirroring
 * App\Support\Forms\FieldConstraints::PATTERNS.
 *
 * A free-form expression is deliberately not offered, because the backend
 * refuses one: Laravel splits rule strings on `|`, so a stored pattern could
 * append rules to a member-facing validator, and a nested quantifier hangs
 * the worker on a long input.
 */
export const FIELD_PATTERNS = [
	"alpha",
	"alphanumeric",
	"digits",
	"email",
	"url",
	"syrian_phone",
	"no_urls"
] as const

export type FieldPatternName = (typeof FIELD_PATTERNS)[number]

/**
 * What an admin may constrain, as the API accepts it.
 *
 * Dates carry their own keys rather than reusing `min`/`max`: those hold
 * numbers on every other type, so a consumer treating `validation.max` as a
 * character count would otherwise be handed a date string.
 */
export interface FieldValidation {
	/** Mirrors the is_required column; the builder does not write it. */
	required?: boolean
	min?: number
	max?: number
	min_date?: string
	max_date?: string
	regex?: FieldPatternName
	accept?: string
	max_kb?: number
}

/**
 * Which keys each type accepts — the TS mirror of FieldConstraints::for().
 *
 * There is no shared-schema mechanism between the two repos, so this is
 * duplicated by necessity. FieldConstraintsTest asserts the backend's list
 * and names this file in its failure message when the two drift.
 */
export const VALIDATION_KEYS_BY_TYPE: Record<FormFieldType, readonly (keyof FieldValidation)[]> = {
	text: ["min", "max", "regex"],
	textarea: ["min", "max", "regex"],
	select: [],
	checkbox: ["min", "max"],
	date: ["min_date", "max_date"],
	number: ["min", "max"],
	rating: ["min", "max"],
	file: ["accept", "max_kb"]
}

/** The `accept` shorthands FieldRuleBuilder::acceptToMimes() knows. */
export const FILE_ACCEPT_OPTIONS = [
	"image/*",
	"video/*",
	"audio/*",
	".pdf",
	".docx",
	".xlsx"
] as const

export interface FormFieldDefinition {
	id: number
	key: string
	label: string
	placeholder?: string | null
	type: FormFieldType
	options?: { value: string, label: string }[]
	/**
	 * Deliberately looser than FormFieldPayload's: a legacy row may hold a
	 * shape the current vocabulary does not describe, and fromApiValidation()
	 * in FormFieldsBuilder is the runtime boundary that narrows it.
	 */
	validation?: Record<string, unknown> | null
	is_required: boolean
	/** Services omits this on older rows; absent means active. */
	is_active?: boolean
	order?: number
}

export interface FormFieldPayload extends Record<string, unknown> {
	key: string
	label: Bilingual
	placeholder?: Bilingual | null
	type: FormFieldType
	options?: FormFieldOption[] | null
	validation?: FieldValidation | null
	is_required?: boolean
	is_active?: boolean
	order?: number
}
