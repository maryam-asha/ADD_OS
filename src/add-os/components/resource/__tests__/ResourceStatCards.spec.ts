import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import ResourceStatCards from "../ResourceStatCards.vue"

describe("resourceStatCards", () => {
	it("renders one card per entry, with its label and value", () => {
		const wrapper = mount(ResourceStatCards, {
			props: {
				cards: [
					{ label: "Total users", value: 1847 },
					{ label: "Active", value: "12" }
				]
			}
		})

		expect(wrapper.text()).toContain("Total users")
		expect(wrapper.text()).toContain("1,847")
		expect(wrapper.text()).toContain("Active")
		expect(wrapper.text()).toContain("12")

		wrapper.unmount()
	})

	it("renders no cards when given an empty array", () => {
		const wrapper = mount(ResourceStatCards, { props: { cards: [] } })

		expect(wrapper.findAll(".n-card").length).toBe(0)

		wrapper.unmount()
	})
})
