export interface PlanModule {
	id: number
	name: { ar: string; en: string }
	slug: string
	description?: { ar: string; en: string } | null
	icon?: string | null
	order: number
	is_active: boolean
	plans_count?: number
	created_at?: string
	updated_at?: string
}

export interface PlanModulePayload extends Record<string, unknown> {
	name: { ar: string; en: string }
	slug?: string
	description?: { ar: string; en: string } | null
	icon?: string | null
	order?: number
	is_active?: boolean
}
