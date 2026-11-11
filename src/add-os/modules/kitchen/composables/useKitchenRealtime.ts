import { useChannelRefetch } from "@/add-os/composables/useChannelRefetch"
import { subscribeKitchen } from "@/add-os/services/realtime"

/** How often the board re-reads its orders while the socket is down or not configured. */
export const KITCHEN_FALLBACK_POLL_MS = 30_000

/**
 * Keeps a kitchen screen current while it is mounted — the same contract as
 * `useReceptionRealtime`, on `private-kitchen`: re-fetches when an order is
 * sent or changes, and every 30 s only while the socket is not connected, so
 * a board without Pusher configured (or with the socket dropped) still moves.
 */
export function useKitchenRealtime(refetch: () => Promise<void> | void, { pollMs = KITCHEN_FALLBACK_POLL_MS }: { pollMs?: number } = {}): void {
	useChannelRefetch(onEvent => subscribeKitchen(onEvent), refetch, pollMs)
}
