import type { InjectionKey, Ref } from "vue"
import type { Paginated, PaginationMeta } from "@/add-os/services/pagination"
import { getCurrentInstance, provide, ref, watch } from "vue"
import { ApiError } from "@/add-os/services/api"

export const RESOURCE_REFETCH_KEY: InjectionKey<() => Promise<void>> = Symbol("resourceRefetch")

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

	if (getCurrentInstance()) {
		provide(RESOURCE_REFETCH_KEY, refetch)
	}

	// Filters are bound to fields of `query` (v-model="query.status"), so the
	// watch must be deep — a shallow one only sees `query.value = {...}`, and a
	// changed filter would wait for the next page change to apply.
	if (page) {
		// A changed filter starts again at page 1: page 3 of an unfiltered list
		// is rarely page 3 of the filtered one. Resetting the page triggers the
		// refetch below; when already on page 1, the filter refetches directly.
		if (query) {
			watch(
				query,
				() => {
					if (page.value !== 1) page.value = 1
					else void refetch()
				},
				{ deep: true }
			)
		}
		watch(page, refetch, { immediate: true })
	} else if (query) {
		watch(query, refetch, { immediate: true, deep: true })
	} else {
		refetch()
	}

	return { data, isLoading, error, refetch, meta }
}
