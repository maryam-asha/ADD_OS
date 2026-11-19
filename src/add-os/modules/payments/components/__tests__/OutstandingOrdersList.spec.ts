import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import OutstandingOrdersList from "../OutstandingOrdersList.vue"

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: {} } })

const orders = [
	{
		id: 12,
		title: "Café order #12",
		ordered_at: "2026-10-01T09:10:00+00:00",
		status: "delivered",
		note: "No sugar",
		lines: [
			{ id: 1, name: "Latte", quantity: 2, ordered_quantity: 2, line_points: 20 },
			{ id: 2, name: "Cookie", quantity: 0, ordered_quantity: 1, line_points: 0 }
		],
		items_count: 2,
		amount_points: 20,
		amount: { value: "2", currency: "USD" }
	},
	{ id: 14, title: "Café order #14", ordered_at: null, amount_points: 10, amount: { value: "1", currency: "USD" } }
]

describe("OutstandingOrdersList", () => {
	it("shows each order with its items, the member's note and the bill's own share", () => {
		const wrapper = mount(OutstandingOrdersList, {
			props: { orders, ownAmount: { value: "5", currency: "USD" } },
			global: { plugins: [i18n] }
		})

		expect(wrapper.find("[data-test='own-share']").exists()).toBe(true)
		const rendered = wrapper.findAll("[data-order]")
		expect(rendered.map(order => order.attributes("data-order"))).toEqual(["12", "14"])
		expect(rendered[0]!.text()).toContain("Café order #12")
		expect(rendered[0]!.findAll("[data-line]")).toHaveLength(2)
		expect(rendered[0]!.find("[data-test='line-removed']").exists()).toBe(true)
		expect(rendered[0]!.find("[data-test='order-note']").text()).toContain("No sugar")
		// An order read without its details still shows its title and amount.
		expect(rendered[1]!.find("[data-test='lines']").exists()).toBe(false)
		expect(rendered[1]!.find("[data-test='order-note']").exists()).toBe(false)
	})

	it("leaves out the own share when the bill owes nothing itself", () => {
		const wrapper = mount(OutstandingOrdersList, { props: { orders, ownAmount: null }, global: { plugins: [i18n] } })

		expect(wrapper.find("[data-test='own-share']").exists()).toBe(false)
	})
})
