import type { FormItemRule } from "naive-ui"
import type { Currency } from "@/add-os/modules/payments/types/currency"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import CurrenciesPage from "../CurrenciesPage.vue"

const { listMock, createMock, updateMock, statusMock } = vi.hoisted(() => ({
	listMock: vi.fn(),
	createMock: vi.fn(),
	updateMock: vi.fn(),
	statusMock: vi.fn()
}))

vi.mock("@/add-os/services/currencies", () => ({
	listCurrencies: listMock,
	createCurrency: createMock,
	updateCurrency: updateMock,
	updateCurrencyStatus: statusMock
}))

/**
 * `useMessage` resolves through a provider that lives on the real `Provider.vue`
 * root, which a page mounted on its own has no reason to bring with it — the
 * same standing-in `AnnouncementsPage.spec.ts` documents. `useDialog` is not
 * needed here: this page has no delete confirm, because the resource has no
 * delete endpoint.
 */
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: vi.fn(), error: vi.fn() })
	}
})

const base: Currency = {
	code: "USD",
	name: { ar: "دولار أمريكي", en: "US Dollar" },
	symbol: "$",
	decimal_places: 2,
	is_base: true,
	is_active: true,
	order: 2,
	created_at: "2026-08-20T10:00:00.000000Z"
}

const syp: Currency = {
	code: "SYP",
	name: { ar: "ليرة سورية", en: "Syrian Pound" },
	symbol: "ل.س",
	decimal_places: 2,
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
				description: "Every currency the system knows about.",
				loadError: "Couldn't load currencies.",
				empty: "No currencies found.",
				baseBadge: "Base",
				baseLocked: "The base currency is always active.",
				columns: { code: "Code", name: "Name", symbol: "Symbol", decimalPlaces: "Decimals", order: "Order", isActive: "Status" },
				form: { code: "Code", name: "Name", symbol: "Symbol", decimalPlaces: "Decimal places", order: "Display order" },
				validation: {
					codeFormat: "Use exactly three uppercase letters, for example USD.",
					symbolTooLong: "The symbol must be {max} characters or fewer.",
					decimalPlacesRange: "Enter a whole number between {min} and {max}.",
					orderInvalid: "Enter a whole number of {min} or more."
				},
				create: { button: "New currency", title: "New currency", success: "Currency created." },
				edit: { title: "Edit currency", success: "Currency updated." },
				status: { activated: "Currency activated.", deactivated: "Currency deactivated." },
				stats: { total: "Total currencies", active: "Active", base: "Base currency" }
			},
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel", arabicPlaceholder: "بالعربية", englishPlaceholder: "In English", bilingualLabel: "{field} ({language})" },
				table: { empty: "Nothing here yet.", editAction: "Edit", actionsColumn: "Actions" },
				validation: { required: "{field} is required." },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			},
			locales: { ar: "Arabic", en: "English" }
		}
	}
})

function mountPage() {
	return mount(CurrenciesPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

/** Runs one field's rule the way n-form would, and returns the Error or `true`. */
function validate(wrapper: ReturnType<typeof mountPage>, key: string, value: unknown) {
	const field = wrapper.vm.fields.find(f => f.key === key)!
	const rule = field.rule as FormItemRule
	return rule.validator!(rule, value, () => {}, {}, {})
}

/** The status cell's rendered vnode for one row, as the data table would build it. */
function renderStatusCell(wrapper: ReturnType<typeof mountPage>, row: Currency) {
	const column = wrapper.vm.columns.find(c => "key" in c && c.key === "is_active")!
	// Through `unknown`: naive-ui's `TableColumn` union includes an expand column
	// that has no `render`, so the two types do not overlap enough for a direct cast.
	return (column as unknown as { render: (row: Currency) => unknown }).render(row)
}

describe("currenciesPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listMock.mockResolvedValue([syp, base])
		createMock.mockResolvedValue({ ...syp, code: "EUR" })
		updateMock.mockResolvedValue({ message: "Currency updated." })
		statusMock.mockResolvedValue({ message: "Currency status updated." })
	})

	it("lists on mount and shows what comes back", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listMock).toHaveBeenCalled()
		expect(wrapper.vm.data).toEqual([syp, base])
		wrapper.unmount()
	})

	describe("create / edit round-trip", () => {
		it("creates from a blank form and refetches", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			expect(wrapper.vm.mode).toBe("create")
			expect(wrapper.vm.form.code).toBe("")
			// The column default and both seeded rows agree on 2.
			expect(wrapper.vm.form.decimal_places).toBe(2)
			// Deliberately unset: the list sorts by it, so guessing would reposition the row.
			expect(wrapper.vm.form.order).toBeNull()

			wrapper.vm.form.code = "EUR"
			wrapper.vm.form.name = { ar: "يورو", en: "Euro" }
			wrapper.vm.form.symbol = "€"
			await wrapper.vm.submit({ ...wrapper.vm.form })
			await flushPromises()

			expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ code: "EUR", symbol: "€", decimal_places: 2 }))
			expect(updateMock).not.toHaveBeenCalled()
			expect(listMock).toHaveBeenCalledTimes(2)
			wrapper.unmount()
		})

		it("never offers is_active or is_base as create-form fields", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			const keys = wrapper.vm.fields.map(f => f.key)

			expect(keys).not.toContain("is_active")
			expect(keys).not.toContain("is_base")
			expect(wrapper.vm.form).not.toHaveProperty("is_active")
			expect(wrapper.vm.form).not.toHaveProperty("is_base")
			wrapper.unmount()
		})

		it("loads an existing row into the form, turning a null symbol into an empty string", async () => {
			listMock.mockResolvedValue([{ ...syp, symbol: null, order: null }])
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openEdit(wrapper.vm.data[0])

			expect(wrapper.vm.mode).toBe("edit")
			expect(wrapper.vm.editingCode).toBe("SYP")
			expect(wrapper.vm.form.symbol).toBe("")
			expect(wrapper.vm.form.order).toBeNull()
			wrapper.unmount()
		})

		it("updates by code, not by an id, and refetches", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openEdit(syp)
			wrapper.vm.form.decimal_places = 0
			await wrapper.vm.submit({ ...wrapper.vm.form })
			await flushPromises()

			expect(updateMock).toHaveBeenCalledWith("SYP", expect.objectContaining({ decimal_places: 0 }))
			expect(createMock).not.toHaveBeenCalled()
			expect(listMock).toHaveBeenCalledTimes(2)
			wrapper.unmount()
		})
	})

	describe("code is immutable on edit", () => {
		/**
		 * `UpdateCurrencyRequest` has no `code` rule at all, so a changed value
		 * would be dropped in silence rather than rejected — the worse of the two
		 * failures. Leaving the field out of the edit form means the drawer's
		 * `buildPayload()` cannot put it on the wire either.
		 */
		it("offers the code field when creating and withholds it when editing", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			expect(wrapper.vm.fields.map(f => f.key)).toContain("code")

			wrapper.vm.openEdit(syp)
			expect(wrapper.vm.fields.map(f => f.key)).not.toContain("code")
			wrapper.unmount()
		})

		it("mirrors the server's three-uppercase-letters rule on create", async () => {
			const wrapper = mountPage()
			await flushPromises()
			wrapper.vm.openCreate()

			expect(validate(wrapper, "code", "EUR")).toBe(true)
			expect(validate(wrapper, "code", "eur")).toBeInstanceOf(Error)
			expect(validate(wrapper, "code", "EURO")).toBeInstanceOf(Error)
			expect(validate(wrapper, "code", "EU")).toBeInstanceOf(Error)
			expect(validate(wrapper, "code", "E1R")).toBeInstanceOf(Error)
			expect(validate(wrapper, "code", "")).toBeInstanceOf(Error)
			wrapper.unmount()
		})
	})

	describe("the base currency's status toggle", () => {
		/**
		 * `CurrencyController::updateStatus()` answers a hard 422 for `is_base`,
		 * and a live 422 raised by a control the UI itself offered reads as a bug
		 * rather than as the rule it is. The base row therefore renders a badge
		 * where every other row renders a switch — there is nothing to click, so
		 * "disabled" needs no explaining.
		 */
		it("renders a badge for the base row and a switch for every other row", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const baseCell = renderStatusCell(wrapper, base) as { type: { name?: string } }
			const sypCell = renderStatusCell(wrapper, syp) as { type: { name?: string }; props: Record<string, unknown> }

			expect(baseCell.type.name).toBe("Tag")
			expect(sypCell.type.name).toBe("Switch")
			wrapper.unmount()
		})

		it("gives the base row's badge no interactive handler at all", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const baseCell = renderStatusCell(wrapper, base) as { props: Record<string, unknown> }

			expect(baseCell.props["onUpdate:value"]).toBeUndefined()
			expect(baseCell.props.onClick).toBeUndefined()
			wrapper.unmount()
		})

		/** The rule is expressed twice on purpose — neither half is load-bearing alone. */
		it("refuses a base row even when the toggle is driven directly", async () => {
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.toggleStatus(base, false)
			await flushPromises()

			expect(statusMock).not.toHaveBeenCalled()
			wrapper.unmount()
		})

		it("still toggles a non-base row through the status endpoint and refetches", async () => {
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.toggleStatus(syp, false)
			await flushPromises()

			expect(statusMock).toHaveBeenCalledWith("SYP", { is_active: false })
			expect(listMock).toHaveBeenCalledTimes(2)
			wrapper.unmount()
		})

		it("routes the switch's own event to the same guarded handler", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const sypCell = renderStatusCell(wrapper, syp) as { props: Record<string, unknown> }
			await (sypCell.props["onUpdate:value"] as (value: boolean) => Promise<void>)(false)
			await flushPromises()

			expect(statusMock).toHaveBeenCalledWith("SYP", { is_active: false })
			wrapper.unmount()
		})
	})

	describe("no delete", () => {
		/**
		 * No destroy route exists — plans, spaces, bookings and users all FK to
		 * `currencies.code` with `restrictOnDelete()`. Deactivating IS the removal
		 * path, so a delete control here would be a button that can only fail.
		 */
		it("renders no delete column and exposes no remove call", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const keys = wrapper.vm.columns.map(c => ("key" in c ? c.key : undefined))

			expect(keys).not.toContain("delete")
			expect(keys).toContain("actions")
			wrapper.unmount()
		})
	})
})
