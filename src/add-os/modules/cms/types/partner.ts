// src/add-os/modules/cms/types/partner.ts

import type { Bilingual } from "@/add-os/components/resource/field-types"

export interface Partner {
	id: number
	name: Bilingual
	description: Bilingual | null
	logo_url: string | null
	website_url: string | null
	category: "local" | "global"
	order: number
	is_active: boolean
	created_at: string
	updated_at: string
}

export interface PartnerPayload {
	name: Bilingual
	description: Bilingual
	logo_url: string
	website_url: string
	category: "local" | "global"
	order: number | null
	is_active: boolean
}
