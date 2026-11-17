import type { RouteLocationResolved } from "vue-router"

/**
 * ADD OS — what App.vue keys the routed page by, so a new key remounts it.
 *
 * A page, by its route name, as the template did. A section that frames its
 * pages (My HR's menu, SECTION_LAYOUTS in `routes.ts`) by the section instead:
 * moving between its pages then keeps the frame in place and swaps only the
 * page inside it, which the frame keys itself. Before 2026-10-22 the frame
 * remounted, menu and all, with every page.
 *
 * Added 2026-11-17: the page's key carries its route params too. Keyed by name
 * alone, `/members/individuals/66` and `/members/individuals/53` were the same
 * page, so going from one record straight to another (a pinned page, a link
 * inside a profile) kept the first record on screen: every detail page reads
 * `route.params.id` once, in setup. Query strings are deliberately left out —
 * list filters live there and must not remount the list.
 */
export function pageKey(route: Pick<RouteLocationResolved, "name" | "matched" | "params">): string {
	const [outer] = route.matched
	if (outer?.components?.default && route.matched.length > 1) return outer.path
	return routeInstanceKey(route)
}

/**
 * One routed page instance: its route name plus its params. Also what a
 * section frame keys the page inside it by (`MyHrLayout`, `HrSettingsLayout`).
 */
export function routeInstanceKey(route: Pick<RouteLocationResolved, "name" | "params">): string {
	const name = route.name?.toString() ?? ""
	const params = Object.entries(route.params)
		.map(([key, value]) => `${key}=${Array.isArray(value) ? value.join("/") : value}`)
		.join("&")
	return params ? `${name}?${params}` : name
}
