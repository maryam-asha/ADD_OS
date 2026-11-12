// src/add-os/modules/spatial/config/__tests__/seats-desks.config.spec.ts
import type { VNode } from "vue"
import type { SeatDesk } from "@/add-os/modules/spatial/types/seat-desk"
import { describe, expect, it, vi } from "vitest"
import { buildSeatDeskColumns, buildSeatDeskFields, emptySeatDeskPayload } from "../seats-desks.config"

const t = (key: string) => key
const desk = (over: Partial<SeatDesk>): SeatDesk => ({ id: 1, space_id: 1, code: "D-1", label: "Desk", qr_point_id: null, qr_scan_value: null, ...over })

function qrCell(row: SeatDesk, over: { canPrint?: boolean; canCreate?: boolean } = {}) {
	const onPrint = vi.fn()
	const onCreate = vi.fn()
	const column = buildSeatDeskColumns(t as never, { canPrint: true, canCreate: true, busyId: null, onPrint, onCreate, ...over }).find(
		c => "key" in c && c.key === "qr_scan_value"
	)
	const cell = (column as { render: (r: SeatDesk, i: number) => VNode | string }).render(row, 0)
	return { cell, onPrint, onCreate }
}

describe("desk QR column", () => {
	it("offers Print when the desk has a code", () => {
		const { cell, onPrint } = qrCell(desk({ qr_point_id: 2, qr_scan_value: "add-place:v1:x" }))
		;(cell as VNode).props?.onClick()
		expect(onPrint).toHaveBeenCalledOnce()
	})

	it("offers Create code when it has none", () => {
		const { cell, onCreate } = qrCell(desk({}))
		;(cell as VNode).props?.onClick()
		expect(onCreate).toHaveBeenCalledOnce()
	})

	it("falls back to text without the permissions", () => {
		expect(qrCell(desk({ qr_scan_value: "v" }), { canPrint: false }).cell).toBe("kitchen.qr.hasCode")
		expect(qrCell(desk({}), { canCreate: false }).cell).toBe("—")
	})
})

describe("desk form", () => {
	it("has no manual QR point input", () => {
		expect(buildSeatDeskFields(t as never, [], "en").map(f => f.key)).not.toContain("qr_point_id")
		expect(emptySeatDeskPayload()).not.toHaveProperty("qr_point_id")
	})
})
