import type { Partner, PartnerPayload } from "@/add-os/modules/cms/types/partner"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Partner, PartnerPayload, PartnerPayload>(
	"/api/v1/admin/partners"
)

export const listPartners = api.list
export const getPartner = api.getById
export const createPartner = api.create
export const updatePartner = api.update
export const removePartner = api.remove
