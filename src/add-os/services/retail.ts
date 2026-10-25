import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { ItemSale, ItemSalePayload, SaleItem, SaleItemPayload } from "@/add-os/modules/plans/types/retail"
import { get, post } from "./api"
import { toPaginated } from "./pagination"
import { createResourceApi } from "./resource-factory"

/**
 * Reception sales (ADD Core `App\Domain\Retail`): `admin/sale-items` (what
 * may be sold, at its price in points), `admin/item-sales` (the sales made)
 * and `admin/reception/item-sales` (selling). Too few points answers 422
 * `{message, current, required, shortage}`; an empty shelf, 422 with what
 * is left. Nothing is recorded either way.
 */
const saleItems = createResourceApi<SaleItem, SaleItemPayload, SaleItemPayload>("/api/v1/admin/sale-items")

export const listSaleItems = saleItems.list
export const createSaleItem = saleItems.create
export const updateSaleItem = saleItems.update
export const removeSaleItem = saleItems.remove

export async function listItemSales(filters: { page?: number; user_id?: number | null } = {}): Promise<Paginated<ItemSale>> {
	const query: Record<string, unknown> = { page: filters.page ?? 1 }
	if (filters.user_id) query.user_id = filters.user_id
	return toPaginated(await get<RawPaginatedResponse<ItemSale>>("/api/v1/admin/item-sales", query))
}

/** The sale, its payment inside `data`. */
export async function sellItems(payload: ItemSalePayload): Promise<ItemSale> {
	return (await post<{ data: ItemSale }>("/api/v1/admin/reception/item-sales", payload)).data
}
