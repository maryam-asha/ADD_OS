import type { Setting } from "@/add-os/modules/settings/types/setting"
import { readFileSync } from "node:fs"
import path from "node:path"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import SettingsPage from "../SettingsPage.vue"

const { listMock, updateMock, dialogWarningMock, errorToastMock, canUpdateMock } = vi.hoisted(() => ({
	listMock: vi.fn(),
	updateMock: vi.fn(),
	dialogWarningMock: vi.fn(),
	errorToastMock: vi.fn(),
	canUpdateMock: vi.fn(() => true)
}))

vi.mock("@/add-os/services/settings", () => ({
	listSettings: listMock,
	updateSetting: updateMock
}))

/**
 * `canUpdateSettings` reads the auth store, which needs an active Pinia this
 * page has no reason to bring with it. Mocked at the gate rather than by
 * standing up a store, so a test can put the page in either role's shoes by
 * setting one return value — which is the behaviour under test, not the store's
 * internals.
 */
vi.mock("@/add-os/config/permissions", () => ({
	canUpdateSettings: canUpdateMock
}))

/** Both resolve through providers a standalone page never mounts — see AnnouncementsPage.spec.ts. */
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: vi.fn(), error: errorToastMock }),
		useDialog: () => ({ warning: dialogWarningMock, error: vi.fn(), success: vi.fn(), info: vi.fn() })
	}
})

const intSetting: Setting = {
	key: "booking.cancellation_window_minutes",
	type: "int",
	value: 60,
	updated_at: "2026-08-26T09:00:00.000000Z"
}

const boolSetting: Setting = {
	key: "module.cafe.is_enabled",
	type: "bool",
	value: true,
	updated_at: "2026-08-26T09:00:00.000000Z"
}

const stringSetting: Setting = {
	key: "kiosk.app_store_url",
	type: "string",
	value: "https://api.test/ios",
	updated_at: "2026-08-26T09:00:00.000000Z"
}

const timezoneSetting: Setting = {
	key: "app.timezone",
	type: "string",
	value: "Asia/Damascus",
	updated_at: "2026-08-26T09:00:00.000000Z"
}

const qrSetting: Setting = {
	key: "kiosk.arrival_qr_value",
	type: "string",
	value: "addapp://arrival",
	updated_at: "2026-08-26T09:00:00.000000Z"
}

/**
 * No seeded key is `time` or `json` today, but both are live cases of ADDCore's
 * `SettingValueType` enum, so a seeder can introduce one without a frontend
 * deploy. These two rows exercise the branches that would otherwise ship
 * unexercised.
 */
const timeSetting: Setting = {
	key: "reception.daily_reset_at",
	type: "time",
	value: "06:00",
	updated_at: "2026-08-26T09:00:00.000000Z"
}

const jsonSetting: Setting = {
	key: "kiosk.locale_order",
	type: "json",
	value: ["ar", "en"],
	updated_at: "2026-08-26T09:00:00.000000Z"
}

/** A key with no entry in the label-override map — what a future seeder addition looks like. */
const unknownSetting: Setting = {
	key: "lock.ttlock_client_id",
	type: "string",
	value: "abc123",
	updated_at: null
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { globalSettings: "Global settings" } },
			common: { save: "Save" },
			settings: {
				description: "Every global configuration key the system reads at runtime.",
				loadError: "Couldn't load settings.",
				empty: "No settings found.",
				readOnlyNotice: "Only an admin account can change a setting.",
				finishEditingFirst: "Finish the row you're editing first.",
				updateSuccess: "Setting updated.",
				columns: { key: "Setting", type: "Type", value: "Value", updatedAt: "Last changed" },
				types: { int: "Number", bool: "On / off", string: "Text", time: "Time", json: "JSON" },
				value: { enabled: "Enabled", disabled: "Disabled" },
				validation: {
					integerRequired: "Enter a whole number.",
					nonNegative: "Enter 0 or more.",
					booleanRequired: "This setting is on or off.",
					stringRequired: "This setting cannot be empty.",
					timeFormat: "Use HH:mm, for example 08:30.",
					jsonInvalid: "That isn't valid JSON.",
					jsonNotObject: "Enter a JSON object or array, not a single value."
				},
				confirm: {
					ok: "Save anyway",
					cancel: "Cancel",
					generic: "Are you sure?",
					appTimezone: "Changing the time zone re-reads every stored booking time. Are you sure?",
					kioskArrivalQrValue: "This invalidates every printed arrival QR in the venue. Are you sure?"
				},
				keys: {
					bookingCancellationWindow: { label: "Cancellation window", description: "Minutes before a booking during which it can still be cancelled." },
					moduleCafeIsEnabled: { label: "Café module", description: "Turns the café module on or off." },
					kioskAppStoreUrl: { label: "App Store link", description: "iOS download link shown on the kiosk." },
					appTimezone: { label: "Time zone", description: "The time zone every stored timestamp is read in." },
					kioskArrivalQrValue: { label: "Arrival QR value", description: "The payload encoded in the arrival QR." },
					bookingSlotGranularity: { label: "Slot size", description: "" },
					bookingMinDuration: { label: "Minimum booking", description: "" },
					bookingOverrunGrace: { label: "Overrun grace", description: "" },
					bookingBuffer: { label: "Buffer between bookings", description: "" },
					profileCompletionThreshold: { label: "Profile completion threshold", description: "" },
					guestHostApprovalTimeout: { label: "Host approval timeout", description: "" },
					kioskArrivalRequestExpiry: { label: "Arrival request expiry", description: "" },
					kioskGooglePlayUrl: { label: "Google Play link", description: "" }
				}
			},
			resourceCrud: {
				form: { cancel: "Cancel" },
				table: { editAction: "Edit", actionsColumn: "Actions" },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountPage() {
	return mount(SettingsPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

type Wrapper = ReturnType<typeof mountPage>

/** One column's rendered vnode for one row, as the data table would build it. */
function renderCell(wrapper: Wrapper, columnKey: string, row: Setting) {
	const column = wrapper.vm.columns.find(c => "key" in c && c.key === columnKey)!
	// Through `unknown`: naive-ui's `TableColumn` union includes an expand column
	// with no `render`, so the two types do not overlap enough for a direct cast.
	return (column as unknown as { render: (row: Setting) => unknown }).render(row)
}

function cellComponentName(wrapper: Wrapper, columnKey: string, row: Setting): string | undefined {
	return (renderCell(wrapper, columnKey, row) as { type?: { name?: string } }).type?.name
}

function cellProps(wrapper: Wrapper, columnKey: string, row: Setting): Record<string, unknown> {
	return (renderCell(wrapper, columnKey, row) as { props: Record<string, unknown> }).props
}

describe("settingsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		canUpdateMock.mockReturnValue(true)
		listMock.mockResolvedValue([intSetting, boolSetting, stringSetting])
		updateMock.mockResolvedValue({ message: "Setting updated." })
	})

	it("lists on mount and shows what comes back, in the server's order", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listMock).toHaveBeenCalled()
		expect(wrapper.vm.data).toEqual([intSetting, boolSetting, stringSetting])
		wrapper.unmount()
	})

	/**
	 * `SettingController` implements `index` and `update` only — the key set is
	 * fixed by `SettingSeeder`. A create or delete control here would be a button
	 * with no route behind it, which is worse than a missing feature: it tells an
	 * operator the system can do something it cannot.
	 */
	it("offers no way to create or delete a key", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const columnKeys = wrapper.vm.columns.map(c => ("key" in c ? c.key : undefined))
		expect(columnKeys).not.toContain("delete")
		expect(wrapper.text()).not.toMatch(/new setting/i)
		wrapper.unmount()
	})

	describe("the value control is chosen by the row's type", () => {
		beforeEach(() => {
			listMock.mockResolvedValue([intSetting, boolSetting, stringSetting, timeSetting, jsonSetting])
		})

		it("renders an int as a number input and sends a number back", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(intSetting)
			expect(cellComponentName(wrapper, "value", intSetting)).toBe("InputNumber")
			expect(cellProps(wrapper, "value", intSetting).value).toBe(60)

			wrapper.vm.setDraft(45)
			await wrapper.vm.save()
			await flushPromises()

			expect(updateMock).toHaveBeenCalledWith("booking.cancellation_window_minutes", 45)
			expect(typeof updateMock.mock.calls[0][1]).toBe("number")
			wrapper.unmount()
		})

		it("floors a duration key's number input at 0 rather than guessing a maximum", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(intSetting)
			const props = cellProps(wrapper, "value", intSetting)

			expect(props.min).toBe(0)
			expect(props.max).toBeUndefined()
			expect(props.precision).toBe(0)
			wrapper.unmount()
		})

		it("renders a bool as a switch and sends true/false, never \"1\"", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(boolSetting)
			expect(cellComponentName(wrapper, "value", boolSetting)).toBe("Switch")
			expect(cellProps(wrapper, "value", boolSetting).value).toBe(true)

			// Driven through the switch's own event, not by poking the draft.
			await (cellProps(wrapper, "value", boolSetting)["onUpdate:value"] as (v: boolean) => void)(false)
			await wrapper.vm.save()
			await flushPromises()

			expect(updateMock).toHaveBeenCalledWith("module.cafe.is_enabled", false)
			expect(typeof updateMock.mock.calls[0][1]).toBe("boolean")
			wrapper.unmount()
		})

		it("round-trips a string through a single-line input", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(stringSetting)
			expect(cellComponentName(wrapper, "value", stringSetting)).toBe("Input")
			expect(cellProps(wrapper, "value", stringSetting).type).toBeUndefined()
			expect(cellProps(wrapper, "value", stringSetting).value).toBe("https://api.test/ios")

			wrapper.vm.setDraft("https://api.test/ios-v2")
			await wrapper.vm.save()
			await flushPromises()

			expect(updateMock).toHaveBeenCalledWith("kiosk.app_store_url", "https://api.test/ios-v2")
			wrapper.unmount()
		})

		it("refuses to save an emptied string rather than sending \"\" into a required rule", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(stringSetting)
			wrapper.vm.setDraft("   ")
			await wrapper.vm.save()
			await flushPromises()

			expect(updateMock).not.toHaveBeenCalled()
			expect(errorToastMock).toHaveBeenCalledWith("This setting cannot be empty.")
			wrapper.unmount()
		})

		describe("time", () => {
			it("renders a time picker bound to HH:mm and sends HH:mm", async () => {
				const wrapper = mountPage()
				await flushPromises()

				wrapper.vm.startEdit(timeSetting)
				const props = cellProps(wrapper, "value", timeSetting)

				expect(cellComponentName(wrapper, "value", timeSetting)).toBe("TimePicker")
				expect(props.valueFormat).toBe("HH:mm")
				expect(props.formattedValue).toBe("06:00")

				wrapper.vm.setDraft("07:30")
				await wrapper.vm.save()
				await flushPromises()

				expect(updateMock).toHaveBeenCalledWith("reception.daily_reset_at", "07:30")
				wrapper.unmount()
			})

			/** The server's rule is `date_format:H:i`; seconds are a 422. */
			it("rejects HH:mm:ss without a network call", async () => {
				const wrapper = mountPage()
				await flushPromises()

				wrapper.vm.startEdit(timeSetting)
				wrapper.vm.setDraft("07:30:00")
				await wrapper.vm.save()
				await flushPromises()

				expect(updateMock).not.toHaveBeenCalled()
				expect(errorToastMock).toHaveBeenCalledWith("Use HH:mm, for example 08:30.")
				wrapper.unmount()
			})

			/**
			 * NTimePicker parses `formatted-value` strictly and throws on an
			 * unparseable string, so a malformed draft must reach it as null.
			 */
			it("hands the picker null rather than a malformed draft it would crash on", async () => {
				const wrapper = mountPage()
				await flushPromises()

				wrapper.vm.startEdit(timeSetting)
				wrapper.vm.setDraft("07:30:00")

				expect(cellProps(wrapper, "value", timeSetting).formattedValue).toBeNull()
				wrapper.unmount()
			})
		})

		describe("json", () => {
			it("renders a textarea seeded with the value's serialised form", async () => {
				const wrapper = mountPage()
				await flushPromises()

				wrapper.vm.startEdit(jsonSetting)
				const props = cellProps(wrapper, "value", jsonSetting)

				expect(cellComponentName(wrapper, "value", jsonSetting)).toBe("Input")
				expect(props.type).toBe("textarea")
				expect(props.value).toBe('[\n  "ar",\n  "en"\n]')
				wrapper.unmount()
			})

			it("sends the parsed value, not the textarea's text", async () => {
				const wrapper = mountPage()
				await flushPromises()

				wrapper.vm.startEdit(jsonSetting)
				wrapper.vm.setDraft('["en", "ar"]')
				await wrapper.vm.save()
				await flushPromises()

				expect(updateMock).toHaveBeenCalledWith("kiosk.locale_order", ["en", "ar"])
				wrapper.unmount()
			})

			it("catches malformed JSON client-side, with no network call at all", async () => {
				const wrapper = mountPage()
				await flushPromises()

				wrapper.vm.startEdit(jsonSetting)
				wrapper.vm.setDraft("[ar, en]")
				await wrapper.vm.save()
				await flushPromises()

				expect(updateMock).not.toHaveBeenCalled()
				expect(listMock).toHaveBeenCalledTimes(1)
				expect(errorToastMock).toHaveBeenCalledWith("That isn't valid JSON.")
				wrapper.unmount()
			})

			it("catches a valid-JSON scalar too, which the server's `array` rule would 422", async () => {
				const wrapper = mountPage()
				await flushPromises()

				wrapper.vm.startEdit(jsonSetting)
				wrapper.vm.setDraft("5")
				await wrapper.vm.save()
				await flushPromises()

				expect(updateMock).not.toHaveBeenCalled()
				expect(errorToastMock).toHaveBeenCalledWith("Enter a JSON object or array, not a single value.")
				wrapper.unmount()
			})
		})
	})

	describe("labels", () => {
		it("shows the override label and the raw key for a key it knows", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.text()).toContain("Cancellation window")
			expect(wrapper.text()).toContain("booking.cancellation_window_minutes")
			wrapper.unmount()
		})

		/**
		 * The degradation that matters. A key added by a future seeder — the S4
		 * access-control work is expected to add TTLock ones — renders a readable
		 * row today rather than a blank cell or a leaked `settings.keys.….label`.
		 */
		it("falls back to a formatted version of a key with no override", async () => {
			listMock.mockResolvedValue([unknownSetting])
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.text()).toContain("Lock ttlock client id")
			expect(wrapper.text()).toContain("lock.ttlock_client_id")
			expect(wrapper.text()).not.toContain("settings.keys")
			wrapper.unmount()
		})

		it("still lets an un-labelled key be edited and saved", async () => {
			listMock.mockResolvedValue([unknownSetting])
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(unknownSetting)
			wrapper.vm.setDraft("def456")
			await wrapper.vm.save()
			await flushPromises()

			expect(updateMock).toHaveBeenCalledWith("lock.ttlock_client_id", "def456")
			wrapper.unmount()
		})
	})

	describe("one row in edit mode at a time", () => {
		it("opens exactly the row that was clicked", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.vm.editingKey).toBeNull()
			wrapper.vm.startEdit(boolSetting)

			expect(wrapper.vm.editingKey).toBe("module.cafe.is_enabled")
			expect(cellComponentName(wrapper, "value", boolSetting)).toBe("Switch")
			// Every other row keeps its read-only rendering.
			expect(cellComponentName(wrapper, "value", intSetting)).toBeUndefined()
			wrapper.unmount()
		})

		/** Silently discarding an in-progress draft is the failure this avoids. */
		it("disables the other rows' edit buttons instead of dropping the open draft", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(boolSetting)
			wrapper.vm.setDraft(false)

			expect(cellProps(wrapper, "actions", intSetting).disabled).toBe(true)
			wrapper.vm.startEdit(intSetting)

			expect(wrapper.vm.editingKey).toBe("module.cafe.is_enabled")
			expect(wrapper.vm.draft).toBe(false)
			wrapper.unmount()
		})

		it("reverts to the last fetched value on cancel", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(intSetting)
			wrapper.vm.setDraft(999)
			wrapper.vm.cancelEdit()

			expect(wrapper.vm.editingKey).toBeNull()
			expect(updateMock).not.toHaveBeenCalled()
			// The row is back to read-only, showing the fetched 60 rather than the abandoned 999.
			expect(cellComponentName(wrapper, "value", intSetting)).toBeUndefined()

			wrapper.vm.startEdit(intSetting)
			expect(wrapper.vm.draft).toBe(60)
			wrapper.unmount()
		})
	})

	describe("after a successful save", () => {
		/**
		 * Refetch, not an optimistic row patch: the backend coerces the value
		 * through `Setting::encodeValue()`/`resolvedValue()` authoritatively, and
		 * `updated_at` only exists server-side. Reading the round-tripped row back
		 * is the honest representation of what is stored.
		 */
		it("refetches the list rather than patching the row in place", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(intSetting)
			wrapper.vm.setDraft(45)
			await wrapper.vm.save()
			await flushPromises()

			expect(listMock).toHaveBeenCalledTimes(2)
			wrapper.unmount()
		})

		it("closes the row", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(intSetting)
			wrapper.vm.setDraft(45)
			await wrapper.vm.save()
			await flushPromises()

			expect(wrapper.vm.editingKey).toBeNull()
			wrapper.unmount()
		})

		it("keeps the row open when the request fails, so the value is not lost", async () => {
			const { ApiError } = await import("@/add-os/services/api")
			updateMock.mockRejectedValue(new ApiError(500, JSON.stringify({ message: "Server error." })))
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(intSetting)
			wrapper.vm.setDraft(45)
			await wrapper.vm.save()
			await flushPromises()

			expect(wrapper.vm.editingKey).toBe("booking.cancellation_window_minutes")
			expect(wrapper.vm.draft).toBe(45)
			wrapper.unmount()
		})
	})

	describe("the two keys that ask first", () => {
		beforeEach(() => {
			listMock.mockResolvedValue([intSetting, timezoneSetting, qrSetting])
		})

		it("asks before changing the time zone, and only PATCHes once confirmed", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(timezoneSetting)
			wrapper.vm.setDraft("UTC")
			await wrapper.vm.save()
			await flushPromises()

			expect(updateMock).not.toHaveBeenCalled()
			expect(dialogWarningMock).toHaveBeenCalledTimes(1)
			expect(dialogWarningMock.mock.calls[0][0].content).toContain("re-reads every stored booking time")

			await dialogWarningMock.mock.calls[0][0].onPositiveClick()
			await flushPromises()

			expect(updateMock).toHaveBeenCalledWith("app.timezone", "UTC")
			expect(wrapper.vm.editingKey).toBeNull()
			wrapper.unmount()
		})

		it("asks before changing the arrival QR value, naming the printed stickers", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(qrSetting)
			wrapper.vm.setDraft("addapp://arrival-v2")
			await wrapper.vm.save()
			await flushPromises()

			expect(updateMock).not.toHaveBeenCalled()
			expect(dialogWarningMock.mock.calls[0][0].content).toContain("printed arrival QR")

			await dialogWarningMock.mock.calls[0][0].onPositiveClick()
			await flushPromises()

			expect(updateMock).toHaveBeenCalledWith("kiosk.arrival_qr_value", "addapp://arrival-v2")
			wrapper.unmount()
		})

		it("never asks for a key whose mistake is visible immediately", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(intSetting)
			wrapper.vm.setDraft(30)
			await wrapper.vm.save()
			await flushPromises()

			expect(dialogWarningMock).not.toHaveBeenCalled()
			expect(updateMock).toHaveBeenCalledWith("booking.cancellation_window_minutes", 30)
			wrapper.unmount()
		})

		/** Validation runs first, so a value that cannot be saved never poses the question. */
		it("validates before asking, so a bad value is refused without a prompt", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(qrSetting)
			wrapper.vm.setDraft("")
			await wrapper.vm.save()
			await flushPromises()

			expect(dialogWarningMock).not.toHaveBeenCalled()
			expect(updateMock).not.toHaveBeenCalled()
			wrapper.unmount()
		})
	})

	describe("an operations account", () => {
		/**
		 * The list is readable by admin AND operations; only the update is
		 * admin-only. So the page still loads and shows every value — it just
		 * renders no control that can only 403.
		 */
		it("still sees the whole table", async () => {
			canUpdateMock.mockReturnValue(false)
			const wrapper = mountPage()
			await flushPromises()

			expect(listMock).toHaveBeenCalled()
			expect(wrapper.vm.data).toHaveLength(3)
			expect(wrapper.text()).toContain("booking.cancellation_window_minutes")
			wrapper.unmount()
		})

		it("gets no edit control at all, rather than a disabled one", async () => {
			canUpdateMock.mockReturnValue(false)
			const wrapper = mountPage()
			await flushPromises()

			expect(renderCell(wrapper, "actions", intSetting)).toBeNull()
			wrapper.unmount()
		})

		it("is told the page is read-only for it", async () => {
			canUpdateMock.mockReturnValue(false)
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.text()).toContain("Only an admin account can change a setting.")
			wrapper.unmount()
		})

		it("cannot open a row even if startEdit is driven directly", async () => {
			canUpdateMock.mockReturnValue(false)
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.startEdit(intSetting)

			expect(wrapper.vm.editingKey).toBeNull()
			wrapper.unmount()
		})
	})

	it("surfaces a failed load instead of showing an empty table", async () => {
		const { ApiError } = await import("@/add-os/services/api")
		listMock.mockRejectedValue(new ApiError(500, JSON.stringify({ message: "Server error." })))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load settings.")
		wrapper.unmount()
	})
})

describe("settingsPage wiring", () => {
	const source = readFileSync(path.resolve(__dirname, "..", "SettingsPage.vue"), "utf8")

	/**
	 * The other half of this rule — that the page never reaches for the auth
	 * store itself — is `no-inline-role-checks.spec.ts`, which scans all of
	 * `modules/**` for exactly that. Asserting it again here is not just
	 * redundant: writing the forbidden identifier into this file is itself a
	 * violation the guard reports, because it scans specs too.
	 */
	it("gates the edit control behind canUpdateSettings, from the shared permissions module", () => {
		expect(source).toContain('from "@/add-os/config/permissions"')
		expect(source).toContain("canUpdateSettings()")
	})

	it("never sends a raw HTTP call — only the services/composables layer", () => {
		expect(source).not.toMatch(/\bfetch\(/)
	})

	/** No `create`/`destroy` route exists, so no call to one can exist either. */
	it("imports only the two calls the resource actually has", () => {
		expect(source).toContain("listSettings")
		expect(source).not.toMatch(/createSetting|removeSetting|deleteSetting/)
	})
})
