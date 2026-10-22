import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { describe, expect, it } from "vitest"
import { h } from "vue"
import { createI18n } from "vue-i18n"
import { createMemoryHistory, createRouter, RouterView } from "vue-router"
import en from "@/add-os/lang/en/en.json"
import { pageKey } from "@/add-os/navigation/pageKey"
import { NAV_SECTIONS, navRouteName } from "@/add-os/navigation/sections"
import MyHrLayout from "../MyHrLayout.vue"

/**
 * ADD OS — My HR's vertical menu: one entry per page the menus offer, and the
 * entry of the page shown selected, a detail page lighting the one it sits under.
 */

const myHr = NAV_SECTIONS.find(section => section.key === "myHr")!
const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

async function mountAt(path: string) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{
			path: myHr.path,
			component: MyHrLayout,
			children: myHr.pages.map(page => ({ path: page.path, name: navRouteName(myHr, page), component: { render: () => h("p", { class: "page" }, page.key) } }))
		}]
	})
	await router.push(path)
	setActivePinia(createPinia())
	// Mounted from a root view keyed as App.vue keys it: the layout is the route's.
	const root = { render: () => h(RouterView, null, { default: ({ Component, route }: { Component: unknown, route: Parameters<typeof pageKey>[0] }) => h(Component as never, { key: pageKey(route) }) }) }
	const wrapper = mount(root, { global: { plugins: [i18n, router], stubs: { Icon: true } } })
	await flushPromises()
	return Object.assign(wrapper, { router })
}

function current(wrapper: Awaited<ReturnType<typeof mountAt>>): string[] {
	return wrapper.findAll(".n-menu-item-content--selected").map(entry => entry.text())
}

describe("my HR vertical menu", () => {
	it("lists every page the menus offer, as links, and no detail page", async () => {
		const wrapper = await mountAt("/my-hr/profile")
		const tabs = wrapper.findAll(".n-menu a")
		expect(tabs.map(tab => tab.text())).toEqual(myHr.pages.filter(page => !page.hidden).map(page => en.nav.pages[page.key as keyof typeof en.nav.pages]))
		expect(tabs[1].attributes("href")).toBe("/my-hr/approvals")
	})

	it("selects the page shown", async () => {
		expect(current(await mountAt("/my-hr/leave"))).toEqual([en.nav.pages.hrMyLeave])
	})

	it("selects pay on a payslip, which sits under it", async () => {
		expect(current(await mountAt("/my-hr/pay/payslips/7"))).toEqual([en.nav.pages.hrMyPay])
	})

	it("selects the profile on a certificate, which is opened from it", async () => {
		expect(current(await mountAt("/my-hr/certificates/salary"))).toEqual([en.nav.pages.myProfile])
	})

	it("keeps the menu in place while the page beside it changes", async () => {
		const wrapper = await mountAt("/my-hr/profile")
		const menu = wrapper.find("aside").element
		await wrapper.router.push("/my-hr/leave")
		await flushPromises()
		expect(wrapper.find("aside").element).toBe(menu)
		expect(wrapper.find(".page").text()).toBe("hrMyLeave")
		expect(current(wrapper)).toEqual([en.nav.pages.hrMyLeave])
	})
})
