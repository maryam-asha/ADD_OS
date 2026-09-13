// src/add-os/modules/cms/types/contact-link.ts

export interface ContactLink {
	id: number
	type: string
	value: string
	label: string | null
	sort_order: number
	is_visible: boolean
	created_at: string
	updated_at: string
}

export interface ContactLinkPayload {
	type: string
	value: string
	label: string
	sort_order: number | null
	is_visible: boolean
}
