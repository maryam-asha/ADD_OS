import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import CoworkingPoolPanel from "../CoworkingPoolPanel.vue"

const { getPoolMock, listWindowsMock, lendMock, takeBackMock, warningMock } = vi.hoisted(() => ({
	getPoolMock: vi.fn(),
	listWindowsMock: vi.fn(),
	lendMock: vi.fn(),
	takeBackMock: vi.fn(),
	warningMock: vi.fn()
}))

vi.mock("@/add-os/services/coworking", () => ({
	getCoworkingPool: getPoolMock,
	listCoworkingWindows: listWindowsMock,
	lendRoom: lendMock,
	takeRoomBack: takeBackMock
}))

// The panel calls useMessage()/useDialog() directly, which need providers it
// has no reason to mount.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: vi.fn(), error: vi.fn() }),
		useDialog: () => ({ warning: warningMock })
	}
})

enableAutoUnmount(afterEach)

function pool(overrides: Record<string, unknown> = {}) {
	return {
		from: "2026-10-01T09:00:00+03:00",
		to: "2026-10-02T00:00:00+03:00",
		capacity_now: 16,
		usage_now: 11,
		free_now: 5,
		min_free: 2,
		segments: [],
		...overrides
	}
}

interface PanelVm {
	openLend: () => void
	lendForm: { space_id: number | null, date: string, from: string | null, to: string | null, seats: number | null }
	canLend: boolean
	submitLend: () => Promise<void>
	takeBack: (window: { id: number }, override?: boolean) => Promise<void>
}

function mountPanel() {
	return mount(CoworkingPoolPanel, {
		props: {
			branchId: 1,
			rooms: [{ id: 2, title: "Meeting Room 1", capacity: 8 }],
			today: "2026-10-01"
		},
		global: {
			plugins: [createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: {} } })]
		}
	})
}

describe("coworkingPoolPanel", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		getPoolMock.mockResolvedValue(pool())
		listWindowsMock.mockResolvedValue([])
	})

	/** The server's own counts, shown as they came — nothing is recounted here. */
	it("shows the branch's seats as the server counted them", async () => {
		const wrapper = mountPanel()
		await flushPromises()

		expect(getPoolMock).toHaveBeenCalledWith(1)
		const text = wrapper.text()
		expect(text).toContain("16")
		expect(text).toContain("11")
		expect(text).toContain("5")
	})

	/**
	 * "Taken now" is this moment only: seats booked for 19:00 are not taken at
	 * 17:00. They are listed stretch by stretch until closing instead of
	 * appearing nowhere.
	 */
	it("lists the seats taken later today, not only now", async () => {
		getPoolMock.mockResolvedValue(pool({
			capacity_now: 13,
			usage_now: 0,
			free_now: 13,
			min_free: 10,
			segments: [
				{ start: "2026-10-01T17:00:00+03:00", end: "2026-10-01T18:00:00+03:00", capacity: 13, usage: 0, free: 13 },
				{ start: "2026-10-01T18:00:00+03:00", end: "2026-10-01T19:00:00+03:00", capacity: 13, usage: 1, free: 12 },
				{ start: "2026-10-01T19:00:00+03:00", end: "2026-10-01T20:00:00+03:00", capacity: 13, usage: 3, free: 10 }
			]
		}))
		const wrapper = mountPanel()
		await flushPromises()

		const rows = wrapper.findAll(".add-segment-row")
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain("coworkingPool.stats.busiest")
	})

	it("says so when every seat is taken", async () => {
		getPoolMock.mockResolvedValue(pool({ usage_now: 16, free_now: 0, min_free: 0 }))
		const wrapper = mountPanel()
		await flushPromises()

		expect(wrapper.text()).toContain("coworkingPool.full")
	})

	/** Local wall-clock, as every booking time is sent. */
	it("lends a room for a stretch of the day, in district wall-clock", async () => {
		lendMock.mockResolvedValue({ id: 1 })
		const wrapper = mountPanel()
		await flushPromises()
		const vm = wrapper.vm as unknown as PanelVm

		vm.openLend()
		await flushPromises()
		// The only room is preselected, with all its seats.
		expect(vm.lendForm.space_id).toBe(2)
		expect(vm.lendForm.seats).toBe(8)

		vm.lendForm.from = "14:00"
		vm.lendForm.to = "18:00"
		vm.lendForm.seats = 6
		await flushPromises()
		expect(vm.canLend).toBe(true)

		await vm.submitLend()

		expect(lendMock).toHaveBeenCalledWith(2, { starts_at: "2026-10-01 14:00", ends_at: "2026-10-01 18:00", seats: 6 })
		expect(wrapper.emitted("changed")).toHaveLength(1)
	})

	it("will not lend a stretch that ends before it starts", async () => {
		const wrapper = mountPanel()
		await flushPromises()
		const vm = wrapper.vm as unknown as PanelVm

		vm.openLend()
		vm.lendForm.from = "18:00"
		vm.lendForm.to = "14:00"
		await flushPromises()

		expect(vm.canLend).toBe(false)
	})

	/**
	 * Seats the pool is counting on are not taken back silently: the server
	 * refuses, and only an explicit second request with override goes through.
	 */
	it("asks before taking back seats the pool is counting on", async () => {
		const { ApiError } = await import("@/add-os/services/api")
		takeBackMock.mockRejectedValueOnce(new ApiError(422, JSON.stringify({ message: "Co-working seats are already counted on." })))
		takeBackMock.mockResolvedValueOnce({ message: "Taken back." })
		const wrapper = mountPanel()
		await flushPromises()
		const vm = wrapper.vm as unknown as PanelVm

		await vm.takeBack({ id: 7 })
		expect(takeBackMock).toHaveBeenCalledWith(7, false)
		expect(warningMock).toHaveBeenCalledOnce()

		await warningMock.mock.calls[0][0].onPositiveClick()
		expect(takeBackMock).toHaveBeenLastCalledWith(7, true)
	})
})
