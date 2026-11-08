import type { DevicePayload, TTLockAccount } from "@/add-os/modules/access/types/access"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { normalizeDevicePayload, withAccountMac } from "@/add-os/modules/access/config/devices.config"
import {
	getBookingAccessGrant,
	getTTLockAccount,
	listAccessEvents,
	reissueBookingAccessGrant,
	revokeAccessGrant,
	unlockDevice
} from "../access"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

const account: TTLockAccount = {
	locks: [{ lock_id: "33804038", name: "Room A", mac: "21:C8:04:8C:02:D1", battery: 85, has_gateway: false, linked_device_id: null }],
	gateways: [{ gateway_id: "2334668", name: "gateway", mac: "41:48:28:D2:14:3C", is_online: false, lock_count: 0, network_name: null, linked_device_id: null }]
}

describe("access service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("opens a door by POSTing devices/{id}/unlock", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Unlocked." }))

		await expect(unlockDevice(4)).resolves.toEqual({ message: "Unlocked." })
		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/devices/4/unlock", expect.objectContaining({ method: "POST" }))
	})

	it("unwraps the TTLock account from data", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: account }))

		await expect(getTTLockAccount()).resolves.toEqual(account)
	})

	it("reads the access log with its paginator meta", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 2, last_page: 3, per_page: 25, total: 60 } }))

		const page = await listAccessEvents({ device_id: 1, page: 2 })

		expect(page.meta.last_page).toBe(3)
		expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/api/v1/admin/access-events?")
	})

	it("stops a code, reads a booking's code top-level and re-issues it from data", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(jsonResponse({ message: "Stopped." }))
			.mockResolvedValueOnce(jsonResponse({ id: 9, status: "issued", lock_id: 1 }))
			.mockResolvedValueOnce(jsonResponse({ data: { id: 10, status: "issued" } }, 201))

		await revokeAccessGrant(9)
		await expect(getBookingAccessGrant(7)).resolves.toMatchObject({ id: 9, lock_id: 1 })
		await expect(reissueBookingAccessGrant(7)).resolves.toEqual({ id: 10, status: "issued" })

		const urls = vi.mocked(fetch).mock.calls.map(call => String(call[0]))
		expect(urls).toEqual([
			"http://api.test/api/v1/admin/access-grants/9/revoke",
			"http://api.test/api/v1/admin/reception/bookings/7/access-grant",
			"http://api.test/api/v1/admin/reception/bookings/7/access-grant/reissue"
		])
	})
})

describe("device form payload", () => {
	const lock: DevicePayload = { type: "lock", branch_id: 1, space_id: 2, external_ref: "33804038", hardware_mac: null, parent_device_id: null }

	it("takes the MAC TTLock records for the chosen lock or gateway", () => {
		expect(withAccountMac(lock, account).hardware_mac).toBe("21:C8:04:8C:02:D1")
		expect(withAccountMac({ ...lock, type: "gateway", external_ref: "2334668" }, account).hardware_mac).toBe("41:48:28:D2:14:3C")
	})

	it("keeps a typed MAC when no account answers", () => {
		expect(withAccountMac({ ...lock, hardware_mac: "AA:BB" }, null).hardware_mac).toBe("AA:BB")
	})

	it("gives a gateway no room and no parent", () => {
		expect(normalizeDevicePayload({ ...lock, type: "gateway", parent_device_id: 3 })).toMatchObject({ space_id: null, parent_device_id: null })
		expect(normalizeDevicePayload(lock)).toEqual(lock)
	})
})
