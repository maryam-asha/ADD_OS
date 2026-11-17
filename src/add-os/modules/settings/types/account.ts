/** `Laravel\Fortify\Http\Requests\UpdateUserPasswordRequest`. */
export interface ChangePasswordPayload {
	current_password: string
	password: string
	password_confirmation: string
}

/** `Laravel\Fortify\Http\Requests\UpdateUserProfileInformationRequest`. */
export interface UpdateProfilePayload {
	name: string
	email: string
}

/**
 * Two states, not three: there is no API-visible distinction between "secret
 * generated, code not yet confirmed" and "confirmed and enforced" — see
 * `services/account.ts`'s `getTwoFactorStatus()` doc comment. `"active"`
 * covers both; the UI always offers both the confirm-code form and a Disable
 * button in that state rather than guessing which one applies.
 *
 * Added 2026-11-16: `"locked"`. The status probe itself is behind Fortify's
 * password confirmation, so once that window lapses the probe answers 423 and
 * the real state is unknown. Showing "disabled" there offered an Enable button
 * to someone who may already have 2FA on; `"locked"` says the status needs a
 * password confirmation first and offers nothing else.
 */
export type TwoFactorPhase = "disabled" | "active" | "locked"
