import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import EventSessionsDrawer from "../EventSessionsDrawer.vue"

// Toasts need an <n-message-provider> ancestor, which a mounted-in-isolation
// component has no reason to carry.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }) }
})

vi.mock("@/add-os/services/events", () => ({
	getEvent: vi.fn(),
	updateEvent: vi.fn()
}))

const { getEvent, updateEvent } = await import("@/add-os/services/events")

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			common: { save: "Save", close: "Close" },
			events: {
				sessions: {
					title: "Schedule",
					manage: "Schedule",
					note: "Add a sitting for each day.",
					empty: "No schedule yet.",
					add: "Add a sitting",
					remove: "Remove this sitting",
					startAt: "Starts",
					endAt: "Ends",
					orderError: "A sitting must end after it starts.",
					incomplete: "Every sitting needs both a start and an end.",
					saved: "Schedule saved.",
					loadError: "Could not load the schedule.",
					saveError: "Could not save the schedule."
				}
			}
		}
	}
})

function mountDrawer(eventId: number | null = 7) {
	return mount(EventSessionsDrawer, {
		props: { show: true, eventId },
		global: { plugins: [i18n] }
	})
}

/** n-modal teleports its content to <body>, so the wrapper itself is empty. */
function renderedText(): string {
	return document.body.textContent ?? ""
}

interface DrawerVm {
	rows: { start: number | null, end: number | null }[]
	addRow: () => void
	save: () => Promise<void>
	orderError: string | null
}

function vmOf(wrapper: ReturnType<typeof mountDrawer>): DrawerVm {
	return wrapper.vm as unknown as DrawerVm
}

const DAY = 24 * 60 * 60 * 1000

describe("eventSessionsDrawer", () => {
	beforeEach(() => {
		document.body.innerHTML = ""
		vi.clearAllMocks()
		vi.mocked(getEvent).mockResolvedValue({ id: 7, sessions: [] } as never)
		vi.mocked(updateEvent).mockResolvedValue({ message: "ok" } as never)
	})

	it("loads the schedule of the event it was opened for", async () => {
		mountDrawer(7)
		await flushPromises()

		expect(getEvent).toHaveBeenCalledWith(7)
	})

	it("says an event without a schedule simply runs once", async () => {
		mountDrawer()
		await flushPromises()

		expect(renderedText()).toContain("No schedule yet.")
	})

	it("reads each stored sitting back into its own row", async () => {
		vi.mocked(getEvent).mockResolvedValue({
			id: 7,
			sessions: [
				{ start_at: "2026-12-01T09:00:00+03:00", end_at: "2026-12-01T17:00:00+03:00" },
				{ start_at: "2026-12-02T10:00:00+03:00", end_at: "2026-12-02T14:00:00+03:00" }
			]
		} as never)

		const vm = vmOf(mountDrawer(7))
		await flushPromises()

		expect(vm.rows).toHaveLength(2)
		expect(Number.isFinite(vm.rows[0].start)).toBe(true)
		expect(Number.isFinite(vm.rows[1].end)).toBe(true)
	})

	it("sends one entry per sitting, each with its own hours", async () => {
		const vm = vmOf(mountDrawer(7))
		await flushPromises()

		const base = new Date(2026, 11, 1, 9, 0).getTime()
		vm.rows.push({ start: base, end: base + 8 * 60 * 60 * 1000 })
		vm.rows.push({ start: base + DAY, end: base + DAY + 4 * 60 * 60 * 1000 })

		await vm.save()

		const sent = vi.mocked(updateEvent).mock.calls[0][1] as { sessions: { start_at: string }[] }
		expect(sent.sessions).toHaveLength(2)
	})

	/**
	 * A bare wall clock would be read as UTC by the backend, moving a 21:00
	 * sitting onto the next day. The offset is what makes the hours the admin
	 * sees the hours that get stored.
	 */
	it("states the offset, so the stored hours are the ones on screen", async () => {
		const vm = vmOf(mountDrawer(7))
		await flushPromises()

		const start = new Date(2026, 11, 1, 9, 0).getTime()
		vm.rows.push({ start, end: start + 3600_000 })
		await vm.save()

		const sent = vi.mocked(updateEvent).mock.calls[0][1] as { sessions: { start_at: string }[] }
		expect(sent.sessions[0].start_at).toMatch(/[+-]\d{2}:\d{2}$|Z$/)
	})

	it("refuses a sitting that ends before it starts", async () => {
		const vm = vmOf(mountDrawer(7))
		await flushPromises()

		const start = new Date(2026, 11, 1, 17, 0).getTime()
		vm.rows.push({ start, end: start - 3600_000 })
		await vm.save()

		expect(updateEvent).not.toHaveBeenCalled()
		expect(vm.orderError).toBe("A sitting must end after it starts.")
	})

	it("refuses a half-filled sitting rather than sending a null hour", async () => {
		const vm = vmOf(mountDrawer(7))
		await flushPromises()

		vm.rows.push({ start: new Date(2026, 11, 1, 9, 0).getTime(), end: null })
		await vm.save()

		expect(updateEvent).not.toHaveBeenCalled()
		expect(renderedText()).toContain("Every sitting needs both a start and an end.")
	})

	/**
	 * A multi-day event is usually consecutive days at the same hours, so the
	 * next row starts there rather than as an empty pair of pickers.
	 */
	it("offers the next day at the same hours when a sitting is added", async () => {
		const vm = vmOf(mountDrawer(7))
		await flushPromises()

		const start = new Date(2026, 11, 1, 9, 0).getTime()
		vm.rows.push({ start, end: start + 8 * 60 * 60 * 1000 })

		vm.addRow()

		expect(vm.rows[1].start).toBe(start + DAY)
		expect(vm.rows[1].end).toBe(start + 8 * 60 * 60 * 1000 + DAY)
	})

	it("starts an empty schedule with a blank row rather than guessing", async () => {
		const vm = vmOf(mountDrawer(7))
		await flushPromises()

		vm.addRow()

		expect(vm.rows[0]).toEqual({ start: null, end: null })
	})

	it("surfaces a load failure instead of showing an empty schedule", async () => {
		vi.mocked(getEvent).mockRejectedValue(new Error("network"))

		mountDrawer(7)
		await flushPromises()

		expect(renderedText()).toContain("Could not load the schedule.")
	})

	it("shows why the API refused a schedule", async () => {
		vi.mocked(updateEvent).mockRejectedValue({ data: { message: "Too many sittings." } })

		const vm = vmOf(mountDrawer(7))
		await flushPromises()

		const start = new Date(2026, 11, 1, 9, 0).getTime()
		vm.rows.push({ start, end: start + 3600_000 })
		await vm.save()
		await flushPromises()

		expect(renderedText()).toContain("Too many sittings.")
	})
})
