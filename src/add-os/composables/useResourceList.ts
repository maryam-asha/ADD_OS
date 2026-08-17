import type { Ref } from "vue"
import type { Paginated, PaginationMeta } from "@/add-os/services/pagination"
import { ref, watch } from "vue"
import { ApiError } from "@/add-os/services/api"

export function useResourceList<T>(
	list: (query?: Record<string, unknown>) => Promise<T[] | Paginated<T>>,
	query?: Ref<Record<string, unknown> | undefined>,
	page?: Ref<number>
) {
	const data = ref<T[]>([]) as Ref<T[]>
	const meta = ref<PaginationMeta | undefined>(undefined) as Ref<PaginationMeta | undefined>
	const isLoading = ref(true)
	const error = ref<ApiError | null>(null)

	async function refetch() {
		isLoading.value = true
		error.value = null
		try {
			const effectiveQuery = page ? { ...(query?.value ?? {}), page: page.value } : query?.value
			const result = await list(effectiveQuery)
			if (Array.isArray(result)) {
				data.value = result
				meta.value = undefined
			} else {
				data.value = result.data
				meta.value = result.meta
			}
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			error.value = caught
			data.value = []
			meta.value = undefined
		} finally {
			isLoading.value = false
		}
	}

	if (page) {
		watch([query ?? ref(undefined), page], refetch, { immediate: true })
	} else if (query) {
		watch(query, refetch, { immediate: true })
	} else {
		refetch()
	}

	return { data, isLoading, error, refetch, meta }
}
