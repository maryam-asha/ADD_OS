import { mount } from "@vue/test-utils"
import { NDatePicker, NTimePicker } from "naive-ui"
import { describe, expect, it } from "vitest"
import DateTimeInput from "../DateTimeInput.vue"

const OFFSET_ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:00[+-]\d\d:\d\d$/

function mountWith(modelValue: string | null) {
	const updates: (string | null)[] = []
	const wrapper = mount(DateTimeInput, { props: { "modelValue": modelValue, "onUpdate:modelValue": (v: string | null) => updates.push(v) } })
	return { wrapper, updates }
}

describe("dateTimeInput", () => {
	it("defaults an untouched time to 09:00, not midnight", () => {
		const { wrapper, updates } = mountWith(null)
		wrapper.findComponent(NDatePicker).vm.$emit("update:formatted-value", "2026-10-12")
		expect(updates[0]).toMatch(OFFSET_ISO)
		expect(new Date(updates[0] as string).getHours()).toBe(9)
		expect(new Date(updates[0] as string).getDate()).toBe(12)
	})

	it("takes a time before a date as today", () => {
		const { wrapper, updates } = mountWith(null)
		wrapper.findComponent(NTimePicker).vm.$emit("update:formatted-value", "14:30")
		const out = new Date(updates[0] as string)
		expect(out.toDateString()).toBe(new Date().toDateString())
		expect([out.getHours(), out.getMinutes()]).toEqual([14, 30])
	})

	it("reads a UTC value as the browser's local clock and writes it back with an explicit offset", () => {
		const { wrapper, updates } = mountWith("2026-10-12T06:00:00.000000Z")
		const local = new Date("2026-10-12T06:00:00Z")
		expect(wrapper.findComponent(NTimePicker).props("formattedValue")).toBe(`${String(local.getHours()).padStart(2, "0")}:00`)
		wrapper.findComponent(NTimePicker).vm.$emit("update:formatted-value", "10:00")
		expect(updates[0]).toMatch(OFFSET_ISO)
		expect(updates[0]).not.toMatch(/Z$/)
	})

	it("clears to null", () => {
		const { wrapper, updates } = mountWith("2026-10-12T09:00:00+03:00")
		wrapper.findComponent(NDatePicker).vm.$emit("update:formatted-value", null)
		expect(updates).toEqual([null])
	})

	it("disables both controls when disabled", () => {
		const wrapper = mount(DateTimeInput, { props: { modelValue: null, disabled: true } })
		expect(wrapper.findComponent(NDatePicker).props("disabled")).toBe(true)
		expect(wrapper.findComponent(NTimePicker).props("disabled")).toBe(true)
	})
})
