import type { Announcement, AnnouncementPayload } from "@/add-os/modules/cms/types/announcement"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Announcement, AnnouncementPayload, AnnouncementPayload>(
	"/api/v1/admin/announcements"
)

export const listAnnouncements = api.list
export const getAnnouncement = api.getById
export const createAnnouncement = api.create
export const updateAnnouncement = api.update
export const removeAnnouncement = api.remove
