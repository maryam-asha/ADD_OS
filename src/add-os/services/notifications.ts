import type { Bilingual } from "@/add-os/components/resource/field-types"
import { delWithBody, get, patch, post, put } from "./api"

export type NotificationTarget = "all" | "role" | "users"

export interface BroadcastNotificationPayload {
	title: Bilingual
	body: Bilingual
	target: NotificationTarget
	role_name?: string
	user_ids?: number[]
}

export interface BroadcastNotificationResponse {
	message: string
}

export function broadcastNotification(payload: BroadcastNotificationPayload): Promise<BroadcastNotificationResponse> {
	return post<BroadcastNotificationResponse>("/api/v1/admin/notifications/broadcast", payload)
}

/**
 * The signed-in account's own inbox (ADDCore ServesNotificationInbox): a
 * staff account reads its staff notices under `admin/`, a provider account
 * its provider notices under `provider/`. Title and body arrive rendered in
 * the request's `lang`, so a language switch is a re-fetch.
 */
export type InboxAudience = "staff" | "provider"

export interface InboxNotification {
	id: string
	template_key: string | null
	title: string | null
	body: string | null
	/** What the notice is about — `target_type`/`target_id` when it has one. */
	data: Record<string, string> | null
	read_at: string | null
	created_at: string
}

export interface InboxPage {
	data: InboxNotification[]
	meta: { current_page: number; last_page: number; per_page: number }
}

function base(audience: InboxAudience): string {
	return audience === "provider" ? "/api/v1/provider" : "/api/v1/admin"
}

export function fetchInbox(audience: InboxAudience, page = 1): Promise<InboxPage> {
	return get<InboxPage>(`${base(audience)}/notifications`, { page })
}

export async function fetchUnreadCount(audience: InboxAudience): Promise<number> {
	const res = await get<{ data: { unread_count: number } }>(`${base(audience)}/notifications/unread-count`)
	return res.data.unread_count
}

export async function markNotificationRead(audience: InboxAudience, id: string): Promise<void> {
	await patch(`${base(audience)}/notifications/${encodeURIComponent(id)}/read`)
}

export async function markAllNotificationsRead(audience: InboxAudience): Promise<void> {
	await post(`${base(audience)}/notifications/read-all`)
}

/** This browser's Firebase token, for the account's dashboard notices; the `lang` header sets its push language. */
export async function registerBrowserToken(audience: InboxAudience, token: string): Promise<void> {
	await put(`${base(audience)}/device-token`, { token })
}

/** Stops pushes to this browser. The token travels in the body, never the URL. */
export async function removeBrowserToken(audience: InboxAudience, token: string): Promise<void> {
	await delWithBody(`${base(audience)}/device-token`, { token })
}
