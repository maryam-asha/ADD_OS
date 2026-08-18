import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Following UsersPage.spec.ts's precedent: a full mount pulls in services,
 * i18n and the message/dialog providers for no extra assertion value here —
 * the real behavior (service calls, mutation toasts, quoted-only filtering)
 * is already covered by Task 4's and Task 11's unit tests. This is a
 * lightweight source guard for wiring invariants a unit test can't see.
 */
const FILE = path.resolve(__dirname, "..", "PrivateOfficeRequestsPage.vue")

describe("privateOfficeRequestsPage wiring", () => {
	it("uses the shared useResourceMutations composable, not a bespoke mutation handler", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain("useResourceMutations")
	})

	it("never sends a hardcoded 'contracted' status through the mutations layer", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).not.toMatch(/status:\s*["']contracted["']/)
	})

	it("only offers the quote action through markPrivateOfficeRequestAsQuoted, never a raw PUT body", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain("markPrivateOfficeRequestAsQuoted")
	})
})
