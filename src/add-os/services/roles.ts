import type { UserRole } from "@/add-os/modules/system/types/user"
import { get } from "./api"

/** The assignable role names, per `RoleController::index()` — no per-role permissions to fetch yet. */
export async function listRoles(): Promise<UserRole[]> {
	const res = await get<{ data: UserRole[] }>("/api/v1/admin/roles")
	return res.data
}
