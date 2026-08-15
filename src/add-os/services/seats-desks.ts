import type { SeatDesk, SeatDeskPayload } from "@/add-os/modules/spatial/types/seat-desk"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<SeatDesk, SeatDeskPayload, SeatDeskPayload>("/api/v1/admin/seats-desks")

export const listSeatsDesks = (spaceId?: number) => api.list(spaceId ? { space_id: spaceId } : undefined)
export const getSeatDesk = api.getById
export const createSeatDesk = api.create
export const updateSeatDesk = api.update
export const removeSeatDesk = api.remove
