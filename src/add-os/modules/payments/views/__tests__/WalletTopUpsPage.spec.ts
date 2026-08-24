import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import WalletTopUpsPage from "../WalletTopUpsPage.vue"

const { listUsersMock, listCompaniesMock, createWalletTopUpMock } = vi.hoisted(() => ({
	listUsersMock: vi.fn(),
	listCompaniesMock: vi.fn(),
	createWalletTopUpMock: vi.fn()
}))

vi.mock("@/add-os/services/users", () => ({ listUsers: listUsersMock }))
vi.mock("@/add-os/services/companies", () => ({ listCompanies: listCompaniesMock }))
vi.mock("@/add-os/services/wallet-top-ups", () => ({ createWalletTopUp: createWalletTopUpMock }))

// Same pitfall AddCompanyMemberDialog.spec.ts documents: the page calls
// useMessage() directly, which needs a provider it has no reason to mount.
// Mock only useMessage; every other naive-ui export stays real via importActual.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const sampleUser = {
	id: 5,
	name: "Sara",
	phone: "0999111222",
	email: "s@add.sy",
	preferred_language: "ar",
	preferred_currency: "SYP",
	status: "active",
	roles: []
}

const sampleCompany = {
	id: 45,
	private_office_request_id: 2,
	legal_name: "Halab Tech",
	contract_ref: "C-001",
	branch_id: 1,
	status: "active"
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { walletTopUps: "Wallet top-ups" } },
			walletTopUps: {
				description: "Record a manual wallet top-up.",
				recipientType: { user: "Member wallet", company: "Company wallet" },
				paymentMethod: { cash: "Cash", sham: "Sham Cash", mtn: "MTN Cash", syriatel: "Syriatel Cash" },
				form: {
					recipientType: "Top up",
					user: "Member",
					company: "Company",
					amount: "Amount",
					paymentMethod: "Payment method",
					description: "Description"
				},
				validation: {
					amountFormat: "Enter an amount greater than 0.",
					userRequired: "Select a member.",
					companyRequired: "Select a company."
				},
				submit: { button: "Record top-up", success: "Wallet topped up." },
				loadError: "Couldn't load recipients."
			},
			resourceCrud: {
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountPage() {
	return mount(WalletTopUpsPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe("walletTopUpsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listUsersMock.mockResolvedValue([sampleUser])
		listCompaniesMock.mockResolvedValue([sampleCompany])
		createWalletTopUpMock.mockResolvedValue({ id: 789, amount: "50.00", source: "top_up", payment_method: "cash", performed_by_user_id: 12 })
	})

	it("posts a member top-up with user_id and no company_id, then resets the form", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		wrapper.vm.form.amount = "50.00"
		wrapper.vm.form.payment_method = "cash"
		wrapper.vm.form.description = "Front-desk cash top-up"
		await wrapper.vm.submit()
		await flushPromises()

		expect(createWalletTopUpMock).toHaveBeenCalledWith({
			amount: "50.00",
			payment_method: "cash",
			user_id: 5,
			description: "Front-desk cash top-up"
		})

		// A repeatable action screen: the next top-up must start blank, not
		// pre-filled with the amount that was just charged to somebody.
		expect(wrapper.vm.form.amount).toBe("")
		expect(wrapper.vm.form.user_id).toBeNull()
		expect(wrapper.vm.form.description).toBe("")
		wrapper.unmount()
	})

	it("posts a company top-up with company_id and no user_id", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.recipientType = "company"
		await flushPromises()
		wrapper.vm.form.company_id = 45
		wrapper.vm.form.amount = "50.00"
		wrapper.vm.form.payment_method = "syriatel"
		await wrapper.vm.submit()
		await flushPromises()

		expect(createWalletTopUpMock).toHaveBeenCalledWith({
			amount: "50.00",
			payment_method: "syriatel",
			company_id: 45,
			description: null
		})

		const payload = createWalletTopUpMock.mock.calls[0][0]
		expect(payload).not.toHaveProperty("user_id")
		wrapper.unmount()
	})

	/**
	 * The amount here is deliberately one the client accepts. The page owns the
	 * shape and the 0.01 floor, so a 422 naming `amount` is by definition
	 * something client validation did not catch — a server rule that has moved,
	 * or one it never mirrored. Reaching for a locally-invalid amount instead
	 * tests nothing: `submit()` returns before it posts, and there is no server
	 * response to surface.
	 */
	it("surfaces 422 field errors against the fields the backend named, and keeps the form filled", async () => {
		createWalletTopUpMock.mockRejectedValue(
			new ApiError(
				422,
				JSON.stringify({
					message: "The given data was invalid.",
					errors: { amount: ["The amount field must be a number."], payment_method: ["The selected payment method is invalid."] }
				})
			)
		)
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		wrapper.vm.form.amount = "50.00"
		await wrapper.vm.submit()
		await flushPromises()

		expect(wrapper.vm.fieldErrors.amount).toEqual(["The amount field must be a number."])
		expect(wrapper.vm.fieldErrors.payment_method).toEqual(["The selected payment method is invalid."])
		// A rejected submit must not wipe what the operator typed.
		expect(wrapper.vm.form.amount).toBe("50.00")
		expect(wrapper.vm.form.user_id).toBe(5)
		wrapper.unmount()
	})

	it("clears the company selection when the recipient type switches to member, and vice versa", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.recipientType = "company"
		await flushPromises()
		wrapper.vm.form.company_id = 45
		await flushPromises()

		wrapper.vm.recipientType = "user"
		await flushPromises()
		expect(wrapper.vm.form.company_id).toBeNull()

		wrapper.vm.form.user_id = 5
		await flushPromises()
		wrapper.vm.recipientType = "company"
		await flushPromises()
		expect(wrapper.vm.form.user_id).toBeNull()
		wrapper.unmount()
	})

	it("never posts both user_id and company_id, even when a stale id survives in the model", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		wrapper.vm.form.company_id = 45
		wrapper.vm.form.amount = "10.00"
		await wrapper.vm.submit()
		await flushPromises()

		const payload = createWalletTopUpMock.mock.calls[0][0]
		expect(payload.user_id).toBe(5)
		expect(payload).not.toHaveProperty("company_id")
		wrapper.unmount()
	})

	it("does not post at all when no recipient is selected", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.amount = "10.00"
		await wrapper.vm.submit()
		await flushPromises()

		expect(createWalletTopUpMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("does not post an amount below the 0.01 minimum, negative, or not a plain decimal", async () => {
		const wrapper = mountPage()
		await flushPromises()

		for (const amount of ["0", "0.00", "-5.00", "abc", "1.234"]) {
			wrapper.vm.form.user_id = 5
			wrapper.vm.form.amount = amount
			await wrapper.vm.submit()
			await flushPromises()
		}

		expect(createWalletTopUpMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
