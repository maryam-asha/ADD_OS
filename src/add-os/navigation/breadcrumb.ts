import type { RouteLocationNormalizedLoaded, RouteLocationResolved } from "vue-router"

export interface Crumb {
	/** i18n key of the label — the toolbar translates it, so crumbs follow the language. */
	titleKey: string
	path: string
}

/** The catch-all route's name in `@/router`. A prefix that resolves to it is not a page. */
const NOT_FOUND = "NotFound"

function titleKeyOf(route: Pick<RouteLocationResolved, "matched">): string | undefined {
	const meta = route.matched.at(-1)?.meta
	const key = meta?.title ?? meta?.titleKey
	return typeof key === "string" ? key : undefined
}

/**
 * ADD OS: one crumb per URL prefix that is itself a page, labelled with that
 * page's own title key.
 *
 * The template labelled every path segment as `nav.sections.<segment>` and fell
 * back to the capitalised segment, which held for `/<section>/<page>` but not for
 * the detail routes: `/members/individuals/12` rendered "Individuals" and
 * `/bookings/active-sessions/booking/5` rendered "Active-sessions › Booking" — in
 * English under Arabic too, and the "Booking" crumb led to the 404 page.
 * Resolving each prefix through the router instead gives a list page its
 * `nav.pages.*` title and drops route params (`booking`, `12`), which are not
 * pages and have no title to translate.
 */
export function buildCrumbs(
	route: Pick<RouteLocationNormalizedLoaded, "path" | "matched">,
	resolve: (path: string) => Pick<RouteLocationResolved, "name" | "matched">
): Crumb[] {
	const chunks = route.path.split("/").filter(Boolean)
	const crumbs: Crumb[] = []
	let path = ""

	chunks.forEach((chunk, index) => {
		path += `/${chunk}`
		let target: Pick<RouteLocationResolved, "matched"> = route
		if (index < chunks.length - 1) {
			const prefix = resolve(path)
			if (prefix.name === NOT_FOUND) return
			target = prefix
		}

		const titleKey = titleKeyOf(target)
		if (titleKey) crumbs.push({ titleKey, path })
	})

	return crumbs
}
