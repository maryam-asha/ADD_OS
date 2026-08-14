import type { Branch, BranchPayload } from "@/add-os/modules/spatial/types/branch"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Branch, BranchPayload, BranchPayload>("/api/v1/admin/branches")

export const listBranches = () => api.list()
export const getBranch = api.getById
export const createBranch = api.create
export const updateBranch = api.update
export const removeBranch = api.remove
