import type { Founder, FounderPayload } from "@/add-os/modules/cms/types/founder"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<Founder, FounderPayload, FounderPayload>(
	"/api/v1/admin/founders"
)

export const listFounders = api.list
export const getFounder = api.getById
export const createFounder = api.create
export const updateFounder = api.update
export const removeFounder = api.remove
