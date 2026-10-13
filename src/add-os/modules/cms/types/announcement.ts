// src/add-os/modules/cms/types/announcement.ts

import type { Bilingual } from "@/add-os/components/resource/field-types"

export type AnnouncementType = "offer" | "event" | "news"

/** Which screen shows it: the reception kiosk, the member app's home, or both. */
export type AnnouncementPlacement = "kiosk" | "app" | "all"

export interface Announcement {
	id: number
	type: AnnouncementType
	/** The type's name in the request's language. */
	type_label: string
	placement: AnnouncementPlacement
	/** Optional text the app draws over the image; null for an image-only banner. */
	subtitle: Bilingual | null
	title: Bilingual | null
	description: Bilingual | null
	cta_label: Bilingual | null
	image_url: string
	link_url: string | null
	sort_order: number
	starts_at: string | null
	ends_at: string | null
	is_active: boolean
	created_at: string
	updated_at: string
}

export interface AnnouncementPayload {
	type: AnnouncementType | null
	placement: AnnouncementPlacement
	subtitle: Bilingual
	title: Bilingual
	description: Bilingual
	cta_label: Bilingual
	image_url: string
	link_url: string
	sort_order: number | null
	starts_at: string
	ends_at: string
	is_active: boolean
}

/** GET admin/announcements/options — what the form's pickers offer. */
export interface AnnouncementOptions {
	types: Array<{ key: AnnouncementType; label: string }>
	placements: Array<{ key: AnnouncementPlacement; label: string }>
}
