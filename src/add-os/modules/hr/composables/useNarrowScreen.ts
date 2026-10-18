import type { Ref } from "vue"
import { onBeforeUnmount, ref } from "vue"

/** Below Tailwind's `sm`: where two description columns stop fitting. */
const NARROW = "(max-width: 39.99rem)"

/** Whether the screen is phone-narrow now; follows rotation and resizing. */
export function useNarrowScreen(): Ref<boolean> {
	const query = typeof window !== "undefined" && window.matchMedia ? window.matchMedia(NARROW) : null
	const narrow = ref(query?.matches ?? false)
	const update = (event: MediaQueryListEvent) => {
		narrow.value = event.matches
	}
	query?.addEventListener("change", update)
	onBeforeUnmount(() => query?.removeEventListener("change", update))
	return narrow
}
