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

const { findItemByBarcode, generateBarcode, getStockOperation, inventorySettings, listAssets, listBalances, listStockOperations, listManagedSettings, listWarehouses, moveAsset, registerAssetBatch, registerAssets, saveSettings, submitStockOperation } = await import("../inventory")
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

	it("lists the settings page's rows", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [{ key: "items.sku_mode", group: "items", type: "enum", options: ["auto"], value: "auto", default: "auto", locked: false, locked_reason: null }] }))

		const rows = await listManagedSettings()

		expect(calledUrl().pathname).toMatch(/\/inventory\/settings\/manage$/)
		expect(rows[0].key).toBe("items.sku_mode")
	})

	it("registers a place's assets in one batch", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] }, 201))
		const payload = { location: { type: "space" as const, id: 7 }, currency: "USD", in_service_on: "2026-03-15", attachments: ["/storage/a.pdf", "/storage/b.jpg"], lines: [{ item_id: 4, count: 2, purchase_cost: 25 }, { item_id: 5, serial_number: "S-1" }] }

		const assets = await registerAssetBatch(payload)

		expect(calledUrl().pathname).toMatch(/\/assets\/batch$/)
		expect(assets).toHaveLength(3)
		expect(calledBody()).toEqual(payload)
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
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { id: "op-1", kind: "write_off", movements: [{ id: 1 }] } }, 201))

		const operation = await submitStockOperation("writeOff", { warehouse_id: 2, reason: "damaged", note: "Broken", operation_date: "2026-11-07", lines: [{ item_id: 1, quantity: 3, note: "Box 2" }] })

		expect(calledUrl().pathname).toBe("/api/v1/inventory/stock/issue")
		expect(calledBody()).toEqual({ warehouse_id: 2, reason: "damaged", note: "Broken", operation_date: "2026-11-07", lines: [{ item_id: 1, quantity: 3, note: "Box 2" }] })
		expect(operation).toMatchObject({ id: "op-1", kind: "write_off" })
	})

	it("posts a transfer with both warehouses", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { id: "op-2", kind: "transfer", movements: [] } }, 201))

		await submitStockOperation("transfer", { from_warehouse_id: 1, to_warehouse_id: 2, lines: [{ item_id: 1, unit_id: 5, quantity: 2 }] })

		expect(calledUrl().pathname).toBe("/api/v1/inventory/stock/transfer")
		expect(calledBody()).toMatchObject({ from_warehouse_id: 1, to_warehouse_id: 2 })
	})

	it("lists operations with their filters and reads one", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } }))
		await listStockOperations({ warehouse_id: 3, kind: "write_off", from: "2026-11-01", to: null })
		const url = calledUrl()
		expect(url.pathname).toBe("/api/v1/inventory/stock/operations")
		expect(url.searchParams.get("kind")).toBe("write_off")
		expect(url.searchParams.get("warehouse_id")).toBe("3")
		expect(url.searchParams.has("to")).toBe(false)

		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: { id: "op-9", movements: [] } }))
		expect((await getStockOperation("op-9")).id).toBe("op-9")
	})

	it("reads the package's settings once and keeps them", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { assets_in_warehouses: true } }))

		expect(await inventorySettings()).toEqual({ assets_in_warehouses: true })
		expect(await inventorySettings()).toEqual({ assets_in_warehouses: true })

		expect(calledUrl().pathname).toBe("/api/v1/inventory/settings")
		expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
	})

	it("saves only the values sent, under values, and reads the public settings afresh after", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "ok" }))

		await saveSettings({ "items.sku_prefix": "P-" })

		expect(calledUrl().pathname).toMatch(/\/inventory\/settings$/)
		expect((vi.mocked(fetch).mock.calls[0][1] as RequestInit).method).toBe("PATCH")
		expect(calledBody()).toEqual({ values: { "items.sku_prefix": "P-" } })

		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: { assets_in_warehouses: false, item_code_mode: "auto" } }))
		expect((await inventorySettings()).item_code_mode).toBe("auto")
		expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
	})

	it("searches balances", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } }))

		await listBalances({ warehouse_id: 2, search: "ITM" })

		expect(calledUrl().searchParams.get("search")).toBe("ITM")
	})

	it("passes on the message of a count that matched the book", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "The count matches the book; nothing changed." }))

		const result = await submitStockOperation("adjust", { warehouse_id: 1, note: "Count", lines: [{ item_id: 1, counted: 7 }] })

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
