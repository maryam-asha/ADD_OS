import type { ResourceType, ResourceTypePayload } from "@/add-os/modules/plans/types/resource-type"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<ResourceType, ResourceTypePayload, ResourceTypePayload>("/api/v1/admin/resource-types")

export const listResourceTypes = api.list
export const listResourceTypesPage = api.listPage
export const getResourceType = api.getById
export const createResourceType = api.create
export const updateResourceType = api.update
export const removeResourceType = api.remove
