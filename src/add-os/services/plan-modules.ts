import type { PlanModule, PlanModulePayload } from "@/add-os/modules/plans/types/plan-module"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<PlanModule, PlanModulePayload, PlanModulePayload>("/api/v1/admin/plan-modules")

export const listPlanModules = api.list
export const listPlanModulesPage = api.listPage
export const getPlanModule = api.getById
export const createPlanModule = api.create
export const updatePlanModule = api.update
export const removePlanModule = api.remove
