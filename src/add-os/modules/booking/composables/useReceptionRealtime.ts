import type { ReceptionEvent } from "@/add-os/services/realtime"
import { useChannelRefetch } from "@/add-os/composables/useChannelRefetch"
import { RECEPTION_EVENTS, subscribeReception } from "@/add-os/services/realtime"

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
 * reload after it rather than a request each. The core lives in
 * `useChannelRefetch`, shared with the kitchen board.
 */
export function useReceptionRealtime(
	refetch: () => Promise<void> | void,
	options: { events?: readonly ReceptionEvent[]; pollMs?: number } = {}
): void {
	useChannelRefetch(onEvent => subscribeReception(onEvent, options.events ?? RECEPTION_EVENTS), refetch, options.pollMs ?? RECEPTION_FALLBACK_POLL_MS)
}
