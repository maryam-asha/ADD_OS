import { describe, expect, it } from "vitest"
import { codeTypable } from "../itemCode"

describe("item code mode", () => {
	it("lets a code be typed only where the package takes it", () => {
		expect(codeTypable("auto", true)).toBe(false)
		expect(codeTypable("auto", false)).toBe(false)
		expect(codeTypable("on_create", true)).toBe(true)
		expect(codeTypable("on_create", false)).toBe(false)
		expect(codeTypable("editable", true)).toBe(true)
		expect(codeTypable("editable", false)).toBe(true)
	})
})
