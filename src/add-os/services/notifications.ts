import type { Bilingual } from "@/add-os/components/resource/field-types"
import { post } from "./api"

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
