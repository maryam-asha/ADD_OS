import { ApiError } from "@/add-os/services/api"

/**
 * What a custom HR form shows when a request fails: the first field error of
 * a 422, else the server's own message (HR's business errors arrive
 * translated), else the caller's fallback. Anything that is not an API error
 * is a bug and is re-thrown.
 */
export function apiErrorMessage(caught: unknown, fallback: string): string {
	if (!(caught instanceof ApiError)) throw caught
	const errors = caught.data?.errors
	const first = errors ? Object.values(errors)[0]?.[0] : undefined
	return first ?? caught.data?.message ?? fallback
}

/** An update answers `{message}`, translated by the server; shown as is. */
export function serverMessage(result: { message?: string } | undefined, fallback: string): string {
	return result?.message || fallback
}
