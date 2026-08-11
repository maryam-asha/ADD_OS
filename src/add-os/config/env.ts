/**
 * ADD OS — environment configuration, with no silent fallbacks.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  An unset API base that resolves to somebody else's host is not a typo.  ║
 * ║  It is an exfiltration path. So there is no default, ever.               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * The Pinx template shipped `VITE_API_URL` pointing at the third-party domain
 * `api.org` (bare hostname on purpose — see no-external-urls.spec.ts) as the
 * fallback API base. On an isolated network that either fails or, if a port is
 * open, sends ADD OS traffic to a host nobody here controls. It is gone, and
 * nothing replaces it: an unset value must FAIL, not degrade.
 *
 * ── Why production throws and development warns ─────────────────────────────
 * A production build with no API host is a misconfigured deployment and must not
 * start. In development the guard warns instead, because ADD OS has no API layer
 * yet and a hard throw would block work on screens that make no requests. The
 * important half is identical in both: **no host is ever invented.** `apiUrl()`
 * throws at the call site whenever the value is missing, so the first request to
 * be written cannot accidentally inherit a default.
 *
 * Tighten to an unconditional startup throw once the API layer lands.
 */

const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined

/** Empty string counts as unset — a blank line in `.env` is not configuration. */
function isSet(value: string | undefined): value is string {
	return typeof value === "string" && value.trim() !== ""
}

const MISSING_API_URL =
	"VITE_API_URL is not set.\n\n" +
	"  ADD OS has no default API host, deliberately: a fallback that points at a\n" +
	"  third-party domain would send internal traffic off the isolated network.\n\n" +
	"  Fix:  cp .env.example .env   then set VITE_API_URL to the internal host.\n"

/**
 * Verifies configuration before the app mounts. Called from `src/main.ts`.
 *
 * Throws in a production build, warns in development. Never substitutes a value.
 */
export function assertEnv(): void {
	if (isSet(RAW_API_URL)) return

	if (import.meta.env.PROD) {
		throw new Error(`[ADD OS] ${MISSING_API_URL}`)
	}

	console.warn(
		`[ADD OS] ${MISSING_API_URL}\n` +
			"  Development build — continuing, because no screen makes a request yet.\n" +
			"  A PRODUCTION build with this unset will refuse to start.\n"
	)
}

/**
 * The API base URL. Throws when unset rather than returning a fallback.
 *
 * Every request must go through this. Reading `import.meta.env.VITE_API_URL`
 * directly reintroduces exactly the silent-fallback path this module exists to
 * close.
 */
export function apiUrl(): string {
	if (!isSet(RAW_API_URL)) {
		throw new Error(`[ADD OS] ${MISSING_API_URL}`)
	}
	return RAW_API_URL.replace(/\/+$/, "")
}

/** True when an API host is configured. For feature gating, never for a fallback. */
export function hasApiUrl(): boolean {
	return isSet(RAW_API_URL)
}
