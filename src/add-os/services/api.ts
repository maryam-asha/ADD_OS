import { currentLocale } from "@/add-os/lang/currentLocale"
import { DEFAULT_CURRENCY } from "@/add-os/utils/format/currency"
import router from "@/router"
import { useAuthStore } from "@/stores/auth"
import { useCurrencyStore } from "@/stores/currency"

import { apiUrl } from "../config/env"

class ApiError extends Error {
	status: number
	body: string | undefined
	/** Parsed JSON body, when the response was valid JSON (Laravel's `{message, errors}` shape). */
	data: { message?: string; errors?: Record<string, string[]> } | undefined
	constructor(status: number, body?: string) {
		super(`API request failed: ${status}`)
		this.status = status
		this.body = body
		if (body) {
			try {
				this.data = JSON.parse(body)
			} catch {
				/* body wasn't JSON — leave data undefined */
			}
		}
	}
}

/**
 * Laravel's CSRF cookie carries the (encrypted) token verbatim — read it and echo it
 * back as X-XSRF-TOKEN so VerifyCsrfToken can decrypt and match it against the
 * session. Cross-origin `document.cookie` only exposes this when the API and the
 * dashboard share the same host (see src/add-os/services/auth.ts's getCsrfCookie doc).
 */
function readXsrfToken(): string | null {
	if (typeof document === "undefined") return null
	const cookies = document.cookie ? document.cookie.split("; ") : []
	for (const c of cookies) {
		if (c.startsWith("XSRF-TOKEN=")) {
			return decodeURIComponent(c.slice("XSRF-TOKEN=".length))
		}
	}
	return null
}

/**
 * Headers every ADD OS request carries, on every verb, with no exceptions.
 * The backend expects `lang`/`currency` (lower-case, exactly — see
 * ADD-OS.postman_collection.json) on every endpoint, admin dashboard included.
 *
 * Read at request time, not import time: `currentLocale` is reactive, so a language
 * switch takes effect on the very next request without a reload.
 *
 * `currency` is read at request time for the same reason, but is **read-only** since
 * the toolbar switch was removed on 2026-09-23 — it resolves to DEFAULT_CURRENCY.
 * See docs/PHASE-3-DEAD-CONTROLS.md §F.
 */
function buildDefaultHeaders(): Record<string, string> {
	let currency: string = DEFAULT_CURRENCY
	try {
		const currencyStore = useCurrencyStore()
		if (currencyStore.currency) {
			currency = currencyStore.currency
		}
	} catch {
		// Outside Pinia or before store initialization — fallback to DEFAULT_CURRENCY
	}

	return {
		"Accept": "application/json",
		"Content-Type": "application/json",
		"lang": currentLocale.value,
		"currency": currency
	}
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
	const base = apiUrl()
	const cleanPath = path.replace(/^\/+/, "")
	const url = new URL(`${base}/${cleanPath}`)
	if (query) {
		Object.entries(query).forEach(([k, v]) => {
			if (v === undefined || v === null) return
			url.searchParams.append(k, String(v))
		})
	}
	return url.toString()
}

/**
 * Bounce to sign-in on a 401 — but ONLY from a route that required a session.
 *
 * This used to be an unconditional `router.push("/login")`, and it broke the two
 * pages a signed-out caller is most likely to be on.
 *
 * `main.ts` awaits `initSession()` before mounting, so `getMe()` runs while the
 * router's FIRST navigation is still in flight. On a 401 the old push started a
 * second navigation; the two cancelled each other, neither completed, and
 * vue-router stayed at START_LOCATION — where `<RouterView>` renders nothing.
 * The result was a blank page with the address bar unchanged and no Vue error,
 * on `/forgot-password` and `/reset-password` specifically: they are the only
 * routes reachable WITHOUT a session that are not `/login` itself, and a push to
 * `/login` from `/login` is a same-location navigation that cancels nothing.
 *
 * Two conditions, both needed:
 *   · `name` is undefined only at START_LOCATION — i.e. before the first
 *     navigation finishes, which is exactly the boot probe.
 *   · `meta.auth` marks the routes that require a session (asserted for every
 *     add-os route by navigation.spec.ts). A 401 on a public auth page is
 *     information for that page to render, not a reason to navigate away.
 *
 * `setLogout()` still runs in every case — clearing stale state is never wrong.
 * Only the navigation is conditional.
 */
function redirectToLoginIfProtected(): void {
	const current = router.currentRoute.value
	if (current.name === undefined) return
	if (!current.meta?.auth) return
	// Carry the page along so signing in again lands back on it.
	router.push({ path: "/login", query: { redirect: current.fullPath } })
}

async function request<T>(
	method: string,
	path: string,
	options?: { query?: Record<string, unknown>; body?: unknown; headers?: Record<string, string>; credentials?: RequestCredentials }
): Promise<T> {
	const url = buildUrl(path, options?.query)
	const headers: Record<string, string> = {
		...buildDefaultHeaders(),
		...(options?.headers || {})
	}

	// Every ADD OS admin-dashboard request rides the Fortify/Sanctum session cookie.
	if (method !== "GET") {
		const xsrfToken = readXsrfToken()
		if (xsrfToken) {
			headers["X-XSRF-TOKEN"] = xsrfToken
		}
	}

	const init: RequestInit = {
		method,
		headers,
		body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
		credentials: options?.credentials || "include"
	}

	const res = await fetch(url, init)
	const text = await res.text()
	if (!res.ok) {
		if (res.status === 401) {
			useAuthStore().setLogout()
			redirectToLoginIfProtected()
		}
		if (res.status === 403) {
			const isProviderInactive =
				text.includes("api.provider.inactive") ||
				text.includes("provider.inactive") ||
				text.includes("غير فعّال") ||
				text.includes("inactive")
			if (isProviderInactive && router.currentRoute.value.path !== "/provider/suspended") {
				router.push({ path: "/provider/suspended" })
			}
		}
		throw new ApiError(res.status, text || res.statusText)
	}

	if (text === "") {
		// empty response body
		return undefined as unknown as T
	}

	const contentType = res.headers.get("content-type") || ""
	if (contentType.includes("application/json")) {
		return JSON.parse(text) as T
	}

	// fallback: return raw text
	return text as unknown as T
}

export async function get<T>(path: string, query?: Record<string, unknown>, headers?: Record<string, string>, credentials?: RequestCredentials): Promise<T> {
	return request<T>("GET", path, { query, headers, credentials })
}

export async function post<T>(path: string, body?: unknown, query?: Record<string, unknown>, headers?: Record<string, string>, credentials?: RequestCredentials): Promise<T> {
	return request<T>("POST", path, { body, query, headers, credentials })
}

export async function put<T>(path: string, body?: unknown, query?: Record<string, unknown>, headers?: Record<string, string>, credentials?: RequestCredentials): Promise<T> {
	return request<T>("PUT", path, { body, query, headers, credentials })
}

export async function patch<T>(path: string, body?: unknown, query?: Record<string, unknown>, headers?: Record<string, string>, credentials?: RequestCredentials): Promise<T> {
	return request<T>("PATCH", path, { body, query, headers, credentials })
}

export async function del<T>(path: string, query?: Record<string, unknown>, headers?: Record<string, string>, credentials?: RequestCredentials): Promise<T> {
	return request<T>("DELETE", path, { query, headers, credentials })
}

export async function uploadFile<T>(
	path: string,
	file: File,
	fieldName = "file",
	extraData?: Record<string, string>
): Promise<T> {
	const formData = new FormData()
	formData.append(fieldName, file)
	if (extraData) {
		for (const [key, value] of Object.entries(extraData)) {
			if (value !== undefined && value !== null) {
				formData.append(key, value)
			}
		}
	}

	const headers: Record<string, string> = {
		Accept: "application/json"
	}
	const xsrfToken = readXsrfToken()
	if (xsrfToken) {
		headers["X-XSRF-TOKEN"] = xsrfToken
	}

	const url = buildUrl(path)
	const res = await fetch(url, {
		method: "POST",
		headers,
		body: formData,
		credentials: "include"
	})

	const text = await res.text()
	if (!res.ok) {
		throw new ApiError(res.status, text)
	}

	try {
		return JSON.parse(text) as T
	} catch {
		return text as unknown as T
	}
}

export { ApiError }
