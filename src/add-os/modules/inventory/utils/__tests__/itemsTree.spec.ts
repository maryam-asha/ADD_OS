import type { Category, Item } from "@/add-os/modules/inventory/types/inventory"
import { describe, expect, it } from "vitest"
import { buildItemTree } from "../itemsTree"

function category(id: number, parent: number | null, order = 0): Category {
  return ({ id, parent_id: parent, kind: "asset", intangible: false, name: { ar: `c${id}` }, icon: null, show_to_members: false, order }) as Category
}

const item = (id: number, categoryId: number): Item => ({ id, sku: `I-${id}`, category: { id: categoryId, name: { ar: "" } } }) as unknown as Item

describe("buildItemTree", () => {
	// Electronics (1) › Displays (2) › Monitors (3); Furniture (4); Paper (5) with nothing in it.
	const categories = [category(1, null), category(2, 1), category(3, 2), category(4, null, 1), category(5, null, 2)]

	it("hangs each item under its category, and each category under its parent", () => {
		const tree = buildItemTree(categories, [item(10, 3), item(11, 1), item(12, 4)])

		expect(tree.map(node => node.category.id)).toEqual([1, 4])
		expect(tree[0].items.map(i => i.id)).toEqual([11])
		expect(tree[0].children[0].children[0].items.map(i => i.id)).toEqual([10])
	})

	it("counts every item below a category, and leaves out branches with none", () => {
		const tree = buildItemTree(categories, [item(10, 3), item(11, 1), item(12, 4)])

		expect(tree[0].count).toBe(2)
		expect(tree[0].children[0].count).toBe(1)
		expect(tree.some(node => node.category.id === 5)).toBe(false)
	})

	it("keeps an item whose category is not listed, under no category", () => {
		const tree = buildItemTree(categories, [item(13, 99)])

		expect(tree).toHaveLength(1)
		expect(tree[0].category.id).toBe(99)
		expect(tree[0].items.map(i => i.id)).toEqual([13])
	})
})
