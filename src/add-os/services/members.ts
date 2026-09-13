/**
 * Member-facing service layer.
 *
 * Members are users with role "member" who self-registered from the Flutter
 * app. We piggyback on the existing `users` and `wallet-top-ups` services;
 * this module provides focused, re-export-free wrappers so callers never
 * have to filter `role=member` themselves.
 */

import type { Member, MemberActiveSession, MemberWalletBalance, UpdateMemberStatusPayload } from "@/add-os/modules/members/types/member"
import { get, patch } from "./api"

const USERS_BASE = "/api/v1/admin/users"
const WALLET_BALANCE_URL = "/api/v1/admin/reception/wallet-balance"
const SESSIONS_URL = "/api/v1/admin/reception/sessions/active"

/** Returns only users whose role is "member". */
export async function listMembers(): Promise<Member[]> {
	const res = await get<{ data: Member[] }>(USERS_BASE, { role: "member" })
	return res.data
}

/** Fetches a single member by ID with their profiles. */
export async function getMember(id: number): Promise<Member> {
	const res = await get<{ data: Member }>(`${USERS_BASE}/${id}`)
	return res.data
}

/**
 * Fetches the general wallet balance for a single member.
 * Pass an optional `currency` code to receive a converted balance alongside
 * the base-currency balance.
 */
export async function getMemberWalletBalance(
	userId: number,
	currency?: string
): Promise<MemberWalletBalance> {
	const params: Record<string, string | number> = { user_id: userId }
	if (currency) params.currency = currency
	const res = await get<{ data: MemberWalletBalance }>(WALLET_BALANCE_URL, params)
	return res.data
}

/**
 * Returns all currently active sessions (bookings + walk-ins) and then
 * filters client-side to those belonging to a specific member.
 *
 * The backend has no per-user filter on this endpoint, so we retrieve the
 * full active list and filter locally. The list is typically short (a handful
 * of live sessions at any time), so this is acceptable.
 */
export async function getMemberActiveSessions(userId: number): Promise<MemberActiveSession[]> {
	const res = await get<{ data: MemberActiveSession[] }>(SESSIONS_URL)
	return res.data.filter(s => s.user_id === userId)
}

/**
 * Changes a member's account status (active / deactivated / blocked).
 * Setting deactivated or blocked revokes every active session immediately.
 * Returns `{message}` only — caller must re-fetch to see the new value.
 */
export async function updateMemberStatus(
	userId: number,
	payload: UpdateMemberStatusPayload
): Promise<void> {
	return patch<void>(`${USERS_BASE}/${userId}/status`, payload)
}
