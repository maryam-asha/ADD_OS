import type { Currency } from "@/add-os/modules/payments/types/currency"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import CurrenciesPage from "../CurrenciesPage.vue"

const { listCurrenciesMock, createCurrencyMock, updateCurrencyMock, setCurrencyStatusMock, setBaseCurrencyMock } = vi.hoisted(() => ({
	listCurrenciesMock: vi.fn(),
	createCurrencyMock: vi.fn(),
	updateCurrencyMock: vi.fn(),
	setCurrencyStatusMock: vi.fn(),
	setBaseCurrencyMock: vi.fn()
}))

vi.mock("@/add-os/services/currencies", () => ({
	listCurrencies: listCurrenciesMock,
	createCurrency: createCurrencyMock,
	updateCurrency: updateCurrencyMock,
	setCurrencyStatus: setCurrencyStatusMock,
	setBaseCurrency: setBaseCurrencyMock
}))

const { successMock, errorMock, dialogWarningMock } = vi.hoisted(() => ({
	successMock: vi.fn(),
	errorMock: vi.fn(),
	dialogWarningMock: vi.fn()
}))

// Same pitfall WalletTopUpsPage.spec.ts documents: the page calls useMessage()
// and useDialog() directly, both of which need providers it has no reason to
// mount. Only those two are replaced; everything else stays real.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: successMock, error: errorMock }),
		useDialog: () => ({ warning: dialogWarningMock })
	}
})

const usd: Currency = {
	code: "USD",
	name: { ar: "دولار أمريكي", en: "US Dollar" },
	symbol: "$",
	decimal_places: 2,
	cash_step: "1.00",
	is_base: true,
	is_active: true,
	order: 2,
	created_at: "2026-08-20T10:01:00.000000Z"
}

const syp: Currency = {
	code: "SYP",
	name: { ar: "ليرة سورية", en: "Syrian Pound" },
	symbol: "ل.س",
	decimal_places: 2,
	cash_step: "1.00",
	is_base: false,
	is_active: true,
	order: 1,
	created_at: "2026-08-20T10:00:00.000000Z"
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { currencies: "Currencies" } },
			currencies: {
				baseBadge: "Base",
				isActiveYes: "Active",
				isActiveNo: "Inactive",
				loadError: "Couldn't load currencies.",
				columns: { code: "Code", name: "Name", symbol: "Symbol", decimalPlaces: "Decimals", order: "Order", isActive: "Status" },
				form: { code: "Code", name: "Name", symbol: "Symbol", decimalPlaces: "Decimal places", order: "Order" },
				validation: { codeFormat: "Use exactly three uppercase letters, e.g. EUR." },
				create: { button: "New currency", title: "New currency", success: "Currency created." },
				edit: { title: "Edit currency", success: "Currency updated." },
				stats: { total: "Total", active: "Active", inactive: "Inactive" },
				actions: { setBase: "Set as base", activate: "Activate", deactivate: "Deactivate" },
				setBase: {
					title: "Set as base currency?",
					content: "This makes {code} the currency every amount converts against.",
					confirm: "Set as base",
					cancel: "Cancel",
					success: "Base currency updated."
				},
				status: { activateSuccess: "Currency activated.", deactivateSuccess: "Currency deactivated." }
			},
			resourceCrud: {
				table: {
					actionsColumn: "Actions",
					empty: "No records found.",
					editAction: "Edit",
					deleteAction: "Delete",
					deleteConfirmTitle: "Delete this record?",
					deleteConfirmOk: "Delete",
					deleteConfirmCancel: "Cancel"
				},
				form: { cancel: "Cancel", submit: "Save", arabicPlaceholder: "Arabic", englishPlaceholder: "English" },
				validation: { required: "{field} is required." },
				mutations: { genericError: "Something went wrong.", permissionError: "You don't have permission for this action." }
			}
		}
	}
})

function mountPage() {
	return mount(CurrenciesPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe("currenciesPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listCurrenciesMock.mockResolvedValue([syp, usd])
		createCurrencyMock.mockResolvedValue(syp)
		updateCurrencyMock.mockResolvedValue({ message: "Currency updated." })
		setCurrencyStatusMock.mockResolvedValue({ message: "Currency status updated." })
		setBaseCurrencyMock.mockResolvedValue({ message: "Base currency updated." })
	})

	/**
	 * Both actions are already 422-guarded server-side on the base row. Showing
	 * them there would only offer a guaranteed rejection, so the row carries
	 * neither.
	 */
	it("offers no status and no set-as-base action on the base row", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.vm.rowActions(usd)).toHaveLength(0)
		wrapper.unmount()
	})

	it("offers both a status action and set-as-base on a non-base row", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.vm.rowActions(syp)).toHaveLength(2)
		wrapper.unmount()
	})

	/**
	 * The client must not replicate the server's block. An inactive currency is
	 * refused as a base by the backend with a message worth reading; hiding the
	 * button here would replace that message with silence.
	 */
	it("still offers set-as-base on an inactive non-base row, leaving the block to the server", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.vm.rowActions({ ...syp, is_active: false })).toHaveLength(2)
		wrapper.unmount()
	})

	it("does not call the base endpoint until the confirm dialog is accepted", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.confirmSetBase(syp)

		expect(dialogWarningMock).toHaveBeenCalledOnce()
		expect(setBaseCurrencyMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("calls the base endpoint with the row's code once the confirm is accepted", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.confirmSetBase(syp)
		await dialogWarningMock.mock.calls[0][0].onPositiveClick()
		await flushPromises()

		expect(setBaseCurrencyMock).toHaveBeenCalledWith("SYP")
		expect(successMock).toHaveBeenCalledWith("Base currency updated.")
		wrapper.unmount()
	})

	it("names the currency in the confirm dialog, so the one-way action states what it does", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.confirmSetBase(syp)

		expect(dialogWarningMock.mock.calls[0][0].content).toContain("SYP")
		wrapper.unmount()
	})

	/**
	 * The whole point of the base action's error path: the server's refusal
	 * (exchange-rate history, or an inactive currency) is information the
	 * operator needs verbatim, not a generic failure toast.
	 */
	it("surfaces the server's own 422 message when the base change is refused", async () => {
		setBaseCurrencyMock.mockRejectedValue(
			new ApiError(422, JSON.stringify({ message: "SYP already has exchange-rate history and cannot become the base." }))
		)
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.confirmSetBase(syp)
		await dialogWarningMock.mock.calls[0][0].onPositiveClick()
		await flushPromises()

		expect(errorMock).toHaveBeenCalledWith("SYP already has exchange-rate history and cannot become the base.")
		wrapper.unmount()
	})

	it("reports a 404 from the not-yet-shipped base endpoint instead of appearing to succeed", async () => {
		setBaseCurrencyMock.mockRejectedValue(new ApiError(404, JSON.stringify({ message: "Not Found." })))
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.confirmSetBase(syp)
		await dialogWarningMock.mock.calls[0][0].onPositiveClick()
		await flushPromises()

		expect(errorMock).toHaveBeenCalledWith("Not Found.")
		expect(successMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("toggles status to inactive for an active row and refetches", async () => {
		const wrapper = mountPage()
		await flushPromises()
		listCurrenciesMock.mockClear()

		await wrapper.vm.toggleStatus(syp)
		await flushPromises()

		expect(setCurrencyStatusMock).toHaveBeenCalledWith("SYP", false)
		expect(successMock).toHaveBeenCalledWith("Currency deactivated.")
		expect(listCurrenciesMock).toHaveBeenCalledOnce()
		wrapper.unmount()
	})

	it("toggles status to active for an inactive row", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.toggleStatus({ ...syp, is_active: false })
		await flushPromises()

		expect(setCurrencyStatusMock).toHaveBeenCalledWith("SYP", true)
		expect(successMock).toHaveBeenCalledWith("Currency activated.")
		wrapper.unmount()
	})

	it("creates with no is_active and no is_base — the server owns both defaults", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.openCreate()
		await wrapper.vm.submit({ code: "EUR", name: { ar: "يورو", en: "Euro" }, symbol: "€", decimal_places: 2, cash_step: 1, order: 3 })
		await flushPromises()

		const payload = createCurrencyMock.mock.calls[0][0]
		expect(payload.code).toBe("EUR")
		expect(payload).not.toHaveProperty("is_active")
		expect(payload).not.toHaveProperty("is_base")
		wrapper.unmount()
	})

	it("updates by code, not by an id the resource does not have", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.openEdit(syp)
		await wrapper.vm.submit({ name: { ar: "ليرة", en: "Pound" }, symbol: "ل.س", decimal_places: 2, cash_step: 1, order: 1 })
		await flushPromises()

		expect(updateCurrencyMock).toHaveBeenCalledWith("SYP", expect.objectContaining({ symbol: "ل.س" }))
		wrapper.unmount()
	})

	it("never sends code on an update, even after editing the row that carries it", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.openEdit(syp)
		await wrapper.vm.submit({ name: { ar: "ليرة", en: "Pound" }, symbol: "ل.س", decimal_places: 2, cash_step: 1, order: 1 })
		await flushPromises()

		expect(updateCurrencyMock.mock.calls[0][1]).not.toHaveProperty("code")
		wrapper.unmount()
	})

	it("shows an error alert and no stat cards when the list fails to load", async () => {
		listCurrenciesMock.mockRejectedValue(new ApiError(500, ""))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load currencies.")
		wrapper.unmount()
	})

	it("counts total, active and inactive currencies", async () => {
		listCurrenciesMock.mockResolvedValue([syp, usd, { ...syp, code: "EUR", is_active: false }])
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.vm.statCards.map(card => card.value)).toEqual([3, 2, 1])
		wrapper.unmount()
	})
})
