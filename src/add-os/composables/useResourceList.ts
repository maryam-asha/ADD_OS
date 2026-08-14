import type { Ref } from "vue"
import { ref, watch } from "vue"
import { ApiError } from "@/add-os/services/api"

export function useResourceList<T>(
	list: (query?: Record<string, unknown>) => Promise<T[]>,
	query?: Ref<Record<string, unknown> | undefined>
) {
	const data = ref<T[]>([]) as Ref<T[]>
	const isLoading = ref(true)
	const error = ref<ApiError | null>(null)

	async function refetch() {
		isLoading.value = true
		error.value = null
		try {
			data.value = await list(query?.value)
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			error.value = caught
			data.value = []
		} finally {
			isLoading.value = false
		}
	}

	if (query) {
		watch(query, refetch, { immediate: true })
	} else {
		refetch()
	}

	return { data, isLoading, error, refetch }
}
