/**
 * ADD OS — English (en) message bundle.
 *
 * English is a first-class language, not a fallback: every key must exist in
 * both `ar` and `en`. The parity guard in `../__tests__/messages.spec.ts`
 * fails the build if they drift.
 *
 * Asymmetry worth knowing: the Arabic bundle owns its base file
 * (`../ar/ar.json`) because no Arabic ever shipped with Pinx, while English
 * starts from the template's own `src/lang/locales/en.json`. Both then merge
 * ADD OS module bundles the same way, so the two behave identically from here on.
 *
 * As ADD OS modules land, each contributes its namespaced bundle to BOTH
 * this file and `../ar/index.ts` — never to one alone.
 */
import base from "@/lang/locales/en.json"
import addOs from "./en.json"

const messages = {
	...base,
	...addOs
	// ...spread future ADD OS module bundles here (mirror ../ar/index.ts exactly)
}

export default messages
