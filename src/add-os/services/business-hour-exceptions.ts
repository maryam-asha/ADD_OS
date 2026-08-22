import type { BusinessHourException, BusinessHourExceptionPayload } from "@/add-os/modules/spatial/types/business-hour-exception"
import { createResourceApi } from "./resource-factory"

/** Delete is "Admin-only (not operations)." per the collection — gated in permissions.ts. */
const api = createResourceApi<BusinessHourException, BusinessHourExceptionPayload, BusinessHourExceptionPayload>(
	"/api/v1/admin/business-hour-exceptions"
)

export const listBusinessHourExceptions = api.list
export const getBusinessHourException = api.getById
export const createBusinessHourException = api.create
export const updateBusinessHourException = api.update
export const removeBusinessHourException = api.remove
