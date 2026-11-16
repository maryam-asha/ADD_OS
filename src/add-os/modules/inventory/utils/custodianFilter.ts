import type { CustodianRef, CustodianType } from "@/add-os/modules/inventory/types/inventory"
import { CUSTODIAN_TYPES } from "@/add-os/modules/inventory/types/inventory"

/**
 * A custodian filter kept in the URL as `custodian_type` + `custodian_id`;
 * a type ADD Core's resolver does not know is no filter at all.
 */
export function custodianOf(type: string | null, id: number | null): CustodianRef | null {
	if (!type || !id || !(CUSTODIAN_TYPES as readonly string[]).includes(type)) return null
	return { type: type as CustodianType, id }
}
