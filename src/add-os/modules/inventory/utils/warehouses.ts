// src/add-os/modules/inventory/utils/warehouses.ts

import type { ItemScope, Warehouse, WarehousePayload } from "@/add-os/modules/inventory/types/inventory"

/** The add / edit warehouse form, as the dialog holds it. */
export interface WarehouseForm {
	nameAr: string
	nameEn: string
	code: string
	managerId: number | null
	address: string
	locationUrl: string
	notes: string
	/** The branch it sits in; null for an external store. */
	branchId: number | null
	isPrimary: boolean
	scope: ItemScope
	itemIds: number[]
	allowsSales: boolean
	isActive: boolean
}

export function blankWarehouseForm(): WarehouseForm {
	return {
		nameAr: "",
		nameEn: "",
		code: "",
		managerId: null,
		address: "",
		locationUrl: "",
		notes: "",
		branchId: null,
		isPrimary: false,
		scope: "all",
		itemIds: [],
		allowsSales: true,
		isActive: true
	}
}

export function warehouseForm(w: Warehouse): WarehouseForm {
	return {
		nameAr: w.name.ar,
		nameEn: w.name.en ?? "",
		code: w.code ?? "",
		managerId: w.manager?.id ?? null,
		address: w.address ?? "",
		locationUrl: w.location_url ?? "",
		notes: w.notes ?? "",
		branchId: w.place?.type === "branch" ? w.place.id : null,
		isPrimary: w.is_primary,
		scope: w.item_scope,
		itemIds: (w.items ?? []).map(item => item.id),
		allowsSales: w.allows_sales,
		isActive: w.is_active
	}
}

/** A primary warehouse is where reception takes stock by default: it needs a branch and must sell. */
export function canBePrimary(f: WarehouseForm): boolean {
	return f.branchId !== null && f.allowsSales
}

export function warehousePayload(f: WarehouseForm): WarehousePayload {
	const text = (value: string) => value.trim() || null

	return {
		name: { ar: f.nameAr.trim(), en: text(f.nameEn) },
		code: text(f.code),
		manager_id: f.managerId,
		address: text(f.address),
		location_url: text(f.locationUrl),
		notes: text(f.notes),
		place: f.branchId === null ? null : { type: "branch", id: f.branchId },
		item_scope: f.scope,
		...(f.scope === "selected" ? { item_ids: f.itemIds } : {}),
		allows_sales: f.allowsSales,
		is_primary: f.isPrimary && canBePrimary(f),
		is_active: f.isActive
	}
}
