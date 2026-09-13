import type { EventCategory } from "./event-category"
import type { Bilingual } from "@/add-os/components/resource/field-types"

export type EventStatus = "draft" | "published" | "cancelled"

export interface Event {
	id: number
	branch_id?: number | null
	category_id?: number | null
	title: Bilingual
	description?: Bilingual | null
	category?: EventCategory | null
	start_at: string
	end_at: string
	location?: string | null
	capacity?: number | null
	is_free: boolean
	price?: number | null
	currency: string
	image_url?: string | null
	status: EventStatus
	order: number
	created_at: string
}

export interface EventPayload extends Record<string, unknown> {
	branch_id?: number | null
	category_id?: number | null
	title: Bilingual
	description?: Bilingual
	start_at: string
	end_at: string
	location?: string
	capacity?: number | null
	is_free?: boolean
	price?: number | null
	currency?: string
	image_url?: string
	status: EventStatus
	order: number
}
