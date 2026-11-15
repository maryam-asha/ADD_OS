import type { Project } from "@/add-os/modules/pm/types/pm"
import { describe, expect, it } from "vitest"
import { mayAddTasks } from "../display"

function projectOf(overrides: Partial<Pick<Project, "is_archived" | "can" | "members">> = {}) {
	return { is_archived: false, can: { manage: false, lead: false }, members: [{ id: 7, name: "Sara", avatar_url: null }], ...overrides }
}

describe("mayAddTasks", () => {
	it("allows a runner, a lead and a member", () => {
		expect(mayAddTasks(projectOf({ can: { manage: true, lead: false } }), 1)).toBe(true)
		expect(mayAddTasks(projectOf({ can: { manage: false, lead: true } }), 1)).toBe(true)
		expect(mayAddTasks(projectOf(), 7)).toBe(true)
	})

	it("refuses a viewer who is none of those, or an unknown account", () => {
		expect(mayAddTasks(projectOf(), 1)).toBe(false)
		expect(mayAddTasks(projectOf(), undefined)).toBe(false)
	})

	it("refuses everyone on an archived project", () => {
		expect(mayAddTasks(projectOf({ is_archived: true, can: { manage: true, lead: true } }), 7)).toBe(false)
	})
})
