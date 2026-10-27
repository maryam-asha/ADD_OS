import { beforeEach, describe, expect, it, vi } from "vitest"

import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"

const state = { permissions: [] as string[] }

vi.mock("@/stores/auth", () => ({
	useAuthStore: () => ({
		hasPermission: (permission: string) => state.permissions.includes(permission)
	})
}))

const {
	can,
	canActivateMemberships,
	canCreateCoupons,
	canCreateRoles,
	canDeleteBusinessHourExceptions,
	canDeleteBusinessHours,
	canDeleteCoupons,
	canDeleteRoles,
	canDeleteSpatialResource,
	canUpdateCoupons,
	canUpdateRoles,
	CASCADING_SPATIAL_RESOURCES,
	SPATIAL_RESOURCE_DELETE_PERMISSION
} = await import("../permissions")

beforeEach(() => {
	state.permissions = []
})

/**
 * Since 2026-10-27 every gate here is the permission ADD Core guards its route
 * with — no role name. Each case grants a custom role exactly the permission
 * and checks the gate opens, and that the role's NAME would not open it: the
 * store mock has no roles at all.
 */
describe("spatial delete", () => {
	it("asks each spatial resource's own <module>.delete, the module being the route's URI segment", () => {
		expect(SPATIAL_RESOURCE_DELETE_PERMISSION).toEqual({
			buildings: "buildings.delete",
			floors: "floors.delete",
			zones: "zones.delete",
			spaces: "spaces.delete",
			seatsDesks: "seats-desks.delete"
		})
	})

	it("marks exactly branches/buildings/floors/zones/spaces as cascading, per the collection's cascade wording", () => {
		expect([...CASCADING_SPATIAL_RESOURCES].sort()).toEqual(["branches", "buildings", "floors", "spaces", "zones"])
		expect(CASCADING_SPATIAL_RESOURCES.has("seatsDesks")).toBe(false)
	})

	it("opens delete for an account holding the permission, whatever its role", () => {
		state.permissions = Object.values(SPATIAL_RESOURCE_DELETE_PERMISSION)
		for (const resource of Object.keys(SPATIAL_RESOURCE_DELETE_PERMISSION) as (keyof typeof SPATIAL_RESOURCE_DELETE_PERMISSION)[]) {
			expect(canDeleteSpatialResource(resource)).toBe(true)
		}
	})

	it("keeps delete closed to an account holding only the view", () => {
		state.permissions = ["buildings.view", "floors.view", "zones.view", "spaces.view", "seats-desks.view"]
		for (const resource of Object.keys(SPATIAL_RESOURCE_DELETE_PERMISSION) as (keyof typeof SPATIAL_RESOURCE_DELETE_PERMISSION)[]) {
			expect(canDeleteSpatialResource(resource)).toBe(false)
		}
	})

	it("gives one resource's delete no reach into another's", () => {
		state.permissions = ["spaces.delete"]
		expect(canDeleteSpatialResource("spaces")).toBe(true)
		expect(canDeleteSpatialResource("buildings")).toBe(false)
	})
})

describe("permission-based gate", () => {
	it("reflects the current user's granted permissions", () => {
		state.permissions = ["branches.view", "branches.create", "branches.update"]
		expect(can("branches.view")).toBe(true)
		expect(can("branches.create")).toBe(true)
		expect(can("branches.update")).toBe(true)
		expect(can("branches.delete")).toBe(false)
	})

	it("denies when there are no permissions", () => {
		expect(can("branches.delete")).toBe(false)
	})
})

describe("role management", () => {
	it("gives each action its own permission", () => {
		state.permissions = ["roles.view", "roles.update"]
		expect(canCreateRoles()).toBe(false)
		expect(canUpdateRoles()).toBe(true)
		expect(canDeleteRoles()).toBe(false)

		state.permissions = ["roles.view", "roles.create", "roles.delete"]
		expect(canCreateRoles()).toBe(true)
		expect(canUpdateRoles()).toBe(false)
		expect(canDeleteRoles()).toBe(true)
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
		expect(enBundle.seatsDesks?.delete?.cascadeWarning).toBeUndefined()
	})
})

describe("business hours", () => {
	it("gates hours and their exceptions on their own delete permissions", () => {
		state.permissions = ["business-hours.delete"]
		expect(canDeleteBusinessHours()).toBe(true)
		expect(canDeleteBusinessHourExceptions()).toBe(false)

		state.permissions = ["business-hour-exceptions.delete"]
		expect(canDeleteBusinessHours()).toBe(false)
		expect(canDeleteBusinessHourExceptions()).toBe(true)
	})
})

describe("memberships", () => {
	it("opens activation on memberships.create", () => {
		state.permissions = ["memberships.view"]
		expect(canActivateMemberships()).toBe(false)
		state.permissions = ["memberships.view", "memberships.create"]
		expect(canActivateMemberships()).toBe(true)
	})
})

describe("coupons", () => {
	it("gates create, update and delete apiece", () => {
		state.permissions = ["coupons.view"]
		expect([canCreateCoupons(), canUpdateCoupons(), canDeleteCoupons()]).toEqual([false, false, false])
		state.permissions = ["coupons.view", "coupons.update"]
		expect([canCreateCoupons(), canUpdateCoupons(), canDeleteCoupons()]).toEqual([false, true, false])
		state.permissions = ["coupons.view", "coupons.create", "coupons.delete"]
		expect([canCreateCoupons(), canUpdateCoupons(), canDeleteCoupons()]).toEqual([true, false, true])
	})
})
