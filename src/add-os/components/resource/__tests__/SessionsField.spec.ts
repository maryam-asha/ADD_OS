import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import SessionsField from "../SessionsField.vue"

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			sessionsField: {
				date: "Date",
				from: "From",
				to: "To",
				add: "Add another day",
				remove: "Remove this day",
				orderError: "A day must end after it starts."
			}
		}
	}
})

interface FieldVm {
	rows: { date: string | null, start: string | null, end: string | null }[]
	addRow: () => void
	removeRow: (index: number) => void
	rowError: string | null
}

function mountField(modelValue: { start_at: string, end_at: string }[] | null = null) {
	const wrapper = mount(SessionsField, {
		props: { modelValue },
		global: { plugins: [i18n] }
	})

	return { wrapper, vm: wrapper.vm as unknown as FieldVm }
}

/** What the field last emitted to the form. */
function lastEmitted(wrapper: ReturnType<typeof mountField>["wrapper"]) {
	const events = wrapper.emitted("update:modelValue")
	return events?.at(-1)?.[0] as { start_at: string, end_at: string }[] | undefined
}

describe("sessionsField", () => {
	beforeEach(() => {
		document.body.innerHTML = ""
	})

	it("starts with one day, so a single-sitting event needs no extra step", () => {
		const { vm } = mountField()

		expect(vm.rows).toHaveLength(1)
	})

	/**
	 * The whole point: two pickers could not say "09:00-17:00 on Monday but
	 * 16:00-21:00 on Tuesday".
	 */
	it("gives every day its own hours", async () => {
		const { wrapper, vm } = mountField()

		vm.rows[0].date = "2026-12-01"
		vm.rows[0].start = "09:00"
		vm.rows[0].end = "17:00"
		vm.addRow()
		vm.rows[1].date = "2026-12-02"
		vm.rows[1].start = "16:00"
		vm.rows[1].end = "21:00"
		vm.addRow()
		vm.removeRow(2)
		await wrapper.vm.$nextTick()

		const emitted = lastEmitted(wrapper)!

		expect(emitted).toHaveLength(2)
		expect(emitted[0].start_at).toContain("2026-12-01T09:00")
		expect(emitted[0].end_at).toContain("2026-12-01T17:00")
		expect(emitted[1].start_at).toContain("2026-12-02T16:00")
		expect(emitted[1].end_at).toContain("2026-12-02T21:00")
	})

	/**
	 * A bare wall clock would be read as UTC by the API, moving a 21:00
	 * sitting onto the next day — the drift this project has shipped twice.
	 */
	it("states the offset, so the stored hours are the ones on screen", () => {
		const { wrapper, vm } = mountField()

		vm.rows[0].date = "2026-12-01"
		vm.addRow()
		vm.removeRow(1)

		expect(lastEmitted(wrapper)![0].start_at).toMatch(/[+-]\d{2}:\d{2}$|Z$/)
	})

	it("reads a stored schedule back as days and hours", () => {
		const { vm } = mountField([
			{ start_at: "2026-12-01T09:00:00+03:00", end_at: "2026-12-01T17:00:00+03:00" }
		])

		expect(vm.rows).toHaveLength(1)
		expect(vm.rows[0].date).toBe("2026-12-01")
		expect(vm.rows[0].start).toBe("09:00")
		expect(vm.rows[0].end).toBe("17:00")
	})

	it("offers the next day at the same hours, the usual multi-day shape", () => {
		const { vm } = mountField()

		vm.rows[0].date = "2026-12-01"
		vm.rows[0].start = "09:00"
		vm.rows[0].end = "17:00"
		vm.addRow()

		expect(vm.rows[1].date).toBe("2026-12-02")
		expect(vm.rows[1].start).toBe("09:00")
		expect(vm.rows[1].end).toBe("17:00")
	})

	it("flags a day that ends before it starts", () => {
		const { vm } = mountField()

		vm.rows[0].date = "2026-12-01"
		vm.rows[0].start = "17:00"
		vm.rows[0].end = "09:00"

		expect(vm.rowError).toBe("A day must end after it starts.")
	})

	it("emits only the days that are filled in", () => {
		const { wrapper, vm } = mountField()

		vm.rows[0].date = "2026-12-01"
		vm.addRow()
		// The second row has hours but no date yet.
		vm.rows[1].date = null
		vm.removeRow(1)

		expect(lastEmitted(wrapper)).toHaveLength(1)
	})

	/** A one-day event should not be able to delete its only row. */
	it("keeps the last day rather than leaving an event with no times", () => {
		const { wrapper } = mountField()

		expect(wrapper.findAll("button").filter(b => b.text().includes("Remove this day"))).toHaveLength(0)
	})

	it("defaults a new day to working hours, not midnight", () => {
		const { vm } = mountField()

		// Midnight would read back as a deliberate start time rather than an
		// omission — the trap in Naive's combined datetime picker.
		expect(vm.rows[0].start).toBe("09:00")
		expect(vm.rows[0].end).not.toBe("00:00")
	})
})
