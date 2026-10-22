import type { RouteRecordNormalized } from "vue-router"
import { describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"
import ar from "../../lang/ar"
import en from "../../lang/en"
import { buildCrumbs } from "../breadcrumb"
import { createAddOsRoutes } from "../routes"

/**
 * ADD OS — every crumb the toolbar can render is a key translated in both
 * languages, on every routed page.
 *
 * Walks the routes `@/router` mounts, not `sections.ts`: the detail routes
 * (`individuals/:id`, `active-sessions/:type/:id`, `events/:eventId/attendees`)
 * are where the template's segment-based labels leaked raw English, and they only
 * exist as routes. The auth, error and suspended screens are left out — they use
 * the blank layout, which has no toolbar. `@/router` itself is too heavy to
 * import here; the catch-all stands in for its `NotFound`.
 */

const ARABIC = /\p{Script=Arabic}/u

function messagesAt(bundle: unknown, path: string): unknown {
	return path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], bundle)
}

/** A concrete URL for a route record — params filled with plausible values. */
function sampleUrl(record: RouteRecordNormalized): string {
	return record.path.replace(/:type\b/g, "booking").replace(/:\w+/g, "7")
}

const NotFound = { render: () => null }

const router = createRouter({
	history: createMemoryHistory(),
	routes: [...createAddOsRoutes(), { path: "/:pathMatch(.*)*", name: "NotFound", component: NotFound }]
})

function crumbsFor(url: string) {
	return buildCrumbs(router.resolve(url), path => router.resolve(path))
}

/** Routed pages. A section's own record is none, even with a frame to render (My HR's tabs). */
function pages(): RouteRecordNormalized[] {
	return router.getRoutes().filter(record => record.components && !record.children.length && !record.path.includes("pathMatch"))
}

describe("toolbar breadcrumb", () => {
	it("labels every crumb on every page with a key that exists in both languages", () => {
		const problems: string[] = []

		for (const record of pages()) {
			const url = sampleUrl(record)
			for (const { titleKey } of crumbsFor(url)) {
				const arText = messagesAt(ar, titleKey)
				if (typeof arText !== "string") problems.push(`${url} → ar missing ${titleKey}`)
				else if (!ARABIC.test(arText)) problems.push(`${url} → ar not Arabic ${titleKey}: ${arText}`)
				if (typeof messagesAt(en, titleKey) !== "string") problems.push(`${url} → en missing ${titleKey}`)
			}
		}

		expect(problems).toEqual([])
	})

	it("gives every page under a section a section crumb and a page crumb", () => {
		const short = pages()
			.filter(record => record.meta.titleKey)
			.map(record => sampleUrl(record))
			.filter(url => crumbsFor(url).length < 2)

		expect(short).toEqual([])
	})

	it.each([
		["/members/individuals/7", ["nav.sections.members", "nav.pages.individuals", "nav.pages.memberProfile"]],
		["/members/companies/7", ["nav.sections.members", "nav.pages.companies", "nav.pages.companyProfile"]],
		["/bookings/active-sessions/booking/7", ["nav.sections.bookings", "nav.pages.activeSessions", "nav.pages.activeSessionDetail"]],
		["/bookings/close-session/booking/7", ["nav.sections.bookings", "nav.pages.closeSession", "nav.pages.closeSessionDetail"]],
		["/community/events/7/attendees", ["nav.sections.community", "nav.pages.events", "nav.pages.eventAttendees"]]
	])("labels a detail page's parent by its page title and skips its params: %s", (url, keys) => {
		expect(crumbsFor(url).map(crumb => crumb.titleKey)).toEqual(keys)
	})

	it("points every crumb at a page that exists", () => {
		const dead = pages()
			.flatMap(record => crumbsFor(sampleUrl(record)))
			.filter(crumb => router.resolve(crumb.path).name === "NotFound")
			.map(crumb => crumb.path)

		expect(dead).toEqual([])
	})
})
