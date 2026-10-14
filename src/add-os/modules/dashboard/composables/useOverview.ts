import type { Ref } from "vue"
import type { DashboardParams } from "@/add-os/services/dashboard"
import { ref, watch } from "vue"

/**
 * One dashboard panel's data: fetched whenever the filters change, each panel
 * on its own so a slow or failing one never holds the others back. A reply to
 * an older filter that lands after a newer one is dropped. Any failure — the
 * server's answer or a request that never arrived — leaves the panel showing
 * its retry rather than an empty card.
 */
export function useOverview<T, P extends DashboardParams = DashboardParams>(fetch: (params: P) => Promise<T>, params: Ref<P>) {
	const data = ref<T | null>(null) as Ref<T | null>
	const isLoading = ref(true)
	const error = ref<unknown>(null)
	let latest = 0

	async function load() {
		const call = ++latest
		isLoading.value = true
		error.value = null
		try {
			const result = await fetch(params.value)
			if (call === latest) data.value = result
		} catch (caught) {
			if (call === latest) error.value = caught ?? new Error("Request failed")
		} finally {
			if (call === latest) isLoading.value = false
		}
	}

	watch(params, load, { immediate: true, deep: true })

	return { data, isLoading, error, reload: load }
}
