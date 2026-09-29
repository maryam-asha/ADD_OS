import type { SeatDesk, SeatDeskFilter, SeatDeskPayload } from "@/add-os/modules/spatial/types/seat-desk"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<SeatDesk, SeatDeskPayload, SeatDeskPayload>("/api/v1/admin/seats-desks")

/** A bare number is a space id, as before; an object filters by branch or freeness too. */
export function listSeatsDesks(filter?: number | SeatDeskFilter) {
	if (typeof filter === "number") return api.list({ space_id: filter })
	return api.list(filter && Object.keys(filter).length > 0 ? { ...filter } : undefined)
}
export const getSeatDesk = api.getById
export const createSeatDesk = api.create
export const updateSeatDesk = api.update
export const removeSeatDesk = api.remove
