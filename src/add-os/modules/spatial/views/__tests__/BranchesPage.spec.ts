// src/add-os/modules/spatial/views/__tests__/BranchesPage.spec.ts
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "BranchesPage.vue")
const source = readFileSync(FILE, "utf8")

describe("branchesPage wiring", () => {
	it('gates delete/create/update behind can("branches.*"), not the legacy role-based gate', () => {
		expect(source).toContain('from "@/add-os/config/permissions"')
		expect(source).toContain('can("branches.create")')
		expect(source).toContain('can("branches.update")')
		expect(source).toContain('can("branches.delete")')
		expect(source).not.toContain("canDeleteSpatialResource")
	})

	it("hides the create button when the user lacks branches.create", () => {
		expect(source).toContain('<n-button v-if="canCreate" type="primary" @click="openCreate">')
	})

	it("hides the edit action when the user lacks branches.update, matching the existing on-delete pattern", () => {
		expect(source).toContain(':on-edit="canUpdate ? openEdit : undefined"')
	})

	it("hides the delete action when the user lacks branches.delete", () => {
		expect(source).toContain("canDelete ? (async row => { await mutations.remove(row.id) }) : undefined")
	})
})
