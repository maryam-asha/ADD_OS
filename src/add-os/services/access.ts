import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { MessageResponse } from "./resource-factory"
import type {
	AccessEvent,
	AccessGrant,
	BookingAccessGrant,
	Device,
	DevicePayload,
	TTLockAccount
} from "@/add-os/modules/access/types/access"
import { get, post } from "./api"
import { toPaginated } from "./pagination"
import { createResourceApi } from "./resource-factory"

const DEVICES = "/api/v1/admin/devices"

const devices = createResourceApi<Device, DevicePayload, DevicePayload>(DEVICES)

/** Every device row; the locks page keeps only locks and gateways. */
export const listDevices = () => devices.list()
export const createDevice = devices.create
export const updateDevice = devices.update
export const removeDevice = devices.remove

/** A new sticker value: the old sticker stops opening anything at once. */
export function regenerateDeviceQr(id: number) {
	return post<MessageResponse>(`${DEVICES}/${id}/regenerate-qr-value`)
}

/** Opens the door through its gateway — no code needed; logged against the staff member. */
export function unlockDevice(id: number) {
	return post<MessageResponse>(`${DEVICES}/${id}/unlock`)
}

export function lockDevice(id: number) {
	return post<MessageResponse>(`${DEVICES}/${id}/lock`)
}

/** Status, battery and pairing from the TTLock account, for every lock and gateway. */
export function syncDevices() {
	return post<MessageResponse>(`${DEVICES}/sync`)
}

/** The account's own locks and gateways, each with the device row already linked to it. */
export async function getTTLockAccount(): Promise<TTLockAccount> {
	return (await get<{ data: TTLockAccount }>(`${DEVICES}/ttlock-account`)).data
}

export async function listAccessEvents(query?: Record<string, unknown>): Promise<Paginated<AccessEvent>> {
	return toPaginated(await get<RawPaginatedResponse<AccessEvent>>("/api/v1/admin/access-events", query))
}

export async function listAccessGrants(query?: Record<string, unknown>): Promise<Paginated<AccessGrant>> {
	return toPaginated(await get<RawPaginatedResponse<AccessGrant>>("/api/v1/admin/access-grants", query))
}

/** Stops a booking's code on the lock; it is not issued again unless the desk re-issues it. */
export function revokeAccessGrant(id: number) {
	return post<MessageResponse>(`/api/v1/admin/access-grants/${id}/revoke`)
}

const RECEPTION = "/api/v1/admin/reception"

/** The booking's latest code, or a 404 ApiError when it has none yet. */
export function getBookingAccessGrant(bookingId: number) {
	return get<BookingAccessGrant>(`${RECEPTION}/bookings/${bookingId}/access-grant`)
}

export function activateAccessGrant(grantId: number) {
	return post<MessageResponse>(`${RECEPTION}/access-grants/${grantId}/activate`)
}

/** A new code in place of an expired, stopped or lost one; the old live one is stopped. */
export async function reissueBookingAccessGrant(bookingId: number): Promise<{ id: number; status: string }> {
	return (await post<{ data: { id: number; status: string } }>(`${RECEPTION}/bookings/${bookingId}/access-grant/reissue`)).data
}
