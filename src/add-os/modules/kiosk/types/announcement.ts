// src/add-os/modules/kiosk/types/announcement.ts

/**
 * Banner content for the reception kiosk display.
 *
 * Shape from `AnnouncementResource` and `StoreAnnouncementRequest` in ADDCore,
 * matching `Admin (Dashboard) → Website Management → Announcements` in the API
 * snapshot pinned 2026-08-25 (`sha256 86d330d9…`).
 *
 * `type` is a plain open string, NOT an enum. The backend model says so in as
 * many words — "a new announcement kind is a row, never a migration or an enum
 * change" — and `news`/`event`/`offer` are the three values seeded today, not
 * the permitted set. Do not narrow this to a union, and do not render it as a
 * fixed select.
 *
 * There is no translatable field here. Unlike `Plan.name`, `type` is one string
 * rather than an `{ar, en}` object, so nothing on this resource goes through
 * the bilingual-label path.
 */
export interface Announcement {
	id: number
	type: string
	image_url: string
	link_url: string | null
	/** The list is ordered by this column, not the `order` column other admin resources use. */
	sort_order: number
	/** UTC ISO from Laravel's `datetime` cast, e.g. "2026-08-26T06:00:00.000000Z". */
	starts_at: string | null
	ends_at: string | null
	is_active: boolean
	created_at: string
}

/**
 * The FORM's shape — deliberately not the wire's.
 *
 * `starts_at`/`ends_at` are epoch millis here because that is what
 * `n-date-picker` natively speaks and what the `datetime` field type binds.
 * `link_url` is a plain string because an untouched text input holds `""`, not
 * `null`. `services/announcements.ts` owns the single conversion to
 * `AnnouncementWirePayload`; nothing else should build one.
 *
 * Extends `Record<string, unknown>` explicitly so it satisfies
 * `ResourceFormDrawer`'s `TModel extends Record<string, unknown>` constraint — a
 * plain interface has no implicit index signature (same reasoning as
 * `SpacePayload` in modules/spatial/types/space.ts).
 */
export interface AnnouncementPayload extends Record<string, unknown> {
	type: string
	image_url: string
	link_url: string
	sort_order: number | null
	starts_at: number | null
	ends_at: number | null
	is_active: boolean
}

/** What actually goes on the wire. Timestamps carry an explicit UTC offset. */
export interface AnnouncementWirePayload {
	type: string
	image_url: string
	link_url: string | null
	sort_order: number | null
	starts_at: string | null
	ends_at: string | null
	is_active: boolean
}
