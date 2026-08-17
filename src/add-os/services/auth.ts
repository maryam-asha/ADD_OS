import type { AdminUser } from "@/types/auth.d"
import { apiUrl } from "../config/env"
import { get, post } from "./api"

class AuthError extends Error {
	status?: number
	body?: string
}

/**
 * Request the CSRF cookie from the API. Must be called first.
 * Sends credentials so the cookie is set across the API origin.
 *
 * Deliberately bypasses api.ts's request() and so does NOT carry the
 * `lang`/`currency` headers every other endpoint gets: this hits Laravel
 * Sanctum's framework-level `/sanctum/csrf-cookie` route directly, which
 * returns no body and has no localized content to negotiate. Routing it
 * through request() would also risk firing request()'s 401 → logout +
 * redirect-to-/login side effect during the pre-login cookie-priming step,
 * before there is a session to log out of. Exempted on purpose, not an
 * oversight.
 */
export async function getCsrfCookie(): Promise<void> {
	const url = `${apiUrl().replace(/\/+$/, "")}/sanctum/csrf-cookie`
	const res = await fetch(url, { method: "GET", credentials: "include" })
	if (!res.ok) {
		throw new Error(`Failed to fetch CSRF cookie: ${res.status}`)
	}
	// The server sets XSRF-TOKEN cookie; nothing else to parse here.
}

/**
 * Login with email + password. Must call getCsrfCookie() first so XSRF-TOKEN cookie exists.
 * Resolves to `{ two_factor: boolean }` — Fortify never returns the user here.
 */
export async function login(email: string, password: string): Promise<{ two_factor: boolean }> {
	return post<{ two_factor: boolean }>("/login", { email, password })
}

/**
 * Two-Factor challenge, completing a login that returned `two_factor: true`.
 * Pass either { code } or { recovery_code }.
 */
export async function twoFactorChallenge(payload: { code?: string; recovery_code?: string }): Promise<void> {
	return post<void>("/two-factor-challenge", payload)
}

/**
 * The authenticated admin/operations user for the current session.
 */
export async function getMe(): Promise<AdminUser> {
	const res = await get<{ user: AdminUser }>("/api/v1/admin/me")
	return res.user
}

/**
 * Logout the current session.
 */
export async function logout(): Promise<void> {
	return post<void>("/logout")
}

export { AuthError }
