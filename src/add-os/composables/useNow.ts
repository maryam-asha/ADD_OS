import type { Ref } from "vue"
import { onScopeDispose, ref } from "vue"

/**
 * A clock as a ref: `now.value` is the current epoch-millis, refreshed every
 * `intervalMs`.
 *
 * Exists so a rendered relative time actually ages. A cell that formats
 * `requested_at` against a value captured at fetch time reads "just now" for as
 * long as the page stays open — precisely backwards for a queue whose whole
 * purpose is showing how long someone has been waiting. Passing this ref into
 * `formatRelativeTime`'s `now` option makes the row re-render on each tick.
 *
 * `onScopeDispose` rather than `onUnmounted`: this is then safe to call from any
 * effect scope, not only from a component's `setup`, and a leaked interval that
 * keeps a disposed reactive graph alive is the failure mode being prevented.
 */
export function useNow(intervalMs: number): Ref<number> {
	const now = ref(Date.now())
	const timer = setInterval(() => {
		now.value = Date.now()
	}, intervalMs)

	onScopeDispose(() => clearInterval(timer))

	return now
}
