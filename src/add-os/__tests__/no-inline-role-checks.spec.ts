import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * ADD OS — destroy-gating stays in one place.
 *
 * This file guards TWO gating mechanisms that coexist in
 * config/permissions.ts during the in-progress role -> permission migration
 * (see that file's top-of-file comment):
 *
 * - The original role-based mechanism: config/permissions.ts is the only
 *   file allowed to call `isRoleGranted` or compare a role against a
 *   literal for a delete decision.
 * - The newer permission-based mechanism: config/permissions.ts is likewise
 *   the only file allowed to call `hasPermission` or compare a permission
 *   against a literal.
 *
 * If a future view reimplements either check inline, this fails loudly
 * instead of quietly drifting from the single source of truth.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..")
const MODULES_DIR = path.join(ROOT, "src", "add-os", "modules")

const TEXT_EXT = /\.(?:ts|tsx|vue)$/i

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			walk(full, out)
		} else if (TEXT_EXT.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

const files = walk(MODULES_DIR)

describe("destroy gating — no inline role checks under modules/**", () => {
	it("scans a non-empty surface", () => {
		expect(files.length).toBeGreaterThan(10)
	})

	it("never calls isRoleGranted directly — only config/permissions.ts may", () => {
		const offenders = files.filter(f => readFileSync(f, "utf8").includes("isRoleGranted"))
		expect(offenders.map(f => path.relative(ROOT, f))).toEqual([])
	})

	it("never compares a role against a role literal directly", () => {
		const pattern =
			/\b(?:role|userRole)(?:\.value)?\s*(?:===|!==)\s*["'`](?:admin|operations|moderator|all)["'`]|["'`](?:admin|operations|moderator|all)["'`]\s*(?:===|!==)\s*(?:role|userRole)(?:\.value)?/
		const offenders = files.filter(f => pattern.test(readFileSync(f, "utf8")))
		expect(offenders.map(f => path.relative(ROOT, f))).toEqual([])
	})

	it("never calls hasPermission directly — only config/permissions.ts may", () => {
		const offenders = files.filter(f => readFileSync(f, "utf8").includes("hasPermission"))
		expect(offenders.map(f => path.relative(ROOT, f))).toEqual([])
	})

	it("never compares a permission/permissions variable against a permission-string literal directly", () => {
		const pattern =
			/\bpermissions?(?:\.value)?\s*(?:\.includes\(\s*["'`][\w.]+["'`]\s*\)|(?:===|!==)\s*["'`][\w.]+["'`])/
		const offenders = files.filter(f => pattern.test(readFileSync(f, "utf8")))
		expect(offenders.map(f => path.relative(ROOT, f))).toEqual([])
	})
})
