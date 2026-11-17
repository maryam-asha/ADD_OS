import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { ErrorLog } from "@/add-os/modules/system/types/error-log"
import { del, get } from "./api"
import { toPaginated } from "./pagination"

const ERROR_LOGS = "/api/v1/admin/error-logs"

/** Newest first, 25 to a page (ADD Core's `ErrorLogController::index`). */
export async function listErrorLogs(query?: Record<string, unknown>): Promise<Paginated<ErrorLog>> {
	return toPaginated(await get<RawPaginatedResponse<ErrorLog>>(ERROR_LOGS, query))
}

export function removeErrorLog(id: number): Promise<void> {
	return del<void>(`${ERROR_LOGS}/${id}`)
}
