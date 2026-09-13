import type { Bilingual } from "@/add-os/components/resource/field-types"

export type CommunityMemberCategory = "pioneers" | "growth_partners" | "investors" | "impact_partners"

export interface CommunityMember {
	id: number
	name: Bilingual
	category: CommunityMemberCategory
	company?: Bilingual | null
	title?: Bilingual | null
	bio?: Bilingual | null
	long_bio?: Bilingual | null
	location?: Bilingual | null
	year_joined?: number | null
	photo_url?: string | null
	order: number
	published: boolean
}

export interface CommunityMemberPayload extends Record<string, unknown> {
	name: Bilingual
	category: CommunityMemberCategory
	company?: Bilingual
	title?: Bilingual
	bio?: Bilingual
	long_bio?: Bilingual
	location?: Bilingual
	year_joined?: number | null
	photo_url?: string
	order: number
	published: boolean
}
