import type { InboxNotification } from "@/add-os/services/notifications"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

const mocks = vi.hoisted(() => ({
	fetchInbox: vi.fn(),
	fetchUnreadCount: vi.fn(),
	markNotificationRead: vi.fn(),
	markAllNotificationsRead: vi.fn(),
	subscribe: vi.fn(),
	unsubscribe: vi.fn(),
	connected: { value: false },
	toast: vi.fn(),
	push: vi.fn(),
	replace: vi.fn(),
	query: { value: {} as Record<string, string> },
	syncBrowserPush: vi.fn(),
	workerListeners: [] as Array<(event: MessageEvent) => void>
}))

vi.mock("@/add-os/services/notifications", () => ({
	fetchInbox: mocks.fetchInbox,
	fetchUnreadCount: mocks.fetchUnreadCount,
	markNotificationRead: mocks.markNotificationRead,
	markAllNotificationsRead: mocks.markAllNotificationsRead
}))
vi.mock("@/add-os/services/realtime", () => ({
	subscribeDashboardNotifications: mocks.subscribe,
	isRealtimeConnected: () => mocks.connected.value
}))
vi.mock("@/composables/useGlobalActions", () => ({
	useGlobalActions: () => ({ notification: mocks.toast })
}))
vi.mock("@/router", () => ({
	default: {
		push: mocks.push,
		replace: mocks.replace,
		isReady: async () => undefined,
		get currentRoute() {
			return { value: { query: mocks.query.value } }
		}
	}
}))
vi.mock("../browserPush", () => ({ syncBrowserPush: mocks.syncBrowserPush }))

function notice(id: string, read = false, data: Record<string, string> | null = null): InboxNotification {
	return {
		id,
		template_key: "booking.approved",
		title: `title ${id}`,
		body: `body ${id}`,
		data,
		read_at: read ? "2026-11-03T10:00:00Z" : null,
		created_at: "2026-11-03T09:00:00Z"
	}
}

function page(data: InboxNotification[], current = 1, last = 1) {
	return { data, meta: { current_page: current, last_page: last, per_page: 20 } }
}

async function settle() {
	for (let i = 0; i < 6; i++) await Promise.resolve()
}

async function load() {
	vi.resetModules()
	const { useInbox } = await import("../inbox")
	const { currentLocale } = await import("@/add-os/lang/currentLocale")
	return { inbox: useInbox(), currentLocale }
}

describe("useInbox", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
		mocks.connected.value = false
		mocks.subscribe.mockReturnValue(mocks.unsubscribe)
		mocks.fetchUnreadCount.mockResolvedValue(2)
		mocks.fetchInbox.mockResolvedValue(page([notice("a"), notice("b"), notice("c", true)], 1, 2))
		mocks.markNotificationRead.mockResolvedValue(undefined)
		mocks.markAllNotificationsRead.mockResolvedValue(undefined)
		mocks.syncBrowserPush.mockResolvedValue(undefined)
		mocks.query.value = {}
		mocks.workerListeners.length = 0
		Object.defineProperty(navigator, "serviceWorker", {
			configurable: true,
			value: {
				addEventListener: (_type: string, listener: (event: MessageEvent) => void) => mocks.workerListeners.push(listener),
				removeEventListener: (_type: string, listener: (event: MessageEvent) => void) => {
					mocks.workerListeners.splice(mocks.workerListeners.indexOf(listener), 1)
				}
			}
		})
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("registers an allowed browser for push at start, and again in a new language", async () => {
		const { inbox, currentLocale } = await load()
		currentLocale.value = "ar"
		inbox.start("provider", 7)
		await settle()
		expect(mocks.syncBrowserPush).toHaveBeenCalledWith("provider")

		currentLocale.value = "en"
		await nextTick()
		expect(mocks.syncBrowserPush).toHaveBeenCalledTimes(2)
	})

	it("opens the notice a browser notification opened this tab on, then drops the query", async () => {
		mocks.query.value = { notification: "n9", target_type: "company", target_id: "4", tab: "x" }
		const { inbox } = await load()
		inbox.start("staff", 7)
		await settle()
		await settle()

		expect(mocks.replace).toHaveBeenCalledWith({ query: { tab: "x" } })
		expect(mocks.markNotificationRead).toHaveBeenCalledWith("staff", "n9")
		expect(mocks.push).toHaveBeenCalledWith("/members/companies/4")
	})

	it("follows the service worker: a click opens the notice, a notice re-reads the inbox", async () => {
		const { inbox } = await load()
		inbox.start("staff", 7)
		await settle()
		const reads = mocks.fetchInbox.mock.calls.length

		mocks.workerListeners[0]({ data: { type: "add-os/notification-click", data: { notification_id: "n2", target_type: "wallet", target_id: "1" } } } as MessageEvent)
		await settle()
		expect(mocks.push).toHaveBeenCalledWith("/plans/wallet")

		mocks.workerListeners[0]({ data: { type: "add-os/notification" } } as MessageEvent)
		await settle()
		expect(mocks.fetchInbox.mock.calls.length).toBe(reads + 1)

		inbox.stop()
		expect(mocks.workerListeners).toHaveLength(0)
	})

	it("loads the count and the first page of the account's inbox, quietly", async () => {
		const { inbox } = await load()
		inbox.start("staff", 7)
		await settle()

		expect(mocks.fetchUnreadCount).toHaveBeenCalledWith("staff")
		expect(mocks.fetchInbox).toHaveBeenCalledWith("staff", 1)
		expect(mocks.subscribe).toHaveBeenCalledWith(7, expect.any(Function))
		expect(inbox.items.value.map(n => n.id)).toEqual(["a", "b", "c"])
		expect(inbox.unreadCount.value).toBe(2)
		expect(inbox.hasMore.value).toBe(true)
		expect(mocks.toast).not.toHaveBeenCalled()
	})

	it("starting again for the same account does nothing", async () => {
		const { inbox } = await load()
		inbox.start("staff", 7)
		inbox.start("staff", 7)
		await settle()

		expect(mocks.subscribe).toHaveBeenCalledTimes(1)
	})

	it("toasts only the notice this tab had not seen when a nudge arrives", async () => {
		const { inbox } = await load()
		inbox.start("staff", 7)
		await settle()

		mocks.fetchUnreadCount.mockResolvedValue(3)
		mocks.fetchInbox.mockResolvedValue(page([notice("new"), notice("a"), notice("b"), notice("c", true)], 1, 2))
		const nudge = mocks.subscribe.mock.calls[0][1] as () => void
		nudge()
		await settle()

		expect(mocks.toast).toHaveBeenCalledTimes(1)
		expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "title new", content: "body new" }))
		expect(inbox.items.value[0].id).toBe("new")
		expect(inbox.unreadCount.value).toBe(3)

		nudge()
		await settle()
		expect(mocks.toast).toHaveBeenCalledTimes(1)
	})

	it("marks one notice read once, and puts it back when the server refuses", async () => {
		const { inbox } = await load()
		inbox.start("staff", 7)
		await settle()

		await inbox.markRead("a")
		await inbox.markRead("a")

		expect(mocks.markNotificationRead).toHaveBeenCalledTimes(1)
		expect(mocks.markNotificationRead).toHaveBeenCalledWith("staff", "a")
		expect(inbox.unreadCount.value).toBe(1)

		mocks.markNotificationRead.mockRejectedValueOnce(new Error("500"))
		await inbox.markRead("b")
		expect(inbox.items.value.find(n => n.id === "b")?.read_at).toBeNull()
		expect(inbox.unreadCount.value).toBe(1)
	})

	it("marks everything read", async () => {
		const { inbox } = await load()
		inbox.start("provider", 7)
		await settle()

		await inbox.markAllRead()

		expect(mocks.markAllNotificationsRead).toHaveBeenCalledWith("provider")
		expect(inbox.unreadCount.value).toBe(0)
		expect(inbox.items.value.every(n => n.read_at !== null)).toBe(true)
	})

	it("appends the next page and stops at the last", async () => {
		const { inbox } = await load()
		inbox.start("staff", 7)
		await settle()

		mocks.fetchInbox.mockResolvedValue(page([notice("c", true), notice("d")], 2, 2))
		await inbox.loadMore()

		expect(mocks.fetchInbox).toHaveBeenLastCalledWith("staff", 2)
		expect(inbox.items.value.map(n => n.id)).toEqual(["a", "b", "c", "d"])
		expect(inbox.hasMore.value).toBe(false)
	})

	it("polls every minute only while the socket is down", async () => {
		const { inbox } = await load()
		inbox.start("staff", 7)
		await settle()
		const reads = mocks.fetchInbox.mock.calls.length

		mocks.connected.value = true
		await vi.advanceTimersByTimeAsync(60_000)
		expect(mocks.fetchInbox.mock.calls.length).toBe(reads)

		mocks.connected.value = false
		await vi.advanceTimersByTimeAsync(60_000)
		expect(mocks.fetchInbox.mock.calls.length).toBe(reads + 1)
	})

	it("reloads the list in the new language", async () => {
		const { inbox, currentLocale } = await load()
		currentLocale.value = "ar"
		inbox.start("staff", 7)
		await settle()

		mocks.fetchInbox.mockResolvedValue(page([notice("a")], 1, 1))
		currentLocale.value = "en"
		await nextTick()
		await settle()

		expect(inbox.items.value.map(n => n.id)).toEqual(["a"])
		expect(mocks.toast).not.toHaveBeenCalled()
	})

	it("opens a notice's page and marks it read", async () => {
		const { inbox } = await load()
		mocks.fetchInbox.mockResolvedValue(page([notice("a", false, { target_type: "company", target_id: "12" })]))
		inbox.start("staff", 7)
		await settle()

		await inbox.open(inbox.items.value[0])

		expect(mocks.markNotificationRead).toHaveBeenCalledWith("staff", "a")
		expect(mocks.push).toHaveBeenCalledWith("/members/companies/12")
	})

	it("opens a browser notification it never listed, re-reading the count", async () => {
		const { inbox } = await load()
		inbox.start("staff", 7)
		await settle()
		mocks.fetchUnreadCount.mockResolvedValue(1)

		await inbox.openFromPush({ notification_id: "zzz", target_type: "invoice", target_id: "3" })
		await settle()

		expect(mocks.markNotificationRead).toHaveBeenCalledWith("staff", "zzz")
		expect(mocks.push).toHaveBeenCalledWith({ path: "/payments/invoices", query: { open: "3" } })
		expect(inbox.unreadCount.value).toBe(1)
	})

	it("stops listening and forgets the account on stop", async () => {
		const { inbox } = await load()
		inbox.start("staff", 7)
		await settle()

		inbox.stop()

		expect(mocks.unsubscribe).toHaveBeenCalled()
		expect(inbox.items.value).toEqual([])
		expect(inbox.unreadCount.value).toBe(0)
		await vi.advanceTimersByTimeAsync(120_000)
		expect(mocks.fetchInbox).toHaveBeenCalledTimes(1)
	})
})
