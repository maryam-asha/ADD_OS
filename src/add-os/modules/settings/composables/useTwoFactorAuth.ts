import type { TwoFactorPhase } from "../types/account"
import { ref } from "vue"
import {
	confirmTwoFactorAuthentication,
	disableTwoFactorAuthentication,
	enableTwoFactorAuthentication,
	getTwoFactorQrCode,
	getTwoFactorRecoveryCodes,
	regenerateTwoFactorRecoveryCodes
} from "@/add-os/services/account"
import { ApiError } from "@/add-os/services/api"

/**
 * Drives the 2FA section of the Account & Security page. Every call that can
 * hit Fortify's password-confirmation gate is passed through
 * `withConfirmation` (from `usePasswordConfirmation`, owned by the page and
 * passed in here) rather than duplicating the 423-retry dance per action.
 */
export function useTwoFactorAuth(withConfirmation: <T>(action: () => Promise<T>) => Promise<T>) {
	const phase = ref<TwoFactorPhase>("disabled")
	const loading = ref(true)
	const qrSvg = ref<string | null>(null)
	const recoveryCodes = ref<string[]>([])
	const busy = ref(false)
	const confirmCodeError = ref<string | null>(null)

	/** The raw probe: lets a 423 through, so `withConfirmation` can react to it. */
	async function probeStatus(): Promise<void> {
		const svg = await getTwoFactorQrCode()
		if (svg) {
			qrSvg.value = svg
			phase.value = "active"
			recoveryCodes.value = await getTwoFactorRecoveryCodes()
		} else {
			phase.value = "disabled"
			qrSvg.value = null
			recoveryCodes.value = []
		}
	}

	/**
	 * Safe to call on mount: a 423 (the password-confirmation window has
	 * lapsed) is not a failure, it means the status cannot be read yet. That
	 * lands on `"locked"` rather than opening a password prompt nobody asked for.
	 */
	async function loadStatus(): Promise<void> {
		loading.value = true
		try {
			await probeStatus()
		} catch (err) {
			if (!(err instanceof ApiError && err.status === 423)) throw err
			phase.value = "locked"
			qrSvg.value = null
			recoveryCodes.value = []
		} finally {
			loading.value = false
		}
	}

	/** From `"locked"`: confirm the password, then read the real status. */
	async function unlock(): Promise<void> {
		busy.value = true
		try {
			await withConfirmation(() => probeStatus())
		} finally {
			busy.value = false
		}
	}

	async function enable(): Promise<void> {
		busy.value = true
		try {
			await withConfirmation(() => enableTwoFactorAuthentication())
			await loadStatus()
		} finally {
			busy.value = false
		}
	}

	async function confirm(code: string): Promise<boolean> {
		busy.value = true
		confirmCodeError.value = null
		try {
			await withConfirmation(() => confirmTwoFactorAuthentication(code))
			await loadStatus()
			return true
		} catch (err) {
			if (err instanceof ApiError && err.status === 422) {
				confirmCodeError.value = err.data?.errors?.code?.[0] ?? err.data?.message ?? null
				return false
			}
			throw err
		} finally {
			busy.value = false
		}
	}

	async function regenerateRecoveryCodes(): Promise<void> {
		busy.value = true
		try {
			await withConfirmation(() => regenerateTwoFactorRecoveryCodes())
			recoveryCodes.value = await getTwoFactorRecoveryCodes()
		} finally {
			busy.value = false
		}
	}

	async function disable(): Promise<void> {
		busy.value = true
		try {
			await withConfirmation(() => disableTwoFactorAuthentication())
			phase.value = "disabled"
			qrSvg.value = null
			recoveryCodes.value = []
		} finally {
			busy.value = false
		}
	}

	return { phase, loading, qrSvg, recoveryCodes, busy, confirmCodeError, loadStatus, unlock, enable, confirm, regenerateRecoveryCodes, disable }
}
