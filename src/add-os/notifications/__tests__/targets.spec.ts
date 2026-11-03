import { describe, expect, it } from "vitest"

import { DEFAULT_NOTIFICATION_ICON, notificationIcon, notificationTarget } from "../targets"

describe("notificationTarget", () => {
	it.each([
		["booking", "5", "/bookings/all"],
		["company", "12", "/members/companies/12"],
		["event", "3", "/community/events/3/attendees"],
		["invoice", "9", "/payments/invoices"],
		["invoices", "", "/payments/invoices"],
		["membership", "4", "/members/memberships"],
		["office_lease", "2", "/members/office-leases"],
		["payment", "7", "/payments/transactions"],
		["private_office_request", "1", "/address/private-office-requests"],
		["provider_request", "8", "/providers/requests"],
		["service_request", "6", "/address/operations-requests"],
		["wallet", "11", "/plans/wallet"],
		["exchange_rate_suggestion", "1", "/payments/exchange-rates"]
	])("a staff %s notice opens %s", (type, id, path) => {
		expect(notificationTarget("staff", { target_type: type, target_id: id })).toBe(path)
	})

	it.each([
		["company", "/provider/companies"],
		["invoice", "/provider/invoices"],
		["invoices", "/provider/invoices"],
		["membership", "/provider/companies"],
		["office_lease", "/provider/office-leases"],
		["private_office_request", "/provider/office-requests"],
		["provider_request", "/provider/requests"]
	])("a provider %s notice opens %s", (type, path) => {
		expect(notificationTarget("provider", { target_type: type, target_id: "1" })).toBe(path)
	})

	it("opens nothing for an unknown type, a missing id the path needs, or no data", () => {
		expect(notificationTarget("staff", { target_type: "spaceship", target_id: "1" })).toBeNull()
		expect(notificationTarget("staff", { target_type: "company" })).toBeNull()
		expect(notificationTarget("provider", { target_type: "booking", target_id: "1" })).toBeNull()
		expect(notificationTarget("staff", null)).toBeNull()
		expect(notificationTarget("staff", {})).toBeNull()
	})
})

describe("notificationIcon", () => {
	it("picks the icon of the template's group", () => {
		expect(notificationIcon("booking.approved")).toBe("carbon:calendar")
		expect(notificationIcon("hr.leave_approved")).toBe("carbon:user-identification")
	})

	it("falls back to the bell for an unknown group or none", () => {
		expect(notificationIcon("custom")).toBe(DEFAULT_NOTIFICATION_ICON)
		expect(notificationIcon(null)).toBe(DEFAULT_NOTIFICATION_ICON)
	})
})
