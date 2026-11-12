import type { ComposerTranslation } from "vue-i18n"
import type { VNode } from "vue"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { describe, expect, it, vi } from "vitest"

import type { SpaceQrActions } from "../spaces.config"
import { buildSpaceColumns, buildSpaceFields, emptySpacePayload } from "../spaces.config"

const t = ((key: string) => key) as ComposerTranslation

/**
 * The two booking rules a space carries for itself
 * (ADDCore docs/decisions/booking-outcomes-and-extension.md): whether its
 * bookings can be extended, and how long before the start a member may still
 * cancel.
 */
describe("space booking rules on the space form", () => {
	const fields = buildSpaceFields(t, [], "en")
	const field = (key: string) => fields.find(candidate => candidate.key === key)

	it("offers a switch for whether bookings on the space can be extended", () => {
		expect(field("allows_extension")).toMatchObject({ type: "switch", labelKey: "spaces.form.allowsExtension" })
	})

	it("offers the cancellation window as whole, non-negative minutes, explained by a hint", () => {
		const window = field("cancellation_window_minutes")

		expect(window).toMatchObject({ type: "number", integer: true, min: 0, labelKey: "spaces.form.cancellationWindowMinutes" })
		expect(window?.required).toBeFalsy()
		expect(window?.hint?.(emptySpacePayload())).toBe("spaces.form.cancellationWindowHint")
	})

	/**
	 * A new space extends, as every space did before the switch existed, and
	 * leaves the window empty so the general setting applies.
	 */
	it("starts a new space extendable and on the general cancellation window", () => {
		expect(emptySpacePayload()).toMatchObject({ allows_extension: true, cancellation_window_minutes: null })
	})
})

describe("space QR column", () => {
	const space = (over: Partial<Space>): Space => ({ id: 1, space_type: "room", ...over }) as Space

	function qrCell(row: Space, over: Partial<SpaceQrActions> = {}) {
		const onPrint = vi.fn()
		const onCreate = vi.fn()
		const column = buildSpaceColumns(t, "en", {}, {}, { canPrint: true, canCreate: true, scanValueById: {}, busyId: null, onPrint, onCreate, ...over }).find(
			c => "key" in c && c.key === "qr_point"
		)
		const cell = (column as { render: (r: Space, i: number) => VNode | string }).render(row, 0)
		return { cell, onPrint, onCreate }
	}

	it("offers Print when the space has a code", () => {
		const { cell, onPrint } = qrCell(space({ id: 4 }), { scanValueById: { 4: "add-place:v1:x" } })
		;(cell as VNode).props?.onClick()
		expect(onPrint).toHaveBeenCalledOnce()
	})

	it("offers Create code when it has none, for offices and halls too", () => {
		for (const type of ["room", "business", "event_hall"] as const) {
			const { cell, onCreate } = qrCell(space({ space_type: type }))
			;(cell as VNode).props?.onClick()
			expect(onCreate).toHaveBeenCalledOnce()
		}
	})

	it("shows a dash for a co-working space, whose codes are per desk", () => {
		expect(qrCell(space({ space_type: "co_space" }), { scanValueById: { 1: "v" } }).cell).toBe("—")
	})

	it("offers no buttons without the permissions", () => {
		expect(qrCell(space({ id: 4 }), { canPrint: false, scanValueById: { 4: "v" } }).cell).toBe("kitchen.qr.hasCode")
		expect(qrCell(space({}), { canCreate: false }).cell).toBe("—")
	})
})
