import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * ADD OS — guard for UsersPage.vue's inline `<n-data-table>`.
 *
 * Unlike the other four resource-list pages (Branches/Buildings/Spaces/
 * Resources), Users doesn't go through the shared `ResourceTable.vue` — it
 * hand-rolls its own `<n-data-table>` (see
 * docs/superpowers/specs/2026-08-16-resource-list-visual-refresh-design.md).
 * The ledger-style uppercase header treatment from `_resource-table.scss`
 * only reaches this table via the `add-ledger-table` class, and nothing else
 * pins it in place.
 *
 * A full component mount isn't worth a new mocking harness for this single
 * assertion — the page pulls in services, i18n and the message provider — so
 * this is a lightweight source-level guard instead, following the same
 * `readFileSync`-and-scan approach as the `no-*` guard specs under
 * `src/add-os/__tests__/`.
 */

const FILE = path.resolve(__dirname, "..", "UsersPage.vue")

describe("usersPage inline table", () => {
	it("applies the add-ledger-table class to its own n-data-table", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain("add-ledger-table")
	})
})
