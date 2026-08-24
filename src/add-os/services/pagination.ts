/**
 * ADD OS — pagination shape shared by every list endpoint that paginates.
 *
 * Laravel's paginator `meta` is NOT confirmed for every endpoint from the
 * backend — ADD-OS.postman_collection.json documents some endpoints as
 * "paginated (N per page)" in prose (e.g. Error Logs) but ships no example
 * response with a `meta` block anywhere in the collection. `toPaginated`
 * therefore accepts a response with or without `meta` and never invents a
 * field Laravel doesn't send; a response with no `meta` is treated as a
 * single complete page — synthesized, not observed (see the function doc
 * below for exactly what that means).
 *
 * Re-checked against the snapshot pinned 2026-08-24 (docs/api/, 205 endpoints,
 * up from the 65-endpoint copy this file was originally written against).
 * Still true on the larger snapshot, checked directly rather than assumed:
 * zero occurrences of `meta`, `per_page`, or `last_page` as JSON keys anywhere
 * in the file, and zero saved example responses of any kind for any endpoint.
 * Exactly three endpoints are described as paginated in prose — one more than
 * previously known: `GET /api/v1/admin/error-logs` ("25 per page"),
 * `GET /api/v1/member-directory` ("20 per page" — public, member-facing), and
 * `GET /api/v1/admin/reception/arrival-requests` ("Paginated, status = pending
 * only..." — an admin-dashboard endpoint, but one with no screen built yet).
 * None of the three states a response shape. No endpoint this codebase
 * currently implements is among them, so the "meta absent → synthesize one
 * page" path stays the only one ever exercised in practice — still a guess,
 * not a fact, until one real response body settles it (see CLAUDE.md's Open
 * table, Backend row).
 */

export interface PaginationMeta {
	current_page: number
	last_page: number
	per_page: number
	total: number
}

export interface Paginated<T> {
	data: T[]
	meta: PaginationMeta
	/** Laravel's paginator also sends `links`; untyped and optional since no caller needs it yet. */
	links?: unknown
}

/** What a list endpoint actually sends today: `data` always, `meta`/`links` maybe. */
export interface RawPaginatedResponse<T> {
	data: T[]
	meta?: Partial<PaginationMeta>
	links?: unknown
}

/**
 * Normalizes a list response into `Paginated<T>`.
 *
 * When the backend sends `meta.current_page`, that meta is trusted as-is —
 * any missing sub-field falls back to a value derived from `data`, never
 * invented out of thin air. When there is no `meta` at all — true for every
 * spatial endpoint observed today — this SYNTHESIZES a single-page meta
 * from `data.length`. That synthesis is a guess that "no more pages exist,"
 * not a fact confirmed from the backend.
 */
export function toPaginated<T>(raw: RawPaginatedResponse<T>): Paginated<T> {
	const total = raw.data.length

	if (raw.meta && typeof raw.meta.current_page === "number") {
		return {
			data: raw.data,
			meta: {
				current_page: raw.meta.current_page,
				last_page: raw.meta.last_page ?? 1,
				per_page: raw.meta.per_page ?? total,
				total: raw.meta.total ?? total
			},
			links: raw.links
		}
	}

	return {
		data: raw.data,
		meta: { current_page: 1, last_page: 1, per_page: total, total }
	}
}
