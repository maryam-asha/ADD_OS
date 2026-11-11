import { onBeforeUnmount, onMounted } from "vue"
import { isRealtimeConnected } from "@/add-os/services/realtime"

/**
 * Keeps a screen current while it is mounted: re-fetches when its channel
 * says something it shows changed, and every `pollMs` only while the socket
 * is not connected — not configured locally, or dropped. With the socket up
 * there is no request on the timer at all.
 *
 * `subscribe` attaches to the channel and returns its unsubscribe
 * (`subscribeReception`, `subscribeKitchen`); `refetch` is the screen's own
 * reload, the one its refresh button calls. The event's ids are not used, the
 * list is simply read again. Events arriving together, or while a reload is
 * still running, are folded into one more reload after it rather than a
 * request each.
 *
 * The reload/poll core of `useReceptionRealtime`, shared with the kitchen
 * board's `useKitchenRealtime` so the two cannot drift.
 */
export function useChannelRefetch(subscribe: (onEvent: () => void) => () => void, refetch: () => Promise<void> | void, pollMs: number): void {
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
		unsubscribe = subscribe(() => void reload())
		poller = setInterval(() => {
			if (!isRealtimeConnected()) void reload()
		}, pollMs)
	})

	onBeforeUnmount(() => {
		unsubscribe?.()
		unsubscribe = null
		clearInterval(poller)
	})
}
