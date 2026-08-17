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
