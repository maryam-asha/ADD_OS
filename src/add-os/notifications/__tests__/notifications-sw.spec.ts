import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"

/**
 * `public/notifications-sw.js`, run against a fake worker scope: what it
 * shows, and where a click leads.
 */

const SOURCE = readFileSync(path.resolve(__dirname, "..", "..", "..", "..", "public", "notifications-sw.js"), "utf8")

interface FakeClient {
	visibilityState: "visible" | "hidden"
	postMessage: ReturnType<typeof vi.fn>
	focus: ReturnType<typeof vi.fn>
}

function client(visibilityState: "visible" | "hidden"): FakeClient {
	return { visibilityState, postMessage: vi.fn(), focus: vi.fn(async () => undefined) }
}

function worker(clients: FakeClient[]) {
	const listeners: Record<string, (event: any) => void> = {}
	const scope = {
		addEventListener: (type: string, listener: (event: any) => void) => {
			listeners[type] = listener
		},
		skipWaiting: vi.fn(),
		clients: { matchAll: vi.fn(async () => clients), openWindow: vi.fn(), claim: vi.fn() },
		registration: { showNotification: vi.fn() }
	}
	// eslint-disable-next-line no-new-func -- the worker is a plain script; this runs it with `globalThis` = the fake scope
	new Function("globalThis", SOURCE)(scope)

	async function dispatch(type: string, event: Record<string, unknown>) {
		let pending: Promise<unknown> | undefined
		listeners[type]({ ...event, waitUntil: (promise: Promise<unknown>) => (pending = promise) })
		await pending
	}

	return { scope, dispatch }
}

const DATA = { title: "طلب جديد", body: "Sara asked about offices", notification_id: "n1", target_type: "invoice", target_id: "7", audience: "staff" }

const push = (payload: unknown) => ({ data: { json: () => payload } })

describe("notifications service worker", () => {
	it("shows a push when no dashboard tab is in view", async () => {
		const { scope, dispatch } = worker([client("hidden")])

		await dispatch("push", push({ data: DATA }))

		expect(scope.registration.showNotification).toHaveBeenCalledWith(DATA.title, expect.objectContaining({ body: DATA.body, tag: "n1", data: DATA }))
	})

	it("leaves it to a visible tab, telling it to re-read the inbox", async () => {
		const visible = client("visible")
		const { scope, dispatch } = worker([visible, client("hidden")])

		await dispatch("push", push({ data: DATA }))

		expect(scope.registration.showNotification).not.toHaveBeenCalled()
		expect(visible.postMessage).toHaveBeenCalledWith({ type: "add-os/notification", data: DATA })
	})

	it("ignores a push with no title, or one that is not JSON", async () => {
		const { scope, dispatch } = worker([])

		await dispatch("push", push({ data: {} }))
		await dispatch("push", {
			data: {
				json: () => {
					throw new SyntaxError("not json")
				}
			}
		})

		expect(scope.registration.showNotification).not.toHaveBeenCalled()
	})

	it("a click focuses an open tab and tells it which notice was opened", async () => {
		const open = client("hidden")
		const { scope, dispatch } = worker([open])
		const close = vi.fn()

		await dispatch("notificationclick", { notification: { data: DATA, close } })

		expect(close).toHaveBeenCalled()
		expect(open.postMessage).toHaveBeenCalledWith({ type: "add-os/notification-click", data: DATA })
		expect(open.focus).toHaveBeenCalled()
		expect(scope.clients.openWindow).not.toHaveBeenCalled()
	})

	it("a click with no tab opens one on the notice", async () => {
		const { scope, dispatch } = worker([])

		await dispatch("notificationclick", { notification: { data: DATA, close: vi.fn() } })

		expect(scope.clients.openWindow).toHaveBeenCalledWith("/?notification=n1&target_type=invoice&target_id=7")
	})
})
