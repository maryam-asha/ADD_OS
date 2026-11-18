import type { KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { formatNumber, formatTime } from "@/add-os/utils/format"
import KitchenOrderCard from "../KitchenOrderCard.vue"

vi.mock("@/add-os/utils/format", async importOriginal => {
	const actual = await importOriginal<typeof import("@/add-os/utils/format")>()
	return { ...actual, formatNumber: vi.fn(actual.formatNumber), formatTime: vi.fn(actual.formatTime) }
})

function orderOf(overrides: Partial<KitchenOrder> = {}): KitchenOrder {
	return {
		id: 41,
		status: "pending",
		source: "qr",
		delivery: { type: "desk", label: "D-12", note: null },
		bill: { type: "walkin", id: 3 },
		route: "kitchen",
		payment: { choice: "bill", wallet_owner_type: null, paid: false },
		cash_due_points: null,
		cash_due_amounts: null,
		cash_return: null,
		lines: [{ id: 11, sale_item_id: 1, name: "Latte", image_url: null, quantity: 2, ordered_quantity: 2, unit_price_points: 625, line_points: 1250 }],
		items_count: 2,
		total_points: 1250,
		adjusted: false,
		ordered_total_points: 1250,
		rejection_reason: null,
		cancelled_by: null,
		timestamps: { submitted_at: "2026-11-11T09:00:00+03:00", accepted_at: null, ready_at: null, delivered_at: null },
		paid: false,
		member: { id: 9, name: "Sara Haddad", phone: null },
		waited_seconds: 600,
		...overrides
	}
}

function mountCard(order: KitchenOrder, canManage = true, locale: "ar" | "en" = "en") {
	const i18n = createI18n({ legacy: false, locale, messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(KitchenOrderCard, { props: { order, canManage, now: 0, fetchedAt: 0 }, global: { plugins: [i18n] } })
}

describe("kitchenOrderCard", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("hides_actions_without_manage", () => {
		const withManage = mountCard(orderOf(), true)
		expect(withManage.findAll("[data-action]").map(node => node.attributes("data-action"))).toEqual(["accept", "adjust", "reject"])

		const without = mountCard(orderOf(), false)
		expect(without.find("[data-test=actions]").exists()).toBe(false)
		expect(without.findAll("button")).toHaveLength(0)
	})

	it("an_order_accepted_with_changes_shows_what_was_ordered", () => {
		const wrapper = mountCard(orderOf({
			status: "preparing",
			adjusted: true,
			items_count: 1,
			total_points: 625,
			ordered_total_points: 1875,
			lines: [
				{ id: 11, sale_item_id: 1, name: "Latte", image_url: null, quantity: 1, ordered_quantity: 2, unit_price_points: 625, line_points: 625 },
				{ id: 12, sale_item_id: 2, name: "Cookie", image_url: null, quantity: 0, ordered_quantity: 1, unit_price_points: 625, line_points: 0 }
			]
		}))

		expect(wrapper.get("[data-test=adjusted]").text()).toBe("Accepted with changes")
		expect(wrapper.get("[data-line='11'] [data-test=line-ordered]").text()).toBe("(ordered 2)")
		expect(wrapper.find("[data-line='12'] [data-test=line-removed]").exists()).toBe(true)
		expect(wrapper.get("[data-test=ordered-total]").text()).toBe("was 1,875 points")
	})

	it("an_unknown_member_and_arabic_plural_wait", () => {
		const gone = mountCard(orderOf({ member: null }))
		expect(gone.text()).toContain("Unknown member")

		// Two minutes is the dual in Arabic, three the few form.
		expect(mountCard(orderOf({ waited_seconds: 120 }), true, "ar").get("[data-test=waited]").text()).toContain("دقيقتين")
		expect(mountCard(orderOf({ waited_seconds: 180 }), true, "ar").get("[data-test=waited]").text()).toContain("دقائق")
	})

	it("shows_full_note", () => {
		const note = "الرجاء إحضار الطلب إلى الطاولة الكبيرة قرب النافذة في الطابق الثاني، بجانب غرفة الاجتماعات الزجاجية، وشكرًا جزيلًا لكم على تعبكم"
		const wrapper = mountCard(orderOf({ delivery: { type: "note", label: note, note } }), true, "ar")

		const shown = wrapper.get("[data-test=note]")
		expect(shown.text()).toBe(note)
		expect(shown.attributes("dir")).toBe("auto")
		expect(shown.classes()).toEqual(expect.arrayContaining(["whitespace-pre-wrap", "break-words"]))
		expect(shown.classes().some(name => name === "truncate" || name.startsWith("line-clamp"))).toBe(false)
	})

	it("points_and_times_use_format_utils", () => {
		const wrapper = mountCard(orderOf())

		expect(formatNumber).toHaveBeenCalledWith(1250)
		expect(formatNumber).toHaveBeenCalledWith(2)
		expect(formatNumber).toHaveBeenCalledWith(10)
		expect(formatTime).toHaveBeenCalledWith("2026-11-11T09:00:00+03:00")
		expect(wrapper.get("[data-test=total]").text()).toBe("1,250 points")
		expect(wrapper.get("[data-test=waited]").text()).toBe("Waiting 10 min")
	})

	it("card_shows_paid_or_on_the_bill", () => {
		const tag = (order: KitchenOrder) => mountCard(order).get("[data-test=payment]").text()
		expect(tag(orderOf())).toBe("On the bill")
		expect(tag(orderOf({ payment: { choice: "wallet", wallet_owner_type: "user", paid: true } }))).toBe("Paid from wallet")
		expect(tag(orderOf({ payment: { choice: "wallet", wallet_owner_type: "company", paid: true } }))).toBe("Paid from company wallet")
		expect(tag(orderOf({ payment: { choice: "card", wallet_owner_type: null, paid: true } }))).toBe("Paid by card")
		expect(tag(orderOf({ payment: { choice: "cash", wallet_owner_type: null, paid: true } }))).toBe("Paid in cash")
		expect(mountCard(orderOf({ payment: { choice: "wallet", wallet_owner_type: "user", paid: true } }), true, "ar").get("[data-test=payment]").text()).toBe("مدفوع من المحفظة")
	})
})
