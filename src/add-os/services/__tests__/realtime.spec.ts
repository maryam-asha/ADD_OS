import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The Echo wiring, with laravel-echo and pusher-js mocked — nothing connects.
 * The module reads its env at import time, so each test stubs the env and
 * imports a fresh copy.
 */

const { EchoMock, PusherStub, channel, connection, postMock, instances } = vi.hoisted(() => {
	const channel = { listen: vi.fn(), stopListening: vi.fn() }
	channel.listen.mockReturnValue(channel)
	channel.stopListening.mockReturnValue(channel)
	const connection = { state: "connecting", bind: vi.fn() }
	const instances: Array<{ options: Record<string, any>; private: ReturnType<typeof vi.fn>; leave: ReturnType<typeof vi.fn> }> = []
	class EchoMock {
		options: Record<string, any>
		connector = { pusher: { connection } }
		private = vi.fn(() => channel)
		leave = vi.fn()
		constructor(options: Record<string, any>) {
			this.options = options
			instances.push(this)
		}
	}
	class PusherStub {}
	return { EchoMock, PusherStub, channel, connection, postMock: vi.fn(), instances }
})

vi.mock("laravel-echo", () => ({ default: EchoMock }))
vi.mock("pusher-js", () => ({ default: PusherStub }))
vi.mock("../api", () => ({ post: postMock }))

async function load(key = "app-key", cluster = "eu") {
	vi.stubEnv("VITE_PUSHER_APP_KEY", key)
	vi.stubEnv("VITE_PUSHER_APP_CLUSTER", cluster)
	vi.resetModules()
	return import("../realtime")
}

/** Lets the dynamic imports and the subscription's then() run. */
async function settle() {
	for (let i = 0; i < 5; i++) await Promise.resolve()
	await new Promise(resolve => setTimeout(resolve, 0))
}

describe("realtime", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		instances.length = 0
		connection.state = "connecting"
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("does nothing at all without a key or a cluster", async () => {
		for (const [key, cluster] of [
			["", "eu"],
			["app-key", ""]
		]) {
			const realtime = await load(key, cluster)
			const stop = realtime.subscribeReception(vi.fn())
			await settle()

			expect(realtime.isRealtimeConfigured()).toBe(false)
			expect(realtime.isRealtimeConnected()).toBe(false)
			expect(instances).toHaveLength(0)
			stop()
		}
	})

	it("connects to Pusher over WebSockets only, with the dashboard's own auth call", async () => {
		const realtime = await load()
		realtime.subscribeReception(vi.fn())
		await settle()

		expect(instances).toHaveLength(1)
		const options = instances[0].options
		expect(options).toMatchObject({
			broadcaster: "pusher",
			key: "app-key",
			cluster: "eu",
			forceTLS: true,
			enabledTransports: ["ws", "wss"],
			Pusher: PusherStub,
			withoutInterceptors: true
		})

		postMock.mockResolvedValue({ auth: "app-key:signature" })
		const callback = vi.fn()
		options.channelAuthorization.customHandler({ socketId: "1.2", channelName: "private-reception" }, callback)
		await settle()

		expect(postMock).toHaveBeenCalledWith("/api/broadcasting/auth", { socket_id: "1.2", channel_name: "private-reception" })
		expect(callback).toHaveBeenCalledWith(null, { auth: "app-key:signature" })
	})

	it("hands a refused authorization back to pusher as an error", async () => {
		const realtime = await load()
		realtime.subscribeReception(vi.fn())
		await settle()

		postMock.mockRejectedValue(new Error("403"))
		const callback = vi.fn()
		instances[0].options.channelAuthorization.customHandler({ socketId: "1.2", channelName: "private-reception" }, callback)
		await settle()

		expect(callback).toHaveBeenCalledWith(expect.any(Error), null)
	})

	it("listens on the reception channel by the API's own event names", async () => {
		const realtime = await load()
		const handler = vi.fn()
		realtime.subscribeReception(handler, ["arrival_request.created"])
		await settle()

		expect(instances[0].private).toHaveBeenCalledWith("reception")
		expect(channel.listen).toHaveBeenCalledTimes(1)
		const [name, callback] = channel.listen.mock.calls[0]
		// Leading dot: no PHP namespace in front of a broadcastAs() name.
		expect(name).toBe(".arrival_request.created")

		callback({ arrival_request_id: 7, purpose: "coworking_start", status: "pending" })
		expect(handler).toHaveBeenCalledWith("arrival_request.created", { arrival_request_id: 7, purpose: "coworking_start", status: "pending" })
	})

	it("shares one connection and leaves the channel only when the last screen stops", async () => {
		const realtime = await load()
		const stopFirst = realtime.subscribeReception(vi.fn())
		const stopSecond = realtime.subscribeReception(vi.fn())
		await settle()

		expect(instances).toHaveLength(1)

		stopFirst()
		expect(channel.stopListening).toHaveBeenCalledTimes(realtime.RECEPTION_EVENTS.length)
		expect(instances[0].leave).not.toHaveBeenCalled()

		stopSecond()
		expect(instances[0].leave).toHaveBeenCalledWith("reception")
	})

	it("never attaches a listener for a screen that left before the socket was ready", async () => {
		const realtime = await load()
		const stop = realtime.subscribeReception(vi.fn())
		stop()
		await settle()

		expect(channel.listen).not.toHaveBeenCalled()
	})

	it("follows the socket's connection state", async () => {
		const realtime = await load()
		realtime.subscribeReception(vi.fn())
		await settle()

		expect(realtime.isRealtimeConnected()).toBe(false)
		const [event, onChange] = connection.bind.mock.calls[0]
		expect(event).toBe("state_change")

		onChange({ previous: "connecting", current: "connected" })
		expect(realtime.isRealtimeConnected()).toBe(true)

		onChange({ previous: "connected", current: "unavailable" })
		expect(realtime.isRealtimeConnected()).toBe(false)
	})
})
