import type { Event, EventPayload } from "@/add-os/modules/events/types/event"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Event, EventPayload, EventPayload>("/api/v1/admin/events")

export const listEvents = api.list
export const getEvent = api.getById
export const createEvent = api.create
export const updateEvent = api.update
export const removeEvent = api.remove
