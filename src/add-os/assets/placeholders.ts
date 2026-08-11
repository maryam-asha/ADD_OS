import localImagePlaceholder from "@/assets/images/placeholder.png"

/**
 * ADD OS — local-only image placeholders.
 *
 * ⚠️ ARCHITECTURAL CONSTRAINT: ADD OS runs on an isolated VPN. No image may be
 * loaded from an external host. A remote placeholder either fails outright
 * (broken image) or, if egress happens to be open, leaks usage patterns out of
 * a closed network. Neither is acceptable.
 *
 * The Pinx template ships `picsum.photos` and `i.pravatar.cc` URLs throughout.
 * The two that sat on the production surface were replaced with the constants
 * below. The remainder live in `src/views/**` showcase pages (category ج) and
 * disappear with the demo pages.
 *
 * Anything needing a placeholder imports from here — never a URL literal.
 */

/**
 * Neutral avatar, inlined as a data URI: zero network requests by construction,
 * and nothing to 404 if an asset path ever changes.
 */
export const AVATAR_PLACEHOLDER =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'>"
	+ "<rect width='56' height='56' rx='28' fill='%23c8ccd2'/>"
	+ "<circle cx='28' cy='22' r='9' fill='%23f2f4f6'/>"
	+ "<path d='M10 52a18 18 0 0 1 36 0z' fill='%23f2f4f6'/>"
	+ "</svg>"

/** Generic image placeholder — the template's own local asset, bundled by Vite. */
export const IMAGE_PLACEHOLDER: string = localImagePlaceholder
