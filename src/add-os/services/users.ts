import type {
	CreateUserPayload,
	UpdateUserProfilePayload,
	UpdateUserStatusPayload,
	User,
	UserRole
} from "@/add-os/modules/system/types/user"
import { get, patch, post, put } from "./api"

const BASE = "/api/v1/admin/users"

export async function listUsers(filter?: { role?: UserRole }): Promise<User[]> {
	const res = await get<{ data: User[] }>(BASE, filter?.role ? { role: filter.role } : undefined)
	return res.data
}

/** Admin-only: creates an operations or admin account. Members self-register from the app. */
export async function createUser(payload: CreateUserPayload): Promise<User> {
	const res = await post<{ data: User }>(BASE, payload)
	return res.data
}

export async function getUser(id: number): Promise<User> {
	const res = await get<{ data: User }>(`${BASE}/${id}`)
	return res.data
}

/**
 * Profile fields only — status and role are separate actions, matching
 * `UpdateUserRequest`. Live-confirmed (and documented in the collection):
 * this returns `{"message": "..."}` on success, not the updated resource —
 * callers must re-fetch (e.g. `listUsers()`) to see the new values.
 */
export async function updateUserProfile(id: number, payload: UpdateUserProfilePayload): Promise<void> {
	return put<void>(`${BASE}/${id}`, payload)
}

/**
 * Setting `deactivated`/`blocked` revokes every session this user holds,
 * immediately. Live-confirmed: returns `{"message": "..."}`, not the updated
 * resource — same as `updateUserProfile`.
 */
export async function updateUserStatus(id: number, payload: UpdateUserStatusPayload): Promise<void> {
	return patch<void>(`${BASE}/${id}/status`, payload)
}

/** Live-confirmed: returns `{"message": "..."}`, not the updated resource — same as the two above. */
export async function assignRole(id: number, role: UserRole): Promise<void> {
	return patch<void>(`${BASE}/${id}/role`, { role })
}
