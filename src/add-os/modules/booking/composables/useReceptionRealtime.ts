import type { ReceptionEvent } from "@/add-os/services/realtime"
import { onBeforeUnmount, onMounted } from "vue"
import { isRealtimeConnected, RECEPTION_EVENTS, subscribeReception } from "@/add-os/services/realtime"

/** How often a desk screen re-reads its list while the socket is down or not configured. */
export const RECEPTION_FALLBACK_POLL_MS = 30_000

/**
 * Keeps a reception screen current while it is mounted: re-fetches when the
 * API says something the screen shows changed (`private-reception`), and every
 * 30 s only while that socket is not connected — not configured locally, or
 * dropped. With the socket up there is no timer at all.
 *
 * `refetch` is the screen's own reload, the one its refresh button calls; the
 * event's ids are not used, the list is simply read again. Events arriving
 * together, or while a reload is still running, are folded into one more
 * reload after it rather than a request each.
 */
export function useReceptionRealtime(
	refetch: () => Promise<void> | void,
	options: { events?: readonly ReceptionEvent[]; pollMs?: number } = {}
): void {
	let unsubscribe: (() => void) | null = null
	let poller: ReturnType<typeof setInterval> | undefined
	let running = false
	let again = false

	async function reload(): Promise<void> {
		if (running) {
			again = true
			return
		}
		running = true
		try {
			do {
				again = false
				await refetch()
			} while (again)
		} finally {
			running = false
		}
	}

	onMounted(() => {
		unsubscribe = subscribeReception(() => void reload(), options.events ?? RECEPTION_EVENTS)
		poller = setInterval(() => {
			if (!isRealtimeConnected()) void reload()
		}, options.pollMs ?? RECEPTION_FALLBACK_POLL_MS)
	})

	onBeforeUnmount(() => {
		unsubscribe?.()
		unsubscribe = null
		clearInterval(poller)
	})
}
