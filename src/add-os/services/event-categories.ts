import type { EventCategory, EventCategoryPayload } from "@/add-os/modules/events/types/event-category"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<EventCategory, EventCategoryPayload, EventCategoryPayload>("/api/v1/admin/event-categories")

export const listEventCategories = api.list
export const getEventCategory = api.getById
export const createEventCategory = api.create
export const updateEventCategory = api.update
export const removeEventCategory = api.remove
