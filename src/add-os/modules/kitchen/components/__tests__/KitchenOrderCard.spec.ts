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
		lines: [{ sale_item_id: 1, name: "Latte", quantity: 2, unit_price_points: 625, line_points: 1250 }],
		total_points: 1250,
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
		expect(withManage.findAll("[data-action]").map(node => node.attributes("data-action"))).toEqual(["accept", "reject"])

		const without = mountCard(orderOf(), false)
		expect(without.find("[data-test=actions]").exists()).toBe(false)
		expect(without.findAll("button")).toHaveLength(0)
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
})
