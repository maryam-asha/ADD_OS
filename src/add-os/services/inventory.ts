/**
 * ADD Core's inventory package under `/api/v1/inventory` (2026-10-24):
 * dashboard credentials, no role check — every route carries its own
 * `inventory.*` permission (`packages/add/inventory/routes/admin.php`).
 * Updates and one-step actions on an existing record answer `{message}`;
 * anything that creates a record (a movement, a custody, a repair) answers it.
 */

import type { Paginated, RawPaginatedResponse } from "./pagination"
import type {
	Asset,
	AssetAssignment,
	AssetDetailsPayload,
	AssetMovement,
	AssetRegister,
	AssetStatus,
	AttributeDefinition,
	AttributeDefinitionPayload,
	Category,
	CategoryPayload,
	CustodianRef,
	DisposalMethod,
	Item,
	ItemKind,
	ItemPayload,
	MaintenanceRecord,
	MaintenanceSchedule,
	MaintenanceType,
	ManagedSetting,
	PlaceRef,
	RegisterAssetBatchPayload,
	RegisterAssetPayload,
	StockBalance,
	StockMovement,
	StockMovementType,
	StockOperation,
	StockOperationKind,
	StockOperationPayload,
	StockValuation,
	StoredOperationKind,
	Unit,
	UnitPayload,
	Warehouse,
	WarehousePayload
} from "@/add-os/modules/inventory/types/inventory"
import type { ItemCodeMode } from "@/add-os/modules/inventory/utils/itemCode"
import { ApiError, del, get, patch, post } from "./api"
import { rowsOf, toPaginated } from "./pagination"

const BASE = "/api/v1/inventory"

export interface MessageResult {
	message?: string
}

/** Drops empty filters and flattens a place into `location[type]` / `location[id]`. */
function query(filters: Record<string, unknown>): Record<string, unknown> {
	const q: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(filters)) {
		if (value === null || value === undefined || value === "") continue
		if (typeof value === "object" && "type" in value && "id" in value) {
			const ref = value as { type: string; id: number }
			q[`${key}[type]`] = ref.type
			q[`${key}[id]`] = ref.id
			continue
		}
		q[key] = typeof value === "boolean" ? (value ? 1 : 0) : value
	}
	return q
}

// ── Catalog ─────────────────────────────────────────────────────────────────

export async function listCategories(kind?: ItemKind | null): Promise<Category[]> {
	return rowsOf<Category>((await get<{ data: Category[] }>(`${BASE}/categories`, query({ kind }))).data)
}

/** With `fields`: every field its items answer, inherited ones marked. */
export async function getCategory(id: number): Promise<Category> {
	return (await get<{ data: Category }>(`${BASE}/categories/${id}`)).data
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
	return (await post<{ data: Category }>(`${BASE}/categories`, payload)).data
}

export async function updateCategory(id: number, payload: Partial<CategoryPayload>): Promise<MessageResult> {
	return patch<MessageResult>(`${BASE}/categories/${id}`, payload)
}

export async function removeCategory(id: number): Promise<void> {
	await del(`${BASE}/categories/${id}`)
}

export async function addField(categoryId: number, payload: AttributeDefinitionPayload): Promise<AttributeDefinition> {
	return (await post<{ data: AttributeDefinition }>(`${BASE}/categories/${categoryId}/fields`, payload)).data
}

export async function updateField(id: number, payload: Partial<AttributeDefinitionPayload>): Promise<MessageResult> {
	return patch<MessageResult>(`${BASE}/fields/${id}`, payload)
}

export async function removeField(id: number): Promise<void> {
	await del(`${BASE}/fields/${id}`)
}

export async function listUnits(): Promise<Unit[]> {
	return rowsOf<Unit>((await get<{ data: Unit[] }>(`${BASE}/units`)).data)
}

export async function createUnit(payload: UnitPayload): Promise<Unit> {
	return (await post<{ data: Unit }>(`${BASE}/units`, payload)).data
}

export async function updateUnit(id: number, payload: Partial<UnitPayload>): Promise<MessageResult> {
	return patch<MessageResult>(`${BASE}/units/${id}`, payload)
}

export async function removeUnit(id: number): Promise<void> {
	await del(`${BASE}/units/${id}`)
}

export interface ItemFilters {
	page?: number
	per_page?: number
	category_id?: number | null
	kind?: ItemKind | null
	search?: string | null
	active?: boolean | null
}

export async function listItems(filters: ItemFilters = {}): Promise<Paginated<Item>> {
	return toPaginated(await get<RawPaginatedResponse<Item>>(`${BASE}/items`, query({ ...filters })))
}

/** One item with its packs, as the line of an operation needs it. */
export async function getItem(id: number): Promise<Item> {
	return (await get<{ data: Item }>(`${BASE}/items/${id}`)).data
}

export async function createItem(payload: ItemPayload): Promise<Item> {
	return (await post<{ data: Item }>(`${BASE}/items`, payload)).data
}

export async function updateItem(id: number, payload: Partial<ItemPayload>): Promise<MessageResult> {
	return patch<MessageResult>(`${BASE}/items/${id}`, payload)
}

export async function removeItem(id: number): Promise<void> {
	await del(`${BASE}/items/${id}`)
}

/** The item a scanned code belongs to, or null when none has it. */
export async function findItemByBarcode(code: string): Promise<Item | null> {
	try {
		return (await get<{ data: Item }>(`${BASE}/items/barcode/${encodeURIComponent(code)}`)).data
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) return null
		throw error
	}
}

/** An unused internal barcode (EAN-13 starting with 2), for the item form to fill in. */
export async function generateBarcode(): Promise<string> {
	return (await post<{ data: { barcode: string } }>(`${BASE}/items/barcodes`, {})).data.barcode
}

// ── Assets ──────────────────────────────────────────────────────────────────

export interface AssetFilters {
	page?: number
	per_page?: number
	item_id?: number | null
	category_id?: number | null
	status?: AssetStatus | null
	location?: PlaceRef | null
	within?: boolean
	custodian?: CustodianRef | null
	search?: string | null
}

export async function listAssets(filters: AssetFilters = {}): Promise<Paginated<Asset>> {
	return toPaginated(await get<RawPaginatedResponse<Asset>>(`${BASE}/assets`, query({ ...filters })))
}

/** With its movements, custody history, maintenance and schedules. */
export async function getAsset(id: number): Promise<Asset> {
	return (await get<{ data: Asset }>(`${BASE}/assets/${id}`)).data
}

/** `count` identical assets, each with its own code and QR. */
export async function registerAssets(payload: RegisterAssetPayload): Promise<Asset[]> {
	return rowsOf<Asset>((await post<{ data: Asset[] }>(`${BASE}/assets`, payload)).data)
}

export async function registerAssetBatch(payload: RegisterAssetBatchPayload): Promise<Asset[]> {
	return rowsOf<Asset>((await post<{ data: Asset[] }>(`${BASE}/assets/batch`, payload)).data)
}

export async function updateAsset(id: number, payload: AssetDetailsPayload): Promise<MessageResult> {
	return patch<MessageResult>(`${BASE}/assets/${id}`, payload)
}

export async function setAssetStatus(id: number, status: AssetStatus): Promise<MessageResult> {
	return patch<MessageResult>(`${BASE}/assets/${id}/status`, { status })
}

export async function moveAsset(id: number, location: PlaceRef, note?: string | null): Promise<AssetMovement> {
	return (await post<{ data: AssetMovement }>(`${BASE}/assets/${id}/move`, { location, note: note || null })).data
}

export async function assignAsset(id: number, custodian: CustodianRef, note?: string | null): Promise<AssetAssignment> {
	return (await post<{ data: AssetAssignment }>(`${BASE}/assets/${id}/assign`, { custodian, note: note || null })).data
}

export async function returnAsset(id: number, note?: string | null): Promise<MessageResult> {
	return post<MessageResult>(`${BASE}/assets/${id}/return`, { note: note || null })
}

export async function disposeAsset(id: number, payload: { method: DisposalMethod; disposed_on: string; proceeds?: number | null; note?: string | null }): Promise<MessageResult> {
	return post<MessageResult>(`${BASE}/assets/${id}/dispose`, payload)
}

export async function listCustody(filters: { page?: number; custodian?: CustodianRef | null; open?: boolean } = {}): Promise<Paginated<AssetAssignment>> {
	return toPaginated(await get<RawPaginatedResponse<AssetAssignment>>(`${BASE}/custody`, query({ ...filters })))
}

// ── Maintenance ─────────────────────────────────────────────────────────────

export async function listMaintenance(filters: { page?: number; asset_id?: number | null; open?: boolean } = {}): Promise<Paginated<MaintenanceRecord>> {
	return toPaginated(await get<RawPaginatedResponse<MaintenanceRecord>>(`${BASE}/maintenance`, query({ ...filters })))
}

export async function openMaintenance(assetId: number, payload: { type: MaintenanceType; description: string; vendor?: string | null; schedule_id?: number | null }): Promise<MaintenanceRecord> {
	return (await post<{ data: MaintenanceRecord }>(`${BASE}/assets/${assetId}/maintenance`, payload)).data
}

export async function closeMaintenance(id: number, payload: { cost?: number | null; currency?: string | null; resolution?: string | null }): Promise<MessageResult> {
	return post<MessageResult>(`${BASE}/maintenance/${id}/close`, payload)
}

export async function listSchedules(assetId: number): Promise<MaintenanceSchedule[]> {
	return rowsOf<MaintenanceSchedule>((await get<{ data: MaintenanceSchedule[] }>(`${BASE}/assets/${assetId}/maintenance-schedules`)).data)
}

/** Everything due within `days`, overdue first. */
export async function listDueSchedules(days?: number): Promise<MaintenanceSchedule[]> {
	return rowsOf<MaintenanceSchedule>((await get<{ data: MaintenanceSchedule[] }>(`${BASE}/maintenance-schedules/due`, query({ days }))).data)
}

export async function createSchedule(assetId: number, payload: { title: string; interval_months: number; next_due_on: string; is_active?: boolean }): Promise<MaintenanceSchedule> {
	return (await post<{ data: MaintenanceSchedule }>(`${BASE}/assets/${assetId}/maintenance-schedules`, payload)).data
}

export async function updateSchedule(id: number, payload: Partial<{ title: string; interval_months: number; next_due_on: string; is_active: boolean }>): Promise<MessageResult> {
	return patch<MessageResult>(`${BASE}/maintenance-schedules/${id}`, payload)
}

export async function removeSchedule(id: number): Promise<void> {
	await del(`${BASE}/maintenance-schedules/${id}`)
}

// ── Settings ────────────────────────────────────────────────────────────────

/** The package's options the screens follow (config/inventory.php on ADD Core). */
export interface InventorySettings {
	/** Whether an asset may be registered in or moved to a warehouse. */
	assets_in_warehouses: boolean
	/** Who sets an item's code: auto (never typed), on_create (typed when made, fixed after) or editable. */
	item_code_mode: ItemCodeMode
}

let settings: Promise<InventorySettings> | null = null

/** Read once per page load, and again after the settings page saves. A failed read is retried next time. */
export function inventorySettings(): Promise<InventorySettings> {
	settings ??= get<{ data: InventorySettings }>(`${BASE}/settings`)
		.then(res => res.data)
		.catch(error => {
			settings = null
			throw error
		})
	return settings
}

/** The settings page: every setting with its value, the config file's default and its lock. */
export async function listManagedSettings(): Promise<ManagedSetting[]> {
	return (await get<{ data: ManagedSetting[] }>(`${BASE}/settings/manage`)).data
}

/** Saves the values that changed (`{ "items.sku_prefix": "P-" }`); the screens read the settings afresh after. */
export async function saveSettings(values: Record<string, unknown>): Promise<MessageResult> {
	const result = await patch<MessageResult>(`${BASE}/settings`, { values })
	settings = null
	return result
}

// ── Warehouses ──────────────────────────────────────────────────────────────

export interface WarehouseFilters {
	page?: number
	per_page?: number
	search?: string | null
	active?: boolean | null
	manager_id?: number | null
	allows_sales?: boolean | null
	place?: PlaceRef | null
}

export async function listWarehouses(filters: WarehouseFilters = {}): Promise<Paginated<Warehouse>> {
	return toPaginated(await get<RawPaginatedResponse<Warehouse>>(`${BASE}/warehouses`, query({ ...filters })))
}

export async function getWarehouse(id: number): Promise<Warehouse> {
	return (await get<{ data: Warehouse }>(`${BASE}/warehouses/${id}`)).data
}

export async function createWarehouse(payload: WarehousePayload): Promise<Warehouse> {
	return (await post<{ data: Warehouse }>(`${BASE}/warehouses`, payload)).data
}

export async function updateWarehouse(id: number, payload: Partial<WarehousePayload>): Promise<MessageResult> {
	return patch<MessageResult>(`${BASE}/warehouses/${id}`, payload)
}

export async function removeWarehouse(id: number): Promise<void> {
	await del(`${BASE}/warehouses/${id}`)
}

// ── Stock ───────────────────────────────────────────────────────────────────

export interface StockFilters {
	page?: number
	per_page?: number
	item_id?: number | null
	category_id?: number | null
	warehouse_id?: number | null
	/** The warehouses sitting in this place (a branch). */
	place?: PlaceRef | null
	include_empty?: boolean
	/** Item name, code or barcode. */
	search?: string | null
}

export async function listBalances(filters: StockFilters = {}): Promise<Paginated<StockBalance>> {
	return toPaginated(await get<RawPaginatedResponse<StockBalance>>(`${BASE}/stock/balances`, query({ ...filters })))
}

export async function listStockMovements(
	filters: StockFilters & { type?: StockMovementType | null; actor_id?: number | null; operation_id?: string | null; from?: string | null; to?: string | null } = {}
): Promise<Paginated<StockMovement>> {
	return toPaginated(await get<RawPaginatedResponse<StockMovement>>(`${BASE}/stock/movements`, query({ ...filters })))
}

const OPERATION_PATHS: Record<StockOperationKind, string> = {
	receive: "receive",
	issue: "issue",
	writeOff: "issue",
	transfer: "transfer",
	adjust: "adjust"
}

/**
 * Records one operation of several lines. Answers the ledger rows it wrote;
 * a count where every line matched the book answers `{message}` instead.
 */
export async function submitStockOperation(kind: StockOperationKind, payload: StockOperationPayload): Promise<StockOperation | MessageResult> {
	const res = await post<{ data?: StockOperation; message?: string }>(`${BASE}/stock/${OPERATION_PATHS[kind]}`, payload)
	return res.data ?? { message: res.message }
}

export interface StockOperationFilters {
	page?: number
	per_page?: number
	/** Operations from or into this warehouse. */
	warehouse_id?: number | null
	kind?: StoredOperationKind | null
	actor_id?: number | null
	from?: string | null
	to?: string | null
}

/** Operations as staff recorded them, the latest day first. */
export async function listStockOperations(filters: StockOperationFilters = {}): Promise<Paginated<StockOperation>> {
	return toPaginated(await get<RawPaginatedResponse<StockOperation>>(`${BASE}/stock/operations`, query({ ...filters })))
}

/** One operation with its ledger rows. */
export async function getStockOperation(id: string): Promise<StockOperation> {
	return (await get<{ data: StockOperation }>(`${BASE}/stock/operations/${id}`)).data
}

// ── Reports ─────────────────────────────────────────────────────────────────

export async function stockValuation(place?: PlaceRef | null, warehouseId?: number | null): Promise<StockValuation> {
	return (await get<{ data: StockValuation }>(`${BASE}/reports/stock-valuation`, query({ place, warehouse_id: warehouseId }))).data
}

export async function assetRegister(includeDisposed = false): Promise<AssetRegister> {
	return (await get<{ data: AssetRegister }>(`${BASE}/reports/asset-register`, query({ include_disposed: includeDisposed }))).data
}
