import type { Floor, FloorPayload } from "@/add-os/modules/spatial/types/floor"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Floor, FloorPayload, FloorPayload>("/api/v1/admin/floors")

export const listFloors = (buildingId?: number) => api.list(buildingId ? { building_id: buildingId } : undefined)
export const getFloor = api.getById
export const createFloor = api.create
export const updateFloor = api.update
export const removeFloor = api.remove
