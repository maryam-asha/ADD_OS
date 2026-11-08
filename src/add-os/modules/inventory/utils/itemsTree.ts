// src/add-os/modules/inventory/utils/itemsTree.ts
import type { Category, Item } from "@/add-os/modules/inventory/types/inventory"

/** A category in the items' tree view: its own items, its sub-categories, and how many items sit anywhere below it. */
export interface ItemTreeNode {
	category: Pick<Category, "id" | "name"> & Partial<Category>
	items: Item[]
	children: ItemTreeNode[]
	count: number
}

/**
 * The items' tree view: categories nested as the catalog has them, each
 * holding its own items. A branch with no item anywhere below it is left
 * out, so a filtered list shows only where the matches are. An item whose
 * category is not in the list (not loaded) still shows, under its own.
 */
export function buildItemTree(categories: Category[], items: Item[]): ItemTreeNode[] {
	const byCategory = new Map<number, Item[]>()
	for (const item of items) byCategory.set(item.category.id, [...(byCategory.get(item.category.id) ?? []), item])

	const known = new Set(categories.map(category => category.id))
	const sorted = [...categories].sort((a, b) => a.order - b.order || a.id - b.id)

	const node = (category: Category): ItemTreeNode | null => {
		const children = sorted.filter(child => child.parent_id === category.id).map(node).filter((child): child is ItemTreeNode => child !== null)
		const own = byCategory.get(category.id) ?? []
		const count = own.length + children.reduce((sum, child) => sum + child.count, 0)
		return count ? { category, items: own, children, count } : null
	}

	const roots = sorted.filter(category => category.parent_id === null || !known.has(category.parent_id)).map(node)
	const orphans = [...byCategory.entries()]
		.filter(([id]) => !known.has(id))
		.map(([, own]): ItemTreeNode => ({ category: own[0].category, items: own, children: [], count: own.length }))

	return [...roots.filter((root): root is ItemTreeNode => root !== null), ...orphans]
}
