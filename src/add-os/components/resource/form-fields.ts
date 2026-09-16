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
export interface FormFieldDefinition {
	id: number
	key: string
	label: string
	placeholder?: string | null
	type: FormFieldType
	options?: { value: string, label: string }[]
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
	validation?: Record<string, unknown> | null
	is_required?: boolean
	is_active?: boolean
	order?: number
}
