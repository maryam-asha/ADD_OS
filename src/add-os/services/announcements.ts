import type { Announcement, AnnouncementPayload, AnnouncementWirePayload } from "@/add-os/modules/kiosk/types/announcement"
import type { MessageResponse } from "./resource-factory"
import { toOffsetIso } from "@/add-os/utils/format"
import { createResourceApi } from "./resource-factory"

/**
 * Kiosk banner content — a standard admin resource controller.
 *
 * `list()` returns `T[]` rather than a paginator, and that is correct rather
 * than a truncation: `AdminResourceController::index()` paginates ONLY when the
 * request fills `per_page`, and this caller never does. `warnIfTruncated` is
 * therefore never triggered either, because the response carries no `meta` at
 * all.
 *
 * The list arrives ordered by `sort_order` — `AnnouncementController` overrides
 * `hasOrderColumn()` to `false` (switching OFF the base class's `order` sort)
 * and applies `orderBy('sort_order')` instead. There is no reorder endpoint for
 * this resource, so `sort_order` moves only through the edit form.
 *
 * Endpoints verified against the API snapshot pinned 2026-08-25
 * (`docs/api/ADD-OS.postman_collection.json`, `sha256 86d330d9…`) →
 * Admin (Dashboard) → Website Management → Announcements, and cross-read
 * against the ADDCore controller and its Form Requests.
 */
const api = createResourceApi<Announcement, AnnouncementWirePayload, AnnouncementWirePayload>("/api/v1/admin/announcements")

/**
 * The one place a form value becomes a wire value.
 *
 * Exported for its own test — the offset branch is the part that goes wrong, and
 * asserting it through a fetch body would be testing it by accident.
 *
 * Two conversions, each guarding a real failure:
 *
 *  - A timestamp becomes local wall clock WITH an explicit UTC offset. ADDCore
 *    runs on `'timezone' => 'UTC'`, so a bare `2026-08-26 09:00:00` is read as
 *    09:00 UTC — noon in Damascus. This is a correctness fix, not a formatting
 *    preference.
 *  - An empty optional link becomes `null`. Laravel's `nullable|url` rejects
 *    `""` outright: it is neither absent nor a URL, so "no link" would be
 *    unexpressible from a text input the operator never touched.
 */
export function toWirePayload(payload: AnnouncementPayload): AnnouncementWirePayload {
	const link = payload.link_url.trim()

	return {
		type: payload.type,
		image_url: payload.image_url,
		link_url: link === "" ? null : link,
		sort_order: payload.sort_order,
		starts_at: payload.starts_at === null ? null : toOffsetIso(new Date(payload.starts_at)),
		ends_at: payload.ends_at === null ? null : toOffsetIso(new Date(payload.ends_at)),
		is_active: payload.is_active
	}
}

export const listAnnouncements = (): Promise<Announcement[]> => api.list()

export const createAnnouncement = (payload: AnnouncementPayload): Promise<Announcement> => api.create(toWirePayload(payload))

/** Returns `{message}`, never the updated resource — refetch for the new state. */
export const updateAnnouncement = (id: number, payload: AnnouncementPayload): Promise<MessageResponse> =>
	api.update(id, toWirePayload(payload))

export const removeAnnouncement = api.remove
