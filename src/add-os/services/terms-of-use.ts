// src/add-os/services/terms-of-use.ts
import { get, patch } from "./api"

/** Markdown, one per language. */
export interface TermsOfUseContent {
	en: string
	ar: string
}

export interface TermsOfUse {
	content: TermsOfUseContent
	updated_at: string | null
}

const ENDPOINT = "/api/v1/admin/terms-of-use"

/**
 * The app's terms of use, both languages (`data` is null before the first save).
 * GET /api/v1/admin/terms-of-use
 */
export async function getTermsOfUse(): Promise<TermsOfUse> {
	const res = await get<{ data: { content: Partial<TermsOfUseContent>, updated_at: string | null } | null }>(ENDPOINT)
	return {
		content: { ar: res?.data?.content.ar ?? "", en: res?.data?.content.en ?? "" },
		updated_at: res?.data?.updated_at ?? null
	}
}

/**
 * Saves both languages; the first save creates the terms.
 * PATCH /api/v1/admin/terms-of-use
 */
export async function updateTermsOfUse(content: TermsOfUseContent): Promise<{ message?: string }> {
	return patch<{ message?: string }>(ENDPOINT, { content })
}
