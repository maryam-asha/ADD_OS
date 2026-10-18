import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import HrDrawer from "../HrDrawer.vue"

function drawerProps(locale: "ar" | "en", size?: "md" | "lg") {
	setCurrentLocale(locale)
	const wrapper = mount(HrDrawer, { props: { title: "T", show: false, size } })
	const props = wrapper.findComponent({ name: "Drawer" }).props() as { placement: string; width: string }
	wrapper.unmount()
	return props
}

describe("hrDrawer", () => {
	afterEach(() => {
		setCurrentLocale("ar")
	})

	it("slides in from the side reading ends on: left in Arabic, right in English", () => {
		expect(drawerProps("ar").placement).toBe("left")
		expect(drawerProps("en").placement).toBe("right")
	})

	it("never grows past the screen", () => {
		expect(drawerProps("en").width).toBe("min(35rem, 100vw)")
		expect(drawerProps("en", "lg").width).toBe("min(40rem, 100vw)")
	})
})
