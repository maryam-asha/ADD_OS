import type { Space, SpacePayload, SpaceStatusPayload } from "@/add-os/modules/spatial/types/space"
import { patch } from "./api"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Space, SpacePayload, SpacePayload>("/api/v1/admin/spaces")

export const listSpaces = (filter?: { building_id?: number; zone_id?: number }) => api.list(filter)
export const getSpace = api.getById
export const createSpace = api.create
export const updateSpace = api.update
export const removeSpace = api.remove

export function updateSpaceStatus(id: number, payload: SpaceStatusPayload) {
	return patch<{ message?: string }>(`/api/v1/admin/spaces/${id}/status`, payload)
}
