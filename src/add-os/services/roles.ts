import type { RoleName, RolePayload, RoleRecord } from "@/add-os/modules/system/types/role"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<RoleRecord, RolePayload, RolePayload>("/api/v1/admin/roles")

export const listRoleRecords = api.list
export const getRole = api.getById
export const createRole = api.create
export const updateRole = api.update
export const removeRole = api.remove

/** Bare role names only — kept for callers (e.g. dropdowns) that don't need the full record. */
export async function listRoles(): Promise<RoleName[]> {
	return (await listRoleRecords()).map(r => r.name)
}
