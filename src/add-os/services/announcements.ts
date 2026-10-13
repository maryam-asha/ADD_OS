import type { Announcement, AnnouncementOptions, AnnouncementPayload } from "@/add-os/modules/cms/types/announcement"
import { get } from "./api"
import { createResourceApi } from "./resource-factory"

const BASE = "/api/v1/admin/announcements"

const api = createResourceApi<Announcement, AnnouncementPayload, AnnouncementPayload>(BASE)

export const listAnnouncements = api.list
export const getAnnouncement = api.getById
export const createAnnouncement = api.create
export const updateAnnouncement = api.update
export const removeAnnouncement = api.remove

/** The types and placements, labelled in the request's language. */
export async function getAnnouncementOptions(): Promise<AnnouncementOptions> {
	const res = await get<{ data: AnnouncementOptions }>(`${BASE}/options`)
	return res.data
}
