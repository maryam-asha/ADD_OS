/*
 * ADD OS — browser notifications (Firebase Cloud Messaging over Web Push).
 *
 * ADD Core sends a dashboard browser a data-only message: the title, body and
 * what the notice is about, all in `data` (NotificationService::sendDashboardPush).
 * Nothing is shown by the platform on its own; this worker decides.
 *
 *  - A dashboard tab is in view: show nothing. The bell already has it — the
 *    same notice arrives there over Pusher — and two alerts for one notice
 *    is noise. The tab is told, so it re-reads the inbox even with Pusher down.
 *  - No tab in view: a system notification, tagged with the notice's id so a
 *    repeat replaces rather than stacks.
 *  - A click: an open tab is focused and told which notice was opened; with
 *    none, a new one opens on `/?notification=…`, which the bell handles once
 *    signed in (marks it read, opens its page).
 *
 * Plain script, no imports and no Firebase SDK: Firebase in the page only
 * subscribes this worker's registration (getToken with it), and the messages
 * it receives are ordinary push events. Nothing here loads from a CDN.
 */

globalThis.addEventListener("install", () => {
	globalThis.skipWaiting()
})

globalThis.addEventListener("activate", event => {
	event.waitUntil(globalThis.clients.claim())
})

function readPush(event) {
	try {
		return event.data ? event.data.json() : null
	} catch {
		return null
	}
}

function windowClients() {
	return globalThis.clients.matchAll({ type: "window", includeUncontrolled: true })
}

globalThis.addEventListener("push", event => {
	const payload = readPush(event)
	const data = (payload && payload.data) || {}
	if (!data.title) return

	event.waitUntil(
		windowClients().then(clients => {
			const visible = clients.filter(client => client.visibilityState === "visible")

			if (visible.length > 0) {
				for (const client of visible) client.postMessage({ type: "add-os/notification", data })
				return undefined
			}

			return globalThis.registration.showNotification(data.title, {
				body: data.body || "",
				tag: data.notification_id,
				icon: "/apple-touch-icon.png",
				dir: "auto",
				data
			})
		})
	)
})

globalThis.addEventListener("notificationclick", event => {
	event.notification.close()
	const data = event.notification.data || {}

	event.waitUntil(
		windowClients().then(clients => {
			const client = clients.find(candidate => "focus" in candidate)

			if (client) {
				client.postMessage({ type: "add-os/notification-click", data })
				return client.focus()
			}

			const params = new URLSearchParams()
			if (data.notification_id) params.set("notification", data.notification_id)
			if (data.target_type) params.set("target_type", data.target_type)
			if (data.target_id) params.set("target_id", data.target_id)
			return globalThis.clients.openWindow(`/?${params.toString()}`)
		})
	)
})
