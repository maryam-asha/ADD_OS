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

/** Profile fields only — status and role are separate actions, matching `UpdateUserRequest`. */
export async function updateUserProfile(id: number, payload: UpdateUserProfilePayload): Promise<User> {
	const res = await put<{ data: User }>(`${BASE}/${id}`, payload)
	return res.data
}

/** Setting `deactivated`/`blocked` revokes every session this user holds, immediately. */
export async function updateUserStatus(id: number, payload: UpdateUserStatusPayload): Promise<User> {
	const res = await patch<{ data: User }>(`${BASE}/${id}/status`, payload)
	return res.data
}

export async function assignRole(id: number, role: UserRole): Promise<User> {
	const res = await patch<{ data: User }>(`${BASE}/${id}/role`, { role })
	return res.data
}
