import type { RouteLocationResolved } from "vue-router"

/**
 * ADD OS — what App.vue keys the routed page by, so a new key remounts it.
 *
 * A page, by its route name, as the template did. A section that frames its
 * pages (My HR's menu, SECTION_LAYOUTS in `routes.ts`) by the section instead:
 * moving between its pages then keeps the frame in place and swaps only the
 * page inside it, which the frame keys itself. Before 2026-10-22 the frame
 * remounted, menu and all, with every page.
 */
export function pageKey(route: Pick<RouteLocationResolved, "name" | "matched">): string {
	const [outer] = route.matched
	if (outer?.components?.default && route.matched.length > 1) return outer.path
	return route.name?.toString() ?? ""
}
