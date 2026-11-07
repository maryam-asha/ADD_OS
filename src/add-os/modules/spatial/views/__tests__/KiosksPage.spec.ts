import type { VNode } from "vue"
import type { Kiosk } from "@/add-os/modules/spatial/types/kiosk"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import KiosksPage from "../KiosksPage.vue"

const { listKiosksMock, listSpacesMock, issueMock, revokeMock, dialogWarning, messageSuccess, messageError, granted } = vi.hoisted(() => ({
	listKiosksMock: vi.fn(),
	listSpacesMock: vi.fn(),
	issueMock: vi.fn(),
	revokeMock: vi.fn(),
	dialogWarning: vi.fn(),
	messageSuccess: vi.fn(),
	messageError: vi.fn(),
	granted: new Set<string>()
}))

vi.mock("@/add-os/services/kiosks", () => ({
	listKiosks: listKiosksMock,
	createKiosk: vi.fn(),
	updateKiosk: vi.fn(),
	removeKiosk: vi.fn(),
	issueKioskPairingCode: issueMock,
	revokeKioskSecret: revokeMock
}))
vi.mock("@/add-os/services/spaces", () => ({ listSpaces: listSpacesMock }))
vi.mock("@/add-os/config/permissions", async importOriginal => ({
	...await importOriginal<typeof import("@/add-os/config/permissions")>(),
	can: (permission: string) => granted.has(permission)
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: messageSuccess, error: messageError }),
		useDialog: () => ({ warning: dialogWarning })
	}
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: {} } })

function kiosk(overrides: Partial<Kiosk> = {}): Kiosk {
	return {
		id: 3,
		name: "Main entrance",
		space_id: 9,
		is_active: true,
		is_paired: false,
		paired_at: null,
		last_used_at: null,
		created_at: null,
		...overrides
	}
}

async function mountPage(...permissions: string[]) {
	granted.clear()
	permissions.forEach(permission => granted.add(permission))

	const wrapper = mount(KiosksPage, {
		global: {
			plugins: [i18n],
			stubs: { ResourceTable: true, ResourceFormDrawer: true, ResourceStatCards: true, KioskPairingCodeModal: true, Icon: true }
		}
	})
	await flushPromises()

	return wrapper
}

type Page = Awaited<ReturnType<typeof mountPage>>

const table = (page: Page) => page.findComponent({ name: "ResourceTable" })
const modal = (page: Page) => page.findComponent({ name: "KioskPairingCodeModal" })

function actions(page: Page, row: Kiosk): VNode[] {
	const build = table(page).props("extraActions") as ((row: Kiosk) => VNode[]) | undefined
	return build ? build(row) : []
}

const labelsOf = (nodes: VNode[]) => nodes.map(node => node.props?.["aria-label"])

beforeEach(() => {
	vi.clearAllMocks()
	listKiosksMock.mockResolvedValue([kiosk()])
	listSpacesMock.mockResolvedValue([{ id: 9, space_type: "co_space", name: { ar: "أ", en: "Open floor" } }])
})

describe("kiosks page permissions", () => {
	it("offers only reading to kiosks.view", async () => {
		const page = await mountPage("kiosks.view")

		expect(page.find("[data-testid='kiosk-create']").exists()).toBe(false)
		expect(table(page).props("onEdit")).toBeUndefined()
		expect(table(page).props("onDelete")).toBeUndefined()
		expect(actions(page, kiosk())).toEqual([])
	})

	it("offers creating to kiosks.create when the spaces it must choose from are readable", async () => {
		const page = await mountPage("kiosks.view", "kiosks.create", "spaces.view")

		expect(page.find("[data-testid='kiosk-create']").exists()).toBe(true)
	})

	it("does not offer creating without spaces.view, because the required space could not be chosen", async () => {
		const page = await mountPage("kiosks.view", "kiosks.create")

		expect(page.find("[data-testid='kiosk-create']").exists()).toBe(false)
	})

	it("does not ask for the spaces without spaces.view", async () => {
		await mountPage("kiosks.view")

		expect(listSpacesMock).not.toHaveBeenCalled()
	})

	it("offers editing to kiosks.update and deleting to kiosks.delete, each on its own", async () => {
		const editor = await mountPage("kiosks.view", "kiosks.update")
		expect(table(editor).props("onEdit")).toBeTypeOf("function")
		expect(table(editor).props("onDelete")).toBeUndefined()

		const remover = await mountPage("kiosks.view", "kiosks.delete")
		expect(table(remover).props("onEdit")).toBeUndefined()
		expect(table(remover).props("onDelete")).toBeTypeOf("function")
	})

	it("offers a pairing code to kiosks.pair, and nothing to revoke on a kiosk that is not paired", async () => {
		const page = await mountPage("kiosks.view", "kiosks.pair")

		expect(labelsOf(actions(page, kiosk()))).toEqual(["kiosks.pairing.issue"])
	})

	it("offers no pairing code for a deactivated kiosk, which the server refuses to pair", async () => {
		const page = await mountPage("kiosks.view", "kiosks.pair")

		expect(actions(page, kiosk({ is_active: false }))).toEqual([])
	})

	it("offers revoking on a paired kiosk, deactivated or not, since a lost device must still be cut off", async () => {
		const page = await mountPage("kiosks.view", "kiosks.pair")

		expect(labelsOf(actions(page, kiosk({ is_paired: true })))).toEqual(["kiosks.pairing.issue", "kiosks.pairing.revoke"])
		expect(labelsOf(actions(page, kiosk({ is_paired: true, is_active: false })))).toEqual(["kiosks.pairing.revoke"])
	})
})

describe("kiosks page pairing", () => {
	it("shows the issued code for its kiosk", async () => {
		const issued = { pairing_code: "MDAUCU97", expires_at: "2026-11-07T10:10:00+00:00" }
		issueMock.mockResolvedValue(issued)
		const page = await mountPage("kiosks.view", "kiosks.pair")
		const row = kiosk()

		actions(page, row)[0].props!.onClick()
		await flushPromises()

		expect(issueMock).toHaveBeenCalledWith(3)
		expect(modal(page).props("issued")).toEqual(issued)
		expect(modal(page).props("kiosk")).toEqual(row)
		expect(modal(page).props("show")).toBe(true)
	})

	it("reports a refused code instead of opening the modal", async () => {
		const { ApiError } = await import("@/add-os/services/api")
		issueMock.mockRejectedValue(new ApiError(403, JSON.stringify({ message: "This action is unauthorized." })))
		const page = await mountPage("kiosks.view", "kiosks.pair")

		actions(page, kiosk())[0].props!.onClick()
		await flushPromises()

		expect(messageError).toHaveBeenCalledWith("This action is unauthorized.")
		expect(modal(page).props("show")).toBe(false)
	})

	it("revokes only after confirming, then re-reads the list", async () => {
		revokeMock.mockResolvedValue({ message: "The kiosk has been unpaired." })
		const page = await mountPage("kiosks.view", "kiosks.pair")
		const row = kiosk({ is_paired: true })

		actions(page, row)[1].props!.onClick()

		expect(revokeMock).not.toHaveBeenCalled()
		expect(dialogWarning).toHaveBeenCalledOnce()

		listKiosksMock.mockClear()
		await dialogWarning.mock.calls[0][0].onPositiveClick()
		await flushPromises()

		expect(revokeMock).toHaveBeenCalledWith(3)
		expect(messageSuccess).toHaveBeenCalledWith("The kiosk has been unpaired.")
		expect(listKiosksMock).toHaveBeenCalled()
	})
})
