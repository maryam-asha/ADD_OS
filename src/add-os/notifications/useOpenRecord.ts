import type { Ref } from "vue"
import { nextTick, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

/**
 * The record a link asks a list page to open — `?open=<id>`, what a
 * notification leads to (`notificationTarget`). A page with a detail view
 * passes `onOpen` and shows that record there; a page without one gets the
 * row picked out: `rowClassName` for its table, scrolled into view once the
 * rows that hold it are on screen (`reveal`). The query is dropped once
 * handled, so a reload or a back-navigation does not open it again; a new
 * link to the same page (a second notification) opens the new record.
 */
export const OPEN_QUERY = "open"
export const FOCUSED_ROW_CLASS = "add-row-focused"

export function useOpenRecord(
	onOpen?: (id: number) => void,
	/** The page's rows: when they change, the picked-out row is scrolled to. */
	rows?: () => unknown
): {
	focusedId: Ref<number | null>
	rowClassName: (row: { id?: number | string }) => string
	reveal: () => Promise<void>
} {
	const route = useRoute()
	const router = useRouter()
	const focusedId = ref<number | null>(null)

	if (rows) watch(rows, () => void reveal())

	watch(
		() => route.query[OPEN_QUERY],
		value => {
			const id = Number(Array.isArray(value) ? value[0] : value)
			if (!Number.isInteger(id) || id <= 0) return

			focusedId.value = id
			onOpen?.(id)

			void router.replace({ query: Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== OPEN_QUERY)) })
			void reveal()
		},
		{ immediate: true }
	)

	function rowClassName(row: { id?: number | string }): string {
		return focusedId.value !== null && Number(row.id) === focusedId.value ? FOCUSED_ROW_CLASS : ""
	}

	/** Scrolls the picked-out row into view; call again after the rows load. */
	async function reveal(): Promise<void> {
		if (focusedId.value === null) return
		await nextTick()
		document.querySelector(`.${FOCUSED_ROW_CLASS}`)?.scrollIntoView({ block: "center", behavior: "smooth" })
	}

	return { focusedId, rowClassName, reveal }
}
