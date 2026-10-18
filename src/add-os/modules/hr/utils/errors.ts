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

/**
 * A lookup a form can do without — grades, units, document types: one the
 * account may not be allowed to read. A refusal leaves the choices empty;
 * anything that is not an API error is a bug and is re-thrown.
 */
export async function quietly<T>(load: () => Promise<T>, apply: (value: T) => void): Promise<void> {
	try {
		apply(await load())
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
	}
}
