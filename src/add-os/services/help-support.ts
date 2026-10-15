// src/add-os/services/help-support.ts
import { get, patch } from "./api"

/** Markdown, one per language. */
export interface HelpSupportContent {
	en: string
	ar: string
}

export interface HelpSupport {
	content: HelpSupportContent
	updated_at: string | null
}

const ENDPOINT = "/api/v1/admin/help-support"

/**
 * The app's Help & Support text, both languages (`data` is null before the first save).
 * GET /api/v1/admin/help-support
 */
export async function getHelpSupport(): Promise<HelpSupport> {
	const res = await get<{ data: { content: Partial<HelpSupportContent>, updated_at: string | null } | null }>(ENDPOINT)
	return {
		content: { ar: res?.data?.content.ar ?? "", en: res?.data?.content.en ?? "" },
		updated_at: res?.data?.updated_at ?? null
	}
}

/**
 * Saves both languages; the first save creates it.
 * PATCH /api/v1/admin/help-support
 */
export async function updateHelpSupport(content: HelpSupportContent): Promise<{ message?: string }> {
	return patch<{ message?: string }>(ENDPOINT, { content })
}
