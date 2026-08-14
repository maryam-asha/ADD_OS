import type { Building, BuildingPayload } from "@/add-os/modules/spatial/types/building"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Building, BuildingPayload, BuildingPayload>("/api/v1/admin/buildings")

export const listBuildings = (branchId?: number) => api.list(branchId ? { branch_id: branchId } : undefined)
export const getBuilding = api.getById
export const createBuilding = api.create
export const updateBuilding = api.update
export const removeBuilding = api.remove
