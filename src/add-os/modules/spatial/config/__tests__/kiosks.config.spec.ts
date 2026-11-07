import type { Space } from "@/add-os/modules/spatial/types/space"
import { describe, expect, it } from "vitest"
import { buildKioskFields, coworkingSpaceOptions, emptyKioskPayload, kioskToPayload, spaceLabel } from "../kiosks.config"

const t = ((key: string) => key) as never

function space(id: number, space_type: Space["space_type"], name: Space["name"] = { ar: `مساحة ${id}`, en: `Space ${id}` }): Space {
	return { id, space_type, name } as Space
}

describe("kiosks config", () => {
	it("offers only coworking spaces, since a kiosk serves nothing else", () => {
		const options = coworkingSpaceOptions([space(1, "co_space"), space(2, "room"), space(3, "event_hall")], t, "en")

		expect(options).toEqual([{ label: "Space 1", value: 1 }])
	})

	it("names a space in the reader's language", () => {
		expect(spaceLabel(space(1, "co_space"), t, "ar")).toBe("مساحة 1")
	})

	it("names a space with no name by its type and id, so two of them stay apart", () => {
		expect(spaceLabel(space(7, "co_space", null), t, "en")).toBe("spaces.spaceType.co_space #7")
	})

	it("asks for the space when the account can read the spaces", () => {
		const keys = buildKioskFields([{ label: "A", value: 1 }], true, t).map(field => field.key)

		expect(keys).toEqual(["name", "space_id", "is_active"])
	})

	it("leaves the space out for an account that cannot read the spaces, instead of an empty picker", () => {
		const keys = buildKioskFields([], false, t).map(field => field.key)

		expect(keys).toEqual(["name", "is_active"])
	})

	it("explains an empty picker when no coworking space exists yet", () => {
		const field = buildKioskFields([], true, t).find(item => item.key === "space_id")!

		expect(field.hint!(emptyKioskPayload())).toBe("kiosks.form.noCoworkingSpaces")
	})

	it("starts a new kiosk active, with no space chosen", () => {
		expect(emptyKioskPayload()).toEqual({ name: "", space_id: null, is_active: true })
	})

	it("edits only what the API accepts", () => {
		const payload = kioskToPayload({
			id: 3,
			name: "Main entrance",
			space_id: 9,
			is_active: false,
			is_paired: true,
			paired_at: null,
			last_used_at: null,
			created_at: null
		})

		expect(payload).toEqual({ name: "Main entrance", space_id: 9, is_active: false })
	})
})
