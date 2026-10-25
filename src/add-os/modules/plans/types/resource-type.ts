export interface ResourceType {
	id: number
	name: { ar: string; en: string }
	slug: string
	/** Singular unit noun, e.g. `{"en":"page","ar":"صفحة"}` — shown next to a grant's quantity. */
	unit_label: { ar: string; en: string }
	icon?: string | null
	/** The inventory stock one unit consumed uses up (printing: paper), issued when reception records consumption. */
	inventory_item_id: number | null
	/** How much of it per unit consumed, a plain decimal string ("1", "0.5"). */
	stock_units_per_unit: string | null
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
	inventory_item_id?: number | null
	stock_units_per_unit?: number | null
	order?: number
	is_active?: boolean
}
