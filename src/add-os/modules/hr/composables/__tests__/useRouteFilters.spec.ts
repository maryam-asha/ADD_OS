import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h, nextTick } from "vue"
import { useRouteFilters } from "../useRouteFilters"

const { route, replaceMock } = vi.hoisted(() => ({
	route: { query: {} as Record<string, string> },
	replaceMock: vi.fn()
}))

vi.mock("vue-router", () => ({
	useRoute: () => route,
	useRouter: () => ({ replace: replaceMock })
}))

function setup(onChange: () => void) {
	let state!: ReturnType<typeof useRouteFilters<{ q: "string"; status: "string"; unit: "number" }>>
	const wrapper = mount(
		defineComponent({
			setup() {
				state = useRouteFilters({ q: "string", status: "string", unit: "number" }, onChange, { debounced: ["q"] })
				return () => h("div")
			}
		})
	)
	return { state, wrapper }
}

describe("useRouteFilters", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetAllMocks()
		route.query = {}
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("starts from the URL and loads once on mount", async () => {
		route.query = { q: "rim", unit: "4", page: "3" }
		const onChange = vi.fn()
		const { state } = setup(onChange)
		await flushPromises()

		expect(state.filters.value).toEqual({ q: "rim", status: null, unit: 4 })
		expect(state.applied.value).toEqual({ q: "rim", status: null, unit: 4 })
		expect(state.page.value).toBe(3)
		expect(onChange).toHaveBeenCalledTimes(1)
	})

	it("applies a select at once, back on page one, in one load, and writes the URL", async () => {
		route.query = { page: "3" }
		const onChange = vi.fn()
		const { state } = setup(onChange)
		await flushPromises()
		onChange.mockClear()

		state.filters.value.status = "active"
		await nextTick()
		await nextTick()

		expect(state.applied.value.status).toBe("active")
		expect(state.page.value).toBe(1)
		expect(onChange).toHaveBeenCalledTimes(1)
		expect(replaceMock).toHaveBeenLastCalledWith({ query: { status: "active" } })
	})

	it("waits for typing to pause before applying the search", async () => {
		const onChange = vi.fn()
		const { state } = setup(onChange)
		await flushPromises()
		onChange.mockClear()

		state.filters.value.q = "ri"
		await nextTick()
		state.filters.value.q = "rim"
		await nextTick()
		vi.advanceTimersByTime(349)
		await nextTick()
		expect(onChange).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)
		await nextTick()
		await nextTick()
		expect(state.applied.value.q).toBe("rim")
		expect(onChange).toHaveBeenCalledTimes(1)
	})

	it("opens on a default that stays out of the URL until changed", async () => {
		let state!: ReturnType<typeof useRouteFilters<{ status: "string" }>>
		// The router writes the query it is given back onto the route.
		replaceMock.mockImplementation(({ query }: { query: Record<string, string> }) => {
			route.query = query
		})
		mount(
			defineComponent({
				setup() {
					state = useRouteFilters({ status: "string" }, () => {}, { defaults: { status: "pending" } })
					return () => h("div")
				}
			})
		)
		await flushPromises()
		expect(state.applied.value.status).toBe("pending")

		state.filters.value.status = "approved"
		await nextTick()
		await nextTick()
		expect(replaceMock).toHaveBeenLastCalledWith({ query: { status: "approved" } })

		state.filters.value.status = "pending"
		await nextTick()
		await nextTick()
		expect(replaceMock).toHaveBeenLastCalledWith({ query: {} })
	})

	it("keeps the filters when only the page changes", async () => {
		route.query = { status: "active" }
		const onChange = vi.fn()
		const { state } = setup(onChange)
		await flushPromises()
		onChange.mockClear()

		state.page.value = 2
		await nextTick()

		expect(state.applied.value.status).toBe("active")
		expect(onChange).toHaveBeenCalledTimes(1)
		expect(replaceMock).toHaveBeenLastCalledWith({ query: { status: "active", page: "2" } })
	})
})
