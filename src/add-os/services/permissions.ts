import type { PermissionModule } from "@/add-os/modules/system/types/role"
import { get } from "./api"

/** Every grantable permission, grouped by module — feeds the role editor. */
export async function listPermissionModules(): Promise<PermissionModule[]> {
	const res = await get<{ data: PermissionModule[] }>("/api/v1/admin/permissions")
	return res.data
}
