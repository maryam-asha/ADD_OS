import type { EffectScope } from "vue"
import { afterEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, reactive } from "vue"

const route = reactive({ query: {} as Record<string, string> })
const replace = vi.fn((location: { query: Record<string, string> }) => {
	route.query = location.query
})

vi.mock("vue-router", () => ({
	useRoute: () => route,
	useRouter: () => ({ replace })
}))

const { useOpenRecord, FOCUSED_ROW_CLASS } = await import("../useOpenRecord")

// Each case runs in its own scope, as a page's setup does, so no watcher
// outlives the case that started it.
const scopes: EffectScope[] = []
function mount<T>(setup: () => T): T {
	const scope = effectScope()
	scopes.push(scope)
	return scope.run(setup) as T
}

afterEach(() => {
	for (const scope of scopes.splice(0)) scope.stop()
	replace.mockClear()
})

describe("useOpenRecord", () => {
	it("opens the record a link names, then drops the query", () => {
		route.query = { open: "42", tab: "all" }
		const onOpen = vi.fn()

		const { focusedId } = mount(() => useOpenRecord(onOpen))

		expect(onOpen).toHaveBeenCalledWith(42)
		expect(focusedId.value).toBe(42)
		expect(replace).toHaveBeenLastCalledWith({ query: { tab: "all" } })
	})

	it("picks out only that record's row", () => {
		route.query = { open: "7" }
		const { rowClassName } = mount(() => useOpenRecord())

		expect(rowClassName({ id: 7 })).toBe(FOCUSED_ROW_CLASS)
		expect(rowClassName({ id: "7" })).toBe(FOCUSED_ROW_CLASS)
		expect(rowClassName({ id: 8 })).toBe("")
	})

	it("ignores a link with no usable id", () => {
		route.query = { open: "abc" }
		const onOpen = vi.fn()

		const { focusedId } = mount(() => useOpenRecord(onOpen))

		expect(onOpen).not.toHaveBeenCalled()
		expect(focusedId.value).toBeNull()
		expect(replace).not.toHaveBeenCalled()
	})

	it("opens a second record linked while the page is open", async () => {
		route.query = {}
		const onOpen = vi.fn()
		mount(() => useOpenRecord(onOpen))

		route.query = { open: "9" }
		await nextTick()

		expect(onOpen).toHaveBeenCalledWith(9)
	})
})
