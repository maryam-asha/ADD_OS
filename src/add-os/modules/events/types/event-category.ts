import type { Bilingual } from "@/add-os/components/resource/field-types"

export interface EventCategory {
	id: number
	name: Bilingual
	slug: string
	description?: Bilingual | null
	color?: string | null
	icon?: string | null
	order: number
	is_active: boolean
	events_count?: number
	created_at: string
	updated_at: string
}

export interface EventCategoryPayload extends Record<string, unknown> {
	name: Bilingual
	slug?: string
	description?: Bilingual | null
	color?: string | null
	icon?: string | null
	order?: number | null
	is_active?: boolean
}
