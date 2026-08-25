import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope } from "vue"
import { useNow } from "../useNow"

describe("useNow", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("starts at the current time", () => {
		const scope = effectScope()
		const now = scope.run(() => useNow(30_000))!

		expect(now.value).toBe(Date.now())
		scope.stop()
	})

	it("advances once per interval", () => {
		const scope = effectScope()
		const now = scope.run(() => useNow(30_000))!
		const started = now.value

		vi.advanceTimersByTime(30_000)
		expect(now.value).toBe(started + 30_000)

		vi.advanceTimersByTime(60_000)
		expect(now.value).toBe(started + 90_000)

		scope.stop()
	})

	it("does not tick before the interval elapses", () => {
		const scope = effectScope()
		const now = scope.run(() => useNow(30_000))!
		const started = now.value

		vi.advanceTimersByTime(29_999)
		expect(now.value).toBe(started)

		scope.stop()
	})

	/**
	 * The reason this is a composable rather than three lines in the page. A
	 * leaked interval keeps a disposed component's reactive graph alive and fires
	 * forever; asserting the ref goes quiet after `scope.stop()` is what proves
	 * the cleanup is wired, not merely written.
	 */
	it("stops ticking once its scope is disposed", () => {
		const scope = effectScope()
		const now = scope.run(() => useNow(30_000))!
		const started = now.value

		scope.stop()
		vi.advanceTimersByTime(300_000)

		expect(now.value).toBe(started)
	})
})
