import type { SpaceResource, SpaceResourcePayload, SpaceResourceStatusPayload } from "@/add-os/modules/spatial/types/resource"
import { patch } from "./api"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<SpaceResource, SpaceResourcePayload, SpaceResourcePayload>("/api/v1/admin/resources")

export const listResources = (spaceId?: number) => api.list(spaceId ? { space_id: spaceId } : undefined)
export const getResource = api.getById
export const createResource = api.create
export const updateResource = api.update
export const removeResource = api.remove

export function updateResourceStatus(id: number, payload: SpaceResourceStatusPayload) {
	return patch<{ message?: string }>(`/api/v1/admin/resources/${id}/status`, payload)
}
