import type { KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import AcceptWithChangesModal from "../AcceptWithChangesModal.vue"

function orderOf(overrides: Partial<KitchenOrder> = {}): KitchenOrder {
	return {
		id: 41,
		status: "pending",
		source: "app",
		delivery: { type: "pickup", label: "Kitchen counter", note: null },
		bill: { type: "walkin", id: 17 },
		route: "kitchen",
		payment: { choice: "bill", wallet_owner_type: null, paid: false },
		cash_due_points: null,
		cash_due_amounts: null,
		cash_return: null,
		lines: [
			{ id: 101, sale_item_id: 1, name: "Water", image_url: null, quantity: 2, ordered_quantity: 2, unit_price_points: 10, line_points: 20 },
			{ id: 102, sale_item_id: 3, name: "Chocolate", image_url: null, quantity: 1, ordered_quantity: 1, unit_price_points: 12, line_points: 12 }
		],
		items_count: 3,
		total_points: 32,
		adjusted: false,
		ordered_total_points: 32,
		rejection_reason: null,
		cancelled_by: null,
		timestamps: { submitted_at: "2026-11-11T09:30:00+03:00", accepted_at: null, ready_at: null, delivered_at: null },
		paid: false,
		member: { id: 5, name: "Demo", phone: null },
		waited_seconds: 60,
		...overrides
	}
}

function mountModal(order: KitchenOrder, serverError: string | null = null) {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(AcceptWithChangesModal, { props: { show: false, order, serverError }, global: { plugins: [i18n] }, attachTo: document.body })
}

async function open(wrapper: ReturnType<typeof mountModal>) {
	await wrapper.setProps({ show: true })
	await flushPromises()
}

function quantityInput(lineId: number): HTMLInputElement {
	return document.querySelector<HTMLInputElement>(`[data-line='${lineId}'] input`)!
}

async function setQuantity(lineId: number, value: string) {
	const input = quantityInput(lineId)
	input.value = value
	input.dispatchEvent(new Event("input"))
	input.dispatchEvent(new Event("blur"))
	await flushPromises()
}

function submit() {
	document.querySelector<HTMLButtonElement>("[data-test=adjust-submit]")!.click()
}

describe("acceptWithChangesModal", () => {
	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("starts_at_what_was_ordered_and_sends_nothing_unchanged", async () => {
		const wrapper = mountModal(orderOf())
		await open(wrapper)

		expect(quantityInput(101).value).toBe("2")
		expect(quantityInput(102).value).toBe("1")
		expect(document.querySelector("[data-test=unchanged]")).not.toBeNull()

		submit()
		await flushPromises()
		expect(wrapper.emitted("submit")).toEqual([[[]]])
		wrapper.unmount()
	})

	it("sends_only_the_lines_changed_and_shows_the_new_total", async () => {
		const wrapper = mountModal(orderOf())
		await open(wrapper)

		await setQuantity(101, "1")
		await setQuantity(102, "0")

		expect(document.querySelector("[data-test=new-total]")!.textContent).toContain("10")
		expect(document.querySelector("[data-test=outcome]")!.textContent).toContain("charged the new total")

		submit()
		await flushPromises()
		expect(wrapper.emitted("submit")).toEqual([[[{ id: 101, quantity: 1 }, { id: 102, quantity: 0 }]]])
		wrapper.unmount()
	})

	it("a_paid_order_is_told_the_points_that_go_back", async () => {
		const wrapper = mountModal(orderOf({ bill: null, payment: { choice: "wallet", wallet_owner_type: "user", paid: true }, paid: true }))
		await open(wrapper)

		await setQuantity(101, "1")

		expect(document.querySelector("[data-test=outcome]")!.textContent).toContain("10 points go back to the member")
		wrapper.unmount()
	})

	it("every_line_at_zero_cannot_be_accepted", async () => {
		const wrapper = mountModal(orderOf())
		await open(wrapper)

		await setQuantity(101, "0")
		await setQuantity(102, "0")

		expect(document.querySelector("[data-test=none-left]")).not.toBeNull()
		expect(document.querySelector<HTMLButtonElement>("[data-test=adjust-submit]")!.disabled).toBe(true)
		submit()
		await flushPromises()
		expect(wrapper.emitted("submit")).toBeUndefined()
		wrapper.unmount()
	})

	it("shows_the_servers_refusal", async () => {
		const wrapper = mountModal(orderOf(), "You cannot accept more Water than the member ordered.")
		await open(wrapper)

		expect(document.querySelector("[data-test=adjust-error]")!.textContent).toContain("You cannot accept more Water")
		wrapper.unmount()
	})
})
