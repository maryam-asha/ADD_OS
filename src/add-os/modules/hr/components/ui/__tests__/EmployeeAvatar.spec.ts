import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import EmployeeAvatar from "../EmployeeAvatar.vue"

describe("employeeAvatar", () => {
	afterEach(() => {
		setCurrentLocale("ar")
	})

	it("shows the first letters of the first two names, in the current language", () => {
		setCurrentLocale("en")
		expect(mount(EmployeeAvatar, { props: { name: { ar: "ريم حلبي", en: "Reem Halabi Saad" } } }).text()).toBe("RH")
		setCurrentLocale("ar")
		expect(mount(EmployeeAvatar, { props: { name: { ar: "ريم حلبي", en: "Reem Halabi" } } }).text()).toBe("رح")
	})

	it("is decorative: the name beside it is what a screen reader reads", () => {
		expect(mount(EmployeeAvatar, { props: { name: { ar: "ريم" } } }).attributes("aria-hidden")).toBe("true")
	})
})
