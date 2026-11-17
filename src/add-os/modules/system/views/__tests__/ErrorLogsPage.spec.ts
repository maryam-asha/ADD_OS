import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import ErrorLogsPage from "../ErrorLogsPage.vue"

const { listErrorLogsMock, removeErrorLogMock, dialogWarningMock, granted } = vi.hoisted(() => ({
	listErrorLogsMock: vi.fn(),
	removeErrorLogMock: vi.fn(),
	dialogWarningMock: vi.fn(),
	granted: new Set<string>()
}))

vi.mock("@/add-os/services/error-logs", () => ({
	listErrorLogs: listErrorLogsMock,
	removeErrorLog: removeErrorLogMock
}))

vi.mock("@/add-os/config/permissions", async importOriginal => ({
	...await importOriginal<typeof import("@/add-os/config/permissions")>(),
	canDeleteErrorLogs: () => granted.has("error-logs.delete")
}))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }), useDialog: () => ({ warning: dialogWarningMock }) }
})

// The example report the collection documents for POST /api/v1/errors
// (pinned snapshot, docs/api/), as the admin resource returns it.
const report = {
	id: 7,
	error_type: "NetworkException",
	message: "Failed to fetch plans",
	stack_trace: "at PlansRepository.fetch (plans_repository.dart:42)",
	app_version: "1.4.2",
	build_number: "142",
	platform: "android" as const,
	os: "Android 14",
	device: "Pixel 7",
	screen: "PlansListScreen",
	user_id: null,
	session_id: "a1b2c3d4",
	occurred_at: "2026-08-11T10:15:00Z",
	metadata: { retry_count: 2 },
	created_at: "2026-08-11T10:15:03Z"
}

const pageOf = (rows: (typeof report)[]) => ({ data: rows, meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length } })

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function mountPage() {
	return mount(ErrorLogsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

function lastQuery(): Record<string, unknown> {
	return listErrorLogsMock.mock.calls.at(-1)?.[0] as Record<string, unknown>
}

async function openDetail(wrapper: ReturnType<typeof mountPage>) {
	await wrapper.get(`[aria-label='${en.errorLogs.actions.view}']`).trigger("click")
	await flushPromises()
}

describe("errorLogsPage", () => {
	beforeEach(() => {
		granted.clear()
		listErrorLogsMock.mockReset()
		listErrorLogsMock.mockResolvedValue(pageOf([report]))
		removeErrorLogMock.mockReset()
		removeErrorLogMock.mockResolvedValue(undefined)
		dialogWarningMock.mockReset()
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("lists reported errors, newest first from page 1 with no filters", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(lastQuery()).toEqual({ error_type: null, platform: null, from: null, to: null, page: 1 })
		const text = wrapper.text()
		expect(text).toContain("NetworkException")
		expect(text).toContain("Failed to fetch plans")
		expect(text).toContain("1.4.2 (142)")
		expect(text).toContain("Pixel 7 · Android 14")
		expect(text).toContain(en.errorLogs.platform.android)
		wrapper.unmount()
	})

	it("applies the exact error-type filter on commit, not on every keystroke", async () => {
		const wrapper = mountPage()
		await flushPromises()
		const calls = listErrorLogsMock.mock.calls.length

		const input = wrapper.get(`input[placeholder='${en.errorLogs.filters.type}']`)
		// Typing only: setValue() would also fire `change`, which is the commit.
		;(input.element as HTMLInputElement).value = "  NetworkException "
		await input.trigger("input")
		await flushPromises()
		expect(listErrorLogsMock.mock.calls.length).toBe(calls)

		await input.trigger("change")
		await flushPromises()
		expect(lastQuery()).toMatchObject({ error_type: "NetworkException", page: 1 })
		wrapper.unmount()
	})

	it("opens the stack trace and the app's extra context in the detail drawer", async () => {
		const wrapper = mountPage()
		await flushPromises()
		await openDetail(wrapper)

		const body = document.body.textContent ?? ""
		expect(body).toContain(en.errorLogs.detail.title)
		expect(body).toContain("at PlansRepository.fetch (plans_repository.dart:42)")
		expect(body).toContain("\"retry_count\": 2")
		expect(body).toContain(en.errorLogs.detail.noUser)
		wrapper.unmount()
	})

	it("offers no delete without error-logs.delete", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.find(`[aria-label='${en.common.moreActions}']`).exists()).toBe(false)
		await openDetail(wrapper)
		const deleteButton = Array.from(document.body.querySelectorAll("button")).find(button => button.textContent?.trim() === en.errorLogs.actions.delete)
		expect(deleteButton).toBeUndefined()
		wrapper.unmount()
	})

	it("deletes from the drawer after a confirm, then reloads the list", async () => {
		granted.add("error-logs.delete")
		const wrapper = mountPage()
		await flushPromises()
		await openDetail(wrapper)

		const deleteButton = Array.from(document.body.querySelectorAll("button")).find(button => button.textContent?.trim() === en.errorLogs.actions.delete)
		expect(deleteButton).toBeDefined()
		deleteButton!.click()
		expect(dialogWarningMock).toHaveBeenCalledTimes(1)
		expect(removeErrorLogMock).not.toHaveBeenCalled()

		const calls = listErrorLogsMock.mock.calls.length
		await dialogWarningMock.mock.calls[0][0].onPositiveClick()
		await flushPromises()
		expect(removeErrorLogMock).toHaveBeenCalledWith(7)
		expect(listErrorLogsMock.mock.calls.length).toBe(calls + 1)
		wrapper.unmount()
	})
})
