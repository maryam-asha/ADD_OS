// src/add-os/modules/inventory/types/inventory.ts

/**
 * ADD Core's inventory package (`packages/add/inventory`, mounted at
 * `/api/v1/inventory`, 2026-10-24). Shapes read from the package's Http
 * Resources; amounts and quantities arrive as plain strings ("150", "1.5").
 */

export interface Bilingual {
	ar: string
	en?: string | null
}

/** ADD's own places: what an asset sits in and stock is counted on. */
export type PlaceType = "branch" | "building" | "floor" | "zone" | "space"

export const PLACE_TYPES: readonly PlaceType[] = ["branch", "building", "floor", "zone", "space"]

export interface PlaceRef {
	type: PlaceType
	id: number
}

/** A place as the server names it: its own label, and the places it sits in, outermost first. */
export interface PlaceDescription extends PlaceRef {
	label: string | null
	path: string[]
}

export type CustodianType = "hr_employee" | "member" | "company"

export const CUSTODIAN_TYPES: readonly CustodianType[] = ["hr_employee", "member", "company"]

export interface CustodianRef {
	type: CustodianType
	id: number
}

export interface CustodianDescription extends CustodianRef {
	label: string | null
}

export interface Actor {
	id: number
	name: string | null
}

// ── Catalog ─────────────────────────────────────────────────────────────────

export type ItemKind = "asset" | "stock"

export type AttributeType = "text" | "number" | "boolean" | "date" | "select"

export const ATTRIBUTE_TYPES: readonly AttributeType[] = ["text", "number", "boolean", "date", "select"]

export interface AttributeDefinition {
	id: number
	category_id: number
	key: string
	label: Bilingual
	type: AttributeType
	options: string[] | null
	unit: string | null
	is_required: boolean
	order: number
	/** On a category read: defined by one of its ancestors. */
	inherited?: boolean
}

export interface Category {
	id: number
	parent_id: number | null
	kind: ItemKind
	name: Bilingual
	icon: string | null
	show_to_members: boolean
	order: number
	items_count?: number
	/** On GET categories/{id}: every field its items answer, inherited ones included. */
	fields?: AttributeDefinition[]
}

export interface CategoryPayload {
	name: Bilingual
	parent_id?: number | null
	kind?: ItemKind
	icon?: string | null
	show_to_members?: boolean
	order?: number
}

export interface AttributeDefinitionPayload {
	key?: string
	label: Bilingual
	type?: AttributeType
	options?: string[]
	unit?: string | null
	is_required?: boolean
	order?: number
}

export interface Unit {
	id: number
	code: string
	name: Bilingual
	allows_fractions: boolean
}

export interface UnitPayload {
	code?: string
	name: Bilingual
	allows_fractions?: boolean
}

export type PropertyValue = string | number | boolean | null

/** A pack of an item's main unit: `factor` main units in one `unit` (box = 6). */
export interface ItemPack {
	unit: Unit
	factor: string
}

export interface Item {
	id: number
	sku: string
	barcode: string | null
	name: Bilingual
	description: string | null
	image_url: string | null
	kind: ItemKind
	category: { id: number; name: Bilingual }
	unit: Unit
	properties: Record<string, PropertyValue>
	is_active: boolean
	/** Its packs; loaded on the item lists and pages. */
	units?: ItemPack[]
	/** Stock: on hand in every warehouse together. */
	on_hand?: string
	assets_count?: number
}

export interface ItemPayload {
	name: Bilingual
	category_id: number
	unit_id: number
	sku?: string | null
	barcode?: string | null
	image_url?: string | null
	description?: string | null
	properties?: Record<string, PropertyValue>
	is_active?: boolean
	/** Replaces the item's packs whole when sent. */
	units?: { unit_id: number; factor: number }[]
}

// ── Warehouses ──────────────────────────────────────────────────────────────

export type ItemScope = "all" | "selected"

/** Where stock is kept. It sits in a branch, or in nothing (an external store). */
export interface Warehouse {
	id: number
	name: Bilingual
	code: string | null
	manager: Actor | null
	address: string | null
	location_url: string | null
	notes: string | null
	place: PlaceDescription | null
	item_scope: ItemScope
	/** The items a `selected` scope allows. */
	items?: { id: number; sku: string; name: Bilingual }[]
	allows_sales: boolean
	is_primary: boolean
	is_active: boolean
	/** Stock items with something on hand here. */
	items_with_balance?: number
	created_at: string | null
}

export interface WarehousePayload {
	name: Bilingual
	code?: string | null
	manager_id?: number | null
	address?: string | null
	location_url?: string | null
	notes?: string | null
	place?: PlaceRef | null
	item_scope?: ItemScope
	item_ids?: number[]
	allows_sales?: boolean
	is_primary?: boolean
	is_active?: boolean
}

/** A warehouse as the stock lists name it. */
export interface WarehouseRef {
	id: number
	name: Bilingual | null
	code: string | null
	place: PlaceDescription | null
}

// ── Assets ──────────────────────────────────────────────────────────────────

export type AssetStatus = "in_service" | "in_maintenance" | "retired" | "lost" | "disposed"

export const ASSET_STATUSES: readonly AssetStatus[] = ["in_service", "in_maintenance", "retired", "lost", "disposed"]

/** What PATCH assets/{id}/status may set; the other two have their own flows. */
export const SETTABLE_ASSET_STATUSES: readonly AssetStatus[] = ["in_service", "retired", "lost"]

export type DisposalMethod = "sold" | "scrapped" | "donated"

export const DISPOSAL_METHODS: readonly DisposalMethod[] = ["sold", "scrapped", "donated"]

export type MaintenanceType = "corrective" | "preventive"

/** The one-step actions on an asset (AssetActionModal). */
export type AssetAction = "move" | "assign" | "return" | "status" | "maintenance" | "close" | "dispose"

export interface Depreciation {
	monthly: string
	months_elapsed: number
	accumulated: string
	book_value: string
	fully_depreciated: boolean
}

export interface AssetMovement {
	id: number
	asset_id: number
	from: PlaceDescription | null
	to: PlaceDescription
	note: string | null
	moved_at: string
	actor: Actor | null
}

export interface AssetAssignment {
	id: number
	asset_id: number
	asset?: { id: number; code: string; item: { id: number; name: Bilingual } }
	custodian: CustodianDescription
	assigned_at: string
	assigned_by: Actor | null
	note: string | null
	returned_at: string | null
	returned_by: Actor | null
	return_note: string | null
}

export interface MaintenanceRecord {
	id: number
	asset_id: number
	asset?: { id: number; code: string; item: { id: number; name: Bilingual } }
	schedule_id: number | null
	type: MaintenanceType
	description: string
	vendor: string | null
	opened_at: string
	opened_by: Actor | null
	closed_at: string | null
	closed_by: Actor | null
	cost: string | null
	currency: string | null
	resolution: string | null
}

export interface MaintenanceSchedule {
	id: number
	asset_id: number
	asset?: { id: number; code: string }
	title: string
	interval_months: number
	next_due_on: string
	overdue: boolean
	is_active: boolean
}

export interface Asset {
	id: number
	code: string
	qr_token: string
	serial_number: string | null
	status: AssetStatus
	item: { id: number; sku: string; name: Bilingual; category: { id: number; name: Bilingual } }
	location: PlaceDescription
	custodian?: (CustodianDescription & { since: string }) | null
	purchased_on: string | null
	purchase_cost: string | null
	currency: string | null
	supplier: string | null
	useful_life_months: number | null
	salvage_value: string | null
	depreciation: Depreciation | null
	warranty_until: string | null
	disposal: { disposed_on: string; method: DisposalMethod | null; proceeds: string | null; note: string | null } | null
	notes: string | null
	open_maintenance?: MaintenanceRecord | null
	movements?: AssetMovement[]
	assignments?: AssetAssignment[]
	maintenance?: MaintenanceRecord[]
	maintenance_schedules?: MaintenanceSchedule[]
	created_at: string | null
}

export interface AssetDetailsPayload {
	serial_number?: string | null
	purchased_on?: string | null
	purchase_cost?: number | null
	currency?: string | null
	supplier?: string | null
	useful_life_months?: number | null
	salvage_value?: number | null
	warranty_until?: string | null
	notes?: string | null
}

export interface RegisterAssetPayload extends AssetDetailsPayload {
	item_id: number
	location: PlaceRef
	count?: number
	code?: string | null
}

// ── Stock ───────────────────────────────────────────────────────────────────

export type StockMovementType = "receipt" | "issue" | "transfer_out" | "transfer_in" | "adjustment"

export const STOCK_MOVEMENT_TYPES: readonly StockMovementType[] = ["receipt", "issue", "transfer_out", "transfer_in", "adjustment"]

/** Why stock left by hand; sales and consumption issue their own. */
export type ManualIssueReason = "internal_use" | "damaged" | "expired" | "other"

export const MANUAL_ISSUE_REASONS: readonly ManualIssueReason[] = ["internal_use", "damaged", "expired", "other"]

export type IssueReason = ManualIssueReason | "consumption" | "sale"

/** The five operations staff record (the movement picker); a write-off is an issue for damaged or expired stock. */
export type StockOperationKind = "transfer" | "adjust" | "writeOff" | "receive" | "issue"

export const STOCK_OPERATION_KINDS: readonly StockOperationKind[] = ["transfer", "adjust", "writeOff", "receive", "issue"]

/** One line of an operation: an item in one of its units (the main one when left out). */
export interface StockLine {
	item_id: number
	unit_id?: number | null
	/** Receive, issue, write-off, transfer. */
	quantity?: number
	/** Adjust: what was counted. */
	counted?: number
	/** Receive and adjust: per the chosen unit. */
	unit_cost?: number | null
}

export interface StockOperationPayload {
	warehouse_id?: number
	from_warehouse_id?: number
	to_warehouse_id?: number
	lines: StockLine[]
	reason?: ManualIssueReason
	note?: string | null
}

export interface StockBalance {
	item: { id: number; sku: string; name: Bilingual; unit: { id: number; code: string; name: Bilingual } }
	warehouse: WarehouseRef
	quantity: string
	average_cost: string
	value: string
	currency: string
	updated_at: string | null
}

export interface StockMovement {
	id: number
	item: { id: number; sku: string; name: Bilingual }
	warehouse: WarehouseRef
	type: StockMovementType
	quantity: string
	unit_cost: string | null
	quantity_after: string
	average_cost_after: string
	transfer_id: string | null
	/** The rows one operation wrote share it. */
	operation_id: string | null
	/** What was typed when it was a pack ("2 box"); for a count, the count. */
	entered: { unit: { id: number; code: string; name: Bilingual }; quantity: string } | null
	reason: IssueReason | null
	source: { type: string; id: number } | null
	note: string | null
	actor: Actor | null
	created_at: string | null
}

// ── Reports ─────────────────────────────────────────────────────────────────

export interface StockValuation {
	currency: string
	total: string
	warehouses: { warehouse: WarehouseRef; items: number; value: string }[]
}

export interface AssetRegisterRow {
	id: number
	code: string
	item: { id: number; name: Bilingual }
	status: AssetStatus
	location: PlaceDescription
	purchased_on: string | null
	purchase_cost: string | null
	currency: string | null
	accumulated: string | null
	book_value: string | null
}

export interface AssetRegister {
	assets: AssetRegisterRow[]
	totals: { currency: string; cost: string; accumulated: string; book_value: string }[]
}
