import type { Plan, PlanPayload } from "@/add-os/modules/plans/types/plan"
import { createResourceApi } from "./resource-factory"

/** No `PATCH .../status` exists (confirmed 404 live) — toggling `is_active` goes through `update()`. */
const api = createResourceApi<Plan, PlanPayload, PlanPayload>("/api/v1/admin/plans")

export const listPlans = api.list
export const getPlan = api.getById
export const createPlan = api.create
export const updatePlan = api.update
export const removePlan = api.remove
