import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"

import { RECEPTION_FALLBACK_POLL_MS, useReceptionRealtime } from "../useReceptionRealtime"

const { subscribeMock, unsubscribeMock, connectedMock, handlers } = vi.hoisted(() => {
	const handlers: Array<(event: string, payload: Record<string, unknown>) => void> = []
	const unsubscribeMock = vi.fn()
	return {
		handlers,
		unsubscribeMock,
		connectedMock: vi.fn(() => false),
		subscribeMock: vi.fn((handler: (event: string, payload: Record<string, unknown>) => void) => {
			handlers.push(handler)
			return unsubscribeMock
		})
	}
})

vi.mock("@/add-os/services/realtime", () => ({
	RECEPTION_EVENTS: ["arrival_request.created", "arrival_request.resolved"],
	subscribeReception: subscribeMock,
	isRealtimeConnected: connectedMock
}))

function mountWith(refetch: () => Promise<void>, options?: Parameters<typeof useReceptionRealtime>[1]) {
	return mount(
		defineComponent({
			setup() {
				useReceptionRealtime(refetch, options)
				return () => h("div")
			}
		})
	)
}

async function flush() {
	for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("useReceptionRealtime", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		handlers.length = 0
		connectedMock.mockReturnValue(false)
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("reloads the screen when the desk channel says something changed", async () => {
		const refetch = vi.fn().mockResolvedValue(undefined)
		mountWith(refetch, { events: ["arrival_request.created"] })

		expect(subscribeMock).toHaveBeenCalledWith(expect.any(Function), ["arrival_request.created"])

		handlers[0]("arrival_request.created", { arrival_request_id: 1 })
		await flush()

		expect(refetch).toHaveBeenCalledOnce()
	})

	it("listens to every desk event unless told otherwise", () => {
		mountWith(vi.fn().mockResolvedValue(undefined))

		expect(subscribeMock).toHaveBeenCalledWith(expect.any(Function), ["arrival_request.created", "arrival_request.resolved"])
	})

	it("folds events that arrive during a reload into one more reload", async () => {
		let finish: () => void = () => {}
		const refetch = vi.fn(() => new Promise<void>(resolve => (finish = resolve)))
		mountWith(refetch)

		handlers[0]("arrival_request.created", {})
		handlers[0]("arrival_request.created", {})
		handlers[0]("arrival_request.resolved", {})
		expect(refetch).toHaveBeenCalledTimes(1)

		finish()
		await flush()
		expect(refetch).toHaveBeenCalledTimes(2)

		finish()
		await flush()
		expect(refetch).toHaveBeenCalledTimes(2)
	})

	it("polls every 30 s while the socket is down, and not while it is up", async () => {
		const refetch = vi.fn().mockResolvedValue(undefined)
		mountWith(refetch)

		vi.advanceTimersByTime(RECEPTION_FALLBACK_POLL_MS)
		await flush()
		expect(refetch).toHaveBeenCalledTimes(1)

		connectedMock.mockReturnValue(true)
		vi.advanceTimersByTime(RECEPTION_FALLBACK_POLL_MS * 3)
		await flush()
		expect(refetch).toHaveBeenCalledTimes(1)
	})

	it("stops listening and polling when the screen goes away", async () => {
		const refetch = vi.fn().mockResolvedValue(undefined)
		const wrapper = mountWith(refetch)

		wrapper.unmount()
		expect(unsubscribeMock).toHaveBeenCalledOnce()

		vi.advanceTimersByTime(RECEPTION_FALLBACK_POLL_MS * 2)
		await flush()
		expect(refetch).not.toHaveBeenCalled()
	})
})
