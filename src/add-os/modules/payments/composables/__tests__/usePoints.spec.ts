import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { createI18n } from "vue-i18n"
import { usePoints } from "../usePoints"

/**
 * `usePoints()` calls `useI18n()`, so it only runs inside a component's setup.
 * Mount a throwaway harness around it and hand the composable back, the way
 * `lang/__tests__/direction.spec.ts` does for `bindDirectionToLocale`.
 */
function withPoints(locale = "en") {
	const i18n = createI18n({
		legacy: false,
		locale,
		fallbackLocale: "en",
		messages: {
			en: { points: { unit: "points" } },
			ar: { points: { unit: "نقطة" } }
		}
	})

	let points!: ReturnType<typeof usePoints>
	const Harness = defineComponent({
		setup() {
			points = usePoints()
			return () => h("div")
		}
	})

	const wrapper = mount(Harness, { global: { plugins: [i18n] } })
	return { points, wrapper }
}

describe("usePoints", () => {
	it("renders a point count as the number plus the unit label", () => {
		const { points, wrapper } = withPoints()

		expect(points.formatPoints(340)).toBe("340 points")

		wrapper.unmount()
	})

	it("groups a large point count with thousands separators", () => {
		const { points, wrapper } = withPoints()

		// Grouping is the whole reason this goes through a formatter rather than
		// String(n): a six-figure balance is unreadable as a digit run.
		expect(points.formatPoints(1234567)).toBe("1,234,567 points")

		wrapper.unmount()
	})

	it("uses the active locale's unit label", () => {
		const { points, wrapper } = withPoints("ar")

		expect(points.formatPoints(340)).toBe("340 نقطة")

		wrapper.unmount()
	})

	/**
	 * The composable is formatting and nothing else. The point rate lives on the
	 * server and an admin can change it, so a conversion here would be a second
	 * copy of a rule about real money — guaranteed to drift. These assertions
	 * pin that: what goes in is what comes out, scaled by nothing.
	 */
	it("does not convert — the count it prints is the count it was given", () => {
		const { points, wrapper } = withPoints()

		expect(points.formatPoints(1)).toBe("1 points")
		expect(points.formatPoints(0)).toBe("0 points")

		wrapper.unmount()
	})
})
