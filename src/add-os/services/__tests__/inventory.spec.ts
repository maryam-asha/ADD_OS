import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

vi.mock("@/router", () => ({
	default: { push: vi.fn() }
}))

vi.mock("@/stores/auth", () => ({
	useAuthStore: () => ({ setLogout: vi.fn() })
}))

const { findItemByBarcode, generateBarcode, listAssets, listBalances, listWarehouses, moveAsset, registerAssets, submitStockOperation } = await import("../inventory")
const { amenityLabel } = await import("../amenities")

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

function calledUrl(): URL {
	return new URL(String(vi.mocked(fetch).mock.calls[0][0]))
}

function calledBody(): unknown {
	return JSON.parse(String((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body))
}

describe("inventory service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("flattens a place filter into ADD Core's location[type] / location[id] and drops empty filters", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } }))

		await listAssets({ page: 2, location: { type: "branch", id: 3 }, status: null, search: "" })

		const url = calledUrl()
		expect(url.pathname).toBe("/api/v1/inventory/assets")
		expect(url.searchParams.get("location[type]")).toBe("branch")
		expect(url.searchParams.get("location[id]")).toBe("3")
		expect(url.searchParams.get("page")).toBe("2")
		expect(url.searchParams.has("status")).toBe(false)
		expect(url.searchParams.has("search")).toBe(false)
	})

	it("sends a boolean filter as 1 or 0", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [] }))

		await listBalances({ include_empty: true })

		expect(calledUrl().searchParams.get("include_empty")).toBe("1")
	})

	it("registers assets and answers the list of them", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [{ id: 1 }, { id: 2 }] }, 201))

		const assets = await registerAssets({ item_id: 4, location: { type: "space", id: 7 }, count: 2 })

		expect(assets).toHaveLength(2)
		expect(calledBody()).toEqual({ item_id: 4, location: { type: "space", id: 7 }, count: 2 })
	})

	it("moves an asset with its place as an object and an empty note as null", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { id: 9 } }, 201))

		await moveAsset(5, { type: "zone", id: 2 }, "")

		expect(calledUrl().pathname).toBe("/api/v1/inventory/assets/5/move")
		expect(calledBody()).toEqual({ location: { type: "zone", id: 2 }, note: null })
	})

	it("lists warehouses with their search, status and manager filters", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } }))

		await listWarehouses({ search: "Kit", active: false, manager_id: 4 })

		const url = calledUrl()
		expect(url.pathname).toBe("/api/v1/inventory/warehouses")
		expect(url.searchParams.get("search")).toBe("Kit")
		expect(url.searchParams.get("active")).toBe("0")
		expect(url.searchParams.get("manager_id")).toBe("4")
	})

	it("posts a write-off to stock/issue with its reason", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [{ id: 1 }] }, 201))

		const rows = await submitStockOperation("writeOff", { warehouse_id: 2, reason: "damaged", lines: [{ item_id: 1, quantity: 3 }] })

		expect(calledUrl().pathname).toBe("/api/v1/inventory/stock/issue")
		expect(calledBody()).toEqual({ warehouse_id: 2, reason: "damaged", lines: [{ item_id: 1, quantity: 3 }] })
		expect(rows).toHaveLength(1)
	})

	it("posts a transfer with both warehouses and answers its rows", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [{ type: "transfer_out" }, { type: "transfer_in" }] }, 201))

		const rows = await submitStockOperation("transfer", { from_warehouse_id: 1, to_warehouse_id: 2, lines: [{ item_id: 1, unit_id: 5, quantity: 2 }] })

		expect(calledUrl().pathname).toBe("/api/v1/inventory/stock/transfer")
		expect(calledBody()).toMatchObject({ from_warehouse_id: 1, to_warehouse_id: 2 })
		expect((rows as { type: string }[]).map(r => r.type)).toEqual(["transfer_out", "transfer_in"])
	})

	it("passes on the message of a count that matched the book", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "The count matches the book; nothing changed." }))

		const result = await submitStockOperation("adjust", { warehouse_id: 1, lines: [{ item_id: 1, counted: 7 }] })

		expect(calledUrl().pathname).toBe("/api/v1/inventory/stock/adjust")
		expect(result).toEqual({ message: "The count matches the book; nothing changed." })
	})

	it("finds an item by its barcode, or nothing", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: { id: 7 } }))
		expect((await findItemByBarcode("6291041500213"))?.id).toBe(7)
		expect(calledUrl().pathname).toBe("/api/v1/inventory/items/barcode/6291041500213")

		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Not found." }, 404))
		expect(await findItemByBarcode("0000000000000")).toBeNull()
	})

	it("asks the server for an unused barcode", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { barcode: "2123456789012" } }, 201))

		expect(await generateBarcode()).toBe("2123456789012")
		expect(calledUrl().pathname).toBe("/api/v1/inventory/items/barcodes")
	})
})

describe("amenityLabel", () => {
	const catalog = [{ id: 1, key: "wifi", name: { ar: "واي فاي", en: "Wi-Fi" }, icon: "wifi", order: 0, is_active: true }]

	it("names a key from the catalog in the asked language", () => {
		expect(amenityLabel("wifi", catalog, "ar")).toBe("واي فاي")
		expect(amenityLabel("wifi", catalog, "en")).toBe("Wi-Fi")
	})

	it("falls back to the key for one the catalog no longer has", () => {
		expect(amenityLabel("parking", catalog, "en")).toBe("parking")
	})
})
