import type Echo from "laravel-echo"
import { post } from "./api"

/**
 * Real-time nudges from ADD Core to the reception desk — Laravel broadcasting over the Pusher protocol (ADDCore
 * config/broadcasting.php).
 *
 * ── What travels ────────────────────────────────────────────────────────────
 * Only an event name and ids, on the private `reception` channel. A screen
 * that hears one re-fetches the endpoint it already reads; nothing on screen is ever
 * taken from an event, so a missed or duplicated event costs one stale list or
 * one extra request, never a wrong one.
 *
 * ── Off unless configured ───────────────────────────────────────────────────
 * Without `VITE_PUSHER_APP_KEY` and `VITE_PUSHER_APP_CLUSTER` this whole module is a no-op: nothing connects,
 * `laravel-echo` and `pusher-js` are never even loaded (dynamic imports), and
 * screens fall back to polling. Local development needs no keys.
 *
 * ── Hosts ───────────────────────────────────────────────────────────────────
 * The socket itself goes to Pusher's cluster host (ws-<cluster>.pusher.com),
 * which pusher-js builds at runtime — decided with the product owner: the
 * production host cannot run a socket server of its own. `enabledTransports`
 * is pinned to WebSockets so pusher-js never fetches its SockJS fallback from
 * js.pusher.com (see no-external-urls.spec.ts). Moving to a self-hosted Reverb
 * server later is the `broadcaster`/`wsHost` options here and nothing else.
 *
 * ── Auth ────────────────────────────────────────────────────────────────────
 * The channel is signed by `POST /api/broadcasting/auth` through the same
 * `post()` every dashboard call uses — the session cookie, X-XSRF-TOKEN and the
 * `lang` header come with it, and a 401 signs the operator out like any other.
 */

/** The events the API sends on `private-reception` — ADDCore App\Domain\Booking\Events. */
export const RECEPTION_EVENTS = [
	"arrival_request.created",
	"arrival_request.resolved",
	"session_end_request.created",
	"session_end_request.cancelled",
	"session_end_request.resolved"
] as const

export type ReceptionEvent = (typeof RECEPTION_EVENTS)[number]

export type ReceptionEventHandler = (event: ReceptionEvent, payload: Record<string, unknown>) => void

const RECEPTION_CHANNEL = "reception"

type EchoInstance = Echo<"pusher">

const PUSHER_KEY = import.meta.env.VITE_PUSHER_APP_KEY as string | undefined
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_APP_CLUSTER as string | undefined

let echo: Promise<EchoInstance | null> | null = null
let connected = false
let receptionListeners = 0

function isSet(value: string | undefined): value is string {
	return typeof value === "string" && value.trim() !== ""
}

/**
 * True when both the key and the cluster are set — the screens poll instead
 * when they are not. No cluster is assumed: a guessed one would only connect
 * to the wrong place and fail later, more quietly.
 */
export function isRealtimeConfigured(): boolean {
	return isSet(PUSHER_KEY) && isSet(PUSHER_CLUSTER)
}

/** True while the socket is up. Screens poll whenever this is false. */
export function isRealtimeConnected(): boolean {
	return connected
}

async function createEcho(): Promise<EchoInstance | null> {
	const [{ default: EchoClass }, { default: Pusher }] = await Promise.all([import("laravel-echo"), import("pusher-js")])

	const instance = new EchoClass({
		broadcaster: "pusher",
		key: PUSHER_KEY,
		cluster: PUSHER_CLUSTER,
		forceTLS: true,
		enabledTransports: ["ws", "wss"],
		Pusher,
		// No axios/jQuery here to decorate with X-Socket-ID; nothing to intercept.
		withoutInterceptors: true,
		channelAuthorization: {
			customHandler: ({ socketId, channelName }, callback) => {
				post<{ auth: string }>("/api/broadcasting/auth", { socket_id: socketId, channel_name: channelName })
					.then(data => callback(null, data))
					.catch((error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), null))
			}
		}
	})

	const connection = instance.connector.pusher.connection
	connected = connection.state === "connected"
	connection.bind("state_change", ({ current }: { current: string }) => {
		connected = current === "connected"
	})

	return instance
}

/** The one Echo instance, created on first use; null when realtime is not configured or failed to load. */
function getEcho(): Promise<EchoInstance | null> {
	if (!isRealtimeConfigured()) return Promise.resolve(null)
	echo ??= createEcho().catch((error: unknown) => {
		console.warn("[ADD OS] real-time updates unavailable — falling back to polling", error)
		return null
	})
	return echo
}

/**
 * Calls `handler` for each of `events` sent on `private-reception` until the
 * returned function is called. Safe to call when realtime is off (does nothing)
 * and from several screens at once: the channel is left only when the last
 * screen stops listening.
 */
export function subscribeReception(handler: ReceptionEventHandler, events: readonly ReceptionEvent[] = RECEPTION_EVENTS): () => void {
	let stopped = false
	const callbacks = events.map(event => [event, (payload: Record<string, unknown>) => handler(event, payload ?? {})] as const)
	let attached: EchoInstance | null = null

	receptionListeners++

	void getEcho().then(instance => {
		if (!instance || stopped) return
		attached = instance
		const channel = instance.private(RECEPTION_CHANNEL)
		// Leading dot: the API names its events with broadcastAs(), so Echo must
		// not prefix them with a PHP namespace.
		for (const [event, callback] of callbacks) channel.listen(`.${event}`, callback)
	})

	return () => {
		if (stopped) return
		stopped = true
		receptionListeners--
		if (!attached) return
		const channel = attached.private(RECEPTION_CHANNEL)
		for (const [event, callback] of callbacks) channel.stopListening(`.${event}`, callback)
		if (receptionListeners === 0) attached.leave(RECEPTION_CHANNEL)
	}
}

/** Test seam: forget the instance and the counters. */
export function resetRealtimeForTests(): void {
	echo = null
	connected = false
	receptionListeners = 0
}
