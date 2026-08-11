import type { IconifyJSON } from "@iconify/vue"
import { addCollection } from "@iconify/vue"
import generated from "./icons.generated.json"

/**
 * ADD OS — registers every icon the app uses, locally.
 *
 * ⚠️ ARCHITECTURAL CONSTRAINT: ADD OS runs on an isolated VPN.
 *
 * `@iconify/vue` resolves an unknown icon by calling the remote host
 * `api.iconify.design` (bare hostname on purpose — see no-external-urls.spec.ts).
 * On a closed network that request fails and the UI renders with NO icons at
 * all — and if egress happens to be open, it leaks usage to a third party.
 * Same class of problem as the remote placeholder images (VENDOR-MANIFEST §3.12),
 * but affecting every icon in the product rather than two.
 *
 * Two changes close it, and both are needed:
 *   1. this function, called from `main.ts` before mount, and
 *   2. `Icon.vue` reading with `getIcon()` — a local lookup — instead of
 *      `loadIcon()`, which is the function that performs the fetch.
 *
 * Registration alone would not be enough: any name not in the bundle would
 * still fall through to the network. Using `getIcon` removes that path entirely,
 * so a missing icon is a visible console error instead of a silent request.
 *
 * `icons.generated.json` is produced by `npm run icons` — see scripts/build-icons.js.
 * Do not edit it by hand.
 */
export function registerLocalIcons(): void {
	for (const collection of Object.values(generated as Record<string, unknown>)) {
		addCollection(collection as IconifyJSON)
	}
}
