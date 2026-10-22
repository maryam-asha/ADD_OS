import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * ADD OS — one rule decides who may use the dashboard at all.
 *
 * `mayUseDashboard` in `src/stores/auth.ts`: a provider, any role besides
 * member and provider, or an employee. Sign-in used to keep its own copy —
 * `user.roles.every(r => r === "member")` — written before HR, so it never
 * learned about the employee record the store's copy had gained, and every
 * member who is also an employee was signed straight back out (live HR run,
 * 2026-10-21). Sign-in, session restore and the route guard all call the one
 * rule now; this fails if a copy appears anywhere else.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..")
const SRC = path.join(ROOT, "src")
const RULE_HOME = path.join(SRC, "stores", "auth.ts")

/** An account-wide test over its roles: `roles.every(` / `roles?.every(`, the shape the copy took. */
const ROLES_EVERY = /\broles\??\.every\s*\(/

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (entry.name === "__tests__" || entry.name === "node_modules") continue
			walk(full, out)
		} else if (/\.(?:ts|tsx|vue)$/.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

describe("one door to the dashboard", () => {
	it("catches the copy it is here for (negative control)", () => {
		expect(ROLES_EVERY.test(`const isMemberOnly = Boolean(user.roles?.length && user.roles.every(r => r === "member"))`)).toBe(true)
		expect(ROLES_EVERY.test(`roles.some(role => !NON_DASHBOARD_ROLES.includes(role))`)).toBe(false)
	})

	it("judges an account by its roles only in src/stores/auth.ts", () => {
		const offenders = walk(SRC)
			.filter(file => file !== RULE_HOME)
			.filter(file => ROLES_EVERY.test(readFileSync(file, "utf8")))
			.map(file => path.relative(ROOT, file))
		expect(offenders).toEqual([])
	})

	it.each([
		["sign-in", path.join(SRC, "add-os", "modules", "auth", "views", "LoginPage.vue")],
		["the route guard", path.join(SRC, "add-os", "navigation", "authGuard.ts")],
		["session restore", RULE_HOME]
	])("has %s ask mayUseDashboard", (_label, file) => {
		expect(readFileSync(file, "utf8")).toMatch(/\bmayUseDashboard\b/)
	})
})
