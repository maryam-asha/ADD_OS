import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"

import { KITCHEN_FALLBACK_POLL_MS, useKitchenRealtime } from "../useKitchenRealtime"

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
	subscribeKitchen: subscribeMock,
	isRealtimeConnected: connectedMock
}))

function mountWith(refetch: () => Promise<void>) {
	return mount(
		defineComponent({
			setup() {
				useKitchenRealtime(refetch)
				return () => h("div")
			}
		})
	)
}

async function flush() {
	for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("useKitchenRealtime", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		handlers.length = 0
		connectedMock.mockReturnValue(false)
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("refetches_on_kitchen_event", async () => {
		const refetch = vi.fn().mockResolvedValue(undefined)
		mountWith(refetch)

		expect(subscribeMock).toHaveBeenCalledOnce()
		handlers[0]("kitchen_order.created", { order_id: 4, branch_id: 1, status: "pending" })
		await flush()

		expect(refetch).toHaveBeenCalledOnce()
	})

	it("polls_while_disconnected", async () => {
		const refetch = vi.fn().mockResolvedValue(undefined)
		mountWith(refetch)

		vi.advanceTimersByTime(KITCHEN_FALLBACK_POLL_MS)
		await flush()
		expect(refetch).toHaveBeenCalledTimes(1)

		vi.advanceTimersByTime(KITCHEN_FALLBACK_POLL_MS)
		await flush()
		expect(refetch).toHaveBeenCalledTimes(2)

		connectedMock.mockReturnValue(true)
		vi.advanceTimersByTime(KITCHEN_FALLBACK_POLL_MS * 3)
		await flush()
		expect(refetch).toHaveBeenCalledTimes(2)
	})

	it("stops_on_unmount", async () => {
		const refetch = vi.fn().mockResolvedValue(undefined)
		const wrapper = mountWith(refetch)

		wrapper.unmount()
		expect(unsubscribeMock).toHaveBeenCalledOnce()

		vi.advanceTimersByTime(KITCHEN_FALLBACK_POLL_MS * 2)
		await flush()
		expect(refetch).not.toHaveBeenCalled()
	})
})
