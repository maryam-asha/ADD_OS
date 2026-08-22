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

	it("skips the HH:mm requirement for open_time/close_time when closed", () => {
		const fields = businessHourExceptionFields(t, true)
		const openTimeRule = fields.find(field => field.key === "open_time")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(openTimeRule.validator(null, "")).toBe(true)
		expect(openTimeRule.validator(null, null)).toBe(true)
	})

	it("disables open_time/close_time when the model's is_closed is true", () => {
		const fields = businessHourExceptionFields(t, true)
		const openTimeField = fields.find(field => field.key === "open_time")!

		expect(openTimeField.disabledWhen?.({ is_closed: true } as never)).toBe(true)
		expect(openTimeField.disabledWhen?.({ is_closed: false } as never)).toBe(false)
	})

	it("date field requires YYYY-MM-DD", () => {
		const fields = businessHourExceptionFields(t, false)
		const dateRule = fields.find(field => field.key === "date")!.rule as { validator: (rule: unknown, value: unknown) => unknown }

		expect(dateRule.validator(null, "2026-12-25")).toBe(true)
		expect(dateRule.validator(null, "25/12/2026")).toBeInstanceOf(Error)
	})
})
