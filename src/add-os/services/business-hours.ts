import type { BusinessHour, BusinessHourPayload } from "@/add-os/modules/spatial/types/business-hour"
import { createResourceApi } from "./resource-factory"

/** Delete is "Admin-only (not operations)." per the collection — gated in permissions.ts. */
const api = createResourceApi<BusinessHour, BusinessHourPayload, BusinessHourPayload>("/api/v1/admin/business-hours")

export const listBusinessHours = api.list
export const getBusinessHour = api.getById
export const createBusinessHour = api.create
export const updateBusinessHour = api.update
export const removeBusinessHour = api.remove
