import type {
	CoworkingPool,
	CoworkingWindow,
	CoworkingWindowPayload
} from "@/add-os/modules/booking/types/coworking"
import { del, get, patch, post } from "./api"

/**
 * The branch's co-working seat pool, and rooms lent to it when the
 * co-working space is overloaded (backend docs/decisions/coworking-seat-pool.md).
 *
 * Every refusal — a room with bookings in the stretch, seats the pool is
 * counting on — arrives as a 422 `{message}` in the requested language, and is
 * shown as-is.
 */

const ADMIN = "/api/v1/admin"

/**
 * Seats open, taken and free now, and over `[from, to)` — district
 * wall-clock, `YYYY-MM-DD HH:mm`. Left out: now until the end of today.
 */
export async function getCoworkingPool(branchId: number, range: { from?: string, to?: string } = {}): Promise<CoworkingPool> {
	const res = await get<{ data: CoworkingPool }>(`${ADMIN}/branches/${branchId}/coworking-pool`, range)
	return res.data
}

/** The room's lent stretches that have not ended, soonest first. */
export async function listCoworkingWindows(spaceId: number): Promise<CoworkingWindow[]> {
	const res = await get<{ data: CoworkingWindow[] }>(`${ADMIN}/spaces/${spaceId}/coworking-windows`)
	return res.data
}

export async function lendRoom(spaceId: number, payload: CoworkingWindowPayload): Promise<CoworkingWindow> {
	const res = await post<{ data: CoworkingWindow }>(`${ADMIN}/spaces/${spaceId}/coworking-windows`, payload)
	return res.data
}

export async function changeCoworkingWindow(id: number, payload: Partial<CoworkingWindowPayload> & { override?: boolean }): Promise<{ message: string }> {
	return patch<{ message: string }>(`${ADMIN}/coworking-windows/${id}`, payload)
}

/** `override` takes the seats back even when the pool is counting on them. */
export async function takeRoomBack(id: number, override = false): Promise<{ message: string }> {
	return del<{ message: string }>(`${ADMIN}/coworking-windows/${id}`, override ? { override: 1 } : undefined)
}
