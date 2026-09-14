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
	/** Authoritative price. Whole points — everything below is derived from it. */
	price_points: number
	/** Display-ready, already localised: "50 pts" / "50 نقطة", or "Free" when free. */
	price_label: string
	price_usd: string
	price_display: string
	/** Display-ready with the currency symbol: "73,500.01 ل.س". */
	price_display_label: string
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
	/** Whole points. The backend rejects a fractional value with a 422. */
	price_points?: number | null
	image_url?: string
	status: EventStatus
	order: number
}
