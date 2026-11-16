import { describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import { playChime, useNewArrivalChime } from "@/add-os/composables/useNewArrivalChime"

function setup() {
	const items = ref<{ id: number; status?: string }[]>([])
	const play = vi.fn()
	const chime = useNewArrivalChime(items, play)
	return { items, play, chime }
}

describe("useNewArrivalChime", () => {
	it("stays_silent_on_the_first_load", async () => {
		const { items, play } = setup()
		items.value = [{ id: 1 }, { id: 2 }]
		await nextTick()
		expect(play).not.toHaveBeenCalled()
	})

	it("rings_once_when_a_new_order_arrives", async () => {
		const { items, play } = setup()
		items.value = [{ id: 1 }]
		await nextTick()
		items.value = [{ id: 1 }, { id: 2 }, { id: 3 }]
		await nextTick()
		expect(play).toHaveBeenCalledTimes(1)
	})

	it("stays_silent_when_an_order_leaves_or_changes_status", async () => {
		const { items, play } = setup()
		items.value = [{ id: 1, status: "pending" }, { id: 2, status: "pending" }]
		await nextTick()
		items.value = [{ id: 1, status: "preparing" }]
		await nextTick()
		expect(play).not.toHaveBeenCalled()
	})

	it("stays_silent_when_an_order_that_left_comes_back", async () => {
		const { items, play } = setup()
		items.value = [{ id: 1 }]
		await nextTick()
		items.value = []
		await nextTick()
		items.value = [{ id: 1 }]
		await nextTick()
		expect(play).not.toHaveBeenCalled()
	})

	it("rings_for_the_first_order_into_an_empty_list", async () => {
		const { items, play } = setup()
		items.value = []
		await nextTick()
		items.value = [{ id: 9 }]
		await nextTick()
		expect(play).toHaveBeenCalledTimes(1)
	})

	it("stays_silent_after_rebase_for_another_page", async () => {
		const { items, play, chime } = setup()
		items.value = [{ id: 1 }]
		await nextTick()
		chime.rebase()
		items.value = [{ id: 50 }, { id: 51 }]
		await nextTick()
		expect(play).not.toHaveBeenCalled()
		items.value = [{ id: 50 }, { id: 51 }, { id: 52 }]
		await nextTick()
		expect(play).toHaveBeenCalledTimes(1)
	})

	it("play_chime_does_nothing_without_web_audio", () => {
		expect(() => playChime()).not.toThrow()
	})
})
