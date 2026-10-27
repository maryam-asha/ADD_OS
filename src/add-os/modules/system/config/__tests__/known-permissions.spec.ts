// src/add-os/modules/system/config/__tests__/known-permissions.spec.ts
import { describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { KNOWN_PERMISSIONS, splitPermission } from "../known-permissions"
import { displayActionName, displayModuleName } from "../roles.config"

/**
 * The role editor labels each module header and each action through
 * `roles.modules.*` / `roles.actions.*`, and an unmapped one falls back to
 * the raw key — in the Arabic UI an English word such as "amenities" beside
 * translated headers. The ar/en parity spec cannot see a key missing from
 * BOTH catalogues, so every permission ADD Core can return is resolved here
 * through a real vue-i18n instance per locale, with no fallback locale, the
 * way `RolesPage.vue` calls the two helpers.
 */
function labellerFor(locale: "ar" | "en") {
	const i18n = createI18n({ legacy: false, locale, messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	const t = (key: string) => i18n.global.t(key)
	const te = (key: string) => i18n.global.te(key, locale)
	return {
		module: (module: string) => displayModuleName(module, t, te),
		action: (action: string) => displayActionName(action, t, te)
	}
}

const split = KNOWN_PERMISSIONS.map(splitPermission)
const modules = [...new Set(split.map(p => p.module))].sort()
const actions = [...new Set(split.map(p => p.action))].sort()

describe("the known permission list", () => {
	it("is not empty, and names each permission once", () => {
		expect(KNOWN_PERMISSIONS.length).toBeGreaterThan(100)
		expect(new Set(KNOWN_PERMISSIONS).size).toBe(KNOWN_PERMISSIONS.length)
	})

	it("splits a name the way ADD Core groups it — module before the first dot, action after", () => {
		expect(splitPermission("reception.check_in")).toEqual({ module: "reception", action: "check_in" })
		expect(splitPermission("hr.payroll.approve")).toEqual({ module: "hr", action: "payroll.approve" })
		expect(splitPermission("wallet-top-ups.create")).toEqual({ module: "wallet-top-ups", action: "create" })
	})
})

describe.each(["ar", "en"] as const)("role editor labels in %s", locale => {
	const label = labellerFor(locale)

	it("gives every module a label, never its raw key", () => {
		expect(modules.filter(m => label.module(m) === m)).toEqual([])
	})

	it("gives every action a label, never its raw key", () => {
		expect(actions.filter(a => label.action(a) === a)).toEqual([])
	})

	it("still falls back to the raw key for a name it does not know — the check above can fail", () => {
		expect(label.module("not-a-module")).toBe("not-a-module")
		expect(label.action("not_an_action")).toBe("not_an_action")
		expect(label.action("not-a-resource.view")).toBe("not-a-resource.view")
	})
})

describe("role editor labels in Arabic", () => {
	const label = labellerFor("ar")

	it("is written in Arabic script, not copied English", () => {
		const arabic = /\p{Script=Arabic}/u
		expect(modules.filter(m => !arabic.test(label.module(m)))).toEqual([])
		expect(actions.filter(a => !arabic.test(label.action(a)))).toEqual([])
	})

	it("labels the module the editor showed raw (amenities)", () => {
		expect(label.module("amenities")).toBe("المرافق")
	})
})
