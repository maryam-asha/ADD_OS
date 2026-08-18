import { ref } from "vue"
import { confirmPassword } from "@/add-os/services/account"
import { ApiError } from "@/add-os/services/api"

/**
 * Fortify's "confirm password before a sensitive action" gate, generic enough
 * for any caller — live-confirmed against the real backend that enabling 2FA
 * without a fresh confirmation comes back 423 `Password confirmation
 * required.`, and that the same call succeeds right after confirming. This is
 * the ONLY place that reacts to a 423; every gated action just calls
 * `withConfirmation(() => theRealRequest())` and gets a transparent
 * modal-then-retry instead of its own copy of this dance.
 *
 * One instance is meant to be created once per page (not per action) and its
 * `modalVisible`/`password`/`confirming`/`confirmError` bound to a single
 * `ConfirmPasswordModal` — every gated action on that page shares the same
 * modal rather than each spawning its own.
 */
export function usePasswordConfirmation() {
	const modalVisible = ref(false)
	const password = ref("")
	const confirming = ref(false)
	const confirmError = ref<string | null>(null)

	let pendingResolve: (() => void) | null = null
	let pendingReject: ((reason: unknown) => void) | null = null

	function openModal(): Promise<void> {
		password.value = ""
		confirmError.value = null
		modalVisible.value = true

		return new Promise<void>((resolve, reject) => {
			pendingResolve = resolve
			pendingReject = reject
		})
	}

	async function submit(): Promise<void> {
		confirming.value = true
		confirmError.value = null
		try {
			await confirmPassword(password.value)
			modalVisible.value = false
			pendingResolve?.()
		} catch (err) {
			confirmError.value = err instanceof ApiError ? (err.data?.message ?? null) : null
			if (!(err instanceof ApiError)) throw err
		} finally {
			confirming.value = false
		}
	}

	function cancel(): void {
		modalVisible.value = false
		pendingReject?.(new Error("password-confirmation-cancelled"))
	}

	/**
	 * Runs `action()`. If it fails with a 423, opens the modal, waits for a
	 * successful confirmation, then retries `action()` once. Any other failure
	 * (including a cancelled modal) propagates to the caller untouched.
	 */
	async function withConfirmation<T>(action: () => Promise<T>): Promise<T> {
		try {
			return await action()
		} catch (err) {
			if (err instanceof ApiError && err.status === 423) {
				await openModal()
				return action()
			}
			throw err
		}
	}

	return { modalVisible, password, confirming, confirmError, withConfirmation, submit, cancel }
}
