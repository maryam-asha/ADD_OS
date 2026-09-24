export interface ResourceType {
	id: number
	name: { ar: string; en: string }
	slug: string
	/** Singular unit noun, e.g. `{"en":"page","ar":"صفحة"}` — shown next to a grant's quantity. */
	unit_label: { ar: string; en: string }
	icon?: string | null
	order: number
	is_active: boolean
	created_at?: string
	updated_at?: string
}

export interface ResourceTypePayload extends Record<string, unknown> {
	name: { ar: string; en: string }
	slug?: string
	unit_label: { ar: string; en: string }
	icon?: string | null
	order?: number
	is_active?: boolean
}
