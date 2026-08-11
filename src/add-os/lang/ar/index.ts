/**
 * ADD OS — Arabic (ar) message bundle.
 *
 * This is the primary locale of the application. It lives under `src/add-os/`
 * (our code), not under `src/lang/locales/` (Pinx vendor code), and is wired
 * into the template's i18n through a single re-export in
 * `src/lang/locales/index.ts`.
 *
 * As ADD OS modules land, each module contributes its own namespaced bundle
 * here (e.g. `memberships.json`, `bookings.json`) and gets merged below, so
 * `src/lang/locales/index.ts` never needs to change again.
 */
import base from "./ar.json"

const messages = {
	...base
	// ...spread future ADD OS module bundles here
}

export default messages
