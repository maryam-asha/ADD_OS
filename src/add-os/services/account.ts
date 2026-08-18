import { del, get, post, put } from "./api"

/**
 * Changes the current user's password. Fortify gates this behind a fresh
 * password confirmation — a 423 means the caller should route through
 * `usePasswordConfirmation`'s `withConfirmation()`, not handle it ad hoc.
 * A wrong `current_password` comes back as a 422 keyed on `current_password`
 * (live-confirmed).
 */
export async function changePassword(payload: {
	current_password: string
	password: string
	password_confirmation: string
}): Promise<void> {
	return put<void>("/user/password", payload)
}

/**
 * Re-proves the current password, opening Fortify's confirmation window (its
 * length is server-side session config, not something this app controls).
 * One confirmation covers every gated action below until the window lapses.
 */
export async function confirmPassword(password: string): Promise<void> {
	return post<void>("/user/confirm-password", { password })
}

/**
 * Whether the confirmation window above is still open. Optional UI sugar —
 * `usePasswordConfirmation`'s `withConfirmation()` still reacts to a 423 if
 * the window lapses mid-action, so this is never the sole gate.
 */
export async function getConfirmedPasswordStatus(): Promise<{ confirmed: boolean }> {
	return get<{ confirmed: boolean }>("/user/confirmed-password-status")
}

/**
 * Updates name/email. Not password-confirmation gated — live-confirmed
 * Fortify only guards the password and 2FA endpoints, not this one.
 */
export async function updateProfileInformation(payload: { name: string; email: string }): Promise<void> {
	return put<void>("/user/profile-information", payload)
}

/**
 * Starts 2FA setup: generates a secret + recovery codes but leaves 2FA
 * UNCONFIRMED until `confirmTwoFactorAuthentication()` succeeds. Fetch the QR
 * code / recovery codes only after this resolves.
 */
export async function enableTwoFactorAuthentication(): Promise<void> {
	return post<void>("/user/two-factor-authentication")
}

/**
 * Inline SVG markup, not an image URL — render with `v-html`, it's
 * backend-generated, not user input. Live-confirmed response shape: an empty
 * array `[]` when 2FA was never enabled for this user, or `{ svg: "<svg
 * ...>" }` once `enableTwoFactorAuthentication()` has been called.
 * `getTwoFactorStatus()` below is built on exactly this observed difference.
 */
export async function getTwoFactorQrCode(): Promise<string | null> {
	const res = await get<{ svg: string } | unknown[]>("/user/two-factor-qr-code")
	return Array.isArray(res) ? null : res.svg
}

/**
 * Confirms the 6-digit authenticator code, turning the pending setup into
 * enforced 2FA. A wrong code is a 422 keyed on `code` (live-confirmed) —
 * distinct from the 423 a stale password confirmation would raise.
 */
export async function confirmTwoFactorAuthentication(code: string): Promise<void> {
	return post<void>("/user/confirmed-two-factor-authentication", { code })
}

/**
 * Unused recovery codes. Live-confirmed: `[]` when 2FA was never enabled,
 * a real string array once it has been. Fetch on demand — never cache across
 * a session, since `regenerateTwoFactorRecoveryCodes()` invalidates them.
 */
export async function getTwoFactorRecoveryCodes(): Promise<string[]> {
	return get<string[]>("/user/two-factor-recovery-codes")
}

/**
 * Regenerates and invalidates the old set. Live-confirmed the response body
 * is empty — callers must re-`getTwoFactorRecoveryCodes()` afterward rather
 * than expect the new codes back from this call.
 */
export async function regenerateTwoFactorRecoveryCodes(): Promise<void> {
	return post<void>("/user/two-factor-recovery-codes")
}

/** Removes the secret and every recovery code. */
export async function disableTwoFactorAuthentication(): Promise<void> {
	return del<void>("/user/two-factor-authentication")
}

/**
 * Whether 2FA has ever been set up for this user, inferred from the QR-code
 * probe above — there is no dedicated status field or endpoint anywhere in
 * the collection (checked; also confirmed missing from `/api/v1/admin/me`'s
 * response live). This can't distinguish "set up but not yet confirmed" from
 * "confirmed and enforced" — both leave a real secret behind, so both probe
 * as `true`. Callers needing that distinction have no way to get it from the
 * API today; see docs/add-os/auth-verification-report.md.
 */
export async function getTwoFactorStatus(): Promise<{ setUp: boolean }> {
	const svg = await getTwoFactorQrCode()
	return { setUp: svg !== null }
}
