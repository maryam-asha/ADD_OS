import { describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"

import { ApiError } from "@/add-os/services/api"
import { useResourceList } from "../useResourceList"

describe("useResourceList", () => {
	it("fetches on creation and exposes the result", async () => {
		const list = vi.fn().mockResolvedValue([{ id: 1 }])

		const { data, isLoading, error } = useResourceList(list)

		expect(isLoading.value).toBe(true)
		await nextTick()
		await nextTick()

		expect(list).toHaveBeenCalledTimes(1)
		expect(data.value).toEqual([{ id: 1 }])
		expect(isLoading.value).toBe(false)
		expect(error.value).toBeNull()
	})

	it("re-runs list() when refetch() is called", async () => {
		const list = vi.fn().mockResolvedValue([{ id: 1 }])
		const { refetch } = useResourceList(list)
		await nextTick()

		await refetch()

		expect(list).toHaveBeenCalledTimes(2)
	})

	it("re-runs list() when the query ref changes", async () => {
		const list = vi.fn().mockResolvedValue([])
		const query = ref<Record<string, unknown> | undefined>({ branch_id: 1 })
		useResourceList(list, query)
		await nextTick()

		query.value = { branch_id: 2 }
		await nextTick()
		await nextTick()

		expect(list).toHaveBeenCalledTimes(2)
		expect(list).toHaveBeenLastCalledWith({ branch_id: 2 })
	})

	it("captures an ApiError instead of throwing, and leaves data empty", async () => {
		const failure = new ApiError(403, JSON.stringify({ message: "Forbidden." }))
		const list = vi.fn().mockRejectedValue(failure)

		const { data, error, isLoading } = useResourceList(list)
		await nextTick()
		await nextTick()

		expect(data.value).toEqual([])
		expect(error.value).toBe(failure)
		expect(isLoading.value).toBe(false)
	})

	describe("pagination (optional)", () => {
		it("exposes meta when list() resolves a Paginated<T>", async () => {
			const list = vi.fn().mockResolvedValue({
				data: [{ id: 1 }],
				meta: { current_page: 1, last_page: 4, per_page: 10, total: 40 }
			})

			const { data, meta } = useResourceList(list)
			await nextTick()
			await nextTick()

			expect(data.value).toEqual([{ id: 1 }])
			expect(meta.value).toEqual({ current_page: 1, last_page: 4, per_page: 10, total: 40 })
		})

		it("leaves meta undefined when list() resolves a plain array", async () => {
			const list = vi.fn().mockResolvedValue([{ id: 1 }])

			const { meta } = useResourceList(list)
			await nextTick()
			await nextTick()

			expect(meta.value).toBeUndefined()
		})

		it("merges a page ref into the query and refetches when it changes", async () => {
			const list = vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } })
			const page = ref(1)

			useResourceList(list, undefined, page)
			await nextTick()
			await nextTick()

			expect(list).toHaveBeenLastCalledWith({ page: 1 })

			page.value = 2
			await nextTick()
			await nextTick()

			expect(list).toHaveBeenLastCalledWith({ page: 2 })
		})

		it("combines an existing query with the page ref", async () => {
			const list = vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } })
			const query = ref<Record<string, unknown> | undefined>({ branch_id: 1 })
			const page = ref(1)

			useResourceList(list, query, page)
			await nextTick()
			await nextTick()

			expect(list).toHaveBeenLastCalledWith({ branch_id: 1, page: 1 })
		})
	})
})
