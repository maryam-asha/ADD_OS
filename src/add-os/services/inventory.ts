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
	ManualIssueReason,
	PlaceRef,
	RegisterAssetPayload,
	StockBalance,
	StockMovement,
	StockMovementType,
	StockValuation,
	Unit,
	UnitPayload
} from "@/add-os/modules/inventory/types/inventory"
import { del, get, patch, post } from "./api"
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

export async function createItem(payload: ItemPayload): Promise<Item> {
	return (await post<{ data: Item }>(`${BASE}/items`, payload)).data
}

export async function updateItem(id: number, payload: Partial<ItemPayload>): Promise<MessageResult> {
	return patch<MessageResult>(`${BASE}/items/${id}`, payload)
}

export async function removeItem(id: number): Promise<void> {
	await del(`${BASE}/items/${id}`)
}

// ── Assets ──────────────────────────────────────────────────────────────────

export interface AssetFilters {
	page?: number
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

// ── Stock ───────────────────────────────────────────────────────────────────

export async function listBalances(filters: { page?: number; item_id?: number | null; category_id?: number | null; location?: PlaceRef | null; within?: boolean; include_empty?: boolean } = {}): Promise<Paginated<StockBalance>> {
	return toPaginated(await get<RawPaginatedResponse<StockBalance>>(`${BASE}/stock/balances`, query({ ...filters })))
}

export async function listStockMovements(filters: { page?: number; item_id?: number | null; location?: PlaceRef | null; type?: StockMovementType | null; from?: string | null; to?: string | null } = {}): Promise<Paginated<StockMovement>> {
	return toPaginated(await get<RawPaginatedResponse<StockMovement>>(`${BASE}/stock/movements`, query({ ...filters })))
}

export async function receiveStock(payload: { item_id: number; location: PlaceRef; quantity: number; unit_cost?: number | null; note?: string | null }): Promise<StockMovement> {
	return (await post<{ data: StockMovement }>(`${BASE}/stock/receive`, payload)).data
}

export async function issueStock(payload: { item_id: number; location: PlaceRef; quantity: number; reason: ManualIssueReason; note?: string | null }): Promise<StockMovement> {
	return (await post<{ data: StockMovement }>(`${BASE}/stock/issue`, payload)).data
}

export async function transferStock(payload: { item_id: number; from: PlaceRef; to: PlaceRef; quantity: number; note?: string | null }): Promise<StockMovement[]> {
	return rowsOf<StockMovement>((await post<{ data: StockMovement[] }>(`${BASE}/stock/transfer`, payload)).data)
}

/** A count that matched the book answers `{message}` and records nothing. */
export async function countStock(payload: { item_id: number; location: PlaceRef; counted: number; unit_cost?: number | null; note?: string | null }): Promise<StockMovement | MessageResult> {
	const res = await post<{ data?: StockMovement; message?: string }>(`${BASE}/stock/adjust`, payload)
	return res.data ?? { message: res.message }
}

// ── Reports ─────────────────────────────────────────────────────────────────

export async function stockValuation(location?: PlaceRef | null): Promise<StockValuation> {
	return (await get<{ data: StockValuation }>(`${BASE}/reports/stock-valuation`, query({ location }))).data
}

export async function assetRegister(includeDisposed = false): Promise<AssetRegister> {
	return (await get<{ data: AssetRegister }>(`${BASE}/reports/asset-register`, query({ include_disposed: includeDisposed }))).data
}
