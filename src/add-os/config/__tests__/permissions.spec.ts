import { describe, expect, it, vi } from "vitest"

import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"

const state = { role: null as string | null }

vi.mock("@/stores/auth", () => ({
	useAuthStore: () => ({
		isRoleGranted: (roles?: string | string[]) => {
			if (!roles) return true
			const arr = Array.isArray(roles) ? roles : [roles]
			if (arr.includes("all")) return true
			return state.role !== null && arr.includes(state.role)
		}
	})
}))

const { canDeleteSpatialResource, CASCADING_SPATIAL_RESOURCES, SPATIAL_RESOURCE_DELETE_ROLE } = await import("../permissions")

describe("permissions", () => {
	it("maps every spatial resource to admin, per the collection's Admin-only annotation", () => {
		expect(Object.values(SPATIAL_RESOURCE_DELETE_ROLE).every(role => role === "admin")).toBe(true)
		expect(Object.keys(SPATIAL_RESOURCE_DELETE_ROLE).sort()).toEqual([
			"branches",
			"buildings",
			"floors",
			"resources",
			"seatsDesks",
			"spaces",
			"zones"
		])
	})

	it("marks exactly branches/buildings/floors/zones/spaces as cascading, per the collection's cascade wording", () => {
		expect([...CASCADING_SPATIAL_RESOURCES].sort()).toEqual(["branches", "buildings", "floors", "spaces", "zones"])
		expect(CASCADING_SPATIAL_RESOURCES.has("resources")).toBe(false)
		expect(CASCADING_SPATIAL_RESOURCES.has("seatsDesks")).toBe(false)
	})

	it("grants delete to admin on every spatial resource", () => {
		state.role = "admin"
		for (const resource of Object.keys(SPATIAL_RESOURCE_DELETE_ROLE) as (keyof typeof SPATIAL_RESOURCE_DELETE_ROLE)[]) {
			expect(canDeleteSpatialResource(resource)).toBe(true)
		}
	})

	it("denies delete to operations on every spatial resource", () => {
		state.role = "operations"
		for (const resource of Object.keys(SPATIAL_RESOURCE_DELETE_ROLE) as (keyof typeof SPATIAL_RESOURCE_DELETE_ROLE)[]) {
			expect(canDeleteSpatialResource(resource)).toBe(false)
		}
	})

	it("denies delete when there is no role", () => {
		state.role = null
		expect(canDeleteSpatialResource("branches")).toBe(false)
	})
})

describe("cascade-delete warning copy", () => {
	it("every cascading resource has ar+en cascadeWarning text naming what it cascades through", () => {
		for (const resource of CASCADING_SPATIAL_RESOURCES) {
			const enBundle = en as Record<string, { delete?: { cascadeWarning?: string } }>
			const arBundle = ar as Record<string, { delete?: { cascadeWarning?: string } }>
			const enText = enBundle[resource]?.delete?.cascadeWarning
			const arText = arBundle[resource]?.delete?.cascadeWarning

			expect(enText, `${resource}.delete.cascadeWarning missing in en`).toBeTruthy()
			expect(arText, `${resource}.delete.cascadeWarning missing in ar`).toBeTruthy()
			expect(enText!.toLowerCase(), `${resource} en text should say it also deletes children`).toContain("also delete")
			expect(arText!, `${resource} ar text should say "أيضاً"`).toContain("أيضاً")
		}
	})

	it("does not add cascadeWarning to non-cascading resources", () => {
		const enBundle = en as Record<string, { delete?: { cascadeWarning?: string } }>
		expect(enBundle.resources?.delete?.cascadeWarning).toBeUndefined()
		expect(enBundle.seatsDesks?.delete?.cascadeWarning).toBeUndefined()
	})
})
