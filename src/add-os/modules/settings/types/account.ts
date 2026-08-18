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
 */
export type TwoFactorPhase = "disabled" | "active"
