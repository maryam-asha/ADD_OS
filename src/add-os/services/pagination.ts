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
 * Re-checked against the snapshot pinned 2026-08-25 (docs/api/), and the count
 * below is a correction: this comment previously said "exactly three endpoints
 * are described as paginated in prose". That was true of the 2026-08-24 pin.
 * The 2026-08-25 re-pin brought the Reception Operations folder with it, and
 * there are now FOUR:
 *
 *   `GET /api/v1/admin/error-logs`                          "25 per page"
 *   `GET /api/v1/member-directory`                          "20 per page" (public)
 *   `GET /api/v1/admin/reception/arrival-requests`          no screen built yet
 *   `GET /api/v1/admin/reception/bookings/pending-approval` "25/page"
 *
 * The fourth is the change that matters here: it is the first prose-paginated
 * endpoint this codebase actually implements (`services/reception.ts` →
 * `ApprovalQueuePage.vue`), so the `meta`-present branch of `toPaginated` is no
 * longer dead code reached only by its own unit test.
 *
 * What has NOT changed: still zero occurrences of `meta`, `per_page`,
 * `last_page` or `current_page` as JSON keys anywhere in the file, and still
 * zero saved example responses of any kind for any endpoint — both re-checked
 * directly against the 2026-08-25 pin rather than assumed. So the `meta` shape
 * remains specified-but-unobserved. The backend task that shipped
 * `pending-approval` documents `{current_page, last_page, total}` — note the
 * absent `per_page`, which is exactly the sub-field `toPaginated` falls back
 * to `data.length` for. CLAUDE.md's Open table (Backend row) stays open until
 * one real response body is captured; what it no longer blocks is pagination
 * UI, which now exists against a documented shape.
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

/**
 * What a list endpoint actually sends today: `data` always, `meta`/`links` maybe.
 *
 * `data` is typed `T[]` because that is the contract every caller codes against,
 * but the wire is not that disciplined — see `rowsOf` below. The type is the
 * intent; `rowsOf` is the enforcement.
 */
export interface RawPaginatedResponse<T> {
	data: T[]
	meta?: Partial<PaginationMeta>
	links?: unknown
}

/**
 * The rows of a list response, as an array — always.
 *
 * **Why this exists.** A list endpoint is supposed to send `"data": []` when it
 * has no rows. PHP has no distinct empty-list type, so an empty associative
 * array serializes to `"data": {}` instead, and the same endpoint then sends an
 * object when empty and an array when populated. Observed against a live
 * backend response on 2026-09-23.
 *
 * That difference is not cosmetic. `{}` reaching a caller that expects `T[]`
 * gives `.length === undefined` (so a synthesized `total`/`per_page` of
 * `undefined`, and a pager rendering `NaN`) and a `v-for` over a non-iterable.
 * The table breaks on the empty case — the case least likely to be caught in
 * review and most likely to be a brand-new deployment with no data yet.
 *
 * So every list path funnels through here: anything that is not an array is an
 * empty list. This never "fixes up" a populated response — a real array passes
 * through untouched — and it deliberately does not try to salvage `{"0": {...}}`
 * style objects, because that shape has not been observed and guessing at it
 * would invent rows the backend did not send.
 *
 * The root fix belongs in ADDCore (cast to a list before responding). This stays
 * regardless: one endpoint regressing should not blank a table.
 */
export function rowsOf<T>(data: unknown): T[] {
	return Array.isArray(data) ? (data as T[]) : []
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
	// Not `raw.data.length`: an empty list can arrive as `{}`, whose `.length` is
	// `undefined` and would propagate into `total`/`per_page`. See `rowsOf`.
	const rows = rowsOf<T>(raw.data)
	const total = rows.length

	if (raw.meta && typeof raw.meta.current_page === "number") {
		return {
			data: rows,
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
		data: rows,
		meta: { current_page: 1, last_page: 1, per_page: total, total }
	}
}
