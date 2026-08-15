import type { Zone, ZonePayload } from "@/add-os/modules/spatial/types/zone"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Zone, ZonePayload, ZonePayload>("/api/v1/admin/zones")

export const listZones = (floorId?: number) => api.list(floorId ? { floor_id: floorId } : undefined)
export const getZone = api.getById
export const createZone = api.create
export const updateZone = api.update
export const removeZone = api.remove
