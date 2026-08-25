/**
 * ADD OS — pagination shape shared by every list endpoint that paginates.
 *
 * ── Locked convention, no longer an assumption ──────────────────────────────
 * Laravel's standard paginator shape is THE project-wide convention for every
 * paginated endpoint (Maryam, 2026-08-25). `toPaginated` reads
 * `meta.current_page`, `meta.last_page`, `meta.per_page` and `meta.total`, and
 * those are the fields the backend sends, unprefixed. A new paginated endpoint
 * inherits this shape — it is not something to re-verify one endpoint at a
 * time.
 *
 * One real response body settled it, `GET /api/v1/member-directory?page=1`:
 *
 *   { "data": [],
 *     "links": { "first": …, "last": …, "prev": null, "next": null },
 *     "meta": { "current_page": 1, "from": null, "last_page": 1,
 *               "links": […], "path": …, "per_page": 20, "to": null,
 *               "total": 0 } }
 *
 * Every field this module reads is present exactly as coded. `from`, `to`,
 * `path` and `meta.links` are extra and ignored. Nothing in `toPaginated`
 * changed as a result — the function was already right; only what we are
 * entitled to claim about it changed.
 *
 * ── What this reverses, and what it gave up ─────────────────────────────────
 * This comment previously called the shape "specified-but-unobserved" and said
 * CLAUDE.md's Open table (Backend row) stayed open "until one real response
 * body is captured". That row is now CLOSED.
 *
 * What closing it gave up: `pending-approval`'s OWN body is still unobserved.
 * The captured response above is `member-directory` — same shape, different
 * endpoint. It stopped being an open question because the convention is locked
 * project-wide, not because that particular endpoint was ever checked. If a
 * paginated endpoint is ever going to disagree, nothing here would catch it
 * early; `ApprovalQueuePage.vue` is where it would surface first.
 *
 * ── The `meta`-absent branch stays, and not as a hedge ──────────────────────
 * `toPaginated` still synthesizes a single page when there is no `meta` at all.
 * That path is NOT insurance against the shape above being wrong. It serves
 * endpoints that do not paginate in the first place — the spatial hierarchy
 * lists return a flat `data` array with no `meta`, and every one of them would
 * break without it. Do not read the decision above as licence to remove it.
 *
 * ── Endpoint census, 2026-08-25 pin ─────────────────────────────────────────
 * Four endpoints are described as paginated in prose in
 * `docs/api/ADD-OS.postman_collection.json`:
 *
 *   `GET /api/v1/admin/error-logs`                          "25 per page"
 *   `GET /api/v1/member-directory`                          "20 per page" (public)
 *   `GET /api/v1/admin/reception/arrival-requests`          no screen built yet
 *   `GET /api/v1/admin/reception/bookings/pending-approval` "25/page"
 *
 * The last is the one this codebase implements (`services/reception.ts` →
 * `ApprovalQueuePage.vue`). The collection itself still ships zero saved example
 * responses for any endpoint — the body quoted above came from a live call, not
 * from the pin.
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
