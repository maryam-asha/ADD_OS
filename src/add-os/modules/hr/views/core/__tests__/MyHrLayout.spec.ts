import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import { createMemoryHistory, createRouter, RouterView } from "vue-router"
import en from "@/add-os/lang/en/en.json"
import { NAV_SECTIONS, navRouteName } from "@/add-os/navigation/sections"
import MyHrLayout from "../MyHrLayout.vue"

/**
 * ADD OS — My HR's tab bar: one tab per page the menus offer, and the tab of
 * the page shown marked current, a detail page lighting the tab it sits under.
 */

const myHr = NAV_SECTIONS.find(section => section.key === "myHr")!
const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

async function mountAt(path: string) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{
			path: myHr.path,
			component: MyHrLayout,
			children: myHr.pages.map(page => ({ path: page.path, name: navRouteName(myHr, page), component: { render: () => null } }))
		}]
	})
	await router.push(path)
	setActivePinia(createPinia())
	// Mounted from the root view, as App.vue does: the layout is the route's.
	const wrapper = mount(RouterView, { global: { plugins: [i18n, router], stubs: { Icon: true } } })
	await flushPromises()
	return wrapper
}

function current(wrapper: Awaited<ReturnType<typeof mountAt>>): string[] {
	return wrapper.findAll("[aria-current=\"page\"]").map(tab => tab.text())
}

describe("my HR tab bar", () => {
	it("shows a tab for every page the menus offer, and none for a detail page", async () => {
		const wrapper = await mountAt("/my-hr/profile")
		const tabs = wrapper.findAll("nav a")
		expect(tabs.map(tab => tab.text())).toEqual(myHr.pages.filter(page => !page.hidden).map(page => en.nav.pages[page.key as keyof typeof en.nav.pages]))
		expect(tabs[1].attributes("href")).toBe("/my-hr/approvals")
	})

	it("marks the page shown as current", async () => {
		expect(current(await mountAt("/my-hr/leave"))).toEqual([en.nav.pages.hrMyLeave])
	})

	it("marks the pay tab on a payslip, which sits under it", async () => {
		expect(current(await mountAt("/my-hr/pay/payslips/7"))).toEqual([en.nav.pages.hrMyPay])
	})

	it("marks the profile on a certificate, which is opened from it", async () => {
		expect(current(await mountAt("/my-hr/certificates/salary"))).toEqual([en.nav.pages.myProfile])
	})
})
