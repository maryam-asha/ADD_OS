import { describe, expect, it } from "vitest"

import { DEFAULT_NOTIFICATION_ICON, inboxPagePath, notificationIcon, notificationTarget, notificationTone } from "../targets"

describe("notificationTarget", () => {
	const opens = (path: string, id: string) => ({ path, query: { open: id } })

	it.each([
		["company", "12", "/members/companies/12"],
		["event", "3", "/community/events/3/attendees"],
		["inventory_asset", "40", "/inventory/assets/40"],
		["hr_payslip", "77", "/my-hr/pay/payslips/77"],
		["hr_application", "15", "/hr-talent/applications/15"]
	])("a staff %s notice opens the record's own page", (type, id, path) => {
		expect(notificationTarget("staff", { target_type: type, target_id: id })).toBe(path)
	})

	it.each([
		["booking", "5", "/bookings/all"],
		["invoice", "9", "/payments/invoices"],
		["office_lease", "2", "/members/office-leases"],
		["payment", "7", "/payments/transactions"],
		["private_office_request", "1", "/address/private-office-requests"],
		["provider_request", "8", "/providers/requests"],
		["service_request", "6", "/address/operations-requests"],
		["hr_approval_request", "4", "/my-hr/approvals"]
	])("a staff %s notice opens its list with that record open", (type, id, path) => {
		expect(notificationTarget("staff", { target_type: type, target_id: id })).toEqual(opens(path, id))
	})

	it.each([
		["invoices", "/payments/invoices"],
		["membership", "/members/memberships"],
		["wallet", "/plans/wallet"],
		["exchange_rate_suggestion", "/payments/exchange-rates"],
		["hr_alerts", "/hr/alerts"],
		["hr_training_session", "/my-hr/training"]
	])("a staff %s notice opens its page", (type, path) => {
		expect(notificationTarget("staff", { target_type: type, target_id: "1" })).toBe(path)
	})

	it.each([
		["company", "/provider/companies"],
		["invoice", "/provider/invoices"],
		["office_lease", "/provider/office-leases"],
		["provider_request", "/provider/requests"]
	])("a provider %s notice opens its list with that record open", (type, path) => {
		expect(notificationTarget("provider", { target_type: type, target_id: "1" })).toEqual(opens(path, "1"))
	})

	it.each([
		["invoices", "/provider/invoices"],
		["membership", "/provider/companies"],
		["private_office_request", "/provider/office-requests"]
	])("a provider %s notice opens its page", (type, path) => {
		expect(notificationTarget("provider", { target_type: type, target_id: "1" })).toBe(path)
	})

	it("opens the list alone when a record it could open has no id", () => {
		expect(notificationTarget("staff", { target_type: "invoice" })).toBe("/payments/invoices")
	})

	it("opens nothing for an unknown type, a missing id the path needs, or no data", () => {
		expect(notificationTarget("staff", { target_type: "spaceship", target_id: "1" })).toBeNull()
		expect(notificationTarget("staff", { target_type: "inquiry", target_id: "1" })).toBeNull()
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

describe("notificationTone", () => {
	it("colours operations, money and the rest apart", () => {
		expect(notificationTone("booking.approved")).toBe("primary")
		expect(notificationTone("invoice.issued")).toBe("warning")
		expect(notificationTone("payment.failed")).toBe("warning")
		expect(notificationTone("company.member_joined")).toBe("info")
		expect(notificationTone(null)).toBe("info")
	})
})

describe("inboxPagePath", () => {
	it("opens the account's own inbox page", () => {
		expect(inboxPagePath("staff")).toBe("/dashboard/notifications")
		expect(inboxPagePath("provider")).toBe("/provider/notifications")
	})
})
