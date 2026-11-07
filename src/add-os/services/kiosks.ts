import type { IssuedPairingCode, Kiosk, KioskPayload } from "@/add-os/modules/spatial/types/kiosk"
import { del, post } from "./api"
import { createResourceApi } from "./resource-factory"

const BASE = "/api/v1/admin/kiosks"

const api = createResourceApi<Kiosk, KioskPayload, KioskPayload>(BASE)

export const listKiosks = () => api.list()
export const createKiosk = api.create
export const updateKiosk = api.update
export const removeKiosk = api.remove

/** A new code replaces any unused one; a device paired now keeps working until the code is used. */
export async function issueKioskPairingCode(id: number): Promise<IssuedPairingCode> {
	const res = await post<{ data: IssuedPairingCode }>(`${BASE}/${id}/pairing-code`)
	return res.data
}

/** Cuts the paired device off at once: its codes and its signature stop verifying. */
export function revokeKioskSecret(id: number) {
	return del<{ message?: string }>(`${BASE}/${id}/secret`)
}
