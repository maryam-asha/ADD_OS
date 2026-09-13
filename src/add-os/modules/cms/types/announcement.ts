// src/add-os/modules/cms/types/announcement.ts

export interface Announcement {
	id: number
	type: string
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
	type: string
	image_url: string
	link_url: string
	sort_order: number | null
	starts_at: string
	ends_at: string
	is_active: boolean
}
