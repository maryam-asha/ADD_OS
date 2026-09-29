import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import DedicatedDesksCard from "../DedicatedDesksCard.vue"

const { listMembershipsMock, assignMock, listDesksMock } = vi.hoisted(() => ({
	listMembershipsMock: vi.fn(),
	assignMock: vi.fn(),
	listDesksMock: vi.fn()
}))

vi.mock("@/add-os/services/memberships", () => ({ listMemberships: listMembershipsMock, assignMembershipDesks: assignMock }))
vi.mock("@/add-os/services/seats-desks", () => ({ listSeatsDesks: listDesksMock }))

// The card calls useMessage() directly, which needs a provider it has no
// reason to mount.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

enableAutoUnmount(afterEach)

function membership(overrides: Record<string, unknown> = {}) {
	return {
		id: 11,
		plan_id: 2,
		plan: { id: 2, name: { en: "The Dedicated", ar: "المخصص" } },
		owner_type: "user",
		owner_id: 7,
		owner: { type: "user", id: 7, name: "Sara" },
		branch_id: 1,
		seats: 1,
		desks: [],
		status: "active",
		current_period_start: "2026-10-01T09:00:00+03:00",
		current_period_end: "2026-10-31T09:00:00+03:00",
		...overrides
	}
}

interface CardVm {
	onlyWithoutDesk: boolean
	openAssign: (row: ReturnType<typeof membership>) => Promise<void>
	selected: number[]
	deskOptions: { value: number, label: string }[]
	canSave: boolean
	saveAssign: () => Promise<boolean>
}

function mountCard() {
	return mount(DedicatedDesksCard, {
		global: {
			plugins: [createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: {} } })]
		}
	})
}

describe("dedicatedDesksCard", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listMembershipsMock.mockResolvedValue({ data: [membership()], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 } })
		listDesksMock.mockResolvedValue([{ id: 4, space_id: 1, code: "D-04", label: "Window", qr_point_id: null, membership_id: null }])
		assignMock.mockResolvedValue({ message: "Desks assigned." })
	})

	/** It opens on the ones still owed a desk — the case staff come here for. */
	it("lists the live dedicated subscriptions still without a desk", async () => {
		const wrapper = mountCard()
		await flushPromises()

		expect(listMembershipsMock).toHaveBeenCalledWith({ dedicated: 1, live: 1, without_desk: 1, page: 1 })
		expect(wrapper.findAll(".add-desk-row")).toHaveLength(1)
		expect(wrapper.text()).toContain("Sara")

		;(wrapper.vm as unknown as CardVm).onlyWithoutDesk = false
		await flushPromises()
		expect(listMembershipsMock).toHaveBeenLastCalledWith({ dedicated: 1, live: 1, page: 1 })
	})

	/** Its own desks are held by it, so they are offered alongside the branch's free ones. */
	it("offers the subscription's own desks and the branch's free ones", async () => {
		const wrapper = mountCard()
		await flushPromises()
		const vm = wrapper.vm as unknown as CardVm

		await vm.openAssign(membership({ desks: [{ id: 2, code: "D-02", label: "D-02" }] }))
		await flushPromises()

		expect(listDesksMock).toHaveBeenCalledWith({ branch_id: 1, free: 1 })
		expect(vm.selected).toEqual([2])
		expect(vm.deskOptions.map(option => option.label)).toEqual(["D-02", "D-04 — Window"])
	})

	it("assigns the chosen desks and reloads", async () => {
		const wrapper = mountCard()
		await flushPromises()
		const vm = wrapper.vm as unknown as CardVm

		await vm.openAssign(membership())
		vm.selected = [4]
		await flushPromises()
		expect(await vm.saveAssign()).toBe(true)

		expect(assignMock).toHaveBeenCalledWith(11, [4])
		expect(listMembershipsMock).toHaveBeenCalledTimes(2)
	})

	/** One desk per seat: a member's own subscription takes one. */
	it("will not assign more desks than the subscription holds seats", async () => {
		const wrapper = mountCard()
		await flushPromises()
		const vm = wrapper.vm as unknown as CardVm

		await vm.openAssign(membership())
		vm.selected = [4, 5]
		await flushPromises()

		expect(vm.canSave).toBe(false)
		expect(await vm.saveAssign()).toBe(false)
		expect(assignMock).not.toHaveBeenCalled()
	})
})
