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
})
