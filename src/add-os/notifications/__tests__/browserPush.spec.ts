import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Browser notifications with Firebase and the API mocked — nothing leaves
 * the test. The module reads its env at import time, so each test stubs the
 * env and imports a fresh copy.
 */

const mocks = vi.hoisted(() => ({
	initializeApp: vi.fn(() => ({ name: "app" })),
	getApps: vi.fn(() => [] as unknown[]),
	getMessaging: vi.fn(() => ({ name: "messaging" })),
	getToken: vi.fn(),
	registerBrowserToken: vi.fn(),
	removeBrowserToken: vi.fn(),
	register: vi.fn(),
	getRegistration: vi.fn(),
	unsubscribe: vi.fn()
}))

vi.mock("firebase/app", () => ({ initializeApp: mocks.initializeApp, getApps: mocks.getApps }))
vi.mock("firebase/messaging", () => ({ getMessaging: mocks.getMessaging, getToken: mocks.getToken }))
vi.mock("@/add-os/services/notifications", () => ({
	registerBrowserToken: mocks.registerBrowserToken,
	removeBrowserToken: mocks.removeBrowserToken
}))

const ENV = {
	VITE_FIREBASE_API_KEY: "api-key",
	VITE_FIREBASE_PROJECT_ID: "add-project",
	VITE_FIREBASE_MESSAGING_SENDER_ID: "123",
	VITE_FIREBASE_APP_ID: "1:123:web:abc",
	VITE_FIREBASE_VAPID_KEY: "vapid-key"
}

let permission: NotificationPermission = "default"
const requestPermission = vi.fn(async () => permission)

async function load(env: Partial<typeof ENV> = ENV) {
	for (const [key, value] of Object.entries({ ...ENV, ...env })) vi.stubEnv(key, value)
	vi.resetModules()
	return import("../browserPush")
}

describe("browserPush", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		localStorage.clear()
		permission = "default"
		const registration = { pushManager: { getSubscription: vi.fn(async () => ({ unsubscribe: mocks.unsubscribe })) } }
		mocks.register.mockResolvedValue(registration)
		mocks.getRegistration.mockResolvedValue(registration)
		mocks.getToken.mockResolvedValue("browser-token")
		mocks.registerBrowserToken.mockResolvedValue(undefined)
		mocks.removeBrowserToken.mockResolvedValue(undefined)
		vi.stubGlobal("Notification", {
			get permission() {
				return permission
			},
			requestPermission
		})
		vi.stubGlobal("PushManager", class {})
		Object.defineProperty(navigator, "serviceWorker", {
			configurable: true,
			value: { register: mocks.register, getRegistration: mocks.getRegistration }
		})
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
	})

	it("is off, and loads nothing, while any Firebase value is unset", async () => {
		const push = await load({ VITE_FIREBASE_VAPID_KEY: "" })

		expect(push.browserPushState()).toBe("unconfigured")
		expect(await push.enableBrowserPush("staff")).toBe("unconfigured")
		await push.syncBrowserPush("staff")

		expect(requestPermission).not.toHaveBeenCalled()
		expect(mocks.register).not.toHaveBeenCalled()
		expect(mocks.initializeApp).not.toHaveBeenCalled()
	})

	it("asks the browser on the click, then registers this browser for the account", async () => {
		const push = await load()
		permission = "granted"

		expect(await push.enableBrowserPush("provider")).toBe("granted")

		expect(mocks.register).toHaveBeenCalledWith("/notifications-sw.js", { scope: "/" })
		expect(mocks.initializeApp).toHaveBeenCalledWith({ apiKey: "api-key", projectId: "add-project", messagingSenderId: "123", appId: "1:123:web:abc" })
		expect(mocks.getToken).toHaveBeenCalledWith({ name: "messaging" }, { vapidKey: "vapid-key", serviceWorkerRegistration: await mocks.register.mock.results[0].value })
		expect(mocks.registerBrowserToken).toHaveBeenCalledWith("provider", "browser-token")
		expect(localStorage.getItem(push.TOKEN_STORAGE_KEY)).toBe("browser-token")
	})

	it("registers nothing when the browser says no", async () => {
		const push = await load()
		permission = "denied"

		expect(await push.enableBrowserPush("staff")).toBe("denied")

		expect(mocks.getToken).not.toHaveBeenCalled()
		expect(mocks.registerBrowserToken).not.toHaveBeenCalled()
	})

	it("re-registers an allowed browser at start, and only an allowed one", async () => {
		const push = await load()
		await push.syncBrowserPush("staff")
		expect(mocks.registerBrowserToken).not.toHaveBeenCalled()

		permission = "granted"
		await push.syncBrowserPush("staff")
		expect(mocks.registerBrowserToken).toHaveBeenCalledWith("staff", "browser-token")
	})

	it("on sign-out, the server forgets this browser and the browser unsubscribes", async () => {
		const push = await load()
		localStorage.setItem(push.TOKEN_STORAGE_KEY, "browser-token")

		await push.removeBrowserPush("staff")

		expect(mocks.removeBrowserToken).toHaveBeenCalledWith("staff", "browser-token")
		expect(mocks.unsubscribe).toHaveBeenCalled()
		expect(localStorage.getItem(push.TOKEN_STORAGE_KEY)).toBeNull()
	})

	it("still unsubscribes when the server cannot be told (a session already gone)", async () => {
		const push = await load()
		localStorage.setItem(push.TOKEN_STORAGE_KEY, "browser-token")
		mocks.removeBrowserToken.mockRejectedValue(new Error("401"))

		await push.removeBrowserPush("staff")

		expect(mocks.unsubscribe).toHaveBeenCalled()
		expect(localStorage.getItem(push.TOKEN_STORAGE_KEY)).toBeNull()
	})

	it("does nothing locally for a browser that never registered", async () => {
		const push = await load()

		await push.forgetBrowserPushLocally()

		expect(mocks.getRegistration).not.toHaveBeenCalled()
	})
})
