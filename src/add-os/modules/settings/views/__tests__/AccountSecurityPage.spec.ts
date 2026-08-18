import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * ADD OS — source-level guard for AccountSecurityPage.vue, following the same
 * approach as UsersPage.spec.ts: a full mount pulls in three services, a
 * store, two composables, i18n and the message provider, which isn't worth a
 * new mocking harness just to assert wiring that's already covered at the
 * unit level by usePasswordConfirmation.spec.ts and useTwoFactorAuth.spec.ts.
 * This guards the one thing those unit tests can't see: that the PAGE itself
 * actually routes its three sensitive actions through the shared gate,
 * instead of calling the service functions directly and skipping it.
 */

const FILE = path.resolve(__dirname, "..", "AccountSecurityPage.vue")

describe("accountSecurityPage password-confirmation wiring", () => {
	const source = readFileSync(FILE, "utf8")

	it("changes password through withConfirmation, not changePassword() directly", () => {
		expect(source).toMatch(/withConfirmation\(\(\) => changePassword\(/)
	})

	it("passes the gate's withConfirmation into useTwoFactorAuth, not a bespoke one", () => {
		expect(source).toMatch(/useTwoFactorAuth\(withConfirmation\)/)
	})

	it("mounts exactly one ConfirmPasswordModal, shared across every gated action", () => {
		expect(source.match(/<ConfirmPasswordModal/g)).toHaveLength(1)
	})
})
