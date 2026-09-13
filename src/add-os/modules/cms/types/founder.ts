// src/add-os/modules/cms/types/founder.ts

import type { Bilingual } from "@/add-os/components/resource/field-types"

export interface Founder {
	id: number
	name: Bilingual
	role: Bilingual | null
	bio: Bilingual | null
	photo_url: string | null
	linkedin_url: string | null
	twitter_url: string | null
	order: number
	created_at: string
	updated_at: string
}

export interface FounderPayload {
	name: Bilingual
	role: Bilingual
	bio: Bilingual
	photo_url: string
	linkedin_url: string
	twitter_url: string
	order: number | null
}
