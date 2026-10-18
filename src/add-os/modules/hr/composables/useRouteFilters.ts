import type { Ref } from "vue"
import type { LocationQuery, LocationQueryRaw } from "vue-router"
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

/** How a filter is read back from the URL. */
export type FilterKind = "string" | "number"

export type FilterValues<S extends Record<string, FilterKind>> = {
	[K in keyof S]: S[K] extends "number" ? number | null : string | null
}

export interface RouteFiltersOptions<S extends Record<string, FilterKind>> {
	/** Filters typed into, applied once typing pauses — a search box. */
	debounced?: (keyof S & string)[]
	delayMs?: number
	/**
	 * What a filter is when the URL does not name it — a queue that opens on
	 * its pending items. A filter at its default stays out of the URL.
	 */
	defaults?: Partial<FilterValues<S>>
}

const SEARCH_DELAY_MS = 350

/**
 * A list page's filters and page number, kept in the URL query so the back
 * button and a shared link reopen the same view.
 *
 * - `filters` is what the inputs bind to; `applied` is what the list loads
 *   with. A debounced filter reaches `applied` 350ms after typing stops, any
 *   other filter at once.
 * - A changed filter starts again from page one; changing the page keeps
 *   the filters.
 * - `onChange` runs once per effective change, filter and page reset together
 *   included, and once on mount (not during setup, so `onChange` may read
 *   what this returns).
 */
export function useRouteFilters<S extends Record<string, FilterKind>>(
	schema: S,
	onChange: () => void,
	options: RouteFiltersOptions<S> = {}
) {
	const route = useRoute()
	const router = useRouter()
	const keys = Object.keys(schema) as (keyof S & string)[]
	const debounced = new Set<string>(options.debounced ?? [])
	const delay = options.delayMs ?? SEARCH_DELAY_MS
	const defaults = (options.defaults ?? {}) as Partial<Record<string, string | number | null>>

	function read(query: LocationQuery): { values: FilterValues<S>; page: number } {
		const values = {} as Record<string, string | number | null>
		for (const key of keys) {
			const raw = query[key]
			const text = Array.isArray(raw) ? raw[0] : raw
			if (text === undefined || text === null || text === "") {
				values[key] = defaults[key] ?? (schema[key] === "string" && debounced.has(key) ? "" : null)
			} else if (schema[key] === "number") {
				const parsed = Number(text)
				values[key] = Number.isFinite(parsed) ? parsed : null
			} else {
				values[key] = text
			}
		}
		const page = Number(Array.isArray(query.page) ? query.page[0] : query.page)
		return { values: values as FilterValues<S>, page: Number.isInteger(page) && page > 1 ? page : 1 }
	}

	const initial = read(route.query)
	const filters = ref({ ...initial.values }) as Ref<FilterValues<S>>
	const applied = ref({ ...initial.values }) as Ref<FilterValues<S>>
	const page = ref(initial.page)

	const signature = (values: FilterValues<S>, p: number) => JSON.stringify([keys.map(k => values[k]), p])

	function toQuery(values: FilterValues<S>, p: number): LocationQueryRaw {
		const query: LocationQueryRaw = { ...route.query }
		for (const key of keys) {
			const value = values[key]
			const blank = value === null || (typeof value === "string" && value.trim() === "")
			if (blank || value === defaults[key]) delete query[key]
			else query[key] = String(typeof value === "string" ? value.trim() : value)
		}
		if (p > 1) query.page = String(p)
		else delete query.page
		return query
	}

	let timer: ReturnType<typeof setTimeout> | undefined

	function apply() {
		clearTimeout(timer)
		applied.value = { ...filters.value }
		page.value = 1
	}

	watch(
		filters,
		now => {
			if (signature(now, 0) === signature(applied.value, 0)) {
				clearTimeout(timer)
				return
			}
			const changedNow = keys.filter(key => now[key] !== applied.value[key] && !debounced.has(key))
			if (changedNow.length) {
				apply()
			} else {
				clearTimeout(timer)
				timer = setTimeout(apply, delay)
			}
		},
		{ deep: true }
	)

	// One load per effective change, and the URL follows.
	watch(
		() => signature(applied.value, page.value),
		() => {
			const query = toQuery(applied.value, page.value)
			if (JSON.stringify(query) !== JSON.stringify(route.query)) void router.replace({ query })
			onChange()
		}
	)
	onMounted(onChange)

	// The back button, or a link opened in place: the URL wins.
	watch(
		() => route.query,
		query => {
			const next = read(query)
			if (signature(next.values, next.page) === signature(applied.value, page.value)) return
			clearTimeout(timer)
			filters.value = { ...next.values }
			applied.value = { ...next.values }
			page.value = next.page
		}
	)

	onBeforeUnmount(() => clearTimeout(timer))

	return { filters, applied, page }
}
