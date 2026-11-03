import type { InboxAudience } from "@/add-os/services/notifications"
import { registerBrowserToken, removeBrowserToken } from "@/add-os/services/notifications"

/**
 * Browser notifications for the dashboard — Firebase Cloud Messaging over
 * Web Push, so a staff or provider notice reaches the account even with no
 * dashboard tab in view (`public/notifications-sw.js` shows it).
 *
 * ── Off unless configured ───────────────────────────────────────────────────
 * Five build-time values, from the Firebase project the member app already
 * uses (Project settings → General → Web app; Cloud Messaging → Web Push
 * certificates): VITE_FIREBASE_API_KEY, _PROJECT_ID, _MESSAGING_SENDER_ID,
 * _APP_ID and _VAPID_KEY. With any unset nothing here runs, Firebase is never
 * loaded (dynamic imports), and the bell works on Pusher alone.
 *
 * ── The token's life ────────────────────────────────────────────────────────
 * The browser asks for permission only on a click (browsers ignore or punish
 * a prompt nobody asked for). Once allowed, every start of the bell registers
 * the token again — Firebase rotates it, and the request's `lang` header sets
 * the language this browser's pushes are written in. Signing out removes it
 * from the server while the session still exists, then unsubscribes the
 * browser; a session that ended on its own (a 401) can only do the second,
 * which is enough — an unsubscribed token stops receiving at once.
 */

export type BrowserPushState = "unsupported" | "unconfigured" | "default" | "granted" | "denied"

const CONFIG = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
	appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined
}
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

export const SERVICE_WORKER_URL = "/notifications-sw.js"
export const TOKEN_STORAGE_KEY = "add-os.push-token"

function isSet(value: string | undefined): value is string {
	return typeof value === "string" && value.trim() !== ""
}

export function isBrowserPushConfigured(): boolean {
	return [...Object.values(CONFIG), VAPID_KEY].every(isSet)
}

function isSupported(): boolean {
	return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window
}

export function browserPushState(): BrowserPushState {
	if (!isSupported()) return "unsupported"
	if (!isBrowserPushConfigured()) return "unconfigured"
	return Notification.permission as "default" | "granted" | "denied"
}

function remembered(): string | null {
	try {
		return localStorage.getItem(TOKEN_STORAGE_KEY)
	} catch {
		return null
	}
}

function remember(token: string | null): void {
	try {
		if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
		else localStorage.removeItem(TOKEN_STORAGE_KEY)
	} catch {
		// Private mode or blocked storage: the token is simply not remembered.
	}
}

/** This browser's token for the dashboard's own service worker. */
async function currentToken(): Promise<string | null> {
	const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" })
	const [{ getApps, initializeApp }, { getMessaging, getToken }] = await Promise.all([import("firebase/app"), import("firebase/messaging")])
	const app = getApps()[0] ?? initializeApp(CONFIG)
	const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
	return token || null
}

async function register(audience: InboxAudience): Promise<void> {
	const token = await currentToken()
	if (!token) return
	await registerBrowserToken(audience, token)
	remember(token)
}

/** The button: asks the browser, then registers this browser for the account. Returns the state it ended in. */
export async function enableBrowserPush(audience: InboxAudience): Promise<BrowserPushState> {
	const state = browserPushState()
	if (state === "unsupported" || state === "unconfigured") return state

	const permission = await Notification.requestPermission()
	if (permission !== "granted") return permission

	await register(audience)
	return "granted"
}

/** At the bell's start and after a language switch: a browser already allowed registers again. */
export async function syncBrowserPush(audience: InboxAudience): Promise<void> {
	if (browserPushState() !== "granted") return
	try {
		await register(audience)
	} catch {
		// The next start tries again; the bell works without it.
	}
}

/** Explicit sign-out, while the session still exists: the server forgets this browser, then the browser unsubscribes. */
export async function removeBrowserPush(audience: InboxAudience | null): Promise<void> {
	const token = remembered()
	if (token && audience) {
		try {
			await removeBrowserToken(audience, token)
		} catch {
			// Unsubscribing below stops the pushes anyway.
		}
	}
	await forgetBrowserPushLocally()
}

/** Any sign-out, including a session that ended on its own: the browser drops its push subscription. */
export async function forgetBrowserPushLocally(): Promise<void> {
	const had = remembered()
	remember(null)
	if (!had || !isSupported()) return

	try {
		const registration = await navigator.serviceWorker.getRegistration("/")
		const subscription = await registration?.pushManager.getSubscription()
		await subscription?.unsubscribe()
	} catch {
		// Nothing more can be done from here; the token left on the server only fails at FCM.
	}
}
