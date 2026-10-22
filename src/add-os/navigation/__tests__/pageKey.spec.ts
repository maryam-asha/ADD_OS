import { describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"
import { pageKey } from "../pageKey"
import { createAddOsRoutes } from "../routes"

/**
 * ADD OS — the key App.vue remounts the routed page by: the page's route name,
 * except under a section that frames its pages, which keeps one key across
 * them so its frame (My HR's menu) is not rebuilt with every page.
 */

const router = createRouter({ history: createMemoryHistory(), routes: createAddOsRoutes() })

function keyOf(path: string): string {
	return pageKey(router.resolve(path))
}

describe("page key", () => {
	it("keys a page by its route name", () => {
		expect(keyOf("/spatial/branches")).toBe("spatial.branches")
		expect(keyOf("/hr-time/leave-requests")).not.toBe(keyOf("/hr-time/attendance"))
	})

	it("keeps one key across My HR's pages, so its menu stays mounted", () => {
		expect(keyOf("/my-hr/profile")).toBe("/my-hr")
		expect(keyOf("/my-hr/leave")).toBe("/my-hr")
		expect(keyOf("/my-hr/pay/payslips/7")).toBe("/my-hr")
	})
})
