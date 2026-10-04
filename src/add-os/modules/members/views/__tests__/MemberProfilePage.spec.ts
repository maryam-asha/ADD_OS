import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import MemberProfilePage from "../MemberProfilePage.vue"

const { summaryMock, sessionsMock, bookingsMock, pushMock, empty } = vi.hoisted(() => ({
	summaryMock: vi.fn(),
	sessionsMock: vi.fn(),
	bookingsMock: vi.fn(),
	pushMock: vi.fn(),
	empty: { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } }
}))

vi.mock("@/add-os/services/member-profile", () => ({
	getMemberSummary: summaryMock,
	listMemberSessions: sessionsMock,
	listMemberWalletTransactions: vi.fn().mockResolvedValue(empty),
	listMemberMemberships: vi.fn().mockResolvedValue(empty),
	listMemberServiceRequests: vi.fn().mockResolvedValue(empty),
	listMemberEventRegistrations: vi.fn().mockResolvedValue(empty),
	listMemberPayments: vi.fn().mockResolvedValue(empty)
}))
vi.mock("@/add-os/services/booking-calendar", () => ({ listBookings: bookingsMock }))
vi.mock("@/add-os/modules/members/components/WalletTopUpDialog.vue", () => ({ default: { name: "WalletTopUpDialog", render: () => null } }))
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: pushMock }), useRoute: () => ({ params: { id: "8" } }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function summary() {
	return {
		member: { id: 8, name: "Reem Halabi", phone: "0990000108", email: null, status: "active", companies: [], personal_profile: null, professional_profile: null },
		joined_at: "2026-09-01T10:00:00+03:00",
		last_visit_at: "2026-10-04T05:51:00+03:00",
		profile: {
			account: { phone: "0990000108", email: "reem@example.com", preferred_language: "ar", preferred_currency: "SYP", status: "active", roles: ["member"], joined_at: "2026-09-01T10:00:00+03:00", updated_at: null },
			personal: { bio: "Architect working on reuse projects", city: "Aleppo", gender: "female", avatar_url: null },
			professional: { job_title: "Architect", company_name: "Studio R", industry: "Design" },
			links: { linkedin_url: "https://linkedin.com/in/reem", instagram_url: null, behance_url: null, website_url: null },
			companies: [{ id: 2, legal_name: "Studio R LLC", status: "active", is_admin: true, door_access_enabled: true, joined_at: null }],
			branches: [{ id: 1, name: "Main", is_home_branch: true }],
			privacy_policy_agreed_at: "2026-09-01T10:05:00+03:00",
			devices: [{ platform: "android", last_used_at: "2026-10-04T09:00:00+03:00" }]
		},
		wallet: { points: 500, categories: [{ category: "general", label: "General", points: 500 }] },
		outstanding: { points: 120, amount: { value: "12.00", currency: "USD" }, items: 1 },
		membership: null,
		open_session: { type: "walkin", id: 15, space: "Open Space", checked_in_at: "2026-10-04T10:00:00+03:00" },
		counts: { bookings: 3, upcoming_bookings: 1, sessions: 4, points_spent: 60, service_requests: 0, event_registrations: 0 }
	}
}

function mountPage() {
	return mount(MemberProfilePage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

describe("memberProfilePage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		summaryMock.mockResolvedValue(summary())
		sessionsMock.mockResolvedValue({
			data: [{ type: "walkin", id: 15, reference: null, space: { id: 1, name: "Open Space" }, checked_in_at: "2026-10-04T05:51:00+03:00", checked_out_at: "2026-10-04T07:51:00+03:00", duration_seconds: 7200, plan_covered_seconds: 0, price_points: 60, payment_state: "paid", payment_method: "cash", termination_source: "reception" }],
			meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 }
		})
		bookingsMock.mockResolvedValue(empty)
	})

	it("shows the member's header, what they hold and owe, and that they are inside", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(summaryMock).toHaveBeenCalledWith(8)
		const text = document.body.textContent ?? ""
		expect(text).toContain("Reem Halabi")
		expect(text).toContain("500 pts")
		expect(text).toContain("120 pts")
		expect(text).toContain("Inside now — Open Space")

		wrapper.unmount()
	})

	it("shows the member's whole profile in its own tab", async () => {
		const wrapper = mountPage()
		await flushPromises()

		;(wrapper.vm as unknown as { tab: string }).tab = "profile"
		await flushPromises()

		const text = document.body.textContent ?? ""
		expect(text).toContain("Architect working on reuse projects")
		expect(text).toContain("reem@example.com")
		expect(text).toContain("Studio R LLC")
		expect(text).toContain("Door access")
		expect(text).toContain("Main · home")
		expect(text).toContain("android")
		expect(document.querySelector("a[href='https://linkedin.com/in/reem']")).not.toBeNull()

		wrapper.unmount()
	})

	it("loads a tab only when it is opened, scoped to the member", async () => {
		const wrapper = mountPage()
		await flushPromises()
		expect(sessionsMock).not.toHaveBeenCalled()

		;(wrapper.vm as unknown as { tab: string }).tab = "sessions"
		await flushPromises()
		expect(sessionsMock).toHaveBeenCalledWith(8, expect.objectContaining({ page: 1 }))
		expect(document.body.textContent ?? "").toContain("2:00")

		;(wrapper.vm as unknown as { tab: string }).tab = "bookings"
		await flushPromises()
		expect(bookingsMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 8, page: 1 }))

		wrapper.unmount()
	})
})
