// src/add-os/modules/inventory/utils/itemCode.ts

/** Who sets an item's code — ADD Core's config inventory.items.sku_mode. */
export type ItemCodeMode = "auto" | "on_create" | "editable"

/** Whether the item form lets the code be typed: never under `auto`, only for a new item under `on_create`, always under `editable`. */
export function codeTypable(mode: ItemCodeMode, isNew: boolean): boolean {
	if (mode === "auto") return false
	return mode === "editable" || isNew
}
