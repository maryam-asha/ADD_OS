import type { ComposerTranslation } from "vue-i18n"
import { describe, expect, it } from "vitest"

import { businessHourExceptionFields, businessHourFields } from "../business-hours.config"

const t = ((key: string) => key) as ComposerTranslation

describe("businessHourFields", () => {
	it("open_time and close_time rules accept HH:mm", () => {
		const fields = businessHourFields(t)
		const openTimeRule = fields.find(field => field.key === "open_time")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(openTimeRule.validator(null, "08:00")).toBe(true)
	})

	it("open_time and close_time rules reject HH:mm:ss and other malformed input", () => {
		const fields = businessHourFields(t)
		const openTimeRule = fields.find(field => field.key === "open_time")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(openTimeRule.validator(null, "08:00:00")).toBeInstanceOf(Error)
		expect(openTimeRule.validator(null, "25:00")).toBeInstanceOf(Error)
		expect(openTimeRule.validator(null, "")).toBeInstanceOf(Error)
	})
})

describe("businessHourExceptionFields", () => {
	it("requires open_time/close_time to match HH:mm when not closed", () => {
		const fields = businessHourExceptionFields(t, false)
		const openTimeRule = fields.find(field => field.key === "open_time")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(openTimeRule.validator(null, "09:00")).toBe(true)
		expect(openTimeRule.validator(null, "")).toBeInstanceOf(Error)
	})

	it("omits open_time/close_time when isClosed is true", () => {
		const closedFields = businessHourExceptionFields(t, true)

		expect(closedFields.some(field => field.key === "open_time")).toBe(false)
		expect(closedFields.some(field => field.key === "close_time")).toBe(false)

		const openFields = businessHourExceptionFields(t, false)

		expect(openFields.some(field => field.key === "open_time")).toBe(true)
		expect(openFields.some(field => field.key === "close_time")).toBe(true)
	})

	it("date field requires YYYY-MM-DD", () => {
		const fields = businessHourExceptionFields(t, false)
		const dateRule = fields.find(field => field.key === "date")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(dateRule.validator(null, "2026-12-25")).toBe(true)
		expect(dateRule.validator(null, "25/12/2026")).toBeInstanceOf(Error)
	})
})
