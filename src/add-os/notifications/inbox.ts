import type { WatchStopHandle } from "vue"
import type { InboxAudience, InboxNotification } from "@/add-os/services/notifications"
import { computed, ref, watch } from "vue"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { fetchInbox, fetchUnreadCount, markAllNotificationsRead, markNotificationRead } from "@/add-os/services/notifications"
import { useGlobalActions } from "@/composables/useGlobalActions"
import router from "@/router"
import { syncBrowserPush } from "./browserPush"
import { notificationTarget } from "./targets"

/**
 * The signed-in account's notification inbox, shared by the bell and the
 * drawer: one copy of the state, started by the bell for the account it
 * belongs to.
 *
 * It stays current by re-reading the unread count and the first page every
 * minute, and at once when a browser push for this account reaches the open
 * tab (`./browserPush`). A notice that arrives while the dashboard is open
 * shows once as a toast — only one this tab had not seen, so the
 * first load and repeated reads never toast.
 *
 * Text arrives rendered in the request's language, so a language switch
 * reloads the list — and re-registers this browser for push in it.
 *
 * Browser notifications (`./browserPush`) open here too: a click in a tab
 * already open arrives as a service-worker message, a click with none opens
 * `/?notification=…`.
 */

const POLL_MS = 60_000
const MAX_TOASTS = 3
/** The query a browser notification opens a new tab with (`public/notifications-sw.js`). */
const LINK_KEYS = ["notification", "target_type", "target_id"]

/** What a push or a link carries to open a notice — ADDCore's dashboard push data. */
export interface PushOpenData {
	notification_id?: string
	target_type?: string
	target_id?: string
}

const items = ref<InboxNotification[]>([])
const unreadCount = ref(0)
const loading = ref(false)
const audience = ref<InboxAudience | null>(null)
const page = ref(0)
const lastPage = ref(1)
const hasMore = computed(() => page.value < lastPage.value)

let userId: number | null = null
let seen = new Set<string>()
let generation = 0
let pollTimer: ReturnType<typeof setInterval> | null = null
let stopLocaleWatch: WatchStopHandle | null = null

function toast(notices: InboxNotification[]): void {
	for (const notice of notices.slice(0, MAX_TOASTS)) {
		useGlobalActions().notification({
			title: notice.title ?? "",
			content: notice.body ?? "",
			duration: 5000,
			keepAliveOnHover: true
		})
	}
}

/**
 * Re-reads the count and the first page. New notices go on top; pages the
 * drawer already loaded stay below them. With `replace`, the list starts
 * over from page 1 (a language switch: every text changed).
 */
async function loadFirstPage(options: { announce: boolean; replace?: boolean }): Promise<void> {
	const current = audience.value
	if (!current) return

	const run = generation
	const [count, first] = await Promise.all([fetchUnreadCount(current), fetchInbox(current, 1)])
	if (run !== generation) return

	if (options.announce) toast(first.data.filter(notice => !notice.read_at && !seen.has(notice.id)))
	for (const notice of first.data) seen.add(notice.id)

	const firstIds = new Set(first.data.map(notice => notice.id))
	items.value = options.replace ? first.data : [...first.data, ...items.value.filter(notice => !firstIds.has(notice.id))]
	unreadCount.value = count
	if (options.replace || page.value === 0) page.value = 1
	lastPage.value = Math.max(first.meta.last_page, page.value)
}

async function refresh(): Promise<void> {
	try {
		await loadFirstPage({ announce: true })
	} catch {
		// A failed read leaves the bell as it was; the next push or poll tries again.
	}
}

/** Messages from `public/notifications-sw.js`: a notice it left to the open tab, or a click on one it showed. */
function onWorkerMessage(event: MessageEvent): void {
	const message = event.data as { type?: string; data?: PushOpenData } | null
	if (message?.type === "add-os/notification") void refresh()
	if (message?.type === "add-os/notification-click") void openFromPush(message.data ?? {})
}

/** A tab opened by a click on a browser notification lands on `/?notification=…`: open it once, then drop the query. */
async function openFromLink(): Promise<void> {
	await router.isReady()
	const { query } = router.currentRoute.value
	const id = typeof query.notification === "string" ? query.notification : null
	if (!id) return

	const data: PushOpenData = { notification_id: id }
	if (typeof query.target_type === "string") data.target_type = query.target_type
	if (typeof query.target_id === "string") data.target_id = query.target_id

	const rest = Object.fromEntries(Object.entries(query).filter(([key]) => !LINK_KEYS.includes(key)))
	await router.replace({ query: rest })
	await openFromPush(data)
}

function stop(): void {
	generation++
	if (typeof navigator !== "undefined" && navigator.serviceWorker) navigator.serviceWorker.removeEventListener("message", onWorkerMessage)
	if (pollTimer) clearInterval(pollTimer)
	pollTimer = null
	stopLocaleWatch?.()
	stopLocaleWatch = null
	audience.value = null
	userId = null
	items.value = []
	unreadCount.value = 0
	page.value = 0
	lastPage.value = 1
	seen = new Set()
}

/** Starts the inbox for one account. Calling it again for the same account does nothing. */
function start(forAudience: InboxAudience, forUserId: number): void {
	if (audience.value === forAudience && userId === forUserId) return

	stop()
	audience.value = forAudience
	userId = forUserId

	loading.value = true
	void loadFirstPage({ announce: false })
		.catch(() => {})
		.finally(() => {
			loading.value = false
		})

	pollTimer = setInterval(() => void refresh(), POLL_MS)
	stopLocaleWatch = watch(currentLocale, () => {
		void loadFirstPage({ announce: false, replace: true }).catch(() => {})
		void syncBrowserPush(forAudience)
	})

	void syncBrowserPush(forAudience)
	if (typeof navigator !== "undefined" && navigator.serviceWorker) navigator.serviceWorker.addEventListener("message", onWorkerMessage)
	void openFromLink().catch(() => {})
}

async function loadMore(): Promise<void> {
	const current = audience.value
	if (!current || loading.value || !hasMore.value) return

	const run = generation
	loading.value = true
	try {
		const next = await fetchInbox(current, page.value + 1)
		if (run !== generation) return
		const known = new Set(items.value.map(notice => notice.id))
		items.value = [...items.value, ...next.data.filter(notice => !known.has(notice.id))]
		for (const notice of next.data) seen.add(notice.id)
		page.value = next.meta.current_page
		lastPage.value = next.meta.last_page
	} finally {
		loading.value = false
	}
}

async function markRead(id: string): Promise<void> {
	const current = audience.value
	if (!current) return

	const notice = items.value.find(item => item.id === id)
	if (notice?.read_at) return

	if (notice) {
		notice.read_at = new Date().toISOString()
		unreadCount.value = Math.max(0, unreadCount.value - 1)
	}

	try {
		await markNotificationRead(current, id)
		// A notice not in the list (opened from a browser notification): the count is the server's.
		if (!notice) unreadCount.value = await fetchUnreadCount(current)
	} catch {
		if (notice) {
			notice.read_at = null
			unreadCount.value++
		}
	}
}

async function markAllRead(): Promise<void> {
	const current = audience.value
	if (!current || unreadCount.value === 0) return

	const now = new Date().toISOString()
	const before = items.value.map(notice => notice.read_at)
	const countBefore = unreadCount.value
	for (const notice of items.value) notice.read_at ??= now
	unreadCount.value = 0

	try {
		await markAllNotificationsRead(current)
	} catch {
		items.value.forEach((notice, index) => {
			notice.read_at = before[index] ?? null
		})
		unreadCount.value = countBefore
	}
}

/** A click on a notice: it is read now, and its page opens when it has one. */
async function open(notice: InboxNotification): Promise<void> {
	const current = audience.value
	if (!current) return

	if (!notice.read_at) void markRead(notice.id)
	const target = notificationTarget(current, notice.data)
	if (target) await router.push(target)
}

/** A click on a browser notification, or a link carrying one. */
async function openFromPush(data: PushOpenData): Promise<void> {
	const current = audience.value
	if (!current) return

	if (data.notification_id) void markRead(data.notification_id)
	const target = notificationTarget(current, data as Record<string, string>)
	if (target) await router.push(target)
}

export function useInbox() {
	return {
		items,
		unreadCount,
		loading,
		audience,
		hasMore,
		start,
		stop,
		refresh,
		loadMore,
		markRead,
		markAllRead,
		open,
		openFromPush
	}
}
