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

async function request<T>(
	method: string,
	path: string,
	options?: { query?: Record<string, unknown>; body?: unknown; headers?: Record<string, string>; credentials?: RequestCredentials }
): Promise<T> {
	const url = buildUrl(path, options?.query)
	const headers: Record<string, string> = {
		"Accept": "application/json",
		"Content-Type": "application/json",
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

export { ApiError }
